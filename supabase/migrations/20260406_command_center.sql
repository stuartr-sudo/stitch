-- Command Center: AI Marketing Campaign Orchestration
-- Tables: campaigns, items, messages

-- Campaign: groups content items from a single braindump
CREATE TABLE IF NOT EXISTS command_center_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'building', 'review', 'approved', 'published', 'cancelled')),
  plan_json JSONB,
  braindump_text TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  items_ready INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cc_campaigns_user ON command_center_campaigns(user_id);
CREATE INDEX idx_cc_campaigns_status ON command_center_campaigns(status);

-- Item: single content piece within a campaign (one per platform)
CREATE TABLE IF NOT EXISTS command_center_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES command_center_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL
    CHECK (type IN ('short', 'linkedin_post', 'carousel', 'ad_set', 'storyboard', 'custom')),
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'building', 'ready', 'approved', 'rejected', 'published', 'failed')),
  flow_id UUID,
  execution_id UUID,
  plan_item_json JSONB,
  result_json JSONB,
  preview_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cc_items_campaign ON command_center_items(campaign_id);
CREATE INDEX idx_cc_items_user ON command_center_items(user_id);
CREATE INDEX idx_cc_items_status ON command_center_items(status);
CREATE INDEX idx_cc_items_scheduled ON command_center_items(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Message: chat conversation history
CREATE TABLE IF NOT EXISTS command_center_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  thread_id UUID NOT NULL,
  campaign_id UUID REFERENCES command_center_campaigns(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cc_messages_thread ON command_center_messages(thread_id);
CREATE INDEX idx_cc_messages_user ON command_center_messages(user_id);
CREATE INDEX idx_cc_messages_campaign ON command_center_messages(campaign_id) WHERE campaign_id IS NOT NULL;

-- Auto-update updated_at on campaigns
CREATE OR REPLACE FUNCTION update_cc_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cc_campaigns_updated
  BEFORE UPDATE ON command_center_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_cc_campaign_timestamp();

-- Auto-update updated_at on items
CREATE TRIGGER trg_cc_items_updated
  BEFORE UPDATE ON command_center_items
  FOR EACH ROW EXECUTE FUNCTION update_cc_campaign_timestamp();

-- RLS: users can only access their own data
ALTER TABLE command_center_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_center_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_center_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_campaigns_policy ON command_center_campaigns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY cc_items_policy ON command_center_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY cc_messages_policy ON command_center_messages
  FOR ALL USING (auth.uid() = user_id);
