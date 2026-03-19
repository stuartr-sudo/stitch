import React, { useState, useEffect, useRef } from "react";
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from "@/components/ui/slide-over-panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import StyleGrid from "@/components/ui/StyleGrid";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Eye, Cpu, Palette, SlidersHorizontal, Pencil, FolderOpen, Upload, X, ImageIcon } from "lucide-react";
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

const IMAGE_MODELS = [
  { value: "nano-banana-2", label: "Nano Banana 2", description: "Fast, high-quality image generation" },
  { value: "seedream", label: "Seedream v4 (ByteDance)", description: "Excellent prompt adherence & detail" },
  { value: "fal-flux", label: "Flux 2 Dev (Supports LoRA)", description: "Best for Brand Kits & Custom Products" },
];

// Dropdown options
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

// SelectField component
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
          <SelectItem key={opt.value} value={opt.value || "_empty_"} className="text-sm">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

/**
 * Reusable action buttons shown below any generated/edited image result
 */
function ResultActions({ imageUrl, onEditAgain, onClose, onGenerate }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {onEditAgain && (
        <Button variant="outline" size="sm" className="text-xs" onClick={onEditAgain}>
          <Pencil className="w-3 h-3 mr-1" /> Edit Again
        </Button>
      )}
      <Button
        variant="outline" size="sm" className="text-xs"
        onClick={() => {
          apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, type: 'image', title: '[Imagineer] Image', source: 'imagineer' }),
          }).then(() => toast.success('Saved to library')).catch(() => toast.error('Save failed'));
        }}
      >
        <FolderOpen className="w-3 h-3 mr-1" /> Save to Library
      </Button>
      <Button
        variant="outline" size="sm" className="text-xs"
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'inpaint', imageUrl } }));
        }}
      >
        Inpaint
      </Button>
      <Button
        variant="outline" size="sm" className="text-xs"
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'turnaround', imageUrl } }));
        }}
      >
        Turnaround
      </Button>
      <Button
        variant="outline" size="sm" className="text-xs"
        onClick={() => {
          if (onGenerate) onGenerate({ editedImageUrl: imageUrl });
          onClose();
        }}
      >
        <Sparkles className="w-3 h-3 mr-1" /> Use in Storyboard
      </Button>
    </div>
  );
}

/**
 * ImagineerModal - AI Image Generation with form-based prompt builder
 * Now with: Props, Negative Prompts, Brand Style Guide, Reference Image Analysis,
 * and LLM cohesive prompt generation before image generation.
 */
