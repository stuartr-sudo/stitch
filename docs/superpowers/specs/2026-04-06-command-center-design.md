# AI Marketing Command Center — Design Spec

**Date:** 2026-04-06
**Status:** Draft
**Approach:** B — Command Center (Chat + Campaigns + Review Dashboard)

## Context

Stitch has grown into a comprehensive content creation platform with 35+ Flow node types, 5 publishing integrations, 50+ AI model endpoints, and deep creative preset libraries. But every piece of content still requires manual navigation to the right tool, manual configuration, and manual scheduling. There is no orchestration layer — no way to say "here's what I want this week" and have the system figure out the rest.

This spec defines an AI Marketing Command Center: a persistent chat interface where the user braindumps ideas, an AI planning engine that understands all of Stitch's tools and builds multi-flow campaigns, a review dashboard with Gantt/calendar views, and the streaming infrastructure to make the chat feel conversational.

## Components

### 1. Chat Bubble (Frontend)

**Placement:** Floating bubble in the bottom-right corner of every authenticated page. Click to expand into an overlay chat panel (360px wide). Click away or press Escape to minimize back to the bubble.

**Behavior:**
- Persistent across page navigation (lives in the App-level layout, not per-page)
- Chat history preserved within session; persisted to DB for cross-session memory
- Unread indicator badge when the AI has updates (e.g., "3 items ready for review")
- "New Braindump" button clears context for a fresh campaign conversation
- Previous conversations accessible via a history dropdown

**Chat UI:**
- User messages: right-aligned, muted purple background
- AI messages: left-aligned with purple left border, streaming token-by-token
- Campaign plan cards: inline structured previews showing what the AI proposes
- Action buttons inline: "Build it", "Refine", "View in Command Center"
- Input: text area with send button, supports multi-line (Shift+Enter)

**Component:** `src/components/command-center/ChatBubble.jsx` — renders the bubble + expanded panel. Uses a React context (`CommandCenterContext`) for state management across the app.

### 2. Command Center Page

**Route:** `/command-center`
**Page:** `src/pages/CommandCenterPage.jsx`

Three view modes toggled via tab bar:

#### 2a. Campaigns View (default)
- Stats bar: Pending Review / Building / Approved / Published counts
- Campaign cards grouped by braindump, showing:
  - Campaign name, creation time, item count
  - Status badge (Building / Pending Review / Approved / Published)
  - Per-item tiles with icon, content type, platform, and status
  - Progress bar for in-progress campaigns
  - Actions: "Review & Approve", "View Flows", "Reject All"
- Expanding a campaign shows rich item previews:
  - Thumbnails/video previews for visual content
  - Script excerpts for text content
  - Metadata (duration, slide count, word count, style)
  - Per-item Approve / Edit / Reject buttons
  - "Edit" opens the item in its native tool (Short → `/shorts/draft/:id`, Carousel → `/carousels/:id`, LinkedIn → `/linkedin/:id`, Ad → `/ads/:id`)

#### 2b. Gantt View
- Timeline header: days of the week (scrollable for longer ranges)
- Rows grouped by campaign, with sub-rows per content item
- Bars show lifecycle phases: Building → Review → Approved → Scheduled → Published
- Color-coded: purple (building), amber (review), green (approved), gray (published)
- Click a bar to open the item detail
- Today line highlighted
- Drag to reschedule with constraints:
  - Only items with status `approved` or `ready` are draggable (not `building`, `published`, or `failed`)
  - Cannot drag to a past date
  - Collision warning if another item targets the same platform at the same time (soft warning, not blocked)
  - Updates `scheduled_at` on the campaign item via `PUT /api/command-center/items/:id`

**Implementation:** Custom CSS Grid layout (not a library). Each cell is a day column. Bars are absolutely positioned spans within their row. Keeps the bundle small and styling consistent with the rest of Stitch.

#### 2c. Calendar View
- Standard week/month grid
- Each day cell shows scheduled content items as small pills (icon + platform)
- Click a day to see expanded list of items
- Click an item to open its detail/editor
- Color-coded by platform (LinkedIn blue, YouTube red, TikTok black, Instagram gradient, Meta blue)

### 3. AI Planning Engine (Backend)

**Two endpoints — separated responsibilities:**
- `POST /api/command-center/chat` — SSE streaming for conversational AI (planning, refinement). Short-lived: ends when the AI finishes its response.
- `POST /api/command-center/campaigns/:id/build` — non-SSE endpoint that triggers campaign building. Returns immediately with `{ status: 'building' }`. The orchestrator runs in the background. Frontend polls campaign status via `GET /api/command-center/campaigns/:id` or subscribes to updates on the next chat SSE connection.

