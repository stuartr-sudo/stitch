import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Eraser,
  Paintbrush,
  Upload,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Plus,
  Minus
} from 'lucide-react';

/**
 * InpaintModal - AI Object Removal/Replacement with mask painting
 */
export default function InpaintModal({ 
  isOpen, 
  onClose, 
  onImageEdited,
  isEmbedded = false 
}) {
  const [image, setImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(30);
  const [mode, setMode] = useState('paint'); // 'paint' or 'erase'
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [useProUltra, setUseProUltra] = useState(false);
  
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef(null);

  // Initialize canvases when image loads
  useEffect(() => {
    if (!image || !canvasRef.current || !maskCanvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const container = containerRef.current;
      
      if (!canvas || !maskCanvas || !container) return;

      // Calculate display size
      const maxWidth = container.clientWidth;
      const maxHeight = container.clientHeight;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      
      const displayWidth = img.width * scale;
      const displayHeight = img.height * scale;

      // Set canvas sizes
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      // Draw image
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Initialize mask canvas (black = keep)
      const maskCtx = maskCanvas.getContext('2d');
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Store image data and scale
      canvas.dataset.imgWidth = img.width;
      canvas.dataset.imgHeight = img.height;
      canvas.dataset.scale = scale;
    };
    img.src = image;
  }, [image]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const draw = useCallback((x, y) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const scale = parseFloat(canvas.dataset.scale) || 1;

    // Draw on display canvas (red overlay for paint, clear for erase)
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = mode === 'paint' ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0)';
    
    if (mode === 'erase') {
      // Redraw portion of original image
      const img = new Image();
      img.src = image;
      const sx = (x - brushSize / 2) / scale;
      const sy = (y - brushSize / 2) / scale;
      const sw = brushSize / scale;
      const sh = brushSize / scale;
      ctx.drawImage(img, sx, sy, sw, sh, x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    } else {
      ctx.fill();
    }

    // Draw on mask canvas (white = edit area)
    const maskX = x / scale;
    const maskY = y / scale;
    const maskBrush = brushSize / scale;
    
    maskCtx.beginPath();
    maskCtx.arc(maskX, maskY, maskBrush / 2, 0, Math.PI * 2);
    maskCtx.fillStyle = mode === 'paint' ? 'white' : 'black';
    maskCtx.fill();
  }, [mode, brushSize, image]);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const { x, y } = getCanvasCoords(e);
    lastPos.current = { x, y };
    draw(x, y);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const { x, y } = getCanvasCoords(e);
    
    // Interpolate between last position and current
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / (brushSize / 4));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ix = lastPos.current.x + dx * t;
      const iy = lastPos.current.y + dy * t;
      draw(ix, iy);
    }
    
    lastPos.current = { x, y };
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleClearMask = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !image) return;

    // Redraw original image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = image;

    // Clear mask
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleInpaint = async () => {
    if (!image) {
      toast.error('Please upload an image first');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Please enter what to replace with');
      return;
    }

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    setIsLoading(true);
    try {
      const maskDataUrl = maskCanvas.toDataURL('image/png');

      const response = await fetch('/api/images/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: image,
          mask_url: maskDataUrl,
          prompt: prompt.trim(),
          useProUltra,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Inpaint failed');

      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        toast.success('Inpaint complete!');
      } else if (data.requestId) {
        toast.info('Processing...');
        pollForResult(data.requestId);
      }
    } catch (error) {
      console.error('Inpaint error:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pollForResult = async (requestId) => {
    const poll = async () => {
      try {
        const response = await fetch('/api/jumpstart/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });
        const data = await response.json();
        
        if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) {
          setResultImage(data.imageUrl || data.videoUrl);
          setIsLoading(false);
          toast.success('Inpaint complete!');
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
    if (onImageEdited && resultImage) {
      onImageEdited(resultImage);
    }
    onClose();
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white">
            <Eraser className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inpaint</h2>
            <p className="text-slate-500 text-sm">Paint to remove or replace objects</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Canvas Area */}
        <div className="flex-1 p-4 flex flex-col">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#2C666E] transition-colors"
            >
              <Upload className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium">Upload an image</p>
              <p className="text-slate-400 text-sm">Click or drag to upload</p>
            </div>
          ) : !resultImage ? (
            <div 
              ref={containerRef}
              className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-crosshair"
              />
              <canvas ref={maskCanvasRef} className="hidden" />
            </div>
          ) : (
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-72 border-l p-4 space-y-4 overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {image && !resultImage && (
            <>
              {/* Brush Controls */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Brush Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'paint' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('paint')}
                    className={mode === 'paint' ? 'bg-[#2C666E]' : ''}
                  >
                    <Paintbrush className="w-4 h-4 mr-1" /> Paint
                  </Button>
                  <Button
                    variant={mode === 'erase' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('erase')}
                    className={mode === 'erase' ? 'bg-[#2C666E]' : ''}
                  >
                    <Eraser className="w-4 h-4 mr-1" /> Erase
                  </Button>
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Brush Size: {brushSize}px</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setBrushSize(Math.max(5, brushSize - 5))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => setBrushSize(Math.min(100, brushSize + 5))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleClearMask} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" /> Clear Mask
              </Button>

              <hr />

              {/* Prompt */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Replace With</Label>
                <Textarea
                  placeholder="What should appear in the painted area?"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Pro Ultra Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useProUltra}
                  onChange={(e) => setUseProUltra(e.target.checked)}
                  className="accent-[#2C666E]"
                />
                <span className="text-sm">Use Pro Ultra (4K/8K)</span>
              </label>

              <Button 
                onClick={handleInpaint}
                disabled={isLoading || !prompt.trim()}
                className="w-full bg-[#2C666E] hover:bg-[#07393C]"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Inpaint</>
                )}
              </Button>
            </>
          )}

          {resultImage && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Done!
                </div>
              </div>
              <Button variant="outline" onClick={() => setResultImage(null)} className="w-full">
                Edit Again
              </Button>
              <Button onClick={handleUseResult} className="w-full bg-[#2C666E] hover:bg-[#07393C]">
                Use This Image
              </Button>
            </div>
          )}

          {!image && (
            <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-[#2C666E] hover:bg-[#07393C]">
              <Upload className="w-4 h-4 mr-2" /> Upload Image
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Inpaint</DialogTitle>
          <DialogDescription>Paint to remove or replace objects</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
