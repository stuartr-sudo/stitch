/**
 * StoryboardList — Dashboard listing all storyboards
 *
 * This is the entry point: /storyboards
 *
 * Shows all storyboards with status, thumbnail (from first frame),
 * frame count, duration, and last updated date.
 *
 * "New Storyboard" opens a quick-create dialog (name, length, interval,
 * style, model) then navigates to the full StoryboardEditor.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Loader2, Film, Clock, Layers, Trash2, ExternalLink,
  ChevronRight, Clapperboard, FileDown, MoreHorizontal, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  scripted: 'bg-blue-50 text-blue-700',
  previewed: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  generating: 'bg-purple-50 text-purple-700',
  complete: 'bg-emerald-50 text-emerald-700',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Inline Create Panel ──

function CreateStoryboardPanel({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch('/api/storyboard/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onCreate(data.storyboard);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error('Failed to create storyboard: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Storyboard name — e.g., Movin Martin Episode 1"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        <Button onClick={handleCreate} disabled={!name.trim() || creating}
          className="bg-[#2C666E] hover:bg-[#1e4d54] text-white shrink-0">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
        </Button>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 shrink-0">Cancel</button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Configure everything else in Settings after creation</p>
    </div>
  );
}

// ── Storyboard Card ──

function StoryboardCard({ storyboard, onClick, onDelete }) {
  const statusColor = STATUS_COLORS[storyboard.status] || STATUS_COLORS.draft;

  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:shadow-md hover:border-gray-300 transition-all group w-full"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative">
        {storyboard.thumbnail ? (
          <img src={storyboard.thumbnail} alt={storyboard.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Clapperboard className="w-10 h-10 text-gray-200" />
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
          {storyboard.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#2C666E] transition-colors">
            {storyboard.name}
          </h3>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all -mt-0.5 -mr-1 shrink-0"
            title="Delete storyboard"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
          <span className="flex items-center gap-0.5"><Layers size={10} /> {storyboard.frameCount} frames</span>
          <span className="flex items-center gap-0.5"><Clock size={10} /> {storyboard.desired_length}s</span>
          <span className="flex items-center gap-0.5"><Film size={10} /> {storyboard.aspect_ratio}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(storyboard.updated_at)}</p>
      </div>
    </button>
  );
}

// ── Main List Page ──

export default function StoryboardList({ onOpenStoryboard }) {
  const navigate = useNavigate();
  const [storyboards, setStoryboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadStoryboards = async () => {
    try {
      const res = await apiFetch('/api/storyboard/projects');
      const data = await res.json();
      if (data.success) {
        setStoryboards(data.storyboards || []);
      }
    } catch (err) {
      toast.error('Failed to load storyboards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStoryboards(); }, []);

  const handleCreate = (newStoryboard) => {
    setShowCreate(false);
    onOpenStoryboard(newStoryboard.id);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/storyboard/projects/${id}`, { method: 'DELETE' });
      setStoryboards(prev => prev.filter(s => s.id !== id));
      toast.success(`Deleted "${name}"`);
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back to app */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Studio
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storyboards</h1>
          <p className="text-sm text-gray-500 mt-1">Plan and preview your videos frame by frame before production</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#2C666E] hover:bg-[#1e4d54] text-white">
          <Plus size={16} className="mr-2" /> New Storyboard
        </Button>
      </div>

      {/* Inline Create Panel */}
      {showCreate && (
        <div className="mb-8">
          <CreateStoryboardPanel
            onCancel={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        </div>
      )}

      {/* Grid */}
      {storyboards.length === 0 && !showCreate ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Clapperboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No storyboards yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first storyboard to start planning a video frame by frame.</p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#2C666E] hover:bg-[#1e4d54] text-white">
            <Plus size={16} className="mr-2" /> Create Storyboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {storyboards.map(sb => (
            <StoryboardCard
              key={sb.id}
              storyboard={sb}
              onClick={() => onOpenStoryboard(sb.id)}
              onDelete={() => handleDelete(sb.id, sb.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
