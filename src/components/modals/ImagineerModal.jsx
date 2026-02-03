import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { toast } from "sonner";

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

const ARTISTIC_STYLE = [
  { value: "", label: "Select style..." },
  // Photography styles
  { value: "photorealistic", label: "Photorealistic" },
  { value: "hyperrealistic", label: "Hyperrealistic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "documentary", label: "Documentary" },
  { value: "fashion-photography", label: "Fashion Photography" },
  { value: "portrait-photography", label: "Portrait Photography" },
  { value: "product-photography", label: "Product Photography" },
  { value: "street-photography", label: "Street Photography" },
  { value: "macro-photography", label: "Macro Photography" },
  { value: "film-grain", label: "Film Grain/Analog" },
  { value: "polaroid", label: "Polaroid" },
  // Painting styles
  { value: "oil-painting", label: "Oil Painting" },
  { value: "watercolor", label: "Watercolor" },
  { value: "acrylic", label: "Acrylic Painting" },
  { value: "gouache", label: "Gouache" },
  { value: "pastel", label: "Pastel Drawing" },
  { value: "charcoal", label: "Charcoal Drawing" },
  { value: "pencil-sketch", label: "Pencil Sketch" },
  { value: "ink-wash", label: "Ink Wash" },
  { value: "impasto", label: "Impasto (Thick Paint)" },
  // Art movements
  { value: "impressionism", label: "Impressionism" },
  { value: "expressionism", label: "Expressionism" },
  { value: "surrealism", label: "Surrealism" },
  { value: "cubism", label: "Cubism" },
  { value: "art-nouveau", label: "Art Nouveau" },
  { value: "art-deco", label: "Art Deco" },
  { value: "baroque", label: "Baroque" },
  { value: "renaissance", label: "Renaissance" },
  { value: "pop-art", label: "Pop Art" },
  { value: "abstract", label: "Abstract" },
  { value: "minimalist", label: "Minimalist" },
  { value: "brutalist", label: "Brutalist" },
  // Digital & Modern
  { value: "digital-art", label: "Digital Art" },
  { value: "3d-render", label: "3D Render" },
  { value: "cgi", label: "CGI/VFX" },
  { value: "concept-art", label: "Concept Art" },
  { value: "matte-painting", label: "Matte Painting" },
  { value: "vaporwave", label: "Vaporwave" },
  { value: "synthwave", label: "Synthwave/Retrowave" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "steampunk", label: "Steampunk" },
  { value: "dieselpunk", label: "Dieselpunk" },
  { value: "glitch-art", label: "Glitch Art" },
  { value: "low-poly", label: "Low Poly" },
  { value: "isometric", label: "Isometric" },
  // Animation styles
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
  { value: "cartoon", label: "Cartoon" },
  { value: "comic-book", label: "Comic Book" },
  { value: "pixel-art", label: "Pixel Art" },
  { value: "8-bit", label: "8-bit Retro" },
  { value: "disney", label: "Disney Style" },
  { value: "pixar", label: "Pixar 3D" },
  { value: "ghibli", label: "Studio Ghibli" },
  { value: "claymation", label: "Claymation" },
  // Specialized
  { value: "fantasy-art", label: "Fantasy Art" },
  { value: "sci-fi-art", label: "Sci-Fi Art" },
  { value: "horror", label: "Horror/Dark Art" },
  { value: "storybook", label: "Storybook Illustration" },
  { value: "vintage-poster", label: "Vintage Poster" },
  { value: "propaganda-poster", label: "Propaganda Poster" },
  { value: "ukiyo-e", label: "Ukiyo-e (Japanese Woodblock)" },
  { value: "chinese-ink", label: "Chinese Ink Painting" },
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
  { value: "9:16", label: "Portrait Tall (9:16)" },
  { value: "4:3", label: "Landscape Standard (4:3)" },
  { value: "3:2", label: "Photo Landscape (3:2)" },
  { value: "3:4", label: "Portrait Standard (3:4)" },
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
 * ImagineerModal - AI Image Generation with form-based prompt builder
 */
export default function ImagineerModal({ 
  isOpen, 
  onClose, 
  onGenerate,
  isEmbedded = false 
}) {
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
  
  // UI state
  const [generating, setGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubjectDescription("");
      setSubjectType("");
      setArtisticStyle("");
      setColorPalette("");
      setLighting("");
      setCameraAngle("");
      setDimensions("16:9");
      setMood("");
      setElementsToInclude("");
      setGenerating(false);
      setShowAdvanced(false);
      setShowPreview(false);
    }
  }, [isOpen]);

  // Build the combined prompt from all selections
  const buildPrompt = () => {
    const parts = [];
    
    if (subjectType) {
      const subjectLabel = SUBJECT_TYPE.find(s => s.value === subjectType)?.label || subjectType;
      parts.push(subjectLabel);
    }
    
    if (subjectDescription.trim()) {
      parts.push(subjectDescription.trim());
    }
    
    if (elementsToInclude.trim()) {
      parts.push(`featuring ${elementsToInclude.trim()}`);
    }
    
    if (artisticStyle) {
      const styleLabel = ARTISTIC_STYLE.find(s => s.value === artisticStyle)?.label || artisticStyle;
      parts.push(`${styleLabel} style`);
    }
    
    if (lighting) {
      const lightingLabel = LIGHTING.find(l => l.value === lighting)?.label || lighting;
      parts.push(`with ${lightingLabel}`);
    }
    
    if (cameraAngle) {
      const angleLabel = CAMERA_ANGLE.find(a => a.value === cameraAngle)?.label || cameraAngle;
      parts.push(`${angleLabel}`);
    }
    
    if (colorPalette) {
      const colorLabel = COLOR_PALETTE.find(c => c.value === colorPalette)?.label || colorPalette;
      parts.push(`${colorLabel} color palette`);
    }
    
    if (mood) {
      const moodLabel = MOOD.find(m => m.value === mood)?.label || mood;
      parts.push(`${moodLabel} mood`);
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
      await onGenerate({ 
        prompt: generatedPrompt, 
        style: artisticStyle, 
        dimensions,
      });
      onClose();
    } catch (error) {
      console.error('Imagineer generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {!isEmbedded && (
        <div className="p-6 pb-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Imagineer</h2>
              <p className="text-slate-500 text-sm">Build your perfect image by selecting options below</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="space-y-6 max-w-3xl mx-auto">
          
          {/* SECTION: Subject */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">Subject</h3>
            <div className="grid grid-cols-2 gap-3">
              <SelectField 
                label="Subject Type" 
                value={subjectType} 
                onChange={setSubjectType} 
                options={SUBJECT_TYPE}
                required
              />
              <SelectField 
                label="Artistic Style" 
                value={artisticStyle} 
                onChange={setArtisticStyle} 
                options={ARTISTIC_STYLE}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Description (what/who is the subject?)
              </label>
              <Input
                value={subjectDescription}
                onChange={(e) => setSubjectDescription(e.target.value)}
                placeholder="e.g., a confident businesswoman, a vintage sports car, a majestic lion..."
                className="bg-white focus-visible:ring-2 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          {/* SECTION: Style & Atmosphere */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">Style & Atmosphere</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SelectField label="Lighting" value={lighting} onChange={setLighting} options={LIGHTING} />
              <SelectField label="Camera Angle" value={cameraAngle} onChange={setCameraAngle} options={CAMERA_ANGLE} />
              <SelectField label="Color Palette" value={colorPalette} onChange={setColorPalette} options={COLOR_PALETTE} />
              <SelectField label="Mood" value={mood} onChange={setMood} options={MOOD} />
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
          </div>

          {/* Output Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">Output Settings</h3>
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

          {/* PREVIEW */}
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
              {showPreview ? "Hide" : "Preview"} Generated Prompt
            </div>
            
            {showPreview && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {generatedPrompt || <span className="text-slate-400 italic">Start selecting options to build your prompt...</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center gap-3 pt-4 border-t flex-shrink-0 px-6 pb-4 bg-slate-50 rounded-b-xl">
        <div className="text-xs text-slate-500">
          {canImagine ? (
            <span className="text-green-600">✓ Ready to generate</span>
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
                Starting...
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}
