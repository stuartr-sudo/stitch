import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Plus, Loader2, Calendar, Link, Video, Image, Layers,
  Clock, CheckCircle2, AlertCircle, Play, Send, Eye, Download,
  ChevronDown, ChevronUp, X, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    draft:      'bg-yellow-100 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    ready:      'bg-green-100 text-green-700 border-green-200',
    published:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial:    'bg-teal-100 text-teal-700 border-teal-200',
    scheduled:  'bg-purple-100 text-purple-700 border-purple-200',
    failed:     'bg-red-100 text-red-700 border-red-200',
    generating: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status === 'processing' || status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> :
       status === 'ready' || status === 'published' ? <CheckCircle2 className="w-3 h-3" /> :
       status === 'failed' ? <AlertCircle className="w-3 h-3" /> :
       status === 'scheduled' ? <Clock className="w-3 h-3" /> : null}
      {status}
    </span>
  );
}

// ── Media preview modal ───────────────────────────────────────────────────────
function MediaModal({ url, type, title, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-slate-300">
          <X className="w-6 h-6" />
        </button>
        {title && <p className="text-white text-sm mb-2 text-center">{title}</p>}
        {type === 'video' ? (
          <video src={url} controls autoPlay className="w-full rounded-xl max-h-[70vh] object-contain bg-black" />
        ) : (
          <img src={url} alt={title} className="w-full rounded-xl max-h-[70vh] object-contain" />
        )}
        <a href={url} download target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 text-white/70 hover:text-white text-sm">
          <Download className="w-4 h-4" /> Download
        </a>
      </div>
    </div>
  );
}

