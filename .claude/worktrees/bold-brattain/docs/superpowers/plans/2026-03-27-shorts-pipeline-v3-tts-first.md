# Shorts Pipeline v3: TTS-First Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Shorts pipeline around a TTS-first architecture where the voiceover drives all timing decisions, replace Lyria 2 music with Beatoven (duration-aware), and massively improve script/prompt quality.

**Architecture:** Script → TTS → Whisper timestamps → scene boundary solver → (Beatoven music ∥ image+video generation) → assemble → caption. TTS audio is the master clock. Word-level timestamps from Whisper determine where to split scenes at model-valid boundaries (4s/6s/8s for Veo, 3-15s for Kling). Music and video generation run in parallel since both only need the TTS duration.

**Tech Stack:** Express, FAL.ai (Gemini TTS, Whisper, Beatoven, ffmpeg-api), OpenAI GPT-4.1-mini (script), Supabase

---

## Key Design Decisions

1. **TTS is the master clock.** Video clips are generated to fill TTS-defined scene durations, not the other way around. If a video model can only make 8s clips but a scene is 12s, we generate one 8s clip + one 4s clip for that scene.
2. **Scene boundaries snap to model-valid durations.** Whisper provides word-level timestamps. We find the closest word boundary to each model-valid breakpoint (e.g., every 6s for Veo) and split there. This means the script's scene count is a *suggestion* — actual scene count is determined by TTS duration ÷ model clip length.
3. **Beatoven replaces Lyria 2.** Beatoven (`beatoven/music-generation` on FAL) respects duration requests and produces higher-quality results. Lyria 2 stays as fallback.
4. **Music runs in parallel with video generation.** Both only need TTS duration — no dependency between them.
5. **`generateTimestamps()` already exists** in `voiceoverGenerator.js` but is never called. We wire it in. (`mapWordsToScenes()` also exists but is superseded by the new `sceneBoundarySolver` which is model-duration-aware.)

---

## Current Pipeline Flow (BROKEN)

```
Framework → Duration Solver → Script (word budget from clip durations) → TTS → Video per scene → Music → Assemble → Caption
                                        ↑ WRONG: word budget based on clip lengths, not target duration
                                                            ↑ WRONG: clip durations don't match TTS
                                                                              ↑ WRONG: Lyria 2 ignores duration
```

## New Pipeline Flow (TTS-FIRST)

```
Framework → Script (word budget from TARGET duration) → TTS → Whisper timestamps
                                                         ↓
                                              Scene Boundary Solver (snap to model-valid durations)
                                                         ↓
                                              ┌──────────┴──────────┐
                                              ↓                     ↓
                                    Beatoven Music              Images + Video
                                    (parallel, knows            (per scene, frame-chained)
                                     exact duration)                   ↓
                                              ↓                     ↓
                                              └──────────┬──────────┘
                                                         ↓
                                                    Assemble → Caption → Draft
```

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `api/lib/sceneBoundarySolver.js` | Take Whisper word timestamps + model duration constraints → compute scene boundaries snapped to model-valid breakpoints |
| *(none — Beatoven added directly to `pipelineHelpers.js`)* | |

### Modified Files (Major)
| File | Changes |
|------|---------|
| `api/lib/shortsPipeline.js` | Complete rewrite of step ordering: script → TTS → timestamps → scene boundaries → (music ∥ video) → assemble. Remove `buildTtsStyleInstructions`, `expandMusicMood` (moved/replaced) |
| `api/lib/scriptGenerator.js` | Major prompt overhaul: better narration quality, continuity, word budget from target duration, richer visual prompts |
| `api/lib/pipelineHelpers.js` | Update `assembleShort()` to accept TTS-derived scene durations, add Beatoven to `generateMusic()` |
| `api/lib/durationSolver.js` | Export `MODEL_DURATIONS` so `sceneBoundarySolver.js` can import it (single source of truth) |