This separation means the chat SSE connection is never held open for multi-minute builds. The chat can say "Building now! I'll update you as items complete." and subsequent chat opens receive status updates from the orchestrator.

#### 3a. Streaming Infrastructure

Express SSE endpoint pattern:
```
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});
```

OpenAI streaming via `openai.chat.completions.create({ stream: true })`. Each chunk forwarded as an SSE `data:` event. Frontend consumes via `fetch` with `ReadableStream` (not `EventSource` — allows POST with body and custom headers including auth).

**Keepalive:** Server sends `data: {"type":"ping"}\n\n` every 30 seconds to prevent Fly.io idle timeout (60s default) and proxy drops.

**Reconnection:** If the connection drops, the frontend re-fetches campaign state from `GET /api/command-center/campaigns/:id` to recover. No event replay — the DB is the source of truth for campaign/item status.

**Vite proxy:** The SSE route needs a longer timeout in `vite.config.js` — add `/api/command-center/chat` to a separate proxy config with `timeout: 600000` (10 min), or the frontend connects directly to port 3003 for SSE in development.

Message types sent over SSE:
- `type: "token"` — streaming text content
- `type: "plan"` — structured campaign plan JSON (sent when planning is complete)
- `type: "status"` — progress updates ("Building flow 2 of 5...")
- `type: "complete"` — conversation turn finished
- `type: "error"` — error with message
- `type: "ping"` — keepalive (ignored by frontend)

#### 3b. AI Creative Director

**Model:** GPT-4.1 with Zod structured output for the campaign plan.

**System prompt context injected per request:**
- User's active brand kit (name, tagline, colors, fonts, industry, audience, logo URL)
- User's niche (from brand kit or most-used niche)
- Available content types and their capabilities (summarized from node type registry)
- Platform best practices (optimal durations, aspect ratios, posting cadence)
- Creative presets summary (framework categories, style categories, voice options)
- Recent campaigns (last 5, for context continuity)
- Conversation history (last 20 messages in current thread)

**Campaign Plan schema (Zod):**
```
{
  name: string,
  description: string,
  items: [{
    type: 'short' | 'linkedin_post' | 'carousel' | 'ad_set' | 'storyboard' | 'custom',
    platform: string | string[],
    topic: string,
    angle: string,
    tone: string,
    duration?: number,
    slide_count?: number,
    visual_style?: string,
    video_style?: string,
    framework?: string,
    niche?: string,
    voice?: string,
    objective?: string,        // for ads
    custom_flow_description?: string,  // for type: 'custom'
    scheduled_at?: string,     // ISO timestamp
  }]
}
```

#### 3c. Hybrid Flow Builder

**File:** `api/lib/campaignFlowBuilder.js`

Two paths based on item type:

**Critical note on node types:** Many Flow node types (`shorts-create`, `carousel-create`, publishing nodes, etc.) are currently placeholder stubs returning hardcoded values. Campaign flow templates **bypass the node type system entirely** and call existing subsystem APIs directly. Each template is an orchestration function that calls the real API handlers (workbench endpoints, carousel endpoints, LinkedIn endpoints, ads endpoints) in sequence, not a `graph_json` for the FlowExecutor. This ensures the Command Center works with production-ready code from day one. Flows are still created in the DB for tracking/visualization, but execution is handled by the campaign orchestrator calling real APIs.

**Template path** (type is `short`, `linkedin_post`, `carousel`, `ad_set`, `storyboard`):
- Lookup internal campaign flow template for the content type
- Template is an **orchestration function** that calls existing subsystem APIs directly:
  - Shorts: calls workbench endpoints (`/api/workbench/voiceover`, `/api/workbench/timing`, etc.)
  - LinkedIn: calls `/api/linkedin/generate-post`, `/api/linkedin/posts`
  - Carousel: calls `/api/carousel/generate-content`, `/api/carousel/generate-slides`, etc.
  - Ads: calls `/api/ads/generate`
  - Storyboard: calls `/api/storyboard/generate`
- Inject AI's creative decisions as API parameters (topic, style, voice, duration, etc.)
- Inject brand kit settings (colors, fonts, logo, LoRA configs)
- Creates a Flow record in DB for tracking/visualization but executes via direct API calls
- Returns content IDs (draft_id, carousel_id, post_id, etc.) for linking to native editors

