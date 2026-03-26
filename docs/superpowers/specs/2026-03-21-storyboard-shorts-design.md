# Storyboard Shorts — Design Spec

## Goal

Unify Shorts creation into the existing Storyboard/Campaigns system. Remove the standalone Shorts Factory (`/shorts`). Shorts become a content type within `/campaigns/new`, reusing Storyboard's frame-chaining, scene regeneration, and campaign infrastructure.

## Core Concept

The user makes three independent choices when creating a Short:

1. **Niche Template** — narrative structure (AI/Tech, Horror, Finance, etc.). Defines scene count, roles, pacing, script system prompt, music mood, and default voice.
2. **Visual Style** — aesthetic appearance (Pixel Art, Studio Ghibli, Comic Book, Cinematic, Documentary, etc.). Controls the image generation prompt suffix.
3. **Video Style** — animation feel (cinematic camera, UGC handheld, documentary, anime motion, etc.). Controls the motion/animation prompt.

Plus optional:
- **LoRA** — character/brand consistency across scenes
- **Video Model** — which AI generates clips (Kling V3, Veo 3, Wan 2.5, etc.)
- **Voice** — ElevenLabs voice for narration
- **Caption Style** — word_pop, karaoke_glow, etc.

---

## UI Changes

### CampaignsNewPage.jsx

Add a content type toggle at the top: **"Ad"** | **"Short"**.

**When "Ad" is selected:** Current behavior unchanged. Manual scene editor, template picker, platforms, etc.

**When "Short" is selected:** The page shows:

| Section | Component | Description |
|---------|-----------|-------------|
| Niche Template | Card grid (12 niches) | Selects narrative structure. Shows niche name, icon, scene count, description. |
| Topic | Text input + "Research Stories" button | Free text topic or AI-researched trending stories via SearchAPI. |
| Visual Style | Style grid (extracted from JumpStartModal into shared module) | Pixel Art, Ghibli, Comic Book, Manga, Pixar 3D, paintings, photorealistic, etc. |
| Video Style | Selector grid | Cinematic, UGC, Documentary, Commercial, TikTok, Anime, Film Noir, etc. Each with a descriptive prompt. |
| Video Model | Dropdown | Kling V3, Veo 3, Wan 2.5, Hailuo, PixVerse. Per-project choice, all scenes use same model. |
| Voice | Voice cards with preview | ElevenLabs voices. Play/stop preview button per voice (reuses existing voice preview endpoint). |
| Caption Style | Style selector | word_pop, karaoke_glow, word_highlight, neon_glow, typewriter, bounce, etc. |
| LoRA | LoRAPicker (existing) | Optional character/brand consistency models. |

The manual scene editor, platform selector, writing structure fields, and Visual Style Presets are hidden when "Short" is selected. (Visual Style Presets like "cinematic lighting" overlap with the Video Style choices and would create redundant/conflicting prompts. The Visual Style grid already covers aesthetics.)

**Loading/error states:** After clicking "Create & Generate", the user is redirected to the campaigns page. The draft card shows a progress indicator polling `/api/jobs/public-status` (same pattern as existing storyboard generation). If the pipeline fails at any step, the draft shows status "failed" with the error message. The user can retry from the draft card.

---

## Backend Pipeline

### Entry Point

`POST /api/campaigns/create` extended with conditional logic:

```
if content_type === 'shorts':
  run shorts pipeline (topic-driven, AI script, voiceover, captions)
else:
  run existing storyboard pipeline (manual scenes)
```

**Implementation note:** The existing `create.js` must be updated to:
- Pass `content_type` into the campaign insert (currently omitted, defaults to 'article')
- Wire up frame-chaining (`extractLastFrame`, `analyzeFrameContinuity`) — these functions exist in `pipelineHelpers.js` but are not currently called by the campaigns create pipeline. The Shorts pipeline must call them explicitly.

### Request Body (Shorts mode)

```json
{
  "content_type": "shorts",
  "brand_username": "mybrand",
  "niche": "ai_tech_news",
  "topic": "OpenAI releases GPT-5",
  "story_context": "optional researched story context",
  "visual_style": "comic_book",
  "video_style": "cinematic",
  "video_model": "fal_kling",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "caption_style": "word_pop",
  "words_per_chunk": 3,
  "lora_config": [],
}
```

