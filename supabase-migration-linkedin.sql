-- LinkedIn Posting Tool — Tables, RLS, Indexes, Triggers

-- 1. linkedin_config — per-user settings
CREATE TABLE IF NOT EXISTS linkedin_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  news_search_queries jsonb DEFAULT '[]'::jsonb,
  series_title text DEFAULT 'INDUSTRY WATCH',
  linkedin_cta_text text,
  linkedin_cta_url text,
  exa_api_key text,
  linkedin_access_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE linkedin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own config" ON linkedin_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_linkedin_config_updated_at BEFORE UPDATE ON linkedin_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. linkedin_topics — topic discovery queue
CREATE TABLE IF NOT EXISTS linkedin_topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  headline text,
  snippet text,
  source_domain text,
  relevance_score numeric(3,1),
  suggested_angle text,
  full_content text,
  status text DEFAULT 'discovered' CHECK (status IN ('discovered', 'generated', 'dismissed', 'expired')),
  discovered_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE linkedin_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own topics" ON linkedin_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_linkedin_topics_dedup ON linkedin_topics(user_id, url, (discovered_at::date));
CREATE INDEX idx_linkedin_topics_user_status ON linkedin_topics(user_id, status);

-- 3. linkedin_posts — generated post variations
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES linkedin_topics(id) ON DELETE CASCADE NOT NULL,
  style text NOT NULL CHECK (style IN ('contrarian', 'story', 'data')),
  body text NOT NULL,
  excerpt text,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'published', 'rejected', 'failed')),
  featured_image_square text,
  featured_image_landscape text,
  published_linkedin_id text,
  post_number integer,
  template_index integer,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own posts" ON linkedin_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_linkedin_posts_updated_at BEFORE UPDATE ON linkedin_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_linkedin_posts_user_status ON linkedin_posts(user_id, status);
CREATE INDEX idx_linkedin_posts_topic ON linkedin_posts(topic_id);
