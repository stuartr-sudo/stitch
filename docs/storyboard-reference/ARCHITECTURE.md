# Storyboard System Architecture

## System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER (React SPA)                                             │
│                                                                 │
│  StoryboardPlannerWizard.jsx (1,898 lines, ~50 useState hooks) │
│  ├── WizardStepper                                              │
│  ├── StyleGrid (123 presets)                                    │
│  ├── InputsStep                                                 │
│  │   ├── CharactersKling (@Element system)                      │
│  │   └── CharactersVeo (flat image_urls)                        │
│  ├── ReviewScene (inline editing)                               │
│  ├── GenerateScene (status + video preview)                     │
│  ├── ImagineerModal (image generation)                          │
│  └── LibraryModal (image browsing)                              │
│                                                                 │
│  Client-side: extractLastFrame() for frame chaining             │
│  Client-side: pollForResult() for async video generation        │
└─────────────┬───────────────────────────────────────────────────┘
              │ apiFetch() — auto-injects Supabase JWT
              │
┌─────────────▼───────────────────────────────────────────────────┐
│ EXPRESS API (server.js, port 3003)                               │
│                                                                 │
│  /api/storyboard/generate-scenes  → GPT-5-mini scene breakdown │
│  /api/storyboard/describe-scene   → GPT-4.1-mini vision        │
│  /api/storyboard/assemble         → FFmpeg compose + captions   │
│  /api/storyboard/presets          → Preset CRUD                 │
│                                                                 │
│  /api/prompt/build-cohesive       → GPT prompt assembly         │
│  /api/jumpstart/generate          → Video generation dispatch   │
│  /api/jumpstart/result            → Poll async generation       │
│  /api/library/save                → Save media to Supabase      │
│  /api/imagineer/describe-character→ Character description        │
│  /api/styles/video                → Video style presets list    │
└─────────────┬───────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────────┐
│ EXTERNAL SERVICES                                               │
│                                                                 │
│  OpenAI (GPT-5-mini, GPT-4.1-mini) — script gen, prompts      │
│  FAL.ai (~43 endpoints) — video gen, frame extract, compose    │
│  Wavespeed (~7 endpoints) — video gen                          │
│  Supabase — Postgres, Auth, Storage                            │
└─────────────────────────────────────────────────────────────────┘
```

## API Call Sequence (Full Generation)

```
Step 6 — Script Generation:
  Browser → POST /api/storyboard/generate-scenes → OpenAI GPT-5-mini
  Returns: N scenes with visual/motion prompts

Step 8 — Video Generation (per scene, sequential):
  Browser → POST /api/prompt/build-cohesive → OpenAI GPT-4.1-mini
  Browser → fetch(startFrameUrl) → blob
  Browser → POST /api/jumpstart/generate (FormData) → FAL/Wavespeed
  Browser → POST /api/jumpstart/result (poll loop, 5s interval, 120 max)
  Browser → extractLastFrame(videoUrl) (client-side)
  Browser → POST /api/library/save → Supabase Storage

Assembly:
  Browser → POST /api/storyboard/assemble
  Server → POST fal-ai/ffmpeg-api/compose → poll → result
  Server → uploadUrlToSupabase → Supabase Storage
  Server → (optional) burnCaptions → fal-ai/auto-subtitle
  Returns: assembledUrl, captionedUrl
```

## State Shape

The wizard manages this state (all useState in one component):

```javascript
// Step 1: Story & Mood
storyboardName: string
desiredLength: number        // 8|15|30|45|60|90
defaultDuration: number      // 3-10 (per scene)
aspectRatio: string          // '16:9'|'9:16'|'1:1'|'4:3'
resolution: string           // '720p'|'1080p'|'4k'
enableAudioDefault: boolean
overallMood: string
selectedBrand: object|null   // Brand kit data

// Step 2: Visual Style
style: string                // Preset key from 123 styles
builderStyle: string         // Manual pill
builderLighting: string
builderColorGrade: string

