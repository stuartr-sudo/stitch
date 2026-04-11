/**
 * POST /api/jobs/retry
 *
 * Retry a failed job — either a specific step or resume from last failure.
 *
 * Body: {
 *   jobId: string,
 *   step?: string,  // optional — retry a specific step; if omitted, resumes from last failure
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { WorkflowEngine } from '../lib/workflowEngine.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobId, step } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify ownership
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', req.user.id)
    .single();

  if (jobErr || !job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'failed' && job.status !== 'paused') {
    return res.status(400).json({ error: `Job is ${job.status}, not retryable` });
  }

  const wf = new WorkflowEngine(jobId, supabase);
  await wf.loadState();

  if (step) {
    await wf.retryStep(step);
  } else {
    await wf.resume();
  }

  // Re-enter the pipeline in the background.
  // The pipeline handler checks stepResults and skips completed steps.
  const loadApiRoute = async (routePath) => {
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const module = await import(join(__dirname, '..', routePath));
    return module.runPipelineFromJob;
  };

  try {
    const { runPipelineFromJob } = await import('../article/from-url.js');
    if (runPipelineFromJob) {
      // Fire and forget — pipeline runs in background
      runPipelineFromJob(job, supabase).catch(err => {
        console.error(`[jobs/retry] Pipeline re-entry failed:`, err.message);
      });
    }
  } catch (err) {
    console.warn('[jobs/retry] Could not re-enter pipeline:', err.message);
  }

  return res.json({
    success: true,
    message: step ? `Retrying step "${step}"` : 'Resuming from last failure',
    currentStep: wf.currentStep,
    retryCount: wf.retryCount,
  });
}
