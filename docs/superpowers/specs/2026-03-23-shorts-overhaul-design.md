# Shorts Feature Overhaul — Design Spec

**Date**: 2026-03-23
**Status**: Approved
**Approach**: Config-Driven Model Registry + Full Pipeline & UX Rebuild

---

## Problem Statement

The Shorts pipeline is unreliable. Of the last 5 pipeline runs, 4 are permanently stuck in "running" state with no error recorded. Failures occur silently during media generation (image/video creation via FAL and Wavespeed APIs). The root causes are:

1. **Massive code duplication** — `generateImage()` has 8 copy-paste blocks, `animateImage()` has 10. Fixes must be applied N times and are routinely missed.
2. **No model registry** — API endpoints, param shapes, and response parsing are hardcoded inline with no single source of truth.
3. **Silent failures** — Pipeline errors during polling loops hang indefinitely. The `.catch()` handler in `campaigns/create.js` doesn't `await` its Supabase updates. Jobs stay "running" forever with no error recorded.
4. **No checkpointing** — If scene 5/6 fails, work on scenes 1-4 is lost.
5. **Disjointed frontend** — Wizard steps feel disconnected; no real-time progress; no per-scene visibility.

## Architecture Overview

### Current File Structure (affected files)

```
api/
  campaigns/create.js          — Entry point, launches pipeline
  campaigns/preview-script.js  — Script preview
  campaigns/preview-image.js   — Image preview
  campaigns/research.js        — Trending topic search
  campaigns/topics.js          — Topic generation
  lib/
    shortsPipeline.js           — 9-step pipeline orchestrator
    pipelineHelpers.js          — Image/video/music generation + polling
    shortsTemplates.js          — 12 niche templates
    scriptGenerator.js          — GPT script generation
    voiceoverGenerator.js       — ElevenLabs TTS + FAL Whisper timestamps
    captionBurner.js            — FAL ffmpeg caption burning
    visualStyles.js             — 15 visual style presets
    videoStylePresets.js         — 19 video motion presets
    retryHelper.js              — withRetry wrapper
    costLogger.js               — Per-operation cost tracking
src/
  pages/CampaignsNewPage.jsx   — Frontend wizard (6 steps currently)
  pages/CampaignsPage.jsx      — Campaign list + draft display
```

### New/Modified Files

```
api/lib/
  modelRegistry.js              — NEW: Declarative model configs
  mediaGenerator.js             — NEW: Generic dispatcher (replaces 500+ lines of duplication)
  shortsPipeline.js             — REWRITE: With checkpointing, structured errors, resume
  pipelineHelpers.js            — SLIM DOWN: Remove all model-specific blocks
  scriptGenerator.js            — MODIFY: Improve writing quality, scene 1 image description
  visualStyles.js               — MODIFY: Add thumbnail URLs
src/
  pages/ShortsWizardPage.jsx    — NEW: Replaces CampaignsNewPage for shorts flow
  pages/ShortsDraftPage.jsx     — NEW: Post-generation review page
  components/shorts/            — NEW: Step components for wizard
```

---

## Design Sections

### 1. Model Registry (`api/lib/modelRegistry.js`)

A declarative data structure that defines every supported model's configuration. Eliminates all copy-paste model blocks.

```js
// Each entry fully describes how to call and parse one model
export const IMAGE_MODELS = {
  fal_flux: {
    provider: 'fal',
    endpoint: 'fal-ai/flux-2/lora',
    supportsLora: true,
    sizeParam: 'image_size',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size, opts) => ({
      prompt,
      image_size: size,
      num_inference_steps: 28,
      ...(opts.loras?.length && { loras: opts.loras }),
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  // ... one entry per model
};

export const VIDEO_MODELS = {
  fal_kling: {
    provider: 'fal',
    endpoint: 'fal-ai/kling-video/v2/master/image-to-video',
    acceptsDuration: true,
    durationFormat: 'fal_string', // converts seconds to '4s'|'6s'|'8s'
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl,
      prompt,
      duration,
      aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // ... one entry per model
};
```

**Generic dispatcher** (`api/lib/mediaGenerator.js`):

