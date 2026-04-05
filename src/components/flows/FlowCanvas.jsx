// IMPORTANT: This is a CONTROLLED component. Nodes/edges state lives in the
// parent (FlowBuilderPage). The parent passes nodes, edges, onNodesChange,
// onEdgesChange, and onConnect. This avoids dual-state bugs.
import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StitchNode from './nodes/StitchNode';
import DeletableEdge from './edges/DeletableEdge';

const nodeTypes = { stitch: StitchNode };
const edgeTypes = { default: DeletableEdge };

const defaultEdgeOptions = {
  type: 'default',
  animated: false,
};

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onNodeDoubleClick,
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

  // Deselect node when clicking on empty canvas
  const handlePaneClick = useCallback(() => {
    if (onNodeSelect) onNodeSelect(null);
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
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#f8fafc' }}
      >
        <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-lg" />
        <MiniMap className="!bg-white !border-slate-200 !rounded-lg !shadow-sm" nodeColor="#94a3b8" />
        <Background variant="dots" gap={16} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
}
