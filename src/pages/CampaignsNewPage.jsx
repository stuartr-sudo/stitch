import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Plus, Loader2, Trash2, GripVertical, Palette, Film,
  Image, Music, ChevronDown, ChevronUp, Play, Save,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const STYLE_PRESETS = [
  { key: 'ugc', label: 'UGC', description: 'Authentic, handheld' },
  { key: 'testimonial', label: 'Testimonial', description: 'Direct-to-camera' },
  { key: 'cinematic', label: 'Cinematic', description: 'Dramatic, film-quality' },
  { key: 'product_demo', label: 'Product Demo', description: 'Clean product focus' },
  { key: 'lifestyle', label: 'Lifestyle', description: 'Aspirational, real-world' },
  { key: 'bold_punchy', label: 'Bold & Punchy', description: 'High contrast, graphic' },
  { key: 'minimal', label: 'Minimal', description: 'Clean, restrained' },
  { key: 'documentary', label: 'Documentary', description: 'Raw, authentic' },
];

const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram_reels', label: 'IG Reels' },
  { key: 'youtube_shorts', label: 'YT Shorts' },
  { key: 'instagram_post', label: 'IG Post' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'X/Twitter' },
];

const SCENE_ROLES = ['hook', 'problem', 'solution', 'feature', 'benefit', 'social_proof', 'cta', 'outro'];

