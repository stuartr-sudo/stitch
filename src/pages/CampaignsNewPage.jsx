import React, { useState, useEffect, useRef } from 'react';
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
import WizardStepper from '@/components/ui/WizardStepper';
import StyleGrid from '@/components/ui/StyleGrid';
import LoRAPicker from '@/components/LoRAPicker';
import BrandKitModal from '@/components/modals/BrandKitModal';
import LibraryModal from '@/components/modals/LibraryModal';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
import { CAPTION_STYLES } from '@/lib/captionStylePresets';
import { SCENE_PILL_CATEGORIES } from '@/lib/scenePills';
import { TOPIC_SUGGESTIONS } from '@/lib/topicSuggestions';

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
  { key: 'ai_tech_news', label: 'AI/Tech News', icon: '🤖', scenes: 8, topics: [
    'GPT-5 and the future of reasoning AI', 'AI replacing white-collar jobs', 'The AI chip war explained',
    'How AI is changing healthcare', 'Open source vs closed AI models', 'AI-generated deepfakes getting scary',
  ]},
  { key: 'finance_money', label: 'Finance & Crypto', icon: '💰', scenes: 7, topics: [
    'The 50/30/20 rule is dead', 'Why the rich pay less tax than you', 'Bitcoin halving explained simply',
    'Side hustles that actually pay in 2026', 'The hidden fees banks charge you', 'How to retire by 40',
  ]},
  { key: 'motivation_self_help', label: 'Motivation', icon: '🧠', scenes: 7, topics: [
    'The 5-second rule that changes everything', 'Why discipline beats motivation', 'How Goggins became unstoppable',
    'The monk who sold his Ferrari lesson', 'Atomic habits in 60 seconds', 'Why successful people wake at 5am',
  ]},
  { key: 'scary_horror', label: 'Horror & Creepy', icon: '💀', scenes: 8, topics: [
    'The Dyatlov Pass incident', 'Skinwalker Ranch explained', 'The most haunted building in America',
    'Deep web horror stories', 'The Bermuda Triangle new theory', 'Creepiest unsolved disappearances',
  ]},
  { key: 'history_did_you_know', label: 'History & Mysteries', icon: '📜', scenes: 7, topics: [
    'The real story behind the Titanic', 'Ancient civilizations we can\'t explain', 'History\'s biggest cover-ups',
    'The library of Alexandria tragedy', 'Why the Mayans really disappeared', 'Nikola Tesla\'s stolen inventions',
  ]},
  { key: 'true_crime', label: 'True Crime', icon: '🔍', scenes: 8, topics: [
    'The case that broke the FBI', 'Crimes solved by DNA decades later', 'The perfect crime that wasn\'t',
    'Missing persons cases still unsolved', 'Serial killers who were never caught', 'Wrongful convictions overturned',
  ]},
  { key: 'science_nature', label: 'Science & Nature', icon: '🔬', scenes: 7, topics: [
    'What happens at the bottom of the ocean', 'The paradox that breaks physics', 'How your brain tricks you daily',
    'Animals with superpowers', 'What would happen if the sun disappeared', 'The multiverse theory explained',
  ]},
  { key: 'relationships_dating', label: 'Relationships', icon: '❤️', scenes: 7, topics: [
    'The attachment style ruining your relationships', 'Why couples therapy works', 'Red flags you keep ignoring',
    'The science of attraction', 'How to argue without destroying trust', 'Why modern dating is broken',
  ]},
  { key: 'health_fitness', label: 'Health & Fitness', icon: '💪', scenes: 7, topics: [
    'The exercise myth everyone believes', 'Why stretching before workouts is wrong', 'Foods marketed as healthy that aren\'t',
    'Cold plunge benefits backed by science', 'The sleep hack that changes everything', 'Why calorie counting doesn\'t work',
  ]},
  { key: 'gaming_popculture', label: 'Gaming & Pop Culture', icon: '🎮', scenes: 7, topics: [
    'Easter eggs developers hid for years', 'The game that took 15 years to make', 'Why GTA 6 will break records',
    'Video game music that hits different', 'The speedrun that shouldn\'t be possible', 'Cancelled games we\'ll never play',
  ]},
  { key: 'conspiracy_mystery', label: 'Conspiracy', icon: '👁️', scenes: 7, topics: [
    'Declassified government projects', 'The simulation theory evidence', 'What they found under the Vatican',
    'MKUltra experiments exposed', 'The Denver Airport secrets', 'Why Nikola Tesla\'s papers vanished',
  ]},
  { key: 'business_entrepreneur', label: 'Business & Startups', icon: '💼', scenes: 7, topics: [
    'How a $0 startup became worth billions', 'The business model nobody talks about', 'Why 90% of startups fail',
    'The psychology behind Apple\'s pricing', 'How to validate an idea in 24 hours', 'Side project to $10K/month',
  ]},
];