**`words_per_chunk`**: Controls how many words are grouped per caption chunk in the caption burning step. Default: 3. Passed through to `captionBurner.js`.

### Pipeline Steps (9 steps)

#### Step 1: Generate Script
- GPT generates structured script from niche template + topic
- Output: scenes array with role, duration, visual_prompt, motion_prompt, narration_segment
- Reuses `scriptGenerator.js`

#### Step 2: Generate Voiceover
- ElevenLabs TTS from narration_full
- Reuses `voiceoverGenerator.js`

#### Step 3: Generate Timestamps
- Whisper word-level timing
- Map words to scenes based on time boundaries

#### Step 4: Generate Images (Style-Aware Strategy)

The `image_strategy` is determined by the **Visual Style** (not the Video Style), since the visual aesthetic is what determines whether scenes should be distinct illustrations or continuous footage:

- **Illustrated visual styles** (anime, comic_book, manga, pixel_art, studio_ghibli, disney_pixar, cartoon, 8bit_retro): `image_strategy = 'fresh_per_scene'` — generate a fresh image per scene, each is a distinct illustration animated independently. Uses `analyzeFrameContinuity()` for style/color consistency in prompts.

- **All other visual styles** (photorealistic, cinematic, paintings, etc.): `image_strategy = 'frame_chain'` — generate image for **scene 1 only**, scenes 2+ use the extracted last frame from the previous video clip as their starting image.

Image prompt construction (clean, structured — not concatenated blobs):
```
[LoRA trigger words], [scene.visual_prompt], [visual_style prompt suffix]
```

#### Step 5: Animate Clips
- Uses the **user-selected video model** (not hardcoded)
- Motion prompt: `[scene.motion_prompt], [video_style prompt]`
- For `frame_chain`: input image = last frame from previous clip
- For `fresh_per_scene`: input image = freshly generated scene image
- Extracts last frame from each clip for continuity chain (used by next scene or regeneration)

#### Step 6: Generate Music
- Mood from niche template (e.g., "dark ambient horror drones" for Horror)
- Automatic fallback chain: Lyria 2 → MiniMax v2 (same as existing Shorts pipeline in `pipelineHelpers.js`). Not user-selectable.

#### Step 7: Assemble Video
- FFmpeg concat clips + mix voiceover (100%) + music (15%)

#### Step 8: Burn Captions
- Word-synced captions with selected style and `words_per_chunk` grouping
- Reuses `captionBurner.js`

#### Step 9: Finalize
- Create campaign record with `content_type: 'shorts'`
- Create ad_draft with all metadata in `shorts_metadata_json`
- Store scene data in `scene_inputs_json` for regeneration support

---

## Scene Regeneration

Shorts drafts use the existing `/api/campaigns/regenerate-scene` endpoint. When a scene is regenerated:

1. Generate new image for scene N (or use custom prompt)
2. Animate new clip for scene N
3. Extract last frame from new clip
4. **Cascade forward**: regenerate scenes N+1, N+2... using new frame chain
5. Re-assemble final video with all clips
6. Re-burn captions

The regenerate-scene endpoint already implements this cascade logic. Shorts drafts inherit it by storing per-scene data in `scene_inputs_json`.

---

## New Files to Create

### `api/lib/videoStylePresets.js`

Shared module extracted from JumpStartModal's `VIDEO_STYLES` array. Schema per entry:

```js
{
  key: 'cinematic',           // unique identifier
  label: 'Cinematic',         // display name
  category: 'professional',   // realistic | professional | artistic
  prompt: '...',              // appended to motion prompt
}
```

Categories and entries:

**Realistic/UGC:**
- `iphone_selfie` — iPhone Selfie (Raw)
- `ugc_testimonial` — UGC Testimonial
- `tiktok_style` — TikTok/Reels Style
- `facetime_call` — FaceTime/Video Call

**Professional:**
- `cinematic` — Cinematic
- `documentary` — Documentary
- `commercial` — Commercial/Ad
- `product_demo` — Product Demo

**Artistic:**
- `dreamy` — Dreamy/Ethereal
- `vintage` — Vintage/Retro
- `noir` — Film Noir
- `anime` — Anime Style

