import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Upload, Sparkles, Zap, Settings, Image, Video,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, Lightbulb,
  Layers, Palette, User, Camera, Clock, DollarSign, HelpCircle, FileText,
  Brain, Target, Wand2, FolderOpen, Repeat, Lock, TrendingUp,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/lora/';

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('lora_guide_unlocked') === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'StitchAdmin') {
      sessionStorage.setItem('lora_guide_unlocked', '1');
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
            <p className="text-xs text-gray-500 dark:text-gray-400">LoRA Training Studio Guide</p>
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

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'');
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={sectionId} data-guide-section={title} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm scroll-mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">{children}</div>}
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 my-3">
      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="text-sm text-amber-900 dark:text-amber-200">{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 my-3">
      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
      <div className="text-sm text-red-900 dark:text-red-200">{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex gap-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 my-3">
      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <div className="text-sm text-blue-900 dark:text-blue-200">{children}</div>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
  );
}

function ScreenshotFrame({ src, caption, alt }) {
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <img src={src} alt={alt || caption} className="w-full object-cover" loading="lazy" />
      {caption && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">{caption}</p>
        </div>
      )}
    </div>
  );
}

function ModelCard({ name, base, category, pricing, features, description, bestFor, stepRange, defaultSteps }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{base}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
          category === 'image'
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
        }`}>
          {category}
        </span>
      </div>
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{description}</p>
      )}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 shrink-0" />
          <span>{pricing}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Steps: {stepRange[0].toLocaleString()}&ndash;{stepRange[1].toLocaleString()} (default: {defaultSteps.toLocaleString()})</span>
        </div>
        {features && features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {features.map(f => (
              <span key={f} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-400">{f}</span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs font-medium text-[#2C666E]">Best for: <span className="font-normal text-gray-600 dark:text-gray-400">{bestFor}</span></p>
      </div>
    </div>
  );
}

export function LoraGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: What is a LoRA?
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Brain} title="What is a LoRA?" defaultOpen={true}>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            A LoRA (Low-Rank Adaptation) teaches an AI model to recognise a specific character, face, product,
            or visual style by training on your images. Once trained, you can reference it in any generation —
            every image output will include your trained subject consistently. Unlike prompting alone, a LoRA
            locks in identity-level details that words cannot reliably describe.
          </p>

          <InfoBox>
            <strong>Where to find it:</strong> Studio sidebar &rarr; <strong>Train LoRA</strong> button. The 3-step wizard opens
            as a slide-over panel. Completed LoRAs appear in the LoRA Picker inside Imagineer (Flux 2 model),
            Storyboards, Ads Manager, and Carousels.
          </InfoBox>

          <ScreenshotFrame
            src={CDN + '01-lora-wizard-upload.jpg'}
            alt="LoRA Training Wizard — Step 1 Upload"
            caption="Step 1: The upload screen. Drag & drop photos or import from your image library."
          />

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-[#2C666E]/5 border border-[#2C666E]/20 p-3 text-center">
              <Upload className="w-5 h-5 text-[#2C666E] mx-auto mb-1" />
              <p className="font-semibold text-gray-800 dark:text-gray-200">1. Upload</p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">10–25 photos of your subject</p>
            </div>
            <div className="rounded-lg bg-[#2C666E]/5 border border-[#2C666E]/20 p-3 text-center">
              <Settings className="w-5 h-5 text-[#2C666E] mx-auto mb-1" />
              <p className="font-semibold text-gray-800 dark:text-gray-200">2. Configure</p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">Name, trigger word, model</p>
            </div>
            <div className="rounded-lg bg-[#2C666E]/5 border border-[#2C666E]/20 p-3 text-center">
              <Zap className="w-5 h-5 text-[#2C666E] mx-auto mb-1" />
              <p className="font-semibold text-gray-800 dark:text-gray-200">3. Train</p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">5–45 min on FAL.ai GPUs</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: Training Models
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Layers} title="Training Models — All 15 Options">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Choose the model that matches your use case and budget. Image models produce still images;
            video models produce motion clips. All run on FAL.ai async GPUs — training continues in the
            background after you close the wizard.
          </p>

          <ScreenshotFrame
            src={CDN + '02-model-selector.jpg'}
            alt="Model selector dropdown showing all training models"
            caption="All available training models shown in the dropdown. FLUX LoRA Fast is the default."
          />

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-2">Image Models</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModelCard
              name="FLUX LoRA Fast"
              base="FLUX.1 [dev]"
              category="image"
              pricing="$2 flat"
              stepRange={[1, 10000]}
              defaultSteps={1000}
              features={['Style support', 'Face masks', 'No learning rate']}
              description="Fixed-price training with automatic hyperparameter calibration. Fastest path to a working LoRA."
              bestFor="Characters, products, brand assets — first LoRA for any subject"
            />
            <ModelCard
              name="FLUX Portrait Trainer"
              base="FLUX.1 [dev]"
              category="image"
              pricing="$0.0024/step"
              stepRange={[1, 10000]}
              defaultSteps={2500}
              features={['Face masks', 'Subject crop', 'Multiresolution']}
              description="Specialised portrait pipeline with automatic subject cropping and multi-resolution training."
              bestFor="Human faces, presenter characters, influencer avatars"
            />
            <ModelCard
              name="FLUX Kontext Trainer"
              base="FLUX.1 Kontext [dev]"
              category="image"
              pricing="$2.50/1000 steps"
              stepRange={[500, 10000]}
              defaultSteps={1000}
              features={['Kontext base model']}
              description="Trains on the Kontext variant of FLUX, which excels at in-context editing tasks."
              bestFor="Subjects that will be edited into existing scenes via Kontext"
            />
            <ModelCard
              name="Wan 2.2 T2I Trainer"
              base="Wan 2.2 T2I"
              category="image"
              pricing="$0.0045/step"
              stepRange={[10, 6000]}
              defaultSteps={1000}
              features={['Style support', 'Face masks', 'Auto-caption']}
              description="Wan's text-to-image model. Dual-transformer architecture; returns a high-noise LoRA alongside the standard LoRA."
              bestFor="Subjects intended for use in Wan-based image generation"
            />
            <ModelCard
              name="Qwen Image Trainer"
              base="Qwen Image"
              category="image"
              pricing="$0.002/step"
              stepRange={[1, 8000]}
              defaultSteps={1000}
              features={[]}
              description="Budget-friendly option on the Qwen Image base model."
              bestFor="Style LoRAs and cost-sensitive subject training"
            />
            <ModelCard
              name="Qwen Image Edit 2511 Trainer"
              base="Qwen Image Edit 2511"
              category="image"
              pricing="$0.004/step"
              stepRange={[100, 30000]}
              defaultSteps={1000}
              features={[]}
              description="Trains the Qwen editing model for subject-consistent edits."
              bestFor="Subjects that will be used with the Qwen edit pipeline"
            />
            <ModelCard
              name="Z-Image Turbo Trainer"
              base="Z-Image Turbo (6B)"
              category="image"
              pricing="$0.00226/step"
              stepRange={[100, 10000]}
              defaultSteps={1000}
              features={['Style support']}
              description="6B parameter turbo model. Uses a training_type field (style vs. balanced)."
              bestFor="Fast style LoRAs; cost-efficient subject training at lower budgets"
            />
            <ModelCard
              name="Z-Image Turbo V2 Trainer"
              base="Z-Image Turbo (6B)"
              category="image"
              pricing="$0.0008/step"
              stepRange={[10, 40000]}
              defaultSteps={2000}
              features={[]}
              description="V2 of Z-Image Turbo at a significantly lower cost per step. Supports very high step counts."
              bestFor="High-quality style LoRAs on a tight budget"
            />
            <ModelCard
              name="Turbo FLUX Trainer"
              base="FLUX.1 [dev]"
              category="image"
              pricing="$0.0024/step"
              stepRange={[1, 10000]}
              defaultSteps={1000}
              features={['Style support', 'Face crop']}
              description="Turbo-speed FLUX training with face cropping for portrait subjects."
              bestFor="Quick FLUX LoRAs when you need per-step cost control"
            />
            <ModelCard
              name="FLUX.2 Dev Trainer V2"
              base="FLUX.2 [dev]"
              category="image"
              pricing="$0.0255/step"
              stepRange={[100, 10000]}
              defaultSteps={1000}
              features={[]}
              description="Trains on the newer FLUX.2 base model. Higher cost reflects the improved generation quality."
              bestFor="Premium subjects where FLUX.2 generation quality is required"
            />
            <ModelCard
              name="FLUX.2 Klein 4B Trainer"
              base="FLUX.2 Klein 4B"
              category="image"
              pricing="$0.005/step"
              stepRange={[100, 10000]}
              defaultSteps={1000}
              features={[]}
              description="Trains the 4B parameter Klein variant of FLUX.2 — faster and cheaper than the full Dev model."
              bestFor="FLUX.2 LoRAs at a more accessible price point"
            />
            <ModelCard
              name="FLUX.2 Klein 9B Trainer"
              base="FLUX.2 Klein 9B"
              category="image"
              pricing="$0.0086/step"
              stepRange={[100, 10000]}
              defaultSteps={1000}
              features={[]}
              description="The 9B Klein variant — more capacity than 4B with better detail retention."
              bestFor="FLUX.2 LoRAs where the 4B model lacks sufficient detail"
            />
            <ModelCard
              name="Qwen Image 2512 Trainer"
              base="Qwen Image 2512"
              category="image"
              pricing="$0.0015/step"
              stepRange={[100, 30000]}
              defaultSteps={1000}
              features={[]}
              description="Updated Qwen 2512 model with improved image fidelity over the original Qwen Image."
              bestFor="Cost-efficient subject and style LoRAs on the latest Qwen model"
            />
            <ModelCard
              name="Qwen Image 2512 V2 Trainer"
              base="Qwen Image 2512"
              category="image"
              pricing="$0.0009/step"
              stepRange={[10, 40000]}
              defaultSteps={2000}
              features={[]}
              description="V2 of Qwen 2512 at the lowest cost-per-step of any trainer. Supports very high step counts."
              bestFor="Maximum quality at minimum cost for Qwen-based generation"
            />
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-4">Video Models</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModelCard
              name="Hunyuan Video LoRA Trainer"
              base="Hunyuan Video"
              category="video"
              pricing="$5 flat"
              stepRange={[1, 5000]}
              defaultSteps={1000}
              features={['Auto-caption']}
              description="Fixed-price video LoRA training on Hunyuan Video. Built-in auto-captioning (do_caption)."
              bestFor="Consistent characters and styles in Hunyuan Video generation"
            />
            <ModelCard
              name="LTX-2 Video Trainer"
              base="LTX-2 Video"
              category="video"
              pricing="$0.0048/step"
              stepRange={[100, 20000]}
              defaultSteps={2000}
              features={['Requires video clips']}
              description="Trains the LTX-2 Video model using video clip data rather than still images."
              bestFor="Character motion consistency in LTX-2 Video generations"
            />
          </div>

          <Warning>
            <strong>Video models require video clips as training data</strong> — not still images. The LTX-2
            Video Trainer needs short MP4 clips of your subject. Use the image models for still photo datasets.
          </Warning>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: Training Types
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Target} title="Training Types — Subject vs Style">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The training type determines what the trigger word learns and directly controls how auto-captioning
            writes your image descriptions. Choosing the wrong type is the most common cause of weak LoRAs.
          </p>

          <ScreenshotFrame
            src={CDN + '03-training-type.jpg'}
            alt="Training type selector showing Subject / Character and Visual Style options"
            caption="Training type toggle on the Configure step. Subject is the default for most use cases."
          />

          <div className="grid gap-3">
            <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-200">Subject / Character</h4>
                <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">Default</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                The trigger word absorbs the subject's physical identity — appearance, face, build, markings.
                Auto-captioning describes pose, angle, lighting, clothing, and setting, but deliberately omits
                the subject's distinguishing features so those get absorbed into the trigger word instead.
              </p>
              <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                <p><strong>Caption template:</strong> <CodeBlock>a [trigger_word], [pose/angle/lighting/setting description]</CodeBlock></p>
                <p><strong>Use for:</strong> Characters, people, pets, products, mascots, branded objects</p>
              </div>
            </div>

            <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">Visual Style</h4>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                The trigger word absorbs the visual aesthetic — brushwork, palette, texture, mood. Auto-captioning
                describes only the content (what objects/scenes are depicted) and omits all style references,
                so the entire visual treatment is captured by the trigger word.
              </p>
              <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                <p><strong>Caption template:</strong> <CodeBlock>in the style of [trigger_word], [content description]</CodeBlock></p>
                <p><strong>Use for:</strong> Brand visual identity, art styles (watercolor, anime, neon), consistent aesthetics</p>
              </div>
              <Tip>
                For style LoRAs, the trigger word absorbs everything NOT described in the caption. If you describe
                "watercolor brushstrokes" in a caption, the model won't learn to associate that with the trigger word.
                Let auto-captioning handle it — it knows to omit style descriptions when Style mode is active.
              </Tip>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: Image Preparation
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Camera} title="Image Preparation">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Your training images account for 90–95% of LoRA quality. No parameter tuning will rescue a bad dataset.
            One blurry or watermarked image in a set of 20 has an outsized negative impact on every generation the LoRA
            produces — manual curation is essential.
          </p>

          <ScreenshotFrame
            src={CDN + '04-image-upload-grid.jpg'}
            alt="Image upload grid showing uploaded training photos"
            caption="The upload grid after adding images. Each card shows a preview with a Remove Background option."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3">
              <h4 className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Do
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                <li>10–25 images (15–20 is the sweet spot)</li>
                <li>Variety of angles: front, 3/4, side, back</li>
                <li>Multiple lighting conditions across the set</li>
                <li>Consistent subject positioning and framing</li>
                <li>Minimum 512&times;512px, ideally 1024&times;1024+</li>
                <li>JPG, PNG, or WebP format</li>
                <li>Remove or replace backgrounds before training (use the "Remove BG" button per image)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3">
              <h4 className="text-xs font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Avoid
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                <li>Blurry, pixelated, or low-resolution images</li>
                <li>Watermarks or text overlays on the subject</li>
                <li>Multiple different subjects in one dataset</li>
                <li>All images from the same angle or lighting</li>
                <li>Fewer than 5 images</li>
                <li>Images where the subject is partially cropped</li>
                <li>Screenshots or heavily compressed images</li>
              </ul>
            </div>
          </div>

          <Tip>
            <strong>Library import:</strong> If you've already generated or saved images in Stitch, click
            "Import from Library" on the upload screen to browse your saved images by folder and bulk-import
            them directly — no re-uploading needed.
          </Tip>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: AI Auto-Captioning
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Sparkles} title="AI Auto-Captioning">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Auto-captioning uses GPT-4o-mini to analyse each image individually and generate a tailored caption
            that includes your trigger word. It's the most significant quality-of-life feature in the wizard
            — writing good captions manually for 20 images takes 30–45 minutes; auto-captioning does it in seconds.
          </p>

          <ScreenshotFrame
            src={CDN + '05-autocaption.jpg'}
            alt="Auto-captioning toggle in the configure step"
            caption="The Auto Caption toggle in the Configure step. It's on by default — disable only when you need precise manual control."
          />

          <div className="grid gap-3">
            <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/20">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">Toggle ON (recommended)</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                GPT-4o-mini analyses each image and writes a description tailored to your training type.
                For Subject mode it describes pose, expression, clothing, and setting while omitting the
                subject's identity. For Style mode it describes content only, omitting visual treatment entirely.
                The trigger word is automatically woven in at the correct position.
              </p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Toggle OFF (manual)</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                A single default caption template is applied to all images (e.g. <CodeBlock>a photo of [trigger_word]</CodeBlock>).
                Use this when you want to write captions yourself with precise control over what the model
                learns from each image, or when images are already pre-captioned.
              </p>
            </div>
          </div>

          <InfoBox>
            Auto-captioning runs as a separate stage before training begins — you'll see a "Captioning..." progress
            indicator after clicking "Start Training". Each image is captioned independently, so a 20-image dataset
            makes 20 GPT API calls. This takes roughly 15–30 seconds.
          </InfoBox>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: Training Configuration
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Settings} title="Training Configuration">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The required fields are the LoRA Name and Trigger Word. Everything under Advanced Settings
            has well-tuned defaults — only adjust them if you have a specific reason.
          </p>

          <ScreenshotFrame
            src={CDN + '06-advanced-settings.jpg'}
            alt="Advanced settings panel expanded showing steps, learning rate, and face masks"
            caption="Advanced Settings expanded. The steps slider, learning rate, and face mask toggle are shown."
          />

          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">LoRA Name</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                A human-readable label shown in the LoRA Picker and your Brand Assets list.
                Use something descriptive: <CodeBlock>Sophia Presenter v1</CodeBlock>, <CodeBlock>Red Sneaker Product</CodeBlock>.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Trigger Word</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                The unique token that activates your LoRA in generation prompts. Use something distinctive
                that won't appear in normal language — <CodeBlock>soph_x7</CodeBlock> not <CodeBlock>character</CodeBlock>.
                The UI handles the field name difference automatically: FLUX Fast and Hunyuan use{' '}
                <CodeBlock>trigger_word</CodeBlock>; FLUX Portrait, Wan, and Qwen use <CodeBlock>trigger_phrase</CodeBlock>.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Steps <span className="font-normal text-gray-500">(Advanced)</span></p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                The number of gradient update steps during training. More steps produce finer detail but also
                increase cost and the risk of overfitting (where the LoRA becomes so locked to your training
                images it refuses to follow prompts). The per-model defaults are well-calibrated starting points:
                FLUX Fast defaults to 1,000; FLUX Portrait defaults to 2,500; Z-Image V2 and Qwen 2512 V2
                default to 2,000. Use the model's stepRange as your boundary — going beyond the maximum
                rarely helps.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Learning Rate <span className="font-normal text-gray-500">(Advanced)</span></p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Controls how aggressively the model updates weights at each step. Too high and the LoRA
                overfits quickly; too low and it fails to learn. The defaults are well-tuned per model —
                only change this if you're experimenting with step counts significantly higher than the default.
                Note: FLUX LoRA Fast does not expose a learning rate — it calibrates this internally.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Face Masks <span className="font-normal text-gray-500">(Advanced)</span></p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                When enabled, the trainer automatically generates segmentation masks that focus training
                attention on facial regions. This significantly improves face consistency for portrait and
                character LoRAs. Enable it whenever your subject is a human face. Not available on all models
                (Kontext, Qwen, Z-Image, FLUX.2 trainers do not support masks).
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7: Monitoring Training
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={TrendingUp} title="Monitoring Training">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Training runs asynchronously on FAL.ai GPU infrastructure. You can close the wizard and the
            modal after clicking "Start Training" — the job continues in the background and the result
            is saved automatically when complete.
          </p>

          <ScreenshotFrame
            src={CDN + '07-training-progress.jpg'}
            alt="Brand Assets panel showing trained LoRAs and their status"
            caption="The Avatars tab in Brand Assets shows all trained LoRAs with their status. Completed LoRAs appear in the LoRA Picker immediately."
          />

          <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-right font-medium text-gray-500">PENDING</span>
              <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded" />
              <span className="text-gray-500">Job queued, waiting for GPU allocation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-right font-medium text-amber-600">TRAINING</span>
              <div className="flex-1 h-0.5 bg-amber-300 dark:bg-amber-700 rounded" />
              <span className="text-gray-500">Active GPU training in progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-right font-medium text-green-600">COMPLETED</span>
              <div className="flex-1 h-0.5 bg-green-400 dark:bg-green-700 rounded" />
              <span className="text-gray-500">LoRA saved and available in picker</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-right font-medium text-red-600">FAILED</span>
              <div className="flex-1 h-0.5 bg-red-300 dark:bg-red-700 rounded" />
              <span className="text-gray-500">See Troubleshooting section for common causes</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>Typical training times:</strong></p>
            <p>FLUX LoRA Fast (1k steps) — ~8 minutes</p>
            <p>FLUX Portrait (2.5k steps) — ~15 minutes</p>
            <p>Wan 2.2 T2I (1k steps) — ~12 minutes</p>
            <p>Hunyuan Video ($5 flat) — ~25–35 minutes</p>
            <p>LTX-2 Video (2k steps) — ~20 minutes</p>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8: Using Trained LoRAs
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Wand2} title="Using Trained LoRAs">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Once a LoRA reaches COMPLETED status it is immediately available across all generation tools
            via the LoRA Picker component. Select it, set the scale, and include your trigger word in the prompt.
          </p>

          <ScreenshotFrame
            src={CDN + '08-lora-picker.jpg'}
            alt="LoRAPicker component in Imagineer with Flux 2 model selected"
            caption="The LoRA Picker in Imagineer (Flux 2 model). Select your trained LoRA from the dropdown, then include the trigger word in your prompt."
          />

          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Where the LoRA Picker appears</p>
              <ul className="space-y-1">
                <li><strong>Imagineer</strong> — Flux 2 Dev model (T2I and I2I modes)</li>
                <li><strong>Storyboards</strong> — character reference fields in the frame editor</li>
                <li><strong>Ads Manager</strong> — image generation style selector</li>
                <li><strong>Carousel Builder</strong> — per-slide visual style</li>
                <li><strong>Shorts Workbench</strong> — keyframe generation step</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-400">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Scale setting (0.1–2.0)</p>
              <ul className="space-y-1">
                <li><strong>0.6–0.8</strong> — subtle influence; subject blends with prompt more freely</li>
                <li><strong>0.9–1.1</strong> — balanced default; strong identity with prompt flexibility</li>
                <li><strong>1.2–1.5</strong> — strong lock; subject dominates the generation</li>
                <li><strong>1.6+</strong> — very aggressive; may override prompt details or cause artefacts</li>
              </ul>
            </div>
          </div>

          <Tip>
            Always include the trigger word in your generation prompt when using a LoRA. Without it, the model
            may partially activate the LoRA or ignore it entirely. Place the trigger word near the start of
            the prompt for strongest effect: <CodeBlock>soph_x7, professional headshot, studio lighting</CodeBlock>.
          </Tip>

          <InfoBox>
            <strong>Multi-LoRA:</strong> The LoRA Picker supports selecting multiple LoRAs simultaneously.
            Resolution order is template &rarr; avatar &rarr; brand kit. When combining a character LoRA
            with a style LoRA, set the character scale slightly higher (1.1) and the style lower (0.7)
            to prevent the style from overriding facial features.
          </InfoBox>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 9: Pre-Built LoRA Library
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={FolderOpen} title="Pre-Built LoRA Library">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The LoRA Library contains a curated collection of pre-trained LoRAs from HuggingFace — styles,
            environments, and character archetypes that you can use immediately without training your own.
            These are useful for visual consistency when you don't have training images of your own.
          </p>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 italic text-center">
            Screenshot placeholder — navigate to Train LoRA &rarr; Configure &rarr; scroll to Library section
          </div>

          <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <p>Browse by category (styles, environments, characters) and click any entry to preview its trigger word
            and a sample generation. Add it directly to your LoRA Picker with one click — no training required.</p>
            <p>Library LoRAs are stored as <CodeBlock>lora_library</CodeBlock> records linked to HuggingFace URLs.
            They behave identically to trained LoRAs in the picker — same scale control, same trigger word usage.</p>
          </div>

          <Tip>
            Library LoRAs are a fast way to establish a consistent visual style across a campaign before committing
            to training a custom LoRA. Try one as a style baseline, then train your own subject LoRA on top.
          </Tip>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 10: Troubleshooting
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={HelpCircle} title="Troubleshooting">
        <div className="mt-4 space-y-3">
          <Warning>
            <strong>Training fails with OOM (out of memory) error</strong><br />
            Reduce image resolution before uploading (resize to 1024&times;1024 max), or reduce the number of
            images in the dataset. Alternatively switch to a lighter model — FLUX LoRA Fast has the lowest
            VRAM footprint. Large images at high step counts are the most common cause.
          </Warning>

          <Warning>
            <strong>LoRA produces blurry or inconsistent results</strong><br />
            Check image quality first — the dataset needs 10+ sharp, well-lit, varied images. If the dataset
            is good, the trigger word may be too generic: use <CodeBlock>mychar01</CodeBlock> not{' '}
            <CodeBlock>character</CodeBlock> or <CodeBlock>person</CodeBlock>. Generic tokens already have
            strong existing associations in the base model that compete with your training.
          </Warning>

          <Warning>
            <strong>Generated images ignore the trigger word</strong><br />
            The trigger word must appear in the generation prompt. If you've set it in the LoRA Picker but
            your prompt doesn't include it, the LoRA will be loaded but may not activate. Add the trigger
            word explicitly near the start of the prompt.
          </Warning>

          <Warning>
            <strong>Face looks different in every generation</strong><br />
            Enable Face Masks in Advanced Settings and retrain. Also check that your dataset contains
            at least 5–8 clear face images at varied angles. If only one lighting direction is in the
            dataset, the model ties the face to that lighting and struggles when prompts ask for different conditions.
          </Warning>

          <Warning>
            <strong>Style LoRA leaks identity features (subject looks the same in every generation)</strong><br />
            You likely used Subject mode instead of Style mode. Retrain with Visual Style selected as
            the training type. Also verify that auto-captioning is on — it correctly omits style descriptors
            in Style mode, which is essential for clean style absorption.
          </Warning>

          <InfoBox>
            <strong>Trigger word field name varies by model</strong> — FLUX Fast and Hunyuan use{' '}
            <CodeBlock>trigger_word</CodeBlock>; FLUX Portrait, Wan, and Qwen models use{' '}
            <CodeBlock>trigger_phrase</CodeBlock>. The wizard UI handles this mapping automatically;
            you don't need to know which field name to use.
          </InfoBox>
        </div>
      </Section>

      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-6">
        LoRA Training Studio Guide &middot; Internal Admin Reference &middot; Last updated April 2026
      </div>
    </div>
  );
}

export default function LoraGuidePage() {
  const navigate = useNavigate();

  return (
    <PasswordGate>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2C666E]/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-[#2C666E]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">LoRA Training Studio Guide</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Complete reference for all 15 training models and generation workflows</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <LoraGuideContent />
      </div>
    </PasswordGate>
  );
}
