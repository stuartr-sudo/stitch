import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * Run Flow Node — triggers another flow as a sub-flow.
 * Takes a flow_id config and optional input variables.
 * Waits for the sub-flow to complete, then passes its outputs through.
 */
function RunFlowNode({ data, selected }) {
  const { config, stepState } = data;
  const isRunning = stepState?.status === 'running';
  const isCompleted = stepState?.status === 'completed';
  const isFailed = stepState?.status === 'failed';

  return (
    <div
      className={`w-[260px] rounded-xl overflow-hidden bg-[#14141f] border transition-all duration-200
        ${selected ? 'ring-2 ring-indigo-500/40 border-indigo-500/30' : 'border-indigo-700/30'}
        ${isRunning ? 'ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : ''}
        ${isCompleted ? 'ring-2 ring-emerald-500/50' : ''}
        ${isFailed ? 'ring-2 ring-red-500/50' : ''}
        shadow-md shadow-black/30
      `}
    >
      {isRunning && (
        <div className="h-0.5 bg-slate-800 overflow-hidden">
          <div className="h-full bg-indigo-500 animate-pulse w-full" />
        </div>
      )}

      <div className="px-3 py-2.5 bg-indigo-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <span className="text-xs font-semibold text-indigo-200">Run Flow</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-indigo-400/60">chain</span>
      </div>

      <div className="px-3 py-3 text-center">
        {config?.flow_name ? (
          <div className="text-sm text-indigo-300 font-medium">{config.flow_name}</div>
        ) : (
          <div className="text-[10px] text-slate-500">Select a flow to chain</div>
        )}
        {isRunning && <div className="text-[10px] text-blue-400 mt-1">Sub-flow executing...</div>}
        {isCompleted && <div className="text-[10px] text-emerald-400 mt-1">✓ Sub-flow complete</div>}
        {isFailed && <div className="text-[10px] text-red-400 mt-1">✕ {stepState.error?.slice(0, 60)}</div>}
      </div>

      {/* Input: variables to pass */}
      <div className="px-3 py-1.5 border-t border-indigo-800/20">
        <div className="flex items-center gap-1.5 relative">
          <Handle type="target" position={Position.Left} id="input_data"
            style={{ left: -5, background: '#6366f1', width: 10, height: 10, border: '2px solid #14141f' }} />
          <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-400">input data (json)</span>
        </div>
      </div>

      {/* Output */}
      <div className="px-3 py-1.5 border-t border-indigo-800/20">
        <div className="flex items-center justify-end gap-1.5 relative">
          <span className="text-[10px] text-slate-400">result (json)</span>
          <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
          <Handle type="source" position={Position.Right} id="result"
            style={{ right: -5, background: '#6366f1', width: 10, height: 10, border: '2px solid #14141f' }} />
        </div>
      </div>
    </div>
  );
}

export default memo(RunFlowNode);