// ── Schedule picker ───────────────────────────────────────────────────────────
function ScheduleModal({ draftId, onClose, onScheduled }) {
  const [dateTime, setDateTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSchedule = async () => {
    if (!dateTime) { toast.error('Pick a date and time'); return; }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/campaigns/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, action: 'schedule', scheduled_for: new Date(dateTime).toISOString() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`Scheduled for ${new Date(dateTime).toLocaleString()}`);
      onScheduled(data.draft);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Schedule Publication</h3>
        <Input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
          min={new Date().toISOString().slice(0, 16)} className="mb-4" />
        <div className="flex gap-2">
          <Button onClick={handleSchedule} disabled={isSaving} className="flex-1 bg-[#2C666E] hover:bg-[#07393C] text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
            Schedule
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Asset grid (videos + images per ratio) ────────────────────────────────────
function AssetGrid({ assets, onPreview }) {
  if (!assets?.length) return <p className="text-xs text-slate-400 italic">No assets generated yet</p>;

  return (
    <div className="space-y-4">
      {assets.map((group, gi) => (
        <div key={gi}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {group.ratio} — {group.platforms?.join(', ')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {group.scenes?.map((scene, si) => (
              <div key={si} className="space-y-1">
                {/* Video clip */}
                {scene.videoUrl && (
                  <button onClick={() => onPreview({ url: scene.videoUrl, type: 'video', title: scene.scene?.headline })}
                    className="relative w-full aspect-[9/16] rounded-lg overflow-hidden bg-slate-900 group hover:ring-2 hover:ring-[#2C666E] transition">
                    <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {scene.scene?.role || `S${si + 1}`}
                    </span>
                  </button>
                )}
                {/* Static image */}
                {!scene.videoUrl && scene.imageUrl && (
                  <button onClick={() => onPreview({ url: scene.imageUrl, type: 'image', title: scene.scene?.headline })}
                    className="relative w-full aspect-[9/16] rounded-lg overflow-hidden bg-slate-200 group hover:ring-2 hover:ring-[#2C666E] transition">
                    <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {scene.scene?.role || `S${si + 1}`}
                    </span>
                  </button>
                )}
                {/* Caption */}
                {scene.scene?.headline && (
                  <p className="text-xs text-slate-600 text-center truncate" title={scene.scene.headline}>
                    {scene.scene.headline}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single draft card ─────────────────────────────────────────────────────────
function DraftCard({ draft, onPreview, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const isReady = draft.generation_status === 'ready';

  const handlePublishNow = async () => {
    if (!confirm('Publish this draft now?')) return;
    setIsPublishing(true);
    try {
      const res = await apiFetch('/api/campaigns/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, action: 'publish_now' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Published!');
      onUpdated(data.draft);
    } catch (err) {
      toast.error(err.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const typeIcon = draft.output_type === 'static' ? Image : draft.output_type === 'both' ? Layers : Video;
  const TypeIcon = typeIcon;

  return (
    <>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition"
          onClick={() => setExpanded(e => !e)}
        >
          <TypeIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {draft.template_name || 'Draft'}
              </p>
              <StatusBadge status={draft.generation_status} />
              {draft.publish_status && draft.publish_status !== 'draft' && (
                <StatusBadge status={draft.publish_status} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
              <span>{draft.platforms?.join(', ') || draft.output_type}</span>
              {draft.scheduled_for && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(draft.scheduled_for).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions — only when ready */}
          {isReady && draft.publish_status !== 'published' && (
            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)}
                className="text-xs h-8">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Schedule
              </Button>
              <Button size="sm" onClick={handlePublishNow} disabled={isPublishing}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white text-xs h-8">
                {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Publish
              </Button>
            </div>
          )}
          {draft.publish_status === 'published' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" /> Published
            </span>
          )}

          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </div>

        {/* Expanded: asset grid */}
        {expanded && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            {draft.generation_status === 'generating' ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating assets...
              </div>
            ) : (
              <AssetGrid assets={draft.assets_json || []} onPreview={onPreview} />
            )}

            {/* Storyboard scenes */}
            {draft.storyboard_json?.scenes?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Storyboard</p>
                <div className="space-y-1.5">
                  {draft.storyboard_json.scenes.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-semibold text-slate-500 w-16 flex-shrink-0">{s.role}</span>
                      <span className="text-slate-700 flex-1">{s.headline}</span>
                      <span className="text-slate-400 flex-shrink-0">{s.duration_seconds}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showSchedule && (
        <ScheduleModal
          draftId={draft.id}
          onClose={() => setShowSchedule(false)}
          onScheduled={onUpdated}
        />
      )}
    </>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onSelect }) {
  const draftCount = campaign.ad_drafts?.length || 0;
  const readyCount = campaign.ad_drafts?.filter(d => d.generation_status === 'ready').length || 0;
  const publishedCount = campaign.ad_drafts?.filter(d => d.publish_status === 'published').length || 0;

  return (
    <div
      onClick={() => onSelect(campaign)}
      className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 flex-1">{campaign.name}</h3>
        <StatusBadge status={campaign.status} />
      </div>

      {campaign.writing_structure && (
        <p className="text-xs text-slate-500 mb-2">
          Structure: <span className="font-medium text-slate-700">{campaign.writing_structure}</span>
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-lg font-bold text-slate-800">{draftCount}</p>
          <p className="text-xs text-slate-500">drafts</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <p className="text-lg font-bold text-green-700">{readyCount}</p>
          <p className="text-xs text-slate-500">ready</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2">
          <p className="text-lg font-bold text-emerald-700">{publishedCount}</p>
          <p className="text-xs text-slate-500">published</p>
        </div>
      </div>

      {campaign.source_url && (
        <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
          <Link className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{campaign.source_url}</span>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Calendar className="w-3 h-3" />
        {new Date(campaign.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCampaigns = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await apiFetch('/api/campaigns/list', { method: 'GET' });
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns || []);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Auto-refresh if any campaign is still processing
  useEffect(() => {
    const hasProcessing = campaigns.some(c =>
      c.status === 'processing' ||
      c.ad_drafts?.some(d => d.generation_status === 'generating')
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => loadCampaigns(true), 8000);
    return () => clearInterval(interval);
  }, [campaigns, loadCampaigns]);

  // If viewing a campaign, sync it from the list when the list refreshes
  useEffect(() => {
    if (selectedCampaign) {
      const fresh = campaigns.find(c => c.id === selectedCampaign.id);
      if (fresh) setSelectedCampaign(fresh);
    }
  }, [campaigns]);

  const handleDraftUpdated = (updatedDraft) => {
    setCampaigns(prev => prev.map(c => ({
      ...c,
      ad_drafts: c.ad_drafts?.map(d => d.id === updatedDraft.id ? { ...d, ...updatedDraft } : d),
    })));
    if (selectedCampaign) {
      setSelectedCampaign(prev => ({
        ...prev,
        ad_drafts: prev.ad_drafts?.map(d => d.id === updatedDraft.id ? { ...d, ...updatedDraft } : d),
      }));
    }
  };

  const filtered = campaigns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.writing_structure?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedCampaign) {
    const drafts = selectedCampaign.ad_drafts || [];
    const ready = drafts.filter(d => d.generation_status === 'ready').length;
    const published = drafts.filter(d => d.publish_status === 'published').length;

    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Header */}
          <header className="bg-white border-b shadow-sm sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 truncate">{selectedCampaign.name}</h1>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <StatusBadge status={selectedCampaign.status} />
                    <span>{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
                    {ready > 0 && <span className="text-green-600">{ready} ready</span>}
                    {published > 0 && <span className="text-emerald-600">{published} published</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => loadCampaigns(true)} disabled={isRefreshing}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
            {/* Campaign meta */}
            <div className="bg-white rounded-xl p-5 border grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Brand</p>
                <p className="font-semibold text-slate-800">{selectedCampaign.brand_username || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Writing Structure</p>
                <p className="font-semibold text-slate-800">{selectedCampaign.writing_structure || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Created</p>
                <p className="font-semibold text-slate-800">{new Date(selectedCampaign.created_at).toLocaleDateString()}</p>
              </div>
              {selectedCampaign.source_url && (
                <div>
                  <p className="text-slate-500 text-xs">Source Article</p>
                  <a href={selectedCampaign.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-[#2C666E] hover:underline text-xs truncate block">
                    {selectedCampaign.source_url}
                  </a>
                </div>
              )}
            </div>

            {/* Drafts */}
            {drafts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border">
                <Loader2 className="w-8 h-8 animate-spin text-[#2C666E] mx-auto mb-4" />
                <p className="text-slate-600">Generating your content...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map(draft => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onPreview={setPreviewMedia}
                    onUpdated={handleDraftUpdated}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {previewMedia && (
          <MediaModal
            url={previewMedia.url}
            type={previewMedia.type}
            title={previewMedia.title}
            onClose={() => setPreviewMedia(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/studio')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Campaigns</h1>
                <p className="text-sm text-slate-500">All generated content, ready to review and publish</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => loadCampaigns(true)} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => navigate('/studio')} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                <Plus className="w-4 h-4 mr-2" /> New Campaign
              </Button>
            </div>
          </div>
          {campaigns.length > 0 && (
            <div className="mt-3">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="max-w-xs h-8 text-sm"
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {search ? 'No campaigns match your search' : 'No campaigns yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {search ? 'Try a different search term' : 'Send an article to the pipeline or create a campaign manually'}
            </p>
            {!search && (
              <Button onClick={() => navigate('/studio')} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                <Plus className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} onSelect={setSelectedCampaign} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
