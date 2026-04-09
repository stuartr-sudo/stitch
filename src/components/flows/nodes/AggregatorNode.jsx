import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * Aggregator Node — collects results from parallel Iterator branches.
 * Waits for all iterations to complete, then outputs the collected array.
 * Can be placed anywhere downstream of an Iterator.
 */
function AggregatorNode({ data, selected }) {
  const { config, stepState } = data;
  const progress = stepState?.aggregator_progress;
  const isRunning = stepState?.status === 'running';
  const isCompleted = stepState?.status === 'completed';

  return (
    <div
      className={`w-[240px] rounded-xl overflow-hidden bg-[#14141f] border transition-all duration-200
        ${selected ? 'ring-2 ring-cyan-500/40 border-cyan-500/30' : 'border-cyan-700/30'}
        ${isRunning ? 'ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : ''}
        ${isCompleted ? 'ring-2 ring-emerald-500/50' : ''}
        shadow-md shadow-black/30
      `}
    >
      {/* Progress bar */}
      {isRunning && progress && (
        <div className="h-1 bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-500"
            style={{ width: `${(progress.collected / progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2.5 bg-violet-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔻</span>
          <span className="text-xs font-semibold text-violet-200">Aggregator</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-violet-400/60">control</span>
      </div>

      {/* Status */}
      <div className="px-3 py-3 flex items-center justify-center">
        {isRunning && progress ? (
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">{progress.collected}/{progress.total}</div>
            <div className="text-[10px] text-violet-500/60 mt-0.5">Collecting...</div>
          </div>
        ) : isCompleted ? (
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">✓ {stepState?.output?.count || '?'}</div>
            <div className="text-[10px] text-emerald-500/60 mt-0.5">All collected</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl text-violet-500/30">⊕</div>
            <div className="text-[10px] text-slate-500 mt-1">Collect parallel results</div>
          </div>
        )}
      </div>

      {/* Input port */}
      <div className="px-3 py-1.5 border-t border-violet-800/20">
        <div className="flex items-center gap-1.5 relative">
          <Handle
            type="target"
            position={Position.Left}
            id="item"
            style={{ left: -5, background: '#8b5cf6', width: 10, height: 10, border: '2px solid #14141f' }}
          />
          <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-400">item (from iterations)</span>
        </div>
      </div>

      {/* Output ports */}
      <div className="px-3 py-1.5 border-t border-violet-800/20 space-y-1">
        {[
          { id: 'collected', label: 'Collected (array)' },
          { id: 'count', label: 'Count' },
        ].map(port => (
          <div key={port.id} className="flex items-center justify-end gap-1.5 relative">
            <span className="text-[10px] text-slate-400">{port.label}</span>
            <div className="w-2.5 h-2.5 rounded-full border-2 border-violet-500 bg-transparent flex-shrink-0" />
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              style={{ right: -5, background: '#8b5cf6', width: 10, height: 10, border: '2px solid #14141f' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(AggregatorNode);
