/**
 * Workflow Engine — persistent state machine for pipeline jobs.
 *
 * Stores all state in the `jobs` table (workflow_state, step_results, workflow_steps).
 * Each pipeline step is a discrete state that can be skipped on resume (if already completed),
 * paused between, or retried individually.
 *
 * Usage:
 *   const wf = new WorkflowEngine(jobId, supabase);
 *   await wf.loadState();
 *   if (!wf.stepResults.scrape) {
 *     const result = await scrapeArticle(...);
 *     await wf.transition('scrape', result);
 *   }
 *   if (wf.isPaused) return;
 *   // ... next step
 */

import { createClient } from '@supabase/supabase-js';

export const PIPELINE_STEPS = [
  'scrape',
  'analyze_article',
  'match_templates',
  'create_campaign',
  'generate_assets',   // covers per-template image+video+music generation
  'concat_videos',
  'upload_assets',
  'finalize',
];

export class WorkflowEngine {
  constructor(jobId, supabase) {
    this.jobId = jobId;
    this.supabase = supabase;
    this._state = null;
  }

  /** Load current workflow state from DB */
  async loadState() {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('workflow_state, workflow_steps, step_results, paused_at, retry_count, max_retries, last_error, status')
      .eq('id', this.jobId)
      .single();

    if (error) throw new Error(`Failed to load workflow state: ${error.message}`);

    this._state = {
      workflowState: data.workflow_state || 'idle',
      workflowSteps: data.workflow_steps || [],
      stepResults: data.step_results || {},
      pausedAt: data.paused_at,
      retryCount: data.retry_count || 0,
      maxRetries: data.max_retries || 3,
      lastError: data.last_error,
      status: data.status,
    };

    return this;
  }

  /** Transition to a step with a result. Persists to DB immediately. */
  async transition(stepName, result = {}) {
    if (!this._state) throw new Error('Call loadState() first');

    this._state.stepResults[stepName] = {
      status: 'completed',
      result,
      completedAt: new Date().toISOString(),
    };

    if (!this._state.workflowSteps.includes(stepName)) {
      this._state.workflowSteps.push(stepName);
    }

    this._state.workflowState = stepName;

    await this.supabase.from('jobs').update({
      workflow_state: stepName,
      workflow_steps: this._state.workflowSteps,
      step_results: this._state.stepResults,
      current_step: stepName,
    }).eq('id', this.jobId);
  }

  /** Mark a step as failed. Preserves all prior step results. */
  async failStep(stepName, error) {
    if (!this._state) throw new Error('Call loadState() first');

    this._state.stepResults[stepName] = {
      status: 'failed',
      error: error.message || String(error),
      failedAt: new Date().toISOString(),
      attempts: (this._state.stepResults[stepName]?.attempts || 0) + 1,
    };

    this._state.workflowState = stepName;
    this._state.lastError = error.message || String(error);

    await this.supabase.from('jobs').update({
      workflow_state: stepName,
      step_results: this._state.stepResults,
      last_error: this._state.lastError,
      status: 'failed',
      error: error.message || String(error),
    }).eq('id', this.jobId);
  }

  /** Pause the workflow — pipeline checks isPaused between steps */
  async pause() {
    if (!this._state) throw new Error('Call loadState() first');
    this._state.pausedAt = new Date().toISOString();
    this._state.workflowState = 'paused';

    await this.supabase.from('jobs').update({
      workflow_state: 'paused',
      paused_at: this._state.pausedAt,
      status: 'paused',
    }).eq('id', this.jobId);
  }

  /** Resume from paused state */
  async resume() {
    if (!this._state) throw new Error('Call loadState() first');
    this._state.pausedAt = null;

    // Find the last completed step and set state to it
    const lastCompleted = [...this._state.workflowSteps].pop() || 'idle';
    this._state.workflowState = lastCompleted;

    await this.supabase.from('jobs').update({
      workflow_state: lastCompleted,
      paused_at: null,
      status: 'processing',
    }).eq('id', this.jobId);
  }

  /** Clear a failed step so it can be re-run */
  async retryStep(stepName) {
    if (!this._state) throw new Error('Call loadState() first');

    const prev = this._state.stepResults[stepName];
    const attempts = prev?.attempts || 0;

    this._state.stepResults[stepName] = null;
    delete this._state.stepResults[stepName];

    this._state.retryCount = (this._state.retryCount || 0) + 1;

    await this.supabase.from('jobs').update({
      step_results: this._state.stepResults,
      retry_count: this._state.retryCount,
      status: 'processing',
      last_error: null,
    }).eq('id', this.jobId);
  }

  /** Check if a step has already completed */
  hasCompleted(stepName) {
    return this._state?.stepResults[stepName]?.status === 'completed';
  }

  /** Get result data for a completed step */
  getStepResult(stepName) {
    return this._state?.stepResults[stepName]?.result || null;
  }

  get stepResults() { return this._state?.stepResults || {}; }
  get currentStep() { return this._state?.workflowState || 'idle'; }
  get isPaused() { return this._state?.workflowState === 'paused' || !!this._state?.pausedAt; }
  get isComplete() { return this._state?.workflowState === 'finalize' && this.hasCompleted('finalize'); }
  get retryCount() { return this._state?.retryCount || 0; }
}
