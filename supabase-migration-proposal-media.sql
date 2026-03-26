-- Proposal media items (images & videos displayed on proposal pages)
CREATE TABLE IF NOT EXISTS proposal_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_slug text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url text NOT NULL,
  thumbnail_url text,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_media_slug ON proposal_media(proposal_slug);
