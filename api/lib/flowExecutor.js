import { getNodeType } from './nodeTypeRegistry.js';
import { logCost } from './costLogger.js';

const DEFAULT_CONCURRENCY = 3;
const NODE_TIMEOUT_MS = 300_000; // 5 minutes per node (video gen can take 2-3 min)

export class FlowExecutor {
  constructor(flow, execution, supabase, apiKeys, userId, userEmail, opts = {}) {
    this.flow = flow;
    this.executionId = execution.id;
    this.supabase = supabase;
    this.apiKeys = apiKeys;
    this.userId = userId;
    this.userEmail = userEmail;
    this.nodes = flow.graph_json.nodes;
    this.edges = flow.graph_json.edges;
    this.stepStates = {};
    this.running = new Set();
    this.abortController = new AbortController();
    this.paused = false;
    this.cancelled = false;
    this.dryRun = opts.dryRun || false;
    this.resumeFromStates = opts.resumeFromStates || null; // For resume-from-failed
    // Sequential DB write queue to prevent race conditions on step_states
    this._updateQueue = Promise.resolve();
  }

  getIncomingEdges(nodeId) {
    return this.edges.filter(e => e.target === nodeId);
  }

  getOutgoingEdges(nodeId) {
    return this.edges.filter(e => e.source === nodeId);
  }

  isNodeReady(nodeId) {
    if (this.stepStates[nodeId]) return false;
    const incoming = this.getIncomingEdges(nodeId);
    return incoming.every(edge => {
      const sourceState = this.stepStates[edge.source];
      return sourceState && sourceState.status === 'completed';
    });
  }

  getReadyNodes() {
    return this.nodes.filter(node => {
      const incoming = this.getIncomingEdges(node.id);
      if (incoming.length === 0 && !this.stepStates[node.id]) return true;
      return this.isNodeReady(node.id);
    });
  }

  resolveInputs(node) {
    const inputs = {};
    const portCounts = {}; // Track how many edges target each port
    const incoming = this.getIncomingEdges(node.id);

    // First pass: count edges per target port
    for (const edge of incoming) {
      portCounts[edge.targetPort] = (portCounts[edge.targetPort] || 0) + 1;
    }

    // Second pass: resolve values. Multi-input ports collect as arrays.
    for (const edge of incoming) {
      const sourceOutput = this.stepStates[edge.source]?.output;
      if (sourceOutput && edge.sourcePort in sourceOutput) {
        const value = sourceOutput[edge.sourcePort];
        if (portCounts[edge.targetPort] > 1) {
          // Multi-input: collect all values into an array
          if (!inputs[edge.targetPort]) inputs[edge.targetPort] = [];
          inputs[edge.targetPort].push(value);
        } else {
          // Single input: pass value directly
          inputs[edge.targetPort] = value;
        }
      }
    }
    return inputs;
  }

