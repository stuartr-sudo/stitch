-- Add motion reference support to storyboard frames
ALTER TABLE storyboard_frames
ADD COLUMN IF NOT EXISTS motion_ref JSONB DEFAULT NULL;

COMMENT ON COLUMN storyboard_frames.motion_ref IS 'Optional motion transfer config: { videoUrl, trimmedUrl, startTime, endTime, model, characterOrientation, keepOriginalSound, elements, prompt }';
