-- Migration V7: Workflow engine, batch processing, variants, autonomous loop
-- Run this in Supabase SQL Editor

-- 1. Workflow engine columns on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS workflow_state text DEFAULT 'idle';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS workflow_steps jsonb DEFAULT '[]'::jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS step_results jsonb DEFAULT '{}'::jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS retry_count int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_retries int DEFAULT 3;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS batch_id uuid;
CREATE INDEX IF NOT EXISTS idx_jobs_workflow_state ON jobs(workflow_state);
CREATE INDEX IF NOT EXISTS idx_jobs_batch_id ON jobs(batch_id);

-- 2. Batch tracking
CREATE TABLE IF NOT EXISTS job_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text,
  total_jobs int DEFAULT 0,
  completed_jobs int DEFAULT 0,
  failed_jobs int DEFAULT 0,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE job_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own batches" ON job_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own batches" ON job_batches FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE jobs ADD CONSTRAINT fk_jobs_batch_id
  FOREIGN KEY (batch_id) REFERENCES job_batches(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION increment_batch_completed_jobs(p_batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE job_batches
  SET completed_jobs = COALESCE(completed_jobs, 0) + 1,
      status = CASE
        WHEN COALESCE(completed_jobs, 0) + 1 + COALESCE(failed_jobs, 0) >= total_jobs THEN 'completed'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_batch_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_batch_failed_jobs(p_batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE job_batches
  SET failed_jobs = COALESCE(failed_jobs, 0) + 1,
      status = CASE
        WHEN COALESCE(completed_jobs, 0) + COALESCE(failed_jobs, 0) + 1 >= total_jobs THEN
          CASE WHEN COALESCE(completed_jobs, 0) > 0 THEN 'partial' ELSE 'failed' END
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_batch_id;
END;
$$;

-- 3. Per-scene status and variant tracking on ad_drafts
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS scene_status_json jsonb DEFAULT '[]'::jsonb;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS variant_group_id uuid;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS variant_label text;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS style_preset_applied text;
CREATE INDEX IF NOT EXISTS idx_ad_drafts_variant_group ON ad_drafts(variant_group_id);

-- 4. Autonomous pipeline configuration
CREATE TABLE IF NOT EXISTS autonomous_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_username text NOT NULL,
  is_active boolean DEFAULT true,
  auto_publish boolean DEFAULT false,
  publish_delay_hours int DEFAULT 24,
  schedule_times jsonb DEFAULT '[]'::jsonb,
  ab_variants boolean DEFAULT false,
  max_daily_publishes int DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, brand_username)
);
ALTER TABLE autonomous_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own configs" ON autonomous_configs FOR ALL USING (auth.uid() = user_id);
