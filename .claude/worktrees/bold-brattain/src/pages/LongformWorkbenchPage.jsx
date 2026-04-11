import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Play, Pause, RotateCcw, Check, ChevronDown, ChevronUp,
  Wand2, Music, Volume2, Download, ImageIcon, Film, Scissors, Search,
  RefreshCw, BookOpen, FileText, Mic, Clock, Clapperboard, Layers, X, Link, FolderOpen,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
import StyleGrid from '@/components/ui/StyleGrid';
import { GEMINI_VOICES, FEATURED_VOICES } from '@/lib/geminiVoices';

// ── Constants ──────────────────────────────────────────────────────────────

const FLF_MODELS = ['fal_veo3', 'fal_veo3_lite', 'fal_kling_v3', 'fal_kling_o3'];
const SPEED_OPTIONS = [0.85, 0.9, 1.0, 1.1, 1.15, 1.25];

const DURATION_OPTIONS = [
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 8, label: '8 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
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

const NICHE_VOICE_STYLES = {
  ai_tech_news: 'Speak with clear, authoritative tech-documentary energy. Explain complex concepts simply and maintain steady momentum.',
  finance_money: 'Speak with confident professional authority. Keep a measured pace with clear emphasis on key figures and takeaways.',
  motivation_self_help: 'Speak with warm conviction and building intensity. Vary between powerful declarations and reflective pauses.',
  scary_horror: 'Speak with building tension and suspense. Start hushed, shift suddenly at reveals. Vary pace — slow dread then rapid bursts.',
  history_did_you_know: 'Speak with animated storytelling energy. Sound genuinely fascinated. Hit reveals with dramatic emphasis.',
  true_crime: 'Speak with gripping documentary intensity. Let key facts land with weight. Keep driving forward momentum.',
  science_nature: 'Speak with infectious curiosity and wonder. Build excitement toward each mind-blowing reveal.',
  relationships_dating: 'Speak warmly and directly like a perceptive friend. Genuine and insightful with conversational pace.',
  health_fitness: 'Speak with energetic, direct coaching energy. Punchy and confident.',
  gaming_popculture: 'Speak with excited fan energy. Genuinely hyped with enthusiastic emphasis.',
  conspiracy_mystery: 'Speak with intense investigative energy. Drive through revelations with building momentum.',
  business_entrepreneur: 'Speak with sharp, high-energy founder energy. Direct and punchy.',
  food_cooking: 'Speak with warm enthusiasm. Genuinely excited about flavors and techniques.',
  travel_adventure: 'Speak with vivid wonder about each destination. Make every place sound irresistible.',
  psychology_mindblown: 'Speak with fascinated intensity. Build insights with growing excitement.',
  space_cosmos: 'Speak with awestruck wonder. Genuinely amazed by cosmic scale.',
  animals_wildlife: 'Speak with animated fascination. Amazed by each creature.',
  sports_athletes: 'Speak with electric commentary energy. Excited and invested.',
  education_learning: 'Speak with infectious enthusiasm. Sound like you just discovered something incredible.',
  paranormal_ufo: 'Speak with serious investigative intensity. Compelling and focused.',
};

const VOICE_STYLE_PRESETS = [
  { label: 'Documentary', value: 'Speak with authoritative documentary narrator confidence. Drive forward with momentum. Emphasize reveals dramatically.' },
  { label: 'Storyteller', value: 'Speak with captivating storyteller energy. Vary pace — quick during action, slower at emotional peaks.' },
  { label: 'News Anchor', value: 'Speak with fast-paced breaking news energy. Short punchy sentences, urgent tone.' },
  { label: 'Teacher', value: 'Speak with infectious enthusiasm like a teacher sharing a breakthrough.' },
  { label: 'Podcast Host', value: 'Speak with casual, direct podcast energy. Quick conversational pace, no filler.' },
  { label: 'Calm Narrator', value: 'Speak calmly and steadily with warm resonance. Let pauses breathe naturally between sections.' },
];

const STEPS = [
  { key: 'research', label: 'Research', num: 1, icon: Search },
  { key: 'script', label: 'Script', num: 2, icon: FileText },
  { key: 'voice', label: 'Voice', num: 3, icon: Mic },
  { key: 'timing', label: 'Timing', num: 4, icon: Clock },
  { key: 'frames', label: 'Keyframes', num: 5, icon: ImageIcon },
  { key: 'clips', label: 'Video Clips', num: 6, icon: Clapperboard },
  { key: 'assemble', label: 'Assemble', num: 7, icon: Layers },
];

const MUSIC_MODELS = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'fal_lyria2', label: 'Lyria 2' },
  { value: 'suno', label: 'Suno' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const cn = (...classes) => classes.filter(Boolean).join(' ');
const isFLF = (model) => FLF_MODELS.includes(model);

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

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function StepRail({ current, completed, onSelect }) {
  return (
    <div className="flex gap-1 bg-white rounded-xl p-2 border border-slate-200 mb-6 overflow-x-auto">
      {STEPS.map((s) => {
        const isCurrent = current === s.key;
        const isDone = completed.includes(s.key);
        const Icon = s.icon;
        return (
          <button key={s.key} onClick={() => (isDone || isCurrent) && onSelect(s.key)}
            className={cn(
              'flex-1 min-w-[90px] rounded-lg px-2 py-2 text-center transition-all border-2',
              isCurrent && 'bg-[#2C666E] text-white border-[#2C666E]',
              isDone && !isCurrent && 'bg-emerald-50 text-emerald-700 border-emerald-500 cursor-pointer',
              !isCurrent && !isDone && 'bg-slate-50 text-slate-400 border-transparent cursor-default',
            )}>
            <Icon className={cn('w-3.5 h-3.5 mx-auto mb-0.5', isCurrent ? 'text-white' : isDone ? 'text-emerald-600' : 'text-slate-300')} />
            <div className="text-[9px] font-bold uppercase tracking-wider">Step {s.num}</div>
            <div className="text-[10px] font-semibold mt-0.5">{s.label}</div>
          </button>
        );
      })}
    </div>
  );
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
    else { audioRef.current.playbackRate = speed || 1.0; audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <audio ref={audioRef} src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => { if (audioRef.current) audioRef.current.playbackRate = speed || 1.0; }}
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
          {formatDuration(progress)} / {formatDuration(duration)}
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
        </div>
      )}
    </div>
  );
}

