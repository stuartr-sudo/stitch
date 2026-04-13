import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import StyleGrid from '@/components/ui/StyleGrid';
import { CAROUSEL_STYLE_TEMPLATES } from '@/lib/carouselStyleTemplates';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function LinkedInCreateModal({ isOpen, onClose, topicId, topicHeadline, onCreated }) {
  const [brandKitId, setBrandKitId] = useState('');
  const [brands, setBrands] = useState([]);
  const [visualStyle, setVisualStyle] = useState('');
  const [carouselStyle, setCarouselStyle] = useState('bold_editorial');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/brand/kit').then(r => r.json()).then(d => {
      if (d.brands) setBrands(d.brands);
    }).catch(() => {});
  }, [isOpen]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await apiFetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          style_preset: visualStyle || null,
          brand_kit_id: brandKitId || null,
          carousel_style: carouselStyle,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      onCreated(data.posts || []);
      onClose();
    } catch (err) {
      toast.error('Generation failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Generate Posts"
      subtitle={topicHeadline ? `From: ${topicHeadline.slice(0, 60)}...` : 'Generate LinkedIn posts'}
      icon={<Sparkles className="w-5 h-5" />}
    >
      <SlideOverBody className="p-5 space-y-6">
        {/* Engine info */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Production Engine</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Generates 3 variations using different engagement strategies — each with its own hook, emotional driver, and curiosity-triggering image. Powered by the same craft engine as the Shorts Builder.
          </p>
        </div>

        {/* Brand kit */}
        {brands.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Kit</label>
            <p className="text-xs text-gray-400 mb-2">Posts will match your brand's industry depth and audience</p>
            <select
              value={brandKitId}
              onChange={e => setBrandKitId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">No brand kit</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.brand_name || 'Unnamed Brand'}</option>
              ))}
            </select>
          </div>
        )}

        {/* Image Layout Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image Layout</label>
          <div className="grid grid-cols-2 gap-2">
            {CAROUSEL_STYLE_TEMPLATES.map(tpl => (
              <button
                key={tpl.value}
                onClick={() => setCarouselStyle(tpl.value)}
                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  carouselStyle === tpl.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium block">{tpl.label}</span>
                <span className="text-xs text-gray-400 block mt-0.5">{tpl.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visual Style (image aesthetic) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visual Style</label>
          <StyleGrid value={visualStyle} onChange={setVisualStyle} maxHeight="14rem" />
        </div>
      </SlideOverBody>

      <SlideOverFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate 3 Variations
        </Button>
      </SlideOverFooter>
    </SlideOverPanel>
  );
}
