-- Add scene_inputs_json to ad_drafts for per-scene regeneration data
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS scene_inputs_json jsonb;
