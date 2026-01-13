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

// Extend session expiry (30 minutes)
async function extendSession(sessionToken: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  
  await supabaseAdmin
    .from("admin_sessions")
    .update({ expires_at: expiresAt })
    .eq("session_token", sessionToken);
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
    const sessionToken = formData.get("sessionToken") as string | null;

    // Validate required fields
    if (!file || !path || !sessionToken) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: file, path, sessionToken" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate session
    const isValidSession = await validateSession(sessionToken);
    if (!isValidSession) {
      console.log("Invalid or expired session for upload");
      return new Response(
        JSON.stringify({ error: "Session expired", sessionExpired: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Extend session on successful auth
    await extendSession(sessionToken);

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
