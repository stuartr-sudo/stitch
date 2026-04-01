# Batch Queue — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Feature:** Batch production of multiple shorts from discovered topics

## Problem

The Shorts Workbench produces one short at a time. Users who want to fill a content calendar or run multiple channels need to repeat the entire 5-step process for each short. Competing tools (ClipZap, Nate Herk's n8n pipeline) produce 10-100 shorts in a single run.

## Solution

A Batch Queue that lets users discover trending topics, cherry-pick which ones to generate, configure shared settings once, and fire off fully-automated pipeline runs for each. A new `/shorts/batch` page handles the full flow: topic selection → shared config → live progress grid → results.

The existing `runShortsPipeline()` handles each individual short end-to-end. The batch system is a lightweight queue layer on top: a `batches` table, a dispatcher that runs 2 jobs concurrently, and a completion hook that starts the next pending job.

## Database Schema

### New `batches` table

```sql
CREATE TABLE batches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  niche           text NOT NULL,
  status          text DEFAULT 'pending',
  config          jsonb NOT NULL,
  total_items     int DEFAULT 0,
  completed_items int DEFAULT 0,
  failed_items    int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches" ON batches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own batches" ON batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own batches" ON batches
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on batches" ON batches
  FOR ALL USING (auth.role() = 'service_role');
```

**Status values:** `pending`, `running`, `completed`, `failed`

**Config JSONB:** Shared settings applied to all batch items:
```json
{
  "voice": "Kore",
  "voiceSpeed": 1.15,
  "visualStyle": "cinematic_realism",
  "duration": "30s",
  "videoModel": "veo-31-fast",
  "framework": "documentary_reveal",
  "captionConfig": { "preset": "word_pop" }
}
```

### New column on `jobs` table

```sql
ALTER TABLE jobs ADD COLUMN batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;
CREATE INDEX idx_jobs_batch_id ON jobs(batch_id) WHERE batch_id IS NOT NULL;
```

Links individual pipeline jobs to their parent batch. `ON DELETE SET NULL` means deleting a batch leaves orphaned jobs (safe — they're already completed or failed).

### No changes to existing tables

`campaigns` and `ad_drafts` are untouched. Each batch item creates its own campaign + draft through the normal pipeline flow. The linkage is: `batches` → `jobs` (via `batch_id`) → `campaigns` (via `jobs.input_json.campaign_id`) → `ad_drafts`.

## Backend

### New endpoint: `POST /api/batch/create`

Creates a batch and starts processing.

**Request:**
```json
{
  "niche": "ai_tech_news",
  "topics": [
    { "title": "Robot Learned to Lie", "story_context": "A March 2026 paper..." },
    { "title": "China's New AI Chip", "story_context": "New semiconductor..." }
  ],
  "config": {
    "voice": "Kore",
    "voiceSpeed": 1.15,
    "visualStyle": "cinematic_realism",
    "duration": "30s",
    "videoModel": "veo-31-fast",
    "framework": "documentary_reveal",
    "captionConfig": { "preset": "word_pop" }
  }
}
```

**Response:**
```json
{
  "batch_id": "uuid",
  "job_count": 2
}
```

**Auth:** Standard JWT via `authenticateToken`.

**Processing flow:**
1. Validate: max 10 topics, niche required, config required
2. Create `batches` row with `status: 'running'`, `total_items: topics.length`
3. For each topic: create `campaigns` row (name = topic title, content_type = 'shorts', status = 'generating') + `jobs` row (status = 'pending', batch_id = batch.id, input_json = { campaign_id, niche, topic, story_context, ...config })
4. Call `processNextBatchJob(batchId)` — starts up to 2 pending jobs
5. Return immediately (fire-and-forget)

### New endpoint: `GET /api/batch/:id`

Poll batch progress.

**Response:**
```json
{
  "batch": {
    "id": "uuid",
    "niche": "ai_tech_news",
    "status": "running",
    "total_items": 5,
    "completed_items": 2,
    "failed_items": 0,
    "created_at": "..."
  },
  "jobs": [
    {
      "id": "uuid",
      "status": "completed",
      "current_step": "done",
      "completed_steps": 10,
      "total_steps": 10,
      "topic": "Robot Learned to Lie",
      "campaign_id": "uuid",
      "draft_id": "uuid",
      "final_video_url": "https://..."
    },
    {
      "id": "uuid",
      "status": "running",
      "current_step": "generating_clips",
      "completed_steps": 6,
      "total_steps": 10,
      "topic": "China's New AI Chip",
      "campaign_id": "uuid",
      "draft_id": null,
      "final_video_url": null
    }
  ]
}
```

**Note:** `topic` is extracted from `jobs.input_json.topic`. `campaign_id` from `jobs.input_json.campaign_id`. `draft_id` and `final_video_url` are fetched by joining through the campaign to `ad_drafts`.

### New endpoint: `GET /api/batch/list`

List user's batches.

**Response:**
```json
{
  "batches": [
    {
      "id": "uuid",
      "niche": "ai_tech_news",
      "status": "completed",
      "total_items": 5,
      "completed_items": 5,
      "failed_items": 0,
      "created_at": "..."
    }
  ]
}
```

Ordered by `created_at DESC`, limit 20.

### New module: `api/lib/batchProcessor.js`

Contains `processNextBatchJob(batchId, supabase, keys)`:

```
1. Query jobs WHERE batch_id = batchId AND status = 'pending' ORDER BY created_at LIMIT 1
2. Query jobs WHERE batch_id = batchId AND status = 'running' → count running
3. If running >= 2, return (at capacity)
4. If no pending jobs, check if batch is complete → update batches.status
5. Otherwise: set job status = 'running', call runShortsPipeline(jobId, campaignId) async (not awaited)
```

**Concurrency limit:** 2 concurrent pipeline runs per batch. Hardcoded constant `MAX_CONCURRENT_BATCH_JOBS = 2`.

### Pipeline modification: `api/lib/shortsPipeline.js`

At the end of `runShortsPipeline()`, after the existing job status update, add a batch completion hook:

```javascript
// After: await supabase.from('jobs').update({ status: 'completed', ... }).eq('id', jobId);

// Batch completion hook
const { data: job } = await supabase.from('jobs').select('batch_id').eq('id', jobId).single();
if (job?.batch_id) {
  const isSuccess = jobStatus === 'completed';
  const field = isSuccess ? 'completed_items' : 'failed_items';

  // Increment counter
  await supabase.rpc('increment_batch_counter', { batch_id: job.batch_id, field_name: field });

  // Check if batch is done
  const { data: batch } = await supabase.from('batches').select('*').eq('id', job.batch_id).single();
  if (batch && (batch.completed_items + batch.failed_items) >= batch.total_items) {
    await supabase.from('batches').update({ status: 'completed', updated_at: new Date() }).eq('id', job.batch_id);
  } else {
    // Start next pending job
    await processNextBatchJob(job.batch_id, supabase, keys);
  }
}
```

**Note:** `increment_batch_counter` is a Supabase RPC function to avoid race conditions on concurrent counter updates. Alternatively, use a raw SQL `UPDATE batches SET completed_items = completed_items + 1` which is atomic in Postgres.

## Frontend

### New page: `/shorts/batch`

**Route:** `/shorts/batch` (new batch) and `/shorts/batch/:batchId` (progress/results)

**3-phase flow:**

#### Phase 1: Configure & Select Topics

Shown when no `batchId` in URL.

- **Niche picker** — same niche cards as workbench Step 1
- **"Discover Topics" button** — calls `POST /api/shorts/discover-topics`, shows scored cards
- **Multi-select topic cards** — checkbox-style toggle on each card. Selected count shown: "3 of 7 selected"
- **Shared settings panel:**
  - Voice picker (Gemini voices, same as workbench)
  - Duration preset (15s, 30s, 45s, 60s)
  - Visual style (dropdown or small grid)
  - Video model picker
  - Framework picker (optional)
  - Caption preset
- **"Start Batch (N)" button** — disabled until ≥1 topic selected. Fires `POST /api/batch/create`. On success, navigates to `/shorts/batch/:batchId`.

#### Phase 2: Live Progress

Shown when `batchId` in URL and batch status is `running`.

- **Overall progress bar** — "3 of 7 complete" with percentage
- **Grid of job cards** — one per batch item, showing:
  - Topic title
  - Status badge (pending/running/completed/failed)
  - Progress bar (0-10 steps) for running jobs
  - Current step name (e.g., "Generating clips...")
  - Spinner for running jobs
- **Polling:** `GET /api/batch/:id` every 5 seconds via `setInterval`
- **Auto-transition:** When all items complete, switches to Phase 3

#### Phase 3: Results

Shown when batch status is `completed`.

- **Same grid** but completed items show:
  - Video thumbnail (first frame or poster)
  - Play button for inline preview
  - "Edit in Workbench" link → `/shorts/workbench?draft=<draftId>`
- **Failed items** show error message + "Retry" button (creates a new single job for that topic)
- **Batch summary:** total completed, failed, time taken

### Navigation

- Sidebar: "Batch Queue" link under Shorts section
- Workbench: "Batch Mode →" link in Step 1 header
- Batch page header: "← Back to Workbench" link

### State management

Minimal local state — the page is primarily a rendering layer over polled API data:

```javascript
// Phase 1 state
const [niche, setNiche] = useState('');
const [discoveredTopics, setDiscoveredTopics] = useState([]);
const [selectedTopics, setSelectedTopics] = useState([]);  // array of indices
const [config, setConfig] = useState({ voice: 'Kore', voiceSpeed: 1.15, ... });

// Phase 2-3 state (from polling)
const [batch, setBatch] = useState(null);
const [jobs, setJobs] = useState([]);
```

## Error Handling

**Individual job failure:** Pipeline catches errors and updates `jobs.status = 'failed'`. The batch completion hook increments `failed_items` and starts the next pending job. Failed items show in the results grid with an error message.

**All jobs failed:** Batch status set to `'completed'` (not `'failed'`) — the batch finished processing even if everything failed. The UI shows the failure state per item.

**Network/API errors during batch creation:** Return 500. No partial batch created — the transaction rolls back. User can retry.

**User navigates away:** Jobs continue running in the background. User can return to `/shorts/batch/:batchId` to see progress. Batch state is fully server-side.

## Files Changed

| File | Change |
|---|---|
| New migration SQL | `batches` table, `batch_id` column on `jobs`, RLS policies |
| `api/batch/create.js` | **New** — create batch, dispatch first jobs |
| `api/batch/status.js` | **New** — poll batch progress with job details |
| `api/batch/list.js` | **New** — list user's batches |
| `api/lib/batchProcessor.js` | **New** — `processNextBatchJob()` dispatcher |
| `api/lib/shortsPipeline.js` | **Modify** — add batch completion hook (~15 lines) |
| `server.js` | Register 3 new routes |
| `src/pages/BatchQueuePage.jsx` | **New** — batch creation + progress + results UI |
| `src/App.jsx` | Add routes for `/shorts/batch` and `/shorts/batch/:batchId` |

## Cost

- Per short: ~$2-3 (voice + images + video + music + assembly)
- Max batch of 10: ~$20-30
- No additional infrastructure cost (no Redis, no workers)

## Backward Compatibility

- `jobs` table: `batch_id` is nullable — all existing jobs unaffected
- `shortsPipeline.js`: the completion hook checks `if (job?.batch_id)` — existing standalone jobs skip it entirely
- No changes to the single-short workbench flow
- No changes to `campaigns` or `ad_drafts` tables

## Dependencies

- Existing `runShortsPipeline()` — must remain stable
- Existing `discover-topics` endpoint — for topic sourcing
- SearchAPI + OpenAI + FAL keys — resolved via `getUserKeys()`
- No new external dependencies

## Out of Scope

- Background worker process (Approach B upgrade)
- Batch scheduling (auto-run batches on a timer)
- Per-item settings overrides
- Batch templates (save a config + niche for reuse)
- Cross-batch analytics (which topics perform best)
- Pause/resume mid-batch
