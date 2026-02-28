import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Video,
  Image,
  Layers,
  Lock,
  GripVertical,
  Cpu,
  Tag,
  Globe,
  Palette,
  CheckCircle2,
  Users,
  Check,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import LoRAPicker from '@/components/LoRAPicker';

const SCENE_ROLES = ['hook', 'problem', 'solution', 'proof', 'point', 'step', 'comparison', 'cta'];
const OVERLAY_STYLES = ['bold_white', 'minimal_dark', 'gradient_overlay'];
const POSITIONS = ['top_safe', 'center', 'bottom_safe'];

const ROLE_COLORS = {
  hook: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  problem: 'bg-red-50 text-red-700 border-red-300',
  solution: 'bg-green-50 text-green-700 border-green-300',
  proof: 'bg-blue-50 text-blue-700 border-blue-300',
  point: 'bg-purple-50 text-purple-700 border-purple-300',
  step: 'bg-orange-50 text-orange-700 border-orange-300',
  comparison: 'bg-teal-50 text-teal-700 border-teal-300',
  cta: 'bg-pink-50 text-pink-700 border-pink-300',
};

const WRITING_STRUCTURES = [
  // Brand structures (non-affiliate, brand-voice)
  { value: 'BRAND-TUTORIAL', label: 'Brand Tutorial', group: 'brand' },
  { value: 'BRAND-LISTICLE', label: 'Brand Listicle', group: 'brand' },
  { value: 'BRAND-COMPARISON', label: 'Brand Comparison', group: 'brand' },
  { value: 'BRAND-CASESTUDY', label: 'Brand Case Study', group: 'brand' },
  { value: 'BRAND-PILLAR', label: 'Brand Pillar', group: 'brand' },
  { value: 'BRAND-SUBHUB', label: 'Brand Sub-Hub', group: 'brand' },
  // Affiliate structures (with promoted products)
  { value: 'AFF-MULTI-COMPARE', label: 'Affiliate Multi-Compare', group: 'aff' },
  { value: 'AFF-LISTICLE', label: 'Affiliate Listicle', group: 'aff' },
  { value: 'AFF-PILLAR', label: 'Affiliate Pillar', group: 'aff' },
  { value: 'AFF-SUBHUB', label: 'Affiliate Sub-Hub', group: 'aff' },
  { value: 'PRODUCT-PAGE', label: 'Product Page', group: 'aff' },
  // Money structures (high commercial intent)
  { value: 'MONEY-ROUNDUP', label: 'Money Roundup', group: 'money' },
  { value: 'MONEY-SINGLE-REVIEW', label: 'Money Single Review', group: 'money' },
  { value: 'MONEY-VS', label: 'Money VS', group: 'money' },
  { value: 'MONEY-BEST-OF', label: 'Money Best-Of', group: 'money' },
];

const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok', ratio: '9:16' },
  { value: 'instagram_reels', label: 'IG Reels', ratio: '9:16' },
  { value: 'instagram_story', label: 'IG Story', ratio: '9:16' },
  { value: 'instagram_feed', label: 'IG Feed', ratio: '1:1' },
  { value: 'youtube_shorts', label: 'YT Shorts', ratio: '9:16' },
  { value: 'youtube_video', label: 'YouTube', ratio: '16:9' },
  { value: 'facebook_reels', label: 'FB Reels', ratio: '9:16' },
  { value: 'facebook_feed', label: 'FB Feed', ratio: '1:1' },
  { value: 'pinterest', label: 'Pinterest', ratio: '2:3' },
  { value: 'linkedin_feed', label: 'LinkedIn', ratio: '1:1' },
];

const IMAGE_MODELS = [
  { value: 'wavespeed',      label: 'Wavespeed',      strength: 'Fastest',                price: '~$0.01/img',  lora: false },
  { value: 'fal_seedream',   label: 'SeedDream',      strength: 'Photorealistic',         price: '~$0.02/img',  lora: false },
  { value: 'fal_flux',       label: 'FLUX 2 Dev',     strength: 'Creative, versatile, LoRA',  price: '$0.035/img',  lora: true },
  { value: 'fal_imagen4',    label: 'Imagen 4',       strength: "Google's best quality",  price: '$0.04/img',   lora: false },
  { value: 'fal_kling_img',  label: 'Kling Image V3', strength: 'Consistent photorealism', price: '$0.028/img', lora: false },
  { value: 'fal_grok',       label: 'Grok Imagine',   strength: 'Highly aesthetic',       price: '$0.02/img',   lora: false },
  { value: 'fal_ideogram',   label: 'Ideogram V2',    strength: 'Best text/typography',   price: '~$0.04/img',  lora: false },
];

