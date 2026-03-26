import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StyleGrid from '@/components/ui/StyleGrid';
import LibraryModal from './LibraryModal';
import { apiFetch } from '@/lib/api';
import { findStyleByValue } from '@/lib/stylePresets';
import PropsPillSelector from '@/components/ui/PropsPillSelector';
import NegPromptPillSelector from '@/components/ui/NegPromptPillSelector';
import BrandStyleGuideSelector, { extractBrandStyleData } from '@/components/ui/BrandStyleGuideSelector';
import { getPropsLabels, getCombinedNegativePrompt } from '@/lib/creativePresets';
import LoRAPicker from '@/components/LoRAPicker';
import {
  Edit3, Upload, Link2, Loader2, Plus, X, Sparkles,
  CheckCircle2, FolderOpen,
  ChevronLeft, ChevronRight, Cpu, AlertCircle,
} from 'lucide-react';

const MODELS = [
  { id: 'wavespeed-nano-ultra', label: 'Nano Banana Pro Ultra (4K/8K)', description: 'Multi-image blending, high resolution', multiImage: true, badges: ['Multi-Image', '4K/8K'] },
  { id: 'wavespeed-qwen', label: 'Qwen Image Edit', description: 'Multi-image blending, great detail', multiImage: true, badges: ['Multi-Image'] },
  { id: 'fal-flux', label: 'Flux 2 Dev (LoRA)', description: 'Brand Kits & custom products', multiImage: false, supportsLora: true, badges: ['LoRA'] },
  { id: 'nano-banana-2', label: 'Nano Banana 2', description: 'Fast, reliable editing', multiImage: false, badges: [] },
  { id: 'seedream', label: 'Seedream v4.5', description: 'High detail editing', multiImage: false, badges: [] },
];

const LIGHTING = [
  { value: "", label: "Select lighting..." },
  { value: "natural-daylight", label: "Natural Daylight" },
  { value: "golden-hour", label: "Golden Hour" },
  { value: "blue-hour", label: "Blue Hour" },
  { value: "studio-lighting", label: "Studio Lighting" },
  { value: "dramatic", label: "Dramatic" },
  { value: "neon", label: "Neon Glow" },
  { value: "volumetric", label: "Volumetric/God Rays" },
  { value: "backlit", label: "Backlit/Silhouette" },
  { value: "low-key", label: "Low Key" },
  { value: "high-key", label: "High Key" },
];

const CAMERA_ANGLE = [
  { value: "", label: "Select angle..." },
  { value: "eye-level", label: "Eye Level" },
  { value: "high-angle", label: "High Angle" },
  { value: "low-angle", label: "Low Angle" },
  { value: "birds-eye", label: "Bird's Eye View" },
  { value: "dutch-angle", label: "Dutch Angle" },
  { value: "pov", label: "Point of View (POV)" },
  { value: "wide-shot", label: "Wide Shot" },
  { value: "close-up", label: "Close-Up" },
];

const MOOD = [
  { value: "", label: "Select mood..." },
  { value: "serene", label: "Serene/Peaceful" },
  { value: "dramatic-mood", label: "Dramatic" },
  { value: "mysterious", label: "Mysterious" },
  { value: "joyful", label: "Joyful/Happy" },
  { value: "melancholic", label: "Melancholic/Sad" },
  { value: "energetic", label: "Energetic" },
  { value: "romantic-mood", label: "Romantic" },
  { value: "tense", label: "Tense/Suspenseful" },
  { value: "ethereal", label: "Ethereal/Dreamy" },
  { value: "dark", label: "Dark/Moody" },
  { value: "epic", label: "Epic/Grand" },
];

const COLOR_PALETTE = [
  { value: "", label: "Select color palette..." },
  { value: "warm", label: "Warm (Reds, Oranges, Yellows)" },
  { value: "cool", label: "Cool (Blues, Greens, Purples)" },
  { value: "neutral", label: "Neutral (Grays, Browns, Beiges)" },
  { value: "vibrant", label: "Vibrant/Saturated" },
  { value: "muted", label: "Muted/Desaturated" },
  { value: "pastel", label: "Pastel" },
  { value: "neon-colors", label: "Neon" },
  { value: "monochrome", label: "Monochrome" },
  { value: "cinematic-orange-teal", label: "Cinematic (Orange & Teal)" },
];

