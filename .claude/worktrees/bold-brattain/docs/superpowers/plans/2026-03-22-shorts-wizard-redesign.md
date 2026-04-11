# Shorts Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Shorts form on `/campaigns/new` with a 6-step wizard reusing existing UI components (StyleGrid, LoRAPicker, WizardStepper).

**Architecture:** CampaignsNewPage gets a complete rewrite of its Shorts mode. When `contentType === 'shorts'`, render a WizardStepper-driven flow across 6 steps. Each step is a self-contained section. Backend gets minor additions: voices/library endpoint, starting_image + image_model params in pipeline, video style thumbnails, shared model constants.

**Tech Stack:** React, WizardStepper, StyleGrid, LoRAPicker, ElevenLabs API, FAL image generation

**Spec:** `docs/superpowers/specs/2026-03-22-shorts-wizard-redesign.md`

---

## File Structure

### New files:
- `src/lib/modelPresets.js` — Shared IMAGE_MODELS + VIDEO_MODELS arrays (extracted from TemplatesPage)
- `src/lib/scenePills.js` — Scene builder pill data for script editor
- `src/lib/captionStylePresets.js` — Caption style definitions with preview rendering data
- `api/voices/library.js` — ElevenLabs voice library endpoint

### Modified files:
- `src/pages/CampaignsNewPage.jsx` — Replace flat Shorts form with 6-step wizard
- `src/pages/TemplatesPage.jsx` — Import shared model constants instead of defining inline
- `api/lib/videoStylePresets.js` — Add `thumb` URLs
- `api/lib/shortsPipeline.js` — Add `starting_image` and `image_model` params
- `api/campaigns/create.js` — Pass `starting_image` and `image_model` to pipeline
- `server.js` — Register `/api/voices/library`, remove `/api/styles/voices`

---

### Task 1: Extract shared model constants

**Files:**
- Create: `src/lib/modelPresets.js`
- Modify: `src/pages/TemplatesPage.jsx`

- [ ] **Step 1: Create shared model presets module**

```js
// src/lib/modelPresets.js
export const IMAGE_MODELS = [
  { value: 'wavespeed', label: 'Wavespeed', strength: 'Fastest', price: '~$0.01/img', lora: false },
  { value: 'fal_seedream', label: 'SeedDream', strength: 'Photorealistic', price: '~$0.02/img', lora: false },
  { value: 'fal_flux', label: 'FLUX 2 Dev', strength: 'Creative, versatile, LoRA', price: '$0.035/img', lora: true },
  { value: 'fal_imagen4', label: 'Imagen 4', strength: "Google's best quality", price: '$0.04/img', lora: false },
  { value: 'fal_kling_img', label: 'Kling Image V3', strength: 'Consistent photorealism', price: '$0.028/img', lora: false },
  { value: 'fal_grok', label: 'Grok Imagine', strength: 'Highly aesthetic', price: '$0.02/img', lora: false },
  { value: 'fal_ideogram', label: 'Ideogram V2', strength: 'Best text/typography', price: '~$0.04/img', lora: false },
];

export const VIDEO_MODELS = [
  { value: 'wavespeed_wan', label: 'Wavespeed WAN', strength: 'Fastest, budget-friendly', price: '~$0.10/vid' },
  { value: 'fal_kling', label: 'Kling 2.0 Master', strength: 'Realistic motion', price: '$0.28/sec' },
  { value: 'fal_hailuo', label: 'Hailuo (MiniMax)', strength: 'Cinematic', price: '$0.50/vid' },
  { value: 'fal_veo3', label: 'Veo 3 (Google)', strength: 'Best quality + audio', price: '$0.15/sec' },
  { value: 'fal_veo2', label: 'Veo 2 (Google)', strength: 'Excellent realism', price: '$0.50/sec' },
  { value: 'fal_kling_v3', label: 'Kling V3 Pro', strength: 'Latest Kling + audio', price: '$0.28/sec' },
  { value: 'fal_kling_o3', label: 'Kling O3 Pro', strength: 'Start+end frame control', price: '$0.28/sec' },
  { value: 'fal_wan25', label: 'Wan 2.5 Preview', strength: 'Good quality, cheap', price: '$0.05/sec' },
  { value: 'fal_wan_pro', label: 'Wan Pro', strength: 'Premium WAN, 1080p', price: '$0.80/vid' },
  { value: 'fal_pixverse', label: 'PixVerse V4.5', strength: 'Great value', price: '$0.05/seg' },
];
```

