# Automation Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual automation flow builder where users compose Stitch tools into multi-step DAG pipelines with explicit wiring, parallel branches, and manual/scheduled triggers.

**Architecture:** React Flow canvas frontend with a node type registry + DAG executor backend. Flows stored as graph JSON in Supabase. Node runners call existing shared helpers (generateImageV2, animateImageV2, etc.) directly — no HTTP overhead. Polling-based execution status updates.

**Tech Stack:** React Flow v12 (`@xyflow/react`), `croner` for cron parsing, existing Express + Supabase + FAL.ai/Wavespeed stack.

**Spec:** `docs/superpowers/specs/2026-04-03-automation-flows-design.md`

---

## File Structure

### Backend (new files)

| File | Responsibility |
|------|---------------|
| `api/flows/flows.js` | Catch-all API handler — CRUD, execute, pause/resume, cancel, retry, templates, clone |
| `api/lib/nodeTypeRegistry.js` | Declarative registry of ~21 node types with inputs, outputs, configSchema, run() |
| `api/lib/flowExecutor.js` | DAG walker — topological sort, concurrency pool, pause/resume, error handling, crash recovery |
| `api/lib/scheduledFlowRunner.js` | Cron poller — checks scheduled flows every 60s, dedup guard, triggers executor |
| `supabase/migrations/20260404_automation_flows.sql` | DB migration — automation_flows + automation_executions tables, RLS, triggers |

### Frontend (new files)

| File | Responsibility |
|------|---------------|
| `src/pages/FlowsListPage.jsx` | /flows — My Flows grid, Templates tab, Executions tab, stats bar |
| `src/pages/FlowBuilderPage.jsx` | /flows/:id — three-panel builder with canvas, palette, config panel |
| `src/components/flows/FlowCanvas.jsx` | React Flow wrapper — nodes, edges, zoom/pan, execution overlays |
| `src/components/flows/NodePalette.jsx` | Left panel — searchable, categorized node type list, drag source |
| `src/components/flows/NodeConfigPanel.jsx` | Right panel — dynamic form from configSchema, port summary |
| `src/components/flows/ExecutionLog.jsx` | Right panel in execution mode — timestamped log entries |
| `src/components/flows/FlowCard.jsx` | Card component for list page — mini DAG preview, run button |
| `src/components/flows/nodes/StitchNode.jsx` | Custom React Flow node component — colored header, ports, status overlay |

### Files to modify

| File | Change |
|------|--------|
| `server.js` | Register `/api/flows*` catch-all route, call `recoverInterruptedExecutions()` on startup, register scheduled flow runner |
| `src/App.jsx` | Add routes: `/flows`, `/flows/new`, `/flows/:id`, `/flows/:id/run/:executionId` |
| `src/pages/VideoAdvertCreator.jsx` | Add "Automation" section to sidebar with "Flows" nav item |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260404_automation_flows.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Automation Flows
CREATE TABLE automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  graph_json JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  is_template BOOLEAN DEFAULT FALSE,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  schedule_cron TEXT,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_flows_user ON automation_flows(user_id);
CREATE INDEX idx_automation_flows_template ON automation_flows(is_template) WHERE is_template = TRUE;

CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW EXECUTE FUNCTION update_automation_flows_updated_at();

ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flows"
  ON automation_flows FOR ALL
  USING (user_id = auth.uid() OR is_template = TRUE)
  WITH CHECK (user_id = auth.uid());

-- Automation Executions
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'queued',
  step_states JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_executions_flow ON automation_executions(flow_id);
CREATE INDEX idx_automation_executions_user ON automation_executions(user_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status);

ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own executions"
  ON automation_executions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Run the migration against the Supabase project**

Run the SQL via the Supabase dashboard SQL editor or `psql`.

- [ ] **Step 3: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'automation%';
```

Expected: `automation_flows`, `automation_executions`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260404_automation_flows.sql
git commit -m "feat(flows): add automation_flows and automation_executions tables"
```

---

## Task 2: Node Type Registry

**Files:**
- Create: `api/lib/nodeTypeRegistry.js`

The registry defines every Stitch tool as a composable node with typed ports and a `run()` function. Each `run()` calls existing shared helpers directly (not HTTP).

- [ ] **Step 1: Create the registry with the Manual Input node and 3 core image/video nodes**

Start with Manual Input, Imagineer Generate, JumpStart Animate, and Save to Library — enough to test end-to-end.

```js
// api/lib/nodeTypeRegistry.js
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import { uploadUrlToSupabase } from './pipelineHelpers.js';

const NODE_TYPES = {
  'manual-input': {
    id: 'manual-input',
    label: 'Manual Input',
    category: 'input',
    icon: '📥',
    inputs: [],
    outputs: [
      { id: 'value', type: 'string' }
    ],
    configSchema: {
      label: { type: 'text', default: 'Input' },
      inputType: { type: 'select', options: ['string', 'image', 'video'], default: 'string' },
      defaultValue: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      // Value is resolved from execution parameters before run
      return { value: config.resolvedValue || config.defaultValue || '' };
    }
  },

  'imagineer-generate': {
    id: 'imagineer-generate',
    label: 'Imagineer Generate',
    category: 'image',
    icon: '🖼',
    inputs: [
      { id: 'prompt', type: 'string', required: true },
      { id: 'style', type: 'string', required: false }
    ],
    outputs: [
      { id: 'image_url', type: 'image' }
    ],
    configSchema: {
      model: { type: 'select', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4'], default: 'nano-banana-2' },
      aspect_ratio: { type: 'select', options: ['16:9', '9:16', '1:1', '4:5', '3:2'], default: '16:9' }
    },
    async run(inputs, config, context) {
      const prompt = inputs.style ? `${inputs.prompt}, ${inputs.style}` : inputs.prompt;
      const imageUrl = await generateImageV2(
        config.model, prompt, config.aspect_ratio,
        context.apiKeys, context.supabase, {}
      );
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'imagineer-generate', model: config.model });
      return { image_url: imageUrl };
    }
  },

  'jumpstart-animate': {
    id: 'jumpstart-animate',
    label: 'JumpStart Animate',
    category: 'video',
    icon: '🎬',
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'prompt', type: 'string', required: false }
    ],
    outputs: [
      { id: 'video_url', type: 'video' }
    ],
    configSchema: {
      model: { type: 'select', options: ['kling-2.0-master', 'veo-3.1-fast', 'wan-2.5'], default: 'kling-2.0-master' },
      duration: { type: 'select', options: ['5', '10'], default: '5' }
    },
    async run(inputs, config, context) {
      const videoUrl = await animateImageV2(
        config.model, inputs.image, inputs.prompt || '',
        '16:9', parseInt(config.duration),
        context.apiKeys, context.supabase, {}
      );
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'jumpstart-animate', model: config.model });
      return { video_url: videoUrl };
    }
  },

  'save-to-library': {
    id: 'save-to-library',
    label: 'Save to Library',
    category: 'utility',
    icon: '💾',
    inputs: [
      { id: 'url', type: 'string', required: true },
      { id: 'name', type: 'string', required: false }
    ],
    outputs: [
      { id: 'saved_url', type: 'string' }
    ],
    configSchema: {},
    async run(inputs, config, context) {
      const savedUrl = await uploadUrlToSupabase(inputs.url, context.supabase, 'library');
      return { saved_url: savedUrl };
    }
  }
};

export function getNodeType(id) {
  return NODE_TYPES[id] || null;
}

export function getAllNodeTypes() {
  return Object.values(NODE_TYPES);
}

export function getNodeTypesByCategory() {
  const grouped = {};
  for (const node of Object.values(NODE_TYPES)) {
    if (!grouped[node.category]) grouped[node.category] = [];
    grouped[node.category].push(node);
  }
  return grouped;
}

export default NODE_TYPES;
```