function SceneEditor({ scene, index, onChange, onRemove, isOnly }) {
  const [expanded, setExpanded] = useState(true);

  const update = (key, val) => onChange({ ...scene, [key]: val });

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-300" />
          <span className="text-sm font-medium text-slate-700">Scene {index + 1}</span>
          <span className="text-xs text-slate-400 capitalize">{scene.role || 'unset'}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isOnly && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600">Role</Label>
              <select value={scene.role} onChange={e => update('role', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                {SCENE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Duration (seconds)</Label>
              <Input type="number" min={2} max={10} value={scene.duration_seconds} onChange={e => update('duration_seconds', parseInt(e.target.value) || 5)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Visual Prompt</Label>
            <textarea
              value={scene.visual_prompt}
              onChange={e => update('visual_prompt', e.target.value)}
              placeholder="Describe the image — what should the AI generate?"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 h-20 resize-none"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">Motion Prompt</Label>
            <textarea
              value={scene.motion_prompt}
              onChange={e => update('motion_prompt', e.target.value)}
              placeholder="Camera movement, animation direction..."
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 h-16 resize-none"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">Hint / Headline</Label>
            <Input value={scene.hint || ''} onChange={e => update('hint', e.target.value)} placeholder="Short description for this scene" className="mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignsNewPage() {
  const navigate = useNavigate();
  const [campaignName, setCampaignName] = useState('');
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [stylePreset, setStylePreset] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['tiktok', 'instagram_reels']);
  const [outputType, setOutputType] = useState('both');
  const [musicMood, setMusicMood] = useState('');
  const [scenes, setScenes] = useState([
    { role: 'hook', duration_seconds: 5, visual_prompt: '', motion_prompt: '', hint: '' },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    apiFetch('/api/brand/usernames').then(r => r.json()).then(d => {
      const list = d.usernames || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0]);
    }).catch(() => {});

    apiFetch('/api/templates/list').then(r => r.json()).then(d => {
      setTemplates(d.templates || []);
    }).catch(() => {});
  }, []);

  const handleTemplateSelect = (id) => {
    setSelectedTemplate(id);
    if (id) {
      const tmpl = templates.find(t => t.id === id);
      if (tmpl?.scenes) {
        setScenes(tmpl.scenes.map(s => ({
          role: s.role || 'feature',
          duration_seconds: s.duration_seconds || s.duration || 5,
          visual_prompt: s.visual_prompt || s.hint || '',
          motion_prompt: s.motion_prompt || '',
          hint: s.hint || '',
        })));
      }
      if (tmpl?.visual_style_preset) setStylePreset(tmpl.visual_style_preset);
      if (tmpl?.platforms) setSelectedPlatforms(tmpl.platforms);
    }
  };

  const addScene = () => {
    setScenes([...scenes, { role: 'feature', duration_seconds: 5, visual_prompt: '', motion_prompt: '', hint: '' }]);
  };

  const removeScene = (idx) => setScenes(scenes.filter((_, i) => i !== idx));
  const updateScene = (idx, updated) => {
    const next = [...scenes];
    next[idx] = updated;
    setScenes(next);
  };

  const togglePlatform = (key) => {
    setSelectedPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleCreate = async (autoGenerate) => {
    if (!campaignName.trim()) { toast.error('Enter a campaign name'); return; }
    if (scenes.length === 0) { toast.error('Add at least one scene'); return; }

    setIsCreating(true);
    try {
      const res = await apiFetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          brand_username: selectedBrand || undefined,
          template_id: selectedTemplate || undefined,
          style_preset: stylePreset || undefined,
          platforms: selectedPlatforms,
          scenes,
          music_mood: musicMood || undefined,
          output_type: outputType,
          auto_generate: autoGenerate,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(autoGenerate ? 'Campaign created — generating assets...' : 'Campaign draft created');
      navigate('/campaigns');
    } catch (err) {
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">New Campaign</h1>
              <p className="text-sm text-slate-500">Create a campaign with custom scenes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Campaign basics */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Campaign Details</h2>
          <div>
            <Label className="text-sm text-slate-700">Campaign Name</Label>
            <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Summer Sale Video Ads" className="mt-1" disabled={isCreating} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-700">Brand</Label>
              <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">None</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm text-slate-700">Template (optional)</Label>
              <select value={selectedTemplate} onChange={e => handleTemplateSelect(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">Custom — no template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Style & platforms */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Palette className="w-4 h-4 text-[#2C666E]" /> Style & Output</h2>

          <div>
            <Label className="text-sm text-slate-700">Visual Style Preset</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {STYLE_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setStylePreset(stylePreset === p.key ? '' : p.key)}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    stylePreset === p.key ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-medium text-slate-800">{p.label}</div>
                  <div className="text-[10px] text-slate-500">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm text-slate-700">Platforms</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => togglePlatform(p.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedPlatforms.includes(p.key) ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-700">Output Type</Label>
              <select value={outputType} onChange={e => setOutputType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="both">Video + Static</option>
                <option value="video">Video Only</option>
                <option value="static">Static Only</option>
              </select>
            </div>
            <div>
              <Label className="text-sm text-slate-700">Music Mood</Label>
              <Input value={musicMood} onChange={e => setMusicMood(e.target.value)} placeholder="e.g., upbeat, chill, dramatic" className="mt-1" />
            </div>
          </div>
        </div>

        {/* Scenes */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Film className="w-4 h-4 text-[#2C666E]" /> Scenes ({scenes.length})</h2>
            <button onClick={addScene} className="flex items-center gap-1 text-xs text-[#2C666E] hover:underline font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Scene
            </button>
          </div>

          <div className="space-y-3">
            {scenes.map((scene, idx) => (
              <SceneEditor
                key={idx}
                scene={scene}
                index={idx}
                onChange={(updated) => updateScene(idx, updated)}
                onRemove={() => removeScene(idx)}
                isOnly={scenes.length === 1}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Button
            onClick={() => handleCreate(false)}
            disabled={isCreating || !campaignName.trim()}
            variant="outline"
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" /> Create as Draft
          </Button>
          <Button
            onClick={() => handleCreate(true)}
            disabled={isCreating || !campaignName.trim() || scenes.length === 0}
            className="flex-1 bg-[#2C666E] hover:bg-[#07393C] text-white"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Create & Generate
          </Button>
        </div>
      </main>
    </div>
  );
}