- [ ] **Step 2: Update TemplatesPage.jsx to import from shared module**

In `src/pages/TemplatesPage.jsx`, replace the inline `IMAGE_MODELS` and `VIDEO_MODELS` definitions (lines 86-108) with:

```js
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
```

Delete the old inline arrays.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/modelPresets.js src/pages/TemplatesPage.jsx
git commit -m "refactor: extract shared IMAGE_MODELS and VIDEO_MODELS to modelPresets.js"
```

---

### Task 2: Create caption style presets with visual preview data

**Files:**
- Create: `src/lib/captionStylePresets.js`

- [ ] **Step 1: Create caption style presets with preview objects**

```js
// src/lib/captionStylePresets.js
export const CAPTION_STYLES = [
  {
    key: 'word_pop',
    label: 'Word Pop',
    description: 'Bold white, heavy black outline',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-white font-black text-lg tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]', textStroke: '2px black' },
  },
  {
    key: 'karaoke_glow',
    label: 'Karaoke Glow',
    description: 'Gold highlight, warm shadow',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-yellow-400 font-extrabold text-lg drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]' },
  },
  {
    key: 'word_highlight',
    label: 'Word Highlight',
    description: 'Subtle white, minimal outline',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-white font-bold text-lg opacity-90' },
  },
  {
    key: 'neon_glow',
    label: 'Neon Glow',
    description: 'Cyan neon, bright glow',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-cyan-400 font-bold text-lg drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]' },
  },
  {
    key: 'typewriter',
    label: 'Typewriter',
    description: 'Monospace, typed-in feel',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-green-400 font-mono text-lg' },
  },
  {
    key: 'bounce',
    label: 'Bounce',
    description: 'White, bouncy entrance',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'text-white font-black text-lg animate-bounce' },
  },
  {
    key: 'gradient_slide',
    label: 'Gradient Slide',
    description: 'Gradient colored, slide motion',
    preview: { text: 'WORD', bg: 'bg-slate-900', style: 'font-extrabold text-lg bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent' },
  },
  {
    key: 'outline_only',
    label: 'Outline Only',
    description: 'Transparent fill, white stroke',
    preview: { text: 'WORD', bg: 'bg-slate-900', textStroke: '1px white', style: 'text-transparent font-black text-lg' },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/captionStylePresets.js
git commit -m "feat: create caption style presets with visual preview data"
```

---

### Task 3: Create scene builder pills

**Files:**
- Create: `src/lib/scenePills.js`

- [ ] **Step 1: Create scene pill categories**

```js
// src/lib/scenePills.js
export const SCENE_PILL_CATEGORIES = [
  {
    label: 'Environments',
    pills: [
      'urban cityscape', 'dark laboratory', 'modern office', 'futuristic corridor',
      'forest clearing', 'underwater scene', 'mountain peak', 'space station interior',
      'neon-lit street', 'ancient temple', 'desert landscape', 'cozy room interior',
    ],
  },
  {
    label: 'Objects',
    pills: [
      'glowing screens', 'holographic display', 'code on monitor', 'circuit board',
      'smartphone in hand', 'stack of documents', 'microscope', 'robot arm',
      'cryptocurrency chart', 'brain scan image', 'security camera', 'clock ticking',
    ],
  },
  {
    label: 'Atmosphere',
    pills: [
      'fog and mist', 'rain drops', 'neon lights', 'golden hour sun',
      'dramatic shadows', 'lens flare', 'floating particles', 'smoke wisps',
      'lightning flash', 'candlelight', 'moonlight', 'fire glow',
    ],
  },
  {
    label: 'Camera',
    pills: [
      'extreme close-up', 'wide establishing shot', 'aerial drone view',
      'slow zoom in', 'pan left to right', 'dolly forward', 'tracking shot',
      'bird eye view', 'low angle looking up', 'over the shoulder', 'handheld shake',
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scenePills.js
git commit -m "feat: create scene builder pill categories for script editor"
```

---

### Task 4: Create voices/library endpoint

**Files:**
- Create: `api/voices/library.js`
- Modify: `server.js`

- [ ] **Step 1: Create the endpoint**

Read `api/lib/shortsTemplates.js` to understand the `VOICE_PRESETS` structure. Read how the existing `/api/voice/preview` endpoint resolves the user's ElevenLabs key (checks `api_keys` table, falls back to env var). Then create:

```js
// api/voices/library.js
import { createClient } from '@supabase/supabase-js';
import { VOICE_PRESETS } from '../lib/shortsTemplates.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Get user's ElevenLabs key
  const { data: userKeys } = await supabase
    .from('api_keys')
    .select('elevenlabs_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const elevenlabsKey = userKeys?.elevenlabs_key || process.env.ELEVENLABS_API_KEY;

  // Start with presets (always available)
  const voices = VOICE_PRESETS.map(v => ({ ...v, source: 'preset' }));

  // Fetch custom voices from ElevenLabs if key exists
  if (elevenlabsKey) {
    try {
      const elRes = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenlabsKey },
      });
      if (elRes.ok) {
        const data = await elRes.json();
        const customVoices = (data.voices || [])
          .filter(v => !VOICE_PRESETS.some(p => p.id === v.voice_id))
          .map(v => ({
            id: v.voice_id,
            name: v.name,
            description: v.labels?.description || v.labels?.accent || 'Custom voice',
            source: 'custom',
            niches: [],
          }));
        voices.push(...customVoices);
      }
    } catch (err) {
      console.error('[voices/library] ElevenLabs fetch error:', err.message);
    }
  }

  res.json(voices);
}
```

- [ ] **Step 2: Register route in server.js and remove old endpoint**

In `server.js`:
- Add: `app.get('/api/voices/library', authenticateToken, (await import('./api/voices/library.js')).default);`
- Remove the `/api/styles/voices` route registration
- Delete `api/styles/voices.js`

- [ ] **Step 3: Commit**

```bash
git add api/voices/library.js server.js
git rm api/styles/voices.js
git commit -m "feat: add /api/voices/library endpoint with ElevenLabs custom voice support"
```

---

### Task 5: Generate video style thumbnails

**Files:**
- Modify: `api/lib/videoStylePresets.js` — Add `thumb` field

- [ ] **Step 1: Generate 12 thumbnail images**

Use the FAL image generation API (or the app's existing `generateImage` helper) to create a 1:1 thumbnail (~512px) for each of the 12 video styles. Use each style's `prompt` text as the generation prompt. Upload results to Supabase storage bucket `media` under `video-style-thumbs/`.

Generate all 12:
- `iphone_selfie.png` — prompt: the style's prompt text
- `ugc_testimonial.png`
- `tiktok_style.png`
- `facetime_call.png`
- `cinematic.png`
- `documentary.png`
- `commercial.png`
- `product_demo.png`
- `dreamy.png`
- `vintage.png`
- `noir.png`
- `anime.png`

Store the resulting public URLs.

- [ ] **Step 2: Add thumb URLs to videoStylePresets.js**

Add a `thumb` field to each entry in `VIDEO_STYLE_PRESETS`:

```js
iphone_selfie: {
  label: 'iPhone Selfie (Raw)',
  category: 'realistic',
  thumb: 'https://[supabase-storage-url]/video-style-thumbs/iphone_selfie.png',
  prompt: '...',
},
```

Also add a `description` field (short, human-readable) to each entry:

```js
iphone_selfie: {
  label: 'iPhone Selfie (Raw)',
  category: 'realistic',
  description: 'Handheld smartphone footage, natural room lighting, raw unfiltered look',
  thumb: '...',
  prompt: '...',
},
```

Update `listVideoStyles()` to include `thumb` and `description`:

```js
export function listVideoStyles() {
  return Object.entries(VIDEO_STYLE_PRESETS).map(([key, v]) => ({
    key, label: v.label, category: v.category, thumb: v.thumb, description: v.description,
  }));
}
```

- [ ] **Step 3: Update /api/styles/video endpoint to return thumb + description**

The endpoint already calls `listVideoStyles()` — no change needed if the function is updated above.

- [ ] **Step 4: Commit**

```bash
git add api/lib/videoStylePresets.js
git commit -m "feat: add thumbnail images and descriptions to video style presets"
```

---

### Task 6: Add starting_image and image_model to backend

**Files:**
- Modify: `api/lib/shortsPipeline.js`
- Modify: `api/campaigns/create.js`

- [ ] **Step 1: Update shortsPipeline.js**

Read the current file. In the `runShortsPipeline` function:

1. Add `starting_image` and `image_model` to the opts destructuring
2. In the per-scene loop, if `i === 0 && opts.starting_image`, use the starting image instead of generating one:

```js
if (i === 0 && opts.starting_image) {
  imageUrl = opts.starting_image;
  console.log('[shortsPipeline] Using provided starting image for scene 0');
} else if (imageStrategy === 'frame_chain' && i > 0 && prevFrameUrl) {
  imageUrl = prevFrameUrl;
} else {
  // existing image generation logic
  imageUrl = await generateImage(continuityPrompt, '9:16', keys, supabase, opts.lora_config, opts.image_model);
}
```

3. Pass `opts.image_model` to `generateImage` calls (check the function signature in `pipelineHelpers.js` to see how it accepts the model parameter).

- [ ] **Step 2: Update campaigns/create.js**

Read the current file. Add `starting_image` and `image_model` to the destructured fields from `req.body`. Pass them through to `runShortsPipeline`:

```js
runShortsPipeline({
  // existing fields...
  starting_image,
  image_model,
}).catch(/* existing error handler */);
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/shortsPipeline.js api/campaigns/create.js
git commit -m "feat: add starting_image and image_model support to shorts pipeline"
```

---

### Task 7: Rewrite CampaignsNewPage Shorts mode as wizard

**Files:**
- Modify: `src/pages/CampaignsNewPage.jsx` (679 lines currently)

This is the largest task. Read the current file first to understand the complete structure. The Ad mode form must remain unchanged. Replace only the Shorts mode section (`contentType === 'shorts'`).

- [ ] **Step 1: Add new imports**

```js
import WizardStepper from '@/components/ui/WizardStepper';
import StyleGrid from '@/components/ui/StyleGrid';
import LoRAPicker from '@/components/LoRAPicker';
import BrandKitModal from '@/components/modals/BrandKitModal';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/lib/modelPresets';
import { CAPTION_STYLES } from '@/lib/captionStylePresets';
import { SCENE_PILL_CATEGORIES } from '@/lib/scenePills';
```

- [ ] **Step 2: Add wizard state variables**

Replace the existing shorts-specific state with:

```js
// Wizard navigation
const [wizardStep, setWizardStep] = useState('brand_niche');
const [completedSteps, setCompletedSteps] = useState([]);

// Step 1: Brand & Niche
const [showBrandKit, setShowBrandKit] = useState(false);
const [ytConnected, setYtConnected] = useState(false);

// Step 2: Topic & Story
const [startingImage, setStartingImage] = useState(null);

// Step 3: Script
const [scriptScenes, setScriptScenes] = useState([]);
const [scriptLoading, setScriptLoading] = useState(false);
const [expandedScene, setExpandedScene] = useState(null);

// Step 4: Look & Feel
const [imageModel, setImageModel] = useState('fal_flux');

// Step 5: Motion & Sound
const [videoStylesList, setVideoStylesList] = useState([]);
const [voicesList, setVoicesList] = useState([]);
const [previewingVoice, setPreviewingVoice] = useState(null);
const previewAudioRef = useRef(null);

// Keep existing: niche, topic, storyContext, visualStyle, videoStyle,
// videoModel, voiceId, captionStyle, loraConfig, researchedStories, researchLoading
```

- [ ] **Step 3: Define wizard steps**

```js
const WIZARD_STEPS = [
  { key: 'brand_niche', label: 'Brand & Niche' },
  { key: 'topic_story', label: 'Topic & Story' },
  { key: 'script', label: 'Script' },
  { key: 'look_feel', label: 'Look & Feel' },
  { key: 'motion_sound', label: 'Motion & Sound' },
  { key: 'generate', label: 'Generate' },
];
```

- [ ] **Step 4: Add data fetching effects**

```js
// Fetch video styles and voices when entering motion_sound step
useEffect(() => {
  if (wizardStep === 'motion_sound' && videoStylesList.length === 0) {
    apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStylesList).catch(() => {});
    apiFetch('/api/voices/library').then(r => r.json()).then(setVoicesList).catch(() => {});
  }
}, [wizardStep]);

