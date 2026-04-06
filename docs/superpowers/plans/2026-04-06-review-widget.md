# Review Widget & Request Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bottom-left review widget with slide-over dashboard and CRON processing so the app owner can log bugs/questions/features against specific tools+endpoints and have Claude Code systematically process them.

**Architecture:** Supabase tables (`review_requests`, `review_comments`) + 8 Express API endpoints + React widget (floating button + submit form + left-side slide-over dashboard) + Claude Code scheduled task for hourly processing. Widget mirrors ChatBubble pattern (bottom-left instead of bottom-right). Dashboard uses Radix Dialog primitives directly (custom left-side panel).

**Tech Stack:** React 18, Tailwind, Radix UI Dialog, Lucide icons, Supabase (Postgres + Storage), Express, Claude Code scheduled tasks.

**Spec:** `docs/superpowers/specs/2026-04-06-review-widget-design.md`

---

## File Structure

```
NEW FILES:
  src/components/review/reviewToolMap.js        — tool → endpoint mapping data
  src/components/review/ReviewWidget.jsx         — floating button + submit form
  src/components/review/ReviewPanel.jsx          — left-side slide-over (Radix Dialog)
  src/components/review/ReviewDashboard.jsx      — request list + filters
  src/components/review/ReviewRequestCard.jsx    — individual request card (collapsed + expanded)
  src/components/review/ReviewCommentThread.jsx  — comment thread in expanded view
  api/reviews/reviews.js                         — multi-method handler (GET list, POST create)
  api/reviews/get.js                             — GET single request + comments
  api/reviews/update.js                          — PATCH status/priority
  api/reviews/comments.js                        — POST add comment
  api/reviews/pending.js                         — GET oldest pending request
  api/reviews/resolve.js                         — PATCH mark resolved with findings
  api/reviews/upload.js                          — POST screenshot upload
  supabase/migrations/20260406_review_requests.sql

MODIFIED FILES:
  server.js                                      — register /api/reviews/* routes
  src/App.jsx                                    — add <ReviewWidget /> alongside ChatBubble
```

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260406_review_requests.sql`

- [ ] **Step 1: Write the migration file**

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

-- Auto-update updated_at trigger (reuses existing function)
CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_user ON review_requests(user_id);
CREATE INDEX idx_review_comments_request ON review_comments(request_id);
```

- [ ] **Step 2: Run the migration against Supabase**

Run the migration SQL against the production Supabase database using the Supabase MCP `apply_migration` tool or the Supabase dashboard SQL editor. Verify both tables exist with `SELECT * FROM review_requests LIMIT 0;` and `SELECT * FROM review_comments LIMIT 0;`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260406_review_requests.sql
git commit -m "feat(reviews): add review_requests and review_comments tables"
```

---

### Task 2: Tool → Endpoint Map Data

**Files:**
- Create: `src/components/review/reviewToolMap.js`

- [ ] **Step 1: Create the tool map**

This is a pure data file — an object mapping tool names to arrays of endpoint strings. Tools are grouped by category for the dropdown display. Every tool and endpoint from the spec's "Tool → Endpoint Map" section goes here.

```javascript
// Tool categories for grouped display in the dropdown
export const TOOL_CATEGORIES = {
  'Image Tools': ['Imagineer', 'Edit Image', 'Smoosh', 'Lens', '3D Viewer', 'Try Style', 'Turnaround', 'Library'],
  'Video Tools': ['JumpStart', 'JumpStart Extend', 'Video Studio', 'Trip', 'Animate', 'Motion Transfer', 'Storyboards', 'Video Analyzer', 'Clone Ad'],
  'Audio Tools': ['Audio Studio'],
  'Social Tools': ['Command Center', 'Ads Manager', 'Ad Intelligence', 'Shorts Workbench', 'LinkedIn', 'Carousels', 'Queue / Publish'],
  'Brand & Setup': ['Brand Kit', 'LoRA Training', 'Settings'],
  'Other': ['Learn Page', 'Proposal Pages', 'Flows', 'General'],
};

