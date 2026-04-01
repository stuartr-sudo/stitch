# Batch Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Batch Queue that lets users discover topics, cherry-pick, configure once, and fire off 2-concurrent automated pipeline runs for each — with a live progress grid and results view.

**Architecture:** Lightweight queue layer on top of existing `runShortsPipeline()`. New `batches` table + `batch_id` column on `jobs`. A `processNextBatchJob()` dispatcher enforces 2-concurrent limit; a completion hook in `shortsPipeline.js` increments counters atomically via a Postgres RPC and starts the next pending job.

**Tech Stack:** Express (API), Supabase (Postgres + RLS + RPC), React 18, existing `runShortsPipeline()` and `discover-topics` endpoint

**Spec:** `docs/superpowers/specs/2026-04-02-batch-queue-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase-migration-batch.sql` | **New** | `batches` table, `batch_id` on `jobs`, `batch_job_finished` RPC, RLS policies |
| `api/lib/batchProcessor.js` | **New** | `processNextBatchJob(batchId, supabase)` — dispatcher with 2-concurrent limit |
| `api/batch/create.js` | **New** | `POST /api/batch/create` — validate, create batch + jobs, fire dispatcher |
| `api/batch/status.js` | **New** | `GET /api/batch/:id` — poll batch + job details |
| `api/batch/list.js` | **New** | `GET /api/batch/list` — list user's recent batches |
| `api/lib/shortsPipeline.js` | **Modify** | Add batch completion hook (~15 lines) at end of `runShortsPipeline()` |
| `server.js` | **Modify** | Register 3 new batch routes |
| `src/pages/BatchQueuePage.jsx` | **New** | 3-phase UI: configure/select → live progress → results |
| `src/App.jsx` | **Modify** | Add routes for `/shorts/batch` and `/shorts/batch/:batchId` |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase-migration-batch.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase-migration-batch.sql` at the project root with the full schema:

```sql
-- ── batches table ─────────────────────────────────────────────────────────────
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

-- ── batch_id column on jobs ───────────────────────────────────────────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_batch_id ON jobs(batch_id) WHERE batch_id IS NOT NULL;

-- ── Atomic RPC: increment counter + mark batch complete if done ───────────────
CREATE OR REPLACE FUNCTION batch_job_finished(p_batch_id uuid, p_field text)
RETURNS void AS $$
BEGIN
  IF p_field = 'completed_items' THEN
    UPDATE batches SET completed_items = completed_items + 1, updated_at = now() WHERE id = p_batch_id;
  ELSE
    UPDATE batches SET failed_items = failed_items + 1, updated_at = now() WHERE id = p_batch_id;
  END IF;

  -- Atomically transition to completed if all items are done
  UPDATE batches
  SET status = 'completed', updated_at = now()
  WHERE id = p_batch_id
    AND status = 'running'
    AND (completed_items + failed_items) >= total_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply the migration**

Run the migration against your Supabase project:

```bash
# Via Supabase dashboard SQL editor, or:
psql "$DATABASE_URL" -f supabase-migration-batch.sql
```

Verify success:
- `batches` table visible in Supabase Table Editor
- `jobs` table has `batch_id` column
- `batch_job_finished` function visible in Database → Functions

- [ ] **Step 3: Commit**

```bash
git add supabase-migration-batch.sql
git commit -m "feat: add batches table, batch_id on jobs, batch_job_finished RPC"
```

---

### Task 2: Batch Processor Module

**Files:**
- Create: `api/lib/batchProcessor.js`

This module contains the dispatcher that enforces the 2-concurrent limit and starts the next pending job.

- [ ] **Step 1: Create `api/lib/batchProcessor.js`**

