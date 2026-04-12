# Shorts Builder — Complete Tool Guide

## Overview
Clean rebuild of the Shorts creation tool at `/shorts/builder` (`ShortsBuilderPage.jsx`).
Replaces the old bloated `ShortsWorkbenchPage.jsx` which remains at `/shorts/workbench` for reference only.

The Shorts Builder is a step-by-step wizard that visually builds different types of Shorts.
Once a configuration is dialed in, it saves as a Flows template for automated production.

## Architecture Decisions
- **Inline styles** — no Tailwind dark theme. Light theme, `#FAFAFA` background, `#111827` text.
- **One file** — `src/pages/ShortsBuilderPage.jsx`. No component extraction until approved.
- **Separate from old tool** — runs alongside, does NOT modify `ShortsWorkbenchPage.jsx`.
- **Topic drives structure** — frameworks are matched to topics via embedding similarity, not selected manually.
- **Frameworks do NOT prescribe scene counts** — the script determines length, timing keyframes determine scene breaks.
- **No FLF** — First-Last-Frame mode is excluded entirely.
- **No Avatar Split Screen** — removed, needs more work.
- **Cohesive prompts ONLY** — all image prompts assembled by LLM via Cohesive Prompt Builder. NEVER concatenate.
- **Gemini for video analysis** — native video understanding via `@google/genai`, not manual frame extraction to GPT.

## File Locations
- **Frontend page**: `src/pages/ShortsBuilderPage.jsx`
- **Route**: `/shorts/builder` (registered in `App.jsx`)
- **Frameworks data**: `src/lib/builderFrameworks.js` (71 frameworks: 11 universal + 60 niche-specific)
- **Framework embeddings**: `data/framework-embeddings.json` (pre-computed, 1536 dims)
- **Framework matcher**: `api/lib/frameworkMatcher.js` (cosine similarity matching)
- **Embedding computation script**: `scripts/compute-framework-embeddings.js`
- **Gemini video analyzer**: `api/lib/geminiVideoAnalyzer.js`
- **Scene continuity endpoint**: `api/analyze/scene-continuity.js`
- **Framework match endpoint**: `api/shorts/match-framework.js`
- **Cohesive Prompt Builder**: `api/prompt/build-cohesive.js` (has `'shorts'` tool mode)
- **Style presets**: `src/lib/stylePresets.js` (123 visual styles with thumbnails)
- **This guide**: `docs/SHORTS-BUILDER.md`
- **Old tool (reference only)**: `src/pages/ShortsWorkbenchPage.jsx` at `/shorts/workbench`

---

## Framework Matching — Embedding-Based Semantic Selection

### How it works
1. **Pre-computed**: Each framework's `description + narrativeArc + hookStrategy + emotionalProgression + pacingStrategy + voiceDirection` is concatenated and embedded with `text-embedding-3-small` (1536 dimensions). Stored in `data/framework-embeddings.json`.
2. **At runtime**: When the user selects a topic and clicks "Generate Script", the topic text is embedded with the same model. Cosine similarity is computed against all framework embeddings filtered by niche (universal + niche-specific).
3. **Best match wins**: Pure math. No LLM guessing, no token waste. One cheap embedding call per topic (~$0.00002).
4. **For Flows**: Framework is always `'auto'` — each new topic gets its own best-fit framework.

### Recomputing embeddings
Run when frameworks are added or changed:
```bash
node scripts/compute-framework-embeddings.js
```
Requires `OPENAI_API_KEY` in `.env`.

### Framework structure (71 total)
Each framework has 8 narrative guidance fields — NO scene counts, NO scene arrays:
- `narrativeArc` — the storytelling journey from hook to payoff
- `pacingStrategy` — how energy, tempo, and tension build and release
- `cameraPhilosophy` — overall visual language (not per-scene directions)
- `emotionalProgression` — what the viewer feels at each stage
- `hookStrategy` — exactly how to open (specific to framework style)
- `payoffStrategy` — how to end (what leaves the viewer wanting more)
- `visualNotes` — visual techniques that serve this approach
- `voiceDirection` — narrator delivery with inflections, pacing shifts, emphasis patterns

### Why frameworks don't have scene counts
The SCRIPT determines content length. The TIMING KEYFRAMES (Whisper word timestamps + block alignment) determine where scenes break. Frameworks guide HOW the story is told, not how many pieces it's cut into.

---

## Wizard Steps

### Step 1: Script
1. **Choose Niche** — 20 niches (grid). Determines topic suggestions, voice style, visual mood, music mood, SFX palette.
2. **Choose Topic** — 3-level funnel (Category -> Angle -> Hook). Multiple hooks selectable.
3. **Find Topics** — Two research options side by side:
   - **Research Real Stories** (`POST /api/shorts/research`): Google News real-time -> GPT structures with angle/context/viral potential.
   - **Discover Trending Topics** (`POST /api/shorts/discover-topics`): Multi-source AI scoring (trending %, competition level, source).
