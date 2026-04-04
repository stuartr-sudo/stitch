/**
 * AgencyGuidePage — interactive guide for Agency Mode.
 *
 * Exported as AgencyGuideContent for embedding in LearnPage.
 * Covers client brief creation, deliverable selection, campaign generation,
 * asset review workflow, and integration with other Stitch tools.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Briefcase, Plus, FileText, Sparkles,
  AlertTriangle, Check, X, ExternalLink, Save, Layers,
  Users, ClipboardList, BarChart3, Workflow,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/agency/';

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

export function AgencyGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-[#2C666E]/10 border border-indigo-500/20 px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Agency Mode</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage client work like an agency. Create briefs, select deliverables, generate campaign assets,
          and track each piece through a review and approval workflow — all from a single dashboard.
        </p>
      </div>

      {/* Overview */}
      <Section icon={Workflow} title="Overview — The Agency Workflow" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Agency Mode gives you a structured pipeline for producing content on behalf of clients.
            The workflow follows five statuses:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
              { label: 'Generating', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
              { label: 'Review', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
              { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
              { label: 'Delivered', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
            ].map(s => (
              <span key={s.label} className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
            ))}
          </div>
          <Screenshot src={`${CDN}01-briefs-list.jpg`} alt="Agency briefs dashboard" caption="The Agency Mode dashboard showing your client briefs" />
        </div>
      </Section>

      {/* Creating a Brief */}
      <Section icon={Plus} title="Creating a Client Brief">
        <Step number={1} title="Click New Brief">
          <p>
            From the Agency dashboard, click <strong>New Brief</strong>. This creates a new draft brief
            and opens the detail view immediately.
          </p>
          <Screenshot src={`${CDN}02-new-brief-highlight.jpg`} alt="New Brief button highlighted" caption="Click New Brief to start a client project" />
        </Step>
        <Step number={2} title="Fill In Client Details">
          <p>The left panel contains the brief form with these fields:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Client Name</strong> — The client or brand you're producing for</li>
            <li><strong>Industry</strong> — Their industry vertical (e.g., "SaaS", "E-commerce", "Healthcare")</li>
            <li><strong>Target Audience</strong> — Who the content should reach</li>
            <li><strong>Product Description</strong> — What the client is selling or promoting</li>
            <li><strong>Brand Kit</strong> — Select an existing Brand Kit for visual consistency</li>
          </ul>
          <Screenshot src={`${CDN}03-brief-detail.jpg`} alt="Brief detail form" caption="The brief detail view — fill in client info on the left, see assets on the right" />
        </Step>
        <Step number={3} title="Select Deliverables">
          <p>Check the boxes for which content types this campaign needs:</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { icon: '🎬', label: 'Short Video', desc: 'AI-generated Shorts via the Workbench' },
              { icon: '📱', label: 'Carousel', desc: 'Branded carousel posts' },
              { icon: '📢', label: 'Ad Campaign', desc: 'Multi-platform paid ad variations' },
              { icon: '🎥', label: 'Longform Video', desc: 'Chapter-based videos (3-15 min)' },
              { icon: '💼', label: 'LinkedIn Post', desc: 'Professional LinkedIn content' },
            ].map(d => (
              <div key={d.label} className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{d.icon} {d.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.desc}</p>
              </div>
            ))}
          </div>
          <Screenshot src={`${CDN}05-deliverables-highlight.jpg`} alt="Deliverables checklist" caption="Select which content types to produce for this client" />
        </Step>
        <Step number={4} title="Save the Brief">
          <p>
            Click <strong>Save</strong> to persist your brief. You can come back and edit it anytime while it's in Draft status.
          </p>
        </Step>
        <Tip>
          Link a Brand Kit to ensure all generated content uses the client's colors, fonts, and logo. Brand Kits can be created from the Brand Kit page — upload a PDF guidelines doc or extract from a URL.
        </Tip>
      </Section>

      {/* Generating Campaign Assets */}
      <Section icon={Sparkles} title="Generating Campaign Assets">
        <Step number={1} title="Click Generate">
          <p>
            With deliverables selected and the brief saved, click <strong>Generate</strong>.
            This creates asset records for each deliverable type with AI-generated titles.
          </p>
        </Step>
        <Step number={2} title="Asset Records Created">
          <p>
            The right panel shows your campaign assets, each starting in <strong>Queued</strong> status.
            Each asset has a title generated by GPT-4.1-mini based on the client name and content type.
          </p>
        </Step>
        <Step number={3} title="Create Content in Each Tool">
          <p>
            Click <strong>Open in Tool</strong> on any asset to jump to the relevant Stitch tool:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Short Video</strong> opens the Shorts Workbench at <code>/shorts/workbench</code></li>
            <li><strong>Carousel</strong> opens the Carousel Builder at <code>/carousels</code></li>
            <li><strong>Ad Campaign</strong> opens the Ads Manager at <code>/ads</code></li>
            <li><strong>Longform Video</strong> opens the Longform Workbench at <code>/longform/workbench</code></li>
            <li><strong>LinkedIn Post</strong> opens the LinkedIn Tool at <code>/linkedin</code></li>
          </ul>
        </Step>
        <Warning>
          Asset generation creates placeholder records — you still use each tool to actually produce the content. This is by design: Agency Mode is a project management layer, not an auto-pilot.
        </Warning>
      </Section>

      {/* Review & Approval */}
      <Section icon={ClipboardList} title="Review & Approval Workflow">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>Each asset has its own status and review controls:</p>
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">queued</span>
              <span className="text-xs">Asset created, not yet started</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">generating</span>
              <span className="text-xs">Content is being produced</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">ready</span>
              <span className="text-xs">Content complete, awaiting review</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">approved</span>
              <span className="text-xs">Client approved this asset</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500">rejected</span>
              <span className="text-xs">Needs revision</span>
            </div>
          </div>
          <p className="mt-2">
            Use the <strong>Approve</strong> and <strong>Reject</strong> buttons on each asset card to track progress.
            The status summary bar at the top shows counts per status at a glance.
          </p>
        </div>
        <Tip>
          Once all assets are approved, change the brief status to <strong>Delivered</strong> to mark the project as complete.
        </Tip>
      </Section>

      {/* Managing Briefs */}
      <Section icon={FileText} title="Managing Briefs">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>The briefs list view shows all your projects at a glance:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Client name</strong> and industry</li>
            <li><strong>Deliverable badges</strong> showing which content types are included</li>
            <li><strong>Status badge</strong> (Draft, Generating, Review, Approved, Delivered)</li>
            <li><strong>Created date</strong></li>
          </ul>
          <p>Click any brief card to open its detail view. Click the back arrow to return to the list.</p>
          <Screenshot src={`${CDN}04-brief-form.jpg`} alt="Brief form filled in" caption="A brief with client details and campaign assets" />
        </div>
      </Section>

      {/* Best Practices */}
      <Section icon={BarChart3} title="Tips & Best Practices">
        <div className="mt-3 space-y-3">
          <Tip>
            <strong>One Brief Per Campaign:</strong> Create separate briefs for different campaigns, even for the same client. This keeps deliverables organized and status tracking clean.
          </Tip>
          <Tip>
            <strong>Use Brand Kits:</strong> Always attach a Brand Kit to ensure visual consistency across all deliverable types. Create the Brand Kit first, then select it in the brief.
          </Tip>
          <Tip>
            <strong>Product Description Matters:</strong> Write a detailed product description — it feeds into AI title generation and helps when you use each tool to produce the actual content.
          </Tip>
          <Tip>
            <strong>Status as Communication:</strong> Use the brief status (Draft → Review → Approved → Delivered) as a lightweight project tracker. It's visible in the briefs list so you can see all client work at a glance.
          </Tip>
        </div>
      </Section>
    </div>
  );
}
