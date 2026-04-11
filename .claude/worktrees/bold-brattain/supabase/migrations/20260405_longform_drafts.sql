-- Longform Video Workbench drafts table
CREATE TABLE IF NOT EXISTS longform_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID,
  title TEXT,
  niche TEXT,
  state JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE longform_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own longform drafts"
  ON longform_drafts
  FOR ALL
  USING (auth.uid() = user_id);
