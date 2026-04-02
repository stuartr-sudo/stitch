# AI Avatar Split-Screen — Design Spec

## Goal

Add an "Avatar Mode" to the Shorts Workbench that produces split-screen videos — AI avatar (talking head) on the bottom 40%, B-roll visuals on the top 60%, captions at the seam — the highest-performing format on TikTok and Instagram Reels.

## Context

Split-screen talking-head Shorts are the dominant format on short-form platforms. The user's face (or an AI avatar) speaks directly to camera in the bottom portion while supporting visuals play above. Stitch already has all the building blocks: LoRA-trained Visual Subjects for consistent character generation, 13+ video models for I2V animation, 5 lip-sync models via `storyboardLipsync.js`, Gemini TTS for voiceover, and FAL FFmpeg compose for multi-track assembly. The missing pieces are the split-screen compositor and the workflow wiring.

### Existing Infrastructure

| Component | Status | Location |
|---|---|---|
| Visual Subjects (LoRA characters) | Ready | `api/brand/avatars.js`, `visual_subjects` table |
| Image generation with LoRA | Ready | `generateImageV2()` in `mediaGenerator.js` |
| I2V animation | Ready | `animateImageV2()` in `mediaGenerator.js`, 13 models in registry |
| Lip-sync (5 models) | Ready | `api/lib/storyboardLipsync.js` — `applyLipsync()`, `recommendLipsyncModel()` |
| Gemini TTS voiceover | Ready | `voiceoverGenerator.js` |
| FFmpeg multi-track compose | Ready | `assembleShort()` in `pipelineHelpers.js` |
| Caption burning | Ready | `burnCaptions()` in `captionBurner.js` |
| Split-screen compositor | **New** | `api/lib/splitScreenCompositor.js` |
| Avatar mode workbench wiring | **New** | Changes to `workbench.js` + `ShortsWorkbenchPage.jsx` |

## Architecture

Avatar mode adds a parallel track to the existing workbench pipeline. The B-roll pipeline is identical to a standard Short. The avatar is a single continuous clip (one portrait, animated once, lip-synced once) composited with the assembled B-roll.

**Standard pipeline:** Script → Voice → Timing → Keyframes → Scene Clips → Assemble → Captions

**Avatar pipeline:** Script → Voice → Timing → Keyframes (B-roll) → Scene Clips (B-roll) + **Avatar Portrait → I2V → Lip-sync** → **Split-Screen Compose** → Captions

The avatar is generated as a single clip for the full voiceover duration. It does not cut per scene — real presenters don't jump-cut.

## Avatar Generation Pipeline

### Step 1: Generate Presenter Portrait

Use the selected Visual Subject's trained LoRA to generate a presenter-style headshot.

- Load LoRA config from `visual_subjects` row: `lora_url`, `lora_trigger_word`
- Generate via `generateImageV2()` with prompt: `"{triggerWord} person speaking to camera, shoulders up, direct eye contact, neutral solid background, portrait photography"`
- Image model: use the default image model (`nano-banana-2` supports LoRA)
- Output aspect ratio: landscape (will fill the bottom 40% of 1080x1920)
- User can preview the portrait and regenerate if needed

### Step 2: Animate Portrait (I2V)

Animate the portrait into a talking-head video using a dedicated "best for faces" model.

- Model: hardcoded to whichever model performs best for face animation. Initial default: Wan 2.5 (`fal_wan25`). This can be tuned without changing the spec.
- Prompt: `"person speaking naturally to camera, subtle head movement, gentle gestures, blinking, conversational body language"`
- Duration: match the voiceover TTS duration from Step 2 of the workbench
- `generate_audio: false` — audio comes from TTS, not the video model
- Output: animated talking-head video (no audio)

### Step 3: Lip-sync to Voiceover

Sync the avatar's mouth to the voiceover audio using the existing lip-sync infrastructure.

- Use `recommendLipsyncModel({ contentType: 'realistic', isCloseUp: true, hasVideoAlready: true })` — returns `sync-lipsync-2-pro` for close-up realistic faces
- Call `applyLipsync({ videoUrl: avatarVideoUrl, audioUrl: voiceoverUrl, model, falKey, supabase })`
- Output: lip-synced avatar video with mouth movements matching narration
- The lip-synced video includes the voiceover audio baked in (lip-sync models output video+audio)

### Step 4: Split-Screen Composite

Stack the B-roll and avatar into a single 1080x1920 frame.

- B-roll video occupies top 60% (1080x1152 pixels)
- Avatar video occupies bottom 40% (1080x768 pixels)
- Both are center-cropped/scaled to fit their respective regions
- Output: single 1080x1920 composite video

## Split-Screen Compositor

**New file:** `api/lib/splitScreenCompositor.js`

A single exported function that uses FAL FFmpeg compose to stack two videos vertically.

```
composeSplitScreen({ brollVideoUrl, avatarVideoUrl, splitRatio, falKey, supabase })
→ { videoUrl }
```

**Parameters:**
- `brollVideoUrl` — assembled B-roll video (output of `assembleShort()`)
- `avatarVideoUrl` — lip-synced avatar video
- `splitRatio` — `0.6` (B-roll gets 60%, avatar gets 40%). Stored as a constant, not user-configurable in v1.
- `falKey` — FAL API key
- `supabase` — for uploading result

**Implementation:** Uses the FAL FFmpeg API with filter_complex to scale and stack the two videos. The FFmpeg filter chain:
1. Scale B-roll to 1080x1152 (top 60%)
2. Scale avatar to 1080x768 (bottom 40%)
3. Vertically stack (`vstack`) into 1080x1920
4. Mix audio from avatar video (which has the lip-synced voiceover) with the B-roll video (which has voiceover + music)

