# LinkedIn Posting Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a LinkedIn content creation tool at `/linkedin` — discover topics, generate 3 post styles, review in a feed, compose branded images, and publish to LinkedIn.

**Architecture:** Single-page two-panel UI (topic queue left, post feed right). Express API handlers following existing Stitch patterns. Image composition via `sharp` SVG overlays. GPT-4.1 for post generation and scoring. SerpAPI for news, Exa for content extraction.

**Tech Stack:** React 18, Tailwind, Radix UI, Express, Supabase, OpenAI GPT-4.1, sharp, SerpAPI, Exa API

**Spec:** `docs/superpowers/specs/2026-03-26-linkedin-posting-tool-design.md`

---

## Task 1: Database Migration

**Files:**
- Create: `supabase-migration-linkedin.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- LinkedIn Posting Tool — Tables, RLS, Indexes, Triggers

-- 1. linkedin_config — per-user settings
CREATE TABLE IF NOT EXISTS linkedin_config (
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

ALTER TABLE linkedin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own config" ON linkedin_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_linkedin_config_updated_at BEFORE UPDATE ON linkedin_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. linkedin_topics — topic discovery queue
CREATE TABLE IF NOT EXISTS linkedin_topics (
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

ALTER TABLE linkedin_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own topics" ON linkedin_topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_linkedin_topics_dedup ON linkedin_topics(user_id, url, (discovered_at::date));
CREATE INDEX idx_linkedin_topics_user_status ON linkedin_topics(user_id, status);

-- 3. linkedin_posts — generated post variations
CREATE TABLE IF NOT EXISTS linkedin_posts (
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

ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own posts" ON linkedin_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_linkedin_posts_updated_at BEFORE UPDATE ON linkedin_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_linkedin_posts_user_status ON linkedin_posts(user_id, status);
CREATE INDEX idx_linkedin_posts_topic ON linkedin_posts(topic_id);
```

- [ ] **Step 2: Apply the migration**

Run the migration against the Supabase project (`uscmvlfleccbctuvhhcj`) using the Supabase MCP `apply_migration` tool or `execute_sql`.

- [ ] **Step 3: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'linkedin_%';
```

Expected: `linkedin_config`, `linkedin_topics`, `linkedin_posts`.

- [ ] **Step 4: Commit**

```bash
git add supabase-migration-linkedin.sql
git commit -m "feat(linkedin): add database migration — config, topics, posts tables"
```

---

## Task 2: Color Templates + Image Compositor Library

**Files:**
- Create: `api/lib/colorTemplates.js`
- Create: `api/lib/composeImage.js`

- [ ] **Step 1: Create color templates**

Create `api/lib/colorTemplates.js` — pure data, no dependencies. Exports the 6 color template objects and a `getTemplate(index)` function.

Each template object:
```javascript
{
  name: 'arctic-steel',
  gradient: { stops: ['#0a1628', '#1e3a5f', '#94a3b8'], angle: 150 },
  orb: { color: '#64748b', centerY: 35 },
  pill: { fill: 'rgba(100,116,139,0.45)', stroke: 'rgba(100,116,139,0.5)' },
}
```

All 6 templates from the spec. `getTemplate(postNumber)` returns `TEMPLATES[(postNumber - 1) % 6]`.

- [ ] **Step 2: Create image compositor**

Create `api/lib/composeImage.js`. Exports `composeImage({ image_url, logo_url, series_title, post_number, excerpt, template_index, format })`.

Implementation approach:
1. Fetch base image and logo via `fetch()` → `Buffer`
2. Use `sharp` to resize base image to canvas (1080×1080 or 1200×628) with `fit: 'cover'`
3. Build SVG overlay string with all layers:
   - Gradient rect (88% opacity, 3-stop linear gradient from template)
   - Radial gradient ellipse (orb — 25% center, dimensions from spec)
   - Noise filter via `<feTurbulence>` (baseFrequency 0.7, numOctaves 4, 3.5% opacity)
   - Decorative quote mark (`"`, white, 35% opacity, DejaVu Serif)
   - Quote text (excerpt, white, bold, DejaVu Serif — word-wrapped to spec char widths)
   - Series pill (rounded rect with template fill/stroke + centered text)
   - Watch number ("Watch #N", DejaVu Sans)
   - Logo pill (white rounded rect + logo image embedded via `<image>` tag with data URI)