// Tool → endpoint mapping (endpoints are optional, shown when a tool is selected)
export const TOOL_ENDPOINTS = {
  'Imagineer': [
    'Nano Banana 2', 'Flux 2', 'Flux 2 Klein 4B', 'Flux 2 Klein 9B', 'Wan 2.2 T2I',
    'SeedDream v4.5', 'Imagen 4', 'Kling Image v3', 'Grok Imagine', 'Ideogram v2',
    'Wavespeed Nano', 'Topaz Upscale', 'GPT-4.1-mini (prompt builder)',
    'Nano Banana 2 Edit', 'SeedDream Edit', 'Wavespeed Nano Ultra Edit', 'Qwen Image Edit',
  ],
  'Edit Image': ['Inpaint', 'Erase'],
  'Smoosh': ['Image Blending'],
  'Lens': ['Multi-angle Generation'],
  '3D Viewer': ['Hunyuan 3D Pro', 'Topaz Upscale'],
  'Try Style': ['Virtual Try-on'],
  'Turnaround': ['All image models', 'Topaz Upscale', 'GPT-4.1-mini (prompt builder)'],
  'Library': ['Image Library', 'Tags', 'Save/Import'],
  'JumpStart': [
    'Veo 3.1', 'Veo 3.1 Lite', 'Veo 3.1 R2V', 'Veo 3.1 FLF', 'Veo 3.1 Lite FLF',
    'Kling 2.0 Master', 'Kling V3 Pro', 'Kling O3 Pro', 'Kling O3 R2V', 'Kling O3 V2V',
    'PixVerse V6', 'PixVerse v4.5', 'Wan 2.5', 'Wan Pro', 'Hailuo',
    'Grok I2V', 'Grok R2V', 'Wavespeed WAN', 'Seedance',
  ],
  'JumpStart Extend': ['Seedance Extend', 'Veo 3.1 Extend', 'Grok Extend'],
  'Video Studio': ['Modal UI'],
  'Trip': ['Video Restyle'],
  'Animate': ['Image-to-Video'],
  'Motion Transfer': ['Modal UI'],
  'Storyboards': [
    'GPT-4.1-mini (narrative)', 'GPT-4.1-mini (visual director)',
    'All image models', 'All video models', 'PDF Export', 'Review/Share',
  ],
  'Video Analyzer': ['Analysis'],
  'Clone Ad': ['Clone'],
  'Audio Studio': [
    'Gemini TTS', 'ElevenLabs TTS', 'ElevenLabs Music',
    'MiniMax Music v2', 'Lyria 2', 'Suno V4', 'ElevenLabs SFX', 'Auto-Subtitle',
  ],
  'Command Center': ['GPT-4.1 (chat)', 'SerpAPI', 'Exa', 'Firecrawl', 'Supabase RAG'],
  'Ads Manager': [
    'GPT-4.1 (copy gen)', 'GPT-4.1-mini (regen)', 'Nano Banana 2',
    'All image models', 'Google Ads OAuth',
  ],
  'Ad Intelligence': ['SerpAPI', 'Exa', 'Firecrawl', 'GPT-4.1'],
  'Shorts Workbench': [
    'GPT-5-mini (topics)', 'GPT-4.1-mini (script)', 'Gemini TTS', 'Whisper',
    'ElevenLabs Music', 'All image models', 'All video models (FLF + I2V)',
    'FFmpeg Compose', 'Auto-Subtitle', 'Scene Repair',
  ],
  'LinkedIn': ['GPT-4.1 (post gen)', 'Nano Banana 2', 'Satori Compositor', 'Exa API', 'LinkedIn OAuth'],
  'Carousels': [
    'GPT-4.1 (content gen)', 'Nano Banana 2', 'Satori Compositor',
    'ElevenLabs TTS (slideshow)', 'FFmpeg Compose', 'Multi-platform publish',
  ],
  'Queue / Publish': ['YouTube Upload', 'Scheduled Publishing'],
  'Brand Kit': ['Firecrawl (URL extract)', 'GPT-4.1-mini (PDF extract)', 'SEWO Connect', 'Background Removal'],
  'LoRA Training': ['GPT-4o-mini (captioning)'],  // Training models auto-populated if needed
  'Settings': ['Connected Accounts', 'API Keys'],
  'Learn Page': ['Guides', 'Screenshots'],
  'Proposal Pages': ['Content', 'Password Gate'],
  'Flows': ['Automation Workflows'],
  'General': ['Auth', 'Navigation', 'Deploy', 'Performance', 'UI/Layout', 'Sidebar', 'Routing'],
};

