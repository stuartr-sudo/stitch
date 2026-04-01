/**
 * StoryboardSettings — all storyboard configuration in expandable sections.
 *
 * Each section expands inline to show edit fields. Changes auto-save
 * via PUT /api/storyboard/projects/:id (debounced 800ms).
 *
 * Sections:
 *   1. Story — name, description, narrative style, audience, dialogue
 *   2. Visual — style preset, lighting, color grade, motion style
 *   3. Models — video model, image model, resolution
 *   4. Characters — adaptive to model (Kling elements / Veo refs / start image only)
 *   5. Scene Direction — location description, environment/action/camera pills
 *   6. Audio — TTS model, voice, speed, lipsync, music, captions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Film, Palette, Cpu, Users, MapPin,
  Volume2, Save, Loader2, Check, Sparkles, Upload, ImageIcon,
  FolderOpen, X, Music, Type, MessageSquare, Anchor, Package,
  AlertTriangle, CheckCircle2, Plus, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import StyleGrid from '@/components/ui/StyleGrid';
import { SCENE_MODELS } from '@/components/storyboard/SceneModelSelector';
import { IMAGE_MODELS } from '@/lib/modelPresets';
import CharactersKling from '@/components/storyboard/CharactersKling';
import CharactersVeo from '@/components/storyboard/CharactersVeo';

// ── Constants ──

const NARRATIVE_STYLES = [
  { key: 'educational', label: 'Educational' },
  { key: 'entertaining', label: 'Story' },
  { key: 'dramatic', label: 'Dramatic' },
  { key: 'documentary', label: 'Documentary' },
  { key: 'advertisement', label: 'Ad / Promo' },
  { key: 'tutorial', label: 'Tutorial' },
  { key: 'safety', label: 'Safety / PSA' },
];

const TARGET_AUDIENCES = ['Children (3-8)', 'Kids (8-12)', 'Teens (13-17)', 'Young Adults', 'Adults', 'Professionals', 'General'];

const STYLE_OPTIONS = ['Minimalist', 'Illustrative', 'Photographic', 'Painterly', 'Graphic', 'Vintage', 'Futuristic', 'Organic'];
const LIGHTING_OPTIONS = ['Golden Hour', 'Blue Hour', 'Soft Diffused', 'Dramatic Side', 'Backlit', 'Neon', 'Candlelight', 'Overcast', 'Studio'];
const COLOR_GRADE_OPTIONS = ['Warm', 'Cool', 'Neutral', 'Desaturated', 'Vibrant', 'Teal & Orange', 'Pastel', 'Monochrome'];

const SCENE_PILLS = {
  environment: ['Urban', 'Nature', 'Indoor', 'Studio', 'Underwater', 'Space', 'Desert', 'Forest', 'Beach', 'Mountain', 'Cityscape', 'Rural'],
  action: ['Walking', 'Running', 'Biking', 'Dancing', 'Sitting', 'Standing', 'Flying', 'Swimming', 'Talking', 'Working', 'Playing'],
  expression: ['Happy', 'Sad', 'Angry', 'Surprised', 'Thoughtful', 'Determined', 'Peaceful', 'Excited', 'Fearful', 'Confident'],
  lighting: ['Golden Hour', 'Blue Hour', 'Midday Sun', 'Overcast', 'Neon', 'Candlelight', 'Moonlight', 'Studio Light', 'Backlit'],
  camera: ['Slow Pan', 'Tracking Shot', 'Static', 'Dolly In', 'Dolly Out', 'Orbit', 'Crane Up', 'Crane Down', 'Handheld', 'Aerial'],
};

const TTS_MODELS = [
  { id: 'elevenlabs-v3', label: 'ElevenLabs v3', cost: '$0.05/1K chars' },
  { id: 'elevenlabs-multilingual', label: 'Multilingual v2', cost: '$0.05/1K chars' },
  { id: 'kokoro', label: 'Kokoro', cost: '$0.02/1K chars' },
  { id: 'minimax', label: 'MiniMax HD', cost: '$0.10/1K chars' },
];

const VOICES = [
  { id: 'Rachel', label: 'Rachel — calm, narration' },
  { id: 'Aria', label: 'Aria — expressive, warm' },
  { id: 'Sarah', label: 'Sarah — soft, gentle' },
  { id: 'Charlotte', label: 'Charlotte — warm, authoritative' },
  { id: 'Roger', label: 'Roger — confident, deep' },
  { id: 'Charlie', label: 'Charlie — casual, Australian' },
  { id: 'George', label: 'George — British, warm' },
  { id: 'Liam', label: 'Liam — articulate, American' },
  { id: 'Daniel', label: 'Daniel — British, authoritative' },
  { id: 'Bill', label: 'Bill — documentary' },
];

const LIPSYNC_MODELS = [
  { id: 'none', label: 'No Lipsync' },
  { id: 'kling-lipsync', label: 'Kling LipSync — cartoon/animated' },
  { id: 'sync-lipsync-2', label: 'Sync 2.0 — realistic faces' },
  { id: 'latentsync', label: 'LatentSync — budget' },
];

const CAPTION_STYLES = [
  { id: 'none', label: 'No Captions' },
  { id: 'word_pop', label: 'Word Pop' },
  { id: 'karaoke_glow', label: 'Karaoke Glow' },
  { id: 'word_highlight', label: 'Subtle Highlight' },
  { id: 'news_ticker', label: 'News Ticker' },
];

const MODE_LABELS = {
  'reference-to-video': 'R2V',
  'image-to-video': 'I2V',
  'first-last-frame': 'FLF',
  'video-to-video': 'V2V',
};

// ── Pill Selector ──

function Pills({ options, value, onChange, multi = false }) {
  const selected = multi ? (value || []) : [value];
  const toggle = (opt) => {
    if (multi) {
      const arr = value || [];
      onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt]);
    } else {
      onChange(value === opt ? '' : opt);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const label = typeof opt === 'object' ? opt.label || opt.key : opt;
        const val = typeof opt === 'object' ? opt.key || opt.id : opt;
        const active = selected.includes(val);
        return (
          <button key={val} type="button" onClick={() => toggle(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Section Wrapper ──

function Section({ id, label, icon: Icon, expanded, onToggle, locked, children, summary }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={locked}
      >
        {expanded === id ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        <Icon size={16} className="text-[#2C666E]" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          {summary && !expanded && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{summary}</p>}
        </div>
        {locked && <span className="text-[10px] text-gray-400">Locked during production</span>}
      </button>
      {expanded === id && !locked && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function StoryboardSettings({ storyboard, onUpdate, isProducing = false }) {
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [videoStyles, setVideoStyles] = useState([]);
  const [diffCheck, setDiffCheck] = useState(null); // { passed, warnings, suggestions }
  const [checkingDiff, setCheckingDiff] = useState(false);
  const saveTimerRef = useRef(null);
  const anchorFileRef = useRef(null);

  // Local copy of storyboard fields for editing
  const [local, setLocal] = useState({});

  // Sync local state when storyboard prop changes
  useEffect(() => {
    if (storyboard) setLocal({ ...storyboard });
  }, [storyboard?.id, storyboard?.updated_at]);

  // Load video styles on first expand
  useEffect(() => {
    if (expanded === 'visual' && videoStyles.length === 0) {
      apiFetch('/api/styles/video').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setVideoStyles(data);
      }).catch(() => {});
    }
  }, [expanded]);

  // Auto-save on change (debounced)
  const save = useCallback((updates) => {
    setLocal(prev => ({ ...prev, ...updates }));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/storyboard/projects/${storyboard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (data.success && onUpdate) onUpdate(data.storyboard);
      } catch (err) {
        console.warn('[Settings] Save failed:', err.message);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [storyboard?.id, onUpdate]);

  const toggle = (id) => setExpanded(expanded === id ? null : id);
  const s = local; // shorthand
  const isKling = s.global_model?.startsWith('kling-r2v');
  const isVeoR2V = (s.global_model === 'veo3' || s.global_model === 'grok-r2v');
  const needsCharacters = isKling || isVeoR2V;
  const selectedModel = SCENE_MODELS.find(m => m.id === s.global_model);

  return (
    <div className="max-w-2xl space-y-3">
      {/* Save indicator */}
      {saving && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 size={12} className="animate-spin" /> Saving...
        </div>
      )}

      {/* ── Story ── */}
      <Section id="story" label="Story" icon={Film} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={`${s.narrative_style || 'entertaining'} · ${s.target_audience || 'General'} · ${s.desired_length || 60}s`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Name</label>
            <Input value={s.name || ''} onChange={e => save({ name: e.target.value })} className="text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Story Overview</label>
            <textarea value={s.description || ''} onChange={e => save({ description: e.target.value })} rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 resize-y" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Narrative Style</label>
            <Pills options={NARRATIVE_STYLES} value={s.narrative_style} onChange={v => save({ narrative_style: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Target Audience</label>
            <Pills options={TARGET_AUDIENCES} value={s.target_audience} onChange={v => save({ target_audience: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Client Brief</label>
            <textarea value={s.client_brief || ''} onChange={e => save({ client_brief: e.target.value })} rows={2} placeholder="Paste client instructions..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 resize-y" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Length</label>
              <Pills options={['15', '30', '45', '60', '90'].map(v => ({ key: parseInt(v), label: `${v}s` }))}
                value={s.desired_length} onChange={v => save({ desired_length: v })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Frame Interval</label>
              <Pills options={['2', '4', '6', '8'].map(v => ({ key: parseInt(v), label: `${v}s` }))}
                value={s.frame_interval} onChange={v => save({ frame_interval: v })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Aspect Ratio</label>
              <Pills options={['16:9', '9:16', '1:1']} value={s.aspect_ratio} onChange={v => save({ aspect_ratio: v })} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Visual ── */}
      <Section id="visual" label="Visual Style" icon={Palette} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={`${s.visual_style || 'cinematic'}${s.builder_lighting ? ` · ${s.builder_lighting}` : ''}${s.motion_style ? ` · ${s.motion_style}` : ''}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Style Preset</label>
            <StyleGrid value={s.visual_style || ''} onChange={v => save({ visual_style: v })} maxHeight="320px" columns="grid-cols-4" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Style Direction</label>
            <Pills options={STYLE_OPTIONS} value={s.builder_style} onChange={v => save({ builder_style: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Lighting</label>
            <Pills options={LIGHTING_OPTIONS} value={s.builder_lighting} onChange={v => save({ builder_lighting: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Color Grade</label>
            <Pills options={COLOR_GRADE_OPTIONS} value={s.builder_color_grade} onChange={v => save({ builder_color_grade: v })} />
          </div>
          {/* Motion / Video Style */}
          {videoStyles.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Motion Style</label>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {videoStyles.map(vs => (
                  <button key={vs.key} onClick={() => save({ motion_style: s.motion_style === vs.key ? null : vs.key, motion_style_prompt: vs.prompt })}
                    className={`rounded-lg border overflow-hidden text-left transition-all ${s.motion_style === vs.key ? 'border-[#2C666E] ring-1 ring-[#2C666E]' : 'border-gray-200 hover:border-gray-300'}`}>
                    {vs.thumb && <img src={vs.thumb} alt={vs.label} className="w-full h-16 object-cover" loading="lazy" />}
                    <div className="p-1.5">
                      <span className="text-[10px] font-medium text-gray-700">{vs.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Anchor Image / Style Lock ── */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Anchor size={11} /> Anchor Image
              </label>
              {!s.anchor_image_url && (
                <button
                  onClick={() => anchorFileRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-[#2C666E] hover:text-[#1e4d54] font-medium"
                >
                  <Upload size={11} /> Upload
                </button>
              )}
            </div>
            <input
              ref={anchorFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => save({ anchor_image_url: reader.result });
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            {s.anchor_image_url ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <img src={s.anchor_image_url} alt="Anchor" className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 mb-1">
                      <Anchor size={9} /> Style Locked
                    </span>
                    <p className="text-[10px] text-amber-600">All preview generations will match this visual style.</p>
                    <button onClick={() => save({ anchor_image_url: null, anchor_image_description: null })}
                      className="mt-1.5 text-[10px] text-red-500 hover:text-red-700">Remove anchor</button>
                  </div>
                </div>
                <textarea
                  value={s.anchor_image_description || ''}
                  onChange={e => save({ anchor_image_description: e.target.value })}
                  rows={2}
                  placeholder="Describe the visual style of this anchor image (lighting, color palette, rendering style)..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 resize-y"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400">Upload a reference image to lock visual style across all scenes. Every preview image will match its look.</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── Models ── */}
      <Section id="models" label="Models" icon={Cpu} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={`Video: ${selectedModel?.label || s.global_model || 'not set'} · Image: ${IMAGE_MODELS.find(m => m.value === s.image_model)?.label || s.image_model || 'not set'}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Video Model</label>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {SCENE_MODELS.map(m => (
                <button key={m.id} onClick={() => save({ global_model: m.id })}
                  className={`rounded-lg border p-3 text-left transition-all ${s.global_model === m.id ? 'border-[#2C666E] ring-1 ring-[#2C666E]/30 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                  <span className="text-xs font-semibold text-gray-900 block">{m.label}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{m.description}</span>
                  <div className="flex gap-1 mt-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">{MODE_LABELS[m.mode]}</span>
                    {m.supportsRefs && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-600">Refs</span>}
                    {m.supportsAudio && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-600">Audio</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Image Model (previews)</label>
            <div className="grid grid-cols-2 gap-2">
              {IMAGE_MODELS.map(m => (
                <button key={m.value} onClick={() => save({ image_model: m.value })}
                  className={`rounded-lg border p-2.5 text-left transition-all ${s.image_model === m.value ? 'border-[#2C666E] ring-1 ring-[#2C666E]/30' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-xs font-semibold text-gray-900">{m.label}</span>
                  <span className="text-[10px] text-gray-400 block">{m.strength} · {m.price}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Resolution</label>
            <Pills options={['720p', '1080p', '4k']} value={s.resolution} onChange={v => save({ resolution: v })} />
          </div>
        </div>
      </Section>

      {/* ── Characters ── */}
      <Section id="characters" label="Characters & Starting Image" icon={Users} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={`${(s.elements || []).filter(e => e.description || e.refs?.length).length} elements · ${(s.veo_reference_images || []).length} refs${s.start_frame_url ? ' · Has start frame' : ''}`}>
        <div className="space-y-4">
          {/* Starting image */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Starting Image</label>
            {s.start_frame_url ? (
              <div className="space-y-2">
                <img src={s.start_frame_url} alt="Start frame" className="w-full max-w-sm rounded-lg border border-gray-200" />
                <button onClick={() => save({ start_frame_url: null, start_frame_description: null })}
                  className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No starting image set. Upload one via the create flow or use Imagineer.</p>
            )}
          </div>

          {/* Model-specific character UI */}
          {isKling && (
            <CharactersKling
              elements={s.elements || []}
              onChange={(elements) => save({ elements })}
              onOpenImagineer={() => toast.info('Open Imagineer from the main toolbar')}
              onOpenLibrary={() => toast.info('Open Library from the main toolbar')}
            />
          )}

          {isVeoR2V && (
            <CharactersVeo
              referenceImages={s.veo_reference_images || []}
              onChange={(imgs) => save({ veo_reference_images: typeof imgs === 'function' ? imgs(s.veo_reference_images || []) : imgs })}
              onOpenLibrary={() => toast.info('Open Library from the main toolbar')}
              onOpenImagineer={() => toast.info('Open Imagineer from the main toolbar')}
            />
          )}

          {!needsCharacters && (
            <p className="text-xs text-gray-400">
              {selectedModel?.label || 'Selected model'} uses Image-to-Video — no character references needed. The starting image defines the visual.
            </p>
          )}

          {/* ── Character Differentiation Check ── */}
          {(s.elements?.length >= 2 || s.veo_reference_images?.length >= 2) && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Visual Differentiation</label>
                <button
                  onClick={async () => {
                    setCheckingDiff(true);
                    try {
                      const res = await apiFetch(`/api/storyboard/projects/${storyboard.id}/check-characters`, { method: 'POST' });
                      const data = await res.json();
                      if (data.success) setDiffCheck(data.result);
                      else toast.error('Check failed: ' + data.error);
                    } catch (err) {
                      toast.error('Check failed: ' + err.message);
                    } finally {
                      setCheckingDiff(false);
                    }
                  }}
                  disabled={checkingDiff}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                >
                  {checkingDiff ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  Check Differentiation
                </button>
              </div>
              {diffCheck && (
                <div className={`p-2.5 rounded-lg border text-xs ${diffCheck.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-1.5 font-medium mb-1.5">
                    {diffCheck.passed
                      ? <><CheckCircle2 size={12} className="text-emerald-600" /><span className="text-emerald-700">Characters are visually distinct</span></>
                      : <><AlertTriangle size={12} className="text-amber-600" /><span className="text-amber-700">Differentiation issues found</span></>
                    }
                  </div>
                  {diffCheck.warnings?.map((w, i) => (
                    <p key={i} className="text-amber-700 mb-0.5">⚠ {w}</p>
                  ))}
                  {diffCheck.suggestions?.map((sg, i) => (
                    <p key={i} className="text-gray-600 mb-0.5">💡 {sg}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── Ingredient Palette ── */}
      <Section id="ingredients" label="Ingredient Palette" icon={Package} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={`${(s.ingredients?.characters || []).length} chars · ${(s.ingredients?.props || []).length} props · ${(s.ingredients?.environments || []).length} envs`}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Define named characters, props, and environments. When their names appear in scene descriptions, their details are automatically injected into generation prompts.</p>
          {['characters', 'props', 'environments'].map(category => {
            const items = s.ingredients?.[category] || [];
            const label = category.charAt(0).toUpperCase() + category.slice(1);
            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
                  <button
                    onClick={() => {
                      const updated = { ...(s.ingredients || {}), [category]: [...items, { name: '', description: '' }] };
                      save({ ingredients: updated });
                    }}
                    className="flex items-center gap-1 text-xs text-[#2C666E] hover:text-[#1e4d54] font-medium"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={e => {
                            const updated = { ...(s.ingredients || {}) };
                            updated[category] = [...items];
                            updated[category][idx] = { ...item, name: e.target.value };
                            save({ ingredients: updated });
                          }}
                          placeholder="Name (e.g. Maya, Red Bicycle)"
                          className="w-full text-xs rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30"
                        />
                        <textarea
                          value={item.description || ''}
                          onChange={e => {
                            const updated = { ...(s.ingredients || {}) };
                            updated[category] = [...items];
                            updated[category][idx] = { ...item, description: e.target.value };
                            save({ ingredients: updated });
                          }}
                          rows={2}
                          placeholder="Visual description — color, features, style..."
                          className="w-full text-xs rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...(s.ingredients || {}), [category]: items.filter((_, i) => i !== idx) };
                          save({ ingredients: updated });
                        }}
                        className="p-1 text-gray-300 hover:text-red-400 mt-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-gray-300 italic">No {category} added yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Scene Direction ── */}
      <Section id="direction" label="Scene Direction" icon={MapPin} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={s.location_description ? s.location_description.substring(0, 60) + '...' : 'No location set'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Location / Setting</label>
            <textarea value={s.location_description || ''} onChange={e => save({ location_description: e.target.value })} rows={3}
              placeholder="Describe the location in detail — where, when, what's around..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 resize-y" />
          </div>
          {Object.entries(SCENE_PILLS).map(([category, options]) => (
            <div key={category}>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">{category}</label>
              <Pills options={options} multi
                value={(s.scene_direction || {})[category] || []}
                onChange={v => save({ scene_direction: { ...(s.scene_direction || {}), [category]: v } })} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Audio ── */}
      <Section id="audio" label="Audio & Captions" icon={Volume2} expanded={expanded} onToggle={toggle} locked={isProducing}
        summary={`${s.voice || 'Rachel'} · ${s.tts_model || 'elevenlabs-v3'} · Lipsync: ${s.lipsync_model || 'none'} · Captions: ${s.caption_style || 'none'}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">TTS Model</label>
              <select value={s.tts_model || 'elevenlabs-v3'} onChange={e => save({ tts_model: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30">
                {TTS_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} ({m.cost})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Voice</label>
              <select value={s.voice || 'Rachel'} onChange={e => save({ voice: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30">
                {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Speech Speed: {s.tts_speed || 1.0}×</label>
            <input type="range" min={0.7} max={1.2} step={0.05} value={s.tts_speed || 1.0}
              onChange={e => save({ tts_speed: parseFloat(e.target.value) })}
              className="w-full accent-[#2C666E]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Lipsync Model</label>
            <div className="space-y-1">
              {LIPSYNC_MODELS.map(m => (
                <button key={m.id} onClick={() => save({ lipsync_model: m.id })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${s.lipsync_model === m.id ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-xs font-medium text-gray-800">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Content Type (for lipsync)</label>
            <Pills options={['cartoon', 'realistic', '3d', 'anime']} value={s.content_type} onChange={v => save({ content_type: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Music Mood</label>
            <input type="text" value={s.music_mood || ''} onChange={e => save({ music_mood: e.target.value })}
              placeholder="e.g., Cheerful playful children's music with gentle xylophone"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Music Volume: {Math.round((s.music_volume || 0.15) * 100)}%</label>
            <input type="range" min={0} max={0.5} step={0.05} value={s.music_volume || 0.15}
              onChange={e => save({ music_volume: parseFloat(e.target.value) })}
              className="w-full accent-[#2C666E]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Caption Style</label>
            <Pills options={CAPTION_STYLES} value={s.caption_style} onChange={v => save({ caption_style: v })} />
          </div>
        </div>
      </Section>
    </div>
  );
}
