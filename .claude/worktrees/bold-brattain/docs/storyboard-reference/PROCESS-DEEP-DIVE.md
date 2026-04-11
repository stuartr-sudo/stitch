# Storyboard Planner — Complete Process Deep Dive

## Overview

The Storyboard Planner is an 8-step "inputs-first" wizard for creating multi-scene AI video sequences. It lives inside a `SlideOverPanel` modal (~1,898 lines in `StoryboardPlannerWizard.jsx`). The core philosophy: collect ALL creative decisions BEFORE AI generation, so the AI script and video clips are informed by the user's complete creative vision.

Entry points:
- Button click in the Video Ad Creator page
- Can receive an `initialImage` prop to pre-populate the starting frame

---

## Step-by-Step Process

### Step 1: Story & Mood

**What the user does:**
- Enters a **Storyboard Name** (required — gates the Next button)
- Selects **Desired Length**: 8s, 15s, 30s, 45s, 60s, 90s
- Adjusts **Duration per Scene**: slider 3-10 seconds (default 5s)
- Picks **Aspect Ratio**: 16:9, 9:16, 1:1, 4:3
- Picks **Resolution**: 720p, 1080p, 4K
- Toggles **Enable native audio generation** (only for supported models)
- Selects **Overall Mood** from pills: Joyful/Happy, Dramatic, Peaceful/Calm, Mysterious, Energetic, Tense/Suspenseful, Playful, Inspirational
- Optionally selects a **Brand Style Guide** from saved brand kits

**What happens under the hood:**
- All values stored as React state (no API calls yet)
- Scene count will be calculated later: `Math.round(desiredLength / avgModelDuration)` clamped 1-12
- Brand style guide data (if selected) will be passed to the script generator

**State variables:** `storyboardName`, `desiredLength`, `defaultDuration`, `aspectRatio`, `resolution`, `enableAudioDefault`, `overallMood`, `selectedBrand`

---

### Step 2: Visual Style

**What the user does:**
- Selects a **Style Preset** from a grid of 123 visual styles (StyleGrid component). Selecting auto-advances to Step 3 after 150ms.
- Optionally refines with **Visual Direction** pills:
  - Style modifier (e.g., "Minimalist", "Maximalist", "Retro")
  - Lighting (e.g., "Golden Hour", "Neon", "Candlelight")
  - Color Grade (e.g., "Warm", "Cool", "Desaturated")

**What happens under the hood:**
- `style` stores the preset key (e.g., "cinematic", "watercolor_dreams")
- `getPromptText(style)` converts the key to a 40-80 word style description (from `src/lib/stylePresets.js`)
- Builder pills stored separately: `builderStyle`, `builderLighting`, `builderColorGrade`
- Auto-advance: `setTimeout(() => handleNext(), 150)` on style selection

**Key detail:** The 123 style presets in `stylePresets.js` each have detailed `promptText` values (40-80 words). These are NOT the same as the 14 visual styles in `api/lib/visualStyles.js` (which are Shorts-only).

---

### Step 3: Video Style

**What the user does:**
- Selects a **cinematography/motion preset** from 86 video style presets. Each has a thumbnail, label, and description. Selecting auto-advances after 150ms.

**What happens under the hood:**
- Video styles fetched from `/api/styles/video` on step entry (lazy-loaded)
- Each preset has a `prompt` field — a full ~150-word cinematography direction
- `videoStyle` stores the key; the full prompt is looked up at generation time
- Source: `api/lib/videoStylePresets.js`

---

### Step 4: Model

**What the user does:**
- Selects one video generation model for ALL scenes (global model). 12 models across 4 modes:

**Reference-to-Video (R2V):** Character consistency via reference images
- Veo 3.1 (Reference) — Google, flat image refs, supports audio + resolution
- Kling O3 Pro (R2V) — @Element system, best character consistency
- Kling O3 Standard (R2V) — faster/cheaper @Element
- Grok Imagine R2V — up to 7 reference images

