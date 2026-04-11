-- =============================================================================
-- Stitch Initial Schema (consolidated from v1–v6 migrations)
-- All statements use IF NOT EXISTS / OR REPLACE so this is safe to run against
-- a Supabase project that may already have some of these objects.
-- Policies use DO blocks for PG15 compatibility (no CREATE POLICY IF NOT EXISTS).
-- =============================================================================

-- Helper: idempotent policy creation (PG15-safe)
-- INSERT only supports WITH CHECK (no USING). For INSERT, pass the check expr as p_qual.
CREATE OR REPLACE FUNCTION _create_policy_if_not_exists(
  p_table text, p_name text, p_cmd text, p_qual text, p_check text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = p_table AND policyname = p_name) THEN
    IF upper(p_cmd) = 'INSERT' THEN
      -- INSERT: only WITH CHECK allowed, p_qual is the check expression
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (%s)', p_name, p_table, p_qual);
    ELSIF p_check IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR %s USING (%s) WITH CHECK (%s)', p_name, p_table, p_cmd, p_qual, p_check);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I FOR %s USING (%s)', p_name, p_table, p_cmd, p_qual);
    END IF;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared trigger function (safe to replace)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Base media library tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_library_items (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  url        text NOT NULL,
  title      text,
  prompt     text,
  model      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_videos (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  url        text NOT NULL,
  title      text,
  prompt     text,
  model      text,
  duration   float,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure columns exist even if tables were pre-existing
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS duration float;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE image_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_videos    ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('image_library_items', 'Users can view own images',  'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('image_library_items', 'Users can insert own images', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('image_library_items', 'Users can delete own images', 'DELETE', 'auth.uid() = user_id');

SELECT _create_policy_if_not_exists('generated_videos', 'Users can view own videos',  'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('generated_videos', 'Users can insert own videos', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('generated_videos', 'Users can delete own videos', 'DELETE', 'auth.uid() = user_id');

CREATE INDEX IF NOT EXISTS idx_image_library_items_user_id ON image_library_items(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id    ON generated_videos(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-user API keys (Stitch users store their own FAL / Wavespeed / OpenAI keys)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_api_keys (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  fal_key         text,
  wavespeed_key   text,
  openai_key      text,
  elevenlabs_key  text,
  huggingface_key text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS fal_key text;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS wavespeed_key text;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS openai_key text;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS elevenlabs_key text;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS huggingface_key text;

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('user_api_keys', 'Users can view own API keys',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('user_api_keys', 'Users can insert own API keys', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('user_api_keys', 'Users can update own API keys', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_api_keys_updated_at') THEN
    CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Kit (Stitch visual identity — colours, logo, voice)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_kit (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  brand_name     text,
  brand_username text,
  colors         jsonb DEFAULT '[]'::jsonb,
  logo_url       text,
  voice_style    text DEFAULT 'professional',
  taglines       jsonb DEFAULT '[]'::jsonb,
  style_preset   text DEFAULT 'modern',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE brand_kit ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('brand_kit', 'Users can view own brand kit',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_kit', 'Users can insert own brand kit', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_kit', 'Users can update own brand kit', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brand_kit_updated_at') THEN
    CREATE TRIGGER update_brand_kit_updated_at BEFORE UPDATE ON brand_kit FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_kit_brand_username
  ON brand_kit(brand_username) WHERE brand_username IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand LoRAs (trained image models per brand)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_loras (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                  text NOT NULL,
  trigger_word          text NOT NULL,
  fal_request_id        text,
  fal_model_url         text,
  status                text DEFAULT 'pending',
  training_images_count int  DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE brand_loras ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('brand_loras', 'Users can view own loras',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_loras', 'Users can insert own loras', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_loras', 'Users can update own loras', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_loras', 'Users can delete own loras', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_brand_loras_updated_at') THEN
    CREATE TRIGGER update_brand_loras_updated_at BEFORE UPDATE ON brand_loras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_brand_loras_user_id ON brand_loras(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Assets (uploaded product photos linked to LoRA training)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brand_assets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lora_id       uuid REFERENCES brand_loras(id) ON DELETE SET NULL,
  original_url  text NOT NULL,
  processed_url text,
  asset_type    text DEFAULT 'product',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('brand_assets', 'Users can view own brand assets',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_assets', 'Users can insert own brand assets', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('brand_assets', 'Users can delete own brand assets', 'DELETE', 'auth.uid() = user_id');

CREATE INDEX IF NOT EXISTS idx_brand_assets_user_id ON brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_lora_id ON brand_assets(lora_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Campaigns (groups of ad drafts tied to one article/source)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              text NOT NULL,
  platform          text DEFAULT 'tiktok',
  source_url        text,
  status            text DEFAULT 'draft',
  article_title     text,
  template_type     text,
  writing_structure text,
  brand_username    text,
  platforms         jsonb DEFAULT '[]'::jsonb,
  total_drafts      int  DEFAULT 0,
  completed_drafts  int  DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('campaigns', 'Users can view own campaigns',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('campaigns', 'Users can insert own campaigns', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('campaigns', 'Users can update own campaigns', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('campaigns', 'Users can delete own campaigns', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaigns_updated_at') THEN
    CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ad Drafts (storyboard + generated assets per campaign x ratio)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_drafts (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id        uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storyboard_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  generation_status  text  DEFAULT 'pending',
  assets_json        jsonb DEFAULT '[]'::jsonb,
  static_assets_json jsonb DEFAULT '[]'::jsonb,
  voiceover_url      text,
  music_url          text,
  captions_json      jsonb,
  final_video_url    text,
  final_videos_json  jsonb DEFAULT '{}'::jsonb,
  template_type      text,
  template_id        text,
  template_name      text,
  output_type        text  DEFAULT 'both',
  timelines_json     jsonb DEFAULT '{}'::jsonb,
  platforms          jsonb DEFAULT '[]'::jsonb,
  publish_status     text  DEFAULT 'draft',
  scheduled_for      timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE ad_drafts ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('ad_drafts', 'Users can view own drafts',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('ad_drafts', 'Users can insert own drafts', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('ad_drafts', 'Users can update own drafts', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('ad_drafts', 'Users can delete own drafts', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ad_drafts_updated_at') THEN
    CREATE TRIGGER update_ad_drafts_updated_at BEFORE UPDATE ON ad_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ad_drafts_campaign_id ON ad_drafts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_drafts_user_id     ON ad_drafts(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Platform Connections (OAuth tokens for TikTok, Instagram, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_connections (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform            text NOT NULL,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  platform_user_id    text,
  platform_username   text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('platform_connections', 'Users can view own connections',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('platform_connections', 'Users can insert own connections', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('platform_connections', 'Users can update own connections', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('platform_connections', 'Users can delete own connections', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_platform_connections_updated_at') THEN
    CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON platform_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id ON platform_connections(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Jobs (async multi-step pipeline job tracking)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type             text NOT NULL,
  status           text DEFAULT 'pending',
  current_step     text,
  total_steps      int  DEFAULT 1,
  completed_steps  int  DEFAULT 0,
  input_json       jsonb DEFAULT '{}'::jsonb,
  output_json      jsonb DEFAULT '{}'::jsonb,
  error            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('jobs', 'Users can view own jobs',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('jobs', 'Users can insert own jobs', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('jobs', 'Users can update own jobs', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');

-- Allow service role to write pipeline results without a user session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs' AND policyname = 'Service role can manage all jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage all jobs" ON jobs FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jobs_updated_at') THEN
    CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status  ON jobs(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Generated Audio Library
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_audio (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title            text,
  prompt           text,
  negative_prompt  text,
  model            text NOT NULL,
  audio_url        text NOT NULL,
  duration_seconds float,
  refinement       integer,
  creativity       float,
  seed             integer,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE generated_audio ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('generated_audio', 'Users can view own audio',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('generated_audio', 'Users can insert own audio', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('generated_audio', 'Users can delete own audio', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_generated_audio_updated_at') THEN
    CREATE TRIGGER update_generated_audio_updated_at BEFORE UPDATE ON generated_audio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_generated_audio_user_id ON generated_audio(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_audio_model   ON generated_audio(model);

-- ─────────────────────────────────────────────────────────────────────────────
-- User Templates (saved video ad templates with scene definitions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_templates (
  id                           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                         text NOT NULL,
  description                  text DEFAULT '',
  reference_video_url          text,
  thumbnail_url                text,
  scene_count                  int  DEFAULT 3,
  total_duration_seconds       int  DEFAULT 30,
  scenes                       jsonb DEFAULT '[]'::jsonb,
  music_mood                   text DEFAULT '',
  voice_pacing                 text DEFAULT '',
  template_type                text DEFAULT 'video',
  output_type                  text DEFAULT 'both',
  model_preferences            jsonb DEFAULT '{}'::jsonb,
  applicable_writing_structures jsonb DEFAULT '[]'::jsonb,
  platforms                    jsonb DEFAULT '["tiktok","instagram_reels","youtube_shorts"]'::jsonb,
  avatar_id                    uuid,
  aspect_ratio                 text,
  brand_username               text,
  visual_style_preset          text DEFAULT 'default',
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);

ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('user_templates', 'Users can view own templates',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('user_templates', 'Users can insert own templates', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('user_templates', 'Users can update own templates', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('user_templates', 'Users can delete own templates', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_templates_updated_at') THEN
    CREATE TRIGGER update_user_templates_updated_at BEFORE UPDATE ON user_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_templates_user_id       ON user_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_brand_username ON user_templates(brand_username);

-- ─────────────────────────────────────────────────────────────────────────────
-- Visual Subjects (LoRA-trained persons/products for ad continuity)
-- Previously named brand_avatars — created with the new name directly.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visual_subjects (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_username       text NOT NULL,
  name                 text NOT NULL,
  reference_image_url  text,
  lora_url             text,
  lora_trigger_word    text,
  description          text DEFAULT '',
  is_active            boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE visual_subjects ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('visual_subjects', 'Users can view own visual subjects',   'SELECT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('visual_subjects', 'Users can insert own visual subjects', 'INSERT', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('visual_subjects', 'Users can update own visual subjects', 'UPDATE', 'auth.uid() = user_id', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('visual_subjects', 'Users can delete own visual subjects', 'DELETE', 'auth.uid() = user_id');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_visual_subjects_updated_at') THEN
    CREATE TRIGGER update_visual_subjects_updated_at BEFORE UPDATE ON visual_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visual_subjects_user_id       ON visual_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_visual_subjects_brand_username ON visual_subjects(brand_username);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: safely increment completed_drafts on a campaign
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup: drop the helper function (not needed after migration)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS _create_policy_if_not_exists(text, text, text, text, text);
