# Shorts Builder — Complete Tool Guide

## Overview
Clean rebuild of the Shorts creation tool at `/shorts/builder` (`ShortsBuilderPage.jsx`).
Replaces the old bloated `ShortsWorkbenchPage.jsx` which remains at `/shorts/workbench` for reference only.

The Shorts Builder is a step-by-step wizard that visually builds different types of Shorts.
Once a configuration is dialed in, it saves as a Flows template for automated production.

## Architecture Decisions
- **Inline styles** — no Tailwind dark theme. Light theme, `#FAFAFA` background, `#111827` text.
- **Wireframe first** — all steps built with static/dummy data before any API wiring.
- **One file** — `src/pages/ShortsBuilderPage.jsx`. No component extraction until wireframes are approved.
- **Separate from old tool** — runs alongside, does NOT modify `ShortsWorkbenchPage.jsx`.
- **Frameworks in separate file** — `src/lib/builderFrameworks.js` (72 frameworks: 12 universal + 60 niche-specific).

## File Locations
- **Frontend page**: `src/pages/ShortsBuilderPage.jsx`
- **Frameworks data**: `src/lib/builderFrameworks.js`
- **Style presets**: `src/lib/stylePresets.js` (123 visual styles with thumbnails)
- **Route**: `/shorts/builder` (registered in `App.jsx`)
- **Old tool**: `src/pages/ShortsWorkbenchPage.jsx` at `/shorts/workbench` (reference only)
- **This guide**: `docs/SHORTS-BUILDER.md`

---

## Wizard Steps

### Step 1: Script
1. **Choose Niche** — 20 niches (grid). Determines frameworks, topics, voice style, visual mood, music mood, SFX palette.
2. **Choose Framework** — 72 structural templates (12 universal + 3 per niche x 20 niches). Each defines:
   - Scene beats with labels
   - Baked-in camera directions per scene (lens, f-stop, color temperature, movement)
   - Duration target (25-35s total, 5-6s per scene)
   - Category (story, educational, review, investigation, etc.)
   - Avatar Narrator and Avatar Split Screen are frameworks, NOT add-ons.
   - Only shows universal + matching niche-specific frameworks for the selected niche.
   - Framework = duration guide. No separate duration selector.
3. **Choose Topic** — 3-level funnel (Category -> Angle -> Hook). Multiple hooks selectable.
4. **Find Topics** — Two research options side by side:
   - **Research Real Stories** (`/api/shorts/research`): Google News real-time -> GPT structures with angle/context/viral potential.
   - **Discover Trending Topics** (`/api/shorts/discover-topics`): Multi-source AI scoring (trending %, competition level, source).
5. **Custom Topic** — free text input, overrides funnel selection.
6. **Creative Mode** toggle — creative visual storytelling with factual accuracy. No fabrication or hallucination.
7. **Brand Kit** — dropdown selector. When selected, the FULL brand kit passes through to all downstream generation:
   - `brand_name`, `colors`, `logo_url`, `voice_style`, `taglines`, `style_preset`
   - `target_market`, `brand_personality`, `brand_voice_detail`, `content_style_rules`
   - `preferred_elements`, `prohibited_elements`, `visual_style_notes`
   - `mood_atmosphere`, `lighting_prefs`, `composition_style`, `ai_prompt_rules`
   - `default_loras`, `blurb`, `website`
   - Source: `brand_kit` table via `GET /api/brand/kit`
8. **Generate Script** — uses `gpt-4.1-mini-2025-04-14` with **Zod structured output** (`zodResponseFormat`). Produces per scene:
   - `narration` — the voiceover text for this scene
   - `visualDescription` — what the scene should look like visually (characters, setting, action, mood)
   - `label` — scene beat name from the framework
   - `camera` — camera direction from the framework
   - `duration` — target duration (5-6s)
   - NO regex parsing. Structured JSON response mapped directly to fields.
9. **Save Draft / Load Draft** buttons in header.
10. **Continue to Step 2** button (scrolls to top).