const DIMENSIONS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape Wide (16:9)" },
  { value: "21:9", label: "Ultra Wide (21:9)" },
  { value: "9:16", label: "Portrait Tall (9:16)" },
  { value: "4:3", label: "Landscape Standard (4:3)" },
  { value: "3:2", label: "Photo Landscape (3:2)" },
  { value: "5:4", label: "Photo Standard (5:4)" },
  { value: "3:4", label: "Portrait Standard (3:4)" },
  { value: "4:5", label: "Portrait Photo (4:5)" },
  { value: "2:3", label: "Portrait Tall (2:3)" },
];

const OUTPUT_SIZES = [
  { id: '1920x1080', label: '1920x1080', ratio: '16:9 Landscape' },
  { id: '2560x1440', label: '2560x1440', ratio: '16:9 2K' },
  { id: '3840x2160', label: '3840x2160', ratio: '16:9 4K' },
  { id: '1024x1024', label: '1024x1024', ratio: '1:1 Square' },
  { id: '2048x2048', label: '2048x2048', ratio: '1:1 Square HD' },
  { id: '1080x1920', label: '1080x1920', ratio: '9:16 Portrait' },
  { id: '1440x2560', label: '1440x2560', ratio: '9:16 2K' },
  { id: '1600x1200', label: '1600x1200', ratio: '4:3 Standard' },
  { id: '2048x1536', label: '2048x1536', ratio: '4:3 HD' },
  { id: '1200x1600', label: '1200x1600', ratio: '3:4 Portrait' },
  { id: '2560x1080', label: '2560x1080', ratio: '21:9 Ultrawide' },
  { id: '1200x628', label: '1200x628', ratio: 'Facebook Ad' },
  { id: '1080x1350', label: '1080x1350', ratio: '4:5 Instagram' },
];

