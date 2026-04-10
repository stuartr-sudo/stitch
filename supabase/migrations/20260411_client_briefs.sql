-- Client Briefs: comprehensive project intake for AI content creation
CREATE TABLE IF NOT EXISTS client_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES brand_kit(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'planning', 'in_progress', 'review', 'completed', 'archived')),

  goal TEXT CHECK (goal IN ('brand_awareness', 'lead_generation', 'sales', 'engagement', 'content_calendar', 'product_launch', 'event_promotion', 'other')),
  goal_description TEXT,

  audience_demographics TEXT,
  audience_psychographics TEXT,
  audience_pain_points TEXT,

  tone TEXT[] DEFAULT '{}',
  tone_notes TEXT,

  budget_range TEXT CHECK (budget_range IN ('under_50', '50_200', '200_500', '500_plus', 'unlimited', 'not_specified')),
  budget_notes TEXT,

  deadline TIMESTAMPTZ,
  timeline_notes TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('asap', 'urgent', 'normal', 'flexible')),

  platforms TEXT[] DEFAULT '{}',

  existing_assets JSONB DEFAULT '[]',
  competitors JSONB DEFAULT '[]',
  kpis JSONB DEFAULT '[]',
  deliverables JSONB DEFAULT '[]',

  recommended_plan JSONB,
  additional_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_briefs_user ON client_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_client_briefs_status ON client_briefs(status);
CREATE INDEX IF NOT EXISTS idx_client_briefs_brand ON client_briefs(brand_kit_id) WHERE brand_kit_id IS NOT NULL;

CREATE TRIGGER trg_client_briefs_updated
  BEFORE UPDATE ON client_briefs
  FOR EACH ROW EXECUTE FUNCTION update_cc_campaign_timestamp();

ALTER TABLE client_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_briefs_policy ON client_briefs
  FOR ALL USING (auth.uid() = user_id);

-- Junction table: tracks content spawned from a brief
CREATE TABLE IF NOT EXISTS client_brief_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES client_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL CHECK (output_type IN (
    'command_center_campaign', 'automation_flow', 'short', 'carousel',
    'linkedin_post', 'ad_campaign', 'storyboard', 'longform', 'image_set'
  )),
  output_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_outputs_brief ON client_brief_outputs(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_outputs_user ON client_brief_outputs(user_id);

ALTER TABLE client_brief_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY brief_outputs_policy ON client_brief_outputs
  FOR ALL USING (auth.uid() = user_id);
