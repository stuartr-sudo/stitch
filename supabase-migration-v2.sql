-- Migration V2: Brand Kit, LoRAs, Campaigns, Jobs, Platform Connections

-- 1. Extend user_api_keys with new key columns
ALTER TABLE user_api_keys
  ADD COLUMN IF NOT EXISTS openai_key text,
  ADD COLUMN IF NOT EXISTS elevenlabs_key text,
  ADD COLUMN IF NOT EXISTS huggingface_key text;

-- 2. Brand Kit table (one per user)
CREATE TABLE IF NOT EXISTS brand_kit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  brand_name text,
  colors jsonb DEFAULT '[]'::jsonb,
  logo_url text,
  voice_style text DEFAULT 'professional',
  taglines jsonb DEFAULT '[]'::jsonb,
  style_preset text DEFAULT 'modern',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand kit" ON brand_kit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brand kit" ON brand_kit FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brand kit" ON brand_kit FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_brand_kit_updated_at
  BEFORE UPDATE ON brand_kit FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Brand LoRAs table
CREATE TABLE IF NOT EXISTS brand_loras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_word text NOT NULL,
  fal_request_id text,
  fal_model_url text,
  status text DEFAULT 'pending',
  training_images_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_loras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loras" ON brand_loras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loras" ON brand_loras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own loras" ON brand_loras FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own loras" ON brand_loras FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_brand_loras_updated_at
  BEFORE UPDATE ON brand_loras FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Brand Assets table (uploaded product photos)
CREATE TABLE IF NOT EXISTS brand_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lora_id uuid REFERENCES brand_loras(id) ON DELETE SET NULL,
  original_url text NOT NULL,
  processed_url text,
  asset_type text DEFAULT 'product',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand assets" ON brand_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brand assets" ON brand_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own brand assets" ON brand_assets FOR DELETE USING (auth.uid() = user_id);

-- 5. Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  platform text DEFAULT 'tiktok',
  source_url text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Ad Drafts table (storyboards within campaigns)
CREATE TABLE IF NOT EXISTS ad_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storyboard_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  generation_status text DEFAULT 'pending',
  assets_json jsonb DEFAULT '[]'::jsonb,
  voiceover_url text,
  music_url text,
  captions_json jsonb,
  final_video_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ad_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts" ON ad_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts" ON ad_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON ad_drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON ad_drafts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ad_drafts_updated_at
  BEFORE UPDATE ON ad_drafts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Platform Connections table (OAuth tokens)
CREATE TABLE IF NOT EXISTS platform_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  platform_user_id text,
  platform_username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" ON platform_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON platform_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON platform_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON platform_connections FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON platform_connections FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Jobs table (async multi-step job tracking)
CREATE TABLE IF NOT EXISTS jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'pending',
  current_step text,
  total_steps int DEFAULT 1,
  completed_steps int DEFAULT 0,
  input_json jsonb DEFAULT '{}'::jsonb,
  output_json jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON jobs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_brand_kit_user_id ON brand_kit(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_loras_user_id ON brand_loras(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_user_id ON brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_lora_id ON brand_assets(lora_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_drafts_campaign_id ON ad_drafts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_drafts_user_id ON ad_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
