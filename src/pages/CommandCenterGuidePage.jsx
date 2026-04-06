/**
 * CommandCenterGuidePage — comprehensive guide for the AI Marketing Command Center.
 *
 * Covers: chat bubble, braindumping, AI campaign planning, review dashboard,
 * Gantt/Calendar views, campaign lifecycle, approve/reject/edit workflow.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Bot, Zap, LayoutGrid, BarChart3,
  Calendar, Send, Plus, History, Check, X, RefreshCw, ExternalLink,
  Clock, Hammer, CheckCircle, Film, FileText, Megaphone,
  AlertTriangle, Lightbulb, BookOpen, MessageSquare,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/command-center/';

// ── Expandable Section ──

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  return (
    <div id={sectionId} data-guide-section={title} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden scroll-mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-purple-600 shrink-0" />
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
      <div className="shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">{number}</div>
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

// ── Info callout ──

function InfoBox({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Screenshot ──

function Screenshot({ file, alt, caption }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <img
        src={`${CDN}${file}`}
        alt={alt}
        className="w-full block"
        loading="lazy"
      />
      {caption && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 italic">
          {caption}
        </div>
      )}
    </div>
  );
}

// ── Main guide content ──

export function CommandCenterGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-purple-600/10 dark:bg-purple-600/20 rounded-xl">
            <Bot className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Marketing Command Center</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Your AI marketing team — braindump ideas and let AI build multi-platform campaigns</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
          The Command Center is the orchestration layer for Stitch. Instead of manually navigating to each tool,
          you describe what you want in plain English — a "braindump" — and the AI plans a complete multi-platform campaign,
          builds the content using all of Stitch's tools, and presents everything in a review dashboard for your approval.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <MessageSquare className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-purple-800 dark:text-purple-300">Chat & Plan</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <Hammer className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-800 dark:text-green-300">Auto-Build</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
            <CheckCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Review & Approve</p>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <Section icon={Zap} title="Getting Started" defaultOpen={true}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          There are two ways to access the Command Center:
        </p>

        <Step number={1} title="The Chat Bubble">
          <p>
            A floating purple bubble appears in the bottom-right corner of every page in Stitch.
            Click it to open the AI Marketing Team chat panel. This is where you braindump your ideas.
          </p>
          <Screenshot file="05-chat-bubble.jpg" alt="Chat bubble in the bottom-right corner" caption="The purple chat bubble is always available — on Studio, Shorts, Storyboards, and every other page." />
        </Step>

        <Step number={2} title="The Sidebar Link">
          <p>
            In the Studio page, expand the <strong>Social Tools</strong> section in the left sidebar.
            The <strong>Command Center</strong> link (purple) is the first item — click it to go to the review dashboard.
          </p>
          <Screenshot file="08-sidebar-link.jpg" alt="Command Center in the sidebar" caption="The Command Center link sits at the top of Social Tools, highlighted in purple." />
        </Step>

        <Step number={3} title="The Dashboard">
          <p>
            The Command Center dashboard at <code>/command-center</code> shows all your campaigns,
            their status, and lets you review, approve, reject, or edit individual content items.
          </p>
          <Screenshot file="01-command-center-overview.jpg" alt="Command Center dashboard" caption="The main Command Center view with stats bar, tab navigation, and campaign list." />
        </Step>

        <Tip>You can also click the <strong>+ New Braindump</strong> button on the Command Center page to start a new campaign idea.</Tip>
      </Section>

      {/* Chat Panel */}
      <Section icon={MessageSquare} title="The Chat Panel">
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          The chat panel is where you talk to your AI marketing team. Type your idea in plain English
          and the AI will stream back a campaign plan in real-time.
        </p>

        <Screenshot file="06-chat-panel-open.jpg" alt="Chat panel expanded" caption="The chat panel open and ready for your braindump. The AI streams responses token-by-token." />

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">What to say</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Be as specific or vague as you like. The AI understands your brand, your niche, and all of Stitch's tools.
          Here are some examples:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1.5 ml-4 list-disc">
          <li>"Promote our new AI tool this week. Target solopreneurs. Upbeat tone. Hit all platforms."</li>
          <li>"Create a LinkedIn carousel about productivity tips and a matching Short for TikTok."</li>
          <li>"I need a client case study campaign — LinkedIn post, carousel, and a 30-second video."</li>
          <li>"Weekly tips series episode 12 — cover time management for remote workers."</li>
        </ul>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Header controls</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p><History className="w-4 h-4 inline mr-1" /> <strong>History</strong> — View and resume previous conversations.</p>
          <p><Plus className="w-4 h-4 inline mr-1" /> <strong>New</strong> — Start a fresh braindump (clears current conversation).</p>
          <p><X className="w-4 h-4 inline mr-1" /> <strong>Close</strong> — Minimize back to the bubble. Your conversation is saved.</p>
        </div>

        <InfoBox>
          The chat uses SSE streaming — you see the AI thinking in real-time, word by word.
          You can interrupt mid-stream with the stop button if you want to redirect.
        </InfoBox>
      </Section>

      {/* Campaign Planning */}
      <Section icon={Lightbulb} title="Campaign Planning">
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          When you describe what you want, the AI creates a structured campaign plan. The plan includes
          specific content items — each with a type, platform, topic, tone, and style.
        </p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Supported content types</h4>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { icon: Film, label: 'Short Video', desc: 'YouTube Shorts, TikTok, Reels (15-60s)' },
            { icon: FileText, label: 'LinkedIn Post', desc: 'Thought leadership with branded image' },
            { icon: LayoutGrid, label: 'Carousel', desc: 'Multi-slide for LinkedIn or Instagram' },
            { icon: Megaphone, label: 'Ad Set', desc: 'Meta + LinkedIn ad variations' },
            { icon: BookOpen, label: 'Storyboard', desc: 'Video storyboard with scene breakdown' },
            { icon: Zap, label: 'Custom', desc: 'Anything else — AI builds a custom flow' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
              <Icon className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Refine or build</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          After the AI proposes a plan, you can:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1 ml-4 list-disc">
          <li><strong>Refine it</strong> — "Make the carousel 7 slides instead of 5" or "Skip the ads, focus on organic."</li>
          <li><strong>Build it</strong> — Click the green "Build it" button and the AI starts creating all the content.</li>
        </ul>

        <Tip>
          The AI shows a cost estimate before building. Short videos cost more (voiceover + video generation);
          LinkedIn posts and carousels are inexpensive. You always see the estimate before spending anything.
        </Tip>
      </Section>

      {/* Dashboard Views */}
      <Section icon={LayoutGrid} title="Dashboard Views">
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          The Command Center dashboard has three views, toggled via the tab bar below the stats cards.
        </p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Stats Bar</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Four cards at the top give you an instant overview:
        </p>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: 'Pending Review', color: 'text-amber-500', desc: 'Items ready for your review' },
            { label: 'Building', color: 'text-indigo-500', desc: 'Items currently being generated' },
            { label: 'Approved', color: 'text-green-500', desc: 'Approved and ready to publish' },
            { label: 'Published', color: 'text-slate-500', desc: 'Successfully published' },
          ].map(({ label, color, desc }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
              <p className={`text-xs font-semibold ${color}`}>{label}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <Screenshot file="02-stats-bar.jpg" alt="Stats bar" caption="The stats bar gives you an at-a-glance view of your pipeline." />

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-2">Campaigns View</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The default view shows campaign cards grouped by braindump. Each card displays:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1 ml-4 list-disc">
          <li>Campaign name, creation date, and item count</li>
          <li>Status badge (Building, Pending Review, Approved, Published)</li>
          <li>Item tiles showing content type, platform, and per-item status</li>
          <li>Progress bar for campaigns still being built</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Click a campaign card to expand it and see rich previews of each item with Approve, Edit, and Reject buttons.
        </p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-2">Gantt View</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          A timeline view showing the lifecycle of each campaign across a 14-day window.
          Rows are grouped by campaign with sub-rows per content item. Color-coded bars show
          where each item is in the pipeline. Today is highlighted.
        </p>
        <Screenshot file="03-gantt-view.jpg" alt="Gantt timeline view" caption="The Gantt view shows your content pipeline across two weeks." />

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-2">Calendar View</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          A traditional weekly grid showing scheduled content items as platform-colored pills.
          Navigate between weeks with the arrow buttons. Today is highlighted with an indigo border.
          Weekends are dimmed. Click any item to view or edit it.
        </p>
        <Screenshot file="04-calendar-view.jpg" alt="Calendar view" caption="The Calendar view shows what's scheduled across the week, color-coded by platform." />
      </Section>

      {/* Review & Approve */}
      <Section icon={CheckCircle} title="Review and Approve">
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Once the AI finishes building your campaign, items appear with status "Ready" in the Command Center.
          This is your review step — nothing gets published without your approval.
        </p>

        <Step number={1} title="Expand a campaign">
          <p>Click the campaign card to expand it and see detailed previews of each content item.</p>
        </Step>

        <Step number={2} title="Review each item">
          <p>Each item shows a preview (script excerpt, slide count, platform) and three action buttons:</p>
          <div className="mt-2 space-y-1.5">
            <p><Check className="w-3.5 h-3.5 inline text-green-500 mr-1" /> <strong>Approve</strong> — Mark as approved. Ready for scheduling or immediate publish.</p>
            <p><ExternalLink className="w-3.5 h-3.5 inline text-slate-400 mr-1" /> <strong>Edit</strong> — Opens the item in its native tool (Shorts draft, LinkedIn editor, Carousel editor, Ads manager).</p>
            <p><X className="w-3.5 h-3.5 inline text-red-500 mr-1" /> <strong>Reject</strong> — Mark as rejected. You can rebuild it later.</p>
          </div>
        </Step>

        <Step number={3} title="Rebuild if needed">
          <p>
            Failed or rejected items show a <RefreshCw className="w-3.5 h-3.5 inline text-slate-400" /> <strong>Rebuild</strong> button.
            Click it to re-run the generation with the same plan.
          </p>
        </Step>

        <Tip>
          The "Edit" button takes you directly to the native editor for that content type.
          For example, a Short opens in the Shorts Workbench draft view where you can adjust
          keyframes, voice, music, and captions before approving.
        </Tip>

        <Warning>
          Once approved, items can be scheduled for automatic publishing.
          Double-check content before approving — especially video scripts and ad copy.
        </Warning>
      </Section>

      {/* Campaign Lifecycle */}
      <Section icon={Clock} title="Campaign Lifecycle">
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Every campaign follows this lifecycle:
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {[
            { label: 'Braindump', color: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' },
            { label: 'AI Plans', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
            { label: 'Building', color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
            { label: 'Review', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
            { label: 'Approved', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
            { label: 'Published', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
          ].map(({ label, color }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className="text-gray-400">→</span>}
              <span className={`px-2.5 py-1 rounded-full font-medium ${color}`}>{label}</span>
            </React.Fragment>
          ))}
        </div>

        <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>1. Braindump</strong> — You type your idea in the chat bubble.</p>
          <p><strong>2. AI Plans</strong> — The AI streams back a campaign plan with specific content items.</p>
          <p><strong>3. Building</strong> — After you click "Build it", the orchestrator creates all items in parallel (up to 3 at a time).</p>
          <p><strong>4. Review</strong> — Items land in the Command Center with "Ready" status. You preview and decide.</p>
          <p><strong>5. Approved</strong> — Items you approve can be scheduled for a future date or published immediately.</p>
          <p><strong>6. Published</strong> — At the scheduled time, items are automatically published to their platforms.</p>
        </div>

        <InfoBox>
          The dashboard polls for updates every 10 seconds while campaigns are building,
          so you can watch items transition from "Building" to "Ready" in real-time.
        </InfoBox>
      </Section>

      {/* Tips & Tricks */}
      <Section icon={Lightbulb} title="Tips and Best Practices">
        <div className="mt-2 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Be specific about platforms</p>
            <p>Instead of "post everywhere", say "YouTube Short + LinkedIn post + Instagram carousel".
              The AI creates separate, platform-optimized items for each.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Set up your Brand Kit first</p>
            <p>The AI uses your Brand Kit (name, colors, fonts, industry, audience) to personalize all content.
              Set it up in Studio → Brand before braindumping.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Use the chat to iterate</p>
            <p>Don't accept the first plan blindly. Say "make the Short 15 seconds instead" or "add a TikTok version too".
              The AI will adjust the plan before you build.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Review in native editors</p>
            <p>Always click "Edit" to review content in its native tool before approving.
              Shorts can be refined with different keyframes, LinkedIn posts can be polished, carousel slides can be reworded.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Chat history persists</p>
            <p>Your conversations are saved across sessions. Click the <History className="w-3 h-3 inline" /> history button
              to resume a previous braindump or review what the AI planned.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
