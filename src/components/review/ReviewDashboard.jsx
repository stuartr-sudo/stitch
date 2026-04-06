import React, { useState } from 'react';
import { X } from 'lucide-react';
import ReviewRequestCard from './ReviewRequestCard';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'needs_info', label: 'Needs Info' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

export default function ReviewDashboard({ requests, onRefresh, onClose }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredRequests = requests
    .filter((r) => activeFilter === 'all' || r.status === activeFilter)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at) - new Date(b.created_at);
    });

  function getCount(filterKey) {
    if (filterKey === 'all') return requests.length;
    return requests.filter((r) => r.status === filterKey).length;
  }

  function handleToggle(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-100">Review Requests</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700/50 flex-wrap flex-shrink-0">
        {FILTERS.map((f) => {
          const count = getCount(f.key);
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isActive
                  ? 'bg-slate-700 border-slate-500 text-slate-100'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filteredRequests.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No requests{activeFilter !== 'all' ? ` with status "${activeFilter}"` : ''}.
          </p>
        ) : (
          filteredRequests.map((request) => (
            <ReviewRequestCard
              key={request.id}
              request={request}
              isExpanded={expandedId === request.id}
              onToggle={() => handleToggle(request.id)}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}
