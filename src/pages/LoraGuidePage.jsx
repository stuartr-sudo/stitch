import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Upload, Sparkles, Zap, Settings, Image, Video,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, Lightbulb,
  Layers, Palette, User, Camera, Clock, DollarSign, HelpCircle, FileText,
  Brain, Target, Wand2, FolderOpen, Repeat, Shield, Lock, TrendingUp,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-[#2C666E]/10 rounded-lg">
            <Lock className="w-5 h-5 text-[#2C666E]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Admin Access</h2>
            <p className="text-xs text-gray-500">LoRA Training Studio Guide</p>
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

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 my-3">
      <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="text-sm text-amber-900">{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 my-3">
      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
      <div className="text-sm text-red-900">{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 my-3">
      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
      <div className="text-sm text-blue-900">{children}</div>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
  );
}

function ModelCard({ name, base, category, pricing, features, bestFor, stepRange, defaultSteps }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
          <p className="text-xs text-gray-500">{base}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          category === 'image' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {category}
        </span>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
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
              <span key={f} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">{f}</span>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 italic">{bestFor}</p>
    </div>
  );
}

export function LoraGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">

        {/* Quick Start */}
        <Section icon={Zap} title="Quick Start — Train Your First LoRA in 5 Minutes" defaultOpen={true}>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              A LoRA (Low-Rank Adaptation) is a small add-on model that teaches an AI image/video generator a new concept —
              your character's face, a specific art style, or a product's appearance.
            </p>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-900">The 3-Step Process:</h4>

              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">1</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">Upload Photos</p>
                  <p className="text-xs text-gray-600 mb-1.5">Upload 15-25 images of your subject (or style examples). You can drag & drop files or import from your Image Library.</p>
                  <div className="bg-gray-50 rounded p-2.5 text-xs text-gray-600 space-y-1">
                    <p><strong>Two upload methods:</strong></p>
                    <p>a) <strong>Drag & drop</strong> or click the upload area to select files (JPG, PNG, WebP)</p>
                    <p>b) <strong>Import from Library</strong> — click the folder icon, browse your saved images by folder, select the ones you want, and import them all at once</p>
                    <p className="text-gray-500 italic">Minimum 4 images, recommended 15-25. See the "20-Image Formula" section below for the ideal composition.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">2</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">Configure</p>
                  <p className="text-xs text-gray-600 mb-1.5">Set up the training parameters. Most have sensible defaults.</p>
                  <div className="bg-gray-50 rounded p-2.5 text-xs text-gray-600 space-y-1">
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
                  <p className="font-medium text-sm text-gray-900">Train</p>
                  <p className="text-xs text-gray-600 mb-1.5">Click "Start Training" and wait. The system handles everything automatically.</p>
                  <div className="bg-gray-50 rounded p-2.5 text-xs text-gray-600 space-y-1">
                    <p><strong>What happens after clicking "Start Training":</strong></p>
                    <p>a) Images are uploaded to cloud storage</p>
                    <p>b) AI auto-captions each image individually (if enabled) — you'll see a "Captioning" stage</p>
                    <p>c) Images + captions are zipped together and sent to FAL.ai</p>
                    <p>d) GPU training begins — progress bar shows the current stage</p>
                    <p>e) On completion, the LoRA (.safetensors file) is saved and appears in the LoRA Picker everywhere</p>
                    <p className="text-gray-500 italic mt-1">Duration: 5-45 minutes depending on model. FLUX LoRA Fast is ~8 min, Wan I2V is ~25 min. You can close the modal — training continues on FAL's servers.</p>
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

        {/* Understanding Training Types */}
        <Section icon={Target} title="Training Types — Subject vs Style vs Character">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              The training type determines <strong>what the trigger word learns</strong>. This is the most critical decision
              and affects how the system captions your images.
            </p>

            <div className="grid gap-3">
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <h4 className="font-semibold text-sm text-purple-900">Subject Training</h4>
                  <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">Default</span>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  Teaches the model to recognize a specific <strong>object, product, or person</strong>. The trigger word absorbs
                  the subject's identity — everything about what it <em>looks like</em>.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Auto-caption describes:</strong> Pose, angle, lighting, setting, clothing, background</p>
                  <p><strong>Auto-caption omits:</strong> The subject's identity, face features, distinguishing characteristics</p>
                  <p><strong>Use for:</strong> Products, logos, specific objects, pets, branded items</p>
                </div>
              </div>

              <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-amber-600" />
                  <h4 className="font-semibold text-sm text-amber-900">Style Training</h4>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  Teaches the model a <strong>visual aesthetic or artistic style</strong>. The trigger word absorbs everything
                  about the visual treatment — brushstrokes, color palette, mood, texture.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
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

              <div className="border border-teal-200 rounded-lg p-4 bg-teal-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <h4 className="font-semibold text-sm text-teal-900">Character Training</h4>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  Specialized variant of Subject training for <strong>human characters and faces</strong>. The trigger word
                  absorbs facial features, hair, eye color, and body type.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Auto-caption describes:</strong> Pose, camera angle, lighting, setting, clothing</p>
                  <p><strong>Auto-caption omits:</strong> Face, hair color, eye color, body type</p>
                  <p><strong>Use for:</strong> Consistent AI characters for videos, brand avatars, influencer personas</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Image Dataset Guide */}
        <Section icon={Image} title="Preparing Your Training Images — The 20-Image Formula">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              Quality and variety of your training images matters far more than quantity. 20 well-composed images
              consistently outperform 100 near-identical ones.
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-3">The Ideal 20-Image Dataset (for Character/Subject):</h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>1 reference image</strong> — your "source of truth", the best/clearest shot</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>4 base shots</strong> — close-up face, head & shoulders portrait, waist up, full body</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
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

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-3">For Style Training:</h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>15-25 images</strong> that exemplify the style you want to learn</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Diverse content</strong> — different subjects, scenes, but all in the same visual style</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Consistent aesthetic</strong> — all images should share the same visual treatment</span>
                </div>
              </div>
            </div>

            <Tip>
              <strong>Resolution consistency:</strong> Use the same resolution for all training images when possible.
              Mixed resolutions can cause aspect ratio bucket errors during training.
            </Tip>

            <Warning>
              <strong>Don't overfit:</strong> Too many similar images (same pose, same angle) will make the LoRA only
              reproduce those exact images. Variety is the key to generalization.
            </Warning>

            <h4 className="font-semibold text-sm text-gray-900">Uploading Images</h4>
            <p className="text-sm text-gray-600">Two methods:</p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-5">
              <li><strong>Drag & Drop / File Upload:</strong> Click the upload area or drag files directly. Supports JPG, PNG, WebP.</li>
              <li><strong>Import from Library:</strong> Click the folder icon to browse your Image Library. Select images across folders, then import them all at once.</li>
            </ul>
          </div>
        </Section>

        {/* Trigger Words */}
        <Section icon={Wand2} title="Trigger Words — How They Work">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              The trigger word is a unique identifier that activates your LoRA during image generation. When you include
              the trigger word in your prompt, the model applies the learned concept.
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Choosing a Good Trigger Word</h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Unique and unlikely:</strong> Choose something that doesn't exist in the base model's training data. "blonde3G" works better than "blonde woman".</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>Short and memorable:</strong> "rxsneaker" is better than "my_red_custom_sneaker_v2".</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  <span><strong>No common words:</strong> Avoid "red car" or "modern house" — these will collide with the model's existing knowledge.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                <p className="text-xs font-semibold text-green-800 mb-1">Good Trigger Words</p>
                <div className="space-y-0.5 text-xs text-green-700">
                  <p><CodeBlock>rxsneaker</CodeBlock> — product</p>
                  <p><CodeBlock>zk_sarah</CodeBlock> — character</p>
                  <p><CodeBlock>morisot_style</CodeBlock> — art style</p>
                  <p><CodeBlock>acmebrand</CodeBlock> — brand identity</p>
                </div>
              </div>
              <div className="border border-red-200 rounded-lg p-3 bg-red-50/50">
                <p className="text-xs font-semibold text-red-800 mb-1">Bad Trigger Words</p>
                <div className="space-y-0.5 text-xs text-red-700">
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

        {/* Auto-Captioning */}
        <Section icon={FileText} title="Auto-Captioning — AI-Powered Image Descriptions">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              Every training image needs a text caption file. Stitch offers two modes:
            </p>

            <div className="grid gap-3">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <h4 className="font-semibold text-sm text-gray-900">AI Auto-Caption (Recommended)</h4>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">ON by default</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  GPT-4o-mini analyzes each image individually and writes a custom caption. This produces significantly
                  better LoRAs than template captions because every image gets a unique, accurate description.
                </p>
                <p className="text-xs text-gray-600">
                  The captioning strategy automatically adapts to your training type:
                </p>
                <ul className="text-xs text-gray-600 mt-1 space-y-1 list-disc pl-5">
                  <li><strong>Subject:</strong> Describes pose, setting, clothing — omits identity</li>
                  <li><strong>Style:</strong> Describes content only — omits visual aesthetic</li>
                  <li><strong>Character:</strong> Describes pose, setting — omits facial features</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <h4 className="font-semibold text-sm text-gray-900">Template Captions (Fallback)</h4>
                </div>
                <p className="text-xs text-gray-600">
                  If auto-captioning is off or fails, every image gets the same generic caption:
                </p>
                <ul className="text-xs text-gray-600 mt-1 space-y-1 list-disc pl-5">
                  <li>Subject: <CodeBlock>a photo of {'{trigger_word}'}</CodeBlock></li>
                  <li>Style: <CodeBlock>an image in {'{trigger_word}'} style</CodeBlock></li>
                  <li>Character: <CodeBlock>a portrait of {'{trigger_word}'}, face visible</CodeBlock></li>
                </ul>
              </div>
            </div>

            <Tip>
              <strong>Always use auto-captioning.</strong> Per-image AI captions produce dramatically better LoRAs
              than generic templates. The cost is minimal (GPT-4o-mini vision at low detail, ~$0.01 for 20 images).
            </Tip>
          </div>
        </Section>

        {/* Training Models */}
        <Section icon={Layers} title="Training Models — Complete Reference">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              16 training models are available across 2 categories (12 image, 4 video). Each produces a LoRA compatible with its base model family.
            </p>

            <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
              <Image className="w-4 h-4 text-purple-600" /> Image Models (12)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModelCard
                name="FLUX LoRA Fast"
                base="FLUX.1 [dev]"
                category="image"
                pricing="$2 flat"
                features={['Style', 'Face masks']}
                bestFor="Quick, cheap LoRA training. Great default choice."
                stepRange={[1, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="FLUX Portrait Trainer"
                base="FLUX.1 [dev]"
                category="image"
                pricing="$0.0024/step"
                features={['Multi-resolution', 'Subject crop']}
                bestFor="Portrait/face-focused LoRAs with automatic subject cropping."
                stepRange={[1, 10000]}
                defaultSteps={2500}
              />
              <ModelCard
                name="FLUX Kontext Trainer"
                base="FLUX.1 Kontext [dev]"
                category="image"
                pricing="$2.50/1K steps"
                features={[]}
                bestFor="Kontext-compatible LoRAs for the editing model."
                stepRange={[500, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Wan 2.2 T2I Trainer"
                base="Wan 2.2 T2I"
                category="image"
                pricing="$0.0045/step"
                features={['Style', 'Face masks']}
                bestFor="High-quality image LoRAs on the latest Wan model."
                stepRange={[10, 6000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Qwen Image Trainer"
                base="Qwen Image"
                category="image"
                pricing="$0.002/step"
                features={[]}
                bestFor="Training LoRAs for the Qwen image generation model."
                stepRange={[1, 8000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Qwen Image Edit 2511"
                base="Qwen Image Edit 2511"
                category="image"
                pricing="$0.004/step"
                features={[]}
                bestFor="LoRAs for the Qwen image editing model."
                stepRange={[100, 30000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Z-Image Turbo Trainer"
                base="Z-Image Turbo (6B)"
                category="image"
                pricing="$0.00226/step"
                features={['Style']}
                bestFor="Fast, lightweight LoRAs. Good for common subjects."
                stepRange={[100, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Turbo FLUX Trainer"
                base="FLUX.1 [dev]"
                category="image"
                pricing="$0.0024/step"
                features={['Style', 'Face crop']}
                bestFor="Blazing fast FLUX trainer. Face cropping + style/subject modes."
                stepRange={[1, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="FLUX.2 Dev Trainer V2"
                base="FLUX.2 [dev]"
                category="image"
                pricing="$0.0255/step"
                features={['Edit pairs']}
                bestFor="Premium FLUX.2 trainer. Highest quality, most expensive."
                stepRange={[100, 10000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Z-Image Turbo V2"
                base="Z-Image Turbo (6B)"
                category="image"
                pricing="$0.0008/step"
                features={[]}
                bestFor="Cheaper V2 Z-Image trainer. Supports up to 40K steps."
                stepRange={[10, 40000]}
                defaultSteps={2000}
              />
              <ModelCard
                name="Qwen Image 2512"
                base="Qwen Image 2512"
                category="image"
                pricing="$0.0015/step"
                features={[]}
                bestFor="Newer Qwen 2512 model. Better quality than original Qwen."
                stepRange={[100, 30000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="Qwen Image 2512 V2"
                base="Qwen Image 2512"
                category="image"
                pricing="$0.0009/step"
                features={[]}
                bestFor="Cheapest Qwen option. V2 with up to 40K steps."
                stepRange={[10, 40000]}
                defaultSteps={2000}
              />
            </div>

            <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2 mt-6">
              <Video className="w-4 h-4 text-blue-600" /> Video Models (4)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModelCard
                name="Wan 2.1 I2V Trainer"
                base="Wan 2.1 I2V 14B"
                category="video"
                pricing="5 credits/run"
                features={['Auto-scale']}
                bestFor="Image-to-video LoRAs on Wan 2.1. Good character consistency in motion."
                stepRange={[100, 20000]}
                defaultSteps={400}
              />
              <ModelCard
                name="Wan 2.2 I2V-A14B"
                base="Wan 2.2 I2V-A14B"
                category="video"
                pricing="$0.005/step"
                features={['Auto-scale']}
                bestFor="Latest Wan video model LoRAs. Best for character consistency in video."
                stepRange={[100, 20000]}
                defaultSteps={400}
              />
              <ModelCard
                name="Hunyuan Video"
                base="Hunyuan Video"
                category="video"
                pricing="$5 flat"
                features={['Auto-caption']}
                bestFor="Tencent's video model. Fixed price, good for experimentation."
                stepRange={[1, 5000]}
                defaultSteps={1000}
              />
              <ModelCard
                name="LTX-2 Video Trainer"
                base="LTX-2 Video"
                category="video"
                pricing="$0.0048/step"
                features={['Audio', 'Auto-scale']}
                bestFor="LTX-2 video with audio training support. Good for styles and effects."
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
          </div>
        </Section>

        {/* Advanced Settings */}
        <Section icon={Settings} title="Advanced Settings — Steps, Learning Rate, Masks (Deep Dive)">
          <div className="mt-4 space-y-6">
            <p className="text-sm text-gray-700">
              These settings are in the collapsible "Advanced Settings" panel on the Configure step.
              The defaults are calibrated per model and work well for most cases — but understanding them
              helps you diagnose and fix training issues.
            </p>

            {/* TRAINING STEPS */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#2C666E]" />
                Training Steps
              </h4>
              <p className="text-sm text-gray-700">
                Each "step" is one pass through a batch of training images where the model adjusts its internal weights
                to better reproduce your concept. Think of it like practice rounds — each step makes the model slightly
                better at recognizing your subject/style.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h5 className="font-medium text-sm text-gray-900">What Happens at Each Step Count</h5>
                <div className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded shrink-0">TOO LOW</span>
                    <div className="text-xs text-gray-700">
                      <p><strong>~100-300 steps:</strong> The model barely learns anything. Generated images show vague hints of your subject but lack detail. Faces are blurry, products look generic. The LoRA has almost no effect.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded shrink-0">WARMING UP</span>
                    <div className="text-xs text-gray-700">
                      <p><strong>~300-700 steps:</strong> The model starts recognizing the concept. Outputs begin to resemble your subject but details like eye shape, skin texture, or product proportions are inconsistent.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded shrink-0">SWEET SPOT</span>
                    <div className="text-xs text-gray-700">
                      <p><strong>~800-1500 steps (FLUX), ~250-500 (Wan):</strong> The model has learned your concept well AND can still generalize. You can place the subject in new scenes, poses, and lighting that weren't in the training data. This is where you want to be.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded shrink-0">DIMINISHING</span>
                    <div className="text-xs text-gray-700">
                      <p><strong>~1500-2500 steps:</strong> Quality plateaus. The model is accurate but starts losing flexibility — new poses/scenes might look slightly "stiff" or unnatural.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded shrink-0">OVERFIT</span>
                    <div className="text-xs text-gray-700">
                      <p><strong>~3000+ steps:</strong> The model has <em>memorized</em> your training images. Every generation looks like a copy of a training photo regardless of your prompt. Outputs look artificially sharp. The LoRA is "frozen" — it refuses to generalize to new situations.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 mb-2">Recommended Steps by Model & Dataset Size</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Model</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">10 images</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">20 images</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">50 images</th>
                        <th className="text-left py-1.5 font-semibold text-gray-700">100 images</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">FLUX LoRA Fast</td><td className="py-1.5 pr-3">600-800</td><td className="py-1.5 pr-3">800-1200</td><td className="py-1.5 pr-3">1200-1800</td><td className="py-1.5">1500-2500</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">FLUX Portrait</td><td className="py-1.5 pr-3">1500-2000</td><td className="py-1.5 pr-3">2000-3000</td><td className="py-1.5 pr-3">3000-4000</td><td className="py-1.5">4000-6000</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">Wan 2.1/2.2 I2V</td><td className="py-1.5 pr-3">200-300</td><td className="py-1.5 pr-3">300-500</td><td className="py-1.5 pr-3">400-800</td><td className="py-1.5">600-1200</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">Z-Image Turbo</td><td className="py-1.5 pr-3">600-800</td><td className="py-1.5 pr-3">800-1200</td><td className="py-1.5 pr-3">1000-1500</td><td className="py-1.5">1200-2000</td></tr>
                      <tr><td className="py-1.5 pr-3 font-medium text-gray-900">Qwen Image</td><td className="py-1.5 pr-3">600-800</td><td className="py-1.5 pr-3">800-1200</td><td className="py-1.5 pr-3">1000-1500</td><td className="py-1.5">1200-2000</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                  <p className="text-xs font-semibold text-green-800 mb-1.5">Example: Character LoRA (good)</p>
                  <div className="text-xs text-green-700 space-y-0.5">
                    <p>Model: FLUX LoRA Fast</p>
                    <p>Dataset: 20 images of "zk_sarah"</p>
                    <p>Steps: <strong>1000</strong></p>
                    <p>Result: Accurate face in new poses, new outfits, new scenes. Natural-looking outputs.</p>
                  </div>
                </div>
                <div className="border border-red-200 rounded-lg p-3 bg-red-50/50">
                  <p className="text-xs font-semibold text-red-800 mb-1.5">Example: Same LoRA (overfit)</p>
                  <div className="text-xs text-red-700 space-y-0.5">
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
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2C666E]" />
                Learning Rate
              </h4>
              <p className="text-sm text-gray-700">
                The learning rate controls how much the model changes its weights on each training step. Think of it
                like a volume knob — too low and the model barely learns, too high and it "overshoots" and produces
                distorted, unstable results.
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 mb-3">Visual Analogy</h5>
                <p className="text-xs text-gray-700 mb-2">
                  Imagine you're trying to park a car in a tight spot:
                </p>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold shrink-0">0.00001</span>
                    <span>= Moving 1mm at a time. You'll get there perfectly but it takes forever (needs way more steps).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold shrink-0">0.0004&nbsp;</span>
                    <span>= Moving 6 inches at a time. Efficient — you park accurately in a reasonable time. <strong>This is a typical default (e.g. Qwen Image, Wan T2I).</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">0.01&nbsp;&nbsp;&nbsp;</span>
                    <span>= Flooring the accelerator. You'll overshoot, crash, and the results are garbage. Never do this.</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 mb-2">Default Learning Rates by Model</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Model</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Default LR</th>
                        <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Safe range</th>
                        <th className="text-left py-1.5 font-semibold text-gray-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">FLUX LoRA Fast</td><td className="py-1.5 pr-3 font-mono text-gray-400">N/A</td><td className="py-1.5 pr-3 font-mono text-gray-400">—</td><td className="py-1.5">Internally calibrated. Not adjustable.</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">FLUX Portrait</td><td className="py-1.5 pr-3 font-mono">0.00009</td><td className="py-1.5 pr-3 font-mono">0.00005 - 0.0002</td><td className="py-1.5">Lower — portrait is more sensitive</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">Wan 2.1/2.2 I2V</td><td className="py-1.5 pr-3 font-mono">0.0002</td><td className="py-1.5 pr-3 font-mono">0.0001 - 0.0005</td><td className="py-1.5">Video models need lower LR</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">Wan 2.2 T2I</td><td className="py-1.5 pr-3 font-mono">0.0007</td><td className="py-1.5 pr-3 font-mono">0.0003 - 0.001</td><td className="py-1.5">Image variant tolerates higher LR</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">Qwen Image</td><td className="py-1.5 pr-3 font-mono">0.0005</td><td className="py-1.5 pr-3 font-mono">0.0002 - 0.001</td><td className="py-1.5">Standard range</td></tr>
                      <tr className="border-b border-gray-100"><td className="py-1.5 pr-3 font-medium text-gray-900">Z-Image Turbo</td><td className="py-1.5 pr-3 font-mono">0.0001</td><td className="py-1.5 pr-3 font-mono">0.00005 - 0.0003</td><td className="py-1.5">Small model, lower rate needed</td></tr>
                      <tr><td className="py-1.5 pr-3 font-medium text-gray-900">Hunyuan Video</td><td className="py-1.5 pr-3 font-mono">0.0001</td><td className="py-1.5 pr-3 font-mono">0.00005 - 0.0003</td><td className="py-1.5">Conservative for stability</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                  <p className="text-xs font-semibold text-green-800 mb-1.5">When to INCREASE learning rate</p>
                  <ul className="text-xs text-green-700 space-y-0.5 list-disc pl-4">
                    <li>Training completed but LoRA has very weak effect</li>
                    <li>Trigger word barely changes the output</li>
                    <li>You've already tried increasing steps with no improvement</li>
                    <li>Increase by 1.5-2x, not more (e.g. 0.0005 to 0.00075)</li>
                  </ul>
                </div>
                <div className="border border-red-200 rounded-lg p-3 bg-red-50/50">
                  <p className="text-xs font-semibold text-red-800 mb-1.5">When to DECREASE learning rate</p>
                  <ul className="text-xs text-red-700 space-y-0.5 list-disc pl-4">
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
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#2C666E]" />
                Create Masks (Face Detection & Segmentation)
              </h4>
              <p className="text-sm text-gray-700">
                When "Create Masks" is enabled, the training system runs face detection on every image in your dataset.
                It creates a <strong>segmentation mask</strong> — essentially a highlighted overlay that tells the model
                "pay extra attention to this area" during training.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h5 className="font-medium text-sm text-gray-900">How It Works (Step by Step)</h5>
                <div className="space-y-2 text-xs text-gray-700">
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

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-sm text-gray-900 mb-2">Supported Models</h5>
                <p className="text-xs text-gray-600 mb-2">
                  Only 2 of our 16 training models support masks. The toggle is automatically hidden for models that don't support it. Both models have masks enabled by default.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span className="text-gray-700"><strong>FLUX LoRA Fast</strong> — <CodeBlock>create_masks</CodeBlock></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span className="text-gray-700"><strong>Wan 2.2 T2I</strong> — <CodeBlock>use_masks</CodeBlock></span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                  <p className="text-xs font-semibold text-green-800 mb-2">ENABLE masks when:</p>
                  <ul className="text-xs text-green-700 space-y-1 list-disc pl-4">
                    <li><strong>Training a human character/face</strong> — masks ensure the model prioritizes getting the face right over background details</li>
                    <li><strong>Your character has distinctive facial features</strong> — unique eye shape, freckles, scars, facial hair that need precise reproduction</li>
                    <li><strong>You want face consistency across varied scenes</strong> — masks help the model learn "this face" vs "this entire image"</li>
                  </ul>
                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                    <p className="text-[10px] text-green-800 font-medium mb-1">Example scenario (masks ON):</p>
                    <p className="text-[10px] text-green-700">Training "zk_sarah" with 20 images. Some images show her full body in complex scenes. Without masks, the model might associate her background environments with the trigger word. With masks, the model knows: "Focus on this face — the background is context, not identity."</p>
                  </div>
                </div>

                <div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
                  <p className="text-xs font-semibold text-red-800 mb-2">DISABLE masks when:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                    <li><strong>Training a visual style</strong> — the model needs to learn the entire image's aesthetic, not just faces</li>
                    <li><strong>Training a product/object</strong> — there are no faces to detect; masks would find nothing or produce false positives</li>
                    <li><strong>Training non-human subjects</strong> — pets, vehicles, buildings, logos. Face detection won't find them.</li>
                    <li><strong>Your images don't have clear, visible faces</strong> — back-of-head shots, silhouettes, or heavily stylized art may confuse the face detector</li>
                  </ul>
                  <div className="mt-2 p-2 bg-white rounded border border-red-200">
                    <p className="text-[10px] text-red-800 font-medium mb-1">Example scenario (masks OFF):</p>
                    <p className="text-[10px] text-red-700">Training "morisot_style" with 18 paintings. The model needs to learn brushstroke technique, color palette, and composition across the entire canvas — not just faces. Masks would make the model over-focus on faces in paintings and ignore the style of landscapes, still lifes, etc.</p>
                  </div>
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
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#2C666E]" />
                Putting It All Together — Example Configurations
              </h4>

              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <h5 className="font-medium text-sm text-gray-900">Character: AI Influencer "Sophia"</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
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
                  <p className="text-[10px] text-gray-500 mt-2 italic">Good dataset: 4 close-ups, 4 portraits, 6 waist-up, 8 full-body. 2 outfits, 3 backgrounds, varied poses and lighting.</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-amber-600" />
                    <h5 className="font-medium text-sm text-gray-900">Style: Watercolor Brand Aesthetic</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
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
                  <p className="text-[10px] text-gray-500 mt-2 italic">Dataset: 18 watercolor artworks. Mix of landscapes, portraits, still life — all sharing the same watercolor technique. Captions describe content only ("a boat on a lake, mountains in background") — the visual style is NOT described so the trigger word absorbs it.</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <h5 className="font-medium text-sm text-gray-900">Video: Character Consistency in Animation</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
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
                  <p className="text-[10px] text-gray-500 mt-2 italic">Tip: Use the same trigger word as your FLUX LoRA. Train a FLUX LoRA for keyframes, then a Wan LoRA for animation — both respond to the same trigger word for a unified character pipeline.</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4 text-teal-600" />
                    <h5 className="font-medium text-sm text-gray-900">Product: Custom Sneaker Design</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
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
                  <p className="text-[10px] text-gray-500 mt-2 italic">Dataset: Product photos from multiple angles (front, side, back, top, sole). White background + lifestyle shots. Auto-captions describe angle, lighting, surface — NOT the shoe's brand/design details (trigger word absorbs those).</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Training Process */}
        <Section icon={Clock} title="What Happens During Training">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
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
                    <p className="font-medium text-sm text-gray-900">{stage}</p>
                    <p className="text-xs text-gray-600">{desc}</p>
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

        {/* Using Your LoRA */}
        <Section icon={Wand2} title="Using Your Trained LoRA">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              Once training completes, your LoRA appears in the <strong>LoRA Picker</strong> component across all generation tools.
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Where You Can Use LoRAs</h4>
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-5">
                <li><strong>Imagineer</strong> — Text-to-Image and Image-to-Image generation</li>
                <li><strong>Turnaround Sheet</strong> — Character reference sheet generation</li>
                <li><strong>JumpStart Video Studio</strong> — Video generation from images</li>
                <li><strong>Shorts Workbench</strong> — Keyframe image generation</li>
                <li><strong>Storyboard</strong> — Preview image generation</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Prompting with Your LoRA</h4>
              <p className="text-xs text-gray-600 mb-2">Always include the trigger word in your prompt:</p>
              <div className="bg-white border border-gray-200 rounded p-3 text-xs font-mono text-gray-700">
                "rxsneaker on a marble countertop, dramatic studio lighting, macro photography"
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The trigger word tells the model "use the learned concept here". Without it, the LoRA has no effect.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">LoRA Scale</h4>
              <p className="text-xs text-gray-600">
                When selecting a LoRA in the picker, you can adjust the <strong>scale</strong> (0.0 - 1.0).
                This controls how strongly the LoRA's learned concept is applied.
              </p>
              <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc pl-5">
                <li><strong>1.0:</strong> Full strength — strong likeness but may reduce prompt flexibility</li>
                <li><strong>0.7-0.8:</strong> Good balance of likeness and creativity (recommended)</li>
                <li><strong>0.3-0.5:</strong> Subtle influence — hints of the learned concept</li>
              </ul>
            </div>

            <Warning>
              <strong>Model compatibility:</strong> A LoRA trained on FLUX will only work with FLUX-based generation models.
              A Wan LoRA only works with Wan models. Make sure you select a compatible generation model when using your LoRA.
            </Warning>
          </div>
        </Section>

        {/* Troubleshooting */}
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
                a: 'Make sure you\'re including the trigger word in your prompt. Also check the LoRA scale — if it\'s too low (< 0.3), the effect is barely visible.',
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
            ].map(({ q, a }, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <p className="font-medium text-sm text-gray-900 mb-1">{q}</p>
                <p className="text-xs text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Cost Reference */}
        <Section icon={DollarSign} title="Cost Reference">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              All training runs through FAL.ai. Costs vary by model:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 font-semibold text-gray-900">Model</th>
                    <th className="text-left py-2 pr-3 font-semibold text-gray-900">Pricing</th>
                    <th className="text-left py-2 pr-3 font-semibold text-gray-900">Cost for 1000 steps</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Est. Training Time</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
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
                    <tr key={model} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-gray-900">{model}</td>
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

        {/* Technical Architecture */}
        <Section icon={Shield} title="Technical Architecture (For Developers)">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700">
              Reference for how the system works under the hood.
            </p>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">File Structure</h4>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{`Frontend:
  src/components/modals/BrandAssetsModal.jsx  — 3-step training wizard
  src/components/LoRAPicker.jsx               — Multi-select LoRA component

Backend:
  api/lora/train.js      — Training submission (ZIP + FAL dispatch)
  api/lora/result.js     — Poll training status
  api/lora/caption.js    — AI auto-captioning (GPT-4o-mini)
  api/lora/models.js     — Available models list for frontend
  api/lora/library.js    — Pre-built LoRA library
  api/lib/trainingModelRegistry.js  — Declarative model config (16 models)
  api/lib/resolveLoraConfigs.js     — Multi-LoRA resolution chain

Database:
  brand_loras            — Training metadata + result URLs
  visual_subjects        — Character avatars linked to LoRAs
  lora_library           — Pre-built HuggingFace LoRAs`}</pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">API Endpoints</h4>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{`POST /api/lora/train     — Start training (requires auth)
POST /api/lora/result    — Poll training result
POST /api/lora/caption   — Auto-caption images
GET  /api/lora/models    — List available training models
GET  /api/lora/library   — Browse pre-built LoRAs`}</pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">ZIP Archive Format</h4>
                <p className="text-xs text-gray-600 mb-2">
                  The training ZIP contains paired files — each image with a matching caption:
                </p>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{`image_000.jpg     image_000.txt
image_001.png     image_001.txt
image_002.webp    image_002.txt
...`}</pre>
                <p className="text-xs text-gray-600 mt-2">
                  Caption files contain the trigger word + description. Example:
                </p>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap bg-white border border-gray-200 rounded p-2 mt-1">
{`zk_sarah, standing in a park with trees in the background,
wearing a blue denim jacket, natural sunlight from the left,
three-quarter angle facing camera`}</pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">FAL Field Name Differences</h4>
                <Warning>
                  Different FAL models use different field names. The Training Model Registry handles this automatically via <CodeBlock>buildBody()</CodeBlock> — never construct FAL payloads manually.
                </Warning>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap mt-2">{`ZIP URL field:
  images_data_url   — FLUX Fast, Turbo FLUX, Hunyuan
  image_data_url    — Kontext, Qwen, Z-Image, FLUX.2 V2
  training_data_url — Wan models, LTX-2

Trigger word field:
  trigger_word      — FLUX Fast, Hunyuan
  trigger_phrase    — Portrait, Turbo FLUX, Wan, Qwen`}</pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Upload Flow</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Training images are zipped with captions, then uploaded to FAL CDN via a two-step flow:
                </p>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{`1. POST rest.fal.ai/storage/upload/initiate
   → returns { upload_url, file_url }
2. PUT upload_url with zip bytes
   → file_url is the permanent CDN link passed to training`}</pre>
              </div>
            </div>
          </div>
        </Section>

        {/* Pro Tips */}
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
                desc: 'A FLUX LoRA generates images, a Wan LoRA generates videos. For a full character pipeline, train both: FLUX for keyframes, Wan for animation.',
              },
              {
                title: 'LoRA scale of 0.75 is often better than 1.0',
                desc: 'Full scale (1.0) can make outputs rigid. Backing off to 0.7-0.8 lets the base model contribute more creativity while still maintaining likeness.',
              },
              {
                title: 'Re-train if quality is poor — don\'t just adjust steps',
                desc: 'Bad datasets produce bad LoRAs regardless of steps. If results are poor after 2-3 step adjustments, revisit your training images (more variety, better quality).',
              },
            ].map(({ title, desc }, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0">{i + 1}</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">{title}</p>
                  <p className="text-xs text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="text-center text-xs text-gray-400 py-6">
          LoRA Training Studio Guide &middot; Internal Admin Reference &middot; Last updated April 2026
        </div>
    </div>
  );
}

export default function LoraGuidePage() {
  const navigate = useNavigate();

  return (
    <PasswordGate>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#2C666E]/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-[#2C666E]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">LoRA Training Studio Guide</h1>
                <p className="text-xs text-gray-500">Complete reference for training custom AI models</p>
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
