import { useState } from 'react';
import { Search } from 'lucide-react';

const CATEGORY_ORDER = ['input', 'image', 'video', 'audio', 'content', 'publish', 'utility'];
const CATEGORY_LABELS = {
  input: 'Input', image: 'Image', video: 'Video', audio: 'Audio',
  content: 'Content', publish: 'Publish', utility: 'Utility'
};
const CATEGORY_COLORS = {
  input:   'bg-slate-50 border-slate-200 text-slate-600',
  image:   'bg-purple-50 border-purple-200 text-purple-700',
  video:   'bg-blue-50 border-blue-200 text-blue-700',
  audio:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  content: 'bg-amber-50 border-amber-200 text-amber-700',
  publish: 'bg-red-50 border-red-200 text-red-700',
  utility: 'bg-slate-50 border-slate-200 text-slate-600',
};

export default function NodePalette({ nodeTypes }) {
  const [search, setSearch] = useState('');

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const filtered = nodeTypes
    ? Object.entries(nodeTypes).reduce((acc, [cat, nodes]) => {
        const matched = nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase()));
        if (matched.length) acc[cat] = matched;
        return acc;
      }, {})
    : {};

  return (
    <div className="w-[220px] border-r border-slate-200 bg-white p-4 overflow-y-auto flex-shrink-0">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-3 font-medium">Add Steps</div>
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/20 focus:border-[#2C666E]"
        />
      </div>
      {CATEGORY_ORDER.map(cat => {
        const nodes = filtered[cat];
        if (!nodes?.length) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 font-medium">{CATEGORY_LABELS[cat]}</div>
            {nodes.map(node => (
              <div
                key={node.id}
                draggable
                onDragStart={e => onDragStart(e, node)}
                className={`px-2.5 py-1.5 mb-1 rounded-md border text-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${CATEGORY_COLORS[cat]}`}
              >
                {node.icon} {node.label}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
