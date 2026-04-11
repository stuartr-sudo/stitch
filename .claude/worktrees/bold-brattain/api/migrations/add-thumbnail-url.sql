-- api/migrations/add-thumbnail-url.sql
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
CREATE INDEX IF NOT EXISTS idx_image_library_items_thumbnail ON image_library_items (thumbnail_url) WHERE thumbnail_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_videos_thumbnail ON generated_videos (thumbnail_url) WHERE thumbnail_url IS NOT NULL;
