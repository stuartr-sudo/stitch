-- storyboard_presets: saved wizard configurations per user
CREATE TABLE IF NOT EXISTS storyboard_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- RLS policies
ALTER TABLE storyboard_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presets"
  ON storyboard_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_storyboard_presets_user ON storyboard_presets(user_id);
