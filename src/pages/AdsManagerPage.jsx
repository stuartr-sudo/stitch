import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

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

const PLATFORM_BADGES = {
  linkedin: { label: 'LinkedIn', color: 'bg-blue-700 text-white' },
  google: { label: 'Google', color: 'bg-green-600 text-white' },
  meta: { label: 'Meta', color: 'bg-blue-500 text-white' },
};

export default function AdsManagerPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // New campaign form
  const [form, setForm] = useState({
    name: '',
    objective: 'traffic',
    platforms: ['linkedin'],
    product_description: '',
    landing_url: '',
    target_audience: '',
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Megaphone className="w-7 h-7 text-[#2C666E]" />
            <h1 className="text-2xl font-bold text-gray-900">Ads Manager</h1>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-[#2C666E] hover:bg-[#1f4f55]">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
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

        {/* Campaign list */}
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
      </div>
    </div>
  );
}