### Modified Files (Minor)
| File | Changes |
|------|---------|
| `api/lib/voiceoverGenerator.js` | No changes — `generateTimestamps()` already exists, just needs to be called |
| `api/lib/modelRegistry.js` | Add Beatoven model entry |
| `api/shorts/reassemble.js` | No changes needed — `assembleShort()` new `ttsDuration` param defaults to `null`, existing callers unaffected |

---

## Task Dependency Graph

```
Task 1 (Scene Boundary Solver) ──────────────────────────────┐
                                                              │
Task 2 (Script Generator Overhaul) ──────────────────────┐   │
                                                          │   │
Task 3 (Beatoven Music Generator) ──────────────────┐   │   │
                                                     │   │   │
Task 4 (Pipeline Rewrite) ◄──────────────────────────┴───┴───┘
                                                     │
Task 5 (Assembly Update) ◄──────────────────────────┘
                                                     │
Task 6 (Integration Verification) ◄──────────────────┘
```

**Parallelizable:** Tasks 1, 2, 3 can all run concurrently. Task 4 needs all three. Task 5 needs Task 4.

---

## Task 1: Scene Boundary Solver

**Files:**
- Create: `api/lib/sceneBoundarySolver.js`
- Modify: `api/lib/durationSolver.js` (export `MODEL_DURATIONS` so it can be imported)
- Reference: `api/lib/modelRegistry.js` (for valid duration values per model)

This module takes Whisper word timestamps and a video model key, then computes optimal scene split points that snap to model-valid durations.

- [ ] **Step 1: Create `api/lib/sceneBoundarySolver.js`**

