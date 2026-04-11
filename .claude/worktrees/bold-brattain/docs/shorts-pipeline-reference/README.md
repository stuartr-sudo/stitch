# Shorts Pipeline Reference

All files involved in the Shorts generation pipeline, organized by role.
Use this folder as context when planning refactors.

## Files Index

### Entry Point
- `api/campaigns/create.js` — HTTP handler that creates campaign + job, then fires `runShortsPipeline()` in background

### Core Pipeline
- `api/lib/shortsPipeline.js` — Main orchestrator: script → TTS → images → video → music → assemble → captions → draft
- `api/lib/durationSolver.js` — Allocates model-valid per-scene clip durations that sum to target total

### Script Generation
- `api/lib/scriptGenerator.js` — GPT-4.1 mini + Zod structured output for scene-by-scene narrated scripts

### TTS / Voiceover
- `api/lib/voiceoverGenerator.js` — Two TTS backends: Gemini TTS (default) and ElevenLabs (legacy). Also has Whisper timestamps + word-to-scene mapping.

### Image & Video Generation
- `api/lib/mediaGenerator.js` — Generic dispatcher: `generateImageV2()`, `animateImageV2()`, `animateImageR2V()` — looks up model in registry
- `api/lib/modelRegistry.js` — Declarative config for all AI models (8 image, 10 video). Each entry: provider, endpoint, buildBody(), parseResult(), pollConfig.

### Assembly & Post-Processing
- `api/lib/pipelineHelpers.js` — Shared utilities: `assembleShort()` (FFmpeg compose), `generateMusic()` (Lyria 2), `extractFirstFrame()`, `extractLastFrame()`, `uploadUrlToSupabase()`, polling helpers
- `api/lib/captionBurner.js` — Auto-subtitle burn-in via `fal-ai/workflow-utilities/auto-subtitle`. 4 preset styles + custom config.

### Style & Framework Systems
- `api/lib/videoStyleFrameworks.js` — 76 structural frameworks defining scene structure, TTS mode, frame chaining, overlays, music, defaults per duration
- `api/lib/visualStyles.js` — 14 visual style presets for Shorts image generation (style suffix + image strategy)
- `api/lib/videoStylePresets.js` — 86 motion/cinematography presets (prompt text for video generation)
- `api/lib/shortsTemplates.js` — 20 niche definitions: scene structure, music mood, voice pacing, default voice, script system prompt

### Supporting Utilities
- `api/lib/retryHelper.js` — `withRetry()` wrapper used throughout the pipeline
- `api/lib/costLogger.js` — Per-user API spend tracking
- `api/lib/librarySave.js` — Auto-save generated assets to user's library
- `api/lib/mediaMetadata.js` — Write metadata for generated media
- `api/lib/getUserKeys.js` — Resolves API keys (user table → env var fallback)

### Scene Repair (Post-Generation)
- `api/shorts/repair-scene.js` — Re-generates a single failed scene using Veo 3.1 first-last-frame with adjacent scene frames
- `api/shorts/reassemble.js` — Rebuilds final video from existing scene assets with re-captioning

### Frontend (Wizard + Draft Review)
- `src/pages/CampaignsNewPage.jsx` — Shorts wizard lives here (not ShortsWizardPage.jsx which is dead code)
- `src/pages/ShortsDraftPage.jsx` — Draft review page at `/shorts/draft/:draftId`

---

## Current Pipeline Flow (Sequential)

```
1. Load framework + solve durations
2. Generate script (GPT-4.1 mini)
3. Generate single continuous TTS voiceover (Gemini or ElevenLabs)
4. For each scene (SEQUENTIAL):
   a. Scene 1: generate image (or use starting_image) → I2V
   b. Scene 2+:
      - Frame chain mode: last frame → I2V
      - Cut mode: R2V with character ref, or fresh image → I2V
   c. Extract first + last frames (parallel)
   d. Checkpoint to jobs.step_results
5. Generate music (Lyria 2, instrumental)
6. Assemble video (FFmpeg compose: clips + voiceover + music)
7. Burn captions (auto-subtitle)
8. Save ad_draft + finalize job
```

## Known Issues for Refactoring

1. **Fully sequential scene generation** — cut-mode scenes are independent but still processed one-by-one
2. **Single monolithic voiceover** — one TTS call for entire narration; if a scene is skipped, audio timing drifts
3. **No audio-video duration sync** — voiceover duration never verified against sum of clip durations
4. **Unnecessary frame extraction** — first/last frames extracted even in cut mode where they're unused
5. **Music waits for all scenes** — could start in parallel since it's independent
6. **Limited error recovery** — retry once then skip; no re-attempt or replacement logic
7. **Duration solver disconnected from actual output** — model may produce clips of different duration than requested