// Request types
export const REQUEST_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'question', label: 'Question' },
  { value: 'feature', label: 'Feature' },
  { value: 'console_error', label: 'Console Error' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'learn_screenshot', label: 'Learn Screenshot' },
  { value: 'prompt_review', label: 'Prompt Review' },
  { value: 'claude_md_update', label: 'CLAUDE.md Update' },
];

// Status config for badges
export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  needs_info: { label: 'Needs Info', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// Flat alphabetical tool list for the dropdown
export const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flat().sort();
```

- [ ] **Step 2: Commit**

```bash
git add src/components/review/reviewToolMap.js
git commit -m "feat(reviews): add tool-to-endpoint mapping data"
```

---

### Task 3: Backend API — Core CRUD

**Files:**
- Create: `api/reviews/reviews.js` (handles GET list + POST create)
- Create: `api/reviews/get.js` (GET single + comments)
- Create: `api/reviews/update.js` (PATCH status/priority)
- Create: `api/reviews/comments.js` (POST add comment)
- Create: `api/reviews/upload.js` (POST screenshot upload)
- Modify: `server.js` (register routes)

- [ ] **Step 1: Create `api/reviews/reviews.js` — list + create handler**

Multi-method handler following the `api/command-center/campaigns.js` pattern:

- **GET**: Query `review_requests` filtered by `user_id = req.user.id`. Support `?status=` query param for filtering. Order by priority DESC (`high` first), then `created_at ASC` (oldest first). Return `{ requests: [...] }`.
- **POST**: Insert into `review_requests` with `user_id`, `tool`, `endpoint`, `type`, `title`, `description`, `screenshot_url`, `priority`. Validate required fields (`tool`, `type`, `title`). Return `{ request: {...} }`.

Use `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)` for Supabase access. Access user via `req.user.id`.

- [ ] **Step 2: Create `api/reviews/get.js` — single request + comments**

- **GET**: Fetch request by `id` from params where `user_id = req.user.id`. Also fetch all `review_comments` for that `request_id`, ordered by `created_at ASC`. Return `{ request: {..., comments: [...]} }`.

- [ ] **Step 3: Create `api/reviews/update.js` — update status/priority**

- **PATCH**: Update `review_requests` by `id` where `user_id = req.user.id`. Accept `status` and/or `priority` in body. Enforce the `resolved_at` rule: if new status is `resolved` or `closed`, set `resolved_at = new Date().toISOString()`. If re-opening (status → `pending`), set `resolved_at = null`. Return `{ request: {...} }`.

- [ ] **Step 4: Create `api/reviews/comments.js` — add comment**

- **POST**: Insert into `review_comments` with `request_id` from params, `author` from body (`'user'` or `'claude'`), `content` from body, optional `commit_hash`. Verify the request belongs to `req.user.id` before inserting. Return `{ comment: {...} }`.

- [ ] **Step 5: Create `api/reviews/pending.js` — get oldest pending request**

- **GET**: Fetch the single oldest `pending` request for `user_id = req.user.id`, ordered by priority DESC then `created_at ASC`, limit 1. Return `{ request: {...} }` or `{ request: null }` if none pending. This endpoint exists for manual testing and potential future use — the CRON uses Supabase MCP directly.

- [ ] **Step 6: Create `api/reviews/resolve.js` — mark resolved with findings**

- **PATCH**: Update request by `id` where `user_id = req.user.id`. Set `status = 'resolved'`, `resolved_at = now()`. Accept optional `content` in body — if provided, also insert a comment with `author: 'claude'` and optional `commit_hash`. Return `{ request: {...} }`. This endpoint exists for manual testing — the CRON uses Supabase MCP directly.

- [ ] **Step 7: Create `api/reviews/upload.js` — screenshot upload**

- **POST**: Accept multipart form data (use `multer` or manual buffer reading — check how existing upload endpoints work in the codebase, e.g. `api/jumpstart/generate.js` which handles FormData). Upload to Supabase storage bucket `media` at path `reviews/${req.user.id}/${uuid}.${ext}`. Return `{ url: publicUrl }`.

Note: Check `api/jumpstart/generate.js` for the FormData/multer pattern used in this project. Follow the same approach.

- [ ] **Step 8: Register routes in `server.js`**

Add a new `// Reviews` block near the other API route groups. Use the `loadApiRoute` dynamic pattern. **IMPORTANT**: Register specific paths (`/upload`, `/pending`) BEFORE parameterized paths (`/:id`) to avoid Express treating them as `:id` params.

