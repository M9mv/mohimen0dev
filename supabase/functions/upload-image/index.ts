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

// Validate image magic bytes
function validateImageMagicBytes(bytes: Uint8Array): { valid: boolean; mimeType: string | null } {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, mimeType: "image/jpeg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { valid: true, mimeType: "image/png" };
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { valid: true, mimeType: "image/webp" };
  }
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { valid: true, mimeType: "image/gif" };
  }
  return { valid: false, mimeType: null };
}

// Validate file path
function isValidPath(path: string): boolean {
  // Only allow alphanumeric, dashes, underscores, dots, and forward slashes
  const validPathPattern = /^[a-zA-Z0-9\-_./]+$/;
  // Prevent path traversal
  if (path.includes("..") || path.startsWith("/")) {
    return false;
  }
  // Only allow specific prefixes
  if (!path.startsWith("projects/") && !path.startsWith("settings/")) {
    return false;
  }
  return validPathPattern.test(path);
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;
    const totpCode = formData.get("totpCode") as string | null;

    // Validate required fields
    if (!file || !path || !totpCode) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, path, totpCode" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate TOTP code format
    if (!/^\d{6}$/.test(totpCode)) {
      console.error("Invalid TOTP code format");
      return new Response(
        JSON.stringify({ error: "Invalid TOTP code format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate path
    if (!isValidPath(path)) {
      console.error("Invalid file path:", path);
      return new Response(
        JSON.stringify({ error: "Invalid file path" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error("File too large:", file.size);
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 5MB" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
      console.log("Invalid TOTP code for upload operation");
      return new Response(
        JSON.stringify({ error: "Invalid authentication code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Read file and validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    const validation = validateImageMagicBytes(bytes);
    if (!validation.valid) {
      console.error("Invalid image file type");
      return new Response(
        JSON.stringify({ error: "Invalid image file. Only JPEG, PNG, WebP, and GIF are allowed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Uploading image to ${path} (${validation.mimeType}, ${file.size} bytes)`);

    // Upload with service role (bypasses storage RLS)
    const { data, error } = await supabaseAdmin.storage
      .from("site-images")
      .upload(path, bytes, {
        contentType: validation.mimeType!,
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("site-images")
      .getPublicUrl(path);

    console.log("Upload successful:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, path: data.path, publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in upload-image:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