// Step 3: Video Style
videoStyle: string           // Key from 86 presets
videoStylesList: array       // Fetched from API

// Step 4: Model
globalModel: string          // From SCENE_MODELS

// Step 5: Creative Inputs
startFrameUrl: string|null
startFrameDescription: string
elements: array              // Kling @Element system
veoReferenceImages: array    // Veo/Grok flat refs
sceneDirection: {            // Multi-select pills
  environment: [], action: [], expression: [],
  lighting: [], camera: []
}
selectedProps: array
selectedNegPills: array
negFreetext: string

// Step 6-7: Script & Scenes
scenes: [{
  id, sceneNumber, visualPrompt, motionPrompt,
  durationSeconds, cameraAngle, narrativeNote,
  status, videoUrl, lastFrameUrl, startFrameUrl
}]
storyboardTitle: string

// Step 8: Generation
generating: boolean
generationCancelled: boolean
assembling: boolean
assembledUrl: string|null

// Presets
presets: array
activePresetId: string|null
activePresetName: string

// UI state
step: string                 // Current wizard step key
completedSteps: array
showImagineerForStartFrame: boolean
showLibraryForStartFrame: boolean
showLibrary: boolean
// ... ~15 more UI booleans
```

## Model Capabilities Matrix

| Model | Mode | Refs | Audio | Resolution | Duration | Provider |
|-------|------|------|-------|------------|----------|----------|
| Veo 3.1 (Reference) | R2V | ✓ | ✓ | ✓ | 4/6/8s | FAL |
| Kling O3 Pro (R2V) | R2V | ✓ | ✓ | - | 5/10s | FAL |
| Kling O3 Std (R2V) | R2V | ✓ | ✓ | - | 5/10s | FAL |
| Grok R2V | R2V | ✓ | - | - | 4/6/8/10s | FAL |
| Veo 3.1 Fast | I2V | - | ✓ | ✓ | 4/6/8s | FAL |
| Seedance 1.5 Pro | I2V | - | ✓ | - | 4/6/8/10/12s | Wavespeed |
| Kling 2.5 Turbo | I2V | - | - | - | 5/10s | FAL |
| Grok Imagine | I2V | - | ✓ | - | 5/8/10/15s | FAL |
| Wavespeed WAN | I2V | - | - | - | 5/8s | Wavespeed |
| Veo 3.1 FLF | FLF | - | ✓ | ✓ | 8s fixed | FAL |
| Kling O3 Pro V2V | V2V | - | ✓ | - | 3-15s | FAL |
| Kling O3 Std V2V | V2V | - | ✓ | - | 3-15s | FAL |

## Preset Schema

```sql
CREATE TABLE storyboard_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  config JSONB NOT NULL,  -- All wizard settings except scenes/images
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
```

## Cost Profile (per storyboard)

For a typical 6-scene, 60s storyboard:
- 1× GPT-5-mini call (script generation): ~$0.01
- 6× GPT-4.1-mini calls (cohesive prompt builder): ~$0.03
- 1× GPT-4.1-mini vision call (start frame analysis): ~$0.01
- 6× Video generation (varies by model):
  - Veo 3.1: ~$0.35/clip × 6 = ~$2.10
  - Kling O3 Pro: ~$0.40/clip × 6 = ~$2.40
- 1× FFmpeg compose: ~$0.05
- 1× Caption burning (optional): ~$0.10
- **Total: ~$2.30-$2.60 per storyboard**

## Critical Dependencies

1. **Frame chaining** depends on client-side `extractLastFrame()` working correctly
2. **Cohesive prompt builder** depends on OpenAI API being available (has concatenation fallback)
3. **R2V models** depend on Topaz upscaler working for element images
4. **Assembly** depends on all scene videos being accessible URLs (FAL CDN expiry risk)
5. **All generation** depends on a start frame existing (errors if no image available)
