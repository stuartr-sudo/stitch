import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import WizardStepper from '@/components/ui/WizardStepper';
import StyleGrid from '@/components/ui/StyleGrid';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Zap,
  Brain,
  DollarSign,
  Ghost,
  Play,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  Film,
  Mic,
  Music,
  Type,
  Image,
  Video,
  Layers,
  ChevronDown,
  ChevronUp,
  History,
  Skull,
  Microscope,
  Heart,
  Dumbbell,
  Gamepad2,
  Eye,
  Briefcase,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import LoRAPicker from '@/components/LoRAPicker';

// ── Niche definitions ───────────────────────────────────────────────────────

const NICHES = [
  { key: 'ai_tech_news',           label: 'AI / Tech News',       icon: Zap,       description: 'Breaking AI developments with authority', color: 'from-blue-500 to-cyan-500' },
  { key: 'finance_money',          label: 'Finance / Money',      icon: DollarSign, description: 'Actionable money strategies',            color: 'from-green-500 to-emerald-500' },
  { key: 'motivation_self_help',   label: 'Motivation',           icon: Brain,     description: 'Powerful stories with emotional arc',    color: 'from-orange-500 to-amber-500' },
  { key: 'scary_horror',           label: 'Scary / Horror',       icon: Ghost,     description: 'Atmospheric horror with shocking twist', color: 'from-purple-500 to-violet-500' },
  { key: 'history_did_you_know',   label: 'History',              icon: History,   description: 'Fascinating historical facts & stories', color: 'from-yellow-600 to-amber-700' },
  { key: 'true_crime',             label: 'True Crime',           icon: Skull,     description: 'Gripping real crime cases & reveals',   color: 'from-gray-600 to-slate-700' },
  { key: 'science_nature',         label: 'Science / Nature',     icon: Microscope, description: 'Mind-expanding science that rewires',  color: 'from-teal-500 to-cyan-600' },
  { key: 'relationships_dating',   label: 'Relationships',        icon: Heart,     description: 'Psychology-backed relationship insights', color: 'from-rose-500 to-pink-500' },
  { key: 'health_fitness',         label: 'Health & Fitness',     icon: Dumbbell,  description: 'Science-backed health myth-busting',    color: 'from-lime-500 to-green-600' },
  { key: 'gaming_popculture',      label: 'Gaming / Pop Culture', icon: Gamepad2,  description: 'Hidden lore & fan theories uncovered',  color: 'from-indigo-500 to-purple-600' },
  { key: 'conspiracy_mystery',     label: 'Conspiracy / Mystery', icon: Eye,       description: 'Unsolved mysteries & alternative takes', color: 'from-slate-500 to-gray-700' },
  { key: 'business_entrepreneur',  label: 'Business',             icon: Briefcase, description: 'Raw founder strategies that drive action', color: 'from-sky-500 to-blue-600' },
];

const VOICE_PRESETS = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, authoritative male', niches: ['ai_tech_news', 'finance_money', 'history_did_you_know', 'conspiracy_mystery', 'business_entrepreneur'] },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, inspiring male', niches: ['motivation_self_help', 'relationships_dating'] },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', description: 'Deep gravelly male', niches: ['scary_horror', 'true_crime'] },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, eerie female', niches: ['scary_horror', 'true_crime', 'conspiracy_mystery'] },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Young energetic male', niches: ['ai_tech_news', 'motivation_self_help', 'science_nature', 'health_fitness', 'gaming_popculture'] },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Young clear female', niches: ['finance_money', 'ai_tech_news', 'health_fitness', 'relationships_dating'] },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, narrative male', niches: ['history_did_you_know', 'science_nature', 'business_entrepreneur'] },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Deep British male', niches: ['history_did_you_know', 'true_crime', 'science_nature', 'conspiracy_mystery'] },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Warm British female', niches: ['science_nature', 'health_fitness', 'relationships_dating', 'motivation_self_help'] },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Confident American', niches: ['ai_tech_news', 'finance_money', 'business_entrepreneur', 'gaming_popculture'] },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Friendly young male', niches: ['gaming_popculture', 'ai_tech_news', 'health_fitness'] },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Expressive female', niches: ['motivation_self_help', 'relationships_dating', 'health_fitness', 'scary_horror'] },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Casual American male', niches: ['gaming_popculture', 'ai_tech_news', 'conspiracy_mystery'] },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep narrator male', niches: ['true_crime', 'history_did_you_know', 'scary_horror', 'conspiracy_mystery'] },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Intense transatlantic', niches: ['scary_horror', 'true_crime', 'conspiracy_mystery', 'history_did_you_know'] },
];

