-- Campaign Brand Defaults
-- Stores per-brand module selections for campaign creation wizard.
-- When a user creates a new campaign for a brand, their saved selections are pre-checked.
CREATE TABLE campaign_brand_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  brand_username TEXT NOT NULL,
  selected_modules JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{"table":"brand_kit","label":"Brand Identity"}, {"table":"brand_loras","id":"uuid","name":"Dragon LoRA"}]
  selected_fields JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"brand_kit": ["brand_name","colors","logo_url"], "brand_guidelines": ["voice_and_tone","content_style_rules"]}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_username)
);

CREATE INDEX idx_campaign_brand_defaults_user ON campaign_brand_defaults(user_id);

ALTER TABLE campaign_brand_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own campaign defaults"
  ON campaign_brand_defaults FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
