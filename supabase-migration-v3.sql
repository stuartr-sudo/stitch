-- Migration V3: Generated Audio Library

-- 1. Create generated_audio table
CREATE TABLE IF NOT EXISTS generated_audio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  prompt text,
  negative_prompt text,
  model text NOT NULL,
  audio_url text NOT NULL,
  duration_seconds float,
  refinement integer,
  creativity float,
  seed integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on generated_audio
ALTER TABLE generated_audio ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for generated_audio
CREATE POLICY "Users can view own audio"
  ON generated_audio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio"
  ON generated_audio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio"
  ON generated_audio FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Auto-update updated_at on generated_audio
CREATE TRIGGER update_generated_audio_updated_at
  BEFORE UPDATE ON generated_audio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_audio_user_id ON generated_audio(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_audio_model ON generated_audio(model);
