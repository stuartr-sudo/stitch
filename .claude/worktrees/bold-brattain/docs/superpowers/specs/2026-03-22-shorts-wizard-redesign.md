# Shorts Wizard Redesign — Design Spec

## Goal

Replace the flat Shorts creation form on `/campaigns/new` with a proper 6-step wizard that reuses existing UI components (StyleGrid, LoRAPicker, WizardStepper, PropsPillSelector, caption previews, voice grid). The backend pipeline (`shortsPipeline.js`, `campaigns/create.js`) is already built — this spec covers only the frontend wizard and the supporting additions needed to make it complete.

## Context

The initial implementation built the backend pipeline correctly but shipped a minimal flat form for the frontend. This redesign replaces that form with a wizard matching the Storyboard Planner's quality — full image thumbnails, real component reuse, and step-by-step flow.

---

## Wizard Steps

### Step 1: Brand & Niche

**Brand selector** — dropdown of user's brands. Inline "Edit Brand Kit" link opens `BrandKitModal`. Badges below show connection status:
- YouTube connected: green badge `YouTube ✓`
- Brand guidelines set: gray badge `Guidelines set`

**Niche template grid** — 12 cards in a 4-column grid. Each card shows: emoji icon, niche name, scene count. Selected card gets `border-[#2C666E]` ring. Cards use the keys from `SHORTS_NICHE_TYPES` in `api/lib/shortsTemplates.js`:

| Key | Display | Icon | Scenes |
|-----|---------|------|--------|
| `ai_tech_news` | AI/Tech News | 🤖 | 8 |
| `finance_money` | Finance & Crypto | 💰 | 7 |
| `motivation_self_help` | Motivation | 🧠 | 7 |
| `scary_horror` | Horror & Creepy | 💀 | 8 |
| `history_did_you_know` | History & Mysteries | 📜 | 7 |
| `true_crime` | True Crime | 🔍 | 8 |
| `science_nature` | Science & Nature | 🔬 | 7 |
| `relationships_dating` | Relationships | ❤️ | 7 |
| `health_fitness` | Health & Fitness | 💪 | 7 |
| `gaming_popculture` | Gaming & Pop Culture | 🎮 | 7 |
| `conspiracy_mystery` | Conspiracy | 👁️ | 7 |
| `business_entrepreneur` | Business & Startups | 💼 | 7 |

**Validation:** Brand and niche must be selected before Next.

---

### Step 2: Topic & Story

**Topic input** — text field with placeholder. "Research Stories" button next to it calls `POST /api/campaigns/research` and displays clickable story cards below. Selecting a story populates both the topic and `storyContext` fields.

**Starting image** (collapsible, optional) — drop zone for upload, URL paste, or library pick. When provided, the image URL is passed to the pipeline as `starting_image`. The pipeline uses it as Scene 1's input image (skipping image generation for scene 0) and calls `analyzeFrameContinuity()` from `pipelineHelpers.js` to describe it for subsequent scene prompts.

**Note:** `shortsPipeline.js` needs a minor addition: accept an optional `starting_image` param. If provided, use it as scene 0's image instead of generating one. This is a small change (~5 lines in the per-scene loop).

**Validation:** Topic must be non-empty before Next.

---

### Step 3: Script

After clicking Next from Step 2, the wizard calls `POST /api/campaigns/preview-script` to generate the script. Shows a loading state while generating.

**Full scene editor** — each scene displayed as an editable card showing:
- Scene number badge + role label (HOOK, CONTEXT, POINT, etc.) + duration
- Editable narration text (italic, in quotes)
- Editable visual prompt (shown as a pill/tag, click to expand)
- Editable motion prompt (shown as a pill/tag, click to expand)
- Three-dot menu: reorder, delete

**Scene controls:**
- "Add Scene" button — adds a blank scene
- "Regenerate Script" button — re-calls preview-script endpoint
- Scene builder pill helpers — a new lightweight pill component (similar pattern to `PropsPillSelector` but with scene-relevant visual prompt fragments instead of props/accessories). Categories: Environments (cityscape, forest, lab), Objects (screens, vehicles, equipment), Atmosphere (fog, rain, neon lights), Camera (close-up, wide shot, aerial). Clicking a pill appends the fragment to the currently expanded visual prompt field.

**Validation:** At least one scene with narration text before Next.

---

### Step 4: Look & Feel

