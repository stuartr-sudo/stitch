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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
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
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ── Tip callout ──

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2">
      <span className="shrink-0">💡</span>
      <div>{children}</div>
    </div>
  );
}

// ── Inline icon badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 text-gray-700' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function StoryboardGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/storyboards')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Storyboard Guide</h1>
            <p className="text-xs text-gray-500">Step-by-step walkthrough of every feature</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Quick overview */}
        <div className="bg-gradient-to-br from-[#2C666E] to-[#1a4a52] rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-2">How Storyboards Work</h2>
          <p className="text-white/80 text-sm leading-relaxed mb-4">
            Storyboards let you plan, preview, and produce entire videos from a single workspace.
            The flow is: <strong>Settings</strong> (configure your vision) → <strong>Generate Script</strong> (AI creates scenes) →
            <strong> Preview</strong> (generate images) → <strong>Review & Edit</strong> → <strong>Production</strong> (generate final video).
          </p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Settings className="w-5 h-5 mx-auto mb-1 text-white/80" />
              <div className="text-xs font-medium">Configure</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Film className="w-5 h-5 mx-auto mb-1 text-white/80" />
              <div className="text-xs font-medium">Storyboard</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Zap className="w-5 h-5 mx-auto mb-1 text-white/80" />
              <div className="text-xs font-medium">Produce</div>
            </div>
          </div>
        </div>

        {/* ── Getting Started ── */}
        <Section icon={Sparkles} title="Getting Started" defaultOpen={true}>
          <Step number={1} title="Create a storyboard">
            <p>Go to <strong>/storyboards</strong> and click <strong>New Storyboard</strong>. Just type a name — that's all you need. Everything else is configured in Settings.</p>
          </Step>
          <Step number={2} title="Configure your settings">
            <p>You'll land on the <strong>Settings tab</strong>. Work through the sections from top to bottom — Story, Visual Style, Models, Characters, and Audio. Every change auto-saves.</p>
          </Step>
          <Step number={3} title="Generate the script">
            <p>Click <strong>Generate Script</strong> at the bottom of Settings (or the <Badge icon={Sparkles} label="Generate Script" color="bg-violet-100 text-violet-700" /> button in the toolbar). The AI runs a two-stage pipeline:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Stage 1 — Narrative:</strong> Creates the story arc, beats, dialogue, emotions, and pacing</li>
              <li><strong>Stage 2 — Visual Director:</strong> Converts each beat into visual prompts, camera angles, and motion directions</li>
            </ul>
            <p className="mt-1">Scenes appear in the Storyboard tab. The AI decides scene count based on your target duration and frame interval.</p>
          </Step>
          <Step number={4} title="Generate preview images">
            <p>Use <strong>Previews</strong>, <strong>Grid</strong>, or <strong>Interpolate</strong> (more on each below) to create preview images for every scene.</p>
          </Step>
          <Step number={5} title="Review, edit, and approve">
            <p>Click any frame to open the detail panel. Edit text, adjust prompts, reorder scenes by drag & drop, lock frames you like, delete or split scenes as needed.</p>
          </Step>
          <Step number={6} title="Produce the final video">
            <p>Switch to the <strong>Production tab</strong> and hit <strong>Start Production</strong>. The system generates voiceover, video clips, lipsync, music, and assembles the final video with captions.</p>
          </Step>
        </Section>

        {/* ── Settings Tab ── */}
        <Section icon={Settings} title="Settings Tab — Configuring Your Storyboard">

          <h3 className="font-semibold text-gray-900 mt-4 mb-2 flex items-center gap-2">
            <Film className="w-4 h-4 text-[#2C666E]" /> Story
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Name</strong> — The storyboard title. Shows on cards and exports.</p>
            <p><strong>Story Overview</strong> — Describe what the video is about. This is the main creative brief the AI works from. Be specific about the story you want told.</p>
            <p><strong>Narrative Style</strong> — How the story is told: Educational (informative), Story (entertaining narrative), Dramatic (high tension), Documentary (factual), Ad/Promo (sales-driven), Tutorial (step-by-step), or Safety/PSA (public service).</p>
            <p><strong>Target Audience</strong> — Who's watching. Affects tone, vocabulary, and pacing.</p>
            <p><strong>Client Brief</strong> — Paste any specific instructions from a client. The AI incorporates these constraints.</p>
            <p><strong>Duration</strong> — Target video length (15s to 90s). Combined with frame interval, determines scene count.</p>
            <p><strong>Frame Interval</strong> — Default duration per scene (2s, 4s, 6s, or 8s). The AI may vary individual scene durations around this.</p>
            <p><strong>Aspect Ratio</strong> — 16:9 (landscape), 9:16 (portrait/Shorts), or 1:1 (square).</p>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#2C666E]" /> Visual Style
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Style Preset</strong> — Pick from 123 visual styles with thumbnail previews. This is the primary look of your video — cinematic, anime, watercolour, pixel art, etc.</p>
            <p><strong>Style Direction</strong> — Additional aesthetic flavour: Minimalist, Illustrative, Photographic, Painterly, Graphic, Vintage, Futuristic, or Organic.</p>
            <p><strong>Lighting</strong> — Golden Hour, Blue Hour, Soft Diffused, Dramatic Side, Backlit, Neon, Candlelight, Overcast, or Studio.</p>
            <p><strong>Color Grade</strong> — Overall colour treatment: Warm, Cool, Neutral, Desaturated, Vibrant, Teal & Orange, Pastel, or Monochrome.</p>
            <p><strong>Motion Style</strong> — 86 cinematography presets that describe camera movement and transitions.</p>

            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4" /> Anchor Image (Style Lock)
              </h4>
              <p className="text-blue-800 text-sm">
                Upload a reference image to <strong>lock the visual style</strong> of the entire storyboard. When set, every preview and grid generation inherits this look — same colour palette, rendering style, and aesthetic. Add a text description of the style for best results. You'll see a "Style Locked" banner when active.
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#2C666E]" /> Models
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Video Model</strong> — The AI model used during Production to generate video clips. Each card shows the model name, mode (R2V = Reference-to-Video, I2V = Image-to-Video, FLF = First-Last-Frame), and whether it supports audio generation.</p>
            <p><strong>Image Model</strong> — The model used for preview image generation. Shows each model's strength and price per image.</p>
            <p><strong>Resolution</strong> — Output resolution: 720p, 1080p, or 4K.</p>
            <Tip>The video model choice affects Characters setup — Kling models use "elements" (face/body refs), Veo/Grok use reference images.</Tip>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2C666E]" /> Characters & Starting Image
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Starting Image</strong> — Upload an image to use as the first frame. If set, frame 1's preview is skipped (uses this image directly).</p>
            <p><strong>Characters</strong> — Model-dependent. Add character names, descriptions, and reference images. The AI maintains character consistency across scenes.</p>
            <p><strong>Character Differentiation Check</strong> — When you have 2+ characters with descriptions, click <Badge icon={Sparkles} label="Check Differentiation" color="bg-violet-100 text-violet-700" />. The AI analyses whether your characters are visually distinct enough (silhouette, colour, features) and gives specific suggestions if they're too similar.</p>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#2C666E]" /> Ingredient Palette
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>A reference glossary for the AI. Define three types of ingredients:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Characters</strong> — Name + detailed visual description (e.g., "Mia — a 10-year-old girl with curly red hair, freckles, wearing a green raincoat")</li>
              <li><strong>Props</strong> — Important objects (e.g., "The Map — a weathered parchment scroll with glowing blue markings")</li>
              <li><strong>Environments</strong> — Named locations (e.g., "The Lab — a cluttered basement workshop with warm amber lighting and bubbling beakers")</li>
            </ul>
            <p>When these names appear in scene narratives, the AI automatically expands them with your full descriptions — so you write "Mia enters The Lab" and the AI knows exactly what both look like.</p>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2C666E]" /> Scene Direction
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Location/Setting</strong> — Describe the primary location. Applied globally across scenes.</p>
            <p><strong>Direction Pills</strong> — Quick-select tags across five categories that get woven into the visual direction:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Environment</strong> — Urban, Nature, Indoor, Studio, Underwater, Space, etc.</li>
              <li><strong>Action</strong> — Walking, Running, Dancing, Talking, Working, etc.</li>
              <li><strong>Expression</strong> — Happy, Sad, Angry, Determined, Fearful, Confident, etc.</li>
              <li><strong>Lighting</strong> — Golden Hour, Neon, Moonlight, Backlit, etc.</li>
              <li><strong>Camera</strong> — Slow Pan, Tracking Shot, Dolly In, Orbit, Crane, Handheld, Aerial, etc.</li>
            </ul>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#2C666E]" /> Audio & Captions
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>TTS Model</strong> — The text-to-speech engine for voiceover: ElevenLabs v3, Multilingual v2, Kokoro, or MiniMax HD.</p>
            <p><strong>Voice</strong> — Choose from 10 voices (Rachel, Aria, Sarah, Charlotte, Roger, Charlie, George, Liam, Daniel, Bill).</p>
            <p><strong>Speech Speed</strong> — Slider from 0.7x (slow) to 1.2x (fast).</p>
            <p><strong>Lipsync</strong> — Sync character mouths to voiceover. Options: None, Kling LipSync, Sync 2.0, LatentSync. Pick the content type (cartoon/realistic/3D/anime) that matches your visual style.</p>
            <p><strong>Music Mood</strong> — Describe the background music you want (e.g., "Cheerful playful children's music"). Always generates instrumental.</p>
            <p><strong>Music Volume</strong> — 0% to 50%. Controls how prominent the background music is vs voiceover.</p>
            <p><strong>Caption Style</strong> — Word Pop, Karaoke Glow, Word Highlight, News Ticker, or none.</p>
          </div>
        </Section>

        {/* ── Storyboard Tab ── */}
        <Section icon={Film} title="Storyboard Tab — Working With Scenes">

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">The Timeline</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>The coloured strip across the top shows every frame mapped to its narrative beat. Colours indicate story arc position:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge label="Hook" color="bg-red-100 text-red-700" />
              <Badge label="Setup" color="bg-orange-100 text-orange-700" />
              <Badge label="Rising Action" color="bg-yellow-100 text-yellow-700" />
              <Badge label="Climax" color="bg-red-100 text-red-800" />
              <Badge label="Resolution" color="bg-blue-100 text-blue-700" />
              <Badge label="Call to Action" color="bg-purple-100 text-purple-700" />
            </div>
            <p className="mt-1">Click any segment to jump to that frame.</p>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2">Frame Cards</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Frames are displayed in a grid, grouped by narrative beat (e.g., "SETUP — 3 frames, 12s"). Each card shows:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Preview image thumbnail (or placeholder if not yet generated)</li>
              <li>Frame number (colour-coded to its beat)</li>
              <li>Timestamp</li>
              <li><Lock className="w-3 h-3 inline" /> Lock icon if the frame is locked</li>
              <li><CheckCircle2 className="w-3 h-3 inline text-emerald-500" /> Green tick if video has been generated</li>
              <li>Narrative note and dialogue preview text</li>
            </ul>
            <p>Click a frame card to select it and open the detail panel on the right.</p>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-[#2C666E]" /> Drag & Drop Reordering
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Drag any unlocked frame to reorder your scenes. Frame numbers and timestamps automatically recalculate. A blue ring shows the drop target.</p>
            <Tip>Drag & drop is disabled during production and for locked frames.</Tip>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2">Detail Panel (Right Sidebar)</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>When you select a frame, the detail panel shows everything about that scene. Click the pencil icon on any field to edit it:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Story</strong> — The narrative moment / scene description</li>
              <li><strong>Setting</strong> — Location details</li>
              <li><strong>Dialogue</strong> — Character speech (shown in quotes)</li>
              <li><strong>Action</strong> — What's physically happening</li>
              <li><strong>Emotion</strong> — The emotional tone of the scene</li>
              <li><strong>Camera Angle</strong> — Auto-suggested by the cinematography framework (e.g., "Low Angle", "Close-Up"). Shown as a badge.</li>
              <li><strong>Image Direction</strong> — Controls what the preview image looks like. Edit this to change the static keyframe.</li>
              <li><strong>Motion Direction</strong> — Controls camera movement during video (pan, zoom, etc.). Separate from the image prompt.</li>
              <li><strong>Visual Prompt</strong> — The full AI-generated prompt (collapsible, read-only reference)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h4 className="font-semibold text-teal-900 text-sm mb-1">Generation Mode (per scene)</h4>
            <p className="text-teal-800 text-sm">Three options that control how each scene's preview is generated:</p>
            <ul className="list-disc pl-5 space-y-1 text-teal-800 text-sm mt-1">
              <li><strong>Auto</strong> — System decides whether to use references (default)</li>
              <li><strong>Fresh</strong> — Generates with no reference images, prompt only. Good for establishing shots or scenes that need a completely different look.</li>
              <li><strong>Continuity</strong> — References the previous scene's style. Good for maintaining visual flow across a sequence.</li>
            </ul>
          </div>

          <h3 className="font-semibold text-gray-900 mt-6 mb-2">Scene Actions</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>At the bottom of the detail panel:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Lock / Unlock</strong> — Lock a frame to prevent edits, deletion, or regeneration. Locked frames survive script regeneration.</li>
              <li><Badge icon={RefreshCw} label="Regen Preview" color="bg-gray-100 text-gray-700" /> — Regenerate just this one scene's preview image</li>
              <li><Badge icon={Scissors} label="Split Scene" color="bg-gray-100 text-gray-700" /> — Splits the frame into two, halving the duration. The new scene gets blank content for you to fill in.</li>
              <li><Badge icon={Trash2} label="Delete Scene" color="bg-red-50 text-red-700" /> — Removes the frame. Remaining scenes renumber automatically.</li>
            </ul>
            <Tip>All scene actions are disabled when the frame is locked or production is running.</Tip>
          </div>
        </Section>

        {/* ── Image Generation ── */}
        <Section icon={ImageIcon} title="Generating Preview Images">
          <div className="text-sm text-gray-600 space-y-2">
            <p>There are three ways to generate preview images. Each has different strengths:</p>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-blue-500" /> Previews (Individual)
              </h4>
              <p className="text-sm text-gray-600">Generates each scene's image independently using the image model. Each frame gets its own AI call with the scene's specific prompt. Good when you want maximum control per scene.</p>
              <p className="text-sm text-gray-500 mt-1">Button shows progress: <strong>Previews (3/8)</strong></p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <LayoutGrid className="w-4 h-4 text-emerald-500" /> Grid (One-Shot)
              </h4>
              <p className="text-sm text-gray-600">
                Generates <strong>all scenes in a single image</strong> as a grid (e.g., 3x2 for 6 scenes). Because all cells share the same AI generation call, they naturally have consistent style, lighting, and colour palette — the AI's self-attention spans the entire grid. The composite image is then automatically sliced into individual frames.
              </p>
              <Tip>Grid is the best choice when visual consistency across scenes matters most. One API call instead of many — faster and cheaper too.</Tip>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <GitBranch className="w-4 h-4 text-purple-500" /> Interpolate (Bookend)
              </h4>
              <p className="text-sm text-gray-600">
                Generate the <strong>first and last frames</strong> individually (or use existing ones you like), then click Interpolate to fill in the middle. The AI generates a grid constrained to match your bookend images, creating a smooth visual transition from start to end.
              </p>
              <p className="text-sm text-gray-500 mt-1">Only appears when you have 3+ frames and both the first and last frames have preview images.</p>
              <Tip>Great workflow: Generate individual previews → regenerate until you love frames 1 and N → Interpolate to fill the middle with consistent bridging scenes.</Tip>
            </div>
          </div>
        </Section>

        {/* ── Animatic ── */}
        <Section icon={Play} title="Animatic Preview">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Click <Badge icon={Play} label="Animatic" color="bg-gray-100 text-gray-700" /> in the toolbar (appears once you have preview images) to open a <strong>fullscreen timed slideshow</strong> of your storyboard.</p>
            <p>Each frame displays for its actual duration (matching your scene timing) with smooth crossfade transitions. Overlays show:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Beat type label (top) — e.g., "CLIMAX"</li>
              <li>Dialogue text (bottom, italic) — if the scene has dialogue</li>
              <li>Narrative note (small text below)</li>
            </ul>

            <h4 className="font-semibold text-gray-900 mt-3 mb-1">Controls</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Space</strong> — Play / Pause</li>
              <li><strong>Left / Right arrows</strong> — Previous / Next frame</li>
              <li><strong>Escape</strong> — Close</li>
              <li><strong>Scrub bar</strong> — Proportional segments (wider = longer scene). Click to jump.</li>
              <li><strong>Click left/right edges</strong> — Navigate frames</li>
            </ul>
            <Tip>The animatic is the fastest way to check pacing and flow before production. If a scene feels too long, go back and adjust its duration or split it.</Tip>
          </div>
        </Section>

        {/* ── Camera Cinematography ── */}
        <Section icon={Camera} title="Camera Angle Suggestions">
          <div className="text-sm text-gray-600 space-y-2">
            <p>The AI automatically maps each scene's narrative beat and emotional tone to cinematographic camera angles and framing, following established film grammar:</p>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 text-xs mb-1">Camera Angles</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li><strong>Low Angle</strong> — power, heroism</li>
                  <li><strong>High Angle</strong> — vulnerability</li>
                  <li><strong>Eye Level</strong> — intimacy, equality</li>
                  <li><strong>Dutch Angle</strong> — tension, unease</li>
                  <li><strong>Bird's Eye</strong> — scale, isolation</li>
                  <li><strong>Over the Shoulder</strong> — perspective</li>
                  <li><strong>Worm's Eye</strong> — monumentality</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 text-xs mb-1">Framing Types</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li><strong>Extreme Wide</strong> — establish, hook</li>
                  <li><strong>Wide Shot</strong> — context, setup</li>
                  <li><strong>Medium Shot</strong> — action, dialogue</li>
                  <li><strong>Close-Up</strong> — emotion, climax</li>
                  <li><strong>Extreme Close-Up</strong> — proof, detail</li>
                  <li><strong>Profile Shot</strong> — reflection</li>
                  <li><strong>Two Shot</strong> — relationship</li>
                </ul>
              </div>
            </div>

            <p className="mt-2">These appear as a <Badge icon={Camera} label="Low Angle" color="bg-blue-50 text-blue-700" /> badge in the detail panel. The AI uses them as guidance when generating visual prompts but can override them when the scene calls for something different.</p>
          </div>
        </Section>

        {/* ── Export & Sharing ── */}
        <Section icon={Share2} title="Export & Sharing">
          <div className="text-sm text-gray-600 space-y-2">
            <h4 className="font-semibold text-gray-900 mt-2 mb-1 flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Export PDF
            </h4>
            <p>Click the PDF button in the toolbar to generate a printable storyboard document. Each frame shows its preview image, narrative, dialogue, camera direction, and timing. Great for client review meetings.</p>
            <p className="text-gray-500">Requires preview images — disabled until you've generated them.</p>

            <h4 className="font-semibold text-gray-900 mt-4 mb-1 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share Link
            </h4>
            <p>Click Share to generate a <strong>public review link</strong>. Anyone with the link can view the storyboard (scenes, images, timing, dialogue) without logging in. A banner shows the URL with a copy button.</p>
            <p className="text-gray-500">Useful for sending to clients or collaborators who don't have accounts.</p>
          </div>
        </Section>

        {/* ── Production ── */}
        <Section icon={Zap} title="Production Tab — Generating the Final Video">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Production converts your storyboard into a final assembled video. It runs through six steps automatically:</p>

            <div className="mt-3 space-y-2">
              {[
                { num: 1, label: 'TTS', desc: 'Generates voiceover audio for each scene\'s dialogue/narrative using your chosen voice and TTS model.' },
                { num: 2, label: 'Video', desc: 'Generates video clips for each scene using the video model, driven by the preview image and motion prompt.' },
                { num: 3, label: 'Lipsync', desc: 'If enabled, syncs character mouth movements to the voiceover audio.' },
                { num: 4, label: 'Music', desc: 'Generates instrumental background music matching your mood description.' },
                { num: 5, label: 'Assembly', desc: 'Stitches all clips together with voiceover and music via FFmpeg.' },
                { num: 6, label: 'Captions', desc: 'Burns subtitle captions onto the assembled video in your chosen style.' },
              ].map(s => (
                <div key={s.num} className="flex gap-3 items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">{s.num}</div>
                  <div>
                    <span className="font-medium text-gray-900">{s.label}</span>
                    <span className="text-gray-500"> — {s.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3">Each frame gets individual status icons as it progresses. When complete, the Production tab shows a video player with Download and Save to Library buttons.</p>
            <Tip>Production can take several minutes depending on scene count and video model. The page auto-polls for progress — you can leave and come back.</Tip>
          </div>
        </Section>

        {/* ── Tips & Tricks ── */}
        <Section icon={AlertTriangle} title="Tips & Common Questions">
          <div className="text-sm text-gray-600 space-y-4 mt-3">

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">How do I get consistent character looks across scenes?</h4>
              <p>Three strategies, from easiest to most effective:</p>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Use the <strong>Ingredient Palette</strong> with detailed character descriptions</li>
                <li>Upload an <strong>Anchor Image</strong> that shows your desired style</li>
                <li>Use <strong>Grid generation</strong> — all scenes share the same AI call, so characters are naturally consistent</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Can I regenerate just one scene?</h4>
              <p>Yes — select the frame, click <strong>Regen Preview</strong> in the detail panel. Only that scene's image is regenerated.</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What happens when I regenerate the script?</h4>
              <p><strong>Locked frames are preserved.</strong> Unlocked frames get new narrative, dialogue, and visual prompts. Lock any scenes you're happy with before regenerating.</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What's the difference between Image Direction and Motion Direction?</h4>
              <p><strong>Image Direction</strong> controls the static preview image — what the keyframe looks like. <strong>Motion Direction</strong> controls camera movement during the video clip (pan, zoom, orbit, etc.). They're separate because a great still image needs different prompt language than great camera motion.</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">When should I use Grid vs Previews vs Interpolate?</h4>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Grid</strong> — When you want all scenes to look cohesive (same style, lighting, palette). Best first pass.</li>
                <li><strong>Previews</strong> — When you want individual control. Good for regenerating specific scenes.</li>
                <li><strong>Interpolate</strong> — When you've perfected your opening and closing shots and want the middle to flow between them.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Can I reorder scenes after generation?</h4>
              <p>Yes — just drag and drop. Frame numbers and timestamps automatically recalculate. You can also split long scenes or delete unnecessary ones.</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">How do I share the storyboard with a client?</h4>
              <p>Two options: <strong>Export PDF</strong> for a printable document, or <strong>Share</strong> for a live web link anyone can view without an account.</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">What does the "Fresh" generation mode do?</h4>
              <p>It tells the image generator to ignore all references and generate purely from the text prompt. Useful for establishing shots, dream sequences, or any scene that should look deliberately different from its neighbours.</p>
            </div>

          </div>
        </Section>

        {/* ── Status reference ── */}
        <Section icon={Eye} title="Status Reference">
          <div className="text-sm text-gray-600 mt-3">
            <p className="mb-3">Your storyboard moves through these states:</p>
            <div className="space-y-2">
              {[
                { label: 'Draft', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', desc: 'Just created. Configure settings and generate the script.' },
                { label: 'Scripted', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', desc: 'Script generated. Review frames, then generate preview images.' },
                { label: 'Previewed', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', desc: 'Preview images done. Edit, lock, reorder, export PDF, share for review.' },
                { label: 'Ready', color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500', desc: 'Approved and ready for video production.' },
                { label: 'Producing', color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', desc: 'Video generation in progress. Settings are locked.' },
                { label: 'Complete', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', desc: 'Final video ready. Download or save to library.' },
                { label: 'Failed', color: 'bg-red-50 text-red-700', dot: 'bg-red-500', desc: 'Something went wrong. Check errors and retry.' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color} min-w-[90px] justify-center`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-gray-600 text-sm">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          Last updated April 2026
        </div>

      </div>
    </div>
  );
}