```javascript
// api/lib/sceneBoundarySolver.js
//
// Given word-level timestamps from Whisper and a video model's duration constraints,
// compute scene boundaries that:
// 1. Snap to model-valid durations (e.g., 4s/6s/8s for Veo)
// 2. Split at word boundaries (never mid-word)
// 3. Respect framework scene hints (if provided) as soft preferences
// 4. Maximize clip duration (prefer fewer, longer clips)

// Import from durationSolver — single source of truth for model duration constraints
import { MODEL_DURATIONS } from './durationSolver.js';

/**
 * Get the valid clip durations for a model, sorted descending (prefer longer).
 * For range models, generates integer values within range.
 * For fixed models, returns single value.
 */
function getValidDurations(modelKey) {
  const config = MODEL_DURATIONS[modelKey];
  if (!config) return [5, 8]; // safe fallback

  switch (config.type) {
    case 'discrete':
      return [...config.values].sort((a, b) => b - a); // descending
    case 'range': {
      const vals = [];
      for (let d = config.max; d >= config.min; d--) vals.push(d);
      return vals;
    }
    case 'fixed':
      return [config.value];
  }
}

/**
 * Find the word whose timestamp is closest to a target time.
 * Returns the index of the word that should START the next scene.
 *
 * @param {Array<{ word, start, end }>} words
 * @param {number} targetTime - seconds
 * @returns {number} word index
 */
function findClosestWordBoundary(words, targetTime) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < words.length; i++) {
    const dist = Math.abs(words[i].start - targetTime);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Solve scene boundaries from TTS word timestamps and model constraints.
 *
 * Strategy: greedily allocate the longest valid clip duration that fits,
 * snapping to the nearest word boundary. This produces fewer, longer clips.
 *
 * @param {Array<{ word: string, start: number, end: number }>} words - Whisper timestamps
 * @param {number} totalDuration - Total TTS audio duration in seconds
 * @param {string} modelKey - Video model key (e.g., 'fal_veo3')
 * @param {Array<{ label, beat }>} [frameworkScenes] - Optional framework scene hints (soft preference)
 * @returns {{
 *   scenes: Array<{
 *     clipDuration: number,
 *     startTime: number,
 *     endTime: number,
 *     startWordIdx: number,
 *     endWordIdx: number,
 *     narration: string,
 *     frameworkLabel: string | null
 *   }>,
 *   totalClipDuration: number
 * }}
 */
export function solveSceneBoundaries(words, totalDuration, modelKey, frameworkScenes = null) {
  const validDurations = getValidDurations(modelKey);
  const maxClip = validDurations[0];
  const minClip = validDurations[validDurations.length - 1];

  const scenes = [];
  let currentTime = 0;
  let currentWordIdx = 0;
  let sceneIdx = 0;

  while (currentTime < totalDuration - 0.5 && currentWordIdx < words.length) {
    const remaining = totalDuration - currentTime;

    // Pick the longest valid duration that doesn't overshoot remaining time
    // (or if only one clip left, use what fits best)
    let clipDuration = minClip;
    for (const d of validDurations) {
      if (d <= remaining + 0.5) { // 0.5s tolerance
        clipDuration = d;
        break; // validDurations is sorted descending, so first fit is longest
      }
    }

    // If remaining time is less than min clip, extend last scene to cover it
    if (remaining < minClip && scenes.length > 0) {
      // Extend previous scene's end time to cover remaining audio
      const lastScene = scenes[scenes.length - 1];
      lastScene.endTime = totalDuration;
      lastScene.endWordIdx = words.length - 1;
      lastScene.narration = words.slice(lastScene.startWordIdx, words.length).map(w => w.word).join(' ');
      break;
    }

    const targetEndTime = currentTime + clipDuration;
    const endWordIdx = findClosestWordBoundary(words, targetEndTime);

    // Ensure we advance at least one word
    const actualEndWordIdx = Math.max(endWordIdx, currentWordIdx + 1);
    const actualEndTime = actualEndWordIdx < words.length
      ? words[actualEndWordIdx].start
      : totalDuration;

    // Get framework label if available
    const frameworkLabel = frameworkScenes?.[sceneIdx]?.label
      || frameworkScenes?.[Math.min(sceneIdx, (frameworkScenes?.length || 1) - 1)]?.label
      || null;

    scenes.push({
      clipDuration,
      startTime: currentTime,
      endTime: actualEndTime,
      startWordIdx: currentWordIdx,
      endWordIdx: actualEndWordIdx - 1,
      narration: words.slice(currentWordIdx, actualEndWordIdx).map(w => w.word).join(' '),
      frameworkLabel,
    });

    currentTime = actualEndTime;
    currentWordIdx = actualEndWordIdx;
    sceneIdx++;
  }

  // Handle any remaining words not covered
  if (currentWordIdx < words.length && scenes.length > 0) {
    const lastScene = scenes[scenes.length - 1];
    lastScene.endTime = totalDuration;
    lastScene.endWordIdx = words.length - 1;
    lastScene.narration = words.slice(lastScene.startWordIdx, words.length).map(w => w.word).join(' ');
  }

  const totalClipDuration = scenes.reduce((sum, s) => sum + s.clipDuration, 0);
  console.log(`[sceneBoundarySolver] ${scenes.length} scenes, total clip duration ${totalClipDuration}s for ${totalDuration}s TTS`);

  return { scenes, totalClipDuration };
}
```

- [ ] **Step 1b: Export `MODEL_DURATIONS` from `durationSolver.js`**

