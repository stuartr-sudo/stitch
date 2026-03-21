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

const NICHES = [
  { key: 'ai_tech_news', label: 'AI/Tech News', icon: '🤖', scenes: 8 },
  { key: 'finance_money', label: 'Finance & Crypto', icon: '💰', scenes: 7 },
  { key: 'motivation_self_help', label: 'Motivation', icon: '🧠', scenes: 7 },
  { key: 'scary_horror', label: 'Horror & Creepy', icon: '💀', scenes: 8 },
  { key: 'history_did_you_know', label: 'History & Mysteries', icon: '📜', scenes: 7 },
  { key: 'true_crime', label: 'True Crime', icon: '🔍', scenes: 8 },
  { key: 'science_nature', label: 'Science & Nature', icon: '🔬', scenes: 7 },
  { key: 'relationships_dating', label: 'Relationships', icon: '❤️', scenes: 7 },
  { key: 'health_fitness', label: 'Health & Fitness', icon: '💪', scenes: 7 },
  { key: 'gaming_popculture', label: 'Gaming & Pop Culture', icon: '🎮', scenes: 7 },
  { key: 'conspiracy_mystery', label: 'Conspiracy', icon: '👁️', scenes: 7 },
  { key: 'business_entrepreneur', label: 'Business & Startups', icon: '💼', scenes: 7 },
];

const VIDEO_MODELS = [
  { key: 'fal_kling', label: 'Kling V3' },
  { key: 'fal_veo3', label: 'Veo 3' },
  { key: 'wavespeed_wan', label: 'Wan 2.5' },
  { key: 'fal_hailuo', label: 'Hailuo' },
  { key: 'fal_pixverse', label: 'PixVerse' },
];

