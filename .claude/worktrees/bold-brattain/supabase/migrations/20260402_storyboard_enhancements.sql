-- Storyboard Enhancements Migration
-- Phase B columns required for Enhancements 2, 3, 4, 5, 6

-- Enhancement 3: Anchor Image / Style Lock
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS anchor_image_url TEXT;
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS anchor_image_description TEXT;

-- Enhancement 4: Ingredient Palette (characters, props, environments per storyboard)
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '{"characters":[],"props":[],"environments":[]}'::jsonb;

-- Enhancement 2 / 5: One-Shot Grid + Bookend Interpolation
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS grid_image_url TEXT;

-- Enhancement 6: Per-Scene Generation Mode (auto | standalone | continuity)
ALTER TABLE storyboard_frames ADD COLUMN IF NOT EXISTS generation_mode TEXT DEFAULT 'auto';