```javascript
// Reviews
app.post('/api/reviews/upload', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/upload.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.get('/api/reviews/pending', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/pending.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.get('/api/reviews', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/reviews.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.post('/api/reviews', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/reviews.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.get('/api/reviews/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/get.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.patch('/api/reviews/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/update.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.patch('/api/reviews/:id/resolve', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/resolve.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.post('/api/reviews/:id/comments', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('reviews/comments.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

- [ ] **Step 9: Test the API endpoints manually**

Start the dev server with `npm run server`. Use curl or the browser console to test:
1. `POST /api/reviews` with `{ tool: 'General', type: 'bug', title: 'Test request' }` — verify 200 + record created
2. `GET /api/reviews` — verify returns the request
3. `GET /api/reviews/:id` — verify returns request + empty comments array
4. `POST /api/reviews/:id/comments` with `{ author: 'user', content: 'Test comment' }` — verify comment created
5. `PATCH /api/reviews/:id` with `{ status: 'resolved' }` — verify `resolved_at` is set
6. `PATCH /api/reviews/:id` with `{ status: 'pending' }` — verify `resolved_at` is cleared

- [ ] **Step 10: Commit**

```bash
git add api/reviews/ server.js
git commit -m "feat(reviews): add CRUD API endpoints for review requests"
```

---

### Task 4: Review Widget — Floating Button + Submit Form

**Files:**
- Create: `src/components/review/ReviewWidget.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `ReviewWidget.jsx`**

Component structure:
- **State**: `isOpen` (boolean), `showDashboard` (boolean), form fields (`tool`, `endpoint`, `type`, `priority`, `title`, `description`, `screenshotUrl`), `pendingCount`, `submitting`, `screenshotUploading`
- **On mount**: Fetch `GET /api/reviews` (no status filter — returns all requests) via `apiFetch`. Count `pending` + `needs_info` statuses client-side for badge. Store the full list so the dashboard can use it without re-fetching.
- **Floating button**: Fixed `bottom-6 left-6 z-50`. 56px circle. Navy background (`bg-[#0a1628]`). Blue neon ring via `shadow-[0_0_15px_rgba(59,130,246,0.5)]` + `ring-2 ring-blue-500/60`. White `PenLine` icon from lucide-react. Badge (pending count) as absolute-positioned red circle top-right of button. Click toggles `isOpen`.
- **Submit form**: Positioned `absolute bottom-16 left-0`, 350px wide card. Dark background matching app theme (`bg-slate-800 border border-slate-700`). Contains:
  1. Header with "New Request" title + "View All" link (sets `showDashboard = true`)
  2. Tool dropdown — `<select>` with `ALL_TOOLS` from `reviewToolMap.js`
  3. Endpoint dropdown — `<select>` filtered by `TOOL_ENDPOINTS[selectedTool]`, hidden if no tool selected, optional
  4. Type dropdown — `<select>` with `REQUEST_TYPES`
  5. Priority — 3 buttons (Low/Medium/High), medium selected by default, styled as segmented control
  6. Title — `<input>` required, placeholder "Brief summary..."
  7. Description — `<textarea>` rows=3, placeholder "Details, console logs, steps to reproduce..."
  8. Screenshot — upload button + paste handler. `onPaste` event on the form listens for `image/*` clipboard data. Calls `POST /api/reviews/upload` immediately, shows thumbnail preview + loading spinner. Max 5MB check client-side.
  9. Submit button — calls `POST /api/reviews`, shows `toast.warning('Request submitted')` (warning because success toasts are silenced), resets form, re-fetches pending count.

