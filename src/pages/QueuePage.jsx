/**
 * QueuePage — /queue
 *
 * Production queue management: view, add, prioritise, and kick off Shorts production.
 * Includes autopilot controls and settings panel.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Zap,
  Settings,
  ChevronRight,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { GEMINI_VOICES } from '@/lib/geminiVoices';

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

const DURATIONS = [
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
];

const VIDEO_MODELS = [
  { key: 'fal_wan', label: 'Wan 2.5' },
  { key: 'fal_wan_pro', label: 'Wan Pro' },
  { key: 'fal_veo3', label: 'Veo 3.1' },
  { key: 'fal_veo3_lite', label: 'Veo 3.1 Lite' },
  { key: 'fal_kling_v3', label: 'Kling V3' },
  { key: 'fal_kling_o3', label: 'Kling O3' },
  { key: 'fal_kling2', label: 'Kling 2.0 Master' },
  { key: 'fal_hailuo', label: 'Hailuo/MiniMax' },
  { key: 'fal_pixverse', label: 'PixVerse v4.5' },
  { key: 'fal_pixverse6', label: 'PixVerse V6' },
];

const CAPTION_STYLES = [
  { key: 'word_pop', label: 'Word Pop' },
  { key: 'karaoke_glow', label: 'Karaoke Glow' },
  { key: 'word_highlight', label: 'Word Highlight' },
  { key: 'news_ticker', label: 'News Ticker' },
  { key: '', label: 'No Captions' },
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

// ── localStorage helpers for autopilot settings ──────────────────────────────
const SETTINGS_KEY = 'autopilot_settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

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
      // Include autopilot settings as config
      const settings = loadSettings();
      const config = {};
      if (settings.duration) config.duration = settings.duration;
      if (settings.voice) config.voice = settings.voice;
      if (settings.visual_style) config.visual_style = settings.visual_style;
      if (settings.video_model) config.video_model = settings.video_model;
      if (settings.caption_style !== undefined) config.caption_style = settings.caption_style;

      const res = await apiFetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          niche,
          topic: topic.trim(),
          hook: hook.trim() || undefined,
          angle: angle.trim() || undefined,
          priority,
          config: Object.keys(config).length > 0 ? config : undefined,
        }),
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

// ── Autopilot Settings Panel ──────────────────────────────────────────────────
function AutopilotSettings({ open, onToggle }) {
  const [settings, setSettings] = useState(loadSettings);

  const update = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#2C666E]" />
          <span className="text-sm font-semibold text-gray-900">Autopilot Defaults</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Duration */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Duration</label>
              <select
                value={settings.duration || 60}
                onChange={e => update('duration', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {/* Voice */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Voice</label>
              <select
                value={settings.voice || ''}
                onChange={e => update('voice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="">Niche Default</option>
                {GEMINI_VOICES.map(v => <option key={v.id} value={v.id}>{v.label} - {v.description}</option>)}
              </select>
            </div>

            {/* Video Model */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Video Model</label>
              <select
                value={settings.video_model || 'fal_wan'}
                onChange={e => update('video_model', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {VIDEO_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>

            {/* Visual Style */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Visual Style</label>
              <input
                value={settings.visual_style || ''}
                onChange={e => update('visual_style', e.target.value)}
                placeholder="e.g. cinematic, anime..."
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Caption Style */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Captions</label>
              <select
                value={settings.caption_style ?? 'word_pop'}
                onChange={e => update('caption_style', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {CAPTION_STYLES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            {/* Auto-publish toggle */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_publish || false}
                  onChange={e => update('auto_publish', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
                />
                <span className="text-xs text-gray-700">Auto-publish</span>
              </label>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">These defaults apply to new queue items and autopilot runs.</p>
        </div>
      )}
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
  const [showSettings, setShowSettings] = useState(false);

  // Autopilot state
  const [autopilot, setAutopilot] = useState({ running: false, current_item_id: null, items_processed: 0, items_failed: 0, items_remaining: 0 });
  const [startingAutopilot, setStartingAutopilot] = useState(false);
  const [batchCount, setBatchCount] = useState(3);
  const pollRef = useRef(null);

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

  const fetchAutopilotStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/autopilot/status');
      if (!res.error) setAutopilot(res);
    } catch { /* silent */ }
  }, []);

  // Initial load
  useEffect(() => {
    fetchItems();
    fetchAutopilotStatus();
  }, [fetchItems, fetchAutopilotStatus]);

  // Auto-refresh every 5s while autopilot is running
  useEffect(() => {
    if (autopilot.running) {
      pollRef.current = setInterval(() => {
        fetchItems();
        fetchAutopilotStatus();
      }, 5000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [autopilot.running, fetchItems, fetchAutopilotStatus]);

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

  const handleStartAutopilot = async () => {
    setStartingAutopilot(true);
    try {
      const res = await apiFetch('/api/autopilot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.error) throw new Error(res.error);
      if (res.started) {
        setAutopilot(prev => ({ ...prev, running: true, current_item_id: res.queue_item_id }));
      } else {
        toast.warning(res.reason || 'Could not start autopilot');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start autopilot');
    } finally {
      setStartingAutopilot(false);
    }
  };

  const handleStartBatch = async () => {
    setStartingAutopilot(true);
    try {
      const res = await apiFetch('/api/autopilot/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchCount }),
      });
      if (res.error) throw new Error(res.error);
      if (res.started) {
        setAutopilot(prev => ({ ...prev, running: true }));
      } else {
        toast.warning(res.reason || 'Could not start batch');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start batch');
    } finally {
      setStartingAutopilot(false);
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
    queued: items.filter(x => x.status === 'queued').length,
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
        {/* Autopilot Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-2.5 h-2.5 rounded-full ${autopilot.running ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {autopilot.running ? 'Autopilot Running' : 'Autopilot Idle'}
                </div>
                {autopilot.running && (
                  <div className="text-[11px] text-gray-500">
                    Processing item {autopilot.current_item_id?.slice(0, 8)}...
                    {autopilot.items_processed > 0 && ` | ${autopilot.items_processed} done`}
                    {autopilot.items_failed > 0 && ` | ${autopilot.items_failed} failed`}
                  </div>
                )}
                {!autopilot.running && autopilot.items_processed > 0 && (
                  <div className="text-[11px] text-gray-500">
                    Last run: {autopilot.items_processed} completed, {autopilot.items_failed} failed
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Start single */}
              <button
                onClick={handleStartAutopilot}
                disabled={autopilot.running || startingAutopilot || stats.queued === 0}
                className="px-4 py-2 bg-gradient-to-r from-[#2C666E] to-[#3A8A95] text-white text-sm rounded-lg hover:from-[#245258] hover:to-[#2C666E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {startingAutopilot ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : autopilot.running ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {autopilot.running ? 'Running...' : 'Start Autopilot'}
              </button>

              {/* Batch controls */}
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 pl-2">
                <select
                  value={batchCount}
                  onChange={e => setBatchCount(parseInt(e.target.value))}
                  disabled={autopilot.running}
                  className="bg-transparent text-xs text-gray-700 border-none focus:ring-0 outline-none py-2 pr-1 w-12"
                >
                  {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button
                  onClick={handleStartBatch}
                  disabled={autopilot.running || startingAutopilot || stats.queued === 0}
                  className="px-3 py-2 bg-[#2C666E] text-white text-xs rounded-r-lg hover:bg-[#245258] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Batch
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={() => { fetchItems(); fetchAutopilotStatus(); }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        <AutopilotSettings open={showSettings} onToggle={() => setShowSettings(!showSettings)} />

        {/* Stats bar */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Queued', value: stats.queued, color: 'text-slate-600' },
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
                className={`bg-white rounded-xl border p-4 hover:border-gray-300 transition-colors ${
                  autopilot.current_item_id === item.id ? 'border-[#2C666E] ring-1 ring-[#2C666E]/20' : 'border-gray-200'
                }`}
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
                      {autopilot.current_item_id === item.id && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#2C666E]/10 text-[#2C666E]">
                          <Zap className="w-3 h-3" />
                          Autopilot
                        </span>
                      )}
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
