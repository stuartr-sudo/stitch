/**
 * PublishQueuePage — /publish
 *
 * 14-day timeline strip + date-grouped list of scheduled/published/failed items.
 * Polls every 10s while there are active (scheduled/publishing) items.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronLeft, ExternalLink, RotateCcw, X, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLATFORM_COLORS = {
  youtube: '#FF0000',
  tiktok: '#010101',
  instagram: '#E1306C',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
};

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const STATUS_BADGE = {
  scheduled: 'bg-blue-100 text-blue-700',
  publishing: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

const FILTER_TABS = ['all', 'scheduled', 'published', 'failed'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Timeline Strip ────────────────────────────────────────────────────────────
function TimelineStrip({ items, onDotClick }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Group items by day
  const itemsByDay = {};
  for (const item of items) {
    const d = new Date(item.scheduled_for);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (!itemsByDay[key]) itemsByDay[key] = [];
    itemsByDay[key].push(item);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <div className="grid gap-1 min-w-[600px]" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
        {days.map((day, i) => {
          const key = new Date(day).toISOString();
          const dayItems = itemsByDay[key] || [];
          const isToday = i === 0;

          return (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-1 rounded-lg',
                isToday && 'bg-[#2C666E]/5'
              )}
            >
              <span className={cn('text-[10px] font-medium', isToday ? 'text-[#2C666E]' : 'text-slate-400')}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={cn('text-xs font-bold', isToday ? 'text-[#2C666E]' : 'text-slate-600')}>
                {day.getDate()}
              </span>
              <div className="flex flex-wrap gap-0.5 justify-center min-h-[12px]">
                {dayItems.map((item, j) => (
                  <button
                    key={j}
                    onClick={() => onDotClick(item.id)}
                    title={`${PLATFORM_LABELS[item.platform]}: ${item.title} — ${formatTime(item.scheduled_for)}`}
                    className="w-2.5 h-2.5 rounded-full hover:scale-150 transition-transform"
                    style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List Item ─────────────────────────────────────────────────────────────────
function QueueItem({ item, onRetry, onCancel }) {
  return (
    <div id={`queue-${item.id}`} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      {/* Video thumbnail */}
      <div className="w-12 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {item.draft_video_url ? (
          <video src={item.draft_video_url} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No video</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Platform badge */}
          <span
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
          >
            {PLATFORM_LABELS[item.platform]}
          </span>
          <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', STATUS_BADGE[item.status])}>
            {item.status === 'publishing' && <Loader2 className="w-3 h-3 animate-spin inline mr-0.5" />}
            {item.status}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          {item.status === 'published'
            ? `Published at ${formatTime(item.updated_at)}`
            : item.status === 'failed'
              ? item.error?.slice(0, 120) || 'Unknown error'
              : `Scheduled for ${formatTime(item.scheduled_for)}`
          }
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1.5">
          {item.status === 'scheduled' && (
            <button
              onClick={() => onCancel(item.id)}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
          {item.status === 'failed' && (
            <button
              onClick={() => onRetry(item.id)}
              className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          )}
          {item.status === 'published' && item.published_url && (
            <a
              href={item.published_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function PublishQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const intervalRef = useRef(null);

  const fetchQueue = async () => {
    try {
      const res = await apiFetch('/api/publish/queue');
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error('[PublishQueue] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Stop polling if nothing is active
  useEffect(() => {
    const hasActive = items.some(i => i.status === 'scheduled' || i.status === 'publishing');
    if (!hasActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (hasActive && !intervalRef.current) {
      intervalRef.current = setInterval(fetchQueue, 10000);
    }
  }, [items]);

  const handleRetry = async (queueId) => {
    try {
      const res = await apiFetch('/api/publish/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      });
      const data = await res.json();
      if (data.success) fetchQueue();
      else toast.error(data.error || 'Retry failed');
    } catch (err) {
      toast.error(err.message || 'Retry failed');
    }
  };

  const handleCancel = async (queueId) => {
    if (!confirm('Cancel this scheduled publish?')) return;
    try {
      const res = await apiFetch('/api/publish/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      });
      const data = await res.json();
      if (data.success) fetchQueue();
      else toast.error(data.error || 'Cancel failed');
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const handleDotClick = (id) => {
    const el = document.getElementById(`queue-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Filter items
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  // Group by date
  const grouped = {};
  for (const item of filtered) {
    const dateKey = formatDate(item.scheduled_for);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Publish Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Schedule and track video publishing across platforms</p>
          </div>
          <Link to="/shorts/workbench" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back to Workbench
          </Link>
        </div>

        {/* Timeline */}
        {items.length > 0 && (
          <TimelineStrip
            items={items.filter(i => i.status === 'scheduled' || i.status === 'publishing')}
            onDotClick={handleDotClick}
          />
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize',
                filter === tab
                  ? 'bg-[#2C666E] text-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium mb-1">No scheduled publishes yet</p>
            <p className="text-sm">Create a Short and schedule it from the draft page.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, dateItems]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{dateLabel}</h3>
              <div className="space-y-2">
                {dateItems.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
