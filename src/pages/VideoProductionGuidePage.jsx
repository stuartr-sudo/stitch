/**
 * VideoProductionGuidePage — guide to the Video Production Studio.
 *
 * Covers: Video Ad Creator (Studio), Video Analysis / Remix,
 * JumpStart (generate / result / save / edit / extend / erase),
 * all video models, Extend deep-dive, Edit & Erase, and the
 * Autopilot / Production Queue pipeline.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Film, Wand2, Sparkles, Play,
  AlertTriangle, Lightbulb, Zap, ArrowRight, Settings,
  Clock, Video, Search, Eye, Target,
  Scissors, RefreshCw, Cpu, ListChecks,
  Megaphone, Rocket, Monitor, Layers,
} from 'lucide-react';

// ── CDN ──────────────────────────────────────────────────────────────────────

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/video';
const img = (file, alt) => (
  <img
    src={`${CDN}/${file}`}
    alt={alt}
    className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg my-4"
  />
);

// ── Reusable UI Components ───────────────────────────────────────────────────

function Section({ icon: Icon, title, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2C666E]/10 text-[#2C666E]">{badge}</span>
        )}
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
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
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

function InfoBox({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Model table data (sourced from api/lib/modelRegistry.js) ─────────────────

const VIDEO_MODELS_TABLE = [
  { name: 'Kling 2.0 Master',    provider: 'FAL',        mode: 'I2V',  audio: false, best: 'Smooth motion, reliable quality for product ads' },
  { name: 'Kling V3 Pro',        provider: 'FAL',        mode: 'I2V',  audio: true,  best: 'Multi-shot support, native audio generation' },
  { name: 'Kling O3 Pro',        provider: 'FAL',        mode: 'I2V / R2V', audio: true, best: 'Reference-to-video, character-consistent clips' },
  { name: 'Veo 2 (Google)',       provider: 'FAL',        mode: 'I2V',  audio: false, best: 'Google quality, 5–8 s durations' },
  { name: 'Veo 3.1 (Google)',     provider: 'FAL',        mode: 'I2V / FLF / R2V', audio: true, best: 'Highest quality; First-Last-Frame for Shorts' },
  { name: 'Veo 3.1 Lite (Google)',provider: 'FAL',        mode: 'I2V / FLF / R2V', audio: true, best: '~60 % cheaper than Veo 3.1; same FLF workflow' },
  { name: 'PixVerse V6',          provider: 'FAL',        mode: 'I2V',  audio: true,  best: 'Audio switch support, style param for visual effects' },
  { name: 'Wan 2.5 Preview',      provider: 'FAL',        mode: 'I2V',  audio: false, best: 'Fast preview generations, 720 p output' },
  { name: 'Wan Pro',              provider: 'FAL',        mode: 'I2V',  audio: false, best: 'High-fidelity motion without duration constraints' },
  { name: 'PixVerse v4.5',        provider: 'FAL',        mode: 'I2V',  audio: false, best: 'Camera movement controls, style presets' },
  { name: 'Hailuo (MiniMax)',     provider: 'FAL',        mode: 'I2V',  audio: false, best: 'Cinematic quality, prompt optimiser built in' },
  { name: 'Grok Imagine I2V',     provider: 'FAL',        mode: 'I2V / R2V', audio: false, best: 'xAI model; works with white-background references' },
  { name: 'Wavespeed WAN',        provider: 'Wavespeed',  mode: 'I2V',  audio: false, best: 'LoRA-aware video; fast Wavespeed infrastructure' },
];

// ── Extend table data ─────────────────────────────────────────────────────────

const EXTEND_MODELS = [
  { name: 'Seedance 1.5 Pro', provider: 'Wavespeed', range: '4–12 s', notes: 'Most flexible range; good for easing into a longer clip' },
  { name: 'Veo 3.1 Fast Extend', provider: 'FAL', range: 'Fixed 7 s', notes: 'High quality; duration is fixed, not configurable' },
  { name: 'Grok Imagine Extend', provider: 'FAL', range: '2–10 s', notes: 'Returns original + extension stitched; trim if you only want new content. Input must be MP4 H.264/H.265/AV1' },
];

// ── Main content component ────────────────────────────────────────────────────

export function VideoProductionGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07393C] to-[#2C666E] p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Video Production Studio</h1>
        <p className="text-white/80 text-lg">
          Generate, extend, edit, and analyse AI video with professional-grade controls.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {['Studio Overview', 'Video Analysis', 'JumpStart', 'Model Selector', 'Extend', 'Edit & Erase', 'Autopilot'].map(s => (
            <span key={s} className="px-3 py-1 rounded-full bg-white/20 text-white/90 text-sm font-medium">{s}</span>
          ))}
        </div>
      </div>

      {/* 1 — Overview */}
      <Section icon={Monitor} title="Studio Overview" defaultOpen badge="Start here">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          The Studio at <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/studio</code> is
          the Video Ad Creator — a non-linear workspace for creating individual video assets. It is distinct from:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
          <li><strong>Shorts Workbench</strong> — automated 5-step pipeline (script → voice → keyframes → clips → assemble)</li>
          <li><strong>Storyboards</strong> — sequential scene planning and production management</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Use the Studio when you need direct control over individual video clips — choosing your model, prompt, duration, and aspect ratio yourself.
        </p>
        {img('01-studio-overview.jpg', 'Studio page showing the full tool grid')}
        <InfoBox>
          The sidebar groups tools into Image Tools, Video Tools, Audio Tools, Social Tools, and Automation. The Video Tools section contains JumpStart, Video Studio (Edit &amp; extend), Trip (restyle), Animate, and Motion Transfer.
        </InfoBox>
      </Section>

      {/* 2 — Video Analysis */}
      <Section icon={Search} title="Video Analysis / Remix" badge="VideoAnalyzerModal">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Upload any video and get an AI analysis of its structure — scene breakdown, pacing, motion patterns, colour palette, and narrative arc. The remix option generates new video concepts based on the analysis.
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Use this to deconstruct competitor ads, reference videos, or your own past content. Click <strong>Video Analyzer</strong> in the Video Tools section to open it.
        </p>
        {img('02-video-analyzer.jpg', 'Video Analyzer modal open')}
        <Tip>
          Video analysis works on any MP4 or WebM. Paste a YouTube or social URL, or upload directly. The AI identifies hook structure, transitions, and CTA placement — useful for understanding what makes a video work before you build your own.
        </Tip>
      </Section>

      {/* 3 — JumpStart */}
      <Section icon={Zap} title="JumpStart Studio" badge="6 operations">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          JumpStart is the main video generation interface. It exposes six operations via a slide-out panel. Open it by clicking <strong>JumpStart</strong> in the Video Tools section.
        </p>
        {img('03-jumpstart-modal.jpg', 'JumpStart modal showing Upload / Styles / Settings / Results tabs')}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">Operation</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">What it does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Generate', 'Image → Video. Select model, aspect ratio, duration, and prompt. Upload or import a start image, pick a visual style, then generate.'],
                ['Result',   'Poll async results — returns when your clip is ready. Status updates automatically.'],
                ['Save Video', 'Persist a generated clip to your library for re-use in other projects.'],
                ['Edit',     'Restyle or refine an existing clip using Kling O3 V2V (video-to-video). Change style, lighting, or subject while preserving motion.'],
                ['Extend',   'Add duration to an existing clip. Three model options with different duration ranges (see Extend section).'],
                ['Erase',    'Inpainting — draw a mask over what you want removed; the AI fills it with background-appropriate content.'],
              ].map(([op, desc]) => (
                <tr key={op} className="border border-gray-200 dark:border-gray-600 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-750">
                  <td className="px-3 py-2 font-medium text-[#2C666E] dark:text-[#4ECDC4] whitespace-nowrap border border-gray-200 dark:border-gray-600">{op}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3">
          <Step number="1" title="Upload a start image">
            <p>Click <strong>Upload</strong>, drag &amp; drop a PNG/JPG/WebP (up to 10 MB), or use Search Web / Import URL / Library.</p>
          </Step>
          <Step number="2" title="Choose a visual style (optional)">
            <p>The <strong>Styles</strong> tab gives you 123 visual style presets. Selecting one injects a detailed cinematography prompt alongside your own.</p>
          </Step>
          <Step number="3" title="Configure output settings">
            <p>Under <strong>Settings</strong>: pick your AI model, aspect ratio (16:9 / 9:16 / 1:1 / 4:3), resolution (480 p / 720 p), and duration (4–8 s depending on model).</p>
          </Step>
          <Step number="4" title="Generate and retrieve">
            <p>Submit the job. Switch to the <strong>Results</strong> tab to poll progress. Clips are saved to Supabase automatically once complete.</p>
          </Step>
        </div>
      </Section>

      {/* 4 — Model Selector */}
      <Section icon={Cpu} title="Model Selector" badge="13 video models">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Select your model in the JumpStart Settings tab or the Video Studio Extend/Edit panel. The dropdown shows all available models with emoji indicators for quick identification.
        </p>
        {img('04-model-dropdown.jpg', 'JumpStart model dropdown showing all video models')}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                {['Model', 'Provider', 'Mode', 'Audio', 'Best for'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIDEO_MODELS_TABLE.map(m => (
                <tr key={m.name} className="border border-gray-200 dark:border-gray-600 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-750">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 whitespace-nowrap">{m.name}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">{m.provider}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">{m.mode}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-center">
                    {m.audio
                      ? <span className="text-green-600 font-bold">Yes</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">{m.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>I2V</strong> — Image-to-Video: animates a single start image.</p>
          <p><strong>FLF</strong> — First-Last-Frame: animates between two keyframe images (used in Shorts Workbench).</p>
          <p><strong>R2V</strong> — Reference-to-Video: uses one or more character reference images to maintain identity across a clip.</p>
        </div>

        <Warning>
          Veo 3.1 R2V cannot handle reference images with plain white or blank backgrounds — these consistently fail with a 422 error. Use references with contextual scene backgrounds, or switch to Grok Imagine I2V which handles white-background references fine.
        </Warning>
        <Tip>
          Audio generation (native voiceover/ambient sound in the clip itself) is supported only by Kling V3 Pro, Kling O3 Pro, Veo 3.1, Veo 3.1 Lite, and PixVerse V6. For all other models send <code className="px-1 rounded bg-gray-100 dark:bg-gray-700 text-xs">generate_audio: false</code> — some models default to true and will error if you omit it.
        </Tip>
      </Section>

      {/* 5 — Extend */}
      <Section icon={ArrowRight} title="Extend — Add Duration to Existing Clips">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Open <strong>Video Studio</strong> from the sidebar, then switch to the <strong>Extend</strong> tab. Select a clip from your library (or import a URL), choose your extend model, and submit.
        </p>
        {img('05-extend-controls.jpg', 'Video Studio Extend tab with model selector and clip list')}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                {['Model', 'Provider', 'Range', 'Notes'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXTEND_MODELS.map(m => (
                <tr key={m.name} className="border border-gray-200 dark:border-gray-600 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-750">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 whitespace-nowrap">{m.name}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">{m.provider}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">{m.range}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Warning>
          <strong>Grok Imagine Extend</strong> returns the original video + extension stitched together as a single file — not just the new content. If you only want the extended portion, you will need to trim the original length from the output. Input video must be MP4 encoded with H.264, H.265, or AV1.
        </Warning>
        <Tip>
          <strong>Veo 3.1 Fast Extend</strong> always adds exactly 7 seconds — you cannot configure this. Use Seedance 1.5 Pro if you need a specific duration between 4 and 12 seconds.
        </Tip>
      </Section>

      {/* 6 — Edit & Erase */}
      <Section icon={Scissors} title="Edit and Erase">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Open <strong>Video Studio</strong> from the sidebar, then switch to the <strong>Edit</strong> tab. Two operations are available:
        </p>
        {img('06-edit-erase.jpg', 'Video Studio Edit tab showing video selection and edit controls')}

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#2C666E]" /> Edit (Kling O3 V2V — Video-to-Video)
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Restyle an existing clip while preserving its motion. Write a prompt describing the target look — change visual style, lighting conditions, environment, or the subject itself. The original motion path is retained; only the appearance changes.
            </p>
            <Tip>
              Use this after generating a base clip to apply brand colours, switch from day to night lighting, or shift from photorealistic to illustrated style — without re-generating from scratch.
            </Tip>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#2C666E]" /> Erase (Inpainting)
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Draw a mask over the region you want removed. The AI analyses the surrounding frames and fills the masked area with contextually appropriate background content. Useful for removing unwanted objects, logos, or people from a clip.
            </p>
            <Tip>
              Paint a tight mask around the object — avoid including large empty areas. The inpainting quality improves significantly when the mask closely follows the shape of the thing being removed.
            </Tip>
          </div>
        </div>
      </Section>

      {/* 7 — Autopilot / Queue */}
      <Section icon={Rocket} title="Autopilot Pipeline — Production Queue" badge="/queue">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          For fully automated article-to-video production, use the <strong>Production Queue</strong> at{' '}
          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/queue</code>. The workflow engine scrapes an article, analyses its content, matches video templates, generates all assets, and assembles the final video — without manual intervention.
        </p>
        {img('07-production-queue.jpg', 'Production Queue page showing Autopilot controls and queue status')}

        <div className="mt-4 space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Workflow steps</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {[
              ['Scrape', 'Fetches article content from a URL'],
              ['Analyse', 'GPT extracts scenes, pacing, and narrative structure'],
              ['Match Templates', 'Maps content to video style frameworks'],
              ['Create Campaign', 'Sets up the draft and assets record'],
              ['Generate Assets', 'Keyframes + video clips per scene'],
              ['Concat', 'FFmpeg assembly of all clips'],
              ['Upload', 'Pushes final video to Supabase storage'],
              ['Finalize', 'Marks draft ready; optional YouTube publish'],
            ].map(([step, desc]) => (
              <div key={step} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                <ListChecks className="w-4 h-4 text-[#2C666E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{step}</span>
                  <span className="text-gray-500 dark:text-gray-400"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Autopilot controls</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Toggle <strong>Autopilot</strong> to have the queue processor pick up and run jobs automatically. Set the batch size (1 / 2 / 3 / 5 / 10) to control how many jobs run concurrently. The queue shows status counts: Queued, In Progress, Ready, and Failed.
          </p>
        </div>

        <InfoBox>
          The workflow engine supports pause / resume / retry. If a job fails at any step (e.g., a video generation error), it can be retried from that step — it does not restart from scrape. Access individual job controls from the Kanban or List view on the queue page.
        </InfoBox>
        <Warning>
          Deploying to Fly.io restarts the server and kills any running pipeline mid-generation. Never deploy while the Autopilot is active. Always pause Autopilot, push, then deploy.
        </Warning>
      </Section>

      {/* 8 — Quick reference */}
      <Section icon={Layers} title="Quick Reference — Which Tool for Which Job?">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { task: 'One clip, full control', tool: 'JumpStart', path: '/studio → Video Tools → JumpStart' },
            { task: 'Deconstruct a reference video', tool: 'Video Analyzer', path: '/studio → Video Tools → Video Analyzer' },
            { task: 'Make a clip longer', tool: 'Video Studio → Extend', path: '/studio → Video Tools → Video Studio' },
            { task: 'Restyle a clip', tool: 'Video Studio → Edit (V2V)', path: '/studio → Video Tools → Video Studio' },
            { task: 'Remove an object from a clip', tool: 'Video Studio → Erase', path: '/studio → Video Tools → Video Studio' },
            { task: 'Automated article → Short', tool: 'Production Queue', path: '/queue' },
            { task: 'Full scripted Short with voice', tool: 'Shorts Workbench', path: '/shorts/workbench' },
            { task: 'Multi-scene planned video', tool: 'Storyboards', path: '/storyboards' },
          ].map(({ task, tool, path }) => (
            <div key={task} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-0.5">{task}</p>
              <p className="text-[#2C666E] dark:text-[#4ECDC4] font-semibold">{tool}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{path}</p>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

export default function VideoProductionGuidePage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      <VideoProductionGuideContent />
    </div>
  );
}
