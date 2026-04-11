-- Add missing columns for Shorts pipeline and campaign management
-- These columns are required by shortsPipeline.js and campaigns/create.js

-- ad_drafts: shorts pipeline fields
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS shorts_metadata_json jsonb;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS word_timestamps_json jsonb;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS captioned_video_url text;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'ad';
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS brand_username text;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS aspect_ratio text;

-- campaigns: content type tracking
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'ad';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS source_type text;
