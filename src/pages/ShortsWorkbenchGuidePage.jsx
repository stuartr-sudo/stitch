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

export function ShortsWorkbenchGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* ── Section 1: Overview ── */}
        <Section icon={LayoutGrid} title="Overview — What Is the Shorts Workbench?" defaultOpen={true}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              The Shorts Workbench is a <strong className="text-gray-900 dark:text-gray-100">5-step interactive video creation workflow</strong> for
              short-form vertical videos (YouTube Shorts, TikTok, Instagram Reels). It gives you full control over every stage of production:
              script, voice, timing, imagery, video generation, and final assembly.
            </p>
            <p>
              Access it at <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/shorts/workbench</code>.
              The old automated pipeline has been replaced by this interactive workbench, which lets you approve, tweak,
              and regenerate at every step instead of running everything blind.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">5-Step Workflow</h5>
                <div className="flex flex-wrap gap-1.5">
                  <Badge icon={Mic} label="1. Script & Voice" color="bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5BA8B0]" />
                  <Badge icon={Clock} label="2. Timing & Music" color="bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5BA8B0]" />
                  <Badge icon={ImageIcon} label="3. Keyframes" color="bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5BA8B0]" />
                  <Badge icon={Film} label="4. Video Clips" color="bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5BA8B0]" />
                  <Badge icon={Download} label="5. Assembly" color="bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5BA8B0]" />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">Output Specs</h5>
                <KV label="Aspect Ratio">9:16 vertical (1080x1920)</KV>
                <KV label="Duration">30-90 seconds</KV>
                <KV label="Scenes">5-8 typically</KV>
                <KV label="Cost">~$0.50-$2.00 per Short</KV>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Key Features</h5>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li><strong className="text-gray-900 dark:text-gray-100">20 niches</strong> — each pre-configured with scene structure, music mood, voice pacing, visual mood, and default voice</li>
                <li><strong className="text-gray-900 dark:text-gray-100">76 narrative frameworks</strong> — structural templates that define scene count, duration splits, transitions, and overlays</li>
                <li><strong className="text-gray-900 dark:text-gray-100">30 Gemini TTS voices</strong> — with niche-specific and universal voice style presets</li>
                <li><strong className="text-gray-900 dark:text-gray-100">123 visual style presets</strong> — for keyframe image generation via StyleGrid</li>
                <li><strong className="text-gray-900 dark:text-gray-100">86 video style presets</strong> — for motion/cinematography direction during video generation</li>
                <li><strong className="text-gray-900 dark:text-gray-100">FLF and I2V generation modes</strong> — auto-selected based on video model choice</li>
                <li><strong className="text-gray-900 dark:text-gray-100">Avatar split-screen mode</strong> — AI talking-head composited with B-roll</li>
                <li><strong className="text-gray-900 dark:text-gray-100">Quality review gate</strong> — automatic visual-narration alignment check after assembly</li>
                <li><strong className="text-gray-900 dark:text-gray-100">Draft save/load</strong> — full workbench state persisted to Supabase for work-in-progress</li>
                <li><strong className="text-gray-900 dark:text-gray-100">All media uploaded to Supabase</strong> — persistent storage, no CDN expiry issues</li>
              </ul>
            </div>
          </div>
        </Section>


        {/* ── Section 2: Step 1 — Script & Voice ── */}
        <Section icon={Mic} title="Step 1: Script & Voice" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* Niche Selection */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2C666E]" />
                Niche Selection
              </h5>
              <p>
                Choose from <strong className="text-gray-900 dark:text-gray-100">20 niches</strong>, each with a complete pre-configured production profile.
                Selecting a niche automatically sets up scene structure, music mood, voice pacing, visual mood, and default voice.
                You can override any individual setting after selection.
              </p>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: 'AI/Tech News', icon: '🤖' },
                  { label: 'Finance/Money', icon: '💰' },
                  { label: 'Motivation', icon: '🧠' },
                  { label: 'Horror', icon: '💀' },
                  { label: 'History', icon: '📜' },
                  { label: 'True Crime', icon: '🔍' },
                  { label: 'Science/Nature', icon: '🔬' },
                  { label: 'Relationships', icon: '❤️' },
                  { label: 'Health/Fitness', icon: '💪' },
                  { label: 'Gaming/Pop Culture', icon: '🎮' },
                  { label: 'Conspiracy/Mystery', icon: '👁️' },
                  { label: 'Business', icon: '💼' },
                  { label: 'Food/Cooking', icon: '🍳' },
                  { label: 'Travel/Adventure', icon: '✈️' },
                  { label: 'Psychology', icon: '🧩' },
                  { label: 'Space/Cosmos', icon: '🚀' },
                  { label: 'Animals/Wildlife', icon: '🐾' },
                  { label: 'Sports/Athletes', icon: '⚽' },
                  { label: 'Education/Learning', icon: '📚' },
                  { label: 'Paranormal/UFO', icon: '👽' },
                ].map(n => (
                  <div key={n.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5 text-xs text-center">
                    <span className="mr-1">{n.icon}</span>{n.label}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Each niche pre-configures: scene structure, music mood (genre/instruments/energy), voice pacing (speed/delivery),
                visual mood (color palette/atmosphere/subject matter), and a default Gemini TTS voice.
              </p>
            </div>

            {/* Topic Discovery */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#2C666E]" />
                Topic Discovery
              </h5>
              <p>
                A <strong className="text-gray-900 dark:text-gray-100">3-level progressive funnel</strong> per niche helps you narrow from broad category to specific hook:
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">Category</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">Angle</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">Hook</span>
              </div>
              <p className="mt-2">
                Selected levels concatenate into the topic string passed to the researcher and script generator.
                All 20 niches have custom funnels. You can also type a free-form topic directly.
              </p>
              <p className="mt-1">
                <strong className="text-gray-900 dark:text-gray-100">Trending topic research</strong> via API generates AI-powered story angles
                based on your selected topic. The researcher synthesizes current information into compelling narrative directions.
              </p>
            </div>

            {/* Narrative Frameworks */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2C666E]" />
                Narrative Frameworks
              </h5>
              <p>
                <strong className="text-gray-900 dark:text-gray-100">76 structural frameworks</strong> define the backbone of your video:
                scene count, duration splits per scene, TTS mode, frame chaining strategy, transitions, overlays, music config, and default presets.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">16 Universal Frameworks</h6>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Available for all niches. Examples: Personal Journey, Origin Story, Mini Documentary, Day in the Life,
                    Before & After, Explainer Story, Top X Countdown, Myth Busting, How It Works, Hot Take,
                    Challenge/Experiment, Comparison/Versus, Time Capsule, Behind the Scenes, What If, Rapid Fire Facts.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">60 Niche-Specific Frameworks</h6>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    3 per niche, tailored to the content type. For example, Horror has "Campfire Tale", "Found Footage", "Urban Legend";
                    Finance has "Money Mistake", "Wealth Builder", "Market Breakdown".
                    Selected via <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">getFrameworksForNiche(niche)</code> which
                    returns universal + matching niche frameworks.
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Framework categories: <strong>Story</strong> (atmosphere, emotion, pacing emphasis),
                <strong> Fast-Paced</strong> (action, impact, rhythm emphasis),
                <strong> Listicle</strong> (structured countdown/list format).
                Each defines scene structure per duration (30s, 45s, 60s, 90s).
              </p>
            </div>

            {/* Duration */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2C666E]" />
                Duration
              </h5>
              <p>
                Choose from <strong className="text-gray-900 dark:text-gray-100">30, 45, 60, or 90 seconds</strong>.
                Default is 60 seconds. The duration affects scene count, per-scene timing, and total word count for the script.
                Frameworks define different scene structures per duration tier.
              </p>
            </div>

            {/* Script Generation */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2C666E]" />
                Script Generation
              </h5>
              <p>
                Uses <strong className="text-gray-900 dark:text-gray-100">GPT-4.1</strong> to generate narration-only output.
                The script contains words-only narration segments with overlay text and scene labels — <strong className="text-gray-900 dark:text-gray-100">no visual prompts</strong>.
                Visual prompts are synthesized separately in the Keyframes step using LLM prompt synthesis.
              </p>
              <p className="mt-1">
                The script respects the niche's <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">script_system_prompt</code> for
                tone and content rules, and the framework's scene structure for pacing and scene roles (hook, context, point, impact, CTA, etc.).
              </p>
              <p className="mt-1">
                Scripts are fully editable after generation. You can rewrite any scene's narration before proceeding.
              </p>
            </div>

            {/* Voice Selection */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#2C666E]" />
                Voice Selection — 30 Gemini TTS Voices
              </h5>
              <p>
                <strong className="text-gray-900 dark:text-gray-100">12 featured voices</strong> are shown first, with the remaining 18 accessible via "Show all".
                Each voice has a name and personality description to help you choose.
              </p>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Featured Voices (shown first)</h6>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { name: 'Kore', desc: 'Strong, firm female' },
                    { name: 'Puck', desc: 'Upbeat, lively male' },
                    { name: 'Charon', desc: 'Calm, professional male' },
                    { name: 'Zephyr', desc: 'Bright, clear female' },
                    { name: 'Aoede', desc: 'Warm, melodic female' },
                  ].map(v => (
                    <div key={v.name} className="text-center">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{v.name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-500">{v.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">All 30 Voices</h6>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  {[
                    { name: 'Kore', desc: 'Strong, firm female' },
                    { name: 'Puck', desc: 'Upbeat, lively male' },
                    { name: 'Charon', desc: 'Calm, professional male' },
                    { name: 'Zephyr', desc: 'Bright, clear female' },
                    { name: 'Aoede', desc: 'Warm, melodic female' },
                    { name: 'Achernar', desc: 'Deep, resonant' },
                    { name: 'Achird', desc: 'Gentle, measured' },
                    { name: 'Algenib', desc: 'Energetic, bright' },
                    { name: 'Algieba', desc: 'Warm, conversational' },
                    { name: 'Alnilam', desc: 'Steady, authoritative' },
                    { name: 'Autonoe', desc: 'Soft, thoughtful' },
                    { name: 'Callirrhoe', desc: 'Clear, articulate' },
                    { name: 'Despina', desc: 'Light, airy' },
                    { name: 'Enceladus', desc: 'Rich, dramatic' },
                    { name: 'Erinome', desc: 'Crisp, professional' },
                    { name: 'Fenrir', desc: 'Bold, commanding' },
                    { name: 'Gacrux', desc: 'Smooth, reassuring' },
                    { name: 'Iapetus', desc: 'Neutral, versatile' },
                    { name: 'Laomedeia', desc: 'Melodious, flowing' },
                    { name: 'Leda', desc: 'Quiet, intimate' },
                    { name: 'Orus', desc: 'Strong, grounded' },
                    { name: 'Pulcherrima', desc: 'Elegant, refined' },
                    { name: 'Rasalgethi', desc: 'Deep, sonorous' },
                    { name: 'Sadachbia', desc: 'Cheerful, warm' },
                    { name: 'Sadaltager', desc: 'Measured, precise' },
                    { name: 'Schedar', desc: 'Bright, enthusiastic' },
                    { name: 'Sulafat', desc: 'Calm, soothing' },
                    { name: 'Umbriel', desc: 'Low, mysterious' },
                    { name: 'Vindemiatrix', desc: 'Clear, confident' },
                    { name: 'Zubenelgenubi', desc: 'Animated, expressive' },
                  ].map(v => (
                    <div key={v.name} className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-gray-200">{v.name}</span>
                      <span className="text-gray-500 dark:text-gray-500">{v.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Voice Speed */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#2C666E]" />
                Voice Speed
              </h5>
              <p>
                Multiplier from <strong className="text-gray-900 dark:text-gray-100">0.75x to 1.5x</strong>.
                Available presets: 0.75x, 0.85x, 0.9x, 1.0x, 1.1x, 1.25x, 1.3x, 1.4x.
                The backend injects speed-aware pacing directives into the Gemini TTS <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">style_instructions</code>:
              </p>
              <div className="mt-2 space-y-1">
                <KV label="1.05x+">Slightly quick delivery</KV>
                <KV label="1.15x+">Uptempo delivery</KV>
                <KV label="1.3x+">Brisk, energized delivery</KV>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Voice speed affects effective duration: faster voice = shorter video = fewer/shorter scenes. The duration solver
                adjusts scene timings to match the actual voiceover length.
              </p>
            </div>

            {/* Voice Style Presets */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#2C666E]" />
                Voice Style Presets
              </h5>
              <p>
                Two types of voice style presets populate the custom voice style field:
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">Niche-Specific (20)</h6>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Auto-loaded when you select a niche. Tailored delivery instructions
                    matching the niche's content style (e.g., "fast-paced news-anchor energy" for AI/Tech,
                    "hushed tension building" for Horror).
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">Universal Presets (8)</h6>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Available for all niches: Documentary, Storyteller, News Anchor, Whispering,
                    High Energy, Teacher, Campfire, Podcast Host. Each has full "Speak with..." performance instructions.
                  </p>
                </div>
              </div>
              <p className="mt-2">
                You can also write <strong className="text-gray-900 dark:text-gray-100">free-text custom style instructions</strong> for
                voice performance — tone, pacing, emphasis patterns, emotional arc. These are passed directly to Gemini TTS.
              </p>
            </div>

            {/* Voice Approval Gate */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C666E]" />
                Voice Approval Gate
              </h5>
              <p>
                You <strong className="text-gray-900 dark:text-gray-100">must approve the voiceover</strong> before proceeding to Step 2.
                Listen to the generated voiceover, adjust script or voice settings, and regenerate if needed.
                Once approved, the voiceover audio URL is locked in and used for all subsequent timing and assembly.
              </p>
            </div>

            <Tip>
              Choose your niche first — it pre-configures music mood, visual style, voice pacing, and scene structure.
              You can always override individual settings later.
            </Tip>
          </div>
        </Section>


        {/* ── Section 3: Step 2 — Timing & Music ── */}
        <Section icon={Music} title="Step 2: Timing & Music" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* Automatic Timing */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2C666E]" />
                Automatic Timing
              </h5>
              <p>
                The system uses <strong className="text-gray-900 dark:text-gray-100">Whisper word-level transcription</strong> on your approved voiceover
                to get precise word timestamps via <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">getWordTimestamps()</code>.
                These are then fed into the <strong className="text-gray-900 dark:text-gray-100">block alignment</strong> system
                (<code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">alignBlocks()</code>) which maps narration
                segments to time ranges, and the <strong className="text-gray-900 dark:text-gray-100">duration solver</strong> which
                optimizes per-scene durations to match narration pacing and the selected video model's allowed durations.
              </p>
              <p className="mt-1">
                Scenes are auto-timed to match narration pacing. The duration solver ensures each scene's video clip
                duration aligns with the words spoken during that scene, producing natural timing without manual adjustment.
              </p>
            </div>

            {/* Video Model Selection */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-[#2C666E]" />
                Video Model Selection
              </h5>
              <p>
                Choose the AI model for video clip generation. The model determines the <strong className="text-gray-900 dark:text-gray-100">generation mode</strong> (FLF or I2V)
                and available duration options.
              </p>
              <div className="mt-2 space-y-2">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">FLF Models (First-Last-Frame)</h6>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge icon={Zap} label="Veo 3.1" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                    <Badge icon={Zap} label="Veo 3.1 Lite" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                    <Badge icon={Zap} label="Kling V3 Pro" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                    <Badge icon={Zap} label="Kling O3 Pro" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Generate start AND end keyframe per scene. Video interpolates between the two frames.
                    All scenes can generate in <strong>parallel</strong> — fastest overall generation time.
                    Best for controlled transitions where you define both the beginning and end of each shot.
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">I2V Models (Image-to-Video)</h6>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge icon={Play} label="Wan 2.5" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                    <Badge icon={Play} label="Wan Pro" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                    <Badge icon={Play} label="Kling 2.0 Master" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                    <Badge icon={Play} label="Hailuo/MiniMax" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                    <Badge icon={Play} label="PixVerse v4.5" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                    <Badge icon={Play} label="PixVerse V6" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                    <Badge icon={Play} label="Grok Video" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Generate one keyframe per scene. Video animates from it. <strong>Sequential</strong> generation —
                    each scene's last frame is extracted and used as the seed for the next scene, maintaining visual continuity.
                    Best for natural, flowing sequences where each scene continues organically from the previous.
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Kling V3 Pro and Kling O3 Pro also support <strong>multi-shot mode</strong> — an alternative generation approach
                available for these specific models.
              </p>
            </div>

            {/* Background Music */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Music className="w-4 h-4 text-[#2C666E]" />
                Background Music
              </h5>
              <p>
                AI-generated <strong className="text-gray-900 dark:text-gray-100">instrumental music</strong> via ElevenLabs Music through FAL.ai proxy.
                Music is always instrumental (no lyrics — <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">lyrics_prompt: '[Instrumental]'</code>).
              </p>
              <div className="mt-2 space-y-1">
                <KV label="Mood">Niche-aware — auto-populated from niche template (e.g., "futuristic ambient electronic" for AI/Tech)</KV>
                <KV label="Volume">0-50%, default 20%</KV>
                <KV label="Toggle">Enable/disable per Short</KV>
                <KV label="Provider">ElevenLabs Music via FAL.ai proxy (FAL_KEY only)</KV>
              </div>
            </div>

            {/* Sound Effects */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#2C666E]" />
                Sound Effects
              </h5>
              <p>
                AI-generated ambient sound effects to add atmosphere. Separate from background music.
              </p>
              <div className="mt-2 space-y-1">
                <KV label="Volume">0-100%, default 30%</KV>
                <KV label="Toggle">Enable/disable independently from music</KV>
              </div>
            </div>

            {/* Music Approval Gate */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C666E]" />
                Music Approval Gate
              </h5>
              <p>
                Must approve the music selection before proceeding to Step 3 (Keyframes).
                You can regenerate music with a different mood prompt, adjust volume, or disable it entirely.
              </p>
            </div>

            <Tip>
              FLF mode gives you more control over scene transitions since you define both start and end frames.
              I2V mode is better for natural, flowing sequences where each scene continues from the previous.
            </Tip>

            <Warning>
              Video model durations differ by provider. Veo 3.1 only accepts 4s, 6s, or 8s durations. Kling uses
              string numbers like "5" or "10". Wavespeed uses integers. The system handles this automatically via the
              duration solver and model registry, but be aware that your requested scene duration may be rounded
              to the nearest valid value for the selected model.
            </Warning>
          </div>
        </Section>


        {/* ── Section 4: Step 3 — Keyframes ── */}
        <Section icon={ImageIcon} title="Step 3: Keyframes (Image Generation)" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* Visual Style Selection */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#2C666E]" />
                Visual Style Selection — StyleGrid
              </h5>
              <p>
                The <strong className="text-gray-900 dark:text-gray-100">StyleGrid</strong> presents <strong className="text-gray-900 dark:text-gray-100">123 visual style presets</strong> across
                multiple categories, each with a thumbnail preview and a detailed 40-80 word prompt description.
                This style is applied to all keyframe images for the Short.
              </p>
              <p className="mt-1">
                Visual style presets are separate from video style presets. Visual styles affect <strong className="text-gray-900 dark:text-gray-100">image generation</strong> (what
                the frames look like), while video styles affect <strong className="text-gray-900 dark:text-gray-100">motion/cinematography</strong> (how the camera moves and the scene animates).
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Source: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">src/lib/stylePresets.js</code> — 123 presets with detailed prompt text.
                Auto-loaded via the StyleGrid component. All thumbnails hosted on FAL CDN.
              </p>
            </div>

            {/* Video Style Presets */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#2C666E]" />
                Video Style Presets — Motion & Cinematography
              </h5>
              <p>
                <strong className="text-gray-900 dark:text-gray-100">86 motion/cinematography presets</strong> across 6 categories.
                Each has a full 150-word cinematography direction describing camera movement, lens behavior, lighting shifts, and scene dynamics.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { label: 'Realistic', desc: 'Lifelike motion, natural camera' },
                  { label: 'Professional', desc: 'Polished broadcast quality' },
                  { label: 'Artistic', desc: 'Creative, expressive motion' },
                  { label: 'Faceless', desc: 'No human subjects, object/scene focus' },
                  { label: 'Kids', desc: 'Bright, playful, animated style' },
                  { label: 'Utility', desc: 'Functional, instructional' },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5">
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{c.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-500">{c.desc}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Source: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">api/lib/videoStylePresets.js</code> — loaded via
                <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"> GET /api/styles/video</code>.
              </p>
            </div>

            {/* Image Models */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2C666E]" />
                Image Models
              </h5>
              <p>
                <strong className="text-gray-900 dark:text-gray-100">Nano Banana 2</strong> is the default for keyframe generation (fast, cost-effective at ~$0.003-0.005/image).
                Other models are available via the model registry including Flux 2, SeedDream v4.5, Imagen 4, Kling Image v3, Grok Imagine,
                Ideogram v2, and Wavespeed.
              </p>
            </div>

            {/* Per-Scene Frame Generation */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2C666E]" />
                Per-Scene Frame Generation
              </h5>
              <p>
                Each scene gets its own keyframe image(s). The system uses <strong className="text-gray-900 dark:text-gray-100">LLM prompt synthesis</strong>
                (GPT-4.1-mini) to combine the narration text, selected visual style, and niche visual mood into a single
                optimized image generation prompt. This is NOT simple concatenation — the LLM intelligently merges and
                prioritizes elements for a cohesive prompt.
              </p>
            </div>

            {/* FLF vs I2V Frame Requirements */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">FLF Mode: Frame Pairs</h6>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Each scene needs BOTH a <strong>start frame</strong> and an <strong>end frame</strong>.
                  The video model interpolates between the two to create the clip. The end frame of scene N
                  can serve as the start frame of scene N+1 for seamless visual transitions.
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1">I2V Mode: Single Frames</h6>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Each scene needs one keyframe. After video generation, the <strong>last frame is extracted</strong>
                  (<code className="bg-gray-200 dark:bg-gray-600 rounded px-0.5">frame_type: 'last'</code>)
                  and used as the start frame for the next scene, maintaining visual continuity across the sequence.
                </p>
              </div>
            </div>

            {/* Reference Images */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#2C666E]" />
                Reference Images
              </h5>
              <p>
                Per-scene I2I (image-to-image) reference images from three sources:
              </p>
              <div className="mt-2 space-y-1">
                <KV label="Auto-chain">Previous scene's extracted frame (automatic continuity)</KV>
                <KV label="Library">Saved images from your image library (with tag-based search)</KV>
                <KV label="URL paste">Any publicly accessible image URL</KV>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Reference images are handled via the <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">ReferenceImageInput</code> component
                + <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">LibraryModal</code>.
              </p>
            </div>

            {/* Vision Continuity Analysis */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#2C666E]" />
                Vision Continuity Analysis
              </h5>
              <p>
                When generating end frames (FLF) or extracting last frames from clips (I2V),
                <strong className="text-gray-900 dark:text-gray-100"> GPT-4.1-mini vision</strong> analyzes the frame for:
                lighting, color temperature, subject position, background elements, and camera angle.
                This produces an ~80-word description that is passed to the next scene's prompt for visual consistency.
              </p>
              <p className="mt-1">
                This vision analysis is what makes scene-to-scene transitions look cohesive — the AI understands
                what the previous frame looked like and can match lighting, color grading, and composition.
              </p>
            </div>

            {/* Scene Pills */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#2C666E]" />
                Scene Pills — Visual Direction Helpers
              </h5>
              <p>
                Context-aware visual direction pills that you can click to add to a scene's prompt.
                Generated by <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">getScenePills(niche, framework, visualStyle, duration)</code>.
              </p>
              <div className="mt-2 space-y-1">
                <KV label="Story framework">Atmosphere, emotion, and pacing pills</KV>
                <KV label="Fast-paced">Action, impact, and rhythm pills</KV>
                <KV label="Camera">Camera angle and movement pills</KV>
                <KV label="Duration-aware">30s or less gets 4 pills per category; longer videos get 6</KV>
              </div>
            </div>

            <Tip>
              Lock in your visual style and video style before generating frames — changing them later means regenerating everything.
              The LLM prompt synthesis merges your visual style with each scene's narration, so the style is baked into every frame.
            </Tip>
          </div>
        </Section>


        {/* ── Section 5: Step 4 — Video Generation ── */}
        <Section icon={Film} title="Step 4: Video Generation (Clips)" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* FLF Generation */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#2C666E]" />
                FLF Generation (First-Last-Frame)
              </h5>
              <p>
                Sends start + end frame pairs to FLF-capable models (Veo 3.1, Veo 3.1 Lite, Kling V3, Kling O3).
                The model generates a video that transitions from the start frame to the end frame.
                <strong className="text-gray-900 dark:text-gray-100"> All scenes can generate in parallel</strong> — fire all at once
                for maximum speed. Typical generation time: 30-90 seconds per clip.
              </p>
            </div>

            {/* I2V Generation */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 text-[#2C666E]" />
                I2V Generation (Image-to-Video)
              </h5>
              <p>
                Sends a single keyframe + motion prompt to I2V models.
                <strong className="text-gray-900 dark:text-gray-100"> Sequential generation</strong> — waits for each clip to complete,
                extracts the last frame via <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">extractLastFrame()</code>,
                analyzes it with GPT-4.1-mini vision, then chains to the next scene. This produces natural visual continuity
                but takes longer than FLF since scenes are processed one at a time.
              </p>
            </div>

            {/* Motion Prompts */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#2C666E]" />
                Motion Prompts
              </h5>
              <p>
                Per-scene motion/camera direction text. Combined with the selected video style preset for full
                cinematography instruction sent to the video model. You can edit per-scene motion prompts to
                control camera movement, zoom, pan, tilt, and scene dynamics.
              </p>
            </div>

            {/* Duration Per Scene */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2C666E]" />
                Duration Per Scene
              </h5>
              <p>
                Controlled by the duration solver based on narration timing. Typical range: <strong className="text-gray-900 dark:text-gray-100">3-10 seconds per scene</strong>.
                The solver maps each scene's narration length to the nearest valid duration for the selected model
                (e.g., Veo 3.1 snaps to 4s, 6s, or 8s via the <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">veoDuration()</code> function).
              </p>
            </div>

            {/* Last Frame Extraction */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2C666E]" />
                Last Frame Extraction
              </h5>
              <p>
                After each I2V clip generates, the system extracts the last frame using
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">frame_type: 'last'</code> (not manual frame_time
                calculation) and analyzes it via GPT-4.1-mini vision. The analysis produces an ~80-word description
                covering lighting, subject position, and composition — which is injected into the next scene's generation prompt
                for visual continuity.
              </p>
            </div>

            {/* Clip Status Tracking */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#2C666E]" />
                Clip Status Tracking
              </h5>
              <p>Each scene card shows its current status:</p>
              <div className="mt-2 space-y-1">
                <KV label="Generating">Spinner with progress indication</KV>
                <KV label="Done">Green check with clip duration displayed</KV>
                <KV label="Failed">Red indicator with error message + retry button</KV>
              </div>
            </div>

            {/* Generate All */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2C666E]" />
                Generate All
              </h5>
              <p>
                Button to generate all remaining clips at once. For <strong className="text-gray-900 dark:text-gray-100">FLF mode</strong>,
                all clips fire in parallel. For <strong className="text-gray-900 dark:text-gray-100">I2V mode</strong>, they chain
                sequentially (scene 1 must complete before scene 2 begins, etc.).
                You can also generate individual scenes one at a time.
              </p>
            </div>

            <Warning>
              Veo 3.1 clips always have <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">generate_audio</code> forced
              to <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">false</code> in the workbench — the workbench has its
              own voiceover + music pipeline. Veo 3.1 Lite also defaults <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">generate_audio</code> to
              true if omitted, so the workbench explicitly sends false.
            </Warning>
          </div>
        </Section>


        {/* ── Section 6: Step 5 — Assembly & Export ── */}
        <Section icon={Download} title="Step 5: Assembly & Export" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* Assembly Process */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Film className="w-4 h-4 text-[#2C666E]" />
                Assembly Process
              </h5>
              <p>
                FFmpeg compose (via <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">fal-ai/ffmpeg-api/compose</code>)
                stitches all video clips together with voiceover audio, background music (at configured volume, default 15%
                in the assembly call), and optional sound effects. All tracks use
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">type: 'video'</code> for video clips and
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">type: 'audio'</code> for audio tracks.
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Assembly is handled by <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">assembleShort()</code> in
                <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"> api/lib/pipelineHelpers.js</code>. Accepts a
                <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"> musicVolume</code> parameter (default 0.15).
              </p>
            </div>

            {/* Caption Burning */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Type className="w-4 h-4 text-[#2C666E]" />
                Caption Burning
              </h5>
              <p>
                Automatic word-level captions via <strong className="text-gray-900 dark:text-gray-100">Whisper + auto-subtitle</strong>
                (<code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">fal-ai/workflow-utilities/auto-subtitle</code>).
                Default style: <strong className="text-gray-900 dark:text-gray-100">Word Pop</strong> — Montserrat font, bold weight, purple highlight,
                word-by-word animation with karaoke-style progression.
              </p>
              <p className="mt-1">
                Available caption styles (exported as <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">CAPTION_STYLES</code>):
              </p>
              <div className="mt-2 space-y-1">
                <KV label="word_pop">Montserrat bold, purple highlight, word-by-word animation</KV>
                <KV label="karaoke_glow">Glowing highlight progression</KV>
                <KV label="word_highlight">Highlighted current word</KV>
                <KV label="news_ticker">News-style bottom ticker</KV>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Caption burning is handled by <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">burnCaptions()</code> in
                <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded"> api/lib/captionBurner.js</code>.
                Output is <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">output.video.url</code>.
              </p>
            </div>

            {/* Video Preview */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#2C666E]" />
                Video Preview & Download
              </h5>
              <p>
                HTML5 video player with native controls for preview. <strong className="text-gray-900 dark:text-gray-100">Download button</strong> saves
                the final video locally. <strong className="text-gray-900 dark:text-gray-100">Re-assemble button</strong> lets you re-run
                assembly after making changes (e.g., repairing a scene, adjusting music volume).
              </p>
            </div>

            {/* Draft Auto-Save */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C666E]" />
                Draft Auto-Save
              </h5>
              <p>
                Automatically saves to Supabase with full workbench state when assembly completes. Draft marked as
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">generation_status: 'complete'</code>.
                The draft includes the final video URL, all scene clips, keyframes, voice settings, and every other
                piece of state needed to reload the workbench exactly where you left off.
              </p>
            </div>
          </div>
        </Section>


        {/* ── Section 7: Avatar Split-Screen Mode ── */}
        <Section icon={Users} title="Avatar Split-Screen Mode" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* What It Does */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#2C666E]" />
                What It Does
              </h5>
              <p>
                Adds a <strong className="text-gray-900 dark:text-gray-100">talking-head AI avatar</strong> to the bottom 40% of the video,
                with B-roll content in the top 60%. Creates the popular split-screen format seen on TikTok and YouTube Shorts
                where a presenter appears to narrate over background footage.
              </p>
            </div>

            {/* Requirements */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2C666E]" />
                Requirements
              </h5>
              <p>
                A trained <strong className="text-gray-900 dark:text-gray-100">Visual Subject with LoRA</strong> from the LoRA Training Studio.
                The avatar needs a face-focused LoRA for best results. Visual Subjects are stored in the
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">visual_subjects</code> table and linked to
                trained LoRAs in <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">brand_loras</code>.
              </p>
            </div>

            {/* How to Enable */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#2C666E]" />
                How to Enable
              </h5>
              <p>
                Toggle <strong className="text-gray-900 dark:text-gray-100">"Avatar Mode"</strong> in Step 1. Select your Visual Subject from
                the dropdown (only subjects with a trained LoRA URL appear). The system fetches available subjects from
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/api/brand/avatars</code> and filters to those with
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">lora_url</code>.
              </p>
            </div>

            {/* Three-Stage Pipeline */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2C666E]" />
                Three-Stage Avatar Pipeline
              </h5>

              <Step number="1" title="Portrait Generation">
                <p>
                  Generates a close-up portrait using your LoRA with <strong>Nano Banana 2</strong>.
                  Aspect ratio: <strong>4:3 landscape</strong> (optimized for the bottom panel of the split-screen layout).
                  The portrait prompt includes the LoRA trigger word and face-focused composition instructions.
                </p>
              </Step>

              <Step number="2" title="Animation">
                <p>
                  Animates the portrait into a video clip using <strong>Wan 2.5</strong> (max 10s per clip).
                  If the voiceover is longer than 10 seconds, the animated clip is automatically <strong>looped</strong> to
                  match the full voiceover duration. The animation adds natural talking-head movement — head turns,
                  eye blinks, mouth movement.
                </p>
              </Step>

              <Step number="3" title="Lip-Sync">
                <p>
                  Applies lip-sync to match the voiceover audio using the <strong>sync-lipsync-2-pro</strong> model.
                  The avatar's mouth movements are synchronized with the actual spoken words from the voiceover track.
                </p>
              </Step>
            </div>

            {/* Assembly Layout */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2C666E]" />
                Assembly Layout
              </h5>
              <p>
                The avatar video is composited with B-roll in a vertical split:
              </p>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="space-y-1">
                  <KV label="Top 60%">B-roll video (1080 x 1152 pixels)</KV>
                  <KV label="Bottom 40%">Avatar video (1080 x 768 pixels)</KV>
                  <KV label="Total">1080 x 1920 (standard 9:16 vertical)</KV>
                  <KV label="Audio">Voiceover + music only (avatar audio discarded)</KV>
                </div>
              </div>
            </div>

            {/* Fallback */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2C666E]" />
                Fallback Behavior
              </h5>
              <p>
                If split-screen compositing fails for any reason, the system falls back to a <strong className="text-gray-900 dark:text-gray-100">B-roll-only video</strong>.
                You still get a complete Short — just without the avatar panel. This ensures you never lose your work
                due to an avatar generation failure.
              </p>
            </div>

            {/* Where It Appears */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#2C666E]" />
                Where Avatar Mode Appears in the Workflow
              </h5>
              <div className="mt-2 space-y-1">
                <KV label="Step 1">Avatar mode toggle + Visual Subject selector dropdown</KV>
                <KV label="Step 3">"B-roll" label banner reminds you these frames are for the top portion only</KV>
                <KV label="Step 4">Avatar generation card with 3-stage progress (portrait, animate, lip-sync) and preview player</KV>
                <KV label="Step 5">Avatar is composited into the final assembly automatically</KV>
              </div>
            </div>

            <Tip>
              Train your LoRA with close-up face shots for best avatar results. The portrait is generated at 4:3 landscape
              aspect ratio to fit the bottom panel. Use 10-20 high-quality face images for training.
            </Tip>

            <Warning>
              Avatar mode requires a trained Visual Subject with a LoRA. Go to the LoRA Training Studio first if you
              haven't trained one yet. Only subjects with a completed <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">lora_url</code> appear in the selector.
            </Warning>
          </div>
        </Section>


        {/* ── Section 8: Quality Review Gate ── */}
        <Section icon={CheckCircle2} title="Quality Review Gate" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* What It Does */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#2C666E]" />
                What It Does
              </h5>
              <p>
                Automatically checks if each scene's visuals match the narration. After assembly, the system extracts
                one frame from each scene clip, sends it to <strong className="text-gray-900 dark:text-gray-100">GPT-4.1-mini vision</strong> alongside
                the narration text, and gets a pass/fail judgment with reasoning.
              </p>
            </div>

            {/* How It Works */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2C666E]" />
                How It Works
              </h5>

              <Step number="1" title="Assembly Completes">
                <p>Video URL returned immediately — you can preview right away.</p>
              </Step>

              <Step number="2" title="Quality Review Fires Automatically">
                <p>Non-blocking background process. Does not delay your video preview.</p>
              </Step>

              <Step number="3" title="Frame Extraction">
                <p>One frame extracted per scene clip at the temporal midpoint
                  (<code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">frame_type: 'middle'</code>).</p>
              </Step>

              <Step number="4" title="Vision Analysis">
                <p>GPT-4.1-mini vision compares each extracted frame against its narration text.</p>
              </Step>

              <Step number="5" title="Results Appear">
                <p>Results display in Step 5 within 10-20 seconds after assembly.</p>
              </Step>
            </div>

            {/* What It Checks */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#2C666E]" />
                What It Checks
              </h5>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Checked</h6>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <li><strong className="text-gray-900 dark:text-gray-100">Subject matter</strong> — Does the frame show what the narration describes?</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Setting/environment</strong> — Is the location/background appropriate?</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Mood/tone</strong> — Does the visual tone match the narration's tone?</li>
                </ul>
              </div>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Not Checked (ignored)</h6>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <li>Minor stylistic differences</li>
                  <li>Art style variations</li>
                  <li>Color grading specifics</li>
                  <li>Exact composition or framing</li>
                </ul>
              </div>
            </div>

            {/* Results Display */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#2C666E]" />
                Results Display
              </h5>
              <div className="mt-2 space-y-3">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <h6 className="font-semibold text-green-800 dark:text-green-200 text-xs mb-1">All Pass (green banner)</h6>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    "All 6 scenes match narration" — expandable to see per-scene details with confidence scores.
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <h6 className="font-semibold text-amber-800 dark:text-amber-200 text-xs mb-1">Mismatches Found (amber banner)</h6>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    "2 of 6 scenes flagged for review" — expanded showing each flagged scene with:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                    <li>Frame thumbnail from the scene</li>
                    <li>AI reasoning (e.g., "Frame shows a city skyline but narration discusses ocean waves")</li>
                    <li>Narration text excerpt</li>
                    <li>"Repair Scene N" button</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* One-Click Repair */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#2C666E]" />
                One-Click Scene Repair
              </h5>
              <p>
                Click <strong className="text-gray-900 dark:text-gray-100">"Repair Scene"</strong> on any flagged scene.
                The system regenerates that scene's video clip using the existing generate-clip flow.
                The scene card updates to "Repaired" and a toast appears:
                <em className="text-gray-500 dark:text-gray-500"> "Scene repaired. Click Re-assemble to update the final video."</em>
              </p>
              <p className="mt-1">
                After re-assembly, the quality review runs again automatically. The repair uses the same keyframe and
                motion prompt but regenerates the video clip fresh — if the visual mismatch was due to the video model's
                interpretation rather than the keyframe, this often resolves it.
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Repair endpoints: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">api/shorts/repair-scene.js</code> (regenerates clip)
                + <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">api/shorts/reassemble.js</code> (rebuilds final video).
                Uses Veo 3.1 FLF with adjacent scene frames; falls back to <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">animateImageV2</code> for
                last-scene edge cases.
              </p>
            </div>

            {/* Cost */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2C666E]" />
                Cost
              </h5>
              <p>
                ~$0.005-0.01 per scene (GPT-4.1-mini vision). Total <strong className="text-gray-900 dark:text-gray-100">~$0.03-0.08 per Short</strong>.
                Negligible compared to video generation costs.
              </p>
            </div>

            {/* Error Handling */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2C666E]" />
                Error Handling
              </h5>
              <p>
                All errors <strong className="text-gray-900 dark:text-gray-100">fail open</strong>. If frame extraction or vision analysis
                fails for a scene, that scene is marked as passing (not flagged). The review <strong className="text-gray-900 dark:text-gray-100">never
                blocks</strong> your assembled video — it is purely advisory.
              </p>
            </div>

            <Tip>
              The quality review runs automatically — you don't need to click anything. Just wait 10-20 seconds after
              assembly and the results appear in Step 5.
            </Tip>

            <Tip>
              After repairing a scene, you need to click Re-assemble to incorporate the fix into the final video.
              The review will run again automatically after re-assembly.
            </Tip>
          </div>
        </Section>


        {/* ── Section 9: Draft Management ── */}
        <Section icon={FileText} title="Draft Management" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            {/* Auto-Save */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C666E]" />
                Auto-Save
              </h5>
              <p>
                Drafts auto-save when changes are detected (e.g., after generating voiceover, frames, clips, or completing assembly).
                Full workbench state is persisted to the <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">ad_drafts</code> table
                with <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">storyboard_json</code> JSONB column containing
                the complete workbench state. A linked <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">campaigns</code> row
                is created with <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">content_type: 'shorts'</code> and
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">status: 'workbench'</code>.
              </p>
            </div>

            {/* Manual Save */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-[#2C666E]" />
                Manual Save
              </h5>
              <p>
                You can also explicitly save via the save button at any point during the workflow.
                Saves go to <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">POST /api/workbench/save-draft</code>.
              </p>
            </div>

            {/* Load Draft */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#2C666E]" />
                Load Draft
              </h5>
              <p>
                Restores the entire workbench state from a saved draft. Navigates to the last active step.
                All settings, frames, clips, voice, music, and avatar config are fully restored.
              </p>
            </div>

            {/* Draft List */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#2C666E]" />
                Draft List
              </h5>
              <p>
                Shows your 20 most recent drafts with: topic, niche, current step, generation status,
                whether a final video exists, and last updated time. Load any draft to resume where you left off.
              </p>
            </div>

            {/* What's Saved */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2C666E]" />
                What's Saved in a Draft
              </h5>
              <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <li><strong className="text-gray-900 dark:text-gray-100">Script & config</strong> — Script text, niche, topic, framework, duration</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Voice settings</strong> — Selected voice, speed, style instructions, voiceover URL</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Timing</strong> — Timing blocks, word timestamps, scene durations</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Music</strong> — Music URL, mood, volume, SFX settings</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Keyframes</strong> — All keyframe image URLs and generation prompts</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Video clips</strong> — All scene clip URLs and status</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Final video</strong> — Assembled video URL (if completed)</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Avatar state</strong> — Avatar mode flag, subject ID/name, portrait URL, video URL, lip-sync URL</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Visual/video style</strong> — Selected presets and overrides</li>
                </ul>
              </div>
            </div>

            <Tip>
              Drafts are the primary way to resume work. If you close the browser mid-generation, reopen the workbench,
              click "Load Draft", and pick up exactly where you left off.
            </Tip>
          </div>
        </Section>


        {/* ── Section 10: 20 Niches — Complete Reference ── */}
        <Section icon={Globe} title="20 Niches — Complete Reference" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              Every niche pre-configures scene structure, music mood, voice pacing, visual mood, and default voice.
              Below is the complete reference for all 20 niches.
            </p>

            {/* Niche Reference Table */}
            <div className="space-y-3">

              {/* 1. AI/Tech News */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">1. AI / Tech News</h6>
                  <Badge label="8 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Futuristic ambient electronic, pulsing synths, tech-forward, driving energy</KV>
                <KV label="Voice">Fast-paced, authoritative news-anchor energy. Short punchy sentences.</KV>
                <KV label="Visual Mood">Cool blue and white tones, sleek technology, holographic displays, neon accents</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 2. Finance/Money */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💰</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">2. Finance / Money</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Problem 8s, Strategy 10s, Steps 10s, Proof 8s, Mindset 8s, CTA 4s</KV>
                <KV label="Music">Confident motivational, subtle piano and ambient pads, professional</KV>
                <KV label="Voice">Confident authority at a brisk pace. Direct and clear. Punchy financial briefing.</KV>
                <KV label="Visual Mood">Professional dark backgrounds, gold and green accents, financial charts, luxury textures</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 3. Motivation/Self-Help */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧠</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">3. Motivation / Self-Help</h6>
                  <Badge label="6 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Story Setup 10s, Struggle 10s, Turning Point 10s, Lesson 10s, CTA 4s</KV>
                <KV label="Music">Emotional inspirational orchestral, building from quiet piano to soaring strings</KV>
                <KV label="Voice">Rising intensity and conviction. Build emotional momentum. Passionate declarations and pauses.</KV>
                <KV label="Visual Mood">Warm golden-hour lighting, sunrise/sunset tones, silhouettes overcoming obstacles</KV>
                <KV label="Default Voice">Brian</KV>
              </div>

              {/* 4. Scary/Horror */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💀</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">4. Scary / Horror</h6>
                  <Badge label="6 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Setting 10s, Build Up 10s, Escalation 10s, Climax 10s, Twist 8s, CTA 4s</KV>
                <KV label="Music">Dark ambient horror, low drones, distant echoes, unsettling tension, creeping dread</KV>
                <KV label="Voice">Building tension and suspense. Start hushed, then sudden shifts. Slow dread, rapid bursts.</KV>
                <KV label="Visual Mood">Dark oppressive atmosphere, deep shadows, desaturated cold tones, fog and mist, flickering dim light</KV>
                <KV label="Default Voice">Roger</KV>
              </div>

              {/* 5. History/Did You Know */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📜</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">5. History / Did You Know</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Epic orchestral ambient, historical documentary feel, building tension</KV>
                <KV label="Voice">Animated storyteller energy at a lively pace. Genuinely fascinated. Dramatic emphasis on reveals.</KV>
                <KV label="Visual Mood">Sepia and warm amber tones, aged parchment textures, dramatic oil painting lighting, historical architecture</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 6. True Crime */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔍</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">6. True Crime</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Suspenseful investigative documentary, sparse piano, distant heartbeat, tension-building</KV>
                <KV label="Voice">Gripping documentary intensity. Let key facts land with weight. Driving forward momentum.</KV>
                <KV label="Visual Mood">Dark noir aesthetic, high-contrast with red accents, crime scene tape, rain-slicked streets, surveillance grain</KV>
                <KV label="Default Voice">Roger</KV>
              </div>

              {/* 7. Science/Nature */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔬</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">7. Science / Nature</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Ethereal cosmic ambient, wonder and discovery, gentle electronic textures</KV>
                <KV label="Voice">Infectious curiosity and excitement. Sound amazed by the facts. Build energy toward reveals.</KV>
                <KV label="Visual Mood">Vivid macro photography, deep ocean blues and electric greens, laboratory aesthetics, cosmic nebula colors</KV>
                <KV label="Default Voice">Charlie</KV>
              </div>

              {/* 8. Relationships/Dating */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">❤️</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">8. Relationships / Dating</h6>
                  <Badge label="6 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Story Setup 10s, Struggle 10s, Turning Point 10s, Lesson 10s, CTA 4s</KV>
                <KV label="Music">Warm intimate acoustic, gentle guitar or piano, emotionally resonant, understated</KV>
                <KV label="Voice">Warm and direct like a perceptive friend. Quick conversational pace. Genuine and insightful.</KV>
                <KV label="Visual Mood">Warm soft lighting, intimate close-ups, bokeh backgrounds, romantic golden tones</KV>
                <KV label="Default Voice">Brian</KV>
              </div>

              {/* 9. Health/Fitness */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💪</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">9. Health / Fitness</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Problem 8s, Strategy 10s, Steps 10s, Proof 8s, Mindset 8s, CTA 4s</KV>
                <KV label="Music">Energetic motivational, upbeat electronic with driving beat, positive energy</KV>
                <KV label="Voice">Energetic, direct coaching energy. Punchy and confident. Fast, clear statements.</KV>
                <KV label="Visual Mood">High-energy gym lighting, dynamic action shots, bold vibrant colors, motivational energy</KV>
                <KV label="Default Voice">Charlie</KV>
              </div>

              {/* 10. Gaming/Pop Culture */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎮</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">10. Gaming / Pop Culture</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Dynamic gaming-inspired, electronic with melodic elements, nostalgic yet modern</KV>
                <KV label="Voice">Excited, rapid-fire fan energy. Genuinely hyped. Quick pace with enthusiastic emphasis.</KV>
                <KV label="Visual Mood">Neon-lit dark environments, RGB gaming aesthetics, vibrant purple and electric blue, retro-futuristic</KV>
                <KV label="Default Voice">Charlie</KV>
              </div>

              {/* 11. Conspiracy/Mystery */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👁️</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">11. Conspiracy / Mystery</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Mysterious investigative, layered synths with subtle unease, tension without horror</KV>
                <KV label="Voice">Intense investigative energy. Drive through each revelation. Focused and intrigued.</KV>
                <KV label="Visual Mood">Shadowy dimly-lit rooms, redacted documents, pinboard with red string, surveillance grain</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 12. Business/Entrepreneur */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💼</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">12. Business / Entrepreneur</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Problem 8s, Strategy 10s, Steps 10s, Proof 8s, Mindset 8s, CTA 4s</KV>
                <KV label="Music">Confident determined, driving electronic with subtle intensity, forward-moving</KV>
                <KV label="Voice">Sharp, high-energy founder energy. Fast pace, no filler. Direct and punchy.</KV>
                <KV label="Visual Mood">Sleek modern offices, city skyline views, sharp professional attire, corporate power aesthetic</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 13. Food/Cooking */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🍳</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">13. Food / Cooking</h6>
                  <Badge label="6 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Story Setup 10s, Struggle 10s, Turning Point 10s, Lesson 10s, CTA 4s</KV>
                <KV label="Music">Warm acoustic, gentle upbeat rhythm, kitchen vibes, cozy and inviting</KV>
                <KV label="Voice">Warm enthusiasm at a lively pace. Genuinely excited about flavors and techniques.</KV>
                <KV label="Visual Mood">Warm kitchen lighting, rich saturated food colors, steam and sizzle, rustic surfaces, appetizing close-ups</KV>
                <KV label="Default Voice">Charlie</KV>
              </div>

              {/* 14. Travel/Adventure */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✈️</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">14. Travel / Adventure</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Uplifting world music, acoustic guitar with global percussion, wanderlust</KV>
                <KV label="Voice">Vivid, excited energy. Quick pace with wonder. Make every place sound irresistible.</KV>
                <KV label="Visual Mood">Breathtaking landscape vistas, golden hour travel photography, vibrant local culture, aerial perspectives</KV>
                <KV label="Default Voice">Brian</KV>
              </div>

              {/* 15. Psychology/Mind-Blown */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧩</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">15. Psychology / Mind-Blown</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Mysterious intellectual ambient, subtle piano with atmospheric pads, curious and thoughtful</KV>
                <KV label="Voice">Fascinated intensity. Build each insight with growing excitement. Genuinely amazed.</KV>
                <KV label="Visual Mood">Abstract thought visualizations, surreal dreamlike imagery, optical illusions, introspective lighting</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 16. Space/Cosmos */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚀</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">16. Space / Cosmos</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Epic cinematic space ambient, soaring synths with deep sub bass, cosmic wonder, orchestral grandeur</KV>
                <KV label="Voice">Awestruck wonder at a driving pace. Genuinely amazed by cosmic scale. Build to mind-blowing reveals.</KV>
                <KV label="Visual Mood">Deep space blacks with nebula colors, planet surfaces, star fields, awe-inspiring celestial imagery</KV>
                <KV label="Default Voice">George</KV>
              </div>

              {/* 17. Animals/Wildlife */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🐾</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">17. Animals / Wildlife</h6>
                  <Badge label="6 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Story Setup 10s, Struggle 10s, Turning Point 10s, Lesson 10s, CTA 4s</KV>
                <KV label="Music">Nature documentary ambient, organic textures with gentle rhythm, wonder and discovery</KV>
                <KV label="Voice">Animated fascination at a lively pace. Genuinely amazed by each creature.</KV>
                <KV label="Visual Mood">Lush jungle greens, savanna golden light, wildlife close-ups with intense eye contact, nature documentary</KV>
                <KV label="Default Voice">Charlie</KV>
              </div>

              {/* 18. Sports/Athletes */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚽</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">18. Sports / Athletes</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Epic motivational orchestral, building drums with soaring brass, triumph, stadium energy</KV>
                <KV label="Voice">Electric sports commentary energy. Fast pace building toward the climax. Excited, fully invested.</KV>
                <KV label="Visual Mood">Stadium floodlights, action freeze-frames, dramatic slow-motion captures, championship trophy gold</KV>
                <KV label="Default Voice">Adam</KV>
              </div>

              {/* 19. Education/Learning */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📚</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">19. Education / Learning</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="55s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Problem 8s, Strategy 10s, Steps 10s, Proof 8s, Mindset 8s, CTA 4s</KV>
                <KV label="Music">Curious intellectual ambient, playful piano with light electronic textures, wonder</KV>
                <KV label="Voice">Infectious enthusiasm at a quick pace. Like discovering something incredible, barely containing excitement.</KV>
                <KV label="Visual Mood">Clean educational infographic style, chalkboard aesthetics, bright curious colors, classroom energy</KV>
                <KV label="Default Voice">Charlie</KV>
              </div>

              {/* 20. Paranormal/UFO */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👽</span>
                  <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">20. Paranormal / UFO</h6>
                  <Badge label="7 scenes" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                  <Badge label="60s" color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
                </div>
                <KV label="Structure">Hook 3s, Context 7s, Point 8s x3, Impact 10s, Opinion 8s, CTA 4s</KV>
                <KV label="Music">Eerie atmospheric ambient, distant signals, cosmic dread mixed with wonder, mysterious investigation</KV>
                <KV label="Voice">Serious investigative intensity. Drive through evidence with building intrigue. Focused, compelling.</KV>
                <KV label="Visual Mood">Eerie night skies, grainy VHS footage aesthetic, mysterious lights in darkness, alien encounter atmosphere</KV>
                <KV label="Default Voice">Roger</KV>
              </div>

            </div>
          </div>
        </Section>


        {/* ── Section 11: Tips & Keyboard Shortcuts ── */}
        <Section icon={Sparkles} title="Workflow Tips & Best Practices" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">General Workflow</h5>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-[#2C666E] font-bold shrink-0">1.</span>
                  <span>The workbench is a <strong className="text-gray-900 dark:text-gray-100">step-by-step wizard</strong> — complete each step and approve before moving forward. Approval gates enforce quality at each stage.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#2C666E] font-bold shrink-0">2.</span>
                  <span>You can <strong className="text-gray-900 dark:text-gray-100">go back to any previous step</strong> to adjust settings. Changes to early steps (script, voice) may require regenerating later steps.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#2C666E] font-bold shrink-0">3.</span>
                  <span>Scene prompts are <strong className="text-gray-900 dark:text-gray-100">generated by AI but fully editable</strong>. You can rewrite narration, tweak visual prompts, and adjust motion directions at any point.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#2C666E] font-bold shrink-0">4.</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Visual style and video style are separate systems</strong> — visual style affects images (what frames look like), video style affects motion (how camera moves, how scenes animate).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#2C666E] font-bold shrink-0">5.</span>
                  <span>Voice speed affects effective duration — <strong className="text-gray-900 dark:text-gray-100">faster voice = shorter video = fewer/shorter scenes</strong>. The duration solver adjusts automatically.</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">Technical Notes</h5>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span>Music is <strong className="text-gray-900 dark:text-gray-100">always instrumental</strong> (no lyrics). The system sends <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">lyrics_prompt: '[Instrumental]'</code>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span>All generated media is <strong className="text-gray-900 dark:text-gray-100">uploaded to Supabase storage</strong> (persistent, no CDN expiry issues). FAL CDN URLs are temporary and expire within hours.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span>Captions use <strong className="text-gray-900 dark:text-gray-100">Whisper for word-level timing</strong> + <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">fal-ai/workflow-utilities/auto-subtitle</code> for karaoke-style animation.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span><code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">toast.success()</code> and <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">toast.info()</code> are <strong className="text-gray-900 dark:text-gray-100">silenced globally</strong> — only <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">toast.error()</code> and <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">toast.warning()</code> display to the user.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span>Video clips always force <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">generate_audio: false</code> — the workbench has its own voiceover + music pipeline.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span>The old automated pipeline (<code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">shortsPipeline.js</code>) still exists for legacy drafts but is no longer the primary creation path.</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">Model-Specific Tips</h5>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Veo 3.1</strong> — Only accepts 4s, 6s, or 8s durations. Uses <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">veoDuration()</code> mapping: 4 or less = 4s, 5-6 = 6s, 7+ = 8s. Auto-fix enabled for content policy rewrites.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Veo 3.1 Lite</strong> — 60% cheaper than Veo 3.1. Same FLF capability but slightly lower quality. Also defaults generate_audio to true — must explicitly send false.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Kling V3/O3</strong> — Support both FLF and multi-shot modes. Higher quality but slower. Use string durations like "5" or "10".</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Wan 2.5</strong> — I2V mode with good visual continuity via last-frame chaining. Sequential processing means longer total generation time.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400 shrink-0">--</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">Hailuo/MiniMax</strong> — I2V mode. Does not accept a duration parameter — fixed clip length.</span>
                </li>
              </ul>
            </div>
          </div>
        </Section>


        {/* ── Section 12: Cost Breakdown ── */}
        <Section icon={Sliders} title="Cost Breakdown" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">
            <p>
              Approximate costs per Short. Actual costs vary based on scene count, model choice, and whether avatar mode is enabled.
              All costs are tracked in the <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">cost_ledger</code> table
              and visible on the Provider Health Dashboard at <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/costs</code>.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Component</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Cost</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Mic className="w-3 h-3 text-[#2C666E]" /> Voiceover (Gemini TTS via FAL)</span>
                  <span className="font-mono text-xs">~$0.01</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#2C666E]" /> Timing (Whisper via FAL)</span>
                  <span className="font-mono text-xs">~$0.01</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Music className="w-3 h-3 text-[#2C666E]" /> Music (ElevenLabs via FAL)</span>
                  <span className="font-mono text-xs">~$0.05</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3 text-[#2C666E]" /> Keyframe images (5-8 scenes)</span>
                  <span className="font-mono text-xs">~$0.02-0.05</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Film className="w-3 h-3 text-[#2C666E]" /> Video clips (5-8 scenes)</span>
                  <span className="font-mono text-xs">~$0.20-0.80</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Layers className="w-3 h-3 text-[#2C666E]" /> Assembly (FFmpeg via FAL)</span>
                  <span className="font-mono text-xs">~$0.02</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Type className="w-3 h-3 text-[#2C666E]" /> Captions (auto-subtitle via FAL)</span>
                  <span className="font-mono text-xs">~$0.05</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#2C666E]" /> Quality Review (GPT-4.1-mini vision)</span>
                  <span className="font-mono text-xs">~$0.03-0.08</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center gap-2"><Users className="w-3 h-3 text-[#2C666E]" /> Avatar pipeline (if enabled)</span>
                  <span className="font-mono text-xs">~$0.15-0.30</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t-2 border-gray-300 dark:border-gray-600 mt-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100">Total typical range</span>
                  <span className="font-bold text-[#2C666E] text-sm">$0.50 - $2.00</span>
                </div>
              </div>
            </div>

            <Tip>
              Video clip generation is the biggest cost driver. Veo 3.1 Lite is 60% cheaper than standard Veo 3.1 while
              maintaining FLF capability. Wan 2.5 is also cost-effective for I2V mode. Use fewer scenes (30s duration)
              for lower costs.
            </Tip>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-3">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Cost Categories in cost_ledger</h6>
              <div className="space-y-1">
                <KV label="openai">Script generation, vision analysis, prompt synthesis (GPT-4.1, GPT-4.1-mini)</KV>
                <KV label="fal">TTS, Whisper, music, image generation, video generation, assembly, captions</KV>
                <KV label="wavespeed">Wavespeed WAN video generation (if selected)</KV>
                <KV label="elevenlabs">Mapped to FAL.ai on the dashboard (goes through FAL proxy)</KV>
              </div>
            </div>
          </div>
        </Section>


        {/* ── Section 13: API Reference ── */}
        <Section icon={Settings2} title="Backend API Reference" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">
            <p>
              All workbench API calls go through <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">POST /api/workbench/:action</code>.
              Each action is handled by <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">api/workbench/workbench.js</code>.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/voiceover</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Generate voiceover from script. Accepts voice, speed, style instructions.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/timing</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Get Whisper word timestamps and compute scene timing via block alignment + duration solver.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/music</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Generate background music. Accepts mood prompt, duration.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/generate-frame</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Generate keyframe image for a scene. Uses LLM prompt synthesis with visual style + narration.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/generate-clip</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Generate video clip for a scene. Dispatches to FLF or I2V based on model selection.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/assemble</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Assemble final video with voiceover, music, captions. Returns video URL.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/save-draft</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Save full workbench state to ad_drafts table. Creates/updates campaign row.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/load-draft</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Load saved draft state. Returns full storyboard_json.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5">
                  <Badge label="POST" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/workbench/list-drafts</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">List recent drafts for the current user (max 20).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-3">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Scene Repair Endpoints (separate from workbench)</h6>
              <div className="space-y-2">
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="POST" color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/shorts/repair-scene</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Regenerate a specific scene clip. Uses Veo 3.1 FLF with adjacent frames; falls back to animateImageV2.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5">
                  <Badge label="POST" color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/shorts/reassemble</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Rebuild final video from existing scene assets with re-captioning.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-3">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Style API Endpoints</h6>
              <div className="space-y-2">
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="GET" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/styles/frameworks?niche=ai_tech_news</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Get narrative frameworks for a niche (universal + niche-specific).</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5 border-b border-gray-200 dark:border-gray-700">
                  <Badge label="GET" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/styles/video</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">List all 86 video style presets via listVideoStyles().</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start py-1.5">
                  <Badge label="GET" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-gray-100">/api/styles/captions</code>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">List available caption styles (CAPTION_STYLES).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>


        {/* ── Section 14: Key Source Files ── */}
        <Section icon={FileText} title="Key Source Files" defaultOpen={false}>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              Reference of all major source files involved in the Shorts Workbench system.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Frontend</h6>
              <div className="space-y-1.5 text-xs font-mono">
                <KV label="Main page">src/pages/ShortsWorkbenchPage.jsx</KV>
                <KV label="Style presets">src/lib/stylePresets.js (123 visual styles)</KV>
                <KV label="Visual styles">src/lib/visualStylePresets.js (14 Shorts-specific)</KV>
                <KV label="Frameworks">src/lib/videoStyleFrameworks.js (76 frameworks)</KV>
                <KV label="Topic funnels">src/lib/topicSuggestions.js (3-level per niche)</KV>
                <KV label="Scene pills">src/lib/scenePills.js</KV>
                <KV label="Gemini voices">src/lib/geminiVoices.js (30 voices)</KV>
                <KV label="Model presets">src/lib/modelPresets.js</KV>
                <KV label="StyleGrid">src/components/ui/StyleGrid.jsx</KV>
                <KV label="LibraryModal">src/components/modals/LibraryModal.jsx</KV>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Backend</h6>
              <div className="space-y-1.5 text-xs font-mono">
                <KV label="Workbench API">api/workbench/workbench.js</KV>
                <KV label="Niche templates">api/lib/shortsTemplates.js (20 niches)</KV>
                <KV label="Script generator">api/lib/scriptGenerator.js + narrativeGenerator.js</KV>
                <KV label="TTS">api/lib/voiceoverGenerator.js</KV>
                <KV label="Pipeline helpers">api/lib/pipelineHelpers.js</KV>
                <KV label="Media generator">api/lib/mediaGenerator.js</KV>
                <KV label="Model registry">api/lib/modelRegistry.js</KV>
                <KV label="Block aligner">api/lib/blockAligner.js</KV>
                <KV label="Duration solver">api/lib/durationSolver.js</KV>
                <KV label="Word timestamps">api/lib/getWordTimestamps.js</KV>
                <KV label="Caption burner">api/lib/captionBurner.js</KV>
                <KV label="Video frameworks">api/lib/videoStyleFrameworks.js</KV>
                <KV label="Video presets">api/lib/videoStylePresets.js (86 presets)</KV>
                <KV label="Visual styles">api/lib/visualStyles.js (14 Shorts styles)</KV>
                <KV label="Scene repair">api/shorts/repair-scene.js</KV>
                <KV label="Reassemble">api/shorts/reassemble.js</KV>
                <KV label="Cost logger">api/lib/costLogger.js</KV>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Database Tables</h6>
              <div className="space-y-1.5 text-xs font-mono">
                <KV label="Drafts">ad_drafts (storyboard_json JSONB)</KV>
                <KV label="Campaigns">campaigns (content_type, status)</KV>
                <KV label="Jobs">jobs (input_json JSONB with campaign_id)</KV>
                <KV label="Visual subjects">visual_subjects (LoRA-linked avatars)</KV>
                <KV label="LoRA models">brand_loras (training metadata)</KV>
                <KV label="Cost tracking">cost_ledger</KV>
              </div>
            </div>
          </div>
        </Section>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function ShortsWorkbenchGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ShortsWorkbenchGuideContent />
    </div>
  );
}
