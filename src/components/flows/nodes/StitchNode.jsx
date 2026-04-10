import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getActionableError } from '@/lib/flowErrorMessages';

// Type-based port colors
const PORT_COLORS = {
  string: '#94a3b8',
  image:  '#a855f7',
  video:  '#3b82f6',
  audio:  '#10b981',
  json:   '#f59e0b',
  'image[]': '#a855f7',
  'video[]': '#3b82f6',
  'any[]':   '#06b6d4',
};

// Category header colors (dark mode)
const CATEGORY_STYLES = {
  input:   { bg: 'bg-slate-700/60', border: 'border-slate-500/40', accent: '#94a3b8', text: 'text-slate-200' },
  image:   { bg: 'bg-purple-900/40', border: 'border-purple-500/30', accent: '#a855f7', text: 'text-purple-200' },
  video:   { bg: 'bg-blue-900/40', border: 'border-blue-500/30', accent: '#3b82f6', text: 'text-blue-200' },
  audio:   { bg: 'bg-emerald-900/40', border: 'border-emerald-500/30', accent: '#10b981', text: 'text-emerald-200' },
  content: { bg: 'bg-amber-900/40', border: 'border-amber-500/30', accent: '#f59e0b', text: 'text-amber-200' },
  publish: { bg: 'bg-red-900/40', border: 'border-red-500/30', accent: '#ef4444', text: 'text-red-200' },
  utility: { bg: 'bg-slate-700/60', border: 'border-slate-500/40', accent: '#64748b', text: 'text-slate-200' },
  control: { bg: 'bg-cyan-900/40', border: 'border-cyan-500/30', accent: '#06b6d4', text: 'text-cyan-200' },
  brand:   { bg: 'bg-fuchsia-900/40', border: 'border-fuchsia-500/30', accent: '#d946ef', text: 'text-fuchsia-200' },
};