4. **Custom Topic** — free text input, overrides funnel selection.
5. **Creative Mode** toggle — creative visual storytelling with factual accuracy. No fabrication or hallucination.
6. **Brand Kit** — dropdown selector. When selected, the FULL brand kit passes through to all downstream generation (20 fields from `brand_kit` table via `GET /api/brand/kit`).
7. **Framework** — shown in the UI for optional manual override, but NOT required. Default: auto-matched via embeddings when script is generated.
8. **Generate Script** — two-step process:
   - Step A: `POST /api/shorts/match-framework` — embeds topic, cosine similarity against framework embeddings, returns best match
   - Step B: `POST /api/campaigns/preview-script` — generates script using matched framework's guidance
   - Uses `gpt-4.1-mini-2025-04-14` with Zod structured output. Returns per scene: `narration_segment`, `visual_prompt`, `scene_label`.
9. **Save Draft / Load Draft** buttons in header.
10. **Continue to Step 2** button (scrolls to top).

### Step 2: Voice & Audio
1. **No Voiceover toggle** — skip voice entirely (visuals + music only).
2. **Voice Provider** — Gemini TTS (30 voices, recommended) or ElevenLabs (22 voices via FAL proxy).
3. **Voice Selection** — grid of voices for selected provider.
4. **Voice Style** — niche default pre-highlighted (green). 8 universal presets. Custom textarea. Must include inflections and delivery specifics.
5. **Voice Speed** — 1.0x to 1.3x, default 1.15x.
6. **Generate Voiceover** (`POST /api/workbench/voiceover`) -> audio preview with `<audio>` element.
7. After voiceover -> **Background Music**:
   - **Auto-defaults to niche music mood** when entering Step 2.
   - 8 mood presets + custom input. Always instrumental.
   - Volume slider (0-100%, default 15%).
   - `POST /api/workbench/music` (ElevenLabs Music via FAL proxy).
8. After music -> **Timing Alignment**:
   - `POST /api/workbench/timing` (Whisper word timestamps -> block alignment -> duration solving).
   - Scenes optimized to **5-6s each**.
   - Updates script scene durations from returned blocks.
9. After timing -> **Sound Effects**:
   - SFX comes AFTER timing because placement depends on actual scene lengths.
   - Toggle on by default. Auto-selected by niche SFX palette (no manual dropdowns).
   - Each SFX is 3-6s, placed at scene transitions. Separate audio layer from music.
   - Button count reflects actual `timingBlocks.length`.
   - `POST /api/workbench/sfx`.
10. **Continue to Step 3** (scrolls to top).

### Step 3: Visuals (CONFIG ONLY — no generation in this step)
1. **Continuity Mode**:
   - **Continuous**: Extract last frame of each video -> use as I2V starting image for next scene. Analyze previous video via Gemini for context. Seamless flow.
   - **Exciting**: Generate fresh starting image per scene. Previous scene still analyzed via Gemini for narrative continuity, but each scene gets unique visual composition.
2. **Video Model** — I2V or R2V (NO FLF):
   - **I2V**: Starting image per scene -> video model animates.
   - **R2V**: Starting image + @element reference images for consistent character/avatar.
3. **Image Model** — selects which model generates starting keyframe images (11 models, LoRA badges where supported).
4. **R2V Reference Images** — upload / import from URL / add from library.
5. **Visual Style** — full StyleGrid with thumbnails from `src/lib/stylePresets.js` (123 presets). Each has 40-80 word `promptText`.
6. **Mood & Atmosphere** — Lighting (7 options), Mood (7 options), Intensity slider (1-10).
7. **Per-Scene Visual Descriptions** — shows image source per scene (starting image / last frame + analysis / fresh image).
8. **Pipeline Summary** — all config at a glance.
9. **Continue to Step 4** (scrolls to top).

### Step 4: Captions & Subtitles
- No Captions toggle.
- 4 caption styles: word_pop, karaoke_glow, word_highlight, news_ticker.
- Position: top / center / bottom. Highlight color picker (7 colors).
- Live preview. Uses `fal-ai/workflow-utilities/auto-subtitle`.
- **Continue to Step 5** (scrolls to top).

### Step 5: Generate & Save
- Full configuration summary.
- **Generate Short** fires the full pipeline (see below).
- Progress tracking per scene.
- After completion: video preview player, Save to Library, Save as Flow Template.

---

## Generation Pipeline (Step 5)

### Scene 1 (First Scene)
1. **Cohesive Prompt** (`POST /api/prompt/build-cohesive`, `tool: 'shorts'`)
   - Inputs: `description` (scene visual), `style` (promptText from StyleGrid), `cameraDirection`, `mood`, `lighting`, `brandStyleGuide` (full 20-field brand kit), `targetModel`, `nicheMood`, `sceneIndex`, `totalScenes`
   - LLM (`gpt-4.1-mini`) weaves all inputs into single prompt. **NEVER concatenate.**
