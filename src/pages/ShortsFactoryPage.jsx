import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   description: 'Deep, authoritative male',  niches: ['ai_tech_news', 'finance_money', 'history_did_you_know', 'conspiracy_mystery', 'business_entrepreneur'] },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, inspiring male',      niches: ['motivation_self_help', 'relationships_dating'] },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde',  description: 'Deep gravelly male',        niches: ['scary_horror', 'true_crime'] },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, eerie female',        niches: ['scary_horror', 'true_crime', 'conspiracy_mystery'] },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',   description: 'Young energetic male',      niches: ['ai_tech_news', 'motivation_self_help', 'science_nature', 'health_fitness', 'gaming_popculture'] },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',  description: 'Young clear female',        niches: ['finance_money', 'ai_tech_news', 'health_fitness', 'relationships_dating'] },
];

const CAPTION_STYLES = [
  { key: 'word_pop', label: 'Word Pop', description: 'Bold white with black outline' },
  { key: 'karaoke_glow', label: 'Karaoke Glow', description: 'Yellow with heavy shadow' },
  { key: 'word_highlight', label: 'Subtle', description: 'Clean white, minimal outline' },
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

export default function ShortsFactoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [niche, setNiche] = useState(null);
  const [topic, setTopic] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [captionStyle, setCaptionStyle] = useState('word_pop');
  const [brandUsername, setBrandUsername] = useState('');
  const [brands, setBrands] = useState([]);
  const [loraConfig, setLoraConfig] = useState([]);
  const [showLoraPicker, setShowLoraPicker] = useState(false);

  // Pipeline state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [result, setResult] = useState(null);

  // Topic suggestions
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState([]);

  const pollRef = useRef(null);

  // Load brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await apiFetch('/api/brand/usernames');
        const data = await res.json();
        if (data.usernames?.length) {
          // API returns [{username, brand_name}] objects
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

  // Poll job status
  const pollJobStatus = useCallback(async (id) => {
    try {
      const res = await apiFetch(`/api/jobs/public-status?jobId=${id}`);
      const data = await res.json();

      setCurrentStep(data.current_step);
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

  // Generate short
  const handleGenerate = async () => {
    if (!niche || !brandUsername) {
      toast.error('Select a niche and brand');
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setCurrentStep('generating_script');
    setCompletedSteps(0);

    try {
      const res = await apiFetch('/api/shorts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          topic: topic || undefined,
          brand_username: brandUsername,
          voice_id: voiceId || undefined,
          caption_style: captionStyle,
          lora_config: loraConfig.length > 0 ? loraConfig : undefined,
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

  const filteredVoices = niche
    ? VOICE_PRESETS.filter(v => v.niches.includes(niche))
    : VOICE_PRESETS;

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

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Brand Selector */}
        {brands.length > 1 && (
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <Label className="text-sm font-semibold text-slate-700">Brand</Label>
            <select
              value={brandUsername}
              onChange={e => setBrandUsername(e.target.value)}
              disabled={isGenerating}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              {brands.map(b => <option key={b.username} value={b.username}>{b.brand_name || b.username}</option>)}
            </select>
          </div>
        )}

        {/* Niche Selector */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Choose Your Niche</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NICHES.map(n => {
              const Icon = n.icon;
              const selected = niche === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => !isGenerating && setNiche(n.key)}
                  disabled={isGenerating}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? 'border-[#2C666E] bg-[#2C666E]/5 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  } ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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

        {/* Topic */}
        {niche && (
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Topic</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestTopics}
                disabled={loadingTopics || isGenerating}
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
              disabled={isGenerating}
            />

            {suggestedTopics.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Click to use:</Label>
                {suggestedTopics.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setTopic(t.title); setSuggestedTopics([]); }}
                    disabled={isGenerating}
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

        {/* Voice & Style */}
        {niche && (
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Voice & Style</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Voice */}
              <div>
                <Label className="text-xs text-slate-600">Voice</Label>
                <select
                  value={voiceId}
                  onChange={e => setVoiceId(e.target.value)}
                  disabled={isGenerating}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  {filteredVoices.map(v => (
                    <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                  ))}
                </select>
              </div>

              {/* Caption Style */}
              <div>
                <Label className="text-xs text-slate-600">Caption Style</Label>
                <select
                  value={captionStyle}
                  onChange={e => setCaptionStyle(e.target.value)}
                  disabled={isGenerating}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  {CAPTION_STYLES.map(s => (
                    <option key={s.key} value={s.key}>{s.label} — {s.description}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* LoRA Style (optional) */}
        {niche && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <button
              onClick={() => !isGenerating && setShowLoraPicker(!showLoraPicker)}
              disabled={isGenerating}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
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
              <div className="px-5 pb-5 border-t border-slate-100 pt-4">
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
        )}

        {/* Generate Button */}
        {niche && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !brandUsername}
            className="w-full py-6 text-lg bg-[#2C666E] hover:bg-[#07393C] rounded-xl shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Short
              </>
            )}
          </Button>
        )}

        {/* Pipeline Progress */}
        {isGenerating && currentStep && (
          <div className="bg-white rounded-2xl p-6 border shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Pipeline Progress</h2>
            <div className="space-y-2">
              {PIPELINE_STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const stepIndex = PIPELINE_STEPS.findIndex(s => s.key === currentStep);
                const isCompleted = i < stepIndex || (currentStep === 'done' && i <= stepIndex);
                const isCurrent = step.key === currentStep;
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
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2C666E] to-[#90DDF0] transition-all duration-500 rounded-full"
                style={{ width: `${(completedSteps / 9) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Step {completedSteps + 1} of 9
            </p>
          </div>
        )}

        {/* Result */}
        {result && result.video_url && (
          <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
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
                  setCurrentStep(null);
                  setCompletedSteps(0);
                  setLoraConfig([]);
                  setShowLoraPicker(false);
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
      </main>
    </div>
  );
}