### Visual Style shared data module

Extract the visual style definitions (Pixel Art, Ghibli, Comic Book, etc.) from JumpStartModal into a shared module so both JumpStartModal and CampaignsNewPage can import them. Each entry includes:

```js
{
  key: 'comic_book',
  label: 'Comic Book',
  category: 'illustration',    // illustration | realistic | painting
  prompt_suffix: '...',        // appended to image prompt
  image_strategy: 'fresh_per_scene' | 'frame_chain',
}
```

The `image_strategy` field on the visual style determines whether frame-chaining or fresh-per-scene is used.

---

## Niche Templates

The 12 existing niche templates from `api/lib/shortsTemplates.js` become selectable presets. Display names and code keys:

| Display Name | Code Key |
|---|---|
| AI/Tech News | `ai_tech_news` |
| Finance & Crypto | `finance_crypto` |
| Motivation & Mindset | `motivation_mindset` |
| Horror & Creepy | `horror_creepy` |
| History & Mysteries | `history_mysteries` |
| True Crime | `true_crime` |
| Science & Nature | `science_nature` |
| Relationships & Dating | `relationships_dating` |
| Health & Fitness | `health_fitness` |
| Gaming & Pop Culture | `gaming_popculture` |
| Conspiracy & Unexplained | `conspiracy_unexplained` |
| Business & Startups | `business_startups` |

Each defines: scenes array (roles, durations), music_mood, voice_pacing, default_voice, script_system_prompt.

---

## Publishing

YouTube publishing is already built. The "Publish to YouTube" button appears on draft cards in the campaigns page. Shorts drafts get the same button, using the same `YouTubePublishModal` and `/api/youtube/upload` endpoint. The upload endpoint already detects Shorts-type platforms and appends `#Shorts` to the title. `containsSyntheticMedia: true` is already set.

---

## Removal of Shorts Factory

Files to delete:
- `src/pages/ShortsFactoryPage.jsx`
- `api/shorts/generate.js` (pipeline logic reused in campaigns/create)

Files to update:
- `App.jsx` — remove `/shorts` route
- `VideoAdvertCreator.jsx` — remove Shorts nav link
- `server.js` — remove `/api/shorts/generate` route, update research/preview-script/topics routes

API endpoint renames (done as part of this work):
- `api/shorts/research.js` → `api/campaigns/research.js`
- `api/shorts/preview-script.js` → `api/campaigns/preview-script.js`
- `api/shorts/topics.js` → `api/campaigns/topics.js`
- Update `server.js` route registrations to match new paths
- CampaignsNewPage Shorts mode calls the new paths

Keep all shared libs unchanged: `scriptGenerator.js`, `voiceoverGenerator.js`, `captionBurner.js`, `shortsTemplates.js`, `pipelineHelpers.js`

---

## Database Changes

One migration needed:

```sql
-- Add scene_inputs_json column to ad_drafts if not exists
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS scene_inputs_json jsonb;
```

The `scene_inputs_json` column stores per-scene generation data (image URLs, clip URLs, prompts used, LoRA configs) to support scene-level regeneration. This column is used by the existing `regenerate-scene.js` endpoint but was never formally migrated.

Existing fields already present on `ad_drafts`:
- `shorts_metadata_json` — full pipeline metadata
- `voiceover_url` — TTS audio
- `word_timestamps_json` — caption timing
- `captioned_video_url` — final video with captions
- `youtube_video_id` — publishing

Existing field on `campaigns`:
- `content_type` — already exists, must be explicitly set to `'shorts'` in the campaign insert (currently omitted by `create.js`, defaults to `'article'`)

---

## Summary of Independent User Choices

| Choice | What it controls | Required? |
|--------|-----------------|-----------|
| Niche Template | Narrative structure, scene roles, pacing | Yes |
| Topic | What the Short is about | Yes |
| Visual Style | Aesthetic + image strategy (pixel art, ghibli, comic, etc.) | Yes |
| Video Style | Animation feel (cinematic, UGC, anime, etc.) | Yes |
| Video Model | Which AI generates clips | Yes (default provided) |
| Voice | ElevenLabs narrator voice | Yes (default from template) |
| Caption Style | How captions appear | Yes (default: word_pop) |
| LoRA | Character consistency | No |
