-- Fix critical security issue: TOTP secret publicly accessible
-- Drop the current permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

-- Create new restrictive policy that blocks access to totp_secret
CREATE POLICY "Public can view non-sensitive settings" 
ON public.site_settings 
FOR SELECT 
USING (key != 'totp_secret');