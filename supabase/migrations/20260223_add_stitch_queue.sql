-- stitch_queue: Shared queue table for Doubleclicker → Stitch job handoff.
-- DC writes a row when an article finishes; Stitch polls for pending items.

CREATE TABLE IF NOT EXISTS stitch_queue (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_username text NOT NULL,
  writing_structure text,                    -- e.g. 'BRAND-LISTICLE'
  article_title text,
  article_url   text,                        -- published article URL (if available)
  article_content text,                      -- full HTML content
  payload       jsonb DEFAULT '{}'::jsonb,   -- any extra data DC wants to pass
  status        text DEFAULT 'pending' NOT NULL,  -- pending | processing | completed | failed
  error         text,
  picked_up_at  timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Index for the poll query: pending items ordered by creation time
CREATE INDEX IF NOT EXISTS idx_stitch_queue_status_created
  ON stitch_queue(status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_stitch_queue_brand
  ON stitch_queue(brand_username);

-- Auto-update updated_at
CREATE TRIGGER update_stitch_queue_updated_at
  BEFORE UPDATE ON stitch_queue FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: service_role only (both apps use service_role key)
ALTER TABLE stitch_queue ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (no user-facing RLS needed)
-- Service role bypasses RLS by default, so no policies required.

COMMENT ON TABLE stitch_queue IS
  'Job queue for Doubleclicker → Stitch handoff. DC inserts pending rows; Stitch polls, processes, and marks completed.';
