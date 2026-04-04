/**
 * ImagineerGuidePage — comprehensive teaching guide for the Imagineer image tool.
 *
 * Covers: T2I wizard (4 steps), multi-style bulk create, I2I editing,
 * multi-image composition, reference image analysis, models, and tips.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Sparkles, Wand2, Pencil, Eraser, Layers,
  RotateCcw, Shirt, Brain, AlertTriangle, Image as ImageIcon,
  Cpu, Palette, SlidersHorizontal, Camera, Eye, CheckCircle2,
  Zap, Target, Lightbulb, Upload, Focus, Grid3X3, Blend,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/imagineer/';

// ── Reusable UI Components ──────────────────────────────────────────────────

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
      <span className="shrink-0">💡</span>
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

function InfoBox({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function GuideImage({ file, alt }) {
  return (
    <img
      src={CDN + file}
      alt={alt}
      className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4"
    />
  );
}

function ModelTable({ models }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
            <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Model</th>
            <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Best For</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}>
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{m.name}</td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{m.bestFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

export function ImagineerGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

      {/* ── Hero ── */}
      <div className="rounded-xl bg-gradient-to-br from-[#07393C] to-[#2C666E] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Imagineer</h1>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">
          AI image generation and editing. Two modes: <strong className="text-white">Text-to-Image</strong> for
          creating from scratch using a 4-step wizard, and <strong className="text-white">Image-to-Image</strong> for
          editing, transforming, and compositing existing images.
        </p>
      </div>

      {/* ── Section 1: Overview ── */}
      <Section icon={Sparkles} title="Overview" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Imagineer is accessible from <strong>Image Tools</strong> in the sidebar. It combines two
            complementary workflows in one modal: the T2I wizard guides you through subject, style,
            enhance, and output steps to generate images from text; the I2I editor takes one or more
            source images and transforms them based on your prompt.
          </p>
          <p>
            Both modes are powered by the <strong>Cohesive Prompt Builder</strong> — your structured
            inputs (subject, style, lighting, mood, etc.) are assembled by GPT-4.1 mini into a single
            optimized generation prompt before being sent to the AI model. This means you get
            consistently well-structured prompts without having to write prompt engineering yourself.
          </p>
          <p>
            The key difference between modes: T2I starts from nothing and builds up; I2I starts from
            an existing image and modifies it. Multi-image I2I lets you blend multiple source images
            together — for example, placing a character into a scene.
          </p>
          <GuideImage file="01-imagineer-modal.jpg" alt="Imagineer modal open showing Text to Image and Image to Image mode tabs" />
        </div>
      </Section>

      {/* ── Section 2: T2I Wizard ── */}
      <Section icon={Wand2} title="Text-to-Image Wizard">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            The T2I mode is a <strong>4-step wizard</strong>. Each step focuses on one aspect of the
            creative brief. You move through them with the Next button — earlier steps remain editable
            if you go back. The Cohesive Prompt Builder assembles everything at generation time.
          </p>
        </div>

        <Step number={1} title="Subject — what are you generating?">
          <p>
            Choose a subject type (Person, Object, Animal, Landscape, Architecture, etc.) and write
            a detailed description. The more specific you are, the better the result.
          </p>
          <p>
            <strong>Bad:</strong> "a cat" — <strong>Good:</strong> "a cyberpunk cat hacker in a neon-lit
            server room, wearing a hoodie, green holographic screens reflected in its eyes"
          </p>
          <p>
            You can optionally attach a reference image via upload, Library, or URL. GPT-4.1 mini
            vision analyzes the reference and incorporates its details into the prompt as a starting
            point — useful for character consistency or style matching.
          </p>
          <GuideImage file="02-t2i-subject.jpg" alt="T2I Step 1 — subject input with description field and reference image area" />
        </Step>

        <Step number={2} title="Style — how should it look?">
          <p>
            Choose from <strong>86 visual style presets</strong> across categories including
            Photography, Cinematic, Illustration, Animation, Fashion, Advertising, Fine Art, and more.
            Each preset contains a detailed 40–80 word description that controls aesthetic, lighting,
            composition, and rendering approach — not just a label.
          </p>
          <p>
            You can also write a custom style description if none of the presets match your vision.
          </p>
          <GuideImage file="03-t2i-style.jpg" alt="T2I Step 2 — style selector showing StyleGrid with visual style presets" />
          <Tip>
            Style preset quality matters. The detailed descriptions in the presets produce noticeably
            better results than short prompts. If writing a custom style, aim for 40+ words describing
            lighting, mood, rendering technique, and color treatment.
          </Tip>
        </Step>

        <Step number={3} title="Enhance — fine-tune the details">
          <p>
            Optional but significant. Enhance controls let you specify lighting (Golden Hour, Studio,
            Neon Glow, Volumetric…), camera angle (Eye Level, Bird's Eye, Close-Up…), mood (Dramatic,
            Ethereal, Joyful…), color palette (Warm, Muted, Neon, Cinematic…), and props. You can
            also add a negative prompt to explicitly exclude unwanted elements (extra fingers, text,
            watermarks, blurry).
          </p>
          <p>
            A saved <strong>Brand Style Guide</strong> can be applied here to enforce consistent colors,
            mood, and visual rules across all your generations.
          </p>
          <GuideImage file="04-t2i-enhance.jpg" alt="T2I Step 3 — enhance controls for lighting, mood, camera angle, and color" />
        </Step>

        <Step number={4} title="Output — model, dimensions, and generate">
          <p>
            Select your model, aspect ratio, and output resolution. T2I supports four models:
          </p>
          <ModelTable models={[
            { name: 'Nano Banana 2', bestFor: 'Fast generation, general purpose, great for quick iterations' },
            { name: 'Seedream v4', bestFor: 'High quality portraits and scenes, excellent prompt adherence' },
            { name: 'Flux 2 (LoRA)', bestFor: 'Custom character and style LoRAs from Brand Kits' },
            { name: 'Kling Image O3', bestFor: 'Multi-reference support, up to 4K resolution' },
          ]} />
          <GuideImage file="05-t2i-output.jpg" alt="T2I Step 4 — model selector and generate button" />
          <Warning>
            LoRA support is only available with Flux 2 Dev. Selecting a LoRA with any other model
            will have no effect.
          </Warning>
        </Step>
      </Section>

      {/* ── Section 3: Multi-Style Bulk Create ── */}
      <Section icon={Grid3X3} title="Multi-Style Bulk Create">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            In the Style step, you can select <strong>multiple styles</strong> from the StyleGrid at
            once. When you do, Imagineer generates one image per style simultaneously — giving you a
            grid of results to compare. This is the fastest way to explore different visual directions
            for the same subject without running each one manually.
          </p>
          <GuideImage file="06-style-grid.jpg" alt="StyleGrid showing multiple visual style presets available to select" />
          <p>
            Each result in the multi-style grid can be saved, retried, or used independently. Generation
            is batched in groups of two to avoid API rate limits — so 6 styles takes 3 batches.
          </p>
          <GuideImage file="07-multi-style.jpg" alt="Multiple styles selected in the StyleGrid for bulk generation" />
          <Tip>
            Use multi-style bulk create when a client brief is open-ended or you're not sure which
            visual direction will resonate. Generate 4–6 styles in a single run, then present the
            grid for review rather than iterating one at a time.
          </Tip>
        </div>
      </Section>

      {/* ── Section 4: I2I Editing ── */}
      <Section icon={Pencil} title="Image-to-Image Editing">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Switch to <strong>Image to Image</strong> mode using the tab at the top of the Imagineer
            modal. Instead of a multi-step wizard, I2I presents a single panel: upload your source
            image(s), write your edit instruction, choose a style and model, then generate.
          </p>
          <p>
            All the same enhance controls are available — lighting, mood, camera angle, color palette,
            props, and negative prompt. The Cohesive Prompt Builder applies to I2I too, so structured
            inputs produce better results than a raw prompt.
          </p>
          <GuideImage file="08-i2i-mode.jpg" alt="Image to Image mode panel with image upload area and edit controls" />
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">I2I Models</h4>
          <ModelTable models={[
            { name: 'Nano Banana 2', bestFor: 'Fast multi-image composition and blending' },
            { name: 'Seedream v4', bestFor: 'High quality image-to-image transformations' },
            { name: 'Wavespeed Nano Ultra', bestFor: 'Fast blending, good for style transfer' },
            { name: 'Qwen Image Edit', bestFor: 'Multi-image synthesis and detail-aware editing' },
          ]} />
          <GuideImage file="09-i2i-models.jpg" alt="I2I model selector showing available models" />
        </div>
      </Section>

      {/* ── Section 5: Multi-Image Composition ── */}
      <Section icon={Blend} title="Multi-Image Composition">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            Several I2I models (Nano Banana 2, Wavespeed Nano Ultra, Qwen Image Edit) support
            uploading <strong>multiple source images</strong> at once. The AI composites them into
            a single result — for example, placing a character from one image into a scene from another,
            or blending product images with lifestyle backgrounds.
          </p>
          <GuideImage file="10-multi-image.jpg" alt="Multi-image input UI showing multiple image slots in I2I mode" />
          <p>
            The key to good multi-image composites is being explicit in your prompt about the
            compositional relationship you want. Vague prompts produce "sticker on background" results
            where the subjects look pasted rather than integrated.
          </p>
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prompt examples</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>Too vague:</strong> "put the character in the scene"
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              <strong>Explicit:</strong> "composite the character from the first image into the scene from the
              second image, matching the lighting direction and color temperature, with natural shadows
              and perspective integration"
            </p>
          </div>
          <Tip>
            For best compositing results, use images with similar lighting direction. A character lit
            from the left placed into a scene lit from the right will always look off, even with a
            perfect prompt.
          </Tip>
        </div>
      </Section>

      {/* ── Section 6: Reference Image Analysis ── */}
      <Section icon={Eye} title="Reference Image Analysis">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>
            In T2I Step 1 (Subject), you can upload a reference image and click <strong>"Describe"</strong>.
            GPT-4.1 mini vision analyzes the reference and generates a detailed character or scene
            description that you can use as the basis for your prompt.
          </p>
          <p>
            This is particularly useful for character consistency — upload a turnaround sheet or
            reference illustration, let the AI describe it, then use that description as the subject
            for every scene in a project. The description captures details a human might miss or
            forget to specify (exact clothing, distinctive features, color values).
          </p>
          <Tip>
            For character consistency across multiple images, keep the same reference image attached
            in every generation. The described characteristics feed into the Cohesive Prompt Builder
            and persist as an anchor for the visual identity.
          </Tip>
        </div>
      </Section>

      {/* ── Section 7: Tips ── */}
      <Section icon={Lightbulb} title="Tips and Model Guide">
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-4">

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Choosing a model</h4>
            <div className="space-y-1.5">
              <p><strong className="text-gray-700 dark:text-gray-300">Nano Banana 2</strong> — fastest turnaround. Use for quick drafts, iteration, and multi-image composition. Available in both T2I and I2I.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Seedream v4</strong> — highest visual quality. Use for final hero images, portraits, and detailed scenes where accuracy matters.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Flux 2 (LoRA)</strong> — the only model that supports trained LoRAs. Required for custom characters, products, or brand-specific subjects trained in Brand Kits.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Wavespeed Nano Ultra</strong> — I2I only. Fast style transfer and blending, good for lightweight transformations.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Qwen Image Edit</strong> — I2I only. Strong multi-image synthesis, detail-aware editing that respects fine features.</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Workflow recommendations</h4>
            <div className="space-y-1.5">
              <p><strong className="text-gray-700 dark:text-gray-300">Exploring directions:</strong> Use multi-style bulk create with Nano Banana 2 (fast + cheap) to generate 4–6 options, then switch to Seedream v4 to refine the chosen direction.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Character work:</strong> Generate a base character with T2I, then use I2I to vary poses, outfits, or environments while maintaining the core identity via reference.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Product shots:</strong> Generate clean product images with T2I, then use I2I multi-image to composite the product into lifestyle backgrounds.</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Resolution guide</h4>
            <div className="space-y-1.5">
              <p><strong className="text-gray-700 dark:text-gray-300">Social media feed:</strong> 1080×1080 (1:1) or 1080×1350 (4:5)</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Stories / Reels:</strong> 1080×1920 (9:16)</p>
              <p><strong className="text-gray-700 dark:text-gray-300">YouTube thumbnail:</strong> 1920×1080 (16:9)</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Print / High resolution:</strong> 3840×2160 (4K) — use Topaz upscaling from the Library if you need to go larger</p>
            </div>
          </div>

          <Warning>
            <strong>T2I and I2I use separate endpoints.</strong> Nano Banana 2 in T2I mode hits
            <code className="text-xs mx-1 px-1 bg-red-100 dark:bg-red-900/40 rounded">fal-ai/nano-banana-2</code>
            while I2I mode hits
            <code className="text-xs mx-1 px-1 bg-red-100 dark:bg-red-900/40 rounded">fal-ai/nano-banana-2/edit</code>.
            These are different models with different capabilities. The same applies to Seedream.
            The modal handles this automatically — just make sure you're on the right tab.
          </Warning>

          <Warning>
            FAL CDN image URLs are <strong>temporary</strong> and expire within hours. Always save
            generated images to your Library before closing the modal. Saved images are stored
            permanently in Supabase and accessible from the Library panel.
          </Warning>

        </div>
      </Section>

    </div>
  );
}