2. **Generate starting image** (`POST /api/workbench/generate-frame`)
   - Uses selected Image Model from modelRegistry.js
3. **Generate video** (`POST /api/workbench/generate-clip`)
   - `mode: 'i2v'` or `'r2v'`, `generate_audio: false` ALWAYS
4. Upload to Supabase

### Scene 2+ (Chaining)
1. **Last frame**: Use `last_frame_url` from clip response (workbench handler extracts it)
2. **Analyze previous scene** (`POST /api/analyze/scene-continuity`)
   - Uses `@google/genai` SDK with `gemini-3-flash-preview`
   - Sends full 5-6s video inline (base64, under 20MB)
   - Returns: characters, setting, lighting, mood, action, final frame state
   - Non-fatal: falls back to narration context if analysis fails
3. **Updated cohesive prompt** — passes `previousSceneAnalysis` as `referenceDescription`
4. **Image**:
   - Continuous: use last frame directly (skip image gen)
   - Exciting: generate new image with updated prompt
5. **Video**: same as Scene 1
6. Repeat for all scenes

### Assembly
1. `POST /api/workbench/assemble`
   - Clips array, voiceover, music (volume as decimal), SFX, caption config
   - FFmpeg compose via `fal-ai/ffmpeg-api/compose`
2. Captions via `fal-ai/workflow-utilities/auto-subtitle`
3. Final video uploaded to Supabase
4. Video preview player + Save to Library + Save as Flow Template

---

## Key Rules — DO NOT VIOLATE

1. **Topic drives structure** — framework matched via embedding cosine similarity, not manual selection.
2. **Frameworks have NO scene counts** — script determines length, keyframes determine scene breaks.
3. **Scenes must be 5-6s max** — shorter = tighter edits, fewer errors.
4. **No FLF** — First-Last-Frame excluded. Too unreliable.
5. **No Avatar Split Screen** — removed, needs more work.
6. **NEVER concatenate prompts** — always use Cohesive Prompt Builder (`gpt-4.1-mini`).
7. **Use Zod structured output** for all OpenAI calls returning structured data. NO regex parsing.
8. **Use Gemini native video understanding** (`gemini-3-flash-preview` via `@google/genai`) for scene analysis. Do NOT extract frames manually.
9. **Scene descriptions update dynamically** — Scene 2+ uses Gemini analysis of previous scene.
10. **`generate_audio: false` always** for video clips.
11. **Grok Video defaults `generate_audio` to true** — must explicitly send `false`.
12. **Veo 3.1 Lite defaults `generate_audio` to true** — must explicitly send `false`.
13. **SFX auto-selected by niche** — no manual per-scene dropdowns. Critical for Flows automation.
14. **Brand Kit passes ALL 20 fields** — not just name and color.
15. **Light theme only** — no dark mode, no Tailwind dark classes.
16. **Scroll to top** on every step transition.
17. **Upload all generated media to Supabase** — FAL CDN URLs expire within hours.
18. **Music always instrumental** — `lyrics_prompt: '[Instrumental]'`.
19. **Video model duration formats differ** — Veo uses `'4s'/'6s'/'8s'`, Kling uses `'5'/'10'`, Wavespeed uses integer.
20. **PixVerse V6 uses `generate_audio_switch`** not `generate_audio`.
21. **Recompute embeddings** when frameworks change: `node scripts/compute-framework-embeddings.js`

---

## Models Reference

### Image Models (starting keyframe generation)
Source: `api/lib/modelRegistry.js` `IMAGE_MODELS`

| Key | Label | Provider | Endpoint | LoRA |
|-----|-------|----------|----------|------|
| `fal_flux` | FLUX 2 | FAL | `fal-ai/flux-2/lora` | Yes |
| `fal_klein_4b` | FLUX.2 Klein 4B | FAL | `fal-ai/flux-2/klein/4b/base/lora` | Yes |
| `fal_klein_9b` | FLUX.2 Klein 9B | FAL | `fal-ai/flux-2/klein/9b/base/lora` | Yes |
| `fal_wan22_t2i` | Wan 2.2 T2I | FAL | `fal-ai/wan/v2.2-a14b/text-to-image/lora` | Yes |
| `fal_seedream` | SeedDream v4.5 | FAL | `fal-ai/bytedance/seedream/v4.5/text-to-image` | No |
| `fal_imagen4` | Imagen 4 | FAL | `fal-ai/imagen4/preview/fast` | No |
| `fal_kling_img` | Kling Image v3 | FAL | `fal-ai/kling-image/v3/text-to-image` | No |
| `fal_grok` | Grok Imagine | FAL | `xai/grok-imagine-image` | No |
| `fal_ideogram` | Ideogram v2 | FAL | `fal-ai/ideogram/v2` | No |
| `fal_nano_banana` | Nano Banana 2 | FAL | `fal-ai/nano-banana-2` | No |
| `wavespeed` | Wavespeed | Wavespeed | `google/nano-banana-pro/text-to-image` | No |

