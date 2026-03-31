-- Paid Ads Manager tables
-- Run: psql or Supabase SQL editor

-- Campaign briefs
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Campaign',
  objective text NOT NULL DEFAULT 'traffic', -- traffic, conversions, awareness, leads
  platforms jsonb NOT NULL DEFAULT '["linkedin"]'::jsonb,
  landing_url text,
  product_description text,
  target_audience text,
  brand_kit_id uuid,
  status text NOT NULL DEFAULT 'draft', -- draft, generating, review, published, paused
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual ad variations (one per platform per format)
CREATE TABLE IF NOT EXISTS ad_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL, -- google, linkedin, meta
  ad_format text NOT NULL DEFAULT 'single_image', -- responsive_search, display, single_image, carousel, video, stories
  copy_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_urls jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft, approved, published, rejected
  platform_ad_id text, -- ID returned after publishing
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user_id ON ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_variations_campaign_id ON ad_variations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_variations_user_id ON ad_variations(user_id);

-- RLS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ad campaigns"
  ON ad_campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own ad variations"
  ON ad_variations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ad_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_ad_updated_at();

CREATE TRIGGER ad_variations_updated_at
  BEFORE UPDATE ON ad_variations
  FOR EACH ROW EXECUTE FUNCTION update_ad_updated_at();
