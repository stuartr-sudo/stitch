import React, { useState, useRef, useEffect } from 'react';
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
import LibraryModal from './LibraryModal';
import {
  Focus,
  Upload,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Plus,
  ZoomIn,
  Download,
  ExternalLink,
  FolderOpen
} from 'lucide-react';

/**
 * LensModal - Adjust viewing angles of images using AI
 */
export default function LensModal({ 
  isOpen, 
  onClose, 
  onImageEdited,
  isEmbedded = false 
}) {
  const [image, setImage] = useState(null);
  const [horizontalAngle, setHorizontalAngle] = useState(0);
  const [verticalAngle, setVerticalAngle] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setImage(null);
      setHorizontalAngle(0);
      setVerticalAngle(0);
      setZoom(0);
      setIsLoading(false);
      setResultImage(null);
      setShowUrlInput(false);
      setUrlInput('');
    }
  }, [isOpen]);

  const handleLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) {
      setImage(url);
      setResultImage(null);
    }
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

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput);
      setImage(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
      setResultImage(null);
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      toast.error('Please upload an image first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/lens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: image,
          horizontal_angle: horizontalAngle,
          vertical_angle: verticalAngle,
          zoom: zoom,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        toast.success('Angle adjustment complete!');
      } else if (data.requestId) {
        toast.info('Processing...');
        pollForResult(data.requestId);
      }
    } catch (error) {
      console.error('Lens error:', error);
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
          toast.success('Complete!');
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

  const handleReset = () => {
    setHorizontalAngle(0);
    setVerticalAngle(0);
    setZoom(0);
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
            <Focus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Lens</h2>
            <p className="text-slate-500 text-sm">Adjust viewing angles with AI</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Preview Area */}
        <div className="flex-1 p-6 flex flex-col">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#2C666E] transition-colors"
            >
              <Upload className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium">Upload an image</p>
              <p className="text-slate-400 text-sm">Click or drag to upload</p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Original */}
              <div className="flex flex-col">
                <Label className="text-sm font-medium mb-2 text-center">Original</Label>
                <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <img src={image} alt="Original" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              
              {/* Result */}
              <div className="flex flex-col">
                <Label className="text-sm font-medium mb-2 text-center">
                  {resultImage ? 'Adjusted' : 'Preview'}
                </Label>
                <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                  {resultImage ? (
                    <img src={resultImage} alt="Adjusted" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-slate-400 text-center p-4">
                      <Focus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Adjust angles and click Generate</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-80 border-l p-4 space-y-5 overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Upload Options */}
          <div className="flex gap-2 flex-wrap">
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
            <div className="flex gap-2">
              <Input 
                placeholder="https://..." 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddUrl} size="sm">Add</Button>
            </div>
          )}

          {image && (
            <>
              <hr />

              {/* Horizontal Angle */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm font-medium">Horizontal Angle</Label>
                  <span className="text-sm text-slate-500">{horizontalAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={horizontalAngle}
                  onChange={(e) => setHorizontalAngle(parseInt(e.target.value))}
                  className="w-full accent-[#2C666E]"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0°</span>
                  <span>180°</span>
                  <span>360°</span>
                </div>
              </div>

              {/* Vertical Angle */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm font-medium">Vertical Angle</Label>
                  <span className="text-sm text-slate-500">{verticalAngle}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="90"
                  value={verticalAngle}
                  onChange={(e) => setVerticalAngle(parseInt(e.target.value))}
                  className="w-full accent-[#2C666E]"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>-30°</span>
                  <span>30°</span>
                  <span>90°</span>
                </div>
              </div>

              {/* Zoom */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm font-medium">Zoom</Label>
                  <span className="text-sm text-slate-500">{zoom}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={zoom}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  className="w-full accent-[#2C666E]"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" /> Reset Angles
              </Button>

              <hr />

              <Button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-[#2C666E] hover:bg-[#07393C] h-11"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
                )}
              </Button>

              {resultImage && (
                <>
                  <a
                    href={resultImage}
                    download="lens-adjusted.png"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" /> Download to Device
                  </a>
                  <Button onClick={handleUseResult} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Use This Image
                  </Button>
                </>
              )}
            </>
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
            <DialogTitle>Lens</DialogTitle>
            <DialogDescription>Adjust viewing angles with AI</DialogDescription>
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
