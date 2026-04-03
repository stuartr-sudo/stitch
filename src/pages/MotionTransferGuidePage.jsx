/**
 * MotionTransferGuidePage — comprehensive help guide for Motion Transfer / Motion Control.
 *
 * Covers: What Motion Transfer is, the two supported models (WAN 2.2 + Kling V3 Pro),
 * video trimming, how it works in each tool surface (VideoAdvertCreator, Shorts Workbench,
 * Storyboard), common use cases, troubleshooting, and cost/limitations.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Film, Wand2, Scissors, AlertTriangle,
  Lightbulb, Play, Image as ImageIcon, Video, Volume2, VolumeX,
  Layers, Zap, ArrowRight, Settings, RotateCcw, Clock,
  CheckCircle2, XCircle, DollarSign, Monitor, Smartphone,
} from 'lucide-react';

// ── Reusable UI Components ──────────────────────────────────────────────────

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

function ModelCard({ name, badge, description, features, limitations, cost }) {
  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-bold text-gray-900 dark:text-gray-100">{name}</h4>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge === 'Budget' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'}`}>
          {badge}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Features</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Limitations</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {limitations.map((l, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
          {cost && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <DollarSign className="w-3 h-3" />
              <span>{cost}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExampleCard({ title, scenario, steps, result }) {
  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3">{scenario}</p>
      <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div className="mt-3 px-3 py-2 bg-[#2C666E]/5 border border-[#2C666E]/15 rounded-lg text-sm text-[#07393C]">
        <strong>Result:</strong> {result}
      </div>
    </div>
  );
}

// ── Main Guide Content ─────────────────────────────────────────────────────

export function MotionTransferGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-full mb-4">
          <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Motion Transfer Guide</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">Motion Transfer & Motion Control</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Transfer motion from any reference video onto a still character image. Your character performs
          the exact movements from the reference — dance moves, gestures, actions — while keeping your
          own visual style, branding, and character design.
        </p>
      </div>

      {/* ── What is Motion Transfer ────────────────────────────────── */}
      <Section icon={Wand2} title="What is Motion Transfer?" defaultOpen>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Motion Transfer (also called Motion Control) is an AI technique that extracts movement patterns
            from a reference video and applies them to a still image. The result is a new video where your
            character performs the same motion as the reference, but rendered in your own art style.
          </p>
          <p>
            <strong>Think of it as:</strong> You have a dancing video from TikTok and a character illustration.
            Motion Transfer makes your illustration perform that exact dance — same timing, same movements,
            same gestures — but looking like your character, not the original dancer.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <ImageIcon className="w-8 h-8 text-[#2C666E] mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Character Image</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Your still image (the subject)</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
              <ArrowRight className="w-6 h-6 text-purple-500 mb-1" />
              <p className="text-[10px] text-gray-400 dark:text-gray-500">+ Motion Video</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/40 rounded-xl border border-purple-200 dark:border-purple-800">
              <Play className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Output Video</p>
              <p className="text-[10px] text-purple-400 mt-1">Your character performing the motion</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-5">Key concepts</h4>
          <ul className="space-y-2">
            <li><strong>Character Image</strong> — A still image of your subject (photo, illustration, 3D render). This is what the AI renders in the output.</li>
            <li><strong>Motion Reference Video</strong> — Any video containing the movement you want to copy. The AI extracts the motion skeleton and applies it to your character.</li>
            <li><strong>Character Orientation</strong> — Controls whether the AI keeps your character's original pose (Match Image) or adjusts it to match the reference video's body orientation (Match Video).</li>
            <li><strong>Video Trimming</strong> — You can select a specific segment of the reference video to use. Useful for isolating the exact movement you want from a longer clip.</li>
          </ul>
        </div>
      </Section>

      {/* ── Two Models ───────────────────────────────────────────── */}
      <Section icon={Layers} title="Available Models">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <p>Two motion transfer models are available, each with different strengths:</p>

          <ModelCard
            name="WAN 2.2 Motion Transfer"
            badge="Budget"
            description="Good for simple, clean animations. Best with straightforward movements like walking, waving, or basic gestures. Lower cost makes it ideal for experimentation and iteration."
            features={[
              'Simple, clean motion extraction',
              'Supports text prompt for scene description',
              'Supports negative prompt (e.g., "blurry, low quality")',
              'Lower cost per generation',
              'Good for cartoon/illustration styles',
            ]}
            limitations={[
              'No character orientation control',
              'No facial binding / element system',
              'No audio preservation option',
              'Maximum duration limited by model (~6s typical)',
              'Can struggle with complex multi-person scenes',
            ]}
            cost="~$0.02-0.04 per generation"
          />

          <ModelCard
            name="Kling V3 Pro Motion Control"
            badge="Premium"
            description="Advanced motion control with orientation matching, facial binding, and optional audio preservation. Best for complex, high-quality productions where precision matters."
            features={[
              'Character Orientation control (Match Image / Match Video)',
              '"Match Image" mode: max 10s — character keeps its original pose',
              '"Match Video" mode: max 30s — character follows reference orientation',
              'Keep Original Sound toggle — preserves reference audio',
              'Facial binding via @Element system (advanced)',
              'Text prompt for additional scene direction',
              'Higher fidelity output quality',
            ]}
            limitations={[
              'Higher cost per generation',
              '10s max duration in "Match Image" mode',
              '30s max duration in "Match Video" mode',
              'Longer processing time (~60-120s)',
            ]}
            cost="~$0.06-0.08 per generation"
          />

          <InfoBox>
            <strong>Which model should I use?</strong> Start with <strong>Kling V3 Pro</strong> (the default) for best quality.
            Switch to <strong>WAN 2.2</strong> when you need lower cost for batch work, or when working with
            simple animations where the extra quality isn't needed.
          </InfoBox>
        </div>
      </Section>

      {/* ── Character Orientation ────────────────────────────────── */}
      <Section icon={RotateCcw} title="Character Orientation (Kling V3 Pro only)">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Character Orientation is a Kling V3 Pro exclusive feature that controls how your character's body
            is positioned relative to the reference video's movement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Match Image (Default)
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                The character keeps its original pose from the still image. Motion is applied on top — like puppeting your character.
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>Max duration: <strong>10 seconds</strong></li>
                <li>Best for: front-facing characters, consistent branding</li>
                <li>Example: Character illustration faces camera, dances in place</li>
              </ul>
            </div>
            <div className="p-4 border border-green-200 dark:border-green-800 rounded-xl bg-green-50 dark:bg-green-950/40">
              <h4 className="font-bold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" /> Match Video
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                The character adjusts its body to match the reference video's orientation. More natural for complex movements.
              </p>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <li>Max duration: <strong>30 seconds</strong></li>
                <li>Best for: full-body actions, turns, complex choreography</li>
                <li>Example: Character turns, walks away, does a full dance routine</li>
              </ul>
            </div>
          </div>

          <Tip>
            Use <strong>Match Image</strong> when your character illustration has a specific pose or brand look you want to preserve.
            Use <strong>Match Video</strong> when the reference video involves turning, walking, or orientation changes that wouldn't
            work with a fixed pose.
          </Tip>
        </div>
      </Section>

      {/* ── Video Trimming ───────────────────────────────────────── */}
      <Section icon={Scissors} title="Video Trimming">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The built-in video trimmer lets you select a specific segment of your reference video.
            This is essential when working with longer clips where you only want a particular movement.
          </p>

          <Step number="1" title="Paste or browse for a video">
            <p>Enter a video URL or pick one from your library. The video preview loads automatically.</p>
          </Step>

          <Step number="2" title="Set start and end points">
            <p>
              Use the dual-handle range slider below the video preview. Drag the left handle to set the start time
              and the right handle to set the end time. The video seeks as you drag, so you can visually confirm
              the exact frames.
            </p>
          </Step>

          <Step number="3" title="Click Trim">
            <p>
              The server extracts the selected segment using FFmpeg (lossless copy — no re-encoding). The trimmed
              clip is uploaded to your storage and the trimmed URL is used for generation.
            </p>
          </Step>

          <InfoBox>
            <strong>Duration limits:</strong> Maximum trim duration is 60 seconds. Minimum gap between start and
            end handles is 0.5 seconds. For Kling V3 Pro, respect the orientation-specific limits: 10s for Match Image,
            30s for Match Video. The UI shows a warning if your trimmed segment exceeds the model's limit.
          </InfoBox>

          <Warning>
            If you change the video URL, the trimmer resets. Your previous trim is cleared and you'll need to
            re-trim the new video.
          </Warning>
        </div>
      </Section>

      {/* ── Keep Original Sound ──────────────────────────────────── */}
      <Section icon={Volume2} title="Keep Original Sound">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            When using Kling V3 Pro, you can optionally preserve the audio from the reference video in the output.
            This is useful when the reference video has music, dialogue, or sound effects you want to keep.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-[#2C666E]" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sound ON</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">The output video includes the reference video's original audio track. Great for music videos, dance clips, or dialogue scenes.</p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <VolumeX className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sound OFF</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">The output video is silent. You'll add your own voiceover, music, or sound effects later. This is the default for Shorts Workbench.</p>
            </div>
          </div>

          <Warning>
            In <strong>Shorts Workbench</strong>, Keep Original Sound is always forced OFF regardless of your toggle setting.
            The Shorts pipeline has its own voiceover + music system — the reference audio would conflict with it.
          </Warning>

          <Tip>
            In <strong>Storyboard</strong> and the standalone <strong>Motion Transfer modal</strong>, you control the audio toggle
            per-frame/per-generation. Set it based on whether you plan to add your own audio track later.
          </Tip>
        </div>
      </Section>

      {/* ── Where to Use It ──────────────────────────────────────── */}
      <Section icon={Monitor} title="Where to Use Motion Transfer">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">
          <p>Motion Transfer is available in three places, each with slightly different behavior:</p>

          {/* VideoAdvertCreator */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#2C666E]" /> Video Ad Creator — Motion Transfer Modal
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              The standalone Motion Transfer tool. Open it from the Video Ad Creator page. This is the simplest
              way to generate a single motion transfer video.
            </p>
            <Step number="1" title="Open the modal">
              <p>Click the Motion Transfer button in the Video Ad Creator toolbar.</p>
            </Step>
            <Step number="2" title="Add a character image (left panel)">
              <p>Paste an image URL or browse your library. This is the still image the AI will animate.</p>
            </Step>
            <Step number="3" title="Configure the motion reference (right panel)">
              <p>
                Paste a video URL or browse your library. Optionally trim the video to select a specific segment.
                Choose your model (WAN 2.2 or Kling V3 Pro), set orientation (for Kling), and toggle audio.
              </p>
            </Step>
            <Step number="4" title="Generate">
              <p>
                Click "Generate Motion". The server processes the request (30-120 seconds depending on model and
                duration). The result is delivered back to the Video Ad Creator as a video clip.
              </p>
            </Step>
            <InfoBox>
              The modal uses server-side polling — you don't need to wait on the page. The generation happens
              entirely on the backend and returns the final video URL when complete.
            </InfoBox>
          </div>

          {/* Shorts Workbench */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#2C666E]" /> Shorts Workbench — Per-Scene Motion Reference
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              In the Shorts Workbench, Motion Transfer is an optional override per scene. Any scene can use MT
              instead of the global FLF/I2V video generation mode.
            </p>
            <Step number="1" title="Generate your keyframe images (Step 3)">
              <p>First, generate the keyframe image for the scene as normal. This image becomes the character input for MT.</p>
            </Step>
            <Step number="2" title='Click "Add Motion Reference" on a scene card'>
              <p>
                At the bottom of each scene card in Step 3, there's an "Add Motion Reference" button. Click it to
                expand the MotionReferenceInput panel for that scene.
              </p>
            </Step>
            <Step number="3" title="Configure the reference">
              <p>
                Paste a motion video URL, optionally trim it, select the model and orientation. The scene card
                shows a purple "MT" badge when a motion reference is set.
              </p>
            </Step>
            <Step number="4" title="Generate clips (Step 4)">
              <p>
                When you generate clips, scenes with motion references automatically use MT mode instead of the
                global FLF or I2V mode. MT scenes generate sequentially (like I2V), with last-frame extraction
                for chaining to the next scene.
              </p>
            </Step>

            <Warning>
              <strong>Keep Original Sound is always OFF</strong> for Shorts clips. The Shorts pipeline adds its
              own voiceover, music, and sound effects during assembly (Step 5). Reference audio would conflict.
            </Warning>

            <Tip>
              <strong>Mixed modes work seamlessly.</strong> Scene 1 can be FLF, Scene 2 can be MT, Scene 3 can be I2V.
              Frame chaining works across all modes — the last frame of each scene feeds into the next scene's generation.
            </Tip>

            <Tip>
              Motion references are saved with your draft. If you save and reload a workbench draft, all per-scene
              motion references are preserved.
            </Tip>
          </div>

          {/* Storyboard */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2C666E]" /> Storyboard — Per-Frame Motion Reference
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              In the Storyboard tool, Motion Transfer is a per-frame override. Any frame can use MT instead
              of the storyboard's global video model.
            </p>
            <Step number="1" title="Select a frame in the storyboard grid">
              <p>Click any frame to open its detail panel on the right side.</p>
            </Step>
            <Step number="2" title='Click "Add Motion Reference" in the detail panel'>
              <p>
                Below the Motion Direction field, click the "Add Motion Reference" button. The MotionReferenceInput
                panel expands inline.
              </p>
            </Step>
            <Step number="3" title="Configure and save">
              <p>
                Set up the video reference, model, and options. Changes save automatically (debounced) to the
                database. The frame's grid thumbnail shows a purple "MT" badge.
              </p>
            </Step>
            <Step number="4" title="Start production">
              <p>
                When you start production, frames with motion references automatically use MT mode. The MT override
                takes priority over the storyboard's global model — no need to change settings.
              </p>
            </Step>

            <InfoBox>
              Unlike Shorts, <strong>you control the audio toggle</strong> in Storyboard. If your reference video
              has music or dialogue you want to keep, turn on "Keep Original Sound" for that frame.
            </InfoBox>

            <Tip>
              The preview image (generated in the Storyboard tab) becomes the character input for MT. Make sure
              you've generated a preview image for the frame before starting production with MT.
            </Tip>
          </div>
        </div>
      </Section>

      {/* ── Common Use Cases ─────────────────────────────────────── */}
      <Section icon={Zap} title="Common Use Cases & Examples">
        <ExampleCard
          title="Brand Mascot Dancing to a Trend"
          scenario="You have a brand mascot illustration and want it to perform a trending TikTok dance."
          steps={[
            'Open Shorts Workbench, create a script about your brand',
            'In Step 3 (Keyframes), generate your mascot as the keyframe image',
            'Click "Add Motion Reference" on the dance scene',
            'Paste the TikTok dance video URL and trim to the 5-second dance segment',
            'Select Kling V3 Pro with "Match Video" orientation (for full-body movement)',
            'Generate the clip in Step 4 — your mascot now performs the dance',
          ]}
          result="Your brand mascot performs the exact TikTok dance in your art style. The Shorts pipeline adds your voiceover and music on top."
        />

        <ExampleCard
          title="Product Demo with Hand Gestures"
          scenario="You have a product photo and want to show someone interacting with it using specific hand movements from a reference."
          steps={[
            'Open the Motion Transfer modal in Video Ad Creator',
            'Set the product/scene image as the character image',
            'Paste a hand-gesture reference video and trim to the interaction moment',
            'Use WAN 2.2 (good for simple gestures, lower cost)',
            'Add a prompt: "Person demonstrating product features, studio lighting"',
            'Generate — the product scene now has natural hand interaction',
          ]}
          result="A polished product demo video with natural hand movements, rendered in your product photography style."
        />

        <ExampleCard
          title="Animated Storyboard with Mixed Techniques"
          scenario="You're producing a 60-second branded video. Some scenes need specific choreography, others are standard B-roll."
          steps={[
            'Create a Storyboard with your scenes and settings',
            'Generate preview images for all frames',
            'For Scene 3 (the dance scene), add a Motion Reference with the choreography video',
            'For Scene 7 (the action scene), add a different Motion Reference with the action clip',
            'Leave all other scenes as standard I2V or FLF',
            'Start production — MT scenes use your references, others use the global model',
          ]}
          result="A production with mixed generation strategies. Dance and action scenes match your exact references, while other scenes use standard AI video generation."
        />

        <ExampleCard
          title="Content Mimicry with Brand Style"
          scenario="A competitor posted a great explainer video. You want to create similar content with your own brand style and characters."
          steps={[
            'Download or get the URL of the reference video',
            'In the Shorts Workbench, write your own unique script (different content, same energy)',
            'Generate keyframe images in your brand visual style',
            'Add the reference video as a Motion Reference on key scenes',
            'Trim to just the gestures/movements you want — not the whole video',
            'The AI transfers only the motion, your visual style stays 100% yours',
          ]}
          result="Content that has the same energy and movement quality as the reference, but with your unique characters, style, and messaging."
        />
      </Section>

      {/* ── Best Practices ───────────────────────────────────────── */}
      <Section icon={CheckCircle2} title="Best Practices">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">For the character image:</h4>
          <ul className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Use a clear, well-lit image with the character prominently visible</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Full-body shots work better than close-ups for full-body movements</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Simple backgrounds produce cleaner results than busy scenes</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> The character's initial pose should be compatible with the target motion</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">For the reference video:</h4>
          <ul className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Trim to just the movement you want — shorter = better quality</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Single-person videos work best; multi-person can confuse the motion extraction</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Good lighting and clear visibility of the person's body helps</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Avoid videos with lots of camera shake or rapid cuts</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> MP4 format is most reliable; MOV and WebM also work</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">For prompts:</h4>
          <ul className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> The prompt is optional but helps with scene context</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> Describe the environment, lighting, and mood — not the movement (that comes from the video)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> In Shorts Workbench, if no prompt is set, the scene's motion direction is used automatically</li>
          </ul>
        </div>
      </Section>

      {/* ── Troubleshooting ──────────────────────────────────────── */}
      <Section icon={AlertTriangle} title="Troubleshooting">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">
          <div className="border-l-4 border-red-300 dark:border-red-700 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">"Motion transfer submit failed: 422"</h4>
            <p className="mt-1">
              The reference video may be too long for the selected model/orientation. Check the duration limits:
              WAN 2.2 has no strict limit but works best under 6s; Kling Match Image maxes at 10s; Kling Match Video maxes at 30s.
              Trim your video to fit within the limit.
            </p>
          </div>

          <div className="border-l-4 border-red-300 dark:border-red-700 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">"No video URL from motion transfer"</h4>
            <p className="mt-1">
              The generation completed but didn't produce output. This can happen if the character image is too
              low resolution, the reference video is corrupted, or there's a content policy issue. Try a different
              image or video, and ensure neither contains restricted content.
            </p>
          </div>

          <div className="border-l-4 border-amber-300 dark:border-amber-700 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Character doesn't move naturally</h4>
            <p className="mt-1">
              Try switching between "Match Image" and "Match Video" orientation. If your character is facing a different
              direction than the reference person, "Match Video" lets the AI adjust the orientation. Also ensure
              your character image shows the relevant body parts — a head-only image can't do a full-body dance.
            </p>
          </div>

          <div className="border-l-4 border-amber-300 dark:border-amber-700 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Output looks blurry or distorted</h4>
            <p className="mt-1">
              Use a higher resolution character image (at least 512px on the shortest side). If using WAN 2.2, try
              switching to Kling V3 Pro for better quality. Adding a descriptive prompt about the desired visual
              quality can also help.
            </p>
          </div>

          <div className="border-l-4 border-amber-300 dark:border-amber-700 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Trim button doesn't appear</h4>
            <p className="mt-1">
              The video must load in the browser preview before trimming is available. If the video URL returns
              a non-video content type or is behind authentication, the preview won't load. Try using a direct
              video URL (ending in .mp4) or upload the video to your library first.
            </p>
          </div>

          <div className="border-l-4 border-blue-300 dark:border-blue-700 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Shorts clip has audio I don't want</h4>
            <p className="mt-1">
              Shorts Workbench always forces audio OFF for MT clips. If you hear audio, it's from the voiceover
              or music layers added during assembly, not from the motion reference. Check your voiceover and music
              settings in Steps 1-2.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Cost & Processing Time ───────────────────────────────── */}
      <Section icon={DollarSign} title="Cost & Processing Time">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Model</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Processing Time</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Max Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2">WAN 2.2</td>
                  <td className="px-4 py-2">~$0.02-0.04</td>
                  <td className="px-4 py-2">30-60 seconds</td>
                  <td className="px-4 py-2">~6 seconds</td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  <td className="px-4 py-2">Kling V3 Pro (Match Image)</td>
                  <td className="px-4 py-2">~$0.06-0.08</td>
                  <td className="px-4 py-2">60-120 seconds</td>
                  <td className="px-4 py-2">10 seconds</td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2">Kling V3 Pro (Match Video)</td>
                  <td className="px-4 py-2">~$0.06-0.08</td>
                  <td className="px-4 py-2">60-120 seconds</td>
                  <td className="px-4 py-2">30 seconds</td>
                </tr>
              </tbody>
            </table>
          </div>

          <InfoBox>
            Video trimming is free — it uses server-side FFmpeg with lossless copy (no re-encoding). The only
            cost is the AI generation itself.
          </InfoBox>

          <Tip>
            In the Shorts Workbench, you can mix MT and non-MT scenes to control costs. Use MT only for the
            scenes that need specific choreography, and standard I2V or FLF for the rest.
          </Tip>
        </div>
      </Section>

      {/* ── Technical Reference ──────────────────────────────────── */}
      <Section icon={Settings} title="Technical Reference">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">API Endpoints</h4>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs space-y-2 overflow-x-auto">
            <p><span className="text-green-400">POST</span> /api/motion-transfer/generate</p>
            <p className="text-gray-500 ml-4">Generate a motion transfer video (server-side polling)</p>
            <p><span className="text-green-400">POST</span> /api/video/trim</p>
            <p className="text-gray-500 ml-4">Trim a video segment using FFmpeg</p>
            <p><span className="text-green-400">POST</span> /api/workbench/generate-clip <span className="text-gray-500">(mode: 'mt')</span></p>
            <p className="text-gray-500 ml-4">Generate a Shorts clip using motion transfer</p>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Motion Reference Data Shape</h4>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre>{`{
  videoUrl: "https://...",         // Original video URL
  trimmedUrl: "https://...",       // Trimmed segment URL (optional)
  startTime: 2.5,                  // Trim start (seconds)
  endTime: 8.0,                    // Trim end (seconds)
  model: "kling_motion_control",   // or "wan_motion"
  characterOrientation: "image",   // or "video" (Kling only)
  keepOriginalSound: true,         // Preserve reference audio
  prompt: "Scene description...",  // Optional text prompt
  elements: [...]                  // @Element bindings (advanced)
}`}</pre>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Model Registry Keys</h4>
          <ul className="space-y-1 ml-4 font-mono text-xs">
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">wan_motion</code> — fal-ai/wan/v2.2-14b/animate/move</li>
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">kling_motion_control</code> — fal-ai/kling-video/v3/pro/motion-control</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Files</h4>
          <ul className="space-y-1 ml-4 text-xs text-gray-500 dark:text-gray-400">
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">api/lib/motionTransferRegistry.js</code> — Model configs + generateMotionTransfer() dispatcher</li>
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">api/video/trim.js</code> — Video trim endpoint (local FFmpeg)</li>
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">src/components/MotionReferenceInput.jsx</code> — Shared motion reference UI</li>
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">src/components/VideoTrimmer.jsx</code> — Video trimmer range slider</li>
            <li><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">src/components/modals/MotionTransferModal.jsx</code> — Standalone modal (VideoAdvertCreator)</li>
          </ul>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
        Motion Transfer powered by FAL.ai (WAN 2.2 + Kling V3 Pro Motion Control)
      </div>
    </div>
  );
}

export default function MotionTransferGuidePage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      <MotionTransferGuideContent />
    </div>
  );
}
