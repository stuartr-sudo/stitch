# Storyboard System — Complete File Map

All files that comprise or are used by the Storyboard Planner system. Organized by role.

---

## Frontend — Main Wizard

| File | Lines | Role |
|------|-------|------|
| `src/components/modals/StoryboardPlannerWizard.jsx` | ~1,898 | Main 8-step wizard orchestrator. Contains ALL state management (~50+ useState hooks), preset system, script generation trigger, video generation loop with frame chaining, assembly trigger, library/Imagineer integration. |

## Frontend — Storyboard Sub-Components

| File | Lines | Role |
|------|-------|------|
| `src/components/storyboard/InputsStep.jsx` | 187 | Step 5: Starting image, character references, scene direction pills. Accordion UI with 3 collapsible sections. |
| `src/components/storyboard/SceneModelSelector.jsx` | 95 | Model dropdown grouped by mode (R2V, I2V, FLF, V2V). Exports `SCENE_MODELS` array — the source of truth for all 12 video models with capabilities. |
| `src/components/storyboard/CharactersKling.jsx` | 282 | Kling R2V character UI. @Element1-4 system — tabbed interface, up to 3 reference images per element, frontal image toggle, auto-describe from image. |
| `src/components/storyboard/CharactersVeo.jsx` | 134 | Veo/Grok R2V character UI. Flat `image_urls` array, up to 5 reference images. Grid display with upload/library/generate. |
| `src/components/storyboard/ReviewScene.jsx` | 124 | Step 7: Expandable scene cards with inline field editing (visual prompt, motion prompt, narrative note, camera angle). |
| `src/components/storyboard/GenerateScene.jsx` | 133 | Step 8: Scene generation cards with status badges (pending/generating/done/error), video preview, retry, V2V refinement button. |
| `src/components/storyboard/SceneCard.jsx` | 322 | Legacy scene card with per-scene model selector, pills, start image/video source/end frame. Currently used alongside new system. |

## Backend — API Routes

| File | Lines | Role |
|------|-------|------|
| `api/storyboard/generate-scenes.js` | 287 | GPT-5-mini + Zod structured output. Takes ALL wizard inputs and produces N scenes with `visualPrompt`, `motionPrompt`, `durationSeconds`, `cameraAngle`, `narrativeNote`. |
| `api/storyboard/describe-scene.js` | 67 | GPT-4.1-mini vision analysis of start frame image. Returns dense paragraph describing art style, setting, lighting, colors, atmosphere. |
| `api/storyboard/assemble.js` | 124 | FFmpeg compose via `fal-ai/ffmpeg-api/compose`. Stitches scene clips + optional music → upload to Supabase → optional caption burning. |
| `api/storyboard/presets.js` | 83 | CRUD for `storyboard_presets` table. GET (list), POST (upsert by user_id+name), DELETE. |

## Backend — Shared Libraries (Used by Storyboard)

| File | Role in Storyboard |
|------|-------------------|
| `api/prompt/build-cohesive.js` | Builds final scene prompts. Accepts `tool: 'storyboard'` + structured inputs → GPT assembles cinematic prompt. Fallback to concatenation on failure. |
| `api/lib/modelRegistry.js` | Declarative config for 8 image + 10 video models. `buildBody()`, `parseResult()`, `pollConfig` per model. |
| `api/lib/mediaGenerator.js` | Generic dispatcher — `generateImageV2()`, `animateImageV2()` look up model in registry. |
| `api/lib/pipelineHelpers.js` | `extractFirstFrame()`, `extractLastFrame()`, `uploadUrlToSupabase()`, `assembleShort()`, `pollFalQueue()`, `pollWavespeedRequest()`. |
| `api/lib/scriptGenerator.js` | Shorts pipeline script gen (NOT used by Storyboard directly — Storyboard has its own `generate-scenes.js`). |
| `api/lib/videoStylePresets.js` | 86 motion/cinematography presets. API: `/api/styles/video`. |
| `api/lib/visualStyles.js` | 14 visual styles (Shorts-only, but style names shared). |
| `api/lib/voiceoverGenerator.js` | Gemini TTS + ElevenLabs. Not used by Storyboard currently. |
| `api/lib/captionBurner.js` | `burnCaptions()` via `fal-ai/workflow-utilities/auto-subtitle`. Used by assemble.js. |
| `api/lib/costLogger.js` | `logCost()` — called from generate-scenes.js for OpenAI usage. |
| `api/lib/getUserKeys.js` | API key resolution. All storyboard endpoints use this. |

