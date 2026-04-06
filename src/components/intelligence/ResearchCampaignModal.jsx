import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const STRATEGIES = [
  { id: 'beat_weaknesses', label: 'Beat on Weaknesses', description: 'Exploit gaps in their strategy', color: 'border-green-500 bg-green-50' },
  { id: 'match_improve', label: 'Match & Improve', description: 'Take what works and do it better', color: 'border-gray-300 bg-white' },
  { id: 'differentiate', label: 'Differentiate', description: 'Go a deliberately different direction', color: 'border-gray-300 bg-white' },
];

const PLATFORMS_LIST = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'google', label: 'Google' },
  { id: 'meta', label: 'Meta' },
];

const OBJECTIVES = ['conversions', 'traffic', 'awareness', 'leads'];

export default function ResearchCampaignModal({ open, onClose, sourceAds, competitor, onCampaignCreated }) {
  const [name, setName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platforms, setPlatforms] = useState(['meta', 'google']);
  const [objective, setObjective] = useState('conversions');
  const [strategy, setStrategy] = useState('beat_weaknesses');
  const [insights, setInsights] = useState([]);
  const [selectedInsights, setSelectedInsights] = useState([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Synthesize on open
  useEffect(() => {
    if (!open || !sourceAds?.length) return;
    const adIds = sourceAds.map(a => a.id).filter(Boolean);
    if (!adIds.length) return;

    setSynthesizing(true);
    apiFetch('/api/intelligence/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_ids: adIds }),
    }).then(r => r.json()).then(data => {
      if (data.error) {
        toast.error('Failed to synthesize insights');
        return;
      }
      const suggested = data.synthesis?.suggested_insights || [];
      setInsights(suggested);
      setSelectedInsights(suggested.map((_, i) => i));
      if (data.synthesis?.recommended_strategy) setStrategy(data.synthesis.recommended_strategy);
    }).finally(() => setSynthesizing(false));
  }, [open, sourceAds]);

  // Auto-fill name
  useEffect(() => {
    if (open && competitor?.name) {
      setName(`Beat ${competitor.name} — Campaign`);
    }
  }, [open, competitor]);

  const togglePlatform = (p) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleInsight = (idx) => {
    setSelectedInsights(prev => prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]);
  };

  const handleGenerate = async () => {
    if (!name.trim() || !platforms.length) return;
    setGenerating(true);

    const body = {
      name: name.trim(),
      product_description: productDescription,
      landing_url: landingUrl,
      target_audience: targetAudience,
      platforms,
      objective,
      strategy,
      insights: selectedInsights.map(i => insights[i]),
      source_ad_ids: sourceAds?.map(a => a.id).filter(Boolean) || [],
      competitor_id: competitor?.id || null,
    };

    const data = await apiFetch('/api/intelligence/generate-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());

    setGenerating(false);

    if (data.error) {
      toast.error(data.error);
      return;
    }

    onCampaignCreated(data);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">New Campaign — Powered by Research</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        {/* Research source badge */}
        {competitor && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 mb-6 flex items-center gap-3">
            <span className="text-lg">🔍</span>
            <div>
              <div className="text-xs text-indigo-600 font-semibold">Based on research of</div>
              <div className="text-sm text-gray-800">{competitor.name} — {sourceAds?.length || 0} ads analyzed</div>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Left: Campaign config */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CAMPAIGN NAME</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">YOUR PRODUCT / SERVICE</label>
              <textarea value={productDescription} onChange={e => setProductDescription(e.target.value)} placeholder="Describe your product or paste your landing page URL..." className="w-full text-sm border rounded-md p-2 h-20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">LANDING URL</label>
              <Input value={landingUrl} onChange={e => setLandingUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">TARGET AUDIENCE</label>
              <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Who are you targeting?" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">PLATFORMS</label>
              <div className="flex gap-2">
                {PLATFORMS_LIST.map(p => (
                  <button key={p.id} onClick={() => togglePlatform(p.id)} className={`px-4 py-1.5 rounded-md text-xs font-medium ${platforms.includes(p.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">OBJECTIVE</label>
              <div className="flex gap-2">
                {OBJECTIVES.map(o => (
                  <button key={o} onClick={() => setObjective(o)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${objective === o ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Research intelligence */}
          <div className="flex-1 border-l pl-6 space-y-4">
            <h3 className="text-sm font-bold text-indigo-600">Research Intelligence</h3>

            {/* Strategy selector */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">COMPETITIVE STRATEGY</label>
              <div className="space-y-2">
                {STRATEGIES.map(s => (
                  <button key={s.id} onClick={() => setStrategy(s.id)} className={`w-full text-left border-2 rounded-lg p-3 transition-colors ${strategy === s.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <div className="text-sm font-semibold text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">INSIGHTS TO APPLY</label>
              {synthesizing ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing research...
                </div>
              ) : insights.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {insights.map((insight, idx) => (
                    <label key={idx} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-md p-2 cursor-pointer hover:bg-gray-100">
                      <input type="checkbox" checked={selectedInsights.includes(idx)} onChange={() => toggleInsight(idx)} className="mt-0.5 accent-indigo-600" />
                      <div>
                        <div className="text-xs text-gray-800">{insight.text}</div>
                        <div className="text-[10px] text-gray-400">From: {insight.source} ({insight.category})</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No insights available — save and analyze ads first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="mt-6 pt-4 border-t">
          <Button onClick={handleGenerate} disabled={generating || !name.trim() || !platforms.length} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base">
            {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
            {generating ? 'Generating...' : `Generate Campaign — ${strategy.replace(/_/g, ' ')} on ${selectedInsights.length} Insights`}
          </Button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Will create 3 variations per platform x {platforms.length} platform{platforms.length > 1 ? 's' : ''} = {3 * platforms.length} ad variations
          </p>
        </div>
      </div>
    </div>
  );
}