### Step 2: Voice & Audio
1. **No Voiceover toggle** — skip voice entirely (visuals + music only).
2. **Voice Provider** — Gemini TTS (30 voices, recommended) or ElevenLabs (22 voices via FAL proxy).
3. **Voice Selection** — grid of voices for selected provider with preview/listen buttons.
4. **Voice Style** — niche default pre-highlighted (green). 8 universal presets. Custom textarea.
   - Voice style instructions must be DETAILED with inflections, not vague generic directions.
   - Include pacing, emphasis patterns, emotional arc, breath control, pause placement.
5. **Voice Speed** — 1.0x to 1.3x, default 1.15x.
6. **Generate Voiceover** button -> after generation, shows play preview.
7. After voiceover -> **Background Music**:
   - **Auto-defaults to niche music mood** when entering Step 2 (from `NICHE_MUSIC_MOODS`).
   - 8 mood presets + custom input.
   - Volume slider (0-100%, default 15%).
   - Generate Music button (always instrumental via ElevenLabs Music through FAL proxy).
8. After music -> **Timing Alignment**:
   - Whisper word timestamps (`fal-ai/whisper`) -> block alignment -> duration solving.
   - Scenes optimized to **5-6s each** (shorter = tighter edits, fewer errors).
   - Visual timing preview with bars showing each scene's duration and start time.
9. After timing -> **Sound Effects**:
   - SFX comes AFTER timing because placement depends on actual scene lengths from keyframes.
   - Toggle on by default. **Auto-selected by niche SFX palette** (no manual dropdowns).
   - Each SFX is 3-6s, placed at scene transitions. Separate audio layer from music.
   - Button text reflects ACTUAL scene count from timing keyframes (e.g., "Generate 6 Sound Effects").
   - Intelligently chosen from per-niche SFX library (critical for Flows automation).
   - Generate SFX button.
10. After all complete -> **Continue to Step 3** (scrolls to top).

### Step 3: Visuals (CONFIG ONLY -- no generation in this step, just configuring the pipeline)
1. **Continuity Mode** — toggle between:
   - **Continuous**: Extract last frame of each video -> analyze via Gemini -> use last frame as I2V starting image for next scene. Seamless visual flow.
   - **Exciting**: Generate fresh starting image per scene. Previous scene still analyzed via Gemini for narrative continuity, but each scene gets a unique visual composition.
2. **Video Model** — I2V or R2V (NO FLF -- explicitly excluded, too fickle):
   - **I2V** (Image-to-Video): Starting image per scene -> video model animates it.
     - Models: Kling V3 Pro, Kling O3 Pro, Veo 3.1, Veo 3.1 Fast, Veo 3.1 Lite, PixVerse V6, Wan 2.5, Hailuo/MiniMax, Grok Video, Seedance 2.0, Wavespeed WAN
   - **R2V** (Reference-to-Video): Starting image + @element reference images for consistent character/avatar.
     - Models: Kling O3 Pro, Veo 3.1, Veo 3.1 Lite, Grok Video, Seedance 2.0 R2V
   - Avatar frameworks (Avatar Narrator, Avatar Split Screen) + I2V mode = LoRA strongly recommended for character consistency.
3. **IMAGE MODEL** — Selects which model generates the starting keyframe images:
   - Nano Banana 2, FLUX 2 (LoRA), FLUX.2 Klein 4B/9B (LoRA), Wan 2.2 T2I (LoRA), SeedDream v4.5, Imagen 4, Kling Image v3, Grok Imagine, Ideogram v2, Wavespeed
   - LoRA-capable models show LoRA picker when LoRAs are available.
4. **R2V Reference Images** — upload zone for character references:
   - Upload files, Import from URL, Add from Library (3 buttons).
   - Up to 7 reference images. Front, side, 3/4 angles recommended.
5. **Visual Style** — full StyleGrid with thumbnails from `src/lib/stylePresets.js` (123 presets across UGC, Photography, Cinematic, Animation, Period, Art, etc.).
   - Each preset has a detailed 40-80 word `promptText` (not a label). This feeds into the Cohesive Prompt Builder.
