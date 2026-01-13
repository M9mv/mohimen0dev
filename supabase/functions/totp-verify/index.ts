import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Session duration: 30 minutes
const SESSION_DURATION_MS = 30 * 60 * 1000;

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

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
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

// Get TOTP secret from the secure admin_secrets table (primary) or fallback to site_settings
async function getTOTPSecret(): Promise<string | null> {
  // Try admin_secrets first (more secure)
  const { data: adminSecret } = await supabaseAdmin
    .from("admin_secrets")
    .select("value")
    .eq("key", "totp_secret")
    .maybeSingle();
  
  if (adminSecret?.value) {
    return adminSecret.value;
  }
  
  // Fallback to site_settings for backward compatibility
  const { data: settingSecret } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "totp_secret")
    .maybeSingle();
  
  return settingSecret?.value || null;
}

// Validate session token
async function validateSession(sessionToken: string): Promise<boolean> {
  if (!sessionToken) return false;
  
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();
  
  if (error || !data) return false;
  
  const expiresAt = new Date(data.expires_at);
  return expiresAt > new Date();
}

// Create a new session
async function createSession(): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  
  // Clean up old expired sessions
  await supabaseAdmin
    .from("admin_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString());
  
  // Create new session
  await supabaseAdmin
    .from("admin_sessions")
    .insert({ session_token: sessionToken, expires_at: expiresAt });
  
  return sessionToken;
}

// Extend session expiry
async function extendSession(sessionToken: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  
  const { error } = await supabaseAdmin
    .from("admin_sessions")
    .update({ expires_at: expiresAt })
    .eq("session_token", sessionToken);
  
  return !error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                    req.headers.get("x-real-ip") || 
                    "unknown";

  try {
    const { action, code, secret, sessionToken } = await req.json();

    if (action === "check") {
      // Check if TOTP is already configured (without revealing the secret)
      const totpSecret = await getTOTPSecret();
      const configured = !!totpSecret;
      console.log(`TOTP configured: ${configured}`);
      return new Response(
        JSON.stringify({ configured }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "validate_session") {
      // Validate and optionally extend session
      const isValid = await validateSession(sessionToken);
      if (isValid) {
        await extendSession(sessionToken);
      }
      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      // Save TOTP secret to both tables (admin_secrets as primary, site_settings for backward compat)
      if (!secret) {
        return new Response(
          JSON.stringify({ error: "Missing secret" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Save to admin_secrets (secure table)
      const { error: adminError } = await supabaseAdmin
        .from("admin_secrets")
        .upsert({ key: "totp_secret", value: secret }, { onConflict: "key" });

      if (adminError) {
        console.error("Error saving TOTP secret to admin_secrets:", adminError);
      }

      // Also save to site_settings for backward compatibility
      const { error: settingsError } = await supabaseAdmin
        .from("site_settings")
        .upsert({ key: "totp_secret", value: secret }, { onConflict: "key" });

      if (settingsError) {
        console.error("Error saving TOTP secret to site_settings:", settingsError);
        return new Response(
          JSON.stringify({ error: "Failed to save secret" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // Create a session for the user
      const newSessionToken = await createSession();

      console.log("TOTP secret saved successfully");
      return new Response(
        JSON.stringify({ success: true, sessionToken: newSessionToken }),
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

      if (!code) {
        return new Response(
          JSON.stringify({ valid: false, error: "Missing code" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get secret from database if not provided (for login flow)
      let totpSecret = secret;
      if (!totpSecret) {
        totpSecret = await getTOTPSecret();
        
        if (!totpSecret) {
          console.error("TOTP secret not found in database");
          return new Response(
            JSON.stringify({ valid: false, error: "TOTP not configured" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      }

      // Generate current and previous TOTP codes for clock drift tolerance
      const currentCode = await generateTOTP(totpSecret);
      
      // Calculate previous window code
      const time = Math.floor(Date.now() / 1000 / 30) - 1;
      const timeBuffer = new Uint8Array(8);
      let t = time;
      for (let i = 7; i >= 0; i--) {
        timeBuffer[i] = t & 0xff;
        t = Math.floor(t / 256);
      }
      const key = base32Decode(totpSecret);
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

      if (isValid) {
        // Create a new session
        const newSessionToken = await createSession();
        return new Response(
          JSON.stringify({ valid: true, sessionToken: newSessionToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: false }),
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