const STEPS = ['Images', 'Instructions & Style', 'Enhance', 'Model & Output'];

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1 px-5 py-2.5 border-b bg-slate-50/80">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className={`flex-1 h-px ${i <= current ? 'bg-[#2C666E]' : 'bg-slate-200'}`} />}
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < current ? 'bg-[#2C666E] text-white'
              : i === current ? 'bg-[#2C666E] text-white ring-2 ring-[#90DDF0]'
              : 'bg-slate-200 text-slate-500'
            }`}>
              {i < current ? '\u2713' : i + 1}
            </div>
            <span className={`text-[11px] font-medium hidden sm:inline ${i === current ? 'text-[#07393C]' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function EditImageModal({
  isOpen, onClose, onImageEdited, initialImage = null, isEmbedded = false
}) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState([]);
  const [multiResults, setMultiResults] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const mountedRef = useRef(true);
  const [model, setModel] = useState('wavespeed-nano-ultra');
  const [outputSize, setOutputSize] = useState('1920x1080');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef(null);

  // Enhancements
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedNegPills, setSelectedNegPills] = useState([]);
  const [negFreetext, setNegFreetext] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [lighting, setLighting] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [mood, setMood] = useState('');

  // fal.ai single-image settings
  const [strength, setStrength] = useState(0.75);
  const [dimensions, setDimensions] = useState('1:1');
  const [loras, setLoras] = useState([]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setImages(initialImage ? [initialImage] : []);
      setPrompt(''); setStyle([]);
      setModel('wavespeed-nano-ultra'); setOutputSize('1920x1080');
      setIsLoading(false); setResultImage(null);
      setMultiResults([]); setExpandedImage(null);
      setShowUrlInput(false); setUrlInput('');
      setSelectedProps([]); setSelectedNegPills([]);
      setNegFreetext(''); setSelectedBrand(null);
      setLighting(''); setCameraAngle('');
      setColorPalette(''); setMood('');
      setStrength(0.75); setDimensions('1:1'); setLoras([]);
    }
  }, [isOpen, initialImage]);

  const handleLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) setImages(prev => [...prev, { id: Date.now(), url, name: item.title || 'Library Image', isBase: prev.length === 0 }]);
  };

  const handleFileUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev, { id: Date.now() + Math.random(), url: event.target.result, name: file.name, isBase: prev.length === 0 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput);
      setImages(prev => [...prev, { id: Date.now(), url: urlInput.trim(), name: 'URL Image', isBase: prev.length === 0 }]);
      setUrlInput(''); setShowUrlInput(false);
    } catch { toast.error('Please enter a valid URL'); }
  };

  const handleRemoveImage = (id) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (filtered.length > 0 && !filtered.some(img => img.isBase)) filtered[0].isBase = true;
      return filtered;
    });
  };

  const handleSetAsBase = (id) => { setImages(prev => prev.map(img => ({ ...img, isBase: img.id === id }))); };

  const saveToLibrary = (url) => {
    apiFetch('/api/library/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type: 'image', title: 'Edited Image', source: 'editimage' }),
    }).then(r => r.json()).then(data => { if (data.saved) toast.success('Saved to library!'); })
      .catch(() => {});
  };

  const modelDef = MODELS.find(m => m.id === model) || MODELS[0];
  const isWavespeed = modelDef.multiImage;

  const buildCohesivePrompt = async (styleOverride) => {
    const styleKey = styleOverride || '';
    const styleInfo = findStyleByValue(styleKey);
    const styleText = styleInfo?.promptText || styleKey || '';
    const body = {
      tool: 'edit',
      description: prompt.trim(),
      style: styleText,
      props: getPropsLabels(selectedProps),
      negativePrompt: getCombinedNegativePrompt(selectedNegPills, negFreetext),
      brandStyleGuide: extractBrandStyleData(selectedBrand),
      lighting: LIGHTING.find(l => l.value === lighting)?.label || undefined,
      cameraAngle: CAMERA_ANGLE.find(a => a.value === cameraAngle)?.label || undefined,
      colorPalette: COLOR_PALETTE.find(c => c.value === colorPalette)?.label || undefined,
      mood: MOOD.find(m => m.value === mood)?.label || undefined,
      editStrength: !isWavespeed ? strength : undefined,
    };
    const res = await apiFetch('/api/prompt/build-cohesive', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to build prompt');
    return data.prompt;
  };

  const pollForResultAsync = (requestId, backend, falModel) => {
    return new Promise((resolve, reject) => {
      const endpoint = backend === 'fal' ? '/api/imagineer/result' : '/api/jumpstart/result';
      let attempts = 0;
      const poll = async () => {
        if (!mountedRef.current) { reject(new Error('Unmounted')); return; }
        try {
          const body = backend === 'fal' ? { requestId, model: falModel } : { requestId };
          const response = await apiFetch(endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) {
            resolve(data.imageUrl || data.videoUrl);
          } else if (data.status === 'failed') {
            reject(new Error(data.error || 'Edit failed'));
          } else if (++attempts >= 120) {
            reject(new Error('Polling timeout'));
          } else {
            setTimeout(poll, 3000);
          }
        } catch (error) { reject(error); }
      };
      poll();
    });
  };

  const handleEdit = async () => {
    if (images.length === 0) { toast.error('Add at least one image'); return; }
    if (!prompt.trim()) { toast.error('Add edit instructions'); return; }

    const stylesToGenerate = style.length > 0
      ? style.map(s => ({ key: s, label: findStyleByValue(s)?.label || s }))
      : [{ key: '', label: 'No Style' }];

    const initialResults = stylesToGenerate.map(s => ({
      styleKey: s.key, styleLabel: s.label,
      status: 'prompting', imageUrl: null, error: null, saved: false,
    }));
    setMultiResults(initialResults);
    setResultImage(null);
    setIsLoading(true);

    const updateSlot = (index, updates) => {
      if (!mountedRef.current) return;
      setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
    };

    const generateOne = async (styleKey, index) => {
      try {
        const cohesivePrompt = await buildCohesivePrompt(styleKey);
        if (!mountedRef.current) return;
        updateSlot(index, { status: 'generating' });

        const baseImage = images.find(img => img.isBase) || images[0];

        if (isWavespeed) {
          const response = await apiFetch('/api/images/edit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: images.map(img => img.url), prompt: cohesivePrompt, model, outputSize }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Edit failed');
          if (data.imageUrl) {
            updateSlot(index, { status: 'completed', imageUrl: data.imageUrl });
          } else if (data.requestId) {
            updateSlot(index, { status: 'polling' });
            const url = await pollForResultAsync(data.requestId, 'wavespeed');
            updateSlot(index, { status: 'completed', imageUrl: url });
          }
        } else {
          const loraPayload = loras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
          const response = await apiFetch('/api/imagineer/edit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: baseImage.url, prompt: cohesivePrompt, model, strength, dimensions, loras: loraPayload }),
          });
          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Edit failed');
          if (data.imageUrl) {
            updateSlot(index, { status: 'completed', imageUrl: data.imageUrl });
          } else if (data.requestId) {
            updateSlot(index, { status: 'polling' });
            const url = await pollForResultAsync(data.requestId, 'fal', data.model || model);
            updateSlot(index, { status: 'completed', imageUrl: url });
          }
        }
      } catch (error) {
        updateSlot(index, { status: 'failed', error: error.message });
      }
    };

    await Promise.allSettled(stylesToGenerate.map((s, i) => generateOne(s.key, i)));
    if (mountedRef.current) setIsLoading(false);
  };

  const handleSaveOne = async (index) => {
    const result = multiResults[index];
    if (!result || result.saved || !result.imageUrl) return;
    setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
    try {
      await apiFetch('/api/library/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.imageUrl, type: 'image', title: `Edited Image — ${result.styleLabel}`, source: 'editimage' }),
      });
    } catch {
      setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: false } : r));
    }
  };

  const handleSaveAll = async () => {
    const unsaved = multiResults
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => r.status === 'completed' && !r.saved && r.imageUrl);
    setMultiResults(prev => prev.map(r =>
      r.status === 'completed' && !r.saved && r.imageUrl ? { ...r, saved: true } : r
    ));
    for (const item of unsaved) {
      try {
        await apiFetch('/api/library/save', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.imageUrl, type: 'image', title: `Edited Image — ${item.styleLabel}`, source: 'editimage' }),
        });
      } catch {
        setMultiResults(prev => prev.map((r, i) => i === item.index ? { ...r, saved: false } : r));
      }
    }
  };

  const handleRetry = async (index) => {
    const result = multiResults[index];
    if (!result) return;
    setMultiResults(prev => prev.map((r, i) => i === index
      ? { ...r, status: 'prompting', imageUrl: null, error: null } : r));

    const updateSlot = (updates) => {
      if (!mountedRef.current) return;
      setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
    };

    try {
      const cohesivePrompt = await buildCohesivePrompt(result.styleKey);
      if (!mountedRef.current) return;
      updateSlot({ status: 'generating' });
      const baseImage = images.find(img => img.isBase) || images[0];

      if (isWavespeed) {
        const response = await apiFetch('/api/images/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: images.map(img => img.url), prompt: cohesivePrompt, model, outputSize }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) { updateSlot({ status: 'completed', imageUrl: data.imageUrl }); }
        else if (data.requestId) {
          updateSlot({ status: 'polling' });
          const url = await pollForResultAsync(data.requestId, 'wavespeed');
          updateSlot({ status: 'completed', imageUrl: url });
        }
      } else {
        const loraPayload = loras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
        const response = await apiFetch('/api/imagineer/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: baseImage.url, prompt: cohesivePrompt, model, strength, dimensions, loras: loraPayload }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) { updateSlot({ status: 'completed', imageUrl: data.imageUrl }); }
        else if (data.requestId) {
          updateSlot({ status: 'polling' });
          const url = await pollForResultAsync(data.requestId, 'fal', data.model || model);
          updateSlot({ status: 'completed', imageUrl: url });
        }
      }
    } catch (error) {
      updateSlot({ status: 'failed', error: error.message });
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      <StepIndicator steps={STEPS} current={step} />

      <div className="flex-1 overflow-y-auto">
        {/* Multi-Results Grid */}
        {multiResults.length > 0 && (
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">
                {(() => {
                  const completed = multiResults.filter(r => r.status === 'completed').length;
                  const total = multiResults.length;
                  return completed === total
                    ? <span className="text-green-600">All {total} images complete</span>
                    : <span>Generating... {completed}/{total} complete</span>;
                })()}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setMultiResults([]); setIsLoading(false); }}>
                  <ChevronLeft className="w-3 h-3 mr-1" /> Back to Editor
                </Button>
                {multiResults.some(r => r.status === 'completed' && !r.saved) && (
                  <Button size="sm" className="bg-[#2C666E] hover:bg-[#07393C] text-white" onClick={handleSaveAll}>
                    <FolderOpen className="w-3 h-3 mr-1" /> Save All
                  </Button>
                )}
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {multiResults.map((result, index) => (
                <div key={result.styleKey || index} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-600">{result.styleLabel}</span>
                  </div>
                  <div className="aspect-square relative">
                    {(result.status === 'prompting' || result.status === 'generating' || result.status === 'polling') && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs capitalize">{result.status}...</span>
                      </div>
                    )}
                    {result.status === 'completed' && result.imageUrl && (
                      <img src={result.imageUrl} alt={result.styleLabel}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setExpandedImage(result)} />
                    )}
                    {result.status === 'failed' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-4">
                        <AlertCircle className="w-6 h-6 mb-2" />
                        <span className="text-xs text-center mb-2">{result.error || 'Failed'}</span>
                        <Button size="sm" variant="outline" onClick={() => handleRetry(index)}>Retry</Button>
                      </div>
                    )}
                  </div>
                  {result.status === 'completed' && (
                    <div className="flex gap-1.5 p-2 border-t border-slate-100">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                        disabled={result.saved}
                        onClick={() => handleSaveOne(index)}>
                        {result.saved ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> : <><FolderOpen className="w-3 h-3 mr-1" /> Save</>}
                      </Button>
                      <Button size="sm" className="flex-1 text-xs h-7 bg-[#2C666E] hover:bg-[#07393C] text-white"
                        onClick={() => { if (onImageEdited) onImageEdited(result.imageUrl); onClose(); }}>
                        Use
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {expandedImage && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
            onClick={() => setExpandedImage(null)}
            onKeyDown={(e) => e.key === 'Escape' && setExpandedImage(null)}>
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setExpandedImage(null)}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
              <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
                <div className="px-4 py-2 bg-slate-50 border-b">
                  <span className="text-sm font-medium text-slate-700">{expandedImage.styleLabel}</span>
                </div>
                <img src={expandedImage.imageUrl} alt={expandedImage.styleLabel}
                  className="max-w-[85vw] max-h-[80vh] object-contain" />
              </div>
            </div>
          </div>
        )}

        {/* Step 0: Images */}
        {step === 0 && !resultImage && multiResults.length === 0 && (
          <div className="max-w-2xl p-6 space-y-4">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-1">Multi-image blending</p>
              <p className="text-xs text-blue-600">
                Add a base image and optional references. Models that support multi-image blending:
                <strong> Nano Banana Pro Ultra</strong> and <strong>Qwen Image Edit</strong>.
                Other models will only use your base image.
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">
                Images <span className="text-slate-400 font-normal">(first = base, others = references)</span>
              </Label>
              <p className="text-xs text-slate-400 mb-3">
                Add your base image and optional references. Multi-image models blend them together — great for placing characters into scenes.
              </p>

              <div className="grid grid-cols-4 gap-3 mb-3">
                {images.map(img => (
                  <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    img.isBase ? 'border-[#2C666E] ring-2 ring-[#90DDF0]/50' : 'border-slate-200'
                  }`}>
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {!img.isBase && <button onClick={() => handleSetAsBase(img.id)} className="p-1 bg-white rounded text-xs">Set Base</button>}
                      <button onClick={() => handleRemoveImage(img.id)} className="p-1 bg-red-500 text-white rounded"><X className="w-3 h-3" /></button>
                    </div>
                    {img.isBase && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#2C666E] text-white text-[10px] rounded font-bold">BASE</div>}
                  </div>
                ))}
                {images.length < 10 && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-[#2C666E] transition-colors flex flex-col items-center justify-center text-slate-400 hover:text-[#2C666E]">
                    <Plus className="w-6 h-6 mb-1" /><span className="text-xs">Add</span>
                  </button>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                <Button variant="outline" size="sm" onClick={() => setShowUrlInput(!showUrlInput)}><Link2 className="w-4 h-4 mr-2" /> From URL</Button>
                <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)}><FolderOpen className="w-4 h-4 mr-2" /> Library</Button>
              </div>

              {showUrlInput && (
                <div className="mt-3 flex gap-2">
                  <Input placeholder="https://example.com/image.jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="flex-1" />
                  <Button onClick={handleAddUrl}>Add</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Instructions & Style */}
        {step === 1 && !resultImage && multiResults.length === 0 && (
          <div className="p-6">
            <div className="flex gap-6">
              <div className="w-1/2 min-w-0 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Edit Instructions</Label>
                  <Textarea placeholder="Describe what you want to create or change...&#10;&#10;e.g., 'Place the character in a sunset beach scene'&#10;e.g., 'Blend these images into a cinematic composition'"
                    value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[140px]" />
                </div>
                {images.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Your Images ({images.length})</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {images.map(img => (
                        <div key={img.id} className="relative flex-shrink-0">
                          <img src={img.url} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
                          {img.isBase && <div className="absolute -top-1 -left-1 w-4 h-4 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[8px] font-bold">B</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-1/2 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                <label className="text-xs font-medium text-slate-600 mb-2 block">Style (optional)</label>
                <StyleGrid value={style} onChange={setStyle} maxHeight="none" columns="grid-cols-3" multiple />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Enhance */}
        {step === 2 && !resultImage && multiResults.length === 0 && (
          <div className="p-6 space-y-5 max-w-2xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enhancements (optional)</h3>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lighting</label>
                <div className="flex flex-wrap gap-1.5">
                  {LIGHTING.filter(l => l.value).map(l => (
                    <button key={l.value} onClick={() => setLighting(lighting === l.value ? '' : l.value)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${lighting === l.value ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mood</label>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD.filter(m => m.value).map(m => (
                    <button key={m.value} onClick={() => setMood(mood === m.value ? '' : m.value)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${mood === m.value ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Camera Angle</label>
                <div className="flex flex-wrap gap-1.5">
                  {CAMERA_ANGLE.filter(a => a.value).map(a => (
                    <button key={a.value} onClick={() => setCameraAngle(cameraAngle === a.value ? '' : a.value)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${cameraAngle === a.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Palette</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.filter(c => c.value).map(c => (
                    <button key={c.value} onClick={() => setColorPalette(colorPalette === c.value ? '' : c.value)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${colorPalette === c.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <PropsPillSelector selected={selectedProps} onChange={setSelectedProps} />
            <NegPromptPillSelector selectedPills={selectedNegPills} onPillsChange={setSelectedNegPills}
              freetext={negFreetext} onFreetextChange={setNegFreetext} />
            <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />
          </div>
        )}

        {/* Step 3: Model & Output */}
        {step === 3 && !resultImage && multiResults.length === 0 && (
          <div className="p-6 space-y-5 max-w-2xl">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Model
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {MODELS.map(m => (
                  <button key={m.id} type="button" onClick={() => setModel(m.id)}
                    className={`text-left rounded-lg border-2 p-3 transition-all ${
                      model === m.id ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-slate-900">{m.label}</div>
                      {m.multiImage && <span className="px-1.5 py-0.5 bg-[#90DDF0]/30 text-[#07393C] text-[10px] font-bold rounded">MULTI-IMAGE</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.description}</div>
                    <div className="flex gap-1 mt-1">
                      {m.badges?.map(badge => (
                        <span key={badge} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          badge === 'Multi-Image' ? 'bg-green-100 text-green-700' :
                          badge === 'LoRA' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{badge}</span>
                      ))}
                    </div>
                    {!m.multiImage && images.length > 1 && (
                      <div className="text-[10px] text-amber-600 mt-1">Only uses base image — {images.length - 1} reference(s) ignored</div>
                    )}
                  </button>
                ))}
              </div>
              {images.length > 1 && model && !MODELS.find(m => m.id === model)?.multiImage && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Single-image model selected</p>
                    <p className="text-xs text-amber-600">
                      You have {images.length} images loaded, but <strong>{MODELS.find(m => m.id === model)?.label}</strong> only uses the base image. Switch to <strong>Nano Banana Pro Ultra</strong> or <strong>Qwen</strong> to blend all images.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Settings — different per model type */}
            <div className="grid grid-cols-2 gap-4">
              {isWavespeed ? (
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">Output Size</Label>
                  <select value={outputSize} onChange={(e) => setOutputSize(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-sm bg-white">
                    <optgroup label="Landscape (16:9)">
                      {OUTPUT_SIZES.filter(s => s.ratio.includes('16:9')).map(s => <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>)}
                    </optgroup>
                    <optgroup label="Square (1:1)">
                      {OUTPUT_SIZES.filter(s => s.ratio.includes('1:1')).map(s => <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>)}
                    </optgroup>
                    <optgroup label="Portrait (9:16)">
                      {OUTPUT_SIZES.filter(s => s.ratio.includes('9:16')).map(s => <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>)}
                    </optgroup>
                    <optgroup label="Other">
                      {OUTPUT_SIZES.filter(s => !['16:9', '1:1', '9:16'].some(r => s.ratio.includes(r))).map(s => <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>)}
                    </optgroup>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Strength: {strength.toFixed(2)}</label>
                    <input type="range" min="0.1" max="1.0" step="0.05" value={strength}
                      onChange={(e) => setStrength(parseFloat(e.target.value))} className="w-full h-2 accent-[#2C666E]" />
                    <p className="text-[10px] text-slate-400 mt-0.5">Lower = subtle, Higher = creative</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Dimensions</label>
                    <Select value={dimensions} onValueChange={setDimensions}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900">
                        {DIMENSIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* LoRA for Flux */}
            {modelDef.supportsLora && (
              <div className="space-y-2 p-3 bg-[#90DDF0]/10 border border-[#2C666E]/20 rounded-xl">
                <h3 className="text-sm font-semibold text-[#07393C] pb-1">LoRA Models (optional)</h3>
                <LoRAPicker value={loras} onChange={setLoras} />
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-slate-400">Images:</span> <span className="font-medium">{images.length}</span></div>
                <div><span className="text-slate-400">Model:</span> <span className="font-medium">{modelDef.label}</span></div>
                {style.length > 0 && <div><span className="text-slate-400">Styles:</span> <span className="font-medium">{style.length} selected</span></div>}
                {selectedBrand && <div><span className="text-slate-400">Brand:</span> <span className="font-medium">{selectedBrand.brand_name}</span></div>}
                {lighting && <div><span className="text-slate-400">Lighting:</span> <span className="font-medium">{LIGHTING.find(l => l.value === lighting)?.label}</span></div>}
                {mood && <div><span className="text-slate-400">Mood:</span> <span className="font-medium">{MOOD.find(m => m.value === mood)?.label}</span></div>}
              </div>
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {images.map(img => (
                    <div key={img.id} className="relative flex-shrink-0">
                      <img src={img.url} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />
                      {img.isBase && <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[7px] font-bold">B</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!resultImage && multiResults.length === 0 && (
        <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {step === 0 && images.length === 0 && <span>Add at least one image</span>}
            {step === 0 && images.length > 0 && <span className="text-green-600 font-medium">{images.length} image{images.length !== 1 ? 's' : ''} ready</span>}
            {step === 1 && !prompt.trim() && <span>Add edit instructions</span>}
            {step === 1 && prompt.trim() && <span className="text-green-600 font-medium">Instructions set</span>}
            {step === 2 && <span className="text-slate-400">All enhancements are optional</span>}
            {step === 3 && <span className="text-green-600 font-medium">Ready to edit</span>}
          </div>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={isLoading}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>}
            {step === 0 && !isEmbedded && <Button variant="outline" onClick={onClose}>Cancel</Button>}
            {step < 3 && (
              <Button onClick={() => setStep(s => s + 1)}
                disabled={(step === 0 && images.length === 0) || (step === 1 && !prompt.trim())}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleEdit} disabled={isLoading || images.length === 0 || !prompt.trim()}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Editing...</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Edit Image</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) return <div className="h-full bg-white">{content}</div>;

  return (
    <>
      <SlideOverPanel open={isOpen} onOpenChange={(open) => !open && onClose()}
        title="Edit Image" subtitle="AI-powered image editing"
        icon={<Edit3 className="w-5 h-5" />}>
        {content}
      </SlideOverPanel>
      <LibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect} mediaType="images" />
    </>
  );
}