```javascript
/**
 * Batch Queue Dispatcher
 *
 * processNextBatchJob(batchId, supabase):
 *   - If < 2 jobs running: pick next pending job, mark running, fire pipeline
 *   - If all done: mark batch completed
 *   - If at capacity: return immediately (next call comes from completion hook)
 */

import { runShortsPipeline } from './shortsPipeline.js';
import { getShortsTemplate } from './shortsTemplates.js';
import { getUserKeys } from './getUserKeys.js';

const MAX_CONCURRENT_BATCH_JOBS = 2;

/**
 * Start the next pending batch job if under the concurrency limit.
 * Called on batch creation AND from the pipeline completion hook.
 *
 * @param {string} batchId - UUID of the batch
 * @param {object} supabase - Supabase client with service-role access
 */
export async function processNextBatchJob(batchId, supabase) {
  // Count currently running jobs for this batch
  const { data: runningJobs, error: runningErr } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' })
    .eq('batch_id', batchId)
    .eq('status', 'running');

  if (runningErr) {
    console.error(`[batchProcessor] Error counting running jobs for batch ${batchId}:`, runningErr.message);
    return;
  }

  const runningCount = runningJobs?.length || 0;

  if (runningCount >= MAX_CONCURRENT_BATCH_JOBS) {
    console.log(`[batchProcessor] Batch ${batchId} at capacity (${runningCount} running), skipping`);
    return;
  }

  // How many more can we start?
  const slots = MAX_CONCURRENT_BATCH_JOBS - runningCount;

  // Fetch pending jobs (up to available slots)
  const { data: pendingJobs, error: pendingErr } = await supabase
    .from('jobs')
    .select('id, user_id, input_json')
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(slots);

  if (pendingErr) {
    console.error(`[batchProcessor] Error fetching pending jobs for batch ${batchId}:`, pendingErr.message);
    return;
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    // No pending jobs — check if batch is fully complete
    const { data: allJobs } = await supabase
      .from('jobs')
      .select('status')
      .eq('batch_id', batchId);

    const stillRunning = allJobs?.some(j => j.status === 'pending' || j.status === 'running');
    if (!stillRunning) {
      // All jobs done — ensure batch status is marked completed
      await supabase
        .from('batches')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', batchId)
        .eq('status', 'running');
    }
    return;
  }

  // Start each available job (fire-and-forget — do NOT await the pipeline)
  for (const job of pendingJobs) {
    // Mark as running first (prevents double-dispatch)
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending'); // only update if still pending (prevents race)

    if (updateErr) {
      console.error(`[batchProcessor] Failed to mark job ${job.id} as running:`, updateErr.message);
      continue;
    }

    const input = job.input_json || {};
    const campaignId = input.campaign_id;
    const userId = job.user_id;

    if (!campaignId || !userId) {
      console.error(`[batchProcessor] Job ${job.id} missing campaign_id or user_id`);
      continue;
    }

    // Resolve user email for getUserKeys
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email || '';

    // Resolve API keys for this user
    let keys;
    try {
      keys = await getUserKeys(userId, userEmail);
    } catch (err) {
      console.error(`[batchProcessor] getUserKeys failed for job ${job.id}:`, err.message);
      await supabase.from('jobs').update({ status: 'failed', error: 'Failed to resolve API keys' }).eq('id', job.id);
      continue;
    }

    const nicheTemplate = getShortsTemplate(input.niche);

    console.log(`[batchProcessor] Starting batch job ${job.id} (topic: "${input.topic}")`);

    // Fire-and-forget — pipeline manages its own job status updates
    runShortsPipeline({
      ...input,
      supabase,
      keys,
      jobId: job.id,
      campaignId,
      userId,
      userEmail,
      nicheTemplate,
    }).catch(err => {
      console.error(`[batchProcessor] Pipeline threw for job ${job.id}:`, err.message);
    });
  }
}
```

- [ ] **Step 2: Verify imports resolve**

Check that `getShortsTemplate` is exported from `api/lib/shortsTemplates.js`:

```bash
grep -n "export.*getShortsTemplate\|getShortsTemplate" api/lib/shortsTemplates.js | head -5
```

If it doesn't exist, check what the actual export name is and update the import in `batchProcessor.js` accordingly.

- [ ] **Step 3: Commit**

```bash
git add api/lib/batchProcessor.js
git commit -m "feat: add batchProcessor with 2-concurrent dispatcher"
```

---

### Task 3: API Endpoint — `POST /api/batch/create`

**Files:**
- Create: `api/batch/create.js`

Creates a batch, creates all campaign + job rows, fires the dispatcher.

- [ ] **Step 1: Create `api/batch/create.js`**

