# Storyboard Shorts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Shorts creation into the Storyboard/Campaigns system, removing the standalone Shorts Factory.

**Architecture:** Extend `/campaigns/new` with a content type toggle (Ad vs Short). When "Short" is selected, show niche template picker, visual/video style selectors, voice picker, and video model dropdown. The backend `/api/campaigns/create` runs a shorts pipeline (script → voiceover → timestamps → images → video → music → assembly → captions) using Storyboard's frame-chaining for continuity. Remove `/shorts` page and standalone pipeline.

**Tech Stack:** React, Vite, Supabase, ElevenLabs TTS, FAL (Whisper/FLUX/Kling/Veo), FFmpeg via FAL, OpenAI GPT for scripts

**Spec:** `docs/superpowers/specs/2026-03-21-storyboard-shorts-design.md`

---

## File Structure

### New files:
- `api/lib/videoStylePresets.js` — Video style definitions (motion prompts) extracted from JumpStartModal
- `api/lib/visualStyles.js` — Visual style definitions (image prompts) with image_strategy field
- `api/lib/shortsPipeline.js` — Shorts pipeline orchestrator (extracted from shorts/generate.js, adapted for frame-chaining)
- `api/styles/visual.js` — GET endpoint returning visual style list for frontend
- `api/styles/video.js` — GET endpoint returning video style list for frontend
- `api/styles/voices.js` — GET endpoint returning voice presets for frontend
- `api/campaigns/research.js` — Renamed from api/shorts/research.js
- `api/campaigns/preview-script.js` — Renamed from api/shorts/preview-script.js
- `api/campaigns/topics.js` — Renamed from api/shorts/topics.js

### Modified files:
- `api/campaigns/create.js` — Add shorts content_type branch
- `src/pages/CampaignsNewPage.jsx` — Add content type toggle + shorts UI sections
- `server.js` — Update route registrations
- `src/App.jsx` — Remove /shorts route
- `src/pages/VideoAdvertCreator.jsx` — Remove Shorts nav link

### Deleted files:
- `src/pages/ShortsFactoryPage.jsx`
- `api/shorts/generate.js`
- `api/shorts/research.js` (moved to api/campaigns/)
- `api/shorts/preview-script.js` (moved to api/campaigns/)
- `api/shorts/topics.js` (moved to api/campaigns/)

### Migration:
- `supabase/migrations/20260321_scene_inputs_json.sql`

---

### Task 1: Database Migration — scene_inputs_json

**Files:**
- Create: `supabase/migrations/20260321_scene_inputs_json.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add scene_inputs_json to ad_drafts for per-scene regeneration data
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS scene_inputs_json jsonb;
```

- [ ] **Step 2: Apply migration**

Run against Supabase:
```bash
# Apply via Supabase dashboard SQL editor or CLI
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260321_scene_inputs_json.sql
git commit -m "feat: add scene_inputs_json column to ad_drafts"
```

---

### Task 2: Create videoStylePresets.js

**Files:**
- Create: `api/lib/videoStylePresets.js`

- [ ] **Step 1: Create the shared video style presets module**

Extract VIDEO_STYLES from `src/components/modals/JumpStartModal.jsx:325-342` into a backend-accessible module. Each entry needs: key, label, category, prompt.

