-- Migration V5: User Templates table

CREATE TABLE IF NOT EXISTS user_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  reference_video_url text,
  thumbnail_url text,
  scene_count int DEFAULT 3,
  total_duration_seconds int DEFAULT 30,
  scenes jsonb DEFAULT '[]'::jsonb,
  music_mood text DEFAULT '',
  voice_pacing text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON user_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON user_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON user_templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON user_templates FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_templates_user_id ON user_templates(user_id);

-- Auto-update updated_at on row change
CREATE TRIGGER update_user_templates_updated_at
  BEFORE UPDATE ON user_templates FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
