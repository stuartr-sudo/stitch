-- Rename brand_avatars → visual_subjects (idempotent).
-- On fresh deployments visual_subjects is created directly; on existing Stitch
-- instances that already have brand_avatars we rename and update indexes.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'brand_avatars'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'visual_subjects'
  ) THEN
    ALTER TABLE brand_avatars RENAME TO visual_subjects;
    ALTER INDEX IF EXISTS idx_brand_avatars_user_id       RENAME TO idx_visual_subjects_user_id;
    ALTER INDEX IF EXISTS idx_brand_avatars_brand_username RENAME TO idx_visual_subjects_brand_username;
  END IF;
END $$;

COMMENT ON TABLE visual_subjects IS
  'Trained LoRA models (visual subjects) — persons, products, mascots, styles, or any reference '
  'used to keep a consistent visual identity across AI-generated images and videos.';
