import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  Loader2, ArrowLeft, Plus, Check, X, ExternalLink,
  Briefcase, Trash2, Save, Sparkles,
} from 'lucide-react';

const DELIVERABLE_OPTIONS = [
  { value: 'short', label: 'Short Video', route: '/shorts/workbench' },
  { value: 'carousel', label: 'Carousel', route: '/carousels' },
  { value: 'ad_set', label: 'Ad Campaign', route: '/ads' },
  { value: 'longform', label: 'Longform Video', route: '/longform/workbench' },
  { value: 'linkedin_post', label: 'LinkedIn Post', route: '/linkedin' },
];

const BRIEF_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  generating: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  delivered: 'bg-purple-100 text-purple-700',
};

const ASSET_STATUS_COLORS = {
  queued: 'bg-gray-100 text-gray-600',
  generating: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-50 text-red-500',
};

function StatusBadge({ status, map }) {
  const cls = map[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

export default function AgencyPage() {
  const [briefs, setBriefs] = useState([]);
  const [selectedBriefId, setSelectedBriefId] = useState(null);
  const [brief, setBrief] = useState(null);
  const [assets, setAssets] = useState([]);
  const [brandKits, setBrandKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ─── Load briefs list ──────────────────────────────────────────
  const loadBriefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'list-briefs' }),
      });
      setBriefs(res.briefs || []);
    } catch (e) {
      toast.error('Failed to load briefs');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load single brief + assets ───────────────────────────────
  const loadBrief = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'get-brief', brief_id: id }),
      });
      setBrief(res.brief);
      setAssets(res.assets || []);
    } catch (e) {
      toast.error('Failed to load brief');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load brand kits ──────────────────────────────────────────
  const loadBrandKits = useCallback(async () => {
    try {
      const res = await apiFetch('/api/brand/list');
      setBrandKits(res.brands || res || []);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    loadBriefs();
    loadBrandKits();
  }, [loadBriefs, loadBrandKits]);

  useEffect(() => {
    if (selectedBriefId) loadBrief(selectedBriefId);
  }, [selectedBriefId, loadBrief]);

  // ─── Create brief ─────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const res = await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'create-brief', client_name: 'New Client' }),
      });
      const newBrief = res.brief;
      setBriefs(prev => [newBrief, ...prev]);
      setSelectedBriefId(newBrief.id);
      setBrief(newBrief);
      setAssets([]);
    } catch (e) {
      toast.error('Failed to create brief');
    }
  };

  // ─── Save brief ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!brief) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update-brief',
          brief_id: brief.id,
          client_name: brief.client_name,
          brand_kit_id: brief.brand_kit_id,
          industry: brief.industry,
          target_audience: brief.target_audience,
          product_description: brief.product_description,
          deliverables: brief.deliverables,
          config: brief.config,
        }),
      });
      setBrief(res.brief);
      // Update in list
      setBriefs(prev => prev.map(b => b.id === res.brief.id ? res.brief : b));
    } catch (e) {
      toast.error('Failed to save brief');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete brief ─────────────────────────────────────────────
  const handleDelete = async () => {
    if (!brief || !confirm('Delete this brief and all its assets?')) return;
    try {
      await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-brief', brief_id: brief.id }),
      });
      setBriefs(prev => prev.filter(b => b.id !== brief.id));
      setSelectedBriefId(null);
      setBrief(null);
      setAssets([]);
    } catch (e) {
      toast.error('Failed to delete brief');
    }
  };

  // ─── Generate ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!brief) return;
    // Save first
    await handleSave();
    setGenerating(true);
    try {
      const res = await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', brief_id: brief.id }),
      });
      setAssets(res.assets || []);
      setBrief(prev => ({ ...prev, status: 'review' }));
      setBriefs(prev => prev.map(b => b.id === brief.id ? { ...b, status: 'review' } : b));
    } catch (e) {
      toast.error('Generation failed: ' + (e.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  // ─── Update asset status ──────────────────────────────────────
  const handleAssetStatus = async (assetId, status) => {
    try {
      const res = await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'update-asset', asset_id: assetId, status }),
      });
      setAssets(prev => prev.map(a => a.id === assetId ? res.asset : a));
    } catch (e) {
      toast.error('Failed to update asset');
    }
  };

  // ─── Delete asset ─────────────────────────────────────────────
  const handleAssetDelete = async (assetId) => {
    try {
      await apiFetch('/api/agency', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-asset', asset_id: assetId }),
      });
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (e) {
      toast.error('Failed to delete asset');
    }
  };

  // ─── Brief field update helper ─────────────────────────────────
  const updateField = (field, value) => {
    setBrief(prev => ({ ...prev, [field]: value }));
  };

  const toggleDeliverable = (type) => {
    setBrief(prev => {
      const current = prev.deliverables || [];
      const next = current.includes(type)
        ? current.filter(d => d !== type)
        : [...current, type];
      return { ...prev, deliverables: next };
    });
  };

  // ─── Back to list ──────────────────────────────────────────────
  const goBack = () => {
    setSelectedBriefId(null);
    setBrief(null);
    setAssets([]);
    loadBriefs();
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // ─── Brief Detail View ─────────────────────────────────────────
  if (selectedBriefId && brief) {
    const isDraft = brief.status === 'draft';
    const deliverables = brief.deliverables || [];

    // Asset status summary
    const statusCounts = {};
    for (const a of assets) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">{brief.client_name || 'Untitled Brief'}</h1>
            <StatusBadge status={brief.status} map={BRIEF_STATUS_COLORS} />
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ─── Left: Brief Form ──────────────────────────────── */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Brief Details</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <Input
                    value={brief.client_name || ''}
                    onChange={e => updateField('client_name', e.target.value)}
                    disabled={!isDraft}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <Input
                    value={brief.industry || ''}
                    onChange={e => updateField('industry', e.target.value)}
                    placeholder="e.g., SaaS, E-commerce, Health & Wellness"
                    disabled={!isDraft}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                    rows={3}
                    value={brief.target_audience || ''}
                    onChange={e => updateField('target_audience', e.target.value)}
                    placeholder="Describe the target audience..."
                    disabled={!isDraft}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                    rows={3}
                    value={brief.product_description || ''}
                    onChange={e => updateField('product_description', e.target.value)}
                    placeholder="What are we promoting?"
                    disabled={!isDraft}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Kit</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                    value={brief.brand_kit_id || ''}
                    onChange={e => updateField('brand_kit_id', e.target.value || null)}
                    disabled={!isDraft}
                  >
                    <option value="">No Brand Kit</option>
                    {brandKits.map(bk => (
                      <option key={bk.id} value={bk.id}>{bk.brand_name || bk.name || 'Unnamed Kit'}</option>
                    ))}
                  </select>
                </div>

                {/* Deliverables checklist */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deliverables</label>
                  <div className="space-y-2">
                    {DELIVERABLE_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          deliverables.includes(opt.value)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!isDraft ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={deliverables.includes(opt.value)}
                          onChange={() => toggleDeliverable(opt.value)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={!isDraft}
                        />
                        <span className="text-sm text-gray-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                {isDraft && (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save Brief
                    </Button>
                    <Button onClick={handleGenerate} disabled={generating || !deliverables.length} variant="default" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                      Generate Campaign
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ─── Right: Campaign Assets ────────────────────────── */}
            <div className="space-y-4">
              {/* Status summary */}
              {assets.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Asset Status</h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <span key={status} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ASSET_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                        {count} {status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Asset cards */}
              {assets.length === 0 && !loading ? (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {isDraft ? 'Select deliverables and generate to create campaign assets.' : 'No assets yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.map(asset => {
                    const opt = DELIVERABLE_OPTIONS.find(d => d.value === asset.asset_type);
                    return (
                      <div key={asset.id} className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-400 uppercase">{opt?.label || asset.asset_type}</span>
                              <StatusBadge status={asset.status} map={ASSET_STATUS_COLORS} />
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">{asset.title || 'Untitled'}</p>
                            {asset.error_message && (
                              <p className="text-xs text-red-500 mt-1">{asset.error_message}</p>
                            )}
                            {asset.result_url && (
                              <a href={asset.result_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                                View Result
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {asset.status !== 'approved' && (
                              <button
                                onClick={() => handleAssetStatus(asset.id, 'approved')}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {asset.status !== 'rejected' && (
                              <button
                                onClick={() => handleAssetStatus(asset.id, 'rejected')}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {opt?.route && (
                              <a
                                href={opt.route}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                title={`Open in ${opt.label}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleAssetDelete(asset.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Briefs List View ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agency Mode</h1>
            <p className="text-sm text-gray-500 mt-1">Client briefs, campaign generation, and deliverable management</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1" /> New Brief
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : briefs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-2">No briefs yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create your first client brief to get started.</p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-1" /> New Brief
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {briefs.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBriefId(b.id)}
                className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                    {b.client_name}
                  </h3>
                  <StatusBadge status={b.status} map={BRIEF_STATUS_COLORS} />
                </div>
                {b.industry && (
                  <p className="text-xs text-gray-500 mb-2">{b.industry}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(b.deliverables || []).map(d => {
                    const opt = DELIVERABLE_OPTIONS.find(o => o.value === d);
                    return (
                      <span key={d} className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                        {opt?.label || d}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
