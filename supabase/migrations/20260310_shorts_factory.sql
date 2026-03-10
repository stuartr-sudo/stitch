-- Shorts Factory: add voiceover, captions, and shorts metadata to ad_drafts
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS voiceover_url TEXT;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS word_timestamps_json JSONB;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS captioned_video_url TEXT;
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS shorts_metadata_json JSONB;

-- Distinguish shorts from article-based campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'article';
