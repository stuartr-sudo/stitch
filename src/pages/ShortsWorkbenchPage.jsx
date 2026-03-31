import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Play, Pause, RotateCcw, Check, ChevronDown, ChevronUp,
  Eye, Wand2, Music, Volume2, Download, ImageIcon, Film, Scissors, AlertTriangle, Link, X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
import StyleGrid from '@/components/ui/StyleGrid';
import { GEMINI_VOICES, FEATURED_VOICES } from '@/lib/geminiVoices';
import { FRAMEWORK_CARDS, getFrameworksForNiche } from '@/lib/videoStyleFrameworks';
import { TOPIC_SUGGESTIONS } from '@/lib/topicSuggestions';

// ── Constants ──────────────────────────────────────────────────────────────

const FLF_MODELS = ['fal_veo3', 'fal_kling_v3', 'fal_kling_o3'];
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
  ai_tech_news: 'Fast-paced, authoritative news-anchor energy. Short punchy sentences. Pattern interrupts every 10 seconds.',
  finance_money: 'Confident and calm, like a trusted financial advisor. Clear actionable language. Build credibility through specific numbers.',
  motivation_self_help: 'Slow and deliberate at emotional moments, building intensity. Pauses for impact. Like a storyteller around a campfire.',
  scary_horror: 'Slow and hushed, building dread. Whisper-like at tense moments. Sudden pace changes at reveals. Like reading a scary story at midnight.',
  history_did_you_know: 'Storyteller energy — measured pace with dramatic pauses. Build wonder and surprise.',
  true_crime: 'Measured and deliberate like a documentary narrator. Build dread with facts. Let silences breathe.',
  science_nature: 'Curious and enthusiastic like a passionate science teacher. Build from simple to mind-blowing. Use analogies.',
  relationships_dating: 'Warm and conversational, like a trusted friend who studied psychology. Empathetic tone. No judgment.',
  health_fitness: 'Energetic and direct, like a knowledgeable personal trainer. Cut through myths with confidence. Use numbers.',
  gaming_popculture: 'Enthusiastic fan energy — excited but knowledgeable. Like the most passionate person at a gaming convention.',
  conspiracy_mystery: 'Measured and curious, like a journalist uncovering something. Not sensationalist — let the facts speak.',
  business_entrepreneur: 'Direct and high-energy, like a successful founder on a podcast. No corporate fluff. Talk straight.',
  food_cooking: 'Warm and enthusiastic, like a passionate chef sharing secrets. Use sensory language — describe tastes, textures, aromas.',
  travel_adventure: 'Dreamy and vivid like a travel documentary. Paint pictures with words. Build wonder and desire.',
  psychology_mindblown: 'Measured and insightful, like a fascinating psychology professor. Build revelations gradually. Use "you" to make it personal.',
  space_cosmos: 'Awestruck and measured, building from curiosity to cosmic wonder. Use analogies to make incomprehensible scales relatable.',
  animals_wildlife: 'Curious and amazed like a nature documentary narrator. Build wonder through specific details. Use vivid descriptions.',
  sports_athletes: 'Excited sports commentary energy, building tension toward the climax. Slow down at emotional beats. Fast during action.',
  education_learning: 'Enthusiastic teacher energy, like someone who just discovered something incredible. Build surprise through delivery.',
  paranormal_ufo: 'Investigative journalist tone — serious and measured. Let the evidence speak. Build intrigue through facts, not sensationalism.',
};

