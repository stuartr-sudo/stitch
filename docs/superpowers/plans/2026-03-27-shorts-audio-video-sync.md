# Shorts Audio-Video Sync & Scene Continuity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate audio-video duration mismatch in Shorts by locking model-valid durations before script generation, and introduce distinct continuous/cut pipeline flows based on framework type.

**Architecture:** New duration solver module allocates model-valid durations per scene. Script generator receives exact durations. Pipeline branches on `frameChain` — continuous uses frame chaining with I2V, cut uses independent scenes with R2V for character consistency. All frameworks switch to single TTS mode.

**Tech Stack:** Node.js/Express, FAL.ai API, OpenAI GPT-4.1 mini (structured output)

**Spec:** `docs/superpowers/specs/2026-03-27-shorts-audio-video-sync-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `api/lib/durationSolver.js` | **Create** | Allocate model-valid durations per scene |
| `api/lib/modelRegistry.js` | Modify | Add `r2vEndpoint` + `validDurations` to video models |
| `api/lib/scriptGenerator.js` | Modify | Accept exact durations, differentiate continuous/cut prompts |
| `api/lib/shortsPipeline.js` | Modify | New flow order, remove estimation, branch on frameChain |
| `api/lib/pipelineHelpers.js` | Modify | Clean up `assembleShort()` voiceover placement |
| `api/lib/videoStyleFrameworks.js` | Modify | Set all frameworks to `ttsMode: 'single'` |
| `src/lib/videoStyleFrameworks.js` | Modify | Add `frameChain` to frontend `FRAMEWORK_CARDS` |
| `src/lib/modelPresets.js` | Modify | Add `r2v` flag to `VIDEO_MODELS` entries |
| `src/pages/CampaignsNewPage.jsx` | Modify | Filter video models by framework type, reset on switch |

---

### Task 1: Duration Solver Module

**Files:**
- Create: `api/lib/durationSolver.js`

This is the core new module. It takes a target total duration, scene count with per-scene duration ranges, and a model key, then returns an array of model-valid durations that sum to (or close to) the target.

- [ ] **Step 1: Create the model duration constraint map**

```javascript
// api/lib/durationSolver.js

// Valid durations per model (in seconds)
const MODEL_DURATIONS = {
  // Discrete — only these exact values
  fal_veo3:        { type: 'discrete', values: [4, 6, 8] },
  fal_veo2:        { type: 'discrete', values: [4, 6, 8] },
  fal_kling:       { type: 'discrete', values: [5, 10] },
  fal_wan:         { type: 'discrete', values: [5, 10] },
  fal_pixverse:    { type: 'discrete', values: [5, 8] },
  // Continuous — any integer in range
  fal_kling_v3:    { type: 'range', min: 3, max: 15 },
  fal_kling_o3:    { type: 'range', min: 3, max: 15 },
  wavespeed_wan:   { type: 'range', min: 5, max: 8 },
  // Fixed — no duration param, model decides
  fal_hailuo:      { type: 'fixed', value: 6 },
  fal_wan_pro:     { type: 'fixed', value: 5 },
};
```

- [ ] **Step 2: Implement discrete solver (enumerate + score)**

```javascript
/**
 * For discrete-duration models: enumerate combinations summing to target,
 * score by deviation from each scene's preferred midpoint.
 */
