# LinkedIn Posting Tool — Design Spec

## Overview

A LinkedIn content creation tool integrated into Stitch as a top-level page at `/linkedin`. Users discover relevant topics via manual search, generate 3 post variations per topic using distinct writing styles, review/edit in a LinkedIn-style feed, generate branded images on approval, and publish directly to LinkedIn.

No scheduling, no cron jobs, no client-facing pages. Internal tool only.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config storage | New `linkedin_config` table (per-user) | Clean separation from brand_kit |
| URL content fetching | Exa API (new provider) | Best content extraction quality |
| Topic discovery | Manual only — "Search" button | Validate scoring before automating |
| Publishing | Manual "Publish Now" only | Keep it simple, no scheduling complexity |
| Client-facing page | Not needed | Internal tool only |
| Image generation | Full branded composition from day one | Consistency matters for LinkedIn |
| UI location | Top-level `/linkedin` page | Parallel to Campaigns/Shorts |
| Page layout | Single page, two-panel | Workflow fits one view |

---

## UI Layout

Single page at `/linkedin` with two panels:

### Left Panel — Topic Queue

- **Search input**: Text field + "Search" button. Accepts search terms or a pasted URL.
  - Search terms → SerpAPI Google News search → score results → insert into `linkedin_topics`
  - Pasted URL → Exa API fetch content → score relevance → insert into `linkedin_topics`
- **Topic cards**: Sorted by relevance score (highest first). Each card shows:
  - Relevance score badge: green (8+), amber (6-7), red (<6)
  - Headline, source domain, time ago
  - Suggested angle (from scorer)
  - **Generate** button → triggers 3 post variations
  - **Dismiss** button → marks topic as dismissed

### Right Panel — Post Feed

- LinkedIn-style feed showing generated posts grouped by topic
- Each post card shows:
  - Brand avatar + name (from `brand_kit`)
  - Style badge: Contrarian (blue), Story (amber), Data (green)
  - Post body with "...see more" truncation (click to expand)
  - Featured image (placeholder before approval, branded image after)
  - Action buttons: **Approve & Publish**, **Edit**, **Regenerate**, **Reject**
- Inline editing: textarea with 3000-char counter, save/cancel

### Header Navigation

Add "LinkedIn" button to the header alongside "Campaigns" and "Templates" in `VideoAdvertCreator.jsx`.

---

## Post Generation

### Trigger

User clicks "Generate" on a topic card.

### Process

1. `POST /api/linkedin/generate-posts` with `topic_id`
2. Backend fetches topic's source URL content via Exa API
3. Loads brand context from `brand_kit` + `linkedin_config`
4. Generates **3 variations in parallel** via GPT-4.1:

| Style | Approach | Length |
|-------|----------|--------|
| **Contrarian Insight** | Bold claim challenging conventional thinking, explains why the common take is wrong | 150-250 words |
| **Story-Led** | Opens with a vivid scene (specific person, place, moment), mini narrative | 150-250 words |
| **Data/Stat Punch** | Leads with a surprising number or concrete fact from the source | 100-200 words |

5. All 3 posts inserted into `linkedin_posts` with status `generated`
6. Partial success OK — if one style fails, the other two still return
7. Topic status updates to `generated`

### Anti-Slop Rules (baked into every prompt)

- First line must be under 200 characters (LinkedIn "see more" cutoff)
- NO filler phrases ("In today's world", "Let's dive in", etc.)
- NO hedging ("might", "could potentially")
- NO AI cliches ("landscape", "navigate", "leverage", "robust")
- NO emojis, NO hashtags, NO markdown
- Every sentence must add new information
- Be specific: use names, numbers, places

### CTA Handling

If `linkedin_cta_text` and `linkedin_cta_url` are configured in `linkedin_config`, append as final line: `{cta_text} {cta_url}`

---

## Topic Scoring

`newsjackScorer.js` — scores each discovered topic for relevance to the brand's niche on a 1-10 scale.

**Input**: Article headline, snippet, source URL, brand context from `linkedin_config` (niche keywords, industry).

**Output**: Relevance score (1-10), suggested angle.

**Dedup**: Same URL + same user + same day = skipped.

**Expiry**: Topics auto-expire after 7 days if not acted on.

---

## Image Composition

### Trigger

User clicks "Approve & Publish" on a post.

### Process

1. Generate AI base image via Imagineer (Nano Banana 2) using post content as prompt
2. Generate LLM excerpt — GPT picks strongest 6-12 word pull quote from post text
3. Compose branded image using `sharp` (SVG overlay onto base image)
4. Generate **both formats**:
   - Square (1080×1080) — stored in `featured_image_square`
   - Landscape (1200×628) — stored in `featured_image_landscape`
