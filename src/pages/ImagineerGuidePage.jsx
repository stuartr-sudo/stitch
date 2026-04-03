/**
 * ImagineerGuidePage — comprehensive teaching guide for all Image tools.
 *
 * Covers: Imagineer (T2I), Edit Image (I2I), Inpaint, Smoosh, Lens, Try Style,
 * and the Cohesive Prompt Builder that powers them all.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Sparkles, Wand2, Pencil, Eraser, Layers,
  RotateCcw, Shirt, Brain, AlertTriangle, Image as ImageIcon,
  Cpu, Palette, SlidersHorizontal, Camera, Eye, CheckCircle2,
  Zap, Target, Lightbulb, Upload, Focus, Grid3X3, Blend,
} from 'lucide-react';

// ── Reusable UI Components ──────────────────────────────────────────────────

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

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex gap-2">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Badge({ icon: Icon, label, color = 'bg-gray-100 text-gray-700' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

function KV({ label, children }) {
  return (
    <div className="flex gap-2 mt-1">
      <span className="text-xs font-semibold text-gray-500 shrink-0 w-36">{label}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}

function ModelTable({ models }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2 font-semibold text-gray-700">Model</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Best For</th>
            <th className="px-3 py-2 font-semibold text-gray-700 text-center">Multi-Image</th>
            <th className="px-3 py-2 font-semibold text-gray-700 text-center">LoRA</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="px-3 py-2 font-medium text-gray-900">{m.name}</td>
              <td className="px-3 py-2 text-gray-600">{m.bestFor}</td>
              <td className="px-3 py-2 text-center">{m.multiImage ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <span className="text-gray-300">--</span>}</td>
              <td className="px-3 py-2 text-center">{m.lora ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <span className="text-gray-300">--</span>}</td>
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

      {/* ── Section 1: Overview ── */}
      <Section icon={Sparkles} title="Overview: Image Creation & Editing Tools" defaultOpen={true}>
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            Stitch Studio provides a comprehensive suite of AI-powered image tools, all accessible
            from the <strong>Image Tools</strong> section in the sidebar. Each tool is designed for
            a specific workflow, but they all share a common foundation: the <strong>Cohesive Prompt Builder</strong>,
            which uses GPT-4 to assemble your structured inputs into optimized generation prompts.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {[
              { icon: Wand2, name: 'Imagineer', desc: 'Text-to-Image generation' },
              { icon: Pencil, name: 'Edit Image', desc: 'Image-to-Image editing' },
              { icon: Eraser, name: 'Inpaint', desc: 'Masked object removal/replace' },
              { icon: Layers, name: 'Smoosh', desc: 'Canvas composition & blending' },
              { icon: Focus, name: 'Lens', desc: 'Multi-angle adjustment' },
              { icon: Shirt, name: 'Try Style', desc: 'Virtual clothing try-on' },
            ].map(({ icon: I, name, desc }) => (
              <div key={name} className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <I className="w-4 h-4 text-[#2C666E] mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 text-sm">{name}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2">
            All tools support <strong>multi-style bulk create</strong> — select multiple visual styles
            and the system generates one image per style in a single batch. Brand Style Guides can be
            applied across every tool for consistent output.
          </p>
        </div>
      </Section>

      {/* ── Section 2: Imagineer (T2I) ── */}
      <Section icon={Wand2} title="Imagineer (Text-to-Image)">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            The Imagineer is a <strong>4-step wizard</strong> for generating images from text descriptions.
            Each step focuses on a different aspect of the creative brief, and the Cohesive Prompt Builder
            combines everything into a single optimized prompt before sending to the AI model.
          </p>
        </div>

        <Step number={1} title="Subject">
          <p>Define <strong>what</strong> you want to create.</p>
          <KV label="Subject Type">Person, Group of People, Object, Product, Animal, Landscape, Cityscape, Interior Space, Architecture, Vehicle, Food, Abstract Concept</KV>
          <KV label="Description">Free-text describing the subject in detail (e.g. "a confident businesswoman in a navy blazer")</KV>
          <KV label="Reference Image">Upload, paste URL, or pick from Library. AI vision (GPT-4) analyzes the image and uses its details to seed your description.</KV>
          <Tip>Upload a reference image to give the AI a concrete starting point. It uses GPT-4 vision to analyze the image and incorporate its details into the prompt.</Tip>
        </Step>

        <Step number={2} title="Style">
          <p>Choose one or more <strong>visual styles</strong> from the StyleGrid (123+ presets across categories).</p>
          <KV label="Categories">UGC, Photography, Cinematic, Art, Animation, Period, Advertising, Fashion, Fine Art, Illustration, and more</KV>
          <KV label="Multi-Style">Select multiple styles to bulk-generate one image per style in a single batch. Great for A/B testing visual directions.</KV>
          <KV label="Custom Style">Write your own style description if presets don't match your vision.</KV>
          <Tip>Each style preset contains a detailed 40-80 word prompt description that feeds into the Cohesive Prompt Builder. Longer, more specific style prompts produce noticeably better results.</Tip>
        </Step>

        <Step number={3} title="Enhance">
          <p>Fine-tune the visual characteristics of your image.</p>
          <KV label="Lighting">Natural Daylight, Golden Hour, Blue Hour, Studio, Dramatic, Neon Glow, Volumetric/God Rays, Backlit/Silhouette, Low Key, High Key</KV>
          <KV label="Camera Angle">Eye Level, High Angle, Low Angle, Bird's Eye View, Dutch Angle, POV, Wide Shot, Close-Up</KV>
          <KV label="Mood">Serene, Dramatic, Mysterious, Joyful, Melancholic, Energetic, Romantic, Tense, Ethereal, Dark, Epic</KV>
          <KV label="Color Palette">Warm, Cool, Neutral, Vibrant, Muted, Pastel, Neon, Monochrome, Cinematic (Orange & Teal)</KV>
          <KV label="Props">Quick-select accessory and object pills to add to the scene</KV>
          <KV label="Negative Prompt">Pills for things to explicitly exclude (e.g. text, watermarks, extra fingers)</KV>
          <KV label="Brand Style Guide">Apply a saved Brand Kit for consistent colors, mood, and visual rules</KV>
        </Step>

        <Step number={4} title="Output">
          <p>Select your model, dimensions, and output resolution.</p>

          <ModelTable models={[
            { name: 'Nano Banana 2', bestFor: 'Fast, general purpose', multiImage: false, lora: false },
            { name: 'Kling Image O3', bestFor: 'Multi-ref, up to 4K', multiImage: true, lora: false },
            { name: 'Seedream v4', bestFor: 'Prompt adherence & detail', multiImage: false, lora: false },
            { name: 'Flux 2 Dev', bestFor: 'Brand Kits & LoRA products', multiImage: false, lora: true },
          ]} />

          <KV label="Dimensions">1:1, 16:9, 21:9, 9:16, 4:3, 3:2, 5:4, 3:4, 4:5, 2:3</KV>
          <KV label="Output Sizes">1024x1024 up to 3840x2160 (4K). Match to your target platform.</KV>
          <KV label="LoRA Picker">Flux 2 Dev only — select trained LoRAs from Brand Kits for custom subjects/styles.</KV>
          <Warning>LoRA support is only available with Flux 2 Dev. Other models will ignore the LoRA selection.</Warning>
        </Step>
      </Section>

      {/* ── Section 3: Image-to-Image (Edit) ── */}
      <Section icon={Pencil} title="Image-to-Image (Edit)">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            The Edit tool modifies existing images based on text instructions. It shares the same
            enhance options as Imagineer (lighting, mood, style, etc.) but starts from your uploaded
            image(s) instead of a blank canvas.
          </p>
        </div>

        <Step number={1} title="Upload Images">
          <p>Add your <strong>base image</strong> and optional reference images via upload, URL, or the Library.</p>
          <KV label="Base Image">The first image is always the base that gets edited.</KV>
          <KV label="Reference Images">Additional images provide material for the AI to blend in (multi-image models only).</KV>
          <InfoBox>Multi-image models (Nano Banana Pro Ultra, Qwen, Kling O3, Nano Banana 2, Seedream 5 Lite) can blend multiple inputs. Single-image models (Flux 2 Dev, Seedream v4.5) only use the base image.</InfoBox>
        </Step>

        <Step number={2} title="Describe Your Edit">
          <p>Write what you want changed. The same enhance controls (lighting, camera, mood, color, props, negative prompt) are available.</p>
          <Tip>For multi-image composition, be explicit: "Composite the character from image 2 into the scene from image 1, matching lighting and perspective." Vague prompts produce sticker-on-background results.</Tip>
        </Step>

        <Step number={3} title="Choose Style & Model">
          <p>Select from the StyleGrid (multi-style bulk create supported) and pick your model.</p>

          <ModelTable models={[
            { name: 'Nano Banana Pro Ultra', bestFor: 'Multi-image blending, 4K/8K', multiImage: true, lora: false },
            { name: 'Qwen Image Edit', bestFor: 'Multi-image, great detail', multiImage: true, lora: false },
            { name: 'Kling Image O3 Edit', bestFor: 'Multi-ref @Image syntax, 4K', multiImage: true, lora: false },
            { name: 'Flux 2 Dev (LoRA)', bestFor: 'Brand Kits & custom products', multiImage: false, lora: true },
            { name: 'Nano Banana 2', bestFor: 'Fast multi-image composition', multiImage: true, lora: false },
            { name: 'Seedream v4.5', bestFor: 'High detail editing', multiImage: false, lora: false },
            { name: 'Seedream 5 Lite', bestFor: 'Multi-image intelligent editing', multiImage: true, lora: false },
          ]} />

          <Warning>Flux 2 Dev is the only edit model that supports edit strength (0-1) and mask painting for selective edits. Other models apply edits globally.</Warning>
        </Step>

        <Step number={4} title="Output Settings">
          <p>Choose dimensions and output size, then generate. Same options as Imagineer T2I.</p>
        </Step>
      </Section>

      {/* ── Section 4: Inpaint ── */}
      <Section icon={Eraser} title="Inpaint (Object Removal & Replacement)">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            Inpaint lets you edit <strong>specific regions</strong> of an image using a painted mask.
            The masked area gets replaced based on your prompt, while everything outside the mask stays untouched.
          </p>
        </div>

        <Step number={1} title="Upload Your Image">
          <p>Upload the image you want to edit. This becomes the canvas for mask painting.</p>
        </Step>

        <Step number={2} title="Paint the Mask">
          <p>Use the brush tool to paint over the area you want changed.</p>
          <KV label="White regions">Areas the AI will edit/replace</KV>
          <KV label="Black regions">Areas that are preserved as-is</KV>
          <KV label="Brush size">Adjustable slider for precision</KV>
          <KV label="Eraser">Remove parts of the mask you painted by mistake</KV>
          <Warning>The mask must cover the <strong>entire</strong> area you want changed. Partial masks lead to artifacts at the edges.</Warning>
        </Step>

        <Step number={3} title="Describe What to Add">
          <p>Write a prompt describing what should appear in the masked region.</p>
          <KV label="For replacement">Describe the new content: "a red vintage sports car"</KV>
          <KV label="For removal">Leave the prompt empty or describe the background: "clean grass field"</KV>
        </Step>

        <Step number={4} title="Generate">
          <p>Uses the <strong>Qwen Image Edit</strong> model. Toggle Pro Ultra mode for higher quality (slower).</p>
          <Tip>For clean removal, paint generously over the object and describe the background that should fill in. The AI handles blending automatically.</Tip>
        </Step>
      </Section>

      {/* ── Section 5: Smoosh (Compositor) ── */}
      <Section icon={Layers} title="Smoosh (Canvas Compositor)">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            Smoosh is a <strong>canvas-based compositor</strong> for arranging multiple images into a single
            composition. You drag, resize, and layer images on a canvas, then the AI seamlessly blends them
            together with professional lighting and color matching.
          </p>
        </div>

        <Step number={1} title="Add Images to Canvas">
          <p>Upload multiple images. Each becomes a draggable, resizable layer on the canvas.</p>
        </Step>

        <Step number={2} title="Arrange & Resize">
          <p>Drag images to position them. Resize handles let you scale each layer. Layer order controls which elements appear in front.</p>
          <KV label="Canvas Sizes">1080x1080 (Instagram), 1920x1080 (YouTube), 1080x1920 (Stories), and more</KV>
          <KV label="Controls">Drag to position, corner handles to resize, layer order buttons</KV>
        </Step>

        <Step number={3} title="Choose Enhancement Preset">
          <p>Select how the AI should refine the composition.</p>
          <KV label="Blending">Seamless, Natural, Harmonize — focus on smooth transitions</KV>
          <KV label="Advertising">Product Shot, Lifestyle, Minimalist, Bold — commercial looks</KV>
          <KV label="Cinematic">Cinematic, Golden Hour, Moody — film-inspired grading</KV>
          <KV label="Artistic">Dreamy, Vintage, Neon, Watercolor — creative effects</KV>
          <KV label="Technical">Sharpen, Upscale — quality enhancement</KV>
        </Step>

        <Step number={4} title="Generate">
          <p>The AI (Wavespeed Nano Banana Pro) renders the final seamless composite with matched lighting and shadows.</p>
          <Tip>Use canvas dimension presets to match your target platform — 1080x1080 for Instagram, 1920x1080 for YouTube thumbnails.</Tip>
        </Step>
      </Section>

      {/* ── Section 6: Lens ── */}
      <Section icon={Focus} title="Lens (Multi-Angle Adjustment)">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            Lens adjusts the <strong>viewing angle and perspective</strong> of an existing image.
            Perfect for product photography where you need slightly different angles without reshooting.
          </p>
        </div>

        <Step number={1} title="Upload Your Image">
          <p>Upload the image you want to adjust the perspective of.</p>
        </Step>

        <Step number={2} title="Adjust Angles">
          <KV label="Horizontal Angle">Rotate left/right (degrees) — simulates camera panning</KV>
          <KV label="Vertical Angle">Rotate up/down (degrees) — simulates camera tilt</KV>
          <KV label="Zoom">Adjust zoom level — push in or pull out</KV>
        </Step>

        <Step number={3} title="Generate">
          <p>Uses <strong>Qwen Image Edit</strong> to render the new perspective with AI-generated fill for newly visible areas.</p>
          <Tip>Lens works best with subjects that have clear 3D form — products, buildings, vehicles. It can struggle with flat patterns or abstract images.</Tip>
        </Step>
      </Section>

      {/* ── Section 7: Try Style ── */}
      <Section icon={Shirt} title="Try Style (Virtual Try-On)">
        <div className="mt-3 text-sm text-gray-600 space-y-2">
          <p>
            Try Style renders <strong>clothing on a person</strong> using AI fit simulation.
            Upload a model photo and a garment image, and the AI produces a realistic try-on render.
          </p>
        </div>

        <Step number={1} title="Upload Model Photo">
          <p>A clear, front-facing photo of the person wearing the garment. Good lighting helps.</p>
        </Step>

        <Step number={2} title="Upload Garment Image">
          <p>The clothing item to try on. Can be a flat-lay, on-model shot, or product image.</p>
        </Step>

        <Step number={3} title="Configure">
          <KV label="Engine">FASHN AI v1.6 (realistic) or Flux 2 Stylized (creative/editorial)</KV>
          <KV label="Category">Auto-detect, or specify: Tops, Bottoms, One-pieces</KV>
          <KV label="Mode">Performance (fast), Balanced, Quality (slow but best)</KV>
          <KV label="Garment Type">Auto, On-model, or Flat-lay — helps the AI understand the input</KV>
          <KV label="Samples">1-4 output variations per generation</KV>
          <Tip>FASHN produces the most realistic try-ons. Flux 2 Stylized is better for creative or editorial looks with prompt-based control.</Tip>
          <Warning>For best results with FASHN, use a clean front-facing model photo with good lighting and minimal occlusion.</Warning>
        </Step>
      </Section>

      {/* ── Section 8: Cohesive Prompt Builder ── */}
      <Section icon={Brain} title="Cohesive Prompt Builder (Behind the Scenes)">
        <div className="mt-3 text-sm text-gray-600 space-y-3">
          <p>
            The <strong>Cohesive Prompt Builder</strong> is the shared prompt assembly system that powers
            every image tool. Instead of writing raw prompts yourself, you fill in structured fields
            (subject, style, mood, lighting, camera, color, props, etc.) and <strong>GPT-4</strong>
            assembles them into a single optimized generation prompt.
          </p>
          <p>
            This ensures consistent, well-structured prompts regardless of which tool or model you're using.
            The builder understands each tool's requirements and adapts the prompt format accordingly.
          </p>

          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 text-sm mb-2">How It Works</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>1.</strong> You fill in structured fields across the wizard steps (subject, style, enhance, etc.)</p>
              <p><strong>2.</strong> All fields are sent to the <code className="text-xs bg-gray-200 px-1 rounded">/api/prompt/build-cohesive</code> endpoint</p>
              <p><strong>3.</strong> GPT-4 assembles everything into a single, optimized prompt — resolving conflicts, adding coherence, and formatting for the target model</p>
              <p><strong>4.</strong> The optimized prompt is sent to the selected image model for generation</p>
            </div>
          </div>

          <KV label="Supported tools">Imagineer, Edit Image, Turnaround, Storyboard, JumpStart</KV>
          <KV label="Inputs accepted">Description, style, props, negative prompt, brand guide, lighting, camera, mood, color palette, reference description</KV>
          <KV label="Mode toggle">Builder mode (structured fields) vs. Freeform mode (raw prompt text)</KV>

          <Tip>Even in freeform mode, the prompt builder optimizes your text before sending it to the image model. You can always switch between builder and freeform without losing your inputs.</Tip>
        </div>
      </Section>

      {/* ── Section 9: Tips & Best Practices ── */}
      <Section icon={Lightbulb} title="Tips & Best Practices">
        <div className="mt-3 text-sm text-gray-600 space-y-4">

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Choosing the Right Tool</h4>
            <div className="space-y-1">
              <KV label="Starting from scratch">Use Imagineer (T2I) with a detailed subject description</KV>
              <KV label="Modifying an image">Use Edit Image (I2I) for global changes to existing images</KV>
              <KV label="Removing objects">Use Inpaint with mask painting for surgical edits</KV>
              <KV label="Combining images">Use Smoosh for canvas-based layout, or multi-image Edit for AI blending</KV>
              <KV label="New perspective">Use Lens to adjust camera angle without reshooting</KV>
              <KV label="Clothing on model">Use Try Style for virtual garment fitting</KV>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Model Selection Guide</h4>
            <div className="space-y-1">
              <KV label="Fastest">Nano Banana 2 — best for quick iterations and drafts</KV>
              <KV label="Highest quality">Seedream v4 / v4.5 — excellent prompt adherence and detail</KV>
              <KV label="Brand assets">Flux 2 Dev — the only model supporting LoRA for custom trained subjects</KV>
              <KV label="Multi-reference">Kling Image O3 — supports multiple reference images with @Image syntax</KV>
              <KV label="Multi-image edit">Seedream 5 Lite or Nano Banana Pro Ultra — intelligent multi-image blending</KV>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Multi-Style Workflow</h4>
            <p>
              Select multiple styles in the StyleGrid to generate one image per style in a single batch.
              This is the fastest way to A/B test visual directions. Each result can be individually
              saved, retried, or used as input for further editing.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Reference Images</h4>
            <div className="space-y-1">
              <KV label="T2I Reference">Analyzed by GPT-4 vision and described textually to seed the prompt</KV>
              <KV label="I2I References">Directly blended by multi-image models as visual input</KV>
              <KV label="Best practice">Use high-quality, well-lit reference images. The better the input, the better the output.</KV>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Brand Consistency</h4>
            <p>
              For consistent output across all tools, create a <strong>Brand Kit</strong> (sidebar &rarr; Brand)
              with your colors, mood, and visual rules. Then select the Brand Style Guide in the enhance step.
              For custom subjects (products, mascots), train a <strong>LoRA</strong> (sidebar &rarr; Train LoRA)
              and use it with Flux 2 Dev.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Resolution Guide</h4>
            <div className="space-y-1">
              <KV label="Social media">1080x1080 (feed), 1080x1920 (stories/reels)</KV>
              <KV label="Website/blog">1920x1080 or 2560x1440</KV>
              <KV label="Print quality">3840x2160 (4K) or use Topaz upscaling</KV>
              <KV label="Thumbnail">1280x720 or 1920x1080</KV>
            </div>
          </div>

          <Warning>
            AI-generated images from FAL.ai CDN URLs are <strong>temporary</strong> and expire within hours.
            Always save generated images to your Library before closing the modal. Saved images are stored permanently in Supabase.
          </Warning>
        </div>
      </Section>

    </div>
  );
}
