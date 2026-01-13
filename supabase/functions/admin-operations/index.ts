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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sessionToken, data } = await req.json();

    // Validate session token instead of TOTP code for every operation
    const isValidSession = await validateSession(sessionToken);
    if (!isValidSession) {
      console.log("Invalid or expired session");
      return new Response(
        JSON.stringify({ error: "Session expired", sessionExpired: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Extend session on each successful operation
    await extendSession(sessionToken);

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
          category: sanitizeText(category, 100) || null,
          link: link || null,
        };

        const { data: insertedProject, error } = await supabaseAdmin
          .from("projects")
          .insert(sanitizedData)
          .select()
          .single();
        
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, project: insertedProject }),
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
        if (category !== undefined) updates.category = sanitizeText(category, 100) || null;
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

      // Project images operations
      case "add_project_images": {
        const { project_id, images } = data;

        if (!project_id || !Array.isArray(images)) {
          return new Response(
            JSON.stringify({ error: "Invalid project_id or images array." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Validate each image
        for (const img of images) {
          if (!isValidUrl(img.image_url)) {
            return new Response(
              JSON.stringify({ error: "Invalid image URL." }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        }

        // Insert images
        const imagesToInsert = images.map((img: { image_url: string; is_primary?: boolean; display_order?: number }, index: number) => ({
          project_id,
          image_url: img.image_url,
          is_primary: img.is_primary || false,
          display_order: img.display_order ?? index,
        }));

        const { error } = await supabaseAdmin.from("project_images").insert(imagesToInsert);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_project_image": {
        const { id, is_primary, display_order } = data;

        if (!id) {
          return new Response(
            JSON.stringify({ error: "Invalid image ID." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const updates: Record<string, boolean | number> = {};
        if (is_primary !== undefined) updates.is_primary = is_primary;
        if (display_order !== undefined) updates.display_order = display_order;

        const { error } = await supabaseAdmin.from("project_images").update(updates).eq("id", id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_project_image": {
        if (!data.id) {
          return new Response(
            JSON.stringify({ error: "Invalid image ID." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { error } = await supabaseAdmin.from("project_images").delete().eq("id", data.id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_primary_image": {
        const { project_id, image_id } = data;

        if (!project_id || !image_id) {
          return new Response(
            JSON.stringify({ error: "Invalid project_id or image_id." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Remove primary from all images of this project
        await supabaseAdmin
          .from("project_images")
          .update({ is_primary: false })
          .eq("project_id", project_id);

        // Set new primary
        const { error } = await supabaseAdmin
          .from("project_images")
          .update({ is_primary: true })
          .eq("id", image_id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Categories operations
      case "add_category": {
        const { name } = data;

        if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
          return new Response(
            JSON.stringify({ error: "Invalid category name. Must be 1-100 characters." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { data: insertedCategory, error } = await supabaseAdmin
          .from("categories")
          .insert({ name: sanitizeText(name, 100), is_default: false })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return new Response(
              JSON.stringify({ error: "Category already exists." }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true, category: insertedCategory }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_category": {
        if (!data.id) {
          return new Response(
            JSON.stringify({ error: "Invalid category ID." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        // Don't allow deleting default categories
        const { data: category } = await supabaseAdmin
          .from("categories")
          .select("is_default")
          .eq("id", data.id)
          .single();

        if (category?.is_default) {
          return new Response(
            JSON.stringify({ error: "Cannot delete default categories." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
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
        if (instagram !== undefined && instagram !== "" && !isValidUsername(instagram)) {
          return new Response(
            JSON.stringify({ error: "Invalid Instagram username. Use only letters, numbers, underscores, and dots (1-100 chars)." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        if (telegram !== undefined && telegram !== "" && !isValidUsername(telegram)) {
          return new Response(
            JSON.stringify({ error: "Invalid Telegram username. Use only letters, numbers, underscores, and dots (1-100 chars)." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        // Update Instagram
        if (instagram !== undefined) {
          await supabaseAdmin
            .from("social_links")
            .upsert({ platform: "instagram", username: sanitizeText(instagram, 100) || "" }, { onConflict: "platform" });
        }
        
        // Update Telegram
        if (telegram !== undefined) {
          await supabaseAdmin
            .from("social_links")
            .upsert({ platform: "telegram", username: sanitizeText(telegram, 100) || "" }, { onConflict: "platform" });
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