**Image-to-Video (I2V):** Animate a start frame
- Veo 3.1 Fast — flexible duration, audio
- Seedance 1.5 Pro — high quality with audio
- Kling 2.5 Turbo Pro — cinematic motion
- Grok Imagine — good quality with audio
- Wavespeed WAN 2.2 — fast generation

**First-Last Frame:**
- Veo 3.1 First-Last Frame — specify start and end frames, 8s fixed

**Video-to-Video (V2V):**
- Kling O3 Pro V2V — refine existing video
- Kling O3 Standard V2V — faster refinement

**What happens under the hood:**
- `globalModel` stores the model ID
- `SCENE_MODELS` array in `SceneModelSelector.jsx` defines capabilities per model
- Model selection determines:
  - Whether Characters UI appears in Step 5 (`supportsRefs: true`)
  - Which Characters UI renders (Kling @Element vs Veo flat refs)
  - Duration constraints passed to script generator
  - How video generation requests are built in Step 8
- Duration constraints: `getModelDurationConstraints(modelId)` returns `{ min, max, allowed[] }`

---

### Step 5: Creative Inputs

Three collapsible accordion sections:

#### 5a: Starting Image
**What the user does:**
- Upload an image, pick from Library, or Generate with Imagineer
- This sets the visual foundation for Scene 1

**What happens under the hood:**
- On image set, auto-calls `/api/storyboard/describe-scene` (GPT-4.1-mini vision)
- Vision analysis returns a dense paragraph describing: art style, setting, lighting, colors, atmosphere, characters, camera angle
- `startFrameUrl` + `startFrameDescription` stored
- If Imagineer generates async (returns `requestId`), polls `/api/imagineer/result` every 3s up to 120 attempts
- Generated images auto-saved to library via `/api/library/save`

#### 5b: Characters (conditional — only if model `supportsRefs`)
**Kling R2V models → `CharactersKling.jsx`:**
- Up to 4 @Elements, each with:
  - Text description of the character/object
  - Up to 3 reference images (upload/library/generate)
  - Frontal image toggle (which ref is the "front" view)
  - Auto-describe button: sends first ref image to `/api/imagineer/describe-character` (GPT-4.1-mini vision)
- Tabbed interface switching between @Element1, @Element2, etc.
- These @Element placeholders are injected into the script generator prompt

**Veo/Grok R2V models → `CharactersVeo.jsx`:**
- Flat array of up to 5 reference images
- Upload/library/generate
- No @Element syntax — images passed as `image_urls` or `reference_image_urls` to the video model

#### 5c: Scene Direction Pills
**What the user does:**
- Multi-select pills across 5 categories:
  - Environment: Urban, Nature, Indoor, Studio, Underwater, Space, Desert, Forest, Beach, Mountain, Cityscape, Rural
  - Character Action: Walking, Running, Biking, Push-Scooter, Dancing, Sitting, Standing, Flying, Swimming, Fighting, Talking, Working, Playing, Sleeping
  - Expression: Happy, Sad, Angry, Surprised, Thoughtful, Determined, Peaceful, Excited, Fearful, Confident
  - Lighting: Golden Hour, Blue Hour, Midday Sun, Overcast, Neon, Candlelight, Moonlight, Studio Light, Backlit, Dramatic Shadow
  - Camera: Slow Pan, Tracking Shot, Static, Dolly In, Dolly Out, Orbit, Crane Up, Crane Down, Handheld, Aerial

**What happens under the hood:**
- `sceneDirection` object with arrays per category
- Passed to script generator as "apply these across scenes" directive

---

### Step 6: Generate Script

**What the user does:**
- Clicks "Generate Scene Script" (or it auto-triggers when entering this step if no scenes exist)
- Waits for AI to decompose the story into scenes
- Can regenerate if unsatisfied

