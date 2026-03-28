# Shorts Pipeline Upgrade — Claude Code Instructions

## Summary

Upgrade the shorts pipeline script/visual quality. Three drop-in file replacements + two integration tasks.

## Step 1: Replace these 3 files (drop-in, same API)

The upgraded files are in `/mnt/user-data/outputs/` or can be copied from below. Replace:

- `api/lib/narrativeGenerator.js` — Hook-first, two-pass script generation with revision pass
- `api/lib/sceneDirector.js` — Continuity-aware (continuous vs independent mode based on `framework.frameChain`)
- `api/lib/visualPromptComposer.js` — Coherent single-paragraph prompts instead of period-separated fragments

### narrativeGenerator.js changes:
- Pass 1: Generate hook independently (dedicated LLM call, higher temp for creativity)
- Pass 2: Generate full narrative with locked hook as constraint
- Pass 3: Revision pass that tightens word count, kills 40+ banned cliché patterns, checks continuity
- 40+ banned phrases checked post-generation (not just 6 like before)
- Good/bad hook examples by pattern type (story-open, question, mystery-reveal, contrarian, list-countdown)
- Hook_line set programmatically after generation (same external API)

### sceneDirector.js changes:
- `directScenes()` now returns `{ keyframes, sceneCount, mode }` where mode is `'continuous'` or `'independent'`
- `framework.frameChain === true` → continuous mode → N+1 boundary keyframes (generated in batches of 3 with overlap context for quality)
- `framework.frameChain === false` → independent mode → N scene keyframes + 1 dummy final (each visually independent, no I2I chain)
- Each keyframe includes `continuity_anchors` field for visual consistency
- New export: `refinePromptWithVisualFeedback()` for optional visual feedback loop

### visualPromptComposer.js changes:
- `composePrompts()` now returns `{ imagePrompt, motionPrompt, negativePrompt }` (added negativePrompt)
- New export: `composeIndependentPrompt()` for non-continuous scenes
- `composeVideoPrompt()` now takes optional `{ isFLF: true }` for motion-focused FLF prompts
- Uses `mergeClause()` for natural comma-separated flow instead of period-separated fragments
- Framework defaults only added when director's prompt is missing the concept (fuzzy match)

## Step 2: Update shortsPipeline.js

### 2a. Update import

Change:
```js
import { composePrompts, composeVideoPrompt } from './visualPromptComposer.js';
```
To:
```js
import { composePrompts, composeIndependentPrompt, composeVideoPrompt } from './visualPromptComposer.js';
```

### 2b. After directScenes() call, capture mode

Find the `directScenes()` call (around step 5). Change:
```js
const { keyframes } = await directScenes({
```
To:
```js
const { keyframes, mode: directionMode } = await directScenes({
```

Add after:
```js
const useI2IChain = directionMode === 'continuous';
console.log(`[shortsPipeline] Direction mode: ${directionMode}, I2I chain: ${useI2IChain}`);
```

### 2c. Branch the V3 FLF path

In the V3 FLF section (the `if (useFirstLastFrame) {` block), wrap the existing I2I chain code in `if (useI2IChain) { ... }` and add an `else` branch for independent mode:

