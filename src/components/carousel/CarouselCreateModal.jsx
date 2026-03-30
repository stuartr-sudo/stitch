import React, { useState, useEffect } from 'react';
import { Link2, Type, Loader2, LayoutGrid, Image, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import StyleGrid from '@/components/ui/StyleGrid';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', defaultRatio: '1080x1350', ratios: ['1080x1080', '1080x1350'] },
  { value: 'linkedin', label: 'LinkedIn', defaultRatio: '1080x1080', ratios: ['1080x1080'] },
  { value: 'tiktok', label: 'TikTok', defaultRatio: '1080x1920', ratios: ['1080x1920'] },
  { value: 'facebook', label: 'Facebook', defaultRatio: '1080x1080', ratios: ['1080x1080'] },
];

const RATIO_LABELS = {
  '1080x1080': '1:1 Square',
  '1080x1350': '4:5 Portrait',
  '1080x1920': '9:16 Vertical',
};

const CAROUSEL_TYPES = [
  { value: 'static', label: 'Static Images', icon: Image, description: 'Image slides' },
  { value: 'video', label: 'Video Carousel', icon: Film, description: 'Animated slides' },
];

export default function CarouselCreateModal({ isOpen, onClose, onCreated }) {
  const [sourceType, setSourceType] = useState('url');
  const [sourceUrl, setSourceUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [aspectRatio, setAspectRatio] = useState('1080x1350');
  const [brandKitId, setBrandKitId] = useState('');
  const [brands, setBrands] = useState([]);
  const [visualStyle, setVisualStyle] = useState('');
  const [carouselType, setCarouselType] = useState('static');
  const [creating, setCreating] = useState(false);

  const selectedPlatform = PLATFORMS.find(p => p.value === platform);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/brand/kit').then(r => r.json()).then(d => {
      if (d.brands) setBrands(d.brands);
    }).catch(() => {});
  }, [isOpen]);

  function handlePlatformChange(p) {
    setPlatform(p);
    const plat = PLATFORMS.find(x => x.value === p);
    if (plat) setAspectRatio(plat.defaultRatio);
  }

  async function handleCreate() {
    if (sourceType === 'url' && !sourceUrl.trim()) {
      toast.error('Enter a blog URL');
      return;
    }
    if (sourceType === 'topic' && !topic.trim()) {
      toast.error('Enter a topic');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/api/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || (sourceType === 'url' ? 'From URL' : topic.trim().slice(0, 60)),
          platform,
          aspect_ratio: aspectRatio,
          brand_kit_id: brandKitId || null,
          source_url: sourceType === 'url' ? sourceUrl.trim() : null,
          style_preset: visualStyle || null,
          carousel_type: carouselType,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      onCreated(data.carousel);
    } catch (err) {
      toast.error('Failed to create carousel');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="New Carousel"
      subtitle="Create branded carousel posts"
      icon={<LayoutGrid className="w-5 h-5" />}
    >
      <SlideOverBody className="p-5 space-y-6">
        {/* Carousel Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Carousel Type</label>
          <div className="flex gap-2">
            {CAROUSEL_TYPES.map(ct => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.value}
                  onClick={() => setCarouselType(ct.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    carouselType === ct.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {ct.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
          <div className="grid grid-cols-4 gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.value}
                onClick={() => handlePlatformChange(p.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  platform === p.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect ratio (if platform allows choice) */}
        {selectedPlatform?.ratios.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
              {selectedPlatform.ratios.map(r => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    aspectRatio === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {RATIO_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Brand kit */}
        {brands.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Kit</label>
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

        {/* Visual Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visual Style</label>
          <StyleGrid value={visualStyle} onChange={setVisualStyle} maxHeight="14rem" />
        </div>

        {/* Content Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSourceType('url')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                sourceType === 'url' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Blog URL
            </button>
            <button
              onClick={() => setSourceType('topic')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                sourceType === 'topic' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Type className="w-4 h-4" />
              Topic
            </button>
          </div>
        </div>

        {/* Source input */}
        {sourceType === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blog Post URL</label>
            <Input
              type="url"
              placeholder="https://example.com/blog/your-article"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <Input
              placeholder="e.g. 5 Tips for Better Sleep"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Carousel Title (optional)</label>
          <Input
            placeholder="Auto-generated if empty"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
      </SlideOverBody>

      <SlideOverFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Create Carousel
        </Button>
      </SlideOverFooter>
    </SlideOverPanel>
  );
}
