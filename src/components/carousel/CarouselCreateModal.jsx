import React, { useState, useEffect, useMemo } from 'react';
import { Link2, Type, Loader2, LayoutGrid, Image, Film, Check, ListOrdered, BarChart3, Quote, ArrowRightLeft, Search, GitCompare, Lightbulb, Flame, BookOpen, Eye, Award, Smile, Megaphone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import StyleGrid from '@/components/ui/StyleGrid';
import { CAROUSEL_STYLE_TEMPLATES } from '@/lib/carouselStyleTemplates';
import { POST_FORMAT_TEMPLATES, FORMAT_CATEGORIES, getFormatsForPlatform } from '@/lib/postFormatTemplates';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const FORMAT_ICONS = {
  educational_listicle: ListOrdered,
  data_infographic: BarChart3,
  step_by_step: ListOrdered,
  checklist: Check,
  comparison: GitCompare,
  myth_vs_reality: Search,
  problem_solution: Lightbulb,
  hot_take: Flame,
  before_after: ArrowRightLeft,
  carousel_story: BookOpen,
  behind_the_scenes: Eye,
  testimonial: Award,
  quote_card: Quote,
  meme_humor: Smile,
  announcement: Megaphone,
  case_study: FileText,
};

const SUITABILITY_COLORS = {
  excellent: 'bg-emerald-100 text-emerald-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-amber-100 text-amber-700',
};

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', shortRatio: '4:5', defaultRatio: '1080x1350', ratios: ['1080x1080', '1080x1350'] },
  { value: 'linkedin', label: 'LinkedIn', shortRatio: '1:1', defaultRatio: '1080x1080', ratios: ['1080x1080'] },
  { value: 'tiktok', label: 'TikTok', shortRatio: '9:16', defaultRatio: '1080x1920', ratios: ['1080x1920'] },
  { value: 'facebook', label: 'Facebook', shortRatio: '1:1', defaultRatio: '1080x1080', ratios: ['1080x1080'] },
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

function StylePreview({ layout }) {
  const { textAlign, textPosition, scrimType, scrimOpacity, scrimCoverage } = layout;
  const align = textAlign === 'center' ? 'items-center text-center' : 'items-start';
  const isItalic = layout.headlineStyle === 'italic';

  // Scrim overlay
  let scrimStyle = {};
  let scrimClass = 'absolute';
  if (scrimType === 'bottom_gradient') {
    scrimStyle = { background: `linear-gradient(to top, rgba(30,30,40,${scrimOpacity}) 0%, transparent 100%)`, bottom: 0, left: 0, right: 0, height: `${scrimCoverage * 100}%` };
  } else if (scrimType === 'top_gradient') {
    scrimStyle = { background: `linear-gradient(to bottom, rgba(30,30,40,${scrimOpacity}) 0%, transparent 100%)`, top: 0, left: 0, right: 0, height: `${scrimCoverage * 100}%` };
  } else if (scrimType === 'full_overlay') {
    scrimStyle = { background: `rgba(30,30,40,${scrimOpacity})`, inset: 0 };
  } else if (scrimType === 'solid_bar') {
    scrimStyle = { background: `rgba(30,30,40,${scrimOpacity})`, bottom: 0, left: 0, right: 0, height: `${scrimCoverage * 100}%` };
  } else if (scrimType === 'left_strip') {
    scrimStyle = { background: `rgba(30,30,40,${scrimOpacity})`, top: 0, bottom: 0, left: 0, width: `${scrimCoverage * 100}%` };
  }

  // Text position
  let textContainerClass = `absolute flex flex-col gap-1 px-3 ${align}`;
  if (scrimType === 'left_strip') {
    textContainerClass += ' top-0 bottom-0 left-0 justify-center';
    textContainerClass = textContainerClass.replace('px-3', 'px-2');
    Object.assign(scrimStyle, {});
  } else if (textPosition === 'bottom') {
    textContainerClass += ' bottom-0 left-0 right-0 pb-3';
  } else if (textPosition === 'top') {
    textContainerClass += ' top-0 left-0 right-0 pt-3';
  } else {
    textContainerClass += ' inset-0 justify-center';
  }

  const textWidth = scrimType === 'left_strip' ? `${scrimCoverage * 100}%` : '100%';

  return (
    <>
      <div className={scrimClass} style={scrimStyle} />
      <div className={textContainerClass} style={{ width: textWidth }}>
        <div className={`bg-white/90 rounded-sm h-[6px] ${textAlign === 'center' ? 'mx-auto' : ''} ${isItalic ? 'skew-x-[-6deg]' : ''}`} style={{ width: '65%' }} />
        <div className={`bg-white/90 rounded-sm h-[6px] ${textAlign === 'center' ? 'mx-auto' : ''} ${isItalic ? 'skew-x-[-6deg]' : ''}`} style={{ width: '45%' }} />
        <div className={`bg-white/50 rounded-sm h-[3px] mt-0.5 ${textAlign === 'center' ? 'mx-auto' : ''}`} style={{ width: '55%' }} />
        <div className={`bg-white/50 rounded-sm h-[3px] ${textAlign === 'center' ? 'mx-auto' : ''}`} style={{ width: '35%' }} />
      </div>
    </>
  );
}

export default function CarouselCreateModal({ isOpen, onClose, onCreated }) {
  const [sourceType, setSourceType] = useState('url');
  const [sourceUrl, setSourceUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [platforms, setPlatforms] = useState(new Set(['instagram']));
  const [aspectRatio, setAspectRatio] = useState('1080x1350');
  const [brandKitId, setBrandKitId] = useState('');
  const [brands, setBrands] = useState([]);
  const [visualStyle, setVisualStyle] = useState('');
  const [carouselStyle, setCarouselStyle] = useState('bold_editorial');
  const [carouselType, setCarouselType] = useState('static');
  const [postFormat, setPostFormat] = useState('');
  const [slideCount, setSlideCount] = useState('');
  const [creating, setCreating] = useState(false);

  const singlePlatform = platforms.size === 1 ? PLATFORMS.find(p => p.value === [...platforms][0]) : null;

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/brand/kit').then(r => r.json()).then(d => {
      if (d.brands) setBrands(d.brands);
    }).catch(() => {});
  }, [isOpen]);

  function handlePlatformToggle(p) {
    setPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else {
        next.add(p);
      }
      // Update aspect ratio when exactly one platform is selected
      if (next.size === 1) {
        const plat = PLATFORMS.find(x => x.value === [...next][0]);
        if (plat) setAspectRatio(plat.defaultRatio);
      }
      return next;
    });
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
      const platformList = [...platforms];
      const baseTitle = title.trim() || (sourceType === 'url' ? 'From URL' : topic.trim().slice(0, 60));
      let firstCarousel = null;

      for (const plat of platformList) {
        const platConfig = PLATFORMS.find(x => x.value === plat);
        const ratio = platformList.length === 1 ? aspectRatio : platConfig.defaultRatio;
        const carouselTitle = platformList.length > 1 ? `${baseTitle} (${platConfig.label})` : baseTitle;

        const res = await apiFetch('/api/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: carouselTitle,
            platform: plat,
            aspect_ratio: ratio,
            brand_kit_id: brandKitId || null,
            source_url: sourceType === 'url' ? sourceUrl.trim() : null,
            style_preset: visualStyle || null,
            carousel_type: carouselType,
            carousel_style: carouselStyle,
            post_format: postFormat || null,
          }),
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          continue;
        }

        if (!firstCarousel) firstCarousel = data.carousel;

        const genBody = {};
        if (sourceType === 'topic') genBody.topic = topic.trim();
        if (slideCount) genBody.slide_count = parseInt(slideCount, 10);

        if (postFormat) genBody.post_format = postFormat;

        apiFetch(`/api/carousel/${data.carousel.id}/generate-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(genBody),
        }).catch((err) => console.error('[carousel] generate-content failed:', err));
      }

      if (firstCarousel) onCreated(firstCarousel);
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

        {/* Platform (multi-select) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
          <div className="grid grid-cols-4 gap-2">
            {PLATFORMS.map(p => {
              const selected = platforms.has(p.value);
              return (
                <button
                  key={p.value}
                  onClick={() => handlePlatformToggle(p.value)}
                  className={`relative px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 absolute top-1 right-1 text-blue-500" />}
                  <span className="block">{p.label}</span>
                  <span className={`block text-[10px] mt-0.5 ${selected ? 'text-blue-400' : 'text-gray-400'}`}>{p.shortRatio}</span>
                </button>
              );
            })}
          </div>
          {platforms.size > 1 && (
            <p className="text-xs text-gray-400 mt-1.5">Each platform gets its own carousel with optimal dimensions</p>
          )}
        </div>

        {/* Aspect ratio (if single platform with choice) */}
        {singlePlatform?.ratios.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
              {singlePlatform.ratios.map(r => (
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

        {/* Post Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Post Format</label>
          <div className="grid grid-cols-2 gap-2 max-h-[18rem] overflow-y-auto pr-1">
            {/* No format option */}
            <button
              onClick={() => setPostFormat('')}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                !postFormat
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium block">Auto</span>
              <span className="text-xs text-gray-400 block mt-0.5">AI decides the best structure</span>
            </button>
            {POST_FORMAT_TEMPLATES.map(fmt => {
              const Icon = FORMAT_ICONS[fmt.value] || ListOrdered;
              const activePlatform = platforms.size === 1 ? [...platforms][0] : 'instagram';
              const suitability = fmt.platforms[activePlatform]?.suitability || 'good';
              return (
                <button
                  key={fmt.value}
                  onClick={() => {
                    setPostFormat(fmt.value);
                    if (fmt.defaultCarouselStyle) setCarouselStyle(fmt.defaultCarouselStyle);
                  }}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    postFormat === fmt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{fmt.label}</span>
                    <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full ${SUITABILITY_COLORS[suitability]}`}>
                      {suitability}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 block mt-0.5 leading-tight">{fmt.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carousel Style (layout template) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Carousel Style</label>
          <div className="grid grid-cols-2 gap-2">
            {CAROUSEL_STYLE_TEMPLATES.map(tpl => {
              const L = tpl.layout;
              return (
                <button
                  key={tpl.value}
                  onClick={() => setCarouselStyle(tpl.value)}
                  className={`text-left rounded-lg border text-sm transition-colors overflow-hidden ${
                    carouselStyle === tpl.value
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Layout preview */}
                  <div className="relative w-full aspect-square bg-gradient-to-br from-slate-300 to-slate-400 overflow-hidden">
                    <StylePreview layout={L} />
                  </div>
                  <div className="px-3 py-2">
                    <span className={`font-medium block text-xs ${carouselStyle === tpl.value ? 'text-blue-700' : 'text-gray-700'}`}>{tpl.label}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">{tpl.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slide Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Slides</label>
          <div className="grid grid-cols-5 gap-2">
            {['', '5', '7', '8', '10'].map(v => (
              <button
                key={v}
                onClick={() => setSlideCount(v)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  slideCount === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v || 'Auto'}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Style (image aesthetic) */}
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
          {platforms.size > 1 ? `Create ${platforms.size} Carousels` : 'Create Carousel'}
        </Button>
      </SlideOverFooter>
    </SlideOverPanel>
  );
}
