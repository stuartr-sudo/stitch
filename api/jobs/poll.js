/**
 * GET /api/jobs/poll?id=<jobId>
 *
 * Lightweight job status polling endpoint for the Shorts wizard.
 * Returns status, step_results, error, and last_error for a job
 * owned by the authenticated user.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const jobId = req.query.id;
  if (!jobId) return res.status(400).json({ error: 'Missing id query parameter' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, current_step, total_steps, completed_steps, step_results, error, last_error, output_json, created_at, updated_at')
    .eq('id', jobId)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.json({
    success: true,
    job: {
      id: data.id,
      status: data.status,
      current_step: data.current_step,
      total_steps: data.total_steps,
      completed_steps: data.completed_steps,
      step_results: data.step_results,
      error: data.error,
      last_error: data.last_error,
      output_json: data.output_json,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  });
}
