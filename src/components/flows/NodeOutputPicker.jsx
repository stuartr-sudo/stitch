import { useState, useEffect, useRef, useCallback } from 'react';

// Port type colors — matches StitchNode.jsx PORT_COLORS
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

function humanizeKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function PortDot({ type }) {
  const color = PORT_COLORS[type] || PORT_COLORS.string;
  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: 8, height: 8, background: color, boxShadow: `0 0 6px ${color}60` }}
    />
  );
}

/**
 * Floating dropdown picker for upstream node outputs + flow variables.
 *
 * Props:
 *  - upstreamOutputs: [{ nodeId, nodeLabel, nodeIcon, category, outputs: [{ id, type }] }]
 *  - flowVariables: { key: value }
 *  - filter: string to narrow results
 *  - onSelect: (referenceString) => void
 *  - onClose: () => void
 *  - anchorRect: { top, left, height } from the input field
 */
export default function NodeOutputPicker({
  upstreamOutputs = [],
  flowVariables = {},
  filter = '',
  onSelect,
  onClose,
  anchorRect,
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef(null);
  const filterLower = filter.toLowerCase();

  // Build flat list of selectable items
  const items = [];

  // Section 1: Node outputs
  for (const node of upstreamOutputs) {
    for (const output of node.outputs) {
      const label = `${node.nodeLabel} > ${humanizeKey(output.id)}`;
      if (filterLower && !label.toLowerCase().includes(filterLower) && !output.id.toLowerCase().includes(filterLower)) continue;
      items.push({
        type: 'node_output',
        label,
        nodeLabel: node.nodeLabel,
        nodeIcon: node.nodeIcon,
        portId: output.id,
        portType: output.type,
        reference: `{{@${node.nodeId}.${output.id}}}`,
      });
    }
  }

  // Section 2: Flow variables
  const varKeys = Object.keys(flowVariables || {});
  for (const key of varKeys) {
    if (filterLower && !key.toLowerCase().includes(filterLower)) continue;
    items.push({
      type: 'flow_variable',
      label: key,
      value: String(flowVariables[key]).slice(0, 30),
      reference: `{{${key}}}`,
    });
  }

  // Clamp selection
  useEffect(() => {
    setSelectedIdx(prev => Math.min(prev, Math.max(0, items.length - 1)));
  }, [items.length]);

  // Scroll selected item into view — query by data-idx to skip section headers
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // Keyboard handler — attached to window since the input has focus
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (items[selectedIdx]) onSelect(items[selectedIdx].reference);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [items, selectedIdx, onSelect, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Close on click outside
  const containerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute z-[100] w-72 bg-[#1a1a2e] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden"
        style={{ top: (anchorRect?.top ?? 0) + (anchorRect?.height ?? 24) + 4, left: anchorRect?.left ?? 0 }}
      >
        <div className="px-4 py-6 text-center text-xs text-slate-500">
          {upstreamOutputs.length === 0 && varKeys.length === 0
            ? 'No upstream nodes or variables available'
            : 'No matches found'}
        </div>
      </div>
    );
  }

  // Split items into sections for rendering
  const nodeItems = items.filter(i => i.type === 'node_output');
  const varItems = items.filter(i => i.type === 'flow_variable');

  let globalIdx = -1;

  return (
    <div
      ref={containerRef}
      className="absolute z-[100] w-80 bg-[#1a1a2e] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: (anchorRect?.top ?? 0) + (anchorRect?.height ?? 24) + 4, left: anchorRect?.left ?? 0 }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/30 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Insert Reference</span>
        <kbd className="text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded font-mono">Esc to close</kbd>
      </div>

      <div ref={listRef} className="max-h-[280px] overflow-y-auto py-1">
        {/* Node outputs */}
        {nodeItems.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1 text-[9px] font-semibold text-teal-500/70 uppercase tracking-wider">Node Outputs</div>
            {nodeItems.map(item => {
              globalIdx++;
              const idx = globalIdx;
              const sel = idx === selectedIdx;
              return (
                <button
                  key={item.reference}
                  data-idx={idx}
                  onClick={() => onSelect(item.reference)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    sel ? 'bg-teal-900/30' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-sm flex-shrink-0">{item.nodeIcon}</span>
                  <PortDot type={item.portType} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-300 truncate block">{item.label}</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono flex-shrink-0">{item.portType}</span>
                </button>
              );
            })}
          </>
        )}

        {/* Flow variables */}
        {varItems.length > 0 && (
          <>
            <div className="px-3 pt-3 pb-1 text-[9px] font-semibold text-violet-500/70 uppercase tracking-wider">Flow Variables</div>
            {varItems.map(item => {
              globalIdx++;
              const idx = globalIdx;
              const sel = idx === selectedIdx;
              return (
                <button
                  key={item.reference}
                  data-idx={idx}
                  onClick={() => onSelect(item.reference)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    sel ? 'bg-violet-900/30' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-900/30 px-1 rounded flex-shrink-0">{'{{}}'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-300 font-mono">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 truncate max-w-[100px]">{item.value}</span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
