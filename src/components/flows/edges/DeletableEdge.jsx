import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';

// Type-based edge colors matching port colors
const EDGE_COLORS = {
  string: '#94a3b8',
  image:  '#a855f7',
  video:  '#3b82f6',
  audio:  '#10b981',
  json:   '#f59e0b',
  'image[]': '#a855f7',
  'video[]': '#3b82f6',
};

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  source,
  sourceHandleId,
}) {
  const { setEdges, getNodes } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  // Determine edge color from source port type
  let edgeColor = '#475569';
  try {
    const nodes = getNodes();
    const sourceNode = nodes.find(n => n.id === source);
    if (sourceNode?.data?.nodeType?.outputs) {
      const port = sourceNode.data.nodeType.outputs.find(o => o.id === sourceHandleId);
      if (port) edgeColor = EDGE_COLORS[port.type] || EDGE_COLORS.string;
    }
  } catch (e) { /* fallback to default */ }

  // Check if the source node is currently running (for animated edge)
  let isFlowing = false;
  try {
    const nodes = getNodes();
    const sourceNode = nodes.find(n => n.id === source);
    isFlowing = sourceNode?.data?.stepState?.status === 'running' || sourceNode?.data?.stepState?.status === 'completed';
  } catch (e) { /* no animation */ }

  const deleteEdge = (e) => {
    e.stopPropagation();
    setEdges(eds => eds.filter(e => e.id !== id));
  };

  return (
    <>
      {/* Glow layer (behind the main edge) */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 4 : 2,
          opacity: 0.15,
          filter: 'blur(4px)',
        }}
      />
      {/* Main edge */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: selected ? '#fff' : edgeColor,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.7,
          strokeDasharray: isFlowing ? '8 4' : 'none',
          animation: isFlowing ? 'flowDash 1s linear infinite' : 'none',
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-auto nodrag nopan"
          >
            <button
              onClick={deleteEdge}
              className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:bg-red-900/50 hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition-colors shadow-lg"
              style={{ fontSize: 10, lineHeight: 1 }}
              title="Delete connection"
            >
              &#10005;
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
      <style>{`
        @keyframes flowDash {
          to { stroke-dashoffset: -24; }
        }
      `}</style>
    </>
  );
}
