import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import URLImage from '@/components/canvas/URLImage';
import LibraryModal from './LibraryModal';
import {
  Layers,
  Upload,
  Link2,
  Loader2,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
  Frame,
  Download,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const DIMENSION_PRESETS = [
  { id: '1080x1080', label: '1080×1080 (Square)', width: 1080, height: 1080 },
  { id: '1920x1080', label: '1920×1080 (16:9)', width: 1920, height: 1080 },
  { id: '1080x1920', label: '1080×1920 (9:16)', width: 1080, height: 1920 },
  { id: '1200x628', label: '1200×628 (Facebook)', width: 1200, height: 628 },
  { id: '1080x1350', label: '1080×1350 (Instagram)', width: 1080, height: 1350 },
];

const ENHANCEMENT_PRESETS = [
  { id: 'none', label: 'No Enhancement', prompt: '' },
  // Blending
  { id: 'seamless', label: 'Seamless Blend', prompt: 'Seamlessly blend all elements together with smooth transitions and consistent lighting' },
  { id: 'natural', label: 'Natural Composite', prompt: 'Create a natural, realistic composite with proper shadows, reflections, and perspective' },
  { id: 'harmonize', label: 'Color Harmonize', prompt: 'Harmonize colors across all elements for a cohesive, unified color palette' },
  // Advertising
  { id: 'product-shot', label: 'Product Shot', prompt: 'Professional product photography style with clean background and studio lighting' },
  { id: 'lifestyle', label: 'Lifestyle Ad', prompt: 'Lifestyle advertising aesthetic with warm, inviting atmosphere and aspirational feel' },
  { id: 'minimalist', label: 'Minimalist Ad', prompt: 'Clean minimalist advertising style with generous white space and elegant simplicity' },
  { id: 'bold-ad', label: 'Bold & Vibrant', prompt: 'Bold, vibrant advertising style with high contrast and eye-catching colors' },
  // Cinematic
  { id: 'cinematic', label: 'Cinematic', prompt: 'Cinematic look with dramatic lighting, film grain, and movie-like color grading' },
  { id: 'golden-hour', label: 'Golden Hour', prompt: 'Warm golden hour lighting with soft shadows and sun flares' },
  { id: 'moody', label: 'Moody & Dark', prompt: 'Moody atmosphere with deep shadows, muted colors, and dramatic contrast' },
  // Artistic
  { id: 'dreamy', label: 'Dreamy Soft', prompt: 'Soft, dreamy aesthetic with gentle blur, pastel tones, and ethereal glow' },
  { id: 'vintage', label: 'Vintage Film', prompt: 'Vintage film photography look with warm tones, faded colors, and subtle grain' },
  { id: 'neon', label: 'Neon Glow', prompt: 'Vibrant neon glow effect with bold colors and futuristic lighting' },
  { id: 'watercolor', label: 'Watercolor Blend', prompt: 'Artistic watercolor painting style with soft edges and flowing colors' },
  // Technical
  { id: 'sharpen', label: 'Enhance & Sharpen', prompt: 'Enhance image quality, sharpen details, and improve clarity' },
  { id: 'upscale', label: 'HD Upscale', prompt: 'Upscale and enhance to high definition with crisp, clear details' },
];

/**
 * SmooshModal - Infinite Canvas Image Compositor
 */
export default function SmooshModal({ 
  isOpen, 
  onClose, 
  onImageGenerated,
  isEmbedded = false 
}) {
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(ENHANCEMENT_PRESETS[0]);
  const [dimensions, setDimensions] = useState(DIMENSION_PRESETS[0]);
  const [stageScale, setStageScale] = useState(0.5);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // Reset modal state when opened (but preserve canvas centering logic in separate useEffect)
  useEffect(() => {
    if (isOpen) {
      setImages([]);
      setSelectedId(null);
      setPrompt('');
      setSelectedPreset(ENHANCEMENT_PRESETS[0]);
      setDimensions(DIMENSION_PRESETS[0]);
      setStageScale(0.5);
      setIsLoading(false);
      setResultImage(null);
      setShowUrlInput(false);
      setUrlInput('');
    }
  }, [isOpen]);

  const handleLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) {
      // Load the image to get dimensions
      const img = new Image();
      img.onload = () => {
        const maxSize = 400;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const newImage = {
          id: Date.now() + Math.random(),
          url: url,
          x: dimensions.width / 2 - (img.width * scale) / 2,
          y: dimensions.height / 2 - (img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          rotation: 0,
          masks: [],
        };
        setImages(prev => [...prev, newImage]);
      };
      img.src = url;
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Scale down large images
          const maxSize = 400;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const newImage = {
            id: Date.now() + Math.random(),
            url: event.target.result,
            x: dimensions.width / 2 - (img.width * scale) / 2,
            y: dimensions.height / 2 - (img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            rotation: 0,
            masks: [],
          };
          setImages(prev => [...prev, newImage]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput);
      const newImage = {
        id: Date.now(),
        url: urlInput.trim(),
        x: dimensions.width / 2 - 150,
        y: dimensions.height / 2 - 100,
        scaleX: 0.5,
        scaleY: 0.5,
        rotation: 0,
        masks: [],
      };
      setImages(prev => [...prev, newImage]);
      setUrlInput('');
      setShowUrlInput(false);
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleImageUpdate = useCallback((id, newAttrs) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, ...newAttrs } : img
    ));
  }, []);

  const handleDeleteSelected = () => {
    if (selectedId) {
      setImages(prev => prev.filter(img => img.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleZoom = (delta) => {
    setStageScale(prev => Math.max(0.1, Math.min(2, prev + delta)));
  };

  const handleFrameContent = () => {
    if (images.length === 0) {
      // Frame the canvas dimensions if no images
      const container = containerRef.current;
      if (!container) return;
      
      const padding = 50;
      const scaleX = container.clientWidth / (dimensions.width + padding * 2);
      const scaleY = container.clientHeight / (dimensions.height + padding * 2);
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setStageScale(newScale);
      setStagePos({
        x: (container.clientWidth - dimensions.width * newScale) / 2,
        y: (container.clientHeight - dimensions.height * newScale) / 2,
      });
      return;
    }
    
    // Calculate bounds using canvas dimensions as base
    let minX = 0, minY = 0, maxX = dimensions.width, maxY = dimensions.height;

    const container = containerRef.current;
    if (!container) return;

    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    
    const scaleX = container.clientWidth / contentWidth;
    const scaleY = container.clientHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    setStageScale(newScale);
    setStagePos({
      x: (container.clientWidth - contentWidth * newScale) / 2 - minX * newScale + padding * newScale,
      y: (container.clientHeight - contentHeight * newScale) / 2 - minY * newScale + padding * newScale,
    });
  };

  // Auto-center canvas when modal opens
  useEffect(() => {
    if (isOpen || isEmbedded) {
      // Small delay to ensure container is rendered
      const timer = setTimeout(() => {
        handleFrameContent();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isEmbedded, dimensions]);

  const flattenCanvas = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    // Create offscreen canvas at full resolution
    const offscreen = document.createElement('canvas');
    offscreen.width = dimensions.width;
    offscreen.height = dimensions.height;
    const ctx = offscreen.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw images
    const promises = images.map(img => {
      return new Promise((resolve) => {
        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.onload = () => {
          const scaleX = img.scaleX || 1;
          const scaleY = img.scaleY || 1;
          const width = imgEl.width * scaleX;
          const height = imgEl.height * scaleY;
          
          ctx.save();
          ctx.translate(img.x, img.y);
          ctx.rotate(((img.rotation || 0) * Math.PI) / 180);
          ctx.drawImage(imgEl, 0, 0, width, height);
          ctx.restore();
          resolve();
        };
        imgEl.onerror = () => resolve();
        imgEl.src = img.url;
      });
    });

    return Promise.all(promises).then(() => offscreen.toDataURL('image/png'));
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setIsLoading(true);
    try {
      const flatImage = await flattenCanvas();
      if (!flatImage) throw new Error('Failed to flatten canvas');

      // Use custom prompt, or preset prompt, or default
      const finalPrompt = prompt.trim() || selectedPreset.prompt || 'A seamless, professional composition';

      const response = await apiFetch('/api/smoosh/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: flatImage,
          prompt: finalPrompt,
          width: dimensions.width,
          height: dimensions.height,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        toast.success('Image generated!');
      } else if (data.requestId) {
        toast.info('Processing...');
        pollForResult(data.requestId);
      }
    } catch (error) {
      console.error('Smoosh error:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pollForResult = async (requestId) => {
    const poll = async () => {
      try {
        const response = await apiFetch('/api/jumpstart/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });
        const data = await response.json();
        
        if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) {
          setResultImage(data.imageUrl || data.videoUrl);
          setIsLoading(false);
          toast.success('Image generated!');
        } else if (data.status === 'failed') {
          setIsLoading(false);
          toast.error('Failed: ' + (data.error || 'Unknown error'));
        } else {
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    poll();
  };

  const handleUseResult = () => {
    if (onImageGenerated && resultImage) {
      onImageGenerated(resultImage);
    }
    onClose();
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Smoosh</h2>
              <p className="text-slate-500 text-sm">Infinite canvas image compositor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-500 w-16 text-center">{Math.round(stageScale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFrameContent}>
              <Frame className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-slate-200 overflow-hidden relative">
          {!resultImage ? (
            <Stage
              ref={stageRef}
              width={containerRef.current?.clientWidth || 800}
              height={containerRef.current?.clientHeight || 600}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              draggable
              onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
              onClick={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                {/* Canvas background */}
                <Rect
                  x={0}
                  y={0}
                  width={dimensions.width}
                  height={dimensions.height}
                  fill="white"
                  stroke="#ccc"
                  strokeWidth={2}
                />
                
                {images.map((img) => (
                  <URLImage
                    key={img.id}
                    image={{
                      id: img.id,
                      src: img.url,
                      x: img.x,
                      y: img.y,
                      rotation: img.rotation || 0,
                      scaleX: img.scaleX || 1,
                      scaleY: img.scaleY || 1,
                      masks: img.masks || [],
                    }}
                    isSelected={selectedId === img.id}
                    onSelect={() => setSelectedId(img.id)}
                    onChange={(newAttrs) => handleImageUpdate(img.id, { ...newAttrs, url: newAttrs.src })}
                  />
                ))}
              </Layer>
            </Stage>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-80 border-l p-4 space-y-4 overflow-y-auto bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Add Images */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Add Images</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="w-4 h-4 mr-1" /> Upload
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowUrlInput(!showUrlInput)} className="flex-1">
                <Link2 className="w-4 h-4 mr-1" /> URL
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)} className="flex-1">
                <FolderOpen className="w-4 h-4 mr-1" /> Library
              </Button>
            </div>

            {showUrlInput && (
              <div className="mt-2 flex gap-2">
                <Input 
                  placeholder="https://..." 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddUrl} size="sm">Add</Button>
              </div>
            )}
          </div>

          {/* Dimension Presets */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Canvas Size</Label>
            <select
              value={dimensions.id}
              onChange={(e) => setDimensions(DIMENSION_PRESETS.find(d => d.id === e.target.value))}
              className="w-full p-2 border rounded-lg text-sm"
            >
              {DIMENSION_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </div>

          {/* Selected Image Actions */}
          {selectedId && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Image</span>
                <Button variant="ghost" size="sm" onClick={handleDeleteSelected} className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Drag to move, corners to resize/rotate</p>
            </div>
          )}

          <hr />

          {/* AI Enhancement */}
          <div>
            <Label className="text-sm font-medium mb-2 block">AI Enhancement Style</Label>
            <select
              value={selectedPreset.id}
              onChange={(e) => {
                const preset = ENHANCEMENT_PRESETS.find(p => p.id === e.target.value);
                setSelectedPreset(preset);
                if (preset.prompt) {
                  setPrompt(preset.prompt);
                }
              }}
              className="w-full p-2 border rounded-lg text-sm mb-3"
            >
              {ENHANCEMENT_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
            
            <Label className="text-sm font-medium mb-2 block text-slate-500">Custom Prompt (Optional)</Label>
            <Textarea
              placeholder="Add custom instructions or modify the preset..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">
              {selectedPreset.id !== 'none' 
                ? 'Preset applied. Add custom instructions to refine further.'
                : 'Describe how the AI should enhance your composition.'}
            </p>
          </div>

          {!resultImage ? (
            <Button 
              onClick={handleGenerate}
              disabled={isLoading || images.length === 0}
              className="w-full bg-[#2C666E] hover:bg-[#07393C] h-11"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Done!
                </div>
              </div>
              <Button variant="outline" onClick={() => setResultImage(null)} className="w-full">
                Back to Canvas
              </Button>
              <a
                href={resultImage}
                download="smoosh-composition.png"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Download to Device
              </a>
              <Button onClick={handleUseResult} className="w-full bg-[#2C666E] hover:bg-[#07393C]">
                <Plus className="w-4 h-4 mr-2" /> Use This Image
              </Button>
            </div>
          )}

          {/* Image List */}
          {images.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Layers ({images.length})</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {images.map((img, idx) => (
                  <div 
                    key={img.id}
                    onClick={() => setSelectedId(img.id)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                      selectedId === img.id ? 'bg-[#90DDF0]/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 bg-slate-200 rounded overflow-hidden">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm text-slate-600">Layer {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
          <VisuallyHidden>
            <DialogTitle>Smoosh</DialogTitle>
            <DialogDescription>Infinite canvas image compositor</DialogDescription>
          </VisuallyHidden>
          {content}
        </DialogContent>
      </Dialog>
      
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