- [ ] **Step 2: Add ReviewWidget to App.jsx**

Add alongside the `AuthenticatedChatBubble`:

```jsx
function AuthenticatedReviewWidget() {
  const { user, hasKeys } = useAuth();
  if (!user || !hasKeys) return null;
  return <ReviewWidget />;
}
```

Add `<AuthenticatedReviewWidget />` after `<AuthenticatedChatBubble />` in the JSX.

- [ ] **Step 3: Test the widget**

Run `npm run start`. Verify:
1. Blue neon button appears bottom-left
2. Clicking opens submit form
3. Tool dropdown populates, selecting a tool filters endpoints
4. Submitting creates a record (check via `GET /api/reviews` in browser console)
5. Badge count updates after submission
6. Screenshot paste works (paste an image from clipboard)

- [ ] **Step 4: Commit**

```bash
git add src/components/review/ReviewWidget.jsx src/App.jsx
git commit -m "feat(reviews): add floating review widget with submit form"
```

---

### Task 5: Review Panel — Left-Side Slide-Over

**Files:**
- Create: `src/components/review/ReviewPanel.jsx`

- [ ] **Step 1: Create `ReviewPanel.jsx`**

Custom left-side slide-over using Radix Dialog primitives directly. Follow the same pattern as `src/components/ui/slide-over-panel.jsx` but mirrored to the left.

Key differences from SlideOverPanel:
- Position: `left-0` instead of `right-0`
- Animation: `data-[state=open]:slide-in-from-left` / `data-[state=closed]:slide-out-to-left`
- Width: `w-[600px]` fixed (not responsive like SlideOverPanel)
- Same overlay, same `onPointerDownOutside` handler (prevents close on floating element clicks)

Props: `open`, `onOpenChange`, `children`

Structure:
```jsx
import * as DialogPrimitive from '@radix-ui/react-dialog';

export function ReviewPanel({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 w-[600px] max-w-[95vw] bg-slate-900 border-r border-slate-700 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-300 flex flex-col"
          onPointerDownOutside={(e) => {
            const target = e.detail?.originalEvent?.target || e.target;
            if (
              target?.closest?.('.fixed.bottom-6') ||
              target?.closest?.('[data-sonner-toast]') ||
              target?.closest?.('[role="status"]')
            ) {
              e.preventDefault();
            }
          }}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/review/ReviewPanel.jsx
git commit -m "feat(reviews): add left-side ReviewPanel component"
```

---

### Task 6: Review Dashboard — Request List + Filters

**Files:**
- Create: `src/components/review/ReviewDashboard.jsx`
- Create: `src/components/review/ReviewRequestCard.jsx`
- Create: `src/components/review/ReviewCommentThread.jsx`
- Modify: `src/components/review/ReviewWidget.jsx` (wire dashboard open)

- [ ] **Step 1: Create `ReviewDashboard.jsx`**

Top-level dashboard component rendered inside `ReviewPanel`. Contains:

