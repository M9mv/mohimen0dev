import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase admin client for rate limiting
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// TOTP implementation
function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of encoded.toUpperCase().replace(/=+$/, "")) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = new Uint8Array(8);
  let t = time;
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  
  const hmac = await hmacSha1(key, timeBuffer);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, "0");
}

function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[bytes[i] % 32];
  }
  return result;
}

// Rate limiting: Check failed attempts in last 5 minutes
async function checkRateLimit(ipAddress: string): Promise<{ blocked: boolean; attemptsCount: number }> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data, error } = await supabaseAdmin
    .from("auth_attempts")
    .select("id")
    .eq("ip_address", ipAddress)
    .eq("success", false)
    .gte("created_at", fiveMinutesAgo);
  
  if (error) {
    console.error("Error checking rate limit:", error);
    return { blocked: false, attemptsCount: 0 };
  }
  
  const attemptsCount = data?.length || 0;
  // Block after 5 failed attempts in 5 minutes
  return { blocked: attemptsCount >= 5, attemptsCount };
}

// Log authentication attempt
async function logAttempt(ipAddress: string, success: boolean) {
  try {
    await supabaseAdmin.from("auth_attempts").insert({
      ip_address: ipAddress,
      action: "totp_verify",
      success,
    });
  } catch (error) {
    console.error("Error logging attempt:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                    req.headers.get("x-real-ip") || 
                    "unknown";

  try {
    const { action, code, secret } = await req.json();

    if (action === "generate") {
      // Generate a new secret
      const newSecret = generateSecret();
      console.log("Generated new TOTP secret");
      return new Response(
        JSON.stringify({ secret: newSecret }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "setup") {
      // Save TOTP secret using service role (bypasses RLS)
      if (!secret) {
        return new Response(
          JSON.stringify({ error: "Missing secret" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { error: saveError } = await supabaseAdmin
        .from("site_settings")
        .upsert({ key: "totp_secret", value: secret }, { onConflict: "key" });

      if (saveError) {
        console.error("Error saving TOTP secret:", saveError);
        return new Response(
          JSON.stringify({ error: "Failed to save secret" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log("TOTP secret saved successfully");
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Check rate limit
      const { blocked, attemptsCount } = await checkRateLimit(ipAddress);
      
      if (blocked) {
        console.log(`Rate limited IP: ${ipAddress}, attempts: ${attemptsCount}`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Too many failed attempts. Please wait 5 minutes.",
            rateLimited: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }

      if (!secret || !code) {
        return new Response(
          JSON.stringify({ valid: false, error: "Missing secret or code" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Generate current and previous TOTP codes for clock drift tolerance
      const currentCode = await generateTOTP(secret);
      
      // Calculate previous window code
      const time = Math.floor(Date.now() / 1000 / 30) - 1;
      const timeBuffer = new Uint8Array(8);
      let t = time;
      for (let i = 7; i >= 0; i--) {
        timeBuffer[i] = t & 0xff;
        t = Math.floor(t / 256);
      }
      const key = base32Decode(secret);
      const hmac = await hmacSha1(key, timeBuffer);
      const offset = hmac[hmac.length - 1] & 0x0f;
      const prevCodeNum =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
      const prevCodeStr = (prevCodeNum % 1000000).toString().padStart(6, "0");

      const isValid = code === currentCode || code === prevCodeStr;

      // Log the attempt
      await logAttempt(ipAddress, isValid);
      
      console.log(`TOTP verification for IP ${ipAddress}: ${isValid ? "SUCCESS" : "FAILED"}`);

      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in totp-verify:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