const VIDEO_MODELS = [
  { value: 'wavespeed_wan', label: 'Wavespeed WAN',    strength: 'Fastest, budget-friendly', price: '~$0.10/vid' },
  { value: 'fal_kling',     label: 'Kling 2.0 Master', strength: 'Realistic motion',         price: '$0.28/sec' },
  { value: 'fal_hailuo',    label: 'Hailuo (MiniMax)', strength: 'Cinematic',                price: '$0.50/vid' },
  { value: 'fal_veo3',      label: 'Veo 3 (Google)',   strength: 'Best quality + audio',     price: '$0.15/sec' },
  { value: 'fal_veo2',      label: 'Veo 2 (Google)',   strength: 'Excellent realism',        price: '$0.50/sec' },
  { value: 'fal_kling_v3',  label: 'Kling V3 Pro',     strength: 'Latest Kling + audio',     price: '$0.28/sec' },
  { value: 'fal_kling_o3',  label: 'Kling O3 Pro',     strength: 'Start+end frame control',  price: '$0.28/sec' },
  { value: 'fal_wan25',     label: 'Wan 2.5 Preview',  strength: 'Good quality, cheap',      price: '$0.05/sec' },
  { value: 'fal_wan_pro',   label: 'Wan Pro',          strength: 'Premium WAN, 1080p',       price: '$0.80/vid' },
  { value: 'fal_pixverse',  label: 'PixVerse V4.5',    strength: 'Great value',              price: '$0.05/seg' },
];

const MOTION_STYLES = [
  { value: 'standard', label: 'Standard (AI animates image)' },
  { value: 'motion_transfer', label: 'Motion Transfer (Kling — mimics reference video)' },
];

const MUSIC_MODELS = [
  { value: 'beatoven',       label: 'Beatoven AI',      strength: 'Royalty-free instrumental', price: '$0.0013/sec' },
  { value: 'fal_elevenlabs', label: 'ElevenLabs Music', strength: 'High quality, premium',     price: '$0.80/min' },
  { value: 'fal_lyria2',     label: 'Lyria 2 (Google)', strength: "Google's best music model", price: '$0.10/30sec' },
  { value: 'none',           label: 'No Music',         strength: '',                          price: '' },
];

const VISUAL_STYLE_PRESETS = [
  {
    value: null,
    label: 'None',
    description: 'AI decides the style per scene',
    lighting: '—',
    camera: '—',
    color_grade: '—',
    mood: 'Unconstrained',
  },
  {
    value: 'ugc',
    label: 'UGC',
    description: 'Authentic, handheld, real-person feel',
    lighting: 'Natural window or outdoor light',
    camera: 'Handheld, close-up, 35mm f/1.8',
    color_grade: 'Warm natural, no heavy grading',
    mood: 'Authentic, relatable, unpolished',
  },
  {
    value: 'testimonial',
    label: 'Testimonial',
    description: 'Direct-to-camera, trust-building',
    lighting: 'Soft box studio, minimal shadows',
    camera: 'Tripod, medium portrait, centered',
    color_grade: 'Clean, slightly warm, natural skin',
    mood: 'Trustworthy, conversational, direct',
  },
  {
    value: 'cinematic',
    label: 'Cinematic',
    description: 'Dramatic, film-quality look',
    lighting: 'Dramatic directional or golden hour',
    camera: 'Anamorphic, wide cinematic angle',
    color_grade: 'Teal shadows, warm highlights, film grain',
    mood: 'Epic, dramatic, premium',
  },
  {
    value: 'product_demo',
    label: 'Product Demo',
    description: 'Clean product focus, studio quality',
    lighting: 'Bright studio soft box, minimal shadow',
    camera: 'Overhead or 3/4 angle, sharp focus',
    color_grade: 'Clean, accurate, high contrast',
    mood: 'Professional, aspirational',
  },
  {
    value: 'lifestyle',
    label: 'Lifestyle',
    description: 'Aspirational, real-world context',
    lighting: 'Golden hour or warm window light',
    camera: 'Wide to medium, environmental context',
    color_grade: 'Warm golden, slightly overexposed',
    mood: 'Aspirational, joyful, authentic',
  },
  {
    value: 'bold_punchy',
    label: 'Bold & Punchy',
    description: 'High contrast, graphic, eye-catching',
    lighting: 'High contrast, dramatic or colorful',
    camera: 'Dynamic close crops, diagonal angles',
    color_grade: 'Saturated, high contrast, vivid',
    mood: 'Energetic, bold, impossible to ignore',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Clean, restrained, premium',
    lighting: 'Soft diffused, even, shadow-free',
    camera: 'Centered, symmetrical, negative space',
    color_grade: 'Desaturated neutrals, muted accents',
    mood: 'Premium, calm, sophisticated',
  },
  {
    value: 'documentary',
    label: 'Documentary',
    description: 'Raw, authentic, story-driven',
    lighting: 'Available natural light, imperfect',
    camera: 'Observational, candid, varied angles',
    color_grade: 'Desaturated muted, film-like tones',
    mood: 'Authentic, serious, real-world',
  },
];

