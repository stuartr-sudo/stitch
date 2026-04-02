# Quality Review Gate — Design Spec

## Goal

After assembly, automatically extract one frame per scene and use GPT-4.1-mini vision to check whether each frame's visuals match its corresponding narration. Flag mismatches with one-click repair buttons that regenerate the scene clip via the workbench's existing `generate-clip` action.

## Context

Split-screen talking-head Shorts, B-roll-driven Shorts, and all other workbench outputs currently go from assembly straight to download/publish with no automated quality check. Users must manually scrub through the video to spot visual mismatches — a frame showing a city skyline when the narration discusses ocean waves, or a talking head when the script describes a product demo. These mismatches are common with AI-generated video and easy to miss in a quick preview.

The codebase already has the repair half of the loop: `repair-scene.js` regenerates a single scene clip using Veo 3.1 First-Last-Frame (or I2V fallback), and `reassemble.js` rebuilds the final video from existing scene assets. The missing piece is automated detection — identifying which scenes need repair.

### Existing Infrastructure

| Component | Status | Location |
|---|---|---|
| Frame extraction (first/last) | Ready | `extractFirstFrame()`, `extractLastFrame()` in `pipelineHelpers.js` |
| GPT-4.1-mini vision analysis | Ready | `analyzeFrameContinuity()` in `pipelineHelpers.js` (continuity, not QA) |
| Scene repair (single scene) | Ready | `api/shorts/repair-scene.js` |
| Video reassembly | Ready | `api/shorts/reassemble.js` |
| FAL extract-frame API | Ready | `fal-ai/ffmpeg-api/extract-frame` — supports `frame_type: 'first' \| 'middle' \| 'last'` |
| Quality reviewer module | **New** | `api/lib/qualityReviewer.js` |
| Review-quality workbench action | **New** | Addition to `api/workbench/workbench.js` |
| Review results UI | **New** | Addition to `src/pages/ShortsWorkbenchPage.jsx` |

## Architecture

Non-blocking post-assembly flow. Assembly completes and returns the video URL immediately. The review runs as a separate request in the background — the user already has their video and can download it while the review processes.

**Flow:**

1. Assembly completes → frontend receives `video_url`
2. Frontend fires `POST /api/workbench/review-quality` in the background (non-blocking)
3. Backend extracts one frame per scene clip using `frame_type: 'middle'`
4. Each frame is sent to GPT-4.1-mini vision with the corresponding narration text
5. Backend returns per-scene pass/fail results with reasoning
6. Frontend renders results inline in Step 5

**Timing:** 10-20 seconds for a typical 5-8 scene Short (frame extraction is fast, vision calls are parallel).

**Cost:** ~$0.005-0.01 per scene (GPT-4.1-mini vision). Total ~$0.03-0.08 per Short.

## Quality Reviewer Module

**New file:** `api/lib/qualityReviewer.js`

Single exported function that handles frame extraction, vision analysis, and result parsing. Isolated from the workbench action handler for testability and reuse.

```
reviewSceneAlignment({ clips, scenes, falKey, openaiKey })
→ { results: [{ scene_index, match, confidence, reason, frame_url }] }
```

### Parameters

- `clips` — array of `{ url, duration }` objects for each scene. Each clip URL is an individual scene video — frames are extracted from these directly (not from the assembled video) to avoid caption/composite interference.
- `scenes` — array of `{ narration }` objects. The narration text is what each frame is compared against.
- `falKey` — for FAL extract-frame API calls.
- `openaiKey` — for GPT-4.1-mini vision calls.

### Process Per Scene

1. **Extract frame:** Call `fal-ai/ffmpeg-api/extract-frame` with `{ video_url: clip.url, frame_type: 'middle' }` on the individual scene clip. This extracts a single frame from the temporal midpoint of each scene's video clip. No timestamp math needed — FAL handles midpoint calculation internally.
2. **Vision analysis:** Send the extracted frame image URL and narration text to GPT-4.1-mini vision. The prompt asks for structured JSON output: `{ match: true/false, confidence: 0-1, reason: "..." }`.
3. **Parse response:** Extract the JSON from the model's response. If parsing fails, default to `{ match: true, confidence: 0, reason: "Review inconclusive" }` — fail open, don't block the user.

### Pass/Fail Determination

A scene is flagged when `match === false`, regardless of confidence score. Confidence is displayed in the UI for informational purposes but is not used for thresholding in v1.

### Vision Prompt

```
You are a video quality reviewer. Compare this video frame against the narration it should depict.

Narration: "{narration_text}"

Analyze whether the visual content of the frame matches the narration. Consider:
- Subject matter: Does the frame show what the narration describes?
- Setting/environment: Is the location/background appropriate?
- Mood/tone: Does the visual tone match the narration's tone?

Ignore minor stylistic differences (art style, color grading, exact composition). Focus on whether the frame depicts the RIGHT SUBJECT for this narration.

Respond with ONLY valid JSON (no markdown fencing):
{ "match": true/false, "confidence": 0.0-1.0, "reason": "Brief explanation" }
```

### Parallelism

