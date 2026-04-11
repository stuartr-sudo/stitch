-- Carousel video support
-- Adds columns for video generation to existing carousel tables

ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_model text DEFAULT 'wavespeed_wan';
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS assembled_video_url text;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_duration integer DEFAULT 5;

ALTER TABLE carousel_slides ADD COLUMN IF NOT EXISTS video_generation_status text DEFAULT 'pending';

-- Expand carousel status to include video generation states
ALTER TABLE carousels DROP CONSTRAINT IF EXISTS carousels_status_check;
ALTER TABLE carousels ADD CONSTRAINT carousels_status_check
  CHECK (status IN ('draft', 'generating', 'ready', 'generating_videos', 'assembling', 'published', 'failed'));
