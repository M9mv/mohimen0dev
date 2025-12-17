import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Input validation functions
function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeText(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  return text.trim().slice(0, maxLength);
}

function isValidCategory(category: string | null | undefined): boolean {
  if (!category) return true; // default will be applied
  return ["web", "bot", "ai", "mobile", "other"].includes(category);
}

function isValidUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  // Allow alphanumeric, underscores, and dots (common for social media)
  return /^[a-zA-Z0-9_.]{1,100}$/.test(username);
}

function isValidSettingKey(key: string | null | undefined): boolean {
  if (!key) return false;
  // Whitelist allowed setting keys
  return ["og_image", "totp_secret"].includes(key);
}

// TOTP verification functions
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

async function generateTOTP(secret: string): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / 30);
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

async function verifyTOTP(code: string, secret: string): Promise<boolean> {
  const currentCode = await generateTOTP(secret);
  
  // Also check previous window for clock drift tolerance
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
  const prevCode = (prevCodeNum % 1000000).toString().padStart(6, "0");
  
  return code === currentCode || code === prevCode;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, totpCode, data } = await req.json();

    // Get TOTP secret from database
    const { data: secretData, error: secretError } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "totp_secret")
      .maybeSingle();

    if (secretError || !secretData?.value) {
      console.error("TOTP secret not found");
      return new Response(
        JSON.stringify({ error: "Authentication not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify TOTP code
    const isValid = await verifyTOTP(totpCode, secretData.value);
    if (!isValid) {
      console.log("Invalid TOTP code for admin operation");
      return new Response(
        JSON.stringify({ error: "Invalid authentication code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log(`Admin operation: ${action}`);

    // Handle different admin operations
    switch (action) {
      // Projects operations
      case "add_project": {
        const { title, description, image_url, category, link } = data;

        // Validate title
        if (!title || typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
          return new Response(
            JSON.stringify({ error: "Invalid title. Must be 1-200 characters." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate description (optional but if present, check length)
        if (description && (typeof description !== "string" || description.length > 1000)) {
          return new Response(
            JSON.stringify({ error: "Invalid description. Must be under 1000 characters." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate image_url (optional)
        if (image_url && !isValidUrl(image_url)) {
          return new Response(
            JSON.stringify({ error: "Invalid image URL. Must be a valid http/https URL." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate category
        if (!isValidCategory(category)) {
          return new Response(
            JSON.stringify({ error: "Invalid category. Must be: web, bot, ai, mobile, or other." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate link (optional)
        if (link && !isValidUrl(link)) {
          return new Response(
            JSON.stringify({ error: "Invalid link URL. Must be a valid http/https URL." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Sanitize and insert
        const sanitizedData = {
          title: sanitizeText(title, 200),
          description: sanitizeText(description, 1000) || null,
          image_url: image_url || null,
          category: category || "web",
          link: link || null,
        };

        const { error } = await supabaseAdmin.from("projects").insert(sanitizedData);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_project": {
        const { id, title, description, image_url, category, link } = data;

        // Validate ID
        if (!id || typeof id !== "string") {
          return new Response(
            JSON.stringify({ error: "Invalid project ID." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate title if present
        if (title !== undefined && (typeof title !== "string" || title.trim().length === 0 || title.length > 200)) {
          return new Response(
            JSON.stringify({ error: "Invalid title. Must be 1-200 characters." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate description if present
        if (description !== undefined && description !== null && (typeof description !== "string" || description.length > 1000)) {
          return new Response(
            JSON.stringify({ error: "Invalid description. Must be under 1000 characters." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate image_url if present
        if (image_url !== undefined && image_url !== null && !isValidUrl(image_url)) {
          return new Response(
            JSON.stringify({ error: "Invalid image URL. Must be a valid http/https URL." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate category if present
        if (category !== undefined && !isValidCategory(category)) {
          return new Response(
            JSON.stringify({ error: "Invalid category. Must be: web, bot, ai, mobile, or other." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate link if present
        if (link !== undefined && link !== null && !isValidUrl(link)) {
          return new Response(
            JSON.stringify({ error: "Invalid link URL. Must be a valid http/https URL." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Build update object with only provided fields
        const updates: Record<string, string | null> = {};
        if (title !== undefined) updates.title = sanitizeText(title, 200);
        if (description !== undefined) updates.description = description ? sanitizeText(description, 1000) : null;
        if (image_url !== undefined) updates.image_url = image_url || null;
        if (category !== undefined) updates.category = category || "web";
        if (link !== undefined) updates.link = link || null;

        const { error } = await supabaseAdmin.from("projects").update(updates).eq("id", id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_project": {
        // Validate ID
        if (!data.id || typeof data.id !== "string") {
          return new Response(
            JSON.stringify({ error: "Invalid project ID." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { error } = await supabaseAdmin.from("projects").delete().eq("id", data.id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Social links operations
      case "update_social_links": {
        const { instagram, telegram } = data;

        // Validate usernames
        if (instagram !== undefined && !isValidUsername(instagram)) {
          return new Response(
            JSON.stringify({ error: "Invalid Instagram username. Use only letters, numbers, underscores, and dots (1-100 chars)." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        if (telegram !== undefined && !isValidUsername(telegram)) {
          return new Response(
            JSON.stringify({ error: "Invalid Telegram username. Use only letters, numbers, underscores, and dots (1-100 chars)." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Update Instagram
        if (instagram !== undefined) {
          await supabaseAdmin
            .from("social_links")
            .upsert({ platform: "instagram", username: sanitizeText(instagram, 100) }, { onConflict: "platform" });
        }
        
        // Update Telegram
        if (telegram !== undefined) {
          await supabaseAdmin
            .from("social_links")
            .upsert({ platform: "telegram", username: sanitizeText(telegram, 100) }, { onConflict: "platform" });
        }
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Site settings operations
      case "update_setting": {
        const { key, value } = data;

        // Validate key
        if (!isValidSettingKey(key)) {
          return new Response(
            JSON.stringify({ error: "Invalid setting key. Allowed: og_image, totp_secret." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate value based on key
        if (key === "og_image" && value && !isValidUrl(value)) {
          return new Response(
            JSON.stringify({ error: "Invalid OG image URL. Must be a valid http/https URL." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate value length
        if (value && (typeof value !== "string" || value.length > 1000)) {
          return new Response(
            JSON.stringify({ error: "Value too long. Maximum 1000 characters." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { error } = await supabaseAdmin
          .from("site_settings")
          .upsert({ key, value: value || null }, { onConflict: "key" });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in admin-operations:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