```javascript
/**
 * POST /api/batch/create
 *
 * Body: { niche, topics: [{ title, story_context }], config: { voice, voiceSpeed, visualStyle, duration, videoModel, framework, captionConfig } }
 * Returns: { batch_id, job_count }
 */

import { createClient } from '@supabase/supabase-js';
import { processNextBatchJob } from '../lib/batchProcessor.js';

const MAX_TOPICS = 10;

/**
 * Build TTS style_instructions from voiceSpeed.
 * The pipeline expects style_instructions (a pre-built string), not a raw speed number.
 * This mirrors the logic in the workbench voiceover action.
 */
function buildStyleInstructions(voiceSpeed = 1.15) {
  if (voiceSpeed >= 1.3) return 'Speak at a brisk, energetic pace. Keep delivery crisp. Do not drag words out.';
  if (voiceSpeed >= 1.15) return 'Speak at an uptempo conversational pace. Keep energy up. Do not drag words out.';
  if (voiceSpeed >= 1.05) return 'Speak slightly quicker than normal. Keep delivery crisp. Do not drag words out.';
  return 'Speak at a natural conversational pace. Do not drag words out.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, topics, config } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!niche) return res.status(400).json({ error: 'niche is required' });
  if (!Array.isArray(topics) || topics.length === 0) return res.status(400).json({ error: 'topics must be a non-empty array' });
  if (topics.length > MAX_TOPICS) return res.status(400).json({ error: `Maximum ${MAX_TOPICS} topics per batch` });
  if (!config) return res.status(400).json({ error: 'config is required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // ── Create batch row ─────────────────────────────────────────────────────────
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .insert({
      user_id: userId,
      niche,
      status: 'running',
      config,
      total_items: topics.length,
      completed_items: 0,
      failed_items: 0,
    })
    .select('id')
    .single();

  if (batchError || !batch) {
    console.error('[batch/create] Failed to create batch:', batchError?.message);
    return res.status(500).json({ error: 'Failed to create batch' });
  }

  const batchId = batch.id;

  // ── Create campaign + job for each topic ─────────────────────────────────────
  try {
    for (const topic of topics) {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: topic.title,
          content_type: 'shorts',
          status: 'generating',
        })
        .select('id')
        .single();

      if (campaignError || !campaign) {
        throw new Error(`Failed to create campaign for topic "${topic.title}": ${campaignError?.message}`);
      }

      // Build job input — mirrors what shortsPipeline expects
      const voiceSpeed = config.voiceSpeed || 1.15;
      const jobInput = {
        campaign_id: campaign.id,
        niche,
        topic: topic.title,
        story_context: topic.story_context || '',
        brand_username: userEmail,
        // Shared config fields
        gemini_voice: config.voice || 'Kore',
        // Pipeline uses style_instructions (pre-built string), not a raw speed value
        style_instructions: buildStyleInstructions(voiceSpeed),
        visual_style: config.visualStyle || 'cinematic_realism',
        video_length_preset: config.duration || '30s',
        video_model: config.videoModel || 'veo-31-fast',
        framework: config.framework || null,
        caption_config: config.captionConfig || { preset: 'word_pop' },
        enable_background_music: true,
      };

      // Create job
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: userId,
          batch_id: batchId,
          status: 'pending',
          current_step: 'queued',
          total_steps: 10,
          completed_steps: 0,
          input_json: jobInput,
        });

      if (jobError) {
        throw new Error(`Failed to create job for topic "${topic.title}": ${jobError.message}`);
      }
    }
  } catch (err) {
    // Cleanup: delete the batch row (campaigns without jobs are harmless orphans)
    await supabase.from('batches').delete().eq('id', batchId);
    console.error('[batch/create] Cleanup after error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  // ── Fire dispatcher (non-blocking) ───────────────────────────────────────────
  processNextBatchJob(batchId, supabase).catch(err =>
    console.error('[batch/create] processNextBatchJob error:', err.message)
  );

  console.log(`[batch/create] Batch ${batchId} created with ${topics.length} jobs for user ${userId}`);
  return res.json({ batch_id: batchId, job_count: topics.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/batch/create.js
git commit -m "feat: add POST /api/batch/create endpoint"
```

---

### Task 4: API Endpoint — `GET /api/batch/:id`

**Files:**
- Create: `api/batch/status.js`

Polls batch progress including per-job detail with draft/video URLs.

- [ ] **Step 1: Create `api/batch/status.js`**