// Universal voice style quick-picks (niche-independent)
const VOICE_STYLE_PRESETS = [
  { label: 'Documentary', value: 'Authoritative documentary narrator. Measured pace, dramatic pauses at reveals, steady confident delivery.' },
  { label: 'Storyteller', value: 'Captivating storyteller energy. Build tension gradually, vary pace with the narrative arc, pause at emotional peaks.' },
  { label: 'News Anchor', value: 'Fast-paced breaking news energy. Short punchy sentences, urgent tone, pattern interrupts to maintain attention.' },
  { label: 'Whispering', value: 'Hushed and intimate, like sharing a secret. Slow deliberate delivery, whisper-like at tense moments, sudden pace changes.' },
  { label: 'High Energy', value: 'Electric high-energy delivery. Rapid-fire sentences, enthusiastic peaks, keep the adrenaline pumping throughout.' },
  { label: 'Teacher', value: 'Enthusiastic teacher sharing a breakthrough discovery. Build from simple to mind-blowing, use analogies, keep it personal.' },
  { label: 'Campfire', value: 'Fireside storyteller. Slow and deliberate, building intensity at emotional moments. Pauses for impact. Draw listeners in.' },
  { label: 'Podcast Host', value: 'Casual conversational podcast energy. Direct, no fluff, talk straight like you\'re explaining to a friend over coffee.' },
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
  return (
    <div className="flex gap-1 bg-white rounded-xl p-3 border border-slate-200 mb-6 overflow-x-auto">
      {STEPS.map((s) => {
        const isCurrent = current === s.key;
        const isDone = completed.includes(s.key);
        return (
          <button key={s.key} onClick={() => (isDone || isCurrent) && onSelect(s.key)}
            className={cn(
              'flex-1 min-w-[100px] rounded-lg px-3 py-2 text-center transition-all border-2',
              isCurrent && 'bg-[#2C666E] text-white border-[#2C666E]',
              isDone && !isCurrent && 'bg-emerald-50 text-emerald-700 border-emerald-500 cursor-pointer',
              !isCurrent && !isDone && 'bg-slate-50 text-slate-400 border-transparent cursor-default',
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
    <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-semibold">
      ${typeof amount === 'number' ? amount.toFixed(2) : amount}{label && ` · ${label}`}
    </span>
  );
}

function Tag({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    teal: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-700',
  };
  return <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', colors[color])}>{children}</span>;
}

function Panel({ title, right, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
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
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; if (audioRef.current) audioRef.current.currentTime = pct * duration; }}>
            <div className="h-full bg-[#2C666E] rounded-full transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          </div>
        </div>
        <span className="text-[11px] text-slate-500 font-mono tabular-nums w-20 text-right">
          {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
        </span>
      </div>
      {onSpeedChange && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] text-slate-400 font-semibold mr-1">Speed:</span>
          {SPEED_OPTIONS.map(s => (
            <button key={s} onClick={() => { onSpeedChange(s); if (audioRef.current) audioRef.current.playbackRate = s; }}
              className={cn('px-2 py-0.5 rounded text-[10px] font-bold border transition-all',
                speed === s ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
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
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
      <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
        {startUrl ? (
          <img src={startUrl} alt="Start frame" className="w-full aspect-[9/16] object-cover" />
        ) : (
          <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
        )}
        <div className="px-3 py-2 bg-emerald-50 text-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">{startLabel || 'Start Frame'}</span>
        </div>
        <div className="px-3 py-1.5 flex justify-center">
          <button onClick={onRegenStart} disabled={loading} className="text-[10px] text-[#2C666E] font-semibold hover:underline disabled:opacity-50">
            <RotateCcw className="w-3 h-3 inline mr-1" />Regenerate
          </button>
        </div>
      </div>

      <div className="text-2xl text-[#2C666E] font-bold">→</div>

      <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
        {endUrl ? (
          <img src={endUrl} alt="End frame" className="w-full aspect-[9/16] object-cover" />
        ) : (
          <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
        )}
        <div className="px-3 py-2 bg-amber-50 text-center">
          <span className="text-[10px] font-bold text-amber-700 uppercase">{endLabel || 'End Frame'}</span>
        </div>
        <div className="px-3 py-1.5 flex justify-center">
          <button onClick={onRegenEnd} disabled={loading} className="text-[10px] text-[#2C666E] font-semibold hover:underline disabled:opacity-50">
            <RotateCcw className="w-3 h-3 inline mr-1" />Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

function SingleFrame({ url, label, onRegen, loading }) {
  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden max-w-[200px]">
      {url ? (
        <img src={url} alt={label} className="w-full aspect-[9/16] object-cover" />
      ) : (
        <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-300" />
        </div>
      )}
      <div className="px-3 py-2 bg-slate-50 text-center">
        <span className="text-[10px] font-bold text-slate-600 uppercase block">{label}</span>
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

function ReferenceImageInput({ sceneIdx, sceneRefs, setSceneRefs, prevFrameUrl, prevLabel }) {
  const [showInput, setShowInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const ref = sceneRefs[sceneIdx];

  const setRef = (url, source) => setSceneRefs(prev => ({ ...prev, [sceneIdx]: { url, source } }));
  const clearRef = () => setSceneRefs(prev => { const n = { ...prev }; delete n[sceneIdx]; return n; });

  if (ref?.url) {
    return (
      <div className="flex items-center gap-2 mt-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
        <img src={ref.url} alt="Reference" className="w-10 h-14 object-cover rounded" />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold text-indigo-700 uppercase">Reference Image ({ref.source})</div>
          <div className="text-[9px] text-indigo-500 truncate">{ref.url.split('/').pop()}</div>
        </div>
        <button onClick={clearRef} className="p-1 text-indigo-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {!showInput ? (
        <button onClick={() => setShowInput(true)}
          className="text-[10px] text-indigo-600 font-medium hover:underline flex items-center gap-1">
          <Link className="w-3 h-3" />Use reference image (I2I)
        </button>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
          <div className="text-[9px] font-bold text-slate-500 uppercase">Reference Image for I2I</div>
          <div className="flex gap-1.5">
            {prevFrameUrl && (
              <button onClick={() => { setRef(prevFrameUrl, prevLabel || 'prev scene'); setShowInput(false); }}
                className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[9px] font-semibold hover:bg-indigo-200 truncate max-w-[140px]">
                {prevLabel || 'Prev scene frame'}
              </button>
            )}
            <button onClick={() => setShowInput(false)} className="px-2 py-1 text-slate-400 text-[9px] hover:text-slate-600">Cancel</button>
          </div>
          <div className="flex gap-1">
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="Paste image URL..."
              className="flex-1 border border-slate-200 rounded px-2 py-1 text-[10px]" />
            <button onClick={() => { if (urlInput.trim()) { setRef(urlInput.trim(), 'url'); setUrlInput(''); setShowInput(false); } }}
              disabled={!urlInput.trim()}
              className="px-2 py-1 bg-[#2C666E] text-white rounded text-[9px] font-semibold disabled:opacity-50">
              Use
            </button>
          </div>
        </div>
      )}
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
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchedStories, setResearchedStories] = useState([]);
  const [selectedStoryIdx, setSelectedStoryIdx] = useState(null);
  const [script, setScript] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [geminiVoice, setGeminiVoice] = useState('Perseus');
  const [styleInstructions, setStyleInstructions] = useState('Authoritative documentary narrator. Measured pace, dramatic pauses at reveals, steady confident delivery.');
  const [voiceoverUrl, setVoiceoverUrl] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.1);
  const [voiceApproved, setVoiceApproved] = useState(false);

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

  // ── Step 4: Clips ───────────────────────────────────────────────
  const [clips, setClips] = useState({}); // { sceneIdx: { url, actualDuration, status } }
  const [clipLoading, setClipLoading] = useState(null);

  // ── Step 5: Assembly ────────────────────────────────────────────
  const [finalUrl, setFinalUrl] = useState(null);
  const [assembleLoading, setAssembleLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  // ── Draft persistence ──────────────────────────────────────────
  const [draftId, setDraftId] = useState(null);
  const [draftList, setDraftList] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const lastSaveRef = useRef(null);

  const getWorkbenchState = () => ({
    step, niche, topic, storyContext, framework: framework?.id || null,
    duration, script, geminiVoice, styleInstructions, voiceSpeed,
    voiceoverUrl, voiceApproved,
    blocks, ttsDuration, rawTtsDuration, musicUrl, musicApproved, musicVolume, enableMusic,
    visualStyle, videoStyle, imageModel, videoModel, aspectRatio,
    frames, scenePrompts, sceneRefs, clips, finalVideoUrl: finalUrl,
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
      setNiche(s.niche || ''); setTopic(s.topic || ''); setStoryContext(s.storyContext || '');
      setDuration(s.duration || 60); setScript(s.script || '');
      setGeminiVoice(s.geminiVoice || 'Perseus'); setStyleInstructions(s.styleInstructions || '');
      setVoiceSpeed(s.voiceSpeed || 1.1); setVoiceoverUrl(s.voiceoverUrl || null);
      setVoiceApproved(s.voiceApproved || false);
      setBlocks(s.blocks || []); setTtsDuration(s.rawTtsDuration || s.ttsDuration || null); setRawTtsDuration(s.rawTtsDuration || s.ttsDuration || null);
      setMusicUrl(s.musicUrl || null); setMusicApproved(s.musicApproved || false);
      setMusicVolume(s.musicVolume ?? 0.2); setEnableMusic(s.enableMusic ?? true);
      setVisualStyle(s.visualStyle || ''); setVideoStyle(s.videoStyle || 'cinematic');
      setImageModel(s.imageModel || 'fal_nano_banana'); setVideoModel(s.videoModel || 'fal_veo3');
      setAspectRatio(s.aspectRatio || '9:16');
      setFrames(s.frames || {}); setScenePrompts(s.scenePrompts || {}); setSceneRefs(s.sceneRefs || {}); setClips(s.clips || {});
      setFinalUrl(s.finalVideoUrl || null);
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

  const generateScript = async () => {
    if (!niche || !topic.trim()) { toast.error('Pick a niche and enter a topic'); return; }
    setScriptLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/preview-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topic: topic.trim(), story_context: storyContext, videoLengthPreset: duration, framework: framework?.id }),
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

  const generateMusic = async () => {
    setMusicLoading(true);
    setMusicApproved(false);
    try {
      const res = await apiFetch('/api/workbench/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework_id: framework?.id, niche, duration: Math.ceil(effectiveDuration) + 3 }),
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
    if (!sceneFrames?.start) { toast.error(`Scene ${sceneIdx + 1}: no start frame`); return; }
    if (mode === 'flf' && !sceneFrames?.end) { toast.error(`Scene ${sceneIdx + 1}: no end frame`); return; }

    setClipLoading(sceneIdx);
    setClips(prev => ({ ...prev, [sceneIdx]: { ...prev[sceneIdx], status: 'generating' } }));

    try {
      const promptData = scenePrompts[sceneIdx] || {};
      const res = await apiFetch('/api/workbench/generate-clip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          video_model: videoModel,
          start_frame_url: sceneFrames.start,
          end_frame_url: mode === 'flf' ? sceneFrames.end : undefined,
          motion_prompt: promptData.motionPrompt || 'Smooth cinematic movement',
          video_style: videoStyle,
          duration: block.clipDuration,
          aspect_ratio: aspectRatio,
          scene_index: sceneIdx,
        }),
      });
      const data = await parseApiResponse(res);

      setClips(prev => ({
        ...prev,
        [sceneIdx]: { url: data.video_url, actualDuration: data.actual_duration, status: 'done' },
      }));

      // For I2V mode: store extracted last frame + vision analysis for next scene
      if (mode === 'i2v' && data.last_frame_url) {
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
    finally { setClipLoading(null); }
  };

  const assembleVideo = async () => {
    const validClips = blocks.map((_, i) => clips[i]).filter(c => c?.url);
    if (validClips.length === 0) { toast.error('No video clips to assemble'); return; }
    setAssembleLoading(true);
    try {
      const res = await apiFetch('/api/workbench/assemble', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: blocks.map((b, i) => ({ url: clips[i]?.url, duration: clips[i]?.actualDuration || b.clipDuration })).filter(c => c.url),
          voiceover_url: voiceoverUrl,
          music_url: enableMusic ? musicUrl : null,
          music_volume: musicVolume,
          tts_duration: effectiveDuration,
          voice_speed: voiceSpeed,
          caption_config: { font_name: 'Montserrat', font_size: 100, font_weight: 'bold', font_color: 'white', highlight_color: 'purple', stroke_width: 3, stroke_color: 'black', words_per_subtitle: 1, enable_animation: true },
        }),
      });
      const data = await parseApiResponse(res);
      setFinalUrl(data.video_url);
      toast.success('Video assembled!');
    } catch (err) { toast.error(err.message || 'Assembly failed'); }
    finally { setAssembleLoading(false); }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Shorts Workbench</h1>
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
            <button onClick={() => navigate('/')} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Home</button>
            <button onClick={() => navigate('/campaigns')} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Campaigns</button>
            <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded-md text-[9px] font-bold uppercase">
              🔇 No audio in clips
            </span>
          </div>
        </div>
      </header>

      {/* Drafts dropdown */}
      {showDrafts && (
        <div className="bg-white border-b shadow-md">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Saved Drafts</h3>
            {draftList.length === 0 ? (
              <p className="text-xs text-slate-400">No saved drafts yet.</p>
            ) : (
              <div className="grid gap-2">
                {draftList.map(d => (
                  <button key={d.id} onClick={() => loadDraft(d.id)}
                    className={cn('text-left px-4 py-3 rounded-lg border transition-all hover:bg-slate-50',
                      d.id === draftId ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200')}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{d.topic}</span>
                      <span className="text-[10px] text-slate-400">{new Date(d.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {d.niche && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{d.niche}</span>}
                      <span className="text-[10px] text-slate-400">Step {d.step || '?'}</span>
                      {d.has_video && <span className="text-[10px] text-emerald-600 font-bold">Video ready</span>}
                    </div>
                  </button>
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
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Niche</label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                    {NICHES.map(n => (
                      <button key={n.key} onClick={() => handleNicheChange(n.key)}
                        className={cn('p-2 rounded-lg border text-center transition-all text-[11px]',
                          niche === n.key ? 'border-[#2C666E] bg-[#2C666E]/5 ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300')}>
                        <div className="text-base">{n.icon}</div>
                        <div className="font-medium text-slate-700 mt-0.5">{n.label}</div>
                      </button>
                    ))}
                  </div>

                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mt-4 mb-1">Framework</label>
                  {(() => {
                    const allFw = niche ? getFrameworksForNiche(niche) : FRAMEWORK_CARDS;
                    const nicheFw = niche ? allFw.filter(f => f.applicableNiches) : [];
                    const universalFw = allFw.filter(f => !f.applicableNiches);
                    const fwButton = (fw) => (
                      <button key={fw.id} onClick={() => { setFramework(fw); if (fw.supportedDurations?.length) setDuration(fw.supportedDurations[0]); }}
                        className={cn('px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                          framework?.id === fw.id ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
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

                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mt-4 mb-1">Duration</label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 90].map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                          duration === d ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-200 text-slate-600')}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Topic</label>
                    <button onClick={handleResearch} disabled={researchLoading || !niche || !topic.trim()}
                      className="text-[11px] font-semibold text-[#2C666E] hover:underline disabled:opacity-50 flex items-center gap-1">
                      {researchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Research
                    </button>
                  </div>
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Type a topic or pick from suggestions below..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />

                  {/* 3-level topic funnel */}
                  {niche && TOPIC_SUGGESTIONS[niche] && (() => {
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
                                  topicL1 === t.label ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]')}>
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
                                    topicL2 === t.label ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]')}>
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
                                    topicL3 === t ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]')}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Research results */}
                  {researchedStories.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <label className="text-[10px] font-medium text-[#2C666E] uppercase tracking-wide">Trending Stories — click to use</label>
                      {researchedStories.map((s, i) => (
                        <button key={i} onClick={() => {
                          setSelectedStoryIdx(i);
                          setTopic(s.title);
                          setStoryContext(s.story_context || s.summary || '');
                        }}
                          className={cn('w-full text-left p-3 border-2 rounded-xl text-xs transition-all',
                            selectedStoryIdx === i ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300')}>
                          <div className="font-semibold text-slate-800">{s.title}</div>
                          <div className="text-slate-500 mt-0.5 leading-relaxed">{s.angle || s.summary}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Script</label>
                    <button onClick={generateScript} disabled={scriptLoading || !niche || !topic.trim()}
                      className="text-[11px] font-semibold text-[#2C666E] hover:underline disabled:opacity-50 flex items-center gap-1">
                      {scriptLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Generate
                    </button>
                  </div>
                  <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Write or generate your narration script..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-40 resize-none" />
                  <div className="text-[10px] text-slate-400 mt-1">{script.split(/\s+/).filter(Boolean).length} words · ~{Math.round(script.split(/\s+/).filter(Boolean).length / 2.7)}s at 2.7 wps</div>
                </div>
              </div>
            </Panel>

            <Panel title="Voice & Voiceover" right={<CostBadge amount="0.01" />}>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Voice</label>
                  <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                    {sortedVoices.slice(0, 12).map(v => (
                      <button key={v.id} onClick={() => setGeminiVoice(v.id)}
                        className={cn('p-2 rounded-lg border text-left transition-all',
                          geminiVoice === v.id ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300')}>
                        <div className="text-[11px] font-semibold text-slate-700">{v.label}</div>
                        <div className="text-[9px] text-slate-400">{v.description}</div>
                      </button>
                    ))}
                  </div>

                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mt-3 mb-1">Voice Style</label>
                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {(niche && NICHE_VOICE_STYLES[niche] ? [{ label: NICHES.find(n => n.key === niche)?.label || 'Niche', value: NICHE_VOICE_STYLES[niche] }, ...VOICE_STYLE_PRESETS] : VOICE_STYLE_PRESETS).map(p => (
                      <button key={p.label} onClick={() => setStyleInstructions(p.value)}
                        className={cn('px-2 py-0.5 rounded text-[9px] font-medium border transition-all',
                          styleInstructions === p.value ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={styleInstructions} onChange={e => setStyleInstructions(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[11px] h-14 resize-none text-slate-600" placeholder="Custom voice style instructions..." />
                </div>

                <div>
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
                            voiceApproved ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-300')}>
                          <Check className="w-3 h-3 inline mr-1" />{voiceApproved ? 'Approved' : 'Approve Voiceover'}
                        </button>
                        <button onClick={generateVoiceover} disabled={voiceLoading}
                          className="px-3 py-2 rounded-lg text-xs text-slate-500 border border-slate-200 hover:bg-slate-50">
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
              <div className="bg-blue-50 border-l-3 border-blue-400 rounded-r-lg p-3 mb-4 text-xs text-blue-800">
                Whisper extracts word timestamps, then the block aligner snaps them to <strong>{videoModel}</strong>'s valid durations.
              </div>

              <div className="flex gap-3 mb-4">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider self-center">Video Model</label>
                <div className="flex gap-1.5 flex-wrap">
                  {VIDEO_MODELS.map(m => (
                    <button key={m.value} onClick={() => setVideoModel(m.value)}
                      className={cn('px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                        videoModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]' : 'border-slate-200 text-slate-600')}>
                      {m.label}
                      {FLF_MODELS.includes(m.value) && <span className="ml-1 text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded">FLF</span>}
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
                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl mb-2">
                      <div className="w-7 h-7 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-700">{b.frameworkLabel || 'Scene'} <span className="text-slate-400 font-normal">· {b.frameworkBeat}</span></div>
                        <div className="text-[11px] text-slate-500 truncate">{b.narration?.slice(0, 100)}...</div>
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
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', enableMusic ? 'translate-x-6' : 'translate-x-1')} />
                </button>
                <span className="text-sm text-slate-700 font-medium">Enable background music</span>
              </div>

              {enableMusic && (
                <>
                  <button onClick={generateMusic} disabled={musicLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 mb-3">
                    {musicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" /> : <Music className="w-3.5 h-3.5 inline mr-1.5" />}
                    Generate Music ($0.05)
                  </button>

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
                        <button onClick={generateMusic} className="px-3 py-2 rounded-lg text-xs text-slate-500 border border-slate-200">
                          <RotateCcw className="w-3 h-3 inline mr-1" />Redo
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </Panel>

            <div className="flex justify-between">
              <button onClick={() => goTo('script')} className="px-5 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">← Back</button>
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
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Visual Style</label>
                  <StyleGrid value={visualStyle} onChange={setVisualStyle} maxHeight="200px" hideLabel />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Image Model</label>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {IMAGE_MODELS.map(m => (
                      <button key={m.value} onClick={() => setImageModel(m.value)}
                        className={cn('px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                          imageModel === m.value ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]' : 'border-slate-200 text-slate-600')}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {['9:16', '16:9', '1:1'].map(ar => (
                      <button key={ar} onClick={() => setAspectRatio(ar)}
                        className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                          aspectRatio === ar ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]' : 'border-slate-200 text-slate-600')}>
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
              <strong>{mode === 'flf' ? 'FLF Mode:' : 'I2V Mode:'}</strong>{' '}
              {mode === 'flf'
                ? 'Generate START + END frame per scene. Approve pairs, then videos fire in parallel. Each scene\'s end frame becomes the next scene\'s start.'
                : 'Generate one frame per scene. Videos are sequential — each clip\'s last frame is extracted and becomes the next scene\'s input.'}
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
              const isCurrentInI2V = mode === 'i2v' && i > 0 && !clips[i - 1]?.url && !sceneFrames.start;
              const loading = frameLoading?.startsWith(`scene-${i}`);

              return (
                <Panel key={i}
                  title={<span className="inline-flex items-center gap-2">
                    <span className="w-6 h-6 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    {block.frameworkLabel || 'Scene'} <Tag>{block.clipDuration}s</Tag>
                    {sceneFrames.start && (mode === 'i2v' || sceneFrames.end) && <Tag color="teal">✓ Ready</Tag>}
                  </span>}
                  right={<CostBadge amount={mode === 'flf' ? '0.04' : '0.02'} label="per scene" />}
                >
                  <div className="text-[11px] text-slate-500 italic mb-3 bg-slate-50 p-2 rounded-lg">
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
                        prevLabel={i > 0 ? `Scene ${i} frame` : null} />

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
                            prevLabel={i > 0 ? `Scene ${i} last frame` : null} />
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
                </Panel>
              );
            })}

            <div className="flex justify-between">
              <button onClick={() => goTo('timing')} className="px-5 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">← Back</button>
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
              <span className="text-[9px] font-bold uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded">🔇 generate_audio: false</span>
              <CostBadge amount={(blocks.length * (VIDEO_MODELS.find(m => m.value === videoModel)?.costPerClip || 0.5)).toFixed(2)} />
            </span>}>

              {mode === 'flf' && (
                <button onClick={() => blocks.forEach((_, i) => { if (frames[i]?.start && frames[i]?.end && !clips[i]?.url) generateClip(i); })}
                  className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-xs font-semibold hover:bg-[#1f4f55] mb-4">
                  <Film className="w-3.5 h-3.5 inline mr-1.5" />Generate All Clips (parallel)
                </button>
              )}

              {blocks.map((block, i) => {
                const clip = clips[i] || {};
                const sceneFrames = frames[i] || {};
                const canGenerate = mode === 'flf'
                  ? sceneFrames.start && sceneFrames.end
                  : sceneFrames.start;
                const isWaiting = mode === 'i2v' && i > 0 && !clips[i - 1]?.url;

                return (
                  <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl mb-2">
                    <div className="w-7 h-7 bg-[#2C666E] text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-700">{block.frameworkLabel || 'Scene'}</div>
                      <div className="text-[10px] text-slate-400">{block.clipDuration}s planned</div>
                    </div>
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
                    {!clip.status && isWaiting && <Tag>Waiting for Scene {i}</Tag>}
                    {!clip.status && !isWaiting && canGenerate && (
                      <button onClick={() => generateClip(i)} disabled={clipLoading !== null}
                        className="px-3 py-1.5 bg-[#2C666E] text-white rounded-lg text-[10px] font-semibold disabled:opacity-50">
                        Generate
                      </button>
                    )}
                    {!clip.status && !canGenerate && !isWaiting && <Tag>Need frames</Tag>}
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
            </Panel>

            <div className="flex justify-between">
              <button onClick={() => goTo('frames')} className="px-5 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">← Back</button>
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
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2 mb-4">
                    {blocks.map((b, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-slate-600"><strong>Scene {i + 1}:</strong> {b.frameworkLabel}</span>
                        <span className="text-slate-400">{clips[i]?.actualDuration?.toFixed(1) || b.clipDuration}s</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-semibold">
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

                <div>
                  {finalUrl ? (
                    <div>
                      <video src={finalUrl} controls className="w-full rounded-xl border border-slate-200 shadow-sm" style={{ maxHeight: '500px' }} />
                      <div className="flex gap-2 mt-3">
                        <a href={finalUrl} download className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-center text-slate-600 hover:bg-slate-50">
                          <Download className="w-3 h-3 inline mr-1" />Download
                        </a>
                        <button onClick={assembleVideo} className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-500">
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
                </div>
              </div>
            </Panel>

            <div className="flex justify-between">
              <button onClick={() => goTo('clips')} className="px-5 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">← Back</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
