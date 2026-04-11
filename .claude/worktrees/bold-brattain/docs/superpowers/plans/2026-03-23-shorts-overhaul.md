# Shorts Feature Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Use superpowers:dispatching-parallel-agents for tasks marked `[PARALLEL]`. Use superpowers:verify-changes after each task group. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Shorts pipeline with a config-driven model registry, proper error handling, checkpointing, and a cohesive 10-step frontend wizard.

**Architecture:** Replace 500+ lines of copy-paste model blocks with a declarative model registry + generic dispatcher. Rewrite the pipeline orchestrator with per-scene checkpointing and structured error handling. Replace the disjointed 6-step frontend wizard with a focused 10-step flow with real-time progress.

**Tech Stack:** Node/Express backend, React 18 + Tailwind + Radix UI frontend, Supabase (Postgres + Storage), FAL.ai + Wavespeed + ElevenLabs + OpenAI APIs.

**Spec:** `docs/superpowers/specs/2026-03-23-shorts-overhaul-design.md`

---

## Dependency Graph

```
Task 1: Model Registry ──────────┐
Task 2: Media Generator ─────────┤ (depends on Task 1)
Task 3: API Model Verification ──┤ [PARALLEL with Task 1+2, HARD GATE before Task 4]
Task 4: Pipeline Rewrite ────────┤ (depends on Task 2 + Task 3 corrections applied)
Task 5: Script Quality ──────────┤ [PARALLEL — independent]
Task 6: Entry Point Fix ─────────┤ (depends on Task 4)
Task 7: Visual Style Thumbnails ─┤ [PARALLEL — independent]
Task 8: Frontend Wizard Shell ────┤ [PARALLEL — independent until Task 10]
Task 9: Wizard Step Components ───┤ (depends on Task 8)
Task 10: Progress UI + Draft Page ┤ (depends on Task 4 + Task 9)
Task 11: Integration Verification ┘ (depends on all)
```

**Parallel groups:**
- **Group A** `[PARALLEL]`: Tasks 1+2 (model registry + dispatcher) — backend infra
- **Group B** `[PARALLEL]`: Task 3 (API verification) — runs alongside Group A, corrections applied to registry before Task 4 starts
- **Group C** `[PARALLEL]`: Tasks 5, 7, 8 — independent work (script, thumbnails, wizard shell)
- **Sequential**: Tasks 4, 6, 9, 10, 11 depend on prior work

**Hard gate:** Task 3 Step 4 (apply corrections) must complete before Task 4 begins. Task 3 runs in parallel with Tasks 1+2 for research, but its corrections are applied to `modelRegistry.js` before the pipeline starts using it.

---

## Task 1: Model Registry (`api/lib/modelRegistry.js`)

**Files:**
- Create: `api/lib/modelRegistry.js`

**Why:** Single source of truth for every image and video model's endpoint, params, response shape, and polling config. Eliminates the root cause of most pipeline bugs.

- [ ] **Step 1: Create image model registry**

Create `api/lib/modelRegistry.js` with all 7 image model entries. Each entry has: `provider`, `endpoint`, `label`, `supportsLora`, `sizeMap`, `buildBody()`, `parseResult()`, `pollConfig`.

Reference the current implementations in `api/lib/pipelineHelpers.js`:
- `fal_flux` (line 265-284) — endpoint: `fal-ai/flux-2/lora`, supports LoRA
- `fal_seedream` (line 286-300) — endpoint: `fal-ai/bytedance/seedream/v4.5/text-to-image`
- `fal_imagen4` (line 304-317) — endpoint: `fal-ai/imagen4/preview/fast`
- `fal_kling_img` (line 320-333) — endpoint: `fal-ai/kling-image/v3/text-to-image`, uses negative_prompt
- `fal_grok` (line 336-349) — endpoint: `xai/grok-imagine-image`
- `fal_ideogram` (line 352-365) — endpoint: `fal-ai/ideogram/v2`, uses negative_prompt
- `wavespeed` (line 369-387) — provider: `wavespeed`, endpoint: `google/nano-banana-pro/text-to-image`, different param shape (`aspect_ratio` not `image_size`)

