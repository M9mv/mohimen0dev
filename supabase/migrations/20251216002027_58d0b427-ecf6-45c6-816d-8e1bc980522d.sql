-- Add unique constraint on platform column for upsert to work
ALTER TABLE public.social_links ADD CONSTRAINT social_links_platform_unique UNIQUE (platform);

-- Add unique constraint on key column for site_settings upsert
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_key_unique UNIQUE (key);