# Review Widget & Request Tracker

**Date:** 2026-04-06
**Status:** Approved
**Approach:** Supabase-native with Claude Code CRON processing

## Problem

Tracking bugs, feature requests, questions, and change requests across ~20+ tools with ~80+ model endpoints is overwhelming. Requests get duplicated, forgotten, or lost between sessions. No structured way to log issues in-context and have them systematically researched and resolved.

## Solution

A three-part system:

1. **Review Widget** — floating button (bottom-left) with compact submit form
2. **Slide-over Dashboard** — full request management panel opened from the widget
3. **CRON Processor** — Claude Code scheduled task that picks up requests one-by-one, researches/fixes, and writes findings back

## Database Schema

### `review_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK | `auth.users` |
| `tool` | text NOT NULL | Tool name from hardcoded list |
| `endpoint` | text | Specific model/API endpoint (optional) |
| `type` | text NOT NULL | One of 8 types (see below) |
| `title` | text NOT NULL | Short summary |
| `description` | text | Full details, console logs, etc. |
| `screenshot_url` | text | Supabase storage path |
| `status` | text NOT NULL DEFAULT 'pending' | pending, in_progress, resolved, needs_info, closed |
| `priority` | text NOT NULL DEFAULT 'medium' | low, medium, high |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |
| `resolved_at` | timestamptz | Set when status → resolved/closed |

### `review_comments`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `request_id` | uuid FK | → `review_requests.id` ON DELETE CASCADE |
| `author` | text NOT NULL | `'user'` or `'claude'` |
| `content` | text NOT NULL | Comment body |
| `commit_hash` | text | If Claude made a code fix |
| `created_at` | timestamptz DEFAULT now() | |

RLS: Both tables filtered by `user_id = auth.uid()`.

## Request Types (8)

1. **Bug** — something is broken
2. **Question** — how does X work, why does Y happen
3. **Feature** — new functionality request
4. **Console Error** — paste an error, get diagnosis
5. **Change Request** — modify existing behavior
6. **Learn Screenshot** — screenshot to add to /learn page
7. **Prompt Review** — audit a tool/endpoint's prompt construction for cohesion (vs. concatenation)
8. **CLAUDE.md Update** — add or update documentation in CLAUDE.md

## Tool → Endpoint Map

Every tool in the app with its specific model/API endpoints. The endpoint dropdown filters based on selected tool. Endpoint is optional — UI-only bugs don't need one.

### Image Tools
- **Imagineer**: Nano Banana 2, Flux 2, Flux 2 Klein 4B, Flux 2 Klein 9B, Wan 2.2 T2I, SeedDream v4.5, Imagen 4, Kling Image v3, Grok Imagine, Ideogram v2, Wavespeed Nano, Topaz Upscale, GPT-4.1-mini (prompt builder), Nano Banana 2 Edit, SeedDream Edit, Wavespeed Nano Ultra Edit, Qwen Image Edit
- **Edit Image**: Inpaint, Erase
- **Smoosh**: Image Blending
- **Lens**: Multi-angle Generation
- **3D Viewer**: Hunyuan 3D Pro, Topaz Upscale
- **Try Style**: Virtual Try-on
- **Turnaround**: All image models, Topaz Upscale, GPT-4.1-mini (prompt builder)
- **Library**: Image Library, Tags, Save/Import

### Video Tools
- **JumpStart**: Veo 3.1, Veo 3.1 Lite, Veo 3.1 R2V, Veo 3.1 FLF, Veo 3.1 Lite FLF, Kling 2.0 Master, Kling V3 Pro, Kling O3 Pro, Kling O3 R2V, Kling O3 V2V, PixVerse V6, PixVerse v4.5, Wan 2.5, Wan Pro, Hailuo, Grok I2V, Grok R2V, Wavespeed WAN, Seedance
- **JumpStart Extend**: Seedance Extend, Veo 3.1 Extend, Grok Extend
- **Video Studio**: Modal UI
- **Trip**: Video Restyle
- **Animate**: Image-to-Video (standalone)
- **Motion Transfer**: Modal UI
- **Storyboards**: GPT-4.1-mini (narrative), GPT-4.1-mini (visual director), all image models, all video models, PDF Export, Review/Share
- **Video Analyzer**: Analysis
- **Clone Ad**: Clone

### Audio Tools
- **Audio Studio**: Gemini TTS (30 voices), ElevenLabs TTS (22 voices), ElevenLabs Music, MiniMax Music v2, Lyria 2, Suno V4, ElevenLabs SFX, Auto-Subtitle