  /**
   * Resolve {{variable}} patterns in config values using flow-level variables.
   * Supports nested dot notation: {{brand.name}} resolves brand_kit.name
   */
  resolveVariables(config) {
    const variables = this.flow.graph_json?.variables || {};
    if (!Object.keys(variables).length) return config;

    const resolved = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.includes('{{')) {
        resolved[key] = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varName) => {
          // Support dot notation: {{brand.name}} checks variables['brand.name'] first, then variables['brand']?.name
          if (varName in variables) return variables[varName];
          const parts = varName.split('.');
          let val = variables[parts[0]];
          for (let i = 1; i < parts.length && val != null; i++) {
            val = typeof val === 'object' ? val[parts[i]] : undefined;
          }
          return val != null ? String(val) : match; // Keep original if not found
        });
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /**
   * Queue-based DB update — serializes writes so concurrent node completions
   * don't race on step_states (last-write-wins would lose intermediate state).
   */
  async updateExecution(updates) {
    this._updateQueue = this._updateQueue.then(async () => {
      try {
        await this.supabase
          .from('automation_executions')
          .update({ step_states: this.stepStates, ...updates })
          .eq('id', this.executionId);
      } catch (err) {
        console.error(`[flows] DB update failed for execution ${this.executionId}:`, err.message);
      }
    });
    return this._updateQueue;
  }

  /**
   * Run a single node with a per-node timeout.
   * Timeout prevents a hung API call from stalling the entire flow.
   */
  async runNode(node) {
    const nodeType = getNodeType(node.type);
    if (!nodeType) throw new Error(`Unknown node type: ${node.type}`);

    this.stepStates[node.id] = { status: 'running', started_at: new Date().toISOString() };
    this.running.add(node.id);
    await this.updateExecution({});

    const inputs = this.resolveInputs(node);
    const context = {
      userId: this.userId,
      userEmail: this.userEmail,
      supabase: this.supabase,
      apiKeys: this.apiKeys,
      abortSignal: this.abortController.signal,
      logCost: (params) => logCost({ ...params, username: this.userEmail }),
    };

    const errorHandling = node.config?.errorHandling || 'stop';
    // Resolve {{variable}} patterns in config values
    const resolvedConfig = this.resolveVariables(node.config || {});

    // ── DRY RUN: skip actual execution, return mock output ──
    if (this.dryRun) {
      const mockOutput = {};
      for (const out of (nodeType.outputs || [])) {
        if (out.type === 'image') mockOutput[out.id] = '[DRY RUN] image placeholder';
        else if (out.type === 'video') mockOutput[out.id] = '[DRY RUN] video placeholder';
        else if (out.type === 'audio') mockOutput[out.id] = '[DRY RUN] audio placeholder';
        else if (out.type === 'json') mockOutput[out.id] = { _dryRun: true, resolvedInputs: Object.keys(inputs), resolvedConfig: Object.keys(resolvedConfig).filter(k => k !== 'errorHandling') };
        else mockOutput[out.id] = `[DRY RUN] Would produce ${out.type}: inputs=[${Object.keys(inputs).join(',')}], config=[${Object.keys(resolvedConfig).filter(k => k !== 'errorHandling').join(',')}]`;
      }
      this.stepStates[node.id] = {
        status: 'completed',
        started_at: this.stepStates[node.id].started_at,
        completed_at: new Date().toISOString(),
        output: mockOutput,
        _dryRun: true,
      };
      this.running.delete(node.id);
      await this.updateExecution({});
      return;
    }

    try {
      // Per-node timeout — uses node type's timeout if defined, else global default
      const timeoutMs = nodeType.timeout || NODE_TIMEOUT_MS;
      const output = await this._withTimeout(
        nodeType.run(inputs, resolvedConfig, context),
        timeoutMs,
        `Node "${nodeType.label}" timed out after ${timeoutMs / 1000}s`
      );

      this.stepStates[node.id] = {
        status: 'completed',
        started_at: this.stepStates[node.id].started_at,
        completed_at: new Date().toISOString(),
        output
      };
    } catch (err) {
      if (errorHandling === 'retry') {
        const retried = await this.retryNode(node, nodeType, inputs, context, errorHandling);
        if (retried) { this.running.delete(node.id); return; }
        // Retries exhausted — fall through to failure handling below
      }

      this.stepStates[node.id] = {
        status: 'failed',
        started_at: this.stepStates[node.id].started_at,
        completed_at: new Date().toISOString(),
        error: err.message
      };

      // Only cancel the entire flow if error mode is 'stop'
      // 'skip' lets the flow continue, 'retry' already exhausted retries above
      if (errorHandling === 'stop') {
        this.cancelled = true;
      }
    }

    this.running.delete(node.id);
    await this.updateExecution({});
  }

  /**
   * Retry a failed node up to maxRetries times with exponential backoff.
   * Returns true if retry succeeded, false if all retries exhausted.
   * Does NOT cancel the flow — the caller decides based on errorHandling mode.
   */
  async retryNode(node, nodeType, inputs, context, errorHandling, maxRetries = 3) {
    const delays = [2000, 4000, 8000];
    for (let i = 0; i < maxRetries; i++) {
      console.log(`[flows] Retry ${i + 1}/${maxRetries} for node "${nodeType.label}" in ${delays[i]}ms`);
      await new Promise(r => setTimeout(r, delays[i]));

      if (this.cancelled) return false; // Flow was cancelled during backoff

      try {
        const output = await this._withTimeout(
          nodeType.run(inputs, node.config || {}, context),
          NODE_TIMEOUT_MS,
          `Node "${nodeType.label}" timed out on retry ${i + 1}`
        );
        this.stepStates[node.id] = {
          status: 'completed',
          started_at: this.stepStates[node.id].started_at,
          completed_at: new Date().toISOString(),
          output
        };
        await this.updateExecution({});
        return true;
      } catch (err) {
        console.error(`[flows] Retry ${i + 1}/${maxRetries} failed for "${nodeType.label}":`, err.message);
        if (i === maxRetries - 1) {
          // Final retry failed — update stepState but let caller handle flow-level decision
          this.stepStates[node.id] = {
            status: 'failed',
            started_at: this.stepStates[node.id].started_at,
            completed_at: new Date().toISOString(),
            error: `Failed after ${maxRetries} retries: ${err.message}`
          };
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Wrap a promise with a timeout. Rejects with a descriptive error if exceeded.
   */
  _withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then(v => { clearTimeout(timer); resolve(v); })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  async execute() {
    // ── RESUME FROM FAILED: pre-load completed states from previous execution ──
    if (this.resumeFromStates) {
      for (const [nodeId, state] of Object.entries(this.resumeFromStates)) {
        if (state.status === 'completed') {
          this.stepStates[nodeId] = state; // Keep completed nodes as-is
        }
        // Failed/running nodes are left unset — they'll be re-run
      }
      console.log(`[flows] Resuming: ${Object.keys(this.stepStates).length} nodes pre-loaded as completed`);
    }

    const mode = this.dryRun ? 'dry_run' : 'running';
    await this.updateExecution({ status: mode, started_at: new Date().toISOString() });

    while (!this.cancelled && !this.paused) {
      const ready = this.getReadyNodes();
      if (ready.length === 0 && this.running.size === 0) break;
      if (ready.length === 0) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      const slotsAvailable = DEFAULT_CONCURRENCY - this.running.size;
      const batch = ready.slice(0, Math.max(0, slotsAvailable));

      if (batch.length === 0) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      // Fire batch and wait for ALL to settle (not race with a short timer)
      // This prevents the loop from spinning while nodes are running
      const promises = batch.map(node => this.runNode(node));
      await Promise.race([
        Promise.allSettled(promises),
        // Poll every 2s to pick up newly-ready nodes from other concurrent completions
        new Promise(r => setTimeout(r, 2000))
      ]);
    }

    const anyFailed = Object.values(this.stepStates).some(s => s.status === 'failed');
    const finalStatus = this.cancelled ? 'failed' : this.paused ? 'paused' : anyFailed ? 'failed' : 'completed';

    await this.updateExecution({
      status: finalStatus,
      completed_at: finalStatus !== 'paused' ? new Date().toISOString() : undefined,
      error: this.cancelled ? 'Flow stopped due to node failure' : undefined
    });

    return finalStatus;
  }

  pause() {
    this.paused = true;
  }

  cancel() {
    this.cancelled = true;
    this.abortController.abort();
  }
}

const activeExecutors = new Map();

export function getActiveExecutor(executionId) {
  return activeExecutors.get(executionId);
}

export async function executeFlow(flow, supabase, apiKeys, userId, userEmail, opts = {}) {
  const { data: execution, error } = await supabase
    .from('automation_executions')
    .insert({ flow_id: flow.id, user_id: userId, status: opts.dryRun ? 'dry_run' : 'queued' })
    .select()
    .single();

  if (error) throw new Error(`Failed to create execution: ${error.message}`);

  const executor = new FlowExecutor(flow, execution, supabase, apiKeys, userId, userEmail, opts);
  activeExecutors.set(execution.id, executor);

  executor.execute().finally(() => {
    activeExecutors.delete(execution.id);
  });

  return execution;
}

/**
 * Resume a failed execution from the point of failure.
 * Pre-loads completed step states, re-runs failed + downstream nodes.
 */
export async function resumeExecution(executionId, supabase, apiKeys, userId, userEmail) {
  // Load the failed execution's step states
  const { data: prevExec, error: execErr } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('id', executionId)
    .single();
  if (execErr || !prevExec) throw new Error('Previous execution not found');
  if (!['failed', 'cancelled'].includes(prevExec.status)) throw new Error('Can only resume failed or cancelled executions');

  // Load the flow
  const { data: flow, error: flowErr } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('id', prevExec.flow_id)
    .single();
  if (flowErr || !flow) throw new Error('Flow not found');

  // Create a new execution record for the resumed run
  const { data: execution, error: newErr } = await supabase
    .from('automation_executions')
    .insert({ flow_id: flow.id, user_id: userId, status: 'queued' })
    .select()
    .single();
  if (newErr) throw new Error(`Failed to create resume execution: ${newErr.message}`);

  const executor = new FlowExecutor(flow, execution, supabase, apiKeys, userId, userEmail, {
    resumeFromStates: prevExec.step_states || {},
  });
  activeExecutors.set(execution.id, executor);

  executor.execute().finally(() => {
    activeExecutors.delete(execution.id);
  });

  return execution;
}

export async function recoverInterruptedExecutions(supabase) {
  const { data: interrupted } = await supabase
    .from('automation_executions')
    .update({
      status: 'failed',
      error: 'Execution interrupted by server restart',
      completed_at: new Date().toISOString()
    })
    .in('status', ['running', 'queued'])
    .select('id');

  if (interrupted?.length) {
    console.log(`[flows] Recovered ${interrupted.length} interrupted execution(s)`);
  }
}
