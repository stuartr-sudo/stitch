# Automation Flows — Design Spec

## Context

Stitch is a full-stack AI video/image creation platform with 50+ API tools (Imagineer, JumpStart, Carousel Builder, LinkedIn, Storyboard, voiceover, music, publishing, etc.). Currently each tool operates independently — users manually chain outputs from one tool into the next.

The user's background is in automation. The goal is to build a visual automation flow builder where users can compose Stitch tools into multi-step pipelines, wire data between steps, run parallel branches, and trigger flows manually or on a schedule. Pre-built templates provide instant value; the custom builder gives full control.

Existing infrastructure to leverage: `jobs` table for persistent state, Autopilot worker for queue-based execution, `production_queue` table, and the entire API handler library. Note: the existing `WorkflowEngine` (`api/lib/workflowEngine.js`) is a linear pipeline engine for article→video flows. The new `flowExecutor.js` is a separate DAG-based engine — both coexist independently.

---

## Pages & Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/flows` | `FlowsListPage.jsx` | Browse My Flows, Templates, Executions tabs |
| `/flows/new` | `FlowBuilderPage.jsx` | Blank builder canvas |
| `/flows/:id` | `FlowBuilderPage.jsx` | Edit existing flow |
| `/flows/:id/run/:executionId` | `FlowBuilderPage.jsx` (execution mode) | Live execution status overlay |

Navigation: new "Automation" entry in the Studio sidebar, under Social Tools or as its own top-level section.

---

## Database Schema

### `automation_flows`

**Migration file:** `supabase/migrations/20260403_automation_flows.sql`

```sql
CREATE TABLE automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),  -- NULL for system templates
  name TEXT NOT NULL,
  description TEXT,
  graph_json JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  is_template BOOLEAN DEFAULT FALSE,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'scheduled'
  schedule_cron TEXT,                          -- cron expression when scheduled
  last_triggered_at TIMESTAMPTZ,              -- dedup guard for scheduled runs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_flows_user ON automation_flows(user_id);
CREATE INDEX idx_automation_flows_template ON automation_flows(is_template) WHERE is_template = TRUE;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW EXECUTE FUNCTION update_automation_flows_updated_at();

-- RLS
ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flows"
  ON automation_flows FOR ALL
  USING (user_id = auth.uid() OR is_template = TRUE)
  WITH CHECK (user_id = auth.uid());
```

### `automation_executions`

