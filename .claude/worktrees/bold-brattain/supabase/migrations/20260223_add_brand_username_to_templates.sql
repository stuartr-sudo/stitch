-- Add brand_username to user_templates for per-brand template isolation.
-- NULL = available to all brands under this user account.
-- Set to a brand_kit.brand_username value to lock the template to one brand.

ALTER TABLE user_templates
  ADD COLUMN IF NOT EXISTS brand_username text DEFAULT NULL;

COMMENT ON COLUMN user_templates.brand_username IS
  'Optional brand scope. NULL = runs for all brands under this user. Set to match brand_kit.brand_username to restrict to one brand.';

CREATE INDEX IF NOT EXISTS idx_user_templates_brand_username
  ON user_templates(brand_username) WHERE brand_username IS NOT NULL;
