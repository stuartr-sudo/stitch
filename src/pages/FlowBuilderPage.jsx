// State management: nodes/edges live here (single source of truth) using
// React Flow's useNodesState/useEdgesState hooks. FlowCanvas is controlled.
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import { apiFetch } from '@/lib/api';
import FlowCanvas from '@/components/flows/FlowCanvas';
import NodePalette from '@/components/flows/NodePalette';
import NodeConfigModal from '@/components/flows/NodeConfigModal';
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

  // Modal state for double-click config
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configModalNode, setConfigModalNode] = useState(null);

  // Brand kits + connected accounts for config modal
  const [brandKits, setBrandKits] = useState([]);
  const [connections, setConnections] = useState([]);

  // Load node types
  useEffect(() => {
    apiFetch('/api/flows/node-types').then(r => r.json()).then(data => {
      if (data?.nodeTypes) setNodeTypesMap(data.nodeTypes);
    });
  }, []);

  // Load brand kits and connected accounts
  useEffect(() => {
    apiFetch('/api/brand/kit').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setBrandKits(data);
      else if (data?.brand_kit) setBrandKits(Array.isArray(data.brand_kit) ? data.brand_kit : [data.brand_kit]);
    }).catch(() => {});
    apiFetch('/api/accounts/connections').then(r => r.json()).then(data => {
      if (data?.connections) setConnections(data.connections);
      else if (Array.isArray(data)) setConnections(data);
    }).catch(() => {});
  }, []);

  // Load flow
  useEffect(() => {
    if (id && id !== 'new') {
      apiFetch(`/api/flows/${id}`).then(r => r.json()).then(data => {
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
      const data = await apiFetch(`/api/flows/executions/${executionId}`).then(r => r.json());
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
      headers: { 'Content-Type': 'application/json' },
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
    setEdges(eds => addEdge(params, eds));
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

  // Double-click handler — opens the rich config modal
  const handleNodeDoubleClick = useCallback((event, node) => {
    setConfigModalNode(node);
    setConfigModalOpen(true);
  }, []);

  // Modal config change — updates the node in the graph
  const handleModalConfigChange = useCallback((newConfig) => {
    if (!configModalNode) return;
    setNodes(prev => prev.map(n =>
      n.id === configModalNode.id ? {
        ...n,
        data: { ...n.data, config: newConfig },
        errorHandling: newConfig.errorHandling || 'stop'
      } : n
    ));
    // Keep modal node in sync
    setConfigModalNode(prev => prev ? { ...prev, data: { ...prev.data, config: newConfig } } : prev);
  }, [configModalNode, setNodes]);

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
    const data = await apiFetch(`/api/flows/${flow.id}/execute`, { method: 'POST' }).then(r => r.json());
    if (data?.execution) {
      navigate(`/flows/${flow.id}/run/${data.execution.id}`);
    }
  };

  // Pause/Cancel
  const handlePause = async () => {
    if (!executionId) return;
    await apiFetch(`/api/flows/executions/${executionId}/pause`, { method: 'POST' }).then(r => r.json());
  };
  const handleCancel = async () => {
    if (!executionId) return;
    await apiFetch(`/api/flows/executions/${executionId}/cancel`, { method: 'POST' }).then(r => r.json());
  };

  const selectedNodeType = selectedNode?.data?.nodeType;
  const isExecuting = !!executionId;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a12]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 bg-[#0f0f18]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/flows')} className="text-slate-400 hover:text-slate-200 text-sm">&larr; Flows</button>
          <span className="text-sm font-semibold text-slate-100">{flow?.name || 'New Flow'}</span>
          {saving && <span className="text-[11px] text-slate-500">Saving...</span>}
          {!saving && flow?.id && <span className="text-[11px] text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded">Saved</span>}
        </div>
        <div className="flex gap-2">
          {isExecuting ? (
            <>
              <button onClick={handlePause} className="px-3 py-1.5 text-xs bg-amber-900/30 border border-amber-700/40 text-amber-400 rounded-md hover:bg-amber-900/50">Pause</button>
              <button onClick={handleCancel} className="px-3 py-1.5 text-xs bg-red-900/30 border border-red-700/40 text-red-400 rounded-md hover:bg-red-900/50">Cancel</button>
            </>
          ) : (
            <>
              <button className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-600/40 text-slate-300 rounded-md hover:bg-slate-700">Schedule</button>
              <button onClick={handleRun} className="px-4 py-1.5 text-xs bg-[#2C666E] text-white font-semibold rounded-md hover:bg-[#07393C]">&#9654; Run Flow</button>
            </>
          )}
        </div>
      </div>

      {/* Main content — 2-panel layout: palette + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {!isExecuting && <NodePalette nodeTypes={nodeTypesMap} selectedNode={selectedNode} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeSelect={setSelectedNode}
            onNodeDoubleClick={handleNodeDoubleClick}
            onDrop={handleDrop}
            stepStates={execution?.step_states}
          />
          {isExecuting && <ExecutionLog execution={execution} />}
        </div>
      </div>

      {/* Rich config modal — opens on double-click */}
      <NodeConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        node={configModalNode}
        config={configModalNode?.data?.config || {}}
        onConfigChange={handleModalConfigChange}
        brandKits={brandKits}
        connections={connections}
        edges={edges}
        nodes={nodes}
      />
    </div>
  );
}
