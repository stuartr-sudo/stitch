# Motion Transfer Integration — Storyboard, Shorts & VideoAdvertCreator

## Context

Motion Transfer exists as a standalone tool in the VideoAdvertCreator, using a single model (WAN 2.2) with no video trimming. The feature lets users transfer motion from a reference video onto a character image — powerful for content mimicry, where you replicate the pacing/choreography of existing content with your own characters and style.

This design extends Motion Transfer into a first-class generation mode across Storyboard and Shorts Workbench, adds Kling V3 Pro Motion Control as a second model (with orientation control, @Element facial binding, and up to 30s duration), and introduces a video trimmer so users can snip specific segments of reference videos.

## Motion Transfer Model Registry

**New file: `api/lib/motionTransferRegistry.js`**

Follows the same declarative pattern as `modelRegistry.js`. Each entry describes how to call and parse one motion transfer model.

### Models

**WAN 2.2 Motion Transfer** (`wan_motion`)
- Endpoint: `fal-ai/wan/v2.2-14b/animate/move`
- Input: `image_url`, `video_url`, `prompt`, `negative_prompt`, `resolution`
- No orientation control, no element binding, no audio preservation
- Budget option for simple animations
- Poll: 120 retries × 3s delay

**Kling V3 Pro Motion Control** (`kling_motion_control`)
- Endpoint: `fal-ai/kling-video/v3/pro/motion-control`
- Input: `image_url`, `video_url`, `character_orientation`, `prompt`, `keep_original_sound`, `elements`
- `character_orientation: 'image'` — character keeps reference image pose, max 10s reference video
- `character_orientation: 'video'` — character matches video orientation, max 30s reference video, supports @Element facial binding
- `keep_original_sound` — preserves audio from reference video (default true)
- `elements` — optional single @Element for facial consistency (only with `video` orientation)
- Premium option with richer controls
- Poll: 120 retries × 4s delay

### Registry Structure

```javascript
MOTION_TRANSFER_MODELS = {
  wan_motion: {
    provider: 'fal',
    label: 'WAN 2.2 Motion Transfer',
    description: 'Budget motion transfer, good for simple animations',
    endpoint: 'fal-ai/wan/v2.2-14b/animate/move',
    maxDuration: null,
    supportsOrientation: false,
    supportsElements: false,
    supportsKeepAudio: false,
    buildBody(imageUrl, videoUrl, opts),
    parseResult(output),
    pollConfig: { maxRetries: 120, delayMs: 3000 },
  },
  kling_motion_control: {
    provider: 'fal',
    label: 'Kling V3 Pro Motion Control',
    description: 'Premium motion transfer with orientation control and facial binding',
    endpoint: 'fal-ai/kling-video/v3/pro/motion-control',
    maxDuration: { image: 10, video: 30 },
    supportsOrientation: true,
    supportsElements: true,
    supportsKeepAudio: true,
    buildBody(imageUrl, videoUrl, opts),
    parseResult(output),
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
}
```

### Dispatcher Function

`generateMotionTransfer(modelKey, imageUrl, videoUrl, opts, falKey, supabase)` — handles FAL queue submit + poll cycle. Returns `{ videoUrl }`. Uses `pollFalQueue()` from `pipelineHelpers.js` for consistent polling. Uploads result to Supabase via `uploadUrlToSupabase()` to avoid FAL CDN expiry. Calls `logCost()` after successful generation with model key and provider `'fal'`.

## Video Trim Endpoint

**New file: `api/video/trim.js`**
**Route: `POST /api/video/trim`** (authenticated)

Standalone, reusable endpoint for extracting a segment from a video URL.

### Input
```json
{
  "video_url": "https://...",
  "start_time": 2.5,
  "end_time": 7.0
}
```

### Backend
Uses FAL FFmpeg compose (`fal-ai/ffmpeg-api/compose`) with a single video track:

```javascript
{
  tracks: [{
    type: 'video',
    segments: [{
      url: video_url,
      start_time: start_time,   // seek offset in source
      duration: end_time - start_time,
    }]
  }],
  duration: end_time - start_time,
}
```

- Polls via `pollFalQueue()` with full endpoint path `fal-ai/ffmpeg-api/compose` (consistent with all other FAL async calls)
- Uploads trimmed result to Supabase storage (`media/trimmed/{userId}/`) via `uploadUrlToSupabase()`
- Returns permanent Supabase URL (not ephemeral FAL CDN URL)
- Max trim duration capped at 60s (sufficient for MT references, prevents expensive long-video processing)

