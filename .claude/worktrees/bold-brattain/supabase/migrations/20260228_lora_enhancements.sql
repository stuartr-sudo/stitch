-- LoRA System Enhancements: configurable training, stacking, pre-built library

-- brand_loras: training config columns
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS training_type text DEFAULT 'product';
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS rank int DEFAULT 16;
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS steps int DEFAULT 1000;
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS learning_rate float DEFAULT 0.0004;
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS brand_username text;
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS visual_subject_id uuid REFERENCES visual_subjects(id) ON DELETE SET NULL;
ALTER TABLE brand_loras ADD COLUMN IF NOT EXISTS lora_type text DEFAULT 'custom';

-- visual_subjects: training link back to brand_loras
ALTER TABLE visual_subjects ADD COLUMN IF NOT EXISTS brand_lora_id uuid REFERENCES brand_loras(id) ON DELETE SET NULL;
ALTER TABLE visual_subjects ADD COLUMN IF NOT EXISTS training_status text DEFAULT 'none';

-- brand_kit: default LoRAs applied to all generation
ALTER TABLE brand_kit ADD COLUMN IF NOT EXISTS default_loras jsonb DEFAULT '[]'::jsonb;

-- user_templates: multi-LoRA config (supplements existing avatar_id)
ALTER TABLE user_templates ADD COLUMN IF NOT EXISTS lora_config jsonb DEFAULT '[]'::jsonb;

-- Pre-built LoRA library (shared across all users)
CREATE TABLE IF NOT EXISTS lora_library (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    text NOT NULL,
  slug                    text NOT NULL UNIQUE,
  description             text DEFAULT '',
  category                text NOT NULL,
  hf_repo_id              text NOT NULL,
  preview_url             text,
  default_scale           float DEFAULT 0.8,
  recommended_trigger_word text,
  compatible_models       jsonb DEFAULT '["flux-2"]'::jsonb,
  is_featured             boolean DEFAULT false,
  sort_order              int DEFAULT 100,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lora_library_category ON lora_library(category);
CREATE INDEX IF NOT EXISTS idx_lora_library_slug ON lora_library(slug);