export default function ImagineerModal({
  isOpen,
  onClose,
  onGenerate,
  isEmbedded = false
}) {
  // Model selection
  const [selectedModel, setSelectedModel] = useState("nano-banana-2");

  // Core subject
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectType, setSubjectType] = useState("");

  // Visual style
  const [artisticStyle, setArtisticStyle] = useState("");
  const [colorPalette, setColorPalette] = useState("");

  // Technical
  const [lighting, setLighting] = useState("");
  const [cameraAngle, setCameraAngle] = useState("");
  const [dimensions, setDimensions] = useState("16:9");

  // Context
  const [mood, setMood] = useState("");
  const [elementsToInclude, setElementsToInclude] = useState("");

  // Props, Neg Prompts, Brand Style — Generate tab
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedNegPills, setSelectedNegPills] = useState([]);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Reference image — Generate tab
  const [refImageUrl, setRefImageUrl] = useState("");
  const [refPreview, setRefPreview] = useState("");
  const [refDescription, setRefDescription] = useState("");
  const [analyzingRef, setAnalyzingRef] = useState(false);
  const [showRefLibrary, setShowRefLibrary] = useState(false);
  const refFileInputRef = useRef(null);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("subject");

  const [generateLoras, setGenerateLoras] = useState([]);

  // Edit tab state
  const [showEditLibrary, setShowEditLibrary] = useState(false);
  const [editModel, setEditModel] = useState("fal-flux");
  const [editStyle, setEditStyle] = useState("");
  const [editResultUrl, setEditResultUrl] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const editFileInputRef = useRef(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editStrength, setEditStrength] = useState(0.75);
  const [editLoras, setEditLoras] = useState([]);
  const [editDimensions, setEditDimensions] = useState("1:1");
  const [isEditing, setIsEditing] = useState(false);

  // Props, Neg Prompts, Brand Style — Edit tab
  const [editSelectedProps, setEditSelectedProps] = useState([]);
  const [editSelectedNegPills, setEditSelectedNegPills] = useState([]);
  const [editNegativePrompt, setEditNegativePrompt] = useState("");
  const [editSelectedBrand, setEditSelectedBrand] = useState(null);

  const { user } = useAuth();

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedModel("nano-banana-2");
      setSubjectDescription("");
      setSubjectType("");
      setArtisticStyle("");
      setColorPalette("");
      setLighting("");
      setCameraAngle("");
      setDimensions("16:9");
      setMood("");
      setElementsToInclude("");
      setSelectedProps([]);
      setSelectedNegPills([]);
      setNegativePrompt("");
      setSelectedBrand(null);
      setRefImageUrl("");
      setRefPreview("");
      setRefDescription("");
      setAnalyzingRef(false);
      setGenerating(false);
      setShowPreview(false);
      setActiveTab("subject");
      setGenerateLoras([]);
    }
  }, [isOpen]);

  // --- Reference image handlers (Generate tab) ---
  const handleRefFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setRefPreview(dataUrl);
      setRefImageUrl(dataUrl);
      // Upload to get a real URL, then analyze
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await apiFetch('/api/library/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          setRefImageUrl(uploadData.url);
          analyzeRefImage(uploadData.url);
        }
      } catch (err) {
        console.error('Upload failed, using data URL for analysis');
        analyzeRefImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const analyzeRefImage = async (url) => {
    if (!url) return;
    setAnalyzingRef(true);
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      const data = await res.json();
      if (data.description) {
        setRefDescription(data.description);
        if (!subjectDescription.trim()) {
          setSubjectDescription(data.description);
        }
        toast.success('Image analyzed — description added');
      }
    } catch (err) {
      console.error('Analyze failed:', err);
      toast.error('Failed to analyze image');
    } finally {
      setAnalyzingRef(false);
    }
  };

  const clearRefImage = () => {
    setRefImageUrl("");
    setRefPreview("");
    setRefDescription("");
  };

  // --- Build cohesive prompt via LLM ---
  const buildCohesivePrompt = async (tool, extraData = {}) => {
    const styleInfo = findStyleByValue(extraData.style || artisticStyle);
    const styleText = styleInfo?.promptText || extraData.style || artisticStyle || '';

    const body = {
      tool,
      description: extraData.description || subjectDescription.trim(),
      style: styleText,
      props: getPropsLabels(extraData.props || selectedProps),
      negativePrompt: getCombinedNegativePrompt(
        extraData.negPills || selectedNegPills,
        extraData.negFreetext || negativePrompt
      ),
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to build prompt');
    return data.prompt;
  };

  // --- Legacy local prompt builder (fallback preview) ---
  const buildPrompt = () => {
    const parts = [];
    const subjectLabel = SUBJECT_TYPE.find(s => s.value === subjectType)?.label;
    const desc = subjectDescription.trim();
    if (subjectLabel && desc) parts.push(`A ${subjectLabel.toLowerCase()}: ${desc}`);
    else if (desc) parts.push(desc);
    else if (subjectLabel) parts.push(`A ${subjectLabel.toLowerCase()}`);
    if (elementsToInclude.trim()) parts.push(`featuring ${elementsToInclude.trim()}`);
    if (lighting) {
      const lightingLabel = LIGHTING.find(l => l.value === lighting)?.label || lighting;
      parts.push(`${lightingLabel.toLowerCase()} lighting`);
    }
    if (cameraAngle) {
      const angleLabel = CAMERA_ANGLE.find(a => a.value === cameraAngle)?.label || cameraAngle;
      parts.push(`shot from ${angleLabel.toLowerCase()}`);
    }
    if (colorPalette) {
      const colorLabel = COLOR_PALETTE.find(c => c.value === colorPalette)?.label || colorPalette;
      parts.push(`${colorLabel.toLowerCase()} color palette`);
    }
    if (mood) {
      const moodLabel = MOOD.find(m => m.value === mood)?.label || mood;
      parts.push(`${moodLabel.toLowerCase()} atmosphere`);
    }
    if (artisticStyle) {
      const styleInfo = findStyleByValue(artisticStyle);
      if (styleInfo?.promptText) parts.push(styleInfo.promptText);
      else parts.push(`${artisticStyle} style`);
    }
    return parts.join(", ");
  };

  const generatedPrompt = buildPrompt();
  const canImagine = !!(subjectType && artisticStyle && (subjectDescription.trim() || subjectType !== ""));

  const handleImagine = async () => {
    if (!canImagine) {
      toast.error("Please select at least a subject type and artistic style.");
      return;
    }

    setGenerating(true);

    try {
      // Build loras array from LoRAPicker selections
      const loras = generateLoras
        .filter(l => l.url)
        .map(l => ({ url: l.url, scale: l.scale ?? 1.0 }));

      // Build cohesive prompt via LLM
      toast.info('Building cohesive prompt...');
      const cohesivePrompt = await buildCohesivePrompt('imagineer');

      await onGenerate({
        prompt: cohesivePrompt,
        style: artisticStyle,
        dimensions,
        model: loras.length > 0 ? 'fal-flux' : selectedModel,
        loras: loras.length > 0 ? loras : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Imagineer generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditSourceUrl(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEdit = async () => {
    if (!editSourceUrl.trim() || !editPrompt.trim()) {
      toast.error("Source image URL and edit prompt are required.");
      return;
    }
    setIsEditing(true);
    try {
      // Build cohesive edit prompt via LLM
      toast.info('Building cohesive prompt...');
      const styleInfo = findStyleByValue(editStyle);
      const cohesivePrompt = await buildCohesivePrompt('edit', {
        description: editPrompt.trim(),
        style: editStyle,
        props: editSelectedProps,
        negPills: editSelectedNegPills,
        negFreetext: editNegativePrompt,
        brand: editSelectedBrand,
        editStrength: editStrength,
      });

      const res = await apiFetch('/api/imagineer/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: editSourceUrl.trim(),
          prompt: cohesivePrompt,
          model: editModel,
          strength: editStrength,
          dimensions: editDimensions,
          loras: editLoras.map(l => ({ url: l.url, scale: l.scale })),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Edit failed');

      if (data.imageUrl) {
        toast.success('Image edited successfully');
        setEditResultUrl(data.imageUrl);
      } else if (data.requestId) {
        // Poll for async result
        toast.info('Edit processing...');
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            const pollRes = await apiFetch('/api/imagineer/result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId: data.requestId, model: data.model || editModel }),
            });
            const pollData = await pollRes.json();
            if (pollData.imageUrl) {
              toast.success('Image edited successfully');
              setEditResultUrl(pollData.imageUrl);
              break;
            }
            if (pollData.status === 'failed' || pollData.error) {
              throw new Error(pollData.error || 'Edit failed');
            }
          } catch (pollErr) {
            if (pollErr.message === 'Edit failed') throw pollErr;
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to edit image');
    } finally {
      setIsEditing(false);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-5 pt-3 pb-0 border-b bg-white">
          <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-0">
            <TabsTrigger value="subject" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2C666E] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              Subject
            </TabsTrigger>
            <TabsTrigger value="style" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2C666E] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              Style & Atmosphere
            </TabsTrigger>
            <TabsTrigger value="output" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2C666E] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              Output
            </TabsTrigger>
            <TabsTrigger value="edit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2C666E] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 text-sm">
              Edit
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ═══════════════ SUBJECT TAB ═══════════════ */}
          <TabsContent value="subject" className="mt-0 p-5">
            <div className="flex gap-6">
              {/* Left column — form fields */}
              <div className="w-1/2 min-w-0 space-y-4">
                {/* Model */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Model
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {IMAGE_MODELS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setSelectedModel(m.value)}
                        className={`text-left rounded-lg border-2 p-2 transition-all ${
                          selectedModel === m.value
                            ? 'border-[#2C666E] bg-[#2C666E]/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="font-medium text-xs text-slate-900">{m.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</h3>
                  <SelectField
                    label="Subject Type"
                    value={subjectType}
                    onChange={setSubjectType}
                    options={SUBJECT_TYPE}
                    required
                  />
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Description (what/who is the subject?)
                    </label>
                    <Textarea
                      value={subjectDescription}
                      onChange={(e) => setSubjectDescription(e.target.value)}
                      placeholder="e.g., a confident businesswoman, a vintage sports car, a majestic lion..."
                      className="bg-white text-sm"
                      rows={2}
                    />
                    {analyzingRef && (
                      <p className="text-[10px] text-[#2C666E] mt-0.5 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> AI is analyzing your reference image...
                      </p>
                    )}
                  </div>
                </div>

                {/* Reference Image (for AI analysis) */}
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reference Image (optional — AI will analyze)</Label>
                  {(refPreview || refImageUrl) ? (
                    <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="relative flex-shrink-0">
                        <img src={refPreview || refImageUrl} alt="Reference"
                          className="w-20 h-20 object-cover rounded-lg border border-slate-200" onError={(e) => { e.target.src = ''; }} />
                        {analyzingRef && (
                          <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-[#2C666E]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 font-medium mb-1">
                          {analyzingRef ? 'Analyzing...' : refDescription ? 'Description generated' : 'Reference loaded'}
                        </p>
                        {refDescription && (
                          <p className="text-[10px] text-slate-400 line-clamp-2">{refDescription}</p>
                        )}
                        <button onClick={clearRefImage}
                          className="mt-1 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5">
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div onClick={() => refFileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">Upload</span>
                        </div>
                        <div onClick={() => setShowRefLibrary(true)}
                          className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                          <FolderOpen className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">Library</span>
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

                {/* Props */}
                <PropsPillSelector selected={selectedProps} onChange={setSelectedProps} />

                {/* Brand Style Guide */}
                <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />

                {/* LoRA Models */}
                <div className="space-y-2 p-3 bg-[#90DDF0]/10 border border-[#2C666E]/20 rounded-xl">
                  <h3 className="text-sm font-semibold text-[#07393C] pb-1">LoRA Models (optional)</h3>
                  <p className="text-xs text-slate-500 -mt-2">Select LoRAs to use FLUX 2 Dev with your trained models.</p>
                  <LoRAPicker value={generateLoras} onChange={setGenerateLoras} />
                </div>
              </div>

              {/* Right column — Style grid */}
              <div className="w-1/2 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                <StyleGrid value={artisticStyle} onChange={setArtisticStyle} maxHeight="none" columns="grid-cols-3" />
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════ STYLE & ATMOSPHERE TAB ═══════════════ */}
          <TabsContent value="style" className="mt-0 p-5 space-y-5">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Visual Settings
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Lighting" value={lighting} onChange={setLighting} options={LIGHTING} />
                <SelectField label="Camera Angle" value={cameraAngle} onChange={setCameraAngle} options={CAMERA_ANGLE} />
                <SelectField label="Color Palette" value={colorPalette} onChange={setColorPalette} options={COLOR_PALETTE} />
                <SelectField label="Mood" value={mood} onChange={setMood} options={MOOD} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Elements to Include (optional)
              </label>
              <Input
                value={elementsToInclude}
                onChange={(e) => setElementsToInclude(e.target.value)}
                placeholder="e.g., flowers, rain, neon signs, smoke, books..."
                className="bg-white focus-visible:ring-2 focus-visible:ring-offset-1"
              />
            </div>

            {/* Negative Prompts */}
            <NegPromptPillSelector
              selectedPills={selectedNegPills}
              onPillsChange={setSelectedNegPills}
              freetext={negativePrompt}
              onFreetextChange={setNegativePrompt}
            />
          </TabsContent>

          {/* ═══════════════ OUTPUT TAB ═══════════════ */}
          <TabsContent value="output" className="mt-0 p-5 space-y-5">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Output Settings
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Dimensions</label>
                  <Select value={dimensions} onValueChange={setDimensions}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {DIMENSIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="text-sm">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Prompt Preview */}
            <div className="space-y-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowPreview(prev => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setShowPreview(prev => !prev);
                  }
                }}
                className="flex items-center gap-2 text-sm font-medium text-[#2C666E] hover:text-[#07393C] cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Hide" : "Preview"} Prompt (local preview — LLM builds final)
              </div>

              {showPreview && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {generatedPrompt || <span className="text-slate-400 italic">Start selecting options to build your prompt...</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">The actual prompt will be built by the LLM using all your inputs (props, neg prompts, brand guide, etc.)</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════ EDIT TAB ═══════════════ */}
          <TabsContent value="edit" className="mt-0 p-5">
            <div className="flex gap-6">
              {/* Left column — edit form */}
              <div className="w-1/2 min-w-0 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit Image
                </h3>

                {/* Model selector */}
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_MODELS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setEditModel(m.value)}
                      className={`text-left rounded-lg border-2 p-2 transition-all ${
                        editModel === m.value
                          ? 'border-[#2C666E] bg-[#2C666E]/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-medium text-xs text-slate-900">{m.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{m.description}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Source Image</label>
                  <div className="flex gap-1.5">
                    <Input
                      value={editSourceUrl}
                      onChange={(e) => setEditSourceUrl(e.target.value)}
                      placeholder="Paste URL, upload, or pick from library"
                      className="bg-white focus-visible:ring-2 focus-visible:ring-offset-1 flex-1 text-xs"
                    />
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      className="shrink-0 px-2"
                      title="Upload image"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditLibrary(true)}
                      className="shrink-0 px-2"
                      title="Pick from library"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {editSourceUrl && (
                    <img src={editSourceUrl} alt="Source" className="w-full rounded-lg mt-2 border border-slate-200" />
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Edit Prompt</label>
                  <Input
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., change the background to a beach sunset, add a hat..."
                    className="bg-white focus-visible:ring-2 focus-visible:ring-offset-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Strength: {editStrength.toFixed(2)}
                    </label>
                    <input
                      type="range" min="0.1" max="1.0" step="0.05"
                      value={editStrength}
                      onChange={(e) => setEditStrength(parseFloat(e.target.value))}
                      className="w-full h-2 accent-[#2C666E]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Lower = subtle, Higher = creative</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Dimensions</label>
                    <Select value={editDimensions} onValueChange={setEditDimensions}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900">
                        {DIMENSIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value} className="text-sm">{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Props for Edit */}
                <PropsPillSelector selected={editSelectedProps} onChange={setEditSelectedProps} />

                {/* Negative Prompts for Edit */}
                <NegPromptPillSelector
                  selectedPills={editSelectedNegPills}
                  onPillsChange={setEditSelectedNegPills}
                  freetext={editNegativePrompt}
                  onFreetextChange={setEditNegativePrompt}
                />

                {/* Brand Style Guide for Edit */}
                <BrandStyleGuideSelector value={editSelectedBrand} onChange={setEditSelectedBrand} />

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600">LoRA Models (optional)</label>
                  <LoRAPicker value={editLoras} onChange={setEditLoras} />
                </div>

                <Button
                  onClick={handleEdit}
                  disabled={isEditing || !editSourceUrl.trim() || !editPrompt.trim()}
                  className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  {isEditing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Editing...</>
                  ) : (
                    <><Pencil className="w-4 h-4 mr-2" /> Edit Image</>
                  )}
                </Button>

                {/* Result image */}
                {editResultUrl && (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Result</label>
                    <img src={editResultUrl} alt="Edited result" className="w-full rounded-lg border border-slate-200" />
                    <ResultActions
                      imageUrl={editResultUrl}
                      onEditAgain={() => {
                        setEditSourceUrl(editResultUrl);
                        toast.success('Result loaded as source — edit again');
                      }}
                      onClose={onClose}
                      onGenerate={onGenerate}
                    />
                  </div>
                )}
              </div>

              {/* Right column — Style grid */}
              <div className="w-1/2 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                <label className="text-xs font-medium text-slate-600 mb-2 block">Style (optional)</label>
                <StyleGrid value={editStyle} onChange={setEditStyle} maxHeight="none" columns="grid-cols-3" />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
        <div className="text-xs text-slate-500">
          {canImagine ? (
            <span className="text-green-600 font-medium">Ready to generate</span>
          ) : (
            <span>Select subject type and artistic style to continue</span>
          )}
        </div>
        <div className="flex gap-3">
          {!isEmbedded && (
            <Button variant="outline" onClick={onClose} disabled={generating}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleImagine}
            disabled={generating || !canImagine}
            className="bg-[#2C666E] hover:bg-[#07393C] text-white disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Building Prompt...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Imagine
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <>
      <SlideOverPanel
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title="Imagineer"
        subtitle="Build your perfect image by selecting options below"
        icon={<Sparkles className="w-5 h-5" />}
      >
        {content}
      </SlideOverPanel>
      <LibraryModal
        isOpen={showEditLibrary}
        onClose={() => setShowEditLibrary(false)}
        onSelect={(item) => {
          setEditSourceUrl(item.url);
          setShowEditLibrary(false);
        }}
        mediaType="images"
      />
      <LibraryModal
        isOpen={showRefLibrary}
        onClose={() => setShowRefLibrary(false)}
        onSelect={(item) => {
          setRefImageUrl(item.url);
          setRefPreview(item.url);
          setShowRefLibrary(false);
          analyzeRefImage(item.url);
        }}
        mediaType="images"
      />
    </>
  );
}
