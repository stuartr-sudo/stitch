# Shorts Builder — Tool Guide

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

## Wizard Steps

### Step 1: Script
1. **Choose Niche** — 20 niches (grid). Determines frameworks, topics, voice style, visual mood.
2. **Choose Framework** — structural templates defining scene beats, duration, pacing.
   - Avatar Narrator and Avatar Split Screen are frameworks, NOT add-ons.
   - TODO: Filter to show only niche-specific + universal frameworks (not all 76).
   - Framework = duration guide. No separate duration selector.
3. **Choose Topic** — 3-level funnel (Category → Angle → Hook). Multiple hooks selectable.
4. **Find Topics** — Two research options side by side:
   - **Research Real Stories** (`/api/shorts/research`): Google News real-time → GPT structures with angle/context/viral.
   - **Discover Trending Topics** (`/api/shorts/discover-topics`): Multi-source AI scoring (trending %, competition level).
5. **Custom Topic** — free text input, overrides funnel selection.
6. **Creative Mode** toggle — creative visual storytelling with factual accuracy. No fabrication.
7. **Brand Kit** — optional brand kit selection for consistency across all generation.
8. **Generate Script** — takes all inputs, LLM generates cohesive script. NOT generic AI slop.
   - TODO: Script generation must also produce visual scene descriptions per scene.
9. **Continue to Step 2** button (scrolls to top).

### Step 2: Voice & Audio
1. **No Voiceover toggle** — skip voice entirely (visuals + music only).
2. **Voice Provider** — Gemini TTS (30 voices, recommended) or ElevenLabs (22 voices via FAL proxy).
3. **Voice Selection** — grid of voices for selected provider.
4. **Voice Style** — niche default pre-highlighted (green). 8 universal presets. Custom textarea.
5. **Voice Speed** — 1.0x to 1.3x, default 1.15x.
6. **Generate Voiceover** button.
7. After voiceover → **Background Music**:
   - Niche default mood pre-filled.
   - 8 mood presets + custom input.
   - Volume slider (0-100%, default 15%).
   - Generate Music button (always instrumental via ElevenLabs Music).
8. After music → **Timing Alignment**:
   - Whisper word timestamps → block alignment → duration solving.
   - Scenes optimized to **5-6s each** (shorter = tighter edits, fewer errors).
   - Visual timing preview with bars.
9. After timing → **Sound Effects**:
   - SFX comes AFTER timing because placement depends on actual scene lengths.
   - Toggle on by default. Auto-selected by niche SFX palette (no manual dropdowns).
   - Each SFX is 3-6s, placed at scene transitions. Separate audio layer from music.
   - Intelligently chosen from per-niche SFX library (critical for Flows automation).
   - Generate SFX button.
10. After all complete → **Continue to Step 3** (scrolls to top).

### Step 3: Visuals (CONFIG ONLY — no generation yet)
1. **Continuity Mode** — toggle between:
   - **Continuous**: Extract last frame of each video → use as I2V starting image for next scene. Analyze previous video for context. Seamless visual flow.
   - **Exciting**: Generate fresh starting image per scene. Previous scene still analyzed for narrative continuity, but each scene has unique visual composition.
2. **Video Model** — I2V or R2V (NO FLF — explicitly excluded, too fickle):
   - **I2V** (Image-to-Video): Starting image per scene → video model animates.
   - **R2V** (Reference-to-Video): Starting image + @element references for consistent character/avatar. Only 4 models: Kling O3 Pro, Veo 3.1, Veo 3.1 Lite, Grok Video.
3. **R2V Reference Images** — upload zone for character references (up to 7 angles).
4. **Visual Style** — 123 presets from StyleGrid. Popular 16 shown, "Browse all" expands.
5. **Mood & Atmosphere** — Lighting (7 options), Mood (7 options), Intensity slider (1-10).
6. **Per-Scene Visual Descriptions** — shows each scene with badge explaining image source:
   - Scene 1: Always "Starting image generated"
   - Continuous mode: "Last frame from scene N + analysis"
   - Exciting mode: "Fresh image + previous scene analysis"
7. **Pipeline Summary** — all config at a glance.
8. **Cohesive Prompt Builder** — LLM assembles all inputs into one optimized prompt per scene. NEVER concatenate prompts.
9. **Continue to Step 4** (scrolls to top).

### Step 4: Captions & Subtitles
- Caption style selection (word_pop, karaoke_glow, word_highlight, news_ticker, etc.).
- Font, size, color, position, animation options.
- Uses `fal-ai/workflow-utilities/auto-subtitle`.
- Preview of caption configuration.

### Step 5: Generate & Save
- **Generate** button fires the full pipeline.
- Progress tracking per scene (image gen → video gen → assembly).
- After completion:
  - **Save to Library** — final composition saved to media library.
  - **Save as Flow Template** — entire configuration saved as a Flows template for automated production.

## Key Rules
- **Scenes must be 5-6s max** — shorter scenes = less room for error.
- **No FLF mode** — First-Last-Frame is excluded. Too unreliable.
- **SFX auto-selection** — no manual per-scene SFX dropdowns. Niche palette, intelligent matching.
- **Cohesive prompts** — ALWAYS use LLM to assemble prompts, NEVER concatenate.
- **Brand Kit** — optional but applies to all generation when selected.
- **Visual scene descriptions** — generated alongside script in Step 1 (TODO).
- **Framework = duration guide** — no separate duration selector.
- **Avatar = framework** — Avatar Narrator and Avatar Split Screen are frameworks, not add-ons.
- **Light theme only** — no dark mode, no Tailwind dark classes.
- **Scroll to top** on every step transition.

## Backend APIs Used
- `/api/shorts/research` — real-time news research
- `/api/shorts/discover-topics` — AI-scored topic suggestions
- `/api/workbench/voiceover` — TTS generation (Gemini or ElevenLabs)
- `/api/workbench/timing` — Whisper timestamps + block alignment
- `/api/workbench/music` — background music generation
- `/api/workbench/generate-frame` — keyframe image generation
- `/api/workbench/generate-clip` — video clip generation
- `/api/workbench/assemble` — FFmpeg assembly
- `/api/prompt/build-cohesive` — LLM prompt assembly
- `/api/styles/captions` — caption presets
- `fal-ai/workflow-utilities/auto-subtitle` — caption burning

## Database
- Drafts: `ad_drafts` table with `storyboard_json` JSONB
- Campaigns: `campaigns` table (linked via `campaign_id`)
- Library: saved to Supabase storage via `uploadUrlToSupabase()`
- Flows: saved as flow template (format TBD)

## File Locations
- Frontend: `src/pages/ShortsBuilderPage.jsx`
- Route: `/shorts/builder` (registered in `App.jsx`)
- Old tool: `src/pages/ShortsWorkbenchPage.jsx` at `/shorts/workbench` (reference only)
- This guide: `docs/SHORTS-BUILDER.md`
