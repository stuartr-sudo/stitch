-- Migration v8: Enhance brand_kit for multi-brand support + detailed guidelines fields
-- Run this in Supabase SQL Editor

-- 1. Drop UNIQUE constraint on user_id to allow multiple brands per user
ALTER TABLE brand_kit DROP CONSTRAINT IF EXISTS brand_kit_user_id_key;

-- 2. Add detailed brand guidelines fields (extracted from PDFs or SEWO sync)
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS target_market       text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS brand_personality   text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS brand_voice_detail  text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS content_style_rules text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS preferred_elements  text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS prohibited_elements text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS visual_style_notes  text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS mood_atmosphere     text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS lighting_prefs      text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS composition_style   text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS ai_prompt_rules     text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS blurb              text DEFAULT '';
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS website            text DEFAULT '';

-- 3. Add non-unique index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_brand_kit_user_id ON brand_kit(user_id);

-- 4. Add DELETE policy (users can delete their own brands)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brand_kit' AND policyname = 'Users can delete own brand kit'
  ) THEN
    CREATE POLICY "Users can delete own brand kit" ON brand_kit FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
