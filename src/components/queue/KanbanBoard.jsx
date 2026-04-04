/**
 * KanbanBoard — Drag-and-drop Kanban view for the production queue.
 * Uses HTML5 Drag and Drop API (no external dependency).
 */

import { useState } from 'react';
import { Clock, Sparkles, Video, Package, CheckCircle2, AlertCircle, Send, GripVertical } from 'lucide-react';

const COLUMNS = [
  { status: 'queued',     label: 'Queued',     icon: Clock,        dotColor: 'bg-slate-400' },
  { status: 'scripting',  label: 'Scripting',  icon: Sparkles,     dotColor: 'bg-blue-500' },
  { status: 'generating', label: 'Generating', icon: Video,        dotColor: 'bg-yellow-500' },
  { status: 'assembling', label: 'Assembling', icon: Package,      dotColor: 'bg-orange-500' },
  { status: 'ready',      label: 'Ready',      icon: CheckCircle2, dotColor: 'bg-green-500' },
  { status: 'failed',     label: 'Failed',     icon: AlertCircle,  dotColor: 'bg-red-500' },
  { status: 'published',  label: 'Published',  icon: Send,         dotColor: 'bg-purple-500' },
];

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function KanbanBoard({ items, onStatusChange, onItemClick }) {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const itemsByStatus = {};
  for (const col of COLUMNS) {
    itemsByStatus[col.status] = [];
  }
  for (const item of items) {
    if (itemsByStatus[item.status]) {
      itemsByStatus[item.status].push(item);
    }
  }

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(item.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e, status) => {
    // Only clear if leaving the column itself, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggingId(null);
    if (itemId) {
      const item = items.find(x => x.id === itemId);
      if (item && item.status !== targetStatus) {
        onStatusChange(itemId, targetStatus);
      }
    }
  };

  return (
    <div className="flex overflow-x-auto gap-3 p-4 pb-6 -mx-6">
      {COLUMNS.map(col => {
        const colItems = itemsByStatus[col.status];
        const Icon = col.icon;
        const isOver = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-[220px] min-w-[200px] rounded-xl p-2 transition-colors ${
              isOver
                ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 dark:ring-blue-500'
                : 'bg-gray-50 dark:bg-gray-900/50'
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={(e) => handleDragLeave(e, col.status)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{col.label}</span>
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[80px]">
              {colItems.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">No items</p>
                </div>
              ) : (
                colItems.map(item => (
                  <div
                    key={item.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onItemClick?.(item)}
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 dark:hover:border-gray-600 transition-all group ${
                      draggingId === item.id ? 'opacity-40 scale-95' : ''
                    }`}
                  >
                    {/* Drag handle + title */}
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                          {item.title}
                        </p>
                      </div>
                    </div>

                    {/* Niche badge + priority */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {item.niche && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 truncate max-w-[120px]">
                          {item.niche_label || item.niche}
                        </span>
                      )}
                      {(item.priority != null && item.priority !== 0) && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {item.priority}
                        </span>
                      )}
                    </div>

                    {/* Error message for failed items */}
                    {item.status === 'failed' && item.error_message && (
                      <p className="text-[10px] text-red-500 mt-1.5 line-clamp-2 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                        {item.error_message}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
