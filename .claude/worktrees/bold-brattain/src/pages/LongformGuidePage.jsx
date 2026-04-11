/**
 * LongformGuidePage — interactive guide for the Longform Video Workbench.
 *
 * Exported as LongformGuideContent for embedding in LearnPage.
 * Covers the full 7-step pipeline: Research → Script → Voice → Timing → Keyframes → Clips → Assemble.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Film, Search, FileText, Mic,
  Clock, ImageIcon, Clapperboard, Layers, AlertTriangle,
  Sparkles, Music, Save, FolderOpen, BookOpen, Scissors,
  Volume2, RotateCcw, Settings2,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/longform/';

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'');
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={sectionId} data-guide-section={title} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden scroll-mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-4 mt-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-sm font-bold">{number}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Screenshot({ src, alt, caption }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <img src={src} alt={alt} className="w-full block" loading="lazy" />
      {caption && (
        <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          {caption}
        </p>
      )}
    </div>
  );
}

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════

export function LongformGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-[#2C666E]/10 border border-emerald-500/20 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <Film className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Longform Video Workbench</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create 3 to 15 minute videos with chapters, voiceover, background music, and AI-generated visuals.
          The same pipeline quality as the Shorts Workbench, extended for longer-form content like explainers, tutorials, and documentaries.
        </p>
      </div>

      {/* Overview */}
      <Section icon={Layers} title="Overview — The 7-Step Pipeline" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The Longform Workbench follows seven sequential steps, each building on the previous one.
            The pipeline mirrors the Shorts Workbench but adds chapter-based structure for longer videos.
          </p>
          <div className="grid grid-cols-7 gap-1 mt-3">
            {[
              { num: 1, label: 'Research', icon: '🔍' },
              { num: 2, label: 'Script', icon: '📝' },
              { num: 3, label: 'Voice', icon: '🎙️' },
              { num: 4, label: 'Timing', icon: '⏱️' },
              { num: 5, label: 'Keyframes', icon: '🖼️' },
              { num: 6, label: 'Clips', icon: '🎬' },
              { num: 7, label: 'Assemble', icon: '🏗️' },
            ].map(s => (
              <div key={s.num} className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-lg">{s.icon}</p>
                <p className="text-[10px] font-medium text-gray-900 dark:text-gray-100 mt-0.5">Step {s.num}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
          <Screenshot src={`${CDN}01-research-step.jpg`} alt="Longform Workbench overview" caption="The Longform Workbench with 7-step stepper and niche selection" />
        </div>
      </Section>

      {/* Step 1: Research */}
      <Section icon={Search} title="Step 1 — Research">
        <Step number={1} title="Select a Niche">
          <p>
            Choose from 20 content niches (AI/Tech, Finance, Science, etc.). The niche determines the research
            direction, voice style defaults, and visual mood for later steps.
          </p>
        </Step>
        <Step number={2} title="Enter Your Topic">
          <p>
            Type a specific topic in the text field. Be detailed — "The hidden psychology behind TikTok's algorithm"
            works better than "TikTok".
          </p>
        </Step>
        <Step number={3} title="Choose Target Duration">
          <p>
            Select from 3, 5, 8, 10, or 15 minutes. This determines how many chapters and scenes the script will generate.
            Longer durations produce more chapters with more visual variety.
          </p>
        </Step>
        <Step number={4} title="Click Research Topic">
          <p>
            GPT-4.1 with web search researches your topic, gathering facts, statistics, and talking points
            that feed into the script generation step.
          </p>
          <Screenshot src={`${CDN}02-research-highlight.jpg`} alt="Research Topic button" caption="Click Research Topic to gather AI-powered research" />
        </Step>
        <Tip>
          The more specific your topic, the better the research. "5 breakthroughs in quantum computing this month" gives richer results than "quantum computing".
        </Tip>
      </Section>

      {/* Step 2: Script */}
      <Section icon={FileText} title="Step 2 — Script">
        <Step number={1} title="Generate Script">
          <p>
            Using the research from Step 1, the AI generates a chapter-based script. Each chapter has:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>A title and narration text</li>
            <li>Scene descriptions for visual direction</li>
            <li>Overlay text for on-screen captions</li>
          </ul>
        </Step>
        <Step number={2} title="Edit & Refine">
          <p>
            The full script appears in an editable text area. Adjust wording, reorder points,
            or add your own sections. Each chapter is clearly marked.
          </p>
          <Screenshot src={`${CDN}03-script-step.jpg`} alt="Script generation step" caption="The script step shows the generated chapter-based narrative" />
        </Step>
        <Step number={3} title="Scene Direction (Optional)">
          <p>
            Add visual direction notes that guide how keyframe images are generated in Step 5.
            These are separate from the narration — they describe what the audience should see.
          </p>
        </Step>
        <Tip>
          Longform scripts are structured into chapters automatically. Each chapter becomes a separately-assembled segment that gets concatenated in the final video.
        </Tip>
      </Section>

      {/* Step 3: Voice */}
      <Section icon={Mic} title="Step 3 — Voice & TTS">
        <Step number={1} title="Choose a Voice">
          <p>
            Select from 30 Gemini TTS voices (12 featured, 18 more available). Each voice has a preview button
            so you can hear it before committing.
          </p>
          <Screenshot src={`${CDN}04-voice-step.jpg`} alt="Voice selection step" caption="Choose from 30 Gemini TTS voices with live preview" />
        </Step>
        <Step number={2} title="Set Voice Style">
          <p>
            Pick a voice style preset (Documentary, Storyteller, News Anchor, Teacher, Podcast Host, etc.)
            or write your own custom style instructions. Niche-specific defaults are pre-selected.
          </p>
        </Step>
        <Step number={3} title="Adjust Speed">
          <p>
            Voice speed options range from 0.85x (slow, dramatic) to 1.25x (fast, energetic).
            Default is 1.15x — a natural-sounding uptempo pace.
          </p>
        </Step>
        <Step number={4} title="Generate Voiceover">
          <p>
            Click <strong>Generate Voiceover</strong> to produce the full narration audio.
            The backend uses Gemini TTS via FAL.ai with speed-aware pacing directives.
          </p>
        </Step>
      </Section>

      {/* Step 4: Timing */}
      <Section icon={Clock} title="Step 4 — Timing & Music">
        <Step number={1} title="Auto-Timing">
          <p>
            Whisper transcription extracts word-level timestamps from the voiceover.
            The system aligns narration blocks to scene boundaries and calculates optimal chapter durations.
          </p>
        </Step>
        <Step number={2} title="Generate Background Music">
          <p>
            Choose from 4 music backends: <Badge color="blue">ElevenLabs</Badge> <Badge color="green">MiniMax</Badge> <Badge color="purple">Lyria2</Badge> <Badge>Suno</Badge>.
            Music is always instrumental and niche-aware (the music mood comes from your Shorts template).
          </p>
        </Step>
        <Tip>
          The timing step is crucial for lip-sync accuracy. Let it process fully before moving to Keyframes — rushing past timing issues causes audio/video drift in the final assembly.
        </Tip>
      </Section>

      {/* Step 5: Keyframes */}
      <Section icon={ImageIcon} title="Step 5 — Keyframes">
        <Step number={1} title="Generate Scene Images">
          <p>
            Each scene gets a keyframe image generated via LLM prompt synthesis. The system combines:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>The scene's narration context</li>
            <li>Visual style preset (from StyleGrid — 123 options)</li>
            <li>Niche visual mood</li>
            <li>Scene direction notes</li>
          </ul>
          <Screenshot src={`${CDN}05-keyframes-step.jpg`} alt="Keyframes generation" caption="Per-scene keyframe generation with visual style selection" />
        </Step>
        <Step number={2} title="Choose a Visual Style">
          <p>
            Open the StyleGrid to select from 123 visual style presets across categories like Realistic, Professional,
            Artistic, and more. Each preset includes a detailed 40-80 word prompt description.
          </p>
        </Step>
        <Step number={3} title="Reference Images (Optional)">
          <p>
            Add reference images per scene for consistency — from your library, a URL, or a previous scene's frame.
            I2I (image-to-image) mode generates variations that match the reference.
          </p>
        </Step>
        <Step number={4} title="Regenerate Individual Scenes">
          <p>
            Not happy with a keyframe? Click the regenerate button on any individual scene to get a new version
            without affecting others.
          </p>
        </Step>
        <Warning>
          Keyframe generation uses your selected image model's API credits. Generating all scenes for a 15-minute video (20+ scenes) can use significant credits. Consider generating a few test scenes first to validate your style choice.
        </Warning>
      </Section>

      {/* Step 6: Video Clips */}
      <Section icon={Clapperboard} title="Step 6 — Video Clips">
        <Step number={1} title="Choose Video Model">
          <p>
            Select from all available video models. Two generation modes are auto-selected based on your model:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">FLF Mode</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">First-Last-Frame: Two keyframes per scene create smooth transitions. Works with Veo 3.1, Kling V3, Kling O3.</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">I2V Mode</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Image-to-Video: Single keyframe animated into motion. Works with Wan 2.5, Kling 2.0, Hailuo, etc.</p>
            </div>
          </div>
          <Screenshot src={`${CDN}06-clips-step.jpg`} alt="Video clips generation" caption="Generate video clips per scene using FLF or I2V mode" />
        </Step>
        <Step number={2} title="Generate All Clips">
          <p>
            Click <strong>Generate All</strong> to produce video clips for every scene.
            Each clip is generated independently and can be regenerated individually if needed.
          </p>
        </Step>
        <Tip>
          FLF mode (Veo 3.1) generally produces the smoothest scene-to-scene transitions because each clip starts and ends on specific keyframe images. I2V mode gives more creative freedom but less control over transitions.
        </Tip>
      </Section>

      {/* Step 7: Assemble */}
      <Section icon={Layers} title="Step 7 — Assemble">
        <Step number={1} title="Chapter-Based Assembly">
          <p>
            Unlike Shorts (single-segment assembly), longform videos are assembled chapter by chapter.
            Each chapter's scenes are concatenated first, then all chapters are joined into the final video.
          </p>
          <Screenshot src={`${CDN}07-assemble-step.jpg`} alt="Assembly step" caption="Final assembly combines chapters, voiceover, music, and captions" />
        </Step>
        <Step number={2} title="Add Captions">
          <p>
            Select a caption style for burned-in subtitles. Options include word pop, karaoke glow,
            word highlight, and news ticker — or configure a custom style.
          </p>
        </Step>
        <Step number={3} title="Music Volume">
          <p>
            Adjust the background music volume relative to the voiceover.
            Default is 15% — enough to set atmosphere without competing with narration.
          </p>
        </Step>
        <Step number={4} title="Assemble Final Video">
          <p>
            Click <strong>Assemble</strong> to produce the final video with voiceover, music, captions, and all chapters combined.
            The result is a single MP4 ready for upload to YouTube or any platform.
          </p>
        </Step>
      </Section>

      {/* Drafts */}
      <Section icon={Save} title="Saving & Loading Drafts">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Longform projects take time. The draft system lets you save your progress at any step and resume later.
          </p>
          <Screenshot src={`${CDN}08-save-draft-highlight.jpg`} alt="Save Draft button" caption="Save your work at any point — resume from where you left off" />
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Save Draft</strong> — Persists all state (research, script, voiceover, keyframes, clips) to the database</li>
            <li><strong>Load Draft</strong> — Opens a picker to resume any previously saved project</li>
          </ul>
          <p>
            Drafts are stored in the <code>longform_drafts</code> table with full JSONB state,
            so nothing is lost between sessions.
          </p>
        </div>
        <Tip>
          Save frequently, especially after expensive operations like voiceover generation or video clip creation. Each save captures the full state including generated media URLs.
        </Tip>
      </Section>

      {/* Comparison with Shorts */}
      <Section icon={Scissors} title="Longform vs. Shorts Workbench">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 font-medium text-gray-900 dark:text-gray-100">Feature</th>
                <th className="text-left py-2 font-medium text-gray-900 dark:text-gray-100">Shorts</th>
                <th className="text-left py-2 font-medium text-gray-900 dark:text-gray-100">Longform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr><td className="py-1.5">Duration</td><td className="py-1.5">15-60s</td><td className="py-1.5">3-15 min</td></tr>
              <tr><td className="py-1.5">Structure</td><td className="py-1.5">Flat scenes</td><td className="py-1.5">Chapters with scenes</td></tr>
              <tr><td className="py-1.5">Assembly</td><td className="py-1.5">Single pass</td><td className="py-1.5">Per-chapter then concatenate</td></tr>
              <tr><td className="py-1.5">Music backends</td><td className="py-1.5">ElevenLabs, MiniMax, Lyria2, Suno</td><td className="py-1.5">Same 4 backends</td></tr>
              <tr><td className="py-1.5">Steps</td><td className="py-1.5">5 steps</td><td className="py-1.5">7 steps (+ Research, Timing)</td></tr>
              <tr><td className="py-1.5">Target platform</td><td className="py-1.5">TikTok, IG Reels, YT Shorts</td><td className="py-1.5">YouTube, Vimeo, websites</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Tips */}
      <Section icon={Sparkles} title="Tips & Best Practices">
        <div className="mt-3 space-y-3">
          <Tip>
            <strong>Start with 3-5 Minutes:</strong> Your first longform project should be shorter. Once you're comfortable with the chapter pipeline, scale up to 10-15 minutes.
          </Tip>
          <Tip>
            <strong>Consistent Visual Style:</strong> Pick one visual style preset and stick with it across all chapters. Mixing styles within a video looks jarring.
          </Tip>
          <Tip>
            <strong>Chapter Transitions:</strong> The last frame of each chapter's last scene connects to the first frame of the next chapter. For smooth transitions, keep visual continuity in mind when reviewing keyframes at chapter boundaries.
          </Tip>
          <Tip>
            <strong>Music Selection:</strong> For longer videos, Suno and ElevenLabs tend to produce more varied music that doesn't feel repetitive over 10+ minutes. MiniMax is great for shorter segments.
          </Tip>
          <Tip>
            <strong>Draft Early, Draft Often:</strong> Save a draft after completing each step. Longform videos involve many API calls — you don't want to lose voiceover or clip generation progress.
          </Tip>
        </div>
      </Section>
    </div>
  );
}