```js
export async function generateImage(modelKey, prompt, aspectRatio, keys, supabase, opts = {}) {
  const model = IMAGE_MODELS[modelKey];
  if (!model) throw new Error(`Unknown image model: ${modelKey}`);

  const size = model.sizeMap?.[aspectRatio] || aspectRatio;
  const body = model.buildBody(prompt, size, opts);

  const res = await fetch(`${FAL_BASE}/${model.endpoint}`, {
    method: 'POST',
    headers: buildHeaders(model.provider, keys),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new MediaGenerationError(modelKey, 'image', errText);
  }

  const queueData = await res.json();
  // Some models return results directly
  const directResult = model.parseResult(queueData);
  if (directResult) return uploadUrlToSupabase(directResult, supabase, 'pipeline/images');

  // Otherwise poll
  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    model.endpoint,
    keys.falKey,
    model.pollConfig.maxRetries,
    model.pollConfig.delayMs,
  );

  const url = model.parseResult(output);
  if (!url) throw new MediaGenerationError(modelKey, 'image', 'No URL in response');
  return uploadUrlToSupabase(url, supabase, 'pipeline/images');
}
```

Same pattern for `animateImage()`. One code path for all models. ~60 lines replaces ~500.

### 2. Pipeline Checkpointing & Error Handling

**Problem**: Jobs hang forever with no error. No resume capability.

**Solution**: Wrap the pipeline in structured error handling with per-scene checkpointing.

**Per-scene checkpoint** — After each scene completes, save progress to the `jobs` table:

```js
// After each scene completes:
await supabase.from('jobs').update({
  completed_steps: 3, // still in image/clip phase
  step_results: {
    ...existingResults,
    [`scene_${i}`]: {
      image_url: imageUrl,
      clip_url: clipUrl,
      completed_at: new Date().toISOString(),
    },
  },
}).eq('id', jobId);
```

**Pipeline-level try/catch** — The top-level `runShortsPipeline()` wraps everything:

```js
export async function runShortsPipeline(opts) {
  try {
    // ... all 9 steps
  } catch (err) {
    // Always mark job as failed with full context
    await opts.supabase.from('jobs').update({
      status: 'failed',
      error: err.message,
      last_error: JSON.stringify({
        step: currentStep,
        scene: currentSceneIndex,
        model: currentModel,
        timestamp: new Date().toISOString(),
        stack: err.stack?.split('\n').slice(0, 5),
      }),
    }).eq('id', opts.jobId);

    await opts.supabase.from('campaigns').update({
      status: 'failed',
    }).eq('id', opts.campaignId);

    throw err; // re-throw for outer .catch()
  }
}
```

**Polling timeout guard** — Add an absolute timeout to all polling:

```js
// In pollFalQueue: add AbortController with max 5-minute timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 300_000);
```

**Resume capability** — When a job has `step_results` with completed scenes, the pipeline can skip those scenes on retry. (Future enhancement, not MVP.)

### 3. Wizard Flow Redesign (10 Steps)

Replace the current 6-step wizard with a focused 10-step flow. Each step is its own component in `src/components/shorts/`.

| # | Step | Component | API | Notes |
|---|------|-----------|-----|-------|
| 1 | Niche & Theme | `NicheStep.jsx` | — | Pick niche (12), pick visual style (15 with thumbnails) |
| 2 | Topics | `TopicsStep.jsx` | `/api/campaigns/topics` | Generate ideas, multi-select, set primary, video length preset (30/45/60/90s) |
| 3 | Script | `ScriptStep.jsx` | `/api/campaigns/preview-script` | Improved writing (no emdashes, less cliché). Shows Scene 1 image description explicitly. Editable. |
| 4 | Look & Feel | `LookFeelStep.jsx` | — | Visual style with thumbnail previews. Verified to flow through to pipeline. |
| 5 | Video Model | `VideoModelStep.jsx` | — | Model selection with pricing. All endpoints verified. |
| 6 | Motion Style | `MotionStyleStep.jsx` | — | 19 motion presets with thumbnails (fix missing ones). |
| 7 | Voice & Music | `VoiceMusicStep.jsx` | — | ElevenLabs voice selection (6 presets with audio preview). Music mood. |
| 8 | Captions | `CaptionsStep.jsx` | — | 3 caption styles with visual previews. |
| 9 | Preview Image | `PreviewImageStep.jsx` | `/api/campaigns/preview-image` | Generate + approve Scene 1 image before committing. Gate before expensive generation. |
| 10 | Review & Generate | `ReviewGenerateStep.jsx` | `/api/campaigns/create` | Summary of all selections. Generate button. Real-time progress polling. |