- **State**: `requests` array, `loading`, `activeFilter` (default `'all'`), `expandedId` (which request is expanded, null = none)
- **On mount / on open**: Fetch `GET /api/reviews` (no filter = all). Store in state.
- **Header**: "Review Requests" title + close button (X). Below: filter chips as buttons — All, Pending, In Progress, Needs Info, Resolved, Closed. Each shows count from the `requests` array. Active chip is highlighted. Clicking a chip sets `activeFilter` and filters the displayed list client-side (no re-fetch needed since we have all requests).
- **Request list**: Filtered + sorted array rendered as `ReviewRequestCard` components. Sort: `high` priority first, then `medium`, then `low`, then by `created_at` ascending (oldest first within same priority).
- **Expanded view**: When `expandedId` is set, show the expanded card with full details + `ReviewCommentThread` + status controls. Clicking a different card collapses the current and expands the new one.

- [ ] **Step 2: Create `ReviewRequestCard.jsx`**

Props: `request`, `isExpanded`, `onToggle`, `onStatusChange`, `onRefresh`

**Collapsed view**: A compact card row showing:
- Left: Status badge (colored dot + label from `STATUS_CONFIG`), Type badge
- Center: Title, Tool tag (+ Endpoint tag if set)
- Right: Relative time (use `new Date(request.created_at)` → "2h ago" / "3d ago" helper)

**Expanded view** (when `isExpanded`): Shows everything in collapsed view plus:
- Full description (preserve whitespace for console logs: `whitespace-pre-wrap font-mono text-sm`)
- Screenshot thumbnail (if `screenshot_url` set) — clickable to open full-size in new tab
- `ReviewCommentThread` component
- Add comment textarea + submit button
- Status control buttons: conditional based on current status:
  - `pending` → "Close" button
  - `in_progress` → "Close" button
  - `needs_info` → "Add Info & Re-open" (sets to pending), "Close"
  - `resolved` → "Re-open" (sets to pending), "Close"
  - `closed` → "Re-open" (sets to pending)

Status changes call `PATCH /api/reviews/:id` then `onRefresh()`.
Adding a comment calls `POST /api/reviews/:id/comments` with `author: 'user'`.

- [ ] **Step 3: Create `ReviewCommentThread.jsx`**

