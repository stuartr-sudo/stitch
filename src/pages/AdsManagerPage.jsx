import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone, Loader2, Trash2, ArrowLeft, LayoutGrid, List, Check, X, Clock, Eye, ChevronDown, ChevronUp, Sparkles, Link, BookOpen, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import AdCloneModal from '@/components/modals/AdCloneModal';

const OBJECTIVE_LABELS = {
  traffic: 'Traffic',
  conversions: 'Conversions',
  awareness: 'Awareness',
  leads: 'Lead Generation',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  generating: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
};

const VARIATION_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  published: 'bg-blue-100 text-blue-700',
};

const PLATFORM_BADGES = {
  linkedin: { label: 'LinkedIn', color: 'bg-blue-700 text-white' },
  google: { label: 'Google', color: 'bg-green-600 text-white' },
  meta: { label: 'Meta', color: 'bg-blue-500 text-white' },
};

function AdCard({ variation, campaignName, onClick }) {
  const copy = variation.copy_data || {};
  const imageUrl = variation.image_urls?.[0];
  const platform = variation.platform;
  const badge = PLATFORM_BADGES[platform] || { label: platform, color: 'bg-gray-500 text-white' };
  const statusClass = VARIATION_STATUS_COLORS[variation.status] || VARIATION_STATUS_COLORS.draft;

  // Get a headline for display
  let headline = '';
  if (platform === 'google') {
    headline = (copy.headlines || []).find(h => h?.trim()) || 'Untitled Ad';
  } else if (platform === 'linkedin') {
    headline = copy.headline || copy.introText?.slice(0, 60) || 'Untitled Ad';
  } else if (platform === 'meta') {
    headline = copy.headline || copy.primaryText?.slice(0, 60) || 'Untitled Ad';
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Image */}
      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Ad"
            className={`w-full object-cover ${platform === 'meta' ? 'aspect-square' : 'aspect-[1.91/1]'}`}
          />
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusClass}`}>
              {variation.status}
            </span>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye className="w-6 h-6 text-white drop-shadow-lg" />
          </div>
        </div>
      ) : (
        <div className={`w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${platform === 'meta' ? 'aspect-square' : 'aspect-[1.91/1]'}`}>
          <div className="text-center">
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-2 ${badge.color}`}>
              {badge.label}
            </span>
            <p className="text-gray-400 text-xs">No image</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{headline}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{campaignName}</p>
      </div>
    </div>
  );
}

