-- Wan 2.2 dual-transformer LoRA support
-- The Wan 2.2 T2I trainer outputs TWO LoRA files:
--   diffusers_lora_file (low-noise transformer) -> stored in fal_model_url (existing)
--   high_noise_lora (high-noise transformer) -> stored in high_noise_lora_url (new)
-- Both must be passed to fal-ai/wan/v2.2-a14b/text-to-image/lora for best results.

ALTER TABLE brand_loras
ADD COLUMN IF NOT EXISTS high_noise_lora_url text;

COMMENT ON COLUMN brand_loras.high_noise_lora_url IS 'High-noise LoRA URL from Wan 2.2 dual-transformer training. NULL for non-Wan models.';