In `api/lib/durationSolver.js`, change the `const` to `export const`:
```javascript
export const MODEL_DURATIONS = {
```
This is the single source of truth — `sceneBoundarySolver.js` imports from here.

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/sceneBoundarySolver.js && node -c api/lib/durationSolver.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/sceneBoundarySolver.js api/lib/durationSolver.js
git commit -m "feat: add scene boundary solver for TTS-first pipeline"
```

---

## Task 2: Script Generator Overhaul

**Files:**
- Modify: `api/lib/scriptGenerator.js`

The script generator prompt needs a complete rewrite for quality. Key changes:
- Word budget ALWAYS based on target duration (not clip durations)
- Strong narration continuity rules
- Per-scene word targets shown to GPT
- Better visual prompt instructions
- Banned cliches expanded
- Scene structure follows framework beats naturally

- [ ] **Step 1: Rewrite the system prompt builder in `scriptGenerator.js`**

Replace the `CRITICAL RULES` section and surrounding prompt construction. The new prompt must:

1. **Word budget from target duration only** — `totalWords = Math.round(effectiveDuration * 2.7)`. Never use `lockedDurations` for word budget (those are clip durations, not scene durations).

2. **Per-scene word targets** — Show GPT exactly how many words each scene needs:
   ```
   Scene 1 "Setup" (10-12s, ~30 words): Establish the world
   Scene 2 "Tension" (10-12s, ~30 words): Introduce the conflict
   ```

3. **Narration continuity block** — Add explicit rules:
   ```
   NARRATION CONTINUITY:
   - The narration is ONE continuous voiceover. Each scene picks up exactly where the last left off.
   - Never repeat information. Never contradict a previous scene. Build forward only.
   - Think of it as one monologue broken into chapters, not isolated paragraphs.
   ```

4. **Writing quality rules** — Replace generic "write like a creator" with:
   ```
   WRITING QUALITY:
   - Open with a hook that creates an information gap — make the viewer NEED to know the answer.
   - Every sentence must advance the story or deliver new information. Zero filler.
   - Use concrete details: specific numbers, names, places, dates. Never "some people say" or "many experts believe".
   - Vary sentence length. Short punches between longer setups. Never three long sentences in a row.
   - End with a satisfying payoff that delivers on the hook's promise. No vague "think about it" endings.
   ```

5. **Visual prompt quality** — Replace weak visual instructions with:
   ```
   VISUAL PROMPTS:
   - Each visual_prompt is a standalone AI image generation prompt. Be hyper-specific.
   - Include: subject, action, setting, lighting (direction + color temperature), camera angle, lens focal length, mood, color palette.
   - Example: "Close-up of weathered hands holding a glowing crystal sphere, warm golden light from below illuminating deep wrinkles, shallow depth of field at 85mm, dark moody background with teal fog, cinematic color grading"
   - NEVER: "A person in a room" or "Something interesting happening" — these produce garbage.
   - NEVER include text, words, typography, or UI elements in visual prompts.
   ```

6. **Post-generation word count safety net** — After GPT returns, count words. If `narration_full` exceeds `totalWords + 15`, trim to budget and redistribute across scenes proportionally.

- [ ] **Step 2: Update the Zod schema description for narration_segment**

Change from hardcoded "15-25 words" to dynamic:
```javascript
narration_segment: z.string().describe('Scene narration — word count must match the per-scene target at ~2.7 words/sec'),
```

- [ ] **Step 3: Verify syntax**

Run: `node -c api/lib/scriptGenerator.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/lib/scriptGenerator.js
git commit -m "feat: overhaul script generator prompts for quality and continuity"
```

---

## Task 3: Beatoven Music Generator

**Files:**
- Modify: `api/lib/pipelineHelpers.js` (add `beatoven` model to `generateMusic()`)

Beatoven (`beatoven/music-generation` on FAL) respects duration requests and produces better results than Lyria 2. Add it as a model option and make it the default.

- [ ] **Step 1: Add Beatoven to `generateMusic()` in `pipelineHelpers.js`**

Add a new model branch before the Lyria 2 block:

```javascript
// --- Beatoven (default) ---
if (model === 'beatoven') {
  const res = await fetch(`${FAL_BASE}/beatoven/music-generation`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: moodPrompt.slice(0, 300),
      negative_prompt: 'vocals, singing, speech, noise, distortion',
      duration: clampedDuration,
      refinement: 100,
      creativity: 16,
    }),
  });
  if (!res.ok) {
    console.warn('[pipelineHelpers] Beatoven music gen failed, falling back to Lyria 2:', await res.text());
    return generateMusic(moodPrompt, durationSeconds, keys, supabase, 'fal_lyria2');
  }
  const queueData = await res.json();
  if (!queueData.request_id) return null;
  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'beatoven/music-generation',
    keys.falKey,
    180,  // Beatoven can take longer
    4000
  );
  const audioUrl = output?.audio?.url || output?.audio_file?.url;
  if (!audioUrl) return null;
  return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
}
```

- [ ] **Step 2: Change default model parameter from `'fal_lyria2'` to `'beatoven'`**

```javascript
export async function generateMusic(moodPrompt, durationSeconds = 30, keys, supabase, model = 'beatoven') {
```

- [ ] **Step 3: Add a richer music prompt builder**

Add a helper function above `generateMusic`:

```javascript
/**
 * Build a rich music prompt from a framework mood label.
 * Beatoven handles detailed descriptions well — give it genre, instruments, feel.
 */
export function buildMusicPrompt(mood, category = 'story') {
  if (!mood) return 'Cinematic background music with soft dynamics, instrumental only';

  // Start with the mood, add instrumental emphasis and category-aware dynamics
  const paceHint = category === 'fast_paced'
    ? 'driving rhythm, energetic pace, punchy transitions between sections'
    : 'flowing dynamics, natural builds and releases, smooth transitions';

  return `${mood}. Instrumental only, no vocals. ${paceHint}. Suitable as background music under narration — not overpowering, with space for voice.`;
}
```

- [ ] **Step 4: Verify syntax**

Run: `node -c api/lib/pipelineHelpers.js`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/lib/pipelineHelpers.js
git commit -m "feat: add Beatoven music generation with duration support, Lyria 2 fallback"
```

---

## Task 4: Pipeline Rewrite — TTS-First Architecture

**Files:**
- Modify: `api/lib/shortsPipeline.js` (major rewrite of step ordering and logic)
- Reference: `api/lib/voiceoverGenerator.js` (existing `generateTimestamps`, `mapWordsToScenes`)
- Reference: `api/lib/sceneBoundarySolver.js` (new, from Task 1)

This is the core change. The pipeline's step ordering completely changes:

**Old:** Framework → Duration Solver → Script → TTS → Images+Video → Music → Assemble → Caption
**New:** Framework → Script → TTS → Whisper Timestamps → Scene Boundaries → (Music ∥ Images+Video) → Assemble → Caption

- [ ] **Step 1: Update imports at top of `shortsPipeline.js`**

Add new imports:
```javascript
import { generateTimestamps } from './voiceoverGenerator.js';
import { solveSceneBoundaries } from './sceneBoundarySolver.js';
import { buildMusicPrompt } from './pipelineHelpers.js';
```

Keep the `solveDurations` import — it's used as a fallback when Whisper fails.

- [ ] **Step 2: Remove `buildTtsStyleInstructions()` and `expandMusicMood()` helpers**

These were added as patches. They'll be replaced:
- TTS style instructions: keep `buildTtsStyleInstructions()` but move the "Do not drag words out" rule to be always appended, not conditional.
- Music mood: replaced by `buildMusicPrompt()` from pipelineHelpers.

Actually, keep `buildTtsStyleInstructions()` — it's working and solves a real problem. Just remove `expandMusicMood()` since `buildMusicPrompt()` replaces it.

- [ ] **Step 3: Rewrite the pipeline step ordering**

The new `runShortsPipeline` function should follow this sequence:

```
Step 0: Load Framework (unchanged)
Step 1: Generate Script (NO duration solver — word budget from target duration)
Step 2: Generate TTS Voiceover (unchanged — produces single MP3)
Step 3: [NEW] Whisper Timestamps — call generateTimestamps(voiceoverUrl, keys.falKey)
Step 4: [NEW] Scene Boundary Solver — call solveSceneBoundaries(words, ttsDuration, videoModel, frameworkScenes)
Step 5: [PARALLEL] Music Generation (Beatoven, using exact TTS duration) ∥ Image+Video per scene
Step 6: Assemble Video (clip durations from scene boundary solver)
Step 7: Burn Captions (unchanged)
Step 8: Save Draft (unchanged)
```

Key changes in each step:

**Step 1 (Script):** Remove `lockedDurations` from the `generateScript()` call. The script no longer needs model-specific duration info — it just targets the user's selected duration (60s/90s).

**Step 3 (Timestamps):** New step. MUST have Whisper fallback — if Whisper is down, the pipeline must not die:
```javascript
// ── Step 3: Extract word-level timestamps from TTS ───────────────────────
currentStep = 'analyzing_voiceover';
await updateJob({ current_step: 'analyzing_voiceover', completed_steps: 2 });
console.log('[shortsPipeline] Step 3: Extracting word timestamps via Whisper...');

let ttsWords = null;
let ttsDuration = video_length_preset;
try {
  const timestampResult = await withRetry(
    () => generateTimestamps(voiceoverUrl, keys.falKey),
    { maxAttempts: 2, baseDelayMs: 3000 }
  );
  ttsWords = timestampResult.words;
  ttsDuration = ttsWords.length > 0 ? ttsWords[ttsWords.length - 1].end : video_length_preset;
  console.log(`[shortsPipeline] Whisper: ${ttsWords.length} words, total duration ${ttsDuration.toFixed(1)}s`);
} catch (whisperErr) {
  console.warn(`[shortsPipeline] Whisper timestamps failed, falling back to framework durations: ${whisperErr.message}`);
  // ttsWords stays null — scene boundary solver will not be used,
  // pipeline falls back to old locked-duration approach below
}
```

**Step 4 (Scene Boundaries):** New step. Has a fallback path when Whisper failed:
```javascript
// ── Step 4: Solve scene boundaries from TTS timing ───────────────────────
const frameworkScenes = framework?.sceneStructure[video_length_preset]
  || framework?.sceneStructure[framework?.supportedDurations[0]]
  || null;

let solvedScenes;
let totalClipDuration;

if (ttsWords && ttsWords.length > 0) {
  // TTS-first path: use Whisper word timestamps to solve scene boundaries
  const result = solveSceneBoundaries(ttsWords, ttsDuration, videoModel || 'fal_veo3', frameworkScenes);
  solvedScenes = result.scenes;
  totalClipDuration = result.totalClipDuration;
  console.log(`[shortsPipeline] TTS-first: ${solvedScenes.length} scenes, ${totalClipDuration}s clips for ${ttsDuration.toFixed(1)}s TTS`);
} else {
  // Fallback path: Whisper failed — use old duration solver approach
  console.log('[shortsPipeline] Fallback: using framework durations (no Whisper data)');
  const durationRanges = frameworkScenes?.map(s => s.durationRange) || [[4, 8]];
  const lockedDurations = solveDurations(video_length_preset, durationRanges, videoModel || 'fal_veo3');
  solvedScenes = lockedDurations.map((dur, i) => ({
    clipDuration: dur,
    startTime: lockedDurations.slice(0, i).reduce((a, b) => a + b, 0),
    endTime: lockedDurations.slice(0, i + 1).reduce((a, b) => a + b, 0),
    startWordIdx: 0,
    endWordIdx: 0,
    narration: scriptResult.scenes[i]?.narration_segment || '',
    frameworkLabel: frameworkScenes?.[i]?.label || null,
  }));
  totalClipDuration = lockedDurations.reduce((a, b) => a + b, 0);
}
```

**Note:** When using the fallback path, keep `solveDurations` imported for this case only.

**Step 5 (Parallel Music + Video):** Launch music generation and video generation concurrently:
```javascript
// ── Step 5: Generate Music (parallel) + Images & Video (per scene) ───────
currentStep = 'generating_assets';
await updateJob({ current_step: 'generating_assets', completed_steps: 4 });

// Launch music in parallel — it only needs duration, not scene data
const musicMoodPrompt = buildMusicPrompt(
  framework?.musicMood || nicheTemplate?.music_mood,
  framework?.category
);
const musicPromise = enableBackgroundMusic
  ? withRetry(
      () => generateMusic(musicMoodPrompt, Math.ceil(ttsDuration) + 3, keys, supabase, 'beatoven'),
      { maxAttempts: 2, baseDelayMs: 5000 }
    ).catch(err => { console.warn('[shortsPipeline] Music generation failed:', err.message); return null; })
  : Promise.resolve(null);

// Generate images + video per scene (sequential for frame chaining)
for (let i = 0; i < solvedScenes.length; i++) {
  const scene = solvedScenes[i];
  // ... image generation, video animation using scene.clipDuration ...
  // Use scene.narration as context for visual prompt building
  // Frame chain: use lastFrameUrl from previous scene
}

// Await music (should be done by now, ran in parallel)
const musicUrl = await musicPromise;
```

**Image + Video per scene:** For each `solvedScene`, we need a visual prompt. The script's `scenes` array has `visual_prompt` per scene, but the solved scenes may have a different count (more scenes if TTS is long). Strategy:
- If `solvedScenes.length <= scriptResult.scenes.length`: map 1:1 to script scenes
- If `solvedScenes.length > scriptResult.scenes.length`: distribute script visual prompts across solved scenes (some scenes share a visual prompt, which is fine with frame chaining)

```javascript
// Map solved scenes to script visual prompts
function getVisualPromptForScene(solvedSceneIdx, solvedScenes, scriptScenes) {
  // Map proportionally — if 5 script scenes but 8 solved scenes,
  // script scene 0 covers solved scenes 0-1, etc.
  const ratio = scriptScenes.length / solvedScenes.length;
  const scriptIdx = Math.min(Math.floor(solvedSceneIdx * ratio), scriptScenes.length - 1);
  return scriptScenes[scriptIdx];
}
```

- [ ] **Step 4: Update scene asset checkpointing**

The per-scene checkpoint in `step_results` now stores the solved scene data:
```javascript
const sceneAsset = {
  image_url: imageUrl,
  video_url: clipUrl,
  first_frame_url: firstFrameUrl,
  last_frame_url: lastFrameUrl,
  voiceover_url: voiceoverUrl,
  clip_duration: scene.clipDuration,
  start_time: scene.startTime,
  end_time: scene.endTime,
  narration: scene.narration,
  framework_label: scene.frameworkLabel,
};
```

- [ ] **Step 5: Update assembleShort call**

Pass the solved clip durations instead of the old `actualDurations`:
```javascript
const clipDurations = solvedScenes.map(s => s.clipDuration);
const validClips = clips.filter(c => c.url).map(c => c.url);
assembledVideoUrl = await assembleShort(validClips, voiceoverUrl, musicUrl, keys.falKey, supabase, clipDurations, effectiveMusicVolume, ttsDuration);
```

- [ ] **Step 6: Verify syntax**

Run: `node -c api/lib/shortsPipeline.js`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add api/lib/shortsPipeline.js
git commit -m "feat: rewrite shorts pipeline to TTS-first architecture with parallel music"
```

---

## Task 5: Assembly Update

**Files:**
- Modify: `api/lib/pipelineHelpers.js` (`assembleShort` function)

The assembler needs to handle the case where total clip duration ≠ TTS duration. With TTS-first, clip durations should closely match TTS, but edge cases remain.

- [ ] **Step 1: Update `assembleShort` to use TTS duration as the master duration**

Currently `assembleShort` computes `totalDurationMs` from clip durations. Change it to accept an optional `ttsDuration` parameter that overrides:

```javascript
export async function assembleShort(videoUrls, voiceoverUrl, musicUrl, falKey, supabase, clipDurations = [], musicVolume = 0.15, ttsDuration = null) {
  // ... existing validation ...

  // Build video keyframes from clip durations
  let runningTimestamp = 0;
  const videoKeyframes = videoUrls.map((url, i) => {
    const durationMs = (clipDurations[i] || 8) * 1000;
    const kf = { url, timestamp: runningTimestamp, duration: durationMs };
    runningTimestamp += durationMs;
    return kf;
  });

  // Master duration: use TTS duration if provided, otherwise sum of clips
  const totalDurationMs = ttsDuration
    ? Math.ceil(ttsDuration * 1000)
    : runningTimestamp;

  // ... rest unchanged ...
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/pipelineHelpers.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/pipelineHelpers.js
git commit -m "feat: update assembleShort to accept TTS duration as master clock"
```

---

## Task 6: Integration Verification

**Files:**
- All modified files

- [ ] **Step 1: Full syntax check**

Run: `node -c api/lib/shortsPipeline.js && node -c api/lib/scriptGenerator.js && node -c api/lib/pipelineHelpers.js && node -c api/lib/sceneBoundarySolver.js && node -c api/lib/durationSolver.js`
Expected: All pass

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds (backend files aren't bundled by Vite, but this catches any frontend import issues)

- [ ] **Step 3: Server startup check**

Run: `npm run server` (start Express, verify no import errors at startup)
Expected: Server starts on port 3003 without crashes

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete TTS-first Shorts pipeline v3"
```

---

## Prompt Quality Reference

These are the specific prompt improvements that must be made. Refer to these when implementing Task 2 and Task 4.

### Script System Prompt — Required Sections

The system prompt sent to GPT for script generation must include ALL of these blocks:

```
WORD BUDGET (highest priority):
- Total: {totalWords} words (±10). Count carefully before responding.
- Per-scene targets shown in SCENE STRUCTURE below.
- At ~2.7 words/sec, {totalWords} words = {effectiveDuration}s of audio.

NARRATION CONTINUITY:
- This is ONE continuous voiceover, not separate paragraphs.
- Each scene picks up exactly where the previous ended.
- Never repeat, contradict, or re-introduce. Build forward only.

WRITING QUALITY:
- Open with an information gap — the viewer MUST need to know the answer.
- Every sentence advances the story or delivers new info. Zero filler.
- Use concrete details: specific numbers, names, places. Never "some experts" or "many people".
- Vary sentence rhythm. Short punches between longer setups.
- End with a payoff that delivers on the hook's promise.

VISUAL PROMPTS:
- Each visual_prompt is a standalone AI image generation prompt.
- Include: subject, action, setting, lighting direction + color temp, camera angle, focal length, mood, color palette.
- Be hyper-specific. "Close-up of weathered hands holding a crystal sphere, warm golden light from below" not "a person with an object".
- NEVER text, words, typography, UI, or watermarks in visual prompts.

FORBIDDEN:
- Emdashes/endashes (use commas, periods, semicolons)
- Cliches: "buckle up", "let's dive in", "here's the thing", "what if I told you", "game-changer", "mind-blowing", "insane", "literally", "absolutely", "at the end of the day", "in today's world", "it turns out", "the truth is"
```

### TTS Style Instructions — Pattern

The `buildTtsStyleInstructions()` function transforms framework `ttsPacing` into imperative TTS directives. It MUST always append: "Do not drag words out or over-enunciate. Keep delivery crisp even when slow."

### Music Prompt — Pattern

The `buildMusicPrompt()` function takes a framework `musicMood` label and category, producing a prompt like:
```
Dark ambient/dread. Instrumental only, no vocals. Flowing dynamics, natural builds and releases, smooth transitions. Suitable as background music under narration — not overpowering, with space for voice.
```

---

## Edge Cases to Handle

1. **Whisper fails:** Fall back to the old approach — use framework scene durations for word-to-scene mapping. Don't block the pipeline on timestamp extraction failure.

2. **Very short TTS (< 10s):** If GPT writes too few words and TTS is much shorter than target, log a warning but proceed. The video will be short.

3. **Beatoven fails:** Fall back to Lyria 2 (already handled in Task 3's code).

4. **More solved scenes than script scenes:** Use proportional mapping (described in Task 4 Step 3).

5. **Frame chaining across many short clips:** With Veo (4s/6s/8s clips) on a 60s video, we might have 8-10 scenes. Each needs `extractLastFrame` → next scene's seed. This is already sequential — just more iterations.

6. **No framework selected:** Falls back to niche template defaults. Scene boundaries still work — they just don't have framework labels.
