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

export default function ThreeDViewerModal({ isOpen, onClose }) {
  const [images, setImages] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [glbUrl, setGlbUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [glbError, setGlbError] = useState(null);
  const [cameraInfo, setCameraInfo] = useState('');
  const modelViewerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const fileInputRef = useRef(null);

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
    if (url && activeSlot) {
      setImages(prev => ({ ...prev, [activeSlot]: url }));
    }
    setShowLibrary(false);
    setActiveSlot(null);
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
          body: JSON.stringify({ requestId }),
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

  const handleGenerate = async () => {
    if (!images.front_image_url) {
      toast.error('Front image is required');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Submitting...');
    setGlbUrl(null);

    try {
      const response = await apiFetch('/api/viewer3d/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(images),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.requestId) {
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

  const handleNewModel = () => {
    setGlbUrl(null);
    setThumbnailUrl(null);
    setImages({});
    setGenerationStatus('');
    setGlbError(null);
    setCameraInfo('');
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl shadow-2xl flex flex-col"
          style={{ width: '95vw', height: '90vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Box className="w-5 h-5 text-[#2C666E]" />
              <div>
                <h2 className="text-white font-semibold text-lg">3D Viewer</h2>
                <p className="text-gray-400 text-xs">Generate 3D models from images</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
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
                    <p className="text-white font-medium text-lg">{generationStatus}</p>
                    <p className="text-gray-400 text-sm mt-2">This typically takes 30-60 seconds</p>
                  </div>
                ) : (
                  <>
                    {/* Front image (required) */}
                    <div className="mb-6 w-full max-w-2xl">
                      <Label className="text-gray-300 text-sm font-medium mb-2 block">
                        Front Image <span className="text-red-400">*</span>
                      </Label>
                      {images.front_image_url ? (
                        <div className="relative group">
                          <img
                            src={images.front_image_url}
                            alt="Front"
                            className="w-full max-h-64 object-contain rounded-xl bg-gray-800"
                          />
                          <button
                            onClick={() => removeImage('front_image_url')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setActiveSlot('front_image_url'); fileInputRef.current?.click(); }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, 'front_image_url')}
                          className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#2C666E] transition-colors"
                        >
                          <Upload className="w-10 h-10 text-gray-500 mb-2" />
                          <p className="text-gray-400 font-medium">Upload front view</p>
                          <p className="text-gray-500 text-xs mt-1">Required — click or drag to upload</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setActiveSlot('front_image_url'); fileInputRef.current?.click(); }}
                          className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <Upload className="w-3 h-3 mr-1" /> Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setActiveSlot('front_image_url'); setShowLibrary(true); }}
                          className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <FolderOpen className="w-3 h-3 mr-1" /> Library
                        </Button>
                      </div>
                    </div>

                    {/* Optional angle slots */}
                    <div className="w-full max-w-2xl">
                      <Label className="text-gray-300 text-sm font-medium mb-2 block">
                        Additional Angles <span className="text-gray-500">(optional — improves quality)</span>
                      </Label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {ANGLE_SLOTS.filter(s => !s.required).map(slot => (
                          <div key={slot.key} className="flex flex-col items-center">
                            {images[slot.key] ? (
                              <div className="relative group w-full aspect-square">
                                <img
                                  src={images[slot.key]}
                                  alt={slot.label}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => removeImage(slot.key)}
                                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setActiveSlot(slot.key); fileInputRef.current?.click(); }}
                                className="w-full aspect-square border border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-[#2C666E] transition-colors"
                              >
                                <Plus className="w-4 h-4 text-gray-500" />
                              </button>
                            )}
                            <span className="text-gray-500 text-[10px] mt-1">{slot.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <div className="mt-8">
                      <Button
                        onClick={handleGenerate}
                        disabled={!images.front_image_url}
                        className="bg-[#2C666E] hover:bg-[#07393C] h-12 px-8 text-base"
                      >
                        <Box className="w-5 h-5 mr-2" /> Generate 3D Model
                      </Button>
                      <p className="text-gray-500 text-xs text-center mt-2">
                        Hunyuan 3D Pro — ~$0.38 per generation
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
                      <p className="text-red-400 font-medium mb-2">Failed to load 3D model</p>
                      <p className="text-gray-400 text-sm mb-4">Your browser may not support WebGL, or the model file is corrupted.</p>
                      <Button onClick={handleDownloadGlb} variant="outline" className="border-gray-600 text-gray-300">
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
                <div className="w-64 border-l border-gray-700 p-4 flex flex-col gap-4 overflow-y-auto">
                  <div>
                    <h3 className="text-white font-medium text-sm mb-1">3D Model</h3>
                    <p className="text-gray-400 text-xs">Orbit: drag | Zoom: scroll | Pan: right-drag</p>
                    {cameraInfo && (
                      <p className="text-gray-500 text-xs mt-1 font-mono">{cameraInfo}</p>
                    )}
                  </div>

                  <hr className="border-gray-700" />

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
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download GLB
                  </Button>

                  <hr className="border-gray-700" />

                  <Button
                    variant="outline"
                    onClick={handleNewModel}
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
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
        onClose={() => { setShowLibrary(false); setActiveSlot(null); }}
        onSelect={handleLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