export default function AdsManagerPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState('campaigns'); // 'campaigns' or 'canvas'
  const [canvasFilter, setCanvasFilter] = useState('all'); // 'all', 'draft', 'approved', 'published', 'rejected'
  const [canvasPlatform, setCanvasPlatform] = useState('all'); // 'all', 'linkedin', 'google', 'meta'
  const [showCloneModal, setShowCloneModal] = useState(false);

  // New campaign form
  const [form, setForm] = useState({
    name: '',
    objective: 'traffic',
    platforms: ['linkedin'],
    product_description: '',
    landing_url: '',
    target_audience: '',
  });

  // Auto-fill panel state
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [useUrl, setUseUrl] = useState(false);
  const [useBrandKit, setUseBrandKit] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [brandKits, setBrandKits] = useState([]);
  const [selectedBrandKitId, setSelectedBrandKitId] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesizeStatus, setSynthesizeStatus] = useState('');
  const [synthesizeError, setSynthesizeError] = useState('');

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await apiFetch('/api/ads/campaigns');
      const data = await res.json();
      if (!data.error) setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('[AdsManager] load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Load brand kits for Auto-fill dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/brand/kit');
        const data = await res.json();
        if (data.brands) {
          setBrandKits(data.brands);
          if (data.brands.length === 1) setSelectedBrandKitId(data.brands[0].id);
        }
      } catch (err) {
        console.error('[AdsManager] brand kits load error', err);
      }
    })();
  }, []);

  const handleSynthesize = async () => {
    const payload = {};
    if (useUrl && scrapeUrl.trim()) payload.url = scrapeUrl.trim();
    if (useBrandKit && selectedBrandKitId) payload.brand_kit_id = selectedBrandKitId;

    if (!payload.url && !payload.brand_kit_id) return;

    setSynthesizing(true);
    setSynthesizeError('');
    setSynthesizeStatus(payload.url ? 'scraping' : 'generating');

    try {
      if (payload.url) {
        setTimeout(() => setSynthesizeStatus(prev => prev === 'scraping' ? 'generating' : prev), 5000);
      }

      const res = await apiFetch('/api/ads/synthesize-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.description) {
        const hasExisting = form.product_description.trim() || form.target_audience.trim();
        if (hasExisting && !confirm('Replace existing description and target audience?')) {
          return;
        }
        setForm(prev => ({
          ...prev,
          product_description: data.description,
          ...(data.target_audience ? { target_audience: data.target_audience } : {}),
        }));
      } else {
        setSynthesizeError(data.error || 'Failed to generate description');
      }
    } catch (err) {
      setSynthesizeError('Network error — please try again');
    } finally {
      setSynthesizing(false);
      setSynthesizeStatus('');
    }
  };

  // Flatten all variations across all campaigns for canvas view
  const allVariations = useMemo(() => {
    const result = [];
    for (const campaign of campaigns) {
      for (const variation of (campaign.ad_variations || [])) {
        result.push({ ...variation, _campaignName: campaign.name, _campaignId: campaign.id });
      }
    }
    return result;
  }, [campaigns]);

  const filteredVariations = useMemo(() => {
    let filtered = allVariations;
    if (canvasFilter !== 'all') {
      filtered = filtered.filter(v => v.status === canvasFilter);
    }
    if (canvasPlatform !== 'all') {
      filtered = filtered.filter(v => v.platform === canvasPlatform);
    }
    return filtered;
  }, [allVariations, canvasFilter, canvasPlatform]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.campaign) {
        navigate(`/ads/${data.campaign.id}`);
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      toast.error('Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this campaign and all its variations?')) return;
    try {
      await apiFetch(`/api/ads/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const togglePlatform = (p) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  };

  // Stats for canvas header
  const stats = useMemo(() => ({
    total: allVariations.length,
    draft: allVariations.filter(v => v.status === 'draft').length,
    approved: allVariations.filter(v => v.status === 'approved').length,
    published: allVariations.filter(v => v.status === 'published').length,
    rejected: allVariations.filter(v => v.status === 'rejected').length,
  }), [allVariations]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Megaphone className="w-7 h-7 text-[#2C666E]" />
            <h1 className="text-2xl font-bold text-gray-900">Ads Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('campaigns')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'campaigns' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4 inline mr-1.5" />
                Campaigns
              </button>
              <button
                onClick={() => setView('canvas')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'canvas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4 inline mr-1.5" />
                All Ads
              </button>
            </div>
            <Button variant="outline" onClick={() => setShowCloneModal(true)} className="border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/5">
              <Scissors className="w-4 h-4 mr-2" />
              Clone Ad
            </Button>
            <Button onClick={() => setShowCreate(!showCreate)} className="bg-[#2C666E] hover:bg-[#1f4f55]">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-xl border p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-lg">New Ad Campaign</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Q2 Product Launch"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product / Service Description</label>

              {/* Auto-fill with AI panel */}
              <div className="mb-2 border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAutoFillOpen(!autoFillOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-700 font-medium">
                    <Sparkles className="w-4 h-4 text-[#2C666E]" />
                    Auto-fill with AI
                  </span>
                  {autoFillOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {autoFillOpen && (
                  <div className="px-3 py-3 space-y-3 bg-white border-t">
                    {/* URL source */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={useUrl}
                        onChange={e => setUseUrl(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
                      />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <Link className="w-3.5 h-3.5" />
                          Import from URL
                        </label>
                        <input
                          type="url"
                          value={scrapeUrl}
                          onChange={e => setScrapeUrl(e.target.value)}
                          placeholder="https://example.com/product"
                          disabled={!useUrl}
                          className={`mt-1 w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E] ${!useUrl ? 'bg-gray-100 text-gray-400' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Brand Kit source */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={useBrandKit}
                        onChange={e => setUseBrandKit(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
                      />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          Import from Brand Kit
                        </label>
                        {brandKits.length > 0 ? (
                          <select
                            value={selectedBrandKitId}
                            onChange={e => setSelectedBrandKitId(e.target.value)}
                            disabled={!useBrandKit}
                            className={`mt-1 w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E] ${!useBrandKit ? 'bg-gray-100 text-gray-400' : ''}`}
                          >
                            <option value="">Select a brand kit...</option>
                            {brandKits.map(bk => (
                              <option key={bk.id} value={bk.id}>{bk.brand_name || 'Unnamed Brand'}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500">
                            No brand kits found.{' '}
                            <button type="button" onClick={() => navigate('/studio')} className="text-[#2C666E] hover:underline">Create one in Studio</button>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Generate button + error */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleSynthesize}
                        disabled={synthesizing || ((!useUrl || !scrapeUrl.trim()) && (!useBrandKit || !selectedBrandKitId))}
                        className="px-4 py-1.5 bg-[#2C666E] text-white rounded-md text-sm font-medium hover:bg-[#1f4f55] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {synthesizing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {synthesizeStatus === 'scraping' ? 'Scraping URL...' : 'Generating description...'}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate Description
                          </>
                        )}
                      </button>
                    </div>

                    {synthesizeError && (
                      <p className="text-xs text-red-600">{synthesizeError}</p>
                    )}
                  </div>
                )}
              </div>

              <textarea
                value={form.product_description}
                onChange={e => setForm(prev => ({ ...prev, product_description: e.target.value }))}
                placeholder="Describe what you're advertising..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Landing URL</label>
                <input
                  type="url"
                  value={form.landing_url}
                  onChange={e => setForm(prev => ({ ...prev, landing_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={form.target_audience}
                  onChange={e => setForm(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="e.g. SaaS founders, 25-45"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
              <div className="flex gap-2">
                {Object.entries(OBJECTIVE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setForm(prev => ({ ...prev, objective: key }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.objective === key ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platforms</label>
              <div className="flex gap-2">
                {Object.entries(PLATFORM_BADGES).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => togglePlatform(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.platforms.includes(key) ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={creating || !form.name.trim()} className="bg-[#2C666E] hover:bg-[#1f4f55]">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Campaign
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ── Campaigns list view ── */}
        {view === 'campaigns' && (
          <>
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-20">
                <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No ad campaigns yet</p>
                <p className="text-sm text-gray-400">Create your first campaign to generate ad variations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(campaign => {
                  const variationCount = campaign.ad_variations?.length || 0;
                  const platforms = campaign.platforms || [];
                  return (
                    <div
                      key={campaign.id}
                      onClick={() => navigate(`/ads/${campaign.id}`)}
                      className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{campaign.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] || STATUS_COLORS.draft}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{OBJECTIVE_LABELS[campaign.objective] || campaign.objective}</span>
                          <span>{variationCount} variation{variationCount !== 1 ? 's' : ''}</span>
                          <div className="flex gap-1">
                            {platforms.map(p => (
                              <span key={p} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLATFORM_BADGES[p]?.color || 'bg-gray-200 text-gray-600'}`}>
                                {PLATFORM_BADGES[p]?.label || p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, campaign.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── All Ads canvas view ── */}
        {view === 'canvas' && (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="font-semibold">{stats.total}</span> total ads
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All', count: stats.total },
                  { key: 'draft', label: 'Drafts', count: stats.draft, icon: Clock },
                  { key: 'approved', label: 'Approved', count: stats.approved, icon: Check },
                  { key: 'published', label: 'Published', count: stats.published, icon: Check },
                  { key: 'rejected', label: 'Rejected', count: stats.rejected, icon: X },
                ].map(({ key, label, count, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setCanvasFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                      canvasFilter === key
                        ? 'bg-[#2C666E] text-white border-[#2C666E]'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {label}
                    <span className={`ml-0.5 ${canvasFilter === key ? 'text-white/70' : 'text-gray-400'}`}>({count})</span>
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCanvasPlatform('all')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    canvasPlatform === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {Object.entries(PLATFORM_BADGES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setCanvasPlatform(key)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      canvasPlatform === key ? color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
              </div>
            ) : filteredVariations.length === 0 ? (
              <div className="text-center py-20">
                <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">
                  {allVariations.length === 0 ? 'No ads generated yet' : 'No ads match the current filter'}
                </p>
                <p className="text-sm text-gray-400">
                  {allVariations.length === 0
                    ? 'Create a campaign and generate ad variations to see them here'
                    : 'Try changing the status or platform filter'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVariations.map(variation => (
                  <AdCard
                    key={variation.id}
                    variation={variation}
                    campaignName={variation._campaignName}
                    onClick={() => navigate(`/ads/${variation._campaignId}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AdCloneModal
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        onCloneToAds={(campaign) => {
          loadCampaigns();
        }}
      />
    </div>
  );
}