- [ ] **Step 2: Verify the module imports correctly**

```bash
cd /Users/stuarta/stitch && node -e "import('./api/lib/nodeTypeRegistry.js').then(m => console.log(Object.keys(m.default)))"
```

Expected: `['manual-input', 'imagineer-generate', 'jumpstart-animate', 'save-to-library']`

- [ ] **Step 3: Commit**

```bash
git add api/lib/nodeTypeRegistry.js
git commit -m "feat(flows): add node type registry with 4 initial node types"
```

---

## Task 3: DAG Executor

**Files:**
- Create: `api/lib/flowExecutor.js`

- [ ] **Step 1: Create the executor with core DAG walking logic**

```js
// api/lib/flowExecutor.js
import { getNodeType } from './nodeTypeRegistry.js';
import { logCost } from './costLogger.js';
import { createClient } from '@supabase/supabase-js';

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

  // Build adjacency: for each node, which edges feed into it?
  getIncomingEdges(nodeId) {
    return this.edges.filter(e => e.target === nodeId);
  }

  getOutgoingEdges(nodeId) {
    return this.edges.filter(e => e.source === nodeId);
  }

  // Check if all inputs for a node are satisfied
  isNodeReady(nodeId) {
    if (this.stepStates[nodeId]) return false; // already processed
    const incoming = this.getIncomingEdges(nodeId);
    return incoming.every(edge => {
      const sourceState = this.stepStates[edge.source];
      return sourceState && sourceState.status === 'completed';
    });
  }

  // Get ready nodes — root nodes (no incoming) or nodes with all inputs satisfied
  getReadyNodes() {
    return this.nodes.filter(node => {
      const incoming = this.getIncomingEdges(node.id);
      if (incoming.length === 0 && !this.stepStates[node.id]) return true;
      return this.isNodeReady(node.id);
    });
  }

  // Resolve inputs for a node from upstream outputs
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

  // Update execution state in DB
  async updateExecution(updates) {
    await this.supabase
      .from('automation_executions')
      .update({ step_states: this.stepStates, ...updates })
      .eq('id', this.executionId);
  }

  // Run a single node
  async runNode(node) {
    const nodeType = getNodeType(node.type);
    if (!nodeType) throw new Error(`Unknown node type: ${node.type}`);

    this.stepStates[node.id] = { status: 'running', started_at: new Date().toISOString() };
    this.running.add(node.id);
    await this.updateExecution({});

    const inputs = this.resolveInputs(node);
    const context = {
      userId: this.userId,
      supabase: this.supabase,
      apiKeys: this.apiKeys,
      abortSignal: this.abortController.signal,
      logCost: (params) => logCost({ ...params, username: this.userEmail }),
      userEmail: this.userEmail
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
      // 'skip' mode: downstream nodes will get null inputs
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

  // Main execution loop
  async execute() {
    await this.updateExecution({ status: 'running', started_at: new Date().toISOString() });

    while (!this.cancelled && !this.paused) {
      const ready = this.getReadyNodes();
      if (ready.length === 0 && this.running.size === 0) break;
      if (ready.length === 0) {
        // Wait for running nodes to complete
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      // Respect concurrency limit
      const slotsAvailable = DEFAULT_CONCURRENCY - this.running.size;
      const batch = ready.slice(0, Math.max(0, slotsAvailable));

      if (batch.length === 0) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      // Fire batch concurrently (don't await individually)
      const promises = batch.map(node => this.runNode(node));
      await Promise.race([
        Promise.allSettled(promises),
        new Promise(r => setTimeout(r, 1000)) // re-check loop every 1s for new ready nodes
      ]);
    }

    // Determine final status
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

// In-memory map of active executors for pause/resume/cancel
const activeExecutors = new Map();

export function getActiveExecutor(executionId) {
  return activeExecutors.get(executionId);
}

export async function executeFlow(flow, supabase, apiKeys, userId, userEmail) {
  // Create execution record
  const { data: execution, error } = await supabase
    .from('automation_executions')
    .insert({ flow_id: flow.id, user_id: userId, status: 'queued' })
    .select()
    .single();

  if (error) throw new Error(`Failed to create execution: ${error.message}`);

  const executor = new FlowExecutor(flow, execution, supabase, apiKeys, userId, userEmail);
  activeExecutors.set(execution.id, executor);

  // Run async — don't await (caller gets execution ID immediately)
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
```

- [ ] **Step 2: Verify the module imports correctly**

```bash
cd /Users/stuarta/stitch && node -e "import('./api/lib/flowExecutor.js').then(m => console.log(typeof m.executeFlow, typeof m.recoverInterruptedExecutions))"
```

Expected: `function function`

- [ ] **Step 3: Commit**

```bash
git add api/lib/flowExecutor.js
git commit -m "feat(flows): add DAG executor with concurrency pool, pause/resume, crash recovery"
```

---

## Task 4: API Endpoints

**Files:**
- Create: `api/flows/flows.js`
- Modify: `server.js`

- [ ] **Step 1: Create the flows API handler**

