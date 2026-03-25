import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
import LoRAPicker from '@/components/LoRAPicker';
import BrandKitModal from '@/components/modals/BrandKitModal';
import LibraryModal from '@/components/modals/LibraryModal';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
import { CAPTION_STYLES } from '@/lib/captionStylePresets';
import { SCENE_PILL_CATEGORIES, getScenePills } from '@/lib/scenePills';
import { TOPIC_SUGGESTIONS } from '@/lib/topicSuggestions';
import { FRAMEWORK_CARDS, getFrameworkCard, getFrameworksByCategory, getFrameworksForNiche } from '@/lib/videoStyleFrameworks';
import { GEMINI_VOICES, FEATURED_VOICES } from '@/lib/geminiVoices';

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
  { key: 'food_cooking', label: 'Food & Cooking', icon: '🍳', scenes: 7, topics: [
    'The ingredient restaurants hide from you', 'Why Gordon Ramsay hates this dish', 'Street food that costs $1 but tastes like $100',
    'The chemistry behind perfect pasta', 'Foods you\'ve been cooking wrong your whole life', 'Why MSG isn\'t actually bad for you',
  ]},
  { key: 'travel_adventure', label: 'Travel & Adventure', icon: '✈️', scenes: 7, topics: [
    'The cheapest way to fly first class', 'Islands where nobody goes', 'The most dangerous tourist attraction on Earth',
    'Hidden cities you didn\'t know existed', 'Travel scams that catch everyone', 'The country that pays you to visit',
  ]},
  { key: 'psychology_mindblown', label: 'Psychology & Mind', icon: '🧩', scenes: 7, topics: [
    'The dark psychology of social media', 'Why your brain lies to you daily', 'The experiment that shocked the world',
    'Cognitive biases controlling your decisions', 'The psychology of serial killers', 'Why you can\'t remember your childhood',
  ]},
  { key: 'space_cosmos', label: 'Space & Cosmos', icon: '🚀', scenes: 8, topics: [
    'What NASA won\'t tell you about Mars', 'The sound of a black hole', 'Why we can\'t go back to the Moon',
    'Alien signals that science can\'t explain', 'The planet made of diamonds', 'What happens if you fall into Jupiter',
  ]},
  { key: 'animals_wildlife', label: 'Animals & Wildlife', icon: '🐾', scenes: 7, topics: [
    'The animal that can\'t die', 'Why octopuses are basically aliens', 'The smartest animal you\'ve never heard of',
    'Predators with insane superpowers', 'Animals that went extinct and came back', 'The deep sea creature that defies biology',
  ]},
  { key: 'sports_athletes', label: 'Sports & Athletes', icon: '⚽', scenes: 7, topics: [
    'The greatest comeback in sports history', 'Athletes who cheated and got away with it', 'The training routine that seems insane',
    'Underdogs who shocked the world', 'Sports records that will never be broken', 'The match that changed the rules forever',
  ]},
  { key: 'education_learning', label: 'Education & Facts', icon: '📚', scenes: 7, topics: [
    'Things school should have taught you', 'The smartest person who ever lived', 'Facts that sound fake but are 100% real',
    'Why the education system is failing', 'The language nobody can decode', 'Memory tricks used by world champions',
  ]},
  { key: 'paranormal_ufo', label: 'Paranormal & UFO', icon: '👽', scenes: 8, topics: [
    'The Pentagon\'s UFO footage explained', 'Encounters too credible to ignore', 'The town that sees UFOs every night',
    'Abduction stories with physical evidence', 'Government whistleblowers on alien tech', 'The signal from space that repeated',
  ]},
];

const WIZARD_STEPS = [
  { key: 'niche', label: 'Niche & Brand' },
  { key: 'framework', label: 'Video Style' },
  { key: 'visual_style', label: 'Visual Style' },
  { key: 'image_model', label: 'Image Model' },
  { key: 'motion', label: 'Motion & Video' },
  { key: 'voice', label: 'Voice & Music' },
  { key: 'pills', label: 'Scene Direction' },
  { key: 'topics', label: 'Topic & Research' },
  { key: 'script', label: 'Script' },
  { key: 'captions', label: 'Captions' },
  { key: 'preview', label: 'Preview Image' },
  { key: 'review', label: 'Review' },
];

const VIDEO_LENGTH_PRESETS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
];

const CAPTION_FONT_FAMILIES = [
  'Montserrat', 'Inter', 'Roboto', 'Poppins', 'Open Sans', 'Lato', 'Oswald',
  'Raleway', 'Playfair Display', 'Bebas Neue', 'Anton', 'Permanent Marker',
];

