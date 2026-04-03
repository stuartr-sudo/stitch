import { getNodeType } from './nodeTypeRegistry.js';
import { logCost } from './costLogger.js';

const DEFAULT_CONCURRENCY = 3;

export class FlowExecutor {
  constructor(flow, execution, supabase, apiKeys, userId, userEmail) {
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
    const incoming = this.getIncomingEdges(node.id);
    for (const edge of incoming) {
      const sourceOutput = this.stepStates[edge.source]?.output;
      if (sourceOutput && edge.sourcePort in sourceOutput) {
        inputs[edge.targetPort] = sourceOutput[edge.sourcePort];
      }
    }
    return inputs;
  }

  async updateExecution(updates) {
    await this.supabase
      .from('automation_executions')
      .update({ step_states: this.stepStates, ...updates })
      .eq('id', this.executionId);
  }

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

    try {
      const output = await nodeType.run(inputs, node.config || {}, context);
      this.stepStates[node.id] = {
        status: 'completed',
        started_at: this.stepStates[node.id].started_at,
        completed_at: new Date().toISOString(),
        output
      };
    } catch (err) {
      const errorHandling = node.errorHandling || 'stop';

      if (errorHandling === 'retry') {
        const retried = await this.retryNode(node, nodeType, inputs, context);
        if (retried) { this.running.delete(node.id); return; }
      }

      this.stepStates[node.id] = {
        status: 'failed',
        started_at: this.stepStates[node.id].started_at,
        completed_at: new Date().toISOString(),
        error: err.message
      };

      if (errorHandling === 'stop') {
        this.cancelled = true;
      }
    }

    this.running.delete(node.id);
    await this.updateExecution({});
  }

  async retryNode(node, nodeType, inputs, context, maxRetries = 3) {
    const delays = [2000, 4000, 8000];
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, delays[i]));
      try {
        const output = await nodeType.run(inputs, node.config || {}, context);
        this.stepStates[node.id] = {
          status: 'completed',
          started_at: this.stepStates[node.id].started_at,
          completed_at: new Date().toISOString(),
          output
        };
        return true;
      } catch (err) {
        if (i === maxRetries - 1) {
          this.stepStates[node.id] = {
            status: 'failed',
            started_at: this.stepStates[node.id].started_at,
            completed_at: new Date().toISOString(),
            error: `Failed after ${maxRetries} retries: ${err.message}`
          };
          this.cancelled = true;
          return false;
        }
      }
    }
    return false;
  }

  async execute() {
    await this.updateExecution({ status: 'running', started_at: new Date().toISOString() });

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

      const promises = batch.map(node => this.runNode(node));
      await Promise.race([
        Promise.allSettled(promises),
        new Promise(r => setTimeout(r, 1000))
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

export async function executeFlow(flow, supabase, apiKeys, userId, userEmail) {
  const { data: execution, error } = await supabase
    .from('automation_executions')
    .insert({ flow_id: flow.id, user_id: userId, status: 'queued' })
    .select()
    .single();

  if (error) throw new Error(`Failed to create execution: ${error.message}`);

  const executor = new FlowExecutor(flow, execution, supabase, apiKeys, userId, userEmail);
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