**AI-assembled path** (type is `custom` or template doesn't cover the request):
- Send the node type registry + item description to GPT-4.1
- AI returns `graph_json` with nodes, edges, and configs
- **Validation layer** before execution:
  - Port type compatibility check (reuse existing `FlowCanvas` validation logic)
  - DAG cycle detection (topological sort — reuse from `flowExecutor.js`)
  - Required inputs wired check
  - Cost estimation (sum of estimated per-node costs from a cost lookup table)
- **User confirmation required:** AI-assembled flows always pause for user approval before execution. The chat shows the estimated cost and a "Approve & Run" / "Edit in Flow Builder" choice. No auto-execute for custom flows.
- **Cost ceiling:** Max $25 per AI-assembled flow (configurable). Flows exceeding this estimate are blocked with an explanation.
- If validation fails, AI gets the errors and retries (max 2 retries)
- If still invalid, surface to user: "I couldn't wire this flow automatically. Want to edit it in the Flow Builder?"

**Internal campaign flow templates** (new file: `api/lib/campaignFlowTemplates.js`):
- `shorts-campaign` — calls workbench API: script → voiceover → timing → keyframes → clips → assemble → captions
- `linkedin-post-campaign` — calls LinkedIn API: generate post → generate image → compose → save
- `carousel-campaign` — calls carousel API: generate content → generate slides → compose images → save
- `ad-set-campaign` — calls ads API: generate copy → generate images → create variations → save
- `storyboard-campaign` — calls storyboard API: generate narrative → visual director → generate previews → save

Each template is an async function that accepts the AI's plan item + brand context + user API keys and orchestrates the real subsystem APIs. Not stored in DB — code-defined for reliability.

### 4. Data Model

#### New tables:

**`command_center_campaigns`**
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES auth.users(id)
name            TEXT NOT NULL
description     TEXT
status          TEXT DEFAULT 'planning'
                -- planning | building | review | approved | published | cancelled
plan_json       JSONB          -- the AI's campaign plan
braindump_text  TEXT           -- original user input
item_count      INTEGER DEFAULT 0
items_ready     INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**`command_center_items`**
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
campaign_id     UUID NOT NULL REFERENCES command_center_campaigns(id) ON DELETE CASCADE
user_id         UUID NOT NULL REFERENCES auth.users(id)
type            TEXT NOT NULL   -- short, linkedin_post, carousel, ad_set, storyboard, custom
platform        TEXT           -- youtube, tiktok, linkedin, instagram, facebook, meta
status          TEXT DEFAULT 'queued'
                -- queued | building | ready | approved | rejected | published | failed
flow_id         UUID REFERENCES automation_flows(id)
execution_id    UUID REFERENCES automation_executions(id)
plan_item_json  JSONB          -- the AI's plan for this specific item
result_json     JSONB          -- output URLs, metadata after execution
preview_url     TEXT           -- thumbnail/preview for the dashboard
scheduled_at    TIMESTAMPTZ    -- when to publish
published_at    TIMESTAMPTZ
error           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**`command_center_messages`**
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES auth.users(id)
thread_id       UUID NOT NULL  -- groups messages into conversations
campaign_id     UUID REFERENCES command_center_campaigns(id)
role            TEXT NOT NULL   -- user | assistant
content         TEXT NOT NULL
metadata_json   JSONB          -- plan references, status updates, etc.
created_at      TIMESTAMPTZ DEFAULT NOW()
```

All tables get RLS policies: users can only access their own data.

Indexes: `user_id` on all three tables, `campaign_id` on items and messages, `status` on campaigns and items, `thread_id` on messages, `scheduled_at` on items.

**Platform handling:** The AI plan schema allows `platform: string | string[]` (e.g., a Short for both YouTube and TikTok). Multi-platform items are **split into separate rows** at flow-build time — one `command_center_items` row per platform. This keeps the DB schema simple (`platform TEXT`) and each row maps cleanly to one publish action.

**`result_json` schema per content type:**
- Short: `{ draft_id, campaign_id, video_url, thumbnail_url, script_text, duration }`
- LinkedIn post: `{ post_id, text, image_url }`
- Carousel: `{ carousel_id, slide_count, preview_url }`
- Ad set: `{ ad_campaign_id, variation_ids: [], platform }`
- Storyboard: `{ storyboard_id, frame_count, preview_url }`
- Custom: `{ flow_id, execution_id, outputs: {} }` (whatever the flow produced)

These schemas determine which native editor the "Edit" button links to and what preview data the dashboard shows.

#### Relationships:
- One campaign has many items
- Each item links to one automation flow + one execution
- Messages link to a thread (conversation) and optionally to a campaign
- Items link to existing content via `result_json` (contains content-type-specific IDs for native editor linking)

### 5. API Endpoints

**Chat:**
- `POST /api/command-center/chat` — SSE streaming chat endpoint (authenticated)
- `POST /api/command-center/threads` — create a new conversation thread (returns thread_id)
- `GET /api/command-center/threads` — list conversation threads (paginated, `?limit=20&offset=0`)
- `GET /api/command-center/threads/:id/messages` — get messages for a thread (paginated, `?limit=50&offset=0`, newest first)
- `DELETE /api/command-center/threads/:id` — delete a conversation thread and its messages

**Campaigns:**
- `GET /api/command-center/campaigns` — list campaigns with items (supports `?status=` filter)
- `GET /api/command-center/campaigns/:id` — single campaign with all items
- `POST /api/command-center/campaigns/:id/build` — trigger flow building for a planned campaign
- `PUT /api/command-center/campaigns/:id` — update campaign (name, schedule)
- `DELETE /api/command-center/campaigns/:id` — cancel/delete campaign

**Items:**
- `PUT /api/command-center/items/:id` — update item (status, scheduled_at)
- `POST /api/command-center/items/:id/approve` — approve item
- `POST /api/command-center/items/:id/reject` — reject item
- `POST /api/command-center/items/:id/rebuild` — re-run the flow for this item
- `POST /api/command-center/items/:id/publish` — publish immediately

**Dashboard:**
- `GET /api/command-center/stats` — aggregate counts for stats bar
- `GET /api/command-center/calendar?start=&end=` — items within a date range for calendar/Gantt

### 6. Campaign Lifecycle

```
Braindump → AI Plans → User Approves Plan → Flows Built → Flows Execute →
Items Ready → User Reviews → Approved → Scheduled → Published
```

1. **Planning:** User braindumps in chat. AI streams a campaign plan. User refines or says "build it."
2. **Building:** `campaignFlowBuilder` creates flows for each item. FlowExecutor runs them (up to 3 campaigns concurrently, each campaign's flows run in parallel).
3. **Review:** Items land in the Command Center with status "ready." User previews each item.
4. **Approve/Reject:** Per-item or batch. Approved items can be scheduled or published immediately.
5. **Publish:** At scheduled time (or immediately), the publishing flow nodes execute. Status updates to "published."

### 7. New Infrastructure

**SSE streaming** — New pattern for Stitch. The `/api/command-center/chat` endpoint holds the connection open and streams chunks. Frontend uses a `useSSE` hook that wraps `fetch` with `ReadableStream` parsing.

**Campaign execution orchestrator** — `api/lib/campaignOrchestrator.js` manages the lifecycle: creates flows from the plan, calls campaign flow templates (which call real subsystem APIs directly), monitors progress, updates campaign/item statuses in DB. Progress monitoring uses **DB polling** (query `command_center_items` status every 5s during a build) rather than event emitters, because builds run across multiple async API calls and DB state is already the source of truth. The chat picks up status from the DB when the user next opens it or sends a message.

**Deployment resilience:** Since Stitch runs on a single Fly.io machine, `fly deploy` kills in-progress builds. On server startup, the orchestrator checks for campaigns with `status = 'building'` and items with `status = 'building'`. Items that were mid-build are marked `failed` with error "Interrupted by server restart — click Rebuild to retry." This reuses the same pattern as `recoverInterruptedExecutions()` in `flowExecutor.js`.

**Chat context builder** — `api/lib/chatContextBuilder.js` assembles the system prompt for each chat request: brand kit, niche, recent campaigns, node capabilities, platform rules.

**Cost estimation** — `api/lib/flowCostEstimator.js` sums estimated costs per node type before execution. Shown to user in the chat: "This campaign will cost approximately $X.XX in API credits."

**Scheduled publishing integration:** Command Center items use a **new polling loop** in `campaignOrchestrator.js` (separate from the existing `scheduledPublisher.js`). It polls `command_center_items` where `status = 'approved' AND scheduled_at <= NOW()` and calls the appropriate publisher (YouTube, LinkedIn, Instagram, Facebook, TikTok) via the existing publisher modules (`youtubeUpload`, `linkedinPublisher`, `instagramPublisher`, `facebookPublisher`, `tiktokPublisher`). This avoids dual-writing to legacy tables. The existing `scheduledPublisher.js` continues to handle items created through the old flows — no migration needed.

## Verification

1. **Chat bubble:** Visible on all authenticated pages. Expands/collapses. Persists across navigation.
2. **Streaming:** Type a braindump, see tokens appear in real-time. Plan card appears when planning completes.
3. **Campaign creation:** "Build it" creates campaign + items in DB. Flows appear in the Flows list.
4. **Execution:** Flows run, items update to "ready" with preview URLs.
5. **Command Center:** Campaigns view shows cards. Gantt shows timeline bars. Calendar shows scheduled items.
6. **Review flow:** Approve/reject/edit per item. Edit opens native tool. Approve queues for publish.
7. **Publish:** Approved + scheduled items publish at the right time.

## Out of Scope (Phase C)

- Analytics / performance data ingestion
- Competitor monitoring
- Autonomous content planning (AI proposes without braindump)
- Feedback loop / template learning from past performance
- Multi-user / team collaboration on campaigns