function emptyScene(index) {
  const defaults = [
    { role: 'hook', duration_seconds: 3, overlay_style: 'bold_white', position: 'center', hint: 'Grab attention in the first 3 seconds' },
    { role: 'point', duration_seconds: 5, overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Key point or benefit' },
    { role: 'cta', duration_seconds: 4, overlay_style: 'bold_white', position: 'center', hint: 'Call to action with brand link' },
  ];
  return defaults[index] || { role: 'point', duration_seconds: 5, overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: '' };
}

function SceneCard({ scene, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(index === 0);
  return (
    <div className={`rounded-lg border ${ROLE_COLORS[scene.role] || 'border-gray-200'} bg-white`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${ROLE_COLORS[scene.role]}`}>{scene.role}</span>
        <span className="text-gray-700 text-sm flex-1 truncate">{scene.hint || 'Scene ' + (index + 1)}</span>
        <span className="text-gray-500 text-xs">{scene.duration_seconds}s</span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onMoveUp(index)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => onMoveDown(index)} disabled={index === total - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(index)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Role</Label>
              <Select value={scene.role} onValueChange={v => onChange(index, 'role', v)}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  {SCENE_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Duration (s)</Label>
              <Input type="number" min={1} max={30} value={scene.duration_seconds}
                onChange={e => onChange(index, 'duration_seconds', parseInt(e.target.value) || 5)}
                className="bg-white border-gray-300 text-gray-900 h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Text Position</Label>
              <Select value={scene.position} onValueChange={v => onChange(index, 'position', v)}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  {POSITIONS.map(p => <SelectItem key={p} value={p} className="text-xs">{p.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Overlay Style</Label>
            <Select value={scene.overlay_style} onValueChange={v => onChange(index, 'overlay_style', v)}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-900">
                {OVERLAY_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Scene Hint <span className="text-gray-400">(guides the AI)</span></Label>
            <Textarea value={scene.hint} onChange={e => onChange(index, 'hint', e.target.value)}
              placeholder="Describe what this scene should show or say..."
              className="bg-white border-gray-300 text-gray-900 text-sm h-16 resize-none" />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-[#2C666E]" />
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scenes, setScenes] = useState([emptyScene(0), emptyScene(1), emptyScene(2)]);
  const [musicMood, setMusicMood] = useState('');
  const [voicePacing, setVoicePacing] = useState('');
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('');
  const [analyzeDescription, setAnalyzeDescription] = useState('');
  const [analyzeDuration, setAnalyzeDuration] = useState(30);
  const [outputType, setOutputType] = useState('both');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['tiktok', 'instagram_reels', 'youtube_shorts']);
  const [selectedStructures, setSelectedStructures] = useState([]);
  const [modelPreferences, setModelPreferences] = useState({
    image_model: 'wavespeed',
    video_model: 'wavespeed_wan',
    motion_style: 'standard',
    music_model: 'beatoven',
  });
  const [visualStylePreset, setVisualStylePreset] = useState(null);
  const [brandUsernames, setBrandUsernames] = useState([]);
  const [templateLoraConfig, setTemplateLoraConfig] = useState([]);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableUsernames, setAvailableUsernames] = useState([]);
  const [selectedUsernames, setSelectedUsernames] = useState([]);
  const [isLoadingUsernames, setIsLoadingUsernames] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => { loadTemplates(); fetchAvailableUsernames(); }, []);

  const fetchAvailableUsernames = async () => {
    try {
      const res = await apiFetch('/api/brand/usernames', { method: 'GET' });
      const data = await res.json();
      if (data.success) setAvailableUsernames(data.usernames || []);
    } catch {
      // Silently fail — list stays empty
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/templates/list', { method: 'GET' });
      if (!res.ok) { setTemplates([]); return; }
      const data = await res.json();
      if (data.success) setTemplates(data.templates || []);
    } catch {
      // Silently default to empty list — API may not be running yet
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntoEditor = (template) => {
    setSelectedId(template.is_builtin ? null : template.id);
    setName(template.is_builtin ? `${template.name} (copy)` : template.name);
    setDescription(template.description || '');
    setScenes(template.scenes.map(s => ({ ...s })));
    setMusicMood(template.music_mood || '');
    setVoicePacing(template.voice_pacing || '');
    setReferenceVideoUrl('');
    setOutputType(template.output_type || 'both');
    setSelectedPlatforms(template.platforms || ['tiktok', 'instagram_reels', 'youtube_shorts']);
    setSelectedStructures(template.applicable_writing_structures || []);
    setModelPreferences({
      image_model: template.model_preferences?.image_model || 'wavespeed',
      video_model: template.model_preferences?.video_model || 'wavespeed_wan',
      motion_style: template.model_preferences?.motion_style || 'standard',
      music_model: template.model_preferences?.music_model || 'beatoven',
    });
    setVisualStylePreset(template.visual_style_preset || null);
    setBrandUsernames(
      template.brand_usernames?.length ? template.brand_usernames
        : template.brand_username ? [template.brand_username]
        : []
    );
    setTemplateLoraConfig(
      (template.lora_config || []).map(l => ({
        id: l.lora_id, type: l.source || 'custom', url: l.url || '', triggerWord: l.trigger_word || null, scale: l.scale ?? 1.0,
      }))
    );
  };

  const handleNewTemplate = () => {
    setSelectedId(null);
    setName('My Template');
    setDescription('');
    setScenes([emptyScene(0), emptyScene(1), emptyScene(2)]);
    setMusicMood('');
    setVoicePacing('');
    setReferenceVideoUrl('');
    setOutputType('both');
    setSelectedPlatforms(['tiktok', 'instagram_reels', 'youtube_shorts']);
    setSelectedStructures([]);
    setModelPreferences({ image_model: 'wavespeed', video_model: 'wavespeed_wan', motion_style: 'standard', music_model: 'beatoven' });
    setVisualStylePreset(null);
    setBrandUsernames([]);
    setTemplateLoraConfig([]);
  };

  const handleAnalyze = async () => {
    if (!analyzeDescription && !referenceVideoUrl) { toast.error('Enter a description or video URL to analyze'); return; }
    setIsAnalyzing(true);
    try {
      const res = await apiFetch('/api/templates/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: analyzeDescription || undefined, video_url: referenceVideoUrl || undefined, name: name || undefined, duration_seconds: analyzeDuration }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const t = data.template;
      if (t.name && !name) setName(t.name);
      if (t.description) setDescription(t.description);
      setScenes(t.scenes);
      setMusicMood(t.music_mood || '');
      setVoicePacing(t.voice_pacing || '');
      if (t.template_type) setOutputType(t.template_type);
      if (t.suggested_writing_structures?.length) setSelectedStructures(t.suggested_writing_structures);
      setModelPreferences(prev => ({
        ...prev,
        image_model: t.suggested_image_model || prev.image_model,
        video_model: t.suggested_video_model || prev.video_model,
        motion_style: t.suggested_motion_style || prev.motion_style,
      }));
      toast.success('Template structure extracted — review and save');
    } catch (err) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Give your template a name'); return; }
    if (!scenes.length) { toast.error('Add at least one scene'); return; }
    if (!selectedPlatforms.length) { toast.error('Select at least one platform'); return; }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/templates/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId || undefined,
          name: name.trim(),
          description,
          scenes,
          music_mood: musicMood,
          voice_pacing: voicePacing,
          reference_video_url: referenceVideoUrl || null,
          output_type: outputType,
          model_preferences: modelPreferences,
          applicable_writing_structures: selectedStructures,
          platforms: selectedPlatforms,
          visual_style_preset: visualStylePreset || null,
          brand_usernames: brandUsernames,
          lora_config: templateLoraConfig.length ? templateLoraConfig.map(l => ({ lora_id: l.id, scale: l.scale, source: l.type })) : [],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Template saved');
      setSelectedId(data.template.id);
      loadTemplates();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await apiFetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Template deleted');
      if (selectedId === id) handleNewTemplate();
      loadTemplates();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleSaveAndAssign = async () => {
    if (!name.trim()) { toast.error('Give your template a name'); return; }
    if (!scenes.length) { toast.error('Add at least one scene'); return; }
    if (!selectedPlatforms.length) { toast.error('Select at least one platform'); return; }

    // Save first
    setIsSaving(true);
    let savedId = selectedId;
    try {
      const res = await apiFetch('/api/templates/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId || undefined,
          name: name.trim(),
          description,
          scenes,
          music_mood: musicMood,
          voice_pacing: voicePacing,
          reference_video_url: referenceVideoUrl || null,
          output_type: outputType,
          model_preferences: modelPreferences,
          applicable_writing_structures: selectedStructures,
          platforms: selectedPlatforms,
          visual_style_preset: visualStylePreset || null,
          brand_usernames: brandUsernames,
          lora_config: templateLoraConfig.length ? templateLoraConfig.map(l => ({ lora_id: l.id, scale: l.scale, source: l.type })) : [],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      savedId = data.template.id;
      setSelectedId(savedId);
      loadTemplates();
      toast.success('Template saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
      setIsSaving(false);
      return;
    } finally {
      setIsSaving(false);
    }

    // Now open the assign modal and fetch usernames
    setIsLoadingUsernames(true);
    setSelectedUsernames([]);
    setAssignModalOpen(true);
    try {
      const res = await apiFetch('/api/brand/usernames', { method: 'GET' });
      const data = await res.json();
      if (data.success) {
        setAvailableUsernames(data.usernames || []);
      }
    } catch {
      toast.error('Failed to load usernames');
    } finally {
      setIsLoadingUsernames(false);
    }
  };

  const handleAssignConfirm = async () => {
    if (!selectedUsernames.length) { toast.error('Select at least one username'); return; }
    setIsAssigning(true);
    try {
      const res = await apiFetch('/api/templates/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedId, usernames: selectedUsernames }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const count = data.assigned?.length || 0;
      toast.success(`Template assigned to ${count} username${count !== 1 ? 's' : ''}`);
      setAssignModalOpen(false);
      loadTemplates();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleAssignUsername = (username) => {
    setSelectedUsernames(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const handleSceneChange = (index, field, value) => {
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    setScenes(prev => { const next = [...prev]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; });
  };

  const handleMoveDown = (index) => {
    setScenes(prev => {
      if (index === prev.length - 1) return prev;
      const next = [...prev]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next;
    });
  };

  const togglePlatform = (val) => setSelectedPlatforms(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]);
  const toggleStructure = (val) => setSelectedStructures(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  const totalDuration = scenes.reduce((s, sc) => s + (sc.duration_seconds || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/studio')} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" /> Studio
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Template Builder</h1>
          <p className="text-xs text-gray-500">Create reusable video structures — the pipeline picks these up automatically</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Template
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Template list */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <Button onClick={handleNewTemplate} size="sm" className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white">
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : templates.map(t => {
              const TIcon = t.output_type === 'static' ? Image : t.output_type === 'both' ? Layers : Video;
              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    (!t.is_builtin && selectedId === t.id)
                      ? 'bg-[#2C666E]/10 border border-[#2C666E]'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                  onClick={() => loadIntoEditor(t)}
                >
                  {t.is_builtin
                    ? <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    : <TIcon className="w-3.5 h-3.5 text-[#2C666E] flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.scene_count} scenes · {t.total_duration_seconds}s
                      {t.applicable_writing_structures?.length ? ` · ${t.applicable_writing_structures.length} triggers` : ''}
                    </div>
                  </div>
                  {!t.is_builtin && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl flex flex-col">
          <Tabs defaultValue="template" className="w-full flex-1">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 mb-4">
              <TabsTrigger value="template" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Template</TabsTrigger>
              <TabsTrigger value="scenes" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Scenes</TabsTrigger>
              <TabsTrigger value="style" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Style & Models</TabsTrigger>
              <TabsTrigger value="extract" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">AI Extract</TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Template ── */}
            <TabsContent value="template" className="space-y-6">
              {/* Basic info */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-gray-700">Template Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Product Launch 30s"
                    className="bg-white border-gray-300 text-gray-900" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700">Description <span className="text-gray-500 text-xs">(optional)</span></Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what this template is best used for..."
                    className="bg-white border-gray-300 text-gray-900 h-16 resize-none" />
                </div>
                {/* Brand assignment is handled via Save & Assign button */}
              </div>

              {/* Output Type */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionHeader icon={Layers} title="Output Type" subtitle="What does this template generate?" />
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'video', label: 'Video Only', desc: 'Animated clips per scene', Icon: Video },
                    { value: 'static', label: 'Static Only', desc: 'Still images with text baked in', Icon: Image },
                    { value: 'both', label: 'Both', desc: 'Video + static in one run', Icon: Layers },
                  ].map(({ value, label, desc, Icon }) => (
                    <button key={value} onClick={() => setOutputType(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors ${
                        outputType === value
                          ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E] font-semibold'
                          : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                      }`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-xs text-gray-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionHeader icon={Globe} title="Platforms" subtitle="Which platforms does this template generate assets for?" />
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.value} onClick={() => togglePlatform(p.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        selectedPlatforms.includes(p.value)
                          ? 'bg-[#2C666E]/10 border-[#2C666E] text-[#2C666E] font-medium'
                          : 'border-gray-200 text-gray-500 hover:border-gray-400'
                      }`}>
                      {p.label} <span className="text-gray-500">{p.ratio}</span>
                    </button>
                  ))}
                </div>
                {selectedPlatforms.length === 0 && <p className="text-xs text-amber-400 mt-2">Select at least one platform</p>}
              </div>

              {/* Writing Structures */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionHeader icon={Tag}
                  title="Writing Structure Triggers"
                  subtitle="Auto-fires when Doubleclicker publishes an article with any of these structures" />
                {/* Brand */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1 block">Brand</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WRITING_STRUCTURES.filter(ws => ws.group === 'brand').map(ws => (
                      <button key={ws.value} onClick={() => toggleStructure(ws.value)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedStructures.includes(ws.value)
                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}>
                        {ws.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Affiliate */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1 block">Affiliate</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WRITING_STRUCTURES.filter(ws => ws.group === 'aff').map(ws => (
                      <button key={ws.value} onClick={() => toggleStructure(ws.value)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedStructures.includes(ws.value)
                            ? 'bg-purple-50 border-purple-400 text-purple-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}>
                        {ws.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Money */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1 block">Money</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WRITING_STRUCTURES.filter(ws => ws.group === 'money').map(ws => (
                      <button key={ws.value} onClick={() => toggleStructure(ws.value)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedStructures.includes(ws.value)
                            ? 'bg-amber-50 border-amber-400 text-amber-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}>
                        {ws.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedStructures.length === 0
                    ? 'No triggers — run this template manually from the campaign builder'
                    : `${selectedStructures.length} trigger${selectedStructures.length > 1 ? 's' : ''} active`}
                </p>
              </div>
            </TabsContent>

            {/* ── Tab 2: Scenes ── */}
            <TabsContent value="scenes" className="space-y-6">
              {/* Scenes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Scenes</h3>
                    <p className="text-xs text-gray-500">{scenes.length} scenes · {totalDuration}s total</p>
                  </div>
                  <Button onClick={() => setScenes(prev => [...prev, emptyScene(prev.length)])}
                    size="sm" variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Scene
                  </Button>
                </div>
                <div className="space-y-2">
                  {scenes.map((scene, i) => (
                    <SceneCard key={i} scene={scene} index={i} total={scenes.length}
                      onChange={handleSceneChange}
                      onDelete={(idx) => setScenes(prev => prev.filter((_, j) => j !== idx))}
                      onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} />
                  ))}
                </div>
              </div>

              {/* Music & Voice */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-700 text-sm">Music Mood</Label>
                  <Input value={musicMood} onChange={e => setMusicMood(e.target.value)}
                    placeholder="upbeat energetic, calm instructional..."
                    className="bg-white border-gray-300 text-gray-900 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 text-sm">Voice Pacing</Label>
                  <Input value={voicePacing} onChange={e => setVoicePacing(e.target.value)}
                    placeholder="fast and punchy, warm and conversational..."
                    className="bg-white border-gray-300 text-gray-900 text-sm" />
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 3: Style & Models ── */}
            <TabsContent value="style" className="space-y-6">
              {/* Visual Style Preset */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionHeader
                  icon={Palette}
                  title="Visual Style Preset"
                  subtitle="Locks lighting, camera, and color grade — prevents AI drift across all generated images"
                />
                <div className="grid grid-cols-3 gap-2">
                  {VISUAL_STYLE_PRESETS.map((preset) => {
                    const isSelected = visualStylePreset === preset.value;
                    return (
                      <button
                        key={String(preset.value)}
                        onClick={() => setVisualStylePreset(preset.value)}
                        className={`relative flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-[#2C666E] bg-[#2C666E]/10 text-gray-900'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-[#2C666E]" />
                        )}
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#2C666E]' : 'text-gray-700'}`}>
                          {preset.label}
                        </span>
                        <span className="text-xs text-gray-500 leading-tight">{preset.description}</span>
                      </button>
                    );
                  })}
                </div>
                {visualStylePreset && (() => {
                  const active = VISUAL_STYLE_PRESETS.find(p => p.value === visualStylePreset);
                  return active ? (
                    <div className="mt-3 rounded bg-gray-50 border border-gray-200 p-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <div><span className="text-gray-500">Lighting: </span><span className="text-gray-700">{active.lighting}</span></div>
                      <div><span className="text-gray-500">Camera: </span><span className="text-gray-700">{active.camera}</span></div>
                      <div><span className="text-gray-500">Color grade: </span><span className="text-gray-700">{active.color_grade}</span></div>
                      <div><span className="text-gray-500">Mood: </span><span className="text-gray-700">{active.mood}</span></div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Model Preferences */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <SectionHeader icon={Cpu} title="Model Preferences" subtitle="Which AI models does this template use at each step?" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Image Generation</Label>
                    <Select value={modelPreferences.image_model} onValueChange={v => setModelPreferences(p => ({ ...p, image_model: v }))}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 text-gray-900 max-h-72">
                        {IMAGE_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium">{m.label}</span>
                              {m.lora && <span className="px-1 py-0.5 text-[9px] font-bold bg-purple-600/40 text-purple-300 rounded">LoRA</span>}
                              <span className="text-gray-500">-</span>
                              <span className="text-gray-500">{m.strength}</span>
                              <span className="text-gray-400 ml-auto">{m.price}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {IMAGE_MODELS.find(m => m.value === modelPreferences.image_model)?.lora && (
                      <p className="text-[10px] text-purple-400 mt-0.5">Supports Visual Subjects (LoRA)</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Video Animation</Label>
                    <Select value={modelPreferences.video_model} onValueChange={v => setModelPreferences(p => ({ ...p, video_model: v }))}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 text-gray-900 max-h-72">
                        {VIDEO_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium">{m.label}</span>
                              <span className="text-gray-500">-</span>
                              <span className="text-gray-500">{m.strength}</span>
                              <span className="text-gray-400 ml-auto">{m.price}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Motion Style</Label>
                    <Select value={modelPreferences.motion_style} onValueChange={v => setModelPreferences(p => ({ ...p, motion_style: v }))}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 text-gray-900">
                        {MOTION_STYLES.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Music</Label>
                    <Select value={modelPreferences.music_model} onValueChange={v => setModelPreferences(p => ({ ...p, music_model: v }))}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-300 text-gray-900 max-h-72">
                        {MUSIC_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.strength ? (
                              <span className="flex items-center gap-1.5">
                                <span className="font-medium">{m.label}</span>
                                <span className="text-gray-500">-</span>
                                <span className="text-gray-500">{m.strength}</span>
                                <span className="text-gray-400 ml-auto">{m.price}</span>
                              </span>
                            ) : m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {modelPreferences.motion_style === 'motion_transfer' && (
                  <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                    Motion Transfer uses Kling 2.6 Standard Motion Control. The pipeline requires a reference motion video URL set in the brand kit or visual subject.
                  </div>
                )}

                {/* LoRA Configuration */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2C666E]" />
                    <Label className="text-xs font-semibold text-gray-700">LoRA Models</Label>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Select LoRAs to apply during image generation. Overrides brand defaults. Requires FLUX 2 Dev image model.
                  </p>
                  <LoRAPicker
                    value={templateLoraConfig}
                    onChange={setTemplateLoraConfig}
                    brandUsername={brandUsernames[0] || undefined}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 4: AI Extract ── */}
            <TabsContent value="extract" className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#2C666E]" />
                  <h3 className="text-sm font-semibold text-gray-900">Extract from Reference</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Paste a video URL and/or describe the style — AI reverse-engineers the structure, suggests models, and tags writing structures.
                </p>
                <Input value={referenceVideoUrl} onChange={e => setReferenceVideoUrl(e.target.value)}
                  placeholder="https://... (YouTube, TikTok, or direct video URL)"
                  className="bg-white border-gray-300 text-gray-900 text-sm" />
                {referenceVideoUrl && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Video Duration (seconds)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={5} max={90} value={analyzeDuration}
                        onChange={e => setAnalyzeDuration(Math.min(90, Math.max(1, parseInt(e.target.value) || 30)))}
                        className="bg-white border-gray-300 text-gray-900 text-sm w-24" />
                      <span className="text-xs text-gray-500">Max 90s — used to space frame extraction evenly</span>
                    </div>
                    {analyzeDuration > 90 && (
                      <p className="text-xs text-red-500">Videos over 90 seconds are not supported for analysis</p>
                    )}
                  </div>
                )}
                <Textarea value={analyzeDescription} onChange={e => setAnalyzeDescription(e.target.value)}
                  placeholder="Describe the style: '4-scene product review, quick cuts, bold text overlays, 30 seconds total...'"
                  className="bg-white border-gray-300 text-gray-900 text-sm h-16 resize-none" />
                <Button onClick={handleAnalyze} disabled={isAnalyzing || (!analyzeDescription && !referenceVideoUrl)}
                  size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-900 w-full">
                  {isAnalyzing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing...</>
                    : <><Wand2 className="w-4 h-4 mr-2" /> Extract Template Structure</>}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Save — always visible below tabs */}
          <div className="flex justify-end gap-3 pt-4 pb-8">
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#2C666E] hover:bg-[#07393C] text-white px-8">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {selectedId ? 'Update Template' : 'Save Template'}
            </Button>
            <Button onClick={handleSaveAndAssign} disabled={isSaving} variant="outline"
              className="border-[#2C666E]/40 text-[#2C666E] hover:bg-[#2C666E]/10 px-6">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
              Save &amp; Assign
            </Button>
          </div>

          {/* Assign Modal */}
          <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Assign Template</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Select which brand usernames should receive a copy of <span className="text-gray-900 font-medium">"{name}"</span>.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {isLoadingUsernames ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : availableUsernames.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No brand usernames found. Set up brands in the Brand Kit first.
                  </p>
                ) : (
                  availableUsernames.map(({ username, brand_name }) => {
                    const checked = selectedUsernames.includes(username);
                    return (
                      <button
                        key={username}
                        onClick={() => toggleAssignUsername(username)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          checked
                            ? 'border-[#2C666E] bg-[#2C666E]/10'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          checked ? 'bg-[#2C666E] border-[#2C666E]' : 'border-gray-300'
                        }`}>
                          {checked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">@{username}</div>
                          {brand_name !== username && (
                            <div className="text-xs text-gray-500 truncate">{brand_name}</div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {availableUsernames.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
                  <span className="text-xs text-gray-500">
                    {selectedUsernames.length} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAssignModalOpen(false)}
                      className="text-gray-500 hover:text-gray-900">
                      Cancel
                    </Button>
                    <Button onClick={handleAssignConfirm} disabled={isAssigning || !selectedUsernames.length}
                      size="sm" className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6">
                      {isAssigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                      Assign to {selectedUsernames.length || '...'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
