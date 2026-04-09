import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * Split Node — explicit parallel branching.
 * One input fires all output ports simultaneously.
 * Visually makes parallel branches clear on the canvas.
 */
function SplitNode({ data, selected }) {
  const { stepState } = data;
  const isCompleted = stepState?.status === 'completed';

  return (
    <div
      className={`w-[200px] rounded-xl overflow-hidden bg-[#14141f] border transition-all duration-200
        ${selected ? 'ring-2 ring-amber-500/40 border-amber-500/30' : 'border-amber-700/30'}
        ${isCompleted ? 'ring-2 ring-emerald-500/50' : ''}
        shadow-md shadow-black/30
      `}
    >
      <div className="px-3 py-2.5 bg-amber-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⑃</span>
          <span className="text-xs font-semibold text-amber-200">Split</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-amber-400/60">control</span>
      </div>

      <div className="px-3 py-2 flex items-center justify-center">
        <div className="text-[10px] text-slate-500">Parallel branching</div>
      </div>

      {/* Input */}
      <div className="px-3 py-1.5 border-t border-amber-800/20">
        <div className="flex items-center gap-1.5 relative">
          <Handle type="target" position={Position.Left} id="value"
            style={{ left: -5, background: '#f59e0b', width: 10, height: 10, border: '2px solid #14141f' }} />
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-400">value (any)</span>
        </div>
      </div>

      {/* Outputs */}
      <div className="px-3 py-1.5 border-t border-amber-800/20 space-y-1">
        {['branch_a', 'branch_b', 'branch_c'].map(id => (
          <div key={id} className="flex items-center justify-end gap-1.5 relative">
            <span className="text-[10px] text-slate-400">{id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <Handle type="source" position={Position.Right} id={id}
              style={{ right: -5, background: '#f59e0b', width: 10, height: 10, border: '2px solid #14141f' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(SplitNode);
