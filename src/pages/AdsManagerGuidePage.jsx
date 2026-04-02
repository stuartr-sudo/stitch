/**
 * AdsManagerGuidePage — comprehensive interactive guide for the Ads Manager tool.
 *
 * Accessible at /adsmanager-educate (admin-only, behind PasswordGate).
 * Covers every feature, control, and workflow in the Ads Manager.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Megaphone, Plus, Wand2, Sparkles,
  LayoutGrid, Sliders, Image as ImageIcon, Copy, BarChart2, Link2,
  Globe, Monitor, Smartphone, AlertTriangle, Lightbulb, Lock,
  Settings, CheckCircle2, Repeat, Target, FileText, Layers,
  TrendingUp, Zap, HelpCircle, Download,
} from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-[#2C666E]/10 rounded-lg">
            <Lock className="w-5 h-5 text-[#2C666E]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Admin Access</h2>
            <p className="text-xs text-gray-500">Ads Manager Guide</p>
          </div>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E]'
          }`}
          autoFocus
        />
        {error && <p className="text-xs text-red-600">Incorrect password</p>}
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
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
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
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ── Tip callout ──

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

// ── Warning callout ──

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Inline badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 text-gray-700' }) {
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
      <span className="text-xs font-semibold text-gray-500 shrink-0 w-40">{label}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export function AdsManagerGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* ── Overview ── */}
      <Section icon={LayoutGrid} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            The <strong>Ads Manager</strong> creates multi-platform ad campaigns with
            AI-generated copy and images. Give it a product description, choose your
            platforms, and it outputs platform-optimised ad variations ready to review,
            edit, and publish.
          </p>
          <p>
            There are two views in the Ads Manager:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2C666E]" /> Campaigns view
              </h5>
              <p className="text-xs text-gray-600">
                A list of all your campaigns. Create new campaigns, open existing ones,
                or delete campaigns you no longer need.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-[#2C666E]" /> All Ads view
              </h5>
              <p className="text-xs text-gray-600">
                A visual grid of every variation across all campaigns. Filter by
                status (draft / approved / rejected / published) and by platform
                (LinkedIn / Google / Meta).
              </p>
            </div>
          </div>
          <div className="mt-3">
            <h5 className="font-semibold text-gray-800 text-xs mb-2">Supported platforms</h5>
            <div className="flex flex-wrap gap-2">
              <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
              <Badge icon={Globe} label="Google Ads (RSA)" color="bg-green-100 text-green-700" />
              <Badge icon={Smartphone} label="Meta (Facebook/Instagram)" color="bg-blue-100 text-blue-700" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Creating a Campaign ── */}
      <Section icon={Plus} title="Creating a Campaign">
        <Step number="1" title="Open the New Campaign modal">
          <p>From the Ads Manager (<code>/ads</code>), click the <strong>"+ New Campaign"</strong> button.</p>
        </Step>

        <Step number="2" title="Fill in Campaign Name">
          <p>Enter a descriptive name — this is for your own reference (e.g. "Spring Launch — LinkedIn").</p>
        </Step>

        <Step number="3" title="Add Product / Service Description">
          <p>
            Describe what you're advertising. Be specific — mention the product name, key features,
            target benefit, and what makes it different. The more detail here, the better the
            AI-generated copy will be. You can type this manually or use <strong>Auto-fill with AI</strong> (see next section).
          </p>
        </Step>

        <Step number="4" title="Add Landing URL">
          <p>
            The URL your ads will link to — typically a product page, landing page, or homepage.
            This is used for UTM tracking and included in the ad preview.
          </p>
        </Step>

        <Step number="5" title="Set Target Audience">
          <p>
            Describe who you're targeting in plain language (e.g. <em>"SaaS founders, 25–45, B2B"</em>).
            This shapes the tone and angle of the generated copy.
          </p>
        </Step>

        <Step number="6" title="Choose Objective">
          <p>
            Select one: <strong>Traffic</strong>, <strong>Conversions</strong>, <strong>Awareness</strong>,
            or <strong>Lead Generation</strong>. The objective changes the AI's copy emphasis —
            Conversions pushes urgency and CTAs; Awareness focuses on brand storytelling.
          </p>
        </Step>

        <Step number="7" title="Select Platforms">
          <p>
            Choose one or more: <strong>LinkedIn</strong>, <strong>Google</strong>, <strong>Meta</strong>.
            Each platform gets its own set of ad variations tailored to that platform's format.
          </p>
        </Step>

        <Step number="8" title="Create Campaign">
          <p>
            Click <strong>"Create Campaign"</strong> — this saves the campaign and opens the campaign editor,
            where you can generate ad variations and manage them.
          </p>
        </Step>

        <Tip>
          Selecting multiple platforms creates separate variations optimised for each platform's format.
          A single campaign can have LinkedIn singles, Google RSA headline sets, and Meta variations all at once.
        </Tip>
      </Section>

      {/* ── Auto-fill with AI ── */}
      <Section icon={Wand2} title="Auto-fill with AI">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            The <strong>Auto-fill with AI</strong> panel sits above the Product Description textarea.
            It saves you from writing the description by hand — the AI scrapes a URL, reads your
            Brand Kit, or both, and writes a ready-to-use description for you.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-1">Source modes</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#2C666E]" /> URL Import
              </h5>
              <p className="text-xs text-gray-600">
                Paste any webpage URL. AI scrapes the page and extracts product/service info.
                Works with product pages, landing pages, articles, and blog posts.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2C666E]" /> Brand Kit Import
              </h5>
              <p className="text-xs text-gray-600">
                Select one of your saved Brand Kits. Pulls in brand identity, voice, visual style,
                and guidelines to match your brand's tone.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#2C666E]" /> Combination
              </h5>
              <p className="text-xs text-gray-600">
                Check both URL and Brand Kit. The AI synthesises both sources into a single
                cohesive description that covers product facts and brand voice.
              </p>
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 mt-5 mb-1 text-sm">How to use Auto-fill</h4>
        <Step number="1" title="Expand the panel">
          <p>Click <strong>"Auto-fill with AI"</strong> to expand the collapsible panel above the Product Description textarea.</p>
        </Step>
        <Step number="2" title="Check your sources">
          <p>Tick <strong>URL</strong>, <strong>Brand Kit</strong>, or both — depending on what you want to pull in.</p>
        </Step>
        <Step number="3" title="Configure each source">
          <p>
            For <strong>URL</strong>: paste the full page URL (must begin with <code>http://</code> or <code>https://</code>).<br />
            For <strong>Brand Kit</strong>: select from the dropdown (auto-selects if you only have one kit saved).
          </p>
        </Step>
        <Step number="4" title="Generate Description">
          <p>
            Click <strong>"Generate Description"</strong>. The panel shows progress:
            <em> "Scraping URL…" → "Generating description…"</em>. Typically takes 10–30 seconds.
          </p>
        </Step>
        <Step number="5" title="Review and edit">
          <p>
            The generated description appears in the textarea. It's fully editable — tweak the
            wording, add specifics, or use it as-is.
          </p>
        </Step>

        <Tip>
          The AI produces natural prose, not bullet points. It focuses on what the product IS and its
          value proposition. If Brand Kit is included, the tone will match your brand voice automatically.
        </Tip>
        <Tip>
          If the textarea already has text when you click "Generate Description", you'll get a
          confirmation prompt before the existing content is replaced.
        </Tip>
        <Warning>
          URL scraping has a 30-second timeout. Very slow or bot-protected sites may fail — try a
          different page on the same site (e.g. the "About" page instead of the homepage).
        </Warning>
        <Tip>
          No Brand Kit yet? Head to Studio to create one. You can auto-fill Brand Kit fields from a
          URL or PDF there too.
        </Tip>
      </Section>

      {/* ── Generating Ad Variations ── */}
      <Section icon={Sparkles} title="Generating Ad Variations">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Once a campaign is created, open it and click <strong>"Generate Ads"</strong>.
            GPT-4.1 reads your product description, audience, objective, and Brand Kit context
            and produces platform-tailored variations.
          </p>
          <div className="space-y-3 mt-3">
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
                <span className="text-xs text-gray-500">3 variations</span>
              </div>
              <p className="text-xs text-gray-600">
                Each variation has <strong>Intro Text</strong>, <strong>Headline</strong>,
                <strong> Description</strong>, and <strong>CTA</strong> — matching LinkedIn's
                sponsored content format.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Globe} label="Google RSA" color="bg-green-100 text-green-700" />
                <span className="text-xs text-gray-500">1 RSA set</span>
              </div>
              <p className="text-xs text-gray-600">
                <strong>15 headlines</strong> (30 chars max each) +
                <strong> 4 descriptions</strong> (90 chars max each) — Google's
                Responsive Search Ad format. Google mixes and matches these automatically.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Smartphone} label="Meta" color="bg-blue-100 text-blue-700" />
                <span className="text-xs text-gray-500">3 variations</span>
              </div>
              <p className="text-xs text-gray-600">
                Each variation has <strong>Primary Text</strong>, <strong>Headline</strong>,
                <strong> Description</strong>, and <strong>CTA</strong> — optimised for
                Facebook and Instagram feeds.
              </p>
            </div>
          </div>
        </div>
        <Tip>
          The product description you wrote (or Auto-filled) directly shapes ad quality.
          More detail means more specific, compelling copy. Vague descriptions produce generic ads.
        </Tip>
      </Section>

      {/* ── Managing Variations ── */}
      <Section icon={Sliders} title="Managing Variations">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Each variation card shows the ad copy, image, and current status. You can manage
            variations individually or view all of them across campaigns in the <strong>All Ads</strong> view.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-2">Status workflow</h5>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge label="Draft" color="bg-gray-100 text-gray-600" />
                  <span className="text-xs text-gray-600">Default on creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="Approved" color="bg-green-100 text-green-700" />
                  <span className="text-xs text-gray-600">Ready to publish</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="Rejected" color="bg-red-100 text-red-600" />
                  <span className="text-xs text-gray-600">Marked as not usable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label="Published" color="bg-purple-100 text-purple-700" />
                  <span className="text-xs text-gray-600">Sent to platform</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-2">Actions per variation</h5>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                <li><strong>Approve / Reject</strong> — click the status buttons on the card</li>
                <li><strong>Edit inline</strong> — click any text field to edit, then Save</li>
                <li><strong>Delete</strong> — remove a variation you don't want</li>
                <li><strong>Regenerate Image</strong> — get a new AI-generated image</li>
                <li><strong>Split Test</strong> — duplicate or generate an alternative angle</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            The <strong>All Ads view</strong> lets you see every variation across all campaigns
            at once. Use the status and platform filters to focus on what you need to review.
          </p>
        </div>
      </Section>

      {/* ── Image Generation & Styles ── */}
      <Section icon={ImageIcon} title="Image Generation & Styles">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Every ad variation gets an AI-generated image using <strong>Nano Banana 2</strong>.
            Images are generated at the platform's optimal aspect ratio automatically.
          </p>
          <p>
            To regenerate an image for any variation, click <strong>"Regenerate Image"</strong>
            on the variation card. This opens the <strong>StyleGrid</strong> — 123 visual style
            presets to guide the aesthetic.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mt-2">
            <h5 className="font-semibold text-gray-900 text-xs mb-2">How StyleGrid works</h5>
            <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Browse or search the 123 style presets (same library used across all Stitch tools)</li>
              <li>Click a style to preview it — the thumbnail shows the visual direction</li>
              <li>Click <strong>"Generate with this Style"</strong> to create a new image</li>
              <li>New image appears on the variation card, replacing the previous one</li>
            </ol>
          </div>
        </div>
        <Tip>
          Style presets use detailed 40–80 word descriptions under the hood — they do much more
          than just change colour. Try "Editorial Photography", "Studio Product Shot", or
          "Corporate Clean" for B2B ads.
        </Tip>
      </Section>

      {/* ── Split Testing ── */}
      <Section icon={Repeat} title="Split Testing">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Two split testing options are available on each variation card:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-[#2C666E]" /> Duplicate
              </h5>
              <p className="text-xs text-gray-600">
                Creates an exact copy of the variation. Use this when you want to test
                small edits to the same copy — change the headline on one and compare.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#2C666E]" /> AI Split Test
              </h5>
              <p className="text-xs text-gray-600">
                Generates a new variation with a different messaging angle using higher
                AI creativity. Useful for testing completely different approaches —
                emotional vs rational, benefit-led vs feature-led.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Google RSA Tools ── */}
      <Section icon={BarChart2} title="Google RSA Tools">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Google Responsive Search Ads have additional tools not available for other platforms:
          </p>
          <div className="space-y-3 mt-2">
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#2C666E]" /> Ad Strength Meter
              </h5>
              <p className="text-xs text-gray-600">
                Shows how well your headline and description combinations score against
                Google's best-practice criteria. Aim for "Excellent" — more unique, varied
                copy raises the score.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#2C666E]" /> Pin to Position
              </h5>
              <p className="text-xs text-gray-600">
                Lock specific headlines to position 1, 2, or 3 — so your most important
                message always appears first, regardless of Google's automatic mixing.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-[#2C666E]" /> CSV Export
              </h5>
              <p className="text-xs text-gray-600">
                Downloads headlines and descriptions as a CSV file formatted for
                Google Ads Editor bulk import — saves manual copy-paste into the Google Ads UI.
              </p>
            </div>
          </div>
        </div>
        <Tip>
          Google recommends at least 10 unique headlines and 3 descriptions for maximum ad strength.
          Avoid repeating the same words across headlines — variety is scored positively.
        </Tip>
      </Section>

      {/* ── UTM Tracking ── */}
      <Section icon={Link2} title="UTM Tracking">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Each variation has a built-in <strong>UTM parameter builder</strong>. It appends
            tracking parameters to your landing URL so you can see exactly which ad drove
            traffic in Google Analytics.
          </p>
          <h4 className="font-semibold text-gray-900 text-sm mt-3 mb-2">Platform auto-fill presets</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
              <code className="text-xs text-gray-600">utm_source=linkedin &amp; utm_medium=paid_social</code>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <Badge icon={Globe} label="Google" color="bg-green-100 text-green-700" />
              <code className="text-xs text-gray-600">utm_source=google &amp; utm_medium=cpc</code>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <Badge icon={Smartphone} label="Meta" color="bg-blue-100 text-blue-700" />
              <code className="text-xs text-gray-600">utm_source=meta &amp; utm_medium=paid_social</code>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            You can also set <strong>utm_campaign</strong>, <strong>utm_term</strong>, and <strong>utm_content</strong>
            manually for each variation. The final UTM string is automatically appended to your landing URL.
          </p>
        </div>
      </Section>

      {/* ── Platform Connections ── */}
      <Section icon={Globe} title="Platform Connections">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Connect platforms at <strong>Settings &rsaquo; Accounts</strong> (<code>/settings/accounts</code>).
            Each platform uses OAuth — you'll be redirected to the platform to authorise the connection.
          </p>
          <div className="space-y-2 mt-3">
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
                <span className="text-xs text-green-600 font-medium">Advertising API Approved</span>
              </div>
              <p className="text-xs text-gray-600">
                OAuth with full Advertising API access. Scopes include <code>r_ads</code>,
                <code> w_ads</code>, and <code>r_ads_reporting</code> for campaign management and reporting.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Globe} label="Google Ads" color="bg-green-100 text-green-700" />
                <span className="text-xs text-amber-600 font-medium">Pending Developer Token</span>
              </div>
              <p className="text-xs text-gray-600">
                OAuth is configured and working. API calls also require a Developer Token from the
                Google Ads API Centre — this needs admin access to the client's Google Ads account.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Smartphone} label="Meta" color="bg-blue-100 text-blue-700" />
                <span className="text-xs text-amber-600 font-medium">Organic Only (Ads Pending)</span>
              </div>
              <p className="text-xs text-gray-600">
                Current OAuth covers organic posting only. Ads management scopes
                (<code>ads_management</code>, <code>ads_read</code>) require Meta App Review with
                Business Verification — currently under review.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge icon={Smartphone} label="TikTok Ads" color="bg-gray-800 text-white" />
                <span className="text-xs text-amber-600 font-medium">Marketing API Under Review</span>
              </div>
              <p className="text-xs text-gray-600">
                Separate Marketing API application submitted to business-api.tiktok.com.
                Under review — estimated 1–2 weeks. Uses different credentials from the content
                posting TikTok connection.
              </p>
            </div>
          </div>
        </div>
        <Warning>
          LinkedIn users who connected before the Advertising API approval must <strong>reconnect</strong> to
          get the new ad management permissions (<code>r_ads</code>, <code>w_ads</code>, <code>r_ads_reporting</code>).
          The old connection only has organic posting scopes.
        </Warning>
        <Tip>
          Google Ads requires BOTH OAuth tokens AND a Developer Token from the Google Ads API Centre.
          OAuth alone is not enough to make API calls. The Developer Token comes from the client's
          Google Ads account admin.
        </Tip>
      </Section>

      {/* ── Tips & Troubleshooting ── */}
      <Section icon={HelpCircle} title="Tips & Troubleshooting">
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <h4 className="font-semibold text-gray-900 mb-3">Common issues</h4>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 text-xs">"Failed to generate description" (Auto-fill)</p>
              <p className="text-xs text-gray-600 mt-0.5">Check that a valid OpenAI API key is configured in your account settings.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 text-xs">URL scraping fails</p>
              <p className="text-xs text-gray-600 mt-0.5">Some sites block bots or are too slow. Try a different page on the same site, or paste the content manually into the description.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 text-xs">Images don't match the product</p>
              <p className="text-xs text-gray-600 mt-0.5">Add more detail to your product description — include the product name, category, and key visual characteristics.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 text-xs">Brand Kit not appearing in Auto-fill dropdown</p>
              <p className="text-xs text-gray-600 mt-0.5">Make sure you've created at least one Brand Kit in Studio. New kits appear immediately after saving.</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-medium text-gray-800 text-xs">Google RSA showing low ad strength</p>
              <p className="text-xs text-gray-600 mt-0.5">Add more unique headlines — avoid repeating the same words or phrases. Aim for 10+ headlines covering different angles and benefits.</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 space-y-1">
            <h4 className="font-semibold text-gray-900 mb-3">Quick reference</h4>
            <KV label="Supported Platforms">LinkedIn, Google, Meta</KV>
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/ads')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#2C666E]/10 rounded-lg">
                <Megaphone className="w-5 h-5 text-[#2C666E]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Ads Manager Guide</h1>
                <p className="text-xs text-gray-500">Complete reference for creating and managing ad campaigns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

          {/* ── Overview ── */}
          <Section icon={LayoutGrid} title="Overview" defaultOpen={true}>
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                The <strong>Ads Manager</strong> creates multi-platform ad campaigns with
                AI-generated copy and images. Give it a product description, choose your
                platforms, and it outputs platform-optimised ad variations ready to review,
                edit, and publish.
              </p>
              <p>
                There are two views in the Ads Manager:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#2C666E]" /> Campaigns view
                  </h5>
                  <p className="text-xs text-gray-600">
                    A list of all your campaigns. Create new campaigns, open existing ones,
                    or delete campaigns you no longer need.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-[#2C666E]" /> All Ads view
                  </h5>
                  <p className="text-xs text-gray-600">
                    A visual grid of every variation across all campaigns. Filter by
                    status (draft / approved / rejected / published) and by platform
                    (LinkedIn / Google / Meta).
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <h5 className="font-semibold text-gray-800 text-xs mb-2">Supported platforms</h5>
                <div className="flex flex-wrap gap-2">
                  <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
                  <Badge icon={Globe} label="Google Ads (RSA)" color="bg-green-100 text-green-700" />
                  <Badge icon={Smartphone} label="Meta (Facebook/Instagram)" color="bg-blue-100 text-blue-700" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Creating a Campaign ── */}
          <Section icon={Plus} title="Creating a Campaign">
            <Step number="1" title="Open the New Campaign modal">
              <p>From the Ads Manager (<code>/ads</code>), click the <strong>"+ New Campaign"</strong> button.</p>
            </Step>

            <Step number="2" title="Fill in Campaign Name">
              <p>Enter a descriptive name — this is for your own reference (e.g. "Spring Launch — LinkedIn").</p>
            </Step>

            <Step number="3" title="Add Product / Service Description">
              <p>
                Describe what you're advertising. Be specific — mention the product name, key features,
                target benefit, and what makes it different. The more detail here, the better the
                AI-generated copy will be. You can type this manually or use <strong>Auto-fill with AI</strong> (see next section).
              </p>
            </Step>

            <Step number="4" title="Add Landing URL">
              <p>
                The URL your ads will link to — typically a product page, landing page, or homepage.
                This is used for UTM tracking and included in the ad preview.
              </p>
            </Step>

            <Step number="5" title="Set Target Audience">
              <p>
                Describe who you're targeting in plain language (e.g. <em>"SaaS founders, 25–45, B2B"</em>).
                This shapes the tone and angle of the generated copy.
              </p>
            </Step>

            <Step number="6" title="Choose Objective">
              <p>
                Select one: <strong>Traffic</strong>, <strong>Conversions</strong>, <strong>Awareness</strong>,
                or <strong>Lead Generation</strong>. The objective changes the AI's copy emphasis —
                Conversions pushes urgency and CTAs; Awareness focuses on brand storytelling.
              </p>
            </Step>

            <Step number="7" title="Select Platforms">
              <p>
                Choose one or more: <strong>LinkedIn</strong>, <strong>Google</strong>, <strong>Meta</strong>.
                Each platform gets its own set of ad variations tailored to that platform's format.
              </p>
            </Step>

            <Step number="8" title="Create Campaign">
              <p>
                Click <strong>"Create Campaign"</strong> — this saves the campaign and opens the campaign editor,
                where you can generate ad variations and manage them.
              </p>
            </Step>

            <Tip>
              Selecting multiple platforms creates separate variations optimised for each platform's format.
              A single campaign can have LinkedIn singles, Google RSA headline sets, and Meta variations all at once.
            </Tip>
          </Section>

          {/* ── Auto-fill with AI ── */}
          <Section icon={Wand2} title="Auto-fill with AI">
            <div className="mt-3 text-sm text-gray-600 space-y-2">
              <p>
                The <strong>Auto-fill with AI</strong> panel sits above the Product Description textarea.
                It saves you from writing the description by hand — the AI scrapes a URL, reads your
                Brand Kit, or both, and writes a ready-to-use description for you.
              </p>
              <h4 className="font-semibold text-gray-900 mt-4 mb-1">Source modes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#2C666E]" /> URL Import
                  </h5>
                  <p className="text-xs text-gray-600">
                    Paste any webpage URL. AI scrapes the page and extracts product/service info.
                    Works with product pages, landing pages, articles, and blog posts.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#2C666E]" /> Brand Kit Import
                  </h5>
                  <p className="text-xs text-gray-600">
                    Select one of your saved Brand Kits. Pulls in brand identity, voice, visual style,
                    and guidelines to match your brand's tone.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#2C666E]" /> Combination
                  </h5>
                  <p className="text-xs text-gray-600">
                    Check both URL and Brand Kit. The AI synthesises both sources into a single
                    cohesive description that covers product facts and brand voice.
                  </p>
                </div>
              </div>
            </div>

            <h4 className="font-semibold text-gray-900 mt-5 mb-1 text-sm">How to use Auto-fill</h4>
            <Step number="1" title="Expand the panel">
              <p>Click <strong>"Auto-fill with AI"</strong> to expand the collapsible panel above the Product Description textarea.</p>
            </Step>
            <Step number="2" title="Check your sources">
              <p>Tick <strong>URL</strong>, <strong>Brand Kit</strong>, or both — depending on what you want to pull in.</p>
            </Step>
            <Step number="3" title="Configure each source">
              <p>
                For <strong>URL</strong>: paste the full page URL (must begin with <code>http://</code> or <code>https://</code>).<br />
                For <strong>Brand Kit</strong>: select from the dropdown (auto-selects if you only have one kit saved).
              </p>
            </Step>
            <Step number="4" title="Generate Description">
              <p>
                Click <strong>"Generate Description"</strong>. The panel shows progress:
                <em> "Scraping URL…" → "Generating description…"</em>. Typically takes 10–30 seconds.
              </p>
            </Step>
            <Step number="5" title="Review and edit">
              <p>
                The generated description appears in the textarea. It's fully editable — tweak the
                wording, add specifics, or use it as-is.
              </p>
            </Step>

            <Tip>
              The AI produces natural prose, not bullet points. It focuses on what the product IS and its
              value proposition. If Brand Kit is included, the tone will match your brand voice automatically.
            </Tip>
            <Tip>
              If the textarea already has text when you click "Generate Description", you'll get a
              confirmation prompt before the existing content is replaced.
            </Tip>
            <Warning>
              URL scraping has a 30-second timeout. Very slow or bot-protected sites may fail — try a
              different page on the same site (e.g. the "About" page instead of the homepage).
            </Warning>
            <Tip>
              No Brand Kit yet? Head to Studio to create one. You can auto-fill Brand Kit fields from a
              URL or PDF there too.
            </Tip>
          </Section>

          {/* ── Generating Ad Variations ── */}
          <Section icon={Sparkles} title="Generating Ad Variations">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Once a campaign is created, open it and click <strong>"Generate Ads"</strong>.
                GPT-4.1 reads your product description, audience, objective, and Brand Kit context
                and produces platform-tailored variations.
              </p>
              <div className="space-y-3 mt-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
                    <span className="text-xs text-gray-500">3 variations</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Each variation has <strong>Intro Text</strong>, <strong>Headline</strong>,
                    <strong> Description</strong>, and <strong>CTA</strong> — matching LinkedIn's
                    sponsored content format.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Globe} label="Google RSA" color="bg-green-100 text-green-700" />
                    <span className="text-xs text-gray-500">1 RSA set</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    <strong>15 headlines</strong> (30 chars max each) +
                    <strong> 4 descriptions</strong> (90 chars max each) — Google's
                    Responsive Search Ad format. Google mixes and matches these automatically.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Smartphone} label="Meta" color="bg-blue-100 text-blue-700" />
                    <span className="text-xs text-gray-500">3 variations</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Each variation has <strong>Primary Text</strong>, <strong>Headline</strong>,
                    <strong> Description</strong>, and <strong>CTA</strong> — optimised for
                    Facebook and Instagram feeds.
                  </p>
                </div>
              </div>
            </div>
            <Tip>
              The product description you wrote (or Auto-filled) directly shapes ad quality.
              More detail means more specific, compelling copy. Vague descriptions produce generic ads.
            </Tip>
          </Section>

          {/* ── Managing Variations ── */}
          <Section icon={Sliders} title="Managing Variations">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Each variation card shows the ad copy, image, and current status. You can manage
                variations individually or view all of them across campaigns in the <strong>All Ads</strong> view.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-2">Status workflow</h5>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge label="Draft" color="bg-gray-100 text-gray-600" />
                      <span className="text-xs text-gray-600">Default on creation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label="Approved" color="bg-green-100 text-green-700" />
                      <span className="text-xs text-gray-600">Ready to publish</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label="Rejected" color="bg-red-100 text-red-600" />
                      <span className="text-xs text-gray-600">Marked as not usable</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label="Published" color="bg-purple-100 text-purple-700" />
                      <span className="text-xs text-gray-600">Sent to platform</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-2">Actions per variation</h5>
                  <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                    <li><strong>Approve / Reject</strong> — click the status buttons on the card</li>
                    <li><strong>Edit inline</strong> — click any text field to edit, then Save</li>
                    <li><strong>Delete</strong> — remove a variation you don't want</li>
                    <li><strong>Regenerate Image</strong> — get a new AI-generated image</li>
                    <li><strong>Split Test</strong> — duplicate or generate an alternative angle</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                The <strong>All Ads view</strong> lets you see every variation across all campaigns
                at once. Use the status and platform filters to focus on what you need to review.
              </p>
            </div>
          </Section>

          {/* ── Image Generation & Styles ── */}
          <Section icon={ImageIcon} title="Image Generation & Styles">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Every ad variation gets an AI-generated image using <strong>Nano Banana 2</strong>.
                Images are generated at the platform's optimal aspect ratio automatically.
              </p>
              <p>
                To regenerate an image for any variation, click <strong>"Regenerate Image"</strong>
                on the variation card. This opens the <strong>StyleGrid</strong> — 123 visual style
                presets to guide the aesthetic.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <h5 className="font-semibold text-gray-900 text-xs mb-2">How StyleGrid works</h5>
                <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                  <li>Browse or search the 123 style presets (same library used across all Stitch tools)</li>
                  <li>Click a style to preview it — the thumbnail shows the visual direction</li>
                  <li>Click <strong>"Generate with this Style"</strong> to create a new image</li>
                  <li>New image appears on the variation card, replacing the previous one</li>
                </ol>
              </div>
            </div>
            <Tip>
              Style presets use detailed 40–80 word descriptions under the hood — they do much more
              than just change colour. Try "Editorial Photography", "Studio Product Shot", or
              "Corporate Clean" for B2B ads.
            </Tip>
          </Section>

          {/* ── Split Testing ── */}
          <Section icon={Repeat} title="Split Testing">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Two split testing options are available on each variation card:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="border border-gray-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-[#2C666E]" /> Duplicate
                  </h5>
                  <p className="text-xs text-gray-600">
                    Creates an exact copy of the variation. Use this when you want to test
                    small edits to the same copy — change the headline on one and compare.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#2C666E]" /> AI Split Test
                  </h5>
                  <p className="text-xs text-gray-600">
                    Generates a new variation with a different messaging angle using higher
                    AI creativity. Useful for testing completely different approaches —
                    emotional vs rational, benefit-led vs feature-led.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Google RSA Tools ── */}
          <Section icon={BarChart2} title="Google RSA Tools">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Google Responsive Search Ads have additional tools not available for other platforms:
              </p>
              <div className="space-y-3 mt-2">
                <div className="border border-gray-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2C666E]" /> Ad Strength Meter
                  </h5>
                  <p className="text-xs text-gray-600">
                    Shows how well your headline and description combinations score against
                    Google's best-practice criteria. Aim for "Excellent" — more unique, varied
                    copy raises the score.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-[#2C666E]" /> Pin to Position
                  </h5>
                  <p className="text-xs text-gray-600">
                    Lock specific headlines to position 1, 2, or 3 — so your most important
                    message always appears first, regardless of Google's automatic mixing.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h5 className="font-semibold text-gray-900 text-xs mb-1 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-[#2C666E]" /> CSV Export
                  </h5>
                  <p className="text-xs text-gray-600">
                    Downloads headlines and descriptions as a CSV file formatted for
                    Google Ads Editor bulk import — saves manual copy-paste into the Google Ads UI.
                  </p>
                </div>
              </div>
            </div>
            <Tip>
              Google recommends at least 10 unique headlines and 3 descriptions for maximum ad strength.
              Avoid repeating the same words across headlines — variety is scored positively.
            </Tip>
          </Section>

          {/* ── UTM Tracking ── */}
          <Section icon={Link2} title="UTM Tracking">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Each variation has a built-in <strong>UTM parameter builder</strong>. It appends
                tracking parameters to your landing URL so you can see exactly which ad drove
                traffic in Google Analytics.
              </p>
              <h4 className="font-semibold text-gray-900 text-sm mt-3 mb-2">Platform auto-fill presets</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
                  <code className="text-xs text-gray-600">utm_source=linkedin &amp; utm_medium=paid_social</code>
                </div>
                <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <Badge icon={Globe} label="Google" color="bg-green-100 text-green-700" />
                  <code className="text-xs text-gray-600">utm_source=google &amp; utm_medium=cpc</code>
                </div>
                <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <Badge icon={Smartphone} label="Meta" color="bg-blue-100 text-blue-700" />
                  <code className="text-xs text-gray-600">utm_source=meta &amp; utm_medium=paid_social</code>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                You can also set <strong>utm_campaign</strong>, <strong>utm_term</strong>, and <strong>utm_content</strong>
                manually for each variation. The final UTM string is automatically appended to your landing URL.
              </p>
            </div>
          </Section>

          {/* ── Platform Connections ── */}
          <Section icon={Globe} title="Platform Connections">
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>
                Connect platforms at <strong>Settings &rsaquo; Accounts</strong> (<code>/settings/accounts</code>).
                Each platform uses OAuth — you'll be redirected to the platform to authorise the connection.
              </p>
              <div className="space-y-2 mt-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Monitor} label="LinkedIn" color="bg-sky-100 text-sky-700" />
                    <span className="text-xs text-green-600 font-medium">Advertising API Approved</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    OAuth with full Advertising API access. Scopes include <code>r_ads</code>,
                    <code> w_ads</code>, and <code>r_ads_reporting</code> for campaign management and reporting.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Globe} label="Google Ads" color="bg-green-100 text-green-700" />
                    <span className="text-xs text-amber-600 font-medium">Pending Developer Token</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    OAuth is configured and working. API calls also require a Developer Token from the
                    Google Ads API Centre — this needs admin access to the client's Google Ads account.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Smartphone} label="Meta" color="bg-blue-100 text-blue-700" />
                    <span className="text-xs text-amber-600 font-medium">Organic Only (Ads Pending)</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Current OAuth covers organic posting only. Ads management scopes
                    (<code>ads_management</code>, <code>ads_read</code>) require Meta App Review with
                    Business Verification — currently under review.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge icon={Smartphone} label="TikTok Ads" color="bg-gray-800 text-white" />
                    <span className="text-xs text-amber-600 font-medium">Marketing API Under Review</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Separate Marketing API application submitted to business-api.tiktok.com.
                    Under review — estimated 1–2 weeks. Uses different credentials from the content
                    posting TikTok connection.
                  </p>
                </div>
              </div>
            </div>
            <Warning>
              LinkedIn users who connected before the Advertising API approval must <strong>reconnect</strong> to
              get the new ad management permissions (<code>r_ads</code>, <code>w_ads</code>, <code>r_ads_reporting</code>).
              The old connection only has organic posting scopes.
            </Warning>
            <Tip>
              Google Ads requires BOTH OAuth tokens AND a Developer Token from the Google Ads API Centre.
              OAuth alone is not enough to make API calls. The Developer Token comes from the client's
              Google Ads account admin.
            </Tip>
          </Section>

          {/* ── Tips & Troubleshooting ── */}
          <Section icon={HelpCircle} title="Tips & Troubleshooting">
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <h4 className="font-semibold text-gray-900 mb-3">Common issues</h4>

              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                <div className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">"Failed to generate description" (Auto-fill)</p>
                  <p className="text-xs text-gray-600 mt-0.5">Check that a valid OpenAI API key is configured in your account settings.</p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">URL scraping fails</p>
                  <p className="text-xs text-gray-600 mt-0.5">Some sites block bots or are too slow. Try a different page on the same site, or paste the content manually into the description.</p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">Images don't match the product</p>
                  <p className="text-xs text-gray-600 mt-0.5">Add more detail to your product description — include the product name, category, and key visual characteristics.</p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">Brand Kit not appearing in Auto-fill dropdown</p>
                  <p className="text-xs text-gray-600 mt-0.5">Make sure you've created at least one Brand Kit in Studio. New kits appear immediately after saving.</p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">Google RSA showing low ad strength</p>
                  <p className="text-xs text-gray-600 mt-0.5">Add more unique headlines — avoid repeating the same words or phrases. Aim for 10+ headlines covering different angles and benefits.</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 space-y-1">
                <h4 className="font-semibold text-gray-900 mb-3">Quick reference</h4>
                <KV label="Supported Platforms">LinkedIn, Google, Meta</KV>
                <KV label="AI Model (Copy)">GPT-4.1</KV>
                <KV label="AI Model (Images)">Nano Banana 2</KV>
                <KV label="AI Model (Auto-fill)">GPT-4.1-mini</KV>
                <KV label="Variations per Platform">3 (LinkedIn / Meta), 1 RSA set (Google)</KV>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </PasswordGate>
  );
}