// Check YouTube status when brand changes
useEffect(() => {
  if (!selectedBrand || contentType !== 'shorts') return;
  apiFetch(`/api/youtube/status?brand_username=${encodeURIComponent(selectedBrand)}`)
    .then(r => r.json())
    .then(d => setYtConnected(d.connected))
    .catch(() => setYtConnected(false));
}, [selectedBrand, contentType]);
```

- [ ] **Step 5: Add wizard navigation helpers**

```js
const goNext = () => {
  const idx = WIZARD_STEPS.findIndex(s => s.key === wizardStep);
  if (idx < WIZARD_STEPS.length - 1) {
    setCompletedSteps(prev => [...new Set([...prev, wizardStep])]);
    setWizardStep(WIZARD_STEPS[idx + 1].key);
  }
};

const goBack = () => {
  const idx = WIZARD_STEPS.findIndex(s => s.key === wizardStep);
  if (idx > 0) setWizardStep(WIZARD_STEPS[idx - 1].key);
};

const canGoNext = () => {
  switch (wizardStep) {
    case 'brand_niche': return selectedBrand && niche;
    case 'topic_story': return topic.trim().length > 0;
    case 'script': return scriptScenes.length > 0 && scriptScenes.some(s => s.narration?.trim());
    case 'look_feel': return visualStyle;
    case 'motion_sound': return videoStyle && voiceId;
    default: return true;
  }
};
```

- [ ] **Step 6: Add script generation handler**

```js
const handleGenerateScript = async () => {
  setScriptLoading(true);
  try {
    const res = await apiFetch('/api/campaigns/preview-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, topic: topic.trim(), story_context: storyContext, brand_username: selectedBrand }),
    });
    const data = await res.json();
    if (data.scenes) setScriptScenes(data.scenes);
    else if (data.script?.scenes) setScriptScenes(data.script.scenes);
  } catch {
    toast.error('Script generation failed');
  } finally {
    setScriptLoading(false);
  }
};
```

- [ ] **Step 7: Add voice preview handler**

```js
const handleVoicePreview = async (vid) => {
  if (previewingVoice === vid) {
    previewAudioRef.current?.pause();
    setPreviewingVoice(null);
    return;
  }
  setPreviewingVoice(vid);
  try {
    const res = await apiFetch('/api/voice/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_id: vid, text: 'This is a preview of this voice for your short video.' }),
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    if (previewAudioRef.current) previewAudioRef.current.pause();
    const audio = new Audio(URL.createObjectURL(blob));
    previewAudioRef.current = audio;
    audio.onended = () => setPreviewingVoice(null);
    audio.play();
  } catch {
    toast.error('Voice preview failed');
    setPreviewingVoice(null);
  }
};
```

- [ ] **Step 8: Update handleCreate for full payload**

Update the shorts branch in `handleCreate` to send all fields:

```js
if (contentType === 'shorts') {
  if (!selectedBrand || !niche || !topic.trim() || !visualStyle || !videoStyle || !voiceId) {
    toast.error('Please complete all required steps');
    return;
  }
  setCreating(true);
  try {
    const res = await apiFetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_type: 'shorts',
        campaign_name: topic.slice(0, 60),
        brand_username: selectedBrand,
        niche, topic: topic.trim(),
        story_context: storyContext || undefined,
        visual_style: visualStyle,
        video_style: videoStyle,
        video_model: videoModel,
        image_model: imageModel,
        voice_id: voiceId,
        caption_style: captionStyle,
        words_per_chunk: 3,
        lora_config: loraConfig.length > 0 ? loraConfig : undefined,
        starting_image: startingImage || undefined,
        script: scriptScenes.length > 0 ? { scenes: scriptScenes } : undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Short generation started!');
      navigate('/campaigns');
    } else toast.error(data.error || 'Failed');
  } catch { toast.error('Failed to create short'); }
  finally { setCreating(false); }
  return;
}
```

- [ ] **Step 9: Build the wizard JSX**

Replace the existing `{contentType === 'shorts' && (...)}` block with:

```jsx
{contentType === 'shorts' && (
  <div className="space-y-6">
    <WizardStepper
      steps={WIZARD_STEPS}
      currentStep={wizardStep}
      completedSteps={completedSteps}
      onStepClick={(key) => {
        if (completedSteps.includes(key) || key === wizardStep) setWizardStep(key);
      }}
    />

    {/* Step 1: Brand & Niche */}
    {wizardStep === 'brand_niche' && (
      <div className="space-y-6">
        {/* Brand selector with Edit Brand Kit link and YT badge */}
        {/* Niche grid — 12 cards, 4 columns */}
      </div>
    )}

    {/* Step 2: Topic & Story */}
    {wizardStep === 'topic_story' && (
      <div className="space-y-6">
        {/* Topic input + Research Stories button */}
        {/* Researched stories cards */}
        {/* Starting Image — collapsible drop zone */}
      </div>
    )}

    {/* Step 3: Script */}
    {wizardStep === 'script' && (
      <div className="space-y-4">
        {/* Script loading or scene editor */}
        {/* Each scene as editable card */}
        {/* Scene pills at bottom */}
      </div>
    )}

    {/* Step 4: Look & Feel */}
    {wizardStep === 'look_feel' && (
      <div className="space-y-6">
        <StyleGrid value={visualStyle} onChange={setVisualStyle} />
        {/* Image model selector */}
        {/* LoRAPicker — visible only when imageModel has lora: true */}
      </div>
    )}

    {/* Step 5: Motion & Sound */}
    {wizardStep === 'motion_sound' && (
      <div className="space-y-6">
        {/* Video style grid with thumbs + descriptions */}
        {/* Video model cards with pricing */}
        {/* Voice grid with preview buttons */}
        {/* Caption style cards with visual swatches */}
      </div>
    )}

    {/* Step 6: Generate */}
    {wizardStep === 'generate' && (
      <div className="space-y-4">
        {/* Summary grid of all choices */}
        {/* Generate button */}
      </div>
    )}

    {/* Navigation buttons */}
    <div className="flex justify-between pt-4">
      {wizardStep !== 'brand_niche' && (
        <button onClick={goBack} className="px-6 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
          ← Back
        </button>
      )}
      <div className="ml-auto">
        {wizardStep !== 'generate' ? (
          <button
            onClick={goNext}
            disabled={!canGoNext()}
            className="px-6 py-2 bg-[#2C666E] text-white rounded-xl text-sm font-medium hover:bg-[#235258] disabled:opacity-50"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => handleCreate(true)}
            disabled={creating}
            className="px-8 py-3 bg-[#2C666E] text-white rounded-xl text-sm font-semibold hover:bg-[#235258] disabled:opacity-50"
          >
            {creating ? 'Generating...' : 'Generate Short'}
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

The JSX for each step section should be built out fully with the proper components. This is a large step — the implementer should read the existing Shorts mode code to understand what's already there and replace it wholesale.

**Key rendering patterns per step:**

**Step 1 (Brand & Niche):** Brand dropdown + "Edit Brand Kit" link opening BrandKitModal. YouTube badge. 4-col niche grid with emoji icons.

**Step 3 (Script):** Auto-generate on step entry if `scriptScenes` is empty. Scene cards with expandable visual/motion prompts. Scene pills from `scenePills.js` at bottom.

**Step 4 (Look & Feel):** `<StyleGrid value={visualStyle} onChange={setVisualStyle} />` for visual styles. Image model dropdown from `IMAGE_MODELS`. `<LoRAPicker value={loraConfig} onChange={setLoraConfig} brandUsername={selectedBrand} />` shown conditionally.

**Step 5 (Motion & Sound):** Video style cards rendered from `videoStylesList` (fetched from API, includes `thumb` + `description`). Video model cards from `VIDEO_MODELS`. Voice cards from `voicesList`. Caption style cards from `CAPTION_STYLES` with preview swatches.

**Step 6 (Generate):** 2-column summary grid. Scene count. Generate button.

- [ ] **Step 10: Verify build**

```bash
npm run build
```

- [ ] **Step 11: Commit**

```bash
git add src/pages/CampaignsNewPage.jsx
git commit -m "feat: replace flat Shorts form with 6-step wizard"
```

---

### Task 8: Deploy and verify

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to Fly.io**

```bash
fly deploy
```

- [ ] **Step 3: Verify end-to-end**

1. Navigate to `/campaigns/new`, toggle to "Short"
2. Step 1: Select brand (check YouTube badge, Edit Brand Kit link), pick niche
3. Step 2: Enter topic, try Research Stories, try starting image upload
4. Step 3: Verify script generates, edit a scene, try scene pills
5. Step 4: Pick visual style (verify StyleGrid thumbnails), pick image model, add LoRA
6. Step 5: Pick video style (verify thumbnails + descriptions), pick video model (verify pricing), pick voice (try preview), pick caption style (verify swatches)
7. Step 6: Review summary, click Generate
8. Verify redirect to `/campaigns` with progress tracking
9. Navigate back through wizard steps (click completed steps in stepper)

---

## Task Dependency Order

```
Task 1 (shared model constants)    ─┐
Task 2 (caption style presets)     ─┤── can run in parallel
Task 3 (scene pills)              ─┤
Task 4 (voices/library endpoint)   ─┤
Task 5 (video style thumbnails)    ─┘
Task 6 (backend: starting_image)   ── independent
Task 7 (wizard UI)                 ── depends on Tasks 1-5
Task 8 (deploy)                    ── depends on all
```
