-- Prompt Templates: user-defined and public prompt templates for generation tools
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  model_family TEXT DEFAULT 'all',
  template JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON prompt_templates FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read public templates"
  ON prompt_templates FOR SELECT
  USING (is_public = true);
