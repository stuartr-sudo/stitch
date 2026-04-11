import { useState, useEffect, useMemo } from 'react';
import { Zap, ChevronDown, Sparkles, Film, Mic, FileText, Share2, Settings, Type, Plus, X, Loader2, Play } from 'lucide-react';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import StyleGrid from '@/components/ui/StyleGrid';
import BrandStyleGuideSelector from '@/components/ui/BrandStyleGuideSelector';
import LoRAPicker from '@/components/LoRAPicker';
import { GEMINI_VOICES, FEATURED_VOICES } from '@/lib/geminiVoices';
import { CAPTION_STYLES } from '@/lib/captionStylePresets';
import { apiFetch } from '@/lib/api';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
import { MappableInput, MappableTextarea } from './MappableField';
import { getUpstreamNodes, buildOutputMap } from '@/lib/flowGraphUtils';

// ── Constants ────────────────────────────────────────────────────────────────

const NICHE_LABELS = {
  ai_tech_news: 'AI & Tech News', finance_money: 'Finance & Money',
  motivation: 'Motivation', scary_horror: 'Scary & Horror',
  history: 'History & Did You Know', true_crime: 'True Crime',
  science_nature: 'Science & Nature', relationships: 'Relationships & Dating',
  health_fitness: 'Health & Fitness', gaming_popculture: 'Gaming & Pop Culture',
  conspiracy_mystery: 'Conspiracy & Mystery', business: 'Business',
  food_cooking: 'Food & Cooking', travel_adventure: 'Travel & Adventure',
  psychology: 'Psychology', space_cosmos: 'Space & Cosmos',
  animals_wildlife: 'Animals & Wildlife', sports: 'Sports',
  education: 'Education', paranormal_ufo: 'Paranormal & UFO',
};

const IMAGE_MODELS = [
  { id: 'nano-banana-2', label: 'Nano Banana 2', desc: 'Fastest, great all-rounder' },
  { id: 'fal-flux', label: 'FLUX 2', desc: 'High quality, LoRA support' },
  { id: 'seeddream-v4', label: 'SeedDream v4.5', desc: 'Excellent detail & composition' },
  { id: 'imagen-4', label: 'Imagen 4', desc: 'Google, strong text rendering' },
  { id: 'kling-image-v3', label: 'Kling Image v3', desc: 'Character consistency' },
  { id: 'grok-imagine', label: 'Grok Imagine', desc: 'xAI, creative styles' },
  { id: 'ideogram-v2', label: 'Ideogram v2', desc: 'Best text-in-image' },
  { id: 'wavespeed', label: 'Wavespeed', desc: 'Budget-friendly' },
  { id: 'wan-22-t2i', label: 'Wan 2.2 T2I', desc: 'LoRA support' },
];

const VIDEO_MODELS = [
  { id: 'kling-2.0-master', label: 'Kling 2.0 Master', desc: '5-10s, great all-rounder' },
  { id: 'kling-v3-pro', label: 'Kling V3 Pro', desc: 'Multi-shot, high quality' },
  { id: 'kling-o3-pro', label: 'Kling O3 Pro', desc: 'R2V capable, top tier' },
  { id: 'veo-2', label: 'Veo 2', desc: 'Google, cinematic quality' },
  { id: 'veo-3.1-fast', label: 'Veo 3.1', desc: 'Best quality, FLF support' },
  { id: 'veo-3.1-lite', label: 'Veo 3.1 Lite', desc: '60% cheaper' },
  { id: 'pixverse-v6', label: 'PixVerse V6', desc: 'Audio generation' },
  { id: 'pixverse-v4.5', label: 'PixVerse v4.5', desc: 'Reliable, fast' },
  { id: 'wan-2.5', label: 'Wan 2.5', desc: 'Open source, versatile' },
  { id: 'wan-pro', label: 'Wan Pro', desc: 'Premium Wan variant' },
  { id: 'hailuo', label: 'Hailuo (MiniMax)', desc: 'Smooth motion' },
  { id: 'grok-imagine-i2v', label: 'Grok I2V', desc: 'xAI, with audio' },
  { id: 'wavespeed-wan', label: 'Wavespeed WAN', desc: 'Budget-friendly' },
];

const AUDIO_CAPABLE_MODELS = new Set([
  'kling-v3-pro', 'kling-o3-pro', 'veo-3.1-fast', 'veo-3.1-lite', 'grok-imagine-i2v', 'pixverse-v6',
]);

const CAROUSEL_STYLES = [
  { id: 'modern-clean', label: 'Modern Clean' }, { id: 'bold-impact', label: 'Bold Impact' },
  { id: 'gradient-wave', label: 'Gradient Wave' }, { id: 'minimal-zen', label: 'Minimal Zen' },
  { id: 'corporate-blue', label: 'Corporate Blue' }, { id: 'creative-pop', label: 'Creative Pop' },
  { id: 'dark-luxe', label: 'Dark Luxe' }, { id: 'organic-natural', label: 'Organic Natural' },
];

const LLM_MODELS = [
  { id: 'gpt-4.1', label: 'GPT-4.1', desc: 'Flagship — $2/$8', provider: 'openai' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', desc: 'Best value — $0.40/$1.60', provider: 'openai' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', desc: '$0.40/$1.60', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', desc: '$2.50/$10', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Cheapest — $0.15/$0.60', provider: 'openai' },
  { id: 'o3-mini', label: 'o3-mini', desc: 'Reasoning — $1.10/$4.40', provider: 'openai' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4', desc: 'Most capable — $15/$75', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4', desc: 'Balanced — $3/$15', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', desc: 'Fast — $0.80/$4', provider: 'anthropic' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Thinking — $1.25/$10', provider: 'google' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: '$0.15/$0.60', provider: 'google' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Cheapest — $0.10/$0.40', provider: 'google' },
];

function getLlmProvider(modelId) {
  if (modelId?.startsWith('claude-')) return 'anthropic';
  if (modelId?.startsWith('gemini-')) return 'google';
  return 'openai';
}

const CATEGORY_ICONS = {
  input: Type, image: Sparkles, video: Film, audio: Mic,
  content: FileText, publish: Share2, utility: Settings,
};

// ── Shared UI Helpers ────────────────────────────────────────────────────────

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] transition-colors bg-white';
const SELECT = INPUT + ' cursor-pointer';
const TEXTAREA = INPUT + ' resize-y';

