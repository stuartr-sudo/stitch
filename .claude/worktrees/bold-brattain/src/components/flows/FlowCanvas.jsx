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
import IteratorNode from './nodes/IteratorNode';
import AggregatorNode from './nodes/AggregatorNode';
import SplitNode from './nodes/SplitNode';
import MergeNode from './nodes/MergeNode';
import RunFlowNode from './nodes/RunFlowNode';
import DeletableEdge from './edges/DeletableEdge';

const nodeTypes = {
  stitch: StitchNode,
  iterator: IteratorNode,
  aggregator: AggregatorNode,
  split: SplitNode,
  merge: MergeNode,
  'run-flow': RunFlowNode,
};
const edgeTypes = { default: DeletableEdge };

const defaultEdgeOptions = {
  type: 'default',
  animated: false,
};

// Category colors for minimap nodes
const MINIMAP_COLORS = {
  input:   '#94a3b8',
  image:   '#a855f7',
  video:   '#3b82f6',
  audio:   '#10b981',
  content: '#f59e0b',
  publish: '#ef4444',
  utility: '#64748b',
};

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onNodeDoubleClick,
  onDeleteNode,
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

  // Clear selection when nodes are deleted via keyboard
  const handleNodesDelete = useCallback(() => {
    if (onNodeSelect) onNodeSelect(null);
  }, [onNodeSelect]);

  // Merge step states + delete handler into node data
  const nodesWithStatus = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      stepState: stepStates?.[node.id] || null,
      onDelete: onDeleteNode ? () => onDeleteNode(node.id) : undefined,
    }
  }));

  // Color minimap nodes by category
  const minimapNodeColor = (node) => {
    const cat = node.data?.nodeType?.category;
    return MINIMAP_COLORS[cat] || '#64748b';
  };

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
        onNodesDelete={handleNodesDelete}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={['Backspace', 'Delete']}
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0f0f14' }}
      >
        <Controls className="!bg-slate-800/90 !border-slate-600/40 !shadow-lg !rounded-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-600/40 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700" />
        <MiniMap
          className="!bg-slate-900/80 !border-slate-700/40 !rounded-lg !shadow-lg"
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
        <Background variant="dots" gap={30} size={1} color="#1a1a2e" />
      </ReactFlow>
    </div>
  );
}