```js
if (useFirstLastFrame) {
  if (useI2IChain) {
    // ═══ EXISTING V3 CODE: I2I keyframe chain → parallel FLF video ═══
    // ... keep ALL existing I2I chain code exactly as-is ...
  } else {
    // ═══ INDEPENDENT: parallel T2I per scene → parallel FLF video ═══
    console.log(`[shortsPipeline] Independent mode: generating ${sceneCount} scene images via parallel T2I`);

    // Generate ALL first frames in parallel (no I2I chain)
    const firstFramePromises = alignedBlocks.map((block, i) => {
      const { imagePrompt, negativePrompt } = composeIndependentPrompt({
        sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionHint: keyframes[i].motionHint },
        visualStyle, visualStylePrompt,
        frameworkDefaults: framework?.sceneDefaults,
        aspectRatio, loraConfigs,
      });
      return withRetry(
        () => generateImageV2(resolvedImageModel || 'fal_flux', imagePrompt, aspectRatio, keys, supabase, {
          loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
        }),
        { maxAttempts: 2, baseDelayMs: 2000 }
      ).catch(err => { console.error(`[shortsPipeline] Independent scene ${i + 1} first frame failed: ${err.message}`); return null; });
    });

    const firstFrameResults = await Promise.allSettled(firstFramePromises);
    for (let i = 0; i < alignedBlocks.length; i++) {
      keyframeImageUrls[i] = firstFrameResults[i].status === 'fulfilled' ? firstFrameResults[i].value : null;
    }

    // Generate ALL last frames in parallel (independent T2I, not I2I from first frame)
    const lastFramePromises = alignedBlocks.map((block, i) => {
      if (!keyframeImageUrls[i]) return Promise.resolve(null);
      const nextKf = keyframes[i + 1] || keyframes[i];
      const { imagePrompt: lastPrompt } = composeIndependentPrompt({
        sceneDirection: { imagePrompt: nextKf.imagePrompt, motionHint: '' },
        visualStyle, visualStylePrompt,
        frameworkDefaults: framework?.sceneDefaults,
        aspectRatio, loraConfigs,
      });
      return withRetry(
        () => generateImageV2(resolvedImageModel || 'fal_flux', lastPrompt, aspectRatio, keys, supabase, {
          loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
        }),
        { maxAttempts: 2, baseDelayMs: 2000 }
      ).catch(err => { console.error(`[shortsPipeline] Independent scene ${i + 1} last frame failed: ${err.message}`); return null; });
    });

    const lastFrameResults = await Promise.allSettled(lastFramePromises);
    for (let i = 0; i < alignedBlocks.length; i++) {
      keyframeImageUrls[i + 1] = lastFrameResults[i].status === 'fulfilled' ? lastFrameResults[i].value : null;
    }

    characterRef = keyframeImageUrls[0];
    console.log(`[shortsPipeline] Independent mode: ${keyframeImageUrls.filter(Boolean).length}/${sceneCount * 2} frames generated`);
  }

  // ... rest of FLF video generation (checkpoint + parallel video firing) stays the same ...
```

### 2d. FLF video prompt improvement

In the FLF video generation section where you build the `prompt` variable for each scene's video, change:
```js
const prompt = composedMotion || motionPrompt;
```
To:
```js
const prompt = composeVideoPrompt(
  keyframes[i].imagePrompt,
  composedMotion || motionPrompt,
  { isFLF: true }
);
```

## Step 3: Apply upgraded scene defaults to videoStyleFrameworks.js

The file `upgradedSceneDefaults.js` (in outputs or at `/mnt/user-data/outputs/upgradedSceneDefaults.js`) contains an object `UPGRADED_SCENE_DEFAULTS` with keys matching framework IDs.

For EACH framework in `VIDEO_STYLE_FRAMEWORKS`, replace its `sceneDefaults` object with the matching entry from `UPGRADED_SCENE_DEFAULTS`.

Pattern:
```
For key in UPGRADED_SCENE_DEFAULTS:
  Find VIDEO_STYLE_FRAMEWORKS[key].sceneDefaults in videoStyleFrameworks.js
  Replace the { lightingDefault, colorPaletteDefault, cameraDefault } object
```

There are ~60 frameworks with matching entries. The defaults are now specific with Kelvin temperatures, hex color values, focal lengths in mm, and specific lighting descriptions instead of generic "cinematic, natural lighting."

## Step 4: (Optional) Pass negativePrompt through in modelRegistry.js

Currently only `fal_kling_img` and `fal_ideogram` use `DEFAULT_NEGATIVE_PROMPT`. Update the other image models that support it:

In each model's `buildBody`, add negative_prompt from opts:
```js
// For models that support negative_prompt (Flux, SeeDream, Nano Banana):
buildBody: (prompt, size, opts) => ({
  prompt,
  image_size: size,
  num_inference_steps: 28,
  ...(opts.loras?.length && { loras: opts.loras }),
  ...(opts.negativePrompt && { negative_prompt: opts.negativePrompt }),
}),
```

Models that DON'T support negative_prompt (skip these): `fal_imagen4`, `fal_grok`, `wavespeed`.

## Testing

1. Test a CONTINUOUS framework (e.g., `personal_journey`, `frameChain: true`):
   - Verify I2I chain generates visually consistent keyframes
   - Check console for: `[shortsPipeline] Direction mode: continuous, I2I chain: true`
   - Check console for: `[narrativeGenerator] Pass 1/2/3` logs

2. Test an INDEPENDENT framework (e.g., `top_x_countdown`, `frameChain: false`):
   - Verify each scene's image is visually distinct (different subjects per item)
   - Check console for: `[shortsPipeline] Direction mode: independent, I2I chain: false`
   - Verify no I2I chain was used (no `KF[1] I2I` logs)

3. Script quality checks:
   - Hook should be specific with a concrete detail (number, name, place)
   - No clichés from the banned list in the final narration
   - Word count within ±8 of target
