-- Add brand_usernames JSONB array column to user_templates
-- Supports assigning a template to multiple brand usernames.
-- Keeps the existing brand_username text column for backward compat with queue logic.

ALTER TABLE user_templates
  ADD COLUMN IF NOT EXISTS brand_usernames jsonb DEFAULT '[]'::jsonb;

-- Backfill: copy existing brand_username into brand_usernames array
UPDATE user_templates
  SET brand_usernames = jsonb_build_array(brand_username)
  WHERE brand_username IS NOT NULL
    AND brand_username != ''
    AND (brand_usernames IS NULL OR brand_usernames = '[]'::jsonb);

-- Index for containment queries (e.g. brand_usernames @> '["stuarta"]')
CREATE INDEX IF NOT EXISTS idx_user_templates_brand_usernames
  ON user_templates USING gin (brand_usernames);
