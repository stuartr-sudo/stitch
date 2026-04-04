/**
 * BrandKitGuidePage — comprehensive guide for the Brand Kit feature.
 *
 * Accessible as the 'brandkit' tab in LearnPage.
 * Covers setup methods, every field, and how Brand Kit feeds into other tools.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, AlertTriangle, BookOpen, Palette, Globe,
  Upload, Wand2, Link, FileText, Users, Shield, Youtube,
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

// ── Field row ──

function FieldRow({ name, description }) {
  return (
    <div className="py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="text-sm font-mono font-medium text-[#2C666E] dark:text-[#4ea8b0] mb-0.5">{name}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
    </div>
  );
}

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/brand-kit';

export function BrandKitGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07393C] to-[#2C666E] p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Brand Kit</h1>
        <p className="text-white/80 text-lg">
          Set up your brand once. Use it everywhere — ads, posts, carousels, storyboards, and image generation.
        </p>
      </div>

      {/* Overview */}
      <Section icon={BookOpen} title="What Is Brand Kit?" defaultOpen>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Brand Kit stores your brand identity — name, logo, colors, voice, and visual style — in one place. Once configured, it feeds automatically into every tool: Ads Manager uses your tagline and target market, LinkedIn uses your brand voice, Carousels use your colors and logo, Storyboards use it as visual context for AI generation. You configure it once and it makes every AI output more on-brand without extra prompting or repetition.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          You can create multiple brands — for example, one per client if you work at an agency — and switch between them. Each brand is independent with its own fields, avatars, LoRAs, and connected YouTube channel.
        </p>
        <img
          src={`${CDN}/01-brand-kit-modal.jpg`}
          alt="Brand Kit modal — full view"
          className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg my-4"
        />
      </Section>

      {/* How to Access */}
      <Section icon={Globe} title="How to Access Brand Kit">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The Brand Kit is accessed from the <strong>Studio sidebar</strong>. Click the <strong>Brand</strong> button near the top of the left sidebar — it opens a slide-over panel with your brand list on the left and the editor on the right.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          A Brand Kit selector also appears in many individual tools — Ads Manager, LinkedIn post creation, Carousel creation, and Storyboard generation all let you pick which brand to use before generating content. If you only have one brand configured, it's selected automatically.
        </p>
        <Tip>
          Create your brand before starting any campaign. Tools that inject brand context (voice, taglines, colors) can only do so if the Brand Kit is already filled out.
        </Tip>
      </Section>

      {/* 3 Auto-fill Methods */}
      <Section icon={Wand2} title="Auto-Fill Methods — Fastest Setup">
        <img
          src={`${CDN}/02-auto-fill.jpg`}
          alt="Auto-fill bar — Upload PDF and URL input highlighted"
          className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg my-4"
        />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Rather than filling in every field manually, you can auto-populate the entire Brand Kit in seconds using one of three methods:
        </p>

        <Step number={1} title="Extract from URL (recommended)">
          <p>
            Paste your brand's website URL into the URL bar at the top of the editor, then click <strong>Extract</strong>. Stitch scrapes the page via Firecrawl and sends the content to GPT to extract name, tagline, voice, colors, target market, and visual style. Takes 10–20 seconds.
          </p>
          <Tip>
            Works best on pages with clear marketing copy — your homepage, about page, or product page. Try your homepage first; if the content is thin, try the About page. Heavy JavaScript single-page apps without server-side rendering may return limited content.
          </Tip>
        </Step>

        <Step number={2} title="Extract from PDF brand guidelines">
          <p>
            Click <strong>Upload PDF</strong> and select your brand guidelines document. GPT-4.1-mini reads the PDF and extracts name, tagline, colors, voice, visual direction, and composition preferences — the same fields as URL extraction. This is the best option when you have a formal brand guidelines document.
          </p>
        </Step>

        <Step number={3} title="Fill manually">
          <p>
            Fill each field directly using the Identity, Voice, and Visual tabs. Use this when you don't have a website or guidelines PDF, or when you want precise control over each field value.
          </p>
          <img
            src={`${CDN}/03-manual-fields.jpg`}
            alt="Identity tab with Brand Name field highlighted"
            className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md mt-3"
          />
        </Step>

        <Warning>
          Auto-fill <em>pre-populates</em> the form — it does not auto-save. Review the extracted fields and click <strong>Update Brand</strong> at the bottom to save.
        </Warning>
      </Section>

      {/* Identity Fields */}
      <Section icon={FileText} title="Field Guide — Identity Tab">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
          Identity fields describe who your brand is. These are used in ad copy, post text, and as context for all AI generation tasks.
        </p>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-3 divide-y divide-gray-100 dark:divide-gray-700">
          <FieldRow
            name="brand_name"
            description="Your brand or company name. Used in ad copy headlines, LinkedIn posts, and as the identity anchor for all AI generation."
          />
          <FieldRow
            name="brand_username"
            description="Lowercase slug used as a shared identifier across Stitch, SEWO, and Doubleclicker (e.g. 'acmecorp'). No spaces — letters, numbers, hyphens, underscores only."
          />
          <FieldRow
            name="blurb"
            description="One to two sentence elevator pitch for the brand. Feeds into ad copy generation as the product/brand description context."
          />
          <FieldRow
            name="website"
            description="Your primary website URL. Used as the default destination URL in ads and UTM tracking builder presets."
          />
          <FieldRow
            name="logo_url"
            description="Direct URL to your logo image (PNG or SVG preferred). Used by the Satori compositor for Carousel slides and LinkedIn images. Should be a transparent-background PNG for best results."
          />
          <FieldRow
            name="target_market"
            description="Who your customers are — demographics, psychographics, job titles, company sizes. The Ads Manager injects this into its audience-targeting copy generation prompt."
          />
          <FieldRow
            name="brand_personality"
            description="Character adjectives that define the brand (e.g. 'bold, innovative, trustworthy'). Shapes tone across all AI-written copy."
          />
          <FieldRow
            name="taglines"
            description="A list of slogans and taglines. The AI picks from these when generating ad headlines. Add as many as you have — more variety gives better results."
          />
        </div>

        <img
          src={`${CDN}/04-logo-upload.jpg`}
          alt="Identity tab scrolled to show logo URL and taglines"
          className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md mt-4"
        />

        <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-gray-800 dark:text-gray-200">YouTube Channel</strong> — At the bottom of the Identity tab is a YouTube connection section. Connect your YouTube channel here to enable direct video publishing from the Queue and Shorts Workbench. Each brand can have its own YouTube channel linked.
        </div>
      </Section>

      {/* Voice Fields */}
      <Section icon={FileText} title="Field Guide — Voice Tab">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
          Voice fields define how your brand writes and speaks. These are the most impactful fields for LinkedIn posts, ad copy, and any text generation that asks for brand tone.
        </p>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-3 divide-y divide-gray-100 dark:divide-gray-700">
          <FieldRow
            name="voice_style"
            description="Overall tone category — one of: professional, energetic, casual, luxury, playful. A quick signal for AI tools to orient copy style before reading the detailed description."
          />
          <FieldRow
            name="brand_voice_detail"
            description="Full description of how the brand communicates — tone, formality level, language style, how it addresses the reader, what vocabulary it uses. The more specific this is, the more consistent your AI-generated copy will be."
          />
          <FieldRow
            name="content_style_rules"
            description="Hard rules for content creation: formatting preferences, dos and don'ts, structural requirements (e.g. 'always end with a CTA', 'never use exclamation marks', 'use short paragraphs of 2–3 sentences')."
          />
          <FieldRow
            name="preferred_elements"
            description="Content elements the brand actively wants to include — customer testimonials, data points, before/after comparisons, product close-ups. Guides what AI includes when generating content."
          />
          <FieldRow
            name="prohibited_elements"
            description="Things to explicitly avoid — competitor mentions by name, political content, unverified claims, stock photo clichés. AI generation will actively avoid these when this field is populated."
          />
        </div>
        <Tip>
          The <strong>brand_voice_detail</strong> field has the most impact on copy quality. Write it as if briefing a copywriter who has never heard of your brand — tone, register, examples of good and bad copy, what to sound like and what to avoid.
        </Tip>
      </Section>

      {/* Visual Fields */}
      <Section icon={Palette} title="Field Guide — Visual Tab">
        <img
          src={`${CDN}/05-visual-style.jpg`}
          alt="Visual tab — style, mood, and lighting fields"
          className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg my-4"
        />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Visual fields shape every AI image generation that uses brand context — Imagineer, Storyboard visual direction, Carousel backgrounds, and Turnaround sheets.
        </p>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-3 divide-y divide-gray-100 dark:divide-gray-700">
          <FieldRow
            name="colors"
            description="Hex color codes for your brand palette. Used by the Carousel compositor and LinkedIn image compositor for backgrounds and gradient styling. Add primary and secondary colors. Example: #1A1A2E, #E94560."
          />
          <FieldRow
            name="style_preset"
            description="Overall visual style category — one of: modern, minimal, bold, luxury, playful, corporate. A quick classifier used alongside visual_style_notes for image generation context."
          />
          <FieldRow
            name="visual_style_notes"
            description="Photography and illustration style description — how images should look (e.g. 'clean product photography with neutral backgrounds, minimal text overlays, sans-serif typography, lots of white space')."
          />
          <FieldRow
            name="mood_atmosphere"
            description="The emotional register of your visuals — aspirational, calm, energetic, trustworthy. This feeds directly into Storyboard visual direction and Imagineer prompt context."
          />
          <FieldRow
            name="lighting_prefs"
            description="Preferred lighting style for generated images and video (e.g. 'soft natural window light', 'clean studio lighting with soft shadows', 'dramatic side lighting')."
          />
          <FieldRow
            name="composition_style"
            description="Framing and layout preferences (e.g. 'rule of thirds, product centered with negative space', 'symmetrical layouts, close-up product shots')."
          />
          <FieldRow
            name="ai_prompt_rules"
            description="Special instructions injected directly into AI image generation prompts for this brand. Use this for specific requirements that don't fit the other fields — e.g. 'always include brand primary color in the image', 'photorealistic rendering only, no illustration styles'."
          />
          <FieldRow
            name="default_loras"
            description="LoRA weights applied to all image generation for this brand, unless a specific template overrides them. Select from your trained brand LoRAs or the pre-built LoRA library. Useful for consistent character appearance across all generated assets."
          />
        </div>
        <img
          src={`${CDN}/06-colors.jpg`}
          alt="Visual tab scrolled to colors section"
          className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md mt-4"
        />
        <Tip>
          The <strong>ai_prompt_rules</strong> field is the most direct way to constrain image generation. Write it as a set of instructions appended to every prompt — 'always X', 'never Y', 'use Z style'. Keep it concise; long rules get diluted.
        </Tip>
      </Section>

      {/* Avatars */}
      <Section icon={Users} title="Avatars Tab — Character Personas">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Avatars are named characters or personas used in your video ads and generated content. Each avatar has a reference image and an optional LoRA for consistent character generation across images and video clips.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          To add an avatar: click <strong>Add Avatar</strong>, give them a name and description, paste a reference image URL, and optionally add a LoRA weights URL with its trigger word. If no LoRA is linked yet, you can trigger LoRA training directly from the avatar card — Stitch will send your reference images through the LoRA trainer and link the resulting weights back to this avatar automatically.
        </p>
        <Tip>
          Avatars appear as character selectors in tools like the Turnaround Sheet wizard and the video generation pipeline. Linking a trained LoRA to an avatar is what enables truly consistent character appearance — without a LoRA, only the reference image is used for visual guidance.
        </Tip>
      </Section>

      {/* How it feeds into tools */}
      <Section icon={Users} title="Brand Kit in Other Tools">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
          Each tool uses a different subset of Brand Kit fields. Here's what gets used where:
        </p>
        <div className="overflow-x-auto my-3">
          <table className="text-sm w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                <th className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 w-36">Tool</th>
                <th className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Fields Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">Ads Manager</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">brand_name, taglines, target_market, blurb, logo_url, colors — shown in ad preview mockups, used in copy generation prompt</td>
              </tr>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">LinkedIn</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">brand_name, voice_style, brand_personality, brand_voice_detail, content_style_rules — shapes post tone and structure</td>
              </tr>
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">Carousels</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">brand_name, colors, style_preset, logo_url — Satori compositor uses these for slide backgrounds and branding</td>
              </tr>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">Storyboards</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">All identity + visual fields — fed to the visual director stage for consistent aesthetic across all scenes</td>
              </tr>
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">Imagineer</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">ai_prompt_rules, style_preset, mood_atmosphere, default_loras — injected into the Cohesive Prompt Builder pipeline</td>
              </tr>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">LoRA Training</td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">Trained LoRAs are associated with your brand via brand_kit_id and appear in the LoRAPicker for all image generation tools</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* SEWO Connect */}
      <Section icon={Shield} title="SEWO Connect">
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          If you are a SEWO user, the <strong>SEWO tab</strong> lets you pull brand guidelines from the Doubleclicker platform automatically. Select a brand from the dropdown to import brand voice, target market, image style direction, and color palette from the shared Doubleclicker brand tables — no manual entry needed.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Once connected, the brand fields are pre-populated from Doubleclicker's data. You can then fine-tune individual fields before saving. The connection is per-brand — each brand in your Brand Kit list can be linked to a different Doubleclicker brand record.
        </p>
        <Tip>
          SEWO Connect requires a valid <strong>brand_username</strong> that matches a record in the Doubleclicker shared tables. Set this first on the Identity tab before trying to connect.
        </Tip>
      </Section>

    </div>
  );
}
