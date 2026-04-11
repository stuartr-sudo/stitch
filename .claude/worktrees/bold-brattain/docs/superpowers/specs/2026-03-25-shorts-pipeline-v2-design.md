# Shorts Pipeline v2 — Complete Overhaul

**Date:** 2026-03-25
**Status:** Draft
**Supersedes:** 2026-03-22-shorts-wizard-redesign.md, 2026-03-23-shorts-overhaul-design.md

---

## Problem Statement

The Shorts pipeline is broken in multiple ways:

1. **Wizard step order is wrong** — script is generated before visual style, video model, voice, duration, and motion are selected, so none of those choices influence the script
2. **Audio/video sync is broken** — voiceover length is uncontrolled (ElevenLabs TTS has no duration param), music uses preset duration not actual clip duration, MiniMax music ignores duration entirely
3. **No structural video frameworks** — all videos use the same generic scene structure regardless of whether it's a story, a listicle, or a comparison
4. **TTS quality is poor** — ElevenLabs via FAL proxy produces robotic output with no style control
5. **Captions have no customization** — 4 hardcoded presets, no user control over font/color/position
6. **No text overlays** — list-style videos need numbered cards, labels, keywords on screen
7. **No scene-level repair** — if one scene fails or looks bad, the entire video must be regenerated
8. **Topic variety is stale** — static topic funnels produce repetitive content
9. **Scene builder pills ignore context** — pills only vary by niche, not by style/duration/visual choices

## Solution Overview

Complete overhaul of the wizard flow, pipeline architecture, TTS system, and assembly logic. Introduces 16 video style frameworks that structurally dictate how videos are built — from scene count and duration to TTS mode, transitions, and text overlays.

---

## 1. Wizard Reflow — 11 Steps

**New step order** (all config before script generation):

