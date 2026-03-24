-- image_tags: user-scoped tag definitions
CREATE TABLE IF NOT EXISTS image_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- image_tag_links: junction table
CREATE TABLE IF NOT EXISTS image_tag_links (
  image_id uuid NOT NULL REFERENCES image_library_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES image_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, tag_id)
);

-- RLS policies
ALTER TABLE image_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tags"
  ON image_tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tag links"
  ON image_tag_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM image_library_items
      WHERE image_library_items.id = image_tag_links.image_id
      AND image_library_items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM image_library_items
      WHERE image_library_items.id = image_tag_links.image_id
      AND image_library_items.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_image_tags_user_id ON image_tags(user_id);
CREATE INDEX idx_image_tag_links_image_id ON image_tag_links(image_id);
CREATE INDEX idx_image_tag_links_tag_id ON image_tag_links(tag_id);

-- Helper function: get tags with usage count and last-used date per user
CREATE OR REPLACE FUNCTION get_user_tags_with_counts(p_user_id uuid)
RETURNS TABLE(id uuid, name text, created_at timestamptz, count bigint, last_used timestamptz)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.id,
    t.name,
    t.created_at,
    COUNT(l.image_id) AS count,
    MAX(i.created_at) AS last_used
  FROM image_tags t
  LEFT JOIN image_tag_links l ON l.tag_id = t.id
  LEFT JOIN image_library_items i ON i.id = l.image_id
  WHERE t.user_id = p_user_id
  GROUP BY t.id, t.name, t.created_at
  ORDER BY last_used DESC NULLS LAST, t.created_at DESC;
$$;
