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