4. Composite SVG onto base image via `sharp.composite([{ input: svgBuffer, top: 0, left: 0 }])`
5. Output PNG buffer

Use spec dimensions exactly:
- Square: logo pill top-center y=55, quote at y≈420, series pill y=860, watch below pill +36
- Landscape: logo pill top-left (20,20), quote centered vertically, series pill bottom-center, watch bottom-right

Word wrapping: split excerpt at ~18 chars/line (square) or ~28 chars/line (landscape), max 3 lines square / 2 lines landscape.

- [ ] **Step 3: Commit**

```bash
git add api/lib/colorTemplates.js api/lib/composeImage.js
git commit -m "feat(linkedin): add color templates and sharp image compositor"
```

---

## Task 3: Newsjack Scorer + Exa Content Fetcher

**Files:**
- Create: `api/lib/newsjackScorer.js`

- [ ] **Step 1: Create the scorer**

Create `api/lib/newsjackScorer.js`. Exports:
- `scoreTopics(articles, brandContext, openaiKey)` — takes array of `{ headline, snippet, url }`, brand context from linkedin_config, scores each 1-10 with suggested angle via GPT-4.1 mini structured output (Zod schema).
- `fetchUrlContent(url, exaKey)` — fetches full article text via Exa API (`https://api.exa.ai/contents`). Falls back to direct `fetch()` + basic HTML strip if Exa fails.
- `resolveExaKey(userId)` — checks `linkedin_config.exa_api_key` first, falls back to `process.env.EXA_API_KEY`.

Scorer GPT prompt should evaluate: brand relevance, timeliness, newsjack potential, controversy/engagement potential.

Return shape: `{ score: 8.5, angle: "How this affects NZ manufacturers importing US components" }`.

OpenAI key must be resolved via `getUserKeys(userId, userEmail)` from `api/lib/getUserKeys.js` — never read `process.env` directly for AI provider keys. Use `logCost()` with category `openai`, operation `linkedin_scoring`.

- [ ] **Step 2: Commit**

```bash
git add api/lib/newsjackScorer.js
git commit -m "feat(linkedin): add newsjack scorer and Exa content fetcher"
```

---

## Task 4: LinkedIn Publisher Library

**Files:**
- Create: `api/lib/linkedinPublisher.js`

- [ ] **Step 1: Create the publisher**

Create `api/lib/linkedinPublisher.js`. Exports:
- `publishToLinkedIn({ accessToken, body, imageUrl })` — posts to LinkedIn API v2.

LinkedIn API flow:
1. Get user profile: `GET https://api.linkedin.com/v2/userinfo` with Bearer token → extract `sub` (person URN)
2. If `imageUrl` provided:
   a. Initialize upload: `POST https://api.linkedin.com/rest/images?action=initializeUpload` with `{ initializeUploadRequest: { owner: personUrn } }`
   b. Upload image: `PUT` to the returned `uploadUrl` with image buffer
   c. Get `image` URN from response
3. Create post: `POST https://api.linkedin.com/rest/posts` with `{ author: personUrn, commentary: body, visibility: "PUBLIC", distribution: { feedDistribution: "MAIN_FEED" }, lifecycleState: "PUBLISHED" }`. If image exists, add `content: { media: { id: imageUrn } }`.
4. Return `{ success: true, linkedinPostId }` or `{ success: false, error }`.

Use LinkedIn API v2 (versioned headers: `LinkedIn-Version: 202401`, `X-Restli-Protocol-Version: 2.0.0`).

- [ ] **Step 2: Commit**

```bash
git add api/lib/linkedinPublisher.js
git commit -m "feat(linkedin): add LinkedIn API publisher"
```

