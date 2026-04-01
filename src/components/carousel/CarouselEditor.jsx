import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Image as ImageIcon, Send, RefreshCw,
  Lock, Unlock, GripVertical, Plus, Trash2, ChevronLeft, ChevronRight, Film,
  Settings2, Play,
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
  const [generatingImages, setGeneratingImages] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pollTimer, setPollTimer] = useState(null);
  const [contentPollTimer, setContentPollTimer] = useState(null);
  const [compositor, setCompositor] = useState('satori');
  const [showStyleControls, setShowStyleControls] = useState(false);
  const [gradientColor, setGradientColor] = useState('');
  const [gradientOpacity, setGradientOpacity] = useState(100);
  const [textColor, setTextColor] = useState('');
  const [headlineScale, setHeadlineScale] = useState(100);
  const [bodyScale, setBodyScale] = useState(100);
  const [fontFamily, setFontFamily] = useState('inter');
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [videoModel, setVideoModel] = useState('wavespeed_wan');
  const [videoDuration, setVideoDuration] = useState(5);
  const [creatingSlideshw, setCreatingSlideshow] = useState(false);
  const [slideshowDuration, setSlideshowDuration] = useState(3);
  const [slideshowVoiceover, setSlideshowVoiceover] = useState(false);
  const [slideshowVoice, setSlideshowVoice] = useState('Rachel');

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

  // ── Poll for generation progress (images, videos, assembly) ──
  const pollableStatuses = ['generating', 'generating_videos', 'assembling'];
  useEffect(() => {
    if (carousel && pollableStatuses.includes(carousel.status)) {
      const timer = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/carousel/${carouselId}`);
          const data = await res.json();
          if (!data.error) {
            setCarousel(data.carousel);
            setSlides(data.carousel.carousel_slides || []);
            if (!pollableStatuses.includes(data.carousel.status)) {
              clearInterval(timer);
              setGeneratingImages(false);
              setGeneratingVideos(false);
              setAssembling(false);
              setCreatingSlideshow(false);
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
    if (carousel && slides.length === 0) {
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
  }, [carousel, slides.length, carouselId]);

  // ── Generate images for all slides ──
  async function handleGenerateImages() {
    setGeneratingImages(true);
    try {
      const stylePrompt = getStylePrompt(carousel.style_preset);
      const styleOverrides = {};
      if (gradientColor) styleOverrides.gradient_color = gradientColor;
      if (gradientOpacity !== 100) styleOverrides.gradient_opacity = gradientOpacity / 100;
      if (textColor) styleOverrides.text_color = textColor;
      if (headlineScale !== 100) styleOverrides.headline_scale = headlineScale / 100;
      if (bodyScale !== 100) styleOverrides.body_scale = bodyScale / 100;
      if (fontFamily !== 'inter') styleOverrides.font_family = fontFamily;

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
      if (gradientOpacity !== 100) regenOverrides.gradient_opacity = gradientOpacity / 100;
      if (textColor) regenOverrides.text_color = textColor;
      if (headlineScale !== 100) regenOverrides.headline_scale = headlineScale / 100;
      if (bodyScale !== 100) regenOverrides.body_scale = bodyScale / 100;
      if (fontFamily !== 'inter') regenOverrides.font_family = fontFamily;

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

  // ── Generate videos for all slides ──
  async function handleGenerateVideos() {
    setGeneratingVideos(true);
    try {
      const res = await apiFetch(`/api/carousel/${carouselId}/generate-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_model: videoModel, video_duration: videoDuration }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setGeneratingVideos(false);
      }
    } catch (err) {
      toast.error('Failed to start video generation');
      setGeneratingVideos(false);
    }
  }

  // ── Assemble all slide videos into one ──
  async function handleAssembleVideo() {
    setAssembling(true);
    try {
      const res = await apiFetch(`/api/carousel/${carouselId}/assemble-video`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setAssembling(false);
      }
    } catch (err) {
      toast.error('Failed to start assembly');
      setAssembling(false);
    }
  }

  // ── Create slideshow from static images ──
  async function handleCreateSlideshow() {
    setCreatingSlideshow(true);
    try {
      const res = await apiFetch(`/api/carousel/${carouselId}/create-slideshow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide_duration: slideshowDuration,
          voiceover: slideshowVoiceover,
          voice: slideshowVoice,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setCreatingSlideshow(false);
      } else {
        // Trigger polling by setting status to 'assembling'
        setCarousel(prev => ({ ...prev, status: 'assembling' }));
      }
    } catch (err) {
      toast.error('Failed to create slideshow');
      setCreatingSlideshow(false);
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
  const isVideoCarousel = carousel?.carousel_type === 'video';
  const allVideoDone = slides.length > 0 && slides.every(s => s.video_generation_status === 'done' && s.video_url);
  const hasAnyVideo = slides.some(s => s.video_url);

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
          {isVideoCarousel && allDone && !allVideoDone && (
            <>
              <select
                value={videoModel}
                onChange={e => setVideoModel(e.target.value)}
                className="text-xs border rounded px-2 py-1.5 bg-white text-gray-700"
                title="Video model"
              >
                <option value="wavespeed_wan">WAN 2.5</option>
                <option value="fal_kling">Kling 2.0</option>
                <option value="fal_veo3_fast">Veo 3.1 Fast</option>
                <option value="fal_hailuo">Hailuo</option>
              </select>
              <select
                value={videoDuration}
                onChange={e => setVideoDuration(Number(e.target.value))}
                className="text-xs border rounded px-1.5 py-1.5 bg-white text-gray-700"
                title="Duration per slide"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={8}>8s</option>
              </select>
              <Button onClick={handleGenerateVideos} disabled={generatingVideos || carousel.status === 'generating_videos'}>
                {generatingVideos || carousel.status === 'generating_videos'
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Film className="w-4 h-4 mr-2" />}
                Generate Videos
              </Button>
            </>
          )}
          {isVideoCarousel && allVideoDone && !carousel.assembled_video_url && (
            <Button onClick={handleAssembleVideo} disabled={assembling || carousel.status === 'assembling'}>
              {assembling || carousel.status === 'assembling'
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Film className="w-4 h-4 mr-2" />}
              Assemble Video
            </Button>
          )}
          {!isVideoCarousel && allDone && hasImages && (
            <>
              <select
                value={slideshowDuration}
                onChange={e => setSlideshowDuration(Number(e.target.value))}
                className="text-xs border rounded px-1.5 py-1.5 bg-white text-gray-700"
                title="Duration per slide"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={8}>8s</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slideshowVoiceover}
                  onChange={e => setSlideshowVoiceover(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Voiceover
              </label>
              {slideshowVoiceover && (
                <select
                  value={slideshowVoice}
                  onChange={e => setSlideshowVoice(e.target.value)}
                  className="text-xs border rounded px-1.5 py-1.5 bg-white text-gray-700"
                  title="Voice"
                >
                  <option value="Rachel">Rachel</option>
                  <option value="Adam">Adam</option>
                  <option value="Laura">Laura</option>
                  <option value="Brian">Brian</option>
                  <option value="Charlotte">Charlotte</option>
                  <option value="Charlie">Charlie</option>
                  <option value="George">George</option>
                  <option value="Alice">Alice</option>
                  <option value="Lily">Lily</option>
                  <option value="Daniel">Daniel</option>
                </select>
              )}
              <Button
                variant="outline"
                onClick={handleCreateSlideshow}
                disabled={creatingSlideshw || carousel.status === 'assembling'}
              >
                {creatingSlideshw || carousel.status === 'assembling'
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Play className="w-4 h-4 mr-2" />}
                Create Slideshow
              </Button>
            </>
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
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Gradient Density</label>
              <input
                type="range"
                min={20}
                max={100}
                value={gradientOpacity}
                onChange={e => setGradientOpacity(Number(e.target.value))}
                className="w-24 h-1.5 accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-8">{gradientOpacity}%</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={textColor || '#ffffff'}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-7 h-7 rounded border border-gray-200 cursor-pointer"
                />
                {textColor && (
                  <button
                    onClick={() => setTextColor('')}
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

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Font</label>
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white text-gray-700"
              >
                <option value="inter">Inter (Sans)</option>
                <option value="playfair">Playfair Display (Serif)</option>
                <option value="jetbrains">JetBrains Mono</option>
                <option value="caveat">Caveat (Handwritten)</option>
              </select>
            </div>

            {(gradientColor || gradientOpacity !== 100 || textColor || headlineScale !== 100 || bodyScale !== 100 || fontFamily !== 'inter') && (
              <button
                onClick={() => { setGradientColor(''); setGradientOpacity(100); setTextColor(''); setHeadlineScale(100); setBodyScale(100); setFontFamily('inter'); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Reset all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assembled video player */}
      {carousel?.assembled_video_url && (
        <div className="bg-black/95 border-b px-6 py-6">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400">Assembled Video</span>
              <a
                href={carousel.assembled_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                Download
              </a>
            </div>
            <video
              src={carousel.assembled_video_url}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: '360px' }}
            />
          </div>
        </div>
      )}

      {/* No slides — content is being generated */}
      {!hasSlides && (
        <div className="max-w-md mx-auto mt-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2C666E] mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-700 mb-1">
            {carousel.source_url ? 'Scraping article and generating slides...' : 'Researching topic and generating slides...'}
          </h3>
          <p className="text-sm text-gray-400">
            {carousel.source_url ? carousel.source_url : `Topic: ${carousel.title}`}
          </p>
          <p className="text-xs text-gray-300 mt-4">This usually takes 15-45 seconds</p>
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
                  {(slide.generation_status === 'generating' || slide.video_generation_status === 'generating') && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                  {isVideoCarousel && slide.video_generation_status === 'done' && (
                    <span className="absolute bottom-1 right-1 bg-green-500/80 text-white text-[8px] px-1 py-0.5 rounded">
                      <Film className="w-2.5 h-2.5 inline" />
                    </span>
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