const CAPTION_STYLES = [
  { key: 'word_pop', label: 'Word Pop' },
  { key: 'karaoke_glow', label: 'Karaoke Glow' },
  { key: 'word_highlight', label: 'Word Highlight' },
  { key: 'neon_glow', label: 'Neon Glow' },
  { key: 'typewriter', label: 'Typewriter' },
  { key: 'bounce', label: 'Bounce' },
];

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

  const [contentType, setContentType] = useState('ad');

  // Shorts-specific state
  const [niche, setNiche] = useState('');
  const [topic, setTopic] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [videoStyle, setVideoStyle] = useState('');
  const [videoModel, setVideoModel] = useState('fal_kling');
  const [voiceId, setVoiceId] = useState('');
  const [captionStyle, setCaptionStyle] = useState('word_pop');
  const [wordsPerChunk, setWordsPerChunk] = useState(3);
  const [loraConfig, setLoraConfig] = useState([]);
  const [researchedStories, setResearchedStories] = useState([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(null);

  // Data fetched from API for shorts mode
  const [visualStyles, setVisualStyles] = useState([]);
  const [videoStyles, setVideoStyles] = useState([]);
  const [voices, setVoices] = useState([]);

  const previewAudioRef = React.useRef(null);

  useEffect(() => {
    apiFetch('/api/brand/usernames').then(r => r.json()).then(d => {
      const raw = d.usernames || [];
      // Normalize: API returns objects {username, brand_name} or plain strings
      const list = raw.map(u => typeof u === 'string' ? { username: u, brand_name: u } : u);
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0].username);
    }).catch(() => {});

    apiFetch('/api/templates/list').then(r => r.json()).then(d => {
      setTemplates(d.templates || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (contentType !== 'shorts') return;
    apiFetch('/api/styles/visual').then(r => r.json()).then(setVisualStyles).catch(() => {});
    apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStyles).catch(() => {});
    apiFetch('/api/styles/voices').then(r => r.json()).then(setVoices).catch(() => {});
  }, [contentType]);

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

  const handleResearch = async () => {
    if (!niche || !topic.trim()) {
      toast.error('Select a niche and enter a topic first');
      return;
    }
    setResearchLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topic: topic.trim(), brand_username: selectedBrand }),
      });
      const data = await res.json();
      if (data.stories) setResearchedStories(data.stories);
    } catch {
      toast.error('Research failed');
    } finally {
      setResearchLoading(false);
    }
  };

  const handleVoicePreview = async (vid) => {
    if (previewingVoice === vid) {
      previewAudioRef.current?.pause();
      setPreviewingVoice(null);
      return;
    }
    setPreviewingVoice(vid);
    try {
      const res = await apiFetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: vid, text: 'This is a preview of this voice style for your short video.' }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (previewAudioRef.current) { previewAudioRef.current.pause(); }
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoice(null);
      audio.play();
    } catch {
      toast.error('Voice preview failed');
      setPreviewingVoice(null);
    }
  };

  const handleCreate = async (autoGenerate) => {
    if (contentType === 'shorts') {
      if (!niche) { toast.error('Please select a niche'); return; }
      if (!topic.trim()) { toast.error('Please enter a topic'); return; }
      if (!visualStyle) { toast.error('Please select a visual style'); return; }
      if (!videoStyle) { toast.error('Please select a video style'); return; }

      setIsCreating(true);
      try {
        const res = await apiFetch('/api/campaigns/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'shorts',
            campaign_name: topic.slice(0, 60),
            brand_username: selectedBrand,
            niche,
            topic: topic.trim(),
            story_context: storyContext || undefined,
            visual_style: visualStyle,
            video_style: videoStyle,
            video_model: videoModel,
            voice_id: voiceId || undefined,
            caption_style: captionStyle,
            words_per_chunk: wordsPerChunk,
            lora_config: loraConfig.length > 0 ? loraConfig : undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Short generation started!');
          navigate('/campaigns');
        } else {
          toast.error(data.error || 'Failed to create short');
        }
      } catch {
        toast.error('Failed to create short');
      } finally {
        setIsCreating(false);
      }
      return;
    }

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
        {/* Content type toggle + brand selector */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setContentType('ad')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentType === 'ad' ? 'bg-[#2C666E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ad
            </button>
            <button
              onClick={() => setContentType('shorts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentType === 'shorts' ? 'bg-[#2C666E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Short
            </button>
          </div>

          {/* Brand selector shared between both modes */}
          <div>
            <Label className="text-sm text-slate-700">Brand</Label>
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">None</option>
              {brands.map(b => <option key={b.username} value={b.username}>{b.brand_name || b.username}</option>)}
            </select>
          </div>
        </div>

        {/* Ad form */}
        {contentType === 'ad' && (
          <>
            {/* Campaign basics */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-800">Campaign Details</h2>
              <div>
                <Label className="text-sm text-slate-700">Campaign Name</Label>
                <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Summer Sale Video Ads" className="mt-1" disabled={isCreating} />
              </div>
              <div>
                <Label className="text-sm text-slate-700">Template (optional)</Label>
                <select value={selectedTemplate} onChange={e => handleTemplateSelect(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="">Custom — no template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
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

            {/* Ad Actions */}
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
          </>
        )}

        {/* Shorts form */}
        {contentType === 'shorts' && (
          <>
            {/* Niche grid */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Niche Template</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {NICHES.map(n => (
                  <button
                    key={n.key}
                    onClick={() => setNiche(n.key)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      niche === n.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{n.icon}</div>
                    <div className="text-xs font-medium text-slate-700">{n.label}</div>
                    <div className="text-[10px] text-slate-400">{n.scenes} scenes</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic + Research */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Topic</label>
              <div className="flex gap-2">
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Enter a topic or describe your short..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleResearch}
                  disabled={researchLoading || !niche || !topic.trim()}
                  className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap disabled:opacity-50"
                >
                  {researchLoading ? 'Researching...' : 'Research Stories'}
                </button>
              </div>
              {researchedStories.length > 0 && (
                <div className="space-y-1 mt-2">
                  {researchedStories.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setTopic(s.title); setStoryContext(s.story_context || s.summary || ''); }}
                      className="w-full text-left p-2 border rounded-lg text-xs hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-800">{s.title}</div>
                      <div className="text-slate-500 mt-0.5">{s.angle || s.summary}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Style grid */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Visual Style</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {visualStyles.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setVisualStyle(s.key)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      visualStyle === s.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-medium text-slate-700">{s.label}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{s.category}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Style grid */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Video Style</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {videoStyles.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setVideoStyle(s.key)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      videoStyle === s.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-medium text-slate-700">{s.label}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{s.category}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Model */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Video Model</label>
              <select value={videoModel} onChange={e => setVideoModel(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                {VIDEO_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>

            {/* Voice selector */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Voice</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {voices.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      voiceId === v.id ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">{v.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); handleVoicePreview(v.id); }}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        {previewingVoice === v.id ? '⏹' : '▶️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Caption Style grid */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-2">
              <label className="text-sm font-medium text-slate-700">Caption Style</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {CAPTION_STYLES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCaptionStyle(c.key)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                      captionStyle === c.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E] text-[#2C666E]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shorts Create button */}
            <div className="pb-8">
              <button
                onClick={() => handleCreate(true)}
                disabled={isCreating || !selectedBrand || !niche || !topic.trim()}
                className="w-full py-3 bg-[#2C666E] text-white rounded-xl font-medium hover:bg-[#235258] disabled:opacity-50 transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create & Generate Short'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
