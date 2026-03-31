import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Check, X, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import LinkedInAdEditor from '@/components/ads/LinkedInAdEditor';
import LinkedInAdPreview from '@/components/ads/LinkedInAdPreview';
import GoogleRSAEditor from '@/components/ads/GoogleRSAEditor';
import GoogleAdPreview from '@/components/ads/GoogleAdPreview';
import MetaAdEditor from '@/components/ads/MetaAdEditor';
import MetaAdPreview from '@/components/ads/MetaAdPreview';

const PLATFORM_TABS = [
  { key: 'linkedin', label: 'LinkedIn', enabled: true },
  { key: 'google', label: 'Google Ads', enabled: true },
  { key: 'meta', label: 'Meta / Facebook', enabled: true },
];

const STATUS_COLORS = {
  draft: 'text-gray-500',
  approved: 'text-green-600',
  rejected: 'text-red-500',
  published: 'text-blue-600',
};

export default function AdCampaignEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [activePlatform, setActivePlatform] = useState('linkedin');
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState('');

  const loadCampaign = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/ads/campaigns/${id}`);
      const data = await res.json();
      if (data.campaign) {
        setCampaign(data.campaign);
        setVariations(data.campaign.ad_variations || []);
        // Default to first platform that has variations, or first campaign platform
        const platforms = data.campaign.platforms || ['linkedin'];
        setActivePlatform(platforms[0] || 'linkedin');
      }
    } catch (err) {
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load brand name for preview
  useEffect(() => {
    apiFetch('/api/brand').then(r => r.json()).then(d => {
      setBrandName(d.brand?.brand_name || d.brand_name || '');
    }).catch(() => {});
  }, []);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  const platformVariations = variations.filter(v => v.platform === activePlatform);
  const selectedVariation = platformVariations[selectedVariationIdx] || null;

  const handleGenerate = async () => {
    if (!campaign) return;
    setGenerating(true);
    try {
      const res = await apiFetch(`/api/ads/campaigns/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: campaign.platforms }),
      });
      const data = await res.json();
      if (data.success) {
        setVariations(data.variations || []);
        setCampaign(prev => ({ ...prev, status: 'review' }));
        setSelectedVariationIdx(0);
      } else {
        toast.error(data.error || 'Generation failed');
      }
    } catch (err) {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (variationId, imageOnly = false) => {
    setRegeneratingId(variationId);
    try {
      const res = await apiFetch(`/api/ads/variations/${variationId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerate_copy: !imageOnly,
          regenerate_image: imageOnly,
        }),
      });
      const data = await res.json();
      if (data.variation) {
        setVariations(prev => prev.map(v => v.id === variationId ? data.variation : v));
      }
    } catch (err) {
      toast.error('Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleUpdateVariation = (updated) => {
    setVariations(prev => prev.map(v => v.id === updated.id ? updated : v));
  };

  const handleSave = async (variation) => {
    setSaving(true);
    try {
      await apiFetch(`/api/ads/variations/${variation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_data: variation.copy_data,
          image_urls: variation.image_urls,
        }),
      });
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (variationId, status) => {
    try {
      const res = await apiFetch(`/api/ads/variations/${variationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.variation) {
        setVariations(prev => prev.map(v => v.id === variationId ? data.variation : v));
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteVariation = async (variationId) => {
    try {
      await apiFetch(`/api/ads/variations/${variationId}`, { method: 'DELETE' });
      setVariations(prev => prev.filter(v => v.id !== variationId));
      setSelectedVariationIdx(0);
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ads')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{campaign.name}</h1>
            <p className="text-xs text-gray-500">{campaign.objective} &middot; {campaign.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedVariation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(selectedVariation)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[#2C666E] hover:bg-[#1f4f55]"
            size="sm"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {variations.length > 0 ? 'Regenerate All' : 'Generate Ads'}
          </Button>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="bg-white border-b px-4 flex-shrink-0">
        <div className="flex gap-1">
          {PLATFORM_TABS.map(tab => {
            const count = variations.filter(v => v.platform === tab.key).length;
            const isActive = activePlatform === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.enabled) {
                    setActivePlatform(tab.key);
                    setSelectedVariationIdx(0);
                  }
                }}
                disabled={!tab.enabled}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'border-[#2C666E] text-[#2C666E]'
                    : tab.enabled
                      ? 'border-transparent text-gray-500 hover:text-gray-700'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                }`}
              >
                {!tab.enabled && <Lock className="w-3 h-3" />}
                {tab.label}
                {count > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Variation list + editor */}
        <div className="w-[480px] flex-shrink-0 border-r bg-white overflow-y-auto">
          {platformVariations.length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">No {activePlatform} ad variations yet</p>
              <p className="text-gray-400 text-xs mb-4">Click "Generate Ads" to create AI-powered variations</p>
              <Button onClick={handleGenerate} disabled={generating} size="sm" className="bg-[#2C666E] hover:bg-[#1f4f55]">
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate
              </Button>
            </div>
          ) : (
            <div>
              {/* Variation selector tabs */}
              <div className="flex border-b">
                {platformVariations.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariationIdx(idx)}
                    className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      selectedVariationIdx === idx
                        ? 'border-[#2C666E] text-[#2C666E]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>Variation {idx + 1}</span>
                    <span className={`ml-1.5 ${STATUS_COLORS[v.status] || ''}`}>
                      {v.status === 'approved' && <Check className="w-3 h-3 inline" />}
                      {v.status === 'rejected' && <X className="w-3 h-3 inline" />}
                    </span>
                  </button>
                ))}
              </div>

              {/* Editor */}
              {selectedVariation && (
                <div className="p-4">
                  {/* Approve/Reject bar */}
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant={selectedVariation.status === 'approved' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(selectedVariation.id, selectedVariation.status === 'approved' ? 'draft' : 'approved')}
                      className={selectedVariation.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {selectedVariation.status === 'approved' ? 'Approved' : 'Approve'}
                    </Button>
                    <Button
                      variant={selectedVariation.status === 'rejected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(selectedVariation.id, selectedVariation.status === 'rejected' ? 'draft' : 'rejected')}
                      className={selectedVariation.status === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      {selectedVariation.status === 'rejected' ? 'Rejected' : 'Reject'}
                    </Button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDeleteVariation(selectedVariation.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {activePlatform === 'linkedin' && (
                    <LinkedInAdEditor
                      variation={selectedVariation}
                      onUpdate={handleUpdateVariation}
                      onRegenerate={handleRegenerate}
                      regenerating={regeneratingId === selectedVariation.id}
                    />
                  )}
                  {activePlatform === 'google' && (
                    <GoogleRSAEditor
                      variation={selectedVariation}
                      onUpdate={handleUpdateVariation}
                      onRegenerate={handleRegenerate}
                      regenerating={regeneratingId === selectedVariation.id}
                      campaignName={campaign?.name}
                    />
                  )}
                  {activePlatform === 'meta' && (
                    <MetaAdEditor
                      variation={selectedVariation}
                      onUpdate={handleUpdateVariation}
                      onRegenerate={handleRegenerate}
                      regenerating={regeneratingId === selectedVariation.id}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex items-start justify-center">
          {selectedVariation ? (
            <div>
              <p className="text-xs text-gray-500 text-center mb-4 font-medium uppercase tracking-wide">
                {activePlatform === 'linkedin' ? 'LinkedIn Feed Preview' : activePlatform === 'google' ? 'Google Search Preview' : activePlatform === 'meta' ? 'Facebook / Instagram Preview' : `${activePlatform} Preview`}
              </p>
              {activePlatform === 'linkedin' && (
                <LinkedInAdPreview variation={selectedVariation} brandName={brandName} />
              )}
              {activePlatform === 'google' && (
                <GoogleAdPreview variation={selectedVariation} landingUrl={campaign?.landing_url} />
              )}
              {activePlatform === 'meta' && (
                <MetaAdPreview variation={selectedVariation} brandName={brandName} />
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-sm">Select or generate a variation to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
