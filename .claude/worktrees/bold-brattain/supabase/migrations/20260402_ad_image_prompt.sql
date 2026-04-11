-- Add image_prompt column to ad_variations to store the GPT-generated image prompt
ALTER TABLE ad_variations ADD COLUMN IF NOT EXISTS image_prompt text;