function Panel({ title, description, children, className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>}
      {description && <p className="text-xs text-slate-500 mb-3">{description}</p>}
      {!description && title && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Label({ children, className = '' }) {
  return <label className={`text-xs font-medium text-slate-600 block mb-1.5 ${className}`}>{children}</label>;
}

function WiredBanner({ portName }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-teal-50 border border-teal-200">
      <Zap className="w-4 h-4 text-teal-600 flex-shrink-0" />
      <p className="text-sm text-teal-700">Connected via <span className="font-semibold">{portName}</span> input port — value flows from upstream node</p>
    </div>
  );
}

function PillGroup({ options, value, onChange, columns = 4 }) {
  return (
    <div className={`grid grid-cols-${columns} gap-2`}>
      {options.map(opt => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const desc = typeof opt === 'object' ? opt.desc : null;
        const sel = value === id;
        return (
          <button key={id} onClick={() => onChange(id)}
            className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${sel
              ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium ring-1 ring-[#2C666E]/20'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
            {label}
            {desc && <span className="block text-[11px] text-slate-400 mt-0.5">{desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ModelGrid({ models, value, onChange, columns = 2 }) {
  return (
    <div className={`grid grid-cols-${columns} gap-2`}>
      {models.map(m => {
        const sel = value === m.id;
        return (
          <button key={m.id} onClick={() => onChange(m.id)}
            className={`text-left px-4 py-3 rounded-lg border transition-all ${sel
              ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
              : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
            <span className={`text-sm font-medium block ${sel ? 'text-[#2C666E]' : 'text-slate-800'}`}>{m.label}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function CollapsiblePanel({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-5 border-t border-slate-200">{children}</div>}
    </div>
  );
}

// VariableInsertButton removed — replaced by MappableField slash-command picker

function AspectRatioButtons({ value, onChange }) {
  const ratios = ['16:9', '9:16', '1:1', '4:5', '3:2'];
  const dims = { '16:9': [28, 16], '9:16': [16, 28], '1:1': [20, 20], '4:5': [20, 24], '3:2': [24, 16] };
  return (
    <div className="flex gap-2 flex-wrap">
      {ratios.map(r => {
        const [w, h] = dims[r] || [20, 20];
        const sel = value === r;
        return (
          <button key={r} onClick={() => onChange(r)}
            className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border transition-all ${sel
              ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
              : 'border-slate-200 hover:bg-slate-50'}`}>
            <div style={{ width: w, height: h }} className={`border-2 rounded-sm ${sel ? 'border-[#2C666E]' : 'border-slate-300'}`} />
            <span className={`text-[11px] font-medium ${sel ? 'text-[#2C666E]' : 'text-slate-500'}`}>{r}</span>
          </button>
        );
      })}
    </div>
  );
}


// Resolve style preset keys to their promptText values
function resolveStylePresetText(keys) {
  if (!keys || !Array.isArray(keys) || keys.length === 0) return '';
  const allStyles = STYLE_CATEGORIES.flatMap(cat => cat.styles || []);
  return keys.map(key => {
    const style = allStyles.find(s => s.value === key);
    return style?.promptText || '';
  }).filter(Boolean).join('. ');
}


// ── ImageForm (Imagineer Generate, Imagineer Edit, Turnaround, Upscale, Smoosh) ──

function ImageForm({ config, u, nodeType, wired, upstreamOutputs, flowVariables }) {
  const nodeId = nodeType.id;
  const mp = { upstreamOutputs, flowVariables };

  // Simple image tools with their own dedicated forms
  if (nodeId === 'background-removal') {
    return (
      <Panel title="About">
        <p className="text-sm text-slate-600">Removes the background from an image using BRIA AI. Connect an image to the input port.</p>
      </Panel>
    );
  }

  if (nodeId === 'lens') {
    return (
      <div className="space-y-5">
        <Panel title="Target Angle">
          <PillGroup options={[
            { id: 'front', label: 'Front' }, { id: 'left', label: 'Left' },
            { id: 'right', label: 'Right' }, { id: 'back', label: 'Back' },
            { id: 'three_quarter_left', label: '3/4 Left' }, { id: 'three_quarter_right', label: '3/4 Right' },
            { id: 'top', label: 'Top' }, { id: 'bottom', label: 'Bottom' },
          ]} value={config.angle || 'three_quarter_left'} onChange={v => u('angle', v)} columns={4} />
        </Panel>
      </div>
    );
  }

  if (nodeId === 'trystyle') {
    return (
      <div className="space-y-5">
        <Panel title="Garment Category">
          <PillGroup options={[
            { id: 'tops', label: 'Tops', desc: 'Shirts, jackets, etc.' },
            { id: 'bottoms', label: 'Bottoms', desc: 'Pants, skirts, etc.' },
            { id: 'one-pieces', label: 'One-Pieces', desc: 'Dresses, jumpsuits' },
          ]} value={config.category || 'tops'} onChange={v => u('category', v)} columns={3} />
        </Panel>
        <Panel title="About">
          <p className="text-sm text-slate-500">Virtual try-on via FASHN AI. Connect a person image and a garment image to the input ports.</p>
        </Panel>
      </div>
    );
  }

  if (nodeId === 'inpaint') {
    return (
      <div className="space-y-5">
        {wired.has('prompt') ? <WiredBanner portName="prompt" /> : (
          <Panel title="Edit Prompt">
            <MappableTextarea value={config.prompt || ''} onChange={val => u('prompt', val)}
              placeholder="Describe what should appear in the masked region..." rows={3} className={TEXTAREA} {...mp} />
          </Panel>
        )}
        <Panel title="About">
          <p className="text-sm text-slate-500">Edit a specific region of an image. Connect an image and a mask (white = edit area, black = keep area).</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Prompt */}
      {wired.has('prompt') ? <WiredBanner portName="prompt" /> : (
        <Panel title="Prompt" description="Describe what you want to generate">
          <MappableTextarea value={config.prompt || ''} onChange={val => u('prompt', val)}
            placeholder="A cinematic wide shot of..." rows={4} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      {/* Model */}
      <Panel title="Model">
        <ModelGrid models={IMAGE_MODELS} value={config.model || 'nano-banana-2'} onChange={v => u('model', v)} />
      </Panel>

      {/* Visual Style */}
      <Panel title="Visual Style" description="Select one or more styles to guide generation">
        <StyleGrid value={config.style_preset || []} onChange={v => u({ style_preset: v, style_preset_text: resolveStylePresetText(v) })}
          maxHeight="20rem" columns="grid-cols-4" multiple />
      </Panel>

      {/* Aspect Ratio */}
      <Panel title="Aspect Ratio">
        <AspectRatioButtons value={config.aspect_ratio || '1:1'} onChange={v => u('aspect_ratio', v)} />
      </Panel>

      {/* Lighting */}
      <Panel title="Lighting">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: '', label: 'Auto' }, { id: 'natural', label: 'Natural' }, { id: 'golden_hour', label: 'Golden Hour' },
            { id: 'studio', label: 'Studio' }, { id: 'dramatic', label: 'Dramatic' }, { id: 'neon', label: 'Neon' },
            { id: 'soft', label: 'Soft' }, { id: 'backlit', label: 'Backlit' }, { id: 'cinematic', label: 'Cinematic' },
            { id: 'moody', label: 'Moody' }, { id: 'flat', label: 'Flat' },
          ].map(o => {
            const sel = (config.lighting || '') === o.id;
            return (
              <button key={o.id} onClick={() => u('lighting', o.id)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${sel
                  ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {o.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Camera Angle */}
      <Panel title="Camera Angle">
        <select value={config.camera_angle || ''} onChange={e => u('camera_angle', e.target.value)} className={SELECT}>
          <option value="">Auto</option>
          <option value="front">Front-facing</option>
          <option value="three_quarter">3/4 View</option>
          <option value="side">Side / Profile</option>
          <option value="birds_eye">Bird's Eye</option>
          <option value="low_angle">Low Angle (hero)</option>
          <option value="dutch_angle">Dutch Angle</option>
          <option value="close_up">Close-up</option>
          <option value="extreme_close_up">Extreme Close-up</option>
          <option value="wide_shot">Wide / Establishing</option>
          <option value="over_shoulder">Over the Shoulder</option>
        </select>
      </Panel>

      {/* Mood */}
      <Panel title="Mood / Atmosphere">
        <MappableTextarea value={config.mood || ''} onChange={val => u('mood', val)}
          placeholder="e.g. ethereal and dreamlike, dark and gritty, vibrant and energetic" rows={2} className={TEXTAREA} {...mp} />
      </Panel>

      {/* Color Palette */}
      <Panel title="Color Palette">
        <MappableTextarea value={config.color_palette || ''} onChange={val => u('color_palette', val)}
          placeholder="e.g. warm earth tones, neon pink and cyan, muted pastels" rows={2} className={TEXTAREA} {...mp} />
      </Panel>

      {/* Brand Guide */}
      <Panel title="Brand Guide">
        <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
      </Panel>

      {/* LoRA */}
      <Panel title="LoRA Models" description="Select trained LoRA models to apply">
        <LoRAPicker value={config.loras || []} onChange={v => u('loras', v)} />
      </Panel>

      {/* Negative Prompt */}
      <Panel title="Negative Prompt">
        <MappableTextarea value={config.negative_prompt || ''} onChange={val => u('negative_prompt', val)}
          placeholder="Things to avoid..." rows={2} className={TEXTAREA} {...mp} />
      </Panel>

      {/* Advanced */}
      <CollapsiblePanel title="Advanced Settings">
        <div className="space-y-4">
          <div>
            <Label>Seed</Label>
            <input type="number" value={config.seed || ''} onChange={e => u('seed', e.target.value)}
              placeholder="Random" className={INPUT} />
          </div>
          <div>
            <Label>Guidance Scale</Label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="20" step="0.5" value={config.guidance_scale || 7}
                onChange={e => u('guidance_scale', parseFloat(e.target.value))}
                className="flex-1 accent-[#2C666E]" />
              <span className="text-sm text-slate-600 w-8 text-right">{config.guidance_scale || 7}</span>
            </div>
          </div>
          {nodeId === 'imagineer-edit' && (
            <div>
              <Label>Strength</Label>
              <div className="flex items-center gap-3">
                <input type="range" min="0.1" max="1" step="0.05" value={config.strength || 0.75}
                  onChange={e => u('strength', parseFloat(e.target.value))}
                  className="flex-1 accent-[#2C666E]" />
                <span className="text-sm text-slate-600 w-10 text-right">{config.strength || 0.75}</span>
              </div>
            </div>
          )}
        </div>
      </CollapsiblePanel>

      {/* Turnaround-specific */}
      {nodeId === 'turnaround-sheet' && (
        <>
          <Panel title="Pose Set">
            <PillGroup
              options={[
                { id: 'standard-24', label: 'Standard 24', desc: 'Classic 4x6 grid' },
                { id: '3d-angles', label: '3D Angles', desc: 'Orthographic 2x2' },
                { id: '3d-action', label: '3D Action', desc: 'Dynamic 2x2' },
                { id: 'r2v-reference', label: 'R2V Reference', desc: '3x2 grid for R2V' },
              ]}
              value={config.pose_set || 'standard-24'} onChange={v => u('pose_set', v)} columns={2}
            />
          </Panel>
          <Panel title="Background">
            <PillGroup
              options={[
                { id: 'white', label: 'White' }, { id: 'gray', label: 'Gray (production)' }, { id: 'scene', label: 'Scene (for R2V)' },
              ]}
              value={config.background_mode || 'white'} onChange={v => u('background_mode', v)} columns={3}
            />
          </Panel>
        </>
      )}

      {/* Upscale */}
      {nodeId === 'upscale-image' && (
        <Panel title="Scale Factor">
          <PillGroup options={[{ id: '2', label: '2x' }, { id: '4', label: '4x' }]}
            value={config.upscale_factor || '2'} onChange={v => u('upscale_factor', v)} columns={2} />
        </Panel>
      )}

      {/* Smoosh */}
      {nodeId === 'smoosh' && (
        <Panel title="Blend Instructions">
          <MappableTextarea value={config.blend_prompt || ''} onChange={val => u('blend_prompt', val)}
            placeholder="e.g. blend these images seamlessly, matching lighting and perspective" rows={3} className={TEXTAREA} {...mp} />
        </Panel>
      )}
    </div>
  );
}


// ── VideoForm ────────────────────────────────────────────────────────────────

function VideoForm({ config, u, nodeType, wired, upstreamOutputs, flowVariables }) {
  const schema = nodeType.configSchema || {};
  const nodeId = nodeType.id;
  const mp = { upstreamOutputs, flowVariables };
  const modelOptions = schema.model?.options ? VIDEO_MODELS.filter(m => schema.model.options.includes(m.id)) : VIDEO_MODELS;
  const selectedModel = config.model || schema.model?.default || modelOptions[0]?.id;

  return (
    <div className="space-y-5">
      {wired.has('prompt') ? <WiredBanner portName="prompt" /> : (
        <Panel title="Prompt" description="Describe the motion and scene">
          <MappableTextarea value={config.prompt || ''} onChange={val => u('prompt', val)}
            placeholder="A cinematic slow-motion shot of..." rows={4} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      <Panel title="Model">
        <ModelGrid models={modelOptions} value={selectedModel} onChange={v => u('model', v)} />
      </Panel>

      {schema.duration?.options && (
        <Panel title="Duration">
          <PillGroup options={schema.duration.options.map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || schema.duration?.default || schema.duration.options[0]}
            onChange={v => u('duration', v)} columns={schema.duration.options.length} />
        </Panel>
      )}

      {AUDIO_CAPABLE_MODELS.has(selectedModel) && (
        <Panel title="Audio">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={config.generate_audio || false} onChange={e => u('generate_audio', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#2C666E] focus:ring-[#2C666E]/30" />
            <span className="text-sm text-slate-700">Generate audio with video</span>
          </label>
        </Panel>
      )}

      {schema.aspect_ratio && (
        <Panel title="Aspect Ratio">
          <AspectRatioButtons value={config.aspect_ratio || '16:9'} onChange={v => u('aspect_ratio', v)} />
        </Panel>
      )}

      <Panel title="Visual Style">
        <StyleGrid value={config.style_preset || []} onChange={v => u({ style_preset: v, style_preset_text: resolveStylePresetText(v) })} maxHeight="16rem" columns="grid-cols-4" multiple />
      </Panel>

      <Panel title="Brand Guide">
        <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
      </Panel>

      {nodeId === 'video-extend' && (
        <Panel title="Extension Duration">
          <PillGroup options={['2','4','6','8','10'].map(d => ({ id: d, label: `${d}s` }))}
            value={config.extend_duration || '6'} onChange={v => u('extend_duration', v)} columns={5} />
        </Panel>
      )}

      {nodeId === 'video-restyle' && (
        <Panel title="Restyle Strength">
          <div className="flex items-center gap-3">
            <input type="range" min="0.1" max="1" step="0.05" value={config.restyle_strength || 0.6}
              onChange={e => u('restyle_strength', parseFloat(e.target.value))} className="flex-1 accent-[#2C666E]" />
            <span className="text-sm text-slate-600 w-10 text-right">{config.restyle_strength || 0.6}</span>
          </div>
        </Panel>
      )}
    </div>
  );
}


// ── VoiceoverForm ────────────────────────────────────────────────────────────

function VoiceoverForm({ config, u, wired, upstreamOutputs, flowVariables }) {
  const [showAll, setShowAll] = useState(false);
  const mp = { upstreamOutputs, flowVariables };
  const featured = GEMINI_VOICES.filter(v => FEATURED_VOICES.includes(v.id));
  const remaining = GEMINI_VOICES.filter(v => !FEATURED_VOICES.includes(v.id));
  const sel = config.voice || 'Kore';

  return (
    <div className="space-y-5">
      {wired.has('text') ? <WiredBanner portName="text" /> : (
        <Panel title="Script">
          <MappableTextarea value={config.script || ''} onChange={val => u('script', val)}
            placeholder="Enter voiceover script..." rows={5} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      <Panel title="Voice" description="Select a voice for the narration">
        <p className="text-xs font-medium text-slate-500 mb-2">Featured</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {featured.map(v => (
            <button key={v.id} onClick={() => u('voice', v.id)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all ${sel === v.id
                ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
                : 'border-slate-200 hover:bg-slate-50'}`}>
              <span className={`text-sm font-medium block ${sel === v.id ? 'text-[#2C666E]' : 'text-slate-800'}`}>{v.label}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{v.description}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowAll(!showAll)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-2">
          <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll ? 'Hide' : 'Show all'} {remaining.length} voices
        </button>
        {showAll && (
          <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
            {remaining.map(v => (
              <button key={v.id} onClick={() => u('voice', v.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${sel === v.id
                  ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
                  : 'border-slate-200 hover:bg-slate-50'}`}>
                <span className={`text-sm font-medium block ${sel === v.id ? 'text-[#2C666E]' : 'text-slate-800'}`}>{v.label}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{v.description}</span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Voice Speed">
        <div className="flex items-center gap-3">
          <input type="range" min="0.8" max="1.5" step="0.05" value={config.speed || 1.15}
            onChange={e => u('speed', parseFloat(e.target.value))} className="flex-1 accent-[#2C666E]" />
          <span className="text-sm font-medium text-slate-700 w-12 text-right">{config.speed || 1.15}x</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">1.15x recommended for Shorts</p>
      </Panel>

      <Panel title="Style Instructions">
        <MappableTextarea value={config.style_instructions || ''} onChange={val => u('style_instructions', val)}
          placeholder="e.g. Speak with dramatic tension, emphasize key points, pause before reveals..." rows={3} className={TEXTAREA} {...mp} />
      </Panel>
    </div>
  );
}


// ── CaptionsForm ─────────────────────────────────────────────────────────────

function CaptionsForm({ config, u }) {
  const selStyle = config.caption_style || config.style || 'word_pop';
  return (
    <div className="space-y-5">
      <Panel title="Caption Style" description="Choose how captions appear on screen">
        <div className="grid grid-cols-4 gap-3">
          {CAPTION_STYLES.map(cs => {
            const sel = selStyle === cs.key;
            return (
              <button key={cs.key} onClick={() => { u('caption_style', cs.key); u('style', cs.key); }}
                className={`text-left rounded-xl border overflow-hidden transition-all ${sel
                  ? 'border-[#2C666E] ring-2 ring-[#2C666E]/20'
                  : 'border-slate-200 hover:border-slate-300'}`}>
                <div className={`${cs.preview.bg} px-4 py-6 flex items-center justify-center`}>
                  <span className={cs.preview.style} style={cs.preview.textStroke ? { WebkitTextStroke: cs.preview.textStroke } : undefined}>
                    {cs.preview.text}
                  </span>
                </div>
                <div className={`px-3 py-2 ${sel ? 'bg-[#2C666E]/5' : 'bg-white'}`}>
                  <span className={`text-sm font-medium block ${sel ? 'text-[#2C666E]' : 'text-slate-800'}`}>{cs.label}</span>
                  <span className="text-[11px] text-slate-400 block">{cs.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Font">
          <select value={config.font || 'Inter'} onChange={e => u('font', e.target.value)} className={SELECT}>
            {['Inter', 'Montserrat', 'Poppins', 'Roboto', 'Open Sans', 'Playfair Display', 'Space Mono', 'DM Sans'].map(f =>
              <option key={f} value={f}>{f}</option>
            )}
          </select>
        </Panel>
        <Panel title="Position">
          <PillGroup options={[{ id: 'top', label: 'Top' }, { id: 'center', label: 'Center' }, { id: 'bottom', label: 'Bottom' }]}
            value={config.position || 'bottom'} onChange={v => u('position', v)} columns={3} />
        </Panel>
      </div>
    </div>
  );
}


// ── MusicForm ────────────────────────────────────────────────────────────────

function MusicForm({ config, u, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  return (
    <div className="space-y-5">
      <Panel title="Mood" description="Describe the music mood (always instrumental)">
        <MappableTextarea value={config.mood || ''} onChange={val => u('mood', val)}
          placeholder="e.g. cinematic tension, lo-fi chill, upbeat electronic, dark ambient" rows={3} className={TEXTAREA} {...mp} />
      </Panel>
      <Panel title="Duration">
        <PillGroup options={['10','15','20','30','45','60','90'].map(d => ({ id: d, label: `${d}s` }))}
          value={config.duration || '30'} onChange={v => u('duration', v)} columns={7} />
      </Panel>
    </div>
  );
}


// ── AudioForm router ─────────────────────────────────────────────────────────

function AudioForm({ config, u, nodeType, wired, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  if (nodeType.id === 'voiceover') return <VoiceoverForm config={config} u={u} wired={wired} {...mp} />;
  if (nodeType.id === 'captions') return <CaptionsForm config={config} u={u} />;
  if (nodeType.id === 'music') return <MusicForm config={config} u={u} {...mp} />;
  return <GenericForm config={config} u={u} schema={nodeType.configSchema} {...mp} />;
}


// ── ShortsCreateForm ─────────────────────────────────────────────────────────

function ShortsCreateForm({ config, u, wired, upstreamOutputs, flowVariables }) {
  const [showAllVoices, setShowAllVoices] = useState(false);
  const mp = { upstreamOutputs, flowVariables };
  const featured = GEMINI_VOICES.filter(v => FEATURED_VOICES.includes(v.id));
  const remaining = GEMINI_VOICES.filter(v => !FEATURED_VOICES.includes(v.id));
  const selVoice = config.voice || 'Kore';

  return (
    <div className="space-y-5">
      {/* Script & Topic */}
      <Panel title="Niche">
        <select value={config.niche || 'ai_tech_news'} onChange={e => u('niche', e.target.value)} className={SELECT}>
          {Object.entries(NICHE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Panel>

      {wired.has('topic') ? <WiredBanner portName="topic" /> : (
        <Panel title="Topic">
          <MappableTextarea value={config.topic || ''} onChange={val => u('topic', val)}
            placeholder="What should the short be about?" rows={3} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Duration">
          <PillGroup options={['30','45','60','90'].map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || '60'} onChange={v => u('duration', v)} columns={4} />
        </Panel>
        <Panel title="Tone">
          <select value={config.tone || 'dramatic'} onChange={e => u('tone', e.target.value)} className={SELECT}>
            {['casual','professional','dramatic','humorous','educational','urgent','conversational'].map(t =>
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            )}
          </select>
        </Panel>
      </div>

      {/* Voice */}
      <Panel title="Voice" description="Select a Gemini TTS voice">
        <p className="text-xs font-medium text-slate-500 mb-2">Featured</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {featured.map(v => (
            <button key={v.id} onClick={() => u('voice', v.id)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all ${selVoice === v.id
                ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
                : 'border-slate-200 hover:bg-slate-50'}`}>
              <span className={`text-sm font-medium block ${selVoice === v.id ? 'text-[#2C666E]' : 'text-slate-800'}`}>{v.label}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{v.description}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowAllVoices(!showAllVoices)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-2">
          <ChevronDown className={`w-3 h-3 transition-transform ${showAllVoices ? 'rotate-180' : ''}`} />
          {showAllVoices ? 'Hide' : 'Show all'} {remaining.length} voices
        </button>
        {showAllVoices && (
          <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
            {remaining.map(v => (
              <button key={v.id} onClick={() => u('voice', v.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${selVoice === v.id
                  ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
                  : 'border-slate-200 hover:bg-slate-50'}`}>
                <span className={`text-sm font-medium block ${selVoice === v.id ? 'text-[#2C666E]' : 'text-slate-800'}`}>{v.label}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{v.description}</span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Voice Speed">
          <div className="flex items-center gap-3">
            <input type="range" min="0.8" max="1.5" step="0.05" value={config.voice_speed || 1.15}
              onChange={e => u('voice_speed', parseFloat(e.target.value))} className="flex-1 accent-[#2C666E]" />
            <span className="text-sm font-medium text-slate-700 w-12 text-right">{config.voice_speed || 1.15}x</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">1.15x recommended</p>
        </Panel>
        <Panel title="Voice Style Instructions">
          <MappableTextarea value={config.voice_style_instructions || ''} onChange={val => u('voice_style_instructions', val)}
            placeholder="e.g. Speak with dramatic tension..." rows={2} className={TEXTAREA} {...mp} />
        </Panel>
      </div>

      {/* Models */}
      <div className="grid grid-cols-2 gap-5">
        <Panel title="Image Model (Keyframes)">
          <ModelGrid models={IMAGE_MODELS} value={config.image_model || 'nano-banana-2'} onChange={v => u('image_model', v)} columns={1} />
        </Panel>
        <Panel title="Video Model (Clips)">
          <ModelGrid models={VIDEO_MODELS} value={config.video_model || 'kling-2.0-master'} onChange={v => u('video_model', v)} columns={1} />
        </Panel>
      </div>

      {/* Visual Style */}
      <Panel title="Visual Style">
        <StyleGrid value={config.style_preset || []} onChange={v => u({ style_preset: v, style_preset_text: resolveStylePresetText(v) })} maxHeight="16rem" columns="grid-cols-5" multiple />
      </Panel>

      {/* Captions */}
      <Panel title="Caption Style" description="Choose how captions appear on screen">
        <div className="grid grid-cols-4 gap-3">
          {CAPTION_STYLES.map(cs => {
            const sel = (config.caption_style || 'word_pop') === cs.key;
            return (
              <button key={cs.key} onClick={() => u('caption_style', cs.key)}
                className={`text-left rounded-xl border overflow-hidden transition-all ${sel
                  ? 'border-[#2C666E] ring-2 ring-[#2C666E]/20'
                  : 'border-slate-200 hover:border-slate-300'}`}>
                <div className={`${cs.preview.bg} px-3 py-4 flex items-center justify-center`}>
                  <span className={cs.preview.style} style={cs.preview.textStroke ? { WebkitTextStroke: cs.preview.textStroke } : undefined}>{cs.preview.text}</span>
                </div>
                <div className={`px-2.5 py-1.5 ${sel ? 'bg-[#2C666E]/5' : 'bg-white'}`}>
                  <span className={`text-xs font-medium ${sel ? 'text-[#2C666E]' : 'text-slate-700'}`}>{cs.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Music */}
      <Panel title="Background Music Mood" description="Leave empty for niche default. Always instrumental.">
        <MappableTextarea value={config.music_mood || ''} onChange={val => u('music_mood', val)}
          placeholder="e.g. dark ambient, cinematic tension, upbeat electronic" rows={2} className={TEXTAREA} {...mp} />
      </Panel>

      {/* Brand & LoRA */}
      <Panel title="Brand Guide">
        <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
      </Panel>
      <Panel title="LoRA Models">
        <LoRAPicker value={config.loras || []} onChange={v => u('loras', v)} />
      </Panel>
    </div>
  );
}


// ── StoryboardCreateForm ─────────────────────────────────────────────────────

function StoryboardCreateForm({ config, u, wired, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  return (
    <div className="space-y-5">
      <Panel title="Name">
        <MappableInput value={config.name || ''} onChange={val => u('name', val)}
          placeholder="Storyboard name..." className={INPUT} {...mp} />
      </Panel>

      {wired.has('topic') ? <WiredBanner portName="topic" /> : (
        <Panel title="Brief / Description" description="Describe the video you want to create">
          <MappableTextarea value={config.description || ''} onChange={val => u('description', val)}
            placeholder="Narrative, purpose, key scenes, visual direction..." rows={4} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      <div className="grid grid-cols-3 gap-5">
        <Panel title="Duration">
          <PillGroup options={['15','30','60','90'].map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || '30'} onChange={v => u('duration', v)} columns={2} />
        </Panel>
        <Panel title="Tone">
          <select value={config.tone || 'cinematic'} onChange={e => u('tone', e.target.value)} className={SELECT}>
            {['cinematic','documentary','commercial','artistic','educational','dramatic','playful','minimal'].map(t =>
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            )}
          </select>
        </Panel>
        <Panel title="Mood / Atmosphere">
          <MappableTextarea value={config.mood || ''} onChange={val => u('mood', val)}
            placeholder="e.g. cinematic, mysterious" rows={2} className={TEXTAREA} {...mp} />
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Image Model (Previews)">
          <ModelGrid models={IMAGE_MODELS} value={config.image_model || 'nano-banana-2'} onChange={v => u('image_model', v)} columns={1} />
        </Panel>
        <Panel title="Video Model (Production)">
          <ModelGrid models={VIDEO_MODELS} value={config.video_model || 'kling-2.0-master'} onChange={v => u('video_model', v)} columns={1} />
        </Panel>
      </div>

      <Panel title="Visual Style">
        <StyleGrid value={config.style_preset || []} onChange={v => u({ style_preset: v, style_preset_text: resolveStylePresetText(v) })} maxHeight="16rem" columns="grid-cols-5" multiple />
      </Panel>

      <Panel title="Brand Guide">
        <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
      </Panel>
      <Panel title="LoRA Models">
        <LoRAPicker value={config.loras || []} onChange={v => u('loras', v)} />
      </Panel>

      <CollapsiblePanel title="Characters">
        <MappableTextarea value={config.characters || ''} onChange={val => u('characters', val)}
          placeholder="Describe recurring characters — name, appearance, clothing, personality..." rows={3} className={TEXTAREA} {...mp} />
        <p className="text-xs text-slate-400 mt-1">Used for consistent character rendering across scenes</p>
      </CollapsiblePanel>
    </div>
  );
}


// ── CarouselCreateForm ───────────────────────────────────────────────────────

function CarouselCreateForm({ config, u, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  return (
    <div className="space-y-5">
      <Panel title="Platform">
        <PillGroup
          options={[
            { id: 'instagram', label: 'Instagram', desc: '1:1 square' },
            { id: 'linkedin', label: 'LinkedIn', desc: '1:1 or 4:5' },
            { id: 'tiktok', label: 'TikTok', desc: '9:16 vertical' },
            { id: 'facebook', label: 'Facebook', desc: '1:1 square' },
          ]}
          value={config.platform || 'instagram'} onChange={v => u('platform', v)} columns={4}
        />
      </Panel>

      <Panel title="Content Topic">
        <MappableTextarea value={config.topic || ''} onChange={val => u('topic', val)}
          placeholder="What should the carousel be about?" rows={3} className={TEXTAREA} {...mp} />
      </Panel>

      <Panel title="Carousel Style">
        <PillGroup options={CAROUSEL_STYLES} value={config.style || 'modern-clean'} onChange={v => u('style', v)} columns={4} />
      </Panel>

      <Panel title="Visual Style">
        <StyleGrid value={config.style_preset || []} onChange={v => u({ style_preset: v, style_preset_text: resolveStylePresetText(v) })} maxHeight="16rem" columns="grid-cols-5" multiple />
      </Panel>

      <Panel title="Brand Guide">
        <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
      </Panel>
    </div>
  );
}


// ── AdsGenerateForm ──────────────────────────────────────────────────────────

function AdsGenerateForm({ config, u, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  return (
    <div className="space-y-5">
      <Panel title="Platform">
        <PillGroup options={[{ id: 'linkedin', label: 'LinkedIn' }, { id: 'google', label: 'Google' }, { id: 'meta', label: 'Meta' }]}
          value={config.platform || 'linkedin'} onChange={v => u('platform', v)} columns={3} />
      </Panel>

      <Panel title="Objective">
        <PillGroup options={[
          { id: 'traffic', label: 'Traffic', desc: 'Drive visitors' },
          { id: 'conversions', label: 'Conversions', desc: 'Maximize sales' },
          { id: 'awareness', label: 'Awareness', desc: 'Reach audiences' },
          { id: 'leads', label: 'Leads', desc: 'Collect contacts' },
        ]} value={config.objective || 'traffic'} onChange={v => u('objective', v)} columns={4} />
      </Panel>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Product Description">
          <MappableTextarea value={config.product_description || ''} onChange={val => u('product_description', val)}
            placeholder="What are you advertising?" rows={3} className={TEXTAREA} {...mp} />
        </Panel>
        <Panel title="Target Audience">
          <MappableTextarea value={config.target_audience || ''} onChange={val => u('target_audience', val)}
            placeholder="e.g. SaaS founders, 25-45, US/UK" rows={3} className={TEXTAREA} {...mp} />
        </Panel>
      </div>

      <Panel title="Landing URL">
        <MappableInput value={config.landing_url || ''} onChange={val => u('landing_url', val)}
          placeholder="https://..." className={INPUT} {...mp} />
      </Panel>

      <Panel title="Visual Style">
        <StyleGrid value={config.style_preset || []} onChange={v => u({ style_preset: v, style_preset_text: resolveStylePresetText(v) })} maxHeight="16rem" columns="grid-cols-5" multiple />
      </Panel>

      <Panel title="Brand Guide">
        <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
      </Panel>
    </div>
  );
}


// ── LlmCallForm ─────────────────────────────────────────────────────────────

function LlmCallForm({ config, u, wired, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  const provider = getLlmProvider(config.model);
  const hasSchema = Array.isArray(config.output_schema) && config.output_schema.length > 0;

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);

  const handleTest = async () => {
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const resp = await apiFetch('/api/flows/test-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeTypeId: 'llm-call', config }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setTestResult(data.output);
      u('lastTestOutput', data.output);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  // Schema CRUD helpers
  const schema = config.output_schema || [];
  const setSchema = (next) => u('output_schema', next?.length ? next : null);
  const addField = () => setSchema([...schema, { key: '', type: 'string', description: '' }]);
  const updateField = (i, key, val) => { const s = [...schema]; s[i] = { ...s[i], [key]: val }; setSchema(s); };
  const removeField = (i) => setSchema(schema.filter((_, j) => j !== i));

  return (
    <div className="space-y-5">
      {/* Model */}
      <Panel title="Model" description="Choose an LLM provider and model. Prices shown as input/output per 1M tokens.">
        <select value={config.model || 'gpt-4.1-mini'} onChange={e => u('model', e.target.value)} className={SELECT}>
          <optgroup label="OpenAI">
            {LLM_MODELS.filter(m => m.provider === 'openai').map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
            ))}
          </optgroup>
          <optgroup label="Anthropic / Claude">
            {LLM_MODELS.filter(m => m.provider === 'anthropic').map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
            ))}
          </optgroup>
          <optgroup label="Google Gemini">
            {LLM_MODELS.filter(m => m.provider === 'google').map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
            ))}
          </optgroup>
        </select>
      </Panel>

      {/* System Prompt */}
      {wired.has('system_prompt') ? <WiredBanner portName="system_prompt" /> : (
        <Panel title="System Prompt" description="Instructions that define the AI's behavior and persona.">
          <MappableTextarea value={config.system_prompt || ''} onChange={val => u('system_prompt', val)}
            placeholder="You are a helpful assistant that..." rows={4} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      {/* User Prompt */}
      {wired.has('prompt') ? <WiredBanner portName="prompt" /> : (
        <Panel title="User Prompt" description="The message to send to the LLM.">
          <MappableTextarea value={config.prompt || ''} onChange={val => u('prompt', val)}
            placeholder="Write a summary of..." rows={4} className={TEXTAREA} {...mp} />
        </Panel>
      )}

      {/* Context */}
      {wired.has('context') ? <WiredBanner portName="context" /> : (
        <Panel title="Context Input">
          <p className="text-sm text-slate-500">Connect an upstream node to the <span className="font-medium text-slate-700">context</span> input port to inject data into the prompt. Context is prepended automatically.</p>
        </Panel>
      )}

      {/* ── Structured Output Schema ── */}
      <Panel title="Structured Output" description="Define a JSON schema for the LLM response. Each field becomes a separate, mappable output port.">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => hasSchema ? setSchema(null) : addField()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasSchema ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasSchema ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-slate-600">{hasSchema ? 'Enabled — LLM will return structured JSON' : 'Disabled — LLM returns free text'}</span>
        </div>

        {hasSchema && (
          <div className="space-y-3">
            {schema.map((field, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1 block">Field Name</label>
                    <input value={field.key} onChange={e => updateField(i, 'key', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="e.g. start_time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] bg-white" />
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1 block">Type</label>
                    <select value={field.type} onChange={e => updateField(i, 'type', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] bg-white cursor-pointer">
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="array">array</option>
                    </select>
                  </div>
                  <button onClick={() => removeField(i)} className="mt-5 p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1 block">Description (helps the LLM understand this field)</label>
                  <input value={field.description} onChange={e => updateField(i, 'description', e.target.value)}
                    placeholder="e.g. Start time in HH:MM format" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] bg-white" />
                </div>
              </div>
            ))}
            <button onClick={addField} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#2C666E] hover:bg-[#2C666E]/5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>
        )}
      </Panel>

      {/* ── Test Node ── */}
      <Panel title="Test Node" description="Execute this node once with the current settings to verify output structure.">
        <div className="flex items-center gap-3">
          <button onClick={handleTest}
            disabled={testLoading || (!config.prompt && !wired.has('prompt'))}
            className="flex items-center gap-2 px-4 py-2 bg-[#2C666E] hover:bg-[#07393C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {testLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <><Play className="w-4 h-4" /> Test Node</>}
          </button>
          {testResult && <span className="text-xs text-green-600 font-medium">Test passed</span>}
        </div>

        {testError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{testError}</div>
        )}

        {testResult && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Output</p>
            {Object.entries(testResult).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-mono font-semibold text-[#2C666E] min-w-[120px] pt-0.5">{key}</span>
                <span className="text-xs text-slate-600 break-all whitespace-pre-wrap">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Common Settings */}
      <Panel title="Generation Settings">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Temperature</Label>
            <input type="number" min="0" max="2" step="0.1" value={config.temperature ?? '0.7'}
              onChange={e => u('temperature', e.target.value)} className={INPUT} />
            <p className="text-[11px] text-slate-400 mt-1">0 = deterministic, 2 = creative</p>
          </div>
          <div>
            <Label>Max Tokens</Label>
            <input type="number" min="1" max="128000" value={config.max_tokens ?? '4096'}
              onChange={e => u('max_tokens', e.target.value)} className={INPUT} />
            <p className="text-[11px] text-slate-400 mt-1">Max output length</p>
          </div>
          <div>
            <Label>Top P</Label>
            <input type="number" min="0" max="1" step="0.05" value={config.top_p ?? ''}
              onChange={e => u('top_p', e.target.value)} className={INPUT} placeholder="1.0" />
            <p className="text-[11px] text-slate-400 mt-1">Nucleus sampling</p>
          </div>
        </div>
      </Panel>

      {/* Provider-specific Advanced Settings */}
      <CollapsiblePanel title="Advanced Settings">
        <div className="space-y-4">
          {provider === 'openai' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency Penalty</Label>
                  <input type="number" min="-2" max="2" step="0.1" value={config.frequency_penalty ?? ''}
                    onChange={e => u('frequency_penalty', e.target.value)} className={INPUT} placeholder="0" />
                  <p className="text-[11px] text-slate-400 mt-1">-2 to 2. Penalizes repeated tokens.</p>
                </div>
                <div>
                  <Label>Presence Penalty</Label>
                  <input type="number" min="-2" max="2" step="0.1" value={config.presence_penalty ?? ''}
                    onChange={e => u('presence_penalty', e.target.value)} className={INPUT} placeholder="0" />
                  <p className="text-[11px] text-slate-400 mt-1">-2 to 2. Encourages new topics.</p>
                </div>
              </div>
              {!hasSchema && (
                <div>
                  <Label>Response Format</Label>
                  <PillGroup options={[{ id: 'text', label: 'Text' }, { id: 'json_object', label: 'JSON Object' }]}
                    value={config.response_format || 'text'} onChange={v => u('response_format', v)} columns={2} />
                  <p className="text-[11px] text-slate-400 mt-1">JSON mode forces valid JSON output. Mention JSON in your prompt.</p>
                </div>
              )}
              <div>
                <Label>Seed</Label>
                <input type="number" value={config.seed ?? ''} onChange={e => u('seed', e.target.value)}
                  className={INPUT} placeholder="Optional — for reproducible outputs" />
              </div>
            </>
          )}

          {provider === 'anthropic' && (
            <>
              <div>
                <Label>Top K</Label>
                <input type="number" min="1" value={config.top_k ?? ''} onChange={e => u('top_k', e.target.value)}
                  className={INPUT} placeholder="Optional" />
                <p className="text-[11px] text-slate-400 mt-1">Only sample from the top K most likely tokens.</p>
              </div>
              <div>
                <Label>Stop Sequences</Label>
                <MappableInput value={config.stop_sequences || ''} onChange={val => u('stop_sequences', val)}
                  placeholder="Comma-separated, e.g.: END, STOP" className={INPUT} {...mp} />
                <p className="text-[11px] text-slate-400 mt-1">Generation stops when any sequence is produced.</p>
              </div>
            </>
          )}

          {provider === 'google' && (
            <>
              <div>
                <Label>Top K</Label>
                <input type="number" min="1" value={config.top_k ?? ''} onChange={e => u('top_k', e.target.value)}
                  className={INPUT} placeholder="Optional" />
                <p className="text-[11px] text-slate-400 mt-1">Only sample from the top K most likely tokens.</p>
              </div>
              {!hasSchema && (
                <div>
                  <Label>Response MIME Type</Label>
                  <PillGroup options={[{ id: 'text/plain', label: 'Text' }, { id: 'application/json', label: 'JSON' }]}
                    value={config.responseMimeType || 'text/plain'} onChange={v => u('responseMimeType', v)} columns={2} />
                  <p className="text-[11px] text-slate-400 mt-1">JSON mode forces structured JSON output.</p>
                </div>
              )}
              <div>
                <Label>Stop Sequences</Label>
                <MappableInput value={config.stop_sequences || ''} onChange={val => u('stop_sequences', val)}
                  placeholder="Comma-separated, e.g.: END, STOP" className={INPUT} {...mp} />
              </div>
            </>
          )}

          {provider === 'openai' && config.model === 'o3-mini' && (
            <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700">Reasoning model — temperature and top_p are ignored. Only max_tokens applies.</p>
            </div>
          )}
        </div>
      </CollapsiblePanel>
    </div>
  );
}


// ── ContentForm router ───────────────────────────────────────────────────────

function ContentForm({ config, u, nodeType, wired, upstreamOutputs, flowVariables }) {
  const nodeId = nodeType.id;
  const mp = { upstreamOutputs, flowVariables };

  if (nodeId === 'llm-call') return <LlmCallForm config={config} u={u} wired={wired} {...mp} />;
  if (nodeId === 'shorts-create') return <ShortsCreateForm config={config} u={u} wired={wired} {...mp} />;
  if (nodeId === 'storyboard-create') return <StoryboardCreateForm config={config} u={u} wired={wired} {...mp} />;
  if (nodeId === 'carousel-create') return <CarouselCreateForm config={config} u={u} {...mp} />;
  if (nodeId === 'ads-generate') return <AdsGenerateForm config={config} u={u} {...mp} />;

  if (nodeId === 'script-generator') {
    return (
      <div className="space-y-5">
        {wired.has('topic') ? <WiredBanner portName="topic" /> : (
          <Panel title="Topic">
            <MappableTextarea value={config.topic || ''} onChange={val => u('topic', val)}
              placeholder="What should the script be about?" rows={3} className={TEXTAREA} {...mp} />
          </Panel>
        )}
        <div className="grid grid-cols-3 gap-5">
          <Panel title="Niche">
            <select value={config.niche || 'ai_tech_news'} onChange={e => u('niche', e.target.value)} className={SELECT}>
              {Object.entries(NICHE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Panel>
          <Panel title="Duration">
            <PillGroup options={['30','60','90'].map(d => ({ id: d, label: `${d}s` }))}
              value={config.duration || '60'} onChange={v => u('duration', v)} columns={3} />
          </Panel>
          <Panel title="Tone">
            <select value={config.tone || 'dramatic'} onChange={e => u('tone', e.target.value)} className={SELECT}>
              {['casual','professional','dramatic','humorous','educational','urgent','conversational'].map(t =>
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              )}
            </select>
          </Panel>
        </div>
      </div>
    );
  }

  if (nodeId === 'text-transform') {
    return (
      <div className="space-y-5">
        {wired.has('text') ? <WiredBanner portName="text" /> : (
          <Panel title="Input Text">
            <MappableTextarea value={config.input_text || ''} onChange={val => u('input_text', val)}
              placeholder="Text to transform..." rows={4} className={TEXTAREA} {...mp} />
          </Panel>
        )}
        <Panel title="Operation">
          <PillGroup options={[
            { id: 'uppercase', label: 'UPPERCASE' }, { id: 'lowercase', label: 'lowercase' },
            { id: 'trim', label: 'Trim' }, { id: 'extract_first_line', label: 'First Line' },
            { id: 'add_prefix', label: 'Add Prefix' }, { id: 'add_suffix', label: 'Add Suffix' },
          ]} value={config.transform || 'trim'} onChange={v => u('transform', v)} columns={3} />
          {(config.transform === 'add_prefix' || config.transform === 'add_suffix') && (
            <div className="mt-3">
              <Label>Value</Label>
              <MappableInput value={config.value || ''} onChange={val => u('value', val)}
                placeholder={config.transform === 'add_prefix' ? 'Text to prepend...' : 'Text to append...'} className={INPUT} {...mp} />
            </div>
          )}
        </Panel>
      </div>
    );
  }

  if (nodeId === 'prompt-builder') {
    return (
      <Panel title="About" description="Assembles a cohesive prompt from connected inputs (description, style, props, brand guide). Connect nodes to its input ports.">
        <p className="text-sm text-slate-500">No manual configuration needed — outputs a single optimized generation prompt from connected inputs.</p>
      </Panel>
    );
  }

  if (nodeId === 'linkedin-post') {
    return (
      <div className="space-y-5">
        {wired.has('text') ? <WiredBanner portName="text" /> : (
          <Panel title="Post Topic">
            <MappableTextarea value={config.topic || ''} onChange={val => u('topic', val)}
              placeholder="What should the post be about?" rows={3} className={TEXTAREA} {...mp} />
          </Panel>
        )}
        <Panel title="Writing Style">
          <PillGroup options={[
            { id: 'professional', label: 'Professional' }, { id: 'thought_leader', label: 'Thought Leader' },
            { id: 'conversational', label: 'Conversational' }, { id: 'storytelling', label: 'Storytelling' },
            { id: 'educational', label: 'Educational' }, { id: 'provocative', label: 'Provocative' },
          ]} value={config.writing_style || 'professional'} onChange={v => u('writing_style', v)} columns={3} />
        </Panel>
        <Panel title="Brand Guide">
          <BrandStyleGuideSelector value={config.brand_kit || null} onChange={v => u('brand_kit', v)} />
        </Panel>
      </div>
    );
  }

  return <GenericForm config={config} u={u} schema={nodeType.configSchema} {...mp} />;
}


// ── PublishForm ───────────────────────────────────────────────────────────────

function PublishForm({ config, u, nodeType, connections, wired, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  const platformMap = { 'youtube-upload': 'youtube', 'tiktok-publish': 'tiktok', 'instagram-post': 'instagram', 'facebook-post': 'facebook' };
  const platform = platformMap[nodeType.id];
  const conn = connections?.find(c => c.platform === platform);

  return (
    <div className="space-y-5">
      {platform && (
        <Panel title="Account Status">
          <div className="flex items-center gap-3">
            {conn?.connected ? (
              <>
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Connected</p>
                  {conn.account_name && <p className="text-xs text-slate-500">{conn.account_name}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-700">Not connected</p>
                  <p className="text-xs text-slate-500">Connect in Settings &rarr; Connected Accounts</p>
                </div>
              </>
            )}
          </div>
        </Panel>
      )}

      {nodeType.id === 'youtube-upload' && (
        <>
          {wired.has('video') && <WiredBanner portName="video" />}
          <div className="grid grid-cols-2 gap-5">
            <Panel title="Title">
              <MappableInput value={config.title || ''} onChange={val => u('title', val)}
                placeholder="Video title..." className={INPUT} {...mp} />
            </Panel>
            <Panel title="Privacy">
              <PillGroup options={[{ id: 'public', label: 'Public' }, { id: 'unlisted', label: 'Unlisted' }, { id: 'private', label: 'Private' }]}
                value={config.privacy || 'private'} onChange={v => u('privacy', v)} columns={3} />
            </Panel>
          </div>
          <Panel title="Description">
            <MappableTextarea value={config.description || ''} onChange={val => u('description', val)}
              placeholder="Video description..." rows={3} className={TEXTAREA} {...mp} />
          </Panel>
          <Panel title="Tags">
            <MappableInput value={config.tags || ''} onChange={val => u('tags', val)}
              placeholder="tag1, tag2, tag3" className={INPUT} {...mp} />
            <p className="text-xs text-slate-400 mt-1">Comma-separated</p>
          </Panel>
        </>
      )}

      {nodeType.id === 'save-to-library' && (
        <Panel title="About">
          <p className="text-sm text-slate-600">Saves media to your permanent library. FAL CDN URLs expire within hours — always save generated media here.</p>
        </Panel>
      )}

      {!['youtube-upload', 'save-to-library'].includes(nodeType.id) && (
        <Panel title="Post Content">
          <p className="text-sm text-slate-500">Connect text, image, or video nodes to the input ports to set the post content.</p>
        </Panel>
      )}
    </div>
  );
}


// ── UtilityForm ──────────────────────────────────────────────────────────────

function UtilityForm({ config, u, nodeType, wired, upstreamOutputs, flowVariables }) {
  const nodeId = nodeType.id;
  const schema = nodeType.configSchema || {};
  const mp = { upstreamOutputs, flowVariables };

  if (nodeId === 'delay') {
    return (
      <Panel title="Delay Duration">
        <PillGroup options={(schema.seconds?.options || ['5','10','30','60']).map(s => ({ id: s, label: `${s}s` }))}
          value={config.seconds || '10'} onChange={v => u('seconds', v)} columns={4} />
      </Panel>
    );
  }

  if (nodeId === 'conditional') {
    return (
      <div className="space-y-5">
        <Panel title="Condition">
          <PillGroup options={[{ id: 'not_empty', label: 'Not Empty' }, { id: 'contains', label: 'Contains' }, { id: 'equals', label: 'Equals' }]}
            value={config.condition || 'not_empty'} onChange={v => u('condition', v)} columns={3} />
          {(config.condition === 'contains' || config.condition === 'equals') && (
            <div className="mt-3">
              <Label>Compare Value</Label>
              <MappableInput value={config.compare_value || ''} onChange={val => u('compare_value', val)}
                placeholder="Value to compare against..." className={INPUT} {...mp} />
            </div>
          )}
        </Panel>
      </div>
    );
  }

  if (nodeId === 'image-search') {
    return (
      <div className="space-y-5">
        {wired.has('query') ? <WiredBanner portName="query" /> : (
          <Panel title="Search Query">
            <MappableTextarea value={config.query || ''} onChange={val => u('query', val)}
              placeholder="What images are you looking for?" rows={2} className={TEXTAREA} {...mp} />
          </Panel>
        )}
        <Panel title="Result Count">
          <input type="number" min="1" max="20" value={config.count || 5} onChange={e => u('count', parseInt(e.target.value) || 5)} className={INPUT} />
        </Panel>
      </div>
    );
  }

  if (nodeId === 'video-trim') {
    return (
      <Panel title="Time Range">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Start (seconds)</Label><input type="number" value={config.start_time || '0'} onChange={e => u('start_time', e.target.value)} className={INPUT} /></div>
          <div><Label>End (seconds)</Label><input type="number" value={config.end_time || '10'} onChange={e => u('end_time', e.target.value)} className={INPUT} /></div>
        </div>
      </Panel>
    );
  }

  if (nodeId === 'extract-frame') {
    return (
      <Panel title="Frame Type">
        <PillGroup options={[{ id: 'first', label: 'First' }, { id: 'middle', label: 'Middle' }, { id: 'last', label: 'Last' }]}
          value={config.frame_type || 'first'} onChange={v => u('frame_type', v)} columns={3} />
      </Panel>
    );
  }

  if (nodeId === 'viewer3d') {
    return (
      <Panel title="About">
        <p className="text-sm text-slate-600">Converts an image to a 3D model via Hunyuan 3D Pro. Connect an image input for the front view.</p>
      </Panel>
    );
  }

  if (nodeId === 'lora-train') {
    return (
      <div className="space-y-5">
        <Panel title="Training Model">
          <PillGroup options={[
            { id: 'flux-lora-fast', label: 'Flux Fast', desc: '$2 flat, fastest' },
            { id: 'flux-portrait', label: 'Flux Portrait', desc: '$2.40/1K steps' },
            { id: 'flux-kontext', label: 'Flux Kontext', desc: '$2.50/1K steps' },
            { id: 'wan-22-image', label: 'Wan 2.2 Image', desc: '$4.50/1K steps' },
          ]} value={config.model || 'flux-lora-fast'} onChange={v => u('model', v)} columns={2} />
        </Panel>
        <Panel title="Steps">
          <input type="number" min="100" max="5000" value={config.steps || 1000} onChange={e => u('steps', e.target.value)} className={INPUT} />
          <p className="text-xs text-slate-400 mt-1">Higher = better quality, more cost. 500-1500 recommended.</p>
        </Panel>
        <Panel title="About">
          <p className="text-sm text-slate-500">LoRA training requires uploading images through the Brand Assets panel. This node triggers training and outputs the trained model URL.</p>
        </Panel>
      </div>
    );
  }

  return <GenericForm config={config} u={u} schema={schema} {...mp} />;
}


// ── InputForm ────────────────────────────────────────────────────────────────

function InputForm({ config, u, nodeType, upstreamOutputs, flowVariables }) {
  const nodeId = nodeType?.id;
  const mp = { upstreamOutputs, flowVariables };

  // Style Preset node — pick from StyleGrid, stores both key and promptText
  if (nodeId === 'style-preset') {
    return <StylePresetForm config={config} u={u} />;
  }

  // Video Style Preset node — fetch from /api/styles/video
  if (nodeId === 'video-style-preset') {
    return <VideoStylePresetForm config={config} u={u} />;
  }

  // Prompt Template node — textarea for a reusable prompt template
  if (nodeId === 'prompt-template') {
    return (
      <div className="space-y-5">
        <Panel title="Prompt Template" description="Write a reusable prompt template that outputs to downstream nodes">
          <MappableTextarea value={config.template || ''} onChange={val => u('template', val)}
            placeholder="A cinematic wide shot of a character standing on a cliff overlooking a futuristic city..." rows={6} className={TEXTAREA} {...mp} />
        </Panel>
        <Panel title="Display Label">
          <MappableInput value={config.label || ''} onChange={val => u('label', val)}
            placeholder="e.g. Hero Shot, Product Close-up..." className={INPUT} {...mp} />
          <p className="text-xs text-slate-400 mt-1">Shown as the node label on the canvas</p>
        </Panel>
      </div>
    );
  }

  // Default: manual-input
  const inputType = config.inputType || 'string';
  return (
    <div className="space-y-5">
      <Panel title="Input Type">
        <PillGroup options={[
          { id: 'string', label: 'Text', desc: 'Plain text or prompt' },
          { id: 'image', label: 'Image', desc: 'Image URL' },
          { id: 'video', label: 'Video', desc: 'Video URL' },
        ]} value={inputType} onChange={v => u('inputType', v)} columns={3} />
      </Panel>
      <Panel title="Default Value">
        {inputType === 'string' ? (
          <MappableTextarea value={config.defaultValue || ''} onChange={val => u('defaultValue', val)}
            placeholder="Enter default text..." rows={5} className={TEXTAREA} {...mp} />
        ) : (
          <MappableInput value={config.defaultValue || ''} onChange={val => u('defaultValue', val)}
            placeholder={`Paste ${inputType} URL...`} className={INPUT} {...mp} />
        )}
      </Panel>
      <Panel title="Display Label">
        <MappableInput value={config.label || ''} onChange={val => u('label', val)}
          placeholder="e.g. Topic, Reference Image..." className={INPUT} {...mp} />
        <p className="text-xs text-slate-400 mt-1">Shown as the node label on the canvas</p>
      </Panel>
    </div>
  );
}


// ── StylePresetForm ─────────────────────────────────────────────────────────

function StylePresetForm({ config, u }) {
  // When user selects styles, resolve their promptText and store both key + text
  const handleStyleChange = (keys) => {
    u('style_key', keys);
    u('style_text', resolveStylePresetText(keys));
  };

  return (
    <div className="space-y-5">
      <Panel title="Visual Style" description="Select one or more styles. The resolved prompt text is sent to downstream nodes.">
        <StyleGrid
          value={config.style_key || []}
          onChange={handleStyleChange}
          maxHeight="24rem"
          columns="grid-cols-5"
          multiple
        />
      </Panel>
      {config.style_text && (
        <Panel title="Resolved Prompt Text">
          <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{config.style_text}</p>
        </Panel>
      )}
    </div>
  );
}


// ── VideoStylePresetForm ────────────────────────────────────────────────────

function VideoStylePresetForm({ config, u }) {
  const [videoStyles, setVideoStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/styles/video')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVideoStyles(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedKey = config.style_key || '';
  const categories = useMemo(() => {
    const cats = {};
    videoStyles.forEach(s => {
      const cat = s.category || 'Other';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(s);
    });
    return cats;
  }, [videoStyles]);

  const handleSelect = (style) => {
    u('style_key', style.key);
    u('style_text', style.prompt || style.description || '');
  };

  if (loading) {
    return <Panel title="Video Style Preset"><p className="text-sm text-slate-400">Loading video styles...</p></Panel>;
  }

  return (
    <div className="space-y-5">
      <Panel title="Video Style Preset" description="Select a motion/cinematography style. The prompt is sent to downstream nodes.">
        <div className="max-h-[28rem] overflow-y-auto space-y-4">
          {Object.entries(categories).map(([cat, styles]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{cat}</p>
              <div className="grid grid-cols-3 gap-2">
                {styles.map(s => {
                  const sel = selectedKey === s.key;
                  return (
                    <button key={s.key} onClick={() => handleSelect(s)}
                      className={`text-left px-3 py-2.5 rounded-lg border transition-all ${sel
                        ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
                        : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                      <span className={`text-sm font-medium block truncate ${sel ? 'text-[#2C666E]' : 'text-slate-800'}`}>{s.label || s.key}</span>
                      {s.description && <span className="text-[11px] text-slate-400 block mt-0.5 line-clamp-2">{s.description}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {config.style_text && (
        <Panel title="Resolved Prompt Text">
          <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed">{config.style_text}</p>
        </Panel>
      )}
    </div>
  );
}


// ── Generic fallback ─────────────────────────────────────────────────────────

function GenericForm({ config, u, schema, upstreamOutputs, flowVariables }) {
  const mp = { upstreamOutputs, flowVariables };
  const TEXTAREA_KEYS = ['prompt', 'description', 'text', 'script', 'topic', 'instructions', 'style'];
  if (!schema || Object.keys(schema).length === 0) {
    return (
      <Panel title="Configuration">
        <p className="text-sm text-slate-500">No configuration options — connect inputs via the canvas.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(schema).map(([key, fs]) => {
        const value = config[key] ?? fs.default ?? '';
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (fs.type === 'select' && fs.options) {
          return (
            <Panel key={key} title={label}>
              <select value={value} onChange={e => u(key, e.target.value)} className={SELECT}>
                {fs.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {fs.description && <p className="text-xs text-slate-400 mt-1">{fs.description}</p>}
            </Panel>
          );
        }

        if (TEXTAREA_KEYS.some(k => key.toLowerCase().includes(k))) {
          return (
            <Panel key={key} title={label}>
              <MappableTextarea value={value} onChange={val => u(key, val)}
                placeholder={`Enter ${label.toLowerCase()}...`} rows={3} className={TEXTAREA} {...mp} />
              {fs.description && <p className="text-xs text-slate-400 mt-1">{fs.description}</p>}
            </Panel>
          );
        }

        return (
          <Panel key={key} title={label}>
            <MappableInput value={value} onChange={val => u(key, val)}
              placeholder={`Enter ${label.toLowerCase()}...`} className={INPUT} {...mp} />
            {fs.description && <p className="text-xs text-slate-400 mt-1">{fs.description}</p>}
          </Panel>
        );
      })}
    </div>
  );
}


// ── Main Modal ───────────────────────────────────────────────────────────────

export default function NodeConfigModal({
  open, onOpenChange, node, config: initialConfig, onConfigChange,
  brandKits, connections, edges, nodes, flowVariables = {},
}) {
  const [config, setConfig] = useState(initialConfig || {});
  const nodeType = node?.data?.nodeType;

  useEffect(() => { setConfig(initialConfig || {}); }, [initialConfig, node?.id]);

  const u = (keyOrUpdates, value) => {
    const updates = typeof keyOrUpdates === 'object' ? keyOrUpdates : { [keyOrUpdates]: value };
    const next = { ...config, ...updates };
    setConfig(next);
    onConfigChange(next);
  };

  const wired = useMemo(() => {
    const set = new Set();
    if (edges && node) edges.forEach(e => { if (e.target === node.id && e.targetHandle) set.add(e.targetHandle); });
    return set;
  }, [edges, node]);

  // Compute upstream node outputs for the slash-command data mapper
  const upstreamOutputs = useMemo(() => {
    if (!node || !nodes || !edges) return [];
    return buildOutputMap(getUpstreamNodes(node.id, edges, nodes));
  }, [node, nodes, edges]);

  if (!node || !nodeType) return null;

  const IconComp = CATEGORY_ICONS[nodeType.category] || Settings;
  const mp = { upstreamOutputs, flowVariables }; // mapping props shorthand

  const renderForm = () => {
    const props = { config, u, nodeType, wired, connections, ...mp };
    switch (nodeType.category) {
      case 'image': return <ImageForm {...props} />;
      case 'video': return <VideoForm {...props} />;
      case 'audio': return <AudioForm {...props} />;
      case 'content': return <ContentForm {...props} />;
      case 'publish': return <PublishForm {...props} />;
      case 'utility': return <UtilityForm {...props} />;
      case 'input': return <InputForm config={config} u={u} nodeType={nodeType} {...mp} />;
      default: return <GenericForm config={config} u={u} schema={nodeType.configSchema} {...mp} />;
    }
  };

  return (
    <SlideOverPanel
      open={open}
      onOpenChange={onOpenChange}
      title={nodeType.label}
      subtitle={`Configure ${nodeType.category} node settings`}
      icon={<IconComp className="w-5 h-5" />}
      side="left"
      width="95vw"
    >
      <SlideOverBody className="p-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          {renderForm()}

          {/* Error Handling — always shown */}
          <div className="mt-5">
            <Panel title="Error Handling">
              <PillGroup options={[
                { id: 'stop', label: 'Stop flow on error' },
                { id: 'skip', label: 'Skip and continue' },
                { id: 'retry', label: 'Retry (3 attempts)' },
              ]} value={config.errorHandling || 'stop'} onChange={v => u('errorHandling', v)} columns={3} />
            </Panel>
          </div>
        </div>
      </SlideOverBody>

      <SlideOverFooter>
        <div className="flex justify-end">
          <button onClick={() => onOpenChange(false)}
            className="px-6 py-2.5 bg-[#2C666E] hover:bg-[#07393C] text-white text-sm font-semibold rounded-lg transition-colors">
            Save Configuration
          </button>
        </div>
      </SlideOverFooter>
    </SlideOverPanel>
  );
}
