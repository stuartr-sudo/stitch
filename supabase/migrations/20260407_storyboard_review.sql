-- Storyboard Review & Versioning
-- Adds client feedback, approval workflow, and version snapshots

-- ═══════════════════════════════════════════════════════════════════════════
-- REVIEW COMMENTS — per-scene feedback from external reviewers
-- No RLS — accessed via share token (no auth), validated in handler
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS storyboard_review_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  frame_number INTEGER,                       -- NULL = general comment
  reviewer_name TEXT NOT NULL DEFAULT 'Anonymous',
  reviewer_email TEXT,
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note' CHECK (comment_type IN ('note', 'approval', 'change_request')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_comments_storyboard
  ON storyboard_review_comments(storyboard_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REVIEW STATUS on storyboards
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERSION SNAPSHOTS — full storyboard + frames serialized to JSONB
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS storyboard_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_versions
  ON storyboard_versions(storyboard_id);

ALTER TABLE storyboard_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY versions_owner ON storyboard_versions
  FOR ALL USING (auth.uid() = user_id);
