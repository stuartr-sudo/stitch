import { useState } from 'react';
import { Search } from 'lucide-react';

const CATEGORY_ORDER = ['input', 'image', 'video', 'audio', 'content', 'publish', 'utility'];
const CATEGORY_LABELS = {
  input: 'Input', image: 'Image', video: 'Video', audio: 'Audio',
  content: 'Content', publish: 'Publish', utility: 'Utility'
};
const CATEGORY_COLORS = {
  input:   'bg-white/5 border-white/10 text-gray-400',
  image:   'bg-purple-500/10 border-purple-500/20 text-purple-300',
  video:   'bg-blue-500/10 border-blue-500/20 text-blue-300',
  audio:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  content: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  publish: 'bg-red-500/10 border-red-500/20 text-red-300',
  utility: 'bg-white/5 border-white/10 text-gray-400',
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
    <div className="w-[220px] border-r border-white/[0.08] p-4 overflow-y-auto flex-shrink-0">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Add Steps</div>
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
        />
      </div>
      {CATEGORY_ORDER.map(cat => {
        const nodes = filtered[cat];
        if (!nodes?.length) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="text-[11px] uppercase tracking-wider text-gray-600 mb-1.5">{CATEGORY_LABELS[cat]}</div>
            {nodes.map(node => (
              <div
                key={node.id}
                draggable
                onDragStart={e => onDragStart(e, node)}
                className={`px-2.5 py-1.5 mb-1 rounded-md border text-xs cursor-grab active:cursor-grabbing ${CATEGORY_COLORS[cat]}`}
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
