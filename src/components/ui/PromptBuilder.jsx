import React, { useState, useCallback, useEffect } from 'react';
import { Wand2, Edit3, Eye, ChevronDown } from 'lucide-react';

/**
 * Shared Prompt Builder — structured pill-based prompt assembly.
 *
 * Assembles "Scene description. Style: X. Mood: Y. Lighting: Z. Camera: W. Color grade: V."
 * Used across Imagineer, JumpStart, Storyboard, Edit Image, and Video Studio.
 *
 * Props:
 *   value          - current prompt string (controlled)
 *   onChange        - callback(newPrompt) when assembled prompt changes
 *   mode           - 'image' | 'video' | 'edit' — controls which sections show
 *   placeholder    - textarea placeholder
 *   label          - prompt label text
 *   showToggle     - show Builder/Freeform toggle (default true)
 *   compact        - use compact layout (default false)
 *   defaultMode    - 'builder' | 'freeform' (default 'builder')
 *   extraSections  - array of { label, key, options[] } for tool-specific pill rows
 */

// ── Shared pill options ──────────────────────────────────────────────────

export const STYLE_OPTIONS = [
  'Cinematic', 'Photorealistic', 'Anime', 'Watercolor', 'Oil painting',
  'Noir', 'Retro VHS', 'Cyberpunk neon', 'Studio Ghibli', 'Documentary',
  'Music video', 'Fashion editorial', 'Comic book', 'Pixel art',
  'Claymation', 'Pencil sketch', 'Impressionist',
];

export const MOOD_OPTIONS = [
  'Dramatic', 'Serene', 'Energetic', 'Melancholic', 'Mysterious',
  'Joyful', 'Tense', 'Romantic', 'Whimsical', 'Epic',
  'Dark', 'Ethereal', 'Playful', 'Inspirational',
];

export const LIGHTING_OPTIONS = [
  'Golden hour', 'Blue hour', 'Harsh midday sun', 'Soft diffused',
  'Backlit silhouette', 'Neon glow', 'Candlelight', 'Overcast flat',
  'Rim lighting', 'Chiaroscuro', 'Volumetric rays', 'Studio softbox',
  'Low-key dramatic', 'High-key bright',
];

export const CAMERA_OPTIONS = [
  'Static locked', 'Slow pan left', 'Slow pan right', 'Dolly in',
  'Dolly out', 'Orbit around subject', 'Tracking shot', 'Handheld shake',
  'Crane up', 'Crane down', 'Zoom in', 'Zoom out',
];

export const CAMERA_ANGLE_OPTIONS = [
  'Eye level', 'High angle', 'Low angle', "Bird's eye", 'Dutch angle',
  'POV', 'Wide shot', 'Close-up', 'Extreme close-up', 'Over the shoulder',
];

export const COLOR_GRADE_OPTIONS = [
  'Warm amber', 'Cool blue', 'Teal and orange', 'Desaturated',
  'High contrast B&W', 'Pastel', 'Vivid saturated', 'Faded film',
  'Green tint matrix', 'Sepia', 'Monochrome', 'Cinematic orange-teal',
];

export const QUALITY_BOOST_OPTIONS = [
  'Ultra detailed', '8K resolution', 'Sharp focus', 'Professional',
  'Award-winning', 'Masterpiece', 'RAW photo', 'DSLR quality',
];