### Social Tools
- **Command Center**: GPT-4.1 (chat), SerpAPI, Exa, Firecrawl, Supabase RAG
- **Ads Manager**: GPT-4.1 (copy gen), GPT-4.1-mini (regen), Nano Banana 2, all image models, Google Ads OAuth
- **Ad Intelligence**: SerpAPI, Exa, Firecrawl, GPT-4.1
- **Shorts Workbench**: GPT-5-mini (topics), GPT-4.1-mini (script), Gemini TTS, Whisper, ElevenLabs Music, all image models, all video models (FLF + I2V), FFmpeg Compose, Auto-Subtitle, Scene Repair
- **LinkedIn**: GPT-4.1 (post gen), Nano Banana 2, Satori Compositor, Exa API, LinkedIn OAuth
- **Carousels**: GPT-4.1 (content gen), Nano Banana 2, Satori Compositor, ElevenLabs TTS (slideshow), FFmpeg Compose, Multi-platform publish
- **Queue / Publish**: YouTube Upload, Scheduled Publishing

### Brand & Setup
- **Brand Kit**: Firecrawl (URL extract), GPT-4.1-mini (PDF extract), SEWO Connect, Background Removal
- **LoRA Training**: (endpoint list auto-populated from `trainingModelRegistry.js` at build time — currently 18 models), GPT-4o-mini (captioning)
- **Settings**: Connected Accounts (YouTube, LinkedIn, Meta, TikTok OAuth), API Keys

### Other
- **Learn Page**: Guides, Screenshots
- **Proposal Pages**: Content, Password Gate
- **Flows**: Automation Workflows
- **General**: Auth, Navigation, Deploy, Performance, UI/Layout, Sidebar, Routing

## Widget UI

### Collapsed State
- Fixed position: `bottom-6 left-6`, `z-50`
- 56px circular button
- **Blue neon ring** (glow effect), **navy inner** background
- **White pencil icon** (Lucide `Pencil` or `PenLine`)
- Badge showing count of pending + needs_info requests (hidden if 0). Fetched via `GET /api/reviews?status=pending` on mount + after each submit — the list is small so full fetch is fine; count derived client-side.

### Expanded State (Submit Form)
Click the button to open a compact card (~350px wide), anchored to the bottom-left:

1. **Tool** — dropdown, required, flat alphabetical list of all tools
2. **Endpoint** — dropdown, optional, filters to endpoints for selected tool
3. **Type** — dropdown, required, 8 types
4. **Priority** — segmented toggle: Low / **Medium** (default) / High
5. **Title** — text input, required, placeholder "Brief summary..."
6. **Description** — textarea, optional, placeholder "Details, console logs, steps to reproduce..."
7. **Screenshot** — upload button or clipboard paste (`paste` event listener on the form, accepts `image/*` MIME types, max 5MB). Pasted/selected images upload immediately to Supabase storage, showing a thumbnail preview. If upload fails, show error before form submit.
8. **Submit** button
9. **"View All"** link at top → opens slide-over dashboard

Submit creates the DB record, shows a toast (warning level since success toasts are silenced), resets form.

## Slide-over Dashboard

Custom left-side slide-over panel (~600px wide). Cannot reuse `SlideOverPanel` (hardcoded right-side only) — build a dedicated `ReviewPanel` component with `left-0` positioning, `slide-in-from-left` / `slide-out-to-left` animations, and `w-[600px]` fixed width. Uses Radix Dialog primitives directly (same pattern as SlideOverPanel but mirrored).

### Header
- Title: "Review Requests"
- Filter chips: All / Pending / In Progress / Needs Info / Resolved / Closed
- Count badge per filter

### Request List
Cards sorted by: high priority first, then oldest first. Each card shows:
- Status badge (color-coded: pending=yellow, in_progress=blue, needs_info=orange, resolved=green, closed=gray)
- Tool tag + Endpoint tag (if set)
- Type badge
- Title
- Relative time ("2h ago")
- Click to expand

### Expanded Request View
- Full description
- Screenshot (if any, clickable to enlarge)
- **Comment thread** — chronological, user comments left-aligned, Claude comments right-aligned (or vice versa with author labels)
- **Add comment** textarea + submit button (author: `'user'`)
- **Status controls**: Mark Resolved, Close, Re-open, Set Needs Info
- If Claude included a `commit_hash`, show as monospace text

## API Endpoints