function ChapterSection({ chapter, chapterIndex, isExpanded, onToggle, children }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold flex items-center justify-center">
            {chapterIndex + 1}
          </span>
          <span className="text-sm font-semibold text-slate-800">{chapter.title}</span>
          <span className="text-[10px] text-slate-400 font-medium">
            {chapter.scenes?.length || 0} scenes
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isExpanded && <div className="p-4 border-t border-slate-100">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function LongformWorkbenchPage() {
  const navigate = useNavigate();

  // ── Navigation state ────────────────────────────────────────────
  const [step, setStep] = useState('research');
  const [completed, setCompleted] = useState([]);
  const goTo = (s) => { setStep(s); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const completeAndGo = (next) => {
    setCompleted(prev => [...new Set([...prev, step])]);
    goTo(next);
  };

  // ── Step 1: Research ───────────────────────────────────────────
  const [niche, setNiche] = useState('');
  const [topic, setTopic] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [researchLoading, setResearchLoading] = useState(false);
  const [research, setResearch] = useState(null); // { research_summary, key_points, suggested_chapters, suggested_duration_minutes }

  // ── Step 2: Script ─────────────────────────────────────────────
  const [scriptData, setScriptData] = useState(null); // { title, chapters: [{ title, scenes: [{ scene_number, narration, visual_direction, duration_seconds }] }], total_duration_seconds }
  const [scriptLoading, setScriptLoading] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({}); // { chapterIdx: true/false }

  // ── Step 3: Voice ──────────────────────────────────────────────
  const [geminiVoice, setGeminiVoice] = useState('Charon');
  const [styleInstructions, setStyleInstructions] = useState('Speak with authoritative documentary narrator confidence. Drive forward with momentum.');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [chapterVoiceovers, setChapterVoiceovers] = useState({}); // { chapterIdx: audioUrl }
  const [voiceLoading, setVoiceLoading] = useState(null); // chapterIdx or 'all'

  // ── Step 4: Timing ─────────────────────────────────────────────
  const [chapterTimings, setChapterTimings] = useState({}); // { chapterIdx: { blocks, tts_duration } }
  const [timingLoading, setTimingLoading] = useState(null);

  // ── Step 5: Keyframes ──────────────────────────────────────────
  const [visualStyle, setVisualStyle] = useState('');
  const [videoStyle, setVideoStyle] = useState('cinematic');
  const [imageModel, setImageModel] = useState('fal_nano_banana');
  const [videoModel, setVideoModel] = useState('fal_veo3');
  const [aspectRatio] = useState('16:9');
  const [frames, setFrames] = useState({}); // { 'ch0-sc0': { start: url, end: url, visionAnalysis } }
  const [frameLoading, setFrameLoading] = useState(null);

  // ── Step 6: Clips ──────────────────────────────────────────────
  const [clips, setClips] = useState({}); // { 'ch0-sc0': { url, actualDuration } }
  const [clipLoading, setClipLoading] = useState(null);

  // ── Step 7: Assembly ───────────────────────────────────────────
  const [musicUrl, setMusicUrl] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.12);
  const [musicModel, setMusicModel] = useState('elevenlabs');
  const [finalUrl, setFinalUrl] = useState(null);
  const [assembleLoading, setAssembleLoading] = useState(false);

  // ── Draft persistence ──────────────────────────────────────────
  const [draftId, setDraftId] = useState(null);
  const [draftList, setDraftList] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const getState = () => ({
    step, niche, topic, durationMinutes, research, scriptData,
    geminiVoice, styleInstructions, voiceSpeed, chapterVoiceovers,
    chapterTimings, visualStyle, videoStyle, imageModel, videoModel,
    frames, clips, musicUrl, musicVolume, musicModel, finalVideoUrl: finalUrl,
    currentStep: STEPS.findIndex(s => s.key === step),
  });

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const state = getState();
      if (!draftId && !state.topic?.trim() && !state.scriptData) return;
      const res = await apiFetch('/api/longform/save-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, state }),
      });
      const data = await parseApiResponse(res);
      if (data.draft_id && !draftId) setDraftId(data.draft_id);
    } catch (err) { console.warn('Draft save failed:', err.message); }
    finally { setSavingDraft(false); }
  };

  const loadDraft = async (id) => {
    try {
      const res = await apiFetch('/api/longform/load-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: id }),
      });
      const data = await parseApiResponse(res);
      const s = data.draft?.state;
      if (!s) return;
      setDraftId(id);
      setNiche(s.niche || ''); setTopic(s.topic || ''); setDurationMinutes(s.durationMinutes || 5);
      setResearch(s.research || null); setScriptData(s.scriptData || null);
      setGeminiVoice(s.geminiVoice || 'Charon'); setStyleInstructions(s.styleInstructions || '');
      setVoiceSpeed(s.voiceSpeed || 1.0); setChapterVoiceovers(s.chapterVoiceovers || {});
      setChapterTimings(s.chapterTimings || {});
      setVisualStyle(s.visualStyle || ''); setVideoStyle(s.videoStyle || 'cinematic');
      setImageModel(s.imageModel || 'fal_nano_banana'); setVideoModel(s.videoModel || 'fal_veo3');
      setFrames(s.frames || {}); setClips(s.clips || {});
      setMusicUrl(s.musicUrl || null); setMusicVolume(s.musicVolume ?? 0.12);
      setMusicModel(s.musicModel || 'elevenlabs');
      setFinalUrl(s.finalVideoUrl || null);
      if (s.step) setStep(s.step);
      setShowDrafts(false);
    } catch (err) { toast.error(`Load failed: ${err.message}`); }
  };

  const loadDraftList = async () => {
    try {
      const res = await apiFetch('/api/longform/list-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.drafts) setDraftList(data.drafts);
    } catch {}
  };

  // Auto-save on milestones
  const voCount = Object.keys(chapterVoiceovers).length;
  const frameCount = Object.keys(frames).length;
  const clipCount = Object.keys(clips).length;
  useEffect(() => {
    if (scriptData || voCount > 0 || frameCount > 0 || finalUrl) {
      const timer = setTimeout(() => saveDraft(), 1500);
      return () => clearTimeout(timer);
    }
  }, [scriptData, voCount, frameCount, clipCount, finalUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ────────────────────────────────────────────────────
  const mode = isFLF(videoModel) ? 'flf' : 'i2v';
  const allScenes = scriptData?.chapters?.flatMap((ch, ci) =>
    ch.scenes?.map((sc, si) => ({ ...sc, chapterIndex: ci, sceneIndex: si, key: `ch${ci}-sc${si}` })) || []
  ) || [];
  const totalScriptDuration = allScenes.reduce((sum, sc) => sum + (sc.duration_seconds || 15), 0);

  // ── Niche change ───────────────────────────────────────────────
  const handleNicheChange = (key) => {
    setNiche(key);
    if (NICHE_VOICE_STYLES[key]) setStyleInstructions(NICHE_VOICE_STYLES[key]);
  };

  // ── API: Research ──────────────────────────────────────────────
  const handleResearch = async () => {
    if (!topic.trim()) { toast.error('Enter a topic first'); return; }
    setResearchLoading(true);
    try {
      const res = await apiFetch('/api/longform/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), niche }),
      });
      const data = await parseApiResponse(res);
      setResearch(data);
      if (data.suggested_duration_minutes) setDurationMinutes(data.suggested_duration_minutes);
    } catch (err) { toast.error(err.message); }
    finally { setResearchLoading(false); }
  };

  // ── API: Script ────────────────────────────────────────────────
  const handleGenerateScript = async () => {
    if (!topic.trim()) { toast.error('Enter a topic'); return; }
    setScriptLoading(true);
    try {
      const numChapters = durationMinutes <= 3 ? 3 : durationMinutes <= 5 ? 4 : durationMinutes <= 8 ? 5 : durationMinutes <= 10 ? 6 : 8;
      const res = await apiFetch('/api/longform/script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche, topic: topic.trim(),
          research: research?.research_summary || '',
          duration_minutes: durationMinutes,
          num_chapters: numChapters,
        }),
      });
      const data = await parseApiResponse(res);
      setScriptData(data);
      // Auto-expand first chapter
      setExpandedChapters({ 0: true });
    } catch (err) { toast.error(err.message); }
    finally { setScriptLoading(false); }
  };

  // ── API: Voiceover ─────────────────────────────────────────────
  const handleGenerateVoiceover = async (chapterIdx) => {
    const chapter = scriptData?.chapters?.[chapterIdx];
    if (!chapter) return;
    setVoiceLoading(chapterIdx);
    try {
      const text = chapter.scenes.map(s => s.narration).join('\n\n');
      const res = await apiFetch('/api/longform/voiceover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text, voice: geminiVoice,
          style_instructions: styleInstructions,
          speed: voiceSpeed,
          chapter_index: chapterIdx,
        }),
      });
      const data = await parseApiResponse(res);
      setChapterVoiceovers(prev => ({ ...prev, [chapterIdx]: data.audio_url }));
    } catch (err) { toast.error(`Chapter ${chapterIdx + 1} voiceover failed: ${err.message}`); }
    finally { setVoiceLoading(null); }
  };

  const handleGenerateAllVoiceovers = async () => {
    if (!scriptData?.chapters?.length) return;
    setVoiceLoading('all');
    for (let i = 0; i < scriptData.chapters.length; i++) {
      try {
        const text = scriptData.chapters[i].scenes.map(s => s.narration).join('\n\n');
        const res = await apiFetch('/api/longform/voiceover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text, voice: geminiVoice,
            style_instructions: styleInstructions,
            speed: voiceSpeed,
            chapter_index: i,
          }),
        });
        const data = await parseApiResponse(res);
        setChapterVoiceovers(prev => ({ ...prev, [i]: data.audio_url }));
      } catch (err) {
        toast.error(`Chapter ${i + 1} failed: ${err.message}`);
      }
    }
    setVoiceLoading(null);
  };

  // ── API: Timing ────────────────────────────────────────────────
  const handleGenerateTiming = async (chapterIdx) => {
    const voUrl = chapterVoiceovers[chapterIdx];
    if (!voUrl) { toast.error('Generate voiceover first'); return; }
    setTimingLoading(chapterIdx);
    try {
      const res = await apiFetch('/api/longform/timing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: voUrl,
          video_model: videoModel,
          voice_speed: voiceSpeed,
          chapter_index: chapterIdx,
        }),
      });
      const data = await parseApiResponse(res);
      setChapterTimings(prev => ({ ...prev, [chapterIdx]: { blocks: data.blocks, tts_duration: data.tts_duration } }));
    } catch (err) { toast.error(`Timing failed: ${err.message}`); }
    finally { setTimingLoading(null); }
  };

  const handleGenerateAllTimings = async () => {
    setTimingLoading('all');
    for (let i = 0; i < (scriptData?.chapters?.length || 0); i++) {
      if (!chapterVoiceovers[i]) continue;
      try {
        const res = await apiFetch('/api/longform/timing', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_url: chapterVoiceovers[i],
            video_model: videoModel,
            voice_speed: voiceSpeed,
            chapter_index: i,
          }),
        });
        const data = await parseApiResponse(res);
        setChapterTimings(prev => ({ ...prev, [i]: { blocks: data.blocks, tts_duration: data.tts_duration } }));
      } catch (err) {
        toast.error(`Chapter ${i + 1} timing failed: ${err.message}`);
      }
    }
    setTimingLoading(null);
  };

  // ── API: Generate Frame ────────────────────────────────────────
  const handleGenerateFrame = async (chapterIdx, sceneIdx, frameType) => {
    const scene = scriptData?.chapters?.[chapterIdx]?.scenes?.[sceneIdx];
    if (!scene) return;
    const key = `ch${chapterIdx}-sc${sceneIdx}`;
    setFrameLoading(`${key}-${frameType}`);

    // Get previous scene's end frame for continuity
    let referenceUrl = null;
    let visionContext = null;
    if (sceneIdx > 0) {
      const prevKey = `ch${chapterIdx}-sc${sceneIdx - 1}`;
      const prevFrame = frames[prevKey];
      if (mode === 'flf' && prevFrame?.end) {
        referenceUrl = prevFrame.end;
      } else if (prevFrame?.start) {
        visionContext = prevFrame.visionAnalysis;
      }
    } else if (chapterIdx > 0) {
      // First scene of chapter — chain from last scene of previous chapter
      const prevChapter = scriptData.chapters[chapterIdx - 1];
      if (prevChapter?.scenes?.length) {
        const prevKey = `ch${chapterIdx - 1}-sc${prevChapter.scenes.length - 1}`;
        const prevFrame = frames[prevKey];
        if (prevFrame?.end) referenceUrl = prevFrame.end;
        else if (prevFrame?.start) visionContext = prevFrame.visionAnalysis;
      }
    }

    try {
      const res = await apiFetch('/api/longform/generate-frame', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narration: scene.narration,
          prompt: scene.visual_direction,
          visual_style: visualStyle,
          visual_style_prompt: getVisualStylePrompt(visualStyle),
          video_style: videoStyle,
          image_model: imageModel,
          aspect_ratio: aspectRatio,
          reference_image_url: referenceUrl,
          scene_index: sceneIdx,
          frame_type: frameType,
          vision_context: visionContext,
          niche,
        }),
      });
      const data = await parseApiResponse(res);
      setFrames(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          [frameType]: data.image_url,
          ...(data.vision_analysis ? { visionAnalysis: data.vision_analysis } : {}),
        },
      }));
    } catch (err) { toast.error(`Frame gen failed: ${err.message}`); }
    finally { setFrameLoading(null); }
  };

  // ── API: Generate Clip ─────────────────────────────────────────
  const handleGenerateClip = async (chapterIdx, sceneIdx) => {
    const scene = scriptData?.chapters?.[chapterIdx]?.scenes?.[sceneIdx];
    if (!scene) return;
    const key = `ch${chapterIdx}-sc${sceneIdx}`;
    const frame = frames[key];
    if (!frame?.start && !frame?.end) { toast.error('Generate keyframes first'); return; }

    setClipLoading(key);
    try {
      const res = await apiFetch('/api/longform/generate-clip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          video_model: videoModel,
          start_frame_url: frame.start || frame.end,
          end_frame_url: mode === 'flf' ? frame.end : undefined,
          motion_prompt: scene.visual_direction || 'Smooth cinematic movement',
          video_style: videoStyle,
          duration: scene.duration_seconds || 6,
          aspect_ratio: aspectRatio,
          scene_index: sceneIdx,
        }),
      });
      const data = await parseApiResponse(res);
      setClips(prev => ({ ...prev, [key]: { url: data.video_url, actualDuration: data.actual_duration } }));
      // Update frame with last_frame for chaining
      if (data.last_frame_url) {
        setFrames(prev => ({
          ...prev,
          [key]: { ...prev[key], lastFrame: data.last_frame_url, visionAnalysis: data.vision_analysis || prev[key]?.visionAnalysis },
        }));
      }
    } catch (err) { toast.error(`Clip gen failed: ${err.message}`); }
    finally { setClipLoading(null); }
  };

  // ── API: Music ─────────────────────────────────────────────────
  const handleGenerateMusic = async () => {
    setMusicLoading(true);
    try {
      const totalDur = Math.ceil(totalScriptDuration / voiceSpeed) + 10;
      const res = await apiFetch('/api/longform/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, duration: totalDur, music_model: musicModel }),
      });
      const data = await parseApiResponse(res);
      setMusicUrl(data.audio_url);
    } catch (err) { toast.error(`Music failed: ${err.message}`); }
    finally { setMusicLoading(false); }
  };

  // ── API: Assemble ──────────────────────────────────────────────
  const handleAssemble = async () => {
    if (!scriptData?.chapters?.length) return;
    setAssembleLoading(true);
    try {
      const chaptersPayload = scriptData.chapters.map((ch, ci) => {
        const chClips = ch.scenes.map((sc, si) => {
          const key = `ch${ci}-sc${si}`;
          const clip = clips[key];
          return clip ? { url: clip.url, duration: clip.actualDuration || sc.duration_seconds || 6 } : null;
        }).filter(Boolean);

        const timing = chapterTimings[ci];
        return {
          clips: chClips,
          voiceover_url: chapterVoiceovers[ci] || null,
          tts_duration: timing?.tts_duration || null,
        };
      }).filter(ch => ch.clips.length > 0);

      if (chaptersPayload.length === 0) { toast.error('No clips to assemble'); setAssembleLoading(false); return; }

      const res = await apiFetch('/api/longform/assemble', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters: chaptersPayload,
          music_url: musicUrl,
          music_volume: musicVolume,
          voice_speed: voiceSpeed,
        }),
      });
      const data = await parseApiResponse(res);
      setFinalUrl(data.video_url);
    } catch (err) { toast.error(`Assembly failed: ${err.message}`); }
    finally { setAssembleLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Longform Video Workbench</h1>
              <p className="text-[10px] text-slate-400">Create 3-15 minute videos with chapters</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savingDraft && <span className="text-[10px] text-slate-400">Saving...</span>}
            <button onClick={() => { saveDraft(); }} className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Save Draft
            </button>
            <button onClick={() => { loadDraftList(); setShowDrafts(!showDrafts); }}
              className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Load Draft
            </button>
          </div>
        </div>
      </div>

      {/* Draft picker */}
      {showDrafts && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <Panel title="Your Longform Drafts">
            {draftList.length === 0 && <p className="text-sm text-slate-400">No drafts yet</p>}
            <div className="space-y-2">
              {draftList.map(d => (
                <button key={d.id} onClick={() => loadDraft(d.id)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-[#2C666E] hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{d.title || 'Untitled'}</span>
                      {d.niche && <span className="ml-2 text-[10px] text-slate-400">{d.niche}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {d.status === 'complete' ? <Check className="w-3.5 h-3.5 text-emerald-500 inline" /> : 'Draft'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Updated {new Date(d.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <StepRail current={step} completed={completed} onSelect={goTo} />

        {/* ════════════════════════════════════════════════════════════
            STEP 1: RESEARCH
            ════════════════════════════════════════════════════════════ */}
        {step === 'research' && (
          <>
            <Panel title="Topic & Niche">
              <div className="space-y-4">
                {/* Niche selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Niche</label>
                  <div className="flex flex-wrap gap-1.5">
                    {NICHES.map(n => (
                      <button key={n.key} onClick={() => handleNicheChange(n.key)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
                          niche === n.key
                            ? 'bg-[#2C666E] text-white border-[#2C666E]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                        )}>
                        {n.icon} {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic input */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Topic</label>
                  <textarea
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="What is your longform video about? Be specific..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E]/20 outline-none resize-none"
                  />
                </div>

                {/* Duration selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Target Duration</label>
                  <div className="flex gap-2">
                    {DURATION_OPTIONS.map(d => (
                      <button key={d.value} onClick={() => setDurationMinutes(d.value)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-xs font-semibold border transition-all',
                          durationMinutes === d.value
                            ? 'bg-[#2C666E] text-white border-[#2C666E]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                        )}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleResearch} disabled={researchLoading || !topic.trim()}
                  className="px-6 py-2.5 bg-[#2C666E] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#234f56] transition-colors flex items-center gap-2">
                  {researchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Research Topic
                </button>
              </div>
            </Panel>

            {/* Research results */}
            {research && (
              <Panel title="Research Results" right={
                <button onClick={() => completeAndGo('script')}
                  className="px-4 py-1.5 bg-[#2C666E] text-white rounded-lg text-xs font-bold hover:bg-[#234f56]">
                  Generate Script →
                </button>
              }>
                <div className="space-y-4">
                  {research.research_summary && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 mb-1">Summary</h3>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{research.research_summary}</p>
                    </div>
                  )}
                  {research.key_points?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 mb-1">Key Points</h3>
                      <ul className="space-y-1">
                        {research.key_points.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="text-[#2C666E] font-bold">{i + 1}.</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {research.suggested_chapters?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 mb-1">Suggested Chapters</h3>
                      <div className="grid gap-2">
                        {research.suggested_chapters.map((ch, i) => (
                          <div key={i} className="border border-slate-100 rounded-lg p-3">
                            <span className="text-xs font-bold text-[#2C666E]">Chapter {i + 1}:</span>{' '}
                            <span className="text-sm font-semibold text-slate-800">{ch.title}</span>
                            {ch.description && <p className="text-xs text-slate-500 mt-1">{ch.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 2: SCRIPT
            ════════════════════════════════════════════════════════════ */}
        {step === 'script' && (
          <>
            <Panel title="Script Generation" right={
              scriptData && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {scriptData.chapters?.length || 0} chapters | {allScenes.length} scenes | ~{formatDuration(totalScriptDuration)}
                  </span>
                  <button onClick={() => completeAndGo('voice')}
                    className="px-4 py-1.5 bg-[#2C666E] text-white rounded-lg text-xs font-bold hover:bg-[#234f56]">
                    Voice →
                  </button>
                </div>
              )
            }>
              {!scriptData ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">Generate a chapter-based script for your longform video</p>
                  <button onClick={handleGenerateScript} disabled={scriptLoading || !topic.trim()}
                    className="px-6 py-2.5 bg-[#2C666E] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#234f56] transition-colors flex items-center gap-2 mx-auto">
                    {scriptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate Script
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Title */}
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Video Title</label>
                    <input
                      value={scriptData.title || ''}
                      onChange={e => setScriptData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full text-lg font-bold text-slate-800 border-b border-slate-200 pb-1 mt-1 outline-none focus:border-[#2C666E]"
                    />
                  </div>

                  {/* Chapters */}
                  {scriptData.chapters?.map((ch, ci) => (
                    <ChapterSection
                      key={ci}
                      chapter={ch}
                      chapterIndex={ci}
                      isExpanded={expandedChapters[ci]}
                      onToggle={() => setExpandedChapters(prev => ({ ...prev, [ci]: !prev[ci] }))}
                    >
                      {/* Chapter title */}
                      <input
                        value={ch.title}
                        onChange={e => {
                          const newChapters = [...scriptData.chapters];
                          newChapters[ci] = { ...newChapters[ci], title: e.target.value };
                          setScriptData(prev => ({ ...prev, chapters: newChapters }));
                        }}
                        className="w-full text-sm font-bold text-slate-700 border-b border-slate-100 pb-1 mb-3 outline-none focus:border-[#2C666E]"
                      />

                      {/* Scenes */}
                      <div className="space-y-3">
                        {ch.scenes?.map((sc, si) => (
                          <div key={si} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-[#2C666E] uppercase">
                                Scene {sc.scene_number || si + 1} — {sc.duration_seconds || 15}s
                              </span>
                              <button
                                onClick={() => {
                                  const newChapters = [...scriptData.chapters];
                                  newChapters[ci].scenes = newChapters[ci].scenes.filter((_, idx) => idx !== si);
                                  setScriptData(prev => ({ ...prev, chapters: newChapters }));
                                }}
                                className="text-[9px] text-red-400 hover:text-red-600 font-medium"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] font-semibold text-slate-400 uppercase">Narration</label>
                                <textarea
                                  value={sc.narration}
                                  onChange={e => {
                                    const newChapters = [...scriptData.chapters];
                                    newChapters[ci].scenes[si] = { ...newChapters[ci].scenes[si], narration: e.target.value };
                                    setScriptData(prev => ({ ...prev, chapters: newChapters }));
                                  }}
                                  rows={3}
                                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#2C666E] resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-semibold text-slate-400 uppercase">Visual Direction</label>
                                <textarea
                                  value={sc.visual_direction}
                                  onChange={e => {
                                    const newChapters = [...scriptData.chapters];
                                    newChapters[ci].scenes[si] = { ...newChapters[ci].scenes[si], visual_direction: e.target.value };
                                    setScriptData(prev => ({ ...prev, chapters: newChapters }));
                                  }}
                                  rows={2}
                                  className="w-full text-xs text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#2C666E] resize-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newChapters = [...scriptData.chapters];
                            const scenes = newChapters[ci].scenes;
                            const newNum = (scenes[scenes.length - 1]?.scene_number || scenes.length) + 1;
                            scenes.push({ scene_number: newNum, narration: '', visual_direction: '', duration_seconds: 15 });
                            setScriptData(prev => ({ ...prev, chapters: newChapters }));
                          }}
                          className="text-[10px] text-[#2C666E] font-semibold hover:underline"
                        >
                          + Add Scene
                        </button>
                      </div>
                    </ChapterSection>
                  ))}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        const newChapters = [...(scriptData.chapters || [])];
                        newChapters.push({ title: `Chapter ${newChapters.length + 1}`, scenes: [{ scene_number: 1, narration: '', visual_direction: '', duration_seconds: 15 }] });
                        setScriptData(prev => ({ ...prev, chapters: newChapters }));
                      }}
                      className="text-xs text-[#2C666E] font-semibold hover:underline"
                    >
                      + Add Chapter
                    </button>
                    <button onClick={handleGenerateScript} disabled={scriptLoading}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1">
                      {scriptLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 3: VOICE
            ════════════════════════════════════════════════════════════ */}
        {step === 'voice' && (
          <>
            <Panel title="Voice Settings">
              <div className="space-y-4">
                {/* Voice selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Voice</label>
                  <div className="flex flex-wrap gap-1.5">
                    {GEMINI_VOICES.map(v => (
                      <button key={v.id} onClick={() => setGeminiVoice(v.id)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all',
                          geminiVoice === v.id
                            ? 'bg-[#2C666E] text-white border-[#2C666E]'
                            : FEATURED_VOICES.includes(v.id)
                              ? 'bg-white text-slate-700 border-slate-300 hover:border-[#2C666E]'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                        )}>
                        {v.label}
                        <span className="text-[8px] ml-1 opacity-60">{v.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice style */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Voice Style</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {VOICE_STYLE_PRESETS.map(p => (
                      <button key={p.label} onClick={() => setStyleInstructions(p.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                          styleInstructions === p.value
                            ? 'bg-[#2C666E] text-white border-[#2C666E]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                        )}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={styleInstructions}
                    onChange={e => setStyleInstructions(e.target.value)}
                    rows={2}
                    className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#2C666E] resize-none"
                  />
                </div>

                {/* Speed */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Speed</label>
                  <div className="flex gap-1.5">
                    {SPEED_OPTIONS.map(s => (
                      <button key={s} onClick={() => setVoiceSpeed(s)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                          voiceSpeed === s ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                        )}>
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Chapter Voiceovers" right={
              <div className="flex items-center gap-2">
                <button onClick={handleGenerateAllVoiceovers} disabled={voiceLoading !== null}
                  className="px-4 py-1.5 bg-[#2C666E] text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-[#234f56] flex items-center gap-1.5">
                  {voiceLoading === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Generate All
                </button>
                {Object.keys(chapterVoiceovers).length === (scriptData?.chapters?.length || 0) && scriptData?.chapters?.length > 0 && (
                  <button onClick={() => completeAndGo('timing')}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                    Timing →
                  </button>
                )}
              </div>
            }>
              <div className="space-y-3">
                {scriptData?.chapters?.map((ch, ci) => (
                  <div key={ci} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">Chapter {ci + 1}: {ch.title}</span>
                      <div className="flex items-center gap-2">
                        {chapterVoiceovers[ci] && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        <button
                          onClick={() => handleGenerateVoiceover(ci)}
                          disabled={voiceLoading !== null}
                          className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 hover:border-[#2C666E] transition-colors disabled:opacity-50"
                        >
                          {voiceLoading === ci ? <Loader2 className="w-3 h-3 animate-spin inline" /> : chapterVoiceovers[ci] ? 'Redo' : 'Generate'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2">{ch.scenes?.length || 0} scenes</p>
                    {chapterVoiceovers[ci] && (
                      <AudioPlayer url={chapterVoiceovers[ci]} speed={voiceSpeed} />
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 4: TIMING
            ════════════════════════════════════════════════════════════ */}
        {step === 'timing' && (
          <>
            <Panel title="Word Timestamps" right={
              <div className="flex items-center gap-2">
                <button onClick={handleGenerateAllTimings} disabled={timingLoading !== null}
                  className="px-4 py-1.5 bg-[#2C666E] text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-[#234f56] flex items-center gap-1.5">
                  {timingLoading === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  Generate All Timings
                </button>
                {Object.keys(chapterTimings).length > 0 && (
                  <button onClick={() => completeAndGo('frames')}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                    Keyframes →
                  </button>
                )}
              </div>
            }>
              <div className="space-y-3">
                {scriptData?.chapters?.map((ch, ci) => (
                  <div key={ci} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">Chapter {ci + 1}: {ch.title}</span>
                      <div className="flex items-center gap-2">
                        {chapterTimings[ci] && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        <button
                          onClick={() => handleGenerateTiming(ci)}
                          disabled={timingLoading !== null || !chapterVoiceovers[ci]}
                          className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 hover:border-[#2C666E] disabled:opacity-50"
                        >
                          {timingLoading === ci ? <Loader2 className="w-3 h-3 animate-spin inline" /> : chapterTimings[ci] ? 'Redo' : 'Generate'}
                        </button>
                      </div>
                    </div>
                    {!chapterVoiceovers[ci] && (
                      <p className="text-[10px] text-amber-600">Voiceover needed first</p>
                    )}
                    {chapterTimings[ci] && (
                      <div className="mt-2 space-y-1">
                        {chapterTimings[ci].blocks?.map((block, bi) => (
                          <div key={bi} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                            <span className="text-[9px] font-mono text-[#2C666E] font-bold w-16">
                              {formatDuration(block.startTime)} - {formatDuration(block.endTime)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">{block.clipDuration}s</span>
                            <span className="text-[10px] text-slate-600 flex-1 truncate">
                              {block.narration?.slice(0, 80) || '—'}
                            </span>
                          </div>
                        ))}
                        <div className="text-[10px] text-slate-400 mt-1">
                          Total: {formatDuration(chapterTimings[ci].tts_duration || 0)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 5: KEYFRAMES
            ════════════════════════════════════════════════════════════ */}
        {step === 'frames' && (
          <>
            <Panel title="Visual Settings">
              <div className="space-y-4">
                {/* Image model picker */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Image Model</label>
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGE_MODELS.map(m => (
                      <button key={m.value} onClick={() => setImageModel(m.value)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all',
                          imageModel === m.value ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                        )}>
                        {m.label} <span className="opacity-60">{m.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual style */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Visual Style</label>
                  <StyleGrid
                    value={visualStyle}
                    onChange={setVisualStyle}
                    columns={6}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Scene Keyframes" right={
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {Object.keys(frames).length} / {allScenes.length} scenes
                </span>
                {Object.keys(frames).length > 0 && (
                  <button onClick={() => completeAndGo('clips')}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                    Video Clips →
                  </button>
                )}
              </div>
            }>
              {scriptData?.chapters?.map((ch, ci) => (
                <ChapterSection
                  key={ci}
                  chapter={ch}
                  chapterIndex={ci}
                  isExpanded={expandedChapters[ci] !== false}
                  onToggle={() => setExpandedChapters(prev => ({ ...prev, [ci]: !(prev[ci] !== false) }))}
                >
                  <div className="grid gap-3">
                    {ch.scenes?.map((sc, si) => {
                      const key = `ch${ci}-sc${si}`;
                      const frame = frames[key];
                      const isLoading = frameLoading?.startsWith(key);
                      return (
                        <div key={si} className="border border-slate-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#2C666E]">Scene {si + 1}</span>
                            <span className="text-[9px] text-slate-400">{sc.duration_seconds}s</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{sc.visual_direction}</p>

                          <div className="flex gap-3 items-start">
                            {/* Start frame */}
                            <div className="flex-1">
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                {frame?.start ? (
                                  <img src={frame.start} alt="Start" className="w-full aspect-video object-cover" />
                                ) : (
                                  <div className="w-full aspect-video bg-slate-50 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-slate-300" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleGenerateFrame(ci, si, mode === 'flf' ? 'start' : 'single')}
                                disabled={isLoading}
                                className="mt-1.5 w-full px-2 py-1.5 text-[9px] font-bold text-white bg-[#2C666E] rounded-lg disabled:opacity-50 hover:bg-[#234f56]"
                              >
                                {isLoading && frameLoading === `${key}-start` || isLoading && frameLoading === `${key}-single` ? (
                                  <Loader2 className="w-3 h-3 animate-spin inline" />
                                ) : frame?.start ? 'Redo' : (mode === 'flf' ? 'Start Frame' : 'Generate')}
                              </button>
                            </div>

                            {/* End frame (FLF only) */}
                            {mode === 'flf' && (
                              <div className="flex-1">
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                  {frame?.end ? (
                                    <img src={frame.end} alt="End" className="w-full aspect-video object-cover" />
                                  ) : (
                                    <div className="w-full aspect-video bg-slate-50 flex items-center justify-center">
                                      <ImageIcon className="w-6 h-6 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleGenerateFrame(ci, si, 'end')}
                                  disabled={isLoading}
                                  className="mt-1.5 w-full px-2 py-1.5 text-[9px] font-bold text-white bg-amber-600 rounded-lg disabled:opacity-50 hover:bg-amber-700"
                                >
                                  {isLoading && frameLoading === `${key}-end` ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                  ) : frame?.end ? 'Redo' : 'End Frame'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ChapterSection>
              ))}
            </Panel>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 6: VIDEO CLIPS
            ════════════════════════════════════════════════════════════ */}
        {step === 'clips' && (
          <>
            <Panel title="Video Model">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Video Model</label>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_MODELS.map(m => (
                    <button key={m.value} onClick={() => setVideoModel(m.value)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all',
                        videoModel === m.value ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                      )}>
                      {m.label} <span className="opacity-60">{m.price}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Mode: <span className="font-bold text-[#2C666E]">{mode === 'flf' ? 'First-Last-Frame' : 'Image-to-Video'}</span>
                </p>
              </div>
            </Panel>

            <Panel title="Scene Clips" right={
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {Object.keys(clips).length} / {allScenes.length} clips
                </span>
                {Object.keys(clips).length > 0 && (
                  <button onClick={() => completeAndGo('assemble')}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                    Assemble →
                  </button>
                )}
              </div>
            }>
              {scriptData?.chapters?.map((ch, ci) => (
                <ChapterSection
                  key={ci}
                  chapter={ch}
                  chapterIndex={ci}
                  isExpanded={expandedChapters[ci] !== false}
                  onToggle={() => setExpandedChapters(prev => ({ ...prev, [ci]: !(prev[ci] !== false) }))}
                >
                  <div className="grid gap-3">
                    {ch.scenes?.map((sc, si) => {
                      const key = `ch${ci}-sc${si}`;
                      const frame = frames[key];
                      const clip = clips[key];
                      const isLoading = clipLoading === key;
                      const hasFrame = frame?.start || frame?.end;
                      return (
                        <div key={si} className="border border-slate-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-[#2C666E]">Scene {si + 1} — {sc.duration_seconds}s</span>
                            {clip && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>

                          <div className="flex gap-3 items-start">
                            {/* Thumbnail */}
                            <div className="w-32 flex-shrink-0">
                              {clip?.url ? (
                                <video src={clip.url} className="w-full aspect-video object-cover rounded-lg" controls muted />
                              ) : frame?.start ? (
                                <img src={frame.start} alt="Frame" className="w-full aspect-video object-cover rounded-lg opacity-50" />
                              ) : (
                                <div className="w-full aspect-video bg-slate-50 rounded-lg flex items-center justify-center">
                                  <Film className="w-5 h-5 text-slate-300" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{sc.visual_direction}</p>
                              <button
                                onClick={() => handleGenerateClip(ci, si)}
                                disabled={isLoading || !hasFrame}
                                className={cn(
                                  'px-4 py-1.5 rounded-lg text-[10px] font-bold transition-colors',
                                  hasFrame
                                    ? 'bg-[#2C666E] text-white hover:bg-[#234f56] disabled:opacity-50'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                                )}
                              >
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                                {!hasFrame ? 'Need keyframe' : clip ? 'Regenerate' : 'Generate Clip'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ChapterSection>
              ))}
            </Panel>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 7: ASSEMBLE
            ════════════════════════════════════════════════════════════ */}
        {step === 'assemble' && (
          <>
            <Panel title="Background Music">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Music Model</label>
                  <div className="flex gap-1.5">
                    {MUSIC_MODELS.map(m => (
                      <button key={m.value} onClick={() => setMusicModel(m.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all',
                          musicModel === m.value ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300',
                        )}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleGenerateMusic} disabled={musicLoading}
                    className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-[#234f56] flex items-center gap-1.5">
                    {musicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Music className="w-3.5 h-3.5" />}
                    Generate Music
                  </button>
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                    <input type="range" min={0} max={0.5} step={0.01} value={musicVolume}
                      onChange={e => setMusicVolume(parseFloat(e.target.value))}
                      className="w-24 accent-[#2C666E]" />
                    <span className="text-[10px] text-slate-400 w-8">{Math.round(musicVolume * 100)}%</span>
                  </div>
                </div>

                {musicUrl && <AudioPlayer url={musicUrl} speed={1} />}
              </div>
            </Panel>

            <Panel title="Final Assembly">
              <div className="space-y-4">
                {/* Status summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-slate-800">{Object.keys(clips).length}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Video Clips</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-slate-800">{Object.keys(chapterVoiceovers).length}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Voiceovers</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-slate-800">{musicUrl ? '1' : '0'}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Music Track</div>
                  </div>
                </div>

                <button onClick={handleAssemble} disabled={assembleLoading || Object.keys(clips).length === 0}
                  className="w-full py-3 bg-[#2C666E] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#234f56] transition-colors flex items-center justify-center gap-2">
                  {assembleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  Assemble Longform Video
                </button>

                {/* Final video player */}
                {finalUrl && (
                  <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-emerald-800 mb-3">Final Video</h3>
                    <video src={finalUrl} controls className="w-full rounded-lg" />
                    <div className="flex items-center gap-2 mt-3">
                      <a href={finalUrl} download target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                      <button onClick={() => saveDraft()}
                        className="px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100">
                        Save Final Draft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
