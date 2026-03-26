-- Add app_source column to library tables to distinguish between apps sharing the same Supabase
-- Run this migration against your Supabase project

-- image_library_items
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS app_source text DEFAULT 'stitch';

-- generated_videos
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS app_source text DEFAULT 'stitch';

-- generated_audio
ALTER TABLE generated_audio ADD COLUMN IF NOT EXISTS app_source text DEFAULT 'stitch';

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_image_library_items_app_source ON image_library_items (app_source);
CREATE INDEX IF NOT EXISTS idx_generated_videos_app_source ON generated_videos (app_source);
CREATE INDEX IF NOT EXISTS idx_generated_audio_app_source ON generated_audio (app_source);

-- Backfill: tag all existing rows as 'stitch' (the default handles this, but explicit for clarity)
-- UPDATE image_library_items SET app_source = 'stitch' WHERE app_source IS NULL;
-- UPDATE generated_videos SET app_source = 'stitch' WHERE app_source IS NULL;
-- UPDATE generated_audio SET app_source = 'stitch' WHERE app_source IS NULL;