---

## Task 5: Config API Endpoints

**Files:**
- Create: `api/linkedin/get-config.js`
- Create: `api/linkedin/update-config.js`

- [ ] **Step 1: Create GET config handler**

`api/linkedin/get-config.js` — returns user's `linkedin_config` row. If none exists, returns defaults (empty object with default `series_title`).

Pattern: same as `api/campaigns/list.js` — `createClient`, `.from('linkedin_config').select('*').eq('user_id', req.user.id).single()`.

- [ ] **Step 2: Create PUT config handler**

`api/linkedin/update-config.js` — upserts `linkedin_config` row. Accepts `{ news_search_queries, series_title, linkedin_cta_text, linkedin_cta_url, exa_api_key, linkedin_access_token }`.

Use `.upsert({ user_id: req.user.id, ...fields }, { onConflict: 'user_id' })`.

- [ ] **Step 3: Commit**

```bash
git add api/linkedin/get-config.js api/linkedin/update-config.js
git commit -m "feat(linkedin): add config GET/PUT endpoints"
```

---

## Task 6: Topic Discovery Endpoints

**Files:**
- Create: `api/linkedin/search.js`
- Create: `api/linkedin/add-topic.js`
- Create: `api/linkedin/topics.js`
- Create: `api/linkedin/update-topic.js`

- [ ] **Step 1: Create search handler**

`api/linkedin/search.js` — `POST` with `{ query }`.

1. Search SerpAPI Google News: `GET https://serpapi.com/search.json?engine=google_news&q=${query}&api_key=${key}`
2. Map results to `{ headline, snippet, url, source_domain }`
3. Score each via `scoreTopics()` from `newsjackScorer.js`
4. Insert into `linkedin_topics` (skip duplicates via ON CONFLICT from the dedup index)
5. Return `{ success: true, topics: [...] }` with scores

Resolve OpenAI key via `getUserKeys(req.user.id, req.user.email)` for scoring. Use existing `SEARCHAPI_KEY` / `SERP_API_KEY` env vars for SerpAPI. Resolve Exa key via `resolveExaKey(req.user.id)`. Log costs: `serpapi` for search, `openai` for scoring.

- [ ] **Step 2: Create add-topic handler**

`api/linkedin/add-topic.js` — `POST` with `{ url }`.

1. Fetch content via `fetchUrlContent(url, exaKey)` from `newsjackScorer.js`
2. Extract headline from content or `<title>` tag
3. Score via `scoreTopics()`
4. Insert into `linkedin_topics` with `full_content`
5. Return `{ success: true, topic }`. Resolve Exa key via `resolveExaKey(req.user.id)`, OpenAI key via `getUserKeys()`. Log costs: `exa` for fetch, `openai` for scoring.

- [ ] **Step 3: Create topics list handler**

`api/linkedin/topics.js` — `GET`, returns all topics for user where `status != 'expired'`, ordered by `relevance_score DESC`. Filter expired: `.gt('expires_at', new Date().toISOString())`.

- [ ] **Step 4: Create update-topic handler**

`api/linkedin/update-topic.js` — `PATCH` with `{ status }` (dismiss or other status changes). Uses `req.params.id`. Verify ownership via `.eq('user_id', req.user.id)`.

- [ ] **Step 5: Commit**

```bash
git add api/linkedin/search.js api/linkedin/add-topic.js api/linkedin/topics.js api/linkedin/update-topic.js
git commit -m "feat(linkedin): add topic discovery endpoints — search, add-topic, list, update"
```

---

## Task 7: Post Generation Endpoint

**Files:**
- Create: `api/linkedin/generate-posts.js`

- [ ] **Step 1: Create generate-posts handler**

`api/linkedin/generate-posts.js` — `POST` with `{ topic_id }`.

1. Fetch topic from `linkedin_topics` (verify ownership)
2. If `full_content` is null, fetch via `fetchUrlContent(topic.url, exaKey)`
3. Fetch `linkedin_config` and `brand_kit` for user (brand context)
4. Generate 3 posts in parallel via `Promise.allSettled()`:

