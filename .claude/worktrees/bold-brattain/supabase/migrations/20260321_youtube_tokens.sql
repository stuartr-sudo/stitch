-- YouTube OAuth tokens per brand
CREATE TABLE IF NOT EXISTS brand_youtube_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_username text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  channel_id text,
  channel_title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_brand_youtube_tokens_updated_at
  BEFORE UPDATE ON brand_youtube_tokens FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE brand_youtube_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own YouTube tokens"
  ON brand_youtube_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add youtube_video_id to ad_drafts
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS youtube_video_id text;

-- Temporary nonces for YouTube OAuth CSRF protection
CREATE TABLE IF NOT EXISTS youtube_oauth_nonces (
  nonce text PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_username text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_youtube_nonces_created
  ON youtube_oauth_nonces(created_at);