const CAPTION_STYLES = [
  { key: 'word_pop', label: 'Word Pop', description: 'Bold white, black outline — high impact',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-white font-black text-lg tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]', textStroke: '2px black' } },
  { key: 'karaoke_glow', label: 'Karaoke Glow', description: 'Yellow highlight with heavy shadow',
    preview: { text: 'GLOW', bg: 'bg-slate-900', style: 'text-yellow-400 font-black text-lg tracking-wide drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' } },
  { key: 'word_highlight', label: 'Subtle', description: 'Clean white, minimal outline',
    preview: { text: 'subtle', bg: 'bg-slate-800', style: 'text-white/90 font-semibold text-base tracking-wide' } },
  { key: 'neon_glow', label: 'Neon Glow', description: 'Cyan glow on dark background',
    preview: { text: 'NEON', bg: 'bg-slate-950', style: 'text-cyan-400 font-black text-lg tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]' } },
  { key: 'typewriter', label: 'Typewriter', description: 'Letter-by-letter reveal effect',
    preview: { text: 'type_', bg: 'bg-slate-900', style: 'text-green-400 font-mono font-bold text-base tracking-wider' } },
  { key: 'bounce', label: 'Bounce', description: 'Words bounce in with spring animation',
    preview: { text: 'POP!', bg: 'bg-indigo-950', style: 'text-white font-black text-lg tracking-wide animate-bounce' } },
  { key: 'gradient_slide', label: 'Gradient Slide', description: 'Words slide in with color gradient',
    preview: { text: 'FLOW', bg: 'bg-slate-900', style: 'font-black text-lg tracking-wide bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent' } },
  { key: 'outline_only', label: 'Outline Only', description: 'Transparent fill, thick colored outline',
    preview: { text: 'EDGE', bg: 'bg-slate-900', style: 'font-black text-lg tracking-wide', textStroke: '1.5px #f97316' } },
];

const PIPELINE_STEPS = [
  { key: 'generating_script', label: 'Writing Script', icon: Sparkles },
  { key: 'generating_voiceover', label: 'Recording Voiceover', icon: Mic },
  { key: 'generating_timestamps', label: 'Analyzing Timing', icon: Clock },
  { key: 'generating_images', label: 'Creating Visuals', icon: Image },
  { key: 'animating_clips', label: 'Animating Scenes', icon: Video },
  { key: 'generating_music', label: 'Composing Music', icon: Music },
  { key: 'assembling_video', label: 'Assembling Video', icon: Film },
  { key: 'burning_captions', label: 'Burning Captions', icon: Type },
  { key: 'finalizing', label: 'Finalizing', icon: CheckCircle2 },
];

const WIZARD_STEPS = [
  { key: 'niche', label: 'Niche' },
  { key: 'story', label: 'Story' },
  { key: 'script', label: 'Script' },
  { key: 'voice_style', label: 'Voice & Style' },
  { key: 'generate', label: 'Generate' },
];

