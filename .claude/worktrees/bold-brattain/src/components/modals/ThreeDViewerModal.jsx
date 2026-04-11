import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LibraryModal from './LibraryModal';
import {
  Box,
  Upload,
  Link2,
  Loader2,
  Camera,
  Download,
  RotateCcw,
  X,
  FolderOpen,
  Plus,
  Image as ImageIcon,
  Star,
  Play,
  Film,
  ChevronDown,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

// Import model-viewer web component (side-effect only)
import '@google/model-viewer';

const ANGLE_SLOTS = [
  { key: 'front_image_url', label: 'Front', required: true },
  { key: 'back_image_url', label: 'Back' },
  { key: 'left_image_url', label: 'Left' },
  { key: 'right_image_url', label: 'Right' },
  { key: 'top_image_url', label: 'Top' },
  { key: 'bottom_image_url', label: 'Bottom' },
  { key: 'left_front_image_url', label: 'Left Front' },
  { key: 'right_front_image_url', label: 'Right Front' },
];

const MODELS_3D = [
  { id: 'wavespeed-hunyuan3d', label: 'Hunyuan3D v2', provider: 'wavespeed', price: '~$0.30', description: 'Multi-view reconstruction (front + back + left required)', minImages: 3, requiredSlots: ['front_image_url', 'back_image_url', 'left_image_url'] },
];

const ANIMATION_STYLES = [
  { id: 'turntable_360', label: 'Turntable 360\u00B0', description: 'Smooth rotation loop' },
  { id: 'hero_reveal', label: 'Hero Reveal', description: 'Dramatic pull-back reveal' },
  { id: 'explode_view', label: 'Explode View', description: 'Parts separate & reassemble' },
  { id: 'cinematic_orbit', label: 'Cinematic Orbit', description: 'Cinematic camera orbit' },
];

const VIDEO_MODELS_FOR_ANIMATE = [
  { id: 'fal_kling', label: 'Kling 2.0 Master', price: '~$0.10/clip' },
  { id: 'fal_wan_pro', label: 'Wan Pro', price: '~$0.08/clip' },
  { id: 'fal_hailuo', label: 'Hailuo/MiniMax', price: '~$0.10/clip' },
  { id: 'wavespeed_wan', label: 'Wavespeed WAN', price: '~$0.06/clip' },
];

export default function ThreeDViewerModal({ isOpen, onClose }) {
  const [images, setImages] = useState({});
  const [selectedModel, setSelectedModel] = useState('wavespeed-hunyuan3d');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [glbUrl, setGlbUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const activeSlotRef = useRef(null);
  const pendingImagesRef = useRef({});
  const [glbError, setGlbError] = useState(null);
  const [cameraInfo, setCameraInfo] = useState('');
  // Animation state
  const [angleImages, setAngleImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState('');
  const [animationStyle, setAnimationStyle] = useState('turntable_360');
  const [animVideoModel, setAnimVideoModel] = useState('fal_kling');
  const [durationPerTransition, setDurationPerTransition] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState('');
  const [animVideoUrl, setAnimVideoUrl] = useState(null);
  const modelViewerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const providerRef = useRef('fal');
  const pollUrlsRef = useRef({});

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImages({});
      setIsGenerating(false);
      setGlbUrl(null);
      setThumbnailUrl(null);
      setGenerationStatus('');
      setIsSaving(false);
      setGlbError(null);
      setCameraInfo('');
      setAngleImages([]);
      setIsCapturing(false);
      setCaptureProgress('');
      setAnimationStyle('turntable_360');
      setAnimVideoModel('fal_kling');
      setDurationPerTransition(5);
      setIsAnimating(false);
      setAnimProgress('');
      setAnimVideoUrl(null);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
  }, [isOpen]);

  const handleFileUpload = (e, slotKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImages(prev => ({ ...prev, [slotKey]: event.target.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e, slotKey) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImages(prev => ({ ...prev, [slotKey]: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Update camera info when model-viewer orbit changes
  const handleCameraChange = useCallback(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;
    const orbit = mv.getCameraOrbit();
    setCameraInfo(`θ ${Math.round(orbit.theta * 180 / Math.PI)}° φ ${Math.round(orbit.phi * 180 / Math.PI)}° r ${orbit.radius.toFixed(1)}`);
  }, []);

  // Attach camera-change listener when GLB loads
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv || !glbUrl) return;
    mv.addEventListener('camera-change', handleCameraChange);
    mv.addEventListener('error', () => setGlbError('Failed to load 3D model'));
    return () => {
      mv.removeEventListener('camera-change', handleCameraChange);
      mv.removeEventListener('error', () => setGlbError('Failed to load 3D model'));
    };
  }, [glbUrl, handleCameraChange]);

  const handleLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (!url) {
      activeSlotRef.current = null;
      setShowLibrary(false);
      setActiveSlot(null);
      return;
    }
    const currentSlot = activeSlotRef.current;
    if (!currentSlot) return;

    // Accumulate synchronously in ref — immune to React batching and onClose nulling the ref
    pendingImagesRef.current[currentSlot] = url;

    // Advance to next empty slot (across ALL slots including front)
    const filled = { ...images, ...pendingImagesRef.current };
    const nextEmpty = ANGLE_SLOTS.find(s => !filled[s.key]);

    if (nextEmpty) {
      activeSlotRef.current = nextEmpty.key;
      setActiveSlot(nextEmpty.key);
    } else {
      activeSlotRef.current = null;
      setShowLibrary(false);
      setActiveSlot(null);
    }

    // Flush all accumulated assignments to state
    const pending = { ...pendingImagesRef.current };
    setImages(prev => ({ ...prev, ...pending }));
  };

  const setAsFront = (slotKey) => {
    if (slotKey === 'front_image_url' || !images[slotKey]) return;
    setImages(prev => {
      const next = { ...prev };
      // Swap: current front goes to the clicked slot, clicked slot becomes front
      const oldFront = next.front_image_url;
      next.front_image_url = next[slotKey];
      if (oldFront) {
        next[slotKey] = oldFront;
      } else {
        delete next[slotKey];
      }
      return next;
    });
  };

  const removeImage = (slotKey) => {
    setImages(prev => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const pollForResult = useCallback((requestId) => {
    const poll = async () => {
      try {
        const response = await apiFetch('/api/viewer3d/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, provider: providerRef.current, ...pollUrlsRef.current }),
        });
        if (!response.ok) {
          pollTimerRef.current = setTimeout(poll, 5000);
          return;
        }
        const data = await response.json();

        if (data.status === 'completed' && data.glbUrl) {
          setGlbUrl(data.glbUrl);
          setThumbnailUrl(data.thumbnailUrl);
          setIsGenerating(false);
          setGenerationStatus('');
        } else if (data.status === 'failed') {
          setIsGenerating(false);
          setGenerationStatus('');
          toast.error('3D generation failed: ' + (data.error || 'Unknown error'));
        } else {
          const statusText = data.status === 'queued'
            ? `Queued${data.queuePosition ? ` (position ${data.queuePosition})` : ''}...`
            : 'Generating 3D model...';
          setGenerationStatus(statusText);
          pollTimerRef.current = setTimeout(poll, 5000);
        }
      } catch (error) {
        console.error('[3DViewer] Poll error:', error);
        pollTimerRef.current = setTimeout(poll, 5000);
      }
    };
    poll();
  }, []);

  const modelConfig = MODELS_3D.find(m => m.id === selectedModel) || MODELS_3D[0];

  const canGenerate = (() => {
    if (modelConfig.requiredSlots) {
      return modelConfig.requiredSlots.every(k => images[k]);
    }
    return Object.keys(images).length >= (modelConfig.minImages || 1);
  })();

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (modelConfig.requiredSlots) {
        const missing = modelConfig.requiredSlots.filter(k => !images[k]).map(k => ANGLE_SLOTS.find(s => s.key === k)?.label).join(', ');
        toast.error(`${modelConfig.label} requires: ${missing}`);
      } else {
        toast.error('At least one image is required');
      }
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Submitting...');
    setGlbUrl(null);
    providerRef.current = modelConfig.provider;

    try {
      const response = await apiFetch('/api/viewer3d/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...images, model: selectedModel, prompt: prompt.trim() || undefined }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.requestId) {
        providerRef.current = data.provider || modelConfig.provider;
        pollUrlsRef.current = { statusUrl: data.statusUrl, responseUrl: data.responseUrl };
        setGenerationStatus('Queued...');
        pollForResult(data.requestId);
      }
    } catch (error) {
      console.error('[3DViewer] Generate error:', error);
      toast.error(error.message);
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleCaptureAngle = async () => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    setIsSaving(true);
    try {
      const blob = await mv.toBlob({ mimeType: 'image/png', idealAspect: true });
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Save to library
      const response = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: dataUrl,
          type: 'image',
          source: '3d-viewer',
          title: '3D View Export',
        }),
      });

      const data = await response.json();
      if (data.success || data.url) {
        toast.warning('View saved to Library');
      } else {
        toast.error('Failed to save view');
      }
    } catch (error) {
      console.error('[3DViewer] Capture error:', error);
      toast.error('Failed to capture view');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadGlb = () => {
    if (!glbUrl) return;
    const a = document.createElement('a');
    a.href = glbUrl;
    a.download = '3d-model.glb';
    a.click();
  };

  const captureAngles = async () => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;

    setIsCapturing(true);
    setAngleImages([]);
    setAnimVideoUrl(null);
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const captured = [];

    try {
      for (let i = 0; i < angles.length; i++) {
        setCaptureProgress(`Capturing angle ${i + 1}/${angles.length} (${angles[i]}\u00B0)...`);
        viewer.cameraOrbit = `${angles[i]}deg 75deg 105%`;
        // Wait for the model-viewer to render the new angle
        await new Promise(r => setTimeout(r, 600));

        const blob = await viewer.toBlob({ mimeType: 'image/png', idealAspect: true });

        // Upload to library
        const formData = new FormData();
        formData.append('file', blob, `3d-angle-${angles[i]}.png`);
        formData.append('type', 'image');
        formData.append('source', '3d-viewer');
        formData.append('title', `3D Angle ${angles[i]}\u00B0`);

        const response = await apiFetch('/api/library/save', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        const url = data.url || data.publicUrl;
        if (url) {
          captured.push(url);
        } else {
          toast.error(`Failed to save angle ${angles[i]}\u00B0`);
        }
      }

      setAngleImages(captured);
      setCaptureProgress('');

      if (captured.length < 2) {
        toast.error('Need at least 2 angles captured');
      }
    } catch (err) {
      console.error('[3DViewer] Capture angles error:', err);
      toast.error('Failed to capture angles: ' + err.message);
    } finally {
      setIsCapturing(false);
      setCaptureProgress('');
      // Reset camera to auto-rotate
      viewer.cameraOrbit = '0deg 75deg 105%';
    }
  };

  const handleAnimate = async () => {
    if (angleImages.length < 2) {
      toast.error('Capture angles first');
      return;
    }

    setIsAnimating(true);
    setAnimProgress('Starting animation pipeline...');
    setAnimVideoUrl(null);

    try {
      const response = await apiFetch('/api/viewer3d/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angle_images: angleImages,
          animation_style: animationStyle,
          video_model: animVideoModel,
          duration_per_transition: durationPerTransition,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Animation failed');
      }

      if (data.video_url) {
        setAnimVideoUrl(data.video_url);
        setAnimProgress('');
      } else {
        throw new Error('No video URL returned');
      }
    } catch (err) {
      console.error('[3DViewer] Animate error:', err);
      toast.error(err.message);
      setAnimProgress('');
    } finally {
      setIsAnimating(false);
    }
  };

  const handleNewModel = () => {
    setGlbUrl(null);
    setThumbnailUrl(null);
    setImages({});
    setPrompt('');
    setGenerationStatus('');
    setGlbError(null);
    setCameraInfo('');
    setAngleImages([]);
    setIsCapturing(false);
    setAnimVideoUrl(null);
    setAnimProgress('');
    setIsAnimating(false);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col"
          style={{ width: '95vw', height: '90vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white shadow-sm">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-slate-900 font-semibold text-lg">3D Viewer</h2>
                <p className="text-slate-500 text-xs">Generate 3D models from images</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex">
            {!glbUrl ? (
              /* === INPUT STATE === */
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                {isGenerating ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-[#2C666E] animate-spin mx-auto mb-4" />
                    <p className="text-slate-900 font-medium text-lg">{generationStatus}</p>
                    <p className="text-slate-500 text-sm mt-2">This typically takes 30-60 seconds</p>
                  </div>
                ) : (
                  <>
                    {/* Unified image grid — all 8 slots */}
                    <div className="w-full max-w-3xl">
                      <Label className="text-slate-700 text-sm font-medium mb-1 block">
                        Reference Images <span className="text-slate-400">(click star to set as front)</span>
                      </Label>
                      <p className="text-slate-400 text-xs mb-3">
                        Front image is required. Additional angles improve quality.
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {ANGLE_SLOTS.map(slot => {
                          const isFront = slot.key === 'front_image_url';
                          return (
                            <div key={slot.key} className="flex flex-col items-center">
                              {images[slot.key] ? (
                                <div className={`relative group w-full aspect-square rounded-lg overflow-hidden ${isFront ? 'ring-2 ring-[#2C666E] ring-offset-1' : ''}`}>
                                  <img
                                    src={images[slot.key]}
                                    alt={slot.label}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    onClick={() => removeImage(slot.key)}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  {!isFront && (
                                    <button
                                      onClick={() => setAsFront(slot.key)}
                                      title="Set as front image"
                                      className="absolute top-0.5 left-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#2C666E]"
                                    >
                                      <Star className="w-3 h-3" />
                                    </button>
                                  )}
                                  {isFront && (
                                    <div className="absolute top-0.5 left-0.5 bg-[#2C666E] text-white rounded-full p-0.5">
                                      <Star className="w-3 h-3 fill-current" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setActiveSlot(slot.key); fileInputRef.current?.click(); }}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, slot.key)}
                                  className={`w-full aspect-square border border-dashed rounded-lg flex items-center justify-center hover:border-[#2C666E] transition-colors bg-slate-50 ${isFront ? 'border-[#2C666E] border-2' : 'border-slate-300'}`}
                                >
                                  <Plus className="w-4 h-4 text-slate-400" />
                                </button>
                              )}
                              <span className={`text-[10px] mt-1 ${isFront ? 'text-[#2C666E] font-medium' : 'text-slate-500'}`}>{slot.label}{isFront ? ' *' : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const emptySlot = ANGLE_SLOTS.find(s => !images[s.key]);
                            if (emptySlot) { setActiveSlot(emptySlot.key); fileInputRef.current?.click(); }
                          }}
                          className="text-xs border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                          <Upload className="w-3 h-3 mr-1" /> Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const emptySlot = ANGLE_SLOTS.find(s => !images[s.key]);
                            if (emptySlot) { pendingImagesRef.current = {}; activeSlotRef.current = emptySlot.key; setActiveSlot(emptySlot.key); setShowLibrary(true); }
                          }}
                          className="text-xs border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                          <FolderOpen className="w-3 h-3 mr-1" /> Library
                        </Button>
                      </div>
                    </div>

                    {/* Prompt / material description */}
                    <div className="mt-6 w-full max-w-3xl">
                      <Label className="text-slate-700 text-sm font-medium mb-1 block">Description (optional)</Label>
                      <p className="text-slate-400 text-xs mb-2">Describe materials, surfaces, and textures to guide reconstruction</p>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Brushed steel helmet with matte finish, no painted textures, metallic surface with subtle scratches"
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E] outline-none resize-none"
                      />
                    </div>

                    {/* Model selector */}
                    <div className="mt-6 w-full max-w-3xl">
                      <Label className="text-slate-700 text-sm font-medium mb-2 block">3D Model</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {MODELS_3D.map(m => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModel(m.id)}
                            className={`text-left p-3 rounded-lg border transition-all ${selectedModel === m.id ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-slate-900">{m.label}</span>
                              <span className="text-xs text-slate-400">{m.price}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                            {m.requiredSlots && (
                              <div className="flex gap-1 mt-1.5">
                                {m.requiredSlots.map(k => {
                                  const slot = ANGLE_SLOTS.find(s => s.key === k);
                                  const filled = !!images[k];
                                  return (
                                    <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded ${filled ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                      {slot?.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <div className="mt-6">
                      <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="bg-[#2C666E] hover:bg-[#07393C] h-12 px-8 text-base"
                      >
                        <Box className="w-5 h-5 mr-2" /> Generate 3D Model
                      </Button>
                      <p className="text-slate-400 text-xs text-center mt-2">
                        {modelConfig.label} — {modelConfig.price} per generation
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* === VIEWER STATE === */
              <>
                {/* 3D Viewer */}
                <div className="flex-1 bg-gray-950 flex items-center justify-center p-4">
                  {glbError ? (
                    <div className="text-center">
                      <p className="text-red-500 font-medium mb-2">Failed to load 3D model</p>
                      <p className="text-slate-500 text-sm mb-4">Your browser may not support WebGL, or the model file is corrupted.</p>
                      <Button onClick={handleDownloadGlb} variant="outline" className="border-slate-300 text-slate-600">
                        <Download className="w-4 h-4 mr-2" /> Download GLB File
                      </Button>
                    </div>
                  ) : (
                    <model-viewer
                      ref={modelViewerRef}
                      src={glbUrl}
                      alt="Generated 3D Model"
                      camera-controls
                      auto-rotate
                      shadow-intensity="1"
                      shadow-softness="1"
                      environment-image="neutral"
                      exposure="1"
                      style={{ width: '100%', height: '100%', backgroundColor: '#0a0a0a' }}
                    />
                  )}
                </div>

                {/* Controls strip */}
                <div className="w-72 border-l border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto bg-white">
                  <div>
                    <h3 className="text-slate-900 font-medium text-sm mb-1">3D Model</h3>
                    <p className="text-slate-500 text-xs">Orbit: drag | Zoom: scroll | Pan: right-drag</p>
                    {cameraInfo && (
                      <p className="text-slate-400 text-xs mt-1 font-mono">{cameraInfo}</p>
                    )}
                  </div>

                  <hr className="border-slate-200" />

                  <Button
                    onClick={handleCaptureAngle}
                    disabled={isSaving}
                    className="w-full bg-[#2C666E] hover:bg-[#07393C]"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Camera className="w-4 h-4 mr-2" /> Capture This Angle</>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDownloadGlb}
                    className="w-full border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download GLB
                  </Button>

                  <hr className="border-slate-200" />

                  {/* ── Animate Section ── */}
                  <div>
                    <h3 className="text-slate-900 font-medium text-sm mb-2 flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-[#2C666E]" /> Animate
                    </h3>

                    {/* Step 1: Capture angles */}
                    <Button
                      onClick={captureAngles}
                      disabled={isCapturing || isAnimating}
                      variant="outline"
                      className="w-full mb-2 border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/5"
                    >
                      {isCapturing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {captureProgress || 'Capturing...'}</>
                      ) : (
                        <><RotateCcw className="w-4 h-4 mr-2" /> Capture 8 Angles</>
                      )}
                    </Button>

                    {/* Captured angles preview */}
                    {angleImages.length > 0 && (
                      <div className="mb-3">
                        <p className="text-slate-500 text-xs mb-1.5">{angleImages.length} angles captured</p>
                        <div className="grid grid-cols-4 gap-1">
                          {angleImages.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Angle ${i + 1}`}
                              className="w-full aspect-square rounded object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Animation controls - shown after angles captured */}
                    {angleImages.length >= 2 && (
                      <div className="space-y-3">
                        {/* Style picker */}
                        <div>
                          <label className="text-slate-600 text-xs font-medium mb-1 block">Style</label>
                          <div className="grid grid-cols-2 gap-1">
                            {ANIMATION_STYLES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => setAnimationStyle(s.id)}
                                className={`text-left p-1.5 rounded border text-xs transition-all ${
                                  animationStyle === s.id
                                    ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                <span className="font-medium block leading-tight">{s.label}</span>
                                <span className="text-[10px] text-slate-400 leading-tight">{s.description}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Video model */}
                        <div>
                          <label className="text-slate-600 text-xs font-medium mb-1 block">Video Model</label>
                          <select
                            value={animVideoModel}
                            onChange={(e) => setAnimVideoModel(e.target.value)}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E] outline-none"
                          >
                            {VIDEO_MODELS_FOR_ANIMATE.map(m => (
                              <option key={m.id} value={m.id}>{m.label} ({m.price})</option>
                            ))}
                          </select>
                        </div>

                        {/* Duration slider */}
                        <div>
                          <label className="text-slate-600 text-xs font-medium mb-1 flex justify-between">
                            <span>Duration per transition</span>
                            <span className="text-slate-400">{durationPerTransition}s</span>
                          </label>
                          <input
                            type="range"
                            min={3}
                            max={8}
                            value={durationPerTransition}
                            onChange={(e) => setDurationPerTransition(Number(e.target.value))}
                            className="w-full accent-[#2C666E]"
                          />
                        </div>

                        {/* Generate button */}
                        <Button
                          onClick={handleAnimate}
                          disabled={isAnimating || angleImages.length < 2}
                          className="w-full bg-[#2C666E] hover:bg-[#07393C]"
                        >
                          {isAnimating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {animProgress || 'Animating...'}</>
                          ) : (
                            <><Play className="w-4 h-4 mr-2" /> Generate Animation</>
                          )}
                        </Button>

                        {isAnimating && (
                          <p className="text-slate-400 text-[10px] text-center">
                            This may take several minutes ({angleImages.length} transitions)
                          </p>
                        )}

                        {/* Video result */}
                        {animVideoUrl && (
                          <div className="mt-2">
                            <p className="text-slate-600 text-xs font-medium mb-1">Result</p>
                            <video
                              src={animVideoUrl}
                              controls
                              loop
                              autoPlay
                              muted
                              className="w-full rounded-lg border border-slate-200"
                            />
                            <a
                              href={animVideoUrl}
                              download="3d-animation.mp4"
                              className="mt-1.5 flex items-center justify-center gap-1 text-xs text-[#2C666E] hover:underline"
                            >
                              <Download className="w-3 h-3" /> Download Video
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-200" />

                  <Button
                    variant="outline"
                    onClick={handleNewModel}
                    className="w-full border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> New Model
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, activeSlot)}
      />

      {/* Library modal */}
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => { setShowLibrary(false); activeSlotRef.current = null; setActiveSlot(null); pendingImagesRef.current = {}; }}
        onSelect={handleLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
