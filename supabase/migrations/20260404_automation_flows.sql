-- Automation Flows
CREATE TABLE automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  graph_json JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  is_template BOOLEAN DEFAULT FALSE,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  schedule_cron TEXT,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_flows_user ON automation_flows(user_id);
CREATE INDEX idx_automation_flows_template ON automation_flows(is_template) WHERE is_template = TRUE;

CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW EXECUTE FUNCTION update_automation_flows_updated_at();

ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flows"
  ON automation_flows FOR ALL
  USING (user_id = auth.uid() OR is_template = TRUE)
  WITH CHECK (user_id = auth.uid());

-- Automation Executions
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'queued',
  step_states JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_executions_flow ON automation_executions(flow_id);
CREATE INDEX idx_automation_executions_user ON automation_executions(user_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status);

ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own executions"
  ON automation_executions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