```js
/**
 * Video Style Presets — controls animation/motion feel.
 * Appended to the motion prompt when generating image-to-video clips.
 */

export const VIDEO_STYLE_PRESETS = {
  // Realistic / UGC
  iphone_selfie: {
    label: 'iPhone Selfie (Raw)',
    category: 'realistic',
    prompt: 'raw iPhone 15 front-facing camera footage, handheld smartphone video with subtle micro-shake, natural ambient room lighting with soft window light on face, visible skin pores and texture, slight lens distortion at edges, authentic unfiltered color profile, relaxed genuine expression, casual everyday clothing with real fabric wrinkles',
  },
  ugc_testimonial: {
    label: 'UGC Testimonial',
    category: 'realistic',
    prompt: 'authentic user-generated testimonial video, real person speaking with natural speech cadence and breath pauses, subtle lip movements matching natural talking rhythm, genuine micro-expressions, real skin with natural imperfections and pores visible, soft ambient indoor lighting from overhead, believable casual setting with slight background depth, conversational eye contact',
  },
  tiktok_style: {
    label: 'TikTok/Reels Style',
    category: 'realistic',
    prompt: 'vertical social media content creator video, direct-to-camera engagement with expressive natural facial movements, quick authentic reactions, real skin texture under ring light or natural window light, slightly warm color temperature, genuine personality showing through micro-expressions, natural hand gestures entering frame, energetic but believable body language',
  },
  facetime_call: {
    label: 'FaceTime/Video Call',
    category: 'realistic',
    prompt: 'video call aesthetic shot from laptop webcam angle, slightly above eye level, natural indoor ambient lighting mixing with screen glow on face, casual at-home appearance, real skin texture with slight webcam softness, authentic conversational micro-expressions, relaxed posture, genuine unperformed body language, slight compression artifacts for realism',
  },

  // Professional
  cinematic: {
    label: 'Cinematic',
    category: 'professional',
    prompt: 'cinematic film quality shot on Arri Alexa, anamorphic framing feel, professional three-point lighting with soft key light creating gentle shadow fall-off, shallow depth of field with creamy bokeh separation, natural skin tones with subtle color grading, film-like motion cadence at 24fps, atmospheric haze catching light, precise composition with leading lines',
  },
  documentary: {
    label: 'Documentary',
    category: 'professional',
    prompt: 'observational documentary style, handheld camera with natural stabilization, available light used authentically, candid unposed moments captured naturally, real environments with lived-in detail, natural skin tones without color grading, genuine emotional moments, ambient sound atmosphere, journalistic truthful aesthetic',
  },
  commercial: {
    label: 'Commercial/Ad',
    category: 'professional',
    prompt: 'high-end commercial production quality, precisely controlled studio lighting with soft diffusion, product and subject both in sharp focus, polished but natural-looking skin, aspirational warm color palette, smooth controlled camera movement, clean composition with visual breathing room, professional wardrobe and styling, premium feel',
  },
  product_demo: {
    label: 'Product Demo',
    category: 'professional',
    prompt: 'clean professional product demonstration, neutral background with soft gradient, even studio lighting revealing surface texture and material quality, smooth deliberate product handling with natural hand movements, clear visual focus on product features, slight reflection on surface below, precise framing with product as hero',
  },

  // Artistic
  dreamy: {
    label: 'Dreamy/Ethereal',
    category: 'artistic',
    prompt: 'ethereal dreamlike quality with soft diffusion filter effect, gentle overexposed highlights wrapping around subject, pastel and desaturated color palette, slow graceful movement, subtle lens glow on light sources, delicate bokeh orbs in background, romantic golden or blue hour natural light, flowing fabric or hair movement suggesting gentle breeze',
  },
  vintage: {
    label: 'Vintage/Retro',
    category: 'artistic',
    prompt: 'authentic vintage 16mm film aesthetic, warm amber color shift with faded blacks lifted to milky grey, organic film grain texture visible on skin and surfaces, slight vignette darkening at frame edges, period-appropriate soft focus quality, gentle gate weave and frame instability, nostalgic halation around bright highlights',
  },
  noir: {
    label: 'Film Noir',
    category: 'artistic',
    prompt: 'classic film noir cinematography, high contrast chiaroscuro lighting with deep blacks and bright specular highlights, dramatic single key light source creating long shadows, venetian blind shadow patterns, smoke or atmospheric haze catching light beams, moody monochromatic or desaturated cool palette, low-key lighting revealing only essential details',
  },
  anime: {
    label: 'Anime Style',
    category: 'artistic',
    prompt: 'high-quality anime art style animation, vibrant saturated color palette, expressive character animation with fluid motion, dynamic speed lines and impact frames, detailed background art with atmospheric perspective, cel-shaded lighting with crisp shadow edges, wind-blown hair and clothing movement, dramatic camera angles',
  },
};

export function getVideoStylePrompt(key) {
  if (!key || !VIDEO_STYLE_PRESETS[key]) return '';
  return VIDEO_STYLE_PRESETS[key].prompt;
}

export function listVideoStyles() {
  return Object.entries(VIDEO_STYLE_PRESETS).map(([key, v]) => ({
    key,
    label: v.label,
    category: v.category,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/videoStylePresets.js
git commit -m "feat: create shared video style presets module"
```

---

### Task 3: Create visualStyles.js

**Files:**
- Create: `api/lib/visualStyles.js`

- [ ] **Step 1: Create visual styles module with image_strategy**

Extract the visual style definitions that currently live only in JumpStartModal's UI. Each style gets an `image_strategy` field.

