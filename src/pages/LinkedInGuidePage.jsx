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

function Badge({ icon: Icon, label, color = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export function LinkedInGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* ── Overview ── */}
      <Section icon={Linkedin} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The <strong>LinkedIn Posting Tool</strong> creates AI-written LinkedIn posts with
            branded images from any topic URL or keyword search. It handles the full workflow:
            find a topic, generate posts in multiple writing styles, customise the image,
            and publish directly to LinkedIn.
          </p>
          <p>
            The tool lives at <code>/linkedin</code> and has a two-panel layout:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#2C666E]" /> Topic Queue (left)
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Discover and queue topics to write about. Paste a URL directly or search by keyword
                to find relevant articles scored by relevance.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2C666E]" /> Post Feed (right)
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All your generated posts. Click any post to open the full editor where you can
                refine text, customise the image, and publish.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Finding Topics ── */}
      <Section icon={Search} title="Finding Topics">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>Two ways to add topics to your queue:</p>
        </div>

        <Step number="1" title="Paste a URL">
          <p>
            Paste any article or webpage URL directly into the topic input. The AI will scrape
            the page, extract the key content, and score it for LinkedIn relevance. Great for
            sharing industry news, blog posts, or case studies.
          </p>
        </Step>

        <Step number="2" title="Keyword search">
          <p>
            Type a keyword or phrase to search for relevant articles. Results are scored by
            LinkedIn relevance using GPT and Exa API. Click <strong>"Add"</strong> on any
            result to add it to your queue.
          </p>
        </Step>

        <Tip>
          Topics stay in your queue until you generate posts from them. You can build up a
          backlog of topics and work through them when ready.
        </Tip>
      </Section>

      {/* ── Creating Posts ── */}
      <Section icon={Wand2} title="Creating Posts">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Select a topic from the queue and click <strong>"Create Posts"</strong> to open
            the generation modal. You have several options to control the output:
          </p>
        </div>

        <Step number="1" title="Choose a writing style">
          <p>
            Select one style or <strong>"All Three"</strong> to generate three variations at once:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-0.5">Contrarian</h6>
              <p className="text-xs text-gray-500 dark:text-gray-400">Challenges conventional wisdom. Bold, debate-provoking takes.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-0.5">Story-led</h6>
              <p className="text-xs text-gray-500 dark:text-gray-400">Narrative-driven. Opens with a hook, builds to a lesson.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <h6 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-0.5">Data Punch</h6>
              <p className="text-xs text-gray-500 dark:text-gray-400">Leads with numbers, stats, and concrete evidence.</p>
            </div>
          </div>
        </Step>

        <Step number="2" title="Select post format (optional)">
          <p>
            Choose a specific format or leave on <strong>"Auto"</strong>. Options include
            educational listicle, data infographic, comparison, myth vs reality,
            problem-solution, and more. Auto picks the best format for your writing style.
          </p>
        </Step>

        <Step number="3" title="Choose image layout">
          <p>
            Select from <strong>8 image layout templates</strong> that control how text overlays
            appear on the branded image: Bold Editorial, Minimal Center, Dark Cinematic,
            Magazine, Clean Bottom, Top Headline, Text Only, or Side Strip.
          </p>
        </Step>

        <Step number="4" title="Select visual style (optional)">
          <p>
            Pick an aesthetic preset to guide the AI image generation — abstract, photographic,
            illustrated, etc. This controls the look of the background image, not the text layout.
          </p>
        </Step>

        <Step number="5" title="Select Brand Kit (optional)">
          <p>
            Link a Brand Kit to include your logo on the image and align the tone with your
            brand voice.
          </p>
        </Step>

        <Step number="6" title="Generate">
          <p>
            Click <strong>"Generate"</strong>. The AI produces the post text, extracts a headline
            excerpt for the image, generates an AI background image, and composites
            everything into a branded 1080×1080 image. This typically takes 15–30 seconds.
          </p>
        </Step>

        <Tip>
          Selecting <strong>"All Three"</strong> gives you three different takes on the same
          topic. Pick the one that resonates, or mix elements from each in the editor.
        </Tip>
      </Section>

      {/* ── The Post Editor ── */}
      <Section icon={Sliders} title="The Post Editor">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Click any post in the feed to open the full editor at <code>/linkedin/:id</code>.
            Here you can refine everything before publishing or downloading.
          </p>
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-4 mb-2">Text editing</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            The post body is fully editable in a textarea (3,000 character limit). Changes auto-save
            when you click away. You can also click <strong>"Regenerate Text"</strong> to get a
            completely new version in the same writing style.
          </p>
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-4 mb-2">Image controls</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Two image actions are available:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#2C666E]" /> Recompose
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Re-renders the text overlay on the <strong>existing</strong> background image
                with your updated style settings. Instant — no AI generation cost.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#2C666E]" /> New Image
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Generates a completely new AI background image and re-composites the overlay.
                Use this when you want a different visual entirely.
              </p>
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-4 mb-2">Style overrides</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Fine-tune the image appearance with these controls:</p>
          <ul className="list-disc list-inside space-y-1 text-xs mt-2">
            <li><strong>Layout template</strong> — switch between 8 text layout styles</li>
            <li><strong>Gradient colour</strong> — change the overlay scrim colour via hex picker</li>
            <li><strong>Font family</strong> — choose from Inter, Playfair Display, JetBrains Mono, or Caveat</li>
            <li><strong>Headline size</strong> — scale from 60% to 160%</li>
            <li><strong>Body text size</strong> — scale from 60% to 160%</li>
          </ul>
          <p className="mt-2">
            After adjusting any style setting, click <strong>"Recompose"</strong> to see the changes
            applied to the image. This uses the existing background — no regeneration needed.
          </p>
        </div>
      </Section>

      {/* ── Downloading Creatives ── */}
      <Section icon={Download} title="Downloading Creatives">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Each post's branded image can be downloaded directly from the post editor.
          </p>
        </div>

        <Step number="1" title="Open the post editor">
          <p>Click on any generated post in the feed to open it at <code>/linkedin/:id</code>.</p>
        </Step>

        <Step number="2" title="Download the image">
          <p>
            Below the image preview, click the <strong>"Download Image"</strong> link. This saves
            the branded 1080×1080 PNG directly to your computer, named
            <code> linkedin-post-{'{number}'}.png</code>.
          </p>
        </Step>

        <Tip>
          The downloaded image includes all your style overrides — gradient colour, font, text
          sizing, layout template. What you see in the editor is exactly what you download.
        </Tip>
        <Tip>
          If you want to change the image before downloading, use <strong>"Recompose"</strong>
          to update the overlay or <strong>"New Image"</strong> for a fresh background, then download.
        </Tip>
      </Section>

      {/* ── Publishing to LinkedIn ── */}
      <Section icon={Send} title="Publishing to LinkedIn">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            You can publish posts directly to LinkedIn from the editor. This requires a
            connected LinkedIn account.
          </p>
        </div>

        <Step number="1" title="Connect LinkedIn">
          <p>
            Go to <strong>Settings &rsaquo; Accounts</strong> (<code>/settings/accounts</code>)
            and click <strong>"Connect LinkedIn"</strong>. You'll be redirected to LinkedIn to
            authorise the connection.
          </p>
        </Step>

        <Step number="2" title="Publish from the editor">
          <p>
            Once connected, the <strong>"Publish"</strong> button appears in the post editor.
            Click it to send the post with the branded image to LinkedIn. The post status
            updates to "Published" and a link to view the live post appears.
          </p>
        </Step>

        <Warning>
          Publishing is immediate — there's no draft or scheduling step on LinkedIn's side.
          Make sure the post text and image are finalised before clicking Publish.
        </Warning>
      </Section>

      {/* ── Tips & Best Practices ── */}
      <Section icon={Lightbulb} title="Tips & Best Practices">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong>Use "All Three" styles</strong> — different writing styles perform differently
              by industry. Test contrarian takes for tech, story-led for consulting, data punch
              for finance.
            </li>
            <li>
              <strong>Edit the post text</strong> — AI-generated posts are a strong starting point,
              but adding your personal perspective or a specific anecdote always improves engagement.
            </li>
            <li>
              <strong>Try the Dark Cinematic layout</strong> — high contrast text on dark overlays
              tends to stop the scroll on LinkedIn's light-themed feed.
            </li>
            <li>
              <strong>Use a Brand Kit</strong> — it adds your logo automatically and aligns the
              tone with your brand voice. Consistent branding builds recognition.
            </li>
            <li>
              <strong>Download before publishing</strong> — if you want to post manually or use
              a scheduler, download the image and copy the post text.
            </li>
            <li>
              <strong>Recompose is free</strong> — adjusting colours, fonts, and layout via
              Recompose doesn't use any AI credits. Experiment freely.
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