| # | Step | Collects | Pre-filled by Framework? |
|---|------|----------|--------------------------|
| 1 | Niche & Brand | niche, selectedBrand | No |
| 2 | Video Style Framework | framework (1 of 16) + duration (from framework's valid options) | No — this IS the framework |
| 3 | Look & Feel | visualStyle, imageModel, loraConfig | Default from framework mood |
| 4 | Motion & Video | videoModel, generateAudio, aspectRatio | Default from framework |
| 5 | Voice & Music | geminiVoice, geminiModel, styleInstructions, enableMusic | TTS pacing from framework |
| 6 | Scene Builder Pills | sceneBuilderPills[] | Pills filtered by framework + niche + style + duration |
| 7 | Topic & Research | topic, storyContext | No |
| 8 | Script Generation & Editing | scriptScenes[] | Framework provides scene structure template |
| 9 | Captions | captionConfig (full params) | Defaults, fully editable |
| 10 | Preview Image | previewImageUrl | No |
| 11 | Review & Generate | — | Summary of all choices |

**Key principle:** Steps 2-6 all have framework-informed defaults. User can proceed through quickly if defaults look good, or customize at each step. The framework is the "smart preset" — it's not locked, it's a starting point.

### Step 2: Video Style Framework Picker

Grid of 16 framework cards organized in two sections:

**Story Styles (7):**
- Personal Journey
- Origin Story
- Mini Documentary
- Day in the Life
- Before & After / Transformation
- Explainer Story
- Emotional / Tribute

**Fast-Paced / List Styles (9):**
- Top X / Countdown
- Everything You Need to Know
- Myth Busting
- Comparison / Versus
- Did You Know / Hidden Facts
- Challenge / Experiment
- History / Timeline
- Hot Take / Opinion
- How It Works / Educational

Each card shows: **thumbnail image**, name, description, example hook line, and key badges (e.g., "Frame Chain", "Per-Scene TTS", "Text Overlays"). Thumbnails are generated via Imagineer and stored in `public/assets/frameworks/`.

Selecting a framework **pre-fills defaults** for all downstream steps but does NOT lock them. The user retains full control over visual style, video style preset, image model, and video model. These are independent axes:

| System | What It Controls | Pre-filled by Framework? |
|--------|-----------------|--------------------------|
| Video Style Framework (16) | Structure: scene count, TTS mode, frame chain, transitions, overlays | This IS the framework |
| Visual Style (124 existing presets) | Image generation look/feel | Yes — framework suggests a default |
| Video Style Preset (62 existing presets) | Motion/cinematography direction | Yes — framework suggests a default |
| Image Model (8 existing) | Which AI generates images | Yes — framework suggests a default |
| Video Model (10 existing) | Which AI generates video clips | Yes — framework suggests a default |

Each framework definition includes recommended defaults:
```javascript
defaults: {
  visualStyle: 'cinematic',           // from the 124 visual style presets
  videoStylePreset: 'tiktok_reels',   // from the 62 video style presets
  imageModel: 'fal_nano_banana',      // from the 8 image models
  videoModel: 'fal_veo3',            // from the 10 video models
}
```

All existing pickers (Visual Style with thumbnails, Video Style with thumbnails, Image Model cards, Video Model cards) remain in their respective wizard steps, shown exactly as they are now.

**Duration sub-selection** appears immediately after framework selection on the same step. Each framework defines its valid durations — the user picks one. Duration determines scene count and structure (e.g., "Top X" at 30s = 3 items, at 60s = 5 items). This is NOT a separate step because the duration is intrinsic to the framework choice.

| Framework | Supported Durations |
|-----------|-------------------|
| Personal Journey | 60s, 90s |
| Origin Story | 60s, 90s |
| Mini Documentary | 60s, 90s |
| Day in the Life | 45s, 60s |
| Before & After | 30s, 45s |
| Explainer Story | 45s, 60s |
| Emotional / Tribute | 45s, 60s |
| Top X / Countdown | 30s, 45s, 60s |
| Everything You Need to Know | 30s, 60s |
| Myth Busting | 30s, 45s, 60s |
| Comparison / Versus | 30s, 45s |
| Did You Know | 30s, 60s |
| Challenge / Experiment | 45s, 60s |
| History / Timeline | 60s, 90s |
| Hot Take / Opinion | 30s, 45s |
| How It Works / Educational | 45s, 60s |

**Aspect ratio** is selected in Step 4 (Motion & Video): 9:16 (default) or 16:9.

### Step 8: Script Generation

The script generator receives the FULL framework config:
- Framework scene structure (named beats with duration ranges)
- TTS pacing instructions
- Text overlay requirements per scene
- Visual style, video style, duration, pills, research context

The script generator outputs per scene:
- `narration` — voiceover text
- `visual_prompt` — image/video generation prompt
- `motion_prompt` — camera/motion direction
- `overlay_text` — on-screen text (if framework requires it)
- `duration_seconds` — target duration for this scene
- `scene_label` — framework beat name (e.g., "The Hook", "#3", "DAY 15")

### Step 10: Captions — Full Parameter Editor

Exposes all `fal-ai/workflow-utilities/auto-subtitle` parameters:

| Parameter | Control | Default |
|-----------|---------|---------|
| font_name | Dropdown (Montserrat, Poppins, Oswald, etc.) | Montserrat |
| font_size | Slider (60-150) | 100 |
| font_weight | Toggle (normal/bold) | bold |
| font_color | Color picker | white |
| highlight_color | Color picker | purple |
| stroke_width | Slider (0-5) | 3 |
| stroke_color | Color picker | black |
| background_color | Color picker or "none" | none |
| background_opacity | Slider (0-1) | 0 |
| position | Dropdown (top/center/bottom) | bottom |
| y_offset | Slider (0-200) | 75 |
| words_per_subtitle | Slider (1-8) | 1 |
| enable_animation | Toggle | true |

**Preset buttons** for quick selection: Word Pop, Karaoke Glow, News Ticker, Phrase, Custom. Selecting a preset fills all fields; user can then tweak individual values.

**Live preview** showing a styled text sample with the current settings.

---

## 2. Video Style Frameworks — Data Structure

New file: `api/lib/videoStyleFrameworks.js`

This is SEPARATE from `videoStylePresets.js` (which is 62 motion/cinematography presets). Frameworks are structural templates; presets are visual motion styles. They serve different purposes.

```javascript
// Each framework definition:
{
  id: 'top_x_countdown',
  name: 'Top X / Countdown',
  category: 'fast_paced',  // 'story' | 'fast_paced'
  description: 'Ranked list counting down items with punchy reveals and numbered overlays.',
  thumb: '/assets/frameworks/top-x-countdown.jpg',  // generated thumbnail
  hookExamples: [
    'Top 5 [X] you\'ve never heard of',
    '3 [X] that will change how you [Y]',
    'Ranking every [X] from worst to best',
  ],
  supportedDurations: [30, 45, 60],

  // Smart defaults for downstream steps (user can override any)
  defaults: {
    visualStyle: 'cinematic',           // from 124 visual style presets
    videoStylePreset: 'tiktok_reels',   // from 62 video style presets
    imageModel: 'fal_nano_banana',      // from 8 image models
    videoModel: 'fal_veo3',            // from 10 video models
  },

  // Pipeline config
  frameChain: false,
  ttsMode: 'per_scene',          // 'single' | 'per_scene'
  transitionType: 'hard_cut',    // 'hard_cut' | 'crossfade' | 'wipe'
  transitionDuration: 0,         // seconds (0 for hard cut)
  textOverlays: 'required',      // 'required' | 'optional' | 'none'
  overlayStyle: 'numbered',      // 'numbered' | 'labeled' | 'timestamps' | 'before_after' | 'myth_truth' | null
  musicVolume: 0.20,
  musicMood: 'upbeat/energetic',

  // TTS config
  ttsPacing: 'Fast, punchy, energetic',

  // Scene structure per duration
  sceneStructure: {
    30: [
      { label: 'Hook', beat: 'intro', durationRange: [3, 4], overlayText: 'title card' },
      { label: '#3', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
      { label: '#2', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
      { label: '#1', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
    ],
    45: [ /* ... */ ],
    60: [
      { label: 'Hook', beat: 'intro', durationRange: [4, 5], overlayText: 'title card' },
      { label: '#5', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
      { label: '#4', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
      { label: '#3', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
      { label: '#2', beat: 'item', durationRange: [8, 10], overlayText: 'number + name' },
      { label: '#1', beat: 'item', durationRange: [10, 12], overlayText: 'number + name' },
    ],
  },
}
```

All 16 frameworks follow this structure. The full definitions come from the user's reference document (`video-style-frameworks.md`).

### Hybrid Styles

Some frameworks are hybrids — narrative flow but with list-like elements:
- **Challenge / Experiment**: frame chain ON, single TTS, but has time marker overlays ("DAY 1", "DAY 15", "DAY 30")
- **How It Works / Educational**: frame chain ON, single TTS, optional diagram label overlays
- **History / Timeline**: frame chain OFF (each era is visually distinct), per-scene TTS, year overlays — structurally list-like despite reading as a story
- **Day in the Life**: frame chain ON, single TTS, time stamp overlays ("6:00 AM", "2:30 PM")

The framework config handles these correctly — `frameChain` and `ttsMode` are independent of `textOverlays`.

---

## 3. Gemini TTS — Replacing ElevenLabs

### Backend Changes

**File:** `api/lib/voiceoverGenerator.js` — rewrite internals.

**Old:** `fal-ai/elevenlabs/tts/eleven-v3`
**New:** `fal-ai/gemini-tts`

**API call structure:**
```javascript
const body = {
  prompt: narrationText,  // All scene narrations concatenated (single mode) or single scene (per-scene mode)
  style_instructions: ttsPacingFromFramework,  // e.g., "Fast, punchy, energetic"
  voice: selectedGeminiVoice,  // e.g., "Kore", "Charon", "Puck"
  model: geminiTtsModel,  // "gemini-2.5-flash-tts" or "gemini-2.5-pro-tts"
  language_code: 'English (US)',
  temperature: 1,
  output_format: 'mp3',
};
```

**Result:** `result.audio.url` — direct MP3 URL.

**Polling:** Uses standard FAL queue polling (`pollFalQueue` with endpoint `fal-ai/gemini-tts`).

### TTS Strategy Per Framework

| Framework Category | TTS Mode | How It Works |
|-------------------|----------|--------------|
| Story (continuous) | `single` | Concatenate all scene narrations with `\n\n` separators, generate ONE audio file |
| Fast-paced (list) | `per_scene` | Generate one audio file PER SCENE, each with the framework's pacing instructions |
| Hybrid (Challenge, How It Works) | `single` | Same as story — continuous narration |
| Hybrid (History/Timeline) | `per_scene` | Same as list — independent eras |

### Voice Picker (Wizard Step 5)

30 Gemini voices displayed in a grid with descriptions:

**Popular voices (featured):**
- Kore — strong, firm female
- Puck — upbeat, lively male
- Charon — calm, professional male
- Zephyr — bright, clear female
- Aoede — warm, melodic female

**All voices:** Achernar, Achird, Algenib, Algieba, Alnilam, Aoede, Autonoe, Callirrhoe, Charon, Despina, Enceladus, Erinome, Fenrir, Gacrux, Iapetus, Kore, Laomedeia, Leda, Orus, Pulcherrima, Puck, Rasalgethi, Sadachbia, Sadaltager, Schedar, Sulafat, Umbriel, Vindemiatrix, Zephyr, Zubenelgenubi.

**Voice preview:** Generate a short sample via `/api/voice/preview` using Gemini TTS with the selected voice + framework's pacing instructions.

**Additional controls:**
- TTS model: Flash (fast, default) or Pro (premium quality)
- Style instructions: pre-filled from framework's `ttsPacing`, editable by user

---

## 4. Audio/Video Sync — Proper Fix

### Root Cause

The current pipeline generates voiceover, video clips, and music with independently determined durations. Nothing ensures they match.

### Solution: Voiceover as Master Clock

**Pipeline order:**
1. Generate script (framework provides target durations per scene)
2. Generate TTS voiceover
3. **Measure actual voiceover duration** (via audio metadata or FAL response)
4. **Proportionally adjust scene video durations** to match voiceover segments
5. Generate video clips with adjusted durations (snapped to model-valid values)
6. Generate music with `duration = sum of actual clip durations` (use Lyria 2 or ElevenLabs music which respect duration — NOT MiniMax)
7. Assemble with verified durations

**For per-scene TTS:**
1. Generate TTS per scene
2. Measure each audio file's duration
3. Match each video clip duration to its scene's audio duration (snap to nearest valid model duration)
4. Music duration = sum of all clip durations

**For single-file TTS:**
1. Generate full narration TTS
2. Total video duration = voiceover duration
3. Distribute scene durations proportionally within framework's duration ranges
4. Music duration = voiceover duration

### Music Generation Fix

- **Drop MiniMax** as default music model (it ignores duration)
- **Use Lyria 2** (`fal-ai/lyria2`) or **ElevenLabs Music** as primary — both respect `duration_seconds`
- Always pass `lyrics_prompt: '[Instrumental]'` — music must never have lyrics
- Duration = actual total video duration (not preset)

### Volume Ducking

FFmpeg `sidechaincompress` filter or manual volume envelope:
- Music volume set per framework (10-25%)
- During speech: music ducks to framework volume
- During non-speech gaps: music stays at framework volume (already low enough)
- Implementation: FFmpeg filter chain in `assembleShort()`:
  ```
  [voiceover]asplit[vo][sc];
  [music][sc]sidechaincompress=threshold=0.02:ratio=6:attack=200:release=1000[ducked];
  [vo][ducked]amix=inputs=2:weights=1 {musicVolume}[audio]
  ```

---

## 5. Text Overlays

### When Required

Every framework specifies `textOverlays: 'required' | 'optional' | 'none'` and `overlayStyle`.

Per the user's directive: **ALL styles have text overlays.** Story styles use subtle overlays (location labels, time markers, key phrases); list styles use prominent overlays (numbers, titles, keywords).

### Script Generator Output

Each scene in the generated script includes an `overlay_text` field:
```javascript
{
  narration: "Here are the top 5 AI breakthroughs of 2026...",
  visual_prompt: "Futuristic lab with holographic displays...",
  motion_prompt: "Slow zoom into the display...",
  overlay_text: "#1 — Neural Architecture Search",  // NEW
  duration_seconds: 10,
  scene_label: "#1",  // NEW — framework beat name
}
```

### Burning In Overlays

**Option A (preferred): FFmpeg drawtext filter** in `assembleShort()`:
- Add text track to FFmpeg compose with per-scene text keyframes
- Font/color/position follows caption styling for consistency
- Text appears in top-third of frame (captions are bottom)

**Option B: Separate burn pass** via `fal-ai/workflow-utilities/auto-subtitle`:
- Generate a "silent" subtitle track with the overlay text timed to scenes
- Burn in before or after captions

We'll use Option A — it's simpler and doesn't require an extra API call.

### Overlay Styling

Text overlays use a separate style config from captions:
- Position: top-left, top-center, or top-right (per framework)
- Font: matches caption font selection for consistency
- Size: large (120-150px for numbers, 80-100px for labels)
- Color: white with black stroke (default), or framework-specific (e.g., red "MYTH" / green "TRUTH")
- Animation: fade in on scene start, fade out 0.5s before scene end

---

## 6. Scene-Level Asset Preservation & Repair

### Asset Storage

Every generated asset is saved in `jobs.step_results` JSONB:

```javascript
{
  scenes: [
    {
      index: 0,
      image_url: "https://...",
      video_url: "https://...",
      voiceover_url: "https://...",  // per-scene TTS only
      first_frame_url: "https://...",
      last_frame_url: "https://...",
      overlay_text: "#5 — Neural Networks",
      duration_seconds: 8,
      status: "completed",  // "completed" | "failed" | "skipped"
    },
    // ...
  ],
  global: {
    voiceover_url: "https://...",  // single-file TTS only
    music_url: "https://...",
    assembled_url: "https://...",
    captioned_url: "https://...",
  },
  framework: "top_x_countdown",
  caption_config: { /* full caption params */ },
}
```

### Scene Repair with Veo 3.1 First-Last-Frame

**Draft review page** (`/shorts/draft/:draftId`) shows:
- Full assembled video
- Individual scene clips in a timeline view
- Per-scene actions: Re-generate, Replace, Edit

**Repair flow:**
1. User clicks "Re-generate" on scene N
2. System retrieves `last_frame_url` from scene N-1 and `first_frame_url` from scene N+1
3. Calls `fal-ai/veo3.1/fast/first-last-frame-to-video` with:
   ```javascript
   {
     prompt: scene.motion_prompt,
     first_frame_url: prevScene.last_frame_url,
     last_frame_url: nextScene.first_frame_url,
     aspect_ratio: aspectRatio,
     duration: veoDuration(scene.duration_seconds),
     resolution: '720p',
     generate_audio: false,  // pipeline handles audio separately
     safety_tolerance: '4',
   }
   ```
4. Replaces scene N's video_url in step_results
5. Re-assembles the full video with the updated clip
6. Re-burns captions

**Edge cases:**
- Scene 1 (no previous): use the starting image as first_frame_url, scene 2's first_frame as last_frame_url
- Last scene (no next): use scene N-1's last_frame as first_frame_url, no last_frame_url (use standard image-to-video instead)

### Error Handling Mid-Pipeline

**Current behavior:** Pipeline aborts on scene failure.

**New behavior:**
1. Scene generation fails → retry once with same params
2. Second failure → mark scene as `"skipped"` in step_results, log to `jobs.last_error`, continue pipeline
3. After pipeline completes: partial result available
4. Skipped scenes shown with placeholder in draft review
5. User can repair skipped scenes via First-Last-Frame tool
6. Re-assembly available at any time from the draft review page

---

## 7. Topic Variety & Smart Scene Builder Pills

### Topic Research Improvements

**File:** `api/campaigns/research.js`

Changes:
- Add `exclude_topics` param — array of recently used topics (frontend sends from local storage or user history)
- Research prompt includes: "Find novel, surprising, or under-covered angles. Avoid generic overviews."
- Rotate through different search queries per research call (randomize angle selection)
- Add `framework` context to research — a "Top 5" framework should research list-worthy items, a "Mini Documentary" should find deep-dive subjects

### Scene Builder Pills v2

**File:** `src/lib/scenePills.js`

Current: `getScenePillsForNiche(niche)` — pills vary only by niche.

New: `getScenePills(niche, framework, visualStyle, duration)`:
- Framework-aware: fast-paced frameworks get action/movement/dynamic pills; story frameworks get atmospheric/mood/emotion pills
- Duration-aware: shorter videos get fewer, more impactful pills
- Visual style-aware: cinematic style gets cinematic pills, anime gets anime-specific pills
- Still niche-specific as the base layer

---

## 8. Captions — Auto-Subtitle Integration

### Backend

**File:** `api/lib/captionBurner.js`

Currently has 4 hardcoded CAPTION_STYLES. Replace with dynamic config from the wizard:

```javascript
// Receives full caption config from pipeline
async function burnCaptions(videoUrl, captionConfig, falKey) {
  const body = {
    video_url: videoUrl,
    language: 'en',
    font_name: captionConfig.font_name || 'Montserrat',
    font_size: captionConfig.font_size || 100,
    font_weight: captionConfig.font_weight || 'bold',
    font_color: captionConfig.font_color || 'white',
    highlight_color: captionConfig.highlight_color || 'purple',
    stroke_width: captionConfig.stroke_width || 3,
    stroke_color: captionConfig.stroke_color || 'black',
    background_color: captionConfig.background_color || 'none',
    background_opacity: captionConfig.background_opacity || 0,
    position: captionConfig.position || 'bottom',
    y_offset: captionConfig.y_offset || 75,
    words_per_subtitle: captionConfig.words_per_subtitle || 1,
    enable_animation: captionConfig.enable_animation !== false,
  };
  // POST to fal-ai/workflow-utilities/auto-subtitle via queue
}
```

### Frontend

Wizard step 10 shows a form with all parameters listed in Section 1's table. Preset buttons populate all fields at once. Live preview renders a styled `<div>` showing how the text will look.

---

## 9. Pipeline Execution Order (Revised)

`api/lib/shortsPipeline.js` — rewritten execution flow:

```
1. Load framework config from videoStyleFrameworks.js
2. Generate script (if not provided) — framework provides scene structure
3. Generate TTS voiceover:
   a. Single mode → concatenate narrations, one API call
   b. Per-scene mode → one API call per scene
4. Measure audio durations
5. Adjust scene video durations to match audio (snap to model-valid values)
6. For each scene:
   a. Generate scene image (if frame_chain OFF or scene 1)
   b. OR use prev scene's last frame (if frame_chain ON and scene > 1)
   c. Generate video clip with adjusted duration
   d. Extract first and last frames, save to step_results
   e. On failure: retry once, then skip and continue
7. Generate music:
   a. Duration = sum of actual clip durations
   b. Model = Lyria 2 (respects duration)
   c. lyrics_prompt = '[Instrumental]'
   d. Mood from framework.musicMood
8. Assemble:
   a. Video track: clips sequenced with framework transitions
   b. Voiceover track: full duration, timestamp 0
   c. Music track: full duration, framework volume, with volume ducking
   d. Text overlay track: per-scene overlay_text (if framework requires)
   e. Duration = sum of actual clip durations
9. Burn captions (auto-subtitle with user's full caption config)
10. Save to ad_drafts with all scene assets in step_results
```

---

## 10. Files Changed

### New Files
- `api/lib/videoStyleFrameworks.js` — 16 framework definitions with full pipeline config
- `src/lib/videoStyleFrameworks.js` — frontend mirror for wizard display (card data, hook examples, badges)

### Modified Files (Major)
- `src/pages/CampaignsNewPage.jsx` — complete wizard reflow (11 steps, new state, framework-driven defaults)
- `api/lib/voiceoverGenerator.js` — switch from ElevenLabs to Gemini TTS
- `api/lib/shortsPipeline.js` — new execution flow with framework-aware logic, per-scene TTS, duration matching, text overlays
- `api/lib/pipelineHelpers.js` — `assembleShort()` rewrite with transitions, volume ducking, text overlays
- `api/lib/scriptGenerator.js` — framework-aware scene generation with overlay_text output
- `api/lib/captionBurner.js` — dynamic caption config (remove hardcoded styles)
- `src/lib/scenePills.js` — context-aware pills (`getScenePills(niche, framework, visualStyle, duration)`)
- `api/campaigns/research.js` — variety improvements, framework-aware research
- `api/campaigns/preview-script.js` — pass framework config to script generator

### Modified Files (Minor)
- `api/campaigns/create.js` — accept new params (framework, captionConfig, geminiVoice, etc.)
- `server.js` — register any new routes (e.g., `/api/styles/frameworks`)
- `CLAUDE.md` — update documentation

### Unchanged
- `api/lib/modelRegistry.js` — video/image models stay the same
- `api/lib/mediaGenerator.js` — generation dispatch stays the same
- `api/lib/videoStylePresets.js` — 62 motion presets stay (they're visual, not structural)
- `api/lib/visualStyles.js` — 14 visual styles stay

---

## 11. Data Flow Summary

```
Step 1: Niche & Brand
  ↓ niche, selectedBrand
Step 2: Video Style Framework + Duration
  ↓ framework + videoLengthPreset (drives defaults for steps 3-8)
Step 3: Look & Feel
  ↓ visualStyle, imageModel, loraConfig
Step 4: Motion & Video
  ↓ videoModel, generateAudio, aspectRatio
Step 5: Voice & Music
  ↓ geminiVoice, geminiModel, styleInstructions, enableMusic
Step 6: Scene Builder Pills
  ↓ sceneBuilderPills[] (filtered by framework + niche + style + duration)
Step 7: Topic & Research
  ↓ topic, storyContext
Step 8: Script Generation
  → /api/campaigns/preview-script(ALL above) → scriptScenes[] with overlay_text
Step 9: Captions
  ↓ captionConfig (full auto-subtitle params)
Step 10: Preview Image
  → /api/campaigns/preview-image(scene 1 visual_prompt, visualStyle, imageModel)
  ↓ previewImageUrl
Step 11: Review & Generate
  → /api/campaigns/create(ALL state) → pipeline starts
```

---

## 12. Scene Repair — Veo 3.1 First-Last-Frame Integration

### New Endpoint

`POST /api/shorts/repair-scene`

```javascript
{
  draft_id: "uuid",
  scene_index: 3,
  // Optional overrides:
  prompt: "Updated motion prompt",
  duration: "8s",
}
```

Backend:
1. Load step_results from jobs table
2. Get first_frame from scene N-1's last_frame_url (or starting image for scene 0)
3. Get last_frame from scene N+1's first_frame_url (or null for last scene)
4. Call `fal-ai/veo3.1/fast/first-last-frame-to-video`
5. Update step_results with new video_url
6. Re-assemble full video
7. Re-burn captions
8. Update ad_drafts with new video

### New Endpoint

`POST /api/shorts/reassemble`

Re-assembles from existing scene assets (after any repair). Uses the stored framework config and caption config from step_results.

---

## 13. Music Constraints

- **Always instrumental** — `lyrics_prompt: '[Instrumental]'` hardcoded
- **Duration must match video** — music duration = sum of actual clip durations
- **Default model: Lyria 2** (`fal-ai/lyria2`) — respects duration parameter
- **Fallback: ElevenLabs Music** — also respects duration
- **MiniMax removed as option** — it ignores duration, produces wrong-length output
- **Volume per framework** — 10-25% range, set in framework config
- **Volume ducking** — music ducks further during speech via FFmpeg sidechaincompress

---

## 14. Open Questions & Resolutions

### Resolved

1. **Gemini TTS endpoint exists** — `fal-ai/gemini-tts` confirmed via OpenAPI schema. 30 voices, `style_instructions`, `model` (flash/pro), `output_format: 'mp3'`. Response: `{ audio: { url } }`. Uses standard FAL queue polling.

2. **`extractFirstFrame` function** — use existing FAL `fal-ai/ffmpeg-api/extract-frame` with `frame_type: 'first'`. Same endpoint as `extractLastFrame`, different param. No new function needed — extend existing helper.

3. **Duration is not a separate step** — duration is intrinsic to the framework and selected within Step 2. Each framework defines its valid durations (e.g., "Before & After" = 30s or 45s, "Personal Journey" = 60s or 90s). No standalone "Length" step needed. Minimum duration across all frameworks is 30s.

4. **Voice migration** — existing campaigns/drafts retain their ElevenLabs voice references. Only new campaigns use Gemini TTS. No migration of saved preferences needed.

5. **Draft-to-job lookup** — repair/reassemble endpoints accept `draft_id`. Lookup chain: `draft_id` → `ad_drafts.campaign_id` → `jobs` via `input_json->>'campaign_id'`. Per CLAUDE.md, `campaign_id` is in `input_json` JSONB, not a top-level column.

6. **Reassemble endpoint schema** — `POST /api/shorts/reassemble { draft_id, caption_config? }`. Optional `caption_config` override; defaults to stored config in step_results.

7. **Cost logging** — Gemini TTS via FAL logs under category `'fal'` with model `'gemini-tts'`. ElevenLabs category remains for legacy campaigns.

### To Verify During Implementation

1. **FFmpeg compose text overlays** — verify if `fal-ai/ffmpeg-api/compose` supports text tracks or drawtext filters. If not, use a separate auto-subtitle pass for overlays (Option B). **Fallback is clear and non-blocking.**

2. **FFmpeg compose transitions** — verify if compose API supports crossfade/wipe between video keyframes. If not, implement via overlapping keyframe timestamps with opacity (crossfade) or accept hard cuts only initially. **Non-blocking — hard cuts work for MVP.**

3. **Volume ducking** — verify if compose API accepts FFmpeg filter chains (sidechaincompress). If not, pre-process music track to reduce volume uniformly to framework percentage. **Fallback is simpler and acceptable.**

4. **Audio duration measurement** — two approaches, try in order:
   a. Check if Gemini TTS FAL response includes duration metadata (file_size is in schema, duration may be too)
   b. If not, use `fal-ai/ffmpeg-api/extract-frame` or a lightweight ffprobe equivalent to get duration
   c. Last resort: estimate from character count (avg 150 words/min = ~2.5 chars/sec)

5. **Single-file TTS scene timing** — for single-file mode, use character-count proportional estimation to distribute scene durations. Each scene's share = `scene_narration_chars / total_narration_chars * total_audio_duration`. Scene video durations are then snapped to nearest model-valid values. This is an approximation but sufficient — the voiceover is continuous, so slight scene boundary misalignment doesn't cause audio cuts.

6. **Lyria 2 duration parameter** — existing code uses `duration: clampedDuration`. Verify this matches the FAL API. ElevenLabs Music uses `duration_seconds`. Document whichever is correct.

---

## 15. Reference Documents

- **Video Style Frameworks (full definitions):** User-provided `video-style-frameworks.md` — contains all 16 framework scene structures, duration ranges, and pipeline config. This is the authoritative source for the `sceneStructure` field in each framework definition.
- **Gemini TTS OpenAPI:** User-provided schema confirms endpoint, params, voices, and response format.
- **Veo 3.1 First-Last-Frame OpenAPI:** User-provided schema confirms `first_frame_url`, `last_frame_url`, duration `'4s'|'6s'|'8s'`, `generate_audio`, `resolution`, `safety_tolerance`.

---

## 16. Success Criteria

1. All 16 frameworks selectable in wizard and producing structurally correct videos
2. Gemini TTS producing natural voiceover with style control
3. Audio/video sync within 0.5s tolerance on all generated videos
4. Text overlays appearing correctly on list-style and labeled videos
5. Full caption customization from wizard reflected in final video
6. Scene repair working via First-Last-Frame for any scene
7. Music always instrumental, always matching video duration
8. Volume ducking audible — music quieter during speech
9. Scene builder pills varying by framework + niche + style
10. Topic research producing diverse, non-repetitive results
11. Pipeline continues past single-scene failures (retry then skip)
12. All scene assets individually saved and accessible from draft review
13. Text overlays on ALL styles (story styles get subtle overlays, list styles get prominent ones)