**Audio handling:** The B-roll video from `assembleShort()` already has voiceover + music mixed in. The lip-synced avatar video also has voiceover baked in. The compositor uses only the B-roll audio track (voiceover + music) and strips the avatar's audio to avoid double-voiceover. This means the final composite has: voiceover + music from the B-roll assembly, and the avatar provides visual-only lip movements.

## Modified Assembly Flow

**File:** `api/workbench/workbench.js` — `assemble` action

When the workbench state includes `avatarMode: true` and `avatarLipsyncUrl`, the assembly flow changes:

1. Assemble B-roll clips normally via `assembleShort()` → produces a full-frame B-roll video with voiceover + music
2. Call `composeSplitScreen()` with the B-roll video and the lip-synced avatar video
3. Burn captions on the split-screen composite (captions appear at the seam between B-roll and avatar — the vertical center of the frame)
4. Return the final captioned split-screen video

If `avatarMode` is false or avatar URLs are missing, assembly works exactly as before.

## New Workbench Actions

Three new actions added to `api/workbench/workbench.js`:

### `generate-avatar-portrait`

**Input:** `{ visual_subject_id }`

**Behavior:**
1. Load the Visual Subject from `visual_subjects` table (verify ownership)
2. Load LoRA config: `lora_url`, `lora_trigger_word`
3. Generate portrait via `generateImageV2()` with LoRA, presenter prompt, landscape aspect ratio
4. Upload to Supabase storage
5. Return `{ portrait_url }`

### `animate-avatar`

**Input:** `{ portrait_url, duration }`

**Behavior:**
1. Animate via `animateImageV2()` using the hardcoded face-animation model
2. Talking-head prompt, `generate_audio: false`
3. Duration matches the voiceover length
4. Upload to Supabase storage
5. Return `{ avatar_video_url }`

### `lipsync-avatar`

**Input:** `{ avatar_video_url, voiceover_url }`

**Behavior:**
1. Call `recommendLipsyncModel({ contentType: 'realistic', isCloseUp: true, hasVideoAlready: true })`
2. Call `applyLipsync({ videoUrl, audioUrl, model, falKey, supabase })`
3. Return `{ lipsync_video_url, model_used }`

## Frontend: Workbench UI Changes

**File:** `src/pages/ShortsWorkbenchPage.jsx`

### Step 1 (Script & Voice) — Avatar Toggle

Below the niche selector, add:

- **Avatar Mode toggle** — switch/checkbox, off by default. Label: "Avatar Mode (split-screen)"
- When toggled on, show a **Visual Subject picker**:
  - Dropdown listing the user's Visual Subjects from `GET /api/brand/avatars`
  - Each entry shows: name + small reference image thumbnail
  - If no Visual Subjects exist: "No characters found. Train one first." with a link/button to open the LoRA training modal (`BrandAssetsModal`)
- Selected subject stored in workbench state as `avatarSubjectId` + `avatarSubjectName`
- Small thumbnail preview of the selected subject's reference image

### Step 3 (Keyframes) — B-Roll Label

When avatar mode is on, show a label above the keyframe grid: "B-Roll Scenes (top 60%)" — clarifies these images are for the upper portion of the split-screen.

### Step 4 (Video Clips) — Avatar Generation Card

Below the B-roll scene clip cards, add an "Avatar" section (only visible when avatar mode is on):

1. **Portrait card** — shows the generated presenter portrait, or a "Generate Portrait" button
   - "Regenerate" button to get a different pose/angle
   - Small preview of the portrait image
2. **Animation + Lip-sync button** — "Generate Avatar Video" button that runs the full pipeline:
   - Generate Portrait (if not already done) → Animate → Lip-sync
   - Progress indicator showing current stage: "Generating portrait..." → "Animating..." → "Lip-syncing..." → "Done"
   - Each stage updates as it completes
3. **Preview** — once complete, shows a small video preview of the lip-synced avatar clip
4. **Regenerate** — button to redo the entire avatar pipeline from portrait generation

### Step 5 (Assemble) — No UI Change

Assembly produces a split-screen composite automatically when avatar mode is on. The user sees the final result in the same preview player.

## Workbench State Changes

The existing `storyboard_json` JSONB on `ad_drafts` gains these fields when avatar mode is active:

```json
{
  "avatarMode": true,
  "avatarSubjectId": "uuid",
  "avatarSubjectName": "Character Name",
  "avatarPortraitUrl": "https://...",
  "avatarVideoUrl": "https://...",
  "avatarLipsyncUrl": "https://..."
}
```

No database migrations needed. These are optional fields in the existing JSONB column — standard Shorts without avatar mode simply don't include them.

## Files Changed / Created

**New files:**
- `api/lib/splitScreenCompositor.js` — `composeSplitScreen()` function

**Modified files:**
- `api/workbench/workbench.js` — add 3 new actions (`generate-avatar-portrait`, `animate-avatar`, `lipsync-avatar`), modify `assemble` action for split-screen
- `src/pages/ShortsWorkbenchPage.jsx` — avatar toggle in Step 1, B-roll label in Step 3, avatar generation card in Step 4

## Out of Scope

- User-configurable split ratio (v1 is fixed 60/40)
- Multiple avatar clips per Short (v1 is single continuous)
- Avatar without LoRA (upload-a-photo fallback)
- Voice cloning (uses existing Gemini TTS voices)
- Avatar pose/angle selection beyond regeneration
- Picture-in-picture (circular avatar overlay in corner) — different format, separate feature
- Batch Queue avatar mode integration