```js
/**
 * Visual Styles — controls image aesthetic.
 * prompt_suffix appended to image generation prompts.
 * image_strategy determines frame-chaining vs fresh-per-scene.
 */

export const VISUAL_STYLES = {
  // Illustration styles — fresh image per scene
  pixel_art: {
    label: 'Pixel Art',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'pixel art style, retro 16-bit aesthetic, clean pixel edges, vibrant limited color palette, nostalgic video game visual style',
  },
  studio_ghibli: {
    label: 'Studio Ghibli',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'Studio Ghibli anime style, soft watercolor textures, lush detailed backgrounds, gentle warm lighting, whimsical atmospheric perspective, hand-painted feel',
  },
  disney_pixar: {
    label: 'Disney Pixar',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'Disney Pixar 3D animation style, expressive cartoon characters, vibrant saturated colors, polished render quality, warm cinematic lighting, family-friendly aesthetic',
  },
  cartoon: {
    label: 'Cartoon',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'cartoon illustration style, bold clean outlines, flat vivid colors, exaggerated proportions, playful expressive characters',
  },
  '8bit_retro': {
    label: '8-bit Retro',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: '8-bit retro game art style, chunky pixels, limited NES color palette, nostalgic classic video game aesthetic',
  },
  manga: {
    label: 'Manga',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'manga illustration style, black and white ink with screentone shading, dramatic speed lines, expressive manga eyes, dynamic panel composition, Japanese comic art',
  },
  comic_book: {
    label: 'Comic Book',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'comic book illustration, bold black outlines, halftone dot shading, vivid pop art colors, dynamic action composition, speech bubble aesthetic, Ben-Day dots',
  },
  pixar_3d: {
    label: 'Pixar 3D',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: '3D Pixar-style rendering, smooth plastic-like character surfaces, subsurface scattering skin, warm studio lighting, polished CGI quality, appealing character design',
  },

  // Realistic / photographic styles — frame chain
  photorealistic: {
    label: 'Photorealistic',
    category: 'realistic',
    image_strategy: 'frame_chain',
    prompt_suffix: 'photorealistic, high resolution photograph, natural lighting, sharp detail, realistic textures and materials',
  },
  cinematic_photo: {
    label: 'Cinematic Photography',
    category: 'realistic',
    image_strategy: 'frame_chain',
    prompt_suffix: 'cinematic photography, anamorphic lens, dramatic moody lighting, shallow depth of field, teal and orange color grade, film grain, high production value',
  },
  documentary_photo: {
    label: 'Documentary Photography',
    category: 'realistic',
    image_strategy: 'frame_chain',
    prompt_suffix: 'documentary photography, candid real moment, available natural light, slight film grain, desaturated muted tones, journalistic framing, honest unposed composition',
  },

  // Painting styles — fresh per scene
  watercolor: {
    label: 'Watercolor',
    category: 'painting',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'watercolor painting style, soft wet-on-wet washes, translucent layered pigments, visible paper texture, organic bleeding edges, delicate brushwork',
  },
  oil_painting: {
    label: 'Oil Painting',
    category: 'painting',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'oil painting style, rich impasto brushstrokes, visible canvas texture, deep saturated colors, classical fine art composition, painterly quality',
  },
  impressionist: {
    label: 'Impressionist',
    category: 'painting',
    image_strategy: 'fresh_per_scene',
    prompt_suffix: 'impressionist painting style, loose visible brushstrokes, dappled light effects, vibrant broken color, en plein air aesthetic, Monet-inspired atmospheric quality',
  },
};

export function getVisualStyleSuffix(key) {
  if (!key || !VISUAL_STYLES[key]) return '';
  return `, ${VISUAL_STYLES[key].prompt_suffix}`;
}

export function getImageStrategy(key) {
  if (!key || !VISUAL_STYLES[key]) return 'frame_chain';
  return VISUAL_STYLES[key].image_strategy;
}

export function listVisualStyles() {
  return Object.entries(VISUAL_STYLES).map(([key, v]) => ({
    key,
    label: v.label,
    category: v.category,
    image_strategy: v.image_strategy,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/visualStyles.js
git commit -m "feat: create shared visual styles module with image_strategy"
```

---

### Task 3b: Create API endpoints for style lists + voice list

**Files:**
- Create: `api/styles/visual.js`
- Create: `api/styles/video.js`
- Create: `api/styles/voices.js`
- Modify: `server.js`