**What happens under the hood:**
- `handleGenerateScript()` builds the request body from ALL previous step state
- POST to `/api/storyboard/generate-scenes` with:
  ```
  storyboardName, description (= storyboardName), desiredLength, defaultDuration,
  overallMood, aspectRatio, style, visualStylePrompt, builderStyle, builderLighting,
  builderColorGrade, videoStylePrompt, globalModel, modelDurationConstraints,
  hasStartFrame, startFrameDescription, elements, veoReferenceCount,
  sceneDirection, props, negativePrompt, brandStyleGuide
  ```
- Backend uses GPT-5-mini with Zod structured output (`zodResponseFormat`)
- Target scene count: `Math.round(desiredLength / avgDuration)` clamped 1-12
- System prompt includes all context blocks:
  - Story context (description, title, mood, aspect ratio, model)
  - Start frame analysis (if provided)
  - Character/element instructions (Kling @Element syntax OR natural descriptions)
  - Reference image count (for Veo/Grok)
  - Scene direction preferences
  - Visual style + cinematography direction
  - Props, negative prompt, brand style guide
  - Model duration constraints
  - 8 prompt writing rules (flowing paragraphs, visual continuity, no text/logos, etc.)
- Returns `StoryboardSchema`: `{ title, scenes[] }` where each scene has: `sceneNumber`, `visualPrompt` (60-100 words), `motionPrompt`, `durationSeconds`, `cameraAngle`, `narrativeNote`
- On success, auto-advances to Review step

---

### Step 7: Review Scenes

**What the user does:**
- Expandable cards for each scene (first expanded by default)
- Inline edit any field: Visual Prompt, Motion & Camera, Narrative Note, Camera Angle
- Click edit icon → textarea/input appears → Save/Cancel
- "Regenerate this scene" button resets scene to pending
- "Regenerate all" link at top re-runs script generation
- Can add/remove/reorder scenes

**What happens under the hood:**
- `ReviewScene` component with per-field inline editing
- `updateScene(id, updates)` merges changes into scene state
- Scene state: `{ id, sceneNumber, visualPrompt, motionPrompt, durationSeconds, cameraAngle, narrativeNote, status, videoUrl, lastFrameUrl }`
- No validation on prompt length or content (known weakness)
- Move up/down re-numbers all scenes

---

### Step 8: Generate

**What the user does:**
- "Generate All Remaining" button starts sequential generation
- Each scene shows status: Pending → Generating → Done/Error
- Video preview appears when done
- Can retry failed scenes
- Can "Refine with V2V" on completed scenes
- Can cancel mid-generation
- Once ALL scenes are done, "Assemble Final Video" button appears
- After assembly, "Send to Timeline" button available

**What happens under the hood — THE GENERATION LOOP:**

```
for each scene (sequential, not parallel):
  1. Determine start frame:
     - Scene 1: use startFrameUrl (or null)
     - Scene N>1: use previous scene's lastFrameUrl (frame chaining)
     - Fallback: startFrameUrl if no lastFrame available

  2. Build cohesive prompt:
     - POST /api/prompt/build-cohesive with tool='storyboard'
     - Sends: visualPrompt, style, cameraDirection, mood, lighting, colorGrade, videoStylePrompt
     - GPT assembles into a single flowing cinematic prompt
     - Fallback: manual concatenation if cohesive builder fails

  3. Build FormData for video generation:
     - prompt (from cohesive builder)
     - model (globalModel)
     - duration (scene.durationSeconds)
     - aspectRatio, resolution, enableAudio
     - image blob (fetched from startFrame URL → blob → FormData)
     - For Veo R2V: additionalImages (reference image URLs)
     - For Grok R2V: referenceImageUrls
     - For Kling R2V: r2vElements (frontal + reference images per element)
       - First scene: upscales element images, caches for reuse
       - Subsequent scenes: uses cached upscaled elements
     - negativePrompt (hardcoded standard set)

  4. POST /api/jumpstart/generate
     - If synchronous result: videoUrl returned immediately
     - If async (most models): returns requestId
       - Poll /api/jumpstart/result every 5s, up to 120 attempts (10 min)
       - 3 consecutive poll errors = give up

  5. Extract last frame (for chaining to next scene):
     - extractLastFrame(videoUrl) — client-side
     - On failure: logs warning, continues without chaining
     - Next scene falls back to startFrameUrl

  6. Save to library:
     - POST /api/library/save with video URL, metadata
     - Gets permanent Supabase URL back

  7. Update scene state:
     - status: 'done'
     - videoUrl: permanent Supabase URL
     - lastFrameUrl: extracted frame (or null)
```

