import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const deleteEdge = (e) => {
    e.stopPropagation();
    setEdges(eds => eds.filter(e => e.id !== id));
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{ stroke: selected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', strokeWidth: selected ? 2 : 1.5 }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-auto nodrag nopan"
          >
            <button
              onClick={deleteEdge}
              className="w-5 h-5 rounded-full bg-gray-800 border border-white/20 text-white/60 hover:bg-red-600 hover:border-red-500 hover:text-white flex items-center justify-center transition-colors"
              style={{ fontSize: 10, lineHeight: 1 }}
              title="Delete connection"
            >
              ✕
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
