import React, { useState, useEffect } from 'react';
import { SlideOverPanel, SlideOverBody } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Film,
  Clock,
  Eye,
  Music,
  Lightbulb,
  ArrowRight,
  Copy as CopyIcon,
  Image as ImageIcon,
  Target,
  Zap,
  Heart,
  Megaphone,
  Scissors,
  Smartphone,
  BookOpen,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
          {Icon && <Icon className="w-4 h-4 text-[#2C666E]" />}
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-gray-700 space-y-2">{children}</div>}
    </div>
  );
}

function TimelineBar({ sections, totalDuration }) {
  if (!sections?.length || !totalDuration) return null;
  const colors = [
    'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400',
    'bg-teal-400', 'bg-cyan-400', 'bg-blue-400', 'bg-violet-400',
  ];
  return (
    <div className="space-y-2">
      <div className="flex rounded-lg overflow-hidden h-8">
        {sections.map((section, i) => {
          const width = ((section.end_seconds - section.start_seconds) / totalDuration) * 100;
          return (
            <div
              key={i}
              className={`${colors[i % colors.length]} flex items-center justify-center text-[10px] font-medium text-white/90 min-w-[30px]`}
              style={{ width: `${Math.max(width, 3)}%` }}
              title={`${section.label}: ${section.start_seconds}s - ${section.end_seconds}s`}
            >
              {width > 12 ? section.label : ''}
            </div>
          );
        })}
      </div>
      <div className="space-y-1">
        {sections.map((section, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${colors[i % colors.length]}`} />
            <span className="font-medium text-gray-700 w-16 flex-shrink-0">{section.start_seconds}s-{section.end_seconds}s</span>
            <span className="font-medium text-gray-800">{section.label}:</span>
            <span className="text-gray-600">{section.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdCloneModal({ isOpen, onClose, onCloneToAds }) {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [brandKitId, setBrandKitId] = useState('');
  const [brandKits, setBrandKits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [cloningToAds, setCloningToAds] = useState(false);

  // Load brand kits
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await apiFetch('/api/brand/kit');
        const data = await res.json();
        if (data.brands) {
          setBrandKits(data.brands);
          if (data.brands.length === 1) setBrandKitId(data.brands[0].id);
        }
      } catch (err) {
        console.error('[AdCloneModal] Failed to load brand kits', err);
      }
    })();
  }, [isOpen]);

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    setLoading(true);
    setProgress('Extracting frames and transcribing audio...');
    setResult(null);

    try {
      setTimeout(() => {
        setProgress(p => p.startsWith('Extracting') ? 'Running base video analysis...' : p);
      }, 8000);
      setTimeout(() => {
        setProgress(p => p.startsWith('Running base') ? 'Analyzing ad strategy and generating clone recipe...' : p);
      }, 18000);

      const res = await apiFetch('/api/analyze/clone-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          duration_seconds: Number(duration) || 30,
          brand_kit_id: brandKitId || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);
      setProgress('');
    } catch (err) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneToAds = async () => {
    if (!result?.ad_analysis?.clone_recipe) return;

    setCloningToAds(true);
    try {
      const recipe = result.ad_analysis.clone_recipe;
      const baseAnalysis = result.base_analysis;
      const brandName = result.brand_kit?.brand_name || '';

      // Build a product description from the clone recipe
      const scriptOutline = recipe.suggested_script_outline
        ?.map(s => `${s.scene}: ${s.narration}`)
        .join('\n') || '';

      const campaignPayload = {
        name: `Cloned: ${brandName || result.ad_analysis.target_audience_inferred || 'Video Ad'}`,
        objective: 'conversions',
        platforms: ['linkedin', 'meta'],
        product_description: scriptOutline.slice(0, 2000),
        target_audience: result.ad_analysis.target_audience_inferred || '',
        brand_kit_id: brandKitId || undefined,
      };

      const res = await apiFetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload),
      });

      const data = await res.json();

      if (data.campaign) {
        if (onCloneToAds) onCloneToAds(data.campaign);
        navigate(`/ads/${data.campaign.id}`);
        onClose();
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      toast.error('Failed to create campaign');
    } finally {
      setCloningToAds(false);
    }
  };

  const handleCloneToShorts = () => {
    if (!result?.base_analysis?.recreation_config) return;
    const config = result.base_analysis.recreation_config;
    const recipe = result.ad_analysis?.clone_recipe;
    const params = new URLSearchParams({
      niche: config.niche_suggestion || '',
      duration: String(recipe?.suggested_duration || config.duration || 30),
      topic: recipe?.suggested_hook || `Recreate: ${config.framework_suggestion} style, ${config.music_mood} mood`,
    });
    navigate(`/shorts/workbench?${params.toString()}`);
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const base = result?.base_analysis;
  const ad = result?.ad_analysis;

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Ad Clone Studio"
      subtitle="Analyze any video ad and clone its strategy for your brand"
      icon={<Scissors className="w-5 h-5" />}
    >
      <SlideOverBody className="p-5">
        <div className="space-y-6">
          {/* Input Section */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-700">Video Ad URL</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/ad-video.mp4"
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Estimated Duration (seconds)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={5}
                  max={120}
                  className="mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Brand Kit (optional)</Label>
                <select
                  value={brandKitId}
                  onChange={(e) => setBrandKitId(e.target.value)}
                  disabled={loading}
                  className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
                >
                  <option value="">No brand kit</option>
                  {brandKits.map(bk => (
                    <option key={bk.id} value={bk.id}>{bk.brand_name || 'Unnamed Brand'}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Adapts the clone recipe to your brand</p>
              </div>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !videoUrl.trim()}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Ad...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4 mr-2" />
                  Analyze Ad
                </>
              )}
            </Button>
            {loading && progress && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {progress}
              </p>
            )}
          </div>

          {/* Extracted Frames */}
          {result?.frames?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Extracted Frames ({result.frames.length})
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {result.frames.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Frame ${i + 1}`}
                    className="rounded-md border border-gray-200 w-full aspect-video object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ad-Specific Analysis */}
          {ad && (
            <div className="space-y-3">
              {/* Hook Technique */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/60 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" />
                  Hook Technique
                </h3>
                <p className="text-sm text-red-700">{ad.hook_technique}</p>
              </div>

              {/* CTA Style */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4" />
                  CTA Style
                </h3>
                <p className="text-sm text-emerald-700">{ad.cta_style}</p>
              </div>

              {/* Product Showcase */}
              <CollapsibleSection title="Product Showcase" icon={Eye}>
                <p>{ad.product_showcase}</p>
              </CollapsibleSection>

              {/* Emotional Triggers */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-[#2C666E]" />
                  Emotional Triggers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ad.emotional_triggers?.map((trigger, i) => (
                    <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200/60">
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ad Structure Timeline */}
              <CollapsibleSection title="Ad Structure Timeline" icon={Clock} defaultOpen={true}>
                <TimelineBar
                  sections={ad.ad_structure}
                  totalDuration={ad.ad_structure?.[ad.ad_structure.length - 1]?.end_seconds || 30}
                />
              </CollapsibleSection>

              {/* Target Audience */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#2C666E]" />
                  Inferred Target Audience
                </h3>
                <p className="text-sm text-gray-600">{ad.target_audience_inferred}</p>
              </div>

              {/* Platform Optimizations */}
              <CollapsibleSection title="Platform Optimizations" icon={Smartphone}>
                <ul className="list-disc list-inside space-y-1">
                  {ad.platform_optimizations?.map((opt, i) => (
                    <li key={i} className="text-gray-600">{opt}</li>
                  ))}
                </ul>
              </CollapsibleSection>
            </div>
          )}

          {/* Base Video Analysis */}
          {base && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-4">Video Analysis</h3>

              <CollapsibleSection title="Script Structure" icon={Film}>
                <div className="space-y-2">
                  {Object.entries(base.script_structure).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium text-gray-800 capitalize">{key}:</span>{' '}
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={`Scenes (${base.scenes?.length || 0})`} icon={Clock}>
                <div className="space-y-3">
                  {base.scenes?.map((scene, i) => (
                    <div key={i} className="border-l-2 border-[#2C666E] pl-3 space-y-1">
                      <div className="font-medium text-gray-800">{scene.timestamp}</div>
                      <div className="text-gray-600">{scene.description}</div>
                      <div className="text-xs text-gray-400">
                        {scene.camera} | {scene.framing} | {scene.movement}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Visual Style" icon={Eye}>
                <div><span className="font-medium">Palette:</span> {base.visual_style?.palette}</div>
                <div><span className="font-medium">Lighting:</span> {base.visual_style?.lighting}</div>
                <div><span className="font-medium">Mood:</span> {base.visual_style?.mood}</div>
              </CollapsibleSection>

              <CollapsibleSection title="Audio Design" icon={Music}>
                <div><span className="font-medium">Music:</span> {base.audio?.music_type}</div>
                <div><span className="font-medium">Voiceover:</span> {base.audio?.voiceover_style}</div>
                <div><span className="font-medium">SFX:</span> {base.audio?.sfx}</div>
              </CollapsibleSection>

              <CollapsibleSection title="What Works" icon={Lightbulb}>
                <ul className="list-disc list-inside space-y-1">
                  {base.what_works?.map((item, i) => (
                    <li key={i} className="text-gray-600">{item}</li>
                  ))}
                </ul>
              </CollapsibleSection>

              {result?.transcript && (
                <CollapsibleSection title="Transcript" icon={Film}>
                  <div className="relative">
                    <p className="text-gray-600 whitespace-pre-wrap text-xs leading-relaxed max-h-40 overflow-y-auto">
                      {result.transcript}
                    </p>
                    <button
                      onClick={() => copyToClipboard(result.transcript)}
                      className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600"
                      title="Copy transcript"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {/* Clone Recipe */}
          {ad?.clone_recipe && (
            <div className="border-2 border-[#2C666E]/30 rounded-lg bg-[#2C666E]/5 p-4 space-y-4">
              <h3 className="text-sm font-bold text-[#2C666E] flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                Clone Recipe
                {result?.brand_kit?.brand_name && (
                  <span className="text-xs font-normal text-[#2C666E]/70 ml-1">
                    — adapted for {result.brand_kit.brand_name}
                  </span>
                )}
              </h3>

              {/* Suggested Hook */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Suggested Hook</h4>
                <p className="text-sm text-gray-700 bg-white rounded-md p-2 border border-gray-200">{ad.clone_recipe.suggested_hook}</p>
              </div>

              {/* Visual Style */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Visual Style</h4>
                <p className="text-sm text-gray-600">{ad.clone_recipe.suggested_visual_style}</p>
              </div>

              {/* Duration */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Duration</h4>
                <p className="text-sm text-gray-600">{ad.clone_recipe.suggested_duration}s</p>
              </div>

              {/* Script Outline */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Script Outline</h4>
                <div className="space-y-2">
                  {ad.clone_recipe.suggested_script_outline?.map((scene, i) => (
                    <div key={i} className="bg-white rounded-md p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#2C666E]">{scene.scene}</span>
                        <span className="text-[10px] text-gray-400">{scene.duration_seconds}s</span>
                      </div>
                      <p className="text-xs text-gray-700 mb-1"><span className="font-medium">Narration:</span> {scene.narration}</p>
                      <p className="text-xs text-gray-500"><span className="font-medium">Visual:</span> {scene.visual_direction}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCloneToAds}
                  disabled={cloningToAds}
                  className="flex-1 bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  {cloningToAds ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Megaphone className="w-4 h-4 mr-2" />
                  )}
                  Clone to Ads Manager
                </Button>
                <Button
                  onClick={handleCloneToShorts}
                  variant="outline"
                  className="flex-1 border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/5"
                >
                  <Film className="w-4 h-4 mr-2" />
                  Clone to Shorts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideOverBody>
    </SlideOverPanel>
  );
}