**Assembly (after all scenes complete):**
1. Collects all completed scenes' `{ videoUrl, durationSeconds }`
2. POST `/api/storyboard/assemble`
3. Backend builds FFmpeg compose request:
   - Video track: keyframes with timestamps from scene durations
   - Optional music track
4. Submits to `fal-ai/ffmpeg-api/compose`
5. Polls for result
6. Uploads assembled video to Supabase
7. Optional caption burning via `fal-ai/workflow-utilities/auto-subtitle`
8. Returns `assembledUrl` + optional `captionedUrl`

**Send to Timeline:**
- Passes completed scene data to parent via `onScenesComplete` callback
- Closes the wizard

---

## Data Flow Diagram

```
USER INPUTS (Steps 1-5)
├── Story: name, length, mood, aspect ratio, resolution, audio, brand
├── Visual: style preset + style/lighting/color grade pills
├── Video: cinematography preset (86 options)
├── Model: global model selection (12 models, 4 modes)
└── Creative: start frame + characters + scene direction pills
        │
        ▼
SCRIPT GENERATION (Step 6)
├── POST /api/storyboard/generate-scenes
├── GPT-5-mini + Zod structured output
├── All inputs assembled into system prompt
├── Returns: N scenes with visualPrompt, motionPrompt, duration, camera, narrative
        │
        ▼
REVIEW & EDIT (Step 7)
├── User reviews/edits scene prompts
├── Can add/remove/reorder scenes
├── No validation (known gap)
        │
        ▼
SEQUENTIAL VIDEO GENERATION (Step 8)
├── For each scene:
│   ├── Cohesive prompt builder (GPT) → final prompt
│   ├── Fetch start frame as blob
│   ├── POST /api/jumpstart/generate (FormData)
│   ├── Poll for result (async models)
│   ├── Extract last frame → feed to next scene
│   └── Save to library (permanent URL)
        │
        ▼
ASSEMBLY
├── POST /api/storyboard/assemble
├── FFmpeg compose (fal-ai/ffmpeg-api/compose)
├── Upload to Supabase
├── Optional caption burning
└── Final video URL
```

---

## Key Technical Details

### Frame Chaining
The mechanism for visual continuity across scenes:
- After each scene's video is generated, `extractLastFrame(videoUrl)` captures the final frame
- This frame becomes the START image for the next scene's video generation
- Scene 1 uses the user's uploaded/generated start frame
- If frame extraction fails, falls back to the original start frame (visual discontinuity)
- Frame extraction is client-side (in the browser)

### Dual Character Systems
Two completely separate systems maintained in parallel:
1. **Kling @Element**: `elements[]` array — each has `{ description, refs[], frontalIndex }`. @Element1-4 syntax injected into prompts.
2. **Veo/Grok refs**: `veoReferenceImages[]` — flat URL array passed as `image_urls` or `reference_image_urls`.

The wizard conditionally renders one or the other based on the selected model.

### Upscaled Elements Cache
For Kling R2V, reference images need to be upscaled before submission. The first scene triggers upscaling, and the results are cached in `upscaledElementsCache` state for reuse in subsequent scenes. This avoids re-upscaling the same images 6+ times.

### Preset System
Saves/loads wizard configuration (not generated scenes):
- Stored in `storyboard_presets` table (user_id, name, config JSONB)
- Config includes: storyboardName, storyOverview, overallMood, all style settings, model, scene direction, brand selection
- Does NOT include: generated script, scene cards, start frame images, character references
- Upsert by user_id + name (prevents duplicates)