```js
// api/flows/flows.js
import { executeFlow, getActiveExecutor, recoverInterruptedExecutions } from '../lib/flowExecutor.js';
import { getAllNodeTypes, getNodeTypesByCategory } from '../lib/nodeTypeRegistry.js';
import { getUserKeys } from '../lib/getUserKeys.js';

// Note: getUserKeys(userId, userEmail) — does NOT accept supabase as first arg.

export default async function handler(req, res) {
  const supabase = req.supabase;
  const userId = req.user?.id;
  const url = new URL(req.url || req.originalUrl, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/flows', '').split('/').filter(Boolean);
  const method = req.method;

  try {
    // GET /api/flows/node-types — list available node types for the palette
    if (pathParts[0] === 'node-types' && method === 'GET') {
      return res.json({ nodeTypes: getNodeTypesByCategory() });
    }

    // GET /api/flows/templates — list pre-built templates
    if (pathParts[0] === 'templates' && method === 'GET') {
      const { data, error } = await supabase
        .from('automation_flows')
        .select('id, name, description, graph_json, created_at')
        .eq('is_template', true)
        .order('created_at', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ templates: data });
    }

    // POST /api/flows/templates/:id/clone — clone template into user's flows
    if (pathParts[0] === 'templates' && pathParts[1] && pathParts[2] === 'clone' && method === 'POST') {
      const { data: template, error: fetchErr } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', pathParts[1])
        .eq('is_template', true)
        .single();
      if (fetchErr || !template) return res.status(404).json({ error: 'Template not found' });

      const { data: flow, error: insertErr } = await supabase
        .from('automation_flows')
        .insert({
          user_id: userId,
          name: `${template.name} (copy)`,
          description: template.description,
          graph_json: template.graph_json,
          is_template: false
        })
        .select()
        .single();
      if (insertErr) return res.status(500).json({ error: insertErr.message });
      return res.json({ flow });
    }

    // Execution routes: /api/flows/executions/:execId/...
    if (pathParts[0] === 'executions' && pathParts[1]) {
      const execId = pathParts[1];
      const action = pathParts[2];

      if (method === 'GET' && !action) {
        const { data, error } = await supabase
          .from('automation_executions')
          .select('*')
          .eq('id', execId)
          .eq('user_id', userId)
          .single();
        if (error) return res.status(404).json({ error: 'Execution not found' });
        return res.json({ execution: data });
      }

      if (action === 'pause' && method === 'POST') {
        const executor = getActiveExecutor(execId);
        if (executor) executor.pause();
        await supabase.from('automation_executions').update({ status: 'paused' }).eq('id', execId);
        return res.json({ status: 'paused' });
      }

      if (action === 'resume' && method === 'POST') {
        // Resume continues the EXISTING execution from saved step_states
        const { data: exec } = await supabase.from('automation_executions').select('*, automation_flows(*)').eq('id', execId).single();
        if (!exec) return res.status(404).json({ error: 'Execution not found' });
        const keys = await getUserKeys(userId, req.user?.email);
        // Re-create executor with existing step_states, then resume
        const executor = new (await import('../lib/flowExecutor.js')).FlowExecutor(
          exec.automation_flows, exec, supabase, keys, userId, req.user?.email
        );
        executor.stepStates = exec.step_states || {};
        executor.paused = false;
        // Run async
        executor.execute();
        return res.json({ status: 'resumed', executionId: execId });
      }

      // POST /api/flows/executions/:execId/retry/:nodeId — retry a failed node
      if (action === 'retry' && pathParts[3] && method === 'POST') {
        const nodeId = pathParts[3];
        const { data: exec } = await supabase.from('automation_executions').select('*, automation_flows(*)').eq('id', execId).single();
        if (!exec) return res.status(404).json({ error: 'Execution not found' });
        // Clear the failed node's state so it becomes "ready" again
        const stepStates = { ...(exec.step_states || {}) };
        delete stepStates[nodeId];
        await supabase.from('automation_executions').update({ step_states: stepStates, status: 'running' }).eq('id', execId);
        // Re-execute from current state
        const keys = await getUserKeys(userId, req.user?.email);
        const executor = new (await import('../lib/flowExecutor.js')).FlowExecutor(
          exec.automation_flows, exec, supabase, keys, userId, req.user?.email
        );
        executor.stepStates = stepStates;
        executor.execute();
        return res.json({ status: 'retrying', nodeId });
      }

      if (action === 'cancel' && method === 'POST') {
        const executor = getActiveExecutor(execId);
        if (executor) executor.cancel();
        await supabase.from('automation_executions').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', execId);
        return res.json({ status: 'cancelled' });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // CRUD: /api/flows (list/create) and /api/flows/:id (get/update/delete)
    if (pathParts.length === 0) {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('automation_flows')
          .select('*, automation_executions(id, status, created_at)')
          .eq('user_id', userId)
          .eq('is_template', false)
          .order('updated_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ flows: data });
      }

      if (method === 'POST') {
        const { name, description, graph_json } = req.body;
        const { data, error } = await supabase
          .from('automation_flows')
          .insert({ user_id: userId, name: name || 'Untitled Flow', description, graph_json: graph_json || { nodes: [], edges: [] } })
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ flow: data });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // /api/flows/:id
    const flowId = pathParts[0];
    const subPath = pathParts[1];

    // POST /api/flows/:id/execute
    if (subPath === 'execute' && method === 'POST') {
      const { data: flow, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      if (error || !flow) return res.status(404).json({ error: 'Flow not found' });

      const keys = await getUserKeys(userId, req.user?.email);
      const execution = await executeFlow(flow, supabase, keys, userId, req.user?.email);
      return res.json({ execution });
    }

    // GET /api/flows/:id/executions — list executions for this flow
    if (subPath === 'executions' && method === 'GET') {
      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('flow_id', flowId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ executions: data });
    }

    // GET/PUT/DELETE /api/flows/:id
    if (!subPath) {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('automation_flows')
          .select('*')
          .eq('id', flowId)
          .single();
        if (error) return res.status(404).json({ error: 'Flow not found' });
        return res.json({ flow: data });
      }

      if (method === 'PUT') {
        const updates = {};
        const allowed = ['name', 'description', 'graph_json', 'trigger_type', 'schedule_cron'];
        for (const key of allowed) {
          if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        const { data, error } = await supabase
          .from('automation_flows')
          .update(updates)
          .eq('id', flowId)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ flow: data });
      }

      if (method === 'DELETE') {
        const { error } = await supabase
          .from('automation_flows')
          .delete()
          .eq('id', flowId)
          .eq('user_id', userId);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ deleted: true });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[flows] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Register the route in server.js**

Add after the existing catch-all routes (around the autopilot/queue block near line 144):

```js
// Automation Flows — catch-all
app.all('/api/flows*', authenticateToken, async (req, res) => {
  const handler = (await import('./api/flows/flows.js')).default;
  return handler(req, res);
});
```

Also add crash recovery call in the server startup section (near where `scheduledPublisher` is initialized):

```js
// Recover interrupted flow executions
import('./api/lib/flowExecutor.js').then(m => m.recoverInterruptedExecutions(supabase));
```

- [ ] **Step 3: Test the API endpoints**

Start the server (`npm run server`) and test:

```bash
# Create a flow
curl -X POST http://localhost:3003/api/flows -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Flow"}'

# List flows
curl http://localhost:3003/api/flows -H "Authorization: Bearer $TOKEN"

