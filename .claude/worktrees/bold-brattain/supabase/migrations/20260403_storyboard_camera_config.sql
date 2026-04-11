-- Add camera_config JSONB column to storyboard_frames
-- Stores structured camera control: { movement, speed, angle, framing, customMotion, preset }
ALTER TABLE storyboard_frames
ADD COLUMN IF NOT EXISTS camera_config JSONB DEFAULT NULL;

COMMENT ON COLUMN storyboard_frames.camera_config IS 'Structured camera direction: { movement, speed, angle, framing, customMotion, preset }';