All under `/api/reviews/*`, authenticated via `authenticateToken`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/reviews` | Create request |
| `GET` | `/api/reviews` | List requests (query: `?status=pending`) |
| `GET` | `/api/reviews/:id` | Get request + comments |
| `PATCH` | `/api/reviews/:id` | Update status, priority |
| `POST` | `/api/reviews/:id/comments` | Add comment |
| `POST` | `/api/reviews/upload` | Upload screenshot to Supabase storage |
| `GET` | `/api/reviews/pending` | Get oldest pending request (for CRON) |
| `PATCH` | `/api/reviews/:id/resolve` | Mark resolved with findings |

Route registration in `server.js` uses the dynamic `loadApiRoute` pattern.

## CRON Processing

Claude Code **scheduled task** (uses `mcp__scheduled-tasks__create_scheduled_task`):
- **Schedule**: `0 7-23 * * *` (local NZT — the scheduled tasks system evaluates cron in the user's local timezone, so DST is handled automatically)
- **Auth**: The CRON task runs as a Claude Code session with full codebase access. It reads/writes Supabase **directly** using the service role key from env vars (same as other server-side code), bypassing the Express API endpoints. The `/api/reviews/pending` and `/api/reviews/:id/resolve` endpoints exist for the frontend only.
- **Processing per run**:
  1. Query Supabase directly for oldest `pending` request (ordered by priority DESC, created_at ASC)
  2. If none → exit silently
  3. Set status → `in_progress`
  4. Read the request context (tool, endpoint, type, title, description, screenshot, existing comments)
  5. Process based on type:
     - **Bug / Console Error**: Read relevant source code for the tool+endpoint, diagnose the issue, fix if straightforward, commit the fix, write findings + commit hash
     - **Question**: Research the codebase, write a clear answer
     - **Feature / Change Request**: Analyze feasibility, check for conflicts with existing code, write findings + suggested approach
     - **Learn Screenshot**: Note for /learn page update, describe what should be added
     - **Prompt Review**: Read the prompt-building code for the tool+endpoint, check if it uses the Cohesive Prompt Builder or does raw concatenation, fix if needed, report findings
     - **CLAUDE.md Update**: Research the topic against current codebase state, write/update the relevant CLAUDE.md section, commit
  6. Write findings as a comment (author: `'claude'`, include `commit_hash` if applicable)
  7. Set status → `resolved` (with `resolved_at = now()`) or `needs_info` if the request description is too vague to act on
  8. **One request per run** — never batch multiple
  9. **resolved_at rule**: Any status transition to `resolved` or `closed` (from any source — CRON or user dashboard) must set `resolved_at = now()` if currently null. Re-opening clears `resolved_at`.

## File Structure

```
src/components/review/
  ReviewWidget.jsx          — floating button + submit form
  ReviewPanel.jsx           — left-side slide-over panel (custom, not SlideOverPanel)
  ReviewDashboard.jsx       — request list + filters inside ReviewPanel
  ReviewRequestCard.jsx     — individual request card
  ReviewCommentThread.jsx   — comment thread within expanded request
  reviewToolMap.js          — hardcoded tool → endpoint mapping

api/reviews/
  create.js                 — POST /api/reviews
  list.js                   — GET /api/reviews
  get.js                    — GET /api/reviews/:id
  update.js                 — PATCH /api/reviews/:id
  comments.js               — POST /api/reviews/:id/comments
  upload.js                 — POST /api/reviews/upload
  pending.js                — GET /api/reviews/pending
  resolve.js                — PATCH /api/reviews/:id/resolve

supabase/migrations/
  20260406_review_requests.sql
```

## Migration SQL

```sql
-- Review Requests
CREATE TABLE review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool text NOT NULL,
  endpoint text,
  type text NOT NULL CHECK (type IN ('bug','question','feature','console_error','change_request','learn_screenshot','prompt_review','claude_md_update')),
  title text NOT NULL,
  description text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved','needs_info','closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Review Comments
CREATE TABLE review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES review_requests(id) ON DELETE CASCADE NOT NULL,
  author text NOT NULL CHECK (author IN ('user','claude')),
  content text NOT NULL,
  commit_hash text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own requests"
  ON review_requests FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view comments on own requests"
  ON review_comments FOR ALL
  USING (request_id IN (SELECT id FROM review_requests WHERE user_id = auth.uid()));

-- Auto-update updated_at trigger
CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_user ON review_requests(user_id);
CREATE INDEX idx_review_comments_request ON review_comments(request_id);
```

Note: Screenshots upload to the existing `media` bucket under `reviews/{userId}/`. No new bucket needed.

## Non-Goals

- No multi-user support — this is a personal tool for the app owner
- No email/Slack notifications — you check the dashboard
- No AI auto-triage or priority assignment — you set priority explicitly
- No real-time updates — refresh or re-open the dashboard to see new comments
- No request editing after submission — add comments instead
- No DELETE endpoint — closed requests stay in the table for history. Can revisit if volume becomes an issue.
- Widget z-index interaction: the widget sits at `z-50` like ChatBubble. The `SlideOverPanel.onPointerDownOutside` handler already ignores clicks on `.fixed.bottom-*` elements, so clicking the review widget while another panel is open will not close that panel. This is expected behavior.
