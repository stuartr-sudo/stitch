-- Migration V4: Brand username for external API access + pipeline improvements

-- 1. Add brand_username to brand_kit
ALTER TABLE brand_kit
  ADD COLUMN IF NOT EXISTS brand_username text;

-- Add unique constraint separately (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brand_kit_brand_username_key'
    AND conrelid = 'brand_kit'::regclass
  ) THEN
    ALTER TABLE brand_kit ADD CONSTRAINT brand_kit_brand_username_key UNIQUE (brand_username);
  END IF;
END $$;

-- Index for fast lookups by brand_username
CREATE INDEX IF NOT EXISTS idx_brand_kit_brand_username ON brand_kit(brand_username);

-- 2. Add wavespeed_key and fal_key to user_api_keys
ALTER TABLE user_api_keys
  ADD COLUMN IF NOT EXISTS wavespeed_key text,
  ADD COLUMN IF NOT EXISTS fal_key text;

-- 3. Extend ad_drafts for per-ratio asset data and timeline JSON
ALTER TABLE ad_drafts
  ADD COLUMN IF NOT EXISTS template_type text,
  ADD COLUMN IF NOT EXISTS timelines_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS platforms jsonb DEFAULT '[]'::jsonb;

-- 4. Extend campaigns to track source article metadata
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS article_title text,
  ADD COLUMN IF NOT EXISTS template_type text,
  ADD COLUMN IF NOT EXISTS platforms jsonb DEFAULT '[]'::jsonb;

-- 5. Allow service-role bypass on jobs for pipeline writes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'Service role can manage all jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage all jobs" ON jobs FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;
