-- Carousel Builder — Tables, RLS, Indexes, Triggers

-- 1. carousels — project-level metadata
CREATE TABLE IF NOT EXISTS carousels (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_kit_id         uuid REFERENCES brand_kit(id) ON DELETE SET NULL,
  title                text NOT NULL DEFAULT 'Untitled Carousel',
  source_url           text,
  source_content       text,
  platform             text NOT NULL DEFAULT 'instagram'
                       CHECK (platform IN ('instagram', 'linkedin', 'tiktok', 'facebook')),
  aspect_ratio         text NOT NULL DEFAULT '1080x1080'
                       CHECK (aspect_ratio IN ('1080x1080', '1080x1350', '1080x1920')),
  color_template       integer DEFAULT 0,
  style_preset         text,
  caption_text         text,
  status               text DEFAULT 'draft'
                       CHECK (status IN ('draft', 'generating', 'ready', 'published', 'failed')),
  slide_count          integer DEFAULT 0,
  published_platform_id text,
  error_message        text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own carousels" ON carousels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_carousels_user ON carousels(user_id);
CREATE TRIGGER update_carousels_updated_at BEFORE UPDATE ON carousels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. carousel_slides — per-slide content and assets
CREATE TABLE IF NOT EXISTS carousel_slides (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  carousel_id          uuid REFERENCES carousels(id) ON DELETE CASCADE NOT NULL,
  slide_number         integer NOT NULL,
  slide_type           text NOT NULL DEFAULT 'content'
                       CHECK (slide_type IN ('hook', 'content', 'stat', 'quote', 'cta', 'image_focus')),
  headline             text,
  body_text            text,
  stat_value           text,
  stat_label           text,
  cta_text             text,
  background_image_url text,
  composed_image_url   text,
  video_url            text,
  image_prompt         text,
  generation_status    text DEFAULT 'pending'
                       CHECK (generation_status IN ('pending', 'generating', 'done', 'failed')),
  locked               boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE(carousel_id, slide_number)
);

ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own carousel slides" ON carousel_slides FOR ALL
  USING (EXISTS (SELECT 1 FROM carousels WHERE carousels.id = carousel_slides.carousel_id AND carousels.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM carousels WHERE carousels.id = carousel_slides.carousel_id AND carousels.user_id = auth.uid()));
CREATE INDEX idx_carousel_slides_carousel ON carousel_slides(carousel_id, slide_number);
CREATE TRIGGER update_carousel_slides_updated_at BEFORE UPDATE ON carousel_slides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
