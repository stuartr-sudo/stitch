# Shorts Pipeline v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete overhaul of the Shorts wizard (11-step flow), pipeline (framework-driven generation), TTS (Gemini replacing ElevenLabs), captions (full customization), and scene repair (Veo 3.1 First-Last-Frame).

**Architecture:** 16 video style frameworks drive the entire pipeline — each framework defines scene structure, TTS mode (single vs per-scene), frame chaining, transitions, text overlays, and music config. The wizard collects all config before script generation. Voiceover is the master clock for audio/video sync.

**Tech Stack:** React 18, Express, Supabase, FAL.ai (Gemini TTS, auto-subtitle, ffmpeg-api, Veo 3.1), OpenAI (script generation)

**Spec:** `docs/superpowers/specs/2026-03-25-shorts-pipeline-v2-design.md`
**Framework Reference:** `docs/superpowers/specs/video-style-frameworks-reference.md`

**No test runner is configured.** Steps that say "verify" mean: run `npm run build` to check for compile errors, or start the dev server (`npm run start`) and test manually. There are no automated tests.

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `api/lib/videoStyleFrameworks.js` | 16 framework definitions with full pipeline config (scene structures, TTS mode, overlays, transitions, music) |
| `src/lib/videoStyleFrameworks.js` | Frontend mirror — framework cards for wizard display (name, hook examples, badges, supported durations) |
| `api/shorts/repair-scene.js` | Scene repair endpoint — Veo 3.1 First-Last-Frame regeneration |
| `api/shorts/reassemble.js` | Re-assembly endpoint — rebuild video from existing scene assets |

### Modified Files (Major)
| File | Lines | Changes |
|------|-------|---------|
| `src/pages/CampaignsNewPage.jsx` | ~1300 | Complete rewrite — 11-step wizard with framework-driven flow |
| `api/lib/voiceoverGenerator.js` | 208 | Replace ElevenLabs with Gemini TTS (`fal-ai/gemini-tts`) |
| `api/lib/shortsPipeline.js` | 485 | Framework-aware pipeline with per-scene TTS, duration matching, text overlays |
| `api/lib/pipelineHelpers.js` | 613 | `assembleShort()` rewrite, music model switch, volume ducking, `extractFirstFrame()` |
| `api/lib/scriptGenerator.js` | 193 | Framework-aware generation with overlay_text, scene_label per scene |
| `api/lib/captionBurner.js` | 173 | Dynamic caption config (replace hardcoded CAPTION_STYLES) |
| `src/lib/scenePills.js` | 173 | Context-aware pills (framework + niche + style + duration) |

### Modified Files (Minor)
| File | Lines | Changes |
|------|-------|---------|
| `api/campaigns/preview-script.js` | 70 | Accept framework config, pass to scriptGenerator |
| `api/campaigns/create.js` | 295 | Accept new params (framework, captionConfig, geminiVoice, etc.) |
| `api/campaigns/research.js` | 80+ | Framework-aware research, exclude_topics, variety improvements |
| `server.js` | ~650 | Register new routes (repair-scene, reassemble, frameworks API) |

---

## Task Dependency Graph

```
Task 1 (Frameworks data) ──────────────────────┐
                                                 │
Task 2 (Gemini TTS) ───────────────────────┐    │
                                            │    │
Task 3 (Script generator) ◄────────────────┼────┘
                                            │
Task 4 (Caption system) ──────────┐        │
                                   │        │
Task 5 (Pipeline rewrite) ◄───────┼────────┘
                                   │
Task 6 (Wizard rewrite) ◄─────────┼────────── Tasks 1-5 must be done
                                   │
Task 7 (Scene repair) ◄───────────┘ ───────── Task 5 must be done

Task 8 (Research variety) ─────────────────── Independent, can run anytime
Task 9 (Scene pills v2) ──────────────────── Needs Task 1
Task 10 (Wiring & routes) ────────────────── Needs Tasks 1-7
Task 11 (Integration test) ───────────────── Needs all tasks
```

**Parallelizable:** Tasks 1, 2, 4, 8 can all run concurrently. Task 3 needs Task 1. Task 5 needs Tasks 1-4. Task 6 needs Tasks 1-5.

---

## Task 1: Video Style Frameworks Data Layer

**Files:**
- Create: `api/lib/videoStyleFrameworks.js`
- Create: `src/lib/videoStyleFrameworks.js`

### Backend Framework Definitions

- [ ] **Step 1: Create `api/lib/videoStyleFrameworks.js` with all 16 frameworks**

Each framework follows this structure. Build all 16 from `docs/superpowers/specs/video-style-frameworks-reference.md`:

```javascript
// api/lib/videoStyleFrameworks.js

export const VIDEO_STYLE_FRAMEWORKS = {
  personal_journey: {
    id: 'personal_journey',
    name: 'Personal Journey',
    category: 'story',  // 'story' | 'fast_paced'
    description: 'First-person narrative arc following a transformative experience with emotional beats.',
    thumb: '/assets/frameworks/personal-journey.jpg',
    hookExamples: [
      'How I went from [A] to [B]',
      'What [experience] taught me about [lesson]',
      'The moment everything changed for me',
    ],
    supportedDurations: [60, 90],

    // Recommended defaults (user can override any of these in subsequent wizard steps)
    defaults: {
      visualStyle: 'cinematic',           // from the 124 visual style presets
      videoStylePreset: 'cinematic',      // from the 62 video style presets
      imageModel: 'fal_nano_banana',      // from the 8 image models
      videoModel: 'fal_veo3',            // from the 10 video models
    },

    // Pipeline config
    frameChain: true,
    ttsMode: 'single',           // 'single' | 'per_scene'
    transitionType: 'crossfade', // 'hard_cut' | 'crossfade' | 'wipe'
    transitionDuration: 1.5,     // seconds
    textOverlays: 'optional',    // 'required' | 'optional' | 'none'
    overlayStyle: null,          // 'numbered' | 'labeled' | 'timestamps' | 'before_after' | 'myth_truth' | null
    musicVolume: 0.20,
    musicMood: 'Ambient/emotional',

    // TTS config
    ttsPacing: 'Slow, reflective, conversational',

    // Scene structure per duration
    sceneStructure: {
      60: [
        { label: 'Setup', beat: 'setup', durationRange: [10, 12], overlayText: null },
        { label: 'Inciting moment', beat: 'tension', durationRange: [10, 12], overlayText: null },
        { label: 'Struggle', beat: 'middle', durationRange: [10, 14], overlayText: null },
        { label: 'Turning point', beat: 'breakthrough', durationRange: [10, 12], overlayText: null },
        { label: 'Resolution', beat: 'payoff', durationRange: [10, 12], overlayText: null },
      ],
      90: [
        { label: 'Setup', beat: 'setup', durationRange: [10, 12], overlayText: null },
        { label: 'Inciting moment', beat: 'tension', durationRange: [10, 12], overlayText: null },
        { label: 'Struggle', beat: 'middle', durationRange: [10, 14], overlayText: null },
        { label: 'Turning point', beat: 'breakthrough', durationRange: [10, 12], overlayText: null },
        { label: 'Resolution', beat: 'payoff', durationRange: [10, 12], overlayText: null },
        { label: 'Reflection', beat: 'reflection', durationRange: [10, 12], overlayText: null },
        { label: 'Call to meaning', beat: 'close', durationRange: [8, 10], overlayText: null },
      ],
    },
  },

  // ... repeat for all 16 frameworks using video-style-frameworks-reference.md
  // Story: origin_story, mini_documentary, day_in_the_life, before_after, explainer_story, emotional_tribute
  // Fast-paced: top_x_countdown, everything_you_need_to_know, myth_busting, comparison_versus,
  //             did_you_know, challenge_experiment, history_timeline, hot_take, how_it_works
};

export function getFramework(id) {
  return VIDEO_STYLE_FRAMEWORKS[id] || null;
}

export function listFrameworks() {
  return Object.values(VIDEO_STYLE_FRAMEWORKS);
}

export function getFrameworksByCategory(category) {
  return Object.values(VIDEO_STYLE_FRAMEWORKS).filter(f => f.category === category);
}

export function getSceneStructure(frameworkId, duration) {
  const fw = VIDEO_STYLE_FRAMEWORKS[frameworkId];
  if (!fw) return null;
  return fw.sceneStructure[duration] || fw.sceneStructure[fw.supportedDurations[0]];
}
```