```js
/**
 * Model Registry — declarative configs for all image and video generation models.
 * Each entry fully describes how to call and parse one model.
 */

const DEFAULT_NEGATIVE_PROMPT = 'blurry, distorted, low quality, watermark, text artifacts, extra limbs, deformed, duplicate, cropped';

// FAL video APIs accept '4s', '6s', or '8s'
function falDuration(seconds) {
  const n = Number(seconds) || 5;
  if (n <= 5) return '4s';
  if (n <= 7) return '6s';
  return '8s';
}

export const IMAGE_MODELS = {
  fal_flux: {
    provider: 'fal',
    label: 'FLUX 2 (LoRA)',
    endpoint: 'fal-ai/flux-2/lora',
    supportsLora: true,
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9', '2:3': 'portrait_4_3' },
    buildBody: (prompt, size, opts) => ({
      prompt,
      image_size: size,
      num_inference_steps: 28,
      ...(opts.loras?.length && { loras: opts.loras }),
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_seedream: {
    provider: 'fal',
    label: 'SeedDream v4.5',
    endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1, enable_safety_checker: true,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_imagen4: {
    provider: 'fal',
    label: 'Imagen 4',
    endpoint: 'fal-ai/imagen4/preview/fast',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_kling_img: {
    provider: 'fal',
    label: 'Kling Image v3',
    endpoint: 'fal-ai/kling-image/v3/text-to-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1, negative_prompt: DEFAULT_NEGATIVE_PROMPT,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_grok: {
    provider: 'fal',
    label: 'Grok Imagine',
    endpoint: 'xai/grok-imagine-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_ideogram: {
    provider: 'fal',
    label: 'Ideogram v2',
    endpoint: 'fal-ai/ideogram/v2',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1, negative_prompt: DEFAULT_NEGATIVE_PROMPT,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  wavespeed: {
    provider: 'wavespeed',
    label: 'Wavespeed',
    endpoint: 'google/nano-banana-pro/text-to-image',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16', num_images: 1,
    }),
    parseResult: (output) => output?.outputs?.[0] || output?.data?.outputs?.[0],
    parseRequestId: (data) => data.id || data.data?.id,
    pollConfig: { maxRetries: 60, delayMs: 3000 },
  },
};

export const VIDEO_MODELS = {
  fal_kling: {
    provider: 'fal',
    label: 'Kling 2.0 Master',
    endpoint: 'fal-ai/kling-video/v2/master/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_kling_v3: {
    provider: 'fal',
    label: 'Kling V3 Pro',
    endpoint: 'fal-ai/kling-video/v3/pro/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_kling_o3: {
    provider: 'fal',
    label: 'Kling O3 Pro',
    endpoint: 'fal-ai/kling-video/o3/pro/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_veo2: {
    provider: 'fal',
    label: 'Veo 2 (Google)',
    endpoint: 'fal-ai/veo2/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  fal_veo3: {
    provider: 'fal',
    label: 'Veo 3 (Google)',
    endpoint: 'fal-ai/veo3/fast',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  fal_wan25: {
    provider: 'fal',
    label: 'Wan 2.5 Preview',
    endpoint: 'fal-ai/wan-25-preview/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_wan_pro: {
    provider: 'fal',
    label: 'Wan Pro',
    endpoint: 'fal-ai/wan-pro/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_pixverse: {
    provider: 'fal',
    label: 'PixVerse v4.5',
    endpoint: 'fal-ai/pixverse/v4.5/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_hailuo: {
    provider: 'fal',
    label: 'Hailuo (MiniMax)',
    endpoint: 'fal-ai/minimax/video-01/image-to-video',
    durationFormat: 'none',
    buildBody: (imageUrl, prompt) => ({
      image_url: imageUrl, prompt,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  wavespeed_wan: {
    provider: 'wavespeed',
    label: 'Wavespeed WAN',
    endpoint: 'wavespeed-ai/wan-2.2-spicy/image-to-video',
    durationFormat: 'numeric',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts) => ({
      image: imageUrl,
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      resolution: '720p',
      seed: -1,
      ...(opts?.loras?.length && {
        loras: opts.loras.map(c => ({ url: c.loraUrl, scale: Math.min(c.scale ?? 0.7, 0.8) })),
      }),
    }),
    parseResult: (output) => output?.outputs?.[0] || output?.data?.outputs?.[0],
    parseRequestId: (data) => data.id || data.data?.id,
    pollConfig: { maxRetries: 90, delayMs: 4000 },
  },
};
```

**NOTE:** The `sizeMap` values are copied from current code. Task 3 (API Verification) will correct any wrong values.

- [ ] **Step 2: Commit**

```bash
git add api/lib/modelRegistry.js
git commit -m "feat: add declarative model registry for all image and video models"
```

---

## Task 2: Media Generator (`api/lib/mediaGenerator.js`)

**Files:**
- Create: `api/lib/mediaGenerator.js`
- Modify: `api/lib/pipelineHelpers.js` — add thin wrapper exports for backward compat

**Why:** Generic dispatcher that replaces 500+ lines of copy-paste if-blocks with ~80 lines.

- [ ] **Step 1: Create media generator with provider abstraction**

Create `api/lib/mediaGenerator.js` with:
- `MediaGenerationError` class
- `PROVIDER_CONFIG` for FAL vs Wavespeed (different base URLs, auth headers, polling functions)
- `generateImageV2(modelKey, prompt, aspectRatio, keys, supabase, opts)` — generic image dispatcher
- `animateImageV2(modelKey, imageUrl, motionPrompt, aspectRatio, durationSeconds, keys, supabase, opts)` — generic video dispatcher