const STATUS_STYLES = {
  running:   { ring: 'ring-2 ring-blue-500/50', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
  completed: { ring: 'ring-2 ring-emerald-500/50', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]' },
  failed:    { ring: 'ring-2 ring-red-500/50', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]' },
  paused:    { ring: 'ring-2 ring-amber-500/50', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
};

function humanizeKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function PortDot({ type }) {
  const color = PORT_COLORS[type] || PORT_COLORS.string;
  const isArray = type?.endsWith('[]');
  return (
    <div
      className="flex-shrink-0 rounded-full"
      style={{
        width: isArray ? 10 : 8,
        height: isArray ? 10 : 8,
        background: color,
        boxShadow: `0 0 6px ${color}60`,
        border: isArray ? `2px solid ${color}` : 'none',
        backgroundColor: isArray ? 'transparent' : color,
      }}
    />
  );
}

// Inline preview for node output
function NodePreviewArea({ stepState }) {
  if (!stepState?.output) return (
    <div className="h-[80px] flex items-center justify-center bg-slate-800/30 rounded-md border border-slate-700/30">
      <span className="text-[10px] text-slate-600">No output yet</span>
    </div>
  );

  const output = stepState.output;
  // Try to find an image or video URL in the output
  const imageUrl = output.image_url || output.saved_url;
  const videoUrl = output.video_url;
  const audioUrl = output.audio_url;
  const textValue = output.text || output.prompt || output.value || output.description;
  const jsonValue = output.script || output.brand_config;

  if (imageUrl) {
    return (
      <div className="h-[80px] rounded-md overflow-hidden border border-slate-700/30">
        <img src={imageUrl} alt="output" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (videoUrl) {
    return (
      <div className="h-[80px] rounded-md overflow-hidden border border-slate-700/30 bg-blue-900/20 flex items-center justify-center relative">
        <div className="text-blue-400 text-2xl">▶</div>
        <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-blue-300 px-1 rounded">Video</span>
      </div>
    );
  }
  if (audioUrl) {
    return (
      <div className="h-[80px] rounded-md overflow-hidden border border-slate-700/30 bg-emerald-900/20 flex items-center justify-center">
        <div className="flex items-end gap-0.5 h-6">
          {[3, 5, 4, 6, 3, 5, 4, 6, 3, 5].map((h, i) => (
            <div key={i} className="w-1 bg-emerald-500/60 rounded-full" style={{ height: h * 3 }} />
          ))}
        </div>
        <span className="ml-2 text-[9px] text-emerald-400">Audio</span>
      </div>
    );
  }
  if (textValue) {
    return (
      <div className="h-[80px] rounded-md overflow-hidden border border-slate-700/30 bg-slate-800/40 p-2">
        <p className="text-[10px] text-slate-400 font-mono line-clamp-4 leading-relaxed">{typeof textValue === 'string' ? textValue : JSON.stringify(textValue).slice(0, 200)}</p>
      </div>
    );
  }
  if (jsonValue) {
    return (
      <div className="h-[80px] rounded-md overflow-hidden border border-slate-700/30 bg-amber-900/10 flex items-center justify-center">
        <span className="text-amber-400 font-mono text-xs">{'{...}'}</span>
        <span className="ml-2 text-[9px] text-amber-500">{Object.keys(typeof jsonValue === 'object' ? jsonValue : {}).length} keys</span>
      </div>
    );
  }

  return (
    <div className="h-[80px] flex items-center justify-center bg-slate-800/30 rounded-md border border-slate-700/30">
      <span className="text-[10px] text-emerald-500">✓ Complete</span>
    </div>
  );
}

function StitchNode({ data, selected }) {
  const { nodeType, config, stepState, onDelete } = data;
  const style = CATEGORY_STYLES[nodeType.category] || CATEGORY_STYLES.utility;
  const statusStyle = stepState ? STATUS_STYLES[stepState.status] : null;
  const isRunning = stepState?.status === 'running';
  const isCompleted = stepState?.status === 'completed';
  const isFailed = stepState?.status === 'failed';

  return (
    <div
      className={`w-[280px] rounded-xl overflow-hidden bg-[#14141f] border transition-all duration-200
        ${selected ? 'ring-2 ring-[#2C666E]/60 border-[#2C666E]/40' : `border-slate-700/40`}
        ${statusStyle?.ring || ''}
        ${statusStyle?.glow || ''}
        ${selected ? 'shadow-lg shadow-[#2C666E]/10' : 'shadow-md shadow-black/30'}
        hover:shadow-lg hover:-translate-y-0.5
      `}
    >
      {/* Progress bar (running state) */}
      {isRunning && (
        <div className="h-0.5 bg-slate-800 overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%', transition: 'width 1s ease' }} />
        </div>
      )}

      {/* Header */}
      <div className={`px-3 py-2 ${style.bg} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{nodeType.icon}</span>
          <span className={`text-xs font-semibold truncate ${style.text}`}>{nodeType.label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isCompleted && <span className="text-emerald-400 text-xs">✓</span>}
          {isRunning && <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
          {isFailed && <span className="text-red-400 text-xs">✕</span>}
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-slate-400">{nodeType.category}</span>
          {selected && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-5 h-5 rounded-full bg-black/30 border border-slate-600/40 text-slate-400 hover:bg-red-900/60 hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition-colors"
              style={{ fontSize: 10, lineHeight: 1 }}
              title="Delete node"
            >
              &#10005;
            </button>
          )}
        </div>
      </div>

      {/* Input ports */}
      {(nodeType.inputs || []).length > 0 && (
        <div className="px-3 py-1.5 space-y-1 border-b border-slate-700/20">
          {(nodeType.inputs || []).map((input, i) => (
            <div key={`in-${input.id}`} className="flex items-center gap-1.5 relative">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                style={{
                  left: -5,
                  background: PORT_COLORS[input.type] || PORT_COLORS.string,
                  width: 10,
                  height: 10,
                  border: '2px solid #14141f',
                  boxShadow: `0 0 6px ${(PORT_COLORS[input.type] || PORT_COLORS.string)}40`,
                }}
              />
              <PortDot type={input.type} />
              <span className="text-[10px] text-slate-400">{humanizeKey(input.id)}</span>
              {input.required && <span className="text-[8px] text-red-400/60 font-bold">*</span>}
            </div>
          ))}
        </div>
      )}

      {/* Preview area */}
      <div className="px-2.5 py-2">
        <NodePreviewArea stepState={stepState} />
      </div>

      {/* Status / error info */}
      {stepState && (
        <div className="px-3 py-1 border-t border-slate-700/20">
          {isCompleted && (
            <span className="text-[10px] text-emerald-500">
              Done in {((new Date(stepState.completed_at) - new Date(stepState.started_at)) / 1000).toFixed(1)}s
            </span>
          )}
          {isRunning && <span className="text-[10px] text-blue-400">Processing...</span>}
          {isFailed && (() => {
            const err = getActionableError(stepState.error);
            return (
              <div>
                <span className="text-[10px] text-red-400 font-medium block">{err.message}</span>
                <span className="text-[9px] text-red-400/60 block mt-0.5 line-clamp-2">{err.action}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Config summary */}
      {!stepState && config && Object.keys(config).filter(k => k !== 'errorHandling' && config[k]).length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-700/20">
          {Object.entries(config).filter(([k, v]) => k !== 'errorHandling' && v).slice(0, 2).map(([k, v]) => (
            <div key={k} className="text-[10px] text-slate-500 truncate">
              <span className="text-slate-400">{humanizeKey(k)}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}
            </div>
          ))}
          {Object.keys(config).filter(k => k !== 'errorHandling' && config[k]).length > 2 && (
            <div className="text-[9px] text-slate-600 mt-0.5">+{Object.keys(config).filter(k => k !== 'errorHandling' && config[k]).length - 2} more</div>
          )}
        </div>
      )}

      {/* Output ports */}
      {(nodeType.outputs || []).length > 0 && (
        <div className="px-3 py-1.5 space-y-1 border-t border-slate-700/20">
          {(nodeType.outputs || []).map((output, i) => (
            <div key={`out-${output.id}`} className="flex items-center justify-end gap-1.5 relative">
              <span className="text-[10px] text-slate-400">{humanizeKey(output.id)}</span>
              <PortDot type={output.type} />
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                style={{
                  right: -5,
                  background: PORT_COLORS[output.type] || PORT_COLORS.string,
                  width: 10,
                  height: 10,
                  border: '2px solid #14141f',
                  boxShadow: `0 0 6px ${(PORT_COLORS[output.type] || PORT_COLORS.string)}40`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(StitchNode);