function solveDiscrete(targetTotal, durationRanges, validValues) {
  const sceneCount = durationRanges.length;
  const midpoints = durationRanges.map(([min, max]) => (min + max) / 2);

  let bestCombo = null;
  let bestScore = Infinity;
  let bestDiff = Infinity;

  // Try exact target first, then expand tolerance: ±2, ±4, ±6
  for (const tolerance of [0, 2, 4, 6]) {
    const targets = tolerance === 0
      ? [targetTotal]
      : [targetTotal - tolerance, targetTotal + tolerance];

    for (const t of targets) {
      if (t <= 0) continue;
      enumerate(validValues, sceneCount, t, (combo) => {
        const score = combo.reduce((sum, d, i) => sum + Math.abs(d - midpoints[i]), 0);
        const diff = Math.abs(t - targetTotal);
        if (diff < bestDiff || (diff === bestDiff && score < bestScore)) {
          bestCombo = [...combo];
          bestScore = score;
          bestDiff = diff;
        }
      });
    }
    if (bestCombo) return bestCombo;
  }

  // Fallback: adjust scene count ±1 (non-recursive, single attempt)
  for (const delta of [-1, 1]) {
    const adjusted = sceneCount + delta;
    if (adjusted < 2 || adjusted > 12) continue;
    const adjustedRanges = delta > 0
      ? [...durationRanges, durationRanges[durationRanges.length - 1]]
      : durationRanges.slice(0, -1);
    // Non-recursive: just try tolerance sweep on adjusted scene count
    const adjustedMidpoints = adjustedRanges.map(([min, max]) => (min + max) / 2);
    for (const tolerance of [0, 2, 4, 6]) {
      const targets = tolerance === 0 ? [targetTotal] : [targetTotal - tolerance, targetTotal + tolerance];
      for (const t of targets) {
        if (t <= 0) continue;
        let found = null;
        enumerate(validValues, adjusted, t, (combo) => {
          if (found) return;
          const score = combo.reduce((sum, d, i) => sum + Math.abs(d - adjustedMidpoints[i]), 0);
          found = [...combo];
        });
        if (found) return found;
      }
    }
  }

  // Ultimate fallback: equal distribution using smallest valid value
  return durationRanges.map(() => validValues[0]);
}

/**
 * Enumerate all combinations of `values` of length `count` that sum to `target`.
 * Calls `callback(combo)` for each valid combination.
 * Max 12 scenes × 3 values = 531k iterations — acceptable.
 */
function enumerate(values, count, target, callback, current = [], depth = 0) {
  if (depth === count) {
    if (current.reduce((a, b) => a + b, 0) === target) callback(current);
    return;
  }
  // Prune: remaining slots × max value must be >= remaining target
  const remaining = count - depth;
  const currentSum = current.reduce((a, b) => a + b, 0);
  const maxPossible = remaining * Math.max(...values);
  const minPossible = remaining * Math.min(...values);
  if (currentSum + maxPossible < target) return;
  if (currentSum + minPossible > target) return;

  for (const v of values) {
    current.push(v);
    enumerate(values, count, target, callback, current, depth + 1);
    current.pop();
  }
}
```

- [ ] **Step 3: Implement continuous-range solver**

```javascript
/**
 * For continuous-range models: proportionally distribute target across scenes,
 * clamp to model range and scene durationRange, adjust remainder.
 */