Props: `comments` (array from the request's comments)

Renders each comment as a message bubble:
- User comments: left-aligned, slate background
- Claude comments: right-aligned, blue-tinted background, with "Claude" label
- Each shows: author label, content (whitespace-pre-wrap), relative time
- If `commit_hash` is present, show as monospace `text-xs` below the content

- [ ] **Step 4: Wire dashboard into ReviewWidget**

In `ReviewWidget.jsx`:
- When `showDashboard` is true, render `<ReviewPanel open={showDashboard} onOpenChange={setShowDashboard}>` with `<ReviewDashboard />` inside
- The "View All" link in the submit form sets `showDashboard = true` and `isOpen = false` (close the submit form)
- When dashboard closes, pending count should re-fetch

- [ ] **Step 5: Test the full dashboard flow**

Run `npm run start`. Verify:
1. "View All" opens the left-side panel
2. Filter chips work and show correct counts
3. Clicking a card expands it
4. Adding a comment works and appears in the thread
5. Status changes work (resolve, close, re-open)
6. Panel slides in from the left with smooth animation
7. Clicking outside the panel closes it (except on floating elements)

- [ ] **Step 6: Commit**

```bash
git add src/components/review/ReviewDashboard.jsx src/components/review/ReviewRequestCard.jsx src/components/review/ReviewCommentThread.jsx src/components/review/ReviewWidget.jsx
git commit -m "feat(reviews): add dashboard with request list, filters, and comment thread"
```

---

### Task 7: CRON Scheduled Task

**Files:**
- None (uses Claude Code scheduled task system, not a code file)

- [ ] **Step 1: Create the scheduled task**

Use the `mcp__scheduled-tasks__create_scheduled_task` tool:

- **taskId**: `review-processor`
- **cronExpression**: `0 7-23 * * *` (runs hourly from 7am to 11pm local NZT)
- **description**: "Process the oldest pending review request — research, fix, or answer, then write findings back"
- **prompt**: (see below)

The prompt for the scheduled task should instruct Claude to use Supabase MCP tools (which are available in the Claude Code scheduled task environment). The Supabase project ID is needed — find it via `mcp__014fea85-eea7-40c6-9601-cbd447092376__list_projects` first, then hardcode it in the prompt.

```
Process the oldest pending review request from the Stitch app.

Use the Supabase MCP execute_sql tool with project_id '{SUPABASE_PROJECT_ID}' for all database operations.

1. Fetch the oldest pending request:
   execute_sql: SELECT * FROM review_requests WHERE status = 'pending' ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at ASC LIMIT 1
   - If no rows returned, respond "No pending requests." and stop.

2. Set status to in_progress:
   execute_sql: UPDATE review_requests SET status = 'in_progress' WHERE id = '{id}'

3. Fetch existing comments for context:
   execute_sql: SELECT * FROM review_comments WHERE request_id = '{id}' ORDER BY created_at ASC

4. Read the request fields: tool, endpoint, type, title, description, screenshot_url. Then process based on type using the Stitch codebase at /Users/stuarta/stitch/:
   - bug / console_error: Read the relevant source code for the tool+endpoint. Diagnose the issue. If the fix is straightforward, make the code change and commit. Record the commit hash.
   - question: Research the codebase and write a clear answer.
   - feature / change_request: Analyze feasibility, check for conflicts with existing code, write findings + suggested approach.
   - learn_screenshot: Describe what should be added to the /learn page and where.
   - prompt_review: Read the prompt-building code for the tool+endpoint. Check if it uses the Cohesive Prompt Builder (api/prompt/build-cohesive.js) or does raw string concatenation. Fix if needed, commit.
   - claude_md_update: Research the topic against current codebase state, write/update the relevant CLAUDE.md section, commit.

5. Write findings as a comment:
   execute_sql: INSERT INTO review_comments (request_id, author, content, commit_hash) VALUES ('{id}', 'claude', '{findings}', '{commit_hash_or_null}')

6. Update status:
   - If processed successfully: execute_sql: UPDATE review_requests SET status = 'resolved', resolved_at = now() WHERE id = '{id}'
   - If the description is too vague to act on: execute_sql: UPDATE review_requests SET status = 'needs_info' WHERE id = '{id}'

7. Only process ONE request per run. Never batch.
```

- [ ] **Step 2: Verify the scheduled task is registered**

Use `mcp__scheduled-tasks__list_scheduled_tasks` to confirm the task appears with the correct schedule.

- [ ] **Step 3: Commit the plan note**

No code file to commit — the scheduled task lives in Claude Code's task system. But note the task ID in a comment for reference.

---

### Task 8: Final Integration + CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with Review Widget documentation**

Add a new section under "## Key Subsystems" (or after the last subsystem entry):

```markdown
**Review Widget** (`src/components/review/ReviewWidget.jsx` + `api/reviews/`): In-app issue tracker at bottom-left of screen. Blue neon ring button with white pencil icon. Submit form: select tool (from full app tool list) + optional endpoint (specific model/API) + type (bug, question, feature, console_error, change_request, learn_screenshot, prompt_review, claude_md_update) + priority + title + description + screenshot. Slide-over dashboard (`ReviewPanel.jsx`) opens from the left — filter by status, expand requests to see comment threads, change status. DB tables: `review_requests` + `review_comments`. Migration: `20260406_review_requests.sql`. 5 API endpoints under `/api/reviews/*`. Claude Code scheduled task `review-processor` runs hourly (7am-11pm NZT), picks up oldest pending request, researches/fixes, writes findings back as a comment. Tool→endpoint map in `src/components/review/reviewToolMap.js`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Review Widget subsystem to CLAUDE.md"
```

- [ ] **Step 3: Verify full system**

1. Submit a test request via the widget
2. Check it appears in the dashboard
3. Add a comment via the dashboard
4. Change status to resolved, verify resolved_at is set
5. Re-open, verify resolved_at is cleared
6. Check that the CRON task is scheduled and would pick up pending requests

- [ ] **Step 4: Deploy**

```bash
git push origin main
fly deploy
```