```javascript
/**
 * GET /api/batch/:id
 *
 * Returns batch row + all job rows with topic, campaign_id, draft_id, final_video_url
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const batchId = req.params.id;
  const userId = req.user.id;

  if (!batchId) return res.status(400).json({ error: 'batch id required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // ── Fetch batch (verify ownership via RLS-equivalent check) ──────────────────
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('id, niche, status, total_items, completed_items, failed_items, created_at, updated_at')
    .eq('id', batchId)
    .eq('user_id', userId)
    .single();

  if (batchError || !batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  // ── Fetch all jobs for this batch ─────────────────────────────────────────────
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, status, current_step, completed_steps, total_steps, input_json, output_json, error')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (jobsError) {
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }

  // ── Enrich each job with draft_id + final_video_url ───────────────────────────
  const enrichedJobs = await Promise.all((jobs || []).map(async (job) => {
    const campaignId = job.input_json?.campaign_id;
    let draftId = null;
    let finalVideoUrl = null;

    if (campaignId && job.status === 'completed') {
      const { data: draft } = await supabase
        .from('ad_drafts')
        .select('id, captioned_video_url, assets_json')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (draft) {
        draftId = draft.id;
        finalVideoUrl = draft.captioned_video_url || draft.assets_json?.final_video_url || null;
      }
    }

    return {
      id: job.id,
      status: job.status,
      current_step: job.current_step,
      completed_steps: job.completed_steps || 0,
      total_steps: job.total_steps || 10,
      topic: job.input_json?.topic || '',
      campaign_id: campaignId || null,
      draft_id: draftId,
      final_video_url: finalVideoUrl,
      error: job.error || null,
    };
  }));

  return res.json({ batch, jobs: enrichedJobs });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/batch/status.js
git commit -m "feat: add GET /api/batch/:id status endpoint"
```

---

### Task 5: API Endpoint — `GET /api/batch/list`

**Files:**
- Create: `api/batch/list.js`

- [ ] **Step 1: Create `api/batch/list.js`**

```javascript
/**
 * GET /api/batch/list
 *
 * Returns the user's 20 most recent batches.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user.id;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: batches, error } = await supabase
    .from('batches')
    .select('id, niche, status, total_items, completed_items, failed_items, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch batches' });
  }

  return res.json({ batches: batches || [] });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/batch/list.js
git commit -m "feat: add GET /api/batch/list endpoint"
```

---

### Task 6: Register Routes in `server.js`

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add batch routes**

Find a logical location in `server.js` to add the batch routes (near the shorts/workbench routes). Add:

```javascript
// Batch Queue routes
app.post('/api/batch/create', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('batch/create.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/batch/list', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('batch/list.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/batch/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('batch/status.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

**Important:** Register `/api/batch/list` BEFORE `/api/batch/:id` — otherwise "list" matches the `:id` param route first.

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: register batch API routes in server.js"
```

---

### Task 7: Pipeline Completion Hook in `shortsPipeline.js`

**Files:**
- Modify: `api/lib/shortsPipeline.js`

Adds ~15 lines at the end of `runShortsPipeline()` — after the job status update, before the catch block.

- [ ] **Step 1: Add import at top of file**

At the top of `api/lib/shortsPipeline.js`, add the import for `processNextBatchJob`. Find the existing import block and add:

```javascript
import { processNextBatchJob } from './batchProcessor.js';
```

- [ ] **Step 2: Add the completion hook**

Find the existing job status update at the end of the try block (around line 877–889):

```javascript
await supabase.from('jobs').update({
  status: 'completed',
  current_step: 'done',
  completed_steps: 10,
  ...
}).eq('id', jobId);
```

Immediately AFTER this `supabase.from('jobs').update(...)` call and AFTER the `campaigns.update({ status: 'ready' })` call, add:

```javascript
// ── Batch completion hook ───────────────────────────────────────────────────
const { data: completedJob } = await supabase
  .from('jobs')
  .select('batch_id')
  .eq('id', jobId)
  .single();

if (completedJob?.batch_id) {
  // Atomic increment + completion check in one Postgres transaction
  await supabase.rpc('batch_job_finished', {
    p_batch_id: completedJob.batch_id,
    p_field: 'completed_items',
  });
  // Start next pending job (fire-and-forget)
  processNextBatchJob(completedJob.batch_id, supabase).catch(err =>
    console.error('[shortsPipeline] processNextBatchJob error:', err.message)
  );
}
```

- [ ] **Step 3: Add hook in the catch block too**

Find the catch block error handler (around line 895–916) where it updates `jobs.status = 'failed'`. After the failed job update, add:

