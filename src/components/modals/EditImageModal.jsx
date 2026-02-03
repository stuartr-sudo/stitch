import React, { useState, useRef } from 'react';
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
import LibraryModal from './LibraryModal';
import {
  Edit3,
  Upload,
  Link2,
  Loader2,
  Plus,
  X,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen
} from 'lucide-react';

const MODELS = [
  { id: 'wavespeed-nano-ultra', label: 'Nano Banana Pro Ultra (4K/8K)', endpoint: 'nano-banana-pro/edit-ultra' },
  { id: 'wavespeed-qwen', label: 'Qwen Image Edit', endpoint: 'qwen-image/edit-2511' },
  { id: 'fal-flux', label: 'Flux 2 Pro', endpoint: 'fal-flux-2-pro' },
];

const OUTPUT_SIZES = [
  // Square
  { id: '1024x1024', label: '1024×1024', ratio: '1:1 Square' },
  { id: '2048x2048', label: '2048×2048', ratio: '1:1 Square HD' },
  // Landscape 16:9
  { id: '1920x1080', label: '1920×1080', ratio: '16:9 Landscape' },
  { id: '2560x1440', label: '2560×1440', ratio: '16:9 2K' },
  { id: '3840x2160', label: '3840×2160', ratio: '16:9 4K' },
  // Portrait 9:16
  { id: '1080x1920', label: '1080×1920', ratio: '9:16 Portrait' },
  { id: '1440x2560', label: '1440×2560', ratio: '9:16 2K' },
  // Standard 4:3
  { id: '1600x1200', label: '1600×1200', ratio: '4:3 Standard' },
  { id: '2048x1536', label: '2048×1536', ratio: '4:3 HD' },
  // Portrait 3:4
  { id: '1200x1600', label: '1200×1600', ratio: '3:4 Portrait' },
  // Wide 21:9
  { id: '2560x1080', label: '2560×1080', ratio: '21:9 Ultrawide' },
  // Social Media
  { id: '1200x628', label: '1200×628', ratio: 'Facebook Ad' },
  { id: '1080x1350', label: '1080×1350', ratio: '4:5 Instagram' },
];

/**
 * EditImageModal - AI Image Editing with multiple models
 */
