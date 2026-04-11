# Shorts Pipeline: Audio-Video Sync & Scene Continuity

**Date:** 2026-03-27
**Status:** Design approved, pending implementation

## Problem

The Shorts pipeline has two sync issues:

1. **Voiceover duration is estimated** from word count (~150 wpm), not measured. TTS engines produce variable-length audio, causing mismatches.
2. **Video clip durations are clamped** to model-specific values (e.g., Veo only accepts 4/6/8s), creating further drift. Assembly places the voiceover at timestamp 0 with duration set to total video length — if video is longer than audio, there's silence at the end; if shorter, audio is truncated. Neither produces good results.

Additionally, the pipeline treats all scenes the same — frame chaining is applied uniformly. Cut-style frameworks (top_x_countdown, before_after) need independent scenes with character consistency via reference-to-video (R2V).

## Solution

Eliminate the mismatch by making video durations the **source of truth**. Lock model-valid durations before script generation so narration is written to fit exact time windows.

Introduce two distinct pipeline flows based on framework type:
- **Continuous** (`frameChain: true`): frame-chained I2V throughout
- **Cut** (`frameChain: false`): independent scenes, R2V for character consistency

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Duration mismatch strategy | Lock durations before script generation (Option C) | Eliminates mismatch entirely — script fits the time |
| Voiceover verification | Trust TTS output, no measurement | Script is written to fit; close enough |
| Character reference source | Scene 1's generated image (auto-captured) | No extra wizard step needed |
| Model selection for cut frameworks | Restrict to R2V-capable families (Veo 3.1, Grok, Kling O3) | Wizard filters models based on framework type |
| Character detection | Inferred from scene 1 having a generated/provided starting image | Simple inference, no manual toggle |
| Scene 1 behavior | Always generate image → video | Current behavior, cleaned up |
| Duration solver algorithm | Minimize total deviation (Approach B) | Optimal distribution, preserves framework pacing |
| TTS mode | All frameworks use `single` (one continuous track) | Simplifies pipeline — per_scene TTS eliminated |
| Solver fallback | Expand tolerance incrementally (±2, ±4, ±6) then adjust scene count | Always finds a valid solution |
| Wizard model reset | Clear model selection when switching between continuous/cut frameworks | Prevents invalid model + framework combinations |

## Architecture

### 1. Duration Solver (New Module)

**File:** `api/lib/durationSolver.js`

**Function:** `solveDurations(targetTotal, sceneCount, durationRanges, modelKey) → number[]`

Three strategies based on model type:

**Discrete models** (Veo: `[4,6,8]`, Kling v2: `[5,10]`, PixVerse: `[5,8]`, Wan 2.5: `[5,10]`):
- Enumerate all combinations of valid durations that sum to `targetTotal`
- Score each by total deviation from each scene's `durationRange` midpoint
- Return the lowest-scoring combination
- If no exact sum exists, expand tolerance incrementally: `targetTotal ± 2`, then `± 4`, then `± 6`
- If still no valid combination (e.g., Kling v2 `[5,10]` with 3 scenes targeting 18s), adjust scene count: try `sceneCount ± 1` and re-solve
- Upper bound: max 12 scenes (from framework), so worst case 3^12 = 531k combinations — acceptable for a one-time solve

**Continuous-range models** (Kling v3/O3: 3-15 integers, Wavespeed WAN: 5-8):
- Proportionally distribute `targetTotal` across scenes weighted by `durationRange` midpoints
- Round to valid integers, clamp each to the scene's `durationRange` bounds
- Adjust remainder across scenes (prefer adjusting scenes with most headroom) to hit exact total

**Fixed-duration models** (Hailuo, Wan Pro — no duration param):
- Use model's fixed duration for all scenes
- Adjust scene count to approximate target total (override framework scene count)

### 2. Script Generator Changes

**File:** `api/lib/scriptGenerator.js`

- Receives **exact locked durations** from duration solver instead of ranges
- System prompt changes from `"Scene 1 'Setup' (10-12s)"` to `"Scene 1 'Setup' (8s)"`
- **Continuous** frameworks: visual descriptions are light after scene 1 — "describe the motion/action, not the full setting"
- **Cut** frameworks: full visual descriptions per scene — each scene stands alone visually
- Output format unchanged: `{ scenes: [{ narration, visual_description, overlay_text, scene_label }] }`

### 3. Pipeline Flow Changes

**File:** `api/lib/shortsPipeline.js`

**New flow order:**

