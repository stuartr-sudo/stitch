import React, { useState, useEffect, useRef } from "react";
import { SlideOverPanel, SlideOverBody } from "@/components/ui/slide-over-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import StyleGrid from "@/components/ui/StyleGrid";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Loader2, Eye, Cpu, Palette, SlidersHorizontal, Pencil,
  FolderOpen, Upload, X, Plus, Link2, ChevronLeft, ChevronRight,
  Layers, CheckCircle2, ImageIcon, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import LoRAPicker from "@/components/LoRAPicker";
import { findStyleByValue } from "@/lib/stylePresets";
import LibraryModal from "@/components/modals/LibraryModal";
import PropsPillSelector from "@/components/ui/PropsPillSelector";
import NegPromptPillSelector from "@/components/ui/NegPromptPillSelector";
import BrandStyleGuideSelector, { extractBrandStyleData } from "@/components/ui/BrandStyleGuideSelector";
import { getPropsLabels, getCombinedNegativePrompt } from "@/lib/creativePresets";

// ─── Text-to-Image Models ────────────────────────────────────────────────────
const T2I_MODELS = [
  { value: "nano-banana-2", label: "Nano Banana 2", description: "Fast, high-quality image generation" },
  { value: "kling-image-o3", label: "Kling Image O3", description: "Multi-ref support, up to 4K resolution" },
  { value: "seedream", label: "Seedream v4 (ByteDance)", description: "Excellent prompt adherence & detail" },
  { value: "fal-flux", label: "Flux 2 Dev (Supports LoRA)", description: "Best for Brand Kits & Custom Products" },
];

// ─── Image-to-Image Models ───────────────────────────────────────────────────
const I2I_MODELS = [
  { value: "wavespeed-nano-ultra", label: "Nano Banana Pro Ultra (4K/8K)", description: "Multi-image blending, high resolution", multiImage: true },
  { value: "wavespeed-qwen", label: "Qwen Image Edit", description: "Multi-image blending, great detail", multiImage: true },
  { value: "wavespeed-kling-o3", label: "Kling Image O3 Edit", description: "Multi-ref @Image syntax, up to 4K", multiImage: true },
  { value: "fal-flux", label: "Flux 2 Dev (LoRA)", description: "Brand Kits & custom products", multiImage: false, supportsLora: true },
  { value: "nano-banana-2", label: "Nano Banana 2", description: "Fast multi-image composition", multiImage: true },
  { value: "seedream", label: "Seedream v4.5", description: "High detail editing", multiImage: false },
];

// ─── Dropdown Options ────────────────────────────────────────────────────────
const SUBJECT_TYPE = [
  { value: "", label: "Select subject..." },
  { value: "person", label: "Person" },
  { value: "group-of-people", label: "Group of People" },
  { value: "object", label: "Object" },
  { value: "product", label: "Product" },
  { value: "animal", label: "Animal" },
  { value: "landscape", label: "Landscape" },
  { value: "cityscape", label: "Cityscape" },
  { value: "interior", label: "Interior Space" },
  { value: "architecture", label: "Architecture" },
  { value: "vehicle", label: "Vehicle" },
  { value: "food", label: "Food" },
  { value: "abstract-concept", label: "Abstract Concept" },
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

const OUTPUT_SIZES = [
  { id: "1920x1080", label: "1920x1080", ratio: "16:9 Landscape" },
  { id: "2560x1440", label: "2560x1440", ratio: "16:9 2K" },
  { id: "3840x2160", label: "3840x2160", ratio: "16:9 4K" },
  { id: "1024x1024", label: "1024x1024", ratio: "1:1 Square" },
  { id: "2048x2048", label: "2048x2048", ratio: "1:1 Square HD" },
  { id: "1080x1920", label: "1080x1920", ratio: "9:16 Portrait" },
  { id: "1440x2560", label: "1440x2560", ratio: "9:16 2K" },
  { id: "1600x1200", label: "1600x1200", ratio: "4:3 Standard" },
  { id: "1200x1600", label: "1200x1600", ratio: "3:4 Portrait" },
  { id: "1080x1350", label: "1080x1350", ratio: "4:5 Instagram" },
  { id: "2560x1080", label: "2560x1080", ratio: "21:9 Ultrawide" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SelectField = ({ label, value, onChange, options, required }) => (
  <div>
    <label className="text-xs font-medium text-slate-600 mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent className="bg-white border-slate-200 text-slate-900 max-h-[250px]">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value || "_empty_"} className="text-sm">{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

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

function ResultActions({ imageUrl, onEditAgain, onClose, onGenerate }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {onEditAgain && (
        <Button variant="outline" size="sm" className="text-xs" onClick={onEditAgain}>
          <Pencil className="w-3 h-3 mr-1" /> Edit Again
        </Button>
      )}
      <Button variant="outline" size="sm" className="text-xs"
        onClick={() => {
          apiFetch('/api/library/save', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, type: 'image', title: '[Imagineer] Image', source: 'imagineer' }),
          }).then(() => toast.success('Saved to library')).catch(() => toast.error('Save failed'));
        }}
      >
        <FolderOpen className="w-3 h-3 mr-1" /> Save to Library
      </Button>
      <Button variant="outline" size="sm" className="text-xs"
        onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'inpaint', imageUrl } })); }}
      >Inpaint</Button>
      <Button variant="outline" size="sm" className="text-xs"
        onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'turnaround', imageUrl } })); }}
      >Turnaround</Button>
      <Button variant="outline" size="sm" className="text-xs"
        onClick={() => { if (onGenerate) onGenerate({ editedImageUrl: imageUrl }); onClose(); }}
      >
        <Sparkles className="w-3 h-3 mr-1" /> Use in Storyboard
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const T2I_STEPS = ["Subject", "Style", "Enhance", "Output"];
const I2I_STEPS = ["Images", "Instructions & Style", "Enhance", "Model & Output"];

