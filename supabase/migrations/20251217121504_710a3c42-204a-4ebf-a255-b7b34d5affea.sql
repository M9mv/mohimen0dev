-- Drop permissive write policies on projects table
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can delete projects" ON public.projects;

-- Drop permissive write policies on site_settings table
DROP POLICY IF EXISTS "Anyone can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can update site settings" ON public.site_settings;

-- Drop permissive write policies on social_links table
DROP POLICY IF EXISTS "Anyone can insert social links" ON public.social_links;
DROP POLICY IF EXISTS "Anyone can update social links" ON public.social_links;

-- Create rate limiting table for TOTP attempts
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  action text NOT NULL DEFAULT 'totp_verify',
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on auth_attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts via service role (edge functions)
-- No public access to auth_attempts table
CREATE POLICY "No public access to auth_attempts"
ON public.auth_attempts
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time 
ON public.auth_attempts (ip_address, created_at DESC);