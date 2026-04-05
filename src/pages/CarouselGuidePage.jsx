/**
 * CarouselGuidePage — guide for the Carousel Builder tool.
 * Accessible at /learn?tab=carousels (redirected from /carousel-educate).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Play, Settings2, Image as ImageIcon,
  Sparkles, Film, Send, Palette, Type, Sliders, Music, Volume2,
  Layers, FileText, Monitor, Smartphone, Globe, AlertTriangle, Plus,
  LayoutGrid, Eye, CheckCircle2,
} from 'lucide-react';

// ── Expandable Section ──────────────────────────────────────────────────────

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

// ── Step card ────────────────────────────────────────────────────────────────

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

// ── Tip callout ──────────────────────────────────────────────────────────────

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

// ── Warning callout ──────────────────────────────────────────────────────────

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Screenshot ───────────────────────────────────────────────────────────────

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/carousels/';

function Screenshot({ file, alt, caption }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <img src={CDN + file} alt={alt} className="w-full block" />
      {caption && (
        <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700">
          {caption}
        </p>
      )}
    </div>
  );
}

// ── Inline badge ─────────────────────────────────────────────────────────────

function Badge({ icon: Icon, label, color = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export function CarouselGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-[#2C666E]/10 to-[#2C666E]/5 border border-[#2C666E]/20 px-6 py-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Carousel Builder</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create branded carousel posts for LinkedIn, Instagram, Facebook, and TikTok.
        </p>
      </div>

      {/* ── Overview ── */}
      <Section icon={LayoutGrid} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            A carousel is a series of swipeable slides — each with a headline, body text, and an
            AI-generated background image — composed with your brand colors, logo, and typography.
            One creation flow produces platform-specific versions: Instagram gets portrait (4:5),
            LinkedIn and Facebook get square (1:1), TikTok gets vertical (9:16).
          </p>
          <p>
            Selecting multiple platforms at creation time produces a <strong>separate carousel for each</strong>,
            with platform-optimal aspect ratios and tailored content density.
          </p>
          <Screenshot file="01-carousels-list.jpg" alt="Carousel list page" caption="The Carousels list — click New Carousel to start." />
        </div>
      </Section>

      {/* ── Creating a Carousel ── */}
      <Section icon={Plus} title="Creating a Carousel">
        <Step number="1" title='Click "New Carousel"'>
          <p>From the Carousels list (<code>/carousels</code>), click <strong>New Carousel</strong> in the top-right corner to open the creation modal.</p>
        </Step>

        <Step number="2" title="Select platforms">
          <p>
            Choose one or more platforms — <strong>Instagram, LinkedIn, Facebook, TikTok</strong>.
            Each platform selected produces its own carousel with the correct aspect ratio and
            platform-tailored content.
          </p>
        </Step>

        <Step number="3" title="Add your topic">
          <p>
            Enter a topic or product description. You can also paste a Blog URL to pull content
            from an existing article.
          </p>
        </Step>

        <Step number="4" title='Click "Create Carousel"'>
          <p>
            Content generation starts <strong>automatically on creation</strong> — there is no separate
            "Generate Content" step. A 2-stage GPT pipeline runs: research synthesis first, then slide
            writing. A loading spinner shows while generation is in progress.
          </p>
          <Tip>
            Content generation typically completes in 30–60 seconds. While it runs you can see a loading
            spinner in the editor. You don't need to wait on the creation modal — click Create and head
            straight to the editor.
          </Tip>
        </Step>

        <Screenshot file="02-new-carousel-modal.jpg" alt="New Carousel modal" caption="New Carousel modal — select platforms, add topic, then click Create Carousel." />
      </Section>

      {/* ── Slide Editor ── */}
      <Section icon={LayoutGrid} title="Slide Editor">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            After creation you land in the <strong>Carousel Editor</strong> — a two-panel layout:
            a slide filmstrip on the left, and the slide detail editor on the right.
          </p>
          <p>
            Click any slide in the filmstrip to select it. The right panel shows that slide's
            headline, body text, and image prompt fields. Changes are <strong>saved automatically</strong> when
            you click away from a field.
          </p>
          <Screenshot file="03-slide-editor.jpg" alt="Carousel slide editor" caption="Two-panel editor — filmstrip left, slide detail and preview right." />
        </div>
      </Section>

      {/* ── Style Templates ── */}
      <Section icon={Palette} title="Style Templates">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            There are <strong>8 carousel style templates</strong>, selected in the Create modal.
            Each template controls the scrim type and opacity, text position and alignment, and
            font sizing hierarchy.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              ['Bold Editorial', 'Bottom gradient, bold left-aligned headlines'],
              ['Minimal Center', 'Light overlay, centered text, clean look'],
              ['Dark Cinematic', 'Heavy dark scrim, dramatic large text'],
              ['Magazine', 'Italic centered headlines, elegant overlay'],
              ['Clean Bottom Bar', 'Solid dark bar, clean left-aligned text'],
              ['Top Headline', 'Top gradient, image dominates bottom'],
              ['Text Only', 'No background image, solid dark with centered text'],
              ['Side Strip', 'Left dark strip, text vertically centered'],
            ].map(([name, desc]) => (
              <div key={name} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
          <Screenshot file="04-style-templates.jpg" alt="Style template selector" caption="Style template selection in the Create modal — each template has a distinct text layout." />
          <Tip>
            Template choice has the biggest visual impact. Try <strong>Bold Editorial</strong> for
            high-contrast social posts, <strong>Minimal Center</strong> for a clean/editorial look,
            or <strong>Dark Cinematic</strong> for a dramatic branded feel.
          </Tip>
        </div>
      </Section>

      {/* ── Style Overrides ── */}
      <Section icon={Settings2} title="Style Overrides">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Click the <strong>gear icon</strong> in the editor toolbar to reveal the Style Overrides bar.
            These controls fine-tune the look on top of the chosen template — changes apply when you
            generate or regenerate images.
          </p>
        </div>

        <Step number="1" title="Gradient Color">
          <p>Sets the color of the scrim/gradient overlay. Defaults to black or your brand primary color. Click the swatch to pick any color; click <em>reset</em> to restore the default.</p>
        </Step>

        <Step number="2" title="Gradient Density">
          <p>
            Controls overlay opacity — <strong>20%</strong> is very subtle (background shows through clearly),
            <strong>100%</strong> is the template default. Lower values let the background image breathe;
            higher values ensure text legibility over busy images.
          </p>
        </Step>

        <Step number="3" title="Text Color">
          <p>Overrides headline and body text color. Defaults to white. Useful when using a light gradient where white text lacks contrast.</p>
        </Step>

        <Step number="4" title="Headline / Body Scale">
          <p>Scales text size relative to the template default. Range: <strong>60%–160%</strong>. Useful for short punchy headlines (scale up) or slides with lots of body text (scale down).</p>
        </Step>

        <Step number="5" title="Font Family">
          <p>Choose from Inter (default sans-serif), Playfair Display (elegant serif), JetBrains Mono (tech/code), or Caveat (handwritten). Any non-Inter font uses the Satori compositor for proper WOFF font rendering.</p>
        </Step>

        <Screenshot file="05-style-overrides.jpg" alt="Style overrides panel" caption="Style overrides bar — Gradient Color, Density, Text Color, scale sliders, and font selector." />
      </Section>

      {/* ── Output Modes ── */}
      <Section icon={Film} title="Two Output Modes">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h5 className="font-semibold text-purple-900 dark:text-purple-200 text-sm mb-1 flex items-center gap-2">
                <Film className="w-4 h-4" /> Video Carousel
              </h5>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Each slide is AI-animated by a video generation model, then assembled into a
                final video. Best for LinkedIn and Instagram where motion commands attention.
                Takes longer and costs more than Slideshow.
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h5 className="font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1 flex items-center gap-2">
                <Play className="w-4 h-4" /> Slideshow
              </h5>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Static composed images assembled into a video with optional ElevenLabs
                voiceover narration. Faster and cheaper than Video Carousel. Great for
                TikTok and Facebook. Choose 3s, 5s, or 8s per slide.
              </p>
            </div>
          </div>
          <Screenshot file="06-output-type.jpg" alt="Output type selector" caption="Create Slideshow and Publish buttons in the editor toolbar — choose your output mode." />
          <Warning>
            Slideshow creation is async — the backend assembles the video in the background.
            Status changes from <Badge label="assembling" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" /> to <Badge label="ready" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />. The frontend polls every few seconds until ready — you don't need to refresh.
          </Warning>
        </div>
      </Section>

      {/* ── AI Image Generation ── */}
      <Section icon={ImageIcon} title="AI Image Generation">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Each slide gets an AI-generated background image matching its visual description.
            <strong> Nano Banana 2</strong> generates the image at the carousel's target resolution
            (e.g. 1080×1080 for Facebook). The <strong>Satori compositor</strong> then overlays your
            text, scrim, and logo in the chosen style template.
          </p>
          <p>
            After content generation completes, click <strong>Generate Images</strong> in the toolbar
            to generate backgrounds for all slides at once. To regenerate a single slide, edit its
            image prompt in the right panel then click <strong>Regenerate Image</strong>.
          </p>
          <Tip>
            The visual style you chose at creation time (from the 123-style StyleGrid) influences
            the image generation prompts throughout. Changing a slide's image prompt overrides the
            scene but the visual style still applies.
          </Tip>
        </div>
      </Section>

      {/* ── Publishing ── */}
      <Section icon={Send} title="Publishing">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Once all slide images are generated, the <strong>Publish</strong> button appears in the
            toolbar. Each carousel publishes to its own platform — the format is automatically chosen
            for that platform (carousel album for Instagram/Facebook, document upload for LinkedIn,
            photo carousel for TikTok).
          </p>
          <p>
            Connect your social accounts first at <strong>Settings → Connected Accounts</strong> (<code>/settings/accounts</code>).
          </p>
          <Screenshot file="07-publish-options.jpg" alt="Publish button" caption="Publish button in the editor toolbar — posts directly to the carousel's platform." />
          <Warning>
            Publishing is a one-way action. Once posted you'll need to delete the post from the
            platform itself to remove it — there is no unpublish.
          </Warning>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
        Carousel Builder Guide — Stitch Studios
      </div>
    </div>
  );
}

export default function CarouselGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/carousels')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Carousel Builder Guide</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Create branded carousel posts for LinkedIn, Instagram, Facebook, and TikTok</p>
          </div>
        </div>
      </div>

      <CarouselGuideContent />
    </div>
  );
}