const CAPTION_PRESET_CONFIGS = {
  word_pop: {
    font_name: 'Montserrat', font_size: 100, font_weight: 'bold', font_color: 'white',
    highlight_color: 'purple', stroke_width: 3, stroke_color: 'black', background_color: 'none',
    background_opacity: 0, position: 'bottom', y_offset: 75, words_per_subtitle: 1,
    enable_animation: true,
  },
  karaoke_glow: {
    font_name: 'Bebas Neue', font_size: 110, font_weight: 'bold', font_color: 'white',
    highlight_color: '#FFD700', stroke_width: 2, stroke_color: 'black', background_color: 'none',
    background_opacity: 0, position: 'bottom', y_offset: 75, words_per_subtitle: 1,
    enable_animation: true,
  },
  news_ticker: {
    font_name: 'Roboto', font_size: 70, font_weight: 'bold', font_color: 'white',
    highlight_color: '#FF0000', stroke_width: 0, stroke_color: 'black', background_color: '#000000',
    background_opacity: 80, position: 'bottom', y_offset: 95, words_per_subtitle: 4,
    enable_animation: false,
  },
  phrase: {
    font_name: 'Poppins', font_size: 80, font_weight: 'normal', font_color: 'white',
    highlight_color: '#00BFFF', stroke_width: 2, stroke_color: 'black', background_color: 'none',
    background_opacity: 0, position: 'center', y_offset: 50, words_per_subtitle: 3,
    enable_animation: true,
  },
};

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

  const [searchParams] = useSearchParams();
  const [contentType, setContentType] = useState(searchParams.get('type') === 'shorts' ? 'shorts' : 'ad');

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
  const [wizardStep, setWizardStep] = useState('niche');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [videoLengthPreset, setVideoLengthPreset] = useState(60);
  const [generateAudio, setGenerateAudio] = useState(false);
  const [enableBackgroundMusic, setEnableBackgroundMusic] = useState(true);

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

  // Script
  const [scriptScenes, setScriptScenes] = useState([]);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [expandedScene, setExpandedScene] = useState(null);

  // Image / scene direction
  const [imageModel, setImageModel] = useState('fal_flux');
  const [sceneBuilderPills, setSceneBuilderPills] = useState([]);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewImageLoading, setPreviewImageLoading] = useState(false);

  // Framework
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [frameworkCards, setFrameworkCards] = useState([]);

  // Gemini TTS
  const [geminiVoice, setGeminiVoice] = useState('Kore');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash-tts');
  const [styleInstructions, setStyleInstructions] = useState('');

  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState('9:16');

  // Full caption config
  const [captionConfig, setCaptionConfig] = useState({
    font_name: 'Montserrat',
    font_size: 100,
    font_weight: 'bold',
    font_color: 'white',
    highlight_color: 'purple',
    stroke_width: 3,
    stroke_color: 'black',
    background_color: 'none',
    background_opacity: 0,
    position: 'bottom',
    y_offset: 75,
    words_per_subtitle: 1,
    enable_animation: true,
  });

  // Resolve visual style promptText for backend
  const getVisualStylePrompt = (key) => {
    for (const cat of STYLE_CATEGORIES) {
      const found = cat.styles.find(s => s.value === key);
      if (found) return found.promptText;
    }
    return '';
  };

  // Video styles & voices
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
      // Only auto-select for Ad mode; Shorts wizard uses brandsWithKit
      if (list.length > 0 && contentType === 'ad') setSelectedBrand(list[0].username);
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

  // Load framework cards on mount
  useEffect(() => {
    apiFetch('/api/styles/frameworks').then(data => {
      if (data?.frameworks) setFrameworkCards(data.frameworks);
    }).catch(() => {
      // Fallback to local FRAMEWORK_CARDS if API not available
      setFrameworkCards(FRAMEWORK_CARDS);
    });
  }, []);

  useEffect(() => {
    if ((wizardStep === 'motion' || wizardStep === 'voice') && videoStylesList.length === 0) {
      apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStylesList).catch(() => {});
      apiFetch('/api/voices/library').then(r => r.json()).then(setVoicesList).catch(() => {});
    }
  }, [wizardStep]);

  useEffect(() => {
    if (!selectedBrand || contentType !== 'shorts') return;
    apiFetch(`/api/youtube/status?brand_username=${encodeURIComponent(selectedBrand)}`)
      .then(r => r.json()).then(d => setYtConnected(d.connected)).catch(() => setYtConnected(false));
  }, [selectedBrand, contentType]);

  const handleFrameworkSelect = (fw) => {
    setSelectedFramework(fw);
    setStyleInstructions(fw.ttsPacing || '');
    if (fw.supportedDurations?.length > 0) {
      setVideoLengthPreset(fw.supportedDurations[0]);
    }
    setEnableBackgroundMusic(true);
    if (fw.defaults) {
      if (fw.defaults.visualStyle) setVisualStyle(fw.defaults.visualStyle);
      if (fw.defaults.videoStylePreset) setVideoStyle(fw.defaults.videoStylePreset);
      if (fw.defaults.imageModel) setImageModel(fw.defaults.imageModel);
      if (fw.defaults.videoModel) setVideoModel(fw.defaults.videoModel);
    }
  };

  const scrollToTop = () => {
    // Defer scroll to after React re-render completes
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
  };
  const goNext = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.key === wizardStep);
    if (idx < WIZARD_STEPS.length - 1) {
      setCompletedSteps(prev => [...new Set([...prev, wizardStep])]);
      setWizardStep(WIZARD_STEPS[idx + 1].key);
      scrollToTop();
    }
  };
  const goBack = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.key === wizardStep);
    if (idx > 0) {
      setWizardStep(WIZARD_STEPS[idx - 1].key);
      scrollToTop();
    }
  };
  const canGoNext = () => {
    switch (wizardStep) {
      case 'niche': return niche;
      case 'framework': return !!selectedFramework;
      case 'visual_style': return visualStyle;
      case 'image_model': return !!imageModel;
      case 'motion': return videoStyle && videoModel;
      case 'voice': return geminiVoice;
      case 'pills': return true; // optional
      case 'topics': return topic.trim().length > 0;
      case 'script': return scriptScenes.length > 0;
      case 'captions': return true; // has defaults
      case 'preview': return !!previewImageUrl;
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
    if (!niche) { toast.error('Select a niche first'); return; }
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setScriptLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/preview-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          topic: topic.trim(),
          story_context: storyContext,
          brand_username: selectedBrand,
          visual_directions: sceneBuilderPills.length > 0 ? sceneBuilderPills : undefined,
          videoLengthPreset,
          framework: selectedFramework?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || 'Script generation failed');
        return;
      }
      const scenes = data.scenes || data.script?.scenes;
      if (scenes && scenes.length > 0) {
        setScriptScenes(scenes);
      } else {
        toast.error('Script generated but no scenes returned — try again');
      }
    } catch (err) {
      console.error('Script generation error:', err);
      toast.error('Script generation failed — check your connection');
    } finally { setScriptLoading(false); }
  };

  const handlePreviewImage = async () => {
    const scene1 = scriptScenes[0];
    if (!scene1?.visual_prompt) { toast.error('No script scenes — generate a script first'); return; }
    setPreviewImageLoading(true);
    setPreviewImageUrl(null);
    try {
      const res = await apiFetch('/api/campaigns/preview-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visual_prompt: scene1.visual_prompt,
          visual_style: visualStyle,
          visual_style_prompt: getVisualStylePrompt(visualStyle),
          video_style: videoStyle,
          lora_config: loraConfig.length > 0 ? loraConfig : undefined,
          image_model: imageModel,
          brand_username: selectedBrand || undefined,
        }),
      });
      const data = await res.json();
      if (data.image_url) setPreviewImageUrl(data.image_url);
      else toast.error(data.error || 'Image generation failed');
    } catch { toast.error('Failed to generate preview image'); }
    finally { setPreviewImageLoading(false); }
  };

  const handleVoicePreview = async (voiceName) => {
    if (previewingVoice === voiceName) { previewAudioRef.current?.pause(); setPreviewingVoice(null); return; }
    setPreviewingVoice(voiceName);
    try {
      const res = await apiFetch('/api/voice/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceName, text: 'This is a preview of this voice for your short video.' }),
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
      if (!niche || !topic.trim() || !visualStyle || !videoStyle || !geminiVoice) {
        toast.error('Please complete all required steps'); return;
      }
      if (!previewImageUrl) {
        toast.error('Please generate and approve a preview image first'); return;
      }
      setIsCreating(true);
      try {
        const res = await apiFetch('/api/campaigns/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'shorts',
            name: topic.slice(0, 60),
            brand_username: selectedBrand,
            niche,
            topic: topic.trim(),
            story_context: storyContext || undefined,
            visual_style: visualStyle,
            visual_style_prompt: getVisualStylePrompt(visualStyle),
            video_style: videoStyle,
            video_model: videoModel,
            image_model: imageModel,
            gemini_voice: geminiVoice,
            gemini_model: geminiModel,
            style_instructions: styleInstructions,
            caption_config: captionConfig,
            lora_config: loraConfig.length > 0 ? loraConfig : undefined,
            video_length_preset: videoLengthPreset,
            generate_audio: false,
            enable_background_music: enableBackgroundMusic,
            starting_image: previewImageUrl || undefined,
            script: scriptScenes.length > 0 ? { scenes: scriptScenes } : undefined,
            framework: selectedFramework?.id,
            aspect_ratio: aspectRatio,
          }),
        });
        const data = await res.json();
        if (data.success) { toast.success('Short generation started!'); navigate(data.campaign_id ? `/shorts/draft/${data.campaign_id}` : '/campaigns'); }
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

  // Caption config updater
  const updateCaptionConfig = (key, value) => {
    setCaptionConfig(prev => ({ ...prev, [key]: value }));
  };

  // Sort Gemini voices: featured first, then alphabetical
  const sortedGeminiVoices = [
    ...GEMINI_VOICES.filter(v => FEATURED_VOICES.includes(v.id)),
    ...GEMINI_VOICES.filter(v => !FEATURED_VOICES.includes(v.id)),
  ];

  // Active framework cards — filter by selected niche, then split by category
  const activeFrameworks = niche ? getFrameworksForNiche(niche) : FRAMEWORK_CARDS;
  const nicheSpecificFrameworks = activeFrameworks.filter(f => f.applicableNiches);
  const universalFrameworks = activeFrameworks.filter(f => !f.applicableNiches);
  const storyFrameworks = universalFrameworks.filter(f => f.category === 'story');
  const fastFrameworks = universalFrameworks.filter(f => f.category === 'fast_paced');
  const nicheStoryFrameworks = nicheSpecificFrameworks.filter(f => f.category === 'story');
  const nicheFastFrameworks = nicheSpecificFrameworks.filter(f => f.category === 'fast_paced');

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
        {/* Content type toggle — only visible on first step */}
        <div className={`bg-white rounded-2xl p-6 border shadow-sm ${wizardStep !== 'niche' && contentType === 'shorts' ? 'hidden' : ''}`}>
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
              onClick={() => { setContentType('shorts'); setSelectedBrand(''); }}
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
              onStepClick={(key) => { if (completedSteps.includes(key)) { setWizardStep(key); scrollToTop(); } }} />

            {/* Step 1: Niche & Brand */}
            {wizardStep === 'niche' && (
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
                      {ytConnected && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">YouTube connected</span>}
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Guidelines set</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Niche Template</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {NICHES.map(n => (
                      <button key={n.key} onClick={() => { setNiche(n.key); setTopicL1(''); setTopicL2(''); setTopicL3(''); setTopic(''); if (selectedFramework?.applicableNiches && !selectedFramework.applicableNiches.includes(n.key)) setSelectedFramework(null); }}
                        className={`p-3 rounded-xl border text-center transition-all ${niche === n.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-xl mb-1">{n.icon}</div>
                        <div className="text-xs font-medium text-slate-700">{n.label}</div>
                        <div className="text-[10px] text-slate-400">{n.scenes} scenes</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Framework Picker */}
            {wizardStep === 'framework' && (
              <div className="space-y-6">
                {/* Niche-specific (Recommended) frameworks — only shown when niche has dedicated ones */}
                {nicheSpecificFrameworks.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border-2 border-[#2C666E]/20 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[#2C666E] block">Recommended for {NICHES.find(n => n.key === niche)?.label || niche}</label>
                      <span className="text-[10px] bg-[#2C666E]/10 text-[#2C666E] px-2 py-0.5 rounded-full font-medium">{nicheSpecificFrameworks.length} styles</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {nicheSpecificFrameworks.map(fw => (
                        <button key={fw.id} onClick={() => handleFrameworkSelect(fw)}
                          className={`rounded-xl border overflow-hidden text-left transition-all ${
                            selectedFramework?.id === fw.id ? 'border-[#2C666E] ring-2 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                          }`}>
                          {fw.thumb ? (
                            <div className="w-full h-24 bg-slate-100">
                              <img src={fw.thumb} alt={fw.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                          ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-[#2C666E]/30 to-[#07393C]/40" />
                          )}
                          <div className="p-3 space-y-1.5">
                            <div className="text-xs font-semibold text-slate-800">{fw.name}</div>
                            <div className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{fw.description}</div>
                            <div className="text-[10px] text-[#2C666E] italic">"{fw.hook}"</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {fw.badges?.map(badge => (
                                <span key={badge} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{badge}</span>
                              ))}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {fw.supportedDurations?.map(d => (
                                <span key={d} className="text-[9px] bg-[#2C666E]/10 text-[#2C666E] px-1.5 py-0.5 rounded-full font-medium">{d}s</span>
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Universal Story Frameworks */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Story Frameworks</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {storyFrameworks.map(fw => (
                      <button key={fw.id} onClick={() => handleFrameworkSelect(fw)}
                        className={`rounded-xl border overflow-hidden text-left transition-all ${
                          selectedFramework?.id === fw.id ? 'border-[#2C666E] ring-2 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        {fw.thumb ? (
                          <div className="w-full h-24 bg-slate-100">
                            <img src={fw.thumb} alt={fw.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-gradient-to-br from-[#2C666E]/20 to-[#07393C]/30" />
                        )}
                        <div className="p-3 space-y-1.5">
                          <div className="text-xs font-semibold text-slate-800">{fw.name}</div>
                          <div className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{fw.description}</div>
                          <div className="text-[10px] text-[#2C666E] italic">"{fw.hook}"</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {fw.badges?.map(badge => (
                              <span key={badge} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{badge}</span>
                            ))}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {fw.supportedDurations?.map(d => (
                              <span key={d} className="text-[9px] bg-[#2C666E]/10 text-[#2C666E] px-1.5 py-0.5 rounded-full font-medium">{d}s</span>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Universal Fast-Paced Frameworks */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Fast-Paced Frameworks</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {fastFrameworks.map(fw => (
                      <button key={fw.id} onClick={() => handleFrameworkSelect(fw)}
                        className={`rounded-xl border overflow-hidden text-left transition-all ${
                          selectedFramework?.id === fw.id ? 'border-[#2C666E] ring-2 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        {fw.thumb ? (
                          <div className="w-full h-24 bg-slate-100">
                            <img src={fw.thumb} alt={fw.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-gradient-to-br from-orange-200/40 to-red-300/30" />
                        )}
                        <div className="p-3 space-y-1.5">
                          <div className="text-xs font-semibold text-slate-800">{fw.name}</div>
                          <div className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{fw.description}</div>
                          <div className="text-[10px] text-[#2C666E] italic">"{fw.hook}"</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {fw.badges?.map(badge => (
                              <span key={badge} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{badge}</span>
                            ))}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {fw.supportedDurations?.map(d => (
                              <span key={d} className="text-[9px] bg-[#2C666E]/10 text-[#2C666E] px-1.5 py-0.5 rounded-full font-medium">{d}s</span>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration picker — only shows supported durations from selected framework */}
                {selectedFramework && (
                  <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-3">
                    <label className="text-sm font-medium text-slate-700 block">Video Length</label>
                    <div className="flex gap-2">
                      {(selectedFramework.supportedDurations || VIDEO_LENGTH_PRESETS.map(p => p.value)).map(dur => (
                        <button key={dur} type="button" onClick={() => setVideoLengthPreset(dur)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                            videoLengthPreset === dur
                              ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}>
                          {dur}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Look & Feel */}
            {/* Step 3: Visual Style */}
            {wizardStep === 'visual_style' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Visual Style</label>
                  <p className="text-[10px] text-slate-400 mb-3">Choose the visual aesthetic for your generated images.</p>
                  <StyleGrid value={visualStyle} onChange={setVisualStyle} />
                </div>
              </div>
            )}

            {/* Step 4: Image Model */}
            {wizardStep === 'image_model' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Image Model</label>
                  <p className="text-[10px] text-slate-400 mb-3">Select the AI model to generate your scene images.</p>
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

            {/* Step 4: Motion & Video */}
            {wizardStep === 'motion' && (
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

                {/* Aspect ratio */}
                <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3">
                  <label className="text-sm font-medium text-slate-700 block">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {['9:16', '16:9', '1:1'].map(ar => (
                      <button key={ar} onClick={() => setAspectRatio(ar)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          aspectRatio === ar
                            ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}>
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Voice & Music — Gemini Voices */}
            {wizardStep === 'voice' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Voice</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {sortedGeminiVoices.map(v => (
                      <div key={v.id} onClick={() => setGeminiVoice(v.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${geminiVoice === v.id ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">{v.label}</span>
                          <button onClick={e => { e.stopPropagation(); handleVoicePreview(v.id); }} className="p-1 hover:bg-slate-100 rounded text-xs">
                            {previewingVoice === v.id ? '||' : '>>'}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{v.description}</div>
                        {FEATURED_VOICES.includes(v.id) && <span className="text-[9px] text-[#2C666E] font-medium mt-1 block">Featured</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style instructions */}
                <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3">
                  <label className="text-sm font-medium text-slate-700 block">Voice Style Instructions</label>
                  <p className="text-[10px] text-slate-400">Guide how the voice should speak — pacing, tone, energy level.</p>
                  <textarea
                    value={styleInstructions}
                    onChange={e => setStyleInstructions(e.target.value)}
                    placeholder="e.g., Speak with high energy and urgency, pause for emphasis after each key point..."
                    className="w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none"
                  />
                </div>

                {/* TTS model toggle */}
                <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3">
                  <label className="text-sm font-medium text-slate-700 block">TTS Quality</label>
                  <div className="flex gap-2">
                    <button onClick={() => setGeminiModel('gemini-2.5-flash-tts')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        geminiModel === 'gemini-2.5-flash-tts'
                          ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}>
                      <div>Flash</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Fast, cost-effective</div>
                    </button>
                    <button onClick={() => setGeminiModel('gemini-2.5-pro-tts')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        geminiModel === 'gemini-2.5-pro-tts'
                          ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}>
                      <div>Pro</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Premium quality</div>
                    </button>
                  </div>
                </div>

                {/* Background music toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-700">Background music</div>
                    <div className="text-xs text-slate-500">AI-generated mood music layered behind voiceover</div>
                  </div>
                  <button onClick={() => setEnableBackgroundMusic(!enableBackgroundMusic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableBackgroundMusic ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableBackgroundMusic ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Scene Direction (pills) */}
            {wizardStep === 'pills' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Scene Direction Helpers</label>
                  <p className="text-[10px] text-slate-400 mb-2">Click pills to build a visual direction — these will be included when generating your script scenes.</p>
                  {getScenePills(niche, selectedFramework, visualStyle, videoLengthPreset).map(cat => (
                    <div key={cat.label} className="mb-2">
                      <div className="text-[10px] text-slate-400 uppercase mb-1">{cat.label}</div>
                      <div className="flex flex-wrap gap-1">
                        {cat.pills.map(pill => (
                          <button key={pill} onClick={() => {
                            setSceneBuilderPills(prev => prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]);
                          }} className={`text-[10px] px-2 py-1 rounded-full transition-colors ${sceneBuilderPills.includes(pill) ? 'bg-[#2C666E] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                            {pill}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {sceneBuilderPills.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-1">Selected: {sceneBuilderPills.join(', ')}</div>
                      <button onClick={() => setSceneBuilderPills([])} className="text-[10px] text-red-400 hover:underline">Clear all</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 7: Topic & Research */}
            {wizardStep === 'topics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Topic</label>
                  <div className="flex gap-2">
                    <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What is this short about?" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <button onClick={handleResearch} disabled={researchLoading || !niche || !topic.trim()} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap disabled:opacity-50">
                      {researchLoading ? 'Researching...' : 'Research'}
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
                                  {isPrimary ? 'Primary' : 'Set Primary'}
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

            {/* Step 8: Script */}
            {wizardStep === 'script' && (
              <div className="space-y-4">
                {scriptScenes.length === 0 && !scriptLoading && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-500 mb-3">Generate a script from your topic{sceneBuilderPills.length > 0 ? ` with ${sceneBuilderPills.length} visual directions` : ''}{selectedFramework ? ` using ${selectedFramework.name} framework` : ''}</p>
                      <button onClick={handleGenerateScript} className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-sm font-medium hover:bg-[#235258]">
                        Generate Script
                      </button>
                    </div>
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
                      <button onClick={handleGenerateScript} className="text-xs text-[#2C666E] hover:underline">Regenerate</button>
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
                    {/* Pill helpers for individual scene editing */}
                    {expandedScene !== null && (
                      <div className="border border-dashed border-slate-200 rounded-xl p-3">
                        <label className="text-xs font-medium text-slate-500 block mb-2">Add to scene {expandedScene + 1} visual prompt</label>
                        <div className="flex flex-wrap gap-1">
                          {getScenePills(niche, selectedFramework, visualStyle, videoLengthPreset).flatMap(cat => cat.pills).slice(0, 20).map(pill => (
                            <button key={pill} onClick={() => {
                              const updated = [...scriptScenes];
                              const s = updated[expandedScene];
                              updated[expandedScene] = { ...s, visual_prompt: ((s.visual_prompt || '') + ', ' + pill).replace(/^, /, '') };
                              setScriptScenes(updated);
                            }} className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                              {pill}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 9: Captions — Full Editor */}
            {wizardStep === 'captions' && (
              <div className="space-y-6">
                {/* Preset quick-select */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Caption Preset</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CAPTION_PRESET_CONFIGS).map(([key, config]) => (
                      <button key={key} onClick={() => { setCaptionConfig(config); setCaptionStyle(key); }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                          captionStyle === key
                            ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual controls */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">Caption Settings</label>

                  {/* Font family */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Font Family</label>
                    <select value={captionConfig.font_name} onChange={e => updateCaptionConfig('font_name', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      {CAPTION_FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Font Size: {captionConfig.font_size}</label>
                    <input type="range" min={50} max={200} step={5} value={captionConfig.font_size}
                      onChange={e => updateCaptionConfig('font_size', parseInt(e.target.value))}
                      className="w-full accent-[#2C666E]" />
                  </div>

                  {/* Font weight */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Font Weight</label>
                    <div className="flex gap-2">
                      {['normal', 'bold'].map(w => (
                        <button key={w} onClick={() => updateCaptionConfig('font_weight', w)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            captionConfig.font_weight === w ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-200'
                          }`}>
                          {w.charAt(0).toUpperCase() + w.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Font Color</label>
                      <input type="color" value={captionConfig.font_color === 'white' ? '#ffffff' : captionConfig.font_color}
                        onChange={e => updateCaptionConfig('font_color', e.target.value)}
                        className="w-full h-8 rounded border cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Highlight Color</label>
                      <input type="color" value={captionConfig.highlight_color === 'purple' ? '#9333ea' : captionConfig.highlight_color}
                        onChange={e => updateCaptionConfig('highlight_color', e.target.value)}
                        className="w-full h-8 rounded border cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Stroke Color</label>
                      <input type="color" value={captionConfig.stroke_color === 'black' ? '#000000' : captionConfig.stroke_color}
                        onChange={e => updateCaptionConfig('stroke_color', e.target.value)}
                        className="w-full h-8 rounded border cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Background Color</label>
                      <input type="color" value={captionConfig.background_color === 'none' ? '#000000' : captionConfig.background_color}
                        onChange={e => updateCaptionConfig('background_color', e.target.value)}
                        className="w-full h-8 rounded border cursor-pointer" />
                    </div>
                  </div>

                  {/* Stroke width */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Stroke Width: {captionConfig.stroke_width}</label>
                    <input type="range" min={0} max={10} step={1} value={captionConfig.stroke_width}
                      onChange={e => updateCaptionConfig('stroke_width', parseInt(e.target.value))}
                      className="w-full accent-[#2C666E]" />
                  </div>

                  {/* Background opacity */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Background Opacity: {captionConfig.background_opacity}%</label>
                    <input type="range" min={0} max={100} step={5} value={captionConfig.background_opacity}
                      onChange={e => updateCaptionConfig('background_opacity', parseInt(e.target.value))}
                      className="w-full accent-[#2C666E]" />
                  </div>

                  {/* Position */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Position</label>
                    <div className="flex gap-2">
                      {['top', 'center', 'bottom'].map(pos => (
                        <button key={pos} onClick={() => updateCaptionConfig('position', pos)}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            captionConfig.position === pos ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-200'
                          }`}>
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Y offset */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Y Offset: {captionConfig.y_offset}%</label>
                    <input type="range" min={0} max={100} step={5} value={captionConfig.y_offset}
                      onChange={e => updateCaptionConfig('y_offset', parseInt(e.target.value))}
                      className="w-full accent-[#2C666E]" />
                  </div>

                  {/* Words per subtitle */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Words per Subtitle: {captionConfig.words_per_subtitle}</label>
                    <input type="range" min={1} max={8} step={1} value={captionConfig.words_per_subtitle}
                      onChange={e => updateCaptionConfig('words_per_subtitle', parseInt(e.target.value))}
                      className="w-full accent-[#2C666E]" />
                  </div>

                  {/* Animation toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Animation</div>
                      <div className="text-xs text-slate-500">Animate subtitle appearance</div>
                    </div>
                    <button onClick={() => updateCaptionConfig('enable_animation', !captionConfig.enable_animation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${captionConfig.enable_animation ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${captionConfig.enable_animation ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <label className="text-xs text-slate-400 block mb-3">Preview</label>
                  <div className="flex items-center justify-center py-8" style={{
                    textAlign: 'center',
                  }}>
                    <span style={{
                      fontFamily: captionConfig.font_name,
                      fontSize: `${Math.min(captionConfig.font_size / 3, 48)}px`,
                      fontWeight: captionConfig.font_weight,
                      color: captionConfig.font_color === 'white' ? '#ffffff' : captionConfig.font_color,
                      WebkitTextStroke: captionConfig.stroke_width > 0 ? `${captionConfig.stroke_width / 2}px ${captionConfig.stroke_color === 'black' ? '#000' : captionConfig.stroke_color}` : undefined,
                      backgroundColor: captionConfig.background_color !== 'none' ? `${captionConfig.background_color}${Math.round(captionConfig.background_opacity * 2.55).toString(16).padStart(2, '0')}` : undefined,
                      padding: captionConfig.background_color !== 'none' ? '4px 12px' : undefined,
                      borderRadius: '4px',
                    }}>
                      Sample <span style={{ color: captionConfig.highlight_color === 'purple' ? '#9333ea' : captionConfig.highlight_color }}>Caption</span> Text
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 10: Preview Image */}
            {wizardStep === 'preview' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Scene 1 Preview</div>
                      <div className="text-[10px] text-slate-400">Generate a preview of the first frame. Once approved, all scenes will chain from this image.</div>
                    </div>
                    <button onClick={handlePreviewImage} disabled={previewImageLoading || scriptScenes.length === 0}
                      className="px-3 py-1.5 text-xs bg-[#2C666E] text-white rounded-lg hover:bg-[#235258] disabled:opacity-50">
                      {previewImageLoading ? 'Generating...' : previewImageUrl ? 'Regenerate' : 'Generate Preview'}
                    </button>
                  </div>
                  {previewImageLoading && (
                    <div className="flex items-center justify-center py-12 bg-slate-50 rounded-xl">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                      <span className="ml-2 text-sm text-slate-500">Generating scene 1 image...</span>
                    </div>
                  )}
                  {previewImageUrl && !previewImageLoading && (
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        <img src={previewImageUrl} alt="Scene 1 preview" className="max-h-80 rounded-xl border shadow-sm object-contain" />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Preview approved — ready to generate</span>
                      </div>
                    </div>
                  )}
                  {!previewImageUrl && !previewImageLoading && (
                    <div className="text-center py-8 bg-slate-50 rounded-xl text-sm text-slate-400">
                      Click "Generate Preview" to see how scene 1 will look
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 11: Review & Generate */}
            {wizardStep === 'review' && (
              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-700 block">Review & Generate</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Brand', value: selectedBrand || 'None' },
                    { label: 'Niche', value: NICHES.find(n => n.key === niche)?.label || niche },
                    { label: 'Framework', value: selectedFramework?.name || 'None' },
                    { label: 'Visual Style', value: visualStyle },
                    { label: 'Video Style', value: videoStylesList.find(s => s.key === videoStyle)?.label || videoStyle },
                    { label: 'Image Model', value: IMAGE_MODELS.find(m => m.value === imageModel)?.label || imageModel },
                    { label: 'Video Model', value: VIDEO_MODELS.find(m => m.value === videoModel)?.label || videoModel },
                    { label: 'Voice', value: geminiVoice },
                    { label: 'TTS Model', value: geminiModel === 'gemini-2.5-flash-tts' ? 'Flash' : 'Pro' },
                    { label: 'Captions', value: `${captionConfig.font_name}, ${captionConfig.font_size}px` },
                    { label: 'Length', value: `${videoLengthPreset}s` },
                    { label: 'Aspect Ratio', value: aspectRatio },
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
                {styleInstructions && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[10px] text-slate-400 uppercase">Voice Style Instructions</div>
                    <div className="text-sm text-slate-800">{styleInstructions}</div>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Scenes</div>
                  <div className="text-sm text-slate-800">{scriptScenes.length} scenes · ~{videoLengthPreset} seconds · {aspectRatio} {aspectRatio === '9:16' ? 'vertical' : aspectRatio === '16:9' ? 'landscape' : 'square'}</div>
                </div>
                {previewImageUrl && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[10px] text-slate-400 uppercase mb-2">Scene 1 Preview</div>
                    <img src={previewImageUrl} alt="Scene 1" className="max-h-40 rounded-lg" />
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              {wizardStep !== 'niche' ? (
                <button onClick={goBack} className="px-5 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Back</button>
              ) : <div />}
              {wizardStep !== 'review' ? (
                <button onClick={goNext}
                  disabled={!canGoNext()} className="px-5 py-2 bg-[#2C666E] text-white rounded-xl text-sm font-medium hover:bg-[#235258] disabled:opacity-50">
                  Next
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
