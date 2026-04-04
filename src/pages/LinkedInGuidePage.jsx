/**
 * LinkedInGuidePage — interactive guide for the LinkedIn Posting Tool.
 *
 * Exported as LinkedInGuideContent for embedding in LearnPage.
 * Covers topic discovery, post creation, image customisation, and downloading creatives.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Linkedin, Search, Plus, Wand2, Sparkles,
  Image as ImageIcon, Download, Type, Palette, LayoutGrid,
  AlertTriangle, Lightbulb, Eye, RefreshCw, Send, FileText, Sliders,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/linkedin/';

// ── Shared UI primitives ──────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════

export function LinkedInGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-[#0A66C2]/10 to-[#2C666E]/10 border border-[#0A66C2]/20 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <Linkedin className="w-6 h-6 text-[#0A66C2]" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">LinkedIn Tool</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Research trending topics, generate posts with AI, create branded images, and publish directly to LinkedIn.
        </p>
      </div>

      {/* Overview */}
      <Section icon={Linkedin} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The <strong>LinkedIn Posting Tool</strong> handles the full content workflow end-to-end: discover
            topics from keyword search or article URLs, generate AI-written posts in multiple styles, create
            branded 1080&times;1080 images, and publish directly to LinkedIn — all from one place.
          </p>
          <p>
            The tool lives at <code>/linkedin</code> and uses a two-panel layout:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#2C666E]" /> Topic Queue (left)
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Discover and queue topics via keyword search or paste any article URL. Each topic is scored
                by engagement potential using GPT-4.1-mini and the Exa search API.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2C666E]" /> Post Feed (right)
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All generated posts in a scrollable feed. Click any post to open the full editor where you
                can refine text, restyle the image, and publish.
              </p>
            </div>
          </div>
        </div>
        <Screenshot
          src={CDN + '01-linkedin-overview.jpg'}
          alt="LinkedIn tool two-panel layout"
          caption="Two-panel layout: topic queue on the left, post feed on the right."
        />
      </Section>

      {/* Topic Discovery */}
      <Section icon={Search} title="Topic Discovery">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Two ways to add topics to your queue:</p>
        </div>

        <Step number="1" title="Keyword search">
          <p>
            Type a keyword or phrase in the search bar and press Enter. The AI searches for relevant
            articles via Exa and scores each result by LinkedIn engagement potential. Click
            <strong> Add</strong> on any result to queue it.
          </p>
        </Step>

        <Step number="2" title="Paste a URL">
          <p>
            Paste any article or webpage URL directly into the same input and press Enter. The AI scrapes
            the page, extracts the key topic, and adds it to your queue immediately.
          </p>
        </Step>

        <Tip>
          Each topic gets an engagement score (shown as a number on the card). Higher-scored topics
          are more likely to resonate with your LinkedIn audience based on current conversation trends.
          Topics expire after 7 days — queue the ones you want to write about soon.
        </Tip>

        <Screenshot
          src={CDN + '02-topic-search.jpg'}
          alt="Topic search bar highlighted"
          caption="Search bar in the topic queue — accepts keywords or full article URLs."
        />
      </Section>

      {/* Post Generation */}
      <Section icon={Wand2} title="Post Generation">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Click <strong>Generate Post</strong> on any queued topic to open the creation panel.
            Three GPT-4.1 post variations are generated automatically.
          </p>
        </div>

        <Step number="1" title="Choose a writing style">
          <p>
            Select <strong>All Three</strong> to generate three variations at once, or pick one style:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-0.5">Thought Leader</h6>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bold, contrarian takes that challenge conventional wisdom.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-0.5">Storyteller</h6>
              <p className="text-xs text-gray-500 dark:text-gray-400">Narrative-driven. Opens with a hook, builds to a lesson.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-0.5">Educator</h6>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leads with data, stats, and concrete evidence.</p>
            </div>
          </div>
        </Step>

        <Step number="2" title="Brand Kit & image options">
          <p>
            Optionally select a <strong>Brand Kit</strong> to inject your brand voice and include your
            logo. Choose an <strong>image layout</strong> template (controls text overlay position) and
            a <strong>visual style</strong> preset to guide the AI background image.
          </p>
        </Step>

        <Step number="3" title="Generate">
          <p>
            Click <strong>Generate</strong>. All three variations are created in one pass — pick the one
            that fits, or mix elements from each in the post editor.
          </p>
        </Step>

        <Tip>
          Generating all three styles at once is the fastest way to find your angle. Different styles
          tend to perform differently by industry — Thought Leader works well for tech and strategy,
          Storyteller for consulting and culture, Educator for finance and data-heavy topics.
        </Tip>

        <Screenshot
          src={CDN + '03-create-post-modal.jpg'}
          alt="Create Post modal with writing style and image options"
          caption="The post generation panel — writing style, Brand Kit, image layout, and visual style selectors."
        />
      </Section>

      {/* Image Generation */}
      <Section icon={ImageIcon} title="Image Generation">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Images are generated at post creation time, not at publish time. This lets you review and
            adjust before committing.
          </p>
          <p>
            The image pipeline: GPT-5-mini extracts a punchy headline excerpt from the post text
            &rarr; Nano Banana 2 generates the AI background image &rarr; Satori composites the
            headline and brand elements into a <strong>branded 1080&times;1080 layout</strong>.
          </p>
          <p>
            The result is stored in two layers: the raw AI background (<code>base_image_url</code>)
            and the final composed image. This separation is what makes zero-cost restyling possible.
          </p>
        </div>
        <Screenshot
          src={CDN + '04-post-with-image.jpg'}
          alt="Generated post with branded image in the feed"
          caption="A generated post in the feed — AI background image with text overlay composited by Satori."
        />
      </Section>

      {/* Post Editor */}
      <Section icon={Sliders} title="Post Editor">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Click any post in the feed to open the full editor at <code>/linkedin/:id</code>.
          </p>
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-4 mb-2">Text editing</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            The post body is fully editable (3,000 character limit). Changes auto-save on blur.
            Click <strong>Regenerate Text</strong> to get a fresh variation in the same writing style.
          </p>
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-4 mb-2">Style overrides</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">Fine-tune the image appearance with these controls:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Layout template</strong> — switch between ~17 text layout styles</li>
            <li><strong>Gradient colour</strong> — change the overlay scrim colour via hex picker</li>
            <li><strong>Gradient density</strong> — opacity of the scrim (20–100%)</li>
            <li><strong>Font family</strong> — Inter, Playfair Display, JetBrains Mono, or Caveat</li>
            <li><strong>Headline scale</strong> — resize headline text independently (60–160%)</li>
            <li><strong>Body text scale</strong> — resize body text independently (60–160%)</li>
          </ul>
          <p className="mt-2">
            After adjusting any style setting, click <strong>Recompose</strong> to apply changes.
            This reuses the existing background — no new AI generation required.
          </p>
        </div>

        <Screenshot
          src={CDN + '05-post-editor.jpg'}
          alt="Post editor with style controls visible"
          caption="The post editor — text editing area on the left, image preview and style controls on the right."
        />
      </Section>

      {/* Recompose */}
      <Section icon={RefreshCw} title="Recompose (Zero-Cost Restyling)">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The <strong>Recompose</strong> button re-renders the text layout overlay on top of the
            existing background image using your current style settings. No AI generation happens —
            it's instant and free.
          </p>
          <p>
            Because the raw background is stored separately in <code>base_image_url</code>, you can
            try as many layout and colour combinations as you like without burning any credits.
            Only clicking <strong>New Image</strong> triggers a new AI generation.
          </p>
        </div>
        <Tip>
          Use Recompose to quickly iterate: change the layout template, update the gradient colour to
          match your brand, scale the headline up — then Recompose and compare. What you see is exactly
          what gets saved and downloaded.
        </Tip>
        <Screenshot
          src={CDN + '06-recompose.jpg'}
          alt="Recompose button highlighted in the post editor"
          caption="Recompose applies style changes to the existing background image instantly — no AI cost."
        />
      </Section>

      {/* Publishing */}
      <Section icon={Send} title="Publishing to LinkedIn">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Publish posts directly to LinkedIn from the editor. Requires a connected LinkedIn account.
          </p>
        </div>

        <Step number="1" title="Connect your LinkedIn account">
          <p>
            Go to <strong>Settings &rsaquo; Accounts</strong> (<code>/settings/accounts</code>) and
            click <strong>Connect LinkedIn</strong>. You'll be redirected to LinkedIn to authorise.
          </p>
        </Step>

        <Step number="2" title="Publish from the editor">
          <p>
            Once connected, click <strong>Publish</strong> in the post editor to post the text and
            image to LinkedIn immediately. The post status updates to "Published" with a link to
            the live post.
          </p>
        </Step>

        <Warning>
          Publishing is immediate — there is no draft or scheduling step on LinkedIn's side. Make
          sure the post text and image are finalised before clicking Publish.
        </Warning>
        <Warning>
          Users who connected LinkedIn before April 2026 must reconnect — OAuth scopes were upgraded
          to include ad permissions (<code>r_ads w_ads r_ads_reporting</code>).
        </Warning>

        <Screenshot
          src={CDN + '07-publish.jpg'}
          alt="Publish button in the post editor"
          caption="The Publish button posts the text and branded image to LinkedIn in one click."
        />
      </Section>

      {/* Downloading */}
      <Section icon={Download} title="Downloading the Image">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Save the branded 1080&times;1080 image locally for use in other tools or to post
            manually via LinkedIn's native uploader.
          </p>
        </div>

        <Step number="1" title="Open the post editor">
          <p>Click any post in the feed to open it at <code>/linkedin/:id</code>.</p>
        </Step>

        <Step number="2" title="Click Download Image">
          <p>
            Click <strong>Download Image</strong> below the image preview. The composed PNG is saved
            directly to your computer, including all current style overrides (layout, colour, font,
            text scale).
          </p>
        </Step>

        <Tip>
          What you see in the editor is exactly what you download — style changes applied via
          Recompose are reflected in the downloaded file.
        </Tip>

        <Screenshot
          src={CDN + '08-download.jpg'}
          alt="Download Image button highlighted"
          caption="Download Image saves the final composed PNG with all style overrides applied."
        />
      </Section>

      {/* Tips */}
      <Section icon={Lightbulb} title="Tips & Best Practices">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong>Generate all three styles</strong> — different writing styles perform differently
              by industry. Test Thought Leader for tech, Storyteller for consulting, Educator for finance.
            </li>
            <li>
              <strong>Edit the post text</strong> — AI-generated posts are a strong starting point.
              Adding your personal perspective or a specific anecdote consistently improves engagement.
            </li>
            <li>
              <strong>Try Dark Cinematic layout</strong> — high-contrast text on dark overlays tends
              to stop the scroll on LinkedIn's light-themed feed.
            </li>
            <li>
              <strong>Use a Brand Kit</strong> — it adds your logo automatically and aligns the
              tone with your brand voice. Consistent branding builds recognition over time.
            </li>
            <li>
              <strong>Recompose is free</strong> — adjusting colours, fonts, and layout via Recompose
              uses no AI credits. Experiment freely before deciding on the final look.
            </li>
            <li>
              <strong>Download before publishing</strong> — if you want to post manually or use a
              scheduler, download the image and copy the post text directly from the editor.
            </li>
          </ul>
        </div>
      </Section>

    </div>
  );
}

export default function LinkedInGuidePage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <LinkedInGuideContent />
    </div>
  );
}