# Get node types
curl http://localhost:3003/api/flows/node-types -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 4: Commit**

```bash
git add api/flows/flows.js server.js
git commit -m "feat(flows): add flows API with CRUD, execute, pause/resume, cancel"
```

---

## Task 5: Install Frontend Dependencies

- [ ] **Step 1: Install React Flow and croner**

```bash
cd /Users/stuarta/stitch && npm install @xyflow/react croner
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@xyflow/react'); console.log('react-flow ok')"
node -e "require('croner'); console.log('croner ok')"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(flows): add @xyflow/react and croner dependencies"
```

---

## Task 6: Custom React Flow Node Component

**Files:**
- Create: `src/components/flows/nodes/StitchNode.jsx`

- [ ] **Step 1: Create the custom node component**

This renders each node on the canvas — colored header by category, port handles, status overlays during execution.

```jsx
// src/components/flows/nodes/StitchNode.jsx
import { Handle, Position } from '@xyflow/react';

const CATEGORY_COLORS = {
  input:   { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', text: '#999' },
  image:   { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', text: '#c4b5fd' },
  video:   { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', text: '#93c5fd' },
  audio:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#6ee7b7' },
  content: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#fcd34d' },
  publish: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#fca5a5' },
  utility: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: '#999' },
};

const STATUS_STYLES = {
  running:   { border: '2px solid rgba(59,130,246,0.5)', shadow: '0 0 16px rgba(59,130,246,0.15)' },
  completed: { border: '2px solid rgba(16,185,129,0.5)', shadow: '0 0 12px rgba(16,185,129,0.1)' },
  failed:    { border: '2px solid rgba(239,68,68,0.5)', shadow: '0 0 12px rgba(239,68,68,0.1)' },
  paused:    { border: '2px solid rgba(245,158,11,0.5)', shadow: '0 0 12px rgba(245,158,11,0.1)' },
};

export default function StitchNode({ data, selected }) {
  const { nodeType, config, stepState } = data;
  const colors = CATEGORY_COLORS[nodeType.category] || CATEGORY_COLORS.utility;
  const statusStyle = stepState ? STATUS_STYLES[stepState.status] : null;

  return (
    <div
      className="rounded-lg overflow-hidden min-w-[180px]"
      style={{
        background: colors.bg,
        border: statusStyle?.border || `1px solid ${colors.border}`,
        boxShadow: statusStyle?.shadow || (selected ? `0 0 0 2px rgba(99,102,241,0.5)` : 'none'),
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2"
        style={{ background: colors.bg, color: colors.text }}
      >
        <span>{nodeType.icon} {nodeType.label}</span>
        {stepState?.status === 'completed' && <span className="text-emerald-400">✓</span>}
        {stepState?.status === 'running' && (
          <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
        )}
        {stepState?.status === 'failed' && <span className="text-red-400">✕</span>}
      </div>

      {/* Status info */}
      {stepState && (
        <div className="px-3 py-1.5 text-[10px]">
          {stepState.status === 'completed' && (
            <span className="text-emerald-400">
              Done in {((new Date(stepState.completed_at) - new Date(stepState.started_at)) / 1000).toFixed(1)}s
            </span>
          )}
          {stepState.status === 'running' && <span className="text-blue-400">Running...</span>}
          {stepState.status === 'failed' && <span className="text-red-400 truncate block">{stepState.error}</span>}
        </div>
      )}

      {/* Input handles */}
      {nodeType.inputs.map((input, i) => (
        <Handle
          key={`in-${input.id}`}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ top: 42 + i * 20, background: colors.text, width: 8, height: 8 }}
        />
      ))}

      {/* Output handles */}
      {nodeType.outputs.map((output, i) => (
        <Handle
          key={`out-${output.id}`}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ top: 42 + i * 20, background: colors.text, width: 8, height: 8 }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/flows/nodes/StitchNode.jsx
git commit -m "feat(flows): add StitchNode custom React Flow node component"
```

---

## Task 7: Flow Builder Page — Canvas + Palette + Config Panel

**Files:**
- Create: `src/pages/FlowBuilderPage.jsx`
- Create: `src/components/flows/NodePalette.jsx`
- Create: `src/components/flows/NodeConfigPanel.jsx`
- Create: `src/components/flows/FlowCanvas.jsx`

This is the largest task — the three-panel flow builder. Build it incrementally.

- [ ] **Step 1: Create NodePalette.jsx**

Left panel — categorized, searchable list of node types. Drag source for React Flow.

