-- Ad Intelligence: competitors, research sessions, ad_library extensions
-- Run after: 20260405_ad_library.sql

-- 1. Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  notes TEXT,
  last_researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own competitors" ON competitors
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);

-- 2. Extend ad_library with new columns
ALTER TABLE ad_library ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS ad_format TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS ad_copy TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS landing_page_url TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS landing_page_analysis JSONB;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ad_library_user_id ON ad_library(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_library_competitor_id ON ad_library(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ad_library_platform ON ad_library(platform);
CREATE INDEX IF NOT EXISTS idx_ad_library_is_favorite ON ad_library(is_favorite);

-- 3. Research sessions table (write-once, no updated_at)
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  strategy TEXT,
  applied_insights JSONB,
  source_ads UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own research sessions" ON research_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Extend ad_campaigns with research link
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS research_session_id UUID REFERENCES research_sessions(id) ON DELETE SET NULL;

-- 5. Updated_at trigger (reuse if exists, create if not)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_competitors_updated_at ON competitors;
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ad_library_updated_at ON ad_library;
CREATE TRIGGER update_ad_library_updated_at
  BEFORE UPDATE ON ad_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
