/**
 * AudioFinishingStep — Wizard Step 6: Audio & Finishing
 *
 * This step handles everything that layers ON TOP of the video clips:
 *   - Dialogue / narration text per scene (with TTS preview)
 *   - Voice selection (ElevenLabs 20+ voices)
 *   - TTS model selection
 *   - Lipsync model selection (auto-recommended based on content)
 *   - Background music (mood prompt, volume)
 *   - Caption style selection
 *
 * The voiceover becomes the MASTER CLOCK:
 *   - TTS duration determines scene duration (overrides manual setting)
 *   - Scenes without dialogue keep their manual duration
 *
 * Data flow:
 *   Dialogue text → TTS → audio URLs + durations → scene duration adjustment
 *   Video generation uses adjusted durations → Lipsync applied post-generation
 *   Assembly combines: video + voiceover + music + captions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Music, Type, Volume2, Play, Pause, Loader2,
  ChevronDown, ChevronRight, Sparkles, Settings2,
  MessageSquare, Film, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

// ── Voice Options (fetched from API, fallback to these) ──

const DEFAULT_VOICES = [
  { id: 'Rachel', label: 'Rachel', gender: 'female', style: 'calm, narration' },
  { id: 'Aria', label: 'Aria', gender: 'female', style: 'expressive, warm' },
  { id: 'Sarah', label: 'Sarah', gender: 'female', style: 'soft, gentle' },
  { id: 'Charlotte', label: 'Charlotte', gender: 'female', style: 'warm, authoritative' },
  { id: 'Roger', label: 'Roger', gender: 'male', style: 'confident, deep' },
  { id: 'Charlie', label: 'Charlie', gender: 'male', style: 'casual, Australian' },
  { id: 'George', label: 'George', gender: 'male', style: 'British, warm' },
  { id: 'Liam', label: 'Liam', gender: 'male', style: 'articulate, American' },
  { id: 'Daniel', label: 'Daniel', gender: 'male', style: 'British, authoritative' },
  { id: 'Bill', label: 'Bill', gender: 'male', style: 'documentary' },
];

const TTS_MODEL_OPTIONS = [
  { id: 'elevenlabs-v3', label: 'ElevenLabs v3', description: 'Best quality', cost: '$0.05/1K chars' },
  { id: 'elevenlabs-multilingual', label: 'Multilingual v2', description: '29 languages', cost: '$0.05/1K chars' },
  { id: 'kokoro', label: 'Kokoro', description: 'Budget-friendly drafts', cost: '$0.02/1K chars' },
  { id: 'minimax', label: 'MiniMax HD', description: 'Emotion control', cost: '$0.10/1K chars' },
];

const LIPSYNC_MODEL_OPTIONS = [
  { id: 'kling-lipsync', label: 'Kling LipSync', description: 'Best for cartoon/animated characters', cost: '$0.014/5s' },
  { id: 'sync-lipsync-2', label: 'Sync Lipsync 2.0', description: 'Best for realistic faces', cost: '$3/min' },
  { id: 'sync-lipsync-2-pro', label: 'Sync Lipsync 2.0 Pro', description: 'Premium close-ups', cost: '$5/min' },
  { id: 'latentsync', label: 'LatentSync', description: 'Budget — anime/cartoon', cost: '$0.20/40s' },
  { id: 'kling-avatar', label: 'Kling Avatar Pro', description: 'Image → talking video', cost: '$0.014/5s' },
  { id: 'none', label: 'No Lipsync', description: 'Audio mixed in assembly only', cost: 'Free' },
];

const CAPTION_STYLES = [
  { id: 'none', label: 'No Captions', preview: null },
  { id: 'word_pop', label: 'Word Pop', preview: 'White text, yellow highlight, word-by-word' },
  { id: 'karaoke_glow', label: 'Karaoke Glow', preview: 'Bold white, green highlight, animated' },
  { id: 'word_highlight', label: 'Subtle Highlight', preview: 'White text, purple highlight, 3-word chunks' },
  { id: 'news_ticker', label: 'News Ticker', preview: 'White on dark bar, red highlight, sentence chunks' },
];

// ── Scene Dialogue Card ──

function SceneDialogueCard({
  scene,
  index,
  onDialogueChange,
  onPreviewVoice,
  isPreviewingScene,
  previewAudioUrl,
  voice,
}) {
  const [expanded, setExpanded] = useState(!!scene.dialogue);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2C666E] text-white text-[10px] font-bold shrink-0">
          {scene.sceneNumber || index + 1}
        </span>
        <span className="text-sm text-gray-800 truncate flex-1 text-left">
          {scene.narrativeNote || `Scene ${index + 1}`}
        </span>
        {scene.dialogue && (
          <MessageSquare size={14} className="text-[#2C666E] shrink-0" />
        )}
        {scene.audioUrl && (
          <Volume2 size={14} className="text-green-500 shrink-0" />
        )}
        <span className="text-xs text-gray-400 shrink-0">{scene.durationSeconds}s</span>
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Narrative context */}
          {scene.narrativeNote && (
            <div className="bg-gray-50 rounded-lg p-2.5">
              <span className="text-[10px] font-medium text-gray-400 uppercase">Story</span>
              <p className="text-xs text-gray-600 mt-0.5">{scene.narrativeNote}</p>
            </div>
          )}

          {/* Dialogue input */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              Dialogue / Narration
            </label>
            <textarea
              value={scene.dialogue || ''}
              onChange={(e) => onDialogueChange(scene.id, e.target.value)}
              placeholder="What is said in this scene? Leave empty for no voiceover."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">
                {scene.dialogue?.length || 0} chars
                {scene.dialogue && ` · ~${Math.round((scene.dialogue.length / 750) * 60)}s estimated`}
              </span>

              {scene.dialogue?.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreviewVoice(scene)}
                  disabled={isPreviewingScene === scene.id}
                  className="text-xs h-7"
                >
                  {isPreviewingScene === scene.id ? (
                    <><Loader2 size={12} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Play size={12} /> Preview Voice</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Audio playback */}
          {(scene.audioUrl || previewAudioUrl) && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center shrink-0"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 truncate">
                  {voice} · {scene.ttsDuration ? `${scene.ttsDuration.toFixed(1)}s` : 'Preview'}
                </p>
              </div>
              <audio
                ref={audioRef}
                src={scene.audioUrl || previewAudioUrl}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function AudioFinishingStep({
  scenes = [],
  onUpdateScene,
  onUpdateAllScenes,
  // Voice settings
  ttsModel,
  onTtsModelChange,
  voice,
  onVoiceChange,
  speed,
  onSpeedChange,
  // Lipsync
  lipsyncModel,
  onLipsyncModelChange,
  contentType,
  onContentTypeChange,
  // Music
  musicMood,
  onMusicMoodChange,
  musicVolume,
  onMusicVolumeChange,
  musicUrl,
  // Captions
  captionStyle,
  onCaptionStyleChange,
  // Model constraints (for TTS duration snapping)
  modelDurationConstraints,
}) {
  const [expandedSection, setExpandedSection] = useState('dialogue');
  const [previewingScene, setPreviewingScene] = useState(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [voices, setVoices] = useState(DEFAULT_VOICES);

  // Fetch available voices on mount
  useEffect(() => {
    apiFetch('/api/storyboard/generate-voiceover')
      .then(r => r.json())
      .then(data => {
        if (data.voices?.length) setVoices(data.voices);
      })
      .catch(() => {}); // Use defaults
  }, []);

  const scenesWithDialogue = scenes.filter(s => s.dialogue?.trim());
  const scenesWithAudio = scenes.filter(s => s.audioUrl);
  const totalChars = scenes.reduce((sum, s) => sum + (s.dialogue?.length || 0), 0);

  // ── Handlers ──

  const handlePreviewScene = async (scene) => {
    if (!scene.dialogue?.trim()) return;
    setPreviewingScene(scene.id);
    setPreviewAudioUrl(null);

    try {
      const res = await apiFetch('/api/storyboard/generate-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          sceneNumber: scene.sceneNumber,
          dialogue: scene.dialogue,
          model: ttsModel,
          voice,
          speed,
        }),
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        setPreviewAudioUrl(data.audioUrl);
        onUpdateScene(scene.id, {
          audioUrl: data.audioUrl,
          ttsDuration: data.durationSeconds,
        });
        toast.success(`Scene ${scene.sceneNumber} voice preview ready`);
      } else {
        throw new Error(data.error || 'Preview failed');
      }
    } catch (err) {
      toast.error('Voice preview failed: ' + err.message);
    } finally {
      setPreviewingScene(null);
    }
  };

  const handleGenerateAllVoiceover = async () => {
    if (scenesWithDialogue.length === 0) {
      toast.error('No scenes have dialogue — add narration text first');
      return;
    }

    setGeneratingAll(true);
    try {
      const res = await apiFetch('/api/storyboard/generate-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch',
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            dialogue: s.dialogue,
          })),
          model: ttsModel,
          voice,
          speed,
          modelDurationConstraints,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Update scenes with audio URLs and adjusted durations
        for (const result of data.results) {
          const scene = scenes.find(s => s.sceneNumber === result.sceneNumber);
          if (scene && result.audioUrl) {
            onUpdateScene(scene.id, {
              audioUrl: result.audioUrl,
              ttsDuration: result.durationSeconds,
            });
          }
        }

        // Apply TTS-as-master-clock duration adjustments
        if (data.adjustedScenes) {
          for (const adjusted of data.adjustedScenes) {
            const scene = scenes.find(s => s.sceneNumber === adjusted.sceneNumber);
            if (scene && adjusted.durationSeconds !== scene.durationSeconds) {
              onUpdateScene(scene.id, {
                durationSeconds: adjusted.durationSeconds,
                originalDuration: adjusted.originalDuration,
              });
            }
          }
        }

        toast.success(`Voiceover generated: ${data.stats.withAudio} scenes, ${data.totalDuration.toFixed(1)}s total`);
        if (data.stats.failed > 0) {
          toast.warning(`${data.stats.failed} scenes failed — check logs`);
        }
      } else {
        throw new Error(data.error || 'Batch voiceover failed');
      }
    } catch (err) {
      toast.error('Voiceover generation failed: ' + err.message);
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!musicMood?.trim()) {
      toast.error('Enter a music mood description first');
      return;
    }
    setGeneratingMusic(true);
    try {
      const totalDuration = scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0);
      const res = await apiFetch('/api/storyboard/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodPrompt: musicMood, durationSeconds: totalDuration }),
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        onMusicMoodChange(musicMood); // Keep the mood text
        toast.success('Background music generated');
      } else {
        throw new Error(data.error || 'Music generation failed');
      }
    } catch (err) {
      toast.error('Music generation failed: ' + err.message);
    } finally {
      setGeneratingMusic(false);
    }
  };

  // ── Section Header ──

  const SectionHeader = ({ id, label, icon: Icon, badge }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className="w-full flex items-center gap-3 py-3 text-left"
    >
      {expandedSection === id
        ? <ChevronDown size={16} className="text-gray-400" />
        : <ChevronRight size={16} className="text-gray-400" />}
      <Icon size={16} className="text-[#2C666E]" />
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      {badge && (
        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2C666E]/10 text-[#2C666E]">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-3">

      {/* ── Dialogue / Narration ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        <SectionHeader
          id="dialogue"
          label="Dialogue & Narration"
          icon={MessageSquare}
          badge={scenesWithDialogue.length > 0 ? `${scenesWithDialogue.length} scenes` : null}
        />
        {expandedSection === 'dialogue' && (
          <div className="pb-4 space-y-3">
            {/* Voice settings row */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Voice</label>
                <select
                  value={voice}
                  onChange={e => onVoiceChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30"
                >
                  {voices.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.label} — {v.style}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-[160px]">
                <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">TTS Model</label>
                <select
                  value={ttsModel}
                  onChange={e => onTtsModelChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30"
                >
                  {TTS_MODEL_OPTIONS.map(m => (
                    <option key={m.id} value={m.id}>{m.label} ({m.cost})</option>
                  ))}
                </select>
              </div>

              <div className="w-[100px]">
                <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Speed</label>
                <input
                  type="range"
                  min={0.7}
                  max={1.2}
                  step={0.05}
                  value={speed}
                  onChange={e => onSpeedChange(parseFloat(e.target.value))}
                  className="w-full accent-[#2C666E]"
                />
                <span className="text-[10px] text-gray-400 block text-center">{speed}×</span>
              </div>
            </div>

            {/* Per-scene dialogue cards */}
            <div className="space-y-2">
              {scenes.map((scene, i) => (
                <SceneDialogueCard
                  key={scene.id || i}
                  scene={scene}
                  index={i}
                  onDialogueChange={(id, text) => onUpdateScene(id, { dialogue: text })}
                  onPreviewVoice={handlePreviewScene}
                  isPreviewingScene={previewingScene}
                  previewAudioUrl={previewingScene === scene.id ? previewAudioUrl : null}
                  voice={voice}
                />
              ))}
            </div>

            {/* Generate All button */}
            {scenesWithDialogue.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">
                  {totalChars.toLocaleString()} chars · ~{Math.round((totalChars / 750) * 60)}s estimated
                </span>
                <Button
                  onClick={handleGenerateAllVoiceover}
                  disabled={generatingAll}
                  size="sm"
                  className="bg-[#2C666E] hover:bg-[#1e4d54] text-white"
                >
                  {generatingAll ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating All...</>
                  ) : (
                    <><Mic size={14} /> Generate All Voiceover</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lipsync ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        <SectionHeader id="lipsync" label="Lip Sync" icon={Film} />
        {expandedSection === 'lipsync' && (
          <div className="pb-4 space-y-3">
            <p className="text-xs text-gray-500">
              Lipsync is applied AFTER video generation. Choose a model based on your visual style.
            </p>

            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Content Type</label>
              <div className="flex gap-1.5 flex-wrap">
                {['cartoon', 'realistic', '3d', 'anime'].map(ct => (
                  <button
                    key={ct}
                    onClick={() => onContentTypeChange(ct)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      contentType === ct
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase mb-1.5 block">Lipsync Model</label>
              <div className="space-y-1.5">
                {LIPSYNC_MODEL_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => onLipsyncModelChange(m.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${
                      lipsyncModel === m.id
                        ? 'border-[#2C666E] bg-[#2C666E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800">{m.label}</span>
                      <p className="text-[10px] text-gray-500">{m.description}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">{m.cost}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Background Music ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        <SectionHeader id="music" label="Background Music" icon={Music} badge={musicUrl ? 'Ready' : null} />
        {expandedSection === 'music' && (
          <div className="pb-4 space-y-3">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Music Mood</label>
              <input
                type="text"
                value={musicMood || ''}
                onChange={e => onMusicMoodChange(e.target.value)}
                placeholder="e.g., Cheerful and playful children's music with gentle xylophone"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 shrink-0">Volume</label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.05}
                value={musicVolume || 0.15}
                onChange={e => onMusicVolumeChange(parseFloat(e.target.value))}
                className="flex-1 accent-[#2C666E]"
              />
              <span className="text-xs text-gray-400 w-10">{Math.round((musicVolume || 0.15) * 100)}%</span>
            </div>

            <Button
              onClick={handleGenerateMusic}
              disabled={generatingMusic || !musicMood?.trim()}
              size="sm"
              variant="outline"
            >
              {generatingMusic ? (
                <><Loader2 size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><Music size={14} /> Generate Music</>
              )}
            </Button>

            {musicUrl && (
              <audio src={musicUrl} controls className="w-full h-8" preload="metadata" />
            )}
          </div>
        )}
      </div>

      {/* ── Captions ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        <SectionHeader id="captions" label="Captions & Subtitles" icon={Type} badge={captionStyle && captionStyle !== 'none' ? 'On' : null} />
        {expandedSection === 'captions' && (
          <div className="pb-4 space-y-2">
            <p className="text-xs text-gray-500">
              Auto-generated subtitles burned into the final video from the voiceover audio.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CAPTION_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => onCaptionStyleChange(style.id)}
                  className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
                    captionStyle === style.id
                      ? 'border-[#2C666E] bg-[#2C666E]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-800 block">{style.label}</span>
                  {style.preview && (
                    <span className="text-[10px] text-gray-500 block mt-0.5">{style.preview}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
