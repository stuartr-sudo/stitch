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
