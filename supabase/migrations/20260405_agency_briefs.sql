-- Agency Mode: briefs and campaign assets
CREATE TABLE IF NOT EXISTS agency_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  brand_kit_id UUID,
  industry TEXT,
  target_audience TEXT,
  product_description TEXT,
  deliverables JSONB DEFAULT '[]',
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','generating','review','approved','delivered')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agency_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own briefs" ON agency_briefs
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS agency_campaign_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_id UUID NOT NULL REFERENCES agency_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('short','carousel','ad_set','longform','linkedin_post')),
  title TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','generating','ready','failed','approved','rejected')),
  result_url TEXT,
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agency_campaign_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own campaign assets" ON agency_campaign_assets
  FOR ALL USING (auth.uid() = user_id);
