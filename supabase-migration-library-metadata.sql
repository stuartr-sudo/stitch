-- media_metadata audit/fallback table
CREATE TABLE IF NOT EXISTS media_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  video_style text,
  visual_style text,
  model_name text,
  storyboard_name text,
  short_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, source_url)
);

ALTER TABLE media_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own metadata" ON media_metadata
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add metadata columns to image_library_items
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS video_style text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS visual_style text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS storyboard_name text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS short_name text;

-- Add metadata columns to generated_videos
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS video_style text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS visual_style text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS storyboard_name text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS short_name text;

-- Partial indexes for fast DISTINCT queries in filters endpoint
CREATE INDEX IF NOT EXISTS idx_ili_video_style ON image_library_items(video_style) WHERE video_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_visual_style ON image_library_items(visual_style) WHERE visual_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_model_name ON image_library_items(model_name) WHERE model_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_storyboard_name ON image_library_items(storyboard_name) WHERE storyboard_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_short_name ON image_library_items(short_name) WHERE short_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gv_video_style ON generated_videos(video_style) WHERE video_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_visual_style ON generated_videos(visual_style) WHERE visual_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_model_name ON generated_videos(model_name) WHERE model_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_storyboard_name ON generated_videos(storyboard_name) WHERE storyboard_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_short_name ON generated_videos(short_name) WHERE short_name IS NOT NULL;

-- RPC function for efficient DISTINCT metadata queries (used by /api/library/filters)
CREATE OR REPLACE FUNCTION get_distinct_metadata(col_name text, p_user_id uuid)
RETURNS TABLE(val text) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT DISTINCT %I AS val FROM image_library_items WHERE user_id = $1 AND %I IS NOT NULL
     UNION
     SELECT DISTINCT %I AS val FROM generated_videos WHERE user_id = $1 AND %I IS NOT NULL',
    col_name, col_name, col_name, col_name
  ) USING p_user_id;
END;
$$;