```sql
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  step_states JSONB NOT NULL DEFAULT '{}',  -- { nodeId: { status, started_at, completed_at, output, error } }
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_executions_flow ON automation_executions(flow_id);
CREATE INDEX idx_automation_executions_user ON automation_executions(user_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status);

-- RLS
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own executions"
  ON automation_executions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Graph Data Structure

### Node (inside `graph_json.nodes[]`)

```json
{
  "id": "node_1",
  "type": "imagineer-generate",
  "position": { "x": 200, "y": 100 },
  "config": {
    "model": "nano-banana-2",
    "aspect_ratio": "16:9",
    "style_preset": "cinematic"
  },
  "errorHandling": "stop"
}
```

Node `type` references the node type registry which defines available inputs, outputs, config schema, and the `run()` function.

`errorHandling`: `"stop"` (halt flow, default), `"skip"` (mark failed, continue downstream with null), `"retry"` (retry up to 3 times with exponential backoff).

### Edge (inside `graph_json.edges[]`)

```json
{
  "id": "edge_1",
  "source": "node_1",
  "sourcePort": "image_url",
  "target": "node_2",
  "targetPort": "image"
}
```

Edges connect a specific output port on the source node to a specific input port on the target node.

---

## Port Type System

| Type | Description | Examples |
|------|-------------|---------|
| `string` | Text data | Prompts, scripts, descriptions |
| `image` | URL to an image | Generated images, thumbnails |
| `video` | URL to a video | Animated clips, assembled shorts |
| `audio` | URL to audio file | Voiceovers, music tracks |
| `json` | Arbitrary structured data | Carousel slide data, script scenes |
| `image[]` | Array of image URLs | Multi-image generation results |
| `video[]` | Array of video URLs | Batch video clips |

**Compatibility rules:** Only matching types can connect (enforced in UI during wiring and validated by executor before running). `string` is the universal input — any type can connect to a `string` port (URLs are strings).

---

## Node Type Registry

**File:** `api/lib/nodeTypeRegistry.js`

Follows the same declarative pattern as `modelRegistry.js`. Each entry defines:

```js
{
  id: 'imagineer-generate',
  label: 'Imagineer Generate',
  category: 'image',        // image | video | audio | content | publish | utility
  icon: '🖼',
  inputs: [
    { id: 'prompt', type: 'string', required: true },
    { id: 'style', type: 'string', required: false },
    { id: 'reference_image', type: 'image', required: false }
  ],
  outputs: [
    { id: 'image_url', type: 'image' }
  ],
  configSchema: {
    model: { type: 'select', options: ['nano-banana-2', 'flux-2', 'seeddream-v4'], default: 'nano-banana-2' },
    aspect_ratio: { type: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' }
  },
  async run(inputs, config, context) {
    // Each node's run() extracts the core logic from the existing API handler
    // into a callable function (not HTTP). For v1, node runners can import
    // shared helpers (generateImageV2, animateImageV2, pollFalQueue, etc.)
    // directly rather than calling Express handlers with mock req/res.
    // context provides: userId, supabase, apiKeys, abortSignal, logCost
    // Returns: { image_url: 'https://...' }
  }
}
```

### v1 Node Types (~21)

**Input:** Manual Input (prompts user for values at execution time — topic, prompt, image URL, etc.)
**Image:** Imagineer Generate, Imagineer Edit, Turnaround Sheet, Smoosh
**Video:** JumpStart Animate, Animate Image, Motion Transfer
**Audio:** Voiceover (Gemini TTS), Music, Captions
**Content:** Script Generator, Prompt Builder, Carousel Builder, LinkedIn Post Creator
**Publish:** YouTube Upload, TikTok Publish, Instagram Post, Facebook Post
**Utility:** Save to Library, Video Trim, Extract Frame

### Manual Input Node

A special node type that accepts runtime parameters when a flow is executed. When triggering a flow via the API or Run button, any Manual Input nodes prompt the user for values before execution begins. Config defines the input fields (name, type, default value). This enables reusable flows — e.g., a "Blog to Multi-Platform" template where the user only provides the topic.

### Cost Tracking

Every node `run()` function receives `context.logCost` and must call it with the same parameters as direct API handlers (model, token counts, username). This ensures flow executions appear on the Cost Dashboard alongside manual tool usage.

---

## Execution Engine

**File:** `api/lib/flowExecutor.js`

### Algorithm

1. **Initialize** — Load flow `graph_json`, create execution record (status: `running`), topologically sort nodes.
2. **Find ready nodes** — Nodes where ALL incoming edges are satisfied (source node completed and output available). Root nodes (no incoming edges) are immediately ready.
3. **Execute batch** — Run all ready nodes concurrently, up to a configurable concurrency limit (default: 3) to avoid provider rate limits.
4. **Resolve outputs** — When a node completes, store its output in `step_states[nodeId].output`. Check all downstream nodes — if all their inputs are now satisfied, add them to the ready queue.
5. **Handle errors** — Based on node's `errorHandling` setting:
   - `stop`: Set execution status to `failed`, stop queuing new nodes, let running nodes finish.
   - `skip`: Mark node as `failed` in step_states, pass `null` to downstream inputs, continue.
   - `retry`: Retry up to 3 times with exponential backoff (2s, 4s, 8s). If all retries fail, treat as `stop`.
6. **Completion** — When no nodes are running and no nodes are ready, set execution status to `completed` (or `failed` if any node failed with `stop` mode).

### Pause / Resume

- **Pause**: Set execution status to `paused`. Running nodes finish but their downstream nodes are not queued. No new nodes start.
- **Resume**: Set execution status to `running`. Re-evaluate ready queue from current step_states and continue.

### Cancellation

Set execution status to `cancelled`. Running nodes receive an abort signal (via `AbortController`). Providers that support cancellation will stop; others finish their current request but results are discarded.

### Concurrency Pool

The executor uses a semaphore-style concurrency pool. Default limit: 3 concurrent node executions. This prevents overwhelming FAL/Wavespeed with too many simultaneous requests (which causes 429s and 502s).

### Crash Recovery

The executor runs in-process on the Express server. If the server restarts mid-execution (deploy, crash, Fly.io machine restart), running executions are interrupted. On server startup, `flowExecutor.js` exports a `recoverInterruptedExecutions()` function that:
1. Queries `automation_executions WHERE status IN ('running', 'queued')`.
2. Marks them as `failed` with error `"Execution interrupted by server restart"`.
3. Logs a warning. Users can manually retry from the Executions tab.

This is called in `server.js` on startup, alongside existing scheduled task initialization.

### Real-time Status Updates

The execution status endpoint (`GET /api/flows/executions/:execId`) is polled by the frontend every 2 seconds while an execution is active. The `step_states` JSONB is updated in the database after each node completes, so each poll reflects the latest state. SSE could replace polling in a future iteration for lower latency.

---

## API Endpoints

**File:** `api/flows/flows.js` (CRUD catch-all, same pattern as `api/storyboard/projects.js`)

**Route registration:** A single `app.all('/api/flows*', authenticateToken, ...)` catch-all in `server.js`. Inside `flows.js`, paths are parsed in specificity order: `/templates` and `/executions` routes are matched before the `/:id` parameter route to avoid Express treating "templates" as an ID.

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/flows` | List user's flows |
| POST | `/api/flows` | Create new flow |
| GET | `/api/flows/:id` | Get flow definition |
| PUT | `/api/flows/:id` | Update flow (graph, name, schedule) |
| DELETE | `/api/flows/:id` | Delete flow |
| POST | `/api/flows/:id/execute` | Trigger execution |
| GET | `/api/flows/:id/executions` | List executions for a flow |
| GET | `/api/flows/executions/:execId` | Get execution status + step_states |
| POST | `/api/flows/executions/:execId/pause` | Pause running execution |
| POST | `/api/flows/executions/:execId/resume` | Resume paused execution |
| POST | `/api/flows/executions/:execId/cancel` | Cancel execution |
| POST | `/api/flows/executions/:execId/retry/:nodeId` | Retry a failed node |
| GET | `/api/flows/templates` | List pre-built template flows |
| POST | `/api/flows/templates/:id/clone` | Clone template into user's flows |

All endpoints (except templates listing) require `authenticateToken`.

---

## Frontend Architecture

### FlowsListPage.jsx (`/flows`)

Three-tab layout:
- **My Flows** — Grid of flow cards with mini DAG previews, run counts, schedule badges, one-click Run button.
- **Templates** — Pre-built recipes. Click to preview, "Use Template" clones into My Flows.
- **Executions** — Table of all runs across all flows with status, duration, flow name, timestamp.

Stats bar at bottom: active flows count, total runs, scheduled count, success rate.

### FlowBuilderPage.jsx (`/flows/:id`)

Three-panel layout:
- **Left: Node Palette** — Searchable, categorized list of node types. Drag onto canvas.
- **Center: React Flow Canvas** — Interactive DAG with zoom, pan, minimap. Nodes are color-coded by category. Ports rendered as colored dots (left=inputs, right=outputs). Edges drawn by dragging port-to-port. Top toolbar: flow name, save status, Schedule button, Run button.
- **Right: Config Panel** — Shows when a node is selected. Renders the node type's `configSchema` as form fields. Shows typed input/output port summary. Error handling mode selector.

**Execution mode:** Same canvas, but nodes get status overlays (green/blue/red/amber borders, spinners, progress bars). Edges animate when data flows. Right panel switches to execution log. Toolbar shows Pause/Cancel controls.

### Dependencies

- `@xyflow/react` (React Flow v12) — canvas, nodes, edges, interactions. ~45KB gzipped.
- `croner` — lightweight cron expression parser for scheduled flow execution. ~5KB gzipped.

### Components

- `src/pages/FlowsListPage.jsx` — list page
- `src/pages/FlowBuilderPage.jsx` — builder/execution page
- `src/components/flows/FlowCanvas.jsx` — React Flow wrapper
- `src/components/flows/NodePalette.jsx` — left panel, draggable node types
- `src/components/flows/NodeConfigPanel.jsx` — right panel, per-node config forms
- `src/components/flows/ExecutionLog.jsx` — right panel in execution mode
- `src/components/flows/FlowCard.jsx` — card component for list page
- `src/components/flows/nodes/` — custom React Flow node components per category

---

## Pre-built Templates (v1)

| Template | Nodes | Description |
|----------|-------|-------------|
| Blog to Multi-Platform | Script → Imagineer + Carousel + LinkedIn (parallel) → JumpStart | One topic becomes image, carousel, LinkedIn post, and video |
| Image to Short Video | Imagineer → JumpStart → Captions → YouTube | Generate image, animate, add captions, publish |
| Character Sheet Pipeline | Imagineer → Turnaround → Save to Library | Create character and turnaround sheet |
| Carousel + Slideshow | Script → Carousel → Save to Library | Generate carousel content and save |
| Social Media Blast | Script → LinkedIn + Instagram + Facebook + TikTok (parallel) | One script published across all platforms |

Templates are stored as `automation_flows` rows with `is_template = true` and `user_id = NULL`. Seeded via migration or seed script.

---

## Scheduled Execution

**File:** `api/lib/scheduledFlowRunner.js`

A cron poller (runs every 60s) that:
1. Queries `automation_flows` where `trigger_type = 'scheduled'`.
2. Uses `croner` to check if `schedule_cron` matches the current minute.
3. Dedup guard: skips if `last_triggered_at` is within the current cron interval (prevents double-triggers if the poller runs faster than the cron resolution).
4. Updates `last_triggered_at`, creates an `automation_executions` record, hands off to `flowExecutor.js`.

Uses the same pattern as `scheduledPublisher.js`. Registered in `server.js` alongside existing scheduled tasks.

---

## Verification

1. **Database** — Run migration, verify tables exist with correct columns/indexes.
2. **API** — Create a flow via POST, update graph, trigger execution, poll status, verify step_states update as nodes complete.
3. **Builder UI** — Open `/flows/new`, drag nodes from palette, wire ports, configure settings, save. Reopen and verify graph persists.
4. **Execution UI** — Run a 2-node flow (e.g., Imagineer → Save to Library), verify live status updates (node borders change, log updates, progress bars).
5. **Parallel execution** — Create a flow with a fork (1 node → 3 parallel nodes), verify all 3 start concurrently.
6. **Pause/Resume** — Start a multi-node flow, pause mid-execution, verify running nodes finish but no new ones start. Resume and verify continuation.
7. **Error handling** — Create a flow with an intentionally failing node (invalid model), verify `stop` mode halts flow, `skip` mode continues, `retry` mode retries.
8. **Templates** — Verify templates appear in Templates tab, clone creates a user-owned copy, cloned flow is editable and runnable.
9. **Scheduling** — Set a flow to scheduled with a near-future cron, verify it executes automatically.
