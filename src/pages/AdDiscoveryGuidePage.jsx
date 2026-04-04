/**
 * AdDiscoveryGuidePage — interactive guide for the Ad Discovery / Spy Tool.
 *
 * Exported as AdDiscoveryGuideContent for embedding in LearnPage.
 * Covers ad search, analysis, library saving, and clone-to-campaign workflow.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Search, Eye, Bookmark, Sparkles,
  AlertTriangle, Globe, Target, Zap, TrendingUp, Users,
  ExternalLink, Trash2, Copy, Filter, LayoutGrid,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/ad-discovery/';

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

export function AdDiscoveryGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-[#2C666E]/10 border border-purple-500/20 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ad Discovery</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Search for winning ads across every major platform, analyze their strategy with AI, save the best to your library,
          and clone them into your own branded campaigns. A competitive intelligence tool built directly into Stitch.
        </p>
      </div>

      {/* Overview */}
      <Section icon={Globe} title="Overview — What Is Ad Discovery?" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Ad Discovery is your built-in ad spy tool. Instead of browsing Meta Ad Library or TikTok Creative Center manually,
            Stitch uses GPT-4.1 with web search to find high-performing ads in any niche, on any platform — then structures
            the results for instant analysis.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-xs mb-1">Two Tabs</p>
              <p className="text-xs text-gray-500 dark:text-gray-400"><strong>Search</strong> — find ads by niche, keywords, platform</p>
              <p className="text-xs text-gray-500 dark:text-gray-400"><strong>Library</strong> — your saved bookmarks</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-xs mb-1">AI-Powered</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">GPT-4.1 web search finds real ads from Meta Ad Library, TikTok Creative Center, Google Ads Transparency, and marketing databases</p>
            </div>
          </div>
          <Screenshot src={`${CDN}01-search-panel.jpg`} alt="Ad Discovery search panel" caption="The Ad Discovery dashboard with niche, keyword, and platform filters" />
        </div>
      </Section>

      {/* Searching for Ads */}
      <Section icon={Search} title="Searching for Winning Ads">
        <Step number={1} title="Select a Niche">
          <p>
            Choose from 24 niches — the 20 Shorts niches plus E-commerce, SaaS, Real Estate, and Beauty.
            The niche focuses the AI search on the right industry vertical.
          </p>
        </Step>
        <Step number={2} title="Add Keywords (Optional)">
          <p>
            Type specific keywords to narrow results. Examples: "fitness app onboarding", "SaaS free trial", "luxury skincare UGC".
            Leave blank for a broad niche search.
          </p>
        </Step>
        <Step number={3} title="Filter by Platform">
          <p>
            Choose a specific platform (Facebook, Instagram, LinkedIn, TikTok, Google, YouTube) or leave on "All Platforms"
            for cross-platform results.
          </p>
        </Step>
        <Step number={4} title="Hit Search">
          <p>
            Click the <strong>Search</strong> button. GPT-4.1 searches real ad libraries and marketing databases.
            Results appear as cards with title, platform badge, advertiser, description, and estimated engagement.
          </p>
          <Screenshot src={`${CDN}02-search-highlight.jpg`} alt="Search button highlighted" caption="Click Search to find ads using GPT-4.1 web search" />
        </Step>
        <Tip>
          Try combining a niche with specific keywords for the best results. For example: Niche = "SaaS" + Keywords = "project management tool" gives much more targeted results than either alone.
        </Tip>
      </Section>

      {/* Analyzing Ads */}
      <Section icon={Eye} title="Analyzing an Ad">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Every search result has an <strong>Analyze</strong> button. Click it to get a deep AI breakdown of the ad's strategy.
            The analysis panel shows:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Hook</strong> — The opening line or visual that grabs attention</li>
            <li><strong>Copy Breakdown</strong> — Headline, body text, and CTA dissected separately</li>
            <li><strong>Visual Style</strong> — The aesthetic approach (UGC, polished studio, motion graphics, etc.)</li>
            <li><strong>Target Audience</strong> — Who the ad is designed to reach</li>
            <li><strong>Emotional Triggers</strong> — The psychological levers being pulled (urgency, FOMO, aspiration, etc.)</li>
            <li><strong>Strengths & Weaknesses</strong> — What works and what could be improved</li>
            <li><strong>Clone Suggestions</strong> — Specific ideas for adapting this ad to your brand</li>
          </ul>
        </div>
        <Tip>
          The analysis is powered by GPT-4.1 with structured output (Zod schema), so every field is guaranteed to be present and well-formatted.
        </Tip>
      </Section>

      {/* Saving to Library */}
      <Section icon={Bookmark} title="Saving to Your Library">
        <Step number={1} title="Bookmark an Ad">
          <p>
            Click the <strong>Save</strong> (bookmark) icon on any search result to add it to your personal library.
            The icon fills in to show it's saved.
          </p>
        </Step>
        <Step number={2} title="Switch to Library Tab">
          <p>
            Click the <strong>Library</strong> tab at the top to see all your saved ads.
            Library entries persist in the database and are available across sessions.
          </p>
          <Screenshot src={`${CDN}03-library-tab.jpg`} alt="Library tab" caption="Your saved ad library — persistent across sessions" />
        </Step>
        <Step number={3} title="Manage Your Library">
          <p>
            From the library, you can <strong>Analyze</strong> any saved ad again, <strong>Clone with My Brand</strong> to create your own version,
            or <strong>Delete</strong> entries you no longer need.
          </p>
        </Step>
      </Section>

      {/* Clone to Campaign */}
      <Section icon={Copy} title="Clone with My Brand">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The most powerful feature: after analyzing an ad, click <strong>Clone with My Brand</strong> to use the analysis
            as a starting point for your own campaign in the Ads Manager.
          </p>
          <p>
            This stores the ad's analysis (hook, copy structure, visual style, audience) as a "clone recipe" and navigates
            you to the Ads Manager with that context pre-loaded. You get the strategy of a winning ad adapted to your brand.
          </p>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">Clone Recipe Includes:</p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc pl-4 space-y-0.5">
              <li>Hook structure and opening line pattern</li>
              <li>Copy framework (headline/body/CTA format)</li>
              <li>Visual style direction</li>
              <li>Target audience profile</li>
              <li>Emotional trigger strategy</li>
            </ul>
          </div>
        </div>
        <Warning>
          Cloning captures the <em>strategy</em>, not the exact copy. You still write original content for your brand — the clone recipe is a structural blueprint.
        </Warning>
      </Section>

      {/* Platform Support */}
      <Section icon={Filter} title="Supported Platforms & Niches">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p><strong>Platforms:</strong> Facebook, Instagram, LinkedIn, TikTok, Google, YouTube — or search all at once.</p>
          <p><strong>24 Niches:</strong></p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['AI/Tech', 'Finance', 'Motivation', 'Horror', 'History', 'True Crime', 'Science', 'Relationships',
              'Fitness', 'Gaming', 'Conspiracy', 'Business', 'Food', 'Travel', 'Psychology', 'Space',
              'Animals', 'Sports', 'Education', 'Paranormal', 'E-commerce', 'SaaS', 'Real Estate', 'Beauty'
            ].map(n => (
              <span key={n} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300">{n}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* Tips & Best Practices */}
      <Section icon={Sparkles} title="Tips & Best Practices">
        <div className="mt-3 space-y-3">
          <Tip>
            <strong>Competitor Research:</strong> Use specific brand or product keywords to find what your competitors are running.
          </Tip>
          <Tip>
            <strong>Cross-Platform Patterns:</strong> Search the same niche on different platforms to spot which hooks and formats work best on each.
          </Tip>
          <Tip>
            <strong>Build a Swipe File:</strong> Save 20-30 ads to your library before creating campaigns. Patterns in winning ads become obvious when you see them side by side.
          </Tip>
          <Tip>
            <strong>Analyze Before Cloning:</strong> Always run the full analysis first — the clone recipe is much richer when it has the structured breakdown to work from.
          </Tip>
        </div>
      </Section>
    </div>
  );
}