Build ALL 16 frameworks. Use the exact scene structures, durations, overlay styles, music moods, and TTS pacing from `video-style-frameworks-reference.md`. Each framework MUST include `description` (1-line UI blurb), `thumb` (path in `public/assets/frameworks/`), and `defaults` (recommended visual style, video style preset, image model, video model). Key details per framework:

| ID | Category | Durations | Frame Chain | TTS | Overlays | Overlay Style | Default Visual Style | Default Video Preset |
|----|----------|-----------|-------------|-----|----------|---------------|---------------------|---------------------|
| `personal_journey` | story | 60, 90 | ON | single | optional | null | cinematic | cinematic |
| `origin_story` | story | 60, 90 | ON | single | optional | labeled (date) | cinematic | documentary |
| `mini_documentary` | story | 60, 90 | ON | single | optional | labeled (location) | documentary | documentary |
| `day_in_the_life` | story | 45, 60 | ON | single | required | timestamps | photorealistic | vlog_bts |
| `before_after` | story | 30, 45 | ON | single | required | before_after | photorealistic | commercial |
| `explainer_story` | story | 45, 60 | ON | single | optional | null | cinematic | cinematic |
| `emotional_tribute` | story | 45, 60 | ON | single | optional | labeled (key phrase) | cinematic | cinematic |
| `top_x_countdown` | fast_paced | 30, 45, 60 | OFF | per_scene | required | numbered | cinematic | tiktok_reels |
| `everything_you_need_to_know` | fast_paced | 30, 60 | OFF | per_scene | required | labeled | cinematic | tiktok_reels |
| `myth_busting` | fast_paced | 30, 45, 60 | OFF | per_scene | required | myth_truth | cinematic | commercial |
| `comparison_versus` | fast_paced | 30, 45 | OFF | per_scene | required | labeled | cinematic | commercial |
| `did_you_know` | fast_paced | 30, 60 | OFF | per_scene | required | numbered | cinematic | tiktok_reels |
| `challenge_experiment` | story | 45, 60 | ON | single | required | timestamps | photorealistic | vlog_bts |
| `history_timeline` | fast_paced | 60, 90 | OFF | per_scene | required | labeled (years) | cinematic | documentary |
| `hot_take` | fast_paced | 30, 45 | OFF | per_scene | required | labeled | cinematic | tiktok_reels |
| `how_it_works` | story | 45, 60 | ON | single | optional | labeled | cinematic | corporate |

All frameworks default to `imageModel: 'fal_nano_banana'` and `videoModel: 'fal_veo3'` unless the style demands otherwise.

- [ ] **Step 2: Create `src/lib/videoStyleFrameworks.js` — frontend mirror**

```javascript
// src/lib/videoStyleFrameworks.js
// Frontend-only data for wizard display. Pipeline config lives in api/lib/.

export const FRAMEWORK_CARDS = [
  {
    id: 'personal_journey',
    name: 'Personal Journey',
    category: 'story',
    description: 'First-person narrative arc following a transformative experience with emotional beats.',
    thumb: '/assets/frameworks/personal-journey.jpg',
    hook: 'How I went from [A] to [B]',
    badges: ['Frame Chain', 'Single TTS', 'Crossfade'],
    supportedDurations: [60, 90],
    defaults: {
      visualStyle: 'cinematic',
      videoStylePreset: 'cinematic',
      imageModel: 'fal_nano_banana',
      videoModel: 'fal_veo3',
    },
  },
  // ... all 16 frameworks — each with description, thumb, and defaults
];

export function getFrameworkCard(id) {
  return FRAMEWORK_CARDS.find(f => f.id === id) || null;
}

export function getFrameworksByCategory(category) {
  return FRAMEWORK_CARDS.filter(f => f.category === category);
}
```

- [ ] **Step 3: Verify with node**

```bash
node -e "import('./api/lib/videoStyleFrameworks.js').then(m => { console.log(m.listFrameworks().length + ' frameworks'); console.log(m.getSceneStructure('top_x_countdown', 60).length + ' scenes for top_x 60s'); })"
```

Expected: `16 frameworks` and `6 scenes for top_x 60s`

- [ ] **Step 4: Add API endpoint for frameworks**

Add to `server.js` near the existing styles routes:

```javascript
app.get('/api/styles/frameworks', authenticateToken, async (req, res) => {
  const { listFrameworks } = await import('./api/lib/videoStyleFrameworks.js');
  res.json({ frameworks: listFrameworks() });
});
```

- [ ] **Step 5: Generate 16 framework thumbnail images**

Use Imagineer (or direct FAL API call to Nano Banana 2) to generate a representative thumbnail for each framework. Each should visually communicate the framework's concept at a glance. Save to `public/assets/frameworks/<id>.jpg` (e.g., `personal-journey.jpg`, `top-x-countdown.jpg`). Target: 400×400px square thumbnails. These mirror the existing style thumbnails in `public/assets/styles/`.

Prompts should capture the essence:
- `personal_journey` → "Person silhouetted against sunrise, cinematic film look, transformation journey"
- `top_x_countdown` → "Bold number 5 with dynamic graphics, countdown list style, energetic"
- `myth_busting` → "Myth vs truth visual, split screen concept, dramatic reveal"
- etc. — one per framework, matching its mood and structure

```bash
mkdir -p public/assets/frameworks
```

- [ ] **Step 6: Commit**