### Prompt Pipeline (2 stages)
1. **Script generation** (Step 6): GPT-5-mini takes ALL wizard inputs → produces scene-level `visualPrompt` + `motionPrompt`
2. **Cohesive prompt builder** (Step 8, per scene): GPT-4.1-mini takes scene's `visualPrompt` + style + camera + mood → produces final generation prompt
   - This is a SECOND LLM call per scene, on top of the script generation
   - Fallback: if cohesive builder fails, concatenate prompt parts manually

---

## Known Issues & Improvement Opportunities

### State Management (Critical)
- ~50+ useState hooks in a single 1,898-line component
- Reset logic in useEffect on close resets 30+ state variables individually
- No useReducer, no context, no state machine
- Makes the component extremely difficult to maintain or extend

### No Prompt Validation (Medium)
- Script generator produces 60-100 word prompts, but ReviewScene has no word count check
- No validation that @Element names match if Kling R2V is selected
- No validation that scene durations match model constraints (will fail at generation time)

### Frame Chaining Fragility (Medium)
- `extractLastFrame` failure is non-fatal — just logs warning
- No retry logic for failed extractions
- Visual discontinuity between scenes when chaining fails
- Client-side extraction means it depends on browser video codec support

### Sequential Generation (Performance)
- Scenes generated one at a time (sequential for loop)
- Each scene: cohesive prompt (GPT call) + video generation (30-90s) + frame extraction
- 6-scene storyboard takes 5-10+ minutes
- No parallelism possible because of frame chaining dependency

### Duplicate LLM Calls
- Script generation: 1 GPT call produces all scene prompts
- Then per-scene: 1 GPT call per scene for cohesive prompt building
- 6-scene storyboard = 7 total GPT calls (1 script + 6 cohesive)
- The cohesive builder could potentially be folded into script generation

### No Per-Scene Model Selection
- Global model only — all scenes use the same model
- Some storyboards might benefit from mixing models (e.g., R2V for character scenes, I2V for establishing shots)

### Limited Post-Generation Editing
- Can regenerate individual scenes but loses frame chain for subsequent scenes
- V2V refinement available but only for Kling O3
- No ability to extend a scene or trim it
- No ability to re-order generated scenes and re-chain

### Library Save vs FAL CDN
- Videos saved to library get permanent Supabase URLs
- But in `generateAllRemaining`, library save is fire-and-forget (`.catch(err => console.warn(...))`)
- Scene state stores whatever URL came back first, which might be a temporary FAL CDN URL

### Missing Features
- No music selection in the wizard (assembly supports it, but UI doesn't expose it)
- No voiceover integration (the Shorts pipeline has this, Storyboard doesn't)
- No caption style selection in the wizard (assembly supports it, not exposed)
- No export/download button (only "Send to Timeline")
- No scene-level notes or annotations for the assembly step

---

## Model-Specific Behaviors

### Veo 3.1 R2V
- Reference images passed as `additionalImages` in FormData
- Duration: only 4s, 6s, 8s allowed (mapped by `veoDuration()`)
- `auto_fix: true` — FAL rewrites prompts that trigger content policy
- Fails on white-background reference images (must have contextual scene backgrounds)
- Brand names in prompts cause 422 errors

### Kling O3 R2V
- @Element1-4 system with frontal image designation
- Reference images upscaled via Topaz before first use
- Upscaled results cached for subsequent scenes
- Duration: 5s or 10s

### Grok R2V
- Reference images passed as `referenceImageUrls`
- Up to 7 reference images
- Defaults `generate_audio: true` if omitted — must explicitly send `false`
- White-background references work fine (unlike Veo)

### All I2V Models
- Require a start frame image (blob in FormData)
- Duration formats vary by provider (see CLAUDE.md)
- No character reference support

### V2V Models (Kling O3)
- Accept existing video URL for refinement
- Used post-generation via "Refine with V2V" button
- Not used in the standard generation loop