function solveRange(targetTotal, durationRanges, min, max) {
  const midpoints = durationRanges.map(([lo, hi]) => (lo + hi) / 2);
  const totalMidpoint = midpoints.reduce((a, b) => a + b, 0);

  // Proportional distribution
  let durations = midpoints.map(mp => Math.round((mp / totalMidpoint) * targetTotal));

  // Clamp to model range AND scene range
  durations = durations.map((d, i) => {
    const sceneMin = Math.max(min, durationRanges[i][0]);
    const sceneMax = Math.min(max, durationRanges[i][1]);
    return Math.max(sceneMin, Math.min(sceneMax, d));
  });

  // Adjust remainder — distribute across scenes with most headroom
  let diff = targetTotal - durations.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const step = diff > 0 ? 1 : -1;
    let bestIdx = -1;
    let bestHeadroom = -1;
    for (let i = 0; i < durations.length; i++) {
      const sceneMin = Math.max(min, durationRanges[i][0]);
      const sceneMax = Math.min(max, durationRanges[i][1]);
      const newVal = durations[i] + step;
      if (newVal < sceneMin || newVal > sceneMax) continue;
      const headroom = step > 0
        ? sceneMax - durations[i]
        : durations[i] - sceneMin;
      if (headroom > bestHeadroom) {
        bestHeadroom = headroom;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break; // Can't adjust further
    durations[bestIdx] += step;
    diff -= step;
  }

  return durations;
}
```

- [ ] **Step 4: Implement fixed-duration solver**

```javascript
/**
 * For fixed-duration models: all scenes get the same duration.
 * Adjust scene count to approximate target.
 */
function solveFixed(targetTotal, durationRanges, fixedValue) {
  const idealCount = Math.round(targetTotal / fixedValue);
  const count = Math.max(2, Math.min(12, idealCount));
  return Array(count).fill(fixedValue);
}
```

- [ ] **Step 5: Implement the main export function**

```javascript
/**
 * Solve for model-valid per-scene durations.
 * @param {number} targetTotal - Target total duration in seconds
 * @param {Array<[number, number]>} durationRanges - Per-scene [min, max] from framework
 * @param {string} modelKey - Video model key (e.g., 'fal_veo3')
 * @returns {number[]} Array of durations, one per scene
 */
export function solveDurations(targetTotal, durationRanges, modelKey) {
  const config = MODEL_DURATIONS[modelKey];
  if (!config) {
    // Unknown model — fall back to equal distribution
    const perScene = Math.round(targetTotal / durationRanges.length);
    return durationRanges.map(() => Math.max(3, perScene));
  }

  switch (config.type) {
    case 'discrete':
      return solveDiscrete(targetTotal, durationRanges, config.values);
    case 'range':
      return solveRange(targetTotal, durationRanges, config.min, config.max);
    case 'fixed':
      return solveFixed(targetTotal, durationRanges, config.value);
  }
}
```

- [ ] **Step 6: Validate with manual test**

Run: `node -e "import('./api/lib/durationSolver.js').then(m => { console.log('Veo 30s 5 scenes:', m.solveDurations(30, [[4,5],[10,12],[10,14],[10,12],[4,5]], 'fal_veo3')); console.log('Kling v2 30s 5 scenes:', m.solveDurations(30, [[4,5],[10,12],[10,14],[10,12],[4,5]], 'fal_kling')); console.log('Kling O3 30s 5 scenes:', m.solveDurations(30, [[4,5],[10,12],[10,14],[10,12],[4,5]], 'fal_kling_o3')); })"`

Expected: Arrays of valid durations summing to 30 (or close).

- [ ] **Step 7: Commit**

```bash
git add api/lib/durationSolver.js
git commit -m "feat: add duration solver for model-valid scene allocation"
```

---

### Task 2: Model Registry — Add R2V Endpoints

**Files:**
- Modify: `api/lib/modelRegistry.js`

Add `r2vEndpoint` field to video models that support reference-to-video. This is used by the pipeline to switch endpoints for cut scenes and by the wizard to filter models.

- [ ] **Step 1: Read the current VIDEO_MODELS section**

Read `api/lib/modelRegistry.js` and find the video model entries (the `VIDEO_MODELS` object). Note the exact structure of `fal_veo3`, `fal_kling_o3`, and any Grok video entry.

- [ ] **Step 2: Add r2vEndpoint to Veo 3.1**

In the `fal_veo3` entry, add:
```javascript
r2vEndpoint: 'fal-ai/veo3.1/reference-to-video',
```

- [ ] **Step 3: Add r2vEndpoint to Kling O3**

In the `fal_kling_o3` entry, add:
```javascript
r2vEndpoint: 'fal-ai/kling-video/o3/pro/reference-to-video',
```

- [ ] **Step 4: Add r2vEndpoint to Grok**

Find the Grok video model entry. Add:
```javascript
r2vEndpoint: 'xai/grok-imagine-video/reference-to-video',
```

- [ ] **Step 5: Add helper to check R2V capability**

At the bottom of the file, add an export:
```javascript
export function isR2VCapable(modelKey) {
  const model = VIDEO_MODELS[modelKey];
  return model && !!model.r2vEndpoint;
}

export function getR2VEndpoint(modelKey) {
  const model = VIDEO_MODELS[modelKey];
  return model?.r2vEndpoint || null;
}
```

- [ ] **Step 6: Commit**

```bash
git add api/lib/modelRegistry.js
git commit -m "feat: add r2vEndpoint to video models for cut-scene support"
```

---

### Task 3: Update Frameworks — All ttsMode to 'single'

**Files:**
- Modify: `api/lib/videoStyleFrameworks.js`

All frameworks need `ttsMode: 'single'`. Currently, `frameChain: false` frameworks use `ttsMode: 'per_scene'`. Change them all to `'single'`.

- [ ] **Step 1: Read the file and identify all per_scene entries**

Search for `ttsMode: 'per_scene'` in `api/lib/videoStyleFrameworks.js`. Note every framework that needs changing.

- [ ] **Step 2: Replace all ttsMode: 'per_scene' with 'single'**

Use find-and-replace across the file:
```
ttsMode: 'per_scene'  →  ttsMode: 'single'
```

- [ ] **Step 3: Validate**

Run: `node -e "import('./api/lib/videoStyleFrameworks.js').then(m => { const all = m.ALL_FRAMEWORKS || m.FRAMEWORKS || Object.values(m).find(v => Array.isArray(v)) || []; const perScene = all.filter(f => f.ttsMode === 'per_scene'); console.log('per_scene remaining:', perScene.length, perScene.map(f => f.id)); })"`

Expected: `per_scene remaining: 0 []`

- [ ] **Step 4: Add frameChain to frontend FRAMEWORK_CARDS**

The frontend mirror `src/lib/videoStyleFrameworks.js` has `FRAMEWORK_CARDS` but lacks the `frameChain` field. Read the file, find the `FRAMEWORK_CARDS` array, and add `frameChain: true` or `frameChain: false` to each entry matching the backend values. All `category: 'story'` frameworks get `frameChain: true`, all `category: 'fast_paced'` get `frameChain: false`. Verify by cross-referencing with the backend file.

- [ ] **Step 5: Commit**

```bash
git add api/lib/videoStyleFrameworks.js src/lib/videoStyleFrameworks.js
git commit -m "feat: switch all frameworks to ttsMode single, add frameChain to frontend"
```

---

### Task 4: Script Generator — Exact Durations + Continuous/Cut Prompts

**Files:**
- Modify: `api/lib/scriptGenerator.js`

Two changes: (1) accept exact locked durations instead of ranges, (2) differentiate visual prompt instructions for continuous vs cut frameworks.

- [ ] **Step 1: Read the current script generator**

Read `api/lib/scriptGenerator.js` fully. Find:
- The function signature (what params it accepts)
- The `sceneGuide` construction (around line 80-90)
- The system prompt rules section (around line 114-134)
- Where `visual_prompt` instructions are given

- [ ] **Step 2: Update function signature to accept locked durations**

Add `lockedDurations` parameter to the main generate function. When present, it overrides the framework's `durationRange`:

```javascript
// In the function signature, add lockedDurations = null
// In the sceneGuide construction:
const sceneGuide = frameworkScenes.map((s, i) => {
  const duration = lockedDurations
    ? `${lockedDurations[i]}s`
    : `${s.durationRange[0]}-${s.durationRange[1]}s`;
  return `Scene ${i + 1} "${s.label}" (${duration}): ${s.beat}` +
    (s.overlayText ? ` — overlay text template: ${s.overlayText}` : '');
}).join('\n');
```

- [ ] **Step 3: Update word count calculation for exact durations**

The current system prompt calculates total words from duration ranges. Update to use locked durations when available:

```javascript
// Replace the totalWords calculation
const totalDuration = lockedDurations
  ? lockedDurations.reduce((a, b) => a + b, 0)
  : frameworkScenes.reduce((sum, s) => sum + (s.durationRange[0] + s.durationRange[1]) / 2, 0);
const totalWords = Math.round(totalDuration * 2.7); // ~2.7 words/sec
```

- [ ] **Step 4: Add continuous/cut visual prompt instructions**

Add a `frameChain` parameter. When the framework is continuous (`frameChain: true`), add to the system prompt:

```javascript
const visualPromptStyle = frameChain
  ? `For Scene 1, write a full visual_prompt describing the complete scene setting, characters, and atmosphere.
For Scene 2 onwards, write a SHORT visual_prompt (1-2 sentences) describing only what CHANGES — motion, action, camera movement. Do NOT re-describe the setting or characters, as the previous scene's final frame provides visual context.`
  : `For EVERY scene, write a complete visual_prompt describing the full scene — setting, characters, atmosphere, composition. Each scene is visually independent.`;
```

Insert this into the system prompt before the existing `visual_prompt` rules.

- [ ] **Step 5: Validate**

Run: `node -e "import('./api/lib/scriptGenerator.js').then(m => console.log('exports:', Object.keys(m)))"`

Expected: Should export the generate function without errors.

- [ ] **Step 6: Commit**

```bash
git add api/lib/scriptGenerator.js
git commit -m "feat: script generator accepts exact durations and continuous/cut visual modes"
```

---

### Task 5: Pipeline Rewrite — New Flow Order + Branched Generation

**Files:**
- Modify: `api/lib/shortsPipeline.js`

This is the largest change. The pipeline flow changes to: duration solver → script → TTS (single) → branched video generation.

- [ ] **Step 1: Read the full pipeline file**

Read `api/lib/shortsPipeline.js` completely. Map out the current flow:
- Lines 1-79: imports + helpers
- Lines 80-240: setup + image generation
- Lines 240-360: voiceover generation
- Lines 360-400: duration estimation
- Lines 400-570: video generation loop
- Lines 570-650: assembly + captions

- [ ] **Step 2: Add durationSolver import**

At the top of the file, add:
```javascript
import { solveDurations } from './durationSolver.js';
```

- [ ] **Step 3: Remove estimateDurationFromText and getActualDuration**

Delete the `estimateDurationFromText()` function (lines 76-79) and `getActualDuration()` function (lines 47-70). These are replaced by the duration solver.

- [ ] **Step 4: Add duration solving step after framework load**

After the framework and scene structure are loaded (after the existing framework lookup), add:

```javascript
// --- Duration Solver ---
const sceneStructure = framework.sceneStructure[video_length_preset] ||
  framework.sceneStructure[framework.supportedDurations[0]];
const durationRanges = sceneStructure.map(s => s.durationRange);
const lockedDurations = solveDurations(video_length_preset, durationRanges, videoModel);
console.log('[shorts] Locked durations:', lockedDurations, 'sum:', lockedDurations.reduce((a, b) => a + b, 0));
```

- [ ] **Step 5: Pass locked durations to script generator**

Find the script generator call and add `lockedDurations` and `frameChain`:

```javascript
const scriptResult = await generateScript({
  // ...existing params...
  lockedDurations,
  frameChain: framework.frameChain,
});
```

- [ ] **Step 6: Simplify voiceover to always use single mode**

Remove the per-scene TTS branch entirely. Keep only the single-voiceover path:

```javascript
// --- TTS Voiceover (always single continuous track) ---
const fullNarration = scriptResult.scenes
  .map(s => s.narration_segment || s.narration || '')
  .join(' ');

let voiceoverUrl;
if (gemini_voice) {
  voiceoverUrl = await generateGeminiVoiceover(fullNarration, gemini_voice, keys.falKey, {
    style_instructions: framework.ttsPacing || undefined,
  });
} else {
  voiceoverUrl = await generateVoiceover(fullNarration, tts_voice || 'alloy', keys.falKey);
}
```

Remove the per-scene concatenation logic (the ffmpeg concat block around lines 282-313).

- [ ] **Step 7: Remove duration estimation block**

Delete the entire duration estimation section (lines 360-384) — `sceneDurations` is now `lockedDurations` from step 4.

- [ ] **Step 8: Rewrite video generation loop with continuous/cut branching**

Replace the video generation loop with:

```javascript
// --- Video Generation (branched by frameChain) ---
const isContinuous = framework.frameChain;
let characterRef = null; // Scene 1 image, used for R2V in cut mode
const clips = [];
const actualDurations = [];

for (let i = 0; i < scriptResult.scenes.length; i++) {
  const scene = scriptResult.scenes[i];
  const duration = lockedDurations[i];
  const visualPrompt = scene.visual_prompt || scene.visual_description || '';
  const motionPrompt = scene.motion_prompt || '';
  const fullPrompt = [visualPrompt, motionPrompt, videoStylePrompt].filter(Boolean).join('. ');

  let imageUrl, clipUrl;

  if (i === 0) {
    // Scene 1: always generate image → I2V
    imageUrl = await generateImageV2(imageModel, fullPrompt, aspectRatio, keys, supabase, { loras: loraConfigs });
    characterRef = imageUrl; // Capture for R2V in cut mode
    clipUrl = await animateImageV2(videoModel, imageUrl, fullPrompt, aspectRatio, duration, keys, supabase, { loras: loraConfigs, generate_audio: false });
  } else if (isContinuous) {
    // Continuous: last frame → I2V
    const lastFrame = clips[clips.length - 1].lastFrameUrl;
    clipUrl = await animateImageV2(videoModel, lastFrame, fullPrompt, aspectRatio, duration, keys, supabase, { loras: loraConfigs, generate_audio: false });
  } else {
    // Cut: R2V with character ref, or fresh image → I2V
    const r2vEndpoint = getR2VEndpoint(videoModel);
    if (characterRef && r2vEndpoint) {
      // R2V with character reference
      clipUrl = await animateImageR2V(r2vEndpoint, characterRef, fullPrompt, aspectRatio, duration, keys, supabase);
    } else {
      // No character ref (scene 1 failed) — fresh image → I2V
      imageUrl = await generateImageV2(imageModel, fullPrompt, aspectRatio, keys, supabase, { loras: loraConfigs });
      clipUrl = await animateImageV2(videoModel, imageUrl, fullPrompt, aspectRatio, duration, keys, supabase, { loras: loraConfigs, generate_audio: false });
    }
  }

  // Extract frames for chaining (continuous) and checkpointing
  const [firstFrameUrl, lastFrameUrl] = await Promise.all([
    extractFirstFrame(clipUrl, keys.falKey),
    extractLastFrame(clipUrl, duration, keys.falKey),
  ]);

  clips.push({ url: clipUrl, firstFrameUrl, lastFrameUrl, imageUrl });
  actualDurations.push(duration);

  // Checkpoint to jobs table
  // ... (keep existing step_results logic)
}
```

- [ ] **Step 9: Add animateImageR2V helper**

This function calls the R2V endpoint. Add it to `api/lib/mediaGenerator.js`. The body structure varies per provider — reference `api/jumpstart/generate.js` (search for `reference-to-video` to find the three patterns).

```javascript
import { getR2VEndpoint } from './modelRegistry.js';
import { veoDuration } from './modelRegistry.js';

/**
 * Generate video from reference image via R2V endpoint.
 * Three providers with different body shapes:
 * - Veo 3.1: { image_url, prompt, duration: '4s'/'6s'/'8s', aspect_ratio }
 * - Grok: { reference_image_urls: [url], prompt, duration: seconds (int 1-10), aspect_ratio }
 * - Kling O3: { prompt (with @Element1 syntax), element_image_urls: [url], duration: "3"-"15" }
 */
export async function animateImageR2V(r2vEndpoint, referenceImageUrl, prompt, aspectRatio, duration, keys, supabase) {
  let body;

  if (r2vEndpoint.includes('veo3')) {
    // Veo 3.1 R2V
    body = {
      image_url: referenceImageUrl,
      prompt,
      duration: veoDuration(duration),
      aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
      generate_audio: false,
    };
  } else if (r2vEndpoint.includes('grok-imagine')) {
    // Grok R2V — uses reference_image_urls array, integer duration
    body = {
      reference_image_urls: [referenceImageUrl],
      prompt,
      duration: Math.max(1, Math.min(10, Math.round(duration))),
      aspect_ratio: aspectRatio,
      generate_audio: false,
    };
  } else if (r2vEndpoint.includes('kling-video')) {
    // Kling O3 R2V — uses @Element1 in prompt + element_image_urls
    body = {
      prompt: `@Element1 ${prompt}`,
      element_image_urls: [referenceImageUrl],
      duration: String(Math.max(3, Math.min(15, Math.round(duration)))),
      aspect_ratio: aspectRatio,
    };
  } else {
    throw new Error(`Unknown R2V endpoint: ${r2vEndpoint}`);
  }

  const result = await pollFalQueue(r2vEndpoint, body, keys.falKey);
  const videoUrl = result.video?.url || result.output?.url;

  // Upload to Supabase for permanent URL
  return uploadUrlToSupabase(videoUrl, supabase, 'pipeline/finals');
}
```

Verify the exact field names by reading `api/jumpstart/generate.js` — search for each R2V endpoint string to find the existing body construction.

- [ ] **Step 10: Update assembly call**

The assembly call should use `lockedDurations` directly:

```javascript
const validClips = clips.map(c => c.url);
const validDurations = actualDurations;
const assembledVideoUrl = await assembleShort(
  validClips, voiceoverUrl, musicUrl,
  keys.falKey, supabase,
  validDurations,
  framework.musicVolume || 0.15
);
```

- [ ] **Step 11: Commit**

```bash
git add api/lib/shortsPipeline.js
git commit -m "feat: rewrite shorts pipeline with duration solver and continuous/cut branching"
```

---

### Task 6: Wizard — Model Filtering by Framework Type

**Files:**
- Modify: `src/lib/modelPresets.js` (where `VIDEO_MODELS` is defined)
- Modify: `src/pages/CampaignsNewPage.jsx`

Filter the Video Model step to only show R2V-capable models when a cut framework is selected.

- [ ] **Step 1: Read the model presets and wizard files**

Read `src/lib/modelPresets.js` to find the `VIDEO_MODELS` array definition. Also read `src/pages/CampaignsNewPage.jsx` to find:
- Where `VIDEO_MODELS` is imported (should be from `@/lib/modelPresets`)
- The framework selection handler (around line 417-420)
- The video model step rendering (around line 1114-1119)
- The `videoModel` state variable

- [ ] **Step 2: Add R2V capability flag to VIDEO_MODELS in modelPresets.js**

In `src/lib/modelPresets.js`, add `r2v: true/false` to each entry in `VIDEO_MODELS`:

```javascript
// R2V-capable models: fal_veo3, fal_kling_o3, and any Grok video model
// All others get r2v: false
```

- [ ] **Step 3: Derive whether current framework is cut**

In `CampaignsNewPage.jsx`, after the framework state, add a derived value. `FRAMEWORK_CARDS` is imported from `src/lib/videoStyleFrameworks.js` (Task 3 Step 4 added `frameChain` to it):

```javascript
const selectedFramework = FRAMEWORK_CARDS.find(f => f.id === framework);
const isCutFramework = selectedFramework && selectedFramework.frameChain === false;
```

- [ ] **Step 4: Filter models in the video model step**

```javascript
const availableModels = isCutFramework
  ? VIDEO_MODELS.filter(m => m.r2v)
  : VIDEO_MODELS;
```

Use `availableModels` instead of `VIDEO_MODELS` in the rendering section.

- [ ] **Step 5: Reset model on framework switch**

In the framework selection handler (where `setVideoModel(fw.defaults.videoModel)` is called), add validation:

```javascript
// After setting framework
if (fw.frameChain === false) {
  // Cut framework — ensure selected model supports R2V
  const currentModel = VIDEO_MODELS.find(m => m.value === videoModel);
  if (currentModel && !currentModel.r2v) {
    setVideoModel(fw.defaults.videoModel || 'fal_veo3'); // Reset to R2V-capable default
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/CampaignsNewPage.jsx
git commit -m "feat: filter video models by R2V capability for cut frameworks"
```

---

### Task 7: Assembly Cleanup

**Files:**
- Modify: `api/lib/pipelineHelpers.js`

Minor cleanup — the `assembleShort()` function already uses `clipDurations` for video keyframes. The voiceover is placed at timestamp 0 with `duration: totalDurationMs`. Since durations now match by construction, this works correctly. The main change is ensuring the voiceover duration uses the actual total, not a stretched value.

- [ ] **Step 1: Read assembleShort()**

Read `api/lib/pipelineHelpers.js` around lines 338-379.

- [ ] **Step 2: Verify voiceover placement is correct**

The existing code sets voiceover `duration: totalDurationMs` where `totalDurationMs` is the sum of clip durations. Since locked durations now match the script/TTS, this is correct. No code change needed — just verify.

If the voiceover `duration` field causes FFmpeg to stretch/compress, change it to omit `duration` entirely so the voiceover plays at natural speed:

```javascript
{ id: 'voiceover', type: 'audio', keyframes: [{ url: voiceoverUrl, timestamp: 0 }] },
```

- [ ] **Step 3: Commit (if changes made)**

```bash
git add api/lib/pipelineHelpers.js
git commit -m "fix: let voiceover play at natural duration in assembly"
```

---

### Task 8: Integration Test — End-to-End Validation

**Files:**
- No file changes — manual testing

- [ ] **Step 1: Verify duration solver works for all model types**

```bash
node -e "
import('./api/lib/durationSolver.js').then(m => {
  // Veo 3.1: 30s, 5 scenes
  console.log('Veo 30s:', m.solveDurations(30, [[4,5],[10,12],[10,14],[10,12],[4,5]], 'fal_veo3'));
  // Kling v2: 30s, 4 scenes
  console.log('Kling v2 30s:', m.solveDurations(30, [[6,8],[8,10],[8,10],[6,8]], 'fal_kling'));
  // Kling O3: 30s, 5 scenes
  console.log('Kling O3 30s:', m.solveDurations(30, [[4,5],[10,12],[10,14],[10,12],[4,5]], 'fal_kling_o3'));
  // Hailuo fixed: 30s
  console.log('Hailuo 30s:', m.solveDurations(30, [[10,12],[10,12],[10,12]], 'fal_hailuo'));
  // Edge: impossible exact (Kling v2, 18s, 3 scenes)
  console.log('Kling v2 18s:', m.solveDurations(18, [[5,7],[5,7],[5,7]], 'fal_kling'));
});
"
```

- [ ] **Step 2: Verify framework ttsMode updates**

```bash
node -e "
import('./api/lib/videoStyleFrameworks.js').then(m => {
  const all = m.ALL_FRAMEWORKS;
  const perScene = all.filter(f => f.ttsMode === 'per_scene');
  console.log('per_scene count:', perScene.length);
  console.log('All single:', all.every(f => f.ttsMode === 'single'));
});
"
```

Expected: `per_scene count: 0`, `All single: true`

- [ ] **Step 3: Verify model registry R2V endpoints**

```bash
node -e "
import('./api/lib/modelRegistry.js').then(m => {
  console.log('Veo R2V:', m.isR2VCapable('fal_veo3'), m.getR2VEndpoint('fal_veo3'));
  console.log('Kling O3 R2V:', m.isR2VCapable('fal_kling_o3'), m.getR2VEndpoint('fal_kling_o3'));
  console.log('Kling v2 R2V:', m.isR2VCapable('fal_kling'), m.getR2VEndpoint('fal_kling'));
});
"
```

Expected: Veo and Kling O3 return true + endpoint, Kling v2 returns false + null.

- [ ] **Step 4: Start dev server and verify wizard filtering**

Run `npm run dev` and navigate to `/campaigns/new?type=shorts`. Select a cut framework (e.g., `top_x_countdown`), verify only R2V-capable models appear. Switch to a continuous framework (e.g., `personal_journey`), verify all models appear.

- [ ] **Step 5: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: integration test fixes for shorts sync pipeline"
```
