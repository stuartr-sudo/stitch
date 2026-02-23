-- =============================================================================
-- Stitch Initial Schema (consolidated from v1–v6 migrations)
-- All statements use IF NOT EXISTS / OR REPLACE so this is safe to run against
-- a Supabase project that may already have some of these objects.
-- =============================================================================

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

ALTER TABLE image_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_videos    ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own images"  ON image_library_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own images" ON image_library_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own images" ON image_library_items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own videos"  ON generated_videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own videos" ON generated_videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own videos" ON generated_videos FOR DELETE USING (auth.uid() = user_id);

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

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own API keys"   ON user_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own API keys" ON user_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own API keys" ON user_api_keys FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own brand kit"   ON brand_kit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own brand kit" ON brand_kit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own brand kit" ON brand_kit FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_brand_kit_updated_at
  BEFORE UPDATE ON brand_kit FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own loras"   ON brand_loras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own loras" ON brand_loras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own loras" ON brand_loras FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own loras" ON brand_loras FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_brand_loras_updated_at
  BEFORE UPDATE ON brand_loras FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own brand assets"   ON brand_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own brand assets" ON brand_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own brand assets" ON brand_assets FOR DELETE USING (auth.uid() = user_id);

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

CREATE POLICY IF NOT EXISTS "Users can view own campaigns"   ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ad Drafts (storyboard + generated assets per campaign × ratio)
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

CREATE POLICY IF NOT EXISTS "Users can view own drafts"   ON ad_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own drafts" ON ad_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own drafts" ON ad_drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own drafts" ON ad_drafts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ad_drafts_updated_at
  BEFORE UPDATE ON ad_drafts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own connections"   ON platform_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own connections" ON platform_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own connections" ON platform_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own connections" ON platform_connections FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON platform_connections FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own jobs"   ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own jobs" ON jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own audio"   ON generated_audio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own audio" ON generated_audio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own audio" ON generated_audio FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_generated_audio_updated_at
  BEFORE UPDATE ON generated_audio FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own templates"   ON user_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own templates" ON user_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own templates" ON user_templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own templates" ON user_templates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_templates_updated_at
  BEFORE UPDATE ON user_templates FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE POLICY IF NOT EXISTS "Users can view own visual subjects"   ON visual_subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own visual subjects" ON visual_subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own visual subjects" ON visual_subjects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own visual subjects" ON visual_subjects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_visual_subjects_updated_at
  BEFORE UPDATE ON visual_subjects FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
