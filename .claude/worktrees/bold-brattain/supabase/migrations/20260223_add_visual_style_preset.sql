-- Add visual_style_preset to user_templates
-- This stores which locked visual style preset the template uses
-- (ugc | testimonial | cinematic | product_demo | lifestyle | bold_punchy | minimal | documentary | null)

ALTER TABLE user_templates
  ADD COLUMN IF NOT EXISTS visual_style_preset text DEFAULT NULL;

COMMENT ON COLUMN user_templates.visual_style_preset IS
  'Preset visual style key — locks lighting, camera, and color grade for all generated images/videos. NULL = no preset (AI decides freely).';