```javascript
// Batch hook — count as failed item, start next job
try {
  const { data: failedJob } = await supabase
    .from('jobs')
    .select('batch_id')
    .eq('id', jobId)
    .single();

  if (failedJob?.batch_id) {
    await supabase.rpc('batch_job_finished', {
      p_batch_id: failedJob.batch_id,
      p_field: 'failed_items',
    });
    processNextBatchJob(failedJob.batch_id, supabase).catch(() => {});
  }
} catch (batchHookErr) {
  console.error('[shortsPipeline] Batch hook error in catch block:', batchHookErr.message);
}
```

- [ ] **Step 4: Commit**

```bash
git add api/lib/shortsPipeline.js
git commit -m "feat: add batch completion hook in shortsPipeline.js"
```

---

### Task 8: Frontend — `BatchQueuePage.jsx`

**Files:**
- Create: `src/pages/BatchQueuePage.jsx`

3-phase page: (1) configure + discover topics, (2) live progress grid, (3) results.

- [ ] **Step 1: Create `src/pages/BatchQueuePage.jsx`**

```jsx
/**
 * BatchQueuePage — /shorts/batch (new) and /shorts/batch/:batchId (progress/results)
 *
 * Phase 1: Select niche → discover topics → cherry-pick → shared config → Start Batch
 * Phase 2: Live progress grid (poll every 5s while running)
 * Phase 3: Results grid with video previews and Edit links
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Play, ExternalLink, RotateCcw, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Niche options (matches ShortsWorkbenchPage) ────────────────────────────────
const NICHES = [
  { key: 'ai_tech_news', label: 'AI & Tech News' },
  { key: 'finance_money', label: 'Finance & Money' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'horror_creepy', label: 'Horror & Creepy' },
  { key: 'history_era', label: 'History' },
  { key: 'crime_mystery', label: 'Crime & Mystery' },
  { key: 'science_nature', label: 'Science & Nature' },
  { key: 'dating_relationships', label: 'Dating & Relationships' },
  { key: 'fitness_health', label: 'Fitness & Health' },
  { key: 'gaming', label: 'Gaming' },
  { key: 'conspiracy', label: 'Conspiracy' },
  { key: 'business_startup', label: 'Business & Startups' },
  { key: 'food_cooking', label: 'Food & Cooking' },
  { key: 'travel', label: 'Travel' },
  { key: 'psychology', label: 'Psychology' },
  { key: 'space_cosmos', label: 'Space & Cosmos' },
  { key: 'animals_nature', label: 'Animals & Nature' },
  { key: 'sports', label: 'Sports' },
  { key: 'education', label: 'Education' },
  { key: 'paranormal_ufo', label: 'Paranormal & UFO' },
];

const VOICES = [
  'Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr',
  'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Auva', 'Callirrhoe',
];

const DURATION_OPTIONS = ['15s', '30s', '45s', '60s'];
const VIDEO_MODELS = [
  { key: 'veo-31-fast', label: 'Veo 3.1 Fast' },
  { key: 'fal_kling', label: 'Kling 2.0' },
  { key: 'wan25', label: 'Wan 2.5' },
];
const CAPTION_PRESETS = ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker'];

const TRENDING_COLOR = { high: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-500' };
const COMPETITION_COLOR = { high: 'bg-red-100 text-red-600', medium: 'bg-orange-100 text-orange-600', low: 'bg-blue-100 text-blue-700' };

const STATUS_BADGE = {
  pending: 'bg-slate-100 text-slate-500',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

// ── Phase 1: Configure ─────────────────────────────────────────────────────────
function ConfigurePhase({ onBatchCreated }) {
  const [niche, setNiche] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [config, setConfig] = useState({
    voice: 'Kore',
    voiceSpeed: 1.15,
    visualStyle: 'cinematic_realism',
    duration: '30s',
    videoModel: 'veo-31-fast',
    framework: null,
    captionConfig: { preset: 'word_pop' },
  });

  const handleDiscoverTopics = async () => {
    if (!niche) return;
    setIsDiscovering(true);
    setTopics([]);
    setSelectedIndices([]);
    try {
      const res = await apiFetch('/api/shorts/discover-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 8 }),
      });
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics);
      } else {
        toast.error(data.error || 'Topic discovery failed');
      }
    } catch (err) {
      toast.error(err.message || 'Topic discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleTopic = (i) => {
    setSelectedIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  };

  const handleStartBatch = async () => {
    if (selectedIndices.length === 0) return;
    setIsStarting(true);
    try {
      const selectedTopics = selectedIndices.map(i => ({
        title: topics[i].title,
        story_context: topics[i].story_context,
      }));
      const res = await apiFetch('/api/batch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topics: selectedTopics, config }),
      });
      const data = await res.json();
      if (data.batch_id) {
        onBatchCreated(data.batch_id);
      } else {
        toast.error(data.error || 'Failed to start batch');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start batch');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batch Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Produce multiple shorts in a single run</p>
        </div>
        <Link to="/shorts/workbench" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Workbench
        </Link>
      </div>

      {/* Step 1: Pick Niche */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">1. Pick a Niche</h2>
        <div className="grid grid-cols-4 gap-2">
          {NICHES.map(n => (
            <button
              key={n.key}
              onClick={() => { setNiche(n.key); setTopics([]); setSelectedIndices([]); }}
              className={cn(
                'text-xs py-2 px-3 rounded-lg border transition-colors text-left',
                niche === n.key
                  ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {n.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleDiscoverTopics}
          disabled={!niche || isDiscovering}
          className="mt-4 bg-[#2C666E] hover:bg-[#2C666E]/90 text-white text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          {isDiscovering ? <><Loader2 className="w-4 h-4 animate-spin" /> Discovering...</> : '🔍 Discover Topics'}
        </button>
      </div>

      {/* Topic Cards */}
      {topics.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">2. Select Topics</h2>
            <span className="text-xs text-slate-500">{selectedIndices.length} of {topics.length} selected</span>
          </div>
          <div className="space-y-2">
            {topics.map((topic, i) => (
              <div
                key={i}
                onClick={() => toggleTopic(i)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedIndices.includes(i)
                    ? 'border-[#2C666E] bg-[#2C666E]/5'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(i)}
                  onChange={() => toggleTopic(i)}
                  onClick={e => e.stopPropagation()}
                  className="mt-0.5 accent-[#2C666E]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{topic.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{topic.summary}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', TRENDING_COLOR[topic.trending_score])}>
                      ↑ {topic.trending_score}
                    </span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', COMPETITION_COLOR[topic.competition_score])}>
                      ⚔ {topic.competition_score} competition
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Config */}
      {topics.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">3. Shared Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Voice</label>
              <select
                value={config.voice}
                onChange={e => setConfig(c => ({ ...c, voice: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Voice Speed</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="80" max="160" value={Math.round(config.voiceSpeed * 100)}
                  onChange={e => setConfig(c => ({ ...c, voiceSpeed: Number(e.target.value) / 100 }))}
                  className="flex-1 h-1 accent-[#2C666E]"
                />
                <span className="text-xs text-slate-500 w-10">{config.voiceSpeed.toFixed(2)}×</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Duration</label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setConfig(c => ({ ...c, duration: d }))}
                    className={cn(
                      'flex-1 text-xs py-1.5 rounded-lg border transition-colors',
                      config.duration === d ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'border-slate-200 text-slate-600'
                    )}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Video Model</label>
              <select
                value={config.videoModel}
                onChange={e => setConfig(c => ({ ...c, videoModel: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                {VIDEO_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Captions</label>
              <select
                value={config.captionConfig?.preset || 'word_pop'}
                onChange={e => setConfig(c => ({ ...c, captionConfig: { preset: e.target.value } }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                {CAPTION_PRESETS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Start button */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={handleStartBatch}
              disabled={selectedIndices.length === 0 || isStarting}
              className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isStarting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                : `🚀 Start Batch (${selectedIndices.length})`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Phase 2+3: Progress / Results ─────────────────────────────────────────────
function ProgressPhase({ batchId }) {
  const [batch, setBatch] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      const res = await apiFetch(`/api/batch/${batchId}`);
      const data = await res.json();
      if (data.batch) {
        setBatch(data.batch);
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('[BatchQueue] Poll error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, [batchId]);

  // Stop polling when done
  useEffect(() => {
    if (batch?.status === 'completed') {
      clearInterval(intervalRef.current);
    }
  }, [batch?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!batch) {
    return <div className="text-center text-slate-500">Batch not found</div>;
  }

  const isDone = batch.status === 'completed';
  const progress = batch.total_items > 0
    ? Math.round(((batch.completed_items + batch.failed_items) / batch.total_items) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isDone ? '✅ Batch Complete' : '⚡ Batch Running'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{batch.niche}</p>
        </div>
        <Link to="/shorts/batch" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> New Batch
        </Link>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            {batch.completed_items} of {batch.total_items} complete
            {batch.failed_items > 0 && <span className="text-red-500 ml-2">({batch.failed_items} failed)</span>}
          </span>
          <span className="text-sm font-bold text-[#2C666E]">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-[#2C666E] h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Job grid */}
      <div className="grid grid-cols-1 gap-3">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              {/* Status / Thumbnail */}
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                {job.final_video_url ? (
                  <video src={job.final_video_url} className="w-full h-full object-cover" muted playsInline />
                ) : job.status === 'running' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : job.status === 'pending' ? (
                  <span className="text-[10px] text-slate-400">Queued</span>
                ) : job.status === 'failed' ? (
                  <span className="text-lg">❌</span>
                ) : (
                  <span className="text-lg">⏳</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{job.topic}</p>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', STATUS_BADGE[job.status])}>
                    {job.status}
                  </span>
                </div>

                {/* Progress bar for running jobs */}
                {job.status === 'running' && (
                  <div className="mb-1">
                    <div className="w-full bg-slate-100 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all"
                        style={{ width: `${((job.completed_steps || 0) / (job.total_steps || 10)) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Step {job.completed_steps || 0}/{job.total_steps || 10} — {(job.current_step || '').replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {/* Error message */}
                {job.status === 'failed' && job.error && (
                  <p className="text-xs text-red-500">{job.error.slice(0, 120)}</p>
                )}

                {/* Completed actions */}
                {job.status === 'completed' && job.draft_id && (
                  <div className="flex items-center gap-3 mt-1">
                    <Link
                      to={`/shorts/workbench?draft=${job.draft_id}`}
                      className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Edit in Workbench
                    </Link>
                    {job.final_video_url && (
                      <a
                        href={job.final_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Preview
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary when done */}
      {isDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          Batch complete — {batch.completed_items} succeeded, {batch.failed_items} failed.
          {batch.failed_items > 0 && ' Failed items can be retried individually in the Workbench.'}
        </div>
      )}
    </div>
  );
}

// ── Root component — decides which phase to show ───────────────────────────────
export default function BatchQueuePage() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const handleBatchCreated = (id) => {
    navigate(`/shorts/batch/${id}`);
  };

  if (batchId) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <ProgressPhase batchId={batchId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <ConfigurePhase onBatchCreated={handleBatchCreated} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BatchQueuePage.jsx
git commit -m "feat: add BatchQueuePage with 3-phase configure/progress/results UI"
```

---

### Task 9: Wire Routes in `App.jsx` and Add Navigation

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add import and routes**

In `src/App.jsx`, add the import:

```javascript
import BatchQueuePage from './pages/BatchQueuePage';
```

Add two routes (inside the authenticated routes section, near the `/shorts/workbench` route):

```jsx
<Route
  path="/shorts/batch"
  element={
    <ProtectedRoute>
      <BatchQueuePage />
    </ProtectedRoute>
  }
/>
<Route
  path="/shorts/batch/:batchId"
  element={
    <ProtectedRoute>
      <BatchQueuePage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 2: Add sidebar navigation link**

Search `src/App.jsx` (or the sidebar component) for where the Shorts Workbench sidebar link is defined. Add a "Batch Queue" link below it:

```jsx
<Link to="/shorts/batch" className="...existing sidebar link styles...">
  Batch Queue
</Link>
```

Look at the existing sidebar link pattern and match it exactly.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add batch queue routes and sidebar link"
```

---

### Task 10: Build Verification + Deploy

- [ ] **Step 1: Verify build**

```bash
npm run build
```

Expect clean build with no TypeScript/Vite errors.

- [ ] **Step 2: Test the flow manually**

Start the dev server:
```bash
npm run start
```

Walk through:
1. Navigate to `/shorts/batch`
2. Select a niche → Discover Topics → see scored topic cards
3. Select 2 topics → configure shared settings → click "Start Batch (2)"
4. Should redirect to `/shorts/batch/:batchId` with progress grid
5. Two jobs should show as "running", the rest "pending"
6. After completion, should show video previews + Edit in Workbench links

Check Supabase Table Editor:
- `batches` row exists with `status = 'running'` → eventually `'completed'`
- `jobs` rows have `batch_id` populated
- `completed_items` + `failed_items` update as jobs finish

- [ ] **Step 3: Push and deploy**

```bash
git push origin main
fly deploy
```

- [ ] **Step 4: Verify in production**

Check that `/shorts/batch` loads, topic discovery works, and a test batch of 2 items runs to completion.
