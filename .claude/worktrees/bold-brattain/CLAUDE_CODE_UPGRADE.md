# Pipeline V2 Upgrade — Claude Code Instructions

## WHAT'S ALREADY DONE (files already replaced):
- ✅ `api/lib/narrativeGenerator.js` — Hook-first, two-pass script generation
- ✅ `api/lib/sceneDirector.js` — Continuous vs independent mode (returns `mode` field)
- ✅ `api/lib/visualPromptComposer.js` — Coherent prompts, negativePrompt, composeIndependentPrompt

## WHAT YOU NEED TO DO:

---

### 1. Update `shortsPipeline.js` — Add independent mode branching

The new `directScenes()` returns `{ keyframes, sceneCount, mode }` where mode is `'continuous'` or `'independent'`.

**Step A: Update the directScenes call (around line ~220) to capture `mode`:**

Change:
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

**Step B: Add the independent path for V3 FLF mode.**

Currently the V3 FLF `if (useFirstLastFrame)` block always runs an I2I chain. Wrap the existing I2I chain code in `if (useI2IChain)` and add an `else` block for independent mode.

The independent path should:
1. Generate ALL scene first-frame images in parallel via T2I (not I2I chain)
2. Generate ALL scene last-frame images in parallel via T2I (not I2I from first frame)
3. Then fire all FLF videos in parallel (same as current code)

Here's the independent mode code to add inside `if (useFirstLastFrame)` BEFORE the existing I2I chain:

```js
if (useI2IChain) {
  // ... EXISTING I2I chain code stays here unchanged ...
} else {
  // ═══ INDEPENDENT: T2I per scene — no I2I chain ═══
  console.log(`[shortsPipeline] Phase A (independent): Generating ${sceneCount} first + last frames via T2I in parallel`);
  
  // Generate all first-frame images in parallel
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
    ).catch(err => {
      console.error(`[shortsPipeline] Independent scene ${i + 1} first frame failed: ${err.message}`);
      return null;
    });
  });
  
  const firstResults = await Promise.allSettled(firstFramePromises);
  for (let i = 0; i < alignedBlocks.length; i++) {
    keyframeImageUrls[i] = firstResults[i].status === 'fulfilled' ? firstResults[i].value : null;
  }
  
  // Generate all last-frame images in parallel (independent T2I, NOT I2I from first)
  const lastFramePromises = alignedBlocks.map((block, i) => {
    if (!keyframeImageUrls[i]) return Promise.resolve(null);
    
    const nextKfPrompt = keyframes[i + 1]?.imagePrompt || keyframes[i].imagePrompt;
    const { imagePrompt: lastPrompt } = composeIndependentPrompt({
      sceneDirection: { imagePrompt: nextKfPrompt, motionHint: '' },
      visualStyle, visualStylePrompt,
      frameworkDefaults: framework?.sceneDefaults,
      aspectRatio, loraConfigs,
    });
    
    return withRetry(
      () => generateImageV2(resolvedImageModel || 'fal_flux', lastPrompt, aspectRatio, keys, supabase, {
        loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
      }),
      { maxAttempts: 2, baseDelayMs: 2000 }
    ).catch(err => {
      console.error(`[shortsPipeline] Independent scene ${i + 1} last frame failed: ${err.message}`);
      return null;
    });
  });
  
  const lastResults = await Promise.allSettled(lastFramePromises);
  for (let i = 0; i < alignedBlocks.length; i++) {
    keyframeImageUrls[i + 1] = lastResults[i].status === 'fulfilled' ? lastResults[i].value : null;
  }
  
  characterRef = keyframeImageUrls[0];
  console.log(`[shortsPipeline] Independent frames: ${keyframeImageUrls.filter(Boolean).length}/${keyframeCount} generated`);
}
```

**Step C: Update the import at the top of shortsPipeline.js:**

Change:
```js
import { composePrompts, composeVideoPrompt } from './visualPromptComposer.js';
```
To:
```js
import { composePrompts, composeIndependentPrompt, composeVideoPrompt } from './visualPromptComposer.js';
```