### Output
```json
{
  "trimmed_url": "https://supabase.../media/trimmed/...",
  "duration": 4.5
}
```

### Validation
- `start_time` must be >= 0
- `end_time` must be > `start_time`
- Duration validation against Kling limits happens at generation time, not trim time (trimmer is model-agnostic)

## Frontend Components

### VideoTrimmer (`src/components/VideoTrimmer.jsx`)

Reusable range slider for selecting a video segment.

- Shows video preview (HTML5 `<video>` element)
- Dual-handle range slider below the video for start/end selection
- Displays total duration, selected segment duration
- "Trim" button calls `POST /api/video/trim` and returns the trimmed URL
- Optional — if user doesn't trim, the full video URL passes through
- Seeks the video preview to the current slider position for visual feedback

### MotionReferenceInput (`src/components/MotionReferenceInput.jsx`)

Reusable data editor for configuring a motion transfer reference. Does not trigger generation — the parent tool handles that.

**Renders:**
1. Video URL input + "Browse Library" button (same pattern as `ReferenceImageInput`)
2. When video selected: video thumbnail + `VideoTrimmer` inline
3. Model selector dropdown (WAN 2.2 / Kling V3 Pro)
4. Conditional options by model:
   - Kling only: Character orientation toggle (Match Image / Match Video)
   - Kling only: Keep Original Sound toggle
   - Kling + `video` orientation only: Optional @Element facial binding
5. Optional prompt field
6. Clear/remove button
7. **Kling duration validation**: When Kling is selected, show a warning if the reference video (or trimmed segment) exceeds the orientation limit (10s for `image`, 30s for `video`). Disable the generate action until the user trims within limits. WAN has no explicit limit — no validation needed.

**Props:**
```javascript
{
  motionRef: {
    videoUrl,       // original video URL
    trimmedUrl,     // trimmed video URL (null if untrimmed)
    startTime,      // trim start (null if untrimmed)
    endTime,        // trim end (null if untrimmed)
    model,          // 'wan_motion' | 'kling_motion_control'
    characterOrientation,  // 'image' | 'video' (Kling only)
    keepOriginalSound,     // boolean (Kling only)
    elements,              // array (Kling video orientation only)
    prompt,                // optional scene description
  },
  onChange: (motionRef) => void,
  onClear: () => void,
}
```

## Shorts Workbench Integration

### Step 3 (Keyframes) — Per-Scene Motion Reference

- Each scene card gets an optional "Add Motion Reference" button (collapsed by default)
- Expanding shows the `MotionReferenceInput` component
- When set, the scene card displays a small video thumbnail badge indicating MT mode
- The keyframe image remains required — it becomes the `image_url` for the MT model
- `motionRef` per scene stored in the existing `storyboard_json` JSONB blob alongside frames — no schema change

### Step 4 (Video Clips) — Auto-Detect Generation Mode

Mode detection per scene:
```javascript
const mode = scene.motionRef?.videoUrl
  ? 'mt'
  : isFLF(videoModel) ? 'flf' : 'i2v';
```

- Scenes with `motionRef` → MT mode via `generateMotionTransfer()` from the registry
- Scenes without → existing FLF or I2V
- MT scenes generate sequentially (like I2V) — output needed for frame chaining
- After MT generation, last frame extracted via `extractLastFrame()` for next scene continuity
- Mixed modes supported: Scene 1 FLF, Scene 2 MT, Scene 3 I2V — all chained seamlessly

### Backend (`api/workbench/workbench.js` `generate-clip` action)

New `mode: 'mt'` case:
- Accepts `motion_ref: { trimmed_url, model, character_orientation, keep_original_sound, elements, prompt }`
- Video URL resolved as: `trimmed_url || videoUrl` (trimmed takes priority)
- **Shorts audio override**: Forces `keep_original_sound: false` regardless of user setting — Shorts has its own voiceover + music pipeline. Also ensures no `generate_audio` param leaks through.
- Calls `generateMotionTransfer()` from the registry
- Calls `logCost()` after successful generation
- Returns `{ video_url, actual_duration, last_frame_url }` — same interface as FLF/I2V

## Storyboard Integration

### Frame Detail Panel — Per-Frame Motion Reference

- `MotionReferenceInput` appears in the frame detail side panel, below visual prompt and motion prompt
- When set, the frame shows an "MT" badge on its grid thumbnail
- Frame's `preview_image_url` serves as the `image_url` for the MT model
- Clearing the motion ref reverts the frame to the storyboard's global model strategy

### Production Pipeline (`api/storyboard/produce.js`)

