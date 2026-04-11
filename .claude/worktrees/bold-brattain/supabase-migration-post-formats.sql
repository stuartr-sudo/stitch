-- Post Format System Migration
-- Adds post_format column to carousels and linkedin_posts tables
-- The post_format value references a template key from src/lib/postFormatTemplates.js

ALTER TABLE carousels ADD COLUMN IF NOT EXISTS post_format text;
ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS post_format text;