Import polling functions from `pipelineHelpers.js` (keep `pollFalQueue`, `pollWavespeedRequest`, `uploadUrlToSupabase` there since they're used elsewhere).

**IMPORTANT:** `pollWavespeedRequest` is currently NOT exported from `pipelineHelpers.js` (line 28 — missing `export` keyword). Add `export` to its declaration:

```js
// In pipelineHelpers.js, change line 28 from:
async function pollWavespeedRequest(requestId, apiKey, maxRetries = 60, delayMs = 3000) {
// To:
export async function pollWavespeedRequest(requestId, apiKey, maxRetries = 60, delayMs = 3000) {
```

```js
import { IMAGE_MODELS, VIDEO_MODELS } from './modelRegistry.js';
import { pollFalQueue, pollWavespeedRequest, uploadUrlToSupabase } from './pipelineHelpers.js';

export class MediaGenerationError extends Error {
  constructor(model, type, detail) {
    super(`${type} generation failed [${model}]: ${detail}`);
    this.model = model;
    this.type = type;
    this.detail = detail;
  }
}

const PROVIDER_CONFIG = {
  fal: {
    baseUrl: 'https://queue.fal.run',
    buildHeaders: (keys) => ({
      'Authorization': `Key ${keys.falKey}`,
      'Content-Type': 'application/json',
    }),
    async poll(queueData, model, keys, pollConfig) {
      const pollTarget = queueData.response_url || queueData.request_id;
      return pollFalQueue(pollTarget, model.endpoint, keys.falKey, pollConfig.maxRetries, pollConfig.delayMs);
    },
  },
  wavespeed: {
    baseUrl: 'https://api.wavespeed.ai/api/v3',
    buildHeaders: (keys) => ({
      'Authorization': `Bearer ${keys.wavespeedKey}`,
      'Content-Type': 'application/json',
    }),
    async poll(queueData, model, keys, pollConfig) {
      const requestId = model.parseRequestId?.(queueData) || queueData.id || queueData.data?.id;
      if (!requestId) throw new Error('No request ID from Wavespeed');
      return pollWavespeedRequest(requestId, keys.wavespeedKey, pollConfig.maxRetries, pollConfig.delayMs);
    },
  },
};

export async function generateImageV2(modelKey, prompt, aspectRatio, keys, supabase, opts = {}) {
  const model = IMAGE_MODELS[modelKey];
  if (!model) throw new MediaGenerationError(modelKey, 'image', `Unknown model: ${modelKey}`);

  const provider = PROVIDER_CONFIG[model.provider];
  if (!provider) throw new MediaGenerationError(modelKey, 'image', `Unknown provider: ${model.provider}`);

  const size = model.sizeMap?.[aspectRatio] || aspectRatio;
  const body = model.buildBody(prompt, size, { ...opts, originalAspectRatio: aspectRatio });

  const res = await fetch(`${provider.baseUrl}/${model.endpoint}`, {
    method: 'POST',
    headers: provider.buildHeaders(keys),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new MediaGenerationError(modelKey, 'image', errText);
  }

  const queueData = await res.json();

  // Some models return results directly (no polling needed)
  const directResult = model.parseResult(queueData);
  if (directResult) return uploadUrlToSupabase(directResult, supabase, 'pipeline/images');

  // Poll for result
  const output = await provider.poll(queueData, model, keys, model.pollConfig);
  const url = model.parseResult(output);
  if (!url) throw new MediaGenerationError(modelKey, 'image', 'No URL in response');
  return uploadUrlToSupabase(url, supabase, 'pipeline/images');
}

export async function animateImageV2(modelKey, imageUrl, motionPrompt, aspectRatio, durationSeconds, keys, supabase, opts = {}) {
  const model = VIDEO_MODELS[modelKey];
  if (!model) throw new MediaGenerationError(modelKey, 'video', `Unknown model: ${modelKey}`);

  const provider = PROVIDER_CONFIG[model.provider];
  if (!provider) throw new MediaGenerationError(modelKey, 'video', `Unknown provider: ${model.provider}`);

  const body = model.buildBody(imageUrl, motionPrompt, durationSeconds, aspectRatio, opts);

  const res = await fetch(`${provider.baseUrl}/${model.endpoint}`, {
    method: 'POST',
    headers: provider.buildHeaders(keys),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new MediaGenerationError(modelKey, 'video', errText);
  }

  const queueData = await res.json();

  const directResult = model.parseResult(queueData);
  if (directResult) return uploadUrlToSupabase(directResult, supabase, 'pipeline/videos');

  const output = await provider.poll(queueData, model, keys, model.pollConfig);
  const url = model.parseResult(output);
  if (!url) throw new MediaGenerationError(modelKey, 'video', 'No URL in response');
  return uploadUrlToSupabase(url, supabase, 'pipeline/videos');
}
```

- [ ] **Step 2: Add backward-compat wrappers to pipelineHelpers.js**

At the bottom of `api/lib/pipelineHelpers.js`, the existing `generateImage()` and `animateImage()` exports must continue working for the manual campaign path in `campaigns/create.js`. Add thin wrappers that delegate to the new functions with model auto-selection logic (matching current behavior: wavespeed first if available, fal_seedream fallback for images; wavespeed_wan first, fal_kling fallback for video):

```js
// At end of pipelineHelpers.js — backward compat wrappers
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';

// The existing generateImage and animateImage exports stay but their
// giant if-else chains are replaced with:
// 1. Resolve model key from the `model` param + available keys
// 2. Delegate to generateImageV2/animateImageV2
```

Do NOT delete the existing exports — replace their internals. Here is the explicit wrapper code:

```js
// Replace the body of the existing generateImage() export (lines 246-431):
export async function generateImage(prompt, aspectRatio, keys, supabase, model, loraConfig = null) {
  const loraConfigs = !loraConfig ? [] : Array.isArray(loraConfig) ? loraConfig : [loraConfig];
  const hasLoras = loraConfigs.length > 0;
  const lorasPayload = loraConfigs.filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 }));

  // Prepend trigger words
  const triggerPrefix = loraConfigs.map(c => c.triggerWord).filter(Boolean).join(', ');
  const finalPrompt = triggerPrefix ? `${triggerPrefix}, ${prompt}` : prompt;

  // Resolve model key (matches original routing logic)
  let modelKey = model;
  if (!modelKey) {
    if (hasLoras) {
      modelKey = 'fal_flux';
    } else if (keys.wavespeedKey) {
      modelKey = 'wavespeed';
    } else {
      modelKey = 'fal_seedream';
    }
  }

  return generateImageV2(modelKey, finalPrompt, aspectRatio, keys, supabase, {
    loras: lorasPayload,
    originalAspectRatio: aspectRatio,
  });
}

// Replace the body of the existing animateImage() export (lines 447-633):
export async function animateImage(imageUrl, motionPrompt, aspectRatio, durationSeconds = 5, keys, supabase, model, loraConfigs = []) {
  let modelKey = model;
  if (!modelKey) {
    modelKey = keys.wavespeedKey ? 'wavespeed_wan' : 'fal_kling';
  }

  const lorasPayload = (loraConfigs || []).filter(c => c.loraUrl).map(c => ({
    loraUrl: c.loraUrl,
    scale: Math.min(c.scale ?? 0.7, 0.8),
  }));

  return animateImageV2(modelKey, imageUrl, motionPrompt, aspectRatio, durationSeconds, keys, supabase, {
    loras: lorasPayload,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/mediaGenerator.js api/lib/pipelineHelpers.js
git commit -m "feat: add generic media dispatcher, wire backward-compat wrappers"
```

---

## Task 3: API Model Verification `[PARALLEL]`

**Files:**
- Modify: `api/lib/modelRegistry.js` (corrections from verification)

**Why:** Every model endpoint, param name, and response shape must be verified against current FAL/Wavespeed docs before we trust the registry.

**Execution:** Use `superpowers:dispatching-parallel-agents` to dispatch subagents that check FAL docs for each model in parallel.

- [ ] **Step 1: Verify all FAL image model endpoints**

For each FAL image model (`fal_flux`, `fal_seedream`, `fal_imagen4`, `fal_kling_img`, `fal_grok`, `fal_ideogram`):
- Check the FAL.ai documentation for the model endpoint
- Verify the `image_size` parameter values (is `portrait_16_9` correct for 9:16?)
- Verify the response shape matches `parseResult`
- Record in a verification table

Use web search / FAL docs to verify. Check: `https://fal.ai/models/{endpoint}`

- [ ] **Step 2: Verify all FAL video model endpoints**

For each FAL video model (`fal_kling`, `fal_kling_v3`, `fal_kling_o3`, `fal_veo2`, `fal_veo3`, `fal_wan25`, `fal_wan_pro`, `fal_pixverse`, `fal_hailuo`):
- Check the FAL.ai documentation for the model endpoint
- Verify duration format (does `'4s'` work or does it need a number?)
- Verify `aspect_ratio` param name and accepted values
- Verify response shape (`output.video.url` vs other)

- [ ] **Step 3: Verify Wavespeed endpoints**

Check Wavespeed API docs for:
- `google/nano-banana-pro/text-to-image` — still valid endpoint?
- `wavespeed-ai/wan-2.2-spicy/image-to-video` — still valid?
- Correct param names and response shape

- [ ] **Step 4: Apply corrections to modelRegistry.js**

Update any incorrect values found in Steps 1-3. Especially fix `sizeMap` if `portrait_16_9` is wrong.

- [ ] **Step 5: Commit**

```bash
git add api/lib/modelRegistry.js
git commit -m "fix: correct model registry values from API verification"
```

---

## Task 4: Pipeline Rewrite (`api/lib/shortsPipeline.js`)

**Files:**
- Modify: `api/lib/shortsPipeline.js` — full rewrite with checkpointing + error handling

**Depends on:** Task 2 (mediaGenerator.js)

**Why:** Add per-scene checkpointing, structured error handling, and use the new media generator.

- [ ] **Step 1: Add pipeline-level try/catch with structured error context**

Wrap the entire `runShortsPipeline()` body in try/catch. Track `currentStep`, `currentSceneIndex`, `currentModel` as mutable variables. On catch, `await` the Supabase update to mark job as failed with full error context in `last_error` JSON.

Reference spec Section 2 for exact error shape.

- [ ] **Step 2: Replace direct API calls with mediaGenerator imports**

Replace the `generateImage()` and `animateImage()` calls in the scene loop (lines 224-255) with `generateImageV2()` and `animateImageV2()` from `mediaGenerator.js`. Pass the model key explicitly.

Update imports at top of file:
```js
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
```

Keep imports of `generateMusic`, `extractLastFrame`, `analyzeFrameContinuity`, `assembleShort` from `pipelineHelpers.js` (those aren't being replaced yet).

- [ ] **Step 3: Add per-scene checkpoint writes**

Inside the scene `for` loop, after `sceneInputs.push(...)` and before the next iteration, add:

```js
await updateJob({
  step_results: Object.fromEntries(
    sceneInputs.map((s, idx) => [`scene_${idx}`, {
      image_url: s.image_url,
      clip_url: s.clip_url,
      completed_at: new Date().toISOString(),
    }])
  ),
});
```

- [ ] **Step 4: Add absolute timeout to polling**

In `api/lib/pipelineHelpers.js`, modify `pollFalQueue()` to accept an optional `AbortSignal` and add a 5-minute hard timeout:

```js
export async function pollFalQueue(requestIdOrUrl, model, falKey, maxRetries = 120, delayMs = 2000) {
  const deadline = Date.now() + 300_000; // 5 minute absolute timeout
  // ... existing loop, but add:
  if (Date.now() > deadline) throw new Error(`FAL poll timeout after 5 minutes [${model}]`);
}
```

Same for `pollWavespeedRequest()`.

- [ ] **Step 5: Commit**

```bash
git add api/lib/shortsPipeline.js api/lib/pipelineHelpers.js
git commit -m "feat: rewrite shorts pipeline with checkpointing, structured errors, media generator"
```

---

## Task 5: Script Quality Improvements `[PARALLEL]`

**Files:**
- Modify: `api/lib/scriptGenerator.js`
- Modify: `api/lib/shortsTemplates.js`

**Why:** Current scripts are cliché, use emdashes, and don't provide Scene 1 image description.

- [ ] **Step 1: Update script system prompt**

In `api/lib/scriptGenerator.js`, modify the system prompt (around line 55) to add:

```
- NEVER use emdashes (—) or en-dashes (–). Use periods or commas instead.
- NEVER use cliché phrases: "buckle up", "let's dive in", "here's the thing", "what if I told you", "game-changer", "mind-blowing", "insane"
- Write like a sharp, knowledgeable creator talking to a friend. Be specific, not generic.
- Every sentence must deliver new information or provoke a reaction.
```

- [ ] **Step 2: Add scene_1_image_description to Zod schema**

In `ShortsScriptSchema`, add:

```js
scene_1_image_description: z.string().describe('Detailed visual description for generating the Scene 1 image. Describe the specific subject, setting, lighting, color palette, mood, and composition. This will be used as an AI image generation prompt.'),
```

- [ ] **Step 3: Add video length preset support**

Add a `targetDurationSeconds` param to `generateScript()`. When provided, adjust the scene structure instruction to match:

```js
const sceneCounts = { 30: 3, 45: 4, 60: 5, 90: 7 };
const sceneCount = sceneCounts[targetDurationSeconds] || nicheTemplate.scenes.length;
// Use only the first N scenes from the template, or generate N scenes
```

**Also modify these files to plumb the value through:**

1. `api/campaigns/preview-script.js` — accept `videoLengthPreset` from request body, pass as `targetDurationSeconds` to `generateScript()`
2. `api/campaigns/create.js` — accept `video_length_preset` from request body, pass to `runShortsPipeline()`
3. `api/lib/shortsPipeline.js` — accept `videoLengthPreset` in opts, pass to `generateScript()` and use for music duration (`totalDuration = videoLengthPreset || nicheTemplate.total_duration_seconds`)

- [ ] **Step 4: Commit**

```bash
git add api/lib/scriptGenerator.js api/lib/shortsTemplates.js
git commit -m "feat: improve script quality — no emdashes, add scene 1 image desc, length presets"
```

---

## Task 6: Entry Point Fix (`api/campaigns/create.js`)

**Files:**
- Modify: `api/campaigns/create.js`

**Depends on:** Task 4

**Why:** Fix the un-awaited `.catch()` and ensure pipeline owns failure marking.

- [ ] **Step 1: Fix the outer .catch() handler**

Replace lines 125-129:

```js
// OLD (race condition):
runShortsPipeline({ ... }).catch(err => {
  console.error('[campaigns/create] Shorts pipeline error:', err);
  supabase.from('jobs').update({ status: 'failed', error: err.message }).eq('id', job.id);
  supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
});

// NEW (pipeline handles its own cleanup):
runShortsPipeline({ ... }).catch(err => {
  console.error('[campaigns/create] Shorts pipeline error (already marked failed in pipeline):', err);
});
```

- [ ] **Step 2: Commit**

```bash
git add api/campaigns/create.js
git commit -m "fix: remove un-awaited failure updates from create.js, pipeline owns error marking"
```

---

## Task 7: Visual Style Thumbnails `[PARALLEL]`

**Files:**
- Modify: `api/lib/visualStyles.js`
- Create: thumbnail image files (or use generated URLs)

**Why:** Visual styles have no preview thumbnails in the frontend.

- [ ] **Step 1: Add thumb field to each visual style**

In `api/lib/visualStyles.js`, add a `thumb` property to each of the 15 styles. Use placeholder URLs initially — these can be generated using each style's prompt_suffix against a standard scene prompt via the FAL image generation API.

```js
pixel_art: {
  label: 'Pixel Art',
  category: 'illustration',
  thumb: '/assets/styles/pixel_art.jpg',
  image_strategy: 'fresh_per_scene',
  prompt_suffix: '...',
},
```

- [ ] **Step 2: Generate thumbnail images**

Write a one-off script (`api/scripts/generate-style-thumbs.js`) that generates a sample image for each visual style using the standard prompt "A mysterious figure standing at the edge of a misty cliff, cinematic" + each style's `prompt_suffix`. Save to `public/assets/styles/`.

- [ ] **Step 3: Commit**

```bash
git add api/lib/visualStyles.js api/scripts/generate-style-thumbs.js public/assets/styles/
git commit -m "feat: add thumbnail previews for all 15 visual styles"
```

---

## Task 7b: Frontend Data Files for Visual/Video Styles `[PARALLEL]`

**Files:**
- Create: `src/lib/visualStylePresets.js` — frontend mirror of `api/lib/visualStyles.js`
- Modify: `src/lib/modelPresets.js` — ensure VIDEO_MODELS matches registry

**Why:** Backend files (`api/lib/visualStyles.js`, `api/lib/videoStylePresets.js`) can't be imported by the frontend. Create frontend copies with the display data (label, thumb, category) but without backend logic (buildBody, parseResult).

- [ ] **Step 1: Create frontend visual style presets**

Create `src/lib/visualStylePresets.js` exporting `VISUAL_STYLES` — an array of `{ key, label, category, thumb, description }` for all 15 styles. This mirrors the backend `visualStyles.js` but includes only display fields.

- [ ] **Step 2: Verify frontend video model presets**

Check `src/lib/modelPresets.js` — ensure `VIDEO_MODELS` and `IMAGE_MODELS` arrays match the model registry keys. These already exist in the frontend; just verify they're in sync.

- [ ] **Step 3: Commit**

```bash
git add src/lib/visualStylePresets.js src/lib/modelPresets.js
git commit -m "feat: add frontend visual style presets, verify model presets sync"
```

---

## Task 7c: Job Status Endpoint + DB Migration

**Files:**
- Create: `api/jobs/status.js` — GET endpoint for job status polling
- Create: `supabase-migration-shorts-overhaul.sql` — add `last_error` column
- Modify: `server.js` — register the new route

**Why:** The frontend needs to poll job progress during generation. No `/api/jobs/:id` endpoint currently exists. Also, `last_error` (jsonb) column may not exist on the `jobs` table.

- [ ] **Step 1: Create job status endpoint**

Create `api/jobs/status.js`:

```js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const jobId = req.query.id;
  if (!jobId) return res.status(400).json({ error: 'Job ID required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, status, current_step, completed_steps, step_results, error, last_error, output_json, created_at, updated_at')
    .eq('id', jobId)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
}
```

- [ ] **Step 2: Register route in server.js**

Add to the routes section:
```js
app.get('/api/jobs/status', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jobs/status.js');
  handler(req, res);
});
```

- [ ] **Step 3: Create migration for last_error column**

Create `supabase-migration-shorts-overhaul.sql`:
```sql
-- Add last_error column for structured pipeline error context
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_error jsonb;
```

- [ ] **Step 4: Commit**

```bash
git add api/jobs/status.js server.js supabase-migration-shorts-overhaul.sql
git commit -m "feat: add job status polling endpoint, add last_error column migration"
```

---

## Task 8: Frontend Wizard Shell `[PARALLEL]`

**Files:**
- Create: `src/pages/ShortsWizardPage.jsx`
- Create: `src/contexts/ShortsWizardContext.jsx`
- Modify: `src/App.jsx` — add route

**Why:** New page to replace the shorts flow in CampaignsNewPage.

- [ ] **Step 1: Create wizard context for shared state**

Create `src/contexts/ShortsWizardContext.jsx` with a React context + provider that holds all wizard state:

```js
const INITIAL_STATE = {
  niche: null,
  visualStyle: null,
  topics: [],
  primaryTopic: null,
  videoLengthPreset: 60,
  script: null,
  videoModel: 'fal_kling',
  motionStyle: null,
  voiceId: null,
  musicMood: null,
  captionStyle: 'word_pop',
  previewImage: null,
};
```

Include `localStorage` persistence: save on every state change, restore on mount, clear on completion. Add a TTL check (clear state older than 7 days).

- [ ] **Step 2: Create ShortsWizardPage shell**

Create `src/pages/ShortsWizardPage.jsx`:
- Wraps content in `ShortsWizardProvider`
- Renders a step progress bar (10 steps)
- Renders the current step component based on `currentStep` state
- Next/Back navigation buttons
- Step labels: Niche, Topics, Script, Look & Feel, Video Model, Motion, Voice & Music, Captions, Preview, Generate

Use the existing `WizardStepper` component pattern from `CampaignsNewPage.jsx`.

- [ ] **Step 3: Add route in App.jsx**

Add route for the new page. **Must use `ProtectedRoute` wrapper** — every authenticated page in this app requires it (see existing routes in App.jsx lines 88-131):

```jsx
import ShortsWizardPage from './pages/ShortsWizardPage';

// In Routes (inside the ProtectedRoute block):
<Route path="/shorts/new" element={<ProtectedRoute><ShortsWizardPage /></ProtectedRoute>} />
```

Keep the old `/campaigns/new` route working — it still handles non-shorts campaigns. Add a "Create Short" button on CampaignsNewPage or CampaignsPage that links to `/shorts/new`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ShortsWizardPage.jsx src/contexts/ShortsWizardContext.jsx src/App.jsx
git commit -m "feat: add shorts wizard shell page with context and routing"
```

---

## Task 9: Wizard Step Components

**Files:**
- Create: `src/components/shorts/NicheStep.jsx`
- Create: `src/components/shorts/TopicsStep.jsx`
- Create: `src/components/shorts/ScriptStep.jsx`
- Create: `src/components/shorts/LookFeelStep.jsx`
- Create: `src/components/shorts/VideoModelStep.jsx`
- Create: `src/components/shorts/MotionStyleStep.jsx`
- Create: `src/components/shorts/VoiceMusicStep.jsx`
- Create: `src/components/shorts/CaptionsStep.jsx`
- Create: `src/components/shorts/PreviewImageStep.jsx`
- Create: `src/components/shorts/ReviewGenerateStep.jsx`

**Depends on:** Task 8

**Why:** Each wizard step is a self-contained component. This is the largest task — break into sub-steps.

- [ ] **Step 1: NicheStep.jsx**

Grid of 12 niche cards (from the `NICHES` array currently in `CampaignsNewPage.jsx`). Each shows icon, label, scene count. User selects one. Uses `useShortsWizard()` context to store selection.

Reference `CampaignsNewPage.jsx` lines 45-130 for the existing NICHES data.

- [ ] **Step 2: TopicsStep.jsx**

- "Generate Topics" button calls `apiFetch('/api/campaigns/topics', { niche })`
- Display topic list with checkboxes for multi-select
- Radio button or star icon to mark one as primary
- Video length preset dropdown: 30s / 45s / 60s / 90s (default 60s)
- Store in wizard context: `topics`, `primaryTopic`, `videoLengthPreset`

- [ ] **Step 3: ScriptStep.jsx**

- Auto-generates script on mount via `apiFetch('/api/campaigns/preview-script', { niche, topic: primaryTopic, videoLengthPreset })`
- Shows loading state, then the script with:
  - Title
  - Full narration (editable textarea)
  - Scene 1 image description (highlighted, from `scene_1_image_description`)
  - Per-scene breakdown (collapsible)
- "Regenerate" button for new script
- Store in wizard context: `script`

- [ ] **Step 4: LookFeelStep.jsx**

Grid of 15 visual styles from `visualStyles.js` with thumbnail previews. Selected style highlighted. Reference existing `StyleGrid` component pattern from `CampaignsNewPage.jsx`.

Store: `visualStyle`

- [ ] **Step 5: VideoModelStep.jsx**

Grid of video models from `VIDEO_MODELS` in `src/lib/modelPresets.js` (frontend model list). Show label, price, thumbnail. Selected model highlighted.

Store: `videoModel`

- [ ] **Step 6: MotionStyleStep.jsx**

Grid of 19 motion styles from `videoStylePresets.js`. Show thumbnail (fix any missing thumbs), label, description. Selected style highlighted.

Store: `motionStyle`

- [ ] **Step 7: VoiceMusicStep.jsx**

Two sections:
1. **Voice**: 6 ElevenLabs presets (Adam, Antoni, Clyde, Rachel, Josh, Bella) with play button for audio preview. Reference voice IDs from `shortsTemplates.js`.
2. **Music mood**: Text input with suggestions from niche template. E.g., "dark ambient" for horror, "upbeat electronic" for tech.

Store: `voiceId`, `musicMood`

- [ ] **Step 8: CaptionsStep.jsx**

3 caption styles: word_pop, karaoke_glow, word_highlight. Show visual preview for each (can be a static mockup image or CSS-rendered preview). Reference `CAPTION_STYLES` from `src/lib/captionStylePresets.js`.

Store: `captionStyle`

- [ ] **Step 9: PreviewImageStep.jsx**

- "Generate Preview" button calls `apiFetch('/api/campaigns/preview-image', { script, visualStyle, niche })`
- Shows loading spinner, then the generated Scene 1 image
- "Approve" and "Regenerate" buttons
- This is the gate before expensive full pipeline runs

Store: `previewImage`

- [ ] **Step 10: ReviewGenerateStep.jsx**

Summary card showing all selections:
- Niche, primary topic, video length
- Script title + word count
- Visual style + video model + motion style
- Voice + caption style
- Preview image thumbnail

"Generate Short" button calls `apiFetch('/api/campaigns/create', { content_type: 'shorts', ...allWizardState })`.

After clicking: switch to **progress view** that polls `jobs` table every 3s. Show progress bar with step name and scene sub-progress. Show scene thumbnails as they complete (from `step_results`).

On completion: redirect to draft review page.

- [ ] **Step 11: Commit step components (3 commits for granularity)**

```bash
# Commit 1: Selection steps (niche, topics, script, look & feel)
git add src/components/shorts/NicheStep.jsx src/components/shorts/TopicsStep.jsx src/components/shorts/ScriptStep.jsx src/components/shorts/LookFeelStep.jsx
git commit -m "feat: add wizard selection steps — niche, topics, script, look & feel"

# Commit 2: Configuration steps (video model, motion, voice, captions)
git add src/components/shorts/VideoModelStep.jsx src/components/shorts/MotionStyleStep.jsx src/components/shorts/VoiceMusicStep.jsx src/components/shorts/CaptionsStep.jsx
git commit -m "feat: add wizard config steps — video model, motion, voice, captions"

# Commit 3: Generation steps (preview image, review & generate)
git add src/components/shorts/PreviewImageStep.jsx src/components/shorts/ReviewGenerateStep.jsx
git commit -m "feat: add wizard generation steps — preview image, review & generate"
```

---

## Task 10: Progress UI + Draft Review Page

**Files:**
- Create: `src/pages/ShortsDraftPage.jsx`
- Modify: `src/App.jsx` — add route

**Depends on:** Tasks 4, 9

**Why:** Post-generation review page and real-time progress during generation.

- [ ] **Step 1: Create ShortsDraftPage.jsx**

Route: `/shorts/draft/:draftId`

Fetches `ad_drafts` record by ID. Displays:
- Full video player (`captioned_video_url`)
- Scene breakdown: for each scene in `scene_inputs_json`, show the image thumbnail + clip player + script text
- Metadata: niche, topic, visual style, video model
- Action buttons: Publish (opens existing PublishModal), Export/Download, Back to Campaigns

Reference existing draft display patterns in `CampaignsPage.jsx` (DraftCard component).

- [ ] **Step 2: Add route**

```jsx
import ShortsDraftPage from './pages/ShortsDraftPage';

<Route path="/shorts/draft/:draftId" element={<ProtectedRoute><ShortsDraftPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Wire up redirect from ReviewGenerateStep**

In `ReviewGenerateStep.jsx`, after the progress polling detects `status === 'completed'`:

```js
// Fetch the ad_draft created by the pipeline
const { data: drafts } = await apiFetch(`/api/campaigns/${campaignId}/drafts`);
if (drafts?.[0]) {
  navigate(`/shorts/draft/${drafts[0].id}`);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ShortsDraftPage.jsx src/App.jsx src/components/shorts/ReviewGenerateStep.jsx
git commit -m "feat: add draft review page with video player, scene breakdown, publish actions"
```

---

## Task 11: Integration Verification

**Depends on:** All previous tasks

**Why:** Verify the entire flow works end-to-end.

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

Verify both Express (port 3003) and Vite (port 4390) start without errors.

- [ ] **Step 2: Verify frontend wizard loads**

Navigate to `http://localhost:4390/shorts/new`. Confirm:
- All 10 steps render
- Step navigation works (next/back)
- Niche selection populates correctly

- [ ] **Step 3: Verify API endpoints respond**

Test each API endpoint used by the wizard:
- `POST /api/campaigns/topics` — returns topic ideas
- `POST /api/campaigns/preview-script` — returns structured script with `scene_1_image_description`
- `POST /api/campaigns/preview-image` — returns image URL
- `POST /api/campaigns/create` — creates campaign + job, returns IDs

- [ ] **Step 4: Run a full pipeline**

Create a shorts campaign through the wizard. Monitor:
- Job status updates in DB (check `jobs` table for `step_results` being populated)
- Pipeline completes without hanging
- Error is recorded if it fails (check `last_error` JSON)
- Draft appears on review page after completion

- [ ] **Step 5: Verify error handling**

Intentionally trigger a failure (e.g., use an invalid API key) and confirm:
- Job marked as `failed` within 30 seconds
- `last_error` contains step, scene, model, timestamp
- Frontend shows error state, not infinite loading

- [ ] **Step 6: Final commit**

Only commit files that were modified during verification fixes (if any). Do NOT use `git add -A` — add specific files only.

```bash
git add <specific-files-modified>
git commit -m "fix: integration verification fixes"
```
