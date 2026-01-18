-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Block public inserts on site-images" ON storage.objects;
DROP POLICY IF EXISTS "Block public updates on site-images" ON storage.objects;
DROP POLICY IF EXISTS "Block public deletes on site-images" ON storage.objects;

-- The service role bypasses RLS automatically, so we just need to ensure
-- anonymous users cannot upload. These policies will be evaluated for anon role only.
-- Since we want ONLY service role to upload, we use (false) which blocks anon,
-- but service role with SUPABASE_SERVICE_ROLE_KEY bypasses RLS entirely.

-- Actually the issue is these are RESTRICTIVE policies blocking everything.
-- Let's create PERMISSIVE policies that allow nothing for anon users instead.

-- For INSERT: No anon user can insert (service role bypasses RLS)
CREATE POLICY "No public inserts on site-images"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (false);

-- For UPDATE: No anon user can update
CREATE POLICY "No public updates on site-images"
ON storage.objects FOR UPDATE
TO anon
USING (false);

-- For DELETE: No anon user can delete
CREATE POLICY "No public deletes on site-images"
ON storage.objects FOR DELETE
TO anon
USING (false);