-- Storyboard System — Database Migration
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════════════
-- STORYBOARDS TABLE — the project container
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS storyboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Project info
  name TEXT NOT NULL,
  description TEXT,                          -- story overview / concept
  logline TEXT,                              -- one-sentence summary (from Stage 1)
  client_brief TEXT,                         -- client instructions
  status TEXT NOT NULL DEFAULT 'draft',      -- draft | scripted | previewed | approved | generating | complete

  -- Creative settings (persisted from wizard)
  narrative_style TEXT DEFAULT 'entertaining',
  target_audience TEXT,
  overall_mood TEXT,
  aspect_ratio TEXT DEFAULT '16:9',
  resolution TEXT DEFAULT '720p',
  desired_length INTEGER DEFAULT 60,         -- total target seconds
  frame_interval INTEGER DEFAULT 4,          -- seconds per storyboard frame

  -- Style settings
  visual_style TEXT DEFAULT 'cinematic',     -- style preset key
  visual_style_prompt TEXT,                  -- full prompt text from getPromptText()
  builder_style TEXT,
  builder_lighting TEXT,
  builder_color_grade TEXT,
  motion_style TEXT,                         -- video style preset key
  motion_style_prompt TEXT,                  -- full cinematography prompt

  -- Model settings
  global_model TEXT DEFAULT 'veo3',
  enable_audio BOOLEAN DEFAULT false,

  -- Audio settings
  tts_model TEXT DEFAULT 'elevenlabs-v3',
  voice TEXT DEFAULT 'Rachel',
  tts_speed REAL DEFAULT 1.0,
  lipsync_model TEXT DEFAULT 'kling-lipsync',
  content_type TEXT DEFAULT 'cartoon',       -- cartoon | realistic | 3d | anime
  music_mood TEXT,
  music_volume REAL DEFAULT 0.15,
  music_url TEXT,
  caption_style TEXT DEFAULT 'none',

  -- Brand
  brand_id UUID,                             -- reference to brand kit if used
  brand_data JSONB,                          -- snapshot of brand style guide at creation time

  -- Character references
  elements JSONB DEFAULT '[]'::jsonb,        -- Kling @Element descriptions + ref image URLs
  veo_reference_images JSONB DEFAULT '[]'::jsonb, -- Veo/Grok flat ref image URLs
  start_frame_url TEXT,
  start_frame_description TEXT,

  -- Scene direction pills
  scene_direction JSONB DEFAULT '{}'::jsonb,

  -- Props & negative prompts
  props JSONB DEFAULT '[]'::jsonb,
  negative_prompt TEXT,

  -- Output
  assembled_url TEXT,                        -- final assembled video URL
  captioned_url TEXT,                        -- final video with captions
  pdf_url TEXT,                              -- exported storyboard PDF URL

  -- Sharing
  share_token TEXT UNIQUE,                   -- public share link token
  share_enabled BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STORYBOARD FRAMES TABLE — one frame per interval (e.g., every 4 seconds)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS storyboard_frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,

  -- Position
  frame_number INTEGER NOT NULL,             -- 1-indexed position in the storyboard
  timestamp_seconds REAL NOT NULL,           -- when this frame starts (0, 4, 8, 12, ...)
  duration_seconds REAL NOT NULL DEFAULT 4,  -- length of this frame segment

  -- Narrative (from Stage 1)
  beat_type TEXT,                             -- hook, rising_action, climax, etc.
  narrative_note TEXT,                        -- what happens story-wise
  setting TEXT,                              -- location description
  character_action TEXT,                     -- what the character does
  character_emotion TEXT,                    -- character's emotional state
  emotional_tone TEXT,                       -- what the viewer should feel
  pacing_note TEXT,                          -- slow, building, fast, climactic
  transition_note TEXT,                      -- how this connects to next frame
  dialogue TEXT,                             -- narration or character speech

  -- Visual (from Stage 2)
  visual_prompt TEXT,                        -- model-ready video gen prompt (150-250 words)
  motion_prompt TEXT,                        -- camera movement description
  camera_angle TEXT,                         -- wide, medium, close-up, etc.
  preview_image_prompt TEXT,                 -- shorter prompt for static preview image
  negative_prompt TEXT,                      -- scene-specific negatives
  continuity_note TEXT,                      -- visual continuity to next frame

  -- Preview
  preview_image_url TEXT,                    -- cheap preview image (~$0.01)
  preview_status TEXT DEFAULT 'pending',     -- pending | generating | done | error

  -- Audio
  audio_url TEXT,                            -- TTS voiceover for this frame
  tts_duration REAL,                         -- actual TTS audio duration
  audio_status TEXT DEFAULT 'pending',       -- pending | generating | done | error | skipped

  -- Video Production
  video_url TEXT,                            -- generated video clip URL
  video_status TEXT DEFAULT 'pending',       -- pending | generating | done | error
  lipsync_video_url TEXT,                    -- lipsynced version (if applicable)
  original_video_url TEXT,                   -- pre-lipsync video (kept for comparison)
  last_frame_url TEXT,                       -- extracted last frame for chaining

  -- User edits
  user_edited BOOLEAN DEFAULT false,         -- has user manually edited this frame?
  locked BOOLEAN DEFAULT false,              -- prevent regeneration

  -- Brand compliance
  brand_warnings JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(storyboard_id, frame_number)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_storyboards_user ON storyboards(user_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_status ON storyboards(status);
CREATE INDEX IF NOT EXISTS idx_storyboards_share ON storyboards(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_frames_storyboard ON storyboard_frames(storyboard_id, frame_number);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboard_frames ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own storyboards
CREATE POLICY storyboards_owner ON storyboards
  FOR ALL USING (auth.uid() = user_id);

-- Frames inherit access from their parent storyboard
CREATE POLICY frames_owner ON storyboard_frames
  FOR ALL USING (
    EXISTS (SELECT 1 FROM storyboards WHERE id = storyboard_id AND user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storyboards_updated_at
  BEFORE UPDATE ON storyboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER frames_updated_at
  BEFORE UPDATE ON storyboard_frames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