Each call to GPT-4.1 gets a style-specific system prompt with the anti-slop rules baked in. Pass article content + brand context as user message.

**Contrarian prompt core:** "Write a LinkedIn post using the Contrarian Insight style. Make a bold claim that challenges conventional thinking about this topic, then explain why the common take is wrong. 150-250 words."

**Story-Led prompt core:** "Write a LinkedIn post using the Story-Led style. Open with a vivid scene — a specific person, place, or moment. Tell a mini narrative that draws the reader in. 150-250 words."

**Data/Stat Punch prompt core:** "Write a LinkedIn post using the Data/Stat Punch style. Lead with a surprising number or concrete fact from the source material. 100-200 words."

**All prompts include these anti-slop rules:**
```
RULES (violating any = rejection):
- First line MUST be under 200 characters
- NO filler: "In today's world", "Let's dive in", "Here's the thing"
- NO hedging: "might", "could potentially", "it's possible"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry"
- NO emojis, NO hashtags, NO markdown formatting
- Every sentence must add new information — no repetition
- Be specific: use real names, real numbers, real places
- Write like a sharp human, not a language model
```

5. For each fulfilled result, insert into `linkedin_posts` with topic_id, style, body
6. If CTA configured, append to each body
7. Update topic status to `generated`
8. Return `{ success: true, posts: [...] }` (include any partial failures)

Resolve OpenAI key via `getUserKeys(req.user.id, req.user.email)` from `api/lib/getUserKeys.js`. Resolve Exa key via `resolveExaKey(req.user.id)` if content fetch needed. Log cost with category `openai`, operation `linkedin_generation`, model `gpt-4.1`.

- [ ] **Step 2: Commit**

```bash
git add api/linkedin/generate-posts.js
git commit -m "feat(linkedin): add post generation endpoint — 3 styles with anti-slop rules"
```

---

## Task 8: Post Management Endpoints

**Files:**
- Create: `api/linkedin/posts.js`
- Create: `api/linkedin/update-post.js`
- Create: `api/linkedin/regenerate-post.js`

- [ ] **Step 1: Create posts list handler**

`api/linkedin/posts.js` — `GET`, returns all posts for user with their linked topic data. Join via `linkedin_posts(*, linkedin_topics(headline, source_domain, url))`. Order by `created_at DESC`.

- [ ] **Step 2: Create update-post handler**

`api/linkedin/update-post.js` — `PATCH` with `{ body, status }`. Handles:
- Edit: update `body` field
- Approve: set `status = 'approved'`
- Reject: set `status = 'rejected'`

Verify ownership. Uses `req.params.id`.

- [ ] **Step 3: Create regenerate-post handler**

`api/linkedin/regenerate-post.js` — `POST` with post ID in `req.params.id`.

1. Fetch the existing post (get its topic_id and style)
2. Fetch the topic's full_content
3. Re-run the GPT generation for just that one style
4. Update the post's `body` and reset `status` to `generated`
5. Return updated post

- [ ] **Step 4: Commit**

```bash
git add api/linkedin/posts.js api/linkedin/update-post.js api/linkedin/regenerate-post.js
git commit -m "feat(linkedin): add post list, update, and regenerate endpoints"
```

---

## Task 9: Publish Endpoint (Image Composition + LinkedIn API)

**Files:**
- Create: `api/linkedin/publish.js`

- [ ] **Step 1: Create publish handler**

`api/linkedin/publish.js` — `POST` with post ID in `req.params.id`.

Flow:
1. Fetch post + topic (verify ownership, check status is `generated` or `approved`)
2. Assign `post_number`: `SELECT COALESCE(MAX(post_number), 0) + 1 FROM linkedin_posts WHERE user_id = $1 AND status = 'published'`
3. Derive `template_index = (post_number - 1) % 6`
4. Generate LLM excerpt from post body — GPT-4.1 mini: "Extract the single most compelling 6-12 word quote from this LinkedIn post. Return only the quote, no punctuation marks around it."
5. Generate AI base image via FAL Nano Banana 2 (`fal-ai/nano-banana-2`):
   - Prompt: derive from post body — "Professional editorial illustration for: {first 100 chars of post}"
   - Use `generateImageV2()` from `api/lib/mediaGenerator.js` or direct FAL call