6. **Mood & Atmosphere** — Lighting (7 options), Mood (7 options), Intensity slider (1-10).
7. **Per-Scene Visual Descriptions** — shows each scene with badge explaining image source:
   - Scene 1: Always "Starting image generated"
   - Continuous mode: "Last frame from scene N + Gemini analysis"
   - Exciting mode: "Fresh image + previous scene Gemini analysis"
8. **Pipeline Summary** — all config at a glance.
9. **Continue to Step 4** (scrolls to top).

### Step 4: Captions & Subtitles
- No Captions toggle.
- 4 caption styles: word_pop, karaoke_glow, word_highlight, news_ticker.
- Each has: font, size, weight, colors, highlight color, position, animation, words per subtitle.
- Position: top / center / bottom.
- Highlight color picker (7 colors).
- Live preview showing caption appearance.
- Uses `fal-ai/workflow-utilities/auto-subtitle` for burning.
- Continue to Step 5 (scrolls to top).

### Step 5: Generate & Save
- Full configuration summary (all settings from all steps at a glance).
- Scene overview strip.
- **Generate Short** button fires the full pipeline (see Generation Pipeline below).
- Progress tracking per scene.
- After completion:
  - **Preview Video** — play the final result.
  - **Save to Library** — upload final composition to Supabase storage via `uploadUrlToSupabase()`.
  - **Save Configuration as Flow Template** — saves the entire configuration for re-running with different topics via Flows.

---

## Generation Pipeline (Step 5 — what happens when "Generate" is clicked)

### Scene 1 (First Scene)
1. Take visual description + camera direction + visual style + mood + lighting + brand kit
2. Send to **Cohesive Prompt Builder** (`POST /api/prompt/build-cohesive` with `tool: 'shorts'`)
   - LLM (`gpt-4.1-mini-2025-04-14`) weaves all inputs into a single cohesive prompt
   - **NEVER concatenate** — the LLM decides how to integrate everything
   - Includes model-specific optimization (Kling, Veo, Wan have different prompt structures)
3. Generate starting image using selected **Image Model** (from modelRegistry.js)
4. Generate video using selected **Video Model** (I2V or R2V)
   - I2V: pass starting image + cohesive prompt
   - R2V: pass starting image + @element references + cohesive prompt
   - Duration: 5-6s (model-specific format — Veo uses '4s'/'6s', Kling uses '5'/'10', etc.)
   - `generate_audio: false` always (Shorts has its own voiceover + music)
5. Upload generated video to Supabase storage

### Scene 2+ (Subsequent Scenes — this is the CRITICAL chaining logic)
1. **Extract last frame** from previous scene's video:
   - `fal-ai/ffmpeg-api/extract-frame` with `frame_type: 'last'`
   - Returns the actual image URL — needed as I2V input for Continuous mode

2. **Analyze previous scene video with Gemini**:
   - Use `@google/genai` SDK with `gemini-3-flash-preview` model
   - Send the full 5-6s video clip inline (under 20MB, use `inline_data`)
   - Gemini natively processes video at 1 FPS (audio + visual) — NO manual frame extraction
   - Prompt asks for: scene description, character positions, setting details, lighting state, mood progression, movement that occurred, narrative context to carry forward
   - This analysis is the PRIMARY input for updating the next scene's visual description

3. **Update visual description** for this scene:
   - DO NOT use the original static visual description from Step 1
   - Combine: original scene direction + Gemini's analysis of previous scene + camera direction for this scene
   - The Cohesive Prompt Builder receives all of this and produces the updated prompt
   - Key fields passed to build-cohesive:
     - `description`: this scene's visual direction (from script)
     - `referenceDescription`: Gemini's analysis of the previous scene (what happened, what to carry forward)
     - `cameraDirection`: from the framework beat
     - `style`: full `promptText` from selected StyleGrid preset
     - `mood`: selected mood
     - `lighting`: selected lighting
     - `brandStyleGuide`: full brand kit object
     - `targetModel`: selected video model (triggers model-specific prompt optimization)

4. **Generate starting image**:
   - **Continuous mode**: Use the extracted last frame directly as I2V input (skip image generation)
   - **Exciting mode**: Generate a NEW starting image using the updated cohesive prompt + image model

5. **Generate video**: Same as Scene 1 but with the chained/updated context

