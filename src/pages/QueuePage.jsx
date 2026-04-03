/**
 * QueuePage — /queue
 *
 * Production queue management: view, add, prioritise, and kick off Shorts production.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  ArrowLeft,
  Filter,
  ListOrdered,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Video,
  Package,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

// ── Niche options (matches ShortsWorkbenchPage) ────────────────────────────────
const NICHES = [
  { key: 'ai_tech_news', label: 'AI & Tech News' },
  { key: 'finance_money', label: 'Finance & Money' },
  { key: 'motivation_self_help', label: 'Motivation' },
  { key: 'scary_horror', label: 'Horror' },
  { key: 'history_did_you_know', label: 'History' },
  { key: 'true_crime', label: 'True Crime' },
  { key: 'science_nature', label: 'Science & Nature' },
  { key: 'relationships_dating', label: 'Relationships' },
  { key: 'health_fitness', label: 'Fitness & Health' },
  { key: 'gaming_popculture', label: 'Gaming' },
  { key: 'conspiracy_mystery', label: 'Conspiracy' },
  { key: 'business_entrepreneur', label: 'Business' },
  { key: 'food_cooking', label: 'Food & Cooking' },
  { key: 'travel_adventure', label: 'Travel' },
  { key: 'psychology_mindblown', label: 'Psychology' },
  { key: 'space_cosmos', label: 'Space & Cosmos' },
  { key: 'animals_wildlife', label: 'Animals & Wildlife' },
  { key: 'sports_athletes', label: 'Sports' },
  { key: 'education_learning', label: 'Education' },
  { key: 'paranormal_ufo', label: 'Paranormal & UFO' },
];

const STATUS_CONFIG = {
  queued:     { label: 'Queued',     color: 'bg-slate-100 text-slate-600',   icon: Clock },
  scripting:  { label: 'Scripting',  color: 'bg-blue-100 text-blue-700',     icon: Sparkles },
  generating: { label: 'Generating', color: 'bg-yellow-100 text-yellow-700', icon: Video },
  assembling: { label: 'Assembling', color: 'bg-orange-100 text-orange-700', icon: Package },
  ready:      { label: 'Ready',      color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-600',       icon: AlertCircle },
  published:  { label: 'Published',  color: 'bg-purple-100 text-purple-700', icon: Send },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function NicheBadge({ niche }) {
  const n = NICHES.find(x => x.key === niche);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
      {n?.label || niche}
    </span>
  );
}

// ── Add Item Form (inline modal) ───────────────────────────────────────────────
function AddItemForm({ onClose, onAdded }) {
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [topic, setTopic] = useState('');
  const [hook, setHook] = useState('');
  const [angle, setAngle] = useState('');
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !niche || !topic.trim()) {
      toast.error('Title, niche, and topic are required');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), niche, topic: topic.trim(), hook: hook.trim() || undefined, angle: angle.trim() || undefined, priority }),
      });
      if (res.error) throw new Error(res.error);
      onAdded(res.item);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add to Queue</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI takes over coding" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Niche</label>
          <select value={niche} onChange={e => setNiche(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white">
            <option value="">Select niche...</option>
            {NICHES.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Topic</label>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={2} placeholder="Describe the topic for this Short..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hook (optional)</label>
            <input value={hook} onChange={e => setHook(e.target.value)} placeholder="Opening hook line" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Angle (optional)</label>
            <input value={angle} onChange={e => setAngle(e.target.value)} placeholder="Content angle" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Priority (higher = produced first)</label>
          <input type="number" value={priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-[#2C666E] text-white text-sm rounded-lg hover:bg-[#245258] disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add to Queue
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function QueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [producing, setProducing] = useState(null); // item id being produced

  const fetchItems = useCallback(async () => {
    try {
      const res = await apiFetch('/api/queue');
      if (res.error) throw new Error(res.error);
      setItems(res.items || []);
    } catch (err) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/queue/${id}`, { method: 'DELETE' });
      if (res.error) throw new Error(res.error);
      setItems(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handlePriorityChange = async (id, delta) => {
    const item = items.find(x => x.id === id);
    if (!item) return;
    const newPriority = (item.priority || 0) + delta;
    try {
      const res = await apiFetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.error) throw new Error(res.error);
      setItems(prev => prev.map(x => x.id === id ? { ...x, priority: newPriority } : x));
    } catch (err) {
      toast.error(err.message || 'Failed to update priority');
    }
  };

  const handleProduce = async (id) => {
    setProducing(id);
    try {
      const res = await apiFetch(`/api/queue/${id}/produce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.error) throw new Error(res.error);
      setItems(prev => prev.map(x => x.id === id ? { ...x, status: 'scripting' } : x));
    } catch (err) {
      toast.error(err.message || 'Failed to start production');
    } finally {
      setProducing(null);
    }
  };

  const handleItemAdded = (newItem) => {
    setItems(prev => {
      const updated = [newItem, ...prev];
      // Re-sort: priority DESC, created_at ASC
      updated.sort((a, b) => (b.priority || 0) - (a.priority || 0) || new Date(a.created_at) - new Date(b.created_at));
      return updated;
    });
  };

  // Stats
  const stats = {
    total: items.length,
    inProgress: items.filter(x => ['scripting', 'generating', 'assembling'].includes(x.status)).length,
    ready: items.filter(x => x.status === 'ready').length,
    failed: items.filter(x => x.status === 'failed').length,
  };

  // Filter
  const filteredItems = statusFilter === 'all' ? items : items.filter(x => x.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/studio" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-[#2C666E]" />
                Production Queue
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Manage and prioritise Shorts production</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-[#2C666E] text-white text-sm rounded-lg hover:bg-[#245258] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Queue
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600' },
            { label: 'Ready', value: stats.ready, color: 'text-green-600' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Queue items */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ListOrdered className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">{statusFilter === 'all' ? 'Queue is empty' : `No ${STATUS_CONFIG[statusFilter]?.label?.toLowerCase()} items`}</p>
            <p className="text-xs mt-1">Add topics to start building your production pipeline</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Priority controls */}
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <button onClick={() => handlePriorityChange(item.id, 1)} className="text-gray-300 hover:text-gray-600 transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-medium text-gray-500 w-6 text-center">{item.priority || 0}</span>
                    <button onClick={() => handlePriorityChange(item.id, -1)} className="text-gray-300 hover:text-gray-600 transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
                      <NicheBadge niche={item.niche} />
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{item.topic}</p>
                    {item.hook && <p className="text-[11px] text-gray-400 mt-1">Hook: {item.hook}</p>}
                    {item.angle && <p className="text-[11px] text-gray-400">Angle: {item.angle}</p>}
                    {item.error_message && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {item.error_message}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-1">{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {(item.status === 'queued' || item.status === 'failed') && (
                      <button
                        onClick={() => handleProduce(item.id)}
                        disabled={producing === item.id}
                        className="px-3 py-1.5 bg-[#2C666E] text-white text-xs rounded-lg hover:bg-[#245258] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {producing === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Produce
                      </button>
                    )}
                    {item.status === 'ready' && item.draft_id && (
                      <button
                        onClick={() => navigate(`/shorts/draft/${item.draft_id}`)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        View
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add item modal */}
      {showAddForm && (
        <AddItemForm
          onClose={() => setShowAddForm(false)}
          onAdded={handleItemAdded}
        />
      )}
    </div>
  );
}