Frame extraction and vision analysis are both parallelized. Each scene's clip is independent, so all frame extractions fire concurrently via `Promise.all`. Once all frames are extracted, all vision calls fire concurrently via `Promise.all`. This two-phase parallel approach keeps total review time to ~10-15 seconds regardless of scene count.

### Error Handling

- If frame extraction fails for a scene, that scene is skipped with `{ match: true, confidence: 0, reason: "Frame extraction failed" }`.
- If vision analysis fails for a scene (API error, timeout), same treatment — fail open.
- If all scenes fail, return `{ results: [], error: "Review failed" }`. Frontend shows a dismissible notice.
- The review never throws — it always returns a results array. Assembly output is never affected.

## Workbench Action: `review-quality`

Added to `api/workbench/workbench.js` as a new case in the action switch.

### Input

```json
{
  "clips": [{ "url": "https://...", "duration": 5 }, { "url": "https://...", "duration": 4 }],
  "scenes": [{ "narration": "The ocean waves crash against..." }, { "narration": "Deep beneath the surface..." }]
}
```

- `clips` — same clip array used for assembly. Each `url` is an individual scene's video clip.
- `scenes` — must include `narration` text for each scene (from the workbench script/timing state)

### Behavior

1. Validate input: clips and scenes arrays must exist and have matching lengths.
2. Resolve API keys via `getUserKeys()`.
3. Call `reviewSceneAlignment()` with clips, scenes, and API keys.
4. Log cost: `{ category: 'openai', operation: 'quality_review', model: 'gpt-4.1-mini' }`.
5. Return the results array.

### Output

```json
{
  "results": [
    { "scene_index": 0, "match": true, "confidence": 0.92, "reason": "Frame shows ocean waves matching narration about coastal scenery", "frame_url": "https://..." },
    { "scene_index": 1, "match": false, "confidence": 0.85, "reason": "Frame shows a city skyline but narration discusses underwater coral reefs", "frame_url": "https://..." }
  ]
}
```

## Frontend: Step 5 Review Panel

### Trigger

After assembly completes and `finalUrl` is set, the frontend fires the `review-quality` request in the background. The request sends the individual scene clip URLs (not the assembled video), so frame extraction happens on the raw clips before captioning or compositing.

### State

Three new state variables:

- `reviewResults` — array of per-scene results, or null
- `reviewLoading` — boolean, true while the review request is in flight
- `reviewError` — string or null, set if the review request itself fails

These are component state only — not persisted to `storyboard_json`. Reviews are cheap and fast enough to re-run, and results go stale the moment a scene is repaired or re-assembled.

### UI Layout

A "Quality Review" section appears below the video preview in Step 5, after assembly.

**While reviewing:** Subtle spinner with text: "Reviewing scene 3 of 6..." (progress updated as results stream in, or a single message if results arrive all at once).

**All scenes pass:** Green banner: "All scenes match narration ✓". Collapsed by default. Expandable to see per-scene confidence and reasoning.

**Mismatches found:** Yellow/amber banner: "2 of 6 scenes flagged for review". Expanded by default. Each flagged scene shows:

- Scene number and extracted frame thumbnail
- The narration text for that scene (truncated with expand)
- AI reasoning explaining the mismatch
- **"Repair Scene"** button

Passing scenes are listed below the flagged ones, collapsed, with green checkmarks.

### Repair Flow

When the user clicks "Repair Scene" on a flagged scene:

1. The button enters a loading state.
2. Frontend calls the workbench's existing `generate-clip` action (`POST /api/workbench/generate-clip`) with the scene's keyframe image, narration-informed motion prompt, and scene index. This is the same flow used in Step 4 to generate clips — repair is just regeneration.
3. On success, the frontend updates the scene's clip URL in workbench state (same as normal clip generation in Step 4).
4. The scene card updates to show "Repaired ✓".
5. A notice appears: "Scene repaired. Click Re-assemble to update the final video."
6. The existing "Re-assemble" button in Step 5 rebuilds the video with the repaired clip.

Note: `repair-scene.js` is NOT used here. That endpoint looks up scenes via `jobs` table `step_results`, which workbench-originated Shorts don't populate. The workbench manages its own scene state in component state and `storyboard_json`, so repair uses the workbench's own `generate-clip` action.

### Re-review After Repair

After re-assembly, the review automatically runs again (same trigger — assembly completion sets `finalUrl`, which triggers the review). This creates a natural review loop: assemble → review → repair flagged scenes → re-assemble → review again → all pass.

## Files Changed / Created

**New file:**
- `api/lib/qualityReviewer.js` — `reviewSceneAlignment()` function

**Modified files:**
- `api/workbench/workbench.js` — add `review-quality` action case, import `reviewSceneAlignment`
- `src/pages/ShortsWorkbenchPage.jsx` — auto-trigger review after assembly, review results panel in Step 5, repair button wiring

## Out of Scope

- Auto-repair without user approval
- Audio/narration sync timing analysis
- Caption quality or readability checking
- Platform compliance checks (duration, resolution, aspect ratio)
- Review result persistence to database
- Batch review across multiple drafts
- Confidence threshold configuration (hardcoded in v1)
