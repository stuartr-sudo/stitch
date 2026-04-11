-- Add training_model column to brand_loras to track which FAL model was used
-- Must be run BEFORE deploying the updated train.js

ALTER TABLE brand_loras
ADD COLUMN IF NOT EXISTS training_model text DEFAULT 'flux-lora-fast';

UPDATE brand_loras SET training_model = 'flux-lora-fast' WHERE training_model IS NULL;

COMMENT ON COLUMN brand_loras.training_model IS 'ID from trainingModelRegistry.js — determines FAL endpoint for training and polling';