5. Upload to Supabase Storage at `media/linkedin/composed-{timestamp}-{random}.png`

### Composition Layers (in order)

1. **Base image** — AI-generated, `sharp.resize` with `fit: 'cover', position: 'center'`
2. **Gradient overlay** — 3-stop linear gradient at 88% opacity
3. **Radial orb** — soft glow ellipse, 25% opacity center fading to 0%
4. **Noise grain** — fractal noise filter at 3.5% opacity (baseFrequency: 0.7, numOctaves: 4)
5. **Decorative quote mark** — `"` (left curly quote), 35% opacity, white
6. **Quote text** — LLM-generated excerpt, white, bold, serif font (DejaVu Serif)
7. **Series pill** — rounded rect with semi-transparent fill + stroke, template accent color
8. **Watch number** — "Watch #N", white, 90% opacity, sans-serif (DejaVu Sans)
9. **Logo pill** — white rounded pill (97% opacity) containing resized brand logo

### Square Layout (1080×1080)

| Element | Position | Font Size |
|---------|----------|-----------|
| Logo pill | top-center, y=55 | logo 140px wide |
| Quote mark | centered, above quote block | DejaVu Serif 90px |
| Quote text | centered at y≈420 | DejaVu Serif 72px, line-height 86px, ~18 chars/line |
| Series pill | centered, y=860, `white-space: nowrap` | DejaVu Sans 24px, letter-spacing 5 |
| Watch number | centered, below pill + 36px | DejaVu Sans 22px, letter-spacing 2 |

### Landscape Layout (1200×628)

| Element | Position | Font Size |
|---------|----------|-----------|
| Logo pill | top-left (20, 20) | logo 100px wide |
| Quote mark | centered, above quote block | DejaVu Serif 72px |
| Quote text | centered vertically | DejaVu Serif 56px, line-height 70px, max 2 lines |
| Series pill | bottom-center | DejaVu Sans 20px, letter-spacing 4 |
| Watch number | bottom-right, above pill level | DejaVu Sans 18px, letter-spacing 2 |

### 6 Color Templates

Auto-rotate by `(postNumber - 1) % 6`:

| # | Name | Gradient Stops | Angle | Orb Color | Orb Y% | Pill Fill | Pill Stroke |
|---|------|---------------|-------|-----------|--------|-----------|-------------|
| 0 | arctic-steel | #0a1628 → #1e3a5f → #94a3b8 | 150° | #64748b | 35% | rgba(100,116,139,0.45) | rgba(100,116,139,0.5) |
| 1 | sunset-coral | #1a0a1e → #7c2d5f → #f97316 | 135° | #f97316 | 60% | rgba(249,115,22,0.4) | rgba(249,115,22,0.45) |
| 2 | electric-violet | #0a0020 → #4a00b4 → #bf5af2 | 140° | #bf5af2 | 45% | rgba(191,90,242,0.4) | rgba(191,90,242,0.45) |
| 3 | royal-gold | #1a0a2e → #44337a → #d69e2e | 140° | #d69e2e | 55% | rgba(214,158,46,0.4) | rgba(214,158,46,0.45) |
| 4 | midnight-rose | #0f0c29 → #302b63 → #e44d7b | 140° | #ec4899 | 70% | rgba(236,72,153,0.4) | rgba(236,72,153,0.45) |
| 5 | purple-burst | #1a0a3e → #3b1c8c → #0ea5e9 | 145° | #7c3aed | 30% | rgba(124,58,237,0.45) | rgba(124,58,237,0.5) |

### Orb Dimensions

| Format | rx | ry |
|--------|----|----|
| Square | 450 | 400 |
| Landscape | 550 | 280 |

### Logo Pill Construction

- Logo resized to width: 140px (square) / 100px (landscape)
- White rounded pill: `fill="white" opacity="0.97"`, border-radius = pillHeight / 2
- Pill dimensions: (logoWidth + 72) × (logoHeight + 32)
- Logo placed inside pill at offset top: 16, left: 36

### Font Requirements

DejaVu Serif / Liberation Serif (quote text + decorative mark), DejaVu Sans / Liberation Sans (series pill + watch number). In Docker: install `fontconfig`, `fonts-dejavu-core`, `fonts-liberation`.

### Compose API Input

```json
{
  "image_url": "https://...",
  "logo_url": "https://...",
  "series_title": "PRODUCT LIABILITY WATCH",
  "post_number": 47,
  "excerpt": "Six to twelve word headline",
  "template_index": null,
  "format": "square"
}
```