### I2V Video Models
| Key | Label | Endpoint | Duration Format |
|-----|-------|----------|----------------|
| `fal_kling_v3` | Kling V3 Pro | `fal-ai/kling-video/v3/pro/image-to-video` | `"5"` / `"10"` |
| `fal_kling_o3` | Kling O3 Pro | `fal-ai/kling-video/o3/pro/image-to-video` | `"5"` / `"10"` |
| `fal_veo3` | Veo 3.1 | `fal-ai/veo3.1/fast/image-to-video` | `'4s'`/`'6s'`/`'8s'` |
| `fal_veo3_lite` | Veo 3.1 Lite | `fal-ai/veo3.1/lite/image-to-video` | `'4s'`/`'6s'`/`'8s'` |
| `fal_pixverse_v6` | PixVerse V6 | `fal-ai/pixverse/v6/image-to-video` | N/A |
| `fal_wan25` | Wan 2.5 | `fal-ai/wan-25-preview/image-to-video` | N/A |
| `fal_hailuo` | Hailuo/MiniMax | `fal-ai/minimax/video-01/image-to-video` | N/A |
| `fal_grok_video` | Grok Video | `xai/grok-imagine-video/image-to-video` | N/A |
| `wavespeed_wan` | Wavespeed WAN | `wavespeed-ai/wan-2.2-spicy/image-to-video` | integer |

### R2V Video Models
| Key | R2V Endpoint |
|-----|-------------|
| `fal_kling_o3` | `fal-ai/kling-video/o3/pro/reference-to-video` |
| `fal_veo3` | `fal-ai/veo3.1/reference-to-video` |
| `fal_veo3_lite` | `fal-ai/veo3.1/reference-to-video` |
| `fal_grok_video` | `xai/grok-imagine-video/reference-to-video` |

---

## Features NOT in Shorts Builder (handled elsewhere)
- **Motion Transfer** — excluded entirely
- **Avatar Split Screen** — removed, needs more work
- **Bulk Production Queue** — Flows
- **Quality Review Gate** — Flows or dashboard
- **Multi-platform Repurposing** — Flows
- **Client Brief** — Flows entry point
- **Camera control UI** — frameworks provide camera philosophy, not per-scene directions

## Backend APIs Used
| Endpoint | Purpose |
|----------|---------|
| `POST /api/shorts/match-framework` | Embedding-based framework matching |
| `POST /api/shorts/research` | Real-time Google News research |
| `POST /api/shorts/discover-topics` | AI-scored topic suggestions |
| `POST /api/campaigns/preview-script` | Script generation (gpt-4.1-mini + Zod) |
| `POST /api/workbench/voiceover` | TTS generation (Gemini or ElevenLabs via FAL) |
| `POST /api/workbench/timing` | Whisper timestamps + block alignment |
| `POST /api/workbench/music` | Background music (ElevenLabs Music via FAL) |
| `POST /api/workbench/sfx` | Sound effects (ElevenLabs SFX via FAL) |
| `POST /api/workbench/generate-frame` | Keyframe image generation |
| `POST /api/workbench/generate-clip` | Video clip generation |
| `POST /api/workbench/assemble` | FFmpeg assembly + caption burning |
| `POST /api/workbench/save-draft` | Draft save (also used for Flow Templates) |
| `POST /api/workbench/load-draft` | Draft load |
| `POST /api/workbench/list-drafts` | List user's drafts |
| `POST /api/prompt/build-cohesive` | LLM prompt assembly (tool: 'shorts') |
| `POST /api/analyze/scene-continuity` | Gemini video analysis for scene chaining |
| `GET /api/brand/kit` | Brand kit loading (full 20-field schema) |
| `POST /api/library/save` | Save final video to library |

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Script gen, prompt building, embedding matching |
| `GEMINI_API_KEY` | Native video analysis via `@google/genai` |
| `FAL_KEY` | All FAL endpoints (resolved via `getUserKeys()`) |
| `WAVESPEED_API_KEY` | Wavespeed models only |
| `SUPABASE_URL` | Database + storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access |

## Database
- Drafts: `ad_drafts` table with `storyboard_json` JSONB
- Campaigns: `campaigns` table (linked via `campaign_id`)
- Brand kits: `brand_kit` table (20 fields in `BRAND_FIELDS`)
- Library: Supabase storage via `uploadUrlToSupabase()`
- Flow Templates: saved as drafts with `is_flow_template: true` flag
