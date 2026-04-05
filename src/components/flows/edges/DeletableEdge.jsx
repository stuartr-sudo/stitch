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
        style={{ stroke: selected ? '#475569' : '#cbd5e1', strokeWidth: selected ? 2 : 1.5 }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-auto nodrag nopan"
          >
            <button
              onClick={deleteEdge}
              className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm"
              style={{ fontSize: 10, lineHeight: 1 }}
              title="Delete connection"
            >
              &#10005;
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
