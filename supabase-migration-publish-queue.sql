-- ── publish_queue table ──────────────────────────────────────────────────────
CREATE TABLE publish_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_id        uuid REFERENCES ad_drafts(id) ON DELETE CASCADE NOT NULL,
  platform        text NOT NULL,
  status          text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed')),
  scheduled_for   timestamptz NOT NULL,
  title           text NOT NULL,
  description     text DEFAULT '',
  privacy         text DEFAULT 'public',
  published_id    text,
  published_url   text,
  error           text,
  attempts        int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items" ON publish_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue items" ON publish_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue items" ON publish_queue
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue items" ON publish_queue
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on publish_queue" ON publish_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_publish_queue_scheduled ON publish_queue(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_publish_queue_user ON publish_queue(user_id, status);
