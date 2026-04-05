/**
 * ShortsWorkbenchGuidePage — comprehensive interactive guide for the Shorts Workbench.
 *
 * Accessible at /shorts-educate (admin-only, behind auth).
 * Covers every feature, control, and workflow in the Shorts Workbench.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, AlertTriangle, Play, Settings2, Image as ImageIcon,
  Sparkles, Film, Mic, Music, Volume2, RefreshCw, Download, CheckCircle2,
  Eye, Clock, Layers, Sliders, Zap, Video, Camera, Palette, Type, Shield,
  Search, Users, Wand2, Target, LayoutGrid, FileText, Globe, Monitor, Smartphone,
} from 'lucide-react';

// ── Expandable Section ──

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

// ── Step card ──

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

// ── Tip callout ──

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

// ── Warning callout ──

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Inline badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ── Key-value row ──

function KV({ label, children }) {
  return (
    <div className="flex gap-2 mt-1">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-32">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/shorts';
const img = (file, alt) => (
  <img src={`${CDN}/${file}`} alt={alt}
    className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4" />
);
const Placeholder = ({ label }) => (
  <div className="max-w-2xl mx-auto my-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-300">
    <strong>Live generation step</strong> — {label}
  </div>
);

export function ShortsWorkbenchGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07393C] to-[#2C666E] p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Shorts Workbench</h1>
        <p className="text-white/80 text-lg">Create AI-powered short-form videos in 5 steps — script, timing, keyframes, clips, and assembly.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {['Step 1: Script & Voice', 'Step 2: Timing & Music', 'Step 3: Keyframes', 'Step 4: Video Clips', 'Step 5: Assembly'].map(s => (
            <span key={s} className="px-3 py-1 rounded-full bg-white/20 text-white/90 text-sm font-medium">{s}</span>
          ))}
        </div>
      </div>

      {/* ── Overview ── */}
      <Section icon={Video} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The Shorts Workbench is a <strong className="text-gray-900 dark:text-gray-100">5-step interactive production pipeline</strong> for
            short-form vertical videos (YouTube Shorts, TikTok, Instagram Reels). Every stage — script, voice,
            timing, keyframes, video clips, and final assembly — is visible and editable. You approve each step
            before moving to the next, so nothing runs blind.
          </p>
          <p>
            Use the Shorts Workbench when you want hands-on control over a single video. Use <strong className="text-gray-900 dark:text-gray-100">Storyboards</strong> for
            longer-form productions with multiple scenes that need detailed planning and client review. Use the <strong className="text-gray-900 dark:text-gray-100">Batch Queue</strong> to
            produce multiple Shorts from a topic list without stepping through the workbench each time.
          </p>
          {img('01-workbench-overview.jpg', 'Shorts Workbench showing 5 step tabs and the niche/topic panel')}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Output specs</h5>
              <KV label="Aspect ratio">9:16 vertical (1080×1920)</KV>
              <KV label="Duration">30–90 seconds</KV>
              <KV label="Scenes">5–10 typically</KV>
              <KV label="Est. cost">~$0.50–$2.00 per Short</KV>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">What gets generated</h5>
              <KV label="Script">GPT-4.1-mini narration</KV>
              <KV label="Voice">Gemini TTS (30 voices)</KV>
              <KV label="Music">ElevenLabs instrumental</KV>
              <KV label="Video">Veo / Kling / Wan / more</KV>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Step 1 ── */}
      <Section icon={Mic} title="Step 1 — Script &amp; Voice">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Step 1 establishes everything that drives the rest of the production: your niche, topic, narrative script,
            voice, and voiceover audio. The output of this step is a generated MP3 voiceover that all later steps
            are timed against. You cannot proceed to Step 2 until the voiceover is approved.
          </p>

          <Step number={1} title="Choose your niche">
            <p>
              Select from 20 niches — AI/Tech, Finance, Horror, History, True Crime, Science, Relationships,
              Fitness, Gaming, Conspiracy, Business, Food, Travel, Psychology, Space, Animals, Sports,
              Education, Motivation, and Paranormal. Each niche ships with a complete pre-configured production
              profile: scene structure, music mood, voice pacing, visual mood, and a set of recommended
              narrative frameworks. Changing your niche after scripting resets the visual mood but does not
              erase your script.
            </p>
            {img('02-niche-selector.jpg', 'Niche selection grid showing 20 niche options with Horror highlighted')}
          </Step>

          <Step number={2} title="Pick a framework and duration">
            <p>
              Frameworks define the narrative structure of your video — how many scenes, what emotional arc each
              follows, and how scenes chain together. Each niche surfaces 3 recommended frameworks at the top of
              the list; the remaining universal frameworks (Personal Journey, Origin Story, Explainer Story, etc.)
              are always available. Duration options are 30s, 45s, 60s, and 90s — the framework and duration together
              determine how many scenes the script will contain and how long each clip needs to be.
            </p>
          </Step>

          <Step number={3} title="Build your topic">
            <p>
              Type any topic directly into the topic field, or use the research tools to discover trending ideas.
              Clicking <strong>Research</strong> runs the Topic Research Agent — a multi-query SearchAPI sweep that scores
              results by trending velocity and competition density. Clicking <strong>Generate Ideas</strong> uses your
              niche context to brainstorm topic angles without a live search. Either approach populates the topic
              field; you can edit it freely before generating the script.
            </p>
            {img('03-topic-funnel.jpg', 'Topic area showing Research and Generate Ideas buttons')}
            {img('04-generate-ideas.jpg', 'Generate Ideas button highlighted in the topic discovery area')}
            <Tip>
              The Research Agent returns scored cards showing trending and competition ratings. A topic with high
              trending and low competition is the sweet spot — it is gaining search interest but the results page
              is not yet saturated. Trust the scores; they are based on live search data, not guesswork.
            </Tip>
          </Step>

          <Step number={4} title="Generate your script">
            <p>
              Click <strong>Generate</strong> to produce the full narration. GPT-4.1-mini writes word-by-word narration
              segments with scene labels, overlay text suggestions, and pacing notes — all tuned to your niche's
              voice tone. The word count and estimated duration are shown immediately below the script. You can
              edit the script inline at any time; re-generating replaces it entirely.
            </p>
            {img('05-script-area.jpg', 'Script section showing Generate button and word count display')}
          </Step>

          <Step number={5} title="Select a voice and style">
            <p>
              Twelve of the 30 available Gemini TTS voices are shown by default, each with a personality descriptor.
              Puck is upbeat and lively — good for tech and entertainment. Charon is calm and professional — good for
              finance and education. Aoede is warm and melodic — good for lifestyle and storytelling. Preview any
              voice by clicking its card, then choose a voice style preset (Documentary, Storyteller, News Anchor,
              Whispering, High Energy, Teacher, Campfire, Podcast Host) to shape the delivery. Your niche
              automatically pre-selects the most fitting style preset.
            </p>
            {img('06-voice-selector.jpg', 'Voice selector grid with Puck highlighted and voice style presets visible')}
          </Step>

          <Step number={6} title="Set playback speed">
            <p>
              Speed buttons range from 0.75x to 1.4x. The backend injects speed-aware pacing directives directly
              into the Gemini TTS style instructions — at 1.1x the model delivers slightly quicker cadence; at 1.25x
              it uses an uptempo rhythm; at 1.3x and above it adopts a brisk, high-energy flow. The effective
              duration shown below the audio player updates in real time so you can see exactly how the speed
              change affects total video length before generating.
            </p>
            {img('07-speed-control.jpg', 'Voice style presets and speed control section')}
          </Step>

          <Step number={7} title="Generate voiceover and approve">
            <p>
              Click <strong>Generate Voiceover</strong> to run TTS. The audio player appears with the generated MP3.
              Listen, then either approve it (unlocks Step 2) or click Redo to regenerate with the same settings.
              Sound Effects can be enabled below the voiceover — this generates a separate ambient SFX audio track
              that is mixed under the voiceover during final assembly at the volume you set.
            </p>
            {img('08-sfx-controls.jpg', 'Voiceover player and Sound Effects controls')}
          </Step>
        </div>
      </Section>

      {/* ── Step 2 ── */}
      <Section icon={Clock} title="Step 2 — Timing &amp; Music">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Step 2 extracts precise word timestamps from your voiceover using Whisper, then aligns those timestamps
            to valid video model clip durations. The result is a set of scene blocks — each with an exact start time,
            end time, narration excerpt, and target clip duration — that all later steps are built on. You also
            choose your video model here, which determines which clip durations are valid and whether FLF or I2V
            generation mode is used in Step 4.
          </p>
          {img('09-timing-overview.jpg', 'Step 2 showing Scene Block Timing panel with video model selector')}

          <Step number={1} title="Choose your video model">
            <p>
              The model you select here determines the generation mode for Step 4. FLF models (Veo 3.1, Veo 3.1 Lite,
              Kling V3 Pro, Kling O3 Pro) require two keyframe images per scene and produce the highest-quality
              output. I2V models (Wavespeed WAN, Kling 2.0 Master, Hailuo/MiniMax, Wan 2.5) animate from a single
              image and are faster and cheaper. Veo 3.1 only accepts clip durations of 4s, 6s, or 8s — the block
              aligner automatically snaps your scene lengths to valid values for whichever model you choose.
            </p>
          </Step>

          <Step number={2} title="Analyze timing">
            <p>
              Click <strong>Analyze Timing</strong> to run Whisper on your voiceover audio. Whisper returns a start and
              end timestamp for every spoken word. The block aligner groups these words into scenes, snaps each
              scene duration to the nearest valid clip length for your model, and calculates whether the total
              clip duration matches the total TTS duration. The summary shows total clips length vs TTS length so
              you can see if there is any drift before generating.
            </p>
            {img('10-timing-blocks.jpg', 'Scene block timing grid showing scene labels, durations, and word counts per scene')}
          </Step>

          <Step number={3} title="Generate background music">
            <p>
              Music is generated via ElevenLabs Music and is always instrumental — no lyrics. Your niche determines
              the default mood prompt (AI/Tech gets electronic synthwave, Horror gets dark ambient, Fitness gets
              driving beats). Click <strong>Generate Music</strong> to produce a track. A waveform player appears with
              Approve and Redo buttons. Approved music is stored in Supabase and mixed at 15–40% volume during
              assembly. Click Redo up to three times to get a different take; each generation is unique.
            </p>
            {img('11-music-panel.jpg', 'Background Music section showing audio player, volume control, and Approve/Redo buttons')}
            <Tip>
              Music volume is set here as a percentage and passed directly to the FFmpeg assembly in Step 5.
              38% is a solid default for voiceover-led content. Go lower (20–25%) if your voiceover is fast-paced
              with lots of words; go higher (50%+) for more atmospheric, slower narration styles.
            </Tip>
          </Step>
        </div>
      </Section>

      {/* ── Step 3 ── */}
      <Section icon={ImageIcon} title="Step 3 — Keyframes">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Step 3 is where your video starts to look real. Each scene gets one or two AI-generated keyframe
            images — the visual foundation that every video clip in Step 4 is built from. The quality of your
            keyframes directly determines the quality of your final video. Weak keyframes produce weak clips;
            strong, visually coherent keyframes produce cinematic clips.
          </p>
          <p>
            This step also configures your image model, visual style, aspect ratio, and the niche-specific theme
            feel — a pre-baked atmospheric description that is injected into every frame prompt automatically.
          </p>
          {img('13-style-grid.jpg', 'Visual style grid showing 123 style presets organised by category')}

          <Step number={1} title="Choose visual style and image model">
            <p>
              The StyleGrid has 123 style presets organised into Photography, Cinematic, Animation, Painting, Art
              Movements, Digital & Modern, Genre, Period/Aesthetic, and specialised categories. Click any style
              card to apply it to all scenes. The style is injected as a text modifier into every image prompt —
              selecting "Cinematic Noir" darkens every frame with high contrast and shadows; selecting "Anime
              Watercolor" gives every frame a hand-painted look. Image model options include Wavespeed, SeedDream,
              Flux 2 Dev, Imagen 4, Kling Image V3, Grok Imagine, Nano Banana 2, and Ideogram V2.
            </p>
          </Step>

          <Step number={2} title="Review the theme feel">
            <p>
              Below the style grid you will see a <strong>Theme Feel</strong> panel showing the niche's visual mood —
              a detailed atmospheric description like "dark oppressive atmosphere, deep shadows, desaturated cold
              tones, fog and mist, flickering dim light, horror film color grading." This mood text is silently
              appended to every keyframe prompt. It is derived from your niche selection in Step 1 and cannot be
              edited directly — to change it, select a different niche.
            </p>
            {img('12-keyframes-grid.jpg', 'Theme Feel panel showing the niche visual mood description and FLF mode explanation')}
          </Step>

          <Step number={3} title="Generate keyframes per scene">
            <p>
              Each scene card shows the scene label, duration, narration excerpt, and frame slots. In FLF mode
              each card has a START FRAME and an END FRAME slot — you generate the start frame first (text-to-image),
              then the end frame. Scene 2 onwards automatically inherits the previous scene's end frame as its
              start frame, maintaining visual continuity across the entire video. In I2V mode there is only one
              frame slot per scene.
            </p>
            <p>
              Frame prompts are synthesised automatically by GPT-4.1-mini — you never write image prompts manually.
              The synthesis combines: (1) the scene's narration text, (2) your selected visual style, and (3) the
              niche's visual mood. The result is a scene-matched, stylistically consistent prompt for every frame.
              Click the Redo button on any frame to regenerate just that scene without affecting others.
            </p>
          </Step>

          <Step number={4} title="Add reference images for character consistency">
            <p>
              Every scene supports an optional reference image for image-to-image generation. Click
              <strong> Add reference image (I2I)</strong> on any scene to anchor that frame to a reference — a character
              portrait, a location shot, or a previous scene's frame. Three sources are available: From Library
              (any image in your media library), From URL (paste a direct image link), and From Previous Frame
              (use the end frame of the previous scene — the most powerful option for visual continuity).
            </p>
            {img('14-reference-image.jpg', 'Scene card showing Add reference image button and Characters/Motion Reference options')}
            <Warning>
              Reference images act as visual anchors, not tracers. The model interprets the reference and generates
              a new image in your chosen style — it does not copy the reference pixel-for-pixel. For character
              consistency across a long video, use a clean turnaround sheet as your reference and select a style
              that matches the turnaround's rendering (e.g. if your turnaround is 3D Animation, select that style).
            </Warning>
          </Step>
        </div>
      </Section>

      {/* ── Step 4 ── */}
      <Section icon={Film} title="Step 4 — Video Clips">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Step 4 turns each keyframe into a video clip. This is the most computationally expensive step and the
            one with the biggest impact on final output quality and cost. Each clip takes 30–90 seconds to generate
            and runs in parallel — all scenes fire simultaneously so a 9-scene video completes in roughly the same
            time as a single scene.
          </p>
          {img('15-clips-panel.jpg', 'Step 4 video clips panel showing scene cards with generation status and cost display')}

          <Step number={1} title="Understand FLF vs I2V mode">
            <p>
              The generation mode is determined by the video model you selected in Step 2. The mode label is shown
              in the workbench header ("First-Last Frame mode" or "Image-to-Video mode").
            </p>
            <p>
              <strong>FLF (First-Last Frame):</strong> The model receives two images — the scene's start frame and
              end frame — and generates a video that transitions smoothly between them. You have precise control
              over how each scene starts and ends. Used by Veo 3.1, Veo 3.1 Lite, Kling V3 Pro, and Kling O3 Pro.
            </p>
            <p>
              <strong>I2V (Image-to-Video):</strong> The model receives one image and animates outward from it.
              After generation, the last frame of each clip is automatically extracted and fed as the first frame
              of the next scene — so visual continuity is maintained without extra work from you. Used by
              Wavespeed WAN, Kling 2.0 Master, Hailuo/MiniMax, Wan 2.5 Preview, and PixVerse.
            </p>
            {img('16-flf-mode.jpg', 'Scene cards showing Generating... status on scene 1 and Waiting states on subsequent scenes')}
            <Tip>
              Start with Wan 2.5 (I2V) for fast affordable testing — it produces solid results at low cost. When
              you are ready to produce a final-quality version, switch to Veo 3.1 Lite (FLF) — it delivers premium
              cinematic quality at about 60% of the cost of full Veo 3.1.
            </Tip>
          </Step>

          <Step number={2} title="Video model comparison">
            <div className="overflow-x-auto my-3">
              <table className="text-sm w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold">Model</th>
                    <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold">Mode</th>
                    <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold">Durations</th>
                    <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold">Audio</th>
                    <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-600 font-semibold">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Veo 3.1', 'FLF', '4s / 6s / 8s', 'Optional', 'Premium cinematic quality'],
                    ['Veo 3.1 Lite', 'FLF', '4s / 6s / 8s', 'No', 'Same quality, 60% cheaper'],
                    ['Kling V3 Pro', 'FLF', '5s / 10s', 'Yes', 'Premium motion control'],
                    ['Kling O3 Pro', 'FLF', '5s / 10s', 'Yes', 'Character reference / R2V'],
                    ['Wan 2.5 Preview', 'I2V', '5s', 'No', 'Fast and affordable'],
                    ['Kling 2.0 Master', 'I2V', '5s / 10s', 'No', 'Smooth natural motion'],
                    ['Hailuo/MiniMax', 'I2V', 'Fixed', 'No', 'Stylised/animated look'],
                    ['PixVerse V6', 'I2V', '5s / 8s', 'Yes (switch)', 'Stylised with native audio'],
                  ].map(([model, mode, dur, audio, best], i) => (
                    <tr key={model} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}>
                      <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 font-medium">{model}</td>
                      <td className="px-3 py-2 border border-gray-200 dark:border-gray-600">{mode}</td>
                      <td className="px-3 py-2 border border-gray-200 dark:border-gray-600">{dur}</td>
                      <td className="px-3 py-2 border border-gray-200 dark:border-gray-600">{audio}</td>
                      <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">{best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Step>

          <Step number={3} title="Camera Control (motion reference)">
            <p>
              Each scene card has a <strong>Camera Control</strong> button. Clicking it opens motion reference options —
              you can supply a reference video and the model will transfer its motion pattern to your keyframe.
              This is useful for repeating a specific camera move (dolly, pan, orbit) or action sequence (a walk
              cycle, a crowd cheer) consistently across multiple scenes in a series. Motion references are
              per-scene and optional.
            </p>
            {img('17-motion-transfer.jpg', 'Scene card with Camera Control button highlighted')}
          </Step>

          <Step number={4} title="Avatar split-screen mode">
            <p>
              Enable <strong>Avatar Mode</strong> in Step 1 to composite a talking-head presenter into one half of the
              frame while your generated visuals play in the other half. The workbench generates lipsync for the
              avatar against your voiceover and composites everything during assembly. Avatar Mode requires a
              portrait-aspect avatar clip in your media library.
            </p>
            {img('18-avatar-mode.jpg', 'Step 1 panel showing Avatar Mode toggle in the niche settings area')}
          </Step>

          <Warning>
            The workbench always forces <code>generate_audio: false</code> for all video clips — the "NO AUDIO IN CLIPS"
            badge at the top of the screen confirms this. The workbench has its own voiceover and music tracks.
            Enabling model audio on clips would create conflicting audio that cannot be cleanly mixed during assembly.
          </Warning>
        </div>
      </Section>

      {/* ── Step 5 ── */}
      <Section icon={Layers} title="Step 5 — Assembly">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Step 5 merges all your clips, voiceover, music, and optional SFX into a single vertical video using
            FFmpeg via the FAL compose API. Captions are burned using the <code>fal-ai/workflow-utilities/auto-subtitle</code> model.
            The assembled video is stored in Supabase and shown as a playable preview in the workbench.
          </p>
          <Placeholder label="Step 5 becomes available once all video clips in Step 4 are complete. The assembly itself takes about 30 seconds." />

          <Step number={1} title="Assembly options">
            <p>
              The assembly panel shows a scene summary (label, actual clip duration) and three options: Music
              (pre-checked if you approved music in Step 2, shown as a percentage volume), Burn Captions (Word Pop
              style — always on), and Strip Model Audio (always on, confirms model audio is removed). Click
              <strong> Assemble Final Video</strong> to fire the FFmpeg job.
            </p>
          </Step>

          <Step number={2} title="Caption style">
            <p>
              The current caption style is <strong>Word Pop</strong> — bold individual words appear one at a time with
              a punchy on-beat animation, timed to the Whisper word timestamps from Step 2. This is the most
              engagement-optimised style for short-form social content. Other caption styles available via the
              Caption API include Karaoke Glow (words glow in sequence), Word Highlight (current word highlighted
              with context), and News Ticker (scrolling lower-third strip).
            </p>
          </Step>

          <Step number={3} title="Quality Review Gate">
            <p>
              After assembly completes, the workbench automatically runs a visual-narration alignment check on
              each scene. GPT-4o-mini vision compares the scene's keyframe image against the narration text
              and flags any scenes where the visuals do not match what is being said. Flagged scenes show a
              mismatch reason and a <strong>Repair Scene</strong> button. Clicking Repair regenerates just that
              one clip using the adjacent scene frames as anchors, then shows a Re-assemble button to rebuild
              the final video from the repaired clips without re-running everything.
            </p>
            <Tip>
              You do not need to re-generate any keyframes to repair a scene. The repair uses Veo 3.1 First-Last-Frame
              mode regardless of your original model choice — it gives the best quality for targeted repairs. After
              repairing one or more scenes, click Re-assemble to update the final video in place.
            </Tip>
          </Step>
        </div>
      </Section>

      {/* ── Topic Research Agent ── */}
      <Section icon={Search} title="Topic Research Agent">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The Topic Research Agent is the engine behind the Research and Generate Ideas buttons in Step 1.
            When you click Research, it runs multiple search queries via SearchAPI, scores every result by
            (1) <strong>trending score</strong> — how fast search interest is growing for that topic, and
            (2) <strong>competition score</strong> — how dense and established the results for that topic already are.
            The combined score gives you a ranked list sorted by opportunity: topics that are rising in interest
            but not yet saturated by competing content.
          </p>
          {img('21-topic-discovery.jpg', 'Topic discovery showing the Batch Queue niche selector and Discover Topics button')}
          <Tip>
            High trending + low competition is the sweet spot. A topic with 85% trending and 30% competition
            will reach far more new viewers than a popular evergreen topic that every creator has already covered.
            The scores are based on live search data refreshed on each query — they reflect real audience interest,
            not editorial opinion.
          </Tip>
        </div>
      </Section>

      {/* ── Batch Queue ── */}
      <Section icon={Zap} title="Batch Production Queue">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The Batch Queue at <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/shorts/batch</code> lets
            you produce multiple Shorts from a curated topic list without stepping through the workbench for each
            one. Phase 1 is topic discovery — select a niche, run Discover Topics to get scored results, and cherry-pick
            the topics you want to produce. Phase 2 is production — configure niche, model, voice, and style settings
            once, then queue all selected topics. Up to 2 production jobs run concurrently; the remaining topics wait.
          </p>
          {img('22-batch-queue.jpg', 'Batch Queue page showing niche selector and Discover Topics button')}
          <p>
            Each queued topic moves through the same 5-step pipeline as the workbench — script, voiceover, timing,
            keyframes, clips, assembly — fully automated. The live progress grid shows each Short's current stage.
            Completed Shorts appear in the Production Queue and can be reviewed, edited, or scheduled for publishing.
          </p>
        </div>
      </Section>

      {/* ── Production Queue / Autopilot ── */}
      <Section icon={Monitor} title="Production Queue &amp; Autopilot">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The Production Queue at <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/queue</code> shows
            all Shorts across every status: Queued, Scripting, Generating, Assembling, Ready, Failed, and Published.
            The status tiles at the top give a live count per stage. You can add individual topics to the queue from
            here using the Add to Queue button, without going through the full workbench.
          </p>
          {img('23-production-queue.jpg', 'Production Queue showing Autopilot Idle status and Start Autopilot button')}
          <p>
            <strong>Autopilot</strong> enables fully automated end-to-end execution. Once topics are in the queue,
            Start Autopilot fires each one through all 5 pipeline stages without any manual intervention and
            publishes the completed video to your connected platforms. Autopilot runs up to 2 concurrent jobs
            and automatically picks up the next queued item when a slot opens.
          </p>
          <Warning>
            Autopilot uses your current default settings (niche, model, voice, visual style) for every job. Review
            and confirm these defaults in the Autopilot Defaults panel before starting. All queued topics will use
            the same configuration — there is no per-topic override in Autopilot mode.
          </Warning>
        </div>
      </Section>

      {/* ── Multi-Platform Repurposing ── */}
      <Section icon={Globe} title="Multi-Platform Repurposing">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Once your Short is assembled and reviewed, you can repurpose it for other platforms directly from the
            draft review page. The repurpose panel adapts your video to each platform's optimal format —
            aspect ratio, caption positioning, and duration constraints. Select the target platforms and the
            repurpose job runs in the background, producing a separate output per platform stored alongside the
            original in your media library.
          </p>
          {img('24-repurpose-panel.jpg', 'Draft review page showing in_progress status')}
          <Tip>
            Repurposing does not re-generate any AI content — it is a fast FFmpeg transform of the existing
            assembled video. A 60-second vertical Short can be repurposed into a 16:9 YouTube version, a 1:1
            LinkedIn square, and a 4:5 Instagram feed clip in under 2 minutes.
          </Tip>
        </div>
      </Section>

      {/* ── Scheduled Publishing ── */}
      <Section icon={Target} title="Scheduled Publishing">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The Publish Queue at <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/publish</code> shows
            all pending and completed publishes across every connected platform — YouTube, Instagram, TikTok, LinkedIn.
            Schedule a Short for publishing by setting a date and time on the draft review page; it will then appear
            in the Publish Queue timeline. The scheduled publisher polls every 60 seconds and fires each job when its
            scheduled time arrives.
          </p>
          {img('25-publish-queue.jpg', 'Publish Queue page showing scheduled and published tabs')}
          <Tip>
            Schedule at least 15 minutes ahead of your intended publish time. The 60-second polling interval means
            the earliest a post can fire is 1 minute after scheduling, but network latency and platform API response
            times can add up — a 15-minute buffer ensures your post goes out on time even if there is a brief delay.
          </Tip>
          <p>
            YouTube uploads are automatically tagged as containing synthetic media (<code>containsSyntheticMedia: true</code>)
            on every upload, in compliance with YouTube's AI disclosure policy. Vertical videos under 60 seconds
            automatically have <code>#Shorts</code> appended to the title so YouTube classifies them correctly in the
            Shorts feed.
          </p>
        </div>
      </Section>

    </div>
  );
}

export default function ShortsWorkbenchGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ShortsWorkbenchGuideContent />
    </div>
  );
}
