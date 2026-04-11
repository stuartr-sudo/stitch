import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const CHECK_ICONS = { pass: '✓', fail: '✕', warn: '⚠', loading: '◌' };
const CHECK_COLORS = {
  pass: 'text-emerald-400',
  fail: 'text-red-400',
  warn: 'text-amber-400',
  loading: 'text-slate-500 animate-pulse',
};

function CheckRow({ status, label, detail }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className={`text-sm font-bold mt-0.5 w-5 text-center flex-shrink-0 ${CHECK_COLORS[status]}`}>
        {CHECK_ICONS[status]}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${status === 'fail' ? 'text-red-300' : status === 'warn' ? 'text-amber-300' : 'text-slate-200'}`}>
          {label}
        </div>
        {detail && (
          <div className="text-[11px] text-slate-500 mt-0.5">{detail}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Preflight validation modal — runs before flow execution.
 * Checks config completeness, type compatibility, API health, OAuth tokens, and estimates cost.
 */
export default function PreflightCheck({ open, onClose, onConfirm, nodes, edges, nodeTypesMap, connections }) {
  const [checks, setChecks] = useState([]);
  const [running, setRunning] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    runChecks();
  }, [open]);

  const runChecks = async () => {
    setRunning(true);
    const results = [];

    // 1. Check for empty flow
    if (nodes.length === 0) {
      results.push({ status: 'fail', label: 'Flow is empty', detail: 'Add at least one node to run.' });
      setChecks(results);
      setHasErrors(true);
      setRunning(false);
      return;
    }
    results.push({ status: 'pass', label: `${nodes.length} node${nodes.length > 1 ? 's' : ''} in flow` });

    // 2. Check required inputs have connections or config
    let missingInputs = 0;
    for (const node of nodes) {
      const nodeType = node.data?.nodeType;
      if (!nodeType?.inputs) continue;
      for (const input of nodeType.inputs) {
        if (!input.required) continue;
        const hasConnection = edges.some(e => e.target === node.id && e.targetHandle === input.id);
        const hasConfig = node.data?.config?.[input.id];
        if (!hasConnection && !hasConfig) {
          missingInputs++;
          results.push({
            status: 'fail',
            label: `${nodeType.label}: missing required "${input.id}"`,
            detail: 'Connect an upstream node or set a default in the config.'
          });
        }
      }
    }
    if (missingInputs === 0) {
      results.push({ status: 'pass', label: 'All required inputs connected or configured' });
    }

    // 3. Check type compatibility of edges
    let incompatibleEdges = 0;
    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!sourceNode?.data?.nodeType || !targetNode?.data?.nodeType) continue;
      const sourcePort = sourceNode.data.nodeType.outputs?.find(o => o.id === edge.sourceHandle);
      const targetPort = targetNode.data.nodeType.inputs?.find(i => i.id === edge.targetHandle);
      if (sourcePort && targetPort) {
        const compatible = targetPort.type === 'string' || sourcePort.type === targetPort.type;
        if (!compatible) {
          incompatibleEdges++;
          results.push({
            status: 'fail',
            label: `Type mismatch: ${sourceNode.data.nodeType.label}.${sourcePort.id} (${sourcePort.type}) → ${targetNode.data.nodeType.label}.${targetPort.id} (${targetPort.type})`,
            detail: 'Disconnect this edge and rewire with compatible types.'
          });
        }
      }
    }
    if (incompatibleEdges === 0) {
      results.push({ status: 'pass', label: 'All connections are type-compatible' });
    }

    // 4. Check for orphan nodes (no connections at all)
    const orphans = nodes.filter(n => {
      const hasIncoming = edges.some(e => e.target === n.id);
      const hasOutgoing = edges.some(e => e.source === n.id);
      const isSource = !n.data?.nodeType?.inputs?.length;
      return !hasIncoming && !hasOutgoing && !isSource;
    });
    if (orphans.length > 0) {
      results.push({
        status: 'warn',
        label: `${orphans.length} disconnected node${orphans.length > 1 ? 's' : ''}`,
        detail: `${orphans.map(n => n.data?.nodeType?.label).join(', ')} — these won't execute. Connect or remove them.`
      });
    }

    // 5. Check for cycles (simple DFS)
    const hasCycle = detectCycle(nodes, edges);
    if (hasCycle) {
      results.push({ status: 'fail', label: 'Cycle detected in flow', detail: 'Flows must be acyclic (DAG). Remove the circular connection.' });
    } else {
      results.push({ status: 'pass', label: 'No cycles detected (valid DAG)' });
    }

    // 6. Check publish nodes have OAuth tokens
    const publishNodes = nodes.filter(n => n.data?.nodeType?.category === 'publish');
    if (publishNodes.length > 0) {
      const platformMap = {
        'youtube-upload': 'youtube',
        'tiktok-publish': 'tiktok',
        'instagram-post': 'instagram',
        'facebook-post': 'facebook',
        'linkedin-post': 'linkedin',
      };
      for (const pNode of publishNodes) {
        const platform = platformMap[pNode.data?.nodeType?.id];
        if (platform && connections) {
          const conn = connections.find(c => c.platform === platform);
          if (!conn || conn.status === 'expired') {
            results.push({
              status: 'fail',
              label: `${pNode.data.nodeType.label}: ${platform} not connected`,
              detail: 'Go to Settings → Connected Accounts to connect this platform.'
            });
          } else {
            results.push({ status: 'pass', label: `${pNode.data.nodeType.label}: ${platform} connected` });
          }
        }
      }
    }

    // 7. Check API provider health
    try {
      const health = await apiFetch('/api/providers/health').then(r => r.json());
      if (health?.providers) {
        for (const [provider, status] of Object.entries(health.providers)) {
          if (status === 'ok' || status === true) {
            results.push({ status: 'pass', label: `${provider} API healthy` });
          } else {
            results.push({ status: 'warn', label: `${provider} API may be degraded`, detail: 'Some nodes using this provider might fail.' });
          }
        }
      }
    } catch {
      results.push({ status: 'warn', label: 'Could not check API health', detail: 'Provider status unknown — flow may still work.' });
    }

    // 8. Estimate cost
    const nodeCount = nodes.length;
    const imageNodes = nodes.filter(n => n.data?.nodeType?.category === 'image').length;
    const videoNodes = nodes.filter(n => n.data?.nodeType?.category === 'video').length;
    const audioNodes = nodes.filter(n => n.data?.nodeType?.category === 'audio').length;
    const estimatedCost = (imageNodes * 0.04) + (videoNodes * 0.30) + (audioNodes * 0.05) + (nodeCount * 0.01);
    results.push({
      status: 'pass',
      label: `Estimated cost: $${estimatedCost.toFixed(2)}`,
      detail: `${imageNodes} image, ${videoNodes} video, ${audioNodes} audio generation${videoNodes > 0 ? ' — video is the most expensive' : ''}`
    });

    setChecks(results);
    setHasErrors(results.some(r => r.status === 'fail'));
    setRunning(false);
  };

  if (!open) return null;

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#12121f] border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/40">
          <h2 className="text-lg font-semibold text-slate-100">Preflight Check</h2>
          <p className="text-xs text-slate-500 mt-0.5">Validating flow before execution</p>
        </div>

        {/* Checks list */}
        <div className="px-6 py-3 max-h-[400px] overflow-y-auto divide-y divide-slate-800/50">
          {checks.map((check, i) => (
            <CheckRow key={i} {...check} />
          ))}
          {running && (
            <CheckRow status="loading" label="Running checks..." />
          )}
        </div>

        {/* Summary bar */}
        {!running && (
          <div className="px-6 py-3 border-t border-slate-700/40 flex items-center gap-3">
            <span className="text-emerald-400 text-xs font-medium">{passCount} passed</span>
            {failCount > 0 && <span className="text-red-400 text-xs font-medium">{failCount} failed</span>}
            {warnCount > 0 && <span className="text-amber-400 text-xs font-medium">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700/40 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          {hasErrors ? (
            <button
              onClick={onConfirm}
              className="px-5 py-2 text-sm bg-amber-900/40 border border-amber-700/40 text-amber-300 rounded-lg hover:bg-amber-900/60 transition-colors"
            >
              Run Anyway
            </button>
          ) : (
            <button
              onClick={onConfirm}
              disabled={running}
              className="px-5 py-2 text-sm bg-[#2C666E] text-white font-semibold rounded-lg hover:bg-[#07393C] transition-colors disabled:opacity-50"
            >
              ▶ Run Flow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Simple DFS cycle detection */
function detectCycle(nodes, edges) {
  const adj = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of edges) {
    if (adj[e.source]) adj[e.source].push(e.target);
  }
  const visited = new Set();
  const inStack = new Set();

  function dfs(nodeId) {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of (adj[nodeId] || [])) {
      if (dfs(neighbor)) return true;
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const n of nodes) {
    if (dfs(n.id)) return true;
  }
  return false;
}
