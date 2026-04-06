/**
 * AdDiscoveryGuidePage — guide for the Ad Intelligence feature.
 *
 * Exported as AdDiscoveryGuideContent for embedding in LearnPage (tab: 'ad-discovery').
 * Covers: Research tab, ad teardown, landing page analysis, Library, Competitors,
 * research-to-campaign pipeline, and the Research Side Panel.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Search, Eye, Bookmark, Sparkles,
  AlertTriangle, Globe, Target, Zap, TrendingUp, Users,
  ExternalLink, Trash2, Copy, Filter, LayoutGrid, Star,
  Radar, FileText,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/ad-intelligence/';

// ── Shared UI primitives ──────────────────────────────────────────────────────

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
      <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-[#2C666E]/10 border border-indigo-500/20 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <Radar className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ad Intelligence</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Research competitor ads across every major platform, analyze their landing pages, build a competitive intelligence library,
          and auto-generate campaigns that beat the competition. A full competitive research pipeline built directly into Stitch.
        </p>
      </div>

      {/* Overview */}
      <Section icon={Globe} title="Overview — What Is Ad Intelligence?" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Ad Intelligence is your competitive research command center. Enter a competitor's name or URL,
            and Stitch uses GPT-4.1 with web search to find their active ads across Meta Ad Library, Google Ads Transparency Center,
            LinkedIn Ad Library, TikTok Creative Center, and the open web. Then analyze each ad with AI, tear down their landing pages,
            and use the insights to auto-generate your own campaigns that exploit their weaknesses.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-xs mb-1">Research Tab</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Search for competitor ads by name/URL, filter by platform, analyze with AI</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-xs mb-1">Library Tab</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saved ads with favorites, filtering, and notes — your competitive swipe file</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-xs mb-1">Competitors Tab</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track competitor profiles, group their ads, monitor over time</p>
            </div>
          </div>
          <Screenshot src={`${CDN}01-research-tab.jpg`} alt="Ad Intelligence research tab" caption="The Ad Intelligence page with Research, Library, and Competitors tabs" />
        </div>
      </Section>

      {/* Research Tab */}
      <Section icon={Search} title="Research Tab — Discovering Competitor Ads">
        <Step number={1} title="Enter a Competitor">
          <p>
            Type a competitor's brand name, website URL, or paste a direct ad URL into the search bar.
            Examples: "Nike Running", "hubspot.com", or a specific Meta Ad Library URL.
          </p>
          <Screenshot src={`${CDN}05-search-input.jpg`} alt="Search input highlighted" caption="Enter a competitor name or URL to start research" />
        </Step>
        <Step number={2} title="Filter by Platform & Format">
          <p>
            Use the platform chips to focus your search: <strong>All</strong>, <strong>Meta</strong>, <strong>Google</strong>,
            <strong>LinkedIn</strong>, <strong>TikTok</strong>, or <strong>Web</strong>. Format chips let you filter
            by <strong>Image</strong>, <strong>Video</strong>, or <strong>Carousel</strong> ads.
          </p>
          <Screenshot src={`${CDN}06-platform-filters.jpg`} alt="Platform filter chips" caption="Filter by platform and ad format" />
        </Step>
        <Step number={3} title="Click Research">
          <p>
            Click the <strong>Research</strong> button. GPT-4.1 searches real ad libraries and marketing databases.
            Results appear as cards showing the ad title, platform badge, copy snippet, and engagement estimate.
          </p>
          <Screenshot src={`${CDN}02-research-button.jpg`} alt="Research button highlighted" caption="Click Research to discover competitor ads via AI web search" />
        </Step>
        <Step number={4} title="Analyze or Save Results">
          <p>
            Each result card has two actions:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Analyze</strong> — Opens a slide-over panel with a full AI teardown of the ad</li>
            <li><strong>Save</strong> — Bookmarks the ad to your Library for later reference</li>
          </ul>
        </Step>
        <Tip>
          Try searching for your direct competitors by brand name first, then broaden to industry-level searches. The more specific the query, the more targeted the results.
        </Tip>
      </Section>

      {/* Ad Teardown */}
      <Section icon={Eye} title="Ad Teardown — Deep AI Analysis">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Clicking <strong>Analyze</strong> on any ad opens a slide-over panel with a comprehensive AI breakdown:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Hook</strong> — The opening line or visual that grabs attention, and why it works</li>
            <li><strong>Copy Breakdown</strong> — Headline, body text, CTA, and overall tone dissected separately</li>
            <li><strong>Visual Style</strong> — The aesthetic approach (UGC, studio, motion graphics, etc.)</li>
            <li><strong>Target Audience</strong> — Who the ad is designed to reach</li>
            <li><strong>Emotional Triggers</strong> — Psychological levers being pulled (urgency, FOMO, aspiration, social proof)</li>
            <li><strong>Strengths</strong> — What makes this ad effective (green card)</li>
            <li><strong>Weaknesses</strong> — Where this ad falls short — gaps you can exploit (red card)</li>
            <li><strong>How to Beat This Ad</strong> — Specific, actionable tips to create something better (amber card)</li>
          </ul>
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-3 border border-indigo-200 dark:border-indigo-800 mt-3">
            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-1">Action Bar at the Bottom</p>
            <ul className="text-xs text-indigo-700 dark:text-indigo-300 list-disc pl-4 space-y-0.5">
              <li><strong>Create Campaign from This</strong> — Opens the campaign creation modal with research pre-loaded</li>
              <li><strong>Analyze Landing Page</strong> — Scrapes and analyzes the ad's destination URL</li>
              <li><strong>Save to Library</strong> — Bookmarks with the full analysis attached</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Landing Page Analysis */}
      <Section icon={FileText} title="Landing Page Analysis">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            From the ad teardown panel, click <strong>Analyze Landing Page</strong> to scrape and analyze the competitor's
            destination URL. Stitch uses Firecrawl to scrape the page, then GPT-4.1 produces a full teardown:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Page Structure</strong> — Section-by-section breakdown (Hero, Social Proof, Features, CTA, etc.)</li>
            <li><strong>Copy Analysis</strong> — Headline approach, subhead effectiveness, CTA friction removal</li>
            <li><strong>Conversion Tactics</strong> — Social proof placement, sticky CTAs, urgency mechanisms, comparison tables</li>
            <li><strong>Design Patterns</strong> — Layout, visual hierarchy, mobile responsiveness</li>
            <li><strong>Technical</strong> — Load speed, tracking pixels (Meta, Google), A/B test indicators</li>
            <li><strong>Opportunities to Beat This</strong> — Specific, actionable gaps you can exploit</li>
          </ul>
        </div>
        <Tip>
          The "Opportunities to Beat This" section is the most valuable part. It tells you exactly where the competitor is weak
          and how to exploit each gap — these feed directly into the campaign creation insights.
        </Tip>
      </Section>

      {/* Library Tab */}
      <Section icon={Bookmark} title="Library Tab — Your Competitive Swipe File">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Every ad you save builds your persistent competitive intelligence library. The Library tab lets you:
          </p>
        </div>
        <Step number={1} title="Filter Saved Ads">
          <p>
            Use filter chips to narrow by platform (All, Meta, Google, LinkedIn, TikTok) or toggle
            <strong> Favorites</strong> to see only starred ads.
          </p>
          <Screenshot src={`${CDN}03-library-tab.jpg`} alt="Library tab" caption="Your saved ad library with platform filters and favorites" />
        </Step>
        <Step number={2} title="Star Favorites">
          <p>
            Click the star icon on any saved ad to mark it as a favorite. Use the Favorites filter to quickly
            find your best competitive references.
          </p>
        </Step>
        <Step number={3} title="Re-Analyze or Delete">
          <p>
            Click <strong>Analyze</strong> on any library item to re-open the teardown panel — useful for checking
            if the ad has changed. Click the trash icon to remove it from your library.
          </p>
        </Step>
        <Tip>
          Build a library of 20-30 ads before creating campaigns. Patterns in winning ads become obvious when you see them side by side — recurring hooks, CTA styles, and visual approaches will emerge.
        </Tip>
      </Section>

      {/* Competitors Tab */}
      <Section icon={Users} title="Competitors Tab — Track Over Time">
        <Step number={1} title="Add a Competitor">
          <p>
            Enter a competitor name and optional website URL, then click <strong>Add</strong>. This creates a
            persistent profile that groups all their saved ads together.
          </p>
          <Screenshot src={`${CDN}04-competitors-tab.jpg`} alt="Competitors tab" caption="Add and track competitor profiles over time" />
        </Step>
        <Step number={2} title="View Competitor Profile">
          <p>
            Click any competitor card to see their full profile — name, website, industry, notes,
            last researched date, and all saved ads grouped together.
          </p>
        </Step>
        <Step number={3} title="Research Again">
          <p>
            Click the refresh button on a competitor profile to search for their latest ads. This updates the
            "last researched" timestamp so you can track how frequently you're monitoring each competitor.
          </p>
        </Step>
        <Step number={4} title="Create Campaign from Competitor">
          <p>
            Click <strong>Create Campaign from [Competitor]</strong> to open the campaign creation modal with
            all of that competitor's saved ads as research input.
          </p>
        </Step>
      </Section>

      {/* Research to Campaign */}
      <Section icon={Sparkles} title="Research-to-Campaign Pipeline">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The most powerful feature: turn competitive intelligence into campaigns with a single click.
            When you click <strong>Create Campaign</strong> from an ad teardown or competitor profile,
            a creation modal opens with two columns:
          </p>
        </div>
        <Step number={1} title="Campaign Config (Left Column)">
          <p>
            Standard campaign setup: name, product description, landing URL, target audience, platforms, objective, and brand kit.
            The competitor name and ad count are shown at the top for context.
          </p>
        </Step>
        <Step number={2} title="Research Intelligence (Right Column)">
          <p>
            This is where it gets powerful. The system auto-synthesizes all your saved research into:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Competitive Strategy Selector</strong> — Three options:
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong>Beat on Weaknesses</strong> — Exploit gaps in their strategy (default)</li>
                <li><strong>Match & Improve</strong> — Take what works and do it better</li>
                <li><strong>Differentiate</strong> — Go a deliberately different direction</li>
              </ul>
            </li>
            <li><strong>Insights to Apply</strong> — Checkboxes populated from the synthesis of all analyzed ads.
              Each insight is traced back to its source (which ad, which analysis).
              Check the ones you want the AI to incorporate. Uncheck the ones that don't fit.</li>
          </ul>
        </Step>
        <Step number={3} title="Generate">
          <p>
            Click the green <strong>Generate Campaign</strong> button. The system creates ad variations for each selected platform,
            with the competitive intelligence injected directly into the GPT prompts. Each variation is tagged with which insights it applied.
          </p>
        </Step>
        <Warning>
          Generation uses GPT-4.1 for copy and Nano Banana 2 for images. This costs API credits — the button shows exactly how many variations will be created before you click.
        </Warning>
      </Section>

      {/* Research Side Panel */}
      <Section icon={Eye} title="Research Panel in Campaign Editor">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            After generating a campaign from research, the Campaign Editor shows a collapsible <strong>Research</strong> panel
            on the right side. This keeps the competitive context visible while you edit variations:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Which competitor was researched and how many ads were analyzed</li>
            <li>Which insights were applied (green checkmarks)</li>
            <li>The competitor's top ad for reference</li>
            <li>A <strong>Regenerate with Different Strategy</strong> button to try a different approach</li>
          </ul>
          <p>
            You can collapse the panel to get more editing space, or expand it when you need to reference the research.
          </p>
        </div>
      </Section>

      {/* Workflow */}
      <Section icon={TrendingUp} title="Recommended Workflow">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>Here's the most effective way to use Ad Intelligence:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Identify competitors</strong> — Add 3-5 competitors in the Competitors tab</li>
            <li><strong>Research each one</strong> — Search for their ads, save 5-10 per competitor</li>
            <li><strong>Analyze the best ads</strong> — Run the AI teardown on their top performers</li>
            <li><strong>Analyze landing pages</strong> — Check where their ads link to and find conversion gaps</li>
            <li><strong>Create a campaign</strong> — Use "Beat on Weaknesses" strategy with the auto-selected insights</li>
            <li><strong>Refine in editor</strong> — Use the Research Panel to tweak variations with competitive context</li>
            <li><strong>Monitor monthly</strong> — Use "Research Again" on competitor profiles to check for new ads</li>
          </ol>
        </div>
      </Section>

      {/* Tips */}
      <Section icon={Zap} title="Tips & Best Practices">
        <div className="mt-3 space-y-3">
          <Tip>
            <strong>Competitor Research First:</strong> Search by specific brand name before broad industry terms. "Shopify" gives better results than "e-commerce platform".
          </Tip>
          <Tip>
            <strong>Cross-Platform Patterns:</strong> Search the same competitor on different platforms to spot which hooks and formats they use on each. LinkedIn ads often reveal positioning that Meta ads don't.
          </Tip>
          <Tip>
            <strong>Landing Page Gold:</strong> The landing page analysis often reveals more exploitable weaknesses than the ad itself. Generic social proof, missing guarantees, and slow load times are common gaps.
          </Tip>
          <Tip>
            <strong>Strategy Selection:</strong> "Beat on Weaknesses" works best when you've analyzed 3+ ads and found consistent gaps. "Differentiate" works best when the competitor's approach is strong but you serve a different segment.
          </Tip>
          <Tip>
            <strong>Insight Curation:</strong> Don't check all insights — pick the 3-5 most impactful ones. The AI generates better copy when given focused direction rather than a laundry list.
          </Tip>
        </div>
      </Section>
    </div>
  );
}
