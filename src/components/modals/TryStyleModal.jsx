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
import {
  Shirt,
  Upload,
  Link2,
  Loader2,
  User,
  Sparkles,
  CheckCircle2,
  Plus,
  X,
  RefreshCw,
  Download,
  ExternalLink,
  Info
} from 'lucide-react';

const CATEGORIES = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'tops', label: 'Tops (Shirts, Jackets, etc.)' },
  { value: 'bottoms', label: 'Bottoms (Pants, Skirts, etc.)' },
  { value: 'one-pieces', label: 'One-Pieces (Dresses, Jumpsuits)' },
];

const MODES = [
  { value: 'performance', label: 'Performance', description: 'Fastest, good quality' },
  { value: 'balanced', label: 'Balanced', description: 'Best balance of speed & quality' },
  { value: 'quality', label: 'Quality', description: 'Highest quality, slower' },
];

const GARMENT_TYPES = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'model', label: 'On Model (worn by person)' },
  { value: 'flat-lay', label: 'Flat-Lay / Product Shot' },
];

/**
 * TryStyleModal - Virtual Try-On using FASHN AI
 */
export default function TryStyleModal({ 
  isOpen, 
  onClose, 
  onImageGenerated,
  isEmbedded = false 
}) {
  const [modelImage, setModelImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [category, setCategory] = useState('auto');
  const [mode, setMode] = useState('balanced');
  const [garmentPhotoType, setGarmentPhotoType] = useState('auto');
  const [numSamples, setNumSamples] = useState(1);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [resultImages, setResultImages] = useState([]);
  const [selectedResult, setSelectedResult] = useState(0);
  
  const [showModelUrlInput, setShowModelUrlInput] = useState(false);
  const [showGarmentUrlInput, setShowGarmentUrlInput] = useState(false);
  const [modelUrlInput, setModelUrlInput] = useState('');
  const [garmentUrlInput, setGarmentUrlInput] = useState('');
  
  const modelFileRef = useRef(null);
  const garmentFileRef = useRef(null);

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'model') {
        setModelImage(event.target.result);
      } else {
        setGarmentImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddUrl = (type) => {
    const url = type === 'model' ? modelUrlInput : garmentUrlInput;
    if (!url.trim()) return;
    
    try {
      new URL(url);
      if (type === 'model') {
        setModelImage(url.trim());
        setModelUrlInput('');
        setShowModelUrlInput(false);
      } else {
        setGarmentImage(url.trim());
        setGarmentUrlInput('');
        setShowGarmentUrlInput(false);
      }
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleGenerate = async () => {
    if (!modelImage) {
      toast.error('Please upload a model image (person photo)');
      return;
    }
    if (!garmentImage) {
      toast.error('Please upload a garment image');
      return;
    }

    setIsLoading(true);
    setLoadingStatus('Sending to FASHN AI...');
    setResultImages([]);

    try {
      const response = await fetch('/api/trystyle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_image: modelImage,
          garment_image: garmentImage,
          category,
          mode,
          garment_photo_type: garmentPhotoType,
          num_samples: numSamples,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (data.images && data.images.length > 0) {
        setResultImages(data.images);
        setSelectedResult(0);
        toast.success('Try-on complete!');
      } else if (data.requestId) {
        // Poll for result
        setLoadingStatus('Processing virtual try-on...');
        pollForResult(data.requestId);
        return;
      } else {
        throw new Error('No images returned');
      }
    } catch (error) {
      console.error('Try Style error:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pollForResult = async (requestId) => {
    const poll = async () => {
      try {
        const response = await fetch('/api/trystyle/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        });
        const data = await response.json();
        
        if (data.status === 'completed' && data.images) {
          setResultImages(data.images);
          setSelectedResult(0);
          setIsLoading(false);
          toast.success('Try-on complete!');
        } else if (data.status === 'failed') {
          setIsLoading(false);
          toast.error('Generation failed: ' + (data.error || 'Unknown error'));
        } else {
          setLoadingStatus('Still processing...');
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Poll error:', error);
        setIsLoading(false);
        toast.error('Failed to check status');
      }
    };
    poll();
  };

  const handleUseResult = () => {
    if (resultImages.length > 0 && onImageGenerated) {
      onImageGenerated(resultImages[selectedResult]);
    }
    onClose();
  };

  const handleReset = () => {
    setResultImages([]);
    setSelectedResult(0);
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Try Style</h2>
            <p className="text-slate-500 text-sm">Virtual try-on powered by FASHN AI</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {resultImages.length === 0 ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Image Upload Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Model Image */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" /> Model Image (Person)
                </Label>
                <div 
                  onClick={() => !modelImage && modelFileRef.current?.click()}
                  className={`aspect-[3/4] rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                    modelImage 
                      ? 'border-[#2C666E] bg-slate-50' 
                      : 'border-slate-300 hover:border-[#2C666E] bg-slate-50'
                  }`}
                >
                  {modelImage ? (
                    <div className="relative w-full h-full group">
                      <img src={modelImage} alt="Model" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setModelImage(null); }}
                        >
                          <X className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <User className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600">Upload person photo</p>
                      <p className="text-xs text-slate-400">Full body works best</p>
                    </div>
                  )}
                </div>
                <input
                  ref={modelFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'model')}
                />
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => modelFileRef.current?.click()} className="flex-1">
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowModelUrlInput(!showModelUrlInput)} className="flex-1">
                    <Link2 className="w-4 h-4 mr-1" /> URL
                  </Button>
                </div>
                {showModelUrlInput && (
                  <div className="flex gap-2 mt-2">
                    <Input 
                      placeholder="https://..." 
                      value={modelUrlInput}
                      onChange={(e) => setModelUrlInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={() => handleAddUrl('model')} size="sm">Add</Button>
                  </div>
                )}
              </div>

              {/* Garment Image */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shirt className="w-4 h-4" /> Garment Image
                </Label>
                <div 
                  onClick={() => !garmentImage && garmentFileRef.current?.click()}
                  className={`aspect-[3/4] rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                    garmentImage 
                      ? 'border-[#2C666E] bg-slate-50' 
                      : 'border-slate-300 hover:border-[#2C666E] bg-slate-50'
                  }`}
                >
                  {garmentImage ? (
                    <div className="relative w-full h-full group">
                      <img src={garmentImage} alt="Garment" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); setGarmentImage(null); }}
                        >
                          <X className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <Shirt className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600">Upload garment photo</p>
                      <p className="text-xs text-slate-400">On model or flat-lay</p>
                    </div>
                  )}
                </div>
                <input
                  ref={garmentFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'garment')}
                />
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => garmentFileRef.current?.click()} className="flex-1">
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowGarmentUrlInput(!showGarmentUrlInput)} className="flex-1">
                    <Link2 className="w-4 h-4 mr-1" /> URL
                  </Button>
                </div>
                {showGarmentUrlInput && (
                  <div className="flex gap-2 mt-2">
                    <Input 
                      placeholder="https://..." 
                      value={garmentUrlInput}
                      onChange={(e) => setGarmentUrlInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={() => handleAddUrl('garment')} size="sm">Add</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Garment Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-sm bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Mode */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Quality Mode</Label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-sm bg-white"
                >
                  {MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Garment Photo Type */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Garment Photo Type</Label>
                <select
                  value={garmentPhotoType}
                  onChange={(e) => setGarmentPhotoType(e.target.value)}
                  className="w-full p-2.5 border rounded-lg text-sm bg-white"
                >
                  {GARMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Number of Samples */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Number of Variations: {numSamples}</Label>
              <input
                type="range"
                min="1"
                max="4"
                value={numSamples}
                onChange={(e) => setNumSamples(parseInt(e.target.value))}
                className="w-full accent-[#2C666E]"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#90DDF0]/20 border border-[#2C666E]/20 rounded-xl p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-[#2C666E] shrink-0 mt-0.5" />
                <div className="text-sm text-[#07393C]">
                  <p className="font-medium mb-1">Tips for best results:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Use a clear, full-body photo of the person</li>
                    <li>Garment photos can be on-model or flat-lay product shots</li>
                    <li>Works best with clothing items that are clearly visible</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate}
              disabled={isLoading || !modelImage || !garmentImage}
              className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white h-12"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {loadingStatus}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate Virtual Try-On</>
              )}
            </Button>
          </div>
        ) : (
          /* Results View */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Try-On Complete!
              </div>
            </div>

            {/* Result Image */}
            <div className="aspect-[3/4] max-w-md mx-auto bg-slate-100 rounded-xl overflow-hidden mb-4">
              <img 
                src={resultImages[selectedResult]} 
                alt="Try-on result" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Thumbnails if multiple */}
            {resultImages.length > 1 && (
              <div className="flex justify-center gap-2 mb-6">
                {resultImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedResult(idx)}
                    className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedResult === idx ? 'border-[#2C666E] ring-2 ring-[#90DDF0]/50' : 'border-slate-200'
                    }`}
                  >
                    <img src={img} alt={`Result ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
              <a
                href={resultImages[selectedResult]}
                download="trystyle-result.png"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2C666E] rounded-lg hover:bg-[#07393C]"
              >
                <Download className="w-4 h-4" /> Download to Device
              </a>
              <a
                href={resultImages[selectedResult]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <ExternalLink className="w-4 h-4" /> Open
              </a>
              {onImageGenerated && (
                <Button onClick={handleUseResult} className="bg-[#2C666E] hover:bg-[#07393C]">
                  <Plus className="w-4 h-4 mr-2" /> Use This Image
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#2C666E] to-[#07393C] animate-pulse" />
            <Shirt className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-lg font-medium text-slate-800 mb-2">Creating Virtual Try-On</p>
          <p className="text-sm text-slate-500">{loadingStatus}</p>
          <p className="text-xs text-slate-400 mt-4">This typically takes 10-30 seconds</p>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return <div className="h-full bg-white relative">{content}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 relative">
        <DialogHeader className="sr-only">
          <DialogTitle>Try Style - Virtual Try-On</DialogTitle>
          <DialogDescription>Virtual clothing try-on powered by FASHN AI</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
