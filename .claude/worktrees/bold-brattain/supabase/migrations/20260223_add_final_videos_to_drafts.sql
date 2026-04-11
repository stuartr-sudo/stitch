-- Add final_videos_json to ad_drafts to store the concatenated final video URLs per ratio.
-- Shape: { "9:16": "https://...", "1:1": "https://...", "16:9": "https://..." }
-- These are the deliverable output videos (all scenes stitched + audio mixed).

ALTER TABLE ad_drafts
  ADD COLUMN IF NOT EXISTS final_videos_json jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ad_drafts.final_videos_json IS
  'Concatenated final video URLs keyed by aspect ratio. Produced by fal-ai/ffmpeg-api after all scene clips are generated.';
