-- Storyboard Professional Polish — multi-voice, transitions
-- Phase 3: voice override per frame, scene transition controls

ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS voice_override TEXT DEFAULT NULL;
ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS transition_type TEXT DEFAULT 'cut';
ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS transition_duration REAL DEFAULT 0.5;
