/**
 * CarouselGuidePage — comprehensive interactive guide for the Carousel tool.
 *
 * Accessible at /carousel-educate (admin-only, behind auth).
 * Covers every feature, control, and workflow in the Carousel Builder.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Play, Settings2, Image as ImageIcon,
  Sparkles, Film, Send, Palette, Type, Sliders, Music, Volume2,
  Lock, Unlock, Trash2, RefreshCw, Download, Plus, LayoutGrid,
  Eye, Clock, CheckCircle2, AlertTriangle, Layers, FileText,
  Monitor, Smartphone, Globe, Mic, GripVertical,
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
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

// ── Warning callout ──

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Inline badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 text-gray-700' }) {
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
      <span className="text-xs font-semibold text-gray-500 shrink-0 w-32">{label}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function CarouselGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/carousels')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Carousel Builder Guide</h1>
            <p className="text-xs text-gray-500">Complete reference for every feature and workflow</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* ── Overview ── */}
        <Section icon={LayoutGrid} title="Overview — What Is the Carousel Builder?" defaultOpen={true}>
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              The Carousel Builder creates <strong>branded carousel posts</strong> for social media.
              A carousel is a series of swipeable image slides — each with a headline, body text, and
              an AI-generated background image — composed together with your brand colors, logo, and typography.
            </p>
            <p>
              The tool supports <strong>Instagram, Facebook, LinkedIn, and TikTok</strong>, automatically adapting
              aspect ratios and content density for each platform. You can create carousels for multiple platforms
              at once from a single topic.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="font-semibold text-gray-900 text-xs mb-1">Supported Platforms</h5>
                <div className="flex flex-wrap gap-1.5">
                  <Badge icon={Smartphone} label="Instagram (1080×1350)" color="bg-pink-100 text-pink-700" />
                  <Badge icon={Globe} label="Facebook (1080×1080)" color="bg-blue-100 text-blue-700" />
                  <Badge icon={Monitor} label="LinkedIn (1080×1080)" color="bg-sky-100 text-sky-700" />
                  <Badge icon={Smartphone} label="TikTok (1080×1920)" color="bg-gray-800 text-white" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="font-semibold text-gray-900 text-xs mb-1">Output Modes</h5>
                <div className="flex flex-wrap gap-1.5">
                  <Badge icon={ImageIcon} label="Static images" color="bg-green-100 text-green-700" />
                  <Badge icon={Film} label="Video carousel" color="bg-purple-100 text-purple-700" />
                  <Badge icon={Play} label="Slideshow video" color="bg-orange-100 text-orange-700" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Creating a Carousel ── */}
        <Section icon={Plus} title="Step 1 — Creating a New Carousel">
          <Step number="1" title="Open the New Carousel modal">
            <p>
              From the Carousels list page (<code>/carousels</code>), click the <strong>"New Carousel"</strong> button
              in the top-right corner. This opens the creation modal.
            </p>
          </Step>

          <Step number="2" title="Choose your content source">
            <p>Enter a <strong>topic or paste a URL</strong>. The system will research the topic using AI and generate
              slide content automatically. URL sources pull key information from the article.</p>
          </Step>

          <Step number="3" title="Select platforms">
            <p>
              Choose one or more platforms: <strong>Instagram, Facebook, LinkedIn, TikTok</strong>.
              Selecting multiple platforms creates a <em>separate carousel for each</em>, with the correct
              aspect ratio and platform-optimized text density.
            </p>
            <KV label="Instagram">1080×1350 (4:5 portrait)</KV>
            <KV label="Facebook">1080×1080 (square)</KV>
            <KV label="LinkedIn">1080×1080 (square)</KV>
            <KV label="TikTok">1080×1920 (9:16 portrait)</KV>
          </Step>

          <Step number="4" title="Select a visual style">
            <p>
              Pick from the <strong>StyleGrid</strong> (123 visual style presets across categories like
              Realistic, Professional, Artistic, etc.). The style controls the AI-generated background
              images — a "Cinematic" style produces moody, film-like backgrounds; "Watercolor" produces
              painted textures, etc.
            </p>
          </Step>

          <Step number="5" title="Choose a carousel style (text layout)">
            <p>
              There are <strong>8 carousel style templates</strong> that control how text is positioned
              and the scrim/gradient overlay:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                ['Bold Editorial', 'Bottom gradient, left-aligned, bold headlines'],
                ['Minimal Center', 'Full overlay, centered text, clean look'],
                ['Dark Cinematic', 'Heavy bottom gradient, dramatic contrast'],
                ['Magazine Spread', 'Top gradient, editorial feel'],
                ['Statement', 'Solid bar, high contrast, impactful'],
                ['Sidebar', 'Left strip, text in vertical band'],
                ['Clean Overlay', 'Light full overlay, professional'],
                ['No Overlay', 'No scrim, text floats on image'],
              ].map(([name, desc]) => (
                <div key={name} className="bg-gray-50 rounded p-2">
                  <span className="text-xs font-semibold text-gray-900">{name}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </Step>

          <Step number="6" title="Attach a Brand Kit (optional)">
            <p>
              If you have a Brand Kit configured (via Settings), select it. The brand's
              <strong> logo</strong> will appear as a watermark, and <strong>brand colors</strong> will
              tint the gradient/scrim overlay.
            </p>
          </Step>

          <Step number="7" title="Create">
            <p>
              Click <strong>Create</strong>. Content generation starts <em>automatically</em> — there is no
              separate "Generate Content" step. The system runs a 2-stage GPT pipeline: first researching
              and synthesizing the topic, then writing optimized slide copy. You'll see a loading spinner
              while slides are being generated.
            </p>
            <Tip>
              The number of slides is adjusted per platform. Instagram typically gets 7-10 slides,
              LinkedIn gets 7-8, and TikTok gets 5-7 (since users swipe faster).
            </Tip>
          </Step>
        </Section>

        {/* ── Editor Layout ── */}
        <Section icon={LayoutGrid} title="Step 2 — The Carousel Editor">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>After creation, you enter the <strong>Carousel Editor</strong> — a three-panel layout:</p>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h5 className="font-semibold text-blue-900 text-xs mb-1">Left Panel — Filmstrip</h5>
                <p className="text-xs text-blue-700">Thumbnail previews of all slides. Click to select.
                  Shows slide number, type badge (hook/story/conclusion), and generation status.</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h5 className="font-semibold text-blue-900 text-xs mb-1">Center Panel — Preview</h5>
                <p className="text-xs text-blue-700">Large preview of the active slide. Shows the final
                  composed image (background + text overlay + logo). Navigate with arrow buttons or
                  click filmstrip thumbnails.</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h5 className="font-semibold text-blue-900 text-xs mb-1">Right Panel — Slide Editor</h5>
                <p className="text-xs text-blue-700">Edit headline, body text, image prompt. Change
                  slide type. Lock/unlock slides. Regenerate individual slides. Edit post caption.</p>
              </div>
            </div>
          </div>

          <Step number="1" title="Slide types">
            <p>Each slide has a type that affects how text is rendered:</p>
            <KV label="Hook">First slide — headline only, no body text. Designed to grab attention.</KV>
            <KV label="Story">Content slides — headline + body text. The bulk of your carousel.</KV>
            <KV label="Conclusion">Final slide — headline + CTA text. Drives action.</KV>
            <Tip>You can change any slide's type using the type selector buttons (Hook / Story / Conclusion).</Tip>
          </Step>

          <Step number="2" title="Editing slide text">
            <p>
              Each slide has three editable fields:
            </p>
            <KV label="Headline">The large text overlaid on the image. Keep it punchy — 3-8 words works best.</KV>
            <KV label="Body Text">Supporting text below the headline. Only shown on Story and Conclusion slides.</KV>
            <KV label="Image Prompt">Describes the AI-generated background image. Edit this to change the visual.</KV>
            <p className="mt-2">
              Changes save automatically when you click away from a field.
            </p>
          </Step>

          <Step number="3" title="Post Caption">
            <p>
              At the bottom of the right panel is the <strong>Post Caption</strong> — the text that accompanies
              your carousel when published. This is auto-generated during content creation but fully editable.
              It applies to the entire carousel, not individual slides.
            </p>
          </Step>
        </Section>

        {/* ── Image Generation ── */}
        <Section icon={ImageIcon} title="Step 3 — Image Generation">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              Images are generated using <strong>Nano Banana 2</strong> (via FAL.ai). Each slide gets a unique
              background image based on its <strong>Image Prompt</strong> + the carousel's <strong>visual style</strong>.
              The image is then composited with text overlays using the <strong>Satori compositor</strong>.
            </p>
          </div>

          <Step number="1" title="Generate all images">
            <p>
              After content generation completes, click <strong>"Generate Images"</strong> in the toolbar.
              This generates background images for ALL slides and composites them with text overlays.
              The status badge changes to <Badge label="generating" color="bg-purple-100 text-purple-700" />.
            </p>
          </Step>

          <Step number="2" title="Regenerate individual slides">
            <p>
              Don't like a particular slide? Click <strong>"Regenerate Image"</strong> in the slide editor
              (right panel). This regenerates only that slide's background image and recomposites the text overlay,
              preserving all other slides.
            </p>
            <Tip>
              Edit the <strong>Image Prompt</strong> before regenerating to guide the AI toward a different visual.
              For example, changing "kitchen table" to "outdoor garden setting" will produce a completely different background.
            </Tip>
          </Step>

          <Step number="3" title="Lock slides">
            <p>
              Click the <Badge icon={Lock} label="lock" /> icon on any slide to prevent it from being
              regenerated. This is useful when you're happy with a slide and want to regenerate others
              without risking changes to the ones you like.
            </p>
          </Step>
        </Section>

        {/* ── Style Controls ── */}
        <Section icon={Palette} title="Style Override Controls">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              Click the <Badge icon={Settings2} label="gear icon" /> in the toolbar to toggle the
              <strong> Style Controls bar</strong>. These controls let you fine-tune the visual appearance
              of all slides. Changes apply when you generate or regenerate images.
            </p>
          </div>

          <Step number="1" title="Gradient Color">
            <p>
              Changes the <strong>scrim/gradient overlay color</strong>. By default, this uses your brand's
              primary color (or black if no brand kit). Click the color swatch to pick any color.
              Click "reset" to return to the default.
            </p>
            <KV label="Default">Black or brand primary color</KV>
            <KV label="Affects">The gradient/overlay that sits between the background image and text</KV>
          </Step>

          <Step number="2" title="Gradient Density">
            <p>
              Controls the <strong>opacity of the gradient/scrim overlay</strong>.
              At 100%, the gradient uses the template's default opacity. Slide it down to make the
              overlay more transparent, letting the background image show through more clearly.
            </p>
            <KV label="Range">20% to 100%</KV>
            <KV label="Default">100% (template default)</KV>
            <Warning>
              Setting this too low may make text hard to read against busy backgrounds.
              The gradient exists to ensure text legibility.
            </Warning>
          </Step>

          <Step number="3" title="Text Color">
            <p>
              Changes the <strong>color of all text</strong> (headlines and body). By default, text is white.
              Useful when using a light-colored or transparent gradient where white text doesn't provide
              enough contrast.
            </p>
            <KV label="Default">White (#FFFFFF)</KV>
            <KV label="Body text">Slightly transparent (90% opacity) for visual hierarchy</KV>
          </Step>

          <Step number="4" title="Headline Size">
            <p>
              Scales the headline text size. The base size is determined by the carousel style template
              and then multiplied by this percentage.
            </p>
            <KV label="Range">60% to 160%</KV>
            <KV label="Default">100%</KV>
          </Step>

          <Step number="5" title="Body Size">
            <p>
              Scales the body text size. Same scaling approach as headline size.
            </p>
            <KV label="Range">60% to 160%</KV>
            <KV label="Default">100%</KV>
          </Step>

          <Step number="6" title="Font">
            <p>Choose from four font families:</p>
            <KV label="Inter (Sans)">Clean, modern sans-serif. Default and most versatile.</KV>
            <KV label="Playfair Display">Elegant serif. Great for luxury/editorial content.</KV>
            <KV label="JetBrains Mono">Monospace/code style. Good for tech content.</KV>
            <KV label="Caveat">Handwritten/cursive. Casual, personal feel.</KV>
            <Tip>
              Selecting any font other than Inter automatically switches the compositor to Satori
              (which supports custom WOFF fonts). The Sharp fallback only supports system fonts.
            </Tip>
          </Step>

          <Step number="7" title="Reset All">
            <p>
              The <strong>"Reset all"</strong> link appears when any control is changed from its default.
              Clicking it resets gradient color, gradient density, text color, headline size, body size,
              and font all back to defaults.
            </p>
          </Step>
        </Section>

        {/* ── Slideshow ── */}
        <Section icon={Play} title="Slideshow Mode (Static Image → Video)">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              The <strong>Slideshow</strong> feature converts your static image carousel into a video
              by sequencing the composed slide images with optional voiceover and background music.
              This is different from "Video Carousel" mode (which AI-animates each slide).
            </p>
          </div>

          <Step number="1" title="Set slide duration">
            <p>
              Use the duration dropdown to choose how long each slide displays:
              <strong> 3s</strong> (fast, social-friendly), <strong>5s</strong> (standard),
              or <strong>8s</strong> (slower, more time to read).
            </p>
            <KV label="Total duration">Number of slides × duration per slide</KV>
            <KV label="Example">10 slides × 3s = 30 second video</KV>
          </Step>

          <Step number="2" title="Enable Voiceover (optional)">
            <p>
              Check the <strong>"Voiceover"</strong> checkbox to generate a text-to-speech narration.
              The system concatenates all slide text (headlines + body text + stats + CTAs) into a single
              narration script, separated by pauses.
            </p>
            <p>
              When enabled, a <strong>voice selector</strong> dropdown appears with 10 ElevenLabs voices:
            </p>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {[
                ['Rachel', 'Warm, professional female'],
                ['Adam', 'Clear, confident male'],
                ['Laura', 'Warm female'],
                ['Brian', 'Warm male'],
                ['Charlotte', 'Young female'],
                ['Charlie', 'Young male'],
                ['George', 'Deep male'],
                ['Alice', 'Bright female'],
                ['Lily', 'Soft female'],
                ['Daniel', 'Professional male'],
              ].map(([name, desc]) => (
                <div key={name} className="text-xs">
                  <span className="font-semibold">{name}</span>
                  <span className="text-gray-400"> — {desc}</span>
                </div>
              ))}
            </div>
            <Tip>
              The voiceover is generated via ElevenLabs TTS through the FAL.ai proxy.
              No separate ElevenLabs subscription needed — it uses your FAL API key.
            </Tip>
          </Step>

          <Step number="3" title="Enable Background Music (optional)">
            <p>
              Check the <strong>"Music"</strong> checkbox to generate instrumental background music.
              The system creates a mood-appropriate track based on the carousel's topic, matched to
              the total slideshow duration.
            </p>
            <KV label="Volume (music only)">50% — prominent but not overpowering</KV>
            <KV label="Volume (with voiceover)">15% — subtle bed behind narration</KV>
            <KV label="Style">Always instrumental, calm and modern</KV>
            <Tip>
              When both Voiceover and Music are enabled, they generate <strong>in parallel</strong> to
              minimize wait time. The music volume automatically drops to 15% so the narration stays clear.
            </Tip>
          </Step>

          <Step number="4" title="Create Slideshow">
            <p>
              Click <strong>"Create Slideshow"</strong>. The button shows a spinner and the status changes to
              <Badge label="assembling" color="bg-purple-100 text-purple-700" />. The backend:
            </p>
            <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
              <li>Generates voiceover TTS (if enabled)</li>
              <li>Generates background music (if enabled)</li>
              <li>Assembles all slide images + audio tracks via FFmpeg (FAL.ai)</li>
              <li>Uploads the final video to storage</li>
            </ol>
            <p className="mt-2">
              The page polls every 5 seconds. Once complete, the status changes to
              <Badge label="ready" color="bg-green-100 text-green-700" /> and the video player appears
              with a <strong>Download</strong> link.
            </p>
          </Step>

          <Step number="5" title="Re-create">
            <p>
              You can create a new slideshow at any time — it replaces the previous one.
              Change the duration, toggle voiceover/music, pick a different voice, and click
              "Create Slideshow" again.
            </p>
          </Step>
        </Section>

        {/* ── Video Carousel ── */}
        <Section icon={Film} title="Video Carousel Mode (AI-Animated Slides)">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              <strong>Video Carousel</strong> mode AI-animates each slide individually using a video generation
              model, then assembles them into a final video. This produces much richer motion than the
              static slideshow, but takes longer and costs more.
            </p>
          </div>

          <Step number="1" title="Generate Videos">
            <p>
              When a carousel has generated images, the <strong>"Generate Videos"</strong> button appears.
              Select a video model and duration, then click to animate each slide. Models include
              Wavespeed WAN, Kling 2.0, and others from the model registry.
            </p>
          </Step>

          <Step number="2" title="Assemble Video">
            <p>
              Once all slide videos are generated, click <strong>"Assemble Video"</strong> to concatenate
              them into a single video via FFmpeg.
            </p>
          </Step>

          <Tip>
            Video Carousel and Slideshow are mutually exclusive output modes. A carousel that has
            AI-animated slide videos won't show the Slideshow controls, and vice versa.
          </Tip>
        </Section>

        {/* ── Publishing ── */}
        <Section icon={Send} title="Publishing">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              Once your carousel is <Badge label="ready" color="bg-green-100 text-green-700" /> (all images
              generated), you can publish directly to the carousel's platform.
            </p>
          </div>

          <Step number="1" title="Connect your account">
            <p>
              Make sure you've connected the target platform in <strong>Settings → Connected Accounts</strong>
              (<code>/settings/accounts</code>). Each platform requires its own OAuth connection.
            </p>
          </Step>

          <Step number="2" title="Publish">
            <p>
              Click the <strong>"Publish to [platform]"</strong> button. The system uploads all composed
              slide images (as a carousel/album) along with the post caption. Different platforms have
              different publishing flows:
            </p>
            <KV label="Instagram">Carousel with container polling (up to 10 images)</KV>
            <KV label="Facebook">Multi-photo page post</KV>
            <KV label="LinkedIn">Carousel post with document upload</KV>
            <KV label="TikTok">Photo carousel</KV>
          </Step>

          <Warning>
            Publishing is a one-time action. There is no "unpublish" — once posted, you'll need to
            delete the post from the platform itself.
          </Warning>
        </Section>

        {/* ── Multi-Platform ── */}
        <Section icon={Globe} title="Multi-Platform Carousels">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              When you select multiple platforms during creation, the system creates a
              <strong> separate carousel for each platform</strong>. Each gets:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Its own optimal <strong>aspect ratio</strong> (portrait for Instagram/TikTok, square for LinkedIn/Facebook)</li>
              <li><strong>Platform-tailored content</strong> — LinkedIn gets more professional copy, Instagram is punchier, TikTok is shortest</li>
              <li>Adjusted <strong>slide count</strong> per platform norms</li>
              <li>Independent editing — changes to one don't affect others</li>
            </ul>
            <p>
              All carousels from the same topic appear together in the carousel list, labeled with their
              platform name.
            </p>
          </div>
        </Section>

        {/* ── Compositor ── */}
        <Section icon={Layers} title="How Image Composition Works (Technical)">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              Each slide image is a <strong>composite</strong> of three layers:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                <strong>Background image</strong> — AI-generated from the slide's Image Prompt + visual style.
                Generated by Nano Banana 2 at the carousel's target resolution.
              </li>
              <li>
                <strong>Scrim/gradient overlay</strong> — A semi-transparent color overlay that ensures text
                readability. The type (bottom gradient, full overlay, solid bar, etc.), opacity, and coverage
                are defined by the carousel style template. Color comes from your brand kit or gradient color control.
              </li>
              <li>
                <strong>Text overlay</strong> — Headline + body text rendered with the selected font, sized
                according to the template ratios and your scale overrides. Logo watermark placed in the top-right corner.
              </li>
            </ol>
            <p>
              Two compositors exist:
            </p>
            <KV label="Satori (default)">JSX-based, supports custom fonts (WOFF), proper text wrapping via flexbox.
              Used automatically when any custom font is selected.</KV>
            <KV label="Sharp (legacy)">SVG-based, system fonts only (DejaVu Sans, Arial). Slightly faster but
              less capable. Falls back to this only for Inter font with no custom overrides.</KV>
          </div>
        </Section>

        {/* ── Carousel Style Templates ── */}
        <Section icon={FileText} title="Carousel Style Templates (Deep Dive)">
          <div className="mt-3 text-sm text-gray-600 space-y-3">
            <p>
              Each style template defines a complete text layout configuration. Here are the key properties
              that each template controls:
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border">Property</th>
                    <th className="text-left p-2 border">What It Controls</th>
                    <th className="text-left p-2 border">Example Values</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['textAlign', 'Horizontal text alignment', 'left, center'],
                    ['textPosition', 'Vertical text position', 'top, center, bottom'],
                    ['scrimType', 'Gradient/overlay shape', 'bottom_gradient, full_overlay, solid_bar, left_strip, none'],
                    ['scrimOpacity', 'Overlay transparency', '0.4 (light) to 0.95 (heavy)'],
                    ['scrimCoverage', 'How much of the image the scrim covers', '0.35 (35%) to 1.0 (100%)'],
                    ['headlineSizeRatio', 'Headline font size as % of canvas height', '0.042 to 0.06'],
                    ['bodySizeRatio', 'Body font size as % of canvas height', '0.026 to 0.032'],
                    ['headlineWeight', 'Headline font weight', 'bold, normal'],
                    ['margin', 'Padding as % of canvas width', '0.06 to 0.12'],
                  ].map(([prop, desc, vals]) => (
                    <tr key={prop}>
                      <td className="p-2 border font-mono text-[#2C666E]">{prop}</td>
                      <td className="p-2 border">{desc}</td>
                      <td className="p-2 border text-gray-500">{vals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Tip>
              The style override controls (gradient color, density, text color, font size, font family) multiply
              or replace these template values. They don't bypass the template — they build on top of it.
            </Tip>
          </div>
        </Section>

        {/* ── Common Workflows ── */}
        <Section icon={CheckCircle2} title="Common Workflows & Tips">
          <Step number="1" title="Quick social post">
            <p>Enter topic → select Instagram → pick a style → Create → Generate Images → Publish. Done in ~2 minutes.</p>
          </Step>

          <Step number="2" title="Cross-platform campaign">
            <p>
              Select all 4 platforms in the creation modal. Edit each carousel independently —
              you might want shorter text for TikTok, more professional language for LinkedIn.
              Publish each to its platform.
            </p>
          </Step>

          <Step number="3" title="Video for Reels/Shorts">
            <p>
              Create an Instagram carousel → Generate Images → enable Voiceover + Music →
              Create Slideshow (3s per slide). Download the video and upload to Reels, Shorts, or TikTok.
            </p>
          </Step>

          <Step number="4" title="Fine-tuning visuals">
            <p>
              Open Style Controls → adjust gradient density down to 60% for more visible backgrounds →
              change text color to a brand color → increase headline size to 130% for impact →
              Regenerate Image on the slides you want to update.
            </p>
          </Step>

          <Step number="5" title="Fixing a single slide">
            <p>
              If one slide looks off: edit its Image Prompt (describe the scene you want) →
              click "Regenerate Image" on that slide. Other slides stay untouched.
              Lock the slides you're happy with first to prevent accidental regeneration.
            </p>
          </Step>
        </Section>

        {/* ── Troubleshooting ── */}
        <Section icon={AlertTriangle} title="Troubleshooting">
          <Step number="1" title="Slides stuck on 'generating'">
            <p>
              The page polls for status every 5 seconds. If a slide is stuck, try refreshing the page.
              If still stuck after 2-3 minutes, the generation may have failed — try "Regenerate Image"
              on the affected slide.
            </p>
          </Step>

          <Step number="2" title="Text hard to read">
            <p>
              Increase <strong>Gradient Density</strong> (higher = more opaque overlay behind text).
              Or change the <strong>Gradient Color</strong> to a darker value. You can also increase
              font sizes using the Headline/Body Size sliders.
            </p>
          </Step>

          <Step number="3" title="Slideshow creation failed">
            <p>
              Check that all slides have composed images (no slides still generating or failed).
              If it fails with an FFmpeg error, try again — FAL.ai occasionally has transient queue issues.
              The carousel status will show <Badge label="failed" color="bg-red-100 text-red-700" /> with
              an error message.
            </p>
          </Step>

          <Step number="4" title="Wrong aspect ratio">
            <p>
              The aspect ratio is set at creation time based on the platform. You cannot change it after
              creation. If you need a different ratio, create a new carousel for the target platform.
            </p>
          </Step>

          <Step number="5" title="Voiceover sounds rushed or cuts off">
            <p>
              The voiceover audio is generated from all slide text concatenated together. If there's a lot
              of text, the TTS may run longer than the total slideshow duration. Try:
              <strong> increasing slide duration</strong> (5s or 8s instead of 3s) or
              <strong> shortening slide text</strong>.
            </p>
          </Step>

          <Step number="6" title="Publishing fails">
            <p>
              Make sure your platform account is connected in Settings → Connected Accounts.
              OAuth tokens expire — if you connected months ago, you may need to reconnect.
              Check the browser console for specific error messages.
            </p>
          </Step>
        </Section>

        {/* ── Keyboard & Status Reference ── */}
        <Section icon={Eye} title="Status Reference">
          <div className="mt-3 text-sm text-gray-600">
            <p>Carousel status badges and what they mean:</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                ['draft', 'bg-gray-100 text-gray-600', 'Carousel created, content generated, no images yet'],
                ['generating', 'bg-purple-100 text-purple-700', 'Images are being generated right now'],
                ['assembling', 'bg-purple-100 text-purple-700', 'Slideshow/video is being assembled'],
                ['ready', 'bg-green-100 text-green-700', 'All images done, ready to publish or download'],
                ['published', 'bg-blue-100 text-blue-700', 'Posted to the target platform'],
                ['failed', 'bg-red-100 text-red-700', 'Something went wrong — check error message'],
              ].map(([status, color, desc]) => (
                <div key={status} className="flex items-start gap-2">
                  <Badge label={status} color={color} />
                  <span className="text-xs text-gray-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-gray-400">
          Carousel Builder Guide — Stitch Studios
        </div>
      </div>
    </div>
  );
}
