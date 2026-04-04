/**
 * StoryboardGuidePage — walkthrough guide for the Storyboard tool.
 *
 * Accessible at /storyboards/guide (public within the app, behind auth).
 * Linked from the Storyboard list page header and the workspace.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Film, Settings, Zap,
  Sparkles, ImageIcon, LayoutGrid, GitBranch, Play, FileDown, Share2,
  Lock, Unlock, Scissors, Trash2, Camera, MessageSquare, Eye, Clock,
  Music, Volume2, Type, GripVertical, Palette, Users, MapPin, Package,
  Cpu, AlertTriangle, CheckCircle2, RotateCcw, RefreshCw,
} from 'lucide-react';

// ── Expandable Section ──

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
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
      <span className="shrink-0">💡</span>
      <div>{children}</div>
    </div>
  );
}

// ── Warning callout ──

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <span className="shrink-0">⚠️</span>
      <div>{children}</div>
    </div>
  );
}

// ── Inline icon badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ── Screenshot image ──

function SS({ file, alt }) {
  return (
    <img
      src={`https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/storyboards/${file}`}
      alt={alt}
      className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4"
    />
  );
}

// ==========================================================================

export function StoryboardGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2C666E] to-[#1a4a52] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Film className="w-8 h-8 text-white/80" />
          <h1 className="text-2xl font-bold">Storyboards</h1>
        </div>
        <p className="text-white/80 text-base leading-relaxed max-w-2xl">
          Plan, preview, and produce complete videos frame by frame — with AI-generated scripts,
          per-scene image generation, and one-click video production. The settings-first workflow
          means you configure your entire vision before the AI writes a single word.
        </p>
        <div className="grid grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Settings className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">1. Configure</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Sparkles className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">2. Script</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <ImageIcon className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">3. Preview</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-white/80" />
            <div className="text-xs font-medium">4. Produce</div>
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      <Section icon={Eye} title="Overview — Storyboards vs Shorts Workbench" defaultOpen={true}>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Stitch has two separate video creation tools. The right choice depends on what you're
            making and how much control you want over the process.
          </p>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 w-1/3"></th>
                  <th className="text-left px-4 py-2 font-semibold text-[#2C666E] dark:text-teal-400">Storyboards</th>
                  <th className="text-left px-4 py-2 font-semibold text-violet-600 dark:text-violet-400">Shorts Workbench</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Primary use</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Long-form, campaign & brand videos</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Short-form social content</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Flow</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Settings → Script → Visuals → Production</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Script → Timing → Keyframes → Clips → Assemble</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Scene control</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Per-frame lock, split, delete, drag reorder</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Per-scene regenerate</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Client sharing</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Public review link + PDF export</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Direct download</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Duration range</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">15s – 5 min+</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">15s – 90s</td>
                </tr>
              </tbody>
            </table>
          </div>

          <SS file="01-storyboards-list.jpg" alt="Storyboards list page showing existing storyboards and the New Storyboard button" />

          <p>
            The Storyboards list shows every storyboard you've created, with status badges (Draft,
            Scripted, Previewed, Ready, Producing, Complete), frame count, duration, and aspect ratio
            at a glance. Click any card to open it directly in the workspace.
          </p>

          <p>
            The key thing to understand about Storyboards is the <strong>settings-first philosophy</strong>.
            Unlike the Shorts Workbench where you start by writing or pasting a topic, Storyboards ask
            you to configure everything first — duration, visual style, video model, brand kit, characters —
            and only then does the AI generate your scenes. This ensures the script is tailored to your
            exact technical constraints from the start, rather than being retrofitted afterward.
          </p>
        </div>
      </Section>

      {/* ── Creating a Storyboard ── */}
      <Section icon={Sparkles} title="Creating a Storyboard">
        <Step number={1} title="Click New Storyboard and enter a name">
          <p>
            Navigate to <strong>/storyboards</strong> and click <strong>New Storyboard</strong>. A name input
            appears inline — type your project name (e.g., "Product Launch Video" or "Brand Story Q2").
            That's genuinely all you need at this stage. No topic, no script, no settings — just a name.
          </p>
          <SS file="02-create-name.jpg" alt="New Storyboard creation input showing the name field with Create button" />
        </Step>

        <Step number={2} title="You land on the Settings tab automatically">
          <p>
            After creation the workspace opens on the <strong>Settings tab</strong>, which is the default
            for any storyboard without scenes. This is intentional — the settings you choose here directly
            shape what the AI generates. Work through each section top to bottom before clicking Generate Script.
          </p>
          <p>
            If you skip Settings and click Generate Script immediately, the AI will use sensible defaults
            (60-second educational video, cinematic style, Wavespeed WAN model) — but you'll often end up
            regenerating when the output doesn't match what you had in mind.
          </p>
        </Step>
      </Section>

      {/* ── Settings Tab ── */}
      <Section icon={Settings} title="Settings Tab — Deep Configuration">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <p>
            Every option in Settings feeds directly into the AI prompts. Changes auto-save — there's no
            Save button. The settings panel is always accessible via the <strong>Settings</strong> tab,
            even after script generation.
          </p>
        </div>

        <SS file="03-settings-tab.jpg" alt="Storyboard settings tab showing all configuration sections collapsed" />

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2 flex items-center gap-2">
          <Film className="w-4 h-4 text-[#2C666E]" /> Story
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>Duration</strong> is the most important story setting because it determines scene count.
            The system calculates scene count as roughly <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">duration ÷ average clip length</code>,
            rounded to a sensible integer. A 60-second storyboard with 4-second clips produces around 15 scenes;
            a 30-second storyboard with 6-second clips produces around 5 scenes. The AI uses this as a hard
            target — it won't write more or fewer scenes than the calculation produces.
          </p>
          <p>
            <strong>Narrative Style</strong> shapes the tone and structure of the script: Educational,
            Story, Dramatic, Documentary, Ad/Promo, Tutorial, or Safety/PSA. Each style gives the AI
            different storytelling priorities — Documentary produces factual voiceover, Ad/Promo writes
            toward a CTA, Dramatic builds tension.
          </p>
          <p>
            <strong>Story Overview</strong> is your creative brief. Be specific about what happens, who's
            involved, and what emotion you want to leave the audience with. The more detail here, the less
            generic the output.
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2 flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#2C666E]" /> Visual Style
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>Style Preset</strong> picks from 123 visual styles with thumbnails — cinematic, anime,
            watercolour, pixel art, neon, claymation, and many more. This is the primary aesthetic driver
            for all your preview images. The selected style's full prompt description is injected into
            every image generation call.
          </p>
          <p>
            <strong>Motion Style</strong> is separate from the visual style — it's a cinematography preset
            (86 options) that describes camera movement and transitions. These are injected into the visual
            director's prompts to give each scene its camera personality.
          </p>
          <p>
            <strong>Anchor Image</strong> is a powerful consistency tool. Upload any reference image and
            every subsequent preview and grid generation will inherit that image's look — same colour palette,
            rendering style, and aesthetic. A "Style Locked" banner appears in the workspace when active.
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#2C666E]" /> Models — The Most Important Setting
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The video model you choose determines the generation mode for every clip in Production.
            Each model works differently and has specific requirements — picking the wrong one for your
            content type is the most common cause of disappointing results.
          </p>
        </div>

        <SS file="04-model-dropdown.jpg" alt="Storyboard model selector showing video model cards with R2V, I2V, and FLF badges" />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Model</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Mode</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Clip Duration</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Audio</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-600 dark:text-gray-400">
              <tr>
                <td className="px-3 py-2 font-medium">Veo 3.1</td>
                <td className="px-3 py-2"><Badge label="FLF" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" /></td>
                <td className="px-3 py-2">4s / 6s / 8s only</td>
                <td className="px-3 py-2">Optional</td>
                <td className="px-3 py-2">Cinematic premium quality, flat reference images</td>
              </tr>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <td className="px-3 py-2 font-medium">Veo 3.1 Lite</td>
                <td className="px-3 py-2"><Badge label="FLF" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" /></td>
                <td className="px-3 py-2">4s / 6s / 8s only</td>
                <td className="px-3 py-2">Forced OFF</td>
                <td className="px-3 py-2">Same quality as Veo 3.1, 60% cheaper</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Kling V3 Pro</td>
                <td className="px-3 py-2"><Badge label="FLF" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" /></td>
                <td className="px-3 py-2">5s / 10s</td>
                <td className="px-3 py-2">Optional</td>
                <td className="px-3 py-2">Premium motion quality</td>
              </tr>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <td className="px-3 py-2 font-medium">Kling O3</td>
                <td className="px-3 py-2"><Badge label="R2V" color="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300" /></td>
                <td className="px-3 py-2">5s / 10s</td>
                <td className="px-3 py-2">Optional</td>
                <td className="px-3 py-2">Character reference / turnaround workflows</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Wan 2.5</td>
                <td className="px-3 py-2"><Badge label="I2V" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" /></td>
                <td className="px-3 py-2">5s</td>
                <td className="px-3 py-2">No</td>
                <td className="px-3 py-2">Fast and affordable</td>
              </tr>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <td className="px-3 py-2 font-medium">Kling 2.0</td>
                <td className="px-3 py-2"><Badge label="I2V" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" /></td>
                <td className="px-3 py-2">5s / 10s</td>
                <td className="px-3 py-2">No</td>
                <td className="px-3 py-2">Smooth natural motion</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Hailuo / MiniMax</td>
                <td className="px-3 py-2"><Badge label="I2V" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" /></td>
                <td className="px-3 py-2">Fixed</td>
                <td className="px-3 py-2">No</td>
                <td className="px-3 py-2">Stylised / animated content</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mt-3 space-y-2">
          <p>
            <strong>FLF (First-Last-Frame)</strong> models generate a video clip by taking the first and last
            keyframe images for a scene and interpolating the motion between them. This gives you explicit
            control over where each scene starts and ends visually.
          </p>
          <p>
            <strong>I2V (Image-to-Video)</strong> models animate forward from a single keyframe image. The
            last frame of each clip is automatically extracted and used as the first frame of the next scene,
            maintaining visual continuity across the whole video.
          </p>
          <p>
            <strong>R2V (Reference-to-Video)</strong> models accept character reference images alongside
            the scene prompt, allowing consistent character appearance across every clip even when the
            character was never in the training data.
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2 flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#2C666E]" /> Camera Control Panel
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            The Camera Control Panel lets you define default camera movements that are applied across all
            scenes. Preset moves include Push In, Pull Back, Pan Left, Pan Right, Tilt Up, Tilt Down,
            Orbit, Crane Up, and Handheld. When a preset is selected, its description is injected into
            the visual director's prompt for every frame — ensuring consistent cinematography throughout
            the storyboard.
          </p>
          <p>
            Individual frames can override the storyboard-level camera setting via the detail panel, so
            you can have a default "slow push in" while a specific climax scene uses "fast orbit".
          </p>
        </div>

        <SS file="05-camera-control.jpg" alt="Settings tab with Scene Direction section expanded showing Camera Control options" />

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#2C666E]" /> Characters, Brand Kit & Ingredient Palette
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            The <strong>Characters</strong> section works differently depending on which video model you
            select. Kling models use an element system where you attach face and body reference images to
            named character IDs. Veo and Grok use flat reference images passed alongside each prompt.
            Either way, the character references are applied consistently at the Production stage when
            video clips are generated.
          </p>
          <p>
            The <strong>Ingredient Palette</strong> is a reference glossary for the AI script generator.
            Define characters (name + visual description), props (important objects), and environments
            (named locations). When these names appear in the narrative, the AI automatically expands them
            with your full descriptions — so you can write "Mia enters The Lab" in your brief and the AI
            knows exactly what both look like.
          </p>
          <Tip>
            Your Brand Kit (logo, colours, tagline) can be linked from your brand settings. When connected,
            the visual director factors in brand colours when describing scene aesthetics.
          </Tip>
        </div>
      </Section>

      {/* ── Storyboard Tab ── */}
      <Section icon={Film} title="Storyboard Tab — Working With Frames">

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Empty State — Generate Script</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            When a storyboard has no frames yet, the Storyboard tab shows an empty state with a
            prominent <strong>Generate Script</strong> button. This is your entry point to the two-stage
            AI pipeline that populates all frames.
          </p>
        </div>

        <SS file="06-storyboard-tab-empty.jpg" alt="Empty storyboard workspace showing Settings tab with Generate Script button visible" />

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-2">
          <p>
            Clicking Generate Script runs two sequential GPT-4.1-mini calls using Zod structured output.
            <strong> Stage 1</strong> (<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">storyboardNarrativeGenerator.js</code>)
            creates the story arc — beats, dialogue, emotions, pacing, and narration text.
            <strong> Stage 2</strong> (<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">storyboardVisualDirector.js</code>)
            takes each narrative beat and translates it into visual prompts, camera angles, and motion
            direction. Frames appear in the grid as Stage 2 completes — you'll see them populate
            progressively, not all at once.
          </p>
          <p>
            Scene count is determined by your duration and frame interval settings:
            a 60-second storyboard with 4-second clips produces approximately 15 scenes. The AI treats
            this as a firm target — it will not pad or compress the story to reach a different number.
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">Frames Grid</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Once script generation completes, all scenes appear as cards in the frames grid. Cards are
            grouped by narrative beat (Hook, Setup, Rising Action, Climax, Resolution, Call to Action)
            with colour-coded headers. Each card shows the frame number, timestamp, a preview image
            (or placeholder if not yet generated), and the opening lines of the scene narrative.
          </p>
        </div>

        <SS file="07-frames-grid.jpg" alt="Storyboard frames grid showing multiple scene cards with preview images and narrative text" />

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-2">
          <p>
            Locked frames show a <Lock className="w-3 h-3 inline" /> lock icon in the corner. Frames with
            completed video clips show a <CheckCircle2 className="w-3 h-3 inline text-emerald-500" /> green tick.
            You can drag unlocked frames to reorder them — timestamps recalculate automatically.
          </p>
          <p>
            Click any frame card to select it and open the detail panel on the right side of the workspace.
            Only one frame can be selected at a time.
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">Frame Detail Panel</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            The detail panel shows everything the AI generated for the selected frame. Every field is
            editable — click the pencil icon next to any field to modify it. Your changes are saved immediately
            and will be used in subsequent image and video generation for that frame.
          </p>
        </div>

        <SS file="08-frame-detail.jpg" alt="Frame detail panel showing narration, dialogue, visual direction and camera fields for a selected frame" />

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-2">
          <p>
            The most important editable fields are <strong>Image Direction</strong> (controls the static
            preview keyframe — what the scene looks like) and <strong>Motion Direction</strong> (controls
            camera movement during the video clip — how the scene moves). These are intentionally separate
            because a compelling still image and a compelling camera move require different prompt language.
            The AI generates both independently.
          </p>
          <p>
            Click the image area of any frame card to regenerate just that one scene's preview image.
            The <strong>Auto / Fresh / Continuity</strong> mode selector controls whether the regeneration
            uses reference images from neighbouring frames for visual consistency.
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-2">Frame Controls — Lock, Split, Delete</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Three per-frame actions appear at the bottom of the detail panel. They give you surgical control
            over the structure of your storyboard without having to regenerate everything from scratch.
          </p>
        </div>

        <SS file="09-frame-controls.jpg" alt="Frame detail panel showing Regen Preview, Split Scene and Delete Scene controls at the bottom" />

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-2">
          <div>
            <strong className="text-gray-900 dark:text-gray-100 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Lock Scene
            </strong>
            <p className="mt-0.5">
              Prevents the frame from being modified, deleted, or regenerated. Locked frames survive a
              full script regeneration — everything else gets rewritten but locked frames stay exactly
              as they are. Use this any time you're happy with a scene and want to protect it while
              iterating on the rest of the storyboard.
            </p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-gray-100 flex items-center gap-1">
              <Scissors className="w-3 h-3" /> Split Scene
            </strong>
            <p className="mt-0.5">
              Halves the current frame's duration and inserts a new blank frame immediately after it.
              The new frame has no script content — you fill it in manually or let the AI suggest content.
              Useful when a scene covers too much ground and needs to be broken into two distinct moments.
            </p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-gray-100 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete Scene
            </strong>
            <p className="mt-0.5">
              Removes the frame permanently. All remaining frames renumber automatically and timestamps
              recalculate to reflect the new total duration. You cannot undo a deletion, so consider
              locking frames you want to keep before doing bulk deletions.
            </p>
          </div>
        </div>

        <Tip>
          The best editing workflow: generate the script, lock any frames you love immediately,
          then regenerate the script once or twice more to improve the unlocked sections. You get
          iteration without losing your best moments.
        </Tip>
      </Section>

      {/* ── Production Tab ── */}
      <Section icon={Zap} title="Production Tab — Generating the Final Video">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <p>
            The Production tab converts your storyboard into a fully assembled video. Click
            <strong> Generate All Clips</strong> to start the pipeline — each frame progresses through
            video generation independently, so you can watch clips arrive in real time rather than
            waiting for the full batch.
          </p>
        </div>

        <SS file="10-production-tab.jpg" alt="Production tab showing frame clip generation status and Generate All button" />

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-2">
          <p>
            <strong>FLF models (Veo 3.1, Veo 3.1 Lite, Kling V3, Kling O3):</strong> For each scene,
            the system uses two keyframe images — the scene's own preview image as the first frame, and
            the next scene's preview image as the last frame. The video model then generates the motion
            that connects them. This requires that every scene already has a preview image before Production
            can run.
          </p>
          <p>
            <strong>I2V models (Wan 2.5, Kling 2.0, Hailuo):</strong> Each scene is animated forward
            from its single keyframe. After generation, the last frame of each clip is automatically
            extracted and used as the first frame of the next scene, creating a chain of visual continuity
            across the whole video without you needing to manage it manually.
          </p>
          <p>
            <strong>Per-scene repair:</strong> If a specific clip fails or you don't like the result,
            click the <strong>Repair</strong> button on that frame. It re-generates just that one clip
            without touching any of the others. After repairing, use <strong>Reassemble</strong> to
            rebuild the final video from all current clips.
          </p>
        </div>

        <Tip>
          Production can take several minutes for a 10–15 scene storyboard. The page auto-polls for
          progress every few seconds — you can leave the tab and return later.
        </Tip>
      </Section>

      {/* ── Export & Share ── */}
      <Section icon={Share2} title="Export & Share">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            The Export PDF and Share buttons live in the top toolbar of the workspace, alongside Animatic,
            Grid, and Previews. Both are available as soon as you have frames — you don't need to wait
            for Production to complete.
          </p>
        </div>

        <SS file="11-export-share.jpg" alt="Storyboard toolbar highlighting the Export PDF and Share review link buttons" />

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4 mt-2">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-[#2C666E]" /> Export PDF
            </h4>
            <p>
              Generates a structured storyboard document with every frame's preview image, narration text,
              dialogue, visual direction, camera angle, and timestamp. The PDF is formatted for print and
              screen — ideal for client review meetings where you want to walk through the story before
              spending budget on video generation. The button is disabled until you have at least some
              preview images generated.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#2C666E]" /> Share Review Link
            </h4>
            <p>
              Creates a public review URL at <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/storyboard/review/:token</code>.
              Anyone with the link can view all frames, preview images, narration, dialogue, camera directions,
              and timing without needing a Stitch account. Send to clients, directors, or collaborators for
              async review. The review page is read-only — viewers can't edit anything.
            </p>
            <Tip>
              Share the link before generating video clips to get client sign-off on the story structure.
              It's much faster and cheaper to iterate on the script than to regenerate video clips.
            </Tip>
          </div>
        </div>
      </Section>

      {/* ── Model Gotchas ── */}
      <Section icon={AlertTriangle} title="Model Gotchas — Read Before Generating">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <p>
            Each video model has quirks that aren't obvious from the UI. These are the most common causes
            of failed or unexpected generation results.
          </p>
        </div>

        <Warning>
          <strong>Veo 3.1 and Veo 3.1 Lite only accept clip durations of 4s, 6s, or 8s.</strong> Any other
          value — including 5s and 7s — causes a 422 error. The system automatically clamps durations to
          the nearest valid value, but if you've manually set frame durations to odd values, check them
          before Production.
        </Warning>

        <Warning>
          <strong>Veo 3.1 Lite forces audio OFF.</strong> It defaults to audio=true if the parameter is
          omitted, which breaks generation with a silent 422 failure. The Storyboards system sends
          audio=false explicitly for all Shorts clips, but if you're seeing unexplained Veo 3.1 Lite
          failures, this is the most likely cause.
        </Warning>

        <Warning>
          <strong>Veo 3.1 R2V cannot handle white-background reference images.</strong> Standard turnaround
          sheets with plain white or blank backgrounds consistently fail with 422 "no_media_generated" after
          a ~90-second timeout. Reference images for Veo 3.1 must have contextual scene backgrounds. In the
          Turnaround wizard, use "Scene Environment" or "Gray Background" mode — not "White Background" —
          when creating references intended for Veo 3.1 R2V workflows.
        </Warning>

        <div className="mt-3 px-4 py-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg text-sm text-teal-800 dark:text-teal-200 flex gap-2">
          <span className="shrink-0">✅</span>
          <div>
            <strong>Grok R2V handles white-background references fine.</strong> If you have white-background
            character art (illustrated, cartoon, or sketch-style), Grok R2V is the correct model choice.
            It accepts up to 7 reference images via the @Image1 syntax and doesn't have Veo's background
            sensitivity.
          </div>
        </div>

        <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 flex gap-2">
          <span className="shrink-0">ℹ️</span>
          <div>
            <strong>Kling O3 is the best choice for character-consistency R2V workflows.</strong> It uses
            the @Element system where you attach face and body reference images to named character IDs.
            These elements are then referenced in the prompt and the model keeps the character visually
            consistent across every clip — even with different backgrounds, costumes, and camera angles.
          </div>
        </div>

        <Tip>
          All Veo 3.1 endpoints use <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">auto_fix: true</code> so
          FAL automatically rewrites prompts that contain copyrighted brand names. If a clip returns 422
          with "no_media_generated", check the visual direction for brand names — Pixar, Disney, DreamWorks,
          and similar names in the prompt are the most common trigger.
        </Tip>
      </Section>

      {/* ── Status Reference ── */}
      <Section icon={CheckCircle2} title="Status Reference">
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          <p className="mb-3">Your storyboard moves through these states as you work:</p>
          <div className="space-y-2">
            {[
              { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', dot: 'bg-gray-400', desc: 'Just created. Configure settings, then generate the script.' },
              { label: 'Scripted', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', desc: 'Script generated. Review frames, then generate preview images.' },
              { label: 'Previewed', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', desc: 'Preview images done. Edit, lock, reorder, export PDF, or share for review.' },
              { label: 'Ready', color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', desc: 'Approved and ready for video production.' },
              { label: 'Producing', color: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', desc: 'Video clip generation in progress. Settings are locked.' },
              { label: 'Complete', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', desc: 'Final video ready. Download or save to library.' },
              { label: 'Failed', color: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300', dot: 'bg-red-500', desc: 'Something went wrong. Check the Production tab for per-scene error details.' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color} min-w-[90px] justify-center shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
                <span className="text-gray-600 dark:text-gray-400 text-sm">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
        Last updated April 2026
      </div>

    </div>
  );
}

// ==========================================================================

export default function StoryboardGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/storyboards')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Storyboard Guide</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Step-by-step walkthrough of every feature</p>
          </div>
        </div>
      </div>

      <StoryboardGuideContent />
    </div>
  );
}