export default function ImagineerModal({ isOpen, onClose, onGenerate, isEmbedded = false, initialMode = 't2i' }) {
  const { user } = useAuth();

  // ─── Mode & Navigation ──────────────────────────────────────────────
  const [mode, setMode] = useState("t2i");
  const [step, setStep] = useState(0);

  // ─── T2I State ──────────────────────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState("nano-banana-2");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [artisticStyle, setArtisticStyle] = useState("");
  const [colorPalette, setColorPalette] = useState("");
  const [lighting, setLighting] = useState("");
  const [cameraAngle, setCameraAngle] = useState("");
  const [dimensions, setDimensions] = useState("16:9");
  const [mood, setMood] = useState("");
  const [elementsToInclude, setElementsToInclude] = useState("");
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedNegPills, setSelectedNegPills] = useState([]);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [refImageUrl, setRefImageUrl] = useState("");
  const [refPreview, setRefPreview] = useState("");
  const [refDescription, setRefDescription] = useState("");
  const [analyzingRef, setAnalyzingRef] = useState(false);
  const [generateLoras, setGenerateLoras] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const refFileInputRef = useRef(null);

  // ─── I2I State ──────────────────────────────────────────────────────
  const [i2iImages, setI2iImages] = useState([]);
  const [i2iPrompt, setI2iPrompt] = useState("");
  const [i2iStyle, setI2iStyle] = useState([]);
  const [i2iMultiResults, setI2iMultiResults] = useState([]);
  const [i2iExpandedImage, setI2iExpandedImage] = useState(null);
  const [i2iModel, setI2iModel] = useState("wavespeed-nano-ultra");
  const [i2iStrength, setI2iStrength] = useState(0.75);
  const [i2iDimensions, setI2iDimensions] = useState("1:1");
  const [i2iOutputSize, setI2iOutputSize] = useState("1920x1080");
  const [i2iLoras, setI2iLoras] = useState([]);
  const [i2iProps, setI2iProps] = useState([]);
  const [i2iNegPills, setI2iNegPills] = useState([]);
  const [i2iNegFreetext, setI2iNegFreetext] = useState("");
  const [i2iBrand, setI2iBrand] = useState(null);
  const [i2iEditing, setI2iEditing] = useState(false);
  const [i2iResultUrl, setI2iResultUrl] = useState("");
  const [i2iShowUrlInput, setI2iShowUrlInput] = useState(false);
  const [i2iUrlInput, setI2iUrlInput] = useState("");
  const i2iFileInputRef = useRef(null);
  const mountedRef = useRef(true);

  // ─── Library modals ─────────────────────────────────────────────────
  const [showRefLibrary, setShowRefLibrary] = useState(false);
  const [showI2iLibrary, setShowI2iLibrary] = useState(false);

  const i2iModelDef = I2I_MODELS.find(m => m.value === i2iModel) || I2I_MODELS[0];
  const isWavespeed = i2iModelDef.multiImage;

  const steps = mode === "t2i" ? T2I_STEPS : I2I_STEPS;
  const maxStep = steps.length - 1;

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ─── Reset on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode); setStep(0);
      setSelectedModel("nano-banana-2");
      setSubjectDescription(""); setSubjectType(""); setArtisticStyle("");
      setColorPalette(""); setLighting(""); setCameraAngle("");
      setDimensions("16:9"); setMood(""); setElementsToInclude("");
      setSelectedProps([]); setSelectedNegPills([]); setNegativePrompt("");
      setSelectedBrand(null); setRefImageUrl(""); setRefPreview("");
      setRefDescription(""); setAnalyzingRef(false); setGenerateLoras([]);
      setGenerating(false); setShowPreview(false);
      setI2iImages([]); setI2iPrompt(""); setI2iStyle([]);
      setI2iModel("wavespeed-nano-ultra"); setI2iStrength(0.75);
      setI2iDimensions("1:1"); setI2iOutputSize("1920x1080");
      setI2iLoras([]); setI2iProps([]); setI2iNegPills([]);
      setI2iNegFreetext(""); setI2iBrand(null);
      setI2iEditing(false); setI2iResultUrl("");
      setI2iShowUrlInput(false); setI2iUrlInput("");
      setI2iMultiResults([]); setI2iExpandedImage(null);
    }
  }, [isOpen]);

  const handleModeChange = (newMode) => { setMode(newMode); setStep(0); };

  // ═══════════════════════════════════════════════════════════════════════
  // T2I Handlers
  // ═══════════════════════════════════════════════════════════════════════

  const handleRefFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setRefPreview(dataUrl); setRefImageUrl(dataUrl);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await apiFetch('/api/library/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.url) { setRefImageUrl(uploadData.url); analyzeRefImage(uploadData.url); }
      } catch { analyzeRefImage(dataUrl); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const analyzeRefImage = async (url) => {
    if (!url) return;
    setAnalyzingRef(true);
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      const data = await res.json();
      if (data.description) {
        setRefDescription(data.description);
        if (!subjectDescription.trim()) setSubjectDescription(data.description);
        toast.success('Image analyzed — description added');
      }
    } catch { toast.error('Failed to analyze image'); }
    finally { setAnalyzingRef(false); }
  };

  const clearRefImage = () => { setRefImageUrl(""); setRefPreview(""); setRefDescription(""); };

  const buildCohesivePrompt = async (tool, extraData = {}) => {
    const styleInfo = findStyleByValue(extraData.style || artisticStyle);
    const styleText = styleInfo?.promptText || extraData.style || artisticStyle || '';
    const body = {
      tool,
      description: extraData.description || subjectDescription.trim(),
      style: styleText,
      props: getPropsLabels(extraData.props || selectedProps),
      negativePrompt: getCombinedNegativePrompt(extraData.negPills || selectedNegPills, extraData.negFreetext || negativePrompt),
      brandStyleGuide: extractBrandStyleData(extraData.brand || selectedBrand),
      referenceDescription: extraData.refDescription || refDescription || undefined,
      subjectType: extraData.subjectType || subjectType || undefined,
      lighting: LIGHTING.find(l => l.value === lighting)?.label || undefined,
      cameraAngle: CAMERA_ANGLE.find(a => a.value === cameraAngle)?.label || undefined,
      colorPalette: COLOR_PALETTE.find(c => c.value === colorPalette)?.label || undefined,
      mood: MOOD.find(m => m.value === mood)?.label || undefined,
      elementsToInclude: elementsToInclude.trim() || undefined,
      ...(extraData.editStrength != null ? { editStrength: extraData.editStrength } : {}),
    };
    const res = await apiFetch('/api/prompt/build-cohesive', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to build prompt');
    return data.prompt;
  };

  const buildPromptPreview = () => {
    const parts = [];
    const subjectLabel = SUBJECT_TYPE.find(s => s.value === subjectType)?.label;
    const desc = subjectDescription.trim();
    if (subjectLabel && desc) parts.push(`A ${subjectLabel.toLowerCase()}: ${desc}`);
    else if (desc) parts.push(desc);
    if (elementsToInclude.trim()) parts.push(`featuring ${elementsToInclude.trim()}`);
    if (lighting) parts.push(`${LIGHTING.find(l => l.value === lighting)?.label} lighting`);
    if (cameraAngle) parts.push(`${CAMERA_ANGLE.find(a => a.value === cameraAngle)?.label} angle`);
    if (colorPalette) parts.push(`${COLOR_PALETTE.find(c => c.value === colorPalette)?.label} palette`);
    if (mood) parts.push(`${MOOD.find(m => m.value === mood)?.label} mood`);
    if (artisticStyle) { const si = findStyleByValue(artisticStyle); parts.push(si?.promptText || `${artisticStyle} style`); }
    return parts.join(", ");
  };

  const canImagine = !!(subjectType && artisticStyle && subjectDescription.trim());

  const handleImagine = async () => {
    if (!canImagine) { toast.error("Fill in subject, description, and style first."); return; }
    setGenerating(true);
    try {
      const loras = generateLoras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale ?? 1.0 }));
      toast.info('Building cohesive prompt...');
      const cohesivePrompt = await buildCohesivePrompt('imagineer');
      await onGenerate({
        prompt: cohesivePrompt, style: artisticStyle, dimensions,
        model: loras.length > 0 ? 'fal-flux' : selectedModel,
        loras: loras.length > 0 ? loras : undefined,
      });
      onClose();
    } catch (error) { toast.error(error.message || 'Failed to generate image'); }
    finally { setGenerating(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // I2I Handlers
  // ═══════════════════════════════════════════════════════════════════════

  const handleI2iFileUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setI2iImages(prev => [...prev, { id: Date.now() + Math.random(), url: event.target.result, name: file.name, isBase: prev.length === 0 }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleI2iAddUrl = () => {
    if (!i2iUrlInput.trim()) return;
    try {
      new URL(i2iUrlInput);
      setI2iImages(prev => [...prev, { id: Date.now(), url: i2iUrlInput.trim(), name: 'URL Image', isBase: prev.length === 0 }]);
      setI2iUrlInput(''); setI2iShowUrlInput(false);
    } catch { toast.error('Please enter a valid URL'); }
  };

  const handleI2iRemoveImage = (id) => {
    setI2iImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (filtered.length > 0 && !filtered.some(img => img.isBase)) filtered[0].isBase = true;
      return filtered;
    });
  };

  const handleI2iSetBase = (id) => { setI2iImages(prev => prev.map(img => ({ ...img, isBase: img.id === id }))); };

  const handleI2iLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) setI2iImages(prev => [...prev, { id: Date.now(), url, name: item.title || 'Library Image', isBase: prev.length === 0 }]);
    setShowI2iLibrary(false);
  };

  const handleImageEdit = async () => {
    if (i2iImages.length === 0) { toast.error('Add at least one image'); return; }
    if (!i2iPrompt.trim()) { toast.error('Add edit instructions'); return; }

    const stylesToGenerate = i2iStyle.length > 0
      ? i2iStyle.map(s => ({ key: s, label: findStyleByValue(s)?.label || s }))
      : [{ key: '', label: 'No Style' }];

    const initialResults = stylesToGenerate.map(s => ({
      styleKey: s.key, styleLabel: s.label,
      status: 'prompting', imageUrl: null, error: null, saved: false, tags: '',
    }));
    setI2iMultiResults(initialResults);
    setI2iResultUrl('');
    setI2iEditing(true);

    const updateSlot = (index, updates) => {
      if (!mountedRef.current) return;
      setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
    };

    const generateOne = async (styleKey, index) => {
      try {
        const cohesivePrompt = await buildCohesivePrompt('edit', {
          description: i2iPrompt.trim(), style: styleKey,
          props: i2iProps, negPills: i2iNegPills, negFreetext: i2iNegFreetext,
          brand: i2iBrand, editStrength: i2iStrength,
        });
        if (!mountedRef.current) return;
        updateSlot(index, { status: 'generating' });

        const baseImage = i2iImages.find(img => img.isBase) || i2iImages[0];
        const isWavespeedModel = i2iModel.startsWith('wavespeed-');

        if (isWavespeedModel) {
          const res = await apiFetch('/api/images/edit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: i2iImages.map(img => img.url), prompt: cohesivePrompt, model: i2iModel, outputSize: i2iOutputSize }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Edit failed');
          if (data.imageUrl) { updateSlot(index, { status: 'completed', imageUrl: data.imageUrl }); }
          else if (data.requestId) {
            updateSlot(index, { status: 'polling' });
            const url = await pollJumpstartResultAsync(data.requestId);
            updateSlot(index, { status: 'completed', imageUrl: url });
          }
        } else {
          const loraPayload = i2iLoras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
          const allUrls = i2iImages.map(img => img.url);
          const isMultiImage = I2I_MODELS.find(m => m.value === i2iModel)?.multiImage;
          const res = await apiFetch('/api/imagineer/edit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: baseImage.url,
              image_urls: isMultiImage ? allUrls : undefined,
              prompt: cohesivePrompt, model: i2iModel,
              strength: i2iStrength, dimensions: i2iDimensions, loras: loraPayload,
            }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Edit failed');
          if (data.imageUrl) { updateSlot(index, { status: 'completed', imageUrl: data.imageUrl }); }
          else if (data.requestId) {
            updateSlot(index, { status: 'polling' });
            const url = await pollImagineerResultAsync(data.requestId, data.model || i2iModel);
            updateSlot(index, { status: 'completed', imageUrl: url });
          }
        }
      } catch (error) {
        updateSlot(index, { status: 'failed', error: error.message });
      }
    };

    await Promise.allSettled(stylesToGenerate.map((s, i) => generateOne(s.key, i)));
    if (mountedRef.current) setI2iEditing(false);
  };

  const saveToLibrary = (url) => {
    apiFetch('/api/library/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type: 'image', title: '[Imagineer] Edited Image', source: 'imagineer-i2i' }),
    }).catch(() => {});
  };

  const pollJumpstartResult = async (requestId) => {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await apiFetch('/api/jumpstart/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }) });
        const data = await res.json();
        if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) { const url = data.imageUrl || data.videoUrl; setI2iResultUrl(url); toast.success('Image edited!'); saveToLibrary(url); return; }
        if (data.status === 'failed') throw new Error(data.error || 'Edit failed');
      } catch (err) { if (err.message.includes('failed')) throw err; }
    }
  };

  const pollImagineerResult = async (requestId, model) => {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await apiFetch('/api/imagineer/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, model }) });
        const data = await res.json();
        if (data.imageUrl) { setI2iResultUrl(data.imageUrl); toast.success('Image edited!'); saveToLibrary(data.imageUrl); return; }
        if (data.status === 'failed' || data.error) throw new Error(data.error || 'Edit failed');
      } catch (err) { if (err.message.includes('failed')) throw err; }
    }
  };

  const pollJumpstartResultAsync = async (requestId) => {
    for (let i = 0; i < 120; i++) {
      if (!mountedRef.current) throw new Error('Unmounted');
      await new Promise(r => setTimeout(r, 3000));
      const res = await apiFetch('/api/jumpstart/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (data.status === 'completed' && (data.imageUrl || data.videoUrl)) return data.imageUrl || data.videoUrl;
      if (data.status === 'failed') throw new Error(data.error || 'Edit failed');
    }
    throw new Error('Polling timeout');
  };

  const pollImagineerResultAsync = async (requestId, model) => {
    for (let i = 0; i < 120; i++) {
      if (!mountedRef.current) throw new Error('Unmounted');
      await new Promise(r => setTimeout(r, 3000));
      const res = await apiFetch('/api/imagineer/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, model }),
      });
      const data = await res.json();
      if (data.imageUrl) return data.imageUrl;
      if (data.status === 'failed' || data.error) throw new Error(data.error || 'Edit failed');
    }
    throw new Error('Polling timeout');
  };

  // ─── Multi-result save/retry handlers ────────────────────────────────

  const autoTagI2iImage = async (imageId, result) => {
    const tagNames = [];
    if (result.styleLabel && result.styleLabel !== 'No Style') tagNames.push(result.styleLabel);
    const manualTags = (result.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    tagNames.push(...manualTags);
    if (tagNames.length === 0) return;
    try {
      await apiFetch('/api/library/tags/auto-tag', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, tagNames }),
      });
    } catch {}
  };

  const handleI2iSaveOne = async (index) => {
    const result = i2iMultiResults[index];
    if (!result || result.saved || !result.imageUrl) return;
    setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
    try {
      const res = await apiFetch('/api/library/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.imageUrl, type: 'image', title: `[Imagineer] ${result.styleLabel}`, source: 'imagineer-i2i' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.id) throw new Error(data.error || data.message || 'Save failed');
      await autoTagI2iImage(data.id, result);
    } catch (err) {
      console.error('[Imagineer] Save failed:', err);
      toast.error(`Failed to save: ${err.message || 'Unknown error'}`);
      setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: false } : r));
    }
  };

  const handleI2iSaveAll = async () => {
    const unsaved = i2iMultiResults
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => r.status === 'completed' && !r.saved && r.imageUrl);
    setI2iMultiResults(prev => prev.map(r =>
      r.status === 'completed' && !r.saved && r.imageUrl ? { ...r, saved: true } : r
    ));
    for (const item of unsaved) {
      try {
        const res = await apiFetch('/api/library/save', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.imageUrl, type: 'image', title: `[Imagineer] ${item.styleLabel}`, source: 'imagineer-i2i' }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.id) throw new Error(data.error || data.message || 'Save failed');
        await autoTagI2iImage(data.id, item);
      } catch (err) {
        console.error('[Imagineer] Save failed:', err);
        setI2iMultiResults(prev => prev.map((r, i) => i === item.index ? { ...r, saved: false } : r));
      }
    }
  };

  const handleI2iRetry = async (index) => {
    const result = i2iMultiResults[index];
    if (!result) return;

    const updateSlot = (updates) => {
      if (!mountedRef.current) return;
      setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
    };

    updateSlot({ status: 'prompting', error: null, imageUrl: null });

    try {
      const cohesivePrompt = await buildCohesivePrompt('edit', {
        description: i2iPrompt.trim(), style: result.styleKey,
        props: i2iProps, negPills: i2iNegPills, negFreetext: i2iNegFreetext,
        brand: i2iBrand, editStrength: i2iStrength,
      });
      if (!mountedRef.current) return;
      updateSlot({ status: 'generating' });

      const baseImage = i2iImages.find(img => img.isBase) || i2iImages[0];
      const isWavespeedModel = i2iModel.startsWith('wavespeed-');

      if (isWavespeedModel) {
        const res = await apiFetch('/api/images/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: i2iImages.map(img => img.url), prompt: cohesivePrompt, model: i2iModel, outputSize: i2iOutputSize }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) { updateSlot({ status: 'completed', imageUrl: data.imageUrl }); }
        else if (data.requestId) {
          updateSlot({ status: 'polling' });
          const url = await pollJumpstartResultAsync(data.requestId);
          updateSlot({ status: 'completed', imageUrl: url });
        }
      } else {
        const loraPayload = i2iLoras.filter(l => l.url).map(l => ({ url: l.url, scale: l.scale }));
        const allUrls = i2iImages.map(img => img.url);
        const isMultiImage = I2I_MODELS.find(m => m.value === i2iModel)?.multiImage;
        const res = await apiFetch('/api/imagineer/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: baseImage.url,
            image_urls: isMultiImage ? allUrls : undefined,
            prompt: cohesivePrompt, model: i2iModel,
            strength: i2iStrength, dimensions: i2iDimensions, loras: loraPayload,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Edit failed');
        if (data.imageUrl) { updateSlot({ status: 'completed', imageUrl: data.imageUrl }); }
        else if (data.requestId) {
          updateSlot({ status: 'polling' });
          const url = await pollImagineerResultAsync(data.requestId, data.model || i2iModel);
          updateSlot({ status: 'completed', imageUrl: url });
        }
      }
    } catch (error) {
      updateSlot({ status: 'failed', error: error.message });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  const content = (
    <div className="flex flex-col h-full">
      {/* Mode tabs */}
      <div className="flex-shrink-0 px-5 pt-3 pb-0 border-b bg-white">
        <div className="flex gap-0">
          <button onClick={() => handleModeChange("t2i")}
            className={`px-5 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              mode === "t2i" ? "border-[#2C666E] text-[#07393C]" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}>
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Text to Image
          </button>
          <button onClick={() => handleModeChange("i2i")}
            className={`px-5 pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              mode === "i2i" ? "border-[#2C666E] text-[#07393C]" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}>
            <Layers className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Image to Image
          </button>
        </div>
      </div>

      {/* Step indicator */}
      {!(mode === "i2i" && (i2iMultiResults.length > 0 || i2iResultUrl)) && <StepIndicator steps={steps} current={step} />}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TEXT TO IMAGE                                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}

        {/* T2I Step 0: Subject */}
        {mode === "t2i" && step === 0 && (
          <div className="p-5 space-y-4 max-w-2xl">
            {/* Model */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Model
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {T2I_MODELS.map(m => (
                  <button key={m.value} type="button" onClick={() => setSelectedModel(m.value)}
                    className={`text-left rounded-lg border-2 p-2 transition-all ${
                      selectedModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <div className="font-medium text-xs text-slate-900">{m.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Type & Description */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</h3>
              <SelectField label="Subject Type" value={subjectType} onChange={setSubjectType} options={SUBJECT_TYPE} required />
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description (what/who is the subject?)</label>
                <Textarea value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)}
                  placeholder="e.g., a confident businesswoman, a vintage sports car, a majestic lion..." className="bg-white text-sm" rows={3} />
                {analyzingRef && (
                  <p className="text-[10px] text-[#2C666E] mt-0.5 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> AI is analyzing your reference image...
                  </p>
                )}
              </div>
            </div>

            {/* Reference Image */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reference Image (optional — AI will analyze)</Label>
              {(refPreview || refImageUrl) ? (
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="relative flex-shrink-0">
                    <img src={refPreview || refImageUrl} alt="Reference" className="w-20 h-20 object-cover rounded-lg border border-slate-200" onError={(e) => { e.target.src = ''; }} />
                    {analyzingRef && <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#2C666E]" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 font-medium mb-1">{analyzingRef ? 'Analyzing...' : refDescription ? 'Description generated' : 'Reference loaded'}</p>
                    {refDescription && <p className="text-[10px] text-slate-400 line-clamp-3">{refDescription}</p>}
                    <button onClick={clearRefImage} className="mt-1 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5"><X className="w-3 h-3" /> Remove</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div onClick={() => refFileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-500">Upload</span>
                    </div>
                    <div onClick={() => setShowRefLibrary(true)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                      <FolderOpen className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-500">Library</span>
                    </div>
                  </div>
                  <input ref={refFileInputRef} type="file" accept="image/*" onChange={handleRefFileUpload} className="hidden" />
                  <Input value={refImageUrl}
                    onChange={(e) => { setRefImageUrl(e.target.value); setRefPreview(e.target.value); }}
                    onBlur={(e) => { const url = e.target.value.trim(); if (url?.startsWith('http')) analyzeRefImage(url); }}
                    placeholder="https://... paste a reference image URL" className="bg-white text-xs h-8" />
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">AI vision will describe this image to seed your subject description.</p>
            </div>
          </div>
        )}

        {/* T2I Step 1: Style */}
        {mode === "t2i" && step === 1 && (
          <div className="p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Choose an Artistic Style</h3>
            <StyleGrid value={artisticStyle} onChange={setArtisticStyle} maxHeight="none" columns="grid-cols-4" />
          </div>
        )}

        {/* T2I Step 2: Enhance */}
        {mode === "t2i" && step === 2 && (
          <div className="p-5 space-y-5 max-w-2xl">
            {/* Atmosphere — pill-based selectors */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Atmosphere
              </h3>

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

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Elements to Include (optional)</label>
                <Input value={elementsToInclude} onChange={(e) => setElementsToInclude(e.target.value)}
                  placeholder="e.g., flowers, rain, neon signs, smoke, books..." className="bg-white" />
              </div>
            </div>

            {/* Props */}
            <PropsPillSelector selected={selectedProps} onChange={setSelectedProps} />

            {/* Negative Prompts */}
            <NegPromptPillSelector selectedPills={selectedNegPills} onPillsChange={setSelectedNegPills}
              freetext={negativePrompt} onFreetextChange={setNegativePrompt} />

            {/* Brand Style Guide */}
            <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />

            {/* LoRA */}
            <div className="space-y-2 p-3 bg-[#90DDF0]/10 border border-[#2C666E]/20 rounded-xl">
              <h3 className="text-sm font-semibold text-[#07393C] pb-1">LoRA Models (optional)</h3>
              <p className="text-xs text-slate-500 -mt-2">Select LoRAs to use FLUX 2 Dev with your trained models.</p>
              <LoRAPicker value={generateLoras} onChange={setGenerateLoras} />
            </div>
          </div>
        )}

        {/* T2I Step 3: Output */}
        {mode === "t2i" && step === 3 && (
          <div className="p-5 space-y-5 max-w-2xl">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Output Settings
              </h3>
              <div className="w-1/2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Dimensions</label>
                <Select value={dimensions} onValueChange={setDimensions}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    {DIMENSIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Model:</span> <span className="font-medium">{T2I_MODELS.find(m => m.value === selectedModel)?.label}</span></div>
                <div><span className="text-slate-400">Style:</span> <span className="font-medium">{artisticStyle || 'None'}</span></div>
                <div><span className="text-slate-400">Subject:</span> <span className="font-medium">{SUBJECT_TYPE.find(s => s.value === subjectType)?.label || 'None'}</span></div>
                <div><span className="text-slate-400">Dimensions:</span> <span className="font-medium">{DIMENSIONS.find(d => d.value === dimensions)?.label}</span></div>
                {selectedProps.length > 0 && <div className="col-span-2"><span className="text-slate-400">Props:</span> <span className="font-medium">{selectedProps.length} selected</span></div>}
                {selectedBrand && <div className="col-span-2"><span className="text-slate-400">Brand Guide:</span> <span className="font-medium">{selectedBrand.brand_name}</span></div>}
              </div>
            </div>

            {/* Prompt Preview */}
            <div className="space-y-2">
              <div role="button" tabIndex={0} onClick={() => setShowPreview(p => !p)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowPreview(p => !p); }}
                className="flex items-center gap-2 text-sm font-medium text-[#2C666E] hover:text-[#07393C] cursor-pointer">
                <Eye className="w-4 h-4" /> {showPreview ? "Hide" : "Show"} Prompt Preview
              </div>
              {showPreview && (
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {buildPromptPreview() || <span className="text-slate-400 italic">Fill in options to preview...</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">Final prompt is built by the LLM using all your inputs.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* IMAGE TO IMAGE                                                */}
        {/* ══════════════════════════════════════════════════════════════ */}

        {/* I2I Multi-Results Grid */}
        {mode === "i2i" && i2iMultiResults.length > 0 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">
                {(() => {
                  const completed = i2iMultiResults.filter(r => r.status === 'completed').length;
                  const total = i2iMultiResults.length;
                  return completed === total
                    ? <span className="text-green-600">All {total} images complete</span>
                    : <span>Generating... {completed}/{total} complete</span>;
                })()}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setI2iMultiResults([]); setI2iEditing(false); }}>
                  <ChevronLeft className="w-3 h-3 mr-1" /> Back to Editor
                </Button>
                {i2iMultiResults.some(r => r.status === 'completed' && !r.saved) && (
                  <Button size="sm" className="bg-[#2C666E] hover:bg-[#07393C] text-white" onClick={handleI2iSaveAll}>
                    <FolderOpen className="w-3 h-3 mr-1" /> Save All
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {i2iMultiResults.map((result, index) => (
                <div key={result.styleKey || index} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-600">{result.styleLabel}</span>
                  </div>
                  <div className="aspect-square relative">
                    {['prompting', 'generating', 'polling'].includes(result.status) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs capitalize">{result.status}...</span>
                      </div>
                    )}
                    {result.status === 'completed' && result.imageUrl && (
                      <img src={result.imageUrl} alt={result.styleLabel}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setI2iExpandedImage(result)} />
                    )}
                    {result.status === 'failed' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-4">
                        <AlertCircle className="w-6 h-6 mb-2" />
                        <span className="text-xs text-center mb-2">{result.error || 'Failed'}</span>
                        <Button size="sm" variant="outline" onClick={() => handleI2iRetry(index)}>Retry</Button>
                      </div>
                    )}
                  </div>
                  {result.status === 'completed' && (
                    <div className="p-2 border-t border-slate-100 space-y-1.5">
                      <input type="text" placeholder="Tags (comma-separated)"
                        value={result.tags || ''} disabled={result.saved}
                        onChange={(e) => setI2iMultiResults(prev => prev.map((r, i) => i === index ? { ...r, tags: e.target.value } : r))}
                        className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded focus:border-[#2C666E] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400" />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                          disabled={result.saved}
                          onClick={() => handleI2iSaveOne(index)}>
                          {result.saved ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> : <><FolderOpen className="w-3 h-3 mr-1" /> Save</>}
                        </Button>
                        <Button size="sm" className="flex-1 text-xs h-7 bg-[#2C666E] hover:bg-[#07393C] text-white"
                          onClick={() => { setI2iResultUrl(result.imageUrl); setI2iMultiResults([]); }}>
                          Use
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox overlay */}
        {i2iExpandedImage && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
            onClick={() => setI2iExpandedImage(null)}
            onKeyDown={(e) => e.key === 'Escape' && setI2iExpandedImage(null)}
            tabIndex={-1} ref={el => el && el.focus()}>
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setI2iExpandedImage(null)}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
              <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
                <div className="px-4 py-2 bg-slate-50 border-b">
                  <span className="text-sm font-medium text-slate-700">{i2iExpandedImage.styleLabel}</span>
                </div>
                <img src={i2iExpandedImage.imageUrl} alt={i2iExpandedImage.styleLabel}
                  className="max-w-[85vw] max-h-[80vh] object-contain" />
              </div>
            </div>
          </div>
        )}

        {/* I2I Result View (shown on any step when result exists) */}
        {mode === "i2i" && i2iResultUrl && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Edit Complete!
              </div>
            </div>
            <div className="bg-slate-100 rounded-xl overflow-hidden">
              <img src={i2iResultUrl} alt="Edited" className="w-full object-contain max-h-[500px]" />
            </div>
            <ResultActions imageUrl={i2iResultUrl} onEditAgain={() => setI2iResultUrl("")} onClose={onClose} onGenerate={onGenerate} />
          </div>
        )}

        {/* I2I Step 0: Images */}
        {mode === "i2i" && step === 0 && !i2iResultUrl && i2iMultiResults.length === 0 && (
          <div className="p-5 space-y-4 max-w-2xl">
            <div>
              <Label className="text-sm font-medium mb-1 block">
                Images <span className="text-slate-400 font-normal">(first = base, others = references)</span>
              </Label>
              <p className="text-xs text-slate-400 mb-3">
                Add your base image and optional reference images. Multi-image models can blend them together — perfect for placing a character into a scene.
              </p>

              <div className="grid grid-cols-4 gap-3 mb-3">
                {i2iImages.map(img => (
                  <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    img.isBase ? 'border-[#2C666E] ring-2 ring-[#90DDF0]/50' : 'border-slate-200'
                  }`}>
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {!img.isBase && <button onClick={() => handleI2iSetBase(img.id)} className="p-1 bg-white rounded text-xs">Set Base</button>}
                      <button onClick={() => handleI2iRemoveImage(img.id)} className="p-1 bg-red-500 text-white rounded"><X className="w-3 h-3" /></button>
                    </div>
                    {img.isBase && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#2C666E] text-white text-[10px] rounded font-bold">BASE</div>}
                  </div>
                ))}
                {i2iImages.length < 10 && (
                  <button onClick={() => i2iFileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-[#2C666E] transition-colors flex flex-col items-center justify-center text-slate-400 hover:text-[#2C666E]">
                    <Plus className="w-6 h-6 mb-1" /><span className="text-xs">Add</span>
                  </button>
                )}
              </div>

              <input ref={i2iFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleI2iFileUpload} />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => i2iFileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                <Button variant="outline" size="sm" onClick={() => setI2iShowUrlInput(!i2iShowUrlInput)}><Link2 className="w-4 h-4 mr-2" /> From URL</Button>
                <Button variant="outline" size="sm" onClick={() => setShowI2iLibrary(true)}><FolderOpen className="w-4 h-4 mr-2" /> Library</Button>
              </div>

              {i2iShowUrlInput && (
                <div className="mt-3 flex gap-2">
                  <Input placeholder="https://example.com/image.jpg" value={i2iUrlInput} onChange={(e) => setI2iUrlInput(e.target.value)} className="flex-1" />
                  <Button onClick={handleI2iAddUrl}>Add</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* I2I Step 1: Instructions & Style */}
        {mode === "i2i" && step === 1 && !i2iResultUrl && i2iMultiResults.length === 0 && (
          <div className="p-5">
            <div className="flex gap-6">
              <div className="w-1/2 min-w-0 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Edit Instructions</Label>
                  <Textarea placeholder="Describe what you want to create or change...&#10;&#10;e.g., 'Place the character in a sunset beach scene'&#10;e.g., 'Blend these images into a cinematic composition'"
                    value={i2iPrompt} onChange={(e) => setI2iPrompt(e.target.value)} className="min-h-[140px]" />
                </div>

                {/* Thumbnail summary of images */}
                {i2iImages.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Your Images ({i2iImages.length})</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {i2iImages.map(img => (
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
                <StyleGrid value={i2iStyle} onChange={setI2iStyle} maxHeight="none" columns="grid-cols-3" multiple />
              </div>
            </div>
          </div>
        )}

        {/* I2I Step 2: Enhance */}
        {mode === "i2i" && step === 2 && !i2iResultUrl && i2iMultiResults.length === 0 && (
          <div className="p-5 space-y-5 max-w-2xl">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enhancements (optional)</h3>

            <PropsPillSelector selected={i2iProps} onChange={setI2iProps} />

            <NegPromptPillSelector selectedPills={i2iNegPills} onPillsChange={setI2iNegPills}
              freetext={i2iNegFreetext} onFreetextChange={setI2iNegFreetext} />

            <BrandStyleGuideSelector value={i2iBrand} onChange={setI2iBrand} />
          </div>
        )}

        {/* I2I Step 3: Model & Output */}
        {mode === "i2i" && step === 3 && !i2iResultUrl && i2iMultiResults.length === 0 && (
          <div className="p-5 space-y-5 max-w-2xl">
            {/* Model selector */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Model
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {I2I_MODELS.map(m => (
                  <button key={m.value} type="button" onClick={() => setI2iModel(m.value)}
                    className={`text-left rounded-lg border-2 p-3 transition-all ${
                      i2iModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-slate-900">{m.label}</div>
                      {m.multiImage && <span className="px-1.5 py-0.5 bg-[#90DDF0]/30 text-[#07393C] text-[10px] font-bold rounded">MULTI-IMAGE</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.description}</div>
                    {!m.multiImage && i2iImages.length > 1 && (
                      <div className="text-[10px] text-amber-600 mt-1">Only uses base image — {i2iImages.length - 1} reference(s) ignored</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              {isWavespeed ? (
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">Output Size</Label>
                  <select value={i2iOutputSize} onChange={(e) => setI2iOutputSize(e.target.value)}
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
                      {OUTPUT_SIZES.filter(s => !s.ratio.includes('16:9') && !s.ratio.includes('1:1') && !s.ratio.includes('9:16')).map(s => <option key={s.id} value={s.id}>{s.ratio} - {s.label}</option>)}
                    </optgroup>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Strength: {i2iStrength.toFixed(2)}</label>
                    <input type="range" min="0.1" max="1.0" step="0.05" value={i2iStrength}
                      onChange={(e) => setI2iStrength(parseFloat(e.target.value))} className="w-full h-2 accent-[#2C666E]" />
                    <p className="text-[10px] text-slate-400 mt-0.5">Lower = subtle, Higher = creative</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Dimensions</label>
                    <Select value={i2iDimensions} onValueChange={setI2iDimensions}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900">
                        {DIMENSIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* LoRA */}
            {i2iModelDef.supportsLora && (
              <div className="space-y-2 p-3 bg-[#90DDF0]/10 border border-[#2C666E]/20 rounded-xl">
                <h3 className="text-sm font-semibold text-[#07393C] pb-1">LoRA Models (optional)</h3>
                <LoRAPicker value={i2iLoras} onChange={setI2iLoras} />
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-slate-400">Images:</span> <span className="font-medium">{i2iImages.length}</span></div>
                <div><span className="text-slate-400">Model:</span> <span className="font-medium">{i2iModelDef.label}</span></div>
                {i2iStyle.length > 0 && <div><span className="text-slate-400">Styles:</span> <span className="font-medium">{i2iStyle.length} selected</span></div>}
                {i2iBrand && <div><span className="text-slate-400">Brand:</span> <span className="font-medium">{i2iBrand.brand_name}</span></div>}
              </div>
              {i2iImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {i2iImages.map(img => (
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

      {/* ═══════════ Footer ═══════════ */}
      {!(mode === "i2i" && (i2iMultiResults.length > 0 || i2iResultUrl)) && (
      <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
        {/* Status text */}
        <div className="text-xs text-slate-500">
          {mode === "t2i" && step === 0 && !subjectType && <span>Select a subject type to begin</span>}
          {mode === "t2i" && step === 0 && subjectType && !subjectDescription.trim() && <span>Add a description</span>}
          {mode === "t2i" && step === 0 && subjectType && subjectDescription.trim() && <span className="text-green-600 font-medium">Subject ready</span>}
          {mode === "t2i" && step === 1 && !artisticStyle && <span>Choose an artistic style</span>}
          {mode === "t2i" && step === 1 && artisticStyle && <span className="text-green-600 font-medium">Style selected</span>}
          {mode === "t2i" && step === 2 && <span className="text-slate-400">All enhancements are optional</span>}
          {mode === "t2i" && step === 3 && canImagine && <span className="text-green-600 font-medium">Ready to generate</span>}
          {mode === "t2i" && step === 3 && !canImagine && <span className="text-amber-600">Go back and fill in subject type, description, and style</span>}
          {mode === "i2i" && i2iMultiResults.length === 0 && step === 0 && i2iImages.length === 0 && <span>Add at least one image</span>}
          {mode === "i2i" && i2iMultiResults.length === 0 && step === 0 && i2iImages.length > 0 && <span className="text-green-600 font-medium">{i2iImages.length} image{i2iImages.length !== 1 ? 's' : ''} ready</span>}
          {mode === "i2i" && i2iMultiResults.length === 0 && step === 1 && !i2iPrompt.trim() && <span>Add edit instructions</span>}
          {mode === "i2i" && i2iMultiResults.length === 0 && step === 1 && i2iPrompt.trim() && <span className="text-green-600 font-medium">Instructions set</span>}
          {mode === "i2i" && i2iMultiResults.length === 0 && step === 2 && <span className="text-slate-400">All enhancements are optional</span>}
          {mode === "i2i" && i2iMultiResults.length === 0 && step === 3 && <span className="text-green-600 font-medium">Ready to edit</span>}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          {/* Back button (all steps > 0) */}
          {step > 0 && !i2iResultUrl && i2iMultiResults.length === 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={generating || i2iEditing}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {/* Cancel on step 0 */}
          {step === 0 && !isEmbedded && !i2iResultUrl && i2iMultiResults.length === 0 && (
            <Button variant="outline" onClick={onClose} disabled={generating || i2iEditing}>Cancel</Button>
          )}

          {/* ─── T2I Navigation ─── */}
          {mode === "t2i" && step < 3 && (
            <Button onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && (!subjectType || !subjectDescription.trim())) ||
                (step === 1 && !artisticStyle)
              }
              className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {mode === "t2i" && step === 3 && (
            <Button onClick={handleImagine} disabled={generating || !canImagine}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building Prompt...</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Imagine</>}
            </Button>
          )}

          {/* ─── I2I Navigation ─── */}
          {mode === "i2i" && step < 3 && !i2iResultUrl && i2iMultiResults.length === 0 && (
            <Button onClick={() => setStep(s => s + 1)}
              disabled={(step === 0 && i2iImages.length === 0) || (step === 1 && !i2iPrompt.trim())}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              {step === 2 ? 'Next' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {mode === "i2i" && step === 3 && !i2iResultUrl && i2iMultiResults.length === 0 && (
            <Button onClick={handleImageEdit} disabled={i2iEditing || i2iImages.length === 0 || !i2iPrompt.trim()}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              {i2iEditing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Editing...</>
                : <><Pencil className="w-4 h-4 mr-2" /> Edit Image</>}
            </Button>
          )}
        </div>
      </div>
      )}
    </div>
  );

  if (isEmbedded) return <div className="flex flex-col h-full bg-white overflow-hidden">{content}</div>;

  return (
    <>
      <SlideOverPanel open={isOpen} onOpenChange={(open) => !open && onClose()}
        title="Imagineer" subtitle="Create and edit images with AI"
        icon={<Sparkles className="w-5 h-5" />}>
        {content}
      </SlideOverPanel>
      <LibraryModal isOpen={showRefLibrary} onClose={() => setShowRefLibrary(false)}
        onSelect={(item) => { setRefImageUrl(item.url); setRefPreview(item.url); setShowRefLibrary(false); analyzeRefImage(item.url); }} mediaType="images" />
      <LibraryModal isOpen={showI2iLibrary} onClose={() => setShowI2iLibrary(false)}
        onSelect={handleI2iLibrarySelect} mediaType="images" />
    </>
  );
}