// Pill colors by category
const PILL_COLORS = {
  style:       { active: 'bg-[#07393C] text-white border-[#07393C]', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  mood:        { active: 'bg-[#2C666E] text-white border-[#2C666E]', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  lighting:    { active: 'bg-amber-600 text-white border-amber-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  camera:      { active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  cameraAngle: { active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  colorGrade:  { active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  quality:     { active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
  default:     { active: 'bg-slate-800 text-white border-slate-800', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
};

// ── PillRow sub-component ────────────────────────────────────────────────

function PillRow({ label, options, selected, onSelect, colorKey = 'default', collapsed = false }) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const colors = PILL_COLORS[colorKey] || PILL_COLORS.default;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-700"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
        {label}
        {selected && <span className="ml-1 text-[9px] font-normal normal-case text-slate-400">({selected})</span>}
      </button>
      {isExpanded && (
        <div className="flex flex-wrap gap-1.5">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(selected === opt ? '' : opt)}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${selected === opt ? colors.active : colors.inactive}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main PromptBuilder ───────────────────────────────────────────────────

export default function PromptBuilder({
  value = '',
  onChange,
  mode = 'image',
  placeholder = 'Describe your scene in detail...',
  label = 'Scene Description',
  showToggle = true,
  compact = false,
  defaultMode = 'builder',
  extraSections = [],
}) {
  const [promptMode, setPromptMode] = useState(defaultMode);
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [mood, setMood] = useState('');
  const [lighting, setLighting] = useState('');
  const [camera, setCamera] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [colorGrade, setColorGrade] = useState('');
  const [quality, setQuality] = useState('');
  const [extraSelections, setExtraSelections] = useState({});

  // Assemble prompt from builder fields
  const assemblePrompt = useCallback(() => {
    const parts = [];
    if (description.trim()) parts.push(description.trim());
    if (style) parts.push(`Style: ${style}`);
    if (mood) parts.push(`Mood: ${mood}`);
    if (lighting) parts.push(`Lighting: ${lighting}`);
    if (mode === 'video' && camera) parts.push(`Camera: ${camera}`);
    if (cameraAngle) parts.push(`Camera angle: ${cameraAngle}`);
    if (colorGrade) parts.push(`Color grade: ${colorGrade}`);
    if (quality) parts.push(`Quality: ${quality}`);
    // Extra tool-specific sections
    for (const section of extraSections) {
      const val = extraSelections[section.key];
      if (val) parts.push(`${section.label}: ${val}`);
    }
    if (parts.length === 0) return '';
    return parts.join('. ') + '.';
  }, [description, style, mood, lighting, camera, cameraAngle, colorGrade, quality, extraSelections, extraSections, mode]);

  // Sync builder → onChange when fields change
  useEffect(() => {
    if (promptMode === 'builder') {
      const assembled = assemblePrompt();
      if (assembled && onChange) onChange(assembled);
    }
  }, [assemblePrompt, promptMode]);

  // Parse incoming value into builder fields when switching to builder mode
  // (only if description is empty — don't overwrite user selections)
  useEffect(() => {
    if (promptMode === 'builder' && !description && value) {
      // Try to extract description from the start of the prompt (before first "Style:" etc.)
      const match = value.match(/^(.+?)(?:\.\s*(?:Style|Mood|Lighting|Camera|Color grade|Quality):|\.$)/);
      if (match) setDescription(match[1].trim());
    }
  }, [promptMode]);

  const handleExtraSelect = (key, val) => {
    setExtraSelections(prev => ({ ...prev, [key]: val }));
  };

  // Sections config based on mode
  const showCameraMovement = mode === 'video';
  const showCameraAngle = mode === 'image' || mode === 'edit';
  const showQuality = mode === 'image';

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      {showToggle && (
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setPromptMode('builder')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${promptMode === 'builder' ? 'bg-white shadow text-[#07393C]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Wand2 className="w-3 h-3" /> Builder
            </button>
            <button
              type="button"
              onClick={() => setPromptMode('freeform')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${promptMode === 'freeform' ? 'bg-white shadow text-[#07393C]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Edit3 className="w-3 h-3" /> Freeform
            </button>
          </div>
          {promptMode === 'builder' && value && (
            <button type="button" onClick={() => setPromptMode('freeform')} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <Eye className="w-3 h-3" /> View full prompt
            </button>
          )}
        </div>
      )}

      {/* Builder Mode */}
      {promptMode === 'builder' && (
        <div className={`space-y-3 ${compact ? '' : 'space-y-4'}`}>
          {/* Scene Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{label}</label>
            <textarea
              placeholder={placeholder}
              className={`w-full p-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#2C666E] bg-slate-50 resize-none ${compact ? 'h-20' : 'h-24'}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Pill sections */}
          <PillRow label="Style" options={STYLE_OPTIONS} selected={style} onSelect={setStyle} colorKey="style" />
          <PillRow label="Mood" options={MOOD_OPTIONS} selected={mood} onSelect={setMood} colorKey="mood" />
          <PillRow label="Lighting" options={LIGHTING_OPTIONS} selected={lighting} onSelect={setLighting} colorKey="lighting" />

          {showCameraMovement && (
            <PillRow label="Camera Movement" options={CAMERA_OPTIONS} selected={camera} onSelect={setCamera} colorKey="camera" />
          )}
          {showCameraAngle && (
            <PillRow label="Camera Angle" options={CAMERA_ANGLE_OPTIONS} selected={cameraAngle} onSelect={setCameraAngle} colorKey="cameraAngle" />
          )}

          <PillRow label="Color Grade" options={COLOR_GRADE_OPTIONS} selected={colorGrade} onSelect={setColorGrade} colorKey="colorGrade" />

          {showQuality && (
            <PillRow label="Quality Boost" options={QUALITY_BOOST_OPTIONS} selected={quality} onSelect={setQuality} colorKey="quality" collapsed />
          )}

          {/* Extra tool-specific sections */}
          {extraSections.map(section => (
            <PillRow
              key={section.key}
              label={section.label}
              options={section.options}
              selected={extraSelections[section.key] || ''}
              onSelect={(val) => handleExtraSelect(section.key, val)}
              colorKey={section.colorKey || 'default'}
              collapsed={section.collapsed}
            />
          ))}

          {/* Assembled prompt preview */}
          {value && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Assembled Prompt</label>
              <p className="text-xs text-slate-600 leading-relaxed">{value}</p>
            </div>
          )}
        </div>
      )}

      {/* Freeform Mode */}
      {promptMode === 'freeform' && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">{label}</label>
          <textarea
            placeholder={placeholder}
            className={`w-full p-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#2C666E] bg-slate-50 resize-none ${compact ? 'h-28' : 'h-40'}`}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
          <p className="text-[10px] text-slate-400">
            Tip: Use structured format for best results — "Scene description. Style: X. Mood: Y. Lighting: Z."
          </p>
        </div>
      )}
    </div>
  );
}