```jsx
// src/components/flows/NodePalette.jsx
import { useState } from 'react';
import { Search } from 'lucide-react';

const CATEGORY_ORDER = ['input', 'image', 'video', 'audio', 'content', 'publish', 'utility'];
const CATEGORY_LABELS = {
  input: 'Input', image: 'Image', video: 'Video', audio: 'Audio',
  content: 'Content', publish: 'Publish', utility: 'Utility'
};
const CATEGORY_COLORS = {
  input:   'bg-white/5 border-white/10 text-gray-400',
  image:   'bg-purple-500/10 border-purple-500/20 text-purple-300',
  video:   'bg-blue-500/10 border-blue-500/20 text-blue-300',
  audio:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  content: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  publish: 'bg-red-500/10 border-red-500/20 text-red-300',
  utility: 'bg-white/5 border-white/10 text-gray-400',
};

export default function NodePalette({ nodeTypes }) {
  const [search, setSearch] = useState('');

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filtered = nodeTypes
    ? Object.entries(nodeTypes).reduce((acc, [cat, nodes]) => {
        const matched = nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase()));
        if (matched.length) acc[cat] = matched;
        return acc;
      }, {})
    : {};

  return (
    <div className="w-[220px] border-r border-white/[0.08] p-4 overflow-y-auto flex-shrink-0">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Add Steps</div>
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
        />
      </div>
      {CATEGORY_ORDER.map(cat => {
        const nodes = filtered[cat];
        if (!nodes?.length) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-600 mb-1.5">{CATEGORY_LABELS[cat]}</div>
            {nodes.map(node => (
              <div
                key={node.id}
                draggable
                onDragStart={e => onDragStart(e, node)}
                className={`px-2.5 py-1.5 mb-1 rounded-md border text-xs cursor-grab active:cursor-grabbing ${CATEGORY_COLORS[cat]}`}
              >
                {node.icon} {node.label}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create NodeConfigPanel.jsx**

Right panel — renders config form for selected node based on its configSchema.

```jsx
// src/components/flows/NodeConfigPanel.jsx
export default function NodeConfigPanel({ node, nodeType, onConfigChange }) {
  if (!node || !nodeType) {
    return (
      <div className="w-[260px] border-l border-white/[0.08] p-4 flex items-center justify-center">
        <p className="text-xs text-gray-600">Select a node to configure</p>
      </div>
    );
  }

  const config = node.data?.config || {};

  const handleChange = (key, value) => {
    onConfigChange(node.id, { ...config, [key]: value });
  };

  return (
    <div className="w-[260px] border-l border-white/[0.08] p-4 overflow-y-auto flex-shrink-0">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Node Config</div>
      <div className="text-sm font-semibold mb-4" style={{ color: '#c4b5fd' }}>
        {nodeType.icon} {nodeType.label}
      </div>

      {Object.entries(nodeType.configSchema || {}).map(([key, schema]) => (
        <div key={key} className="mb-4">
          <label className="text-[11px] text-gray-500 block mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
          {schema.type === 'select' ? (
            <select
              value={config[key] || schema.default}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
            >
              {schema.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config[key] || schema.default || ''}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
            />
          )}
        </div>
      ))}

      {/* Error handling mode */}
      <div className="mb-4">
        <label className="text-[11px] text-gray-500 block mb-1">Error Handling</label>
        <select
          value={config.errorHandling || 'stop'}
          onChange={e => handleChange('errorHandling', e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="stop">Stop flow on error</option>
          <option value="skip">Skip and continue</option>
          <option value="retry">Retry (3 attempts)</option>
        </select>
      </div>

      {/* Port summary */}
      <div className="border-t border-white/[0.06] pt-4 mt-4">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Inputs</div>
        {nodeType.inputs.map(input => (
          <div key={input.id} className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">{input.id}</span>
            <span className="text-[10px] text-gray-600 bg-white/[0.04] px-1.5 py-0.5 rounded">{input.type}</span>
          </div>
        ))}
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mt-3 mb-2">Outputs</div>
        {nodeType.outputs.map(output => (
          <div key={output.id} className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">{output.id}</span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{output.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create FlowCanvas.jsx**

Central React Flow canvas wrapper.

```jsx
// src/components/flows/FlowCanvas.jsx
//
// IMPORTANT: This is a CONTROLLED component. Nodes/edges state lives in the
// parent (FlowBuilderPage). The parent passes nodes, edges, onNodesChange,
// onEdgesChange, and onConnect. This avoids dual-state bugs.
import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StitchNode from './nodes/StitchNode';

const nodeTypes = { stitch: StitchNode };

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onDrop,
  stepStates,
}) {
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    if (onDrop) onDrop(event);
  }, [onDrop]);

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeSelect) onNodeSelect(node);
  }, [onNodeSelect]);

  // Merge step states into node data for status overlays
  const nodesWithStatus = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      stepState: stepStates?.[node.id] || null,
    }
  }));

  return (
    <div className="flex-1 h-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodesWithStatus}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0a0a0f' }}
      >
        <Controls className="!bg-gray-900 !border-white/10" />
        <MiniMap className="!bg-gray-900" nodeColor="#333" />
        <Background variant="dots" gap={16} size={1} color="#1a1a2e" />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 4: Create FlowBuilderPage.jsx**

The main page that wires everything together.

```jsx
// src/pages/FlowBuilderPage.jsx
//
// State management: nodes/edges live here (single source of truth) using
// React Flow's useNodesState/useEdgesState hooks. FlowCanvas is controlled.
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import { apiFetch } from '@/lib/api';
import FlowCanvas from '@/components/flows/FlowCanvas';
import NodePalette from '@/components/flows/NodePalette';
import NodeConfigPanel from '@/components/flows/NodeConfigPanel';
import ExecutionLog from '@/components/flows/ExecutionLog';

export default function FlowBuilderPage() {
  const { id, executionId } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [nodeTypesMap, setNodeTypesMap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [execution, setExecution] = useState(null);
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const pollRef = useRef(null);
  const saveTimeout = useRef(null);

  // Load node types
  useEffect(() => {
    apiFetch('/api/flows/node-types').then(data => {
      if (data?.nodeTypes) setNodeTypesMap(data.nodeTypes);
    });
  }, []);

  // Load flow
  useEffect(() => {
    if (id && id !== 'new') {
      apiFetch(`/api/flows/${id}`).then(data => {
        if (data?.flow) {
          setFlow(data.flow);
          setNodes(data.flow.graph_json?.nodes || []);
          setEdges(data.flow.graph_json?.edges || []);
        }
      });
    }
  }, [id]);

  // Poll execution status
  useEffect(() => {
    if (!executionId) { setExecution(null); return; }
    const poll = async () => {
      const data = await apiFetch(`/api/flows/executions/${executionId}`);
      if (data?.execution) {
        setExecution(data.execution);
        if (['completed', 'failed', 'cancelled'].includes(data.execution.status)) {
          clearInterval(pollRef.current);
        }
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [executionId]);

  // Save flow (uses current nodes/edges from state)
  const saveFlow = useCallback(async () => {
    if (!flow?.id) return;
    setSaving(true);
    const graph_json = {
      nodes: nodes.map(n => ({
        id: n.id, type: n.type, position: n.position,
        data: { ...n.data, stepState: undefined }
      })),
      edges
    };
    await apiFetch(`/api/flows/${flow.id}`, {
      method: 'PUT',
      body: JSON.stringify({ graph_json })
    });
    setSaving(false);
  }, [flow, nodes, edges]);

  // Auto-save on any change (debounced 1.5s)
  useEffect(() => {
    if (!flow?.id) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveFlow(), 1500);
    return () => clearTimeout(saveTimeout.current);
  }, [nodes, edges, saveFlow]);

  // Connect handler — validates port type compatibility before adding edge
  const onConnect = useCallback((params) => {
    // Look up source and target node types to validate port compatibility
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    if (sourceNode?.data?.nodeType && targetNode?.data?.nodeType) {
      const sourcePort = sourceNode.data.nodeType.outputs?.find(o => o.id === params.sourceHandle);
      const targetPort = targetNode.data.nodeType.inputs?.find(i => i.id === params.targetHandle);
      if (sourcePort && targetPort) {
        // string is universal — any type can connect to string. Otherwise must match.
        const compatible = targetPort.type === 'string' || sourcePort.type === targetPort.type;
        if (!compatible) return; // silently reject incompatible connection
      }
    }
    setEdges(eds => addEdge({
      ...params,
      animated: false,
      style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 }
    }, eds));
  }, [setEdges, nodes]);

  // Handle drop from palette
  const handleDrop = useCallback((event) => {
    const data = event.dataTransfer.getData('application/reactflow');
    if (!data) return;
    const nodeType = JSON.parse(data);
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left - 90,
      y: event.clientY - bounds.top - 20,
    };
    const newNode = {
      id: `node_${Date.now()}`,
      type: 'stitch',
      position,
      data: { nodeType, config: {} },
    };
    setNodes(prev => [...prev, newNode]);
  }, [setNodes]);

  // Config change — also stores errorHandling at the node level for the executor
  const handleConfigChange = useCallback((nodeId, config) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? {
        ...n,
        data: { ...n.data, config },
        // Mirror errorHandling to node level so executor reads it correctly
        errorHandling: config.errorHandling || 'stop'
      } : n
    ));
  }, [setNodes]);

  // Run flow
  const handleRun = async () => {
    if (!flow?.id) return;
    await saveFlow();
    const data = await apiFetch(`/api/flows/${flow.id}/execute`, { method: 'POST' });
    if (data?.execution) {
      navigate(`/flows/${flow.id}/run/${data.execution.id}`);
    }
  };

  // Pause/Cancel
  const handlePause = async () => {
    if (!executionId) return;
    await apiFetch(`/api/flows/executions/${executionId}/pause`, { method: 'POST' });
  };
  const handleCancel = async () => {
    if (!executionId) return;
    await apiFetch(`/api/flows/executions/${executionId}/cancel`, { method: 'POST' });
  };

  const selectedNodeType = selectedNode?.data?.nodeType;
  const isExecuting = !!executionId;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-black/30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/flows')} className="text-gray-500 hover:text-gray-300 text-sm">← Flows</button>
          <span className="text-sm font-semibold text-white">{flow?.name || 'New Flow'}</span>
          {saving && <span className="text-[11px] text-gray-500">Saving...</span>}
          {!saving && flow?.id && <span className="text-[11px] text-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 rounded">Saved</span>}
        </div>
        <div className="flex gap-2">
          {isExecuting ? (
            <>
              <button onClick={handlePause} className="px-3 py-1.5 text-xs bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-md">⏸ Pause</button>
              <button onClick={handleCancel} className="px-3 py-1.5 text-xs bg-red-500/15 border border-red-500/30 text-red-300 rounded-md">✕ Cancel</button>
            </>
          ) : (
            <>
              <button className="px-3 py-1.5 text-xs bg-white/[0.06] border border-white/10 text-gray-400 rounded-md">Schedule</button>
              <button onClick={handleRun} className="px-4 py-1.5 text-xs bg-indigo-500/80 text-white font-semibold rounded-md">▶ Run Flow</button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {!isExecuting && <NodePalette nodeTypes={nodeTypesMap} />}
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeSelect={setSelectedNode}
          onDrop={handleDrop}
          stepStates={execution?.step_states}
        />
        {isExecuting ? (
          <ExecutionLog execution={execution} />
        ) : (
          <NodeConfigPanel
            node={selectedNode}
            nodeType={selectedNodeType}
            onConfigChange={handleConfigChange}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ExecutionLog.jsx**

```jsx
// src/components/flows/ExecutionLog.jsx
export default function ExecutionLog({ execution }) {
  if (!execution) return null;

  const stepStates = execution.step_states || {};
  const entries = Object.entries(stepStates)
    .flatMap(([nodeId, state]) => {
      const events = [];
      if (state.started_at) events.push({ time: state.started_at, nodeId, type: 'start', status: state.status });
      if (state.completed_at) events.push({ time: state.completed_at, nodeId, type: 'end', status: state.status, error: state.error });
      return events;
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  const startTime = execution.started_at ? new Date(execution.started_at) : null;
  const formatElapsed = (time) => {
    if (!startTime) return '00:00';
    const diff = (new Date(time) - startTime) / 1000;
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = Math.floor(diff % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-[280px] border-l border-white/[0.08] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-[11px] uppercase tracking-wider text-gray-500">Execution Log</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className="text-[10px] text-gray-600">{formatElapsed(entry.time)}</div>
            <div className={`text-[11px] ${
              entry.status === 'completed' ? 'text-emerald-400' :
              entry.status === 'failed' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {entry.nodeId} → {entry.type === 'start' ? 'running' : entry.status}
            </div>
            {entry.error && (
              <div className="text-[10px] text-red-400/70 mt-0.5 pl-2 border-l-2 border-white/[0.06]">{entry.error}</div>
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-[11px] text-gray-600">Waiting for execution to start...</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/FlowBuilderPage.jsx src/components/flows/NodePalette.jsx src/components/flows/NodeConfigPanel.jsx src/components/flows/FlowCanvas.jsx src/components/flows/ExecutionLog.jsx
git commit -m "feat(flows): add flow builder page with canvas, palette, config panel, execution log"
```

---

## Task 8: Flows List Page

**Files:**
- Create: `src/pages/FlowsListPage.jsx`
- Create: `src/components/flows/FlowCard.jsx`

- [ ] **Step 1: Create FlowCard.jsx**

```jsx
// src/components/flows/FlowCard.jsx
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

export default function FlowCard({ flow, onRun }) {
  const navigate = useNavigate();
  const executions = flow.automation_executions || [];
  const runCount = executions.length;
  const lastRun = executions[0]?.created_at;
  const isScheduled = flow.trigger_type === 'scheduled';

  const handleRun = async (e) => {
    e.stopPropagation();
    if (onRun) onRun(flow.id);
  };

  return (
    <div
      onClick={() => navigate(`/flows/${flow.id}`)}
      className="bg-white/[0.03] border border-white/[0.08] rounded-xl cursor-pointer hover:border-white/[0.15] transition-colors overflow-hidden"
    >
      {/* Mini preview area */}
      <div className="h-24 bg-gradient-to-br from-purple-500/[0.06] to-blue-500/[0.06] border-b border-white/[0.05] flex items-center justify-center px-4">
        <div className="text-xs text-gray-600 truncate">{flow.description || 'No description'}</div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold text-white mb-1 truncate">{flow.name}</div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {isScheduled && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded">Scheduled</span>
            )}
            {runCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded">{runCount} runs</span>
            )}
            {lastRun && (
              <span className="text-[10px] text-gray-600">Last: {new Date(lastRun).toLocaleDateString()}</span>
            )}
          </div>
          <button
            onClick={handleRun}
            className="px-3 py-1 text-[11px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-md hover:bg-indigo-500/25 transition-colors"
          >
            ▶ Run
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FlowsListPage.jsx**

```jsx
// src/pages/FlowsListPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import FlowCard from '@/components/flows/FlowCard';

export default function FlowsListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('flows');
  const [flows, setFlows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [flowsData, templatesData] = await Promise.all([
      apiFetch('/api/flows'),
      apiFetch('/api/flows/templates'),
    ]);
    if (flowsData?.flows) setFlows(flowsData.flows);
    if (templatesData?.templates) setTemplates(templatesData.templates);

    // Gather all executions from flows
    const allExecs = (flowsData?.flows || []).flatMap(f =>
      (f.automation_executions || []).map(e => ({ ...e, flow_name: f.name }))
    );
    setExecutions(allExecs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setLoading(false);
  };

  const handleNewFlow = async () => {
    const data = await apiFetch('/api/flows', {
      method: 'POST',
      body: JSON.stringify({ name: 'Untitled Flow' })
    });
    if (data?.flow) navigate(`/flows/${data.flow.id}`);
  };

  const handleCloneTemplate = async (templateId) => {
    const data = await apiFetch(`/api/flows/templates/${templateId}/clone`, { method: 'POST' });
    if (data?.flow) navigate(`/flows/${data.flow.id}`);
  };

  const handleRunFlow = async (flowId) => {
    const data = await apiFetch(`/api/flows/${flowId}/execute`, { method: 'POST' });
    if (data?.execution) navigate(`/flows/${flowId}/run/${data.execution.id}`);
  };

  const completedCount = executions.filter(e => e.status === 'completed').length;
  const successRate = executions.length > 0 ? Math.round((completedCount / executions.length) * 100) : 0;
  const scheduledCount = flows.filter(f => f.trigger_type === 'scheduled').length;

  const TABS = [
    { id: 'flows', label: 'My Flows' },
    { id: 'templates', label: 'Templates' },
    { id: 'executions', label: 'Executions' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Automation Flows</h1>
          <button onClick={handleNewFlow} className="px-5 py-2 text-sm bg-indigo-500/80 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">
            + New Flow
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-white/[0.08]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 text-sm transition-colors ${tab === t.id ? 'text-white border-b-2 border-indigo-500 font-medium' : 'text-gray-500 hover:text-gray-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : tab === 'flows' ? (
          <div className="grid grid-cols-3 gap-4">
            {flows.map(flow => (
              <FlowCard key={flow.id} flow={flow} onRun={handleRunFlow} />
            ))}
            {flows.length === 0 && <p className="text-gray-600 text-sm col-span-3">No flows yet. Create one or start from a template.</p>}
          </div>
        ) : tab === 'templates' ? (
          <div className="grid grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 hover:border-white/[0.15] transition-colors">
                <div className="text-sm font-semibold text-white mb-1">{t.name}</div>
                <div className="text-xs text-gray-500 mb-4">{t.description}</div>
                <button
                  onClick={() => handleCloneTemplate(t.id)}
                  className="px-3 py-1.5 text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-md hover:bg-indigo-500/25"
                >
                  Use Template
                </button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-gray-600 text-sm col-span-3">No templates available yet.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm text-white">{e.flow_name}</span>
                  <span className="text-xs text-gray-600 ml-3">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  e.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' :
                  e.status === 'failed' ? 'bg-red-500/10 text-red-300' :
                  e.status === 'running' ? 'bg-blue-500/10 text-blue-300' :
                  'bg-gray-500/10 text-gray-400'
                }`}>{e.status}</span>
              </div>
            ))}
            {executions.length === 0 && <p className="text-gray-600 text-sm">No executions yet.</p>}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mt-6">
          {[
            { label: 'Active Flows', value: flows.length, color: 'text-white' },
            { label: 'Total Runs', value: executions.length, color: 'text-emerald-400' },
            { label: 'Scheduled', value: scheduledCount, color: 'text-blue-400' },
            { label: 'Success Rate', value: `${successRate}%`, color: 'text-amber-400' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/FlowsListPage.jsx src/components/flows/FlowCard.jsx
git commit -m "feat(flows): add flows list page with templates tab, executions tab, stats"
```

---

## Task 9: Route Registration + Sidebar Nav

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/VideoAdvertCreator.jsx`

- [ ] **Step 1: Add routes in App.jsx**

Add imports at the top:
```jsx
import FlowsListPage from './pages/FlowsListPage';
import FlowBuilderPage from './pages/FlowBuilderPage';
```

Add routes (before the catch-all `path="*"` route):
```jsx
<Route path="/flows" element={<ProtectedRoute><FlowsListPage /></ProtectedRoute>} />
<Route path="/flows/new" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
<Route path="/flows/:id" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
<Route path="/flows/:id/run/:executionId" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
```

- [ ] **Step 2: Add sidebar nav item in VideoAdvertCreator.jsx**

Add a new "Automation" section in the sidebar, after the Social Tools section. Follow the existing pattern with `expandedSections` state and `toggleSection`.

Add to `expandedSections` initial state:
```js
automationTools: true,
```

Add sidebar section (after Social Tools):
```jsx
{/* Automation Section */}
<div>
  <button
    onClick={() => toggleSection('automationTools')}
    className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
  >
    <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
      <Zap className="w-4 h-4 text-[#2C666E]" /> Automation
    </span>
    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.automationTools ? 'rotate-180' : ''}`} />
  </button>
  {expandedSections.automationTools && (
    <div className="mt-2 space-y-1">
      <div
        onClick={() => navigate('/flows')}
        className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#2C666E]" />
          <span className="text-xs font-medium text-gray-800">Flows</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Build & run automation pipelines</p>
      </div>
    </div>
  )}
</div>
```

Import `Zap` and `GitBranch` from `lucide-react` if not already imported.

- [ ] **Step 3: Verify the app builds**

```bash
cd /Users/stuarta/stitch && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/pages/VideoAdvertCreator.jsx
git commit -m "feat(flows): add routes and sidebar navigation for automation flows"
```

---

## Task 10: Scheduled Flow Runner

**Files:**
- Create: `api/lib/scheduledFlowRunner.js`
- Modify: `server.js`

- [ ] **Step 1: Create the scheduled flow runner**

```js
// api/lib/scheduledFlowRunner.js
import { Cron } from 'croner';
import { executeFlow } from './flowExecutor.js';
import { getUserKeys } from './getUserKeys.js';

export function startScheduledFlowRunner(supabase) {
  console.log('[flows] Scheduled flow runner started');

  setInterval(async () => {
    try {
      const { data: flows } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('trigger_type', 'scheduled')
        .not('schedule_cron', 'is', null);

      if (!flows?.length) return;

      const now = new Date();

      for (const flow of flows) {
        try {
          const cron = new Cron(flow.schedule_cron);
          const prev = cron.previousRun(); // croner v9+ uses previousRun(), v8 uses previous()
          if (!prev) continue;

          // Dedup: skip if last_triggered_at is after the previous cron tick
          if (flow.last_triggered_at && new Date(flow.last_triggered_at) >= prev) continue;

          // Check if prev is within the last 60s (current polling window)
          if (now - prev > 60000) continue;

          console.log(`[flows] Triggering scheduled flow: ${flow.name} (${flow.id})`);

          // Update last_triggered_at
          await supabase
            .from('automation_flows')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', flow.id);

          // Execute
          // getUserKeys(userId, userEmail) — look up email for OWNER_EMAIL fallback
          let userEmail = null;
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(flow.user_id);
            userEmail = userData?.user?.email || null;
          } catch (e) { /* proceed without email — non-owner users still work */ }
          const keys = await getUserKeys(flow.user_id, userEmail);
          await executeFlow(flow, supabase, keys, flow.user_id, userEmail);
        } catch (err) {
          console.error(`[flows] Error triggering flow ${flow.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[flows] Scheduled runner error:', err.message);
    }
  }, 60000); // Every 60 seconds
}
```

- [ ] **Step 2: Register in server.js**

Add alongside existing scheduled task initialization:

```js
import('./api/lib/scheduledFlowRunner.js').then(m => m.startScheduledFlowRunner(supabase));
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/scheduledFlowRunner.js server.js
git commit -m "feat(flows): add scheduled flow runner with cron parsing and dedup"
```

---

## Task 11: Add Remaining Node Types — Batch 1 (Image + Video)

**Files:**
- Modify: `api/lib/nodeTypeRegistry.js`

- [ ] **Step 1: Add image node types**

Add `imagineer-edit` (inputs: image + prompt + style, output: image_url), `turnaround-sheet` (inputs: prompt + style, output: image_url), `smoosh` (inputs: image + image2, output: image_url). Follow the same pattern as `imagineer-generate`. Import helpers from `mediaGenerator.js`.

- [ ] **Step 2: Add video node types**

Add `animate-image` (inputs: image + prompt, output: video_url, config: model + duration), `motion-transfer` (inputs: video + reference_image, output: video_url). Import `animateImageV2` from `mediaGenerator.js`.

- [ ] **Step 3: Verify and commit**

```bash
cd /Users/stuarta/stitch && node -e "import('./api/lib/nodeTypeRegistry.js').then(m => console.log(Object.keys(m.default).length, 'node types'))"
git add api/lib/nodeTypeRegistry.js && git commit -m "feat(flows): add image + video node types"
```

---

## Task 11b: Add Remaining Node Types — Batch 2 (Audio + Content)

**Files:**
- Modify: `api/lib/nodeTypeRegistry.js`

- [ ] **Step 1: Add audio node types**

Add `voiceover` (input: text, output: audio_url, config: voice/speed — calls `generateGeminiVoiceover`), `music` (input: mood_prompt, output: audio_url, config: duration — calls `generateMusic`), `captions` (input: video, output: video_url — calls burnCaptions via internal import).

- [ ] **Step 2: Add content node types**

Add `script-generator` (input: topic + niche, output: script as json — calls `generateScript`), `prompt-builder` (input: description + style + props, output: prompt as string — calls cohesive prompt builder), `carousel-builder` (input: content + platform, output: carousel_id as string), `linkedin-post` (input: content, output: post_id as string).

- [ ] **Step 3: Verify and commit**

```bash
cd /Users/stuarta/stitch && node -e "import('./api/lib/nodeTypeRegistry.js').then(m => console.log(Object.keys(m.default).length, 'node types'))"
git add api/lib/nodeTypeRegistry.js && git commit -m "feat(flows): add audio + content node types"
```

---

## Task 11c: Add Remaining Node Types — Batch 3 (Publish + Utility)

**Files:**
- Modify: `api/lib/nodeTypeRegistry.js`

- [ ] **Step 1: Add publish node types**

Add `youtube-upload` (input: video + title + description, output: video_id), `tiktok-publish` (input: video/image, output: post_id), `instagram-post` (input: image + caption, output: post_id), `facebook-post` (input: image + text, output: post_id). Each calls the respective publisher from `api/lib/`.

- [ ] **Step 2: Add utility node types**

Add `video-trim` (input: video + start + end, output: video_url), `extract-frame` (input: video + frame_type, output: image_url). Import from `pipelineHelpers.js`.

- [ ] **Step 3: Verify final count and commit**

```bash
cd /Users/stuarta/stitch && node -e "import('./api/lib/nodeTypeRegistry.js').then(m => console.log(Object.keys(m.default).length, 'node types'))"
```

Expected: ~21 node types

```bash
git add api/lib/nodeTypeRegistry.js && git commit -m "feat(flows): add publish + utility node types"
```

---

## Task 11d: Seed Pre-built Templates

**Files:**
- Create: `api/flows/seed-templates.js` (CLI script, NOT an Express handler)

- [ ] **Step 1: Create the template seeder script**

Creates the 5 spec-defined templates as `automation_flows` rows with `is_template = true` and `user_id = null`. Each template has a pre-wired `graph_json` with nodes and edges.

Templates to seed:
1. **Blog to Multi-Platform** — Script → Imagineer + Carousel + LinkedIn (parallel) → JumpStart
2. **Image to Short Video** — Imagineer → JumpStart → Captions → YouTube
3. **Character Sheet Pipeline** — Imagineer → Turnaround → Save to Library
4. **Carousel + Slideshow** — Script → Carousel → Save to Library
5. **Social Media Blast** — Script → LinkedIn + Instagram + Facebook + TikTok (parallel)

Run: `node api/flows/seed-templates.js`

- [ ] **Step 2: Run the seeder and verify**

```bash
cd /Users/stuarta/stitch && node api/flows/seed-templates.js
```

- [ ] **Step 3: Commit**

```bash
git add api/flows/seed-templates.js && git commit -m "feat(flows): add template seeder with 5 pre-built flow templates"
```

---

## Task 12: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/stuarta/stitch && npm run start
```

- [ ] **Step 2: Verify the flows list page loads**

Open `http://localhost:4390/flows`. Should see the Automation Flows page with My Flows, Templates, and Executions tabs.

- [ ] **Step 3: Create and edit a flow**

Click "+ New Flow". Verify the builder opens with the node palette, blank canvas, and config panel.

- [ ] **Step 4: Build a simple 2-node flow**

Drag "Imagineer Generate" onto canvas. Drag "Save to Library" onto canvas. Wire the `image_url` output to the `url` input. Click Imagineer node and configure model + aspect ratio.

- [ ] **Step 5: Run the flow and verify execution**

Click "Run Flow". Verify navigation to execution view. Verify node status overlays update (blue spinner → green checkmark). Verify execution log shows timestamps.

- [ ] **Step 6: Verify parallel execution**

Create a flow: Manual Input → Imagineer + JumpStart (parallel). Verify both start concurrently.

- [ ] **Step 7: Verify sidebar navigation**

Open `/studio`. Verify "Automation" section appears in sidebar with "Flows" nav item. Click it — should navigate to `/flows`.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A && git commit -m "fix(flows): address issues found during e2e verification"
```

---

## Task 13: Deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to Fly.io**

```bash
fly deploy
```

- [ ] **Step 3: Verify production**

Open `https://stitchstudios.app/flows` and verify the page loads.