```bash
git add api/lib/videoStyleFrameworks.js src/lib/videoStyleFrameworks.js server.js public/assets/frameworks/
git commit -m "feat: add 16 video style framework definitions with thumbnails

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Gemini TTS — Replace ElevenLabs

**Files:**
- Modify: `api/lib/voiceoverGenerator.js` (208 lines — rewrite core function)

### Replace TTS Backend

- [ ] **Step 1: Read current `voiceoverGenerator.js` thoroughly**

Read the file. Note the current `generateVoiceover()` signature (line 57) and the `resolveVoiceName()` mapping (line 37). The Whisper-related functions (`generateTimestamps`, `mapWordsToScenes`) are currently unused by the pipeline (Step 3 is skipped) but keep them for now.

- [ ] **Step 2: Add Gemini TTS constants and voice list**

Add at the top of `voiceoverGenerator.js`:

```javascript
// Gemini TTS voices via fal-ai/gemini-tts
export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', description: 'Strong, firm female' },
  { id: 'Puck', label: 'Puck', description: 'Upbeat, lively male' },
  { id: 'Charon', label: 'Charon', description: 'Calm, professional male' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Bright, clear female' },
  { id: 'Aoede', label: 'Aoede', description: 'Warm, melodic female' },
  { id: 'Achernar', label: 'Achernar', description: 'Deep, resonant' },
  { id: 'Achird', label: 'Achird', description: 'Gentle, measured' },
  { id: 'Algenib', label: 'Algenib', description: 'Energetic, bright' },
  { id: 'Algieba', label: 'Algieba', description: 'Warm, conversational' },
  { id: 'Alnilam', label: 'Alnilam', description: 'Steady, authoritative' },
  { id: 'Autonoe', label: 'Autonoe', description: 'Soft, thoughtful' },
  { id: 'Callirrhoe', label: 'Callirrhoe', description: 'Clear, articulate' },
  { id: 'Despina', label: 'Despina', description: 'Light, airy' },
  { id: 'Enceladus', label: 'Enceladus', description: 'Rich, dramatic' },
  { id: 'Erinome', label: 'Erinome', description: 'Crisp, professional' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Bold, commanding' },
  { id: 'Gacrux', label: 'Gacrux', description: 'Smooth, reassuring' },
  { id: 'Iapetus', label: 'Iapetus', description: 'Neutral, versatile' },
  { id: 'Laomedeia', label: 'Laomedeia', description: 'Melodious, flowing' },
  { id: 'Leda', label: 'Leda', description: 'Quiet, intimate' },
  { id: 'Orus', label: 'Orus', description: 'Strong, grounded' },
  { id: 'Pulcherrima', label: 'Pulcherrima', description: 'Elegant, refined' },
  { id: 'Rasalgethi', label: 'Rasalgethi', description: 'Deep, sonorous' },
  { id: 'Sadachbia', label: 'Sadachbia', description: 'Cheerful, warm' },
  { id: 'Sadaltager', label: 'Sadaltager', description: 'Measured, precise' },
  { id: 'Schedar', label: 'Schedar', description: 'Bright, enthusiastic' },
  { id: 'Sulafat', label: 'Sulafat', description: 'Calm, soothing' },
  { id: 'Umbriel', label: 'Umbriel', description: 'Low, mysterious' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', description: 'Clear, confident' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', description: 'Animated, expressive' },
];

const GEMINI_TTS_ENDPOINT = 'fal-ai/gemini-tts';
```

- [ ] **Step 3: Add `generateGeminiVoiceover()` function**

Add a new function alongside the existing one (don't delete old one yet — legacy campaigns may need it):

```javascript
/**
 * Generate voiceover using Gemini TTS via FAL.
 * @param {string} text - Narration text
 * @param {object} keys - { falKey }
 * @param {object} supabase - Supabase client
 * @param {object} options - { voice, model, styleInstructions }
 * @returns {Promise<string>} Public URL of generated MP3
 */
export async function generateGeminiVoiceover(text, keys, supabase, options = {}) {
  const {
    voice = 'Kore',
    model = 'gemini-2.5-flash-tts',
    styleInstructions = 'Say the following in a warm, conversational tone',
  } = options;

  console.log(`[Gemini TTS] Generating voiceover: voice=${voice}, model=${model}, text length=${text.length}`);

  const body = {
    prompt: text,
    style_instructions: styleInstructions,
    voice,
    model,
    language_code: 'English (US)',
    temperature: 1,
    output_format: 'mp3',
  };

  // Submit to FAL queue
  const submitRes = await fetch(`https://queue.fal.run/${GEMINI_TTS_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${keys.falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Gemini TTS submit failed (${submitRes.status}): ${err}`);
  }

  const { request_id } = await submitRes.json();
  console.log(`[Gemini TTS] Queued: request_id=${request_id}`);

  // Poll for completion
  const { pollFalQueue } = await import('./pipelineHelpers.js');
  const result = await pollFalQueue(request_id, GEMINI_TTS_ENDPOINT, keys.falKey, 120, 2000);

  if (!result?.audio?.url) {
    throw new Error('Gemini TTS returned no audio URL');
  }

  console.log(`[Gemini TTS] Complete: ${result.audio.url}`);

  // Upload to Supabase for persistence
  const { uploadUrlToSupabase } = await import('./pipelineHelpers.js');
  const publicUrl = await uploadUrlToSupabase(result.audio.url, supabase, 'voiceover');
  return publicUrl;
}
```

- [ ] **Step 3b: Create `src/lib/geminiVoices.js` — frontend voice list**

The backend voice list is in `api/lib/voiceoverGenerator.js` (not importable by frontend). Create a frontend mirror:

```javascript
// src/lib/geminiVoices.js
export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', description: 'Strong, firm female' },
  { id: 'Puck', label: 'Puck', description: 'Upbeat, lively male' },
  { id: 'Charon', label: 'Charon', description: 'Calm, professional male' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Bright, clear female' },
  { id: 'Aoede', label: 'Aoede', description: 'Warm, melodic female' },
  // ... all 30 voices (same list as backend)
  { id: 'Achernar', label: 'Achernar', description: 'Deep, resonant' },
  { id: 'Achird', label: 'Achird', description: 'Gentle, measured' },
  { id: 'Algenib', label: 'Algenib', description: 'Energetic, bright' },
  { id: 'Algieba', label: 'Algieba', description: 'Warm, conversational' },
  { id: 'Alnilam', label: 'Alnilam', description: 'Steady, authoritative' },
  { id: 'Autonoe', label: 'Autonoe', description: 'Soft, thoughtful' },
  { id: 'Callirrhoe', label: 'Callirrhoe', description: 'Clear, articulate' },
  { id: 'Despina', label: 'Despina', description: 'Light, airy' },
  { id: 'Enceladus', label: 'Enceladus', description: 'Rich, dramatic' },
  { id: 'Erinome', label: 'Erinome', description: 'Crisp, professional' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Bold, commanding' },
  { id: 'Gacrux', label: 'Gacrux', description: 'Smooth, reassuring' },
  { id: 'Iapetus', label: 'Iapetus', description: 'Neutral, versatile' },
  { id: 'Laomedeia', label: 'Laomedeia', description: 'Melodious, flowing' },
  { id: 'Leda', label: 'Leda', description: 'Quiet, intimate' },
  { id: 'Orus', label: 'Orus', description: 'Strong, grounded' },
  { id: 'Pulcherrima', label: 'Pulcherrima', description: 'Elegant, refined' },
  { id: 'Rasalgethi', label: 'Rasalgethi', description: 'Deep, sonorous' },
  { id: 'Sadachbia', label: 'Sadachbia', description: 'Cheerful, warm' },
  { id: 'Sadaltager', label: 'Sadaltager', description: 'Measured, precise' },
  { id: 'Schedar', label: 'Schedar', description: 'Bright, enthusiastic' },
  { id: 'Sulafat', label: 'Sulafat', description: 'Calm, soothing' },
  { id: 'Umbriel', label: 'Umbriel', description: 'Low, mysterious' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', description: 'Clear, confident' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', description: 'Animated, expressive' },
];

// Popular voices shown first in the picker
export const FEATURED_VOICES = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Aoede'];
```

- [ ] **Step 4: Add voice preview endpoint**

Modify `api/voice/preview.js` to support Gemini voices. Read the current file first, then add a branch for Gemini:

```javascript
// If the voice is a Gemini voice name (not an ElevenLabs ID), use Gemini TTS
const geminiVoiceNames = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Aoede', /* ... all 30 */];
if (geminiVoiceNames.includes(voiceId)) {
  const { generateGeminiVoiceover } = await import('../lib/voiceoverGenerator.js');
  const url = await generateGeminiVoiceover(previewText, keys, supabase, {
    voice: voiceId,
    model: 'gemini-2.5-flash-tts',
    styleInstructions: styleInstructions || 'Say the following naturally',
  });
  return res.json({ audio_url: url });
}
```

- [ ] **Step 5: Verify Gemini TTS works manually**

```bash
# Start the server
npm run server
# In another terminal, test with curl (replace YOUR_TOKEN with a valid Supabase JWT):
curl -X POST http://localhost:3003/api/voice/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voice_id": "Kore", "text": "Welcome to AI Frontiers, the show about the future."}'
```

Expected: `{ "audio_url": "https://..." }` with a working MP3 URL.

- [ ] **Step 6: Commit**

```bash
git add api/lib/voiceoverGenerator.js api/voice/preview.js
git commit -m "feat: add Gemini TTS via fal-ai/gemini-tts (30 voices)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Framework-Aware Script Generator

**Files:**
- Modify: `api/lib/scriptGenerator.js` (193 lines)
- Modify: `api/campaigns/preview-script.js` (70 lines)

- [ ] **Step 1: Read current `scriptGenerator.js` and `preview-script.js`**

Understand the current Zod schema (ShortsScriptSchema) and GPT prompt structure.

- [ ] **Step 2: Update the Zod output schema**

Add `overlay_text` and `scene_label` to the per-scene schema:

```javascript
const SceneSchema = z.object({
  role: z.string(),
  narration_segment: z.string(),
  visual_prompt: z.string(),
  motion_prompt: z.string(),
  duration_seconds: z.number(),
  overlay_text: z.string().nullable().optional(),  // NEW — on-screen text
  scene_label: z.string().optional(),              // NEW — framework beat name
});
```

- [ ] **Step 3: Update `generateScript()` to accept framework config**

Add `framework` to the destructured params:

```javascript
export async function generateScript({
  niche, topic, nicheTemplate, keys, brandUsername,
  storyContext, visualDirections, targetDurationSeconds,
  framework,  // NEW — full framework object from videoStyleFrameworks.js
}) {
```

- [ ] **Step 4: Build framework-aware system prompt**

When a framework is provided, replace the generic scene structure with the framework's specific beats:

```javascript
let frameworkBlock = '';
if (framework) {
  const sceneStructure = framework.sceneStructure[targetDurationSeconds]
    || framework.sceneStructure[framework.supportedDurations[0]];

  const sceneGuide = sceneStructure.map((s, i) =>
    `Scene ${i + 1} "${s.label}" (${s.durationRange[0]}-${s.durationRange[1]}s): ${s.beat}` +
    (s.overlayText ? ` — overlay text: ${s.overlayText}` : '')
  ).join('\n');

  frameworkBlock = `
VIDEO STYLE FRAMEWORK: ${framework.name}
Category: ${framework.category === 'story' ? 'Narrative/Story (flowing, connected scenes)' : 'Fast-Paced/List (independent, punchy scenes)'}
TTS Pacing: ${framework.ttsPacing}
Text Overlays: ${framework.textOverlays === 'required' ? 'REQUIRED — each scene MUST have overlay_text' : framework.textOverlays === 'optional' ? 'Optional — add overlay_text where it enhances clarity' : 'None — leave overlay_text null'}
Overlay Style: ${framework.overlayStyle || 'N/A'}

SCENE STRUCTURE (follow this exactly):
${sceneGuide}

Write narration that matches this pacing: ${framework.ttsPacing}
${framework.category === 'fast_paced' ? 'Each scene should be self-contained and punchy. No flowery transitions between scenes.' : 'Scenes should flow naturally into each other like a continuous story.'}
`;
}
```

Append `frameworkBlock` to the system or user prompt alongside `storyContextBlock` and `visualDirectionsBlock`.

- [ ] **Step 5: Update scene count logic**

Replace the hardcoded scene count mapping with framework-driven counts:

```javascript
// OLD: const targetSceneCount = { 15: 3, 30: 3, 45: 4, 60: 5, 90: 7 }[targetDurationSeconds] || 5;
// NEW:
let targetSceneCount;
if (framework) {
  const sceneStructure = framework.sceneStructure[targetDurationSeconds]
    || framework.sceneStructure[framework.supportedDurations[0]];
  targetSceneCount = sceneStructure.length;
} else {
  // Legacy fallback
  targetSceneCount = { 15: 3, 30: 3, 45: 4, 60: 5, 90: 7 }[targetDurationSeconds] || 5;
}
```

- [ ] **Step 6: Update `preview-script.js` to pass framework**

```javascript
// In the handler, after resolving niche template:
const { getFramework } = await import('../lib/videoStyleFrameworks.js');
const framework = req.body.framework ? getFramework(req.body.framework) : null;

// Pass to generateScript:
const scriptResult = await generateScript({
  niche, topic, nicheTemplate, keys, brandUsername,
  storyContext: req.body.story_context,
  visualDirections: req.body.visual_directions,
  targetDurationSeconds: req.body.videoLengthPreset || 60,
  framework,  // NEW
});
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add api/lib/scriptGenerator.js api/campaigns/preview-script.js
git commit -m "feat: framework-aware script generation with overlay_text per scene

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Caption System — Dynamic Config

**Files:**
- Modify: `api/lib/captionBurner.js` (173 lines)

- [ ] **Step 1: Read current `captionBurner.js`**

Note the existing `CAPTION_STYLES` object (lines 15-80) and the `burnCaptions()` signature (line 92).

- [ ] **Step 2: Keep CAPTION_STYLES as presets but make `burnCaptions()` accept a full config object**

```javascript
// Update the function signature:
export async function burnCaptions(videoUrl, captionConfig, falKey, supabase) {
  // If captionConfig is a string (legacy), look up in CAPTION_STYLES
  const config = typeof captionConfig === 'string'
    ? (CAPTION_STYLES[captionConfig] || CAPTION_STYLES.word_pop)
    : captionConfig;

  const body = {
    video_url: videoUrl,
    language: 'en',
    font_name: config.font_name || 'Montserrat',
    font_size: config.font_size || 100,
    font_weight: config.font_weight || 'bold',
    font_color: config.font_color || 'white',
    highlight_color: config.highlight_color || 'purple',
    stroke_width: config.stroke_width || 3,
    stroke_color: config.stroke_color || 'black',
    background_color: config.background_color || 'none',
    background_opacity: config.background_opacity || 0,
    position: config.position || 'bottom',
    y_offset: config.y_offset || 75,
    words_per_subtitle: config.words_per_subtitle || 1,
    enable_animation: config.enable_animation !== false,
  };

  // ... rest of the function (submit to fal-ai/workflow-utilities/auto-subtitle, poll, return URL)
}
```

- [ ] **Step 3: Export CAPTION_STYLES for the frontend presets**

```javascript
export { CAPTION_STYLES };
```

- [ ] **Step 4: Add caption presets API endpoint**

In `server.js`:

```javascript
app.get('/api/styles/captions', authenticateToken, async (req, res) => {
  const { CAPTION_STYLES } = await import('./api/lib/captionBurner.js');
  res.json({ presets: CAPTION_STYLES });
});
```

- [ ] **Step 5: Commit**

```bash
git add api/lib/captionBurner.js server.js
git commit -m "feat: dynamic caption config, expose presets via API

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Pipeline Rewrite — Framework-Driven Generation

**Files:**
- Modify: `api/lib/shortsPipeline.js` (485 lines — significant rewrite)
- Modify: `api/lib/pipelineHelpers.js` (613 lines — assembleShort, music, extractFirstFrame)
- Modify: `api/campaigns/create.js` (295 lines — accept new params)

This is the biggest task. Break it into sub-steps.

### 5A: Pipeline Helpers Updates

- [ ] **Step 1: Read `pipelineHelpers.js` thoroughly**

Focus on `assembleShort()` (lines 338-379), `generateMusic()` (lines 393-457), `extractLastFrame()` (lines 472-493).

- [ ] **Step 2: Add `extractFirstFrame()` function**

Add near `extractLastFrame()`:

```javascript
export async function extractFirstFrame(videoUrl, falKey) {
  console.log('[extractFirstFrame] Extracting first frame...');
  const body = { video_url: videoUrl, frame_type: 'first' };
  const submitRes = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/extract-frame', {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) throw new Error(`extractFirstFrame submit failed: ${submitRes.status}`);
  const { request_id } = await submitRes.json();
  const result = await pollFalQueue(request_id, 'fal-ai/ffmpeg-api/extract-frame', falKey, 60, 2000);
  if (!result?.image?.url) throw new Error('extractFirstFrame returned no image URL');
  console.log('[extractFirstFrame] Done:', result.image.url);
  return result.image.url;
}
```

- [ ] **Step 3: Switch default music model from MiniMax to Lyria 2**

In `generateMusic()`, change the default model parameter:

```javascript
// OLD: export async function generateMusic(moodPrompt, durationSeconds = 30, keys, supabase, model = 'minimax')
// NEW:
export async function generateMusic(moodPrompt, durationSeconds = 30, keys, supabase, model = 'fal_lyria2')
```

Also ensure `lyrics_prompt: '[Instrumental]'` is set for ALL models that support it (MiniMax already has it; add for Lyria 2 if applicable). Verify the Lyria 2 section uses the correct duration parameter name.

- [ ] **Step 4: Update `assembleShort()` to accept music volume**

Add `musicVolume` parameter:

```javascript
export async function assembleShort(videoUrls, voiceoverUrl, musicUrl, falKey, supabase, clipDurations = [], musicVolume = 0.15) {
  // ... existing keyframe building logic ...

  // Update music track volume:
  // Find where music keyframes are created and apply volume
  // In the tracks array, the music track's volume should use musicVolume param
}
```

Check the existing FAL ffmpeg-api/compose API to see if it supports a `volume` property on audio keyframes. If yes, apply `musicVolume`. If not, this is a limitation to document.

- [ ] **Step 5: Commit helpers**

```bash
git add api/lib/pipelineHelpers.js
git commit -m "feat: add extractFirstFrame, switch to Lyria 2, add music volume param

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 5B: Pipeline Core Rewrite

- [ ] **Step 6: Read current `shortsPipeline.js` thoroughly**

Map the current 9-step flow. Note where voiceover is generated (step 2), where images/clips are generated (steps 4-5), where music is generated (step 6), and where assembly happens (step 7).

- [ ] **Step 7: Rewrite `runShortsPipeline()` with framework-aware flow**

The new pipeline order (from the spec):

```javascript
export async function runShortsPipeline(opts) {
  const {
    niche, topic, story_context, brand_username,
    visual_style, visual_style_prompt, video_style, video_model,
    voice_id,          // Legacy ElevenLabs voice
    gemini_voice,      // NEW — Gemini voice name
    gemini_model,      // NEW — 'gemini-2.5-flash-tts' or 'gemini-2.5-pro-tts'
    style_instructions, // NEW — TTS pacing instructions
    caption_config,    // NEW — full caption config object (replaces caption_style)
    caption_style,     // Legacy — string key
    lora_config, script, starting_image, image_model,
    video_length_preset,
    generate_audio, enable_background_music,
    framework_id,      // NEW — framework key
    aspect_ratio,      // NEW — '9:16' or '16:9'
    supabase, keys, jobId, campaignId, userId, nicheTemplate,
  } = opts;

  // 1. Load framework
  const { getFramework, getSceneStructure } = await import('./videoStyleFrameworks.js');
  const framework = framework_id ? getFramework(framework_id) : null;
  const sceneStructure = framework ? getSceneStructure(framework_id, video_length_preset) : null;

  // 2. Generate script (if not provided)
  // ... call generateScript with framework ...

  // 3. Generate TTS voiceover
  //    framework.ttsMode === 'single' → one call with all narration
  //    framework.ttsMode === 'per_scene' → one call per scene
  const useGemini = !!gemini_voice;
  let voiceoverUrl = null;
  let perSceneVoiceovers = [];

  if (useGemini && framework?.ttsMode === 'per_scene') {
    // Per-scene Gemini TTS
    for (const scene of scriptResult.scenes) {
      const url = await generateGeminiVoiceover(scene.narration_segment, keys, supabase, {
        voice: gemini_voice,
        model: gemini_model || 'gemini-2.5-flash-tts',
        styleInstructions: style_instructions || framework.ttsPacing,
      });
      perSceneVoiceovers.push(url);
    }
  } else if (useGemini) {
    // Single-file Gemini TTS
    const fullNarration = scriptResult.scenes.map(s => s.narration_segment).join('\n\n');
    voiceoverUrl = await generateGeminiVoiceover(fullNarration, keys, supabase, {
      voice: gemini_voice,
      model: gemini_model || 'gemini-2.5-flash-tts',
      styleInstructions: style_instructions || framework?.ttsPacing,
    });
  } else {
    // Legacy ElevenLabs
    voiceoverUrl = await generateVoiceover(/* existing params */);
  }

  // 4. Measure audio durations (TODO: implement duration measurement)
  //    For per-scene: measure each file
  //    For single: measure total, distribute proportionally by character count

  // 5. Adjust scene video durations to match audio

  // 6. Generate images + video clips (with frame chaining per framework)
  //    framework.frameChain === true → reuse prev scene's last frame
  //    framework.frameChain === false → generate fresh image per scene
  //    Save first_frame_url and last_frame_url per scene to step_results

  // 7. Generate music
  //    Duration = sum of actual clip durations
  //    Model = Lyria 2 (default)
  //    lyrics_prompt = '[Instrumental]' always
  //    Mood from framework.musicMood

  // 8. Assemble
  //    Volume = framework.musicVolume
  //    Transitions per framework (initially hard cuts, crossfade later)

  // 9. Burn captions with full captionConfig

  // 10. Save to ad_drafts with all scene assets in step_results
}
```

Write the full implementation. The key structural changes from the old pipeline:
- TTS comes BEFORE video generation (voiceover is master clock)
- Per-scene vs single-file TTS based on framework
- Frame chaining conditional on framework
- All scene assets (image_url, video_url, first_frame_url, last_frame_url, voiceover_url) saved to `step_results`
- Music uses Lyria 2, duration matches actual video
- Caption config is a full object, not a string key
- Error handling: retry once per scene, then skip and continue

- [ ] **Step 8: Verify build**

```bash
npm run build
```

- [ ] **Step 9: Commit pipeline rewrite**

```bash
git add api/lib/shortsPipeline.js
git commit -m "feat: framework-driven pipeline with Gemini TTS, duration matching, scene assets

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 5C: Update `create.js` Entry Point

- [ ] **Step 10: Read `api/campaigns/create.js`**

Note the shorts branch (lines 64-135) and the params it extracts from `req.body`.

- [ ] **Step 11: Add new params to the shorts branch**

```javascript
// Add to the destructured params from req.body:
const {
  // ... existing params ...
  framework: framework_id,     // NEW
  caption_config,              // NEW
  gemini_voice,                // NEW
  gemini_model,                // NEW
  style_instructions,          // NEW
  aspect_ratio,                // NEW
} = req.body;

// Pass all to runShortsPipeline:
runShortsPipeline({
  // ... existing params ...
  framework_id,
  caption_config,
  gemini_voice,
  gemini_model,
  style_instructions,
  aspect_ratio,
  // ...
});
```

- [ ] **Step 12: Commit**

```bash
git add api/campaigns/create.js
git commit -m "feat: accept framework and Gemini TTS params in campaign creation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Wizard Rewrite — 11-Step Framework-Driven Flow

**Files:**
- Modify: `src/pages/CampaignsNewPage.jsx` (~1300 lines — significant rewrite)

This is the largest frontend task. The wizard is rewritten from 10 steps to 11 steps with completely different ordering.

- [ ] **Step 1: Read current `CampaignsNewPage.jsx` thoroughly**

Map: WIZARD_STEPS array (line 128), all state variables (lines 230-280), all handler functions (lines 390-520), and all step render blocks (lines 730-1305).

- [ ] **Step 2: Update WIZARD_STEPS array**

```javascript
const WIZARD_STEPS = [
  { key: 'niche', label: 'Niche & Brand' },
  { key: 'framework', label: 'Video Style' },        // NEW
  { key: 'look_feel', label: 'Look & Feel' },        // MOVED UP
  { key: 'motion', label: 'Motion & Video' },        // MOVED UP
  { key: 'voice', label: 'Voice & Music' },           // MOVED UP
  { key: 'pills', label: 'Scene Direction' },         // RENAMED
  { key: 'topics', label: 'Topic & Research' },        // MOVED DOWN
  { key: 'script', label: 'Script' },                  // MOVED DOWN
  { key: 'captions', label: 'Captions' },              // EXPANDED
  { key: 'preview', label: 'Preview Image' },
  { key: 'review', label: 'Review' },
];
```

- [ ] **Step 3: Add new state variables**

```javascript
// Framework
const [selectedFramework, setSelectedFramework] = useState(null);
const [frameworkCards, setFrameworkCards] = useState([]);

// Gemini TTS
const [geminiVoice, setGeminiVoice] = useState('Kore');
const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash-tts');
const [styleInstructions, setStyleInstructions] = useState('');

// Aspect ratio
const [aspectRatio, setAspectRatio] = useState('9:16');

// Full caption config (replaces single captionStyle string)
const [captionConfig, setCaptionConfig] = useState({
  font_name: 'Montserrat',
  font_size: 100,
  font_weight: 'bold',
  font_color: 'white',
  highlight_color: 'purple',
  stroke_width: 3,
  stroke_color: 'black',
  background_color: 'none',
  background_opacity: 0,
  position: 'bottom',
  y_offset: 75,
  words_per_subtitle: 1,
  enable_animation: true,
});
```

- [ ] **Step 4: Load framework cards on mount**

```javascript
useEffect(() => {
  // Load frameworks
  apiFetch('/api/styles/frameworks').then(data => {
    if (data?.frameworks) setFrameworkCards(data.frameworks);
  });
}, []);
```

- [ ] **Step 5: Build Step 2 — Framework Picker**

Show 16 framework cards in two sections (Story / Fast-Paced). Each card shows name, hook example, badges. On selection, pre-fill downstream defaults:

```javascript
const handleFrameworkSelect = (fw) => {
  setSelectedFramework(fw);
  // Pre-fill TTS pacing
  setStyleInstructions(fw.ttsPacing);
  // Pre-fill duration to first supported value
  setVideoLengthPreset(fw.supportedDurations[0]);
  // Pre-fill music toggle based on framework
  setEnableBackgroundMusic(true);
  // Pre-fill downstream pickers from framework defaults (user can still override)
  if (fw.defaults) {
    if (fw.defaults.visualStyle) setSelectedStyle(fw.defaults.visualStyle);
    if (fw.defaults.videoStylePreset) setVideoStyle(fw.defaults.videoStylePreset);
    if (fw.defaults.imageModel) setImageModel(fw.defaults.imageModel);
    if (fw.defaults.videoModel) setVideoModel(fw.defaults.videoModel);
  }
};
```

Duration picker appears below the framework grid as radio buttons showing only the framework's `supportedDurations`.

- [ ] **Step 6: Update Step 5 — Voice picker with Gemini voices**

Replace ElevenLabs voice library browsing with Gemini voice grid:

```javascript
// Import GEMINI_VOICES from a shared constant or fetch from API
import { GEMINI_VOICES } from '@/lib/geminiVoices';

// Render voice cards with name + description
// Voice preview button calls /api/voice/preview with the Gemini voice name
// Style instructions text area (pre-filled from framework.ttsPacing, editable)
// TTS model toggle: Flash (fast) / Pro (premium)
```

- [ ] **Step 7: Build Step 9 — Full Caption Editor**

Replace the simple caption style selector with a full parameter editor:

```javascript
// Caption presets as quick-select buttons
const CAPTION_PRESETS = {
  word_pop: { label: 'Word Pop', font_name: 'Montserrat', font_size: 110, font_weight: 'bold', font_color: 'white', highlight_color: '#FFD700', stroke_width: 3, stroke_color: 'black', position: 'bottom', y_offset: 75, words_per_subtitle: 1, enable_animation: true },
  karaoke_glow: { /* ... */ },
  news_ticker: { /* ... */ },
  phrase: { /* ... */ },
};

// Render form with:
// - Preset buttons (click → setCaptionConfig(preset))
// - Font dropdown, size slider, weight toggle
// - Color pickers for font_color, highlight_color, stroke_color
// - Stroke width slider
// - Position dropdown (top/center/bottom) + y_offset slider
// - Words per subtitle slider (1-8)
// - Animation toggle
// - Live preview div showing styled text sample
```

- [ ] **Step 8: Update `handleGenerateScript` to pass framework**

```javascript
const handleGenerateScript = async () => {
  const res = await apiFetch('/api/campaigns/preview-script', {
    method: 'POST',
    body: JSON.stringify({
      niche,
      topic: topic.trim(),
      brand_username: selectedBrand,
      story_context: storyContext || undefined,
      visual_directions: sceneBuilderPills.length > 0 ? sceneBuilderPills : undefined,
      videoLengthPreset,
      framework: selectedFramework?.id,  // NEW
    }),
  });
  // ... handle response ...
};
```

- [ ] **Step 9: Update `handleCreate` to pass all new params**

```javascript
const handleCreate = async (generate = false) => {
  const body = {
    content_type: 'shorts',
    name: topic.slice(0, 60),
    brand_username: selectedBrand,
    niche,
    topic: topic.trim(),
    story_context: storyContext || undefined,
    visual_style: visualStyle,
    visual_style_prompt: getVisualStylePrompt(visualStyle),
    video_style: videoStyle,
    video_model: videoModel,
    image_model: imageModel,
    voice_id: undefined,            // Legacy — only if not using Gemini
    gemini_voice: geminiVoice,      // NEW
    gemini_model: geminiModel,      // NEW
    style_instructions: styleInstructions, // NEW
    caption_config: captionConfig,  // NEW (full object)
    lora_config: loraConfig.length > 0 ? loraConfig : undefined,
    video_length_preset: videoLengthPreset,
    generate_audio: generateAudio,
    enable_background_music: enableBackgroundMusic,
    starting_image: previewImageUrl || undefined,
    script: scriptScenes.length > 0 ? { scenes: scriptScenes } : undefined,
    framework: selectedFramework?.id, // NEW
    aspect_ratio: aspectRatio,       // NEW
  };
  // ... rest of create handler ...
};
```

- [ ] **Step 10: Verify build**

```bash
npm run build
```

- [ ] **Step 11: Start dev server and manually test wizard flow**

```bash
npm run start
```

Walk through all 11 steps. Verify:
- Framework picker shows 16 cards in two sections
- Selecting a framework pre-fills duration, TTS pacing
- Voice step shows 30 Gemini voices
- Caption step shows full parameter editor with presets
- Script generation includes framework context
- Review step shows all selections

- [ ] **Step 12: Commit**

```bash
git add src/pages/CampaignsNewPage.jsx src/lib/geminiVoices.js
git commit -m "feat: 11-step wizard with framework picker, Gemini voices, caption editor

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Scene Repair — Veo 3.1 First-Last-Frame

**Files:**
- Create: `api/shorts/repair-scene.js`
- Create: `api/shorts/reassemble.js`
- Modify: `server.js` (register new routes)

- [ ] **Step 0: Create `api/shorts/` directory**

```bash
mkdir -p api/shorts
```

- [ ] **Step 1: Create `api/shorts/repair-scene.js`**

```javascript
import { createClient } from '@supabase/supabase-js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';

export default async function handler(req, res) {
  const { draft_id, scene_index, prompt, duration } = req.body;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  // 1. Look up job via draft
  const { data: draft } = await supabase
    .from('ad_drafts')
    .select('campaign_id')
    .eq('id', draft_id)
    .single();

  if (!draft) return res.status(404).json({ error: 'Draft not found' });

  const { data: job } = await supabase
    .from('jobs')
    .select('id, step_results, input_json')
    .filter('input_json->>campaign_id', 'eq', draft.campaign_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!job) return res.status(404).json({ error: 'Job not found' });

  const stepResults = job.step_results;
  const scenes = stepResults.scenes;
  const scene = scenes[scene_index];
  if (!scene) return res.status(400).json({ error: `Scene ${scene_index} not found` });

  // 2. Get first/last frames from adjacent scenes
  const prevScene = scene_index > 0 ? scenes[scene_index - 1] : null;
  const nextScene = scene_index < scenes.length - 1 ? scenes[scene_index + 1] : null;

  const firstFrameUrl = prevScene?.last_frame_url || stepResults.global?.starting_image;
  const lastFrameUrl = nextScene?.first_frame_url;

  if (!firstFrameUrl) {
    return res.status(400).json({ error: 'Cannot repair: no first frame (no previous scene or starting image).' });
  }

  // Last scene edge case: no lastFrameUrl → use standard image-to-video instead of FLF
  // (FLF requires both frames; last scene has no "next" scene to get last_frame from)
  if (!lastFrameUrl) {
    const { animateImageV2 } = await import('../lib/mediaGenerator.js');
    const videoUrl = await animateImageV2({
      imageUrl: firstFrameUrl,
      prompt: prompt || scene.motion_prompt || scene.visual_prompt,
      model: stepResults.video_model || 'fal_veo3',
      duration: scene.duration_seconds || 8,
      keys,
      aspectRatio: stepResults.aspect_ratio || '9:16',
    });
    return res.json({ video_url: videoUrl, scene_index, status: 'completed' });
  }

  // 3. Get user keys
  const { getUserKeys } = await import('../lib/getUserKeys.js');
  const keys = await getUserKeys(req.user.id, req.user.email);

  // 4. Call Veo 3.1 First-Last-Frame
  const veoBody = {
    prompt: prompt || scene.motion_prompt || scene.visual_prompt,
    first_frame_url: firstFrameUrl,
    last_frame_url: lastFrameUrl,
    aspect_ratio: stepResults.aspect_ratio || '9:16',
    duration: duration || '8s',
    resolution: '720p',
    generate_audio: false,
    safety_tolerance: '4',
  };

  const submitRes = await fetch('https://queue.fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(veoBody),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    return res.status(500).json({ error: `Veo 3.1 FLF submit failed: ${err}` });
  }

  const { request_id } = await submitRes.json();

  // Return immediately, poll on frontend
  res.json({ request_id, scene_index, status: 'queued' });
}
```

- [ ] **Step 2: Create `api/shorts/reassemble.js`**

```javascript
import { createClient } from '@supabase/supabase-js';
import { assembleShort, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { burnCaptions } from '../lib/captionBurner.js';

export default async function handler(req, res) {
  const { draft_id, caption_config: overrideCaptionConfig } = req.body;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Look up job via draft (same lookup as repair-scene)
  // ... (same pattern as repair-scene.js) ...

  const stepResults = job.step_results;
  const scenes = stepResults.scenes.filter(s => s.status === 'completed');
  const videoUrls = scenes.map(s => s.video_url);
  const clipDurations = scenes.map(s => s.duration_seconds);

  const { getUserKeys } = await import('../lib/getUserKeys.js');
  const keys = await getUserKeys(req.user.id, req.user.email);

  // 2. Re-assemble
  const { getFramework } = await import('../lib/videoStyleFrameworks.js');
  const framework = stepResults.framework ? getFramework(stepResults.framework) : null;

  const assembledUrl = await assembleShort(
    videoUrls,
    stepResults.global.voiceover_url,
    stepResults.global.music_url,
    keys.falKey,
    supabase,
    clipDurations,
    framework?.musicVolume || 0.15,
  );

  // 3. Re-burn captions
  const captionConfig = overrideCaptionConfig || stepResults.caption_config;
  const captionedUrl = await burnCaptions(assembledUrl, captionConfig, keys.falKey, supabase);

  // 4. Update draft
  await supabase
    .from('ad_drafts')
    .update({ video_url: captionedUrl })
    .eq('id', draft_id);

  // 5. Update step_results
  stepResults.global.assembled_url = assembledUrl;
  stepResults.global.captioned_url = captionedUrl;
  await supabase
    .from('jobs')
    .update({ step_results: stepResults })
    .eq('id', job.id);

  res.json({ video_url: captionedUrl });
}
```

- [ ] **Step 3: Register routes in `server.js`**

```javascript
app.post('/api/shorts/repair-scene', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('shorts/repair-scene.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/shorts/reassemble', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('shorts/reassemble.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add api/shorts/repair-scene.js api/shorts/reassemble.js server.js
git commit -m "feat: scene repair via Veo 3.1 First-Last-Frame + reassemble endpoint

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Research Variety Improvements

**Files:**
- Modify: `api/campaigns/research.js`

- [ ] **Step 1: Read current `research.js`**

Note the niche search queries (lines 38-51) and the GPT structured output format.

- [ ] **Step 2: Add `exclude_topics` param and framework-aware research**

```javascript
const { niche, brand_username, count = 5, exclude_topics = [], framework } = req.body;

// Add to the GPT prompt:
const excludeBlock = exclude_topics.length > 0
  ? `\n\nAVOID these topics (already covered): ${exclude_topics.join(', ')}`
  : '';

const frameworkBlock = framework
  ? `\n\nVIDEO FORMAT: ${framework} — tailor research for this format. ${
      framework.includes('top') || framework.includes('countdown') ? 'Find list-worthy items.' :
      framework.includes('documentary') || framework.includes('story') ? 'Find deep-dive stories with narrative arcs.' :
      framework.includes('myth') ? 'Find common misconceptions to debunk.' :
      framework.includes('comparison') ? 'Find comparable items to pit against each other.' :
      'Find interesting angles.'
    }`
  : '';

// Add to GPT prompt
const prompt = `Find ${count} unique, surprising, and under-covered story angles about ${topic} in the ${nicheName} niche.${excludeBlock}${frameworkBlock}

Focus on novel angles, not generic overviews. Each story should have a specific hook that would make someone stop scrolling.`;
```

- [ ] **Step 3: Randomize search queries**

```javascript
// Instead of always using the first query, pick randomly:
const queries = NICHE_SEARCH_QUERIES[niche] || [`${nicheName} interesting news`];
const query = queries[Math.floor(Math.random() * queries.length)];
```

- [ ] **Step 4: Commit**

```bash
git add api/campaigns/research.js
git commit -m "feat: framework-aware research with topic exclusion and randomization

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Context-Aware Scene Builder Pills

**Files:**
- Modify: `src/lib/scenePills.js` (173 lines)

- [ ] **Step 1: Read current `scenePills.js`**

Note `NICHE_SCENE_PILLS`, `SHARED_CAMERA_PILLS`, and `getScenePillsForNiche()`.

- [ ] **Step 2: Add framework-aware pill filtering**

```javascript
// NEW: Framework-specific pill sets
const FRAMEWORK_PILLS = {
  story: {
    Atmosphere: ['warm golden light', 'misty morning', 'quiet intimacy', 'nostalgic warmth', 'dramatic shadows', 'soft bokeh background'],
    Emotion: ['determination', 'vulnerability', 'triumph', 'reflection', 'hope', 'tension'],
    Pacing: ['slow reveal', 'building momentum', 'lingering moment', 'quiet pause'],
  },
  fast_paced: {
    Action: ['quick zoom', 'rapid cuts', 'dynamic movement', 'high energy', 'snappy transitions'],
    Impact: ['bold graphics', 'striking contrast', 'neon accents', 'clean modern', 'eye-catching'],
    Rhythm: ['punchy beats', 'staccato rhythm', 'countdown energy', 'reveal moment'],
  },
};

// Updated function signature
export function getScenePills(niche, framework = null, visualStyle = null, duration = null) {
  const nichePills = NICHE_SCENE_PILLS[niche] || {};
  const frameworkCategory = framework?.category || 'story';
  const fwPills = FRAMEWORK_PILLS[frameworkCategory] || {};

  // Merge niche pills with framework pills
  const allCategories = {};

  // Niche-specific pills first
  for (const [cat, pills] of Object.entries(nichePills)) {
    allCategories[cat] = [...pills];
  }

  // Framework pills added
  for (const [cat, pills] of Object.entries(fwPills)) {
    allCategories[cat] = [...(allCategories[cat] || []), ...pills];
  }

  // Camera pills always included
  allCategories['Camera'] = SHARED_CAMERA_PILLS;

  // Duration-aware: shorter videos get fewer pills per category
  const maxPills = duration && duration <= 30 ? 4 : 6;

  return Object.entries(allCategories).map(([label, pills]) => ({
    label,
    pills: pills.slice(0, maxPills),
  }));
}

// Keep backward compat
export function getScenePillsForNiche(niche) {
  return getScenePills(niche);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/scenePills.js
git commit -m "feat: context-aware scene pills (framework + niche + duration)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Wiring, Routes & CLAUDE.md

**Files:**
- Modify: `server.js`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verify all new routes are registered in `server.js`**

Check that these are all registered (from Tasks 1, 4, 7):
- `GET /api/styles/frameworks` (Task 1)
- `GET /api/styles/captions` (Task 4)
- `POST /api/shorts/repair-scene` (Task 7)
- `POST /api/shorts/reassemble` (Task 7)

- [ ] **Step 2: Create `api/shorts/` directory if it doesn't exist**

```bash
ls api/shorts/ 2>/dev/null || mkdir -p api/shorts
```

- [ ] **Step 3: Update CLAUDE.md**

Add documentation for:
- Video Style Frameworks (`api/lib/videoStyleFrameworks.js`) — 16 frameworks, separate from videoStylePresets
- Gemini TTS in voiceoverGenerator.js — `generateGeminiVoiceover()` alongside legacy `generateVoiceover()`
- New wizard flow (11 steps) and step order
- Scene repair endpoints (`/api/shorts/repair-scene`, `/api/shorts/reassemble`)
- Caption config is now a full object, not a string key
- Framework drives: scene count, TTS mode, frame chaining, transitions, overlays, music volume

- [ ] **Step 4: Commit**

```bash
git add server.js CLAUDE.md
git commit -m "docs: update CLAUDE.md for Shorts Pipeline v2, register all new routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Integration Test — End-to-End Pipeline Run

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

- [ ] **Step 2: Walk through the full wizard**

1. Select a niche (e.g., "AI & Tech")
2. Select a framework (e.g., "Top X / Countdown")
3. Select duration (30s)
4. Proceed through Look & Feel, Motion, Voice (pick a Gemini voice), Pills, Topic, Script
5. Verify script has overlay_text per scene
6. Configure captions (try a preset, then customize)
7. Generate preview image
8. Review and Generate

- [ ] **Step 3: Monitor pipeline execution**

Watch server logs for:
- `[Gemini TTS]` log lines (TTS generation)
- Scene generation progress
- Music generation with correct duration
- Assembly step
- Caption burn step

- [ ] **Step 4: Verify the generated video**

Check in the draft review page:
- Video plays without freezing between scenes
- Audio matches video length
- Captions appear with the configured style
- Scene assets are saved in step_results (check via Supabase dashboard)

- [ ] **Step 5: Test scene repair (if a scene looks bad)**

- Click "Re-generate" on a scene in the draft review
- Verify Veo 3.1 FLF is called with correct first/last frames
- Verify video is re-assembled

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration test fixes for Shorts Pipeline v2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 7: Deploy**

```bash
fly deploy
```

---

## Summary

| Task | Description | Dependencies | Est. Complexity |
|------|-------------|-------------|-----------------|
| 1 | Video Style Frameworks data | None | Medium (16 frameworks) |
| 2 | Gemini TTS | None | Medium |
| 3 | Script generator update | Task 1 | Small-Medium |
| 4 | Caption system | None | Small |
| 5 | Pipeline rewrite | Tasks 1-4 | Large |
| 6 | Wizard rewrite | Tasks 1-5 | Large |
| 7 | Scene repair | Task 5 | Medium |
| 8 | Research variety | None | Small |
| 9 | Scene pills v2 | Task 1 | Small |
| 10 | Wiring & docs | Tasks 1-9 | Small |
| 11 | Integration test | All | Medium |

**Parallel execution:** Tasks 1, 2, 4, 8 can run concurrently in separate worktrees.
