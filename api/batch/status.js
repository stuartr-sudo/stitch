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

  // ── Fetch batch (verify ownership) ──────────────────────────────────────────
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