The frontend (Vite) cannot import backend modules directly. Create lightweight GET endpoints that return the style lists as JSON.

- [ ] **Step 1: Create visual styles endpoint**

```js
// api/styles/visual.js
import { listVisualStyles } from '../lib/visualStyles.js';

export default function handler(req, res) {
  res.json(listVisualStyles());
}
```

- [ ] **Step 2: Create video styles endpoint**

```js
// api/styles/video.js
import { listVideoStyles } from '../lib/videoStylePresets.js';

export default function handler(req, res) {
  res.json(listVideoStyles());
}
```

- [ ] **Step 3: Create voices endpoint**

```js
// api/styles/voices.js
// Return the ElevenLabs voice presets for the shorts voice selector.
// Reuses VOICE_PRESETS from shortsTemplates.js
import { VOICE_PRESETS } from '../lib/shortsTemplates.js';

export default function handler(req, res) {
  res.json(VOICE_PRESETS);
}
```

- [ ] **Step 4: Register routes in server.js**

```js
app.get('/api/styles/visual', authenticateToken, (await import('./api/styles/visual.js')).default);
app.get('/api/styles/video', authenticateToken, (await import('./api/styles/video.js')).default);
app.get('/api/styles/voices', authenticateToken, (await import('./api/styles/voices.js')).default);
```

- [ ] **Step 5: Commit**

```bash
git add api/styles/visual.js api/styles/video.js api/styles/voices.js server.js
git commit -m "feat: add API endpoints for visual/video style lists and voices"
```

---

### Task 4: Create shortsPipeline.js

**Files:**
- Create: `api/lib/shortsPipeline.js`
- Reference: `api/shorts/generate.js` (extract pipeline logic from here)
- Reference: `api/lib/pipelineHelpers.js` (uses generateImage, animateImage, extractLastFrame, analyzeFrameContinuity, generateMusic, assembleVideo)
- Reference: `api/lib/scriptGenerator.js` (generateScript)
- Reference: `api/lib/voiceoverGenerator.js` (generateVoiceover, generateWordTimestamps)
- Reference: `api/lib/captionBurner.js` (burnCaptions)

- [ ] **Step 1: Create the shorts pipeline orchestrator**

This is the core pipeline function. Extract from `api/shorts/generate.js` but replace the image generation logic with style-aware strategy (frame_chain vs fresh_per_scene) and use the user-selected video model.

The function signature:

```js
/**
 * Runs the full shorts pipeline with Storyboard frame-chaining.
 *
 * @param {Object} opts
 * @param {string} opts.niche - Niche template key
 * @param {string} opts.topic - Topic text
 * @param {string} opts.story_context - Optional researched story context
 * @param {string} opts.brand_username
 * @param {string} opts.visual_style - Visual style key (determines image aesthetic + image_strategy)
 * @param {string} opts.video_style - Video style key (determines motion prompt)
 * @param {string} opts.video_model - Video model key (fal_kling, fal_veo3, etc.)
 * @param {string} opts.voice_id - ElevenLabs voice ID
 * @param {string} opts.caption_style - Caption style key
 * @param {number} opts.words_per_chunk - Words per caption group
 * @param {Array}  opts.lora_config - LoRA models array
 * @param {string} opts.script - Optional pre-generated script (skips GPT)
 * @param {Object} opts.supabase - Supabase client
 * @param {Object} opts.keys - API keys object
 * @param {string} opts.jobId - Job ID for progress tracking
 * @returns {Object} { campaign, draft, youtubeUrl }
 */
export async function runShortsPipeline(opts) { ... }
```

The implementation follows the 9-step pipeline from the spec. Key difference from `shorts/generate.js`:

**Step 4 (images):** Check `getImageStrategy(visual_style)`:
- If `'frame_chain'`: Generate image for scene 0 only. For scenes 1+, use `extractLastFrame()` from previous clip (after step 5 runs for that scene). This means steps 4 and 5 interleave per-scene.
- If `'fresh_per_scene'`: Generate a fresh image for each scene. Still use `analyzeFrameContinuity()` for style consistency.

**Step 5 (animation):** Use `opts.video_model` instead of hardcoded model. Append `getVideoStylePrompt(opts.video_style)` to motion prompt.

