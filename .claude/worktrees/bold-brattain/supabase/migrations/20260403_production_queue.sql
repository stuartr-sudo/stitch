CREATE TABLE IF NOT EXISTS production_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  niche TEXT NOT NULL,
  topic TEXT NOT NULL,
  hook TEXT,
  angle TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','scripting','generating','assembling','ready','failed','published')),
  priority INTEGER DEFAULT 0,
  draft_id UUID,
  campaign_id UUID,
  error_message TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own queue items" ON production_queue
  FOR ALL USING (auth.uid() = user_id);
