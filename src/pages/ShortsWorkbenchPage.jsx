import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Play, Pause, RotateCcw, Check, ChevronDown, ChevronUp,
  Eye, Wand2, Music, Volume2, Download, ImageIcon, Film, Scissors, AlertTriangle, Link, X, FolderOpen, Search, RefreshCw, Lightbulb, Users, Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
import StyleGrid from '@/components/ui/StyleGrid';
import { GEMINI_VOICES, FEATURED_VOICES } from '@/lib/geminiVoices';
import { FRAMEWORK_CARDS, getFrameworksForNiche } from '@/lib/videoStyleFrameworks';
import { TOPIC_SUGGESTIONS } from '@/lib/topicSuggestions';
import LibraryModal from '@/components/modals/LibraryModal';
import MotionReferenceInput from '@/components/MotionReferenceInput';
import CameraControlPanel from '@/components/shorts/CameraControlPanel';
import CharacterPicker from '@/components/ui/CharacterPicker';
import RepurposePanel from '@/components/shorts/RepurposePanel';

// ── Constants ──────────────────────────────────────────────────────────────

const FLF_MODELS = ['fal_veo3', 'fal_veo3_lite', 'fal_kling_v3', 'fal_kling_o3'];
const MULTI_SHOT_MODELS = ['fal_kling_v3', 'fal_kling_o3'];
const SPEED_OPTIONS = [0.75, 0.85, 0.9, 1.0, 1.1, 1.25, 1.3, 1.4];

const NICHE_VISUAL_MOODS = {
  ai_tech_news: 'Clean futuristic aesthetic, cool blue and white tones, sleek technology, holographic displays, neon accents',
  finance_money: 'Professional dark backgrounds, gold and green accents, financial charts, luxury textures, wealth imagery',
  motivation_self_help: 'Warm golden-hour lighting, sunrise/sunset tones, silhouettes overcoming obstacles, hopeful upward compositions',
  scary_horror: 'Dark oppressive atmosphere, deep shadows, desaturated cold tones, fog and mist, flickering dim light, horror film color grading',
  history_did_you_know: 'Sepia and warm amber tones, aged parchment textures, dramatic oil painting lighting, historical architecture',
  true_crime: 'Dark noir aesthetic, high-contrast with red accents, crime scene tape, rain-slicked streets, surveillance footage grain',
  science_nature: 'Vivid macro photography, deep ocean blues and electric greens, laboratory aesthetics, cosmic nebula colors',
  relationships_dating: 'Warm soft lighting, intimate close-ups, bokeh backgrounds, romantic golden tones, emotional connection',
  health_fitness: 'High-energy gym lighting, dynamic action shots, bold vibrant colors, motivational energy',
  gaming_popculture: 'Neon-lit dark environments, RGB gaming aesthetics, vibrant purple and electric blue, retro-futuristic',
  conspiracy_mystery: 'Shadowy dimly-lit rooms, redacted documents, pinboard with red string, surveillance grain, paranoid aesthetic',
  business_entrepreneur: 'Sleek modern offices, city skyline views, sharp professional attire, corporate power aesthetic',
  food_cooking: 'Warm kitchen lighting, rich saturated food colors, steam and sizzle, rustic surfaces, appetizing close-ups',
  travel_adventure: 'Breathtaking landscape vistas, golden hour travel photography, vibrant local culture, aerial drone perspectives',
  psychology_mindblown: 'Abstract thought visualizations, surreal dreamlike imagery, optical illusions, moody introspective lighting',
  space_cosmos: 'Deep space blacks with nebula colors, planet surfaces, star fields, awe-inspiring celestial imagery',
  animals_wildlife: 'Lush jungle greens, savanna golden light, wildlife close-ups with intense eye contact, nature documentary',
  sports_athletes: 'Stadium floodlights, action freeze-frames, dramatic slow-motion captures, championship trophy gold',
  education_learning: 'Clean educational infographic style, chalkboard aesthetics, bright curious colors, engaging classroom energy',
  paranormal_ufo: 'Eerie night skies, grainy VHS footage aesthetic, mysterious lights in darkness, alien encounter atmosphere',
};

// Niche-specific voice style instructions (from SHORTS_TEMPLATES voice_pacing)
const NICHE_VOICE_STYLES = {
  ai_tech_news: 'Speak with clear, professional authority. Maintain a steady, engaging pace. Emphasize key insights naturally. Sound knowledgeable and trustworthy, sharing important developments with measured confidence.',
  finance_money: 'Speak with calm, assured confidence. Use a measured pace that allows numbers and concepts to land clearly. Sound like a financial advisor offering valuable perspective on practical matters.',
  motivation_self_help: 'Speak warmly and conversationally. Vary your pace slightly to emphasize key insights. Sound genuine and relatable, like a trusted mentor sharing helpful perspective.',
  scary_horror: 'Speak in a measured, deliberate tone with natural emphasis. Let moments of tension build through pacing and tone shifts. Sound thoughtful and composed, drawing listeners into the narrative.',
  history_did_you_know: 'Speak with genuine interest and engagement. Maintain a conversational pace with natural emphasis on interesting details. Sound like a knowledgeable friend sharing fascinating stories.',
  true_crime: 'Speak with calm, professional authority. Use clear pacing and measured emphasis. Sound objective and informative, presenting facts with appropriate gravity.',
  science_nature: 'Speak with genuine enthusiasm about the subject matter. Maintain clear pacing with natural emphasis on interesting findings. Sound like you find the topic genuinely compelling.',
  relationships_dating: 'Speak warmly and conversationally, like a thoughtful friend. Use natural pacing with gentle emphasis on key points. Sound understanding and relatable.',
  health_fitness: 'Speak with clear, confident authority. Maintain a steady, accessible pace. Sound knowledgeable and supportive, offering practical guidance with genuine interest.',
  gaming_popculture: 'Speak with natural enthusiasm and genuine interest. Use conversational pacing with natural emphasis on noteworthy moments. Sound like someone who cares about the subject.',
  conspiracy_mystery: 'Speak with measured, deliberate confidence. Use steady pacing with thoughtful emphasis. Sound curious and focused, exploring ideas with calm investigation.',
  business_entrepreneur: 'Speak with clear, confident authority. Maintain steady pacing with natural emphasis on key points. Sound experienced and knowledgeable, like a seasoned advisor sharing valuable insights.',
  food_cooking: 'Speak with warm enthusiasm and genuine appreciation. Use conversational pacing with natural emphasis on appealing details. Sound like you enjoy sharing culinary insights.',
  travel_adventure: 'Speak with genuine excitement and appreciation. Maintain engaging pacing with natural emphasis on compelling details. Sound like someone who loves exploring and wants to share that wonder.',
  psychology_mindblown: 'Speak with thoughtful engagement and genuine interest. Use conversational pacing with emphasis on interesting insights. Sound like you find human behavior genuinely fascinating.',
  space_cosmos: 'Speak with genuine wonder and clear authority. Maintain steady pacing that allows big ideas to land. Sound knowledgeable and awestruck, sharing cosmic perspective with authentic interest.',
  animals_wildlife: 'Speak with genuine appreciation and interest. Use conversational pacing with natural emphasis on fascinating animal details. Sound like you care about nature and wildlife.',
  sports_athletes: 'Speak with authentic enthusiasm and clear authority. Maintain engaging pacing with natural emphasis on compelling moments. Sound genuinely interested in the sport and athletes.',
  education_learning: 'Speak with warmth and genuine enthusiasm. Maintain conversational pacing that makes ideas accessible. Sound like an engaging educator who finds the subject truly interesting.',
  paranormal_ufo: 'Speak with measured, thoughtful curiosity. Use steady pacing with calm emphasis on intriguing details. Sound genuinely interested in mysteries while remaining composed and analytical.',
};

// Universal voice style quick-picks (niche-independent)
const VOICE_STYLE_PRESETS = [
  { label: 'Documentary', value: 'Speak with clear, authoritative confidence. Maintain steady pacing with natural emphasis. Sound knowledgeable and trustworthy, presenting information with measured clarity.' },
  { label: 'Storyteller', value: 'Speak conversationally with natural variation. Use pacing shifts to emphasize key moments. Sound genuinely engaged with the narrative.' },
  { label: 'News Anchor', value: 'Speak with clear, professional authority. Maintain a steady, confident pace. Sound knowledgeable and composed, delivering information with appropriate emphasis.' },
  { label: 'Whispering', value: 'Speak softly and intimately. Use gentle pacing with occasional emphasis. Sound thoughtful and drawn in.' },
  { label: 'High Energy', value: 'Speak with genuine enthusiasm and commitment. Maintain an engaging pace with natural emphasis. Sound genuinely invested in the subject matter.' },
  { label: 'Teacher', value: 'Speak with warmth and engagement. Build ideas from simple to complex with natural pacing. Sound like someone who finds the subject genuinely interesting.' },
  { label: 'Campfire', value: 'Speak conversationally like sharing a story. Vary your pacing naturally. Sound genuine and present, inviting the listener in.' },
  { label: 'Podcast Host', value: 'Speak conversationally and directly, like talking to a friend. Use natural pacing and emphasis. Sound genuine, relatable, and engaged.' },
];

const NICHES = [
  { key: 'ai_tech_news', label: 'AI/Tech', icon: '🤖' },
  { key: 'finance_money', label: 'Finance', icon: '💰' },
  { key: 'motivation_self_help', label: 'Motivation', icon: '🧠' },
  { key: 'scary_horror', label: 'Horror', icon: '💀' },
  { key: 'history_did_you_know', label: 'History', icon: '📜' },
  { key: 'true_crime', label: 'True Crime', icon: '🔍' },
  { key: 'science_nature', label: 'Science', icon: '🔬' },
  { key: 'relationships_dating', label: 'Relationships', icon: '❤️' },
  { key: 'health_fitness', label: 'Fitness', icon: '💪' },
  { key: 'gaming_popculture', label: 'Gaming', icon: '🎮' },
  { key: 'conspiracy_mystery', label: 'Conspiracy', icon: '👁️' },
  { key: 'business_entrepreneur', label: 'Business', icon: '💼' },
  { key: 'food_cooking', label: 'Food', icon: '🍳' },
  { key: 'travel_adventure', label: 'Travel', icon: '✈️' },
  { key: 'psychology_mindblown', label: 'Psychology', icon: '🧩' },
  { key: 'space_cosmos', label: 'Space', icon: '🚀' },
  { key: 'animals_wildlife', label: 'Animals', icon: '🐾' },
  { key: 'sports_athletes', label: 'Sports', icon: '⚽' },
  { key: 'education_learning', label: 'Education', icon: '📚' },
  { key: 'paranormal_ufo', label: 'Paranormal', icon: '👽' },
];