**Image prompt construction:**
```js
const triggerPrefix = loraConfigs.map(c => c.triggerWord).filter(Boolean).join(', ');
const visualSuffix = getVisualStyleSuffix(opts.visual_style);
const imagePrompt = [triggerPrefix, scene.visual_prompt].filter(Boolean).join(', ') + visualSuffix;
```

**Motion prompt construction:**
```js
const videoStylePrompt = getVideoStylePrompt(opts.video_style);
const motionPrompt = [scene.motion_prompt, videoStylePrompt].filter(Boolean).join(', ');
```

Build `scene_inputs_json` array as scenes are processed, storing per-scene: image_url, clip_url, image_prompt_used, motion_prompt_used, lora_config, visual_style, video_style, video_model.

**Job progress updates:** After each pipeline step completes, update the `jobs` table row:
```js
await supabase.from('jobs').update({
  current_step: 'generating_images',
  completed_steps: ['generating_script', 'generating_voiceover', 'generating_timestamps'],
}).eq('id', opts.jobId);
```
This follows the same pattern as `shorts/generate.js` (lines ~150-170). The frontend polls `/api/jobs/public-status?job_id=X` to show progress.

**Draft creation (Step 9 — Finalize):** At the end of the pipeline, create the `ad_drafts` record:
```js
await supabase.from('ad_drafts').insert({
  campaign_id: opts.campaignId,
  user_id: opts.userId,
  brand_username: opts.brand_username,
  content_type: 'shorts',
  aspect_ratio: '9:16',
  generation_status: 'ready',
  assets_json: { final_video_url: captionedVideoUrl, video_url: assembledVideoUrl },
  voiceover_url: voiceoverUrl,
  word_timestamps_json: wordTimestamps,
  captioned_video_url: captionedVideoUrl,
  scene_inputs_json: sceneInputs,
  shorts_metadata_json: {
    script, scenes: scriptScenes, hashtags: script.hashtags,
    niche: opts.niche, topic: opts.topic,
    visual_style: opts.visual_style, video_style: opts.video_style,
    video_model: opts.video_model, voice_id: opts.voice_id,
    caption_style: opts.caption_style, music_url: musicUrl,
  },
  storyboard_json: { scenes: scriptScenes },
});

// Mark job complete
await supabase.from('jobs').update({ status: 'completed' }).eq('id', opts.jobId);
await supabase.from('campaigns').update({ status: 'ready' }).eq('id', opts.campaignId);
```

**Interleaved per-scene loop (frame_chain mode):**
```js
const imageStrategy = getImageStrategy(opts.visual_style);
const sceneImages = [];
const sceneClips = [];
let prevFrameUrl = null;

for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  let imageUrl;

  if (imageStrategy === 'frame_chain' && i > 0 && prevFrameUrl) {
    // Reuse last frame from previous clip
    imageUrl = prevFrameUrl;
  } else {
    // Generate fresh image (scene 0 always, or all scenes for fresh_per_scene)
    imageUrl = await generateImage(imagePrompt, '9:16', ...);
  }
  sceneImages.push(imageUrl);

  // Animate this scene's image
  const clipUrl = await animateImage(imageUrl, motionPrompt, '9:16', scene.duration, ...);
  sceneClips.push(clipUrl);

  // Extract last frame for next scene
  prevFrameUrl = await extractLastFrame(clipUrl, scene.duration, keys.fal);
}
```

This file should be ~300-400 lines. Use the existing `shorts/generate.js` as the starting template, replacing the image/video generation sections with the new style-aware logic.

- [ ] **Step 2: Verify it imports correctly**

```bash
node -e "import('./api/lib/shortsPipeline.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/shortsPipeline.js
git commit -m "feat: create shorts pipeline with frame-chaining and style-aware generation"
```

---

### Task 5: Extend api/campaigns/create.js

**Files:**
- Modify: `api/campaigns/create.js`

- [ ] **Step 1: Add shorts branch to the handler**

At the top of the handler, after parsing the request body, check `content_type`:

