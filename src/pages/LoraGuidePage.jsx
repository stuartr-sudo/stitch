import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Upload, Sparkles, Zap, Settings, Image, Video,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, Lightbulb,
  Layers, Palette, User, Camera, Clock, DollarSign, HelpCircle, FileText,
  Brain, Target, Wand2, FolderOpen, Repeat, Lock, TrendingUp,
} from 'lucide-react';

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
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
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

function ModelCard({ name, base, category, pricing, features, description, bestFor, stepRange, defaultSteps, released }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{base}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            category === 'image' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          }`}>
            {category}
          </span>
          {released && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{released}</span>
          )}
        </div>
      </div>
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{description}</p>
      )}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3" />
          <span>{pricing}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Steps: {stepRange[0].toLocaleString()}&ndash;{stepRange[1].toLocaleString()} (default: {defaultSteps.toLocaleString()})</span>
        </div>
        {features.length > 0 && (
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
            SECTION 1: Quick Start
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Zap} title="Quick Start — Train Your First LoRA in 5 Minutes" defaultOpen={true}>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              A LoRA (Low-Rank Adaptation) is a small add-on model that teaches an AI image/video generator a new concept —
              your character's face, a specific art style, or a product's appearance.
            </p>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">The 3-Step Process:</h4>

              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Upload Photos</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Upload 15-25 images of your subject (or style examples). You can drag & drop files or import from your Image Library.</p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2.5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Two upload methods:</strong></p>
                    <p>a) <strong>Drag & drop</strong> or click the upload area to select files (JPG, PNG, WebP)</p>
                    <p>b) <strong>Import from Library</strong> — click the folder icon, browse your saved images by folder, select the ones you want, and import them all at once</p>
                    <p className="text-gray-500 dark:text-gray-400 italic">Minimum 4 images, recommended 15-25. See the "20-Image Formula" section below for the ideal composition.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">2</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Configure</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Set up the training parameters. Most have sensible defaults.</p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2.5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Required fields:</strong></p>
                    <p>a) <strong>LoRA Name</strong> — a friendly name for your reference (e.g. "Sophia Character v1")</p>
                    <p>b) <strong>Trigger Word</strong> — the magic word that activates your LoRA in prompts. Use something unique like <CodeBlock>soph_x7</CodeBlock> (see Trigger Words section for guidance)</p>
                    <p className="mt-1"><strong>Key settings:</strong></p>
                    <p>c) <strong>Training Type</strong> — Subject, Style, or Character (determines how auto-captioning works)</p>
                    <p>d) <strong>Training Model</strong> — which AI model to train on (FLUX for images, Wan for video — see Models section)</p>
                    <p>e) <strong>Auto-Caption</strong> — ON by default, recommended. AI writes individual captions per image.</p>
                    <p className="mt-1"><strong>Advanced (optional — expand to see):</strong></p>
                    <p>f) <strong>Steps</strong> — training iterations (default is per-model, usually 400-1000)</p>
                    <p>g) <strong>Learning Rate</strong> — how fast the model learns (hidden for FLUX LoRA Fast which is internally calibrated; default is fine for other models)</p>
                    <p>h) <strong>Face Masks</strong> — extra focus on faces during training (only for character/face LoRAs)</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">3</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Train</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Click "Start Training" and wait. The system handles everything automatically.</p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-2.5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>What happens after clicking "Start Training":</strong></p>
                    <p>a) Images are uploaded to cloud storage</p>
                    <p>b) AI auto-captions each image individually (if enabled) — you'll see a "Captioning" stage</p>
                    <p>c) Images + captions are zipped together and sent to FAL.ai</p>
                    <p>d) GPU training begins — progress bar shows the current stage</p>
                    <p>e) On completion, the LoRA (.safetensors file) is saved and appears in the LoRA Picker everywhere</p>
                    <p className="text-gray-500 dark:text-gray-400 italic mt-1">Duration: 5-45 minutes depending on model. FLUX LoRA Fast is ~8 min, Wan I2V is ~25 min. You can close the modal — training continues on FAL's servers.</p>
                  </div>
                </div>
              </div>
            </div>

            <InfoBox>
              <strong>Where to find it:</strong> Open the <strong>Video Ad Creator</strong> (Studio) → click the <strong>Brand Assets</strong>
              button in the sidebar → the LoRA training wizard opens as a slide-over panel.
            </InfoBox>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: Training Types
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Target} title="Training Types — Subject vs Style vs Character">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The training type determines <strong>what the trigger word learns</strong>. This is the most critical decision
              and affects how the system captions your images.
            </p>

            <div className="grid gap-3">
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/40">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-200">Subject Training</h4>
                  <span className="text-[10px] bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">Default</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                  Teaches the model to recognize a specific <strong>object, product, or person</strong>. The trigger word absorbs
                  the subject's identity — everything about what it <em>looks like</em>.
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>Auto-caption describes:</strong> Pose, angle, lighting, setting, clothing, background</p>
                  <p><strong>Auto-caption omits:</strong> The subject's identity, face features, distinguishing characteristics</p>
                  <p><strong>Use for:</strong> Products, logos, specific objects, pets, branded items</p>
                </div>
              </div>

              <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/40">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">Style Training</h4>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                  Teaches the model a <strong>visual aesthetic or artistic style</strong>. The trigger word absorbs everything
                  about the visual treatment — brushstrokes, color palette, mood, texture.
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>Auto-caption describes:</strong> Content only — what objects/people/scenes are depicted</p>
                  <p><strong>Auto-caption omits:</strong> Visual style, artistic technique, color palette, texture, mood</p>
                  <p><strong>Use for:</strong> Brand visual identity, artistic styles (watercolor, anime, etc.), consistent aesthetic</p>
                </div>
                <Tip>
                  <strong>Key insight from AI Toolkit creator (Ostris):</strong> For style LoRAs, the trigger word absorbs
                  everything NOT described in the caption. If you describe "watercolor brushstrokes" in the caption, the model
                  won't learn to associate that with the trigger word. Omit style descriptions.
                </Tip>
              </div>

              <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 bg-teal-50/50 dark:bg-teal-900/40">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="font-semibold text-sm text-teal-900 dark:text-teal-200">Character Training</h4>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                  Specialized variant of Subject training for <strong>human characters and faces</strong>. The trigger word
                  absorbs facial features, hair, eye color, and body type.
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>Auto-caption describes:</strong> Pose, camera angle, lighting, setting, clothing</p>
                  <p><strong>Auto-caption omits:</strong> Face, hair color, eye color, body type</p>
                  <p><strong>Use for:</strong> Consistent AI characters for videos, brand avatars, influencer personas</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: Photography for Super Realistic LoRAs (NEW)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Camera} title="Photography for Super Realistic LoRAs">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your training images are <strong>90-95% of your LoRA quality</strong>. No amount of parameter tuning will fix a bad dataset.
              This section covers how to photograph or source images that produce hyper-realistic results.
            </p>

            <div className="border border-[#2C666E]/20 rounded-xl p-5 bg-[#2C666E]/5 space-y-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">The "Rotten Egg" Principle</h4>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                One bad image in a dataset of 20 has an <strong>outsized negative impact</strong> on the entire LoRA.
                A single blurry, watermarked, or low-quality image will degrade every generation the LoRA produces.
                Manual curation is essential — <strong>15 perfect images will always outperform 50 mediocre ones</strong>.
              </p>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Lighting</h4>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Outdoor:</strong> Shoot on a sunny day <em>in the shade</em>, or on an overcast day. This gives you soft, even light with no harsh shadows — ideal for face training.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Reflector:</strong> Use a white or silver reflector disc to bounce light onto the face. Even a cheap $15 reflector dramatically improves results. This eliminates the dark shadows under eyes, nose, and chin that confuse the model.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Indoor:</strong> Use a large window as your key light, with a reflector or white surface opposite. Avoid overhead fluorescent lighting.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Vary it:</strong> Include 2-3 different lighting conditions across your dataset. This teaches the model that lighting is variable, not part of the subject's identity.</span>
              </div>
            </div>

            <Warning>
              <strong>Avoid mixed lighting.</strong> Combining daylight with fluorescent or tungsten produces color casts that confuse the model.
              Each image should have one dominant, clean light source.
            </Warning>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Facial Expressions (for Character LoRAs)</h4>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Relaxed, natural smile</strong> — this is your "default face". Include it in at least half your images.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Visible teeth</strong> in 3-4 shots. The model needs to learn how teeth look — otherwise it generates blurry mouths or avoids showing teeth entirely.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Eyes clearly visible</strong> in all shots. No sunglasses, no squinting, no hair covering eyes.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span><strong>Avoid extreme expressions</strong> (laughing hard, scrunching, wide-open mouth). These become the "default" face if overrepresented. 1-2 expressive shots is fine, but most should be neutral/mild smile.</span>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Composition & Cropping</h4>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Face close-ups:</strong> Crop to 1:1 (square), centered on the face with minimal shoulder visible. 5+ close-ups in your dataset.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Portraits:</strong> 3:4 aspect ratio for head-and-shoulders and waist-up shots.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Center the subject</strong> — the model learns what's at the center of attention. Don't crop them to the edge.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Resolution:</strong> 1024x1024 is optimal for FLUX models. Minimum 512x512. Higher resolution originals can be resized down during training — this naturally eliminates compression artifacts.</span>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">File Format</h4>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>PNG preferred</strong> — lossless, no compression artifacts. TIFF also works.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>JPEG is acceptable</strong> at high quality (90%+). Heavily compressed JPEGs introduce noise the model will learn.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Upscale small images</strong> to at least 1024x1024 using Topaz or a similar AI upscaler before including them in your dataset.</span>
              </div>
            </div>

            <Warning>
              <strong>Images that will RUIN your LoRA:</strong>
              <ul className="mt-1 space-y-1 list-disc pl-4">
                <li><strong>Watermarks or logos</strong> — the LoRA WILL hallucinate watermarks into every single generation. This is the #1 mistake.</li>
                <li><strong>Text overlays</strong> — same problem as watermarks. The model learns to reproduce the text.</li>
                <li><strong>Heavy Instagram filters</strong> or color grading — the model learns the filter as part of the subject.</li>
                <li><strong>Blurry or out-of-focus shots</strong> — the model learns blur as a feature.</li>
                <li><strong>Noisy/grainy images</strong> — noise becomes part of the learned concept.</li>
                <li><strong>Multiple subjects in frame</strong> — the model doesn't know which one is "you".</li>
                <li><strong>Screenshots from video</strong> — motion blur and compression artifacts are destructive.</li>
              </ul>
            </Warning>

            <Tip>
              <strong>You don't need expensive gear.</strong> A smartphone in good lighting with a $15 reflector disc produces
              excellent LoRA training data. The key is soft, even light and clean, sharp images — not megapixel count or lens quality.
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4: Image Dataset Guide (EXPANDED)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Image} title="Preparing Your Training Images — The 20-Image Formula">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Quality and variety of your training images matters far more than quantity. 20 well-composed images
              consistently outperform 100 near-identical ones.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">The Ideal 20-Image Dataset (for Character/Subject):</h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>1 reference image</strong> — your "source of truth", the best/clearest shot</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>4 base shots</strong> — close-up face, head & shoulders portrait, waist up, full body</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>~15 anchor images</strong> varying across all of:</span>
                </div>
                <div className="pl-8 space-y-1">
                  <p>- <strong>Poses:</strong> front-facing, turned right, turned left, turned away</p>
                  <p>- <strong>Angles:</strong> eye level, slight high angle, slight low angle</p>
                  <p>- <strong>2+ backgrounds:</strong> e.g. natural outdoor scene + neutral gray studio</p>
                  <p>- <strong>2+ outfits:</strong> e.g. casual clothes + different outfit</p>
                  <p>- <strong>Varied lighting:</strong> natural light, side light, studio lighting</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">For Style Training:</h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>15-25 images</strong> that exemplify the style you want to learn</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>Diverse content</strong> — different subjects, scenes, but all in the same visual style</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>Consistent aesthetic</strong> — all images should share the same visual treatment</span>
                </div>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Dataset Recipes by Goal</h4>
            <div className="grid gap-3">
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/30 dark:bg-purple-900/40">
                <h5 className="font-medium text-xs text-purple-900 dark:text-purple-200 mb-2">Face Consistency Recipe (20 images)</h5>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <p>5 close-up face shots (different angles, expressions)</p>
                  <p>5 head-and-shoulder portraits (varied lighting)</p>
                  <p>5 waist-up shots (different outfits)</p>
                  <p>5 full-body shots (different backgrounds)</p>
                  <p className="text-gray-500 dark:text-gray-400 italic mt-1">Minimum: 3 outfits, 3 backgrounds, 3 lighting setups</p>
                </div>
              </div>
              <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50/30 dark:bg-amber-950/40">
                <h5 className="font-medium text-xs text-amber-900 dark:text-amber-200 mb-2">Product Photography Recipe (20 images)</h5>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <p>8 angles on clean background (front, back, sides, top, bottom, 3/4 views)</p>
                  <p>4 lifestyle/context shots (product in use, in setting)</p>
                  <p>4 detail/macro shots (textures, labels, unique features)</p>
                  <p>4 in-use shots (held, worn, displayed)</p>
                </div>
              </div>
              <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 bg-teal-50/30 dark:bg-teal-900/40">
                <h5 className="font-medium text-xs text-teal-900 dark:text-teal-200 mb-2">Style Recipe (15-25 images)</h5>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <p>All images must share the <strong>same visual style</strong></p>
                  <p>Content should be as diverse as possible: landscapes, portraits, still life, architecture, abstract</p>
                  <p>Cherry-pick ruthlessly — a curated set of 16 consistently outperforms a messy set of 100+</p>
                </div>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Resolution Recommendations per Model</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">Model Family</th>
                    <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">Optimal Resolution</th>
                    <th className="text-left py-1.5 font-semibold text-gray-700 dark:text-gray-300">Minimum</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">FLUX (all trainers)</td><td className="py-1.5 pr-3">1024x1024</td><td className="py-1.5">512x512</td></tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Z-Image Turbo</td><td className="py-1.5 pr-3">1024x1024</td><td className="py-1.5">512x512</td></tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Qwen Image</td><td className="py-1.5 pr-3">1024x1024</td><td className="py-1.5">512x512</td></tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Wan 2.2 T2I</td><td className="py-1.5 pr-3">768x768</td><td className="py-1.5">512x512</td></tr>
                  <tr><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Video models (Wan I2V, etc.)</td><td className="py-1.5 pr-3">720p equivalent</td><td className="py-1.5">480p</td></tr>
                </tbody>
              </table>
            </div>

            <InfoBox>
              <strong>More images = more steps needed.</strong> A 10-image dataset trains well at 600-800 steps.
              A 50-image dataset needs 1200-1800 steps. The model needs enough passes to learn from every image.
              See the Advanced Settings section for the step count table.
            </InfoBox>

            <Tip>
              <strong>Resolution consistency:</strong> Use the same resolution for all training images when possible.
              Mixed resolutions can cause aspect ratio bucket errors during training.
            </Tip>

            <Warning>
              <strong>Don't overfit:</strong> Too many similar images (same pose, same angle) will make the LoRA only
              reproduce those exact images. Variety is the key to generalization.
            </Warning>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Uploading Images</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Two methods:</p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              <li><strong>Drag & Drop / File Upload:</strong> Click the upload area or drag files directly. Supports JPG, PNG, WebP.</li>
              <li><strong>Import from Library:</strong> Click the folder icon to browse your Image Library. Select images across folders, then import them all at once.</li>
            </ul>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5: Trigger Words
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Wand2} title="Trigger Words — How They Work">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The trigger word is a unique identifier that activates your LoRA during image generation. When you include
              the trigger word in your prompt, the model applies the learned concept.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Choosing a Good Trigger Word</h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>Unique and unlikely:</strong> Choose something that doesn't exist in the base model's training data. "blonde3G" works better than "blonde woman".</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>Short and memorable:</strong> "rxsneaker" is better than "my_red_custom_sneaker_v2".</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span><strong>No common words:</strong> Avoid "red car" or "modern house" — these will collide with the model's existing knowledge.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/40">
                <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">Good Trigger Words</p>
                <div className="space-y-0.5 text-xs text-green-700 dark:text-green-300">
                  <p><CodeBlock>rxsneaker</CodeBlock> — product</p>
                  <p><CodeBlock>zk_sarah</CodeBlock> — character</p>
                  <p><CodeBlock>morisot_style</CodeBlock> — art style</p>
                  <p><CodeBlock>acmebrand</CodeBlock> — brand identity</p>
                </div>
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50/50 dark:bg-red-950/40">
                <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">Bad Trigger Words</p>
                <div className="space-y-0.5 text-xs text-red-700 dark:text-red-300">
                  <p><CodeBlock>red shoe</CodeBlock> — too common</p>
                  <p><CodeBlock>woman</CodeBlock> — way too generic</p>
                  <p><CodeBlock>watercolor</CodeBlock> — existing concept</p>
                  <p><CodeBlock>my logo</CodeBlock> — spaces can break things</p>
                </div>
              </div>
            </div>

            <InfoBox>
              <strong>How it works under the hood:</strong> Every training image gets a <CodeBlock>.txt</CodeBlock> caption file
              with the trigger word prepended. For example: <CodeBlock>rxsneaker, a red running shoe on a wooden table with natural
              side lighting</CodeBlock>. During training, the model learns to associate the trigger word with whatever is NOT
              described in the caption text.
            </InfoBox>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6: Captioning Deep Dive (EXPANDED)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={FileText} title="Captioning Deep Dive — AI Captions, Formats & The Two-Caption Method">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Every training image needs a text caption file. Captions are the second most important factor
              after image quality — they determine what the trigger word learns vs what stays flexible.
            </p>

            <div className="grid gap-3">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">AI Auto-Caption (Recommended)</h4>
                  <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">ON by default</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  GPT-4o-mini analyzes each image individually and writes a custom caption. This produces significantly
                  better LoRAs than template captions because every image gets a unique, accurate description.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  The captioning strategy automatically adapts to your training type:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1 list-disc pl-5">
                  <li><strong>Subject:</strong> Describes pose, setting, clothing — omits identity</li>
                  <li><strong>Style:</strong> Describes content only — omits visual aesthetic</li>
                  <li><strong>Character:</strong> Describes pose, setting — omits facial features</li>
                </ul>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Template Captions (Fallback)</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  If auto-captioning is off or fails, every image gets the same generic caption:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1 list-disc pl-5">
                  <li>Subject: <CodeBlock>a photo of {'{trigger_word}'}</CodeBlock></li>
                  <li>Style: <CodeBlock>an image in {'{trigger_word}'} style</CodeBlock></li>
                  <li>Character: <CodeBlock>a portrait of {'{trigger_word}'}, face visible</CodeBlock></li>
                </ul>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Natural Language vs Tag-Based Captioning</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/40">
                <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">Natural Language (Preferred for FLUX)</p>
                <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded p-2 mt-1">
                  <p className="text-[10px] font-mono text-gray-600 dark:text-gray-400">zk_sarah, standing in a park with trees in the background, wearing a blue denim jacket, natural sunlight from the left, three-quarter angle</p>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Produces richer, more detailed LoRAs. FLUX models strongly prefer this format.</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Tag-Based (Acceptable for Qwen/Z-Image)</p>
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded p-2 mt-1">
                  <p className="text-[10px] font-mono text-gray-600 dark:text-gray-400">zk_sarah, park, trees, blue denim jacket, sunlight, three-quarter angle</p>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Shorter, more keyword-focused. Qwen and Z-Image models handle both formats equally well.</p>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Caption Format Examples by Training Type</h4>
            <div className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 mb-1">SUBJECT CAPTION:</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">rxsneaker, a red running shoe photographed at a 45-degree angle on a marble surface, soft studio lighting from above, shallow depth of field, white background</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Describes: angle, surface, lighting, background. Omits: shoe brand, design details, color specifics (trigger word absorbs these).</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 mb-1">CHARACTER CAPTION:</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">zk_sarah, sitting at a wooden desk in a home office, wearing a cream knit sweater, warm window light from the right, looking slightly to the left, medium close-up</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Describes: pose, clothing, setting, lighting, angle. Omits: hair color, eye color, face shape, skin tone (trigger word absorbs these).</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-1">STYLE CAPTION:</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">a mountain lake surrounded by pine trees with a small wooden boat at the shore, morning fog rising from the water, distant snow-capped peaks</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Describes: content/subject matter ONLY. Omits: brushstrokes, color palette, texture, mood, artistic technique (trigger word absorbs the entire visual style).</p>
              </div>
            </div>

            <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 bg-amber-50/30 dark:bg-amber-950/40">
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200 mb-2">The Two-Caption Method (Advanced — for Style LoRAs on FLUX)</h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                This technique from the FLUX community strengthens style absorption and weakens subject association. It's built into Stitch's
                auto-captioning when you select "Style" training type, but understanding it helps you write better manual captions.
              </p>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p><strong>How it works:</strong></p>
                <p>1. <strong>Long caption:</strong> Detailed content description (what's in the image) — "a sunset over a mountain lake with pine trees, a small boat near the shore, golden hour reflections on the water"</p>
                <p>2. <strong>Short caption:</strong> Just the trigger phrase — "in the style of aqua_wash"</p>
                <p>3. The model trains on both versions of each image. The long caption teaches it that content is variable (not part of the style).
                   The short caption reinforces that the trigger word = the visual treatment.</p>
                <p className="text-gray-500 dark:text-gray-400 italic mt-1">Result: Stronger style LoRAs that can be applied to any content without the model trying to reproduce the training image subjects.</p>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">When to Write Manual Captions</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              <li>If auto-captions are describing features you want the trigger word to absorb (e.g., describing the art style in a style LoRA)</li>
              <li>If your dataset has unusual content the AI might miscaption (niche products, abstract art)</li>
              <li>If you want maximum precision for a commercial character LoRA</li>
            </ul>

            <Tip>
              <strong>Always use auto-captioning.</strong> Per-image AI captions produce dramatically better LoRAs
              than generic templates. The cost is minimal (GPT-4o-mini vision at low detail, ~$0.01 for 20 images).
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7: Training Models
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Layers} title="Training Models — Complete Reference">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              18 training models are available across 2 categories (14 image, 4 video). Each produces a LoRA compatible with its base model family.
            </p>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Image Models (14)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModelCard
                name="FLUX LoRA Fast"
                base="FLUX.1 [dev]"
                category="image"
                pricing="$2 flat"
                released="Aug 2024"
                features={['Style', 'Face masks']}
                description="The go-to default trainer. Flat $2 pricing regardless of step count means no cost surprises. Supports both subject and style training modes, with automatic face mask detection to preserve facial features. Produces LoRAs compatible with the FLUX 2 Dev inference model, which works across every Stitch tool."
                bestFor="First-time LoRA trainers, rapid prototyping, character/subject LoRAs where you want predictable cost and broad tool compatibility."
                stepRange={[1, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="FLUX Portrait Trainer"
                base="FLUX.1 [dev]"
                category="image"
                pricing="$0.0024/step"
                released="Nov 2024"
                features={['Multi-resolution', 'Subject crop', 'Face masks']}
                description="Specialized for faces and portraits. Automatically crops and centers subjects in training images, trains at multiple resolutions simultaneously, and uses face detection masks to lock in facial detail. Ideal when your LoRA is primarily about a person's face or likeness rather than full-body poses."
                bestFor="Headshot-quality face LoRAs, portrait likeness capture, avatar training where facial accuracy is the priority."
                stepRange={[1, 10000]}
                defaultSteps={2500}
              />
              <ModelCard
                name="FLUX Kontext Trainer"
                base="FLUX.1 Kontext [dev]"
                category="image"
                pricing="$2.50/1K steps"
                released="Jun 2025"
                features={[]}
                description="Trains LoRAs specifically for the FLUX Kontext editing model (not the standard generation model). Kontext LoRAs allow you to inject trained concepts into image editing workflows, such as swapping a character into an existing scene or applying a learned style during edits."
                bestFor="Image editing workflows where you need to inject a trained character or style into existing images, rather than generating from scratch."
                stepRange={[500, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Wan 2.2 T2I Trainer"
                base="Wan 2.2 T2I"
                category="image"
                pricing="$0.0045/step"
                released="Aug 2025"
                features={['Style', 'Face masks']}
                description="Trains on the Wan 2.2 dual-transformer architecture, producing TWO LoRA files (low-noise + high-noise) that work together. Stitch auto-detects and auto-expands both files during generation. Particularly strong at learning complex visual concepts and multi-element scenes. Also serves as a bridge to video — Wan 2.2 image LoRAs can influence Wan video generation."
                bestFor="High-fidelity character LoRAs that need to work in both image and video pipelines, complex multi-element concepts, Wan ecosystem workflows."
                stepRange={[10, 6000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Qwen Image Trainer"
                base="Qwen Image"
                category="image"
                pricing="$0.002/step"
                released="Aug 2025"
                features={[]}
                description="Trains LoRAs for the original Qwen image model. Low per-step cost with adjustable learning rate. Note: Qwen generation endpoints are not yet available in Stitch, so trained LoRAs cannot be used for inference right now."
                bestFor="Future-proofing — train now at low cost for when Qwen generation is available. Good for experimentation and research."
                stepRange={[1, 8000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Qwen Image Edit 2511"
                base="Qwen Image Edit 2511"
                category="image"
                pricing="$0.004/step"
                released="Dec 2025"
                features={[]}
                description="Trains LoRAs for the Qwen image editing model (2511 version). Supports up to 30K steps for deep concept learning. Uses default caption mode instead of trigger words. Note: no Stitch generation endpoint yet — trained LoRAs are stored for future use."
                bestFor="Future Qwen editing workflows, deep fine-tuning experiments that need high step counts."
                stepRange={[100, 30000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Z-Image Turbo Trainer"
                base="Z-Image Turbo (6B)"
                category="image"
                pricing="$0.00226/step"
                released="Dec 2025"
                features={['Style']}
                description="Lightweight 6B parameter model that trains faster than FLUX. Supports both balanced and style-specific training modes. Good at learning artistic styles and visual aesthetics. Note: no Stitch generation endpoint yet — trained LoRAs are stored for future use."
                bestFor="Style/aesthetic LoRAs (e.g., 'painterly watercolor', 'vintage film grain'), experimentation at low cost."
                stepRange={[100, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Turbo FLUX Trainer"
                base="FLUX.1 [dev]"
                category="image"
                pricing="$0.0024/step"
                released="Apr 2025"
                features={['Style', 'Face crop']}
                description="Fast FLUX.1 trainer with automatic face cropping for subject mode and a dedicated style training mode. Same per-step cost as the Portrait trainer but focused on speed over portrait precision. Compatible with FLUX 2 Dev inference across all Stitch tools."
                bestFor="Quick iteration when testing different training configs, style LoRAs on FLUX, subjects where face cropping (not face masking) is sufficient."
                stepRange={[1, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="FLUX.2 Dev Trainer V2"
                base="FLUX.2 [dev]"
                category="image"
                pricing="$0.0255/step"
                released="Jan 2026"
                features={['Edit pairs']}
                description="Premium FLUX.2 trainer — the highest quality FLUX trainer available but also the most expensive per step. Trains on the latest FLUX.2 architecture with support for edit pairs (before/after image pairs for instruction-based fine-tuning). Produces LoRAs compatible with FLUX 2 Dev inference."
                bestFor="Maximum quality character/subject LoRAs when cost is not the primary concern, edit-pair fine-tuning for instruction-following LoRAs."
                stepRange={[100, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="FLUX.2 Klein 4B"
                base="FLUX.2 Klein 4B"
                category="image"
                pricing="$0.005/step"
                released="Jan 2026"
                features={['Budget', 'Fast inference']}
                description="Distilled 4B parameter version of FLUX.2 — the smallest and cheapest model in the FLUX.2 family. Trains at $0.005/step and generates images at just $0.016 each (vs $0.035 for full FLUX 2 Dev). The trade-off is slightly lower detail fidelity compared to larger models, especially for complex scenes."
                bestFor="Budget-conscious production workflows, high-volume generation where per-image cost matters, simple subjects that don't need maximum detail."
                stepRange={[100, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="FLUX.2 Klein 9B"
                base="FLUX.2 Klein 9B"
                category="image"
                pricing="$0.0086/step"
                released="Jan 2026"
                features={['Mid-tier', 'Fast inference']}
                description="Mid-size 9B parameter FLUX.2 variant — better quality than Klein 4B at a moderate cost increase. Generates at $0.02/image (43% cheaper than full FLUX 2 Dev). Strikes a balance between quality and cost for teams that need to generate many images."
                bestFor="Production workflows that need better quality than Klein 4B but at lower cost than FLUX 2 Dev, batch generation with LoRAs."
                stepRange={[100, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Z-Image Turbo V2"
                base="Z-Image Turbo (6B)"
                category="image"
                pricing="$0.0008/step"
                released="Jan 2026"
                features={[]}
                description="Second-generation Z-Image trainer with the lowest per-step cost of any trainer ($0.0008). Supports up to 40K training steps, allowing extremely deep fine-tuning for difficult concepts. Note: no Stitch generation endpoint yet — trained LoRAs are stored for future use."
                bestFor="Very long training runs to deeply learn a complex concept at minimal cost, experimenting with high step counts."
                stepRange={[10, 40000]}
                defaultSteps={2000}
              />
              <ModelCard
                name="Qwen Image 2512"
                base="Qwen Image 2512"
                category="image"
                pricing="$0.0015/step"
                released="Jan 2026"
                features={[]}
                description="Updated Qwen trainer (December 2025 model). Improved architecture over the original Qwen Image model with better concept learning and sharper results. Supports up to 30K steps. Note: no Stitch generation endpoint yet."
                bestFor="Future Qwen-based generation, higher quality than original Qwen trainer at similar cost."
                stepRange={[100, 30000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Qwen Image 2512 V2"
                base="Qwen Image 2512"
                category="image"
                pricing="$0.0009/step"
                released="Jan 2026"
                features={[]}
                description="The cheapest Qwen trainer and second cheapest overall ($0.0009/step). V2 architecture with support for up to 40K steps — ideal for very deep training runs at minimal cost. Note: no Stitch generation endpoint yet."
                bestFor="Lowest-cost high-step training, research and experimentation with Qwen architecture."
                stepRange={[10, 40000]}
                defaultSteps={2000}
              />
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 mt-6">
              <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Video Models (4)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModelCard
                name="Wan 2.1 I2V Trainer"
                base="Wan 2.1 I2V 14B"
                category="video"
                pricing="5 credits/run"
                released="Mar 2025"
                features={['Auto-scale']}
                description="Trains image-to-video LoRAs on Wan 2.1 (14B parameters). Requires VIDEO CLIPS as training data (not images). Auto-scales input to the correct resolution. The trained LoRA teaches the video model to maintain character appearance, movement style, or visual effects across generated video clips."
                bestFor="Character consistency in Wan 2.1 video generation, teaching specific motion patterns or visual effects that persist across I2V clips."
                stepRange={[100, 20000]}
                defaultSteps={400}
              />
              <ModelCard
                name="Wan 2.2 I2V-A14B"
                base="Wan 2.2 I2V-A14B"
                category="video"
                pricing="$0.005/step"
                released="Feb 2026"
                features={['Auto-scale']}
                description="Latest Wan video trainer — builds on 2.1 with improved temporal coherence and character fidelity. Requires VIDEO CLIPS as training data. Best option for maintaining a character's likeness across video scenes. Works within the Wan ecosystem alongside the Wan 2.2 T2I image trainer."
                bestFor="Highest-quality character consistency in video, maintaining facial likeness and body proportions in motion, paired with Wan 2.2 T2I for end-to-end image+video LoRA pipelines."
                stepRange={[100, 20000]}
                defaultSteps={400}
              />
              <ModelCard
                name="Hunyuan Video"
                base="Hunyuan Video"
                category="video"
                pricing="$5 flat"
                released="Jan 2025"
                features={['Auto-caption']}
                description="Tencent's video model trainer at a flat $5 per run regardless of steps. Includes automatic captioning of training data. Requires VIDEO CLIPS. The fixed pricing makes it predictable for budgeting — no per-step cost surprises even at high step counts."
                bestFor="Experimentation with video LoRAs at predictable cost, learning video styles or effects when you want to try many step counts without worrying about cost."
                stepRange={[1, 5000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="LTX-2 Video Trainer"
                base="LTX-2 Video"
                category="video"
                pricing="$0.0048/step"
                released="Jan 2026"
                features={['Audio', 'Auto-scale']}
                description="LTX-2 video trainer with audio training support — the only video trainer that can learn audio patterns alongside visual ones. Auto-scales input resolution. Good for training visual effects, motion styles, and transitions that include synchronized sound."
                bestFor="Video LoRAs that include audio cues (e.g., a branded intro with sound), visual effects with sound design, motion styles and transitions."
                stepRange={[100, 20000]}
                defaultSteps={2000}
              />
            </div>

            <InfoBox>
              <strong>Which model should I choose?</strong> For most character/subject LoRAs, start with <strong>FLUX LoRA Fast</strong> ($2 flat,
              quick training) or <strong>Turbo FLUX</strong> ($0.0024/step). For video character consistency, use <strong>Wan 2.2 I2V</strong>.
              For style LoRAs, <strong>Z-Image Turbo</strong> or <strong>FLUX LoRA Fast</strong> are good choices.
              For the cheapest per-step training, try <strong>Z-Image V2</strong> ($0.0008/step) or <strong>Qwen 2512 V2</strong> ($0.0009/step).
            </InfoBox>

            <Warning>
              <strong>Generation compatibility matters!</strong> Currently, only <strong>FLUX 2 Dev (LoRA)</strong> accepts LoRA weights for image generation in Stitch.
              Z-Image and Qwen LoRAs can be trained but have no generation endpoint yet. For maximum compatibility across all Stitch tools, <strong>train on a FLUX-family model</strong>.
              See the "Generating Images with Your LoRA" section below for the full compatibility matrix.
            </Warning>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 8: Model-Specific Parameter Recipes (NEW)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={TrendingUp} title="Model-Specific Parameter Recipes">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Concrete starting configurations per model family, optimized for realistic output. These are battle-tested defaults —
              start here and adjust based on results.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Model</th>
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Learning Rate</th>
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Steps (Style)</th>
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Steps (Character)</th>
                    <th className="text-left py-2 font-semibold text-gray-900 dark:text-gray-100">Key Notes</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-green-50/30 dark:bg-green-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX LoRA Fast</td>
                    <td className="py-2 pr-2 font-mono text-gray-400 dark:text-gray-500">Internal</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2">$2 flat. Best default — start here.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX Portrait</td>
                    <td className="py-2 pr-2 font-mono">0.00009</td>
                    <td className="py-2 pr-2 text-gray-400 dark:text-gray-500">N/A</td>
                    <td className="py-2 pr-2">2000-3000</td>
                    <td className="py-2">Face specialist. Auto-crops to subject.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Turbo FLUX</td>
                    <td className="py-2 pr-2 font-mono">0.00115</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2 pr-2">800-1500</td>
                    <td className="py-2">Aggressive LR. Face crop built in.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX.2 Dev V2</td>
                    <td className="py-2 pr-2 font-mono">0.00005</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2 pr-2">800-1500</td>
                    <td className="py-2">Premium. Very conservative LR — start low.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Z-Image Turbo</td>
                    <td className="py-2 pr-2 font-mono">0.0001</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2 pr-2">1000-1500</td>
                    <td className="py-2">Small model, sensitive. Start conservative.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Z-Image V2</td>
                    <td className="py-2 pr-2 font-mono">0.0005</td>
                    <td className="py-2 pr-2">1500-2500</td>
                    <td className="py-2 pr-2">2000-3000</td>
                    <td className="py-2">Cheapest. Needs more steps at higher LR.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Wan 2.2 T2I</td>
                    <td className="py-2 pr-2 font-mono">0.0007</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2 pr-2">800-1500</td>
                    <td className="py-2">Highest default LR. Style + mask support.</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Qwen (all)</td>
                    <td className="py-2 pr-2 font-mono">0.0005</td>
                    <td className="py-2 pr-2">800-1200</td>
                    <td className="py-2 pr-2">800-1500</td>
                    <td className="py-2">Works from small datasets (even 8-10 images).</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Video (Wan I2V)</td>
                    <td className="py-2 pr-2 font-mono">0.0002</td>
                    <td className="py-2 pr-2">300-500</td>
                    <td className="py-2 pr-2">300-500</td>
                    <td className="py-2">Lower LR + steps. Requires video clips.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-[#2C666E]/20 rounded-xl p-4 bg-[#2C666E]/5">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">FAL.ai Sweet Spot Research</h4>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                From FAL.ai's own blog posts and community testing:
              </p>
              <div className="mt-2 space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex gap-3 items-start">
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded shrink-0">500 steps</span>
                  <span>Insufficient — style barely learned, character unrecognizable</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-bold rounded shrink-0">1000 steps</span>
                  <span>Sweet spot for style LoRAs. Good results at ~1500 for characters, peak quality around 2500-3000</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded shrink-0">2000+ steps</span>
                  <span>Diminishing returns for styles. Characters can go higher but watch for overfitting above 3000</span>
                </div>
              </div>
            </div>

            <Tip>
              <strong>For photorealistic character LoRAs:</strong> Start with FLUX LoRA Fast at 1000 steps. If the likeness is too weak,
              try Turbo FLUX at 1200 steps (its aggressive LR captures detail faster). FLUX Portrait at 2500 steps is the nuclear option
              for maximum face accuracy, but it's slower and more expensive.
            </Tip>

            <Tip>
              <strong>Single trigger words work best for Qwen models.</strong> Avoid multi-word triggers like "my character" —
              use <CodeBlock>mychar_v1</CodeBlock> instead.
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 9: Advanced Settings
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Settings} title="Advanced Settings — Steps, Learning Rate, Masks (Deep Dive)">
          <div className="mt-4 space-y-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              These settings are in the collapsible "Advanced Settings" panel on the Configure step.
              The defaults are calibrated per model and work well for most cases — but understanding them
              helps you diagnose and fix training issues.
            </p>

            {/* TRAINING STEPS */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#2C666E]" />
                Training Steps
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Each "step" is one pass through a batch of training images where the model adjusts its internal weights
                to better reproduce your concept. Think of it like practice rounds — each step makes the model slightly
                better at recognizing your subject/style.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">What Happens at Each Step Count</h5>
                <div className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded shrink-0">TOO LOW</span>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p><strong>~100-300 steps:</strong> The model barely learns anything. Generated images show vague hints of your subject but lack detail. Faces are blurry, products look generic. The LoRA has almost no effect.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold rounded shrink-0">WARMING UP</span>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p><strong>~300-700 steps:</strong> The model starts recognizing the concept. Outputs begin to resemble your subject but details like eye shape, skin texture, or product proportions are inconsistent.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-bold rounded shrink-0">SWEET SPOT</span>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p><strong>~800-1500 steps (FLUX), ~250-500 (Wan):</strong> The model has learned your concept well AND can still generalize. You can place the subject in new scenes, poses, and lighting that weren't in the training data. This is where you want to be.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded shrink-0">DIMINISHING</span>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p><strong>~1500-2500 steps:</strong> Quality plateaus. The model is accurate but starts losing flexibility — new poses/scenes might look slightly "stiff" or unnatural.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded shrink-0">OVERFIT</span>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <p><strong>~3000+ steps:</strong> The model has <em>memorized</em> your training images. Every generation looks like a copy of a training photo regardless of your prompt. Outputs look artificially sharp. The LoRA is "frozen" — it refuses to generalize to new situations.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">Recommended Steps by Model & Dataset Size</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">Model</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">10 images</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">20 images</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">50 images</th>
                        <th className="text-left py-1.5 font-semibold text-gray-700 dark:text-gray-300">100 images</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 dark:text-gray-400">
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">FLUX LoRA Fast</td><td className="py-1.5 pr-3">600-800</td><td className="py-1.5 pr-3">800-1200</td><td className="py-1.5 pr-3">1200-1800</td><td className="py-1.5">1500-2500</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">FLUX Portrait</td><td className="py-1.5 pr-3">1500-2000</td><td className="py-1.5 pr-3">2000-3000</td><td className="py-1.5 pr-3">3000-4000</td><td className="py-1.5">4000-6000</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Wan 2.1/2.2 I2V</td><td className="py-1.5 pr-3">200-300</td><td className="py-1.5 pr-3">300-500</td><td className="py-1.5 pr-3">400-800</td><td className="py-1.5">600-1200</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Z-Image Turbo</td><td className="py-1.5 pr-3">600-800</td><td className="py-1.5 pr-3">800-1200</td><td className="py-1.5 pr-3">1000-1500</td><td className="py-1.5">1200-2000</td></tr>
                      <tr><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Qwen Image</td><td className="py-1.5 pr-3">600-800</td><td className="py-1.5 pr-3">800-1200</td><td className="py-1.5 pr-3">1000-1500</td><td className="py-1.5">1200-2000</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/40">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1.5">Example: Character LoRA (good)</p>
                  <div className="text-xs text-green-700 dark:text-green-300 space-y-0.5">
                    <p>Model: FLUX LoRA Fast</p>
                    <p>Dataset: 20 images of "zk_sarah"</p>
                    <p>Steps: <strong>1000</strong></p>
                    <p>Result: Accurate face in new poses, new outfits, new scenes. Natural-looking outputs.</p>
                  </div>
                </div>
                <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50/50 dark:bg-red-950/40">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1.5">Example: Same LoRA (overfit)</p>
                  <div className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                    <p>Model: FLUX LoRA Fast</p>
                    <p>Dataset: 20 images of "zk_sarah"</p>
                    <p>Steps: <strong>5000</strong></p>
                    <p>Result: Every output looks identical — same angle, same expression. Ignores prompt directions. Overly sharp, artificial look.</p>
                  </div>
                </div>
              </div>

              <Tip>
                <strong>Start with defaults and adjust from there.</strong> Train once with the model's default steps.
                If the result is too weak/blurry, increase by 25-50%. If it's too rigid/sharp, decrease by 25-50%.
                Never jump straight to max steps.
              </Tip>
            </div>

            {/* LEARNING RATE */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2C666E]" />
                Learning Rate
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                The learning rate controls how much the model changes its weights on each training step. Think of it
                like a volume knob — too low and the model barely learns, too high and it "overshoots" and produces
                distorted, unstable results.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-3">Visual Analogy</h5>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                  Imagine you're trying to park a car in a tight spot:
                </p>
                <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold shrink-0">0.00001</span>
                    <span>= Moving 1mm at a time. You'll get there perfectly but it takes forever (needs way more steps).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-bold shrink-0">0.0004&nbsp;</span>
                    <span>= Moving 6 inches at a time. Efficient — you park accurately in a reasonable time. <strong>This is a typical default (e.g. Qwen Image, Wan T2I).</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">0.01&nbsp;&nbsp;&nbsp;</span>
                    <span>= Flooring the accelerator. You'll overshoot, crash, and the results are garbage. Never do this.</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">Default Learning Rates by Model</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">Model</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">Default LR</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300">Safe range</th>
                        <th className="text-left py-1.5 font-semibold text-gray-700 dark:text-gray-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 dark:text-gray-400">
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">FLUX LoRA Fast</td><td className="py-1.5 pr-3 font-mono text-gray-400 dark:text-gray-500">N/A</td><td className="py-1.5 pr-3 font-mono text-gray-400 dark:text-gray-500">&mdash;</td><td className="py-1.5">Internally calibrated. Not adjustable.</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">FLUX Portrait</td><td className="py-1.5 pr-3 font-mono">0.00009</td><td className="py-1.5 pr-3 font-mono">0.00005 - 0.0002</td><td className="py-1.5">Lower — portrait is more sensitive</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Wan 2.1/2.2 I2V</td><td className="py-1.5 pr-3 font-mono">0.0002</td><td className="py-1.5 pr-3 font-mono">0.0001 - 0.0005</td><td className="py-1.5">Video models need lower LR</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Wan 2.2 T2I</td><td className="py-1.5 pr-3 font-mono">0.0007</td><td className="py-1.5 pr-3 font-mono">0.0003 - 0.001</td><td className="py-1.5">Image variant tolerates higher LR</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Qwen Image</td><td className="py-1.5 pr-3 font-mono">0.0005</td><td className="py-1.5 pr-3 font-mono">0.0002 - 0.001</td><td className="py-1.5">Standard range</td></tr>
                      <tr className="border-b border-gray-100 dark:border-gray-700"><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Z-Image Turbo</td><td className="py-1.5 pr-3 font-mono">0.0001</td><td className="py-1.5 pr-3 font-mono">0.00005 - 0.0003</td><td className="py-1.5">Small model, lower rate needed</td></tr>
                      <tr><td className="py-1.5 pr-3 font-medium text-gray-900 dark:text-gray-100">Hunyuan Video</td><td className="py-1.5 pr-3 font-mono">0.0001</td><td className="py-1.5 pr-3 font-mono">0.00005 - 0.0003</td><td className="py-1.5">Conservative for stability</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/40">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1.5">When to INCREASE learning rate</p>
                  <ul className="text-xs text-green-700 dark:text-green-300 space-y-0.5 list-disc pl-4">
                    <li>Training completed but LoRA has very weak effect</li>
                    <li>Trigger word barely changes the output</li>
                    <li>You've already tried increasing steps with no improvement</li>
                    <li>Increase by 1.5-2x, not more (e.g. 0.0005 to 0.00075)</li>
                  </ul>
                </div>
                <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50/50 dark:bg-red-950/40">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1.5">When to DECREASE learning rate</p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5 list-disc pl-4">
                    <li>Outputs look distorted, warped, or glitchy</li>
                    <li>Faces have artifacts or wrong proportions</li>
                    <li>Colors look oversaturated or wrong</li>
                    <li>Decrease by 50% (e.g. 0.0005 to 0.00025)</li>
                  </ul>
                </div>
              </div>

              <Warning>
                <strong>Steps and learning rate work together.</strong> If you lower the learning rate, you usually need
                more steps to compensate (the model learns more slowly per step). If you increase the learning rate,
                you need fewer steps. Don't change both at once — adjust one, test, then adjust the other if needed.
              </Warning>
            </div>

            {/* CREATE MASKS */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2C666E]" />
                Create Masks (Face Detection & Segmentation)
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                When "Create Masks" is enabled, the training system runs face detection on every image in your dataset.
                It creates a <strong>segmentation mask</strong> — essentially a highlighted overlay that tells the model
                "pay extra attention to this area" during training.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">How It Works (Step by Step)</h5>
                <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2C666E] text-white text-[10px] font-bold shrink-0">1</span>
                    <span>Each training image is scanned for faces using AI face detection</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2C666E] text-white text-[10px] font-bold shrink-0">2</span>
                    <span>A binary mask is generated — white pixels mark the face region, black pixels mark everything else</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2C666E] text-white text-[10px] font-bold shrink-0">3</span>
                    <span>During training, the model applies <strong>higher loss weight</strong> to the masked (face) region — meaning errors in the face area are penalized more heavily</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2C666E] text-white text-[10px] font-bold shrink-0">4</span>
                    <span>Result: The model learns facial features more precisely — better eye shape, nose structure, jawline accuracy</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">Supported Models</h5>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Only 2 of our 16 training models support masks. The toggle is automatically hidden for models that don't support it. Both models have masks enabled by default.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>FLUX LoRA Fast</strong> — <CodeBlock>create_masks</CodeBlock></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Wan 2.2 T2I</strong> — <CodeBlock>use_masks</CodeBlock></span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/40">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">ENABLE masks when:</p>
                  <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 list-disc pl-4">
                    <li><strong>Training a human character/face</strong> — masks ensure the model prioritizes getting the face right over background details</li>
                    <li><strong>Your character has distinctive facial features</strong> — unique eye shape, freckles, scars, facial hair that need precise reproduction</li>
                    <li><strong>You want face consistency across varied scenes</strong> — masks help the model learn "this face" vs "this entire image"</li>
                  </ul>
                </div>

                <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50/50 dark:bg-red-950/40">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">DISABLE masks when:</p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc pl-4">
                    <li><strong>Training a visual style</strong> — the model needs to learn the entire image's aesthetic, not just faces</li>
                    <li><strong>Training a product/object</strong> — there are no faces to detect; masks would find nothing or produce false positives</li>
                    <li><strong>Training non-human subjects</strong> — pets, vehicles, buildings, logos. Face detection won't find them.</li>
                    <li><strong>Your images don't have clear, visible faces</strong> — back-of-head shots, silhouettes, or heavily stylized art may confuse the face detector</li>
                  </ul>
                </div>
              </div>

              <InfoBox>
                <strong>Default behavior:</strong> Masks are ON by default for Subject and Character training types,
                and OFF for Style training. This is automatically set when you switch training types in the UI.
                You can override it manually in Advanced Settings.
              </InfoBox>
            </div>

            {/* COMBINING SETTINGS */}
            <div className="border border-[#2C666E]/20 rounded-xl p-5 bg-[#2C666E]/5 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#2C666E]" />
                Putting It All Together — Example Configurations
              </h4>

              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Character: AI Influencer "Sophia"</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <p><strong>Model:</strong> FLUX LoRA Fast</p>
                    <p><strong>Training Type:</strong> Character</p>
                    <p><strong>Trigger Word:</strong> <CodeBlock>soph_x7</CodeBlock></p>
                    <p><strong>Dataset:</strong> 22 images</p>
                    <p><strong>Steps:</strong> 1000</p>
                    <p><strong>Learning Rate:</strong> N/A (internally calibrated)</p>
                    <p><strong>Masks:</strong> ON</p>
                    <p><strong>Auto-Caption:</strong> ON</p>
                    <p><strong>Cost:</strong> $2.00 flat + ~$0.01 captioning</p>
                    <p><strong>Time:</strong> ~8 minutes</p>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">Good dataset: 4 close-ups, 4 portraits, 6 waist-up, 8 full-body. 2 outfits, 3 backgrounds, varied poses and lighting.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Style: Watercolor Brand Aesthetic</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <p><strong>Model:</strong> Z-Image Turbo</p>
                    <p><strong>Training Type:</strong> Style</p>
                    <p><strong>Trigger Word:</strong> <CodeBlock>aqua_wash</CodeBlock></p>
                    <p><strong>Dataset:</strong> 18 images</p>
                    <p><strong>Steps:</strong> 1000</p>
                    <p><strong>Learning Rate:</strong> 0.0001 (default)</p>
                    <p><strong>Masks:</strong> OFF</p>
                    <p><strong>Auto-Caption:</strong> ON (content-only mode)</p>
                    <p><strong>Cost:</strong> ~$2.26 + ~$0.01 captioning</p>
                    <p><strong>Time:</strong> ~12 minutes</p>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">Dataset: 18 watercolor artworks. Mix of landscapes, portraits, still life — all sharing the same watercolor technique. Captions describe content only ("a boat on a lake, mountains in background") — the visual style is NOT described so the trigger word absorbs it.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Video: Character Consistency in Animation</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <p><strong>Model:</strong> Wan 2.2 I2V-A14B</p>
                    <p><strong>Training Type:</strong> Subject</p>
                    <p><strong>Trigger Word:</strong> <CodeBlock>soph_x7</CodeBlock></p>
                    <p><strong>Dataset:</strong> 20 images (same as FLUX)</p>
                    <p><strong>Steps:</strong> 400</p>
                    <p><strong>Learning Rate:</strong> 0.0002 (default)</p>
                    <p><strong>Masks:</strong> N/A (not supported)</p>
                    <p><strong>Auto-Caption:</strong> ON</p>
                    <p><strong>Cost:</strong> ~$2.00 + ~$0.01 captioning</p>
                    <p><strong>Time:</strong> ~25 minutes</p>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">Tip: Use the same trigger word as your FLUX LoRA. Train a FLUX LoRA for keyframes, then a Wan LoRA for animation — both respond to the same trigger word for a unified character pipeline.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Product: Custom Sneaker Design</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
                    <p><strong>Model:</strong> FLUX LoRA Fast</p>
                    <p><strong>Training Type:</strong> Subject</p>
                    <p><strong>Trigger Word:</strong> <CodeBlock>rxsnkr_v1</CodeBlock></p>
                    <p><strong>Dataset:</strong> 15 images</p>
                    <p><strong>Steps:</strong> 800</p>
                    <p><strong>Learning Rate:</strong> N/A (internally calibrated)</p>
                    <p><strong>Masks:</strong> OFF (no faces)</p>
                    <p><strong>Auto-Caption:</strong> ON</p>
                    <p><strong>Cost:</strong> $2.00 flat + ~$0.01 captioning</p>
                    <p><strong>Time:</strong> ~6 minutes</p>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">Dataset: Product photos from multiple angles (front, side, back, top, sole). White background + lifestyle shots. Auto-captions describe angle, lighting, surface — NOT the shoe's brand/design details (trigger word absorbs those).</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 10: Training Process
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Clock} title="What Happens During Training">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              After you click "Start Training", here's exactly what happens behind the scenes:
            </p>

            <div className="space-y-3">
              {[
                { stage: 'Uploading', icon: Upload, color: 'blue', desc: 'Your images are uploaded to Supabase Storage and public URLs are generated.' },
                { stage: 'Captioning', icon: Sparkles, color: 'purple', desc: 'If auto-caption is on, each image is sent to GPT-4o-mini vision for individual captioning (batches of 3). Captions are tailored to your training type.' },
                { stage: 'Zipping', icon: FolderOpen, color: 'gray', desc: 'Images are downloaded, paired with their .txt caption files (image_000.jpg + image_000.txt), and compressed into a ZIP archive. The ZIP is uploaded to Supabase.' },
                { stage: 'Queued', icon: Clock, color: 'yellow', desc: 'The ZIP URL and training config are submitted to FAL.ai. Your job enters the queue.' },
                { stage: 'Training', icon: Zap, color: 'teal', desc: 'FAL.ai runs the training on GPU. Duration varies: FLUX LoRA Fast ~5-10 min, Portrait Trainer ~20-30 min, Wan models ~15-45 min.' },
                { stage: 'Complete', icon: CheckCircle2, color: 'green', desc: 'The trained LoRA (.safetensors) URL is saved to your brand_loras database record. It\'s now available in the LoRA picker across all generation tools.' },
              ].map(({ stage, icon: StageIcon, color, desc }) => (
                <div key={stage} className="flex gap-3 items-start">
                  <div className={`p-1.5 rounded-lg bg-${color}-100 shrink-0`}>
                    <StageIcon className={`w-4 h-4 text-${color}-600`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{stage}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <InfoBox>
              <strong>Polling:</strong> The UI polls FAL.ai every 5 seconds for status updates. You can close the modal
              and come back — the training continues on FAL.ai's servers regardless.
            </InfoBox>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 11: Generating Images with Your LoRA (NEW — BIGGEST GAP)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Sparkles} title="Generating Images with Your LoRA — Complete Guide" defaultOpen={true}>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This is the most important section. Training a LoRA is only half the battle — you need to know
              <strong> which generation model to use</strong>, how to configure scale, and how to write prompts that get realistic results.
            </p>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Model Compatibility Matrix</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              LoRAs only work with generation models from the <strong>same model family</strong> they were trained on.
              A FLUX LoRA will not work with a Wan generator, and vice versa.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Trained On</th>
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Compatible Generator</th>
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Type</th>
                    <th className="text-left py-2 font-semibold text-gray-900 dark:text-gray-100">Works In</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-green-50/30 dark:bg-green-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX.1 trainers (Fast, Portrait, Turbo, Kontext)</td>
                    <td className="py-2 pr-2">FLUX 2 Dev (LoRA)</td>
                    <td className="py-2 pr-2">Image</td>
                    <td className="py-2">Imagineer, Turnaround, Storyboard, Shorts, Campaigns</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-green-50/30 dark:bg-green-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX.2 Dev V2</td>
                    <td className="py-2 pr-2">FLUX 2 Dev (LoRA)</td>
                    <td className="py-2 pr-2">Image</td>
                    <td className="py-2">Same as above</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-green-50/30 dark:bg-green-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX.2 Klein 4B</td>
                    <td className="py-2 pr-2">Klein 4B (LoRA)</td>
                    <td className="py-2 pr-2">Image</td>
                    <td className="py-2">Imagineer (cheapest inference at $0.016/MP)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-green-50/30 dark:bg-green-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">FLUX.2 Klein 9B</td>
                    <td className="py-2 pr-2">Klein 9B (LoRA)</td>
                    <td className="py-2 pr-2">Image</td>
                    <td className="py-2">Imagineer (mid-tier at $0.02/MP)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-green-50/30 dark:bg-green-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Wan 2.2 T2I</td>
                    <td className="py-2 pr-2">Wan 2.2 T2I (LoRA)</td>
                    <td className="py-2 pr-2">Image</td>
                    <td className="py-2">Imagineer, pipelines (dual-LoRA auto-detected)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-red-50/30 dark:bg-red-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Z-Image (all)</td>
                    <td className="py-2 pr-2 text-red-600 dark:text-red-400 italic">No generation endpoint yet</td>
                    <td className="py-2 pr-2">—</td>
                    <td className="py-2 text-gray-400 dark:text-gray-500">Future support</td>
                  </tr>
                  <tr className="bg-red-50/30 dark:bg-red-950/40">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Qwen (all)</td>
                    <td className="py-2 pr-2 text-red-600 dark:text-red-400 italic">No generation endpoint yet</td>
                    <td className="py-2 pr-2">—</td>
                    <td className="py-2 text-gray-400 dark:text-gray-500">Future support</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Warning>
              <strong>For maximum compatibility, train on a FLUX-family model.</strong> FLUX LoRAs work across all Stitch image generation tools
              (Imagineer, Turnaround, Storyboard, Shorts, Campaigns). Wan 2.2 and Klein LoRAs also have working generation endpoints but are
              limited to Imagineer for now. Z-Image and Qwen LoRAs can be trained but have <strong>no generation endpoint currently</strong>.
              On a budget? Klein 4B ($0.005/step training + $0.016/image) is the cheapest full pipeline. For best quality, use FLUX LoRA Fast ($2 flat).
            </Warning>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Step-by-Step: Generating Your First LoRA Image</h4>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Open a Generation Tool</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Open <strong>Imagineer</strong> (Text-to-Image mode) — this is the best place to test your LoRA before using it in pipelines.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">2</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Select the Right Model</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Choose a LoRA-compatible generation model: <strong>Flux 2 Dev (LoRA)</strong> for FLUX-trained LoRAs, <strong>Klein 4B/9B</strong> for Klein-trained LoRAs, or <strong>Wan 2.2 T2I</strong> for Wan-trained LoRAs. If you select a non-LoRA model (Nano Banana, SeedDream, Imagen, etc.), the LoRA will have no effect. Wan 2.2 dual-LoRA is auto-detected — just select the LoRA and the right model is chosen for you.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">3</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Select Your LoRA</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Expand the LoRA section and click to select your trained LoRA. You can select multiple LoRAs for stacking. Custom LoRAs default to scale 1.0, pre-built library LoRAs default to 0.8.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">4</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Write Your Prompt WITH the Trigger Word</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Place the trigger word at the <strong>beginning</strong> of your prompt:</p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded p-2.5 mt-1">
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300">soph_x7, sitting at a modern cafe, wearing a white linen blouse, warm afternoon sunlight, Canon EOS R5, 85mm f/1.4, shallow depth of field</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">5</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Generate & Iterate</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Click generate. If the likeness is too weak, increase LoRA scale to 1.0-1.2. If the output is too rigid or shows artifacts, decrease to 0.6-0.8. See the Scale & Stacking section below for detailed guidance.</p>
                </div>
              </div>
            </div>

            <InfoBox>
              <strong>Smart routing in pipelines:</strong> When LoRAs are active in Storyboard, Shorts, or Campaign pipelines,
              the system automatically selects the right LoRA-compatible model — FLUX 2 Dev for FLUX LoRAs, Wan 2.2 T2I for Wan dual-LoRAs.
              Wan 2.2 dual-LoRA files are auto-expanded (both low-noise and high-noise transformers). You don't need to manually select models in automated workflows.
            </InfoBox>

            <Tip>
              <strong>Always test in Imagineer first.</strong> Before deploying a LoRA in automated Storyboard or Campaign pipelines,
              validate it in Imagineer where you have full control over the prompt, scale, and model. This saves time and money.
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 12: LoRA Scale & Stacking Guide (NEW)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Layers} title="LoRA Scale & Stacking Guide">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The <strong>scale</strong> slider (0.1 - 1.5) controls how strongly the LoRA's learned concept is applied.
              You can also <strong>stack</strong> multiple LoRAs for combined effects.
            </p>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Understanding Scale Values</h4>
            <div className="space-y-2">
              <div className="flex gap-3 items-start">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded shrink-0 w-14 text-center">0.1-0.3</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p><strong>Barely perceptible.</strong> Extremely subtle influence — you might not even notice the LoRA is active. Useful for light style hints that shouldn't overpower the prompt.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded shrink-0 w-14 text-center">0.4-0.6</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p><strong>Moderate influence.</strong> Subject becomes recognizable but the base model still has significant creative freedom. Good for blending a LoRA concept with creative, varied prompts.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-bold rounded shrink-0 w-14 text-center">0.7-0.8</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p><strong>Recommended balance.</strong> Strong likeness/style while preserving prompt flexibility. Pre-built library LoRAs default to 0.8. This is where most LoRAs work best.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold rounded shrink-0 w-14 text-center">0.9-1.0</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p><strong>Full strength.</strong> Strong likeness but reduced prompt flexibility. Custom-trained LoRAs default to 1.0. Outputs closely match training data characteristics.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded shrink-0 w-14 text-center">1.1-1.3</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p><strong>Over-strength.</strong> Amplifies the LoRA effect beyond its training weight. Can be useful for style LoRAs that are too subtle at 1.0, but introduces artifacts for character LoRAs. Use with caution.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded shrink-0 w-14 text-center">1.4-1.5</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p><strong>Maximum — experimental only.</strong> High risk of artifacts, distortion, color blowout, and "uncanny valley" effects. Only for edge-case experimentation.</p>
                </div>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Realism-Specific Scale Guidance</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/40">
                <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1.5">For Photorealistic Characters</p>
                <ul className="text-xs text-green-700 dark:text-green-300 space-y-0.5 list-disc pl-4">
                  <li>Start at <strong>0.8</strong></li>
                  <li>Increase to 1.0 only if likeness is insufficient</li>
                  <li>Above 1.0 tends to produce "uncanny valley" — faces look too perfect, skin too smooth, eyes too sharp</li>
                </ul>
              </div>
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50/50 dark:bg-purple-900/40">
                <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-1.5">For Character + Style Blend</p>
                <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-0.5 list-disc pl-4">
                  <li>Character LoRA at <strong>0.7</strong></li>
                  <li>Style LoRA at <strong>0.3-0.4</strong></li>
                  <li>Combined: ~1.0-1.1 total (safe range)</li>
                </ul>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">LoRA Stacking</h4>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              You can select multiple LoRAs simultaneously in the LoRA picker. They're sent as an array to the generation model.
            </p>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Combined strength should stay below ~1.2</strong> (e.g., two LoRAs at 0.6 each = 1.2 total). Going higher causes artifacts.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Practical combo:</strong> Character LoRA (0.7) + Style LoRA (0.4) = your character rendered in a specific visual style.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span><strong>Order matters:</strong> The first LoRA in the picker list takes priority when weights compete.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span><strong>Diminishing returns:</strong> More than 2-3 LoRAs rarely improves results and significantly increases generation cost and time.</span>
              </div>
            </div>

            <Warning>
              <strong>If two LoRAs together look worse than either alone,</strong> your combined strength likely exceeds 1.2.
              Reduce individual scales — try 0.5 + 0.5 instead of 0.8 + 0.8.
            </Warning>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 13: Prompting with LoRAs for Realism (NEW)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Wand2} title="Prompting with LoRAs for Realism">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              How you write your prompt dramatically affects the realism of LoRA-generated images.
              These techniques are specific to getting photorealistic output.
            </p>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Trigger Word Placement</h4>
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
              Always place the trigger word at the <strong>beginning</strong> of your prompt. This matches how the training data was
              structured (trigger word prepended to captions) and gives it the strongest influence.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-950/40">
                <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">Correct</p>
                <p className="text-[10px] font-mono text-green-700 dark:text-green-300"><strong>soph_x7</strong>, professional portrait, studio lighting, Canon EOS R5</p>
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50/50 dark:bg-red-950/40">
                <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">Avoid</p>
                <p className="text-[10px] font-mono text-red-700 dark:text-red-300">professional portrait of a woman called <strong>soph_x7</strong> in studio</p>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">The Realism Prompt Formula</h4>
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="text-purple-600 dark:text-purple-400 font-bold">{'{trigger_word}'}</span>,{' '}
                <span className="text-blue-600 dark:text-blue-400">[action/pose]</span>,{' '}
                <span className="text-teal-600 dark:text-teal-400">[clothing/appearance]</span>,{' '}
                <span className="text-amber-600 dark:text-amber-400">[setting/location]</span>,{' '}
                <span className="text-orange-600">[lighting description]</span>,{' '}
                <span className="text-red-600 dark:text-red-400">[camera + lens]</span>,{' '}
                <span className="text-gray-500 dark:text-gray-400">[quality modifiers]</span>
              </p>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Example Prompts for Photorealism</h4>
            <div className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 mb-1">CHARACTER — Outdoor Portrait</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">soph_x7, sitting at a sidewalk cafe in Paris, wearing a cream knit sweater, warm golden hour sunlight from the left, shallow depth of field, Canon EOS R5, 85mm f/1.4, sharp focus, photorealistic</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 mb-1">CHARACTER — Studio Headshot</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">soph_x7, professional headshot, slight smile, dark gray studio background, Rembrandt lighting with fill, medium close-up, 105mm f/2, 8K, sharp detail on eyes and skin texture</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-1">PRODUCT — Lifestyle</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">rxsnkr_v1, placed on a wet concrete surface with city lights reflecting, night scene, moody blue and orange neon lighting, low angle shot, product photography, 50mm macro, crisp detail</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 mb-1">STYLE — Applied to New Content</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">aqua_wash, a mountain village at sunset with smoke rising from chimneys, winding cobblestone path, warm and cool color contrast</p>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Prompting Anti-Patterns</h4>
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span><strong>Don't re-describe what the LoRA already knows.</strong> If your character LoRA learned "blonde woman with blue eyes", don't write "soph_x7, blonde woman with blue eyes" — this creates conflicts. Just use the trigger word and describe the <em>new</em> context (pose, setting, clothing).</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span><strong>Don't combine conflicting style prompts with a style LoRA.</strong> If your style LoRA is "watercolor", don't prompt "photorealistic, 8K, sharp detail" — the style LoRA and prompt will fight each other.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span><strong>Don't add "no watermark" to negative prompts</strong> unless your training data actually contained watermarks. In clean-trained LoRAs, mentioning "watermark" (even negatively) can paradoxically introduce them.</span>
              </div>
            </div>

            <Tip>
              <strong>Photography terms unlock realism.</strong> Include camera body (Canon EOS R5, Sony A7 IV), lens (85mm f/1.4, 50mm f/2),
              and lighting terms (Rembrandt, butterfly, loop lighting). These activate the base model's photorealism knowledge
              and combine beautifully with character LoRAs.
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 14: Where LoRAs Work in Stitch (NEW)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={FolderOpen} title="Where LoRAs Work in Stitch">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              LoRAs are available across multiple Stitch tools. Here's where and how to access them in each.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">Tool</th>
                    <th className="text-left py-2 pr-2 font-semibold text-gray-900 dark:text-gray-100">How to Access LoRA</th>
                    <th className="text-left py-2 font-semibold text-gray-900 dark:text-gray-100">Generation Model</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Imagineer (T2I)</td>
                    <td className="py-2 pr-2">LoRA picker in generation panel. Must select "Flux 2 Dev" model.</td>
                    <td className="py-2">FLUX 2 Dev (LoRA)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Imagineer (I2I)</td>
                    <td className="py-2 pr-2">LoRA picker in I2I panel. Must select "Flux 2 Dev" model.</td>
                    <td className="py-2">FLUX 2 Dev (LoRA)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Turnaround Sheet</td>
                    <td className="py-2 pr-2">Available when using the Flux 2 model option.</td>
                    <td className="py-2">FLUX 2 Dev (LoRA)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Video Ad Creator</td>
                    <td className="py-2 pr-2">Brand Assets panel. LoRA config saved per campaign template.</td>
                    <td className="py-2">FLUX 2 (images) + Wavespeed WAN (video)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Storyboard</td>
                    <td className="py-2 pr-2">Resolved from template config or brand kit defaults.</td>
                    <td className="py-2">FLUX 2 Dev (auto-selected when LoRAs present)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-medium text-gray-900 dark:text-gray-100">Shorts Workbench</td>
                    <td className="py-2 pr-2">Resolved via brand kit defaults or visual subject avatar.</td>
                    <td className="py-2">FLUX 2 Dev (auto-selected when LoRAs present)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <InfoBox>
              <strong>LoRA resolution chain:</strong> In automated pipelines (Storyboard, Shorts, Campaigns), LoRAs are resolved
              in this priority order: <strong>1.</strong> Template-level LoRA config → <strong>2.</strong> Visual subject avatar →
              <strong>3.</strong> Brand kit default LoRAs. The first non-empty source wins.
            </InfoBox>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 15: Overfitting, Underfitting & Style Bleed (NEW)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={AlertTriangle} title="Overfitting, Underfitting & Style Bleed — Diagnosis Guide">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The three most common LoRA problems, how to identify them, and how to fix them.
            </p>

            <div className="border border-red-200 dark:border-red-800 rounded-xl p-5 bg-red-50/30 dark:bg-red-950/40 space-y-3">
              <h4 className="font-semibold text-sm text-red-900 dark:text-red-200">Overfitting</h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p><strong>Symptoms:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Generated images look like <strong>exact copies</strong> of training photos</li>
                  <li>Same backgrounds/poses appear regardless of prompt instructions</li>
                  <li>Model <strong>ignores prompt directions</strong> (e.g., "standing" still produces sitting poses from training data)</li>
                  <li>Outputs look artificially sharp and hyper-detailed</li>
                </ul>
                <p className="mt-2"><strong>Causes:</strong> Too many training steps, too few images, dataset lacks variety</p>
                <p><strong>Fix:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Reduce steps by 25-50% (e.g., 2000 → 1200)</li>
                  <li>Lower learning rate by 50% (e.g., 0.0005 → 0.00025)</li>
                  <li>Add more diverse training images (different poses, backgrounds, outfits)</li>
                  <li>Lower LoRA scale when generating (0.6-0.7 instead of 1.0)</li>
                </ul>
              </div>
            </div>

            <div className="border border-yellow-200 dark:border-yellow-800 rounded-xl p-5 bg-yellow-50/30 dark:bg-yellow-950/40 space-y-3">
              <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-200">Underfitting</h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p><strong>Symptoms:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Subject is <strong>not recognizable</strong> — vague resemblance at best</li>
                  <li>Faces are generic, lacking distinctive features</li>
                  <li>Trigger word has <strong>minimal visible effect</strong> on output</li>
                  <li>Output looks almost the same with or without the trigger word</li>
                </ul>
                <p className="mt-2"><strong>Causes:</strong> Too few steps, learning rate too low, poor quality images</p>
                <p><strong>Fix:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Increase steps by 50% (e.g., 600 → 1000)</li>
                  <li>Increase learning rate by 1.5x (e.g., 0.0001 → 0.00015)</li>
                  <li>Improve dataset quality — more close-ups, clearer images, better lighting</li>
                  <li>Increase LoRA scale when generating (1.0-1.2)</li>
                </ul>
              </div>
            </div>

            <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-5 bg-purple-50/30 dark:bg-purple-900/40 space-y-3">
              <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-200">Style Bleed</h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p><strong>Symptoms:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>The learned visual style appears <strong>even without the trigger word</strong> in the prompt</li>
                  <li>Colors, textures, or artistic elements from training data contaminate unrelated generations</li>
                  <li>Other LoRAs or the base model's behavior changes when this LoRA is active (even at low scale)</li>
                </ul>
                <p className="mt-2"><strong>Causes:</strong> Overtrained style LoRA, captions described the style instead of omitting it</p>
                <p><strong>Fix:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Re-train with <strong>correct training type set to "Style"</strong> (ensures captions omit aesthetic details)</li>
                  <li>Reduce training steps — style bleed is often caused by overtraining</li>
                  <li>Use lower LoRA scale (0.3-0.5) to reduce the bleed while still getting style influence</li>
                  <li>Test: Generate WITHOUT the trigger word. If the style still appears, it's bleeding.</li>
                </ul>
              </div>
            </div>

            <Tip>
              <strong>Quick diagnosis test:</strong> Generate 3 images — one with trigger word at scale 1.0, one with trigger word at scale 0.3,
              and one without the trigger word at all. Compare them. If 1.0 and "no trigger" look the same = style bleed. If 0.3 and "no trigger"
              look the same = the LoRA is too weak (underfitting). If 1.0 looks like a training photo copy = overfitting.
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 16: Troubleshooting (EXPANDED)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={HelpCircle} title="Troubleshooting — Common Issues">
          <div className="mt-4 space-y-3">
            {[
              {
                q: 'My LoRA produces blurry or inconsistent results',
                a: 'Likely undertrained. Try increasing steps by 50%. Also ensure your training images are diverse enough — same-pose images lead to poor generalization.',
              },
              {
                q: 'The model only reproduces exact training images',
                a: 'Overtrained. Reduce steps or lower the learning rate. The model has memorized your dataset instead of learning the concept.',
              },
              {
                q: 'Training failed or timed out',
                a: 'Check your image URLs — if they\'re from FAL CDN (fal.media), they may have expired. Re-upload images to your library first, then train from Supabase URLs which are permanent.',
              },
              {
                q: 'Auto-captioning failed',
                a: 'Usually an OpenAI API key issue. Training will continue with template captions (less optimal but functional). Check your API key in Settings.',
              },
              {
                q: 'The LoRA has no visible effect when generating',
                a: 'Three things to check: (1) Is the trigger word in your prompt? Without it, the LoRA has no effect. (2) Is the LoRA scale above 0.3? Lower values are barely visible. (3) Are you using FLUX 2 Dev as the generation model? LoRAs only work with compatible generators.',
              },
              {
                q: 'LoRA works for images but not video',
                a: 'LoRAs are model-family specific. A FLUX image LoRA won\'t work with Wan video generation. You need to train a separate Wan LoRA for video.',
              },
              {
                q: 'Style LoRA is also changing the content/subject',
                a: 'Your captions likely described the style instead of omitting it. The trigger word learns what\'s NOT in the captions. Re-train with auto-captioning set to "Style" training type.',
              },
              {
                q: 'The training model dropdown is empty/loading',
                a: 'The models API may have failed to load. Refresh the page and reopen the modal. The dropdown will show "Loading models..." while fetching.',
              },
              {
                q: 'I see watermarks in my generated images',
                a: 'Your training images likely contained watermarks. The model learned to reproduce them. This is irreversible — you need to re-train with clean, watermark-free images. Always remove watermarks before training.',
              },
              {
                q: 'My LoRA works in Imagineer but not in Storyboard/Campaigns',
                a: 'The LoRA must be assigned to the brand. In automated pipelines, LoRAs are resolved from the template\'s lora_config or the brand kit\'s default_loras. Make sure the LoRA is linked to your brand in Brand Assets.',
              },
              {
                q: 'LoRA scale above 1.0 produces artifacts or distortion',
                a: 'This is expected behavior. Scale > 1.0 amplifies the LoRA beyond its training weight. For photorealistic output, stay at 0.7-1.0. Only go above 1.0 for style LoRAs that are too subtle at default strength.',
              },
              {
                q: 'I trained on Z-Image or Qwen but can\'t use it to generate images',
                a: 'Currently only FLUX-family LoRAs are usable for image generation in Stitch (via the FLUX 2 Dev LoRA endpoint). Z-Image and Qwen generation endpoints don\'t support LoRA weights yet. For maximum compatibility, retrain on FLUX LoRA Fast ($2).',
              },
              {
                q: 'Two LoRAs together produce worse results than either alone',
                a: 'Combined strength likely exceeds 1.2. Reduce individual scales — try 0.5 + 0.5 instead of 0.8 + 0.8. Also check that the LoRAs aren\'t conflicting (e.g., two different character LoRAs).',
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">{q}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 17: Cost Reference
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={DollarSign} title="Cost Reference">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              All training runs through FAL.ai. Costs vary by model:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-3 font-semibold text-gray-900 dark:text-gray-100">Model</th>
                    <th className="text-left py-2 pr-3 font-semibold text-gray-900 dark:text-gray-100">Pricing</th>
                    <th className="text-left py-2 pr-3 font-semibold text-gray-900 dark:text-gray-100">Cost for 1000 steps</th>
                    <th className="text-left py-2 font-semibold text-gray-900 dark:text-gray-100">Est. Training Time</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  {[
                    ['FLUX LoRA Fast', '$2 flat', '$2.00', '5-10 min'],
                    ['FLUX Portrait', '$0.0024/step', '$2.40', '20-30 min'],
                    ['FLUX Kontext', '$2.50/1K steps', '$2.50', '10-15 min'],
                    ['Turbo FLUX', '$0.0024/step', '$2.40', '8-15 min'],
                    ['FLUX.2 Dev V2', '$0.0255/step', '$25.50', '15-25 min'],
                    ['Wan 2.2 T2I', '$0.0045/step', '$4.50', '15-25 min'],
                    ['Qwen Image', '$0.002/step', '$2.00', '10-15 min'],
                    ['Qwen Edit 2511', '$0.004/step', '$4.00', '15-20 min'],
                    ['Qwen 2512', '$0.0015/step', '$1.50', '10-15 min'],
                    ['Qwen 2512 V2', '$0.0009/step', '$0.90', '10-15 min'],
                    ['Z-Image Turbo', '$0.00226/step', '$2.26', '10-15 min'],
                    ['Z-Image V2', '$0.0008/step', '$0.80', '10-15 min'],
                    ['Wan 2.1 I2V', '5 credits', '~$5', '15-30 min'],
                    ['Wan 2.2 I2V', '$0.005/step', '$5.00', '15-30 min'],
                    ['Hunyuan Video', '$5 flat', '$5.00', '20-45 min'],
                    ['LTX-2 Video', '$0.0048/step', '$4.80', '15-30 min'],
                  ].map(([model, pricing, cost, time]) => (
                    <tr key={model} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{model}</td>
                      <td className="py-2 pr-3">{pricing}</td>
                      <td className="py-2 pr-3">{cost}</td>
                      <td className="py-2">{time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Tip>
              <strong>Best value:</strong> Qwen 2512 V2 ($0.90/1K steps) and Z-Image V2 ($0.80/1K steps) are the cheapest per-step options.
              FLUX LoRA Fast ($2 flat) is the best for quick tests. Auto-captioning adds ~$0.01 for 20 images (negligible).
            </Tip>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 18: Pro Tips (EXPANDED)
            ═══════════════════════════════════════════════════════════════════ */}
        <Section icon={Lightbulb} title="Pro Tips — Get Better Results">
          <div className="mt-4 space-y-3">
            {[
              {
                title: 'Use 2+ backgrounds in your training set',
                desc: 'If all images have the same background, the model associates that background with your trigger word. Use at least 2 distinct backgrounds (e.g., outdoor + studio gray).',
              },
              {
                title: 'Use 2+ outfits for character training',
                desc: 'Same logic as backgrounds — if every image has the same outfit, the model thinks the outfit IS the character. Vary clothing across images.',
              },
              {
                title: 'Train on a cheaper model first',
                desc: 'FLUX LoRA Fast at $2 is perfect for testing your dataset. Once you confirm your images produce good results, re-train on a more expensive model for higher quality.',
              },
              {
                title: 'Check your captions before training',
                desc: 'The auto-captioning stage shows a "captioning" status. If you want to verify captions, you can check the browser console for logged caption output.',
              },
              {
                title: 'Separate LoRAs for image and video',
                desc: 'A FLUX LoRA generates images, a Wan LoRA generates videos. For a full character pipeline, train both: FLUX for keyframes, Wan for animation. Use the same trigger word for both.',
              },
              {
                title: 'Start at scale 0.8, not 1.0',
                desc: 'Full scale (1.0) can make outputs rigid or produce uncanny valley effects. Starting at 0.7-0.8 gives you a balance of likeness and natural-looking flexibility. Only increase to 1.0+ if the likeness is insufficient.',
              },
              {
                title: 'Re-train if quality is poor — don\'t just adjust steps',
                desc: 'Bad datasets produce bad LoRAs regardless of steps. If results are poor after 2-3 step adjustments, revisit your training images (more variety, better quality).',
              },
              {
                title: 'Include 3-4 flat-lit neutral background shots',
                desc: 'For photorealistic character LoRAs, include some images shot in flat, even lighting against a plain background. This gives the model a clean reference without environmental contamination.',
              },
              {
                title: 'Use photography terms in your generation prompts',
                desc: 'Camera body names (Canon EOS R5, Sony A7 IV), lens specs (85mm f/1.4), and lighting terms (Rembrandt, butterfly) activate the base model\'s photorealism knowledge. They combine powerfully with character LoRAs.',
              },
              {
                title: 'For product LoRAs, mix studio + lifestyle shots',
                desc: 'Include both studio white-background shots AND lifestyle context shots. The model needs to learn the product independent of environment, while also understanding how it looks in real-world settings.',
              },
              {
                title: 'Test with Imagineer before deploying to pipelines',
                desc: 'Always validate your LoRA in Imagineer first where you have full control. Once you\'re happy with the results, deploy it in Storyboard or Campaign pipelines. This saves both time and money.',
              },
            ].map(({ title, desc }, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold shrink-0">{i + 1}</span>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Complete reference for training and generating with custom AI models</p>
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
