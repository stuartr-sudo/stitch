/**
 * ChecklistShortsPage — detailed interactive checklist for every step in the Shorts Workbench.
 * Checkbox state persists in localStorage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RotateCcw, CheckCircle2, Mic, Clock, Image as ImageIcon,
  Film, Layers, Settings2, Music, Sparkles, Palette, Volume2, Type,
  Wand2, Play, Eye, AlertTriangle, RefreshCw, GitBranch, Upload,
} from 'lucide-react';

const STORAGE_KEY = 'checklist-shorts-state';

const SECTIONS = [
  {
    id: 'pre-production',
    title: 'Pre-Production Planning',
    icon: 'Settings2',
    items: [
      { id: 'pp-1', label: 'Define your video topic and angle' },
      { id: 'pp-2', label: 'Identify target audience and platform (YouTube Shorts, TikTok, Reels)' },
      { id: 'pp-3', label: 'Decide target duration (30s, 45s, 55s, or 60s)' },
      { id: 'pp-4', label: 'Prepare any reference images or brand assets you want to use' },
      { id: 'pp-5', label: 'Check your API keys are configured (Settings page)' },
    ],
  },
  {
    id: 'step1-niche',
    title: 'Step 1a: Niche Selection',
    icon: 'Sparkles',
    items: [
      { id: 's1n-1', label: 'Navigate to Shorts Workbench (/shorts/workbench)' },
      { id: 's1n-2', label: 'Select your niche from the 20 available options' },
      { id: 's1n-3', label: 'Review the niche-specific voice style and visual mood that will be applied' },
      { id: 's1n-4', label: 'Select a Video Style Framework (structural template for your video)' },
    ],
  },
  {
    id: 'step1-topic',
    title: 'Step 1b: Topic & Research',
    icon: 'Wand2',
    items: [
      { id: 's1t-1', label: 'Use the 3-level Topic Funnel: select Category (L1) > Angle (L2) > Hook (L3)' },
      { id: 's1t-2', label: 'OR click "Discover Trending Topics" for AI-suggested trending content' },
      { id: 's1t-3', label: 'OR click "Generate Ideas" for fresh AI-generated topic angles' },
      { id: 's1t-4', label: 'OR type your own custom topic manually' },
      { id: 's1t-5', label: 'Click "Research" to gather context on your selected topic' },
      { id: 's1t-6', label: 'Review the researched stories and select the best one' },
    ],
  },
  {
    id: 'step1-script',
    title: 'Step 1c: Script Generation',
    icon: 'Type',
    items: [
      { id: 's1s-1', label: 'Click "Generate Script" (requires topic selection)' },
      { id: 's1s-2', label: 'Review the generated script in the text area' },
      { id: 's1s-3', label: 'Edit the script manually if needed (add hooks, fix pacing, adjust tone)' },
      { id: 's1s-4', label: 'Verify script length matches your target duration' },
      { id: 's1s-5', label: 'Optionally add Scene Builder Pills for visual direction (atmosphere, emotion, camera)' },
    ],
  },
  {
    id: 'step1-voice',
    title: 'Step 1d: Voice Selection & Generation',
    icon: 'Mic',
    items: [
      { id: 's1v-1', label: 'Select a Gemini TTS voice (30 available, 5 featured: Kore, Puck, Charon, Zephyr, Aoede)' },
      { id: 's1v-2', label: 'Choose a Voice Style Preset (8 universal: Documentary, Storyteller, News Anchor, Whispering, High Energy, Teacher, Campfire, Podcast Host)' },
      { id: 's1v-3', label: 'OR write custom voice style instructions in the textarea' },
      { id: 's1v-4', label: 'Set voice speed (0.75x to 1.4x, default 1.15x) — faster speeds get pace-aware TTS directives' },
      { id: 's1v-5', label: 'Click "Generate Voiceover" (~$0.01 cost)' },
      { id: 's1v-6', label: 'Listen to the voiceover using the audio player (play, seek, adjust playback speed)' },
      { id: 's1v-7', label: 'If not satisfied, click "Redo" to regenerate with different settings' },
      { id: 's1v-8', label: 'Click "Approve Voiceover" when happy with the result' },
    ],
  },
  {
    id: 'step1-avatar',
    title: 'Step 1e: Avatar Mode (Optional)',
    icon: 'Eye',
    items: [
      { id: 's1a-1', label: 'Enable "Use Avatar Mode" checkbox (if you want a talking-head avatar)' },
      { id: 's1a-2', label: 'Select a Visual Subject from the dropdown (requires pre-trained LoRA)' },
      { id: 's1a-3', label: 'Verify the reference image looks correct for your subject' },
      { id: 's1a-4', label: 'Note: Avatar pipeline will run in Step 4 (portrait > animation > lipsync)' },
    ],
  },
  {
    id: 'step2-timing',
    title: 'Step 2a: Timing Analysis',
    icon: 'Clock',
    items: [
      { id: 's2t-1', label: 'Select your Video Model (determines FLF vs I2V mode and valid durations)' },
      { id: 's2t-2', label: 'Click "Analyze Timing" (runs Whisper word-level timestamps)' },
      { id: 's2t-3', label: 'Review the visual timeline bar showing all scenes with color-coded blocks' },
      { id: 's2t-4', label: 'Check each scene: block number, framework label (Hook/Context/Point), narration snippet, clip duration, word count' },
      { id: 's2t-5', label: 'Verify total duration matches your target (block aligner snaps to model-valid durations)' },
      { id: 's2t-6', label: 'Review the Duration Solver output for optimized scene lengths' },
    ],
  },
  {
    id: 'step2-music',
    title: 'Step 2b: Music & Sound Effects',
    icon: 'Music',
    items: [
      { id: 's2m-1', label: 'Toggle "Include Music" checkbox' },
      { id: 's2m-2', label: 'Select music model (ElevenLabs, MiniMax, Lyria2, or Suno)' },
      { id: 's2m-3', label: 'Click "Generate Music" (niche-aware mood is auto-applied, always instrumental)' },
      { id: 's2m-4', label: 'Listen to the generated music track and adjust volume slider (default 0.2)' },
      { id: 's2m-5', label: 'Click "Approve Music" or "Redo" to regenerate' },
      { id: 's2m-6', label: 'Optionally toggle "Include SFX" for sound effects' },
      { id: 's2m-7', label: 'If SFX enabled: click "Generate SFX", adjust volume (default 0.3), approve or redo' },
    ],
  },
  {
    id: 'step3-config',
    title: 'Step 3a: Visual Configuration',
    icon: 'Palette',
    items: [
      { id: 's3c-1', label: 'Select Image Model for keyframe generation (Nano Banana 2, Flux 2, SeedDream, etc.)' },
      { id: 's3c-2', label: 'Set Aspect Ratio (9:16 portrait default for Shorts)' },
      { id: 's3c-3', label: 'Choose a Visual Style from the Style Grid (123 presets with 40-80 word descriptions)' },
      { id: 's3c-4', label: 'Review the niche-specific Visual Mood panel (atmosphere/color guidance)' },
      { id: 's3c-5', label: 'Confirm Video Model selection carries over from Step 2' },
    ],
  },
  {
    id: 'step3-frames',
    title: 'Step 3b: Per-Scene Keyframe Generation',
    icon: 'ImageIcon',
    items: [
      { id: 's3f-1', label: 'For each scene, review the auto-generated image prompt (GPT-4.1-mini synthesizes narration + visual style + niche mood)' },
      { id: 's3f-2', label: 'Optionally set a Reference Image per scene (from Library, URL, or previous scene frame)' },
      { id: 's3f-3', label: 'Click "Generate" for the Start Frame of each scene' },
      { id: 's3f-4', label: 'For FLF-capable models: also click "Generate" for the End Frame of each scene' },
      { id: 's3f-5', label: 'Review each generated keyframe for quality and visual consistency' },
      { id: 's3f-6', label: 'Use "Regen" to regenerate any unsatisfactory frames' },
      { id: 's3f-7', label: 'Optionally adjust Camera Control settings per scene (wide shot, close-up, pan, dolly, etc.)' },
      { id: 's3f-8', label: 'Optionally assign Characters per scene (if using character system)' },
      { id: 's3f-9', label: 'Verify all scenes have generated frames before proceeding' },
    ],
  },
  {
    id: 'step4-clips',
    title: 'Step 4a: Video Clip Generation',
    icon: 'Film',
    items: [
      { id: 's4c-1', label: 'Confirm generation mode: FLF (First-Last-Frame) for Veo 3.1/Kling V3/O3, or I2V (Image-to-Video) for Wan/Kling 2.0/Hailuo' },
      { id: 's4c-2', label: 'Generate clips individually per scene by clicking "Generate Clip"' },
      { id: 's4c-3', label: 'OR use "Generate All Scenes" for batch parallel generation' },
      { id: 's4c-4', label: 'Optionally enable Multi-Shot mode (Kling V3/O3 only, 2-6 scenes, 15s max) for single continuous video' },
      { id: 's4c-5', label: 'Watch loading indicators and preview each generated video clip' },
      { id: 's4c-6', label: 'Review clip quality: motion smoothness, visual consistency, scene transitions' },
      { id: 's4c-7', label: 'Use "Regen" on any unsatisfactory clips' },
      { id: 's4c-8', label: 'Note: For I2V models, the last frame is auto-extracted for next scene continuity' },
      { id: 's4c-9', label: 'Verify all scenes have generated clips before proceeding' },
    ],
  },
  {
    id: 'step4-avatar',
    title: 'Step 4b: Avatar Pipeline (If Enabled)',
    icon: 'Eye',
    items: [
      { id: 's4a-1', label: 'Click "Generate Avatar Pipeline" to start the 3-stage process' },
      { id: 's4a-2', label: 'Stage 1 — Portrait: AI generates avatar portrait from visual subject + LoRA' },
      { id: 's4a-3', label: 'Stage 2 — Animation: Portrait is animated to match voiceover duration' },
      { id: 's4a-4', label: 'Stage 3 — Lipsync: Audio-synced mouth movement applied to avatar video' },
      { id: 's4a-5', label: 'Review the generated avatar video for quality' },
      { id: 's4a-6', label: 'Use "Regenerate Avatar" if unsatisfied' },
      { id: 's4a-7', label: 'Toggle "Include Avatar in Final Output" for split-screen composite' },
    ],
  },
  {
    id: 'step5-assemble',
    title: 'Step 5a: Assembly & Captions',
    icon: 'Layers',
    items: [
      { id: 's5a-1', label: 'Review all inputs before assembly: clips, voiceover, music, SFX, avatar (if enabled)' },
      { id: 's5a-2', label: 'Adjust final music volume if needed (default 0.15)' },
      { id: 's5a-3', label: 'Configure Caption settings: enable/disable, font, position, color, animation style' },
      { id: 's5a-4', label: 'Click "Assemble Video" (triggers FFmpeg composition via fal-ai)' },
      { id: 's5a-5', label: 'Wait for assembly to complete (combines clips + voiceover + music + captions)' },
      { id: 's5a-6', label: 'Preview the final assembled video' },
    ],
  },
  {
    id: 'step5-review',
    title: 'Step 5b: Quality Review & Output',
    icon: 'CheckCircle2',
    items: [
      { id: 's5r-1', label: 'Optionally click "Review Quality" for AI quality analysis (GPT-4 Vision checks frame-narration alignment)' },
      { id: 's5r-2', label: 'Review quality score and alignment feedback' },
      { id: 's5r-3', label: 'Check total cost breakdown (summed across all operations)' },
      { id: 's5r-4', label: 'Download the final video file' },
      { id: 's5r-5', label: 'Verify audio-visual sync, caption timing, and music levels' },
    ],
  },
  {
    id: 'drafts',
    title: 'Draft Management',
    icon: 'Upload',
    items: [
      { id: 'dr-1', label: 'Click "Save Draft" at any point to persist your workbench state' },
      { id: 'dr-2', label: 'Give your draft a descriptive name' },
      { id: 'dr-3', label: 'Load previous drafts via the draft list popup' },
      { id: 'dr-4', label: 'Note: Drafts auto-save on major actions and are linked to a campaign record' },
    ],
  },
  {
    id: 'post-production',
    title: 'Post-Production & Repair',
    icon: 'RefreshCw',
    items: [
      { id: 'po-1', label: 'Use Scene Repair (/api/shorts/repair-scene) to fix individual scenes with Veo 3.1 FLF using adjacent frames' },
      { id: 'po-2', label: 'Use Reassemble (/api/shorts/reassemble) to rebuild the final video from existing scene assets with re-captioning' },
      { id: 'po-3', label: 'Upload the final video to YouTube, TikTok, Instagram, or other platforms' },
      { id: 'po-4', label: 'Add platform-specific metadata: title, description, tags, #Shorts hashtag' },
      { id: 'po-5', label: 'Schedule publish time if using the Scheduled Publisher' },
    ],
  },
];

const ICON_MAP = {
  Settings2, Sparkles, Wand2, Type, Mic, Eye, Clock, Music,
  Palette, ImageIcon, Film, Layers, CheckCircle2, Upload, RefreshCw,
};

const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ChecklistShortsPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const reset = useCallback(() => {
    setChecked({});
  }, []);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/shorts/workbench')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Shorts Workbench Checklist</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{completedCount} of {totalItems} completed</p>
          </div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#2C666E] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums w-10 text-right">{pct}%</span>
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Reset all">
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {completedCount === totalItems && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">All done! You've completed every step in the Shorts Workbench.</p>
          </div>
        )}

        {SECTIONS.map((section) => {
          const Icon = ICON_MAP[section.icon] || Layers;
          const sectionDone = section.items.every((item) => checked[item.id]);
          const sectionCount = section.items.filter((item) => checked[item.id]).length;

          return (
            <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{section.title}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  sectionDone
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {sectionCount}/{section.items.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {section.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <label key={item.id} className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[#2C666E] focus:ring-[#2C666E] dark:bg-gray-800 shrink-0"
                      />
                      <span className={`text-sm leading-relaxed ${isChecked ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