6. Compose both image formats via `composeImage()`:
   - Square (1080×1080) with logo from `brand_kit.logo_url`
   - Landscape (1200×628) same inputs, different format
7. Upload both to Supabase Storage at `media/linkedin/composed-{timestamp}-{random}.png`
8. Fetch `linkedin_access_token` from `linkedin_config`
9. Publish via `publishToLinkedIn()` — send body + landscape image
10. Update post: `post_number`, `template_index`, `excerpt`, `featured_image_square`, `featured_image_landscape`, `status = 'published'` (or `'failed'`), `published_linkedin_id`
11. Return result

Image composition is non-blocking for the LinkedIn publish — if images fail, still attempt to publish text-only. Update image URLs later if they succeed.

Resolve all provider keys via `getUserKeys(req.user.id, req.user.email)` — OpenAI for excerpt generation, FAL for base image. Never read `process.env` directly for AI provider keys. Log costs: `openai` for excerpt, `fal` for base image.

- [ ] **Step 2: Commit**

```bash
git add api/linkedin/publish.js
git commit -m "feat(linkedin): add publish endpoint — image composition + LinkedIn API"
```

---

## Task 10: Route Registration

**Files:**
- Modify: `server.js` (add LinkedIn route block after the direct-import campaigns block at lines 453-456)

- [ ] **Step 1: Add LinkedIn routes to server.js**

Add immediately after the direct-import campaigns block (lines 453-456 — the `research`, `preview-script`, `preview-image`, `topics` routes). Use the same direct import pattern to stay consistent with surrounding code. Search for `app.post('/api/campaigns/topics'` to find the insertion point:

```javascript
// ─── LinkedIn ───────────────────────────────────────────────────
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

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat(linkedin): register all LinkedIn API routes in server.js"
```

---

## Task 11: Frontend — LinkedInPage + TopicQueue

**Files:**
- Create: `src/pages/LinkedInPage.jsx`
- Create: `src/components/linkedin/TopicQueue.jsx`
- Create: `src/components/linkedin/TopicCard.jsx`

- [ ] **Step 1: Create LinkedInPage**

`src/pages/LinkedInPage.jsx` — main page component.

Structure:
- Header bar with page title "LinkedIn", settings gear icon (opens config modal)
- Two-panel layout: `grid grid-cols-[380px_1fr] gap-6 h-[calc(100vh-64px)]`
- Left panel: `<TopicQueue />` with overflow-y-auto
- Right panel: `<PostFeed />` with overflow-y-auto
- State: `topics`, `posts`, `config`, `loading` states
- Fetch on mount: `GET /api/linkedin/topics`, `GET /api/linkedin/posts`, `GET /api/linkedin/config`
- Pass callbacks down: `onGenerate`, `onDismiss`, `onApprove`, `onEdit`, `onReject`, `onRegenerate`, `onPublish`

Use `apiFetch` from `src/lib/api.js` for all API calls (auto-injects JWT). **Important:** `apiFetch` never checks `response.ok` — 4xx/5xx responses are silently parsed as data. Always check for `data.error` before using response data, and show error toasts on failure.

- [ ] **Step 2: Create TopicQueue**

`src/components/linkedin/TopicQueue.jsx` — left panel.

- Search input + "Search" button at top
- URL detection: if input looks like a URL (`startsWith('http')` or contains `.`), call `/api/linkedin/add-topic`; otherwise call `/api/linkedin/search`
- Loading state during search
- Topic cards list below, sorted by `relevance_score` DESC
- Empty state: "Search for topics or paste a URL to get started"

- [ ] **Step 3: Create TopicCard**