Output: PNG uploaded to Supabase Storage, returns public URL.

---

## Publishing

### Trigger

User clicks "Approve & Publish" on a post.

### Process

1. Post status → `approved`
2. Image composition kicks off (both square + landscape)
3. `POST /api/linkedin/publish` sends post to LinkedIn API
4. Sends landscape image when available
5. On success: status → `published`, stores `published_linkedin_id`
6. On failure: status → `failed`, error stored for display
7. Images are non-blocking — post can publish even if image generation fails

---

## Database

### New Tables

#### `linkedin_config`

Per-user LinkedIn tool configuration.

```sql
CREATE TABLE linkedin_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  news_search_queries jsonb DEFAULT '[]'::jsonb,
  series_title text DEFAULT 'INDUSTRY WATCH',
  linkedin_cta_text text,
  linkedin_cta_url text,
  exa_api_key text,
  linkedin_access_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

#### `linkedin_topics`

Topic discovery queue.

```sql
CREATE TABLE linkedin_topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  headline text,
  snippet text,
  source_domain text,
  relevance_score numeric(3,1),
  suggested_angle text,
  full_content text,
  status text DEFAULT 'discovered' CHECK (status IN ('discovered', 'generated', 'dismissed', 'expired')),
  discovered_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Functional unique index for dedup (same URL + user + day)
CREATE UNIQUE INDEX idx_linkedin_topics_dedup ON linkedin_topics(user_id, url, (discovered_at::date));
```

#### `linkedin_posts`

Generated posts linked to topics.

```sql
CREATE TABLE linkedin_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES linkedin_topics(id) ON DELETE CASCADE NOT NULL,
  style text NOT NULL CHECK (style IN ('contrarian', 'story', 'data')),
  body text NOT NULL,
  excerpt text,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'published', 'rejected', 'failed')),
  featured_image_square text,
  featured_image_landscape text,
  published_linkedin_id text,
  post_number integer,
  template_index integer,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS Policies

All three tables get RLS enabled:

```sql
ALTER TABLE linkedin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own config" ON linkedin_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE linkedin_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own topics" ON linkedin_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own posts" ON linkedin_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Triggers

```sql
CREATE TRIGGER update_linkedin_config_updated_at BEFORE UPDATE ON linkedin_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_linkedin_posts_updated_at BEFORE UPDATE ON linkedin_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Post Number Assignment

`post_number` is assigned at publish time as a per-user sequential counter:

```sql
SELECT COALESCE(MAX(post_number), 0) + 1 FROM linkedin_posts WHERE user_id = $1 AND status = 'published'
```

`template_index` is derived: `(post_number - 1) % 6`.

### Indexes

```sql
CREATE INDEX idx_linkedin_topics_user_status ON linkedin_topics(user_id, status);
CREATE INDEX idx_linkedin_posts_user_status ON linkedin_posts(user_id, status);
CREATE INDEX idx_linkedin_posts_topic ON linkedin_posts(topic_id);
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/linkedin/config` | Get user's LinkedIn config |
| PUT | `/api/linkedin/config` | Update LinkedIn config (separate handler file) |
| POST | `/api/linkedin/search` | Search news via SerpAPI, score, insert topics |
| POST | `/api/linkedin/add-topic` | Manual URL paste, fetch via Exa, score |
| GET | `/api/linkedin/topics` | List discovered topics for user |
| PATCH | `/api/linkedin/topics/:id` | Dismiss/update topic status |
| POST | `/api/linkedin/generate-posts` | Generate 3 style variations for a topic |
| GET | `/api/linkedin/posts` | List posts for user |
| PATCH | `/api/linkedin/posts/:id` | Edit body, approve, reject |
| POST | `/api/linkedin/posts/:id/regenerate` | Re-roll one style for same topic |
| POST | `/api/linkedin/posts/:id/publish` | Compose image + publish to LinkedIn |

All endpoints require `authenticateToken` middleware.

---

## API Key Resolution

- **OpenAI** (GPT-4.1 for post generation, scoring, excerpt): via `getUserKeys()`
- **SerpAPI** (news search): existing `SEARCHAPI_KEY` / `SERP_API_KEY` env vars
- **Exa** (URL content fetching): new `EXA_API_KEY` env var + `linkedin_config.exa_api_key` per-user override
- **FAL** (Imagineer base image): via `getUserKeys()`
- **LinkedIn API** (publishing): stored in `linkedin_config.linkedin_access_token` per-user

