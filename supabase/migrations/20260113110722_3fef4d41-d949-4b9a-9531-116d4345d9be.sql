-- =============================================
-- 1. Fix Security: Add restrictive RLS policies for write operations
-- =============================================

-- Projects table: Block all public writes (only edge functions with service role can write)
CREATE POLICY "Block public insert on projects" 
ON public.projects 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on projects" 
ON public.projects 
FOR UPDATE 
TO anon, authenticated
USING (false);

CREATE POLICY "Block public delete on projects" 
ON public.projects 
FOR DELETE 
TO anon, authenticated
USING (false);

-- Social links table: Block all public writes
CREATE POLICY "Block public insert on social_links" 
ON public.social_links 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on social_links" 
ON public.social_links 
FOR UPDATE 
TO anon, authenticated
USING (false);

CREATE POLICY "Block public delete on social_links" 
ON public.social_links 
FOR DELETE 
TO anon, authenticated
USING (false);

-- Site settings table: Block all public writes
CREATE POLICY "Block public insert on site_settings" 
ON public.site_settings 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on site_settings" 
ON public.site_settings 
FOR UPDATE 
TO anon, authenticated
USING (false);

CREATE POLICY "Block public delete on site_settings" 
ON public.site_settings 
FOR DELETE 
TO anon, authenticated
USING (false);

-- Auth attempts: Allow INSERT for logging (service role can read)
CREATE POLICY "Allow insert auth attempts for logging" 
ON public.auth_attempts 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- =============================================
-- 2. Move TOTP secret to a dedicated secure table
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS with NO public access at all
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- Block ALL access for anon and authenticated users
CREATE POLICY "Block all access to admin_secrets" 
ON public.admin_secrets 
FOR ALL 
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Migrate existing TOTP secret to new table
INSERT INTO public.admin_secrets (key, value)
SELECT 'totp_secret', value 
FROM public.site_settings 
WHERE key = 'totp_secret'
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 3. Create categories table for custom categories
-- =============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public can read categories
CREATE POLICY "Anyone can read categories" 
ON public.categories 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Block public writes
CREATE POLICY "Block public insert on categories" 
ON public.categories 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on categories" 
ON public.categories 
FOR UPDATE 
TO anon, authenticated
USING (false);

CREATE POLICY "Block public delete on categories" 
ON public.categories 
FOR DELETE 
TO anon, authenticated
USING (false);

-- Insert default categories
INSERT INTO public.categories (name, is_default) VALUES 
  ('تطبيق', true),
  ('موقع', true),
  ('تصميم', true),
  ('برمجة', true),
  ('أداة', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 4. Create project_images table for multiple images
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

-- Public can read project images
CREATE POLICY "Anyone can read project_images" 
ON public.project_images 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Block public writes
CREATE POLICY "Block public insert on project_images" 
ON public.project_images 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public update on project_images" 
ON public.project_images 
FOR UPDATE 
TO anon, authenticated
USING (false);

CREATE POLICY "Block public delete on project_images" 
ON public.project_images 
FOR DELETE 
TO anon, authenticated
USING (false);

-- =============================================
-- 5. Create admin_sessions table for TOTP session management
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Block ALL public access - only service role can access
CREATE POLICY "Block all access to admin_sessions" 
ON public.admin_sessions 
FOR ALL 
TO anon, authenticated
USING (false)
WITH CHECK (false);