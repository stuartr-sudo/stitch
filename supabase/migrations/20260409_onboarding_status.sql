-- Add onboarding_status JSONB column to track wizard progress
-- RLS policies already cover user_api_keys (SELECT/INSERT/UPDATE by auth.uid() = user_id)
ALTER TABLE user_api_keys
  ADD COLUMN IF NOT EXISTS onboarding_status jsonb DEFAULT '{}'::jsonb;