```js
import { runShortsPipeline } from '../lib/shortsPipeline.js';

// Inside handler, after const { ... } = req.body:

if (content_type === 'shorts') {
  // Validate shorts-specific fields
  if (!niche || !brand_username) {
    return res.status(400).json({ error: 'niche and brand_username are required for shorts' });
  }

  // Create campaign with content_type
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .insert({
      user_id: req.user.id,
      name: campaign_name || `${niche} Short`,
      brand_username,
      content_type: 'shorts',
      status: 'generating',
    })
    .select()
    .single();

  if (campError) return res.status(500).json({ error: campError.message });

  // Create job for progress tracking
  const { data: job } = await supabase
    .from('jobs')
    .insert({
      user_id: req.user.id,
      type: 'shorts_pipeline',
      status: 'running',
      campaign_id: campaign.id,
    })
    .select()
    .single();

  // Return immediately, run pipeline in background
  res.json({ success: true, campaign_id: campaign.id, job_id: job.id });

  // Background pipeline
  runShortsPipeline({
    niche, topic, story_context, brand_username,
    visual_style, video_style, video_model,
    voice_id, caption_style, words_per_chunk,
    lora_config, script,
    supabase, keys: { /* resolve API keys */ },
    jobId: job.id,
    campaignId: campaign.id,
    userId: req.user.id,
  }).catch(err => {
    console.error('[campaigns/create] Shorts pipeline error:', err);
    supabase.from('jobs').update({ status: 'failed', error: err.message }).eq('id', job.id);
    supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
  });

  return;
}

// ... existing manual storyboard logic continues below
```

Also update the existing manual branch's campaign insert to pass `content_type`:

```js
// In the existing campaign insert (around line 47-57 of create.js):
// Add this field to the insert object:
content_type: content_type || 'ad',
```

- [ ] **Step 2: Commit**

```bash
git add api/campaigns/create.js
git commit -m "feat: add shorts content_type branch to campaigns/create"
```

---

### Task 6: Rename shorts API endpoints

**Files:**
- Rename: `api/shorts/research.js` → `api/campaigns/research.js`
- Rename: `api/shorts/preview-script.js` → `api/campaigns/preview-script.js`
- Rename: `api/shorts/topics.js` → `api/campaigns/topics.js`
- Modify: `server.js`

- [ ] **Step 1: Move files to new locations and delete old ones**

```bash
git mv api/shorts/research.js api/campaigns/research.js
git mv api/shorts/preview-script.js api/campaigns/preview-script.js
git mv api/shorts/topics.js api/campaigns/topics.js
```

- [ ] **Step 2: Update server.js routes**

In `server.js`, find the shorts route registrations and update them:

```js
// Remove old shorts routes:
// app.post('/api/shorts/generate', authenticateToken, ...)  ← DELETE
// app.post('/api/shorts/topics', authenticateToken, ...)     ← DELETE
// app.post('/api/shorts/research', authenticateToken, ...)   ← DELETE
// app.post('/api/shorts/preview-script', authenticateToken, ...) ← DELETE

// Add new campaign routes:
app.post('/api/campaigns/research', authenticateToken, (await import('./api/campaigns/research.js')).default);
app.post('/api/campaigns/preview-script', authenticateToken, (await import('./api/campaigns/preview-script.js')).default);
app.post('/api/campaigns/topics', authenticateToken, (await import('./api/campaigns/topics.js')).default);
```

- [ ] **Step 3: Commit**

```bash
git add api/campaigns/research.js api/campaigns/preview-script.js api/campaigns/topics.js server.js
git commit -m "refactor: move shorts API endpoints under campaigns namespace"
```

---

### Task 7: Update CampaignsNewPage.jsx — Content Type Toggle + Shorts UI

**Files:**
- Modify: `src/pages/CampaignsNewPage.jsx`

This is the largest UI task. The page needs:

- [ ] **Step 1: Add content type toggle state and imports**

Add to state:
```js
const [contentType, setContentType] = useState('ad'); // 'ad' | 'shorts'

// Shorts-specific state
const [niche, setNiche] = useState('');
const [topic, setTopic] = useState('');
const [storyContext, setStoryContext] = useState('');
const [visualStyle, setVisualStyle] = useState('');
const [videoStyle, setVideoStyle] = useState('');
const [videoModel, setVideoModel] = useState('fal_kling');
const [voiceId, setVoiceId] = useState('');
const [captionStyle, setCaptionStyle] = useState('word_pop');
const [wordsPerChunk, setWordsPerChunk] = useState(3);
const [loraConfig, setLoraConfig] = useState([]);
const [researchedStories, setResearchedStories] = useState([]);
const [researchLoading, setResearchLoading] = useState(false);
```