MT as a generation strategy override:
- `getModelStrategy(modelId)` is unchanged — it still only takes a model ID string
- The MT override happens at the call site in the video generation loop: before calling `getModelStrategy()`, check if the frame has a `motion_ref`. If so, skip the strategy lookup entirely and call `generateMotionTransferFrame()` directly
- New `generateMotionTransferFrame(frame, config, keys, supabase)` function in the video generation step
- Frame chaining unchanged: after MT generation, extract last frame → feed to next frame
- Mixed generation: some frames MT, others using global model strategy

### Data Storage

New JSONB column on `storyboard_frames`:
```sql
ALTER TABLE storyboard_frames
ADD COLUMN motion_ref JSONB DEFAULT NULL;
```

Contains: `{ videoUrl, trimmedUrl, startTime, endTime, model, characterOrientation, keepOriginalSound, elements, prompt }`

No changes to the `storyboards` table.

## VideoAdvertCreator — Existing Modal Upgrade

`MotionTransferModal.jsx` refactored to use shared infrastructure:
- Replace hardcoded WAN 2.2 logic with `MotionReferenceInput` component
- Replace inline polling with the registry's `generateMotionTransfer()` via the updated endpoint
- Add `VideoTrimmer` inline (currently has no trimming)
- Fix misleading subtitle ("Kling 2.6" → accurate model name from selection)

### Backend Consolidation

`api/motion-transfer/generate.js`:
- Now accepts `model` param (defaults to `wan_motion` for backward compat)
- Maps legacy field names: existing frontend sends `{ image, video }` — the endpoint maps these to `image_url`/`video_url` before passing to the registry dispatcher. New callers can send either format.
- Delegates to `generateMotionTransfer()` from the registry
- Same endpoint URL, backward compatible

`api/motion-transfer/result.js`:
- Now model-aware — accepts `model` query param
- Uses registry's `parseResult()` and correct FAL queue path per model
- **Bug fix**: The existing code uses truncated queue path `fal-ai/wan` which is incorrect. The full endpoint path `fal-ai/wan/v2.2-14b/animate/move` is needed for correct FAL queue URL construction. The refactored version uses the registry's `endpoint` field per model, fixing this pre-existing bug.
- Falls back to WAN 2.2 full endpoint path if no model specified (backward compat)

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `api/lib/motionTransferRegistry.js` | Model registry + `generateMotionTransfer()` dispatcher |
| `api/video/trim.js` | Video trim endpoint using FAL FFmpeg |
| `src/components/MotionReferenceInput.jsx` | Shared motion reference config UI |
| `src/components/VideoTrimmer.jsx` | Range slider video trimmer |
| `supabase/migrations/20260403_storyboard_motion_ref.sql` | Add `motion_ref` JSONB to `storyboard_frames` |

### Modified Files
| File | Change |
|------|--------|
| `server.js` | Register `POST /api/video/trim` route |
| `api/motion-transfer/generate.js` | Use registry, accept `model` param |
| `api/motion-transfer/result.js` | Model-aware polling |
| `api/workbench/workbench.js` | Add `mode: 'mt'` to `generate-clip` |
| `api/storyboard/produce.js` | Add MT strategy + `generateMotionTransferFrame()` |
| `src/pages/ShortsWorkbenchPage.jsx` | MotionReferenceInput per scene (Step 3), MT mode detection (Step 4) |
| `src/pages/StoryboardWorkspace.jsx` | MotionReferenceInput in frame detail panel |
| `src/components/modals/MotionTransferModal.jsx` | Refactor to use shared components |

## Verification

1. **Trim endpoint**: Upload a video URL, trim to a 5s segment, verify the returned Supabase URL plays correctly
2. **VideoAdvertCreator**: Open MotionTransferModal, select each model, trim a video, generate — verify output video
3. **Shorts Workbench**: Create a Short, add motion references to some scenes (not all), generate clips — verify MT scenes use the reference motion, non-MT scenes use normal FLF/I2V, frame chaining works across mixed modes
4. **Storyboard**: Create a storyboard, add motion refs to select frames, run production — verify MT frames generate correctly, mixed strategies chain properly, final assembly includes MT clips
5. **Model switching**: Switch between WAN 2.2 and Kling V3 Pro in each tool — verify conditional UI (orientation, audio, elements) shows/hides correctly
6. **Draft persistence**: Save and reload a Shorts draft with motion refs — verify refs persist. Same for Storyboard frames.
7. **Edge cases**: Very long reference video with Kling `image` mode (>10s) should warn. No keyframe image + motion ref should error clearly.
