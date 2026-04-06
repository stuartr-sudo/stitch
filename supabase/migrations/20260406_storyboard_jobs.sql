-- Storyboard Production Pipeline — Jobs table + missing columns
-- Required by api/storyboard/produce.js and production-status.js

-- ═══════════════════════════════════════════════════════════════════════════
-- STORYBOARD_JOBS — tracks production pipeline state
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS storyboard_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed')),
  current_step TEXT,              -- tts, video, lipsync, music, assembly, captions
  current_frame INTEGER,
  total_frames INTEGER,
  step_results JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  assembled_url TEXT,
  captioned_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_jobs_storyboard ON storyboard_jobs(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_jobs_user ON storyboard_jobs(user_id);

ALTER TABLE storyboard_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY storyboard_jobs_owner ON storyboard_jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER storyboard_jobs_updated_at
  BEFORE UPDATE ON storyboard_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD production_status TO STORYBOARDS
-- produce.js writes this; production-status.js reads it
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD generation tracking columns TO STORYBOARD_FRAMES
-- produce.js writes these; production-status.js reads them
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending';
ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS generation_error TEXT;
ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS generation_attempt INTEGER DEFAULT 0;
