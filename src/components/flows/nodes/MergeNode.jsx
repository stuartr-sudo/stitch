import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * Merge Node — synchronization point for heterogeneous inputs.
 * Waits for ALL inputs to arrive, then bundles them into a single output object.
 * Different from Aggregator: Merge is for combining different data types,
 * Aggregator is for collecting array iteration results.
 */
function MergeNode({ data, selected }) {
  const { stepState } = data;
  const isRunning = stepState?.status === 'running';
  const isCompleted = stepState?.status === 'completed';

  return (
    <div
      className={`w-[220px] rounded-xl overflow-hidden bg-[#14141f] border transition-all duration-200
        ${selected ? 'ring-2 ring-teal-500/40 border-teal-500/30' : 'border-teal-700/30'}
        ${isRunning ? 'ring-2 ring-blue-500/50' : ''}
        ${isCompleted ? 'ring-2 ring-emerald-500/50' : ''}
        shadow-md shadow-black/30
      `}
    >
      <div className="px-3 py-2.5 bg-teal-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⊕</span>
          <span className="text-xs font-semibold text-teal-200">Merge</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-teal-400/60">control</span>
      </div>

      <div className="px-3 py-2 flex items-center justify-center">
        <div className="text-[10px] text-slate-500">Wait & combine all inputs</div>
      </div>

      {/* Inputs — flexible, accepts up to 5 named inputs */}
      <div className="px-3 py-1.5 border-t border-teal-800/20 space-y-1">
        {['input_a', 'input_b', 'input_c', 'input_d', 'input_e'].map(id => (
          <div key={id} className="flex items-center gap-1.5 relative">
            <Handle type="target" position={Position.Left} id={id}
              style={{ left: -5, background: '#14b8a6', width: 10, height: 10, border: '2px solid #14141f' }} />
            <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-400">{id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
          </div>
        ))}
      </div>

      {/* Output — merged bundle */}
      <div className="px-3 py-1.5 border-t border-teal-800/20">
        <div className="flex items-center justify-end gap-1.5 relative">
          <span className="text-[10px] text-slate-400">merged (json)</span>
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 flex-shrink-0" />
          <Handle type="source" position={Position.Right} id="merged"
            style={{ right: -5, background: '#14b8a6', width: 10, height: 10, border: '2px solid #14141f' }} />
        </div>
      </div>
    </div>
  );
}

export default memo(MergeNode);