**Step D: Update FLF video prompt composition to use isFLF flag.**

In the FLF video generation section (the `videoPromises` map), where the prompt is composed, change:
```js
const prompt = composedMotion || motionPrompt;
```
To:
```js
const prompt = composeVideoPrompt(keyframes[i].imagePrompt, composedMotion || motionPrompt, { isFLF: true });
```

---

### 2. Update `videoStyleFrameworks.js` — Replace all sceneDefaults

For EVERY framework in VIDEO_STYLE_FRAMEWORKS, replace the `sceneDefaults` object with the specific version below. The key difference: old defaults were vague ("cinematic, natural lighting"), new ones are specific with Kelvin temperatures, hex colors, and focal lengths.

Here are the replacements (apply to each matching framework ID):

**personal_journey:**
```js
sceneDefaults: {
  lightingDefault: 'single soft key light from camera-left at 45 degrees, 3200K tungsten warmth, subtle fill from a window source camera-right, gentle rim light separating subject from background',
  colorPaletteDefault: 'warm amber and honey tones (#C4956A to #E8C07A), desaturated backgrounds with selective warm highlights on subject, deep brown shadows',
  cameraDefault: 'medium close-up at 50mm f/2.0, shallow depth of field with 2-meter focus distance, subtle handheld drift, eye-level angle',
},
```

**origin_story:**
```js
sceneDefaults: {
  lightingDefault: 'evolving lighting: early scenes use single bare-bulb overhead 4000K, middle scenes add warm side fill, final scenes use full three-point setup with golden key at 3500K',
  colorPaletteDefault: 'muted desaturated palette (saturation 30-40%) in early scenes shifting to vibrant warm tones (saturation 70-80%) by final scene, consistent blue-gray shadows throughout',
  cameraDefault: 'starts wide at 24mm establishing context, progressively tightens to 85mm intimate portraits, slow dolly-in movement within scenes',
},
```

**mini_documentary:**
```js
sceneDefaults: {
  lightingDefault: 'dramatic Rembrandt lighting: strong key from 45 degrees camera-left, 4500K daylight balanced, deep shadows on short side of face, narrow strip of fill at 20% key intensity',
  colorPaletteDefault: 'desaturated cool base (saturation 25-35%) with selective warm highlights in teal-orange split toning, deep charcoal shadows (#2B2B2B), accent warmth only on subject',
  cameraDefault: 'slow push-in at 85mm f/1.8, extremely shallow depth of field, tripod-smooth movement, slightly below eye level for authority',
},
```

**day_in_the_life:**
```js
sceneDefaults: {
  lightingDefault: 'natural available light only: blue pre-dawn 7000K shifting to warm midday 5500K, golden afternoon 3800K, and warm indoor tungsten 2800K evening, no artificial fill',
  colorPaletteDefault: 'authentic ungraded look with slight warmth boost, natural skin tones, green and blue environmental colors, no heavy color grading',
  cameraDefault: 'handheld at 24mm f/2.8 for wide POV, occasional 35mm for medium shots, natural movement and slight rotation, chest-height angle',
},
```

**before_after:**
```js
sceneDefaults: {
  lightingDefault: 'matched lighting setups: BEFORE uses flat overhead fluorescent at 5000K (unflattering), AFTER uses sculpted three-point with 3500K warm key and beauty fill, same camera position',
  colorPaletteDefault: 'BEFORE: desaturated cool-gray (saturation 20%, cool WB), AFTER: vibrant warm saturated (saturation 80%, warm WB), dramatic contrast between the two states',
  cameraDefault: 'locked tripod at 50mm for matched comparison angles, identical framing in before and after, slow motorized reveal pan for the after',
},
```

**explainer_story:**
```js
sceneDefaults: {
  lightingDefault: 'bright clean key light from directly above-forward at 5500K daylight, large soft source creating minimal shadows, subtle blue-tinted fill from below for modern tech feel',
  colorPaletteDefault: 'clean modern palette: white and light gray base (#F0F0F0), teal accent (#2EC4B6), warm highlight (#E8B059), high contrast but not harsh',
  cameraDefault: 'medium shot at 35mm f/2.8, smooth motorized zoom transitions between scenes, slightly above eye level for approachable authority',
},
```