export default function EditImageModal({ 
  isOpen, 
  onClose, 
  onImageEdited,
  isEmbedded = false 
}) {
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('wavespeed-nano-ultra');
  const [outputSize, setOutputSize] = useState('1920x1080');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef(null);

  const handleLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) {
      setImages(prev => [...prev, { 
        id: Date.now(), 
        url: url, 
        name: item.title || 'Library Image',
        isBase: prev.length === 0 
      }]);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev, { 
          id: Date.now() + Math.random(), 
          url: event.target.result, 
          name: file.name,
          isBase: prev.length === 0 
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput);
      setImages(prev => [...prev, { 
        id: Date.now(), 
        url: urlInput.trim(), 
        name: 'URL Image',
        isBase: prev.length === 0 
      }]);
      setUrlInput('');
      setShowUrlInput(false);
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleRemoveImage = (id) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (filtered.length > 0 && !filtered.some(img => img.isBase)) {
        filtered[0].isBase = true;
      }
      return filtered;
    });
  };

  const handleSetAsBase = (id) => {
    setImages(prev => prev.map(img => ({ ...img, isBase: img.id === id })));
  };

  const handleEdit = async () => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Please enter edit instructions');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map(img => img.url),
          prompt: prompt.trim(),
          model,
          outputSize,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Edit failed');

      if (data.imageUrl) {
        setResultImage(data.imageUrl);
        toast.success('Image edited successfully!');
      } else if (data.requestId) {
        toast.info('Processing... This may take a moment.');
        // Poll for result
        pollForResult(data.requestId);
      }
    } catch (error) {
      console.error('Edit error:', error);
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
          toast.success('Image edited successfully!');
        } else if (data.status === 'failed') {
          toast.error('Edit failed: ' + (data.error || 'Unknown error'));
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

  const handleReset = () => {
    setResultImage(null);
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Image</h2>
            <p className="text-slate-500 text-sm">Transform images with AI-powered editing</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!resultImage ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Image Upload */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Images (first = base, others = references)
              </Label>
              
              <div className="grid grid-cols-4 gap-3 mb-3">
                {images.map((img) => (
                  <div 
                    key={img.id} 
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      img.isBase ? 'border-[#2C666E] ring-2 ring-[#90DDF0]/50' : 'border-slate-200'
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {!img.isBase && (
                        <button 
                          onClick={() => handleSetAsBase(img.id)}
                          className="p-1 bg-white rounded text-xs"
                        >
                          Set Base
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveImage(img.id)}
                        className="p-1 bg-red-500 text-white rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {img.isBase && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#2C666E] text-white text-[10px] rounded">
                        BASE
                      </div>
                    )}
                  </div>
                ))}
                
                {images.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-[#2C666E] transition-colors flex flex-col items-center justify-center text-slate-400 hover:text-[#2C666E]"
                  >
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Upload
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowUrlInput(!showUrlInput)}>
                  <Link2 className="w-4 h-4 mr-2" /> From URL
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)}>
                  <FolderOpen className="w-4 h-4 mr-2" /> Library
                </Button>
              </div>

              {showUrlInput && (
                <div className="mt-3 flex gap-2">
                  <Input 
                    placeholder="https://example.com/image.jpg" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddUrl}>Add</Button>
                </div>
              )}
            </div>

            {/* Edit Prompt */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Edit Instructions</Label>
              <Textarea
                placeholder="Describe what changes you want to make..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Model Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Model</Label>
                <div className="space-y-2">
                  {MODELS.map((m) => (
                    <label 
                      key={m.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        model === m.id ? 'border-[#2C666E] bg-[#90DDF0]/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={m.id}
                        checked={model === m.id}
                        onChange={(e) => setModel(e.target.value)}
                        className="accent-[#2C666E]"
                      />
                      <span className="text-sm">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Output Size & Aspect Ratio</Label>
                <select
                  value={outputSize}
                  onChange={(e) => setOutputSize(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm bg-white"
                >
                  <optgroup label="Square (1:1)">
                    {OUTPUT_SIZES.filter(s => s.ratio.includes('1:1')).map((s) => (
                      <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Landscape (16:9)">
                    {OUTPUT_SIZES.filter(s => s.ratio.includes('16:9')).map((s) => (
                      <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Portrait (9:16)">
                    {OUTPUT_SIZES.filter(s => s.ratio.includes('9:16')).map((s) => (
                      <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Standard (4:3 / 3:4)">
                    {OUTPUT_SIZES.filter(s => s.ratio.includes('4:3') || s.ratio.includes('3:4')).map((s) => (
                      <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Social Media">
                    {OUTPUT_SIZES.filter(s => s.ratio.includes('Facebook') || s.ratio.includes('Instagram') || s.ratio.includes('Ultrawide')).map((s) => (
                      <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleEdit} 
              disabled={isLoading || images.length === 0 || !prompt.trim()}
              className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white h-12"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Edit Image</>
              )}
            </Button>
          </div>
        ) : (
          /* Result View */
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Edit Complete!
              </div>
            </div>

            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden mb-6">
              <img src={resultImage} alt="Edited" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                Edit Again
              </Button>
              <a
                href={resultImage}
                download="edited-image.png"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Download to Device
              </a>
              <a
                href={resultImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <ExternalLink className="w-4 h-4" /> Open
              </a>
              <Button onClick={handleUseResult} className="bg-[#2C666E] hover:bg-[#07393C]">
                <Plus className="w-4 h-4 mr-2" /> Use This Image
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>AI-powered image editing</DialogDescription>
          </DialogHeader>
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
