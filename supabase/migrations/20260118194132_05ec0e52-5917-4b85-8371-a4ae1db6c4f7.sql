-- Add storage RLS policies for site-images bucket to block public uploads
-- Only service role (edge functions) can upload, everyone can read

-- Allow public read access to site-images bucket
CREATE POLICY "Public can read site-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-images');

-- Block all public inserts (only service role can insert)
CREATE POLICY "Block public inserts on site-images"
ON storage.objects FOR INSERT
WITH CHECK (false);

-- Block all public updates (only service role can update)
CREATE POLICY "Block public updates on site-images"
ON storage.objects FOR UPDATE
USING (false);

-- Block all public deletes (only service role can delete)
CREATE POLICY "Block public deletes on site-images"
ON storage.objects FOR DELETE
USING (false);