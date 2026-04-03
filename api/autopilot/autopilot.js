/**
 * Autopilot API — start, batch, and status endpoints.
 *
 * POST /api/autopilot/start   — Process next queued item (or specific id)
 * POST /api/autopilot/batch   — Process up to N items sequentially
 * GET  /api/autopilot/status  — Current running state
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { processQueueItem } from '../lib/autopilotWorker.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── In-memory state (per process) ─────────────────────────────────────────────
let autopilotState = {
  running: false,
  currentItemId: null,
  itemsProcessed: 0,
  itemsFailed: 0,
  startedAt: null,
};

function resetState() {
  autopilotState.running = false;
  autopilotState.currentItemId = null;
}

/**
 * Pick the next queued item for a user (highest priority, oldest first).
 */
async function pickNextItem(supabase, userId) {
  const { data, error } = await supabase
    .from('production_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

/**
 * Run a single item in the background. Does not throw.
 */
async function runItem(item, keys, supabase) {
  autopilotState.currentItemId = item.id;
  try {
    await processQueueItem(item, keys, supabase);
    autopilotState.itemsProcessed++;
  } catch (err) {
    autopilotState.itemsFailed++;
    console.error(`[autopilot] Item ${item.id} failed: ${err.message}`);
  } finally {
    autopilotState.currentItemId = null;
  }
}

/**
 * Run a batch of items sequentially.
 */
async function runBatch(count, userId, keys, supabase) {
  autopilotState.running = true;
  autopilotState.startedAt = new Date().toISOString();

  for (let i = 0; i < count; i++) {
    const item = await pickNextItem(supabase, userId);
    if (!item) {
      console.log(`[autopilot] No more queued items after processing ${i} items`);
      break;
    }
    await runItem(item, keys, supabase);
  }

  resetState();
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/api/autopilot', '').replace(/^\//, '');

  // ─── GET /api/autopilot/status ───────────────────────────────────────
  if (path === 'status' && req.method === 'GET') {
    // Count remaining queued items for this user
    const { count } = await supabase
      .from('production_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'queued');

    return res.json({
      running: autopilotState.running,
      current_item_id: autopilotState.currentItemId,
      items_processed: autopilotState.itemsProcessed,
      items_failed: autopilotState.itemsFailed,
      items_remaining: count || 0,
      started_at: autopilotState.startedAt,
    });
  }

  // ─── POST /api/autopilot/start ──────────────────────────────────────
  if (path === 'start' && req.method === 'POST') {
    if (autopilotState.running) {
      return res.json({ started: false, reason: 'Autopilot is already running', current_item_id: autopilotState.currentItemId });
    }

    const keys = await getUserKeys(userId, userEmail);
    const { item_id } = req.body || {};

    let item;
    if (item_id) {
      // Specific item requested
      const { data, error } = await supabase
        .from('production_queue')
        .select('*')
        .eq('id', item_id)
        .eq('user_id', userId)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Queue item not found' });
      if (data.status !== 'queued' && data.status !== 'failed') {
        return res.status(400).json({ error: `Cannot process item with status "${data.status}"` });
      }
      // Reset failed items back to queued so the worker picks them up cleanly
      if (data.status === 'failed') {
        await supabase.from('production_queue')
          .update({ status: 'queued', error_message: null, updated_at: new Date().toISOString() })
          .eq('id', item_id);
        data.status = 'queued';
      }
      item = data;
    } else {
      item = await pickNextItem(supabase, userId);
    }

    if (!item) {
      return res.json({ started: false, reason: 'No queued items' });
    }

    // Fire and forget — respond immediately
    autopilotState.running = true;
    autopilotState.startedAt = new Date().toISOString();
    autopilotState.itemsProcessed = 0;
    autopilotState.itemsFailed = 0;

    runItem(item, keys, supabase).then(() => resetState());

    return res.json({ started: true, queue_item_id: item.id });
  }

  // ─── POST /api/autopilot/batch ──────────────────────────────────────
  if (path === 'batch' && req.method === 'POST') {
    if (autopilotState.running) {
      return res.json({ started: false, reason: 'Autopilot is already running', current_item_id: autopilotState.currentItemId });
    }

    const keys = await getUserKeys(userId, userEmail);
    const count = Math.max(1, Math.min(10, parseInt(req.body?.count) || 3));

    // Check there are items to process
    const next = await pickNextItem(supabase, userId);
    if (!next) {
      return res.json({ started: false, reason: 'No queued items' });
    }

    // Fire and forget
    autopilotState.itemsProcessed = 0;
    autopilotState.itemsFailed = 0;

    // Put the item we already fetched back and run the batch
    // (runBatch picks items itself, and our `next` is still queued)
    runBatch(count, userId, keys, supabase);

    return res.json({ started: true, count });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