const STEPS = [
  { key: 'script', label: 'Script & Voice', num: 1 },
  { key: 'timing', label: 'Timing & Music', num: 2 },
  { key: 'frames', label: 'Keyframes', num: 3 },
  { key: 'clips', label: 'Video Clips', num: 4 },
  { key: 'assemble', label: 'Assemble', num: 5 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const cn = (...classes) => classes.filter(Boolean).join(' ');
const isFLF = (model) => FLF_MODELS.includes(model);

/** Parse API response with proper error handling for non-OK status codes */
async function parseApiResponse(res) {
  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try { const body = await res.json(); if (body.error) msg = body.error; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function getVisualStylePrompt(key) {
  for (const cat of STYLE_CATEGORIES) {
    const found = cat.styles.find(s => s.value === key);
    if (found) return found.promptText;
  }
  return '';
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function StepRail({ current, completed, onSelect }) {
  const [shake, setShake] = useState(null);
  const handleClick = (s) => {
    const isDone = completed.includes(s.key);
    const isCurrent = current === s.key;
    if (isDone || isCurrent) { onSelect(s.key); return; }
    // Shake the button to indicate it's locked
    setShake(s.key);
    setTimeout(() => setShake(null), 600);
  };
  return (
    <div className="flex gap-1 bg-slate-800/50 rounded-xl p-3 border border-slate-700/40 mb-6 overflow-x-auto">
      {STEPS.map((s) => {
        const isCurrent = current === s.key;
        const isDone = completed.includes(s.key);
        return (
          <button key={s.key} onClick={() => handleClick(s)}
            title={!isDone && !isCurrent ? 'Complete the current step first' : ''}
            className={cn(
              'flex-1 min-w-[100px] rounded-lg px-3 py-2 text-center transition-all border-2',
              isCurrent && 'bg-[#2C666E] text-white border-[#2C666E]',
              isDone && !isCurrent && 'bg-emerald-900/30 text-emerald-400 border-emerald-500 cursor-pointer',
              !isCurrent && !isDone && 'bg-slate-800/40 text-slate-400 border-transparent cursor-default',
              shake === s.key && 'animate-[shake_0.5s_ease-in-out]',
            )}>
            <div className="text-[10px] font-bold uppercase tracking-wider">Step {s.num}</div>
            <div className="text-xs font-semibold mt-0.5">{s.label}</div>
          </button>
        );
      })}
    </div>
  );
}

function CostBadge({ amount, label }) {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-900/30 border border-amber-700/40 text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-semibold">
      ${typeof amount === 'number' ? amount.toFixed(2) : amount}{label && ` · ${label}`}
    </span>
  );
}

function Tag({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-700/40 text-slate-400',
    teal: 'bg-emerald-900/30 text-emerald-400',
    amber: 'bg-amber-900/30 text-amber-400',
    red: 'bg-red-900/30 text-red-400',
    blue: 'bg-blue-900/30 text-blue-400',
  };
  return <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', colors[color])}>{children}</span>;
}

function Panel({ title, right, children }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/40 mb-5 overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-slate-700/30 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-100">{title}</h2>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function AudioPlayer({ url, speed, onSpeedChange }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.playbackRate = speed; audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
      <audio ref={audioRef} src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => { if (audioRef.current) audioRef.current.playbackRate = speed; }}
      />
      <div className="flex items-center gap-3">
        <button onClick={toggle} className="w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center flex-shrink-0">
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; if (audioRef.current) audioRef.current.currentTime = pct * duration; }}>
            <div className="h-full bg-[#2C666E] rounded-full transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono tabular-nums w-20 text-right">
          {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
        </span>
      </div>
      {onSpeedChange && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] text-slate-400 font-semibold mr-1">Speed:</span>
          {SPEED_OPTIONS.map(s => (
            <button key={s} onClick={() => { onSpeedChange(s); if (audioRef.current) audioRef.current.playbackRate = s; }}
              className={cn('px-2 py-0.5 rounded text-[10px] font-bold border transition-all',
                speed === s ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-slate-800/40 text-slate-400 border-slate-700/40 hover:border-slate-600/50')}>
              {s}x
            </button>
          ))}
          <span className="text-[10px] text-slate-400 ml-2">
            Effective duration: {duration ? `${(duration / speed).toFixed(1)}s` : '—'}
          </span>
        </div>
      )}
    </div>
  );
}

function FramePair({ startUrl, endUrl, startLabel, endLabel, onRegenStart, onRegenEnd, loading }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center max-w-md mx-auto">
      <div className="border border-slate-700/40 rounded-lg overflow-hidden">
        {startUrl ? (
          <img src={startUrl} alt="Start frame" className="w-full aspect-[9/16] object-cover" />
        ) : (
          <div className="w-full aspect-[9/16] bg-slate-800/40 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-600" />
          </div>
        )}
        <div className="px-2 py-1.5 bg-emerald-900/30 text-center border-t border-emerald-700/40">
          <span className="text-[9px] font-bold text-emerald-400 uppercase">{startLabel || 'Start Frame'}</span>
        </div>
        {startUrl && (
          <div className="px-2 py-1 flex justify-center border-t border-slate-700/30">
            <button onClick={onRegenStart} disabled={loading} className="text-[9px] text-[#2C666E] font-semibold hover:underline disabled:opacity-50">
              <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" />Redo
            </button>
          </div>
        )}
      </div>

      <div className="text-lg text-slate-400">→</div>

      <div className="border border-slate-700/40 rounded-lg overflow-hidden">
        {endUrl ? (
          <img src={endUrl} alt="End frame" className="w-full aspect-[9/16] object-cover" />
        ) : (
          <div className="w-full aspect-[9/16] bg-slate-800/40 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-600" />
          </div>
        )}
        <div className="px-2 py-1.5 bg-amber-900/30 text-center border-t border-amber-700/40">
          <span className="text-[9px] font-bold text-amber-400 uppercase">{endLabel || 'End Frame'}</span>
        </div>
        {endUrl && (
          <div className="px-2 py-1 flex justify-center border-t border-slate-100">
            <button onClick={onRegenEnd} disabled={loading} className="text-[9px] text-[#2C666E] font-semibold hover:underline disabled:opacity-50">
              <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" />Redo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SingleFrame({ url, label, onRegen, loading }) {
  return (
    <div className="border-2 border-slate-700/40 rounded-xl overflow-hidden max-w-[200px]">
      {url ? (
        <img src={url} alt={label} className="w-full aspect-[9/16] object-cover" />
      ) : (
        <div className="w-full aspect-[9/16] bg-slate-800/40 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-600" />
        </div>
      )}
      <div className="px-3 py-2 bg-slate-800/40 text-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase block">{label}</span>
        {url && (
          <button onClick={onRegen} disabled={loading}
            className="mt-1.5 px-3 py-1.5 bg-[#2C666E] text-white rounded-lg text-[10px] font-bold disabled:opacity-50 hover:bg-[#234f56] transition-colors w-full">
            <RotateCcw className="w-3 h-3 inline mr-1" />Regenerate
          </button>
        )}
      </div>
    </div>
  );
}

function ReferenceImageInput({ sceneIdx, sceneRefs, setSceneRefs, prevFrameUrl, prevLabel, onOpenLibrary }) {
  const [showOptions, setShowOptions] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const ref = sceneRefs[sceneIdx];

  const setRef = (url, source) => { setSceneRefs(prev => ({ ...prev, [sceneIdx]: { url, source } })); setShowOptions(false); setShowUrlInput(false); };
  const clearRef = () => setSceneRefs(prev => { const n = { ...prev }; delete n[sceneIdx]; return n; });

  if (ref?.url) {
    return (
      <div className="flex items-center gap-2.5 mt-2 bg-blue-900/30 border border-blue-700/40 rounded-lg p-2">
        <img src={ref.url} alt="Reference" className="w-10 h-14 object-cover rounded border border-blue-700/40" />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold text-blue-400 uppercase">I2I Reference ({ref.source})</div>
          <div className="text-[9px] text-blue-300 truncate">{ref.url.split('/').pop()}</div>
        </div>
        <button onClick={() => { clearRef(); setShowOptions(true); }}
          className="text-[9px] text-blue-400 hover:text-blue-300 font-medium">Change</button>
        <button onClick={clearRef} className="p-1 text-blue-400 hover:text-red-500"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  if (showUrlInput) {
    return (
      <div className="mt-2 flex gap-1.5 items-center">
        <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste image URL..."
          className="flex-1 border border-slate-700/40 bg-slate-900 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E]/20 outline-none" autoFocus />
        <button onClick={() => { if (urlInput.trim()) { setRef(urlInput.trim(), 'url'); setUrlInput(''); } }}
          disabled={!urlInput.trim()}
          className="px-2.5 py-1.5 bg-[#2C666E] text-white rounded-lg text-[9px] font-semibold disabled:opacity-50">Use</button>
        <button onClick={() => { setShowUrlInput(false); setShowOptions(true); }}
          className="px-2 py-1.5 text-slate-400 text-[9px] hover:text-slate-200">Back</button>
      </div>
    );
  }

  if (!showOptions) {
    return (
      <div className="mt-2">
        <button onClick={() => setShowOptions(true)}
          className="text-[10px] text-slate-400 font-medium hover:text-[#2C666E] flex items-center gap-1 transition-colors">
          <ImageIcon className="w-3 h-3" />Add reference image (I2I)
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-1.5 flex-wrap items-center">
      <span className="text-[9px] font-semibold text-slate-400 uppercase">Ref:</span>
      {prevFrameUrl && (
        <button onClick={() => setRef(prevFrameUrl, prevLabel || 'prev scene')}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-400 rounded-md text-[9px] font-semibold hover:bg-blue-900/50 border border-blue-700/40 transition-colors">
          <Film className="w-2.5 h-2.5" />{prevLabel || 'Prev frame'}
        </button>
      )}
      <button onClick={() => onOpenLibrary?.(sceneIdx)}
        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/30 text-amber-400 rounded-md text-[9px] font-semibold hover:bg-amber-900/50 border border-amber-700/40 transition-colors">
        <FolderOpen className="w-2.5 h-2.5" />Library
      </button>
      <button onClick={() => { setShowOptions(false); setShowUrlInput(true); }}
        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800/40 text-slate-400 rounded-md text-[9px] font-semibold hover:bg-slate-800/60 border border-slate-700/40 transition-colors">
        <Link className="w-2.5 h-2.5" />Paste URL
      </button>
      <button onClick={() => setShowOptions(false)} className="text-[9px] text-slate-400 hover:text-slate-200 ml-1">Cancel</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ShortsWorkbenchPage() {
  const navigate = useNavigate();

  // ── Navigation state ────────────────────────────────────────────
  const [step, setStep] = useState('script');
  const [completed, setCompleted] = useState([]);
  const goTo = (s) => { setStep(s); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const completeAndGo = (next) => {
    setCompleted(prev => [...new Set([...prev, step])]);
    goTo(next);
  };

  // ── Step 1: Script & Voice ──────────────────────────────────────
  const [niche, setNiche] = useState('');
  const [topic, setTopic] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [framework, setFramework] = useState(null);
  const [duration, setDuration] = useState(60);
  const [topicL1, setTopicL1] = useState('');
  const [topicL2, setTopicL2] = useState('');
  const [topicL3, setTopicL3] = useState('');
  const [showTopicFunnel, setShowTopicFunnel] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchedStories, setResearchedStories] = useState([]);
  const [selectedStoryIdx, setSelectedStoryIdx] = useState(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [creativeMode, setCreativeMode] = useState(false); // When OFF, research is required before script generation
  const [script, setScript] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [geminiVoice, setGeminiVoice] = useState('Perseus');
  const [styleInstructions, setStyleInstructions] = useState('Speak with authoritative documentary narrator confidence. Drive forward with momentum. Emphasize reveals dramatically. Keep a compelling pace.');
  const [voiceoverUrl, setVoiceoverUrl] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.15);
  const [voiceApproved, setVoiceApproved] = useState(false);
  const [previewVoiceLoading, setPreviewVoiceLoading] = useState(null); // voice ID being previewed, or null
  const [previewAudio, setPreviewAudio] = useState(null); // ref to currently playing preview audio

  // ── Avatar Mode ─────────────────────────────────────────────────
  const [avatarMode, setAvatarMode] = useState(false);
  const [avatarSubjectId, setAvatarSubjectId] = useState(null);
  const [avatarSubjectName, setAvatarSubjectName] = useState('');
  const [avatarSubjects, setAvatarSubjects] = useState([]); // fetched from API
  const [avatarPortraitUrl, setAvatarPortraitUrl] = useState(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [avatarLipsyncUrl, setAvatarLipsyncUrl] = useState(null);
  const [avatarStage, setAvatarStage] = useState(null); // 'portrait' | 'animating' | 'lipsyncing' | 'done' | null
  const [avatarLoading, setAvatarLoading] = useState(false);

  // ── Step 2: Timing & Music ──────────────────────────────────────
  const [blocks, setBlocks] = useState([]);
  const [timingLoading, setTimingLoading] = useState(false);
  const [ttsDuration, setTtsDuration] = useState(null); // raw TTS duration at 1x speed
  const [rawTtsDuration, setRawTtsDuration] = useState(null);
  const [musicUrl, setMusicUrl] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicApproved, setMusicApproved] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [enableMusic, setEnableMusic] = useState(true);
  const [musicModel, setMusicModel] = useState('elevenlabs');
  const [sfxUrl, setSfxUrl] = useState(null);
  const [sfxLoading, setSfxLoading] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.3);
  const [enableSfx, setEnableSfx] = useState(true);

  // ── Step 3: Frames ──────────────────────────────────────────────
  const [visualStyle, setVisualStyle] = useState('');
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [imageModel, setImageModel] = useState('fal_nano_banana');
  const [videoModel, setVideoModel] = useState('fal_veo3');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [frames, setFrames] = useState({}); // { sceneIdx: { start: url, end: url, visionAnalysis: string } }
  const [frameLoading, setFrameLoading] = useState(null); // 'scene-0-start' etc.
  const [scenePrompts, setScenePrompts] = useState({}); // { sceneIdx: { startPrompt, endPrompt, motionPrompt } }
  const [sceneRefs, setSceneRefs] = useState({}); // { sceneIdx: { url, source } } — per-scene reference images for I2I
  const [libraryForScene, setLibraryForScene] = useState(null); // sceneIdx when library picker is open
  const [sceneMotionRefs, setSceneMotionRefs] = useState({}); // { sceneIdx: motionRef }
  const [sceneCameraConfigs, setSceneCameraConfigs] = useState({}); // { sceneIdx: cameraConfig }
  const [sceneCharacters, setSceneCharacters] = useState({}); // { sceneIdx: [character objects] }

  const updateSceneCameraConfig = (sceneIdx, config) => {
    setSceneCameraConfigs(prev => ({ ...prev, [sceneIdx]: config }));
  };

  const updateSceneMotionRef = (sceneIdx, motionRef) => {
    setSceneMotionRefs(prev => ({ ...prev, [sceneIdx]: motionRef }));
  };
  const clearSceneMotionRef = (sceneIdx) => {
    setSceneMotionRefs(prev => {
      const next = { ...prev };
      delete next[sceneIdx];
      return next;
    });
  };

  // ── Step 4: Clips ───────────────────────────────────────────────
  const [clips, setClips] = useState({}); // { sceneIdx: { url, actualDuration, status } }
  const [clipLoading, setClipLoading] = useState(new Set());
  const [multiShotMode, setMultiShotMode] = useState(false);
  const [multiShotLoading, setMultiShotLoading] = useState(false);
  const [multiShotResult, setMultiShotResult] = useState(null); // { video_url, total_duration }

  // ── Step 5: Assembly ────────────────────────────────────────────
  const [finalUrl, setFinalUrl] = useState(null);
  const [assembleLoading, setAssembleLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [reviewResults, setReviewResults] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // ── Draft persistence ──────────────────────────────────────────
  const [draftId, setDraftId] = useState(null);
  const [draftList, setDraftList] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedDrafts, setSelectedDrafts] = useState(new Set());
  const [deletingDrafts, setDeletingDrafts] = useState(false);
  const lastSaveRef = useRef(null);

  const getWorkbenchState = () => ({
    step, completed, niche, topic, storyContext, creativeMode, framework: framework?.id || null, generatedIdeas,
    duration, script, geminiVoice, styleInstructions, voiceSpeed,
    voiceoverUrl, voiceApproved,
    blocks, ttsDuration, rawTtsDuration, musicUrl, musicApproved, musicVolume, enableMusic, musicModel,
    sfxUrl, sfxVolume, enableSfx,
    visualStyle, videoStyle, imageModel, videoModel, aspectRatio,
    frames, scenePrompts, sceneRefs, sceneMotionRefs, sceneCameraConfigs, sceneCharacters, clips, finalVideoUrl: finalUrl,
    // Avatar mode
    avatarMode, avatarSubjectId, avatarSubjectName,
    avatarPortraitUrl, avatarVideoUrl, avatarLipsyncUrl,
  });

  const saveDraftRef = useRef(false);
  const saveDraft = async () => {
    if (saveDraftRef.current) return; // prevent concurrent saves
    saveDraftRef.current = true;
    setSavingDraft(true);
    try {
      const state = getWorkbenchState();
      // Don't create a new draft if there's no script yet (auto-save guard)
      if (!draftId && !state.script?.trim()) return;
      const res = await apiFetch('/api/workbench/save-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, state }),
      });
      const data = await parseApiResponse(res);
      if (data.draft_id && !draftId) setDraftId(data.draft_id);
      lastSaveRef.current = Date.now();
    } catch (err) { console.warn('Draft save failed:', err.message); }
    finally { saveDraftRef.current = false; setSavingDraft(false); }
  };

  const loadDraft = async (id) => {
    try {
      const res = await apiFetch(`/api/workbench/load-draft`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: id }),
      });
      const data = await parseApiResponse(res);
      const s = data.draft?.storyboard_json;
      if (!s) return;
      setDraftId(id);
      setNiche(s.niche || ''); setTopic(s.topic || ''); setStoryContext(s.storyContext || ''); setCreativeMode(s.creativeMode || false); setGeneratedIdeas(s.generatedIdeas || []);
      setDuration(s.duration || 60); setScript(s.script || '');
      setGeminiVoice(s.geminiVoice || 'Perseus'); setStyleInstructions(s.styleInstructions || '');
      setVoiceSpeed(s.voiceSpeed || 1.1); setVoiceoverUrl(s.voiceoverUrl || null);
      setVoiceApproved(s.voiceApproved || false);
      setBlocks(s.blocks || []); setTtsDuration(s.rawTtsDuration || s.ttsDuration || null); setRawTtsDuration(s.rawTtsDuration || s.ttsDuration || null);
      setMusicUrl(s.musicUrl || null); setMusicApproved(s.musicApproved || false);
      setMusicVolume(s.musicVolume ?? 0.2); setEnableMusic(s.enableMusic ?? true);
      setMusicModel(s.musicModel || 'elevenlabs');
      setSfxUrl(s.sfxUrl || null); setSfxVolume(s.sfxVolume ?? 0.3); setEnableSfx(s.enableSfx ?? true);
      setVisualStyle(s.visualStyle || ''); setVideoStyle(s.videoStyle || 'cinematic');
      setImageModel(s.imageModel || 'fal_nano_banana'); setVideoModel(s.videoModel || 'fal_veo3');
      setAspectRatio(s.aspectRatio || '9:16');
      setFrames(s.frames || {}); setScenePrompts(s.scenePrompts || {}); setSceneRefs(s.sceneRefs || {}); setSceneMotionRefs(s.sceneMotionRefs || {}); setSceneCameraConfigs(s.sceneCameraConfigs || {}); setSceneCharacters(s.sceneCharacters || {}); setClips(s.clips || {});
      setFinalUrl(s.finalVideoUrl || null);
      // Restore avatar state
      setAvatarMode(s.avatarMode || false);
      setAvatarSubjectId(s.avatarSubjectId || null);
      setAvatarSubjectName(s.avatarSubjectName || '');
      setAvatarPortraitUrl(s.avatarPortraitUrl || null);
      setAvatarVideoUrl(s.avatarVideoUrl || null);
      setAvatarLipsyncUrl(s.avatarLipsyncUrl || null);
      setAvatarStage(s.avatarLipsyncUrl ? 'done' : null);
      if (s.completed) setCompleted(s.completed);
      // Restore framework from saved ID
      if (s.framework) {
        const fw = FRAMEWORK_CARDS.find(f => f.id === s.framework);
        if (fw) setFramework(fw);
      } else { setFramework(null); }
      if (s.step) setStep(s.step);
      setShowDrafts(false);
    } catch (err) { toast.error(`Load failed: ${err.message}`); }
  };

  const loadDraftList = async () => {
    try {
      const res = await apiFetch('/api/workbench/list-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.drafts) setDraftList(data.drafts);
    } catch {}
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    try {
      const res = await apiFetch('/api/workbench/delete-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: id }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      // Reload draft list
      loadDraftList();
      if (draftId === id) setDraftId(null);
      toast.success('Draft deleted');
    } catch (err) { toast.error(`Delete failed: ${err.message}`); }
  };

  const deleteSelectedDrafts = async () => {
    if (selectedDrafts.size === 0) { toast.error('No drafts selected'); return; }
    const count = selectedDrafts.size;
    if (!window.confirm(`Delete ${count} draft${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeletingDrafts(true);
    try {
      const res = await apiFetch('/api/workbench/delete-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_ids: Array.from(selectedDrafts) }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); setDeletingDrafts(false); return; }
      // Reload draft list and reset
      setSelectedDrafts(new Set());
      setBulkSelectMode(false);
      loadDraftList();
      // If deleted current draft, reset
      if (selectedDrafts.has(draftId)) setDraftId(null);
      toast.success(`${count} draft${count > 1 ? 's' : ''} deleted`);
    } catch (err) { toast.error(`Delete failed: ${err.message}`); }
    finally { setDeletingDrafts(false); }
  };

  const toggleSelectDraft = (id) => {
    const newSelected = new Set(selectedDrafts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDrafts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDrafts.size === draftList.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(draftList.map(d => d.id)));
    }
  };

  // Fetch user's Visual Subjects when avatar mode is toggled on
  const fetchAvatarSubjects = async () => {
    try {
      const res = await apiFetch('/api/brand/avatars');
      const data = await res.json();
      if (data.avatars) setAvatarSubjects(data.avatars.filter(a => a.lora_url));
    } catch {}
  };

  useEffect(() => {
    if (avatarMode && avatarSubjects.length === 0) fetchAvatarSubjects();
  }, [avatarMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save when key milestones are reached
  const frameCount = Object.keys(frames).length;
  const clipCount = Object.keys(clips).length;
  useEffect(() => {
    if (voiceoverUrl || blocks.length > 0 || frameCount > 0 || finalUrl) {
      const timer = setTimeout(() => saveDraft(), 1000);
      return () => clearTimeout(timer);
    }
  }, [voiceoverUrl, blocks.length, frameCount, clipCount, finalUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ───────────────────────────────────────────────
  const mode = isFLF(videoModel) ? 'flf' : 'i2v';
  const effectiveDuration = ttsDuration ? ttsDuration / voiceSpeed : duration;

  // ── Niche change: clear funnel + framework ─────────────────────
  const handleNicheChange = (key) => {
    setNiche(key);
    setTopicL1(''); setTopicL2(''); setTopicL3('');
    setShowTopicFunnel(false);
    setTopic('');
    setResearchedStories([]); setSelectedStoryIdx(null);
    setStoryContext('');
    if (framework?.applicableNiches && !framework.applicableNiches.includes(key)) setFramework(null);
    // Auto-set voice style to match the niche
    if (NICHE_VOICE_STYLES[key]) setStyleInstructions(NICHE_VOICE_STYLES[key]);
  };

  // ── API calls ───────────────────────────────────────────────────

  const handleResearch = async () => {
    if (!niche || !topic.trim()) { toast.error('Select a niche and enter a topic first'); return; }
    setResearchLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topic: topic.trim() }),
      });
      const data = await parseApiResponse(res);
      if (data.stories) {
        setResearchedStories(data.stories);
        setSelectedStoryIdx(null);
      }
    } catch (err) { toast.error(err.message || 'Research failed'); }
    finally { setResearchLoading(false); }
  };

  const generateIdeas = async () => {
    if (!niche) { toast.error('Select a niche first'); return; }
    setIdeasLoading(true);
    try {
      const res = await apiFetch('/api/workbench/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 10 }),
      });
      const data = await parseApiResponse(res);
      setGeneratedIdeas(data.ideas || []);
    } catch (err) { toast.error(err.message); }
    finally { setIdeasLoading(false); }
  };

  const handleDiscoverTopics = async () => {
    if (!niche) { toast.error('Select a niche first'); return; }
    setIsDiscovering(true);
    setResearchedStories([]);
    setSelectedStoryIdx(null);
    try {
      const res = await apiFetch('/api/shorts/discover-topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 8 }),
      });
      const data = await parseApiResponse(res);
      if (data.topics) {
        setResearchedStories(data.topics);
      }
    } catch (err) { toast.error(err.message || 'Topic discovery failed'); }
    finally { setIsDiscovering(false); }
  };

  const generateScript = async () => {
    if (!niche || !topic.trim()) { toast.error('Pick a niche and enter a topic'); return; }
    // Enforce research when not in Creative Mode
    if (!creativeMode && !storyContext && researchedStories.length === 0) {
      toast.warning('Research required — use "Find Trending Topics" or click Research first. Enable Creative Mode to skip research.');
      return;
    }
    setScriptLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/preview-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topic: topic.trim(), story_context: storyContext, creative_mode: creativeMode, videoLengthPreset: duration, framework: framework?.id }),
      });
      const data = await parseApiResponse(res);
      const scriptData = data.script || data;
      const fullScript = scriptData.narration_full || scriptData.scenes?.map(s => s.narration_segment).filter(Boolean).join(' ') || '';
      setScript(fullScript);
      // Store scene prompts for later
      const prompts = {};
      (scriptData.scenes || []).forEach((s, i) => {
        prompts[i] = { startPrompt: s.visual_prompt || s.narration_segment, endPrompt: '', motionPrompt: s.motion_prompt || '' };
      });
      setScenePrompts(prompts);
      toast.success(`Script generated — ${fullScript.split(/\s+/).length} words`);
    } catch (err) { toast.error(err.message || 'Script generation failed'); }
    finally { setScriptLoading(false); }
  };

  const playVoicePreview = async (voiceId) => {
    if (previewVoiceLoading === voiceId) {
      // Stop current preview
      if (previewAudio) previewAudio.pause();
      setPreviewVoiceLoading(null);
      return;
    }
    // Pause any currently playing preview
    if (previewAudio) previewAudio.pause();
    setPreviewVoiceLoading(voiceId);
    try {
      const res = await apiFetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId, text: 'Here is a preview of my voice. Pretty cool, right?' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Voice preview failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setPreviewAudio(audio);
      audio.onended = () => setPreviewVoiceLoading(null);
      audio.play();
    } catch (err) {
      toast.error(err.message || 'Voice preview failed');
      setPreviewVoiceLoading(null);
    }
  };

  const generateVoiceover = async () => {
    if (!script.trim()) { toast.error('Write or generate a script first'); return; }
    setVoiceLoading(true);
    setVoiceApproved(false);
    try {
      const res = await apiFetch('/api/workbench/voiceover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script, voice: geminiVoice, style_instructions: styleInstructions, speed: voiceSpeed }),
      });
      const data = await parseApiResponse(res);
      setVoiceoverUrl(data.audio_url);
      toast.success('Voiceover generated');
    } catch (err) { toast.error(err.message || 'Voiceover failed'); }
    finally { setVoiceLoading(false); }
  };

  const analyzeTiming = async () => {
    if (!voiceoverUrl) { toast.error('Generate a voiceover first'); return; }
    setTimingLoading(true);
    try {
      const res = await apiFetch('/api/workbench/timing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: voiceoverUrl, video_model: videoModel, framework_id: framework?.id, video_length_preset: duration, voice_speed: voiceSpeed }),
      });
      const data = await parseApiResponse(res);
      setBlocks(data.blocks || []);
      setRawTtsDuration(data.raw_tts_duration || data.tts_duration);
      setTtsDuration(data.raw_tts_duration || data.tts_duration); // store raw (1x speed) duration
      toast.success(`${data.blocks?.length} scene blocks aligned`);
    } catch (err) { toast.error(err.message || 'Timing analysis failed'); }
    finally { setTimingLoading(false); }
  };

  const generateSfx = async () => {
    setSfxLoading(true);
    try {
      const res = await apiFetch('/api/workbench/sfx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, duration: Math.ceil(effectiveDuration) + 3 }),
      });
      const data = await parseApiResponse(res);
      if (data.sfx_url) { setSfxUrl(data.sfx_url); }
      else { toast.warning('SFX generation unavailable'); }
    } catch (err) { toast.warning(err.message || 'SFX generation failed'); }
    finally { setSfxLoading(false); }
  };

  const generateMusic = async () => {
    setMusicLoading(true);
    setMusicApproved(false);
    try {
      const res = await apiFetch('/api/workbench/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework_id: framework?.id, niche, duration: Math.ceil(effectiveDuration) + 3, music_model: musicModel }),
      });
      const data = await parseApiResponse(res);
      setMusicUrl(data.audio_url);
      toast.success('Music generated');
    } catch (err) { toast.error(err.message || 'Music generation failed'); }
    finally { setMusicLoading(false); }
  };

  const generateFrame = async (sceneIdx, type) => {
    // type: 'start' | 'end' | 'single' (for I2V)
    const loadingKey = `scene-${sceneIdx}-${type}`;
    setFrameLoading(loadingKey);
    try {
      const block = blocks[sceneIdx];
      const promptData = scenePrompts[sceneIdx] || {};

      // Reference image: user-provided ref > prev scene end frame > prev extracted last frame
      let referenceImageUrl = null;
      let useAsI2I = false;
      const userRef = sceneRefs[sceneIdx]?.url;
      if (userRef) {
        referenceImageUrl = userRef;
        useAsI2I = true; // always do I2I when user explicitly provides a ref
      } else if (type === 'start' && sceneIdx > 0 && mode === 'flf') {
        referenceImageUrl = frames[sceneIdx - 1]?.end || null;
      } else if (type === 'end' && mode === 'flf') {
        referenceImageUrl = frames[sceneIdx]?.start || null; // end frame derives from start
      } else if (type === 'single' && sceneIdx > 0 && mode === 'i2v') {
        referenceImageUrl = frames[sceneIdx - 1]?.extractedLastFrame || null;
      }

      const res = await apiFetch('/api/workbench/generate-frame', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: type === 'end' ? (promptData.endPrompt || promptData.startPrompt) : promptData.startPrompt,
          narration: block?.narration || '',
          visual_style: visualStyle,
          visual_style_prompt: getVisualStylePrompt(visualStyle),
          video_style: videoStyle,
          image_model: imageModel,
          aspect_ratio: aspectRatio,
          reference_image_url: referenceImageUrl,
          scene_index: sceneIdx,
          frame_type: type,
          vision_context: sceneIdx > 0 ? frames[sceneIdx - 1]?.visionAnalysis : null,
          niche,
          use_as_i2i: useAsI2I,
          characters: sceneCharacters[sceneIdx] || [],
        }),
      });
      const data = await parseApiResponse(res);

      setFrames(prev => ({
        ...prev,
        [sceneIdx]: {
          ...prev[sceneIdx],
          [type === 'single' ? 'start' : type]: data.image_url,
          ...(data.vision_analysis ? { visionAnalysis: data.vision_analysis } : {}),
        },
      }));
    } catch (err) { toast.error(`Frame generation failed: ${err.message}`); }
    finally { setFrameLoading(null); }
  };

  const generateClip = async (sceneIdx) => {
    const block = blocks[sceneIdx];
    const sceneFrames = frames[sceneIdx];
    const sceneMode = sceneMotionRefs[sceneIdx]?.videoUrl ? 'mt' : mode; // per-scene override
    if (!sceneFrames?.start) { toast.error(`Scene ${sceneIdx + 1}: no start frame`); return; }
    if (sceneMode === 'flf' && !sceneFrames?.end) { toast.error(`Scene ${sceneIdx + 1}: no end frame`); return; }

    setClipLoading(prev => new Set([...prev, sceneIdx]));
    setClips(prev => ({ ...prev, [sceneIdx]: { ...prev[sceneIdx], status: 'generating' } }));

    try {
      const promptData = scenePrompts[sceneIdx] || {};
      const motionRef = sceneMotionRefs[sceneIdx];
      const res = await apiFetch('/api/workbench/generate-clip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: sceneMode,
          video_model: videoModel,
          start_frame_url: sceneFrames.start,
          end_frame_url: sceneMode === 'flf' ? sceneFrames.end : undefined,
          motion_prompt: promptData.motionPrompt || 'Smooth cinematic movement',
          camera_config: sceneCameraConfigs[sceneIdx] || null,
          video_style: videoStyle,
          duration: block.clipDuration,
          aspect_ratio: aspectRatio,
          scene_index: sceneIdx,
          ...(sceneMode === 'mt' && motionRef ? {
            motion_ref: {
              video_url: motionRef.videoUrl,
              trimmed_url: motionRef.trimmedUrl,
              model: motionRef.model || 'kling_motion_control',
              character_orientation: motionRef.characterOrientation || 'image',
              keep_original_sound: false,
              elements: motionRef.elements,
              prompt: motionRef.prompt,
            },
          } : {}),
        }),
      });
      const data = await parseApiResponse(res);

      setClips(prev => ({
        ...prev,
        [sceneIdx]: { url: data.video_url, actualDuration: data.actual_duration, status: 'done' },
      }));

      // For I2V or MT mode: store extracted last frame + vision analysis for next scene
      if ((sceneMode === 'i2v' || sceneMode === 'mt') && data.last_frame_url) {
        setFrames(prev => ({
          ...prev,
          [sceneIdx]: { ...prev[sceneIdx], extractedLastFrame: data.last_frame_url, visionAnalysis: data.vision_analysis || '' },
          // Pre-populate next scene's start frame
          ...(sceneIdx + 1 < blocks.length ? {
            [sceneIdx + 1]: { ...prev[sceneIdx + 1], start: data.last_frame_url },
          } : {}),
        }));
      }

      toast.success(`Scene ${sceneIdx + 1} clip done — ${data.actual_duration?.toFixed(1)}s`);
    } catch (err) {
      setClips(prev => ({ ...prev, [sceneIdx]: { status: 'failed', error: err.message } }));
      toast.error(`Scene ${sceneIdx + 1} clip failed: ${err.message}`);
    }
    finally { setClipLoading(prev => { const next = new Set(prev); next.delete(sceneIdx); return next; }); }
  };

  // ── Multi-Shot generation (all scenes in one API call) ─────────
  const generateMultiShot = async () => {
    if (blocks.length < 2 || blocks.length > 6) {
      toast.error('Multi-shot requires 2-6 scenes.');
      return;
    }

    const totalDur = blocks.reduce((sum, b) => sum + (b.clipDuration || 3), 0);
    if (totalDur > 15) {
      toast.error(`Total duration (${totalDur}s) exceeds 15s max for multi-shot.`);
      return;
    }

    setMultiShotLoading(true);
    setMultiShotResult(null);

    try {
      const scenes = blocks.map((block, i) => ({
        motionPrompt: scenePrompts[i]?.motionPrompt || 'Smooth cinematic movement',
        duration: block.clipDuration || 3,
        videoStyle,
        cameraConfig: sceneCameraConfigs[i] || null,
      }));

      const res = await apiFetch('/api/workbench/generate-multishot', {
        body: JSON.stringify({
          video_model: videoModel,
          scenes,
          start_frame_url: frames[0]?.start || null,
          aspect_ratio: aspectRatio,
          video_style: videoStyle,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMultiShotResult({ video_url: data.video_url, total_duration: data.total_duration });

      // Store the multi-shot video as the assembled clip for all scenes
      blocks.forEach((_, i) => {
        setClips(prev => ({ ...prev, [i]: { url: data.video_url, actualDuration: data.total_duration / blocks.length, status: 'done' } }));
      });
    } catch (err) {
      toast.error(`Multi-shot failed: ${err.message}`);
    } finally {
      setMultiShotLoading(false);
    }
  };

  const generateAvatarPipeline = async () => {
    if (!avatarSubjectId || !voiceoverUrl) {
      toast.error('Select a character and generate voiceover first');
      return;
    }
    setAvatarLoading(true);
    // effectiveDuration is already computed in the component as ttsDuration / voiceSpeed
    const effectiveDur = effectiveDuration || duration;

    try {
      // Stage 1: Portrait
      setAvatarStage('portrait');
      let portraitUrl = avatarPortraitUrl;
      if (!portraitUrl) {
        const portraitRes = await apiFetch('/api/workbench/generate-avatar-portrait', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visual_subject_id: avatarSubjectId }),
        });
        const portraitData = await parseApiResponse(portraitRes);
        portraitUrl = portraitData.portrait_url;
        setAvatarPortraitUrl(portraitUrl);
      }

      // Stage 2: Animate + Loop
      setAvatarStage('animating');
      const animRes = await apiFetch('/api/workbench/animate-avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portrait_url: portraitUrl, duration: effectiveDur }),
      });
      const animData = await parseApiResponse(animRes);
      setAvatarVideoUrl(animData.avatar_video_url);

      // Stage 3: Lip-sync
      setAvatarStage('lipsyncing');
      const lipsyncRes = await apiFetch('/api/workbench/lipsync-avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_video_url: animData.avatar_video_url,
          voiceover_url: voiceoverUrl,
        }),
      });
      const lipsyncData = await parseApiResponse(lipsyncRes);
      setAvatarLipsyncUrl(lipsyncData.lipsync_video_url);

      setAvatarStage('done');
      saveDraft();
    } catch (err) {
      toast.error(`Avatar generation failed: ${err.message}`);
      setAvatarStage(null);
    } finally {
      setAvatarLoading(false);
    }
  };

  const regenerateAvatar = () => {
    setAvatarPortraitUrl(null);
    setAvatarVideoUrl(null);
    setAvatarLipsyncUrl(null);
    setAvatarStage(null);
    generateAvatarPipeline();
  };

  const assembleVideo = async () => {
    const validClips = blocks.map((_, i) => clips[i]).filter(c => c?.url);
    if (validClips.length === 0) { toast.error('No video clips to assemble'); return; }
    const missingCount = blocks.length - validClips.length;
    if (missingCount > 0) {
      const missing = blocks.map((_, i) => !clips[i]?.url ? i + 1 : null).filter(Boolean);
      toast.warning(`Missing clips for scene${missing.length > 1 ? 's' : ''} ${missing.join(', ')} — assembling with ${validClips.length}/${blocks.length} scenes`);
    }
    setAssembleLoading(true);
    setReviewResults(null);
    setReviewError(null);
    try {
      const res = await apiFetch('/api/workbench/assemble', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: blocks.map((b, i) => ({ url: clips[i]?.url, duration: clips[i]?.actualDuration || b.clipDuration })).filter(c => c.url),
          voiceover_url: voiceoverUrl,
          music_url: enableMusic ? musicUrl : null,
          music_volume: musicVolume,
          sfx_url: enableSfx ? sfxUrl : null,
          sfx_volume: sfxVolume,
          // Avatar split-screen
          avatar_mode: avatarMode && !!avatarLipsyncUrl,
          avatar_lipsync_url: avatarMode ? avatarLipsyncUrl : null,
          tts_duration: effectiveDuration,
          voice_speed: voiceSpeed,
          caption_config: { font_name: 'Montserrat', font_size: 100, font_weight: 'bold', font_color: 'white', highlight_color: 'purple', stroke_width: 3, stroke_color: 'black', words_per_subtitle: 1, enable_animation: true },
        }),
      });
      const data = await parseApiResponse(res);
      setFinalUrl(data.video_url);
      // Auto-trigger quality review in background (non-blocking)
      const validClipsForReview = blocks.map((b, i) => clips[i]).filter(c => c?.url);
      runQualityReview(validClipsForReview);
      toast.success('Video assembled!');
    } catch (err) { toast.error(err.message || 'Assembly failed'); }
    finally { setAssembleLoading(false); }
  };

  const runQualityReview = async (clipsForReview) => {
    if (!clipsForReview?.length || !blocks?.length) return;
    setReviewLoading(true);
    setReviewResults(null);
    setReviewError(null);
    try {
      const scenesPayload = blocks.map(b => ({ narration: b.narration || '' }));
      const clipsPayload = clipsForReview.map((c, i) => ({
        url: c.url,
        duration: c.actualDuration || blocks[i]?.clipDuration || c.duration,
      }));
      const res = await apiFetch('/api/workbench/review-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clips: clipsPayload, scenes: scenesPayload }),
      });
      const data = await parseApiResponse(res);
      setReviewResults(data.results || []);
    } catch (err) {
      console.error('[qualityReview] Review failed:', err.message);
      setReviewError(err.message || 'Quality review failed');
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Sorted voices ───────────────────────────────────────────────
  const sortedVoices = [
    ...GEMINI_VOICES.filter(v => FEATURED_VOICES.includes(v.id)),
    ...GEMINI_VOICES.filter(v => !FEATURED_VOICES.includes(v.id)),
  ];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/40 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-700/40 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Shorts Workbench</h1>
              <p className="text-[11px] text-slate-400">Step by step · {mode === 'flf' ? 'First-Last Frame' : 'Image-to-Video'} mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { loadDraftList(); setShowDrafts(!showDrafts); }}
              className="text-xs text-[#2C666E] hover:text-[#234f56] font-semibold border border-[#2C666E]/30 px-2.5 py-1.5 rounded-lg hover:bg-[#2C666E]/5">
              My Drafts
            </button>
            <button onClick={saveDraft} disabled={savingDraft || !script}
              className="text-xs text-white bg-[#2C666E] px-2.5 py-1.5 rounded-lg font-semibold disabled:opacity-50 hover:bg-[#234f56]">
              {savingDraft ? 'Saving...' : draftId ? 'Save' : 'Save Draft'}
            </button>
            <button onClick={() => navigate('/')} className="text-xs text-slate-400 hover:text-slate-200 font-medium">Home</button>
            <button onClick={() => navigate('/campaigns')} className="text-xs text-slate-400 hover:text-slate-200 font-medium">Campaigns</button>
            <span className="inline-flex items-center gap-1 bg-red-900/30 border border-red-700/40 text-red-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase">
              🔇 No audio in clips
            </span>
          </div>
        </div>
      </header>

      {/* Drafts dropdown */}
      {showDrafts && (
        <div className="bg-slate-800/50 border-b border-slate-700/40">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200">Saved Drafts</h3>
                {draftList.length > 0 && (
                  <button onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedDrafts(new Set()); }}
                    className="text-xs text-[#2C666E] font-semibold px-2 py-1 rounded hover:bg-[#2C666E]/10">
                    {bulkSelectMode ? 'Cancel' : 'Select'}
                  </button>
                )}
              </div>
              {bulkSelectMode && selectedDrafts.size > 0 && (
                <button onClick={deleteSelectedDrafts} disabled={deletingDrafts}
                  className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingDrafts ? 'Deleting...' : `Delete (${selectedDrafts.size})`}
                </button>
              )}
            </div>
            {draftList.length === 0 ? (
              <p className="text-xs text-slate-400">No saved drafts yet.</p>
            ) : (
              <div className="grid gap-2">
                {bulkSelectMode && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700/40 bg-slate-800/40">
                    <input type="checkbox" checked={selectedDrafts.size === draftList.length && draftList.length > 0}
                      onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-600 text-[#2C666E]" />
                    <span className="text-xs font-medium text-slate-400">
                      {selectedDrafts.size === draftList.length && draftList.length > 0 ? 'Deselect All' : 'Select All'}
                    </span>
                  </div>
                )}
                {draftList.map(d => (
                  <div key={d.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border transition-all',
                    bulkSelectMode ? 'bg-slate-800/40' : d.id === draftId ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-700/40 hover:bg-slate-800/40')}>
                    {bulkSelectMode && (
                      <input type="checkbox" checked={selectedDrafts.has(d.id)} onChange={() => toggleSelectDraft(d.id)}
                        className="w-4 h-4 rounded border-slate-600 text-[#2C666E]" />
                    )}
                    <button onClick={() => !bulkSelectMode && loadDraft(d.id)} disabled={bulkSelectMode}
                      className="flex-1 text-left disabled:cursor-default">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-200">{d.topic}</span>
                        <span className="text-[10px] text-slate-400">{new Date(d.updated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {d.niche && <span className="text-[10px] bg-slate-700/40 text-slate-400 px-2 py-0.5 rounded">{d.niche}</span>}
                        <span className="text-[10px] text-slate-400">Step {d.step || '?'}</span>
                        {d.has_video && <span className="text-[10px] text-emerald-400 font-bold">Video ready</span>}
                      </div>
                    </button>
                    {!bulkSelectMode && (
                      <button onClick={() => deleteDraft(d.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-900/30 rounded-lg"
                        title="Delete draft">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-6">
        <StepRail current={step} completed={completed} onSelect={goTo} />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 1: Script & Voice                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'script' && (
          <>
            <Panel title="Niche & Topic" right={<CostBadge amount="0.03" label="script + voice" />}>
              <div className="flex gap-5 items-start">
                <div className="w-1/2 shrink-0">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Niche</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {NICHES.map(n => (
                      <button key={n.key} onClick={() => handleNicheChange(n.key)}
                        className={cn('p-2 rounded-lg border text-center transition-all text-[11px]',
                          niche === n.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-700/40 hover:border-slate-600/50')}>
                        <div className="text-base">{n.icon}</div>
                        <div className="font-medium text-slate-200 mt-0.5">{n.label}</div>
                      </button>
                    ))}
                  </div>

                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mt-4 mb-1">Framework</label>
                  {(() => {
                    const allFw = niche ? getFrameworksForNiche(niche) : FRAMEWORK_CARDS;
                    const nicheFw = niche ? allFw.filter(f => f.applicableNiches) : [];
                    const universalFw = allFw.filter(f => !f.applicableNiches);
                    const fwButton = (fw) => (
                      <button key={fw.id} onClick={() => { setFramework(fw); if (fw.supportedDurations?.length) setDuration(fw.supportedDurations[0]); }}
                        className={cn('px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                          framework?.id === fw.id ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]' : 'border-slate-700/40 text-slate-400 hover:border-slate-600/50')}>
                        {fw.name}
                      </button>
                    );
                    return (
                      <div className="space-y-2">
                        {nicheFw.length > 0 && (
                          <div>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Recommended for {NICHES.find(n => n.key === niche)?.label}</span>
                            <div className="flex gap-1.5 flex-wrap mt-1">{nicheFw.map(fwButton)}</div>
                          </div>
                        )}
                        <div className="flex gap-1.5 flex-wrap">{universalFw.slice(0, 8).map(fwButton)}</div>
                      </div>
                    );
                  })()}

                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mt-4 mb-1">Duration</label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 90].map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                          duration === d ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-700/40 text-slate-400')}>
                        {d}s
                      </button>
                    ))}
                  </div>

                  {/* Avatar Mode */}
                  <div className="mt-4 pt-3 border-t border-slate-700/30">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={avatarMode} onChange={e => {
                        setAvatarMode(e.target.checked);
                        if (!e.target.checked) {
                          setAvatarSubjectId(null); setAvatarSubjectName('');
                          setAvatarPortraitUrl(null); setAvatarVideoUrl(null);
                          setAvatarLipsyncUrl(null); setAvatarStage(null);
                        }
                      }}
                        className="w-4 h-4 rounded border-slate-600 text-[#2C666E] focus:ring-[#2C666E]" />
                      <span className="text-[11px] font-semibold text-slate-200">Avatar Mode</span>
                      <span className="text-[9px] text-slate-400">(split-screen talking head)</span>
                    </label>

                    {avatarMode && (
                      <div className="mt-2 ml-6">
                        {avatarSubjects.length > 0 ? (
                          <div className="space-y-2">
                            <select
                              value={avatarSubjectId || ''}
                              onChange={e => {
                                const subject = avatarSubjects.find(s => s.id === e.target.value);
                                setAvatarSubjectId(subject?.id || null);
                                setAvatarSubjectName(subject?.name || '');
                                setAvatarPortraitUrl(null); setAvatarVideoUrl(null);
                                setAvatarLipsyncUrl(null); setAvatarStage(null);
                              }}
                              className="w-full text-xs border border-slate-700/40 rounded-lg px-3 py-1.5 bg-slate-900 text-slate-200"
                            >
                              <option value="">Select a character...</option>
                              {avatarSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {avatarSubjectId && (() => {
                              const subject = avatarSubjects.find(s => s.id === avatarSubjectId);
                              return subject?.reference_image_url ? (
                                <img src={subject.reference_image_url} alt={subject.name}
                                  className="w-16 h-16 rounded-lg object-cover border border-slate-700/40" />
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400">
                            No characters with trained LoRAs found.{' '}
                            <button onClick={() => navigate('/settings')} className="text-[#2C666E] underline">Train one first</button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-1/2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Topic</label>
                    <button onClick={handleResearch} disabled={researchLoading || !niche || !topic.trim()}
                      className="text-[11px] font-semibold text-[#2C666E] hover:underline disabled:opacity-50 flex items-center gap-1">
                      {researchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Research
                    </button>
                  </div>
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Type a topic or pick from suggestions below..."
                    className="w-full border border-slate-700/40 rounded-lg px-3 py-2 text-sm mb-3 bg-slate-900 text-slate-200" />

                  {/* Discover Trending Topics — primary path */}
                  {niche && (
                    <div className="mb-3">
                      <button
                        onClick={handleDiscoverTopics}
                        disabled={isDiscovering}
                        className="w-full bg-[#2C666E] hover:bg-[#235258] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isDiscovering ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Researching trending topics...</>
                        ) : (
                          <><Search className="w-4 h-4" /> Find Trending Topics</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Generate Ideas — AI bulk idea generator */}
                  {niche && (
                    <div className="mb-3">
                      <button
                        onClick={generateIdeas}
                        disabled={ideasLoading}
                        className="w-full border border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/5 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {ideasLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating ideas...</>
                        ) : (
                          <><Lightbulb className="w-4 h-4" /> Generate Ideas</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Generated ideas list — capped height to prevent layout blowout */}
                  {generatedIdeas.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-medium text-[#2C666E] uppercase tracking-wide">
                          AI-Generated Ideas ({generatedIdeas.length})
                        </label>
                        <button
                          onClick={() => setGeneratedIdeas([])}
                          className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Clear
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {generatedIdeas.map((idea, i) => (
                        <button key={i} onClick={() => {
                          setTopic(idea.topic);
                          setStoryContext(idea.hook);
                        }}
                          className={cn('w-full text-left p-3 border-2 rounded-xl text-xs transition-all',
                            topic === idea.topic ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-700/40 hover:border-slate-600/50')}>
                          <div className="font-semibold text-slate-200 mb-0.5">{idea.title}</div>
                          <div className="text-slate-400 mb-1">{idea.hook}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-700/40 text-slate-400 px-1.5 py-0.5 rounded">{idea.category}</span>
                            <span className="text-[10px] text-slate-400">{idea.angle}</span>
                          </div>
                        </button>
                      ))}
                      </div>
                    </div>
                  )}

                  {/* Manual topic funnel — secondary path */}
                  {niche && TOPIC_SUGGESTIONS[niche] && (
                    <div className="mb-3 border border-slate-700/40 rounded-lg p-3 bg-slate-800/40">
                      <button
                        onClick={() => setShowTopicFunnel(!showTopicFunnel)}
                        className="w-full text-left text-[10px] text-slate-400 uppercase font-medium hover:text-slate-200 select-none"
                      >
                        {showTopicFunnel ? '▼ Or choose a topic manually' : '▶ Or choose a topic manually'}
                      </button>
                      {showTopicFunnel && <div className="mt-2">
                        {(() => {
                    const nicheData = TOPIC_SUGGESTIONS[niche];
                    const l1Items = nicheData.topics || [];
                    const l1Match = l1Items.find(t => t.label === topicL1);
                    const l2Items = l1Match?.sub || [];
                    const l2Match = l2Items.find(t => t.label === topicL2);
                    const l3Items = l2Match?.sub || [];
                    return (
                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase font-medium block mb-1">Category</label>
                          <div className="flex flex-wrap gap-1.5">
                            {l1Items.map(t => (
                              <button key={t.label} onClick={() => {
                                setTopicL1(topicL1 === t.label ? '' : t.label);
                                setTopicL2(''); setTopicL3('');
                                setTopic(t.label);
                              }}
                                className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                                  topicL1 === t.label ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-slate-800/40 text-slate-400 border-slate-700/40 hover:border-[#2C666E] hover:text-[#2C666E]')}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {l2Items.length > 0 && (
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-medium block mb-1">Angle</label>
                            <div className="flex flex-wrap gap-1.5">
                              {l2Items.map(t => (
                                <button key={t.label} onClick={() => {
                                  setTopicL2(topicL2 === t.label ? '' : t.label);
                                  setTopicL3('');
                                  setTopic(`${topicL1} — ${t.label}`);
                                }}
                                  className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                                    topicL2 === t.label ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-slate-800/40 text-slate-400 border-slate-700/40 hover:border-[#2C666E] hover:text-[#2C666E]')}>
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {l3Items.length > 0 && (
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-medium block mb-1">Hook</label>
                            <div className="flex flex-wrap gap-1.5">
                              {l3Items.map(t => (
                                <button key={t} onClick={() => {
                                  setTopicL3(topicL3 === t ? '' : t);
                                  setTopic(`${topicL1} — ${topicL2} — ${t}`);
                                }}
                                  className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                                    topicL3 === t ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-slate-800/40 text-slate-400 border-slate-700/40 hover:border-[#2C666E] hover:text-[#2C666E]')}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                      </div>}
                    </div>
                  )}

                  {/* Research results */}
                  {researchedStories.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-[#2C666E] uppercase tracking-wide">
                          Trending Topics
                        </label>
                        <button
                          onClick={handleDiscoverTopics}
                          disabled={isDiscovering}
                          className="text-[10px] text-slate-400 hover:text-[#2C666E] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                      </div>
                      {researchedStories.map((s, i) => (
                        <button key={i} onClick={() => {
                          setSelectedStoryIdx(i);
                          setTopic(s.title);
                          setStoryContext(s.story_context || s.summary || '');
                        }}
                          className={cn('w-full text-left p-3 border-2 rounded-xl text-xs transition-all',
                            selectedStoryIdx === i ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-700/40 hover:border-slate-600/50')}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-slate-200">{s.title}</div>
                            <div className="flex gap-1 shrink-0">
                              {s.trending_score && (
                                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                                  s.trending_score === 'high' ? 'bg-green-100 text-green-700' :
                                  s.trending_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-500')}>
                                  {s.trending_score === 'high' ? 'Trending' : s.trending_score === 'medium' ? 'Warm' : 'Steady'}
                                </span>
                              )}
                              {s.competition_score && (
                                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                                  s.competition_score === 'low' ? 'bg-green-100 text-green-700' :
                                  s.competition_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700')}>
                                  {s.competition_score === 'low' ? 'Low comp' : s.competition_score === 'medium' ? 'Med comp' : 'High comp'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-400 mt-1 leading-relaxed">{s.summary || s.angle}</div>
                          {selectedStoryIdx === i && (
                            <div className="mt-1.5 text-[9px] text-[#2C666E] font-medium">Selected</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Creative Mode toggle */}
                  <div className="flex items-center justify-between mb-2 py-1.5 px-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={creativeMode} onChange={e => setCreativeMode(e.target.checked)}
                          className="sr-only peer" />
                        <div className="w-8 h-[18px] bg-slate-600 peer-focus:ring-2 peer-focus:ring-[#2C666E]/30 rounded-full peer peer-checked:bg-[#2C666E] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-200 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-3.5" />
                      </label>
                      <span className="text-[11px] font-semibold text-slate-200">Creative Mode</span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {creativeMode ? 'AI can create fictional stories freely' : 'Research required — facts only'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Script</label>
                    <button onClick={generateScript} disabled={scriptLoading || !niche || !topic.trim()}
                      className="text-[11px] font-semibold text-[#2C666E] hover:underline disabled:opacity-50 flex items-center gap-1">
                      {scriptLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Generate
                    </button>
                  </div>
                  <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Write or generate your narration script..."
                    className="w-full border border-slate-700/40 rounded-lg px-3 py-2 text-sm min-h-[160px] resize-y bg-slate-900 text-slate-200" />
                  <div className="text-[10px] text-slate-400 mt-1">{script.split(/\s+/).filter(Boolean).length} words · ~{Math.round(script.split(/\s+/).filter(Boolean).length / 2.7)}s at 2.7 wps</div>
                </div>
              </div>
            </Panel>

            <Panel title="Voice & Voiceover" right={<CostBadge amount="0.01" />}>
              <div className="flex gap-5 items-start">
                <div className="w-1/2 shrink-0">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Voice</label>
                  <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                    {sortedVoices.slice(0, 12).map(v => (
                      <div key={v.id} className={cn('p-2 rounded-lg border text-left transition-all group relative',
                        geminiVoice === v.id ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-700/40 hover:border-slate-600/50')}>
                        <button onClick={() => setGeminiVoice(v.id)} className="w-full text-left">
                          <div className="text-[11px] font-semibold text-slate-200">{v.label}</div>
                          <div className="text-[9px] text-slate-400">{v.description}</div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); playVoicePreview(v.id); }}
                          className="absolute top-1 right-1 p-1 rounded bg-slate-700/40 hover:bg-slate-600/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          {previewVoiceLoading === v.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                          ) : (
                            <Play className="w-3 h-3 text-slate-400 ml-0.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mt-3 mb-1">Voice Style</label>
                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {(niche && NICHE_VOICE_STYLES[niche] ? [{ label: NICHES.find(n => n.key === niche)?.label || 'Niche', value: NICHE_VOICE_STYLES[niche] }, ...VOICE_STYLE_PRESETS] : VOICE_STYLE_PRESETS).map(p => (
                      <button key={p.label} onClick={() => setStyleInstructions(p.value)}
                        className={cn('px-2 py-0.5 rounded text-[9px] font-medium border transition-all',
                          styleInstructions === p.value ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-700/40 text-slate-400 hover:border-slate-600/50')}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={styleInstructions} onChange={e => setStyleInstructions(e.target.value)}
                    className="w-full border border-slate-700/40 rounded-lg px-3 py-2 text-[11px] h-14 resize-none bg-slate-900 text-slate-200" placeholder="Custom voice style instructions..." />
                </div>

                <div className="w-1/2">
                  <button onClick={generateVoiceover} disabled={voiceLoading || !script.trim()}
                    className="w-full px-4 py-3 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#1f4f55] disabled:opacity-50 mb-3">
                    {voiceLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Volume2 className="w-4 h-4 inline mr-2" />}
                    Generate Voiceover ($0.01)
                  </button>

                  {voiceoverUrl && (
                    <>
                      <AudioPlayer url={voiceoverUrl} speed={voiceSpeed} onSpeedChange={setVoiceSpeed} />
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => setVoiceApproved(true)}
                          className={cn('flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all',
                            voiceApproved ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'border-slate-700/40 text-slate-400 hover:border-emerald-400')}>
                          <Check className="w-3 h-3 inline mr-1" />{voiceApproved ? 'Approved' : 'Approve Voiceover'}
                        </button>
                        <button onClick={generateVoiceover} disabled={voiceLoading}
                          className="px-3 py-2 rounded-lg text-xs text-slate-400 border border-slate-700/40 hover:bg-slate-800/40">
                          <RotateCcw className="w-3 h-3 inline mr-1" />Redo
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Panel>

            <div className="flex justify-end">
              <button onClick={() => completeAndGo('timing')} disabled={!voiceApproved}
                className="px-6 py-2.5 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#1f4f55] disabled:opacity-50">
                Next: Timing & Music →
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 2: Timing & Music                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'timing' && (
          <>
            <Panel title="Scene Block Timing" right={<CostBadge amount="0.00" label="local" />}>
              <div className="bg-blue-900/30 border-l-3 border-blue-600 rounded-r-lg p-3 mb-4 text-xs text-blue-300">
                Whisper extracts word timestamps, then the block aligner snaps them to <strong>{videoModel}</strong>'s valid durations.
              </div>

              <div className="flex gap-3 mb-4">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider self-center">Video Model</label>
                <div className="flex gap-1.5 flex-wrap">
                  {VIDEO_MODELS.map(m => (
                    <button key={m.value} onClick={() => setVideoModel(m.value)}
                      className={cn('px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                        videoModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]' : 'border-slate-700/40 text-slate-400')}>
                      {m.label}
                      {FLF_MODELS.includes(m.value) && <span className="ml-1 text-[8px] bg-emerald-900/30 text-emerald-400 px-1 rounded">FLF</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={analyzeTiming} disabled={timingLoading || !voiceoverUrl}
                className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-xs font-semibold hover:bg-[#1f4f55] disabled:opacity-50 mb-4">
                {timingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" /> : <Scissors className="w-3.5 h-3.5 inline mr-1.5" />}
                Analyze Timing
              </button>

              {blocks.length > 0 && (
                <>
                  {/* Visual timeline */}
                  <div className="bg-slate-900 rounded-xl p-4 mb-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{blocks.length} scenes · {mode === 'flf' ? 'FLF parallel' : 'I2V sequential'}</span>
                      <span>Total clips: {blocks.reduce((s, b) => s + b.clipDuration, 0)}s · TTS: {ttsDuration?.toFixed(1)}s</span>
                    </div>
                    <div className="flex rounded-lg overflow-hidden h-10">
                      {blocks.map((b, i) => (
                        <div key={i} style={{ width: `${(b.clipDuration / blocks.reduce((s, bl) => s + bl.clipDuration, 0)) * 100}%` }}
                          className={cn('flex items-center justify-center text-[10px] font-semibold text-white border-r border-slate-700',
                            i % 2 === 0 ? 'bg-[#2C666E]' : 'bg-[#1e3a5f]')}>
                          <div className="text-center leading-tight">
                            <div>{b.frameworkLabel || `Scene ${i + 1}`}</div>
                            <div className="text-[8px] opacity-60">{b.clipDuration}s</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scene list */}
                  {blocks.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-700/40 rounded-xl mb-2">
                      <div className="w-7 h-7 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200">{b.frameworkLabel || 'Scene'} <span className="text-slate-400 font-normal">· {b.frameworkBeat}</span></div>
                        <div className="text-[11px] text-slate-400 truncate">{b.narration?.slice(0, 100)}...</div>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold whitespace-nowrap">{b.clipDuration}s</div>
                      <Tag color="slate">{Math.round(b.narration?.split(/\s+/).length || 0)} words</Tag>
                    </div>
                  ))}
                </>
              )}
            </Panel>

            {/* Music */}
            <Panel title="Background Music" right={<CostBadge amount="0.05" />}>
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setEnableMusic(!enableMusic)}
                  className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', enableMusic ? 'bg-[#2C666E]' : 'bg-slate-300')}>
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-slate-200 transition-transform', enableMusic ? 'translate-x-6' : 'translate-x-1')} />
                </button>
                <span className="text-sm text-slate-700 font-medium">Enable background music</span>
              </div>

              {enableMusic && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <select value={musicModel} onChange={e => setMusicModel(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-slate-700/40 text-xs text-slate-200 bg-slate-900">
                      <option value="elevenlabs">ElevenLabs</option>
                      <option value="minimax">MiniMax</option>
                      <option value="fal_lyria2">Lyria 2</option>
                      <option value="suno">Suno</option>
                    </select>
                    <button onClick={generateMusic} disabled={musicLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50">
                      {musicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" /> : <Music className="w-3.5 h-3.5 inline mr-1.5" />}
                      Generate Music ($0.05)
                    </button>
                  </div>

                  {musicUrl && (
                    <>
                      <AudioPlayer url={musicUrl} speed={1.0} />
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] text-slate-500 font-semibold">Volume: {Math.round(musicVolume * 100)}%</span>
                        <input type="range" min={0} max={50} value={musicVolume * 100} onChange={e => setMusicVolume(e.target.value / 100)}
                          className="flex-1 accent-purple-600" />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => setMusicApproved(true)}
                          className={cn('px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all',
                            musicApproved ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600')}>
                          <Check className="w-3 h-3 inline mr-1" />{musicApproved ? 'Approved' : 'Approve'}
                        </button>
                        <button onClick={generateMusic} className="px-3 py-2 rounded-lg text-xs text-slate-400 border border-slate-700/40">
                          <RotateCcw className="w-3 h-3 inline mr-1" />Redo
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </Panel>

            {/* Sound Effects */}
            <Panel title="Sound Effects" right={<CostBadge amount="0.05" />}>
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setEnableSfx(!enableSfx)}
                  className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', enableSfx ? 'bg-[#2C666E]' : 'bg-slate-300')}>
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-slate-200 transition-transform', enableSfx ? 'translate-x-6' : 'translate-x-1')} />
                </button>
                <span className="text-sm text-slate-700 font-medium">Enable sound effects</span>
              </div>

              {enableSfx && (
                <>
                  <button onClick={generateSfx} disabled={sfxLoading || !niche}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 mb-3">
                    {sfxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" /> : <Volume2 className="w-3.5 h-3.5 inline mr-1.5" />}
                    Generate Sound Effects ($0.05)
                  </button>

                  {sfxUrl && (
                    <>
                      <AudioPlayer url={sfxUrl} speed={1.0} />
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] text-slate-500 font-semibold">Volume: {Math.round(sfxVolume * 100)}%</span>
                        <input type="range" min={0} max={100} value={sfxVolume * 100} onChange={e => setSfxVolume(e.target.value / 100)}
                          className="flex-1 accent-purple-600" />
                      </div>
                      <div className="mt-3">
                        <button onClick={generateSfx} className="px-3 py-2 rounded-lg text-xs text-slate-400 border border-slate-700/40">
                          <RotateCcw className="w-3 h-3 inline mr-1" />Redo
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </Panel>

            <div className="flex justify-between">
              <button onClick={() => goTo('script')} className="px-5 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-400 hover:bg-slate-800/40">← Back</button>
              <button onClick={() => completeAndGo('frames')} disabled={blocks.length === 0}
                className="px-6 py-2.5 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#1f4f55] disabled:opacity-50">
                Next: Keyframes →
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 3: Keyframes                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'frames' && (
          <>
            {/* Style selectors */}
            <Panel title="Visual & Motion Style">
              {avatarMode && (
                <div className="mb-3 px-3 py-2 bg-blue-900/30 border border-blue-700/40 rounded-lg">
                  <p className="text-[10px] font-semibold text-blue-300">
                    B-Roll Scenes (top 60%) — These images fill the upper portion of the split-screen. Your avatar will appear below.
                  </p>
                </div>
              )}
              <div className="flex gap-5 items-start">
                <div className="w-1/2 shrink-0">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Visual Style</label>
                  <StyleGrid value={visualStyle} onChange={setVisualStyle} maxHeight="200px" hideLabel />
                </div>
                <div className="w-1/2">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Image Model</label>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {IMAGE_MODELS.map(m => (
                      <button key={m.value} onClick={() => setImageModel(m.value)}
                        className={cn('px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                          imageModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]' : 'border-slate-700/40 text-slate-400')}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {['9:16', '16:9', '1:1'].map(ar => (
                      <button key={ar} onClick={() => setAspectRatio(ar)}
                        className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                          aspectRatio === ar ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-700/40 text-slate-400')}>
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            {/* Theme Feel */}
            {niche && NICHE_VISUAL_MOODS[niche] && (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme Feel</span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{NICHES.find(n => n.key === niche)?.label}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed italic">{NICHE_VISUAL_MOODS[niche]}</p>
                <p className="text-[9px] text-slate-500 mt-1.5">This mood/atmosphere is applied to all generated frames. Select a different niche in Step 1 to change it.</p>
              </div>
            )}

            {/* Mode indicator */}
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-3 mb-4 text-xs text-blue-300">
              <strong>{mode === 'flf' ? 'FLF Mode:' : 'I2V Mode:'}</strong>{' '}
              {mode === 'flf'
                ? 'Generate START + END frame per scene. Approve pairs, then videos fire in parallel. Each scene\'s end frame becomes the next scene\'s start.'
                : 'Generate one frame per scene. Videos are sequential — each clip\'s last frame is extracted and becomes the next scene\'s input.'}
              {Object.keys(sceneMotionRefs).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded font-semibold">
                  + {Object.keys(sceneMotionRefs).length} Motion Transfer scene{Object.keys(sceneMotionRefs).length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Generate All / scene actions */}
            {blocks.length > 0 && mode === 'i2v' && !frames[0]?.start && (
              <button onClick={() => generateFrame(0, 'single')} disabled={!!frameLoading}
                className="w-full mb-4 px-4 py-3 bg-[#2C666E] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#234f56] transition-colors">
                {frameLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <ImageIcon className="w-4 h-4 inline mr-2" />}
                Generate Scene 1 Frame
              </button>
            )}

            {/* Scene frames */}
            {blocks.map((block, i) => {
              const sceneFrames = frames[i] || {};
              const sceneMode = sceneMotionRefs[i]?.videoUrl ? 'mt' : mode;
              const prevIsSequential = mode === 'i2v' || sceneMotionRefs[i - 1]?.videoUrl;
              const isCurrentInI2V = prevIsSequential && i > 0 && !clips[i - 1]?.url && !sceneFrames.start;
              const loading = frameLoading?.startsWith(`scene-${i}`);

              return (
                <Panel key={i}
                  title={<span className="inline-flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    {block.frameworkLabel || 'Scene'} <Tag>{block.clipDuration}s</Tag>
                    {sceneFrames.start && (sceneMode === 'i2v' || sceneMode === 'mt' || sceneFrames.end) && <Tag color="teal">✓ Ready</Tag>}
                  </span>}
                  right={<CostBadge amount={sceneMode === 'flf' ? '0.04' : sceneMode === 'mt' ? '0.06' : '0.02'} label="per scene" />}
                >
                  <div className="text-[11px] text-slate-400 italic mb-3 bg-slate-800/40 p-2 rounded-lg">
                    "{block.narration?.slice(0, 150)}{block.narration?.length > 150 ? '...' : ''}"
                  </div>

                  {isCurrentInI2V ? (
                    <div className="text-center py-6 text-sm text-slate-400">
                      Waiting for Scene {i}'s video clip to extract last frame...
                    </div>
                  ) : mode === 'flf' ? (
                    /* FLF: Start + End frame pair */
                    <>
                      <FramePair
                        startUrl={sceneFrames.start}
                        endUrl={sceneFrames.end}
                        startLabel={i === 0 ? 'Start Frame (T2I)' : `Start (from Scene ${i} end)`}
                        endLabel="End Frame"
                        onRegenStart={() => generateFrame(i, 'start')}
                        onRegenEnd={() => generateFrame(i, 'end')}
                        loading={loading}
                      />
                      <div className="flex gap-2 mt-3">
                        {!sceneFrames.start && (
                          <button onClick={() => generateFrame(i, 'start')} disabled={loading}
                            className="px-3 py-2 bg-[#2C666E] text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : <ImageIcon className="w-3 h-3 inline mr-1" />}
                            Generate Start Frame
                          </button>
                        )}
                        {sceneFrames.start && !sceneFrames.end && (
                          <button onClick={() => generateFrame(i, 'end')} disabled={loading}
                            className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : <ImageIcon className="w-3 h-3 inline mr-1" />}
                            Generate End Frame
                          </button>
                        )}
                      </div>

                      <ReferenceImageInput sceneIdx={i} sceneRefs={sceneRefs} setSceneRefs={setSceneRefs}
                        prevFrameUrl={i > 0 ? (frames[i - 1]?.end || frames[i - 1]?.start) : null}
                        prevLabel={i > 0 ? `Scene ${i} frame` : null}
                        onOpenLibrary={setLibraryForScene} />

                      {/* Vision analysis */}
                      {sceneFrames.visionAnalysis && (
                        <div className="mt-3 bg-slate-900 text-slate-400 rounded-lg p-3">
                          <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">🔍 Vision Analysis</div>
                          <div className="text-[11px] italic leading-relaxed">{sceneFrames.visionAnalysis}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* I2V: Single frame */
                    <>
                      <div className="flex items-start gap-4">
                        <SingleFrame
                          url={sceneFrames.start}
                          label={i === 0 ? 'Scene Frame (T2I)' : 'Scene Frame (from prev)'}
                          onRegen={() => generateFrame(i, 'single')}
                          loading={loading}
                        />
                        <div className="flex-1 text-xs text-slate-500">
                          {i === 0 ? (
                            <p>This is the opening frame. Generated fresh from your visual style.</p>
                          ) : sceneFrames.start ? (
                            <p>Extracted from Scene {i}'s last video frame. You can regenerate if needed.</p>
                          ) : (
                            <p>Will be extracted from Scene {i}'s video output.</p>
                          )}
                          <ReferenceImageInput sceneIdx={i} sceneRefs={sceneRefs} setSceneRefs={setSceneRefs}
                            prevFrameUrl={i > 0 ? (frames[i - 1]?.extractedLastFrame || frames[i - 1]?.start) : null}
                            prevLabel={i > 0 ? `Scene ${i} last frame` : null}
                            onOpenLibrary={setLibraryForScene} />
                        </div>
                      </div>
                      {!sceneFrames.start && i === 0 && (
                        <button onClick={() => generateFrame(0, 'single')} disabled={loading}
                          className="mt-3 px-3 py-2 bg-[#2C666E] text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                          Generate First Frame
                        </button>
                      )}
                    </>
                  )}

                  {/* Character Cameos (optional) */}
                  {!isCurrentInI2V && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <details className="group">
                        <summary className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <Users className="w-3 h-3" /> Characters {(sceneCharacters[i] || []).length > 0 && <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 rounded font-semibold">{sceneCharacters[i].length}</span>}
                        </summary>
                        <div className="mt-2">
                          <CharacterPicker
                            value={sceneCharacters[i] || []}
                            onChange={(chars) => setSceneCharacters(prev => ({ ...prev, [i]: chars }))}
                            maxSelect={3}
                          />
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Motion Reference (optional) */}
                  {!isCurrentInI2V && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {!sceneMotionRefs[i] ? (
                        <button
                          onClick={() => updateSceneMotionRef(i, { model: 'kling_motion_control' })}
                          className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          <Film className="w-3 h-3" /> Add Motion Reference
                        </button>
                      ) : (
                        <MotionReferenceInput
                          motionRef={sceneMotionRefs[i]}
                          onChange={(ref) => updateSceneMotionRef(i, ref)}
                          onClear={() => clearSceneMotionRef(i)}
                        />
                      )}
                    </div>
                  )}
                </Panel>
              );
            })}

            <div className="flex justify-between">
              <button onClick={() => goTo('timing')} className="px-5 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-400 hover:bg-slate-800/40">← Back</button>
              <button onClick={() => completeAndGo('clips')}
                className="px-6 py-2.5 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#1f4f55]">
                Next: Video Clips →
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 4: Video Clips                                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'clips' && (
          <>
            <Panel title="Generate Video Clips" right={<span className="inline-flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase bg-red-900/30 text-red-400 px-2 py-0.5 rounded">🔇 generate_audio: false</span>
              <CostBadge amount={(blocks.length * (VIDEO_MODELS.find(m => m.value === videoModel)?.costPerClip || 0.5)).toFixed(2)} />
            </span>}>

              {/* Multi-Shot toggle (Kling V3/O3 only) */}
              {MULTI_SHOT_MODELS.includes(videoModel) && blocks.length >= 2 && blocks.length <= 6 && (
                <div className="flex items-center gap-3 mb-3 p-2.5 bg-purple-900/30 border border-purple-700/40 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={multiShotMode} onChange={(e) => setMultiShotMode(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-purple-600 text-purple-600 focus:ring-purple-500" />
                    <span className="text-xs font-semibold text-purple-300">Multi-Shot Mode</span>
                  </label>
                  <span className="text-[10px] text-purple-300 flex-1">
                    Generate all {blocks.length} scenes in a single Kling call with better cross-scene consistency (max 15s total, 6 scenes).
                  </span>
                  {blocks.reduce((sum, b) => sum + (b.clipDuration || 3), 0) > 15 && (
                    <span className="text-[10px] font-bold text-red-400">Total &gt; 15s!</span>
                  )}
                </div>
              )}

              {/* Multi-Shot generate button */}
              {multiShotMode && MULTI_SHOT_MODELS.includes(videoModel) ? (
                <div className="mb-4">
                  {multiShotResult ? (
                    <div className="p-3 bg-emerald-900/30 border border-emerald-700/40 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-300 mb-1">Multi-Shot Video Generated</p>
                      <p className="text-[10px] text-emerald-400">{multiShotResult.total_duration}s video with {blocks.length} scenes in one continuous shot.</p>
                      <video src={multiShotResult.video_url} controls className="w-full max-w-md mt-2 rounded-lg" />
                    </div>
                  ) : (
                    <button onClick={generateMultiShot} disabled={multiShotLoading}
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      {multiShotLoading
                        ? <><Loader2 className="w-3.5 h-3.5 inline mr-1.5 animate-spin" />Generating multi-shot...</>
                        : <><Film className="w-3.5 h-3.5 inline mr-1.5" />Generate Multi-Shot ({blocks.length} scenes, {blocks.reduce((s, b) => s + (b.clipDuration || 3), 0)}s)</>}
                    </button>
                  )}
                </div>
              ) : mode === 'flf' && (
                <button onClick={() => blocks.forEach((_, i) => { if (frames[i]?.start && frames[i]?.end && !clips[i]?.url) generateClip(i); })}
                  className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-xs font-semibold hover:bg-[#1f4f55] mb-4">
                  <Film className="w-3.5 h-3.5 inline mr-1.5" />Generate All Clips (parallel)
                </button>
              )}

              {blocks.map((block, i) => {
                const clip = clips[i] || {};
                const sceneFrames = frames[i] || {};
                const sceneMode = sceneMotionRefs[i]?.videoUrl ? 'mt' : mode;
                const canGenerate = sceneMode === 'flf'
                  ? sceneFrames.start && sceneFrames.end
                  : sceneFrames.start;
                const isWaiting = (sceneMode === 'i2v' || sceneMode === 'mt') && i > 0 && !clips[i - 1]?.url;

                return (
                  <div key={i} className="border border-slate-700/40 rounded-xl mb-2 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-7 h-7 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          {block.frameworkLabel || 'Scene'}
                          {sceneMode === 'mt' && <span className="text-[9px] font-bold bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded">MT</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">{block.clipDuration}s planned</div>
                      </div>
                      {/* Camera control compact toggle */}
                      {sceneMode !== 'mt' && (
                        <CameraControlPanel
                          value={sceneCameraConfigs[i]}
                          onChange={(config) => updateSceneCameraConfig(i, config)}
                          compact
                        />
                      )}
                      {clip.status === 'done' && (
                        <div className="flex items-center gap-2">
                          <Tag color="teal">✓ {clip.actualDuration?.toFixed(1)}s actual</Tag>
                          {clip.url && (
                            <video src={clip.url} controls className="h-16 rounded-lg" />
                          )}
                        </div>
                      )}
                      {clip.status === 'generating' && <Tag color="amber"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Generating...</Tag>}
                      {clip.status === 'failed' && <Tag color="red">Failed</Tag>}
                      {!clip.status && isWaiting && <Tag>Waiting for Scene {i} clip</Tag>}
                      {!clip.status && !isWaiting && canGenerate && (
                        <button onClick={() => generateClip(i)} disabled={clipLoading.size > 0}
                          className="px-3 py-1.5 bg-[#2C666E] text-white rounded-lg text-[10px] font-semibold disabled:opacity-50">
                          Generate
                        </button>
                      )}
                      {!clip.status && !canGenerate && !isWaiting && <Tag>Need frames</Tag>}
                    </div>
                  </div>
                );
              })}

              {/* Duration validation */}
              {Object.values(clips).some(c => c?.actualDuration) && (
                <div className="bg-slate-900 rounded-xl p-4 mt-4 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Planned: <strong>{blocks.reduce((s, b) => s + b.clipDuration, 0)}s</strong></span>
                    <span>Actual: <strong>{Object.values(clips).reduce((s, c) => s + (c?.actualDuration || 0), 0).toFixed(1)}s</strong></span>
                    <span>TTS: <strong>{effectiveDuration?.toFixed(1)}s</strong></span>
                    <span>Drift: <strong className={Math.abs(Object.values(clips).reduce((s, c) => s + (c?.actualDuration || 0), 0) - effectiveDuration) < 3 ? 'text-emerald-400' : 'text-amber-400'}>
                      {Math.abs(Object.values(clips).reduce((s, c) => s + (c?.actualDuration || 0), 0) - effectiveDuration).toFixed(1)}s
                    </strong></span>
                  </div>
                </div>
              )}

              {/* Avatar Generation */}
              {avatarMode && avatarSubjectId && (
                <div className="mt-4 pt-4 border-t border-slate-700/30">
                  <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
                    Avatar — {avatarSubjectName}
                    <span className="text-[9px] text-slate-400 font-normal">(bottom 40% of split-screen)</span>
                  </h3>

                  {/* Portrait preview */}
                  {avatarPortraitUrl && (
                    <div className="mb-3">
                      <p className="text-[9px] text-slate-400 mb-1">Presenter Portrait</p>
                      <img src={avatarPortraitUrl} alt="Avatar portrait" className="h-24 rounded-lg border border-slate-700/40" />
                    </div>
                  )}

                  {/* Progress stages */}
                  {avatarStage && avatarStage !== 'done' && (
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2C666E]" />
                      <span className="text-xs text-slate-400">
                        {avatarStage === 'portrait' && 'Generating portrait...'}
                        {avatarStage === 'animating' && 'Animating avatar (this may take a few minutes)...'}
                        {avatarStage === 'lipsyncing' && 'Lip-syncing to voiceover...'}
                      </span>
                    </div>
                  )}

                  {/* Done — show lip-synced preview */}
                  {avatarStage === 'done' && avatarLipsyncUrl && (
                    <div className="mb-3">
                      <Tag color="teal">✓ Avatar ready</Tag>
                      <video src={avatarLipsyncUrl} controls className="h-28 rounded-lg mt-2" />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!avatarStage && (
                      <button onClick={generateAvatarPipeline} disabled={avatarLoading || !voiceoverUrl}
                        className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-[10px] font-semibold hover:bg-[#1f4f55] disabled:opacity-50">
                        Generate Avatar Video
                      </button>
                    )}
                    {avatarStage === 'done' && (
                      <button onClick={regenerateAvatar} disabled={avatarLoading}
                        className="px-3 py-1.5 border border-slate-600/50 rounded-lg text-[10px] font-medium text-slate-400 hover:bg-slate-800/40 disabled:opacity-50">
                        Regenerate
                      </button>
                    )}
                    {!voiceoverUrl && (
                      <p className="text-[9px] text-amber-500 self-center">Generate voiceover in Step 1 first</p>
                    )}
                  </div>
                </div>
              )}
            </Panel>

            <div className="flex justify-between">
              <button onClick={() => goTo('frames')} className="px-5 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-400 hover:bg-slate-800/40">← Back</button>
              <button onClick={() => completeAndGo('assemble')}
                disabled={!Object.values(clips).some(c => c?.url)}
                className="px-6 py-2.5 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#1f4f55] disabled:opacity-50">
                Next: Assemble →
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 5: Assemble                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'assemble' && (
          <>
            <Panel title="Assemble Final Video" right={<CostBadge amount="0.12" label="FFmpeg + captions" />}>
              <div className="flex gap-5 items-start">
                <div className="w-1/2 shrink-0">
                  <div className="bg-slate-800/40 rounded-xl p-4 text-xs space-y-2 mb-4">
                    {blocks.map((b, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-slate-400"><strong>Scene {i + 1}:</strong> {b.frameworkLabel}</span>
                        <span className="text-slate-400">{clips[i]?.actualDuration?.toFixed(1) || b.clipDuration}s</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-700/30 pt-2 mt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{Object.values(clips).reduce((s, c) => s + (c?.actualDuration || 0), 0).toFixed(1)}s video · {effectiveDuration?.toFixed(1)}s voice</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={enableMusic && !!musicUrl} disabled={!musicUrl} onChange={() => {}} />
                      Music ({Math.round(musicVolume * 100)}% vol)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked disabled />
                      Burn captions (Word Pop)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked disabled />
                      <span className="text-slate-400">Strip model audio (always on)</span>
                    </label>
                  </div>

                  <button onClick={assembleVideo} disabled={assembleLoading}
                    className="w-full px-4 py-3 bg-[#2C666E] text-white rounded-xl text-sm font-bold hover:bg-[#1f4f55] disabled:opacity-50">
                    {assembleLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Film className="w-4 h-4 inline mr-2" />}
                    Assemble Final Video
                  </button>
                </div>

                <div className="w-1/2">
                  {finalUrl ? (
                    <div>
                      <video src={finalUrl} controls className="w-full rounded-xl border border-slate-700/40" style={{ maxHeight: '500px' }} />
                      <div className="flex gap-2 mt-3">
                        <a href={finalUrl} download className="flex-1 px-3 py-2 border border-slate-700/40 rounded-lg text-xs font-semibold text-center text-slate-400 hover:bg-slate-800/40">
                          <Download className="w-3 h-3 inline mr-1" />Download
                        </a>
                        <button onClick={assembleVideo} className="px-3 py-2 border border-slate-700/40 rounded-lg text-xs text-slate-400">
                          <RotateCcw className="w-3 h-3 inline mr-1" />Re-assemble
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 rounded-xl aspect-[9/16] max-h-[450px] flex items-center justify-center flex-col gap-2 text-slate-500">
                      <Film className="w-10 h-10" />
                      <span className="text-sm">Assemble to preview</span>
                    </div>
                  )}

                  {/* Quality Review Gate */}
                  {reviewLoading && (
                    <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/40 rounded-lg flex items-center gap-2 text-sm text-blue-300">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Reviewing scenes for visual-narration alignment...
                    </div>
                  )}

                  {reviewError && !reviewLoading && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-sm text-red-300">
                      Quality review failed: {reviewError}
                      <button onClick={() => setReviewError(null)} className="ml-2 underline text-red-400">Dismiss</button>
                    </div>
                  )}

                  {reviewResults && !reviewLoading && (() => {
                    const flagged = reviewResults.filter(r => !r.match);
                    const passed = reviewResults.filter(r => r.match);
                    const allPass = flagged.length === 0;

                    return (
                      <div className="mt-4">
                        {/* Summary banner */}
                        <div className={`p-3 rounded-lg border text-sm font-medium ${allPass ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300' : 'bg-amber-900/30 border-amber-700/40 text-amber-300'}`}>
                          {allPass
                            ? `All ${reviewResults.length} scenes match narration ✓`
                            : `${flagged.length} of ${reviewResults.length} scenes flagged for review`}
                        </div>

                        {/* Flagged scenes (expanded) */}
                        {flagged.map(r => (
                          <div key={r.scene_index} className="mt-2 p-3 bg-amber-900/30 border border-amber-700/40 rounded-lg">
                            <div className="flex items-start gap-3">
                              {r.frame_url && (
                                <img src={r.frame_url} alt={`Scene ${r.scene_index + 1}`} className="w-24 h-16 object-cover rounded border border-amber-700/40" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-amber-300">Scene {r.scene_index + 1} &mdash; Mismatch</div>
                                <div className="text-xs text-amber-400 mt-1">{r.reason}</div>
                                <div className="text-[11px] text-amber-300 mt-1 italic truncate">
                                  Narration: &quot;{blocks[r.scene_index]?.narration?.slice(0, 120)}&quot;
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                await generateClip(r.scene_index);
                                setReviewResults(prev => prev?.map(pr =>
                                  pr.scene_index === r.scene_index
                                    ? { ...pr, match: true, reason: 'Repaired — re-assemble to update final video' }
                                    : pr
                                ));
                                toast.warning('Scene repaired. Click Re-assemble to update the final video.');
                              }}
                              disabled={clipLoading.size > 0}
                              className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                              {clipLoading.has(r.scene_index) ? 'Repairing...' : `Repair Scene ${r.scene_index + 1}`}
                            </button>
                          </div>
                        ))}

                        {/* Passing scenes (collapsed) */}
                        {passed.length > 0 && !allPass && (
                          <details className="mt-2">
                            <summary className="text-xs text-emerald-400 cursor-pointer">{passed.length} scenes passed ✓</summary>
                            {passed.map(r => (
                              <div key={r.scene_index} className="mt-1 p-2 bg-emerald-900/30 border border-emerald-700/40 rounded text-xs text-emerald-300 flex items-center gap-2">
                                {r.frame_url && <img src={r.frame_url} alt="" className="w-12 h-8 object-cover rounded" />}
                                <span>Scene {r.scene_index + 1}: {r.reason}</span>
                              </div>
                            ))}
                          </details>
                        )}

                        {/* All-pass expandable detail */}
                        {allPass && reviewResults.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-emerald-400 cursor-pointer">View scene details</summary>
                            {reviewResults.map(r => (
                              <div key={r.scene_index} className="mt-1 p-2 bg-emerald-900/30 border border-emerald-700/40 rounded text-xs text-emerald-300 flex items-center gap-2">
                                {r.frame_url && <img src={r.frame_url} alt="" className="w-12 h-8 object-cover rounded" />}
                                <span>Scene {r.scene_index + 1}: {r.reason} ({Math.round(r.confidence * 100)}%)</span>
                              </div>
                            ))}
                          </details>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Panel>

            {/* Repurpose panel — shown after assembly completes */}
            {finalUrl && draftId && (
              <RepurposePanel draftId={draftId} videoUrl={finalUrl} />
            )}

            <div className="flex justify-between">
              <button onClick={() => goTo('clips')} className="px-5 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-400 hover:bg-slate-800/40">← Back</button>
            </div>
          </>
        )}
      </main>

      {/* Library picker for reference images */}
      {libraryForScene !== null && (
        <LibraryModal isOpen={true} mediaType="image"
          onClose={() => setLibraryForScene(null)}
          onSelect={(item) => {
            const url = item.url || item.public_url;
            if (url) setSceneRefs(prev => ({ ...prev, [libraryForScene]: { url, source: 'library' } }));
            setLibraryForScene(null);
          }} />
      )}
    </div>
  );
}