`src/components/linkedin/TopicCard.jsx` — individual topic card.

Props: `topic`, `onGenerate`, `onDismiss`, `isGenerating`.

- Score badge: green bg for 8+, amber for 6-7, red for <6
- Headline (bold), source domain + time ago (gray, small)
- Suggested angle (italic, small)
- Generate button (primary, disabled while generating) + Dismiss button (ghost)
- If `topic.status === 'generated'`, show "Generated" badge instead of buttons

- [ ] **Step 4: Commit**

```bash
git add src/pages/LinkedInPage.jsx src/components/linkedin/TopicQueue.jsx src/components/linkedin/TopicCard.jsx
git commit -m "feat(linkedin): add LinkedInPage with TopicQueue and TopicCard components"
```

---

## Task 12: Frontend — PostFeed + PostCard

**Files:**
- Create: `src/components/linkedin/PostFeed.jsx`
- Create: `src/components/linkedin/PostCard.jsx`

- [ ] **Step 1: Create PostFeed**

`src/components/linkedin/PostFeed.jsx` — right panel.

- Groups posts by `topic_id`
- Each group has a small topic headline header
- Lists `<PostCard />` for each post in the group
- Empty state: "Generate posts from a topic to see them here"

- [ ] **Step 2: Create PostCard**

`src/components/linkedin/PostCard.jsx` — LinkedIn-style post card.

Props: `post`, `config`, `onApprove`, `onEdit`, `onReject`, `onRegenerate`, `onPublish`.

Structure:
- Header: brand avatar (from config/brand_kit) + brand name + style badge
  - Style badges: Contrarian = blue (`bg-blue-100 text-blue-700`), Story = amber (`bg-amber-100 text-amber-700`), Data = green (`bg-green-100 text-green-700`)
- Body: truncated to 3 lines with "...see more" (click toggles full text)
- Image section:
  - If `featured_image_landscape`: show the composed image
  - If status is `generated`: show placeholder "Image generates on approve"
- Edit mode: textarea with character counter (max 3000), save/cancel buttons
- Action buttons (shown when not editing):
  - "Approve & Publish" (green) — calls `onPublish(post.id)`
  - "Edit" (ghost) — toggles edit mode
  - "Regenerate" (ghost) — calls `onRegenerate(post.id)`
  - "Reject" (red ghost) — calls `onReject(post.id)`
- Status indicators:
  - `published`: green "Published" badge, hide action buttons, show LinkedIn post ID
  - `failed`: red "Failed" badge with error message, show "Retry" button
  - `approved`: yellow "Publishing..." spinner

- [ ] **Step 3: Commit**

```bash
git add src/components/linkedin/PostFeed.jsx src/components/linkedin/PostCard.jsx
git commit -m "feat(linkedin): add PostFeed and PostCard components"
```

---

## Task 13: Frontend — Config Modal + Route Wiring

**Files:**
- Create: `src/components/linkedin/LinkedInConfigModal.jsx`
- Modify: `src/App.jsx` (add route + import)
- Modify: `src/pages/VideoAdvertCreator.jsx` (add nav link in header)

- [ ] **Step 1: Create config modal**

`src/components/linkedin/LinkedInConfigModal.jsx` — settings dialog.

Uses Radix Dialog (existing `src/components/ui/dialog.jsx`).

Fields:
- `series_title` — text input, default "INDUSTRY WATCH"
- `linkedin_cta_text` — text input, optional
- `linkedin_cta_url` — text input, optional
- `exa_api_key` — password input, optional
- `linkedin_access_token` — password input, required for publishing
- `news_search_queries` — textarea (one query per line, stored as JSON array)

Save button calls `PUT /api/linkedin/config`.

- [ ] **Step 2: Add route to App.jsx**

Import `LinkedInPage` and add the protected route:

