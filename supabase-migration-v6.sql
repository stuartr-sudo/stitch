-- Migration V6: Extended template system + brand avatars + pipeline enhancements

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend user_templates with type, model preferences, writing structures
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'template_type') THEN
    ALTER TABLE user_templates ADD COLUMN template_type text DEFAULT 'video';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'output_type') THEN
    ALTER TABLE user_templates ADD COLUMN output_type text DEFAULT 'both';
  END IF;

  -- Model preferences: which AI model to use for each generation step
  -- { image_model, video_model, motion_style, music_model, voice_model }
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'model_preferences') THEN
    ALTER TABLE user_templates ADD COLUMN model_preferences jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Writing structures this template fires for (e.g. ["BRAND-LISTICLE", "AFF-MULTI-COMPARE"])
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'applicable_writing_structures') THEN
    ALTER TABLE user_templates ADD COLUMN applicable_writing_structures jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Platforms this template generates for
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'platforms') THEN
    ALTER TABLE user_templates ADD COLUMN platforms jsonb DEFAULT '["tiktok","instagram_reels","youtube_shorts"]'::jsonb;
  END IF;

  -- Avatar to use (optional brand_avatars.id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'avatar_id') THEN
    ALTER TABLE user_templates ADD COLUMN avatar_id uuid;
  END IF;

  -- Aspect ratio override (null = auto from platforms)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_templates' AND column_name = 'aspect_ratio') THEN
    ALTER TABLE user_templates ADD COLUMN aspect_ratio text;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Brand avatars table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_avatars (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_username text NOT NULL,
  name text NOT NULL,
  reference_image_url text,          -- Source photo for LoRA training
  lora_url text,                     -- Trained LoRA weights URL
  lora_trigger_word text,            -- Trigger word to inject into prompts
  description text DEFAULT '',       -- "Young woman, 30s, professional, dark hair"
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own avatars" ON brand_avatars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own avatars" ON brand_avatars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own avatars" ON brand_avatars FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own avatars" ON brand_avatars FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brand_avatars_user_id ON brand_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_avatars_brand_username ON brand_avatars(brand_username);

CREATE TRIGGER update_brand_avatars_updated_at
  BEFORE UPDATE ON brand_avatars FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Extend ad_drafts with template tracking + output type
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'template_id') THEN
    ALTER TABLE ad_drafts ADD COLUMN template_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'template_name') THEN
    ALTER TABLE ad_drafts ADD COLUMN template_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'output_type') THEN
    ALTER TABLE ad_drafts ADD COLUMN output_type text DEFAULT 'both';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'timelines_json') THEN
    ALTER TABLE ad_drafts ADD COLUMN timelines_json jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'platforms') THEN
    ALTER TABLE ad_drafts ADD COLUMN platforms jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'static_assets_json') THEN
    ALTER TABLE ad_drafts ADD COLUMN static_assets_json jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'publish_status') THEN
    ALTER TABLE ad_drafts ADD COLUMN publish_status text DEFAULT 'draft';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_drafts' AND column_name = 'scheduled_for') THEN
    ALTER TABLE ad_drafts ADD COLUMN scheduled_for timestamptz;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Extend campaigns with writing structure + multi-template support
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'writing_structure') THEN
    ALTER TABLE campaigns ADD COLUMN writing_structure text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'article_title') THEN
    ALTER TABLE campaigns ADD COLUMN article_title text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'brand_username') THEN
    ALTER TABLE campaigns ADD COLUMN brand_username text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'total_drafts') THEN
    ALTER TABLE campaigns ADD COLUMN total_drafts int DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'completed_drafts') THEN
    ALTER TABLE campaigns ADD COLUMN completed_drafts int DEFAULT 0;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Add brand_username to brand_kit if missing
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brand_kit' AND column_name = 'brand_username') THEN
    ALTER TABLE brand_kit ADD COLUMN brand_username text;
  END IF;
END $$;

-- Unique index on brand_username (null-safe — only enforces uniqueness for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_kit_brand_username
  ON brand_kit(brand_username) WHERE brand_username IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC helper: safely increment completed_drafts on a campaign
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_campaign_completed_drafts(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET completed_drafts = COALESCE(completed_drafts, 0) + 1
  WHERE id = campaign_id;
END;
$$;
