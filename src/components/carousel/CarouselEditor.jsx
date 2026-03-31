import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Wand2, Image as ImageIcon, Send, RefreshCw,
  Lock, Unlock, GripVertical, Plus, Trash2, ChevronLeft, ChevronRight, Film,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import SlidePreview from './SlidePreview';
import SlideEditor from './SlideEditor';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';

// Look up promptText for a style_preset value
function getStylePrompt(presetValue) {
  if (!presetValue) return '';
  for (const cat of STYLE_CATEGORIES) {
    const style = cat.styles.find(s => s.value === presetValue);
    if (style?.promptText) return style.promptText;
  }
  return '';
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  generating: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

export default function CarouselEditor({ carouselId }) {
  const navigate = useNavigate();
  const [carousel, setCarousel] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pollTimer, setPollTimer] = useState(null);
  const [contentPollTimer, setContentPollTimer] = useState(null);
  const [compositor, setCompositor] = useState('sharp');
  const [showStyleControls, setShowStyleControls] = useState(false);
  const [gradientColor, setGradientColor] = useState('');
  const [headlineScale, setHeadlineScale] = useState(100);
  const [bodyScale, setBodyScale] = useState(100);

  const activeSlide = slides[activeSlideIdx] || null;

  // ── Load carousel ──
  const loadCarousel = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/carousel/${carouselId}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setCarousel(data.carousel);
      setSlides(data.carousel.carousel_slides || []);
    } catch (err) {
      toast.error('Failed to load carousel');
    } finally {
      setLoading(false);
    }
  }, [carouselId]);

  useEffect(() => {
    loadCarousel();
  }, [loadCarousel]);

  // ── Poll for image generation progress ──
  useEffect(() => {
    if (carousel?.status === 'generating') {
      const timer = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/carousel/${carouselId}`);
          const data = await res.json();
          if (!data.error) {
            setCarousel(data.carousel);
            setSlides(data.carousel.carousel_slides || []);
            if (data.carousel.status !== 'generating') {
              clearInterval(timer);
            }
          }
        } catch {}
      }, 5000);
      setPollTimer(timer);
      return () => clearInterval(timer);
    }
  }, [carousel?.status, carouselId]);

  // ── Poll for content generation (slides appearing) ──
  useEffect(() => {
    if (carousel && slides.length === 0 && !generating) {
      let pollCount = 0;
      const timer = setInterval(async () => {
        pollCount++;
        if (pollCount > 30) { clearInterval(timer); return; } // give up after ~90s
        try {
          const res = await apiFetch(`/api/carousel/${carouselId}`);
          const data = await res.json();
          if (!data.error && data.carousel) {
            const newSlides = data.carousel.carousel_slides || [];
            if (newSlides.length > 0) {
              setCarousel(data.carousel);
              setSlides(newSlides);
              setActiveSlideIdx(0);
              clearInterval(timer);
            }
          }
        } catch {}
      }, 3000);
      setContentPollTimer(timer);
      return () => clearInterval(timer);
    }
  }, [carousel, slides.length, generating, carouselId]);

  // ── Generate content from URL/topic ──
  async function handleGenerateContent() {
    setGenerating(true);
    try {
      const body = {};
      if (!carousel.source_url) {
        body.topic = carousel.title || 'Untitled';
      }

      const res = await apiFetch(`/api/carousel/${carouselId}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setSlides(data.slides || []);
      setActiveSlideIdx(0);
      if (data.caption_text) {
        setCarousel(prev => ({ ...prev, caption_text: data.caption_text, slide_count: data.slides?.length }));
      }
    } catch (err) {
      toast.error('Content generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // ── Generate images for all slides ──
  async function handleGenerateImages() {
    setGeneratingImages(true);
    try {
      const stylePrompt = getStylePrompt(carousel.style_preset);
      const styleOverrides = {};
      if (gradientColor) styleOverrides.gradient_color = gradientColor;
      if (headlineScale !== 100) styleOverrides.headline_scale = headlineScale / 100;
      if (bodyScale !== 100) styleOverrides.body_scale = bodyScale / 100;

      const res = await apiFetch(`/api/carousel/${carouselId}/generate-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_model: 'fal_nano_banana',
          style_prompt: stylePrompt,
          carousel_style: carousel.carousel_style || 'bold_editorial',
          compositor,
          style_overrides: Object.keys(styleOverrides).length > 0 ? styleOverrides : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setCarousel(prev => ({ ...prev, status: 'generating' }));
    } catch (err) {
      toast.error('Image generation failed');
    } finally {
      setGeneratingImages(false);
    }
  }

  // ── Regenerate single slide ──
  async function handleRegenerateSlide(slideId) {
    const slideIdx = slides.findIndex(s => s.id === slideId);
    if (slideIdx === -1) return;

    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, generation_status: 'generating' } : s));

    try {
      const regenOverrides = {};
      if (gradientColor) regenOverrides.gradient_color = gradientColor;
      if (headlineScale !== 100) regenOverrides.headline_scale = headlineScale / 100;
      if (bodyScale !== 100) regenOverrides.body_scale = bodyScale / 100;

      const res = await apiFetch(`/api/carousel/${carouselId}/slides/${slideId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_model: 'fal_nano_banana',
          style_prompt: getStylePrompt(carousel.style_preset),
          carousel_style: carousel.carousel_style || 'bold_editorial',
          compositor,
          style_overrides: Object.keys(regenOverrides).length > 0 ? regenOverrides : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setSlides(prev => prev.map(s => s.id === slideId ? { ...s, generation_status: 'failed' } : s));
        return;
      }
      setSlides(prev => prev.map(s => s.id === slideId ? data.slide : s));
    } catch (err) {
      toast.error('Regeneration failed');
    }
  }

  // ── Update slide text ──
  async function handleUpdateSlide(slideId, updates) {
    try {
      const res = await apiFetch(`/api/carousel/${carouselId}/slides/${slideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setSlides(prev => prev.map(s => s.id === slideId ? data.slide : s));
    } catch (err) {
      toast.error('Failed to update slide');
    }
  }

  // ── Publish ──
  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await apiFetch(`/api/carousel/${carouselId}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setCarousel(prev => ({ ...prev, status: 'published', published_platform_id: data.platformPostId }));
    } catch (err) {
      toast.error('Publishing failed');
    } finally {
      setPublishing(false);
    }
  }

  // ── Update caption ──
  async function handleUpdateCaption(captionText) {
    try {
      await apiFetch(`/api/carousel/${carouselId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption_text: captionText }),
      });
      setCarousel(prev => ({ ...prev, caption_text: captionText }));
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!carousel) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Carousel not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/carousels')}>
          Back to Carousels
        </Button>
      </div>
    );
  }

  const hasSlides = slides.length > 0;
  const hasImages = slides.some(s => s.composed_image_url);
  const allDone = slides.every(s => s.generation_status === 'done');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/carousels')} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{carousel.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">
                {carousel.carousel_type === 'video' && <Film className="w-3 h-3 inline mr-1" />}
                {carousel.platform} - {carousel.aspect_ratio}{carousel.carousel_type === 'video' ? ' - Video' : ''}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[carousel.status]}`}>
                {carousel.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!confirm('Delete this carousel?')) return;
              try {
                await apiFetch(`/api/carousel/${carouselId}`, { method: 'DELETE' });
                navigate('/carousels');
              } catch { toast.error('Failed to delete'); }
            }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete carousel"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {hasSlides && (
            <select
              value={compositor}
              onChange={(e) => setCompositor(e.target.value)}
              className="text-xs border rounded px-2 py-1.5 bg-white text-gray-700"
              title="Compositor engine"
            >
              <option value="sharp">Sharp (Classic)</option>
              <option value="satori">Satori (New)</option>
            </select>
          )}
          {hasSlides && (
            <button
              onClick={() => setShowStyleControls(!showStyleControls)}
              className={`p-2 rounded-lg transition-colors ${showStyleControls ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              title="Style overrides"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          {hasSlides && !allDone && (
            <Button onClick={handleGenerateImages} disabled={generatingImages || carousel.status === 'generating'}>
              {generatingImages || carousel.status === 'generating'
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <ImageIcon className="w-4 h-4 mr-2" />}
              Generate Images
            </Button>
          )}
          {hasImages && allDone && carousel.status !== 'published' && (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Publish to {carousel.platform}
            </Button>
          )}
        </div>
      </div>

      {/* Style override controls */}
      {showStyleControls && hasSlides && (
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Gradient Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={gradientColor || '#000000'}
                  onChange={e => setGradientColor(e.target.value)}
                  className="w-7 h-7 rounded border border-gray-200 cursor-pointer"
                />
                {gradientColor && (
                  <button
                    onClick={() => setGradientColor('')}
                    className="text-[10px] text-gray-400 hover:text-gray-600 px-1"
                  >
                    reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Headline Size</label>
              <input
                type="range"
                min={60}
                max={160}
                value={headlineScale}
                onChange={e => setHeadlineScale(Number(e.target.value))}
                className="w-24 h-1.5 accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-8">{headlineScale}%</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Body Size</label>
              <input
                type="range"
                min={60}
                max={160}
                value={bodyScale}
                onChange={e => setBodyScale(Number(e.target.value))}
                className="w-24 h-1.5 accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-8">{bodyScale}%</span>
            </div>

            {(gradientColor || headlineScale !== 100 || bodyScale !== 100) && (
              <button
                onClick={() => { setGradientColor(''); setHeadlineScale(100); setBodyScale(100); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Reset all
              </button>
            )}
          </div>
        </div>
      )}

      {/* No slides — content is being generated or needs retry */}
      {!hasSlides && (
        <div className="max-w-md mx-auto mt-24 text-center">
          {generating ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-[#2C666E] mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-700 mb-1">
                {carousel.source_url ? 'Scraping article and generating slides...' : 'Researching topic and generating slides...'}
              </h3>
              <p className="text-sm text-gray-400">
                {carousel.source_url ? carousel.source_url : `Topic: ${carousel.title}`}
              </p>
              <p className="text-xs text-gray-300 mt-4">This usually takes 15-45 seconds</p>
            </>
          ) : (
            <>
              <Wand2 className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-700 mb-1">No slides yet</h3>
              <p className="text-sm text-gray-400 mb-4">
                {carousel.source_url ? carousel.source_url : `Topic: ${carousel.title}`}
              </p>
              <Button onClick={handleGenerateContent} disabled={generating}>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Content
              </Button>
            </>
          )}
        </div>
      )}

      {/* Main editor area */}
      {hasSlides && (
        <div className="flex h-[calc(100vh-65px)]">
          {/* Left: slide filmstrip */}
          <div className="w-48 border-r bg-white overflow-y-auto py-3 px-2 space-y-2 flex-shrink-0">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlideIdx(i)}
                className={`w-full rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeSlideIdx ? 'border-blue-500' : 'border-transparent hover:border-gray-200'
                }`}
              >
                <div className="relative">
                  <SlidePreview slide={slide} aspectRatio={carousel.aspect_ratio} size="thumb" />
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {i + 1}
                  </span>
                  {slide.generation_status === 'generating' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 px-1.5 py-1 truncate">{slide.slide_type}</p>
              </button>
            ))}
          </div>

          {/* Center: active slide preview */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-100 min-w-0">
            <div className="w-full max-w-md">
              {activeSlide && (
                <>
                  <SlidePreview slide={activeSlide} aspectRatio={carousel.aspect_ratio} size="large" />
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))}
                      disabled={activeSlideIdx === 0}
                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-500">
                      {activeSlideIdx + 1} / {slides.length}
                    </span>
                    <button
                      onClick={() => setActiveSlideIdx(Math.min(slides.length - 1, activeSlideIdx + 1))}
                      disabled={activeSlideIdx === slides.length - 1}
                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: slide editor */}
          <div className="w-80 border-l bg-white overflow-y-auto flex-shrink-0">
            {activeSlide && (
              <SlideEditor
                slide={activeSlide}
                onUpdate={(updates) => handleUpdateSlide(activeSlide.id, updates)}
                onRegenerate={() => handleRegenerateSlide(activeSlide.id)}
                captionText={carousel.caption_text}
                onUpdateCaption={handleUpdateCaption}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
