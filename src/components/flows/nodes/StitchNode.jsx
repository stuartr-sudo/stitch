import { Handle, Position } from '@xyflow/react';

const CATEGORY_COLORS = {
  input:   { bg: '#ffffff', border: '#94a3b8', text: '#475569' },
  image:   { bg: '#faf5ff', border: '#a855f7', text: '#7c3aed' },
  video:   { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb' },
  audio:   { bg: '#ecfdf5', border: '#10b981', text: '#059669' },
  content: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706' },
  publish: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
  utility: { bg: '#f8fafc', border: '#94a3b8', text: '#475569' },
};

const STATUS_STYLES = {
  running:   { border: '2px solid #3b82f6', shadow: '0 0 12px rgba(59,130,246,0.2)' },
  completed: { border: '2px solid #10b981', shadow: '0 0 12px rgba(16,185,129,0.15)' },
  failed:    { border: '2px solid #ef4444', shadow: '0 0 12px rgba(239,68,68,0.15)' },
  paused:    { border: '2px solid #f59e0b', shadow: '0 0 12px rgba(245,158,11,0.15)' },
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
        boxShadow: statusStyle?.shadow || (selected ? `0 0 0 2px rgba(44,102,110,0.5)` : '0 1px 3px rgba(0,0,0,0.08)'),
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2"
        style={{ color: colors.text }}
      >
        <span>{nodeType.icon} {nodeType.label}</span>
        {stepState?.status === 'completed' && <span className="text-emerald-600">&#10003;</span>}
        {stepState?.status === 'running' && (
          <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
        )}
        {stepState?.status === 'failed' && <span className="text-red-500">&#10005;</span>}
      </div>

      {/* Status info */}
      {stepState && (
        <div className="px-3 py-1.5 text-[10px]">
          {stepState.status === 'completed' && (
            <span className="text-emerald-600">
              Done in {((new Date(stepState.completed_at) - new Date(stepState.started_at)) / 1000).toFixed(1)}s
            </span>
          )}
          {stepState.status === 'running' && <span className="text-blue-500">Running...</span>}
          {stepState.status === 'failed' && <span className="text-red-500 truncate block">{stepState.error}</span>}
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