const WIZARD_STEPS = [
  { key: 'brand_niche', label: 'Brand, Niche & Topic' },
  { key: 'topic_story', label: 'Starting Image' },
  { key: 'script', label: 'Script' },
  { key: 'look_feel', label: 'Look & Feel' },
  { key: 'motion_sound', label: 'Motion & Sound' },
  { key: 'generate', label: 'Generate' },
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
  const [loraConfig, setLoraConfig] = useState([]);
  const [researchedStories, setResearchedStories] = useState([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [selectedStoryIdxs, setSelectedStoryIdxs] = useState(new Set());
  const [primaryStoryIdx, setPrimaryStoryIdx] = useState(null);
  const [savedStories, setSavedStories] = useState([]);
  const storiesRef = useRef(null);

  // Wizard navigation
  const [wizardStep, setWizardStep] = useState('brand_niche');
  const [completedSteps, setCompletedSteps] = useState([]);

  // Step 1
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [ytConnected, setYtConnected] = useState(false);

  // Topic funnel (3 levels)
  const [topicL1, setTopicL1] = useState('');
  const [topicL2, setTopicL2] = useState('');
  const [topicL3, setTopicL3] = useState('');

  // Step 2
  const [startingImage, setStartingImage] = useState(null);
  const [showLibraryForStart, setShowLibraryForStart] = useState(false);

  // Step 3
  const [scriptScenes, setScriptScenes] = useState([]);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [expandedScene, setExpandedScene] = useState(null);

  // Step 4
  const [imageModel, setImageModel] = useState('fal_flux');

  // Step 5
  const [videoStylesList, setVideoStylesList] = useState([]);
  const [voicesList, setVoicesList] = useState([]);
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const previewAudioRef = useRef(null);

  // Brands with Brand Kit (for Shorts wizard) and all brands (for Ad mode)
  const [brandsWithKit, setBrandsWithKit] = useState([]);

  useEffect(() => {
    apiFetch('/api/brand/usernames').then(r => r.json()).then(d => {
      const raw = d.usernames || [];
      const list = raw.map(u => typeof u === 'string' ? { username: u, brand_name: u } : u);
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0].username);
    }).catch(() => {});

    // Fetch brands that have a Brand Kit configured
    apiFetch('/api/brand/kit').then(r => r.json()).then(d => {
      const kits = d.brands || [];
      setBrandsWithKit(kits.map(k => ({ username: k.brand_username, brand_name: k.brand_name || k.brand_username })));
    }).catch(() => {});

    apiFetch('/api/templates/list').then(r => r.json()).then(d => {
      setTemplates(d.templates || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (wizardStep === 'motion_sound' && videoStylesList.length === 0) {
      apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStylesList).catch(() => {});
      apiFetch('/api/voices/library').then(r => r.json()).then(setVoicesList).catch(() => {});
    }
  }, [wizardStep]);

  useEffect(() => {
    if (!selectedBrand || contentType !== 'shorts') return;
    apiFetch(`/api/youtube/status?brand_username=${encodeURIComponent(selectedBrand)}`)
      .then(r => r.json()).then(d => setYtConnected(d.connected)).catch(() => setYtConnected(false));
  }, [selectedBrand, contentType]);

  const goNext = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.key === wizardStep);
    if (idx < WIZARD_STEPS.length - 1) {
      setCompletedSteps(prev => [...new Set([...prev, wizardStep])]);
      setWizardStep(WIZARD_STEPS[idx + 1].key);
    }
  };
  const goBack = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.key === wizardStep);
    if (idx > 0) setWizardStep(WIZARD_STEPS[idx - 1].key);
  };
  const canGoNext = () => {
    switch (wizardStep) {
      case 'brand_niche': return niche && topic.trim().length > 0;
      case 'topic_story': return true; // Starting image is optional
      case 'script': return scriptScenes.length > 0;
      case 'look_feel': return visualStyle;
      case 'motion_sound': return videoStyle && voiceId;
      default: return true;
    }
  };

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
      if (data.stories) {
        setResearchedStories(data.stories);
        setSelectedStoryIdxs(new Set());
        setPrimaryStoryIdx(null);
        setTimeout(() => storiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch {
      toast.error('Research failed');
    } finally {
      setResearchLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    setScriptLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/preview-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topic: topic.trim(), story_context: storyContext, brand_username: selectedBrand }),
      });
      const data = await res.json();
      if (data.scenes) setScriptScenes(data.scenes);
      else if (data.script?.scenes) setScriptScenes(data.script.scenes);
    } catch { toast.error('Script generation failed'); }
    finally { setScriptLoading(false); }
  };

  const handleVoicePreview = async (vid) => {
    if (previewingVoice === vid) { previewAudioRef.current?.pause(); setPreviewingVoice(null); return; }
    setPreviewingVoice(vid);
    try {
      const res = await apiFetch('/api/voice/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: vid, text: 'This is a preview of this voice for your short video.' }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      if (previewAudioRef.current) previewAudioRef.current.pause();
      const audio = new Audio(URL.createObjectURL(blob));
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoice(null);
      audio.play();
    } catch { toast.error('Voice preview failed'); setPreviewingVoice(null); }
  };

  const handleCreate = async (autoGenerate) => {
    if (contentType === 'shorts') {
      if (!selectedBrand || !niche || !topic.trim() || !visualStyle || !videoStyle || !voiceId) {
        toast.error('Please complete all required steps'); return;
      }
      setIsCreating(true);
      try {
        const res = await apiFetch('/api/campaigns/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'shorts', campaign_name: topic.slice(0, 60),
            brand_username: selectedBrand, niche, topic: topic.trim(),
            story_context: storyContext || undefined,
            visual_style: visualStyle, video_style: videoStyle,
            video_model: videoModel, image_model: imageModel,
            voice_id: voiceId, caption_style: captionStyle, words_per_chunk: 3,
            lora_config: loraConfig.length > 0 ? loraConfig : undefined,
            starting_image: startingImage || undefined,
            script: scriptScenes.length > 0 ? { scenes: scriptScenes } : undefined,
          }),
        });
        const data = await res.json();
        if (data.success) { toast.success('Short generation started!'); navigate('/campaigns'); }
        else toast.error(data.error || 'Failed');
      } catch { toast.error('Failed to create short'); }
      finally { setIsCreating(false); }
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
        {/* Content type toggle — always visible */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <div className="flex gap-2">
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

          {/* Brand selector — only for Ad mode (Shorts wizard has its own in Step 1) */}
          {contentType === 'ad' && (
            <div className="mt-4">
              <Label className="text-sm text-slate-700">Brand</Label>
              <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">None</option>
                {brands.map(b => <option key={b.username} value={b.username}>{b.brand_name || b.username}</option>)}
              </select>
            </div>
          )}
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

        {/* Shorts wizard */}
        {contentType === 'shorts' && (
          <div className="space-y-6">
            <WizardStepper steps={WIZARD_STEPS} currentStep={wizardStep} completedSteps={completedSteps}
              onStepClick={(key) => { if (completedSteps.includes(key)) setWizardStep(key); }} />

            {/* Step 1: Brand, Niche & Topic */}
            {wizardStep === 'brand_niche' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Brand</label>
                  <div className="flex items-center gap-3">
                    <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                      <option value="">No brand (optional)</option>
                      {brandsWithKit.map(b => (
                        <option key={b.username} value={b.username}>{b.brand_name || b.username}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowBrandKit(true)} className="text-xs text-[#2C666E] underline whitespace-nowrap">Edit Brand Kit</button>
                  </div>
                  {selectedBrand && (
                    <div className="flex gap-2">
                      {ytConnected && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">YouTube ✓</span>}
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Guidelines set</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Niche Template</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {NICHES.map(n => (
                      <button key={n.key} onClick={() => { setNiche(n.key); setTopicL1(''); setTopicL2(''); setTopicL3(''); setTopic(''); }}
                        className={`p-3 rounded-xl border text-center transition-all ${niche === n.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-xl mb-1">{n.icon}</div>
                        <div className="text-xs font-medium text-slate-700">{n.label}</div>
                        <div className="text-[10px] text-slate-400">{n.scenes} scenes</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Topic</label>
                  <div className="flex gap-2">
                    <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What is this short about?" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <button onClick={handleResearch} disabled={researchLoading || !niche || !topic.trim()} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap disabled:opacity-50">
                      {researchLoading ? 'Researching...' : '🔍 Research'}
                    </button>
                  </div>
                  {niche && TOPIC_SUGGESTIONS[niche] && (() => {
                    const nicheData = TOPIC_SUGGESTIONS[niche];
                    const l1Items = nicheData.topics || [];
                    const l1Match = l1Items.find(t => t.label === topicL1);
                    const l2Items = l1Match?.sub || [];
                    const l2Match = l2Items.find(t => t.label === topicL2);
                    const l3Items = l2Match?.sub || [];

                    return (
                      <div className="space-y-3">
                        {/* Level 1: Broad category */}
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-medium block mb-1.5">Category</label>
                          <div className="flex flex-wrap gap-1.5">
                            {l1Items.map(t => (
                              <button key={t.label} onClick={() => {
                                setTopicL1(topicL1 === t.label ? '' : t.label);
                                setTopicL2(''); setTopicL3('');
                                setTopic(t.label);
                              }}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                  topicL1 === t.label ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]'
                                }`}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Level 2: Specific angle */}
                        {l2Items.length > 0 && (
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-medium block mb-1.5">Angle</label>
                            <div className="flex flex-wrap gap-1.5">
                              {l2Items.map(t => (
                                <button key={t.label} onClick={() => {
                                  setTopicL2(topicL2 === t.label ? '' : t.label);
                                  setTopicL3('');
                                  setTopic(`${topicL1} — ${t.label}`);
                                }}
                                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                    topicL2 === t.label ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]'
                                  }`}>
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Level 3: Hook/twist */}
                        {l3Items.length > 0 && (
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-medium block mb-1.5">Hook</label>
                            <div className="flex flex-wrap gap-1.5">
                              {l3Items.map(t => (
                                <button key={t} onClick={() => {
                                  setTopicL3(topicL3 === t ? '' : t);
                                  setTopic(`${topicL1} — ${topicL2} — ${t}`);
                                }}
                                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                    topicL3 === t ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]'
                                  }`}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {researchedStories.length > 0 && (
                    <div ref={storiesRef} className="space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-[#2C666E] uppercase tracking-wide">Trending Stories — select stories & set primary</label>
                        <span className="text-[10px] text-slate-400">{researchedStories.length} found · {selectedStoryIdxs.size} selected</span>
                      </div>
                      {researchedStories.map((s, i) => {
                        const isSelected = selectedStoryIdxs.has(i);
                        const isPrimary = primaryStoryIdx === i;
                        return (
                          <div key={i} className={`p-4 border-2 rounded-xl text-xs transition-all ${
                            isPrimary ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]'
                              : isSelected ? 'border-[#2C666E]/50 bg-[#2C666E]/[0.02]'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <button onClick={() => {
                                const next = new Set(selectedStoryIdxs);
                                if (next.has(i)) {
                                  next.delete(i);
                                  if (primaryStoryIdx === i) setPrimaryStoryIdx(null);
                                } else {
                                  next.add(i);
                                }
                                setSelectedStoryIdxs(next);
                                // Save story
                                setSavedStories(prev => {
                                  if (prev.some(p => p.title === s.title)) return prev;
                                  return [...prev, { ...s, niche, selectedAt: new Date().toISOString() }];
                                });
                              }} className="flex items-center gap-2 text-left flex-1">
                                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-[#2C666E] border-[#2C666E] text-white' : 'border-slate-300'
                                }`}>{isSelected ? '✓' : ''}</span>
                                <span className="font-semibold text-slate-800">{s.title}</span>
                              </button>
                              {isSelected && (
                                <button onClick={() => {
                                  setPrimaryStoryIdx(i);
                                  setTopic(s.title);
                                  setStoryContext(s.story_context || s.summary || '');
                                }}
                                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                    isPrimary ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'text-[#2C666E] border-[#2C666E]/30 hover:bg-[#2C666E]/10'
                                  }`}>
                                  {isPrimary ? 'Primary ★' : 'Set Primary'}
                                </button>
                              )}
                            </div>
                            <div className="text-slate-500 mt-1 leading-relaxed ml-6">{s.angle || s.summary}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Saved stories from previous research */}
                  {savedStories.length > 0 && researchedStories.length === 0 && (
                    <details className="mt-3">
                      <summary className="text-[10px] font-medium text-slate-400 uppercase cursor-pointer hover:text-slate-600">
                        Previous Research ({savedStories.length} saved)
                      </summary>
                      <div className="space-y-1 mt-2">
                        {savedStories.map((s, i) => (
                          <button key={i} onClick={() => { setTopic(s.title); setStoryContext(s.story_context || s.summary || ''); }}
                            className={`w-full text-left p-3 border rounded-lg text-xs transition-colors ${
                              topic === s.title ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:bg-slate-50'
                            }`}>
                            <div className="font-medium text-slate-700">{s.title}</div>
                            <div className="text-slate-400 mt-0.5 text-[10px]">{s.niche}</div>
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Starting Image */}
            {wizardStep === 'topic_story' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Starting Image <span className="text-xs text-slate-400 font-normal">(optional — sets Scene 1's visual starting point)</span></label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
                    {startingImage ? (
                      <div className="text-center space-y-3">
                        <img src={startingImage} alt="Starting" className="max-h-40 mx-auto rounded-lg shadow-sm" />
                        <button onClick={() => setStartingImage(null)} className="text-xs text-red-500 hover:underline">Remove image</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => setShowLibraryForStart(true)}
                            className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                            <Film className="w-5 h-5 text-slate-400" />
                            <span className="text-xs text-slate-600">From Library</span>
                          </button>
                          <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors cursor-pointer">
                            <Image className="w-5 h-5 text-slate-400" />
                            <span className="text-xs text-slate-600">Upload</span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => setStartingImage(reader.result);
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                          <div className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl">
                            <div className="flex gap-1 w-full">
                              <input id="startImgUrl" type="text" placeholder="URL..." className="flex-1 border rounded px-2 py-1 text-[10px] min-w-0" />
                              <button onClick={() => {
                                const url = document.getElementById('startImgUrl').value.trim();
                                if (url) setStartingImage(url);
                              }} className="px-2 py-1 text-[10px] bg-[#2C666E] text-white rounded hover:bg-[#235258] shrink-0">Add</button>
                            </div>
                            <span className="text-xs text-slate-600">Paste URL</span>
                          </div>
                        </div>
                        <div className="text-center text-[10px] text-slate-400">Skip this step if you want the AI to generate Scene 1 from scratch</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Script */}
            {wizardStep === 'script' && (
              <div className="space-y-4">
                {scriptScenes.length === 0 && !scriptLoading && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 mb-3">Generate a script from your topic</p>
                    <button onClick={handleGenerateScript} className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-sm font-medium hover:bg-[#235258]">
                      Generate Script
                    </button>
                  </div>
                )}
                {scriptLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                    <span className="ml-2 text-sm text-slate-500">Generating script...</span>
                  </div>
                )}
                {scriptScenes.length > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-700">Scenes ({scriptScenes.length})</label>
                      <button onClick={handleGenerateScript} className="text-xs text-[#2C666E] hover:underline">🔄 Regenerate</button>
                    </div>
                    {scriptScenes.map((scene, i) => (
                      <div key={i} className={`border rounded-xl p-4 transition-all ${expandedScene === i ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setExpandedScene(expandedScene === i ? null : i)}>
                          <span className="bg-[#2C666E] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">{i + 1}</span>
                          <span className="text-xs font-semibold text-[#2C666E] uppercase">{scene.role || 'scene'}</span>
                          <span className="text-[10px] text-slate-400">{scene.duration_seconds || scene.duration || 5}s</span>
                        </div>
                        <textarea value={scene.narration || scene.narration_segment || ''} onChange={e => {
                          const updated = [...scriptScenes]; updated[i] = { ...updated[i], narration: e.target.value, narration_segment: e.target.value }; setScriptScenes(updated);
                        }} className="w-full text-sm text-slate-700 italic bg-transparent border-0 resize-none focus:ring-0 p-0" rows={2} placeholder="Narration text..." />
                        {expandedScene === i && (
                          <div className="mt-3 space-y-2 pt-3 border-t border-slate-100">
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase font-medium">Visual Prompt</label>
                              <textarea value={scene.visual_prompt || ''} onChange={e => {
                                const updated = [...scriptScenes]; updated[i] = { ...updated[i], visual_prompt: e.target.value }; setScriptScenes(updated);
                              }} className="w-full text-xs text-slate-600 border rounded-lg px-2 py-1.5 mt-1 resize-none" rows={2} />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 uppercase font-medium">Motion Prompt</label>
                              <textarea value={scene.motion_prompt || ''} onChange={e => {
                                const updated = [...scriptScenes]; updated[i] = { ...updated[i], motion_prompt: e.target.value }; setScriptScenes(updated);
                              }} className="w-full text-xs text-slate-600 border rounded-lg px-2 py-1.5 mt-1 resize-none" rows={1} />
                            </div>
                            <button onClick={() => { const updated = scriptScenes.filter((_, j) => j !== i); setScriptScenes(updated); setExpandedScene(null); }}
                              className="text-[10px] text-red-500 hover:underline">Remove scene</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="border border-dashed border-slate-200 rounded-xl p-3">
                      <label className="text-xs font-medium text-slate-500 block mb-2">Scene Builder Helpers</label>
                      {SCENE_PILL_CATEGORIES.map(cat => (
                        <div key={cat.label} className="mb-2">
                          <div className="text-[10px] text-slate-400 uppercase mb-1">{cat.label}</div>
                          <div className="flex flex-wrap gap-1">
                            {cat.pills.map(pill => (
                              <button key={pill} onClick={() => {
                                if (expandedScene !== null) {
                                  const updated = [...scriptScenes];
                                  const s = updated[expandedScene];
                                  updated[expandedScene] = { ...s, visual_prompt: ((s.visual_prompt || '') + ', ' + pill).replace(/^, /, '') };
                                  setScriptScenes(updated);
                                } else { toast.info('Click a scene to expand it first'); }
                              }} className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Look & Feel */}
            {wizardStep === 'look_feel' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Visual Style</label>
                  <StyleGrid value={visualStyle} onChange={setVisualStyle} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Image Model</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {IMAGE_MODELS.map(m => (
                      <button key={m.value} onClick={() => { setImageModel(m.value); if (!m.lora) setLoraConfig([]); }}
                        className={`p-3 rounded-xl border text-left transition-all ${imageModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">{m.label}</span>
                          {m.lora && <span className="text-[9px] bg-[#2C666E] text-white px-1.5 py-0.5 rounded">LoRA</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.strength}</div>
                        <div className="text-[10px] text-slate-400">{m.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {IMAGE_MODELS.find(m => m.value === imageModel)?.lora && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">LoRA Models</label>
                    <LoRAPicker value={loraConfig} onChange={setLoraConfig} brandUsername={selectedBrand} />
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Motion & Sound */}
            {wizardStep === 'motion_sound' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Video Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {videoStylesList.map(s => (
                      <button key={s.key} onClick={() => setVideoStyle(s.key)}
                        className={`rounded-xl border overflow-hidden text-left transition-all ${videoStyle === s.key ? 'border-[#2C666E] ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        {s.thumb && <img src={s.thumb} alt={s.label} className="w-full h-24 object-cover" />}
                        <div className="p-2">
                          <div className="text-xs font-medium text-slate-700">{s.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{s.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Video Model</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_MODELS.map(m => (
                      <button key={m.value} onClick={() => setVideoModel(m.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${videoModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-slate-700">{m.label}</span>
                          <span className="text-[10px] text-slate-400">{m.price}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.strength}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Voice</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {voicesList.filter(v => v.source === 'preset').length > 0 && voicesList.filter(v => v.source === 'preset').map(v => (
                      <div key={v.id} onClick={() => setVoiceId(v.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${voiceId === v.id ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">{v.name}</span>
                          <button onClick={e => { e.stopPropagation(); handleVoicePreview(v.id); }} className="p-1 hover:bg-slate-100 rounded text-xs">
                            {previewingVoice === v.id ? '⏹' : '▶️'}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{v.description}</div>
                        {v.niches?.includes(niche) && <span className="text-[9px] text-[#2C666E] font-medium mt-1 block">Recommended</span>}
                      </div>
                    ))}
                    {voicesList.filter(v => v.source === 'custom').length > 0 && (
                      <>
                        <div className="col-span-full text-[10px] text-slate-400 uppercase font-medium pt-2">Your Voices</div>
                        {voicesList.filter(v => v.source === 'custom').map(v => (
                          <div key={v.id} onClick={() => setVoiceId(v.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${voiceId === v.id ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-700">{v.name}</span>
                              <button onClick={e => { e.stopPropagation(); handleVoicePreview(v.id); }} className="p-1 hover:bg-slate-100 rounded text-xs">
                                {previewingVoice === v.id ? '⏹' : '▶️'}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{v.description}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Caption Style</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CAPTION_STYLES.map(c => (
                      <button key={c.key} onClick={() => setCaptionStyle(c.key)}
                        className={`rounded-xl border overflow-hidden transition-all ${captionStyle === c.key ? 'border-[#2C666E] ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className={`${c.preview.bg} py-4 flex items-center justify-center`}>
                          <span className={c.preview.style} style={c.preview.textStroke ? { WebkitTextStroke: c.preview.textStroke } : undefined}>{c.preview.text}</span>
                        </div>
                        <div className="p-1.5 text-center">
                          <div className="text-[10px] font-medium text-slate-700">{c.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Generate */}
            {wizardStep === 'generate' && (
              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-700 block">Review & Generate</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Brand', value: selectedBrand },
                    { label: 'Niche', value: NICHES.find(n => n.key === niche)?.label || niche },
                    { label: 'Visual Style', value: visualStyle },
                    { label: 'Video Style', value: videoStylesList.find(s => s.key === videoStyle)?.label || videoStyle },
                    { label: 'Image Model', value: IMAGE_MODELS.find(m => m.value === imageModel)?.label || imageModel },
                    { label: 'Video Model', value: VIDEO_MODELS.find(m => m.value === videoModel)?.label || videoModel },
                    { label: 'Voice', value: voicesList.find(v => v.id === voiceId)?.name || voiceId },
                    { label: 'Captions', value: CAPTION_STYLES.find(c => c.key === captionStyle)?.label || captionStyle },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-[10px] text-slate-400 uppercase">{item.label}</div>
                      <div className="text-sm text-slate-800 font-medium">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Topic</div>
                  <div className="text-sm text-slate-800">{topic}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Scenes</div>
                  <div className="text-sm text-slate-800">{scriptScenes.length} scenes · ~60 seconds · 9:16 vertical</div>
                </div>
                {loraConfig.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[10px] text-slate-400 uppercase">LoRA Models</div>
                    <div className="text-sm text-slate-800">{loraConfig.map(l => l.triggerWord || l.name || l.id).join(', ')}</div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              {wizardStep !== 'brand_niche' ? (
                <button onClick={goBack} className="px-5 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">← Back</button>
              ) : <div />}
              {wizardStep !== 'generate' ? (
                <button onClick={() => { if (wizardStep === 'topic_story' && scriptScenes.length === 0) handleGenerateScript(); goNext(); }}
                  disabled={!canGoNext()} className="px-5 py-2 bg-[#2C666E] text-white rounded-xl text-sm font-medium hover:bg-[#235258] disabled:opacity-50">
                  Next →
                </button>
              ) : (
                <button onClick={() => handleCreate(true)} disabled={isCreating}
                  className="px-8 py-3 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#235258] disabled:opacity-50">
                  {isCreating ? 'Generating...' : 'Generate Short'}
                </button>
              )}
            </div>

            {showBrandKit && <BrandKitModal isOpen={true} onClose={() => { setShowBrandKit(false); /* Refresh brands with kit */ apiFetch('/api/brand/kit').then(r => r.json()).then(d => { const kits = d.brands || []; setBrandsWithKit(kits.map(k => ({ username: k.brand_username, brand_name: k.brand_name || k.brand_username }))); }).catch(() => {}); }} />}
    {showLibraryForStart && <LibraryModal isOpen={true} onClose={() => setShowLibraryForStart(false)} onSelect={(item) => { setStartingImage(item.url || item.public_url); setShowLibraryForStart(false); }} mediaType="image" />}
          </div>
        )}
      </main>
    </div>
  );
}