1. Load framework, read `sceneStructure` for target duration
2. **Duration solver** → locked per-scene durations
3. **Script generator** → narration + visual descriptions fitted to exact durations
4. **TTS voiceover** → one continuous track from full narration (all frameworks now use `ttsMode: 'single'` — per-scene TTS is eliminated)
5. **Video generation loop** — branched by `frameChain`:

**Continuous (`frameChain: true`):**
- Scene 1: generate image from visual desc → I2V with locked duration
- Scene 2+: extract last frame from previous → I2V with locked duration, light motion prompt

**Cut (`frameChain: false`):**
- Scene 1: generate image from visual desc → I2V with locked duration. Capture image as `characterRef`
- Scene 2+ (characterRef exists): `characterRef` → R2V with locked duration, full visual prompt
- Scene 2+ (no characterRef — only if scene 1 image generation failed): generate fresh image → I2V with locked duration, full visual prompt

6. **Assembly** — concatenate clips with continuous voiceover on top. No stretching.

**Removed code:**
- `estimateDurationFromText()` function
- `getActualDuration()` function (solver handles upstream)
- Proportional duration distribution logic
- Per-scene TTS concatenation logic (all frameworks now use single voiceover)
- Voiceover duration placeholder in assembly (durations now match by construction)

### 4. Model Registry Changes

**File:** `api/lib/modelRegistry.js`

Each video model entry gets an optional `r2vEndpoint` field:

```javascript
fal_veo3: {
  // ...existing fields...
  r2vEndpoint: 'fal-ai/veo3.1/reference-to-video',
}
```

Models with `r2vEndpoint` are R2V-capable. The pipeline reads this to switch endpoints for cut scenes. The wizard reads it to filter models for cut frameworks.

R2V-capable families:
- **Veo 3.1** → `fal-ai/veo3.1/reference-to-video`
- **Grok** → `xai/grok-imagine-video/reference-to-video`
- **Kling O3** → `fal-ai/kling-video/o3/pro/reference-to-video` (always `pro` tier)

### 5. Wizard Model Filtering

**File:** `src/pages/CampaignsNewPage.jsx`

- When a **cut** framework is selected: Video Model step filters to models with `r2vEndpoint` (Veo 3.1, Grok, Kling O3)
- When a **continuous** framework is selected: all I2V models available, no filtering
- When user switches between continuous/cut frameworks: **clear video model selection** to prevent invalid combinations

## Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  1. Framework → sceneStructure + frameChain      │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│  2. Duration Solver                              │
│     Target: 30s, Veo → [4, 6, 8, 4, 8]          │
│     Model-valid durations, sum = target          │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│  3. Script Generator                             │
│     Exact durations → narration + visual desc    │
│     Continuous: light visuals after scene 1      │
│     Cut: full visuals per scene                  │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│  4. TTS Voiceover                                │
│     Full narration → one continuous audio track   │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│  5. Video Generation (branched by frameChain)    │
│                                                  │
│  CONTINUOUS:          │  CUT:                    │
│  S1: img → I2V        │  S1: img → I2V           │
│  S2: lastframe → I2V  │  S2: charRef → R2V       │
│  S3: lastframe → I2V  │  S3: charRef → R2V       │
│  ...                  │  ...                      │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│  6. Assembly                                     │
│     Concatenate clips + continuous voiceover     │
│     No stretching — durations already match      │
└─────────────────────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `api/lib/durationSolver.js` | **New** — duration allocation algorithm |
| `api/lib/scriptGenerator.js` | Accept exact durations, differentiate continuous/cut visual prompts |
| `api/lib/shortsPipeline.js` | New flow order, remove estimation logic, branch on frameChain |
| `api/lib/modelRegistry.js` | Add `r2vEndpoint` field to R2V-capable models |
| `api/lib/pipelineHelpers.js` | Update `assembleShort()` — voiceover placed with actual total duration, no mismatch |
| `src/pages/CampaignsNewPage.jsx` | Filter video models by framework type, reset model on framework switch |
| `api/lib/videoStyleFrameworks.js` | Update all `frameChain: false` frameworks to `ttsMode: 'single'` |

## Out of Scope

- Voiceover duration measurement/verification (trust TTS output)
- Per-scene mixed continuous/cut transitions
- Lip-sync (voiceover only, not lip-synced)
- Adding new framework fields (existing `frameChain` boolean maps directly; only `ttsMode` values change)
- Storyboard pipeline (separate system, not affected)