6. Repeat for all remaining scenes

### Assembly
1. All scene videos are assembled with `fal-ai/ffmpeg-api/compose`:
   - Video tracks: `type: 'video'` for each scene clip
   - Audio tracks: voiceover (`type: 'audio'`), background music (`type: 'audio'`), SFX (`type: 'audio'` per effect)
   - Music volume controlled by `musicVolume` parameter
2. Captions burned via `fal-ai/workflow-utilities/auto-subtitle`
3. Final video uploaded to Supabase storage

---

## Prompt Engineering — CRITICAL RULES

### Cohesive Prompt Builder (`/api/prompt/build-cohesive`)
- **NEVER concatenate** inputs into prompts. Always use the LLM to compose.
- Uses `gpt-4.1-mini-2025-04-14` (NOT gpt-5-mini, NOT gpt-4o).
- Tool mode: `'shorts'` (needs to be added — extend `getSystemPrompt()` in `build-cohesive.js`).
- The system prompt for `'shorts'` tool mode must emphasize:
  - Scene continuity: carry forward characters, settings, lighting conditions from previous scene analysis
  - Single moment: describe ONE 5-6s moment, not a sequence
  - Niche visual mood context
  - Previous scene analysis integration (advance the story, don't repeat)
  - No copyrighted brand names (Pixar, Disney, etc.)
  - Under 200 words

### Script Generation
- Uses `gpt-4.1-mini-2025-04-14` with **Zod structured output** (`zodResponseFormat`).
- Returns typed JSON matching the Zod schema — NO regex parsing.
- Each scene in the response has: `narration`, `visualDescription`, `label`, `camera`, `duration`.
- Visual descriptions must be specific enough for image generation but flexible enough for the Cohesive Prompt Builder to adapt.

### Scene Description Updates
- Scene 1 uses the original `visualDescription` from script generation.
- Scene 2+ uses an UPDATED visual description based on Gemini's analysis of the previous scene.
- The update is done by the Cohesive Prompt Builder — it receives both the original direction AND the Gemini analysis and produces a contextually aware prompt.
- This means every scene's actual generation prompt is different from the static script — it's informed by what actually happened in the video.

---

## Video Analysis (Gemini Native Video Understanding)

### What we use
- `@google/genai` SDK (`npm install @google/genai`)
- Model: `gemini-3-flash-preview`
- `GEMINI_API_KEY` env var (set in `.env`)

### How it works for scene chaining
```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// For short 5-6s clips under 20MB, use inline data
const videoBytes = fs.readFileSync(localVideoPath);
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: [
    {
      inlineData: {
        mimeType: 'video/mp4',
        data: videoBytes.toString('base64'),
      },
    },
    {
      text: 'Analyze this video scene for continuity. Describe: characters visible (appearance, position, pose), setting/environment details, lighting conditions, color palette, mood/atmosphere, what action occurred, and what the final frame shows. Be specific — this description will be used to generate the NEXT scene in a sequence.',
    },
  ],
});

const sceneAnalysis = response.text;
```

### Why Gemini, not GPT with extracted frames
- Gemini processes video NATIVELY at 1 FPS (audio + visual)
- No manual frame extraction needed
- Richer analysis: sees motion, transitions, temporal progression
- The existing `api/analyze/video.js` and `api/analyze/video-gemini.js` both extract frames manually and send to GPT — that's the OLD approach
- For scene chaining, native video understanding is strictly better

---

## Models Reference

### Image Models (for starting keyframe generation)
Source: `api/lib/modelRegistry.js` `IMAGE_MODELS`

| Key | Label | Provider | Endpoint | LoRA | Notes |
|-----|-------|----------|----------|------|-------|
| `fal_flux` | FLUX 2 | FAL | `fal-ai/flux-2/lora` | Yes | Uses `image_size` |
| `fal_klein_4b` | FLUX.2 Klein 4B | FAL | `fal-ai/flux-2/klein/4b/base/lora` | Yes | Uses `image_size` |
| `fal_klein_9b` | FLUX.2 Klein 9B | FAL | `fal-ai/flux-2/klein/9b/base/lora` | Yes | Uses `image_size` |
| `fal_wan22_t2i` | Wan 2.2 T2I | FAL | `fal-ai/wan/v2.2-a14b/text-to-image/lora` | Yes | Uses `image_size` |
| `fal_seedream` | SeedDream v4.5 | FAL | `fal-ai/bytedance/seedream/v4.5/text-to-image` | No | Uses `image_size` |
| `fal_imagen4` | Imagen 4 | FAL | `fal-ai/imagen4/preview/fast` | No | Uses `aspect_ratio` |
| `fal_kling_img` | Kling Image v3 | FAL | `fal-ai/kling-image/v3/text-to-image` | No | Uses `aspect_ratio` |
| `fal_grok` | Grok Imagine | FAL | `xai/grok-imagine-image` | No | Uses `aspect_ratio` |
| `fal_ideogram` | Ideogram v2 | FAL | `fal-ai/ideogram/v2` | No | Uses `aspect_ratio` |
| `fal_nano_banana` | Nano Banana 2 | FAL | `fal-ai/nano-banana-2` | No | Uses `aspect_ratio` |
| `wavespeed` | Wavespeed | Wavespeed | `google/nano-banana-pro/text-to-image` | No | Uses `aspect_ratio` |

### I2V Video Models (Image-to-Video)
Source: `api/lib/modelRegistry.js` `VIDEO_MODELS`

| Key | Label | Endpoint | Duration Format | Audio |
|-----|-------|----------|----------------|-------|
| `fal_kling_v2` | Kling 2.0 Master | `fal-ai/kling-video/v2/master/image-to-video` | `"5"` / `"10"` | No |
| `fal_kling_v3` | Kling V3 Pro | `fal-ai/kling-video/v3/pro/image-to-video` | `"5"` / `"10"` | Yes |
| `fal_kling_o3` | Kling O3 Pro | `fal-ai/kling-video/o3/pro/image-to-video` | `"5"` / `"10"` | Yes |
| `fal_veo2` | Veo 2 | `fal-ai/veo2/image-to-video` | N/A | No |
| `fal_veo3` | Veo 3.1 | `fal-ai/veo3.1/fast/image-to-video` | `'4s'`/`'6s'`/`'8s'` | Yes |
| `fal_veo3_lite` | Veo 3.1 Lite | `fal-ai/veo3.1/lite/image-to-video` | `'4s'`/`'6s'`/`'8s'` | Yes |
| `fal_pixverse_v6` | PixVerse V6 | `fal-ai/pixverse/v6/image-to-video` | N/A | `generate_audio_switch` |
| `fal_wan25` | Wan 2.5 | `fal-ai/wan-25-preview/image-to-video` | N/A | No |
| `fal_wan_pro` | Wan Pro | `fal-ai/wan-pro/image-to-video` | N/A | No |
| `fal_hailuo` | Hailuo/MiniMax | `fal-ai/minimax/video-01/image-to-video` | N/A | No |
| `fal_grok_video` | Grok Video | `xai/grok-imagine-video/image-to-video` | N/A | Yes (default ON) |
| `wavespeed_wan` | Wavespeed WAN | `wavespeed-ai/wan-2.2-spicy/image-to-video` | integer `5`/`8` | No |

### R2V Video Models (Reference-to-Video)
| Key | R2V Endpoint | Multi-Shot |
|-----|-------------|------------|
| `fal_kling_o3` | `fal-ai/kling-video/o3/pro/reference-to-video` | Yes |
| `fal_veo3` | `fal-ai/veo3.1/reference-to-video` | No |
| `fal_veo3_lite` | `fal-ai/veo3.1/reference-to-video` | No |
| `fal_grok_video` | `xai/grok-imagine-video/reference-to-video` | No |

---

## Key Rules — DO NOT VIOLATE

1. **Scenes must be 5-6s max** — shorter scenes = less room for error.
2. **No FLF mode** — First-Last-Frame is excluded. Too unreliable.
3. **NEVER concatenate prompts** — ALWAYS use the Cohesive Prompt Builder (LLM). Every image prompt is assembled by `gpt-4.1-mini-2025-04-14`, never by string concatenation.
4. **Use Zod structured output** for all OpenAI calls that return structured data (scripts, scene descriptions). NO regex parsing.
5. **Use Gemini native video understanding** for scene analysis (`gemini-3-flash-preview` via `@google/genai`). Do NOT extract frames manually and send to GPT.
6. **Scene descriptions update dynamically** — Scene 2+ uses Gemini analysis of previous scene, NOT the static description from Step 1.
7. **`generate_audio: false` always** for video clips — Shorts Builder has its own voiceover + music pipeline.
8. **Grok Video defaults `generate_audio` to true** — must explicitly send `false`.
9. **Veo 3.1 Lite defaults `generate_audio` to true** — must explicitly send `false`.
10. **SFX are auto-selected by niche** — no manual per-scene dropdowns. Critical for Flows automation.
11. **Brand Kit passes ALL fields** — not just name and color. Full `BRAND_FIELDS` array from `api/brand/kit.js`.
12. **Framework = duration guide** — no separate duration selector.
13. **Avatar = framework** — Avatar Narrator and Avatar Split Screen are frameworks, not add-ons.
14. **Light theme only** — no dark mode, no Tailwind dark classes.
15. **Scroll to top** on every step transition.
16. **Upload all generated media to Supabase** — FAL CDN URLs expire within hours.
17. **Music is always instrumental** — `lyrics_prompt: '[Instrumental]'`, never lyrics.
18. **Video model duration formats differ** — use `veoDuration()` for Veo, string numbers for Kling, integers for Wavespeed. The model registry handles this via `buildBody()`.
19. **PixVerse V6 uses `generate_audio_switch`** (NOT `generate_audio`) — different param name.

## Features NOT in Shorts Builder (handled elsewhere)
- **Motion Transfer** — excluded entirely
- **Bulk Production Queue** — handled by Flows
- **Quality Review Gate** — Flows or dashboard
- **Multi-platform Repurposing** — Flows
- **Client Brief** — Flows entry point
- **Camera control UI** — baked into framework scene definitions, no separate UI

## Backend APIs Used
- `/api/shorts/research` — real-time Google News research
- `/api/shorts/discover-topics` — AI-scored topic suggestions
- `/api/workbench/voiceover` — TTS generation (Gemini TTS or ElevenLabs via FAL proxy)
- `/api/workbench/timing` — Whisper timestamps + block alignment + duration solving
- `/api/workbench/music` — background music generation (ElevenLabs Music via FAL proxy)
- `/api/workbench/generate-frame` — keyframe image generation (uses mediaGenerator.js)
- `/api/workbench/generate-clip` — video clip generation (uses mediaGenerator.js)
- `/api/workbench/assemble` — FFmpeg assembly via `fal-ai/ffmpeg-api/compose`
- `/api/prompt/build-cohesive` — LLM prompt assembly (gpt-4.1-mini)
- `/api/brand/kit` — brand kit CRUD (GET loads user's brand kits)
- `/api/styles/captions` — caption presets
- `fal-ai/workflow-utilities/auto-subtitle` — caption burning
- `fal-ai/ffmpeg-api/extract-frame` — last frame extraction (`frame_type: 'last'`)
- `fal-ai/whisper` — word-level timestamps for timing alignment
- Gemini API (`@google/genai`, `gemini-3-flash-preview`) — native video scene analysis

## Database
- Drafts: `ad_drafts` table with `storyboard_json` JSONB
- Campaigns: `campaigns` table (linked via `campaign_id`)
- Brand kits: `brand_kit` table (full schema in `api/brand/kit.js` `BRAND_FIELDS`)
- Library: saved to Supabase storage via `uploadUrlToSupabase()`
- Flows: saved as flow template (format TBD)

## Environment Variables
- `GEMINI_API_KEY` — for native video analysis via `@google/genai`
- `FAL_KEY` — resolved via `getUserKeys()`, used for all FAL endpoints
- `OPENAI_API_KEY` — resolved via `getUserKeys()`, used for script gen + prompt building
- `WAVESPEED_API_KEY` — resolved via `getUserKeys()`, for Wavespeed models only
- Standard Supabase vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
