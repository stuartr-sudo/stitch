-- Rename brand_avatars → visual_subjects.
-- "Avatar" was too narrow — these are trained LoRA models that can represent
-- a person, product, mascot, brand style, or any other visual reference.

ALTER TABLE brand_avatars RENAME TO visual_subjects;

-- Rename indexes to match the new table name
ALTER INDEX IF EXISTS idx_brand_avatars_user_id       RENAME TO idx_visual_subjects_user_id;
ALTER INDEX IF EXISTS idx_brand_avatars_brand_username RENAME TO idx_visual_subjects_brand_username;

COMMENT ON TABLE visual_subjects IS
  'Trained LoRA models (visual subjects) — persons, products, mascots, styles, or any reference '
  'used to keep a consistent visual identity across AI-generated images and videos.';