**Visual Style** — reuses the existing `StyleGrid` component (`src/components/ui/StyleGrid.jsx`) with its 60+ styles and real FAL CDN thumbnail images. Categorized by: UGC & Social, Photography, Animation, Painting, Art Movements, Digital & Modern, Genre. This is the exact same component used in Storyboard Planner (shown in the user's screenshot).

The selected style key maps to `VISUAL_STYLES` in `api/lib/visualStyles.js` for the `image_strategy` (frame_chain vs fresh_per_scene) and prompt suffix. If the StyleGrid key doesn't exist in `VISUAL_STYLES`, fall back to `frame_chain` strategy and use the StyleGrid's `promptText` as the suffix.

**Image Model** — select dropdown showing all 7 models from `IMAGE_MODELS` (already defined in `TemplatesPage.jsx`). Each option shows: name, strength description, price, and LoRA support badge. When a model with `lora: true` is selected (currently only FLUX 2 Dev), the LoRA picker section becomes visible.

**LoRA Models** — reuses existing `LoRAPicker` component (`src/components/LoRAPicker.jsx`). Props: `value`, `onChange`, `brandUsername`. Shows category tabs (All, Product, Style, Effect, Custom), scale sliders per selected LoRA, library + custom brand LoRAs. Only visible when image model supports LoRA.

**Validation:** Visual style must be selected before Next.

---

### Step 5: Motion & Sound

**Video Style** — grid of 12 cards. Each card shows: thumbnail image, style name, short description of what it looks like. Cards grouped by category (Realistic, Professional, Artistic). Selected card gets `border-[#2C666E]` ring.

Thumbnail images for the 12 video styles need to be generated as static assets (same pattern as StyleGrid thumbnails). Store in Supabase storage or as CDN URLs. Each image should depict a scene that exemplifies the motion feel (e.g., the Cinematic card shows a dramatic anamorphic shot, the UGC card shows a handheld selfie-style frame).

**Video Model** — grid of model cards (not a dropdown). Each card shows: model name, strength/feature highlight, pricing (per-second or per-video). 10 models from `VIDEO_MODELS` (already defined in `TemplatesPage.jsx`). Selected card highlighted.

**Voice** — voice cards in a scrollable grid. Data fetched from ElevenLabs API to get the user's full voice library (presets + custom/cloned voices). Each card shows:
- Voice name and description
- Play/stop preview button (calls `POST /api/voice/preview`)
- "Recommended" badge if voice matches current niche (from `VOICE_PRESETS` niche assignments)

New API endpoint needed: `GET /api/voices/library` — replaces the existing `GET /api/styles/voices` (which only returned 6 presets). Calls ElevenLabs `GET /v1/voices` API with the user's key, returns combined list of preset + custom voices. The old `/api/styles/voices` endpoint can be removed.

**Caption Style** — grid of 8 cards with live visual preview swatches. Each card has a dark background with styled text showing how the caption looks. Caption style data structure includes `preview` object with `bg`, `style`, and optional `textStroke` for rendering the swatch.

All 8 caption styles:

| Key | Label | Preview Description |
|-----|-------|-------------------|
| `word_pop` | Word Pop | Bold white, heavy black outline |
| `karaoke_glow` | Karaoke Glow | Gold/yellow, warm shadow glow |
| `word_highlight` | Word Highlight | Subtle white, minimal outline |
| `neon_glow` | Neon Glow | Cyan/neon, bright glow effect |
| `typewriter` | Typewriter | Monospace, typed-in appearance |
| `bounce` | Bounce | White, bouncy entrance animation |
| `gradient_slide` | Gradient Slide | Gradient colored, slide-in motion |
| `outline_only` | Outline Only | Transparent fill, white stroke outline |

**Validation:** Video style and voice must be selected before Next.

---

### Step 6: Review & Generate

**Summary grid** — 2-column grid showing all selected options: Brand, Niche, Topic, Visual Style, Video Style, Image Model, Video Model, Voice, Captions, LoRA (if any), Starting Image (if any).

**Scene count** — "8 scenes · ~60 seconds · 9:16 vertical"

**Generate button** — "Generate Short". On click, calls `POST /api/campaigns/create` with `content_type: 'shorts'` and all selected options. The payload must include all fields:

```json
{
  "content_type": "shorts",
  "brand_username": "...",
  "niche": "ai_tech_news",
  "topic": "...",
  "story_context": "...",
  "visual_style": "comic_book",
  "video_style": "cinematic",
  "video_model": "fal_kling_v3",
  "image_model": "fal_flux",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "caption_style": "word_pop",
  "words_per_chunk": 3,
  "lora_config": [{"id": "...", "url": "...", "triggerWord": "...", "scale": 0.8}],
  "starting_image": "https://...",
  "script": { "scenes": [...] }
}
```

Shows loading state, then redirects to `/campaigns` on success.

**Estimated time** — "Estimated time: ~15-25 minutes" shown below button.

---

## New API Endpoint

### `GET /api/voices/library`

Fetches the user's full ElevenLabs voice library. Combines:
1. The 15 built-in `VOICE_PRESETS` from `shortsTemplates.js` (always shown)
2. All voices from ElevenLabs `GET /v1/voices` API using the user's stored key (from `api_keys` table) or the system fallback key

Returns array of voice objects:
```json
[
  { "id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "description": "Deep, authoritative", "source": "preset", "niches": ["ai_tech_news", ...] },
  { "id": "abc123", "name": "My Custom Clone", "description": "Professional", "source": "custom" }
]
```

Presets are shown first, custom voices in a separate "Your Voices" section.

---

## Video Style Thumbnail Generation

Generate 12 sample images (one per video style) to use as thumbnail cards. Use the existing image generation pipeline (FLUX or similar) with prompts that exemplify each style's motion feel:

| Style | Thumbnail Prompt |
|-------|-----------------|
| iPhone Selfie | Close-up selfie angle, natural room lighting, slight lens distortion, casual feel |
| UGC Testimonial | Person talking to camera, soft indoor lighting, authentic setting |
| TikTok/Reels | Energetic vertical frame, ring light, colorful background |
| FaceTime | Laptop webcam angle, screen glow on face, casual |
| Cinematic | Dramatic anamorphic shot, teal-orange grade, atmospheric haze |
| Documentary | Candid observational moment, available light, journalistic |
| Commercial | Polished studio shot, soft diffusion, aspirational |
| Product Demo | Clean product on neutral background, studio lighting |
| Dreamy | Soft diffusion glow, pastel colors, ethereal light |
| Vintage | Film grain, warm amber tones, vignette edges |
| Film Noir | High contrast chiaroscuro, dramatic shadows, monochrome |
| Anime | Vibrant anime style, cel-shaded, dynamic composition |

Generate at 1:1 aspect ratio, ~512px. Upload to Supabase storage bucket `media/video-style-thumbs/`. Store URLs in `videoStylePresets.js` as a `thumb` field per style.

---

## Components Reused

| Component | Source File | Used In Step |
|-----------|------------|-------------|
| `WizardStepper` | `src/components/ui/WizardStepper.jsx` | All steps (top nav) |
| `StyleGrid` | `src/components/ui/StyleGrid.jsx` | Step 4 (Visual Style) |
| `LoRAPicker` | `src/components/LoRAPicker.jsx` | Step 4 (LoRA selection) |
| Scene pills (new, same pattern as `PropsPillSelector`) | `src/lib/scenePills.js` | Step 3 (scene builder helpers) |
| `BrandKitModal` | `src/components/modals/BrandKitModal.jsx` | Step 1 (Edit Brand Kit link) |
| `YouTubePublishModal` | `src/components/modals/YouTubePublishModal.jsx` | Post-generation (campaign page) |

---

## What Changes vs Current Implementation

The current `CampaignsNewPage.jsx` has a flat form with an Ad/Short toggle. This redesign:

1. **Replaces** the flat Shorts form with a 6-step wizard using `WizardStepper`
2. **Replaces** plain text style buttons with `StyleGrid` (image thumbnails)
3. **Replaces** 6-voice list with full ElevenLabs library fetch (new endpoint)
4. **Adds** LoRAPicker integration (conditional on image model)
5. **Adds** image model selector with LoRA support badges
6. **Adds** video style cards with generated thumbnails and descriptions
7. **Adds** video model cards with pricing/features (not just a dropdown)
8. **Adds** caption style visual preview swatches
9. **Adds** script editor with scene cards and pill helpers
10. **Adds** starting image upload with GPT-4V analysis
11. **Adds** Brand Kit link with YouTube connection badge
12. **Adds** review summary step before generation

The Ad toggle and existing Ad form remain unchanged.

---

## File Changes

### New files:
- `api/voices/library.js` — ElevenLabs voice library endpoint
- `src/lib/scenePills.js` — Scene builder pill data (environments, objects, atmosphere, camera)
- 12 generated thumbnail images uploaded to Supabase storage

### Modified files:
- `src/pages/CampaignsNewPage.jsx` — Replace flat Shorts form with wizard
- `api/lib/videoStylePresets.js` — Add `thumb` URLs to each style
- `api/lib/shortsPipeline.js` — Add optional `starting_image` and `image_model` params (~10 lines)
- `api/campaigns/create.js` — Pass `starting_image` and `image_model` through to pipeline
- `server.js` — Register `/api/voices/library` route

### Shared constants:
`IMAGE_MODELS` and `VIDEO_MODELS` arrays are currently defined in `TemplatesPage.jsx`. Extract them into shared modules (`src/lib/modelPresets.js`) so both TemplatesPage and CampaignsNewPage can import them without duplication.

### No changes needed:
- `api/lib/visualStyles.js` — Already built
- Existing API endpoints (research, preview-script, topics) — Already moved to campaigns namespace
- `YouTubePublishModal` — Already works on campaign draft cards
