/**
 * ReplicationGuidePage — guide for replicating the Review Widget + autonomous
 * bug/feature processor system across all apps.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Copy, Database, Server, Layout,
  Bot, Shield, AlertTriangle, Lightbulb, CheckSquare, Settings,
  Code, Globe, Clock, Terminal, FileText, Layers,
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

function CodeBlock({ children, title }) {
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {title && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">{title}</div>
      )}
      <pre className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

// ── Main content ──

export function ReplicationGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-teal-600/10 dark:bg-teal-600/20 rounded-xl">
            <Copy className="w-7 h-7 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Replication Guide</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">How to add the Review Widget + autonomous processor to any app</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
          This guide covers everything needed to replicate the Review Widget and its two autonomous
          processing bots (Review Processor + Feature Builder) in any app. Tested across React + Express,
          FastAPI + Jinja2, and Next.js.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 text-center">
            <Layout className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <p className="text-xs font-medium text-teal-800 dark:text-teal-300">Widget + Dashboard</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
            <Bot className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300">2 Autonomous Bots</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <Globe className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-purple-800 dark:text-purple-300">Firecrawl Verify</p>
          </div>
        </div>
      </div>

      {/* Architecture */}
      <Section icon={Layers} title="Architecture" defaultOpen>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>The system has three parts:</p>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">1. Floating Widget (bottom-left)</p>
              <p className="text-xs mt-1">Submit form with tool/endpoint dropdowns, 8 request types, priority, screenshot upload. Dashboard panel slides out from the left for managing requests.</p>
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">2. Review Processor (hourly at :00)</p>
              <p className="text-xs mt-1">Handles bugs, questions, prompt reviews, docs updates. Fixes code, commits, pushes, deploys, verifies via Firecrawl. Mixed requests get decomposed: bugs fixed, features queued separately.</p>
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">3. Feature Builder (hourly at :30)</p>
              <p className="text-xs mt-1">ONLY builds features/improvements. Must write actual code, never proposals. Implements, builds, deploys, verifies. Creates follow-up requests for anything too large for one run.</p>
            </div>
          </div>
          <Tip>Both bots use an atomic claim query (<code>UPDATE...RETURNING *</code>) to prevent double-processing if triggered twice simultaneously.</Tip>
        </div>
      </Section>

      {/* Database */}
      <Section icon={Database} title="Database Schema">
        <Step number="1" title="Create the tables">
          <p>Two tables: <code>review_requests</code> (13 columns) and <code>review_comments</code> (6 columns).</p>
          <CodeBlock title="review_requests">
{`id          uuid PK DEFAULT gen_random_uuid()
user_id     text NOT NULL              -- adapt to your auth (uuid for Supabase Auth)
tool        text NOT NULL              -- subsystem name
endpoint    text                       -- specific model/API (optional)
type        text NOT NULL              -- bug, question, feature, console_error,
                                       -- change_request, learn_screenshot,
                                       -- prompt_review, claude_md_update
title       text NOT NULL
description text
screenshot_url text
status      text NOT NULL DEFAULT 'pending'  -- pending, in_progress, resolved,
                                              -- needs_info, closed
priority    text NOT NULL DEFAULT 'medium'   -- low, medium, high
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
resolved_at timestamptz                      -- set on resolve/close, clear on re-open`}
          </CodeBlock>
          <CodeBlock title="review_comments">
{`id          uuid PK DEFAULT gen_random_uuid()
request_id  uuid FK -> review_requests(id) ON DELETE CASCADE
author      text NOT NULL   -- 'user' or 'claude'
content     text NOT NULL
commit_hash text            -- if Claude made a code fix
created_at  timestamptz DEFAULT now()`}
          </CodeBlock>
        </Step>
        <Step number="2" title="Add trigger + indexes">
          <p>Add an <code>updated_at</code> trigger and indexes on status, user_id, and request_id.</p>
        </Step>
        <Step number="3" title="RLS (if using Supabase Auth)">
          <p>Enable RLS and add policies filtering by <code>auth.uid() = user_id</code>. Skip if using server-side auth.</p>
        </Step>
      </Section>

      {/* Request Types */}
      <Section icon={FileText} title="Request Types">
        <div className="mt-3 space-y-2">
          {[
            { type: 'bug', desc: 'Something broken or producing wrong results' },
            { type: 'question', desc: 'How/why does X work' },
            { type: 'feature', desc: 'New functionality (use "improvement" for trading apps)' },
            { type: 'console_error', desc: 'Paste error + stack trace for diagnosis' },
            { type: 'change_request', desc: 'Modify existing behavior' },
            { type: 'learn_screenshot', desc: 'Screenshot for training/docs page (or "strategy_review" for trading)' },
            { type: 'prompt_review', desc: 'Audit AI prompt construction for cohesion vs concatenation' },
            { type: 'claude_md_update', desc: 'Update project documentation in CLAUDE.md' },
          ].map(({ type, desc }) => (
            <div key={type} className="flex items-start gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <code className="shrink-0 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded mt-0.5">{type}</code>
              <span className="text-sm text-gray-600 dark:text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
        <Tip>Adapt types to your domain. Trading apps might replace <code>learn_screenshot</code> with <code>strategy_review</code>. The key is covering every kind of request your workflow generates.</Tip>
      </Section>

      {/* Tool Map */}
      <Section icon={Code} title="Tool -> Endpoint Map">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Create a data file mapping every tool to its model/API endpoints. This powers the two-level dropdown.</p>
          <CodeBlock title="Example structure">
{`TOOL_CATEGORIES = {
  'Image Tools': ['Imagineer', 'Edit Image', ...],
  'Video Tools': ['JumpStart', 'Storyboards', ...],
}

TOOL_ENDPOINTS = {
  'Imagineer': ['Nano Banana 2', 'Flux 2', 'SeedDream v4.5', ...],
  'JumpStart': ['Veo 3.1', 'Kling O3', 'Wan 2.5', ...],
}`}
          </CodeBlock>
          <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Be exhaustive.</p>
          <p>&ldquo;Imagineer &rarr; Nano Banana 2 &rarr; Bug&rdquo; is actionable. &ldquo;Images broken&rdquo; is not.</p>
        </div>
      </Section>

      {/* API */}
      <Section icon={Server} title="API Endpoints">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <p>6-8 routes depending on your needs:</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-3 text-left font-medium text-gray-900 dark:text-gray-100">Method</th>
                  <th className="py-2 pr-3 text-left font-medium text-gray-900 dark:text-gray-100">Path</th>
                  <th className="py-2 text-left font-medium text-gray-900 dark:text-gray-100">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ['POST', '/api/reviews', 'Create request'],
                  ['GET', '/api/reviews', 'List requests (?status= filter)'],
                  ['GET', '/api/reviews/:id', 'Get request + comments'],
                  ['PATCH', '/api/reviews/:id', 'Update status/priority'],
                  ['POST', '/api/reviews/:id/comments', 'Add comment'],
                  ['POST', '/api/reviews/upload', 'Upload screenshot (5MB max)'],
                ].map(([method, path, purpose], i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3"><code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{method}</code></td>
                    <td className="py-2 pr-3 font-mono text-gray-800 dark:text-gray-200">{path}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tip>Register specific paths (<code>/upload</code>) BEFORE parameterized paths (<code>/:id</code>) in Express/FastAPI to avoid route conflicts.</Tip>
        </div>
      </Section>

      {/* Scheduled Tasks */}
      <Section icon={Clock} title="Scheduled Tasks (CRON)">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="font-medium text-blue-900 dark:text-blue-200">Review Processor &mdash; hourly at :00</p>
            <p className="text-xs mt-1">Cron: <code>0 7-23 * * *</code> (7am-11pm local time)</p>
            <p className="text-xs mt-1">Claims: <code>type NOT IN (&apos;feature&apos;, &apos;change_request&apos;, &apos;improvement&apos;)</code></p>
            <p className="text-xs mt-1">Fixes bugs, answers questions, audits prompts, updates docs. Creates new feature requests for mixed items.</p>
          </div>
          <div className="px-4 py-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <p className="font-medium text-purple-900 dark:text-purple-200">Feature Builder &mdash; hourly at :30</p>
            <p className="text-xs mt-1">Cron: <code>30 7-23 * * *</code> (staggered to avoid git conflicts)</p>
            <p className="text-xs mt-1">Claims: <code>type IN (&apos;feature&apos;, &apos;change_request&apos;, &apos;improvement&apos;)</code></p>
            <p className="text-xs mt-1">Builds actual features. Never writes proposals. Creates follow-ups for large features.</p>
          </div>
        </div>

        <Step number="1" title="Set model to Opus">
          <p>Add <code>model: claude-opus-4-6</code> to the SKILL.md frontmatter. Set your Claude Code default model to Opus as backup.</p>
          <Warning>The <code>update_scheduled_task</code> MCP tool strips the <code>model</code> field from frontmatter. Never call it after setting the model. Only edit SKILL.md directly via Edit/Write tools.</Warning>
        </Step>

        <Step number="2" title="Include credentials + Firecrawl verification">
          <p>Both task prompts must include login credentials and explicit Firecrawl browser login code (Python Playwright). The bot must verify every fix in the live production app before marking resolved.</p>
        </Step>

        <Step number="3" title="Pre-approve tools">
          <p>Click &ldquo;Run now&rdquo; on each task once while watching. Approve every tool prompt. Approvals are stored per-task and auto-applied to future runs.</p>
        </Step>
      </Section>

      {/* Firecrawl Verification */}
      <Section icon={Globe} title="Firecrawl Verification">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Every code change must be verified in the live app. Include this pattern in both task prompts:</p>
          <CodeBlock title="Verification steps (Python/Playwright)">
{`# Step 1: Create browser session
firecrawl_browser_create with profile { name: "app-admin", saveChanges: true }

# Step 2: Login
await page.goto('https://your-app.com/login')
await page.wait_for_timeout(2000)
if '/dashboard' in page.url:
    print('Already logged in')
else:
    await page.fill('input[type="email"]', 'your@email.com')
    await page.fill('input[type="password"]', 'your-password')
    await page.click('button[type="submit"]')
    await page.wait_for_timeout(3000)

# Step 3: Navigate to relevant page and test
# Step 4: Take snapshot/screenshot as proof
# Step 5: Delete browser session

# If verification FAILS -> fix, rebuild, redeploy, re-verify
# Do NOT mark resolved until verified working`}
          </CodeBlock>
          <Warning>Budget ~50 Firecrawl browser sessions/month for a moderately active review queue. If credits run out, verification falls back to code inspection only.</Warning>
        </div>
      </Section>

      {/* Permissions */}
      <Section icon={Shield} title="Required Permissions">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <p>Add to <code>.claude/settings.local.json</code>:</p>
          <CodeBlock title=".claude/settings.local.json">
{`{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(npm run build:*)",
      "Bash(curl:*)",
      "Bash(fly deploy:*)",
      "Bash(fly status:*)",
      "mcp__firecrawl-mcp__firecrawl_browser_create",
      "mcp__firecrawl-mcp__firecrawl_browser_execute",
      "mcp__firecrawl-mcp__firecrawl_browser_delete",
      "mcp__firecrawl-mcp__firecrawl_browser_list"
    ]
  }
}`}
          </CodeBlock>
        </div>
      </Section>

      {/* Framework Adaptation */}
      <Section icon={Settings} title="Adapt Per Framework">
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-3 text-left font-medium text-gray-900 dark:text-gray-100">Aspect</th>
                <th className="py-2 pr-3 text-left font-medium text-gray-900 dark:text-gray-100">React + Express</th>
                <th className="py-2 pr-3 text-left font-medium text-gray-900 dark:text-gray-100">FastAPI + Jinja2</th>
                <th className="py-2 text-left font-medium text-gray-900 dark:text-gray-100">Next.js</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-600 dark:text-gray-400">
              <tr><td className="py-2 pr-3 font-medium">Widget</td><td className="py-2 pr-3">React JSX</td><td className="py-2 pr-3">Jinja2 partial + vanilla JS</td><td className="py-2">React TSX</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Panel</td><td className="py-2 pr-3">Radix Dialog</td><td className="py-2 pr-3">CSS transform</td><td className="py-2">Radix / headless UI</td></tr>
              <tr><td className="py-2 pr-3 font-medium">API</td><td className="py-2 pr-3">Express routes</td><td className="py-2 pr-3">FastAPI router</td><td className="py-2">App Router (route.ts)</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Auth</td><td className="py-2 pr-3">Supabase JWT + RLS</td><td className="py-2 pr-3">Basic auth + cookies</td><td className="py-2">Supabase Auth + RLS</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Deploy</td><td className="py-2 pr-3">fly deploy</td><td className="py-2 pr-3">fly deploy --depot=false</td><td className="py-2">git push (Vercel)</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Styling</td><td className="py-2 pr-3">Tailwind + Radix</td><td className="py-2 pr-3">CSS variables</td><td className="py-2">Tailwind + shadcn</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Known Issues */}
      <Section icon={AlertTriangle} title="Known Issues">
        <div className="mt-3 space-y-3">
          <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <p className="font-medium text-red-900 dark:text-red-200 text-sm">Model override unreliable</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1"><code>model: claude-opus-4-6</code> in SKILL.md frontmatter gets ignored or overridden to Sonnet. Set your default model to Opus in the Claude Code UI as a workaround.</p>
          </div>
          <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <p className="font-medium text-red-900 dark:text-red-200 text-sm">update_scheduled_task strips model field</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">The MCP API overwrites SKILL.md frontmatter, removing the <code>model</code> field. Only edit SKILL.md via Write/Edit tools, never via the API.</p>
          </div>
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <p className="font-medium text-amber-900 dark:text-amber-200 text-sm">Sonnet skips features</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">If Sonnet runs instead of Opus, it tends to mark features as &ldquo;out of scope&rdquo; instead of building them. The two-bot architecture mitigates this.</p>
          </div>
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <p className="font-medium text-amber-900 dark:text-amber-200 text-sm">Firecrawl credits</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Browser sessions consume credits. Budget ~50/month. When exhausted, verification falls back to code inspection only.</p>
          </div>
        </div>
      </Section>

      {/* Checklist */}
      <Section icon={CheckSquare} title="New App Checklist">
        <div className="mt-3 space-y-2">
          {[
            'Run migration SQL against your Supabase project',
            'Create tool -> endpoint map (enumerate EVERY tool and model)',
            'Build API endpoints (6-8 routes)',
            'Build floating widget (button + form)',
            'Build slide-over dashboard (filters, cards, comments)',
            'Wire widget into root layout/template',
            'Create Review Processor scheduled task',
            'Create Feature Builder scheduled task',
            'Add permissions to .claude/settings.local.json',
            '"Run now" both tasks to pre-approve tools',
            'Test: submit a bug, verify CRON fixes and deploys it',
            'Test: submit a feature, verify Feature Builder builds it',
            'Update CLAUDE.md with new subsystem docs',
            'Add /learn guide for the widget',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="shrink-0 w-5 h-5 rounded border border-gray-300 dark:border-gray-600 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