```javascript
import LinkedInPage from './pages/LinkedInPage';

// Inside <Routes>:
<Route path="/linkedin" element={<ProtectedRoute><LinkedInPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Add nav link in VideoAdvertCreator header**

Find the existing "Campaigns" and "Templates" buttons in the header (around line 440 in `VideoAdvertCreator.jsx`). Add a "LinkedIn" button between them:

```jsx
<Button variant="ghost" size="sm" asChild>
  <Link to="/linkedin">LinkedIn</Link>
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/linkedin/LinkedInConfigModal.jsx src/App.jsx src/pages/VideoAdvertCreator.jsx
git commit -m "feat(linkedin): add config modal, route, and header nav link"
```

---

## Task 14: Docker + Fonts

**Files:**
- Modify: `Dockerfile` (add font packages)

- [ ] **Step 1: Add font installation to Dockerfile**

In the `runner` stage (after `FROM node:20-slim AS runner`), add:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig fonts-dejavu-core fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
```

Add this before the `COPY` commands.

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat(linkedin): add DejaVu and Liberation fonts to Docker image"
```

---

## Task 15: Environment + CLAUDE.md Updates

**Files:**
- Modify: `.env.example` (add new env vars)
- Modify: `CLAUDE.md` (document new subsystem)

- [ ] **Step 1: Add env vars to .env.example**

```
# Exa API (LinkedIn content fetching)
EXA_API_KEY=your_exa_api_key_here
```

Note: `SEARCHAPI_KEY`/`SERP_API_KEY` already exist. LinkedIn access token is per-user in `linkedin_config`, not an env var.

- [ ] **Step 2: Update Provider Health Dashboard**

Update `src/pages/CostDashboardPage.jsx` to recognize the new `serpapi` and `exa` cost categories — add them to the category-to-provider mapping so they render in the cost breakdown. Update `api/providers/health.js` if needed to check Exa/SerpAPI health status.

- [ ] **Step 3: Update CLAUDE.md**

Add a new subsystem section for LinkedIn Posting Tool after the existing subsystem docs. Document:
- The `/linkedin` page and two-panel layout
- API endpoints (`/api/linkedin/*`)
- Database tables (`linkedin_config`, `linkedin_topics`, `linkedin_posts`)
- Image composition via `composeImage.js` + `colorTemplates.js`
- Key libraries: `newsjackScorer.js`, `linkedinPublisher.js`
- The anti-slop prompt rules
- Note that `sharp` is used for SVG-based image composition (already a dependency)
- Note that fonts (DejaVu, Liberation) are required in Docker

- [ ] **Step 4: Commit**

```bash
git add .env.example CLAUDE.md src/pages/CostDashboardPage.jsx api/providers/health.js
git commit -m "docs(linkedin): update env, CLAUDE.md, and cost dashboard for LinkedIn tool"
```

---

## Task 16: End-to-End Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

Verify both Express (port 3003) and Vite (port 4390) start without errors.

- [ ] **Step 2: Test config endpoints**

```bash
# GET config (should return defaults/empty)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3003/api/linkedin/config

# PUT config
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"series_title":"PRODUCT LIABILITY WATCH","news_search_queries":["product liability NZ"]}' \
  http://localhost:3003/api/linkedin/config
```

- [ ] **Step 3: Test topic search**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"product liability insurance NZ"}' \
  http://localhost:3003/api/linkedin/search
```

Verify topics return with scores.

- [ ] **Step 4: Test post generation**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"topic_id":"<id_from_step_3>"}' \
  http://localhost:3003/api/linkedin/generate-posts
```

Verify 3 posts return with different styles.

- [ ] **Step 5: Test the UI**

Navigate to `http://localhost:4390/linkedin`. Verify:
- Page loads with two-panel layout
- Search input works
- Topic cards appear with scores
- Generate button produces 3 post cards
- Edit/reject/regenerate work
- Config modal opens and saves

- [ ] **Step 6: Test image composition + publish**

Click "Approve & Publish" on a post. Verify:
- Base image generates
- Composed images appear (square + landscape)
- If LinkedIn token is configured, post publishes
- If not, graceful error message

- [ ] **Step 7: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix(linkedin): smoke test fixes"
```