## Frontend — Shared Libraries

| File | Role in Storyboard |
|------|-------------------|
| `src/lib/stylePresets.js` | 123 visual style presets for StyleGrid. `getPromptText(key)` returns the full style prompt. |
| `src/lib/frameExtractor.js` | `extractLastFrame(videoUrl)` — client-side frame extraction for chaining. |
| `src/lib/api.js` | `apiFetch()` — all API calls go through this (auto-injects Supabase JWT). |
| `src/lib/supabase.js` | Supabase client instance. |
| `src/lib/creativePresets.js` | `getPropsLabels()`, `getCombinedNegativePrompt()` for props and negative prompt pills. |

## Frontend — UI Components Used

| File | Role in Storyboard |
|------|-------------------|
| `src/components/ui/SlideOverPanel.jsx` | Modal container (slide-over drawer). |
| `src/components/ui/WizardStepper.jsx` | Step indicator bar at top. |
| `src/components/ui/StyleGrid.jsx` | Visual style preset grid (Step 2). |
| `src/components/ui/PromptBuilder.jsx` | Exports `STYLE_OPTIONS`, `LIGHTING_OPTIONS`, `COLOR_GRADE_OPTIONS` for pill selectors. |
| `src/components/ui/PropsPillSelector.jsx` | Props pill selector. |
| `src/components/ui/NegPromptPillSelector.jsx` | Negative prompt pill selector. |
| `src/components/ui/BrandStyleGuideSelector.jsx` | Brand kit selector + `extractBrandStyleData()`. |
| `src/components/modals/ImagineerModal.jsx` | AI image generation modal (opened for start frame + character image generation). |
| `src/components/modals/LibraryModal.jsx` | Image library browser modal. |

## Server Route Registration

In `server.js` (lines ~436-470):
```
POST /api/storyboard/generate-scenes → api/storyboard/generate-scenes.js
POST /api/storyboard/describe-scene  → api/storyboard/describe-scene.js
POST /api/storyboard/assemble        → api/storyboard/assemble.js
GET/POST/DELETE /api/storyboard/presets → api/storyboard/presets.js
```

Also used indirectly:
```
POST /api/jumpstart/generate     → Video generation (scene clips)
POST /api/jumpstart/result       → Poll async video generation
POST /api/prompt/build-cohesive  → Prompt assembly
POST /api/library/save           → Save generated media
POST /api/imagineer/describe-character → Auto-describe character from image
GET  /api/styles/video           → Load video style presets
```

## Database

| Table | Role |
|-------|------|
| `storyboard_presets` | User-scoped saved wizard configurations (id, user_id, name, config JSONB). Migration: `supabase-migration-storyboard-presets.sql` |
| `image_library_items` | Used for library browsing (start frames, character refs). |

## Design Documentation

| File | Description |
|------|-------------|
| `docs/superpowers/specs/2026-03-21-storyboard-shorts-design.md` | Original design spec |
| `docs/superpowers/plans/2026-03-21-storyboard-shorts.md` | Original implementation plan |
| `docs/superpowers/plans/2026-03-23-storyboard-redesign.md` | First redesign plan (6-step) |
| `docs/superpowers/plans/2026-03-26-storyboard-redesign.md` | Current redesign plan (8-step) |