export default function ShortsFactoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard state
  const [wizardStep, setWizardStep] = useState('niche');
  const [wizardCompleted, setWizardCompleted] = useState([]);

  // Form state
  const [niche, setNiche] = useState(null);
  const [topic, setTopic] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [useCustomVoice, setUseCustomVoice] = useState(false);
  const [captionStyle, setCaptionStyle] = useState('word_pop');
  const [visualStyle, setVisualStyle] = useState('');
  const [brandUsername, setBrandUsername] = useState('');
  const [brands, setBrands] = useState([]);
  const [loraConfig, setLoraConfig] = useState([]);
  const [showLoraPicker, setShowLoraPicker] = useState(false);

  // Pipeline state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [pipelineStep, setPipelineStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [result, setResult] = useState(null);

  // Topic suggestions
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState([]);

  // Script preview & edit
  const [scriptPreview, setScriptPreview] = useState(null);
  const [editedScript, setEditedScript] = useState('');
  const [loadingScriptPreview, setLoadingScriptPreview] = useState(false);

  // Real story sourcing
  const [storyMode, setStoryMode] = useState('custom'); // 'custom' | 'research'
  const [loadingStories, setLoadingStories] = useState(false);
  const [researchedStories, setResearchedStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);

  const pollRef = useRef(null);

  // Load brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await apiFetch('/api/brand/usernames');
        const data = await res.json();
        if (data.usernames?.length) {
          const brandList = data.usernames.map(u =>
            typeof u === 'string' ? { username: u, brand_name: u } : u
          );
          setBrands(brandList);
          setBrandUsername(brandList[0].username);
        }
      } catch (e) {
        console.error('Failed to load brands:', e);
      }
    };
    loadBrands();
  }, []);

  // Auto-select voice when niche changes
  useEffect(() => {
    if (niche) {
      const defaultVoice = VOICE_PRESETS.find(v => v.niches.includes(niche));
      if (defaultVoice) setVoiceId(defaultVoice.id);
    }
  }, [niche]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Auto-generate script when entering script step
  useEffect(() => {
    if (wizardStep === 'script' && !scriptPreview && !loadingScriptPreview && niche && brandUsername) {
      handlePreviewScript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardStep]);

  // Poll job status
  const pollJobStatus = useCallback(async (id) => {
    try {
      const res = await apiFetch(`/api/jobs/public-status?jobId=${id}`);
      const data = await res.json();

      setPipelineStep(data.current_step);
      setCompletedSteps(data.completed_steps || 0);

      if (data.status === 'completed') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setIsGenerating(false);
        setResult(data.output_json || {});
        toast.success('Short video generated!');
      } else if (data.status === 'failed') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setIsGenerating(false);
        toast.error(`Generation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  }, []);

  // Preview script before generation
  const handlePreviewScript = async () => {
    if (!niche || !brandUsername) {
      toast.error('Select a niche and brand first');
      return;
    }

    setLoadingScriptPreview(true);
    try {
      const res = await apiFetch('/api/shorts/preview-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          topic: topic || undefined,
          brand_username: brandUsername,
          story_context: selectedStory?.story_context || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview script');

      setScriptPreview(data.script);
      setEditedScript(data.script.narration_full);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingScriptPreview(false);
    }
  };

  // Generate short
  const handleGenerate = async () => {
    if (!niche || !brandUsername) {
      toast.error('Select a niche and brand');
      return;
    }

    const effectiveVoiceId = useCustomVoice && customVoiceId.trim() ? customVoiceId.trim() : voiceId;

    setIsGenerating(true);
    setResult(null);
    setPipelineStep('generating_script');
    setCompletedSteps(0);

    try {
      const res = await apiFetch('/api/shorts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          topic: topic || undefined,
          brand_username: brandUsername,
          voice_id: effectiveVoiceId || undefined,
          caption_style: captionStyle,
          visual_style: visualStyle || undefined,
          lora_config: loraConfig.length > 0 ? loraConfig : undefined,
          script: editedScript || undefined,
          story_context: selectedStory?.story_context || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start generation');

      setJobId(data.jobId);
      toast.success('Short generation started!');

      // Start polling every 5 seconds
      pollRef.current = setInterval(() => pollJobStatus(data.jobId), 5000);
    } catch (err) {
      toast.error(err.message);
      setIsGenerating(false);
    }
  };

  // Generate topic suggestions
  const handleSuggestTopics = async () => {
    if (!niche || !brandUsername) {
      toast.error('Select a niche and brand first');
      return;
    }

    setLoadingTopics(true);
    try {
      const res = await apiFetch('/api/shorts/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          count: 5,
          brand_username: brandUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuggestedTopics(data.topics || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingTopics(false);
    }
  };

  // Research real stories
  const handleResearchStories = async () => {
    if (!niche || !brandUsername) {
      toast.error('Select a niche and brand first');
      return;
    }

    setLoadingStories(true);
    setResearchedStories([]);
    setSelectedStory(null);
    try {
      const res = await apiFetch('/api/shorts/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          brand_username: brandUsername,
          count: 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find stories');
      setResearchedStories(data.stories || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingStories(false);
    }
  };

  // ── Wizard navigation helpers ───────────────────────────────────────────

  const stepKeys = WIZARD_STEPS.map(s => s.key);
  const currentStepIndex = stepKeys.indexOf(wizardStep);

  const canAdvance = () => {
    switch (wizardStep) {
      case 'niche': return !!niche;
      case 'story': return true;
      case 'script': return true;
      case 'voice_style': return !!(voiceId || (useCustomVoice && customVoiceId.trim()));
      case 'generate': return !!brandUsername;
      default: return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) {
      if (wizardStep === 'niche') toast.error('Please select a niche');
      if (wizardStep === 'voice_style') toast.error('Please select a voice');
      if (wizardStep === 'generate') toast.error('Please select a brand');
      return;
    }
    setWizardCompleted(prev => prev.includes(wizardStep) ? prev : [...prev, wizardStep]);
    if (currentStepIndex < stepKeys.length - 1) {
      setWizardStep(stepKeys[currentStepIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setWizardStep(stepKeys[currentStepIndex - 1]);
    }
  };

  const goToStep = (key) => {
    const targetIndex = stepKeys.indexOf(key);
    if (targetIndex < currentStepIndex || wizardCompleted.includes(key)) {
      setWizardStep(key);
    }
  };

  // Sort voices: recommended first, then the rest
  const sortedVoices = niche
    ? [
        ...VOICE_PRESETS.filter(v => v.niches.includes(niche)),
        ...VOICE_PRESETS.filter(v => !v.niches.includes(niche)),
      ]
    : VOICE_PRESETS;

  const recommendedVoiceIds = niche
    ? new Set(VOICE_PRESETS.filter(v => v.niches.includes(niche)).map(v => v.id))
    : new Set();

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/studio')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Shorts Factory</h1>
              <p className="text-sm text-slate-500">Generate monetizable 60-second vertical videos</p>
            </div>
          </div>
        </div>
      </header>

      {/* White card container with stepper */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Wizard Stepper */}
          <WizardStepper
            steps={WIZARD_STEPS}
            currentStep={wizardStep}
            completedSteps={wizardCompleted}
            onStepClick={goToStep}
          />

          {/* Step Content */}
          <div className="p-6 space-y-6">

            {/* ── Step 1: Niche ──────────────────────────────────────────── */}
            {wizardStep === 'niche' && (
              <div>
                <h2 className="text-sm font-semibold text-slate-800 mb-4">Choose Your Niche</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {NICHES.map(n => {
                    const Icon = n.icon;
                    const selected = niche === n.key;
                    return (
                      <button
                        key={n.key}
                        onClick={() => setNiche(n.key)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-[#2C666E] bg-[#2C666E]/5 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        } cursor-pointer`}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${n.color} flex items-center justify-center mb-2`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="font-semibold text-sm text-slate-800">{n.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{n.description}</div>
                        {selected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#2C666E] rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Story ──────────────────────────────────────────── */}
            {wizardStep === 'story' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">Story Source</h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setStoryMode('custom'); setSelectedStory(null); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        storyMode === 'custom'
                          ? 'bg-[#2C666E] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Custom Topic
                    </button>
                    <button
                      onClick={() => setStoryMode('research')}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        storyMode === 'research'
                          ? 'bg-[#2C666E] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Find Real Stories
                    </button>
                  </div>
                </div>

                {/* Custom Topic Mode */}
                {storyMode === 'custom' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-600">Topic</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSuggestTopics}
                        disabled={loadingTopics}
                        className="text-xs text-[#2C666E]"
                      >
                        {loadingTopics ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        Suggest Topics
                      </Button>
                    </div>

                    <Input
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="Leave empty for auto-generated topic, or type your own..."
                    />

                    {suggestedTopics.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Click to use:</Label>
                        {suggestedTopics.map((t, i) => (
                          <button
                            key={i}
                            onClick={() => { setTopic(t.title); setSuggestedTopics([]); }}
                            className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-[#2C666E]/30 hover:bg-[#2C666E]/5 transition-colors"
                          >
                            <div className="text-sm font-medium text-slate-800">{t.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{t.hook_idea}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Research Stories Mode */}
                {storyMode === 'research' && (
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResearchStories}
                      disabled={loadingStories || !brandUsername}
                      className="w-full border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/5"
                    >
                      {loadingStories ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                          Researching stories...
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5 mr-2" />
                          {researchedStories.length > 0 ? 'Find More Stories' : 'Find Trending Stories'}
                        </>
                      )}
                    </Button>

                    {researchedStories.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">
                          Select a story to use as the basis for your short:
                        </Label>
                        {researchedStories.map((story, i) => {
                          const isSelected = selectedStory === story;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedStory(isSelected ? null : story);
                                setTopic(isSelected ? '' : story.title);
                              }}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? 'border-[#2C666E] bg-[#2C666E]/5 shadow-sm'
                                  : 'border-slate-100 hover:border-[#2C666E]/30 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-slate-800">{story.title}</div>
                                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">{story.summary}</div>
                                  <div className="text-xs text-[#2C666E] mt-1.5 font-medium">{story.angle}</div>
                                </div>
                                {isSelected && (
                                  <div className="flex-shrink-0 w-5 h-5 bg-[#2C666E] rounded-full flex items-center justify-center mt-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              {story.why_viral && (
                                <div className="text-[11px] text-slate-400 mt-2 italic">
                                  {story.why_viral}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedStory && (
                      <div className="bg-[#2C666E]/5 rounded-lg p-3 border border-[#2C666E]/20">
                        <p className="text-xs text-[#2C666E] font-medium">
                          Selected: {selectedStory.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Story context will be passed to the script generator for accuracy.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Script ─────────────────────────────────────────── */}
            {wizardStep === 'script' && (
              <div className="space-y-4">
                {loadingScriptPreview ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-[#2C666E] mb-3" />
                    <p className="text-sm font-medium">Generating script...</p>
                    <p className="text-xs text-slate-400 mt-1">This takes a few seconds</p>
                  </div>
                ) : scriptPreview ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-800">Script Preview</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Edit before generating — this is what the voiceover will say</p>
                      </div>
                      <button
                        onClick={() => { setScriptPreview(null); setEditedScript(''); handlePreviewScript(); }}
                        className="text-xs text-[#2C666E] hover:text-[#07393C] px-2 py-1 rounded hover:bg-[#2C666E]/5 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                      </button>
                    </div>

                    {scriptPreview.title && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Title:</span> {scriptPreview.title}
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-slate-600 mb-1 block">Narration Script</Label>
                      <textarea
                        value={editedScript}
                        onChange={e => setEditedScript(e.target.value)}
                        rows={8}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white resize-y focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]"
                        placeholder="Edit the script narration here..."
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {editedScript.trim().split(/\s+/).filter(Boolean).length} words
                      </p>
                    </div>

                    {scriptPreview.scenes && (
                      <details className="text-xs">
                        <summary className="text-slate-500 cursor-pointer hover:text-slate-700 font-medium">
                          View scene breakdown ({scriptPreview.scenes.length} scenes)
                        </summary>
                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-100">
                          {scriptPreview.scenes.map((scene, i) => (
                            <div key={i} className="text-slate-600">
                              <span className="text-[#2C666E] font-medium">[{scene.role}]</span>{' '}
                              {scene.narration_segment}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Sparkles className="w-8 h-8 text-slate-300 mb-3" />
                    <p className="text-sm font-medium">No script generated yet</p>
                    <Button
                      onClick={handlePreviewScript}
                      disabled={!brandUsername}
                      className="mt-3 bg-[#2C666E] hover:bg-[#07393C]"
                      size="sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Generate Script
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Voice & Style ──────────────────────────────────── */}
            {wizardStep === 'voice_style' && (
              <div className="space-y-6">
                <h2 className="text-sm font-semibold text-slate-800">Voice & Style</h2>

                {/* Voice Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-600 font-medium">Voice</Label>
                    <button
                      onClick={() => setUseCustomVoice(!useCustomVoice)}
                      className="text-[11px] text-[#2C666E] hover:underline"
                    >
                      {useCustomVoice ? 'Use preset voice' : 'Use custom voice ID'}
                    </button>
                  </div>

                  {useCustomVoice ? (
                    <div className="space-y-1.5">
                      <Input
                        value={customVoiceId}
                        onChange={e => setCustomVoiceId(e.target.value)}
                        placeholder="Paste any ElevenLabs voice ID..."
                        className="font-mono text-xs"
                      />
                      <p className="text-[11px] text-slate-400">
                        Find voice IDs at elevenlabs.io/voice-library
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-2">
                      {sortedVoices.map(v => {
                        const isRecommended = recommendedVoiceIds.has(v.id);
                        const selected = voiceId === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setVoiceId(v.id)}
                            className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                              selected
                                ? 'border-[#2C666E] bg-[#2C666E]/5'
                                : 'border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {isRecommended && (
                              <span className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 bg-[#2C666E] text-white rounded-full font-medium">
                                Recommended
                              </span>
                            )}
                            <div className="text-sm font-semibold text-slate-800">{v.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{v.description}</div>
                            {selected && (
                              <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-[#2C666E] rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Caption Style */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600 font-medium">Caption Style</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CAPTION_STYLES.map(s => {
                      const selected = captionStyle === s.key;
                      const p = s.preview;
                      return (
                        <button
                          key={s.key}
                          onClick={() => setCaptionStyle(s.key)}
                          className={`rounded-lg border-2 text-left transition-all overflow-hidden ${
                            selected
                              ? 'border-[#2C666E] ring-1 ring-[#2C666E]/30'
                              : 'border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {/* Visual preview swatch */}
                          {p && (
                            <div className={`${p.bg} flex items-center justify-center py-3 px-2`}>
                              <span
                                className={p.style}
                                style={p.textStroke ? { WebkitTextStroke: p.textStroke } : undefined}
                              >
                                {p.text}
                              </span>
                            </div>
                          )}
                          <div className="p-2">
                            <div className="text-xs font-semibold text-slate-800">{s.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Style */}
                <StyleGrid value={visualStyle} onChange={setVisualStyle} />

                {/* LoRA Style (optional) */}
                <div className="border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowLoraPicker(!showLoraPicker)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-sm font-semibold text-slate-800">LoRA Style Models</span>
                      {loraConfig.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#2C666E] text-white rounded-full font-medium">
                          {loraConfig.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {loraConfig.length > 0 ? 'Using FLUX 2' : 'Optional'}
                      </span>
                      {showLoraPicker ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {showLoraPicker && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500 mb-3">
                        Add trained LoRA models for consistent visual styles or branded characters.
                        When enabled, images use FLUX 2 Dev with LoRA weights.
                      </p>
                      <LoRAPicker
                        value={loraConfig}
                        onChange={setLoraConfig}
                        brandUsername={brandUsername}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 5: Generate ───────────────────────────────────────── */}
            {wizardStep === 'generate' && (
              <div className="space-y-6">
                {/* Brand Selector */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Brand</Label>
                  {brands.length > 0 ? (
                    <select
                      value={brandUsername}
                      onChange={e => setBrandUsername(e.target.value)}
                      disabled={isGenerating}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      {brands.map(b => <option key={b.username} value={b.username}>{b.brand_name || b.username}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No brands found. Create one in Settings first.</p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Summary</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-500">Niche</span>
                    <span className="text-slate-800 font-medium">{NICHES.find(n => n.key === niche)?.label || '—'}</span>
                    <span className="text-slate-500">Topic</span>
                    <span className="text-slate-800 font-medium truncate">{topic || 'Auto-generated'}</span>
                    <span className="text-slate-500">Voice</span>
                    <span className="text-slate-800 font-medium">
                      {useCustomVoice && customVoiceId.trim()
                        ? `Custom (${customVoiceId.trim().slice(0, 10)}...)`
                        : VOICE_PRESETS.find(v => v.id === voiceId)?.name || '—'}
                    </span>
                    <span className="text-slate-500">Captions</span>
                    <span className="text-slate-800 font-medium">{CAPTION_STYLES.find(s => s.key === captionStyle)?.label || '—'}</span>
                    {visualStyle && (
                      <>
                        <span className="text-slate-500">Visual Style</span>
                        <span className="text-slate-800 font-medium">{visualStyle}</span>
                      </>
                    )}
                    <span className="text-slate-500">Script</span>
                    <span className="text-slate-800 font-medium">{editedScript ? 'Custom' : 'Auto-generated'}</span>
                    {loraConfig.length > 0 && (
                      <>
                        <span className="text-slate-500">LoRA Models</span>
                        <span className="text-slate-800 font-medium">{loraConfig.length} selected</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                {!isGenerating && !result && (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !brandUsername}
                    className="w-full py-6 text-lg bg-[#2C666E] hover:bg-[#07393C] rounded-xl shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Short
                  </Button>
                )}

                {/* Pipeline Progress */}
                {isGenerating && pipelineStep && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-slate-800">Pipeline Progress</h2>
                    <div className="space-y-2">
                      {PIPELINE_STEPS.map((step, i) => {
                        const StepIcon = step.icon;
                        const stepIndex = PIPELINE_STEPS.findIndex(s => s.key === pipelineStep);
                        const isCompleted = i < stepIndex || (pipelineStep === 'done' && i <= stepIndex);
                        const isCurrent = step.key === pipelineStep;
                        const isPending = i > stepIndex;

                        return (
                          <div
                            key={step.key}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                              isCurrent ? 'bg-[#2C666E]/5' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted ? 'bg-green-100 text-green-600'
                                : isCurrent ? 'bg-[#2C666E] text-white'
                                  : 'bg-slate-100 text-slate-400'
                            }`}>
                              {isCurrent ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <StepIcon className="w-4 h-4" />
                              )}
                            </div>
                            <span className={`text-sm ${
                              isCompleted ? 'text-green-700 font-medium'
                                : isCurrent ? 'text-[#2C666E] font-semibold'
                                  : 'text-slate-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2C666E] to-[#90DDF0] transition-all duration-500 rounded-full"
                        style={{ width: `${(completedSteps / 9) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                      Step {completedSteps + 1} of 9
                    </p>
                  </div>
                )}

                {/* Result */}
                {result && result.video_url && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-800">{result.title || 'Your Short'}</h2>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Ready</span>
                    </div>

                    {/* Video Player */}
                    <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-w-[320px] mx-auto">
                      <video
                        src={result.video_url}
                        controls
                        className="w-full h-full object-contain"
                        playsInline
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <a
                        href={result.video_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </a>
                      <Button
                        onClick={() => {
                          setResult(null);
                          setJobId(null);
                          setPipelineStep(null);
                          setCompletedSteps(0);
                          setLoraConfig([]);
                          setShowLoraPicker(false);
                          setWizardStep('niche');
                          setWizardCompleted([]);
                          setScriptPreview(null);
                          setEditedScript('');
                          setNiche(null);
                          setTopic('');
                          setSelectedStory(null);
                          setVisualStyle('');
                        }}
                        className="flex-1 bg-[#2C666E] hover:bg-[#07393C]"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Make Another
                      </Button>
                    </div>

                    {/* Campaign link */}
                    {result.campaign_id && (
                      <button
                        onClick={() => navigate('/campaigns')}
                        className="text-xs text-[#2C666E] hover:underline w-full text-center"
                      >
                        View in Campaigns
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation Buttons ─────────────────────────────────────── */}
            {!isGenerating && !result && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {currentStepIndex > 0 ? (
                  <Button
                    variant="outline"
                    onClick={goBack}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {wizardStep !== 'generate' ? (
                  <Button
                    onClick={goNext}
                    disabled={!canAdvance()}
                    className="gap-1.5 bg-[#2C666E] hover:bg-[#07393C]"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
