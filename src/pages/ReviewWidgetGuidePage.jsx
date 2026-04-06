/**
 * ReviewWidgetGuidePage — comprehensive guide for the Review Widget & Request Tracker.
 *
 * Covers: floating widget button, submit form, tool/endpoint selection,
 * request types, priority, screenshots, dashboard panel, filter chips,
 * status management, comment threads, CRON processing.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, PenLine, ClipboardList, Filter,
  MessageSquare, Clock, Bug, HelpCircle, Sparkles, Terminal,
  FileEdit, Camera, BookOpen, FileText, AlertTriangle, Lightbulb,
  Send, CheckCircle, XCircle, RotateCcw, Zap,
} from 'lucide-react';

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
        <Icon className="w-5 h-5 text-teal-600 shrink-0" />
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

// ── Info callout ──

function InfoBox({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Main guide content ──

export function ReviewWidgetGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-blue-600/10 dark:bg-blue-600/20 rounded-xl">
            <PenLine className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Widget</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">In-app issue tracker with automated Claude Code processing</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
          The Review Widget is a floating button in the bottom-left corner of every page. It lets you quickly
          log bugs, ask questions, request features, flag prompt issues, and more &mdash; all targeted at specific
          tools and their model endpoints. A scheduled Claude Code task picks up your requests hourly, researches
          the codebase, fixes bugs or writes answers, and posts findings back to the request.
        </p>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
            <PenLine className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Quick Submit</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <ClipboardList className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-purple-800 dark:text-purple-300">Dashboard</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-800 dark:text-green-300">Auto-Process</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
            <MessageSquare className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Comment Thread</p>
          </div>
        </div>
      </div>

      {/* ── The Widget Button ── */}
      <Section icon={PenLine} title="The Widget Button" defaultOpen>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          A blue neon-ring circle with a white pencil icon sits in the <strong>bottom-left corner</strong> of
          every page (the Command Center bot is in the bottom-right). The badge shows how many requests
          are pending or need your info.
        </p>
        <Step number="1" title="Find the button">
          <p>
            Look at the bottom-left of your screen. You&apos;ll see a navy circle with a blue glow ring
            and a white pencil icon. If you have pending requests, a small red badge shows the count.
          </p>
        </Step>
        <Step number="2" title="Click to open the submit form">
          <p>
            Click the button to pop open the &ldquo;New Request&rdquo; form card, anchored just above the button.
            Click again to close it.
          </p>
        </Step>
        <Tip>
          The widget is always available on every page &mdash; Studio, Storyboards, Shorts Workbench, Carousels, etc.
          You can submit a request without leaving your current workflow.
        </Tip>
      </Section>

      {/* ── Submitting a Request ── */}
      <Section icon={Send} title="Submitting a Request">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The submit form has 7 fields. Only <strong>Tool</strong>, <strong>Type</strong>, and <strong>Title</strong> are required.
          Fill in as much detail as you can &mdash; the more context, the better the automated response.
        </p>

        <Step number="1" title="Select a Tool">
          <p>
            Choose which tool the request is about from the dropdown. All 39 tools are listed alphabetically:
            3D Viewer, Ads Manager, Animate, Audio Studio, Brand Kit, Carousels, Clone Ad, Command Center,
            Edit Image, Flows, General, Imagineer, JumpStart, JumpStart Extend, Learn Page, Lens, Library,
            LinkedIn, LoRA Training, Motion Transfer, Proposal Pages, Queue / Publish, Settings, Shorts Workbench,
            Smoosh, Storyboards, Trip, Try Style, Turnaround, Video Analyzer, Video Studio.
          </p>
          <p className="mt-1">
            Use <strong>General</strong> for issues that aren&apos;t tool-specific (auth, navigation, deploy, performance, UI layout).
          </p>
        </Step>

        <Step number="2" title="Select an Endpoint (optional)">
          <p>
            Once you select a tool, a second dropdown appears with the specific models and APIs that tool uses.
            For example, selecting &ldquo;Imagineer&rdquo; shows: Nano Banana 2, Flux 2, SeedDream v4.5, Imagen 4,
            Kling Image v3, Grok Imagine, Ideogram v2, Topaz Upscale, and more.
          </p>
          <p className="mt-1">
            This is <strong>optional</strong> &mdash; skip it if the issue is about the tool&apos;s UI rather than a specific model.
          </p>
        </Step>

        <Step number="3" title="Choose the Request Type">
          <p>Pick one of 8 types:</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Bug className="w-4 h-4 text-red-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Bug</span> &mdash; something is broken</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Question</span> &mdash; how/why does X work</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Feature</span> &mdash; new functionality</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Terminal className="w-4 h-4 text-orange-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Console Error</span> &mdash; paste the error</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <FileEdit className="w-4 h-4 text-teal-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Change Request</span> &mdash; modify behavior</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Camera className="w-4 h-4 text-pink-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Learn Screenshot</span> &mdash; for /learn page</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">Prompt Review</span> &mdash; audit cohesion</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <FileText className="w-4 h-4 text-gray-500 shrink-0" />
              <div><span className="font-medium text-gray-900 dark:text-gray-100">CLAUDE.md Update</span> &mdash; update docs</div>
            </div>
          </div>
        </Step>

        <Step number="4" title="Set Priority">
          <p>
            Three priority levels: <strong>Low</strong>, <strong>Medium</strong> (default), <strong>High</strong>.
            High-priority requests are processed first by the automated task. Use High for blocking bugs,
            Medium for general issues, Low for nice-to-haves.
          </p>
        </Step>

        <Step number="5" title="Write a Title">
          <p>
            A short summary of the issue. Be specific: &ldquo;Nano Banana 2 returns 422 on landscape aspect ratio&rdquo;
            is better than &ldquo;Image generation broken&rdquo;.
          </p>
        </Step>

        <Step number="6" title="Add Description (optional)">
          <p>
            Full details, steps to reproduce, console log output, expected vs actual behavior.
            The description preserves formatting &mdash; paste console errors directly.
          </p>
        </Step>

        <Step number="7" title="Attach a Screenshot (optional)">
          <p>
            Click the screenshot area to upload an image, or <strong>paste from clipboard</strong> (Ctrl/Cmd+V).
            Images upload immediately and show a thumbnail preview. Max size: 5MB.
          </p>
        </Step>

        <Step number="8" title="Submit">
          <p>
            Click &ldquo;Submit Request&rdquo;. A notification confirms the submission. The form resets and
            the pending badge updates.
          </p>
        </Step>
      </Section>

      {/* ── The Dashboard ── */}
      <Section icon={ClipboardList} title="The Dashboard">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Click &ldquo;View All&rdquo; in the submit form header to open the full dashboard. It slides in
          from the left as a 600px panel overlay.
        </p>

        <Step number="1" title="Filter by Status">
          <p>
            Six filter chips at the top: <strong>All</strong>, <strong>Pending</strong>, <strong>In Progress</strong>,
            <strong> Needs Info</strong>, <strong>Resolved</strong>, <strong>Closed</strong>.
            Each shows the count for that status. Click a chip to filter the list.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">Pending</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">In Progress</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">Needs Info</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">Resolved</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30">Closed</span>
          </div>
        </Step>

        <Step number="2" title="Expand a Request">
          <p>
            Click any request card to expand it. The expanded view shows the full description (in monospace
            for console log formatting), any attached screenshot, the comment thread, and status action buttons.
          </p>
        </Step>

        <Step number="3" title="Add a Comment">
          <p>
            In the expanded view, type in the comment box and click &ldquo;Add Comment&rdquo;. Use this to
            provide clarifying information when Claude marks a request as &ldquo;Needs Info&rdquo;.
          </p>
        </Step>

        <Step number="4" title="Change Status">
          <p>
            Action buttons appear based on the current status:
          </p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
            <li><strong>Pending</strong> &rarr; Close</li>
            <li><strong>In Progress</strong> &rarr; Close</li>
            <li><strong>Needs Info</strong> &rarr; Re-open or Close</li>
            <li><strong>Resolved</strong> &rarr; Re-open or Close</li>
            <li><strong>Closed</strong> &rarr; Re-open</li>
          </ul>
        </Step>

        <Tip>
          Requests are sorted by priority (High first), then by oldest first within the same priority.
          High-priority bugs always float to the top.
        </Tip>
      </Section>

      {/* ── Comment Thread ── */}
      <Section icon={MessageSquare} title="Comment Thread">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Each request has a threaded conversation between you and Claude.
        </p>

        <Step number="1" title="Your Comments">
          <p>
            Your comments appear on the left side with a dark background. Add context, paste more errors,
            or provide follow-up information.
          </p>
        </Step>

        <Step number="2" title="Claude's Responses">
          <p>
            Claude&apos;s automated responses appear on the right side with a blue-tinted background.
            These contain the research findings, code analysis, or fix details.
          </p>
        </Step>

        <Step number="3" title="Commit References">
          <p>
            When Claude makes a code fix, the commit hash is shown in monospace below the comment.
            You can use this to review the specific changes made.
          </p>
        </Step>
      </Section>

      {/* ── Automated Processing ── */}
      <Section icon={Clock} title="Automated Processing (CRON)">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          A Claude Code scheduled task runs <strong>every hour from 7am to 11pm NZT</strong>.
          It processes one request per run &mdash; the oldest high-priority pending request.
        </p>

        <Step number="1" title="How it Works">
          <p>The CRON task follows this flow for each run:</p>
          <ol className="list-decimal pl-4 mt-1 space-y-1">
            <li>Fetches the oldest <strong>pending</strong> request (high priority first)</li>
            <li>Sets status to <strong>In Progress</strong></li>
            <li>Reads the tool, endpoint, type, and description</li>
            <li>Processes based on the request type (see below)</li>
            <li>Posts findings as a comment</li>
            <li>Sets status to <strong>Resolved</strong> (or <strong>Needs Info</strong> if unclear)</li>
          </ol>
        </Step>

        <Step number="2" title="Processing by Type">
          <div className="mt-2 space-y-3">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">Bug / Console Error</p>
              <p className="text-xs mt-1">Reads the relevant source code, diagnoses the issue, fixes it if straightforward, commits the fix, and records the commit hash.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">Question</p>
              <p className="text-xs mt-1">Researches the codebase and writes a clear, detailed answer.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">Feature / Change Request</p>
              <p className="text-xs mt-1">Analyzes feasibility, checks for conflicts with existing code, and writes a suggested approach.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">Learn Screenshot</p>
              <p className="text-xs mt-1">Describes what should be added to the /learn page and where.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">Prompt Review</p>
              <p className="text-xs mt-1">Reads the prompt-building code for the tool/endpoint, checks if it uses the Cohesive Prompt Builder or does raw concatenation, fixes if needed.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">CLAUDE.md Update</p>
              <p className="text-xs mt-1">Researches the topic against the current codebase state, writes/updates the relevant CLAUDE.md section, and commits.</p>
            </div>
          </div>
        </Step>

        <InfoBox>
          The CRON runs from <strong>7am to 11pm NZT only</strong> &mdash; no processing between 11pm and 7am.
          It processes <strong>one request per hour</strong>. High-priority requests are always picked up first.
        </InfoBox>

        <Tip>
          If a request is too vague, Claude will set it to &ldquo;Needs Info&rdquo; instead of guessing.
          Open the dashboard, add a comment with more details, and re-open the request to put it back in the queue.
        </Tip>
      </Section>

      {/* ── Request Types Deep Dive ── */}
      <Section icon={Bug} title="Request Types — When to Use Each">
        <div className="mt-3 space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Bug className="w-4 h-4 text-red-500" /> Bug
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Something that used to work but doesn&apos;t anymore, or something that produces wrong results.
              Include: what you did, what you expected, what actually happened.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-orange-500" /> Console Error
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You see an error in the browser console or the server logs. Paste the full error message
              and stack trace in the description. Select the tool and endpoint where the error occurred.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Prompt Review
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You notice that a tool&apos;s AI-generated content feels disjointed or like raw concatenation
              rather than a cohesive prompt. Select the specific tool and endpoint. Claude will audit the
              prompt construction code and check whether it uses the Cohesive Prompt Builder.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" /> CLAUDE.md Update
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You notice the CLAUDE.md documentation is missing information about a tool, a new model,
              or a recently shipped feature. Describe what&apos;s missing and Claude will research the
              codebase and update the docs.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Status Lifecycle ── */}
      <Section icon={RotateCcw} title="Status Lifecycle">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Every request follows a lifecycle through these statuses:
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 w-28 text-center">Pending</span>
            <span className="text-sm text-gray-500">&rarr;</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Waiting to be picked up by the CRON task</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 w-28 text-center">In Progress</span>
            <span className="text-sm text-gray-500">&rarr;</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Claude is actively processing this request</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 w-28 text-center">Needs Info</span>
            <span className="text-sm text-gray-500">&rarr;</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Claude needs more context &mdash; add a comment and re-open</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 w-28 text-center">Resolved</span>
            <span className="text-sm text-gray-500">&rarr;</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Claude found an answer or made a fix &mdash; check the comment</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30 w-28 text-center">Closed</span>
            <span className="text-sm text-gray-500">&rarr;</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Manually closed by you &mdash; can be re-opened anytime</span>
          </div>
        </div>
        <Tip>
          You can close a request at any status. You can also re-open a resolved or closed request
          if the fix didn&apos;t work or you need more investigation.
        </Tip>
      </Section>

      {/* ── Tips & Best Practices ── */}
      <Section icon={Lightbulb} title="Tips & Best Practices">
        <div className="mt-3 space-y-3">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Be specific with tool + endpoint</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              &ldquo;Imagineer &rarr; Nano Banana 2 &rarr; Bug: 422 on landscape&rdquo; is much more actionable than
              &ldquo;General &rarr; Bug: images broken&rdquo;. The endpoint helps Claude find the exact code path.
            </p>
          </div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Paste console errors verbatim</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For Console Error type requests, paste the full error including the stack trace.
              The description field preserves monospace formatting.
            </p>
          </div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Use Prompt Review for quality issues</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If generated content feels disjointed (like parts were just stapled together), submit a
              Prompt Review. Claude will audit whether the prompt pipeline uses the Cohesive Prompt Builder.
            </p>
          </div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Set High priority for blocking issues</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              High-priority requests are always processed first. Use this for bugs that block your workflow.
              Medium for regular issues, Low for nice-to-haves.
            </p>
          </div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Check the dashboard regularly</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The CRON processes one request per hour. Check the dashboard to see Claude&apos;s responses,
              re-open requests that need more work, or close resolved items.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