Import niche data:
```js
// Import niche list from shortsTemplates (or inline the 12 niches as a constant)
const NICHES = [
  { key: 'ai_tech_news', label: 'AI/Tech News', icon: '🤖', scenes: 8 },
  { key: 'finance_money', label: 'Finance & Crypto', icon: '💰', scenes: 7 },
  { key: 'motivation_self_help', label: 'Motivation', icon: '🧠', scenes: 7 },
  { key: 'scary_horror', label: 'Horror & Creepy', icon: '💀', scenes: 8 },
  { key: 'history_did_you_know', label: 'History & Mysteries', icon: '📜', scenes: 7 },
  { key: 'true_crime', label: 'True Crime', icon: '🔍', scenes: 8 },
  { key: 'science_nature', label: 'Science & Nature', icon: '🔬', scenes: 7 },
  { key: 'relationships_dating', label: 'Relationships', icon: '❤️', scenes: 7 },
  { key: 'health_fitness', label: 'Health & Fitness', icon: '💪', scenes: 7 },
  { key: 'gaming_popculture', label: 'Gaming & Pop Culture', icon: '🎮', scenes: 7 },
  { key: 'conspiracy_mystery', label: 'Conspiracy', icon: '👁️', scenes: 7 },
  { key: 'business_entrepreneur', label: 'Business & Startups', icon: '💼', scenes: 7 },
];

const VIDEO_MODELS = [
  { key: 'fal_kling', label: 'Kling V3' },
  { key: 'fal_veo3', label: 'Veo 3' },
  { key: 'wavespeed_wan', label: 'Wan 2.5' },
  { key: 'fal_hailuo', label: 'Hailuo' },
  { key: 'fal_pixverse', label: 'PixVerse' },
];

const CAPTION_STYLES = [
  { key: 'word_pop', label: 'Word Pop' },
  { key: 'karaoke_glow', label: 'Karaoke Glow' },
  { key: 'word_highlight', label: 'Word Highlight' },
  { key: 'neon_glow', label: 'Neon Glow' },
  { key: 'typewriter', label: 'Typewriter' },
  { key: 'bounce', label: 'Bounce' },
];
```

- [ ] **Step 2: Add content type toggle UI**

At the top of the form, before any other fields:

```jsx
{/* Content Type Toggle */}
<div className="flex gap-2 mb-6">
  <button
    onClick={() => setContentType('ad')}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      contentType === 'ad'
        ? 'bg-[#2C666E] text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    Ad
  </button>
  <button
    onClick={() => setContentType('shorts')}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      contentType === 'shorts'
        ? 'bg-[#2C666E] text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    Short
  </button>
</div>
```

- [ ] **Step 3: Add Shorts-specific form sections**

Wrap existing Ad form in `{contentType === 'ad' && (...)}`. Add shorts sections in `{contentType === 'shorts' && (...)}`:

Sections needed (in order):
1. **Niche Template grid** — 12 cards from NICHES constant, selectable
2. **Topic input** + Research Stories button (calls `/api/campaigns/research`)
3. **Visual Style grid** — fetch from `/api/styles/visual` on mount, render as cards with labels
4. **Video Style grid** — fetch from `/api/styles/video` on mount, render as cards grouped by category
5. **Video Model dropdown** — simple select from VIDEO_MODELS constant
6. **Voice selector** — fetch from `/api/styles/voices` on mount. Render as cards showing voice name and assigned niches. Each card has a play/stop button that calls `/api/voice/preview` with `voice_id` and a short sample text, then plays the returned audio blob. Use an `<audio>` ref like ShortsFactoryPage does (see `handleVoicePreview` and `previewAudioRef` pattern).
7. **Caption Style selector** — simple card grid from CAPTION_STYLES constant
8. **LoRA picker** — reuse existing LoRAPicker component (already imported in some pages)

**Important:** Visual styles, video styles, and voices are fetched from API endpoints (Task 3b), NOT imported from backend modules. Store in state via useEffect on mount:
```js
const [visualStyles, setVisualStyles] = useState([]);
const [videoStyles, setVideoStyles] = useState([]);
const [voices, setVoices] = useState([]);

useEffect(() => {
  if (contentType !== 'shorts') return;
  apiFetch('/api/styles/visual').then(r => r.json()).then(setVisualStyles);
  apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStyles);
  apiFetch('/api/styles/voices').then(r => r.json()).then(setVoices);
}, [contentType]);
```

Each section should be a collapsible card or a clear labeled section.

- [ ] **Step 4: Update the create handler to send shorts data**

The existing `handleCreate` function sends data to `/api/campaigns/create`. When `contentType === 'shorts'`, send the shorts-specific payload:

```js
const handleCreate = async (autoGenerate = false) => {
  if (contentType === 'shorts') {
    if (!niche) { toast.error('Please select a niche'); return; }
    if (!topic.trim()) { toast.error('Please enter a topic'); return; }
    if (!visualStyle) { toast.error('Please select a visual style'); return; }
    if (!videoStyle) { toast.error('Please select a video style'); return; }

    const res = await apiFetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_type: 'shorts',
        campaign_name: topic.slice(0, 60),
        brand_username: selectedBrand,
        niche,
        topic: topic.trim(),
        story_context: storyContext || undefined,
        visual_style: visualStyle,
        video_style: videoStyle,
        video_model: videoModel,
        voice_id: voiceId || undefined,
        caption_style: captionStyle,
        words_per_chunk: wordsPerChunk,
        lora_config: loraConfig.length > 0 ? loraConfig : undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Short generation started!');
      navigate('/campaigns');
    } else {
      toast.error(data.error || 'Failed to create short');
    }
    return;
  }

  // ... existing ad creation logic
};
```

- [ ] **Step 5: Add Research Stories handler**

```js
const handleResearch = async () => {
  if (!niche || !topic.trim()) {
    toast.error('Select a niche and enter a topic first');
    return;
  }
  setResearchLoading(true);
  try {
    const res = await apiFetch('/api/campaigns/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, topic: topic.trim(), brand_username: selectedBrand }),
    });
    const data = await res.json();
    if (data.stories) {
      setResearchedStories(data.stories);
    }
  } catch {
    toast.error('Research failed');
  } finally {
    setResearchLoading(false);
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/CampaignsNewPage.jsx
git commit -m "feat: add Shorts content type to CampaignsNewPage with full UI"
```

---

### Task 8: Remove Shorts Factory

**Files:**
- Delete: `src/pages/ShortsFactoryPage.jsx`
- Delete: `api/shorts/generate.js`
- Modify: `src/App.jsx` — remove `/shorts` route
- Modify: `src/pages/VideoAdvertCreator.jsx` — remove Shorts nav link
- Modify: `server.js` — remove old shorts/generate route

- [ ] **Step 1: Remove /shorts route from App.jsx**

In `src/App.jsx`, remove:
```jsx
import ShortsFactoryPage from './pages/ShortsFactoryPage';
```
and the route:
```jsx
<Route path="/shorts" element={<ProtectedRoute><ShortsFactoryPage /></ProtectedRoute>} />
```

- [ ] **Step 2: Remove Shorts nav link from VideoAdvertCreator.jsx**

Find and remove the `/shorts` link (around line 424).

- [ ] **Step 3: Remove old shorts/generate route from server.js**

Remove the line registering `POST /api/shorts/generate`.

- [ ] **Step 4: Delete files**

```bash
rm src/pages/ShortsFactoryPage.jsx
rm api/shorts/generate.js
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: Build succeeds with no import errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove standalone Shorts Factory, unified into Campaigns"
```

---

### Task 9: Deploy and Verify

**Files:** None (deployment)

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to Fly.io**

```bash
fly deploy
```

- [ ] **Step 3: Apply migration**

Apply `20260321_scene_inputs_json.sql` via Supabase dashboard or CLI.

- [ ] **Step 4: Verify end-to-end**

1. Navigate to `/campaigns/new`
2. Toggle to "Short"
3. Select a niche, enter topic, pick visual style, video style, voice
4. Click "Create & Generate"
5. Verify redirect to `/campaigns` with progress indicator
6. Wait for pipeline to complete
7. Verify draft has video, captions, voiceover
8. Test YouTube publish button on completed draft
9. Verify `/shorts` route no longer works (redirects to `/`)

---

## Task Dependency Order

```
Task 1 (migration)
Task 2 (videoStylePresets.js)      ─┐
Task 3 (visualStyles.js)           ─┤── can run in parallel
Task 6 (rename endpoints)          ─┘
Task 3b (style/voice API endpoints) ── depends on Tasks 2, 3
Task 4 (shortsPipeline.js)         ── depends on Tasks 2, 3
Task 5 (create.js)                 ── depends on Task 4
Task 7 (CampaignsNewPage.jsx)      ── depends on Tasks 3b, 6
Task 8 (remove Shorts Factory)     ── depends on Tasks 5, 7
Task 9 (deploy)                    ── depends on all
```