**Key frontend changes:**

- New `ShortsWizardPage.jsx` replaces the shorts path in `CampaignsNewPage.jsx`
- Each step is a self-contained component receiving shared state via props or context
- Progress bar shows all 10 steps with current position
- State persisted to localStorage so refreshing doesn't lose progress

### 4. Script Quality Improvements

**Current issues**: Cliché phrasing, emdashes, no clear Scene 1 image description.

**Changes to `scriptGenerator.js`**:

- Update system prompt to explicitly forbid emdashes (`—`), cliché phrases ("buckle up", "let's dive in", "here's the thing")
- Add instruction: "Write like a sharp, knowledgeable creator talking to a friend. Be specific, not generic."
- Require the response schema to include `scene_1_image_description` — a detailed visual description of the first scene for image generation
- Adjust per-niche templates in `shortsTemplates.js` to include better example narrations

### 5. Visual Style Thumbnails

`visualStyles.js` currently has no `thumb` field. Add generated thumbnail URLs for all 15 styles so the frontend can display visual previews:

```js
pixel_art: {
  label: 'Pixel Art',
  category: 'illustration',
  thumb: '/assets/styles/pixel_art.jpg',  // NEW
  image_strategy: 'fresh_per_scene',
  prompt_suffix: '...',
},
```

Generate reference thumbnails using each style's prompt_suffix against a standard scene.

### 6. Model Verification

Before launch, every model endpoint must be verified:

**Image models** (7): fal_flux, fal_seedream, fal_imagen4, fal_kling_img, fal_grok, fal_ideogram, wavespeed

**Video models** (10): fal_kling, fal_kling_v3, fal_kling_o3, fal_veo2, fal_veo3, fal_wan25, fal_wan_pro, fal_pixverse, fal_hailuo, wavespeed_wan

For each model:
- Confirm endpoint URL is correct (check FAL docs)
- Confirm parameter names match current API (duration format, aspect_ratio format, etc.)
- Confirm response shape matches `parseResult` function
- Test with a real API call
- Record expected latency and cost

### 7. Post-Generation Flow

**Current**: Completed drafts appear in CampaignsPage with Publish/Export buttons. No dedicated review.

**New**: After pipeline completes, redirect to `ShortsDraftPage.jsx`:

- Full video player (captioned version)
- Scene-by-scene breakdown (individual clips, images, script text)
- Per-scene regeneration buttons (future enhancement)
- Publish buttons: YouTube Shorts, TikTok, IG Reels, X/Twitter
- Export/download button
- "Back to Campaigns" link

### 8. Real-Time Progress UI

The `ReviewGenerateStep` polls the `jobs` table every 3 seconds during generation:

```
[=========>          ] Step 4/9: Generating clips (Scene 3/6)
```

Shows:
- Current pipeline step name
- Scene progress within the image/clip generation step
- Elapsed time
- Individual scene thumbnails as they complete (from `step_results`)

### 9. Database Changes

No new tables needed. Minor column additions:

- `jobs.step_results` — already exists (jsonb), will be populated with per-scene checkpoint data
- `ad_drafts.scene_1_image_description` — not needed as a column, included in `shorts_metadata_json`

### 10. Aspect Ratio Fix

The current `sizeMap` in `generateImage()` maps `'9:16'` to `'portrait_16_9'`. This needs verification per model — some FAL models may interpret this differently. The model registry standardizes this per-model so each model gets the correct size parameter.

---

## What's NOT in Scope

- Per-scene regeneration UI (post-generation editing) — future enhancement
- Pipeline resume from checkpoint — future enhancement
- Batch topic generation (multiple shorts from topic list) — future enhancement
- A/B testing of scripts or styles — future enhancement

## Success Criteria

1. Pipeline completes successfully for all 12 niches without hanging
2. Failed jobs always record an error message and mark as failed within 30 seconds
3. All image and video model endpoints verified working
4. Frontend wizard flows cohesively through 10 steps
5. Real-time progress visible during generation
6. Script quality is natural, no emdashes, with clear Scene 1 visual description
7. Visual style selection demonstrably affects generated images
8. Caption burning produces correctly timed word overlays
