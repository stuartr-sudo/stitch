/**
 * AdsManagerGuidePage — comprehensive interactive guide for the Ads Manager tool.
 *
 * Accessible at /learn/ads-manager (and legacy /adsmanager-educate).
 * Covers every feature, control, and workflow in the Ads Manager.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Megaphone, Plus, Wand2, Sparkles,
  LayoutGrid, Sliders, Image as ImageIcon, Copy, BarChart2, Link2,
  Globe, Monitor, Smartphone, AlertTriangle, Lightbulb, Lock,
  Settings, CheckCircle2, Repeat, Target, FileText, Layers,
  TrendingUp, Zap, HelpCircle, Download, GitBranch,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/ads/';

// ── Password Gate ──

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ads_guide_unlocked') === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'StitchAdmin') {
      sessionStorage.setItem('ads_guide_unlocked', '1');
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (unlocked) return children;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-[#2C666E]/10 rounded-lg">
            <Lock className="w-5 h-5 text-[#2C666E]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Admin Access</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ads Manager Guide</p>
          </div>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
            error ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/30' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E]'
          }`}
          autoFocus
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">Incorrect password</p>}
        <button
          type="submit"
          className="w-full bg-[#2C666E] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#235058] transition-colors"
        >
          Unlock Guide
        </button>
      </form>
    </div>
  );
}

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

// ── Warning callout ──

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Inline badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' }) {
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
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-40">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{children}</span>
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

// ── Platform status table ──

function PlatformTable() {
  const rows = [
    { platform: 'Google Ads', badge: <Badge icon={Globe} label="Google Ads" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />, status: 'OAuth configured — needs Developer Token', statusColor: 'text-amber-600 dark:text-amber-400' },
    { platform: 'LinkedIn Ads', badge: <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />, status: 'APPROVED — reconnect LinkedIn to get ad scopes', statusColor: 'text-green-600 dark:text-green-400' },
    { platform: 'Meta Ads', badge: <Badge icon={Smartphone} label="Meta" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />, status: 'Pending App Review', statusColor: 'text-amber-600 dark:text-amber-400' },
    { platform: 'TikTok Ads', badge: <Badge label="TikTok" color="bg-gray-800 text-white" />, status: 'Pending Marketing API review', statusColor: 'text-amber-600 dark:text-amber-400' },
  ];
  return (
    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Platform</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((r) => (
            <tr key={r.platform} className="bg-white dark:bg-gray-800">
              <td className="px-4 py-3">{r.badge}</td>
              <td className={`px-4 py-3 text-xs font-medium ${r.statusColor}`}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Copy generation table ──

function CopyTable() {
  const rows = [
    { platform: <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />, what: '3 variations: introText, headline, description, CTA' },
    { platform: <Badge icon={Globe} label="Google RSA" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />, what: '15 headlines + 4 descriptions (per Google\'s RSA format)' },
    { platform: <Badge icon={Smartphone} label="Meta" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />, what: '3 variations: primaryText, headline, description, CTA' },
  ];
  return (
    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Platform</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">What's Generated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((r, i) => (
            <tr key={i} className="bg-white dark:bg-gray-800">
              <td className="px-4 py-3">{r.platform}</td>
              <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{r.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export function AdsManagerGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#2C666E]/10 to-[#2C666E]/5 dark:from-[#2C666E]/20 dark:to-[#2C666E]/10 border border-[#2C666E]/20 dark:border-[#2C666E]/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#2C666E] rounded-xl shrink-0">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Ads Manager</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Multi-platform paid ad creation with AI copy, image generation, and performance optimisation.
              Build campaigns for LinkedIn, Google RSA, and Meta — all from one brief.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />
              <Badge icon={Globe} label="Google Ads (RSA)" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
              <Badge icon={Smartphone} label="Meta (Facebook/Instagram)" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      <Section icon={LayoutGrid} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            The <strong>Ads Manager</strong> creates multi-platform ad campaigns with
            AI-generated copy and images. Give it a product description, choose your
            platforms, and it outputs platform-optimised ad variations ready to review,
            edit, and publish.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2C666E]" /> Campaigns view
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                A list of all your campaigns. Create new campaigns, open existing ones,
                or clone campaigns for rapid creative testing.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-[#2C666E]" /> All Ads view
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                A visual grid of every variation across all campaigns. Filter by
                status (draft / approved / rejected / published) and by platform
                (LinkedIn / Google / Meta).
              </p>
            </div>
          </div>
        </div>
        <Screenshot
          file="01-ads-campaigns-list.jpg"
          alt="Ads Manager campaigns list"
          caption="Campaigns list — all campaigns in one view. Click New Campaign to start."
        />
      </Section>

      {/* ── Creating a Campaign ── */}
      <Section icon={Plus} title="Creating a Campaign">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <p>Click <strong>"+ New Campaign"</strong> from the Ads Manager to open the creation form.</p>
        </div>

        <Step number="1" title="Campaign Name">
          <p>Enter a descriptive name for your own reference — e.g. "Spring Launch — LinkedIn".</p>
        </Step>

        <Step number="2" title="Product / Service Description">
          <p>
            Describe what you're advertising. Be specific — include what the product does, who it's for,
            and what makes it different. The more detail here, the better the AI-generated copy will be.
            You can type this manually or use <strong>Auto-fill with AI</strong> (see next section).
          </p>
        </Step>

        <Step number="3" title="Landing URL">
          <p>
            The URL your ads will link to — typically a product page, landing page, or homepage.
            Used for UTM tracking and included in ad previews.
          </p>
        </Step>

        <Step number="4" title="Target Audience">
          <p>
            Describe your audience in plain language, e.g. <em>"SaaS founders, 25–45, B2B"</em>.
            This shapes the tone and angle of the generated copy.
          </p>
        </Step>

        <Step number="5" title="Objective">
          <p>
            Select one: <strong>Traffic</strong>, <strong>Conversions</strong>, <strong>Awareness</strong>,
            or <strong>Lead Generation</strong>. Conversions pushes urgency and CTAs; Awareness focuses
            on brand storytelling.
          </p>
        </Step>

        <Step number="6" title="Platform Selection">
          <p>
            Choose one or more: <strong>LinkedIn</strong>, <strong>Google</strong>, <strong>Meta</strong>.
            Each platform gets its own set of ad variations tailored to that platform's format.
            Selecting multiple platforms creates separate variations for each.
          </p>
        </Step>

        <Screenshot
          file="02-new-campaign-form.jpg"
          alt="New Campaign creation form"
          caption="New Campaign form — all fields visible. Click Create Campaign to generate."
        />

        <Tip>
          The more specific your product description, the better the AI copy. Include: what the product
          does, who it's for, and what makes it different from alternatives.
        </Tip>
      </Section>

      {/* ── AI Auto-fill ── */}
      <Section icon={Wand2} title="AI Auto-fill (Product Description)">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Instead of writing the product description manually, paste your website URL or select your
            Brand Kit and click <strong>"Auto-fill with AI"</strong>. GPT-4.1 extracts product details,
            benefits, and target audience from your site and writes a ready-to-use description.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#2C666E]" /> URL Import
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Paste any webpage URL. AI scrapes the page and extracts product/service info.
                Works with product pages, landing pages, and blog posts.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2C666E]" /> Brand Kit Import
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Select one of your saved Brand Kits. Pulls in brand identity, voice, and
                guidelines so the tone matches your brand.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#2C666E]" /> Combination
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Use both URL and Brand Kit. AI synthesises both sources into one cohesive
                description covering product facts and brand voice.
              </p>
            </div>
          </div>
        </div>

        <Screenshot
          file="03-ai-autofill.jpg"
          alt="AI Auto-fill panel expanded"
          caption="Auto-fill panel — paste a URL, select a Brand Kit, or both. Click Generate Description."
        />

        <Tip>
          If the textarea already has text when you click "Generate Description", you'll be
          prompted to confirm before the existing content is replaced.
        </Tip>
        <Warning>
          URL scraping has a 30-second timeout. Bot-protected or very slow sites may fail — try a
          different page on the same site (e.g. the "About" page instead of the homepage).
        </Warning>
      </Section>

      {/* ── Platform-Specific Copy Generation ── */}
      <Section icon={Sparkles} title="Platform-Specific Copy Generation">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Once a campaign is created, open it and click <strong>"Generate Ads"</strong>.
            GPT-4.1 reads your product description, audience, objective, and Brand Kit context
            and produces platform-tailored variations. Each platform generates a different format:
          </p>
        </div>

        <CopyTable />

        <Screenshot
          file="04-generated-variations.jpg"
          alt="Generated ad variations for one platform"
          caption="Campaign editor — generated variations shown per platform. Switch between LinkedIn, Google Ads, and Meta tabs."
        />

        <Tip>
          The product description directly shapes ad quality. More detail means more specific,
          compelling copy. Vague descriptions produce generic ads.
        </Tip>
      </Section>

      {/* ── Per-Variation Workflow ── */}
      <Section icon={Sliders} title="Per-Variation Workflow">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Each variation card shows the ad copy, image, and current status. Use the action
            buttons to manage each variation individually.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Actions</h5>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-disc list-inside">
                <li><strong>Approve</strong> — saves and marks ready for launch</li>
                <li><strong>Reject</strong> — marks as rejected, hides from export</li>
                <li><strong>Edit inline</strong> — click any text field to edit, then Save</li>
                <li><strong>Delete</strong> — permanent removal</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">Status workflow</h5>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge label="Draft" color="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Default on creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="Approved" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Ready to publish</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="Rejected" color="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Marked as not usable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Screenshot
          file="05-variation-card.jpg"
          alt="Single variation card with approve, reject, edit actions"
          caption="Variation card — Approve/Reject buttons, inline text editing, Regenerate image, UTM Tracking."
        />

        <Tip>
          Approve at least 2 variations per platform — split testing shows which copy angle
          performs better in the real campaign.
        </Tip>
      </Section>

      {/* ── Ad Cloning ── */}
      <Section icon={Copy} title="Ad Cloning">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Clone an entire campaign with one click using the <strong>"Clone Ad"</strong> button
            in the Ads Manager header. This creates a new campaign with fresh AI-generated
            creative variants — different angles, different tones — based on the same brief.
          </p>
          <p>
            Use this to rapidly create multiple campaign concepts from one product description
            without starting from scratch each time.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-2">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">When to clone vs. split test</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Clone Ad</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Creates a new campaign with all new copy and images — a completely fresh creative
                  execution from the same brief. Best for presenting multiple creative directions to a client.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Split Test (within campaign)</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Duplicates or rewrites a single variation within the same campaign.
                  Best for A/B testing small differences in copy or angle.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Screenshot
          file="06-ad-clone-modal.jpg"
          alt="Clone Ad button in Ads Manager header"
          caption="Clone Ad button — one click creates a new campaign with fresh creative variants."
        />
      </Section>

      {/* ── Image Regeneration with StyleGrid ── */}
      <Section icon={ImageIcon} title="Image Regeneration with StyleGrid">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Every ad variation gets an AI-generated image using <strong>Nano Banana 2</strong> at
            the platform's optimal aspect ratio. To regenerate an image, click <strong>"Change style"</strong>
            on any variation card to open the <strong>StyleGrid</strong> — 123 visual style presets.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-2">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-2">How StyleGrid works</h5>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
              <li>Browse or search 123 style presets (the same library used across all Stitch tools)</li>
              <li>Click a style thumbnail to preview the visual direction</li>
              <li>Click <strong>"Generate with this Style"</strong> to create a new image</li>
              <li>New image appears on the variation card, replacing the previous one</li>
            </ol>
          </div>
        </div>

        <Screenshot
          file="07-style-grid.jpg"
          alt="StyleGrid showing 123 visual style presets"
          caption="StyleGrid — 123 styles for image regeneration. Each style is a detailed 40–80 word cinematography description."
        />

        <Tip>
          Try "Editorial Photography", "Studio Product Shot", or "Corporate Clean" for B2B ads.
          Style presets do far more than change colour — they define lighting, composition, and mood.
        </Tip>
      </Section>

      {/* ── Split Testing ── */}
      <Section icon={Repeat} title="Split Testing">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Two split testing options are available on each variation card. The
            <strong> All Ads</strong> canvas view shows every variation across all campaigns,
            filterable by status and platform — making it easy to compare across the board.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-[#2C666E]" /> Duplicate
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Creates an exact copy of the variation. Use this to test small edits —
                change the headline on one copy and compare performance.
              </p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#2C666E]" /> AI Split Test
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Generates a new variation with a different messaging angle at higher AI creativity.
                Useful for testing emotional vs rational, or benefit-led vs feature-led approaches.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Google RSA Tools ── */}
      <Section icon={BarChart2} title="Google RSA Tools">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Google Responsive Search Ads have additional tools not available for other platforms:
          </p>
          <div className="space-y-3 mt-2">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#2C666E]" /> Ad Strength Meter
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Shows predicted performance based on headline and description variety score.
                Aim for "Excellent" — more unique, varied copy raises the score.
              </p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#2C666E]" /> Pin to Position
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Lock specific headlines to position 1, 2, or 3 — so your most important
                message always appears first, regardless of Google's automatic mixing.
              </p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-[#2C666E]" /> CSV Export
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Downloads headlines and descriptions as a CSV formatted for Google Ads Editor
                bulk import — saves manual copy-paste into the Google Ads UI.
              </p>
            </div>
          </div>
        </div>

        <Screenshot
          file="08-google-rsa.jpg"
          alt="Google RSA specific view showing headlines and descriptions"
          caption="Google RSA tab — 15 headlines + 4 descriptions, ad strength meter, pin-to-position controls, CSV export."
        />

        <Tip>
          Google recommends at least 10 unique headlines and 3 descriptions for maximum ad strength.
          Avoid repeating the same words across headlines — variety is scored positively.
        </Tip>
        <Warning>
          Google Ads API requires BOTH OAuth tokens AND a Developer Token. OAuth alone is not
          enough — you need your Developer Token from the Google Ads API Centre (requires admin
          access to the client's Google Ads account).
        </Warning>
      </Section>

      {/* ── UTM Tracking Builder ── */}
      <Section icon={Link2} title="UTM Tracking Builder">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Each variation has a built-in <strong>UTM parameter builder</strong>. Click
            <strong> "UTM Tracking"</strong> on any variation card to expand it.
            Fill in campaign/content/term fields — platform source and medium fields
            auto-populate with platform-appropriate values.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" />
              <code className="text-xs text-gray-600 dark:text-gray-400">utm_source=linkedin &amp; utm_medium=paid_social</code>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              <Badge icon={Globe} label="Google" color="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" />
              <code className="text-xs text-gray-600 dark:text-gray-400">utm_source=google &amp; utm_medium=cpc</code>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              <Badge icon={Smartphone} label="Meta" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
              <code className="text-xs text-gray-600 dark:text-gray-400">utm_source=meta &amp; utm_medium=paid_social</code>
            </div>
          </div>
        </div>

        <Screenshot
          file="09-utm-builder.jpg"
          alt="UTM tracking builder panel"
          caption="UTM builder — platform fields auto-fill. Set campaign/content/term and the full UTM string appends to your landing URL."
        />
      </Section>

      {/* ── Download Creatives ── */}
      <Section icon={Download} title="Download Creatives ZIP">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Export all creatives for a campaign as a <strong>ZIP file</strong> for handoff to
            clients, media buyers, or direct platform upload. Click <strong>"Download Creatives"</strong>
            in the campaign editor top bar (appears once variations exist).
          </p>
          <p>
            The ZIP contains platform-correct images plus ad copy in a structured JSON file.
            Every approved variation is included, organised by platform.
          </p>
        </div>

        <Screenshot
          file="10-download-creatives.jpg"
          alt="Download Creatives button in campaign editor"
          caption="Download Creatives — top bar button exports all approved variations as a ready-to-upload ZIP."
        />
      </Section>

      {/* ── Platform API Status ── */}
      <Section icon={Globe} title="Platform API Status">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Connect platforms at <strong>Settings &rsaquo; Accounts</strong> (<code>/settings/accounts</code>).
            Each platform uses OAuth — you'll be redirected to authorise the connection.
            Current status of each platform's advertising API:
          </p>
        </div>

        <PlatformTable />

        <Warning>
          LinkedIn users who connected before the Advertising API approval must <strong>reconnect</strong> to
          get the new ad management scopes (<code>r_ads</code>, <code>w_ads</code>, <code>r_ads_reporting</code>).
          The old connection only covers organic posting.
        </Warning>
        <Warning>
          Google Ads requires BOTH OAuth tokens AND a Developer Token from the Google Ads API Centre.
          OAuth alone is not sufficient to make API calls.
        </Warning>
        <Tip>
          TikTok Ads uses a <em>separate</em> Marketing API app from the content posting connection —
          different credentials, different portal (business-api.tiktok.com vs developers.tiktok.com).
        </Tip>
      </Section>

      {/* ── Tips & Troubleshooting ── */}
      <Section icon={HelpCircle} title="Tips & Troubleshooting">
        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Common issues</h4>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">"Failed to generate description" (Auto-fill)</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Check that a valid OpenAI API key is configured in your account settings.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">URL scraping fails</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Some sites block bots or load slowly. Try a different page on the same site, or paste the content manually into the description.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">Images don't match the product</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Add more detail to your product description — include the product name, category, and key visual characteristics.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">Brand Kit not appearing in Auto-fill dropdown</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Make sure you've created at least one Brand Kit in Studio. New kits appear immediately after saving.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">Google RSA showing low ad strength</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Add more unique headlines — avoid repeating the same words or phrases. Aim for 10+ headlines covering different angles and benefits.</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick reference</h4>
            <KV label="Supported Platforms">LinkedIn, Google RSA, Meta</KV>
            <KV label="AI Model (Copy)">GPT-4.1</KV>
            <KV label="AI Model (Images)">Nano Banana 2</KV>
            <KV label="AI Model (Auto-fill)">GPT-4.1-mini</KV>
            <KV label="Variations per Platform">3 (LinkedIn / Meta), 1 RSA set (Google)</KV>
          </div>
        </div>
      </Section>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function AdsManagerGuidePage() {
  const navigate = useNavigate();

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/ads')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#2C666E]/10 rounded-lg">
                <Megaphone className="w-5 h-5 text-[#2C666E]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ads Manager Guide</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Complete reference for creating and managing ad campaigns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <AdsManagerGuideContent />
      </div>
    </PasswordGate>
  );
}
