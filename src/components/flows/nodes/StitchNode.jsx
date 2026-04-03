import { Handle, Position } from '@xyflow/react';

const CATEGORY_COLORS = {
  input:   { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', text: '#999' },
  image:   { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', text: '#c4b5fd' },
  video:   { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', text: '#93c5fd' },
  audio:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#6ee7b7' },
  content: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#fcd34d' },
  publish: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#fca5a5' },
  utility: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: '#999' },
};

const STATUS_STYLES = {
  running:   { border: '2px solid rgba(59,130,246,0.5)', shadow: '0 0 16px rgba(59,130,246,0.15)' },
  completed: { border: '2px solid rgba(16,185,129,0.5)', shadow: '0 0 12px rgba(16,185,129,0.1)' },
  failed:    { border: '2px solid rgba(239,68,68,0.5)', shadow: '0 0 12px rgba(239,68,68,0.1)' },
  paused:    { border: '2px solid rgba(245,158,11,0.5)', shadow: '0 0 12px rgba(245,158,11,0.1)' },
};

export default function StitchNode({ data, selected }) {
  const { nodeType, config, stepState } = data;
  const colors = CATEGORY_COLORS[nodeType.category] || CATEGORY_COLORS.utility;
  const statusStyle = stepState ? STATUS_STYLES[stepState.status] : null;

  return (
    <div
      className="rounded-lg overflow-hidden min-w-[180px]"
      style={{
        background: colors.bg,
        border: statusStyle?.border || `1px solid ${colors.border}`,
        boxShadow: statusStyle?.shadow || (selected ? `0 0 0 2px rgba(99,102,241,0.5)` : 'none'),
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2"
        style={{ background: colors.bg, color: colors.text }}
      >
        <span>{nodeType.icon} {nodeType.label}</span>
        {stepState?.status === 'completed' && <span className="text-emerald-400">✓</span>}
        {stepState?.status === 'running' && (
          <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
        )}
        {stepState?.status === 'failed' && <span className="text-red-400">✕</span>}
      </div>

      {/* Status info */}
      {stepState && (
        <div className="px-3 py-1.5 text-[10px]">
          {stepState.status === 'completed' && (
            <span className="text-emerald-400">
              Done in {((new Date(stepState.completed_at) - new Date(stepState.started_at)) / 1000).toFixed(1)}s
            </span>
          )}
          {stepState.status === 'running' && <span className="text-blue-400">Running...</span>}
          {stepState.status === 'failed' && <span className="text-red-400 truncate block">{stepState.error}</span>}
        </div>
      )}

      {/* Input handles */}
      {nodeType.inputs.map((input, i) => (
        <Handle
          key={`in-${input.id}`}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ top: 42 + i * 20, background: colors.text, width: 8, height: 8 }}
        />
      ))}

      {/* Output handles */}
      {nodeType.outputs.map((output, i) => (
        <Handle
          key={`out-${output.id}`}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ top: 42 + i * 20, background: colors.text, width: 8, height: 8 }}
        />
      ))}
    </div>
  );
}
