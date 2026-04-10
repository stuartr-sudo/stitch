/**
 * Automation Flows API — catch-all handler
 *
 * GET    /api/flows/node-types               — list available node types for the palette
 * GET    /api/flows/templates                — list pre-built templates
 * POST   /api/flows/templates/:id/clone      — clone template into user's flows
 *
 * GET    /api/flows/executions/:execId       — get execution status
 * POST   /api/flows/executions/:execId/pause
 * POST   /api/flows/executions/:execId/resume
 * POST   /api/flows/executions/:execId/retry/:nodeId
 * POST   /api/flows/executions/:execId/cancel
 *
 * GET    /api/flows                          — list user's flows
 * POST   /api/flows                          — create flow
 * GET    /api/flows/:id                      — get flow
 * PUT    /api/flows/:id                      — update flow
 * DELETE /api/flows/:id                      — delete flow
 * POST   /api/flows/:id/execute              — execute flow
 * GET    /api/flows/:id/executions           — list executions for this flow
 */

import { executeFlow, getActiveExecutor, resumeExecution } from '../lib/flowExecutor.js';
import { getNodeTypesByCategory } from '../lib/nodeTypeRegistry.js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

// Note: getUserKeys(userId, userEmail) — does NOT accept supabase as first arg.

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  const userId = req.user?.id;
  const url = new URL(req.url || req.originalUrl, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/flows', '').split('/').filter(Boolean);
  const method = req.method;

  try {
    // GET /api/flows/node-types — list available node types for the palette
    // MUST come before /:id route
    if (pathParts[0] === 'node-types' && method === 'GET') {
      return res.json({ nodeTypes: getNodeTypesByCategory() });
    }

    // GET /api/flows/templates — list pre-built templates
    // MUST come before /:id route
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
    // MUST come before /:id route
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

    // POST /api/flows/trigger/:flowId — webhook trigger for external events
    // Allows other tools (script completion, site publish) to trigger a flow.
    if (pathParts[0] === 'trigger' && pathParts[1] && method === 'POST') {
      const flowId = pathParts[1];
      const { data: flow, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      if (error || !flow) return res.status(404).json({ error: 'Flow not found' });

      // Inject trigger data as flow variables
      const triggerData = req.body || {};
      if (Object.keys(triggerData).length > 0) {
        flow.graph_json = {
          ...flow.graph_json,
          variables: { ...flow.graph_json.variables, ...triggerData, _trigger: 'webhook', _triggered_at: new Date().toISOString() },
        };
      }

      const keys = await getUserKeys(flow.user_id, null);
      const execution = await executeFlow(flow, supabase, keys, flow.user_id, null);
      return res.json({ execution, triggered: true });
    }

    // Execution routes: /api/flows/executions/:execId/...
    // MUST come before /:id route
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
        const { data: exec } = await supabase
          .from('automation_executions')
          .select('*, automation_flows(*)')
          .eq('id', execId)
          .single();
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

      // POST /api/flows/executions/:execId/resume-from-failed — new execution keeping completed nodes
      if (action === 'resume-from-failed' && method === 'POST') {
        try {
          const keys = await getUserKeys(userId, req.user?.email);
          const execution = await resumeExecution(execId, supabase, keys, userId, req.user?.email);
          return res.json({ execution, resumed: true });
        } catch (err) {
          return res.status(400).json({ error: err.message });
        }
      }

      // POST /api/flows/executions/:execId/retry/:nodeId — retry a failed node
      if (action === 'retry' && pathParts[3] && method === 'POST') {
        const nodeId = pathParts[3];
        const { data: exec } = await supabase
          .from('automation_executions')
          .select('*, automation_flows(*)')
          .eq('id', execId)
          .single();
        if (!exec) return res.status(404).json({ error: 'Execution not found' });
        // Clear the failed node's state so it becomes "ready" again
        const stepStates = { ...(exec.step_states || {}) };
        delete stepStates[nodeId];
        await supabase
          .from('automation_executions')
          .update({ step_states: stepStates, status: 'running' })
          .eq('id', execId);
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
        await supabase
          .from('automation_executions')
          .update({ status: 'cancelled', completed_at: new Date().toISOString() })
          .eq('id', execId);
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
          .insert({
            user_id: userId,
            name: name || 'Untitled Flow',
            description,
            graph_json: graph_json || { nodes: [], edges: [] }
          })
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

    // POST /api/flows/:id/execute-with-inputs — run with dynamic form values injected
    if (subPath === 'execute-with-inputs' && method === 'POST') {
      const { data: flow, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      if (error || !flow) return res.status(404).json({ error: 'Flow not found' });

      // Inject user-supplied input values into source node configs
      const { inputs = {} } = req.body;
      if (Object.keys(inputs).length > 0) {
        flow.graph_json = {
          ...flow.graph_json,
          nodes: (flow.graph_json.nodes || []).map(n => {
            if (inputs[n.id] !== undefined) {
              return {
                ...n,
                data: {
                  ...n.data,
                  config: { ...n.data?.config, resolvedValue: inputs[n.id] },
                },
              };
            }
            return n;
          }),
        };
      }

      const keys = await getUserKeys(userId, req.user?.email);
      const execution = await executeFlow(flow, supabase, keys, userId, req.user?.email);
      return res.json({ execution });
    }

    // POST /api/flows/:id/dry-run — execute without calling APIs
    if (subPath === 'dry-run' && method === 'POST') {
      const { data: flow, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      if (error || !flow) return res.status(404).json({ error: 'Flow not found' });

      const keys = await getUserKeys(userId, req.user?.email);
      const execution = await executeFlow(flow, supabase, keys, userId, req.user?.email, { dryRun: true });
      return res.json({ execution, mode: 'dry_run' });
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
