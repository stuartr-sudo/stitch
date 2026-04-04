-- Ad Library: saved ads from the Ad Discovery / Spy Tool
CREATE TABLE IF NOT EXISTS ad_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  platform TEXT,
  niche TEXT,
  thumbnail_url TEXT,
  analysis JSONB,
  clone_recipe JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ad_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ad library" ON ad_library
  FOR ALL USING (auth.uid() = user_id);
