-- ── batches table ─────────────────────────────────────────────────────────────
CREATE TABLE batches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  niche           text NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  config          jsonb NOT NULL,
  total_items     int DEFAULT 0,
  completed_items int DEFAULT 0,
  failed_items    int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches" ON batches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own batches" ON batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own batches" ON batches
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on batches" ON batches
  FOR ALL USING (auth.role() = 'service_role');

-- ── batch_id column on jobs ───────────────────────────────────────────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_batch_id ON jobs(batch_id) WHERE batch_id IS NOT NULL;

-- ── Atomic RPC: increment counter + mark batch complete if done ───────────────
CREATE OR REPLACE FUNCTION batch_job_finished(p_batch_id uuid, p_field text)
RETURNS void AS $$
BEGIN
  IF p_field = 'completed_items' THEN
    UPDATE batches SET completed_items = completed_items + 1, updated_at = now() WHERE id = p_batch_id;
  ELSIF p_field = 'failed_items' THEN
    UPDATE batches SET failed_items = failed_items + 1, updated_at = now() WHERE id = p_batch_id;
  ELSE
    RAISE EXCEPTION 'batch_job_finished: unknown field "%"', p_field;
  END IF;

  -- Atomically transition to completed if all items are done
  UPDATE batches
  SET status = 'completed', updated_at = now()
  WHERE id = p_batch_id
    AND status = 'running'
    AND (completed_items + failed_items) >= total_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
