-- Fix: batch_job_finished now raises on unknown p_field
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

  UPDATE batches
  SET status = 'completed', updated_at = now()
  WHERE id = p_batch_id
    AND status = 'running'
    AND (completed_items + failed_items) >= total_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: add WITH CHECK to UPDATE policy
DROP POLICY IF EXISTS "Users can update own batches" ON batches;
CREATE POLICY "Users can update own batches" ON batches
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix: add status CHECK constraint
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_status_check;
ALTER TABLE batches ADD CONSTRAINT batches_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'));