**emotional_tribute:**
```js
sceneDefaults: {
  lightingDefault: 'diffused golden window light at 2800K, heavy atmosphere with visible dust particles, light wrapping softly around subject, deep velvet shadows, no hard edges anywhere',
  colorPaletteDefault: 'warm sepia-shifted palette: skin tones pushed toward peach and rose, backgrounds in deep chocolate and burgundy, golden highlights with slight halation bloom',
  cameraDefault: 'slow dolly at 85mm f/1.4, extremely shallow depth of field creating painterly bokeh, below eye level looking slightly up with reverence',
},
```

**top_x_countdown:**
```js
sceneDefaults: {
  lightingDefault: 'bold high-contrast lighting: strong directional key at 4500K from 60 degrees, minimal fill, hard shadows creating graphic shapes, color gel accents matching item theme',
  colorPaletteDefault: 'high saturation bold palette: deep navy background (#0A1628), bright accent per item rotating through electric blue (#00B4D8), hot coral (#FF6B6B), vivid lime (#A8E06C), gold (#FFD166)',
  cameraDefault: 'snap zoom at 35mm starting position, quick 2x punch-in for emphasis on each item, dynamic tilted angles, fast reframe between items',
},
```

**everything_you_need_to_know:**
```js
sceneDefaults: {
  lightingDefault: 'high-key even lighting at 5600K daylight, large overhead softbox feel, minimal shadows for maximum clarity, slight warm edge light for dimension',
  colorPaletteDefault: 'infographic-clean palette: pure white base, dark navy text area (#1B2838), accent colors coded to section type: blue for facts (#4A90D9), green for data (#2ECC71), orange for key stats (#F39C12)',
  cameraDefault: 'tight framing at 50mm for info-dense compositions, clean geometric framing with space for text overlays, quick snap cuts between sections',
},
```

**Continue this pattern for ALL remaining frameworks.** The full list of upgraded defaults is available in the file I generated at `/mnt/user-data/outputs/upgradedSceneDefaults.js` — use that as reference for the remaining ~50 frameworks.

If you want to do this programmatically, you can import the UPGRADED_SCENE_DEFAULTS object and apply them in a loop, or just do find-and-replace on each framework's sceneDefaults block.

---

### 3. OPTIONAL: Pass negativePrompt through modelRegistry.js

Several image models in `modelRegistry.js` already use `DEFAULT_NEGATIVE_PROMPT` in their `buildBody` (like `fal_kling_img` and `fal_ideogram`). But others like `fal_flux`, `fal_seedream`, `fal_nano_banana` don't.

For models that support negative prompts, update their `buildBody` to accept it from opts:

```js
// Example for fal_seedream:
buildBody: (prompt, size, opts) => ({
  prompt, image_size: size, num_images: 1, enable_safety_checker: true,
  ...(opts.negativePrompt && { negative_prompt: opts.negativePrompt }),
}),
```

Check each model's API docs to see if it supports `negative_prompt` before adding it.

---

## TESTING

1. **Test a continuous framework** (e.g., `personal_journey`, `frameChain: true`):
   - Look for: `[sceneDirector] Continuous mode:` in logs
   - Look for: `[shortsPipeline] Direction mode: continuous, I2I chain: true`
   - Verify I2I chain generates visually consistent keyframes
   - Verify hook is specific (not generic)

2. **Test an independent framework** (e.g., `top_x_countdown`, `frameChain: false`):
   - Look for: `[sceneDirector] Independent mode:` in logs
   - Look for: `[shortsPipeline] Direction mode: independent, I2I chain: false`
   - Verify each scene's image is visually distinct (no I2I chain)
   - Verify images match their scene's narration

3. **Check narrative quality**:
   - Look for: `[narrativeGenerator] Pass 1:`, `Pass 2:`, `Pass 3:` in logs
   - Verify hook is under 25 words with a concrete detail
   - Verify no clichés in the output
   - Verify word count is within ±8 of target