---

## File Structure

### Backend

```
api/linkedin/
  get-config.js      — GET linkedin_config
  update-config.js   — PUT linkedin_config
  search.js          — SerpAPI news search + scoring
  add-topic.js       — Manual URL paste + Exa fetch
  topics.js          — GET topics list
  update-topic.js    — PATCH topic status
  generate-posts.js  — Generate 3 post variations
  posts.js           — GET posts list
  update-post.js     — PATCH post (edit/approve/reject)
  regenerate-post.js — Re-roll one style
  publish.js         — Compose image + publish to LinkedIn

api/lib/
  newsjackScorer.js     — Relevance scoring (GPT-4.1 mini)
  composeImage.js       — Sharp-based image compositor
  colorTemplates.js     — 6 color template definitions
  linkedinPublisher.js  — LinkedIn API integration
```

### Frontend

```
src/pages/
  LinkedInPage.jsx      — Main two-panel page

src/components/linkedin/
  TopicQueue.jsx        — Left panel: search + topic cards
  TopicCard.jsx         — Individual topic card
  PostFeed.jsx          — Right panel: LinkedIn-style feed
  PostCard.jsx          — Individual post card with actions
  LinkedInConfigModal.jsx — Settings modal for linkedin_config
```

### Migration

```
supabase-migration-linkedin.sql
```

### Dependencies

- `sharp` — verify if already installed; if not, `npm install sharp` (has native bindings, Docker build handles this)

### Docker

Add `fonts-dejavu-core` and `fonts-liberation` to Dockerfile apt-get. Verify `sharp` builds correctly in the Docker multi-stage build.

---

## Route Registration

In `server.js`, add a new LinkedIn block following the campaigns pattern (direct import):

```javascript
// LinkedIn
app.get('/api/linkedin/config', authenticateToken, (await import('./api/linkedin/get-config.js')).default);
app.put('/api/linkedin/config', authenticateToken, (await import('./api/linkedin/update-config.js')).default);
app.post('/api/linkedin/search', authenticateToken, (await import('./api/linkedin/search.js')).default);
app.post('/api/linkedin/add-topic', authenticateToken, (await import('./api/linkedin/add-topic.js')).default);
app.get('/api/linkedin/topics', authenticateToken, (await import('./api/linkedin/topics.js')).default);
app.patch('/api/linkedin/topics/:id', authenticateToken, (await import('./api/linkedin/update-topic.js')).default);
app.post('/api/linkedin/generate-posts', authenticateToken, (await import('./api/linkedin/generate-posts.js')).default);
app.get('/api/linkedin/posts', authenticateToken, (await import('./api/linkedin/posts.js')).default);
app.patch('/api/linkedin/posts/:id', authenticateToken, (await import('./api/linkedin/update-post.js')).default);
app.post('/api/linkedin/posts/:id/regenerate', authenticateToken, (await import('./api/linkedin/regenerate-post.js')).default);
app.post('/api/linkedin/posts/:id/publish', authenticateToken, (await import('./api/linkedin/publish.js')).default);
```

### Frontend Route

In `App.jsx`:

```javascript
<Route path="/linkedin" element={<ProtectedRoute><LinkedInPage /></ProtectedRoute>} />
```

---

## Cost Tracking

All API calls logged via `logCost()`:
- `openai` category for GPT-4.1 (scoring, post generation, excerpt)
- `fal` category for Imagineer base image
- `serpapi` category for news search (new category — add to Provider Health Dashboard)
- `exa` category for URL content fetch (new category — add to Provider Health Dashboard)

Update `CostDashboardPage.jsx` and `api/providers/health.js` to recognize and display the new `serpapi` and `exa` categories.

---

## Error Handling

- Post generation: partial success OK (2/3 styles can succeed)
- Image composition: non-blocking — post publishes even if images fail
- Exa fetch failure: fall back to direct HTTP fetch + basic HTML-to-text
- LinkedIn API failure: status → `failed`, error_message stored, UI shows retry option
- SerpAPI failure: show error toast, no topics inserted
- Vite proxy: existing `/api/*` proxy covers all LinkedIn routes. `generate-posts` (3 parallel GPT calls + Exa fetch) should complete within the 180s timeout. If it doesn't, switch to return-immediately + poll pattern (like `campaigns/create.js`)

---

## What's NOT In Scope

- Automated cron-based topic discovery
- Scheduled publishing / time slots
- Client-facing password-protected pages
- LinkedIn OAuth flow (assume token is manually configured)
- Analytics / engagement tracking
- Multi-workspace support
