import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const CATEGORY_ORDER = ['input', 'image', 'video', 'audio', 'content', 'publish', 'utility'];
const CATEGORY_LABELS = {
  input: 'Input', image: 'Image', video: 'Video', audio: 'Audio',
  content: 'Content', publish: 'Publish', utility: 'Utility'
};
const CATEGORY_ICONS = {
  input: '📥', image: '🖼', video: '🎬', audio: '🎙️', content: '📝', publish: '📤', utility: '⚙️'
};
const CATEGORY_COLORS = {
  input:   { border: 'border-slate-500/30', text: 'text-slate-300', dot: '#94a3b8' },
  image:   { border: 'border-purple-500/30', text: 'text-purple-300', dot: '#a855f7' },
  video:   { border: 'border-blue-500/30', text: 'text-blue-300', dot: '#3b82f6' },
  audio:   { border: 'border-emerald-500/30', text: 'text-emerald-300', dot: '#10b981' },
  content: { border: 'border-amber-500/30', text: 'text-amber-300', dot: '#f59e0b' },
  publish: { border: 'border-red-500/30', text: 'text-red-300', dot: '#ef4444' },
  utility: { border: 'border-slate-500/30', text: 'text-slate-300', dot: '#64748b' },
};

// Port type mini dots
const PORT_DOT_COLORS = {
  string: '#94a3b8', image: '#a855f7', video: '#3b82f6', audio: '#10b981', json: '#f59e0b',
};

export default function NodePalette({ nodeTypes, selectedNode }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const searchRef = useRef(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCategory = (cat) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filtered = nodeTypes
    ? Object.entries(nodeTypes).reduce((acc, [cat, nodes]) => {
        const matched = nodes.filter(n =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          (n.description || '').toLowerCase().includes(search.toLowerCase())
        );
        if (matched.length) acc[cat] = matched;
        return acc;
      }, {})
    : {};

  // Suggested next steps based on selected node's output types
  const suggestions = [];
  if (selectedNode?.data?.nodeType?.outputs && nodeTypes) {
    const outputTypes = selectedNode.data.nodeType.outputs.map(o => o.type);
    for (const [cat, nodes] of Object.entries(nodeTypes)) {
      for (const node of nodes) {
        if (node.id === selectedNode.data.nodeType.id) continue;
        const hasCompatibleInput = node.inputs?.some(inp =>
          outputTypes.includes(inp.type) || inp.type === 'string'
        );
        if (hasCompatibleInput) suggestions.push(node);
      }
    }
  }

  return (
    <div className="w-[260px] border-r border-slate-700/40 bg-[#0c0c14] flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/30">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2.5 font-medium">Add Blocks</div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search... (press /)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Suggested next steps */}
        {suggestions.length > 0 && !search && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider text-cyan-500/60 mb-1.5 font-medium px-1 flex items-center gap-1">
              <span>⚡</span> Compatible Next
            </div>
            {suggestions.slice(0, 4).map(node => (
              <div
                key={`sug-${node.id}`}
                draggable
                onDragStart={e => onDragStart(e, node)}
                className="px-2.5 py-1.5 mb-1 rounded-lg border border-cyan-500/20 bg-cyan-900/10 text-xs text-cyan-300 cursor-grab active:cursor-grabbing hover:bg-cyan-900/20 hover:border-cyan-500/30 transition-colors"
              >
                <span className="mr-1">{node.icon}</span>{node.label}
              </div>
            ))}
          </div>
        )}

        {/* Category sections */}
        {CATEGORY_ORDER.map(cat => {
          const nodes = filtered[cat];
          if (!nodes?.length) return null;
          const catStyle = CATEGORY_COLORS[cat];
          const isCollapsed = collapsed[cat];

          return (
            <div key={cat} className="mb-1">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-1 py-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-medium hover:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span className="text-[9px] text-slate-600 normal-case tracking-normal">({nodes.length})</span>
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {nodes.map(node => (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={e => onDragStart(e, node)}
                      className={`px-2.5 py-2 rounded-lg border ${catStyle.border} bg-slate-800/30 text-xs cursor-grab active:cursor-grabbing hover:bg-slate-800/60 hover:border-opacity-50 transition-all group`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{node.icon}</span>
                        <span className={`font-medium ${catStyle.text}`}>{node.label}</span>
                      </div>
                      {node.description && (
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 pl-5">{node.description}</div>
                      )}
                      {/* Port type badges */}
                      <div className="flex items-center gap-2 mt-1 pl-5">
                        {node.inputs?.slice(0, 3).map(inp => (
                          <div key={inp.id} className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: PORT_DOT_COLORS[inp.type] || PORT_DOT_COLORS.string }} />
                          </div>
                        ))}
                        {node.inputs?.length > 0 && node.outputs?.length > 0 && (
                          <span className="text-slate-600 text-[8px]">→</span>
                        )}
                        {node.outputs?.slice(0, 3).map(out => (
                          <div key={out.id} className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: PORT_DOT_COLORS[out.type] || PORT_DOT_COLORS.string }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
