# Stitch — Full Pipeline Rundown

> Everything from "Doubleclicker publishes an article" to "video ready to post".
> Read top to bottom the first time, then use the section headers to jump around.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [The Core Concept](#2-the-core-concept)
3. [Templates — What They Are](#3-templates--what-they-are)
4. [Template Builder — All the Knobs](#4-template-builder--all-the-knobs)
5. [Brand Kit & Avatars](#5-brand-kit--avatars)
6. [How Doubleclicker Triggers a Pipeline Run](#6-how-doubleclicker-triggers-a-pipeline-run)
7. [The Autonomous Pipeline — Step by Step](#7-the-autonomous-pipeline--step-by-step)
8. [AI Models Used at Each Step](#8-ai-models-used-at-each-step)
9. [Visual Style Presets — How They Lock the Look](#9-visual-style-presets--how-they-lock-the-look)
10. [Campaigns & Drafts — The Output Layer](#10-campaigns--drafts--the-output-layer)
11. [The Campaigns Viewer](#11-the-campaigns-viewer)
12. [Publish & Schedule](#12-publish--schedule)
13. [Data Structures Reference](#13-data-structures-reference)
14. [API Endpoint Reference](#14-api-endpoint-reference)
15. [Database Tables Reference](#15-database-tables-reference)
16. [Supabase Migrations — What to Run](#16-supabase-migrations--what-to-run)
17. [Environment Variables](#17-environment-variables)
18. [FAQ / Likely Questions](#18-faq--likely-questions)

---

## 1. Architecture Overview

```
Blog Cloner (Next.js, provisioning)
        │
        │  POST /api/strategy/auto-onboard
        │  { username, niche, productUrl, ... }
        ▼
Doubleclicker (content engine, Express + React)
        │
        │  Writes articles → if stitch_enabled=true,
        │  inserts row into stitch_queue table
        ▼
Shared Supabase (Postgres + Storage)
   uscmvlfleccbctuvhhcj.supabase.co
        │
        │  stitch_queue table polled every 15s
        ▼
Stitch API  (Express, port 3003)
        │
        ├─ Picks up queue entry → reads article content
        ├─ Looks up brand kit by brand_username
        ├─ Finds ALL templates tagged for that writing_structure
        ├─ Creates one Campaign record
        ├─ Fires every template in parallel (Promise.allSettled)
        │
        │  Each template:
        │    GPT-4o → Storyboard
        │    Wavespeed/FAL → Images (per scene, per ratio)
        │    Wavespeed/FAL → Videos (animate each image)
        │    Beatoven → Music
        │    → Saves Draft record to Supabase
        │
        ▼
Supabase Storage (videos + media buckets)
        │
        ▼
Stitch UI  (React 18 + Vite, port 4390)
   Campaigns page → preview / publish / schedule
```

**Three-app architecture — all apps share one Supabase database:**
- **Blog Cloner** → calls Doubleclicker via HTTP (PROVISION_SECRET auth)
- **Doubleclicker** → writes to `stitch_queue` table when `stitch_enabled=true`
- **Stitch** → polls `stitch_queue` every 15s, processes autonomously

**Authentication:**
- Stitch UI ↔ Stitch API: Supabase JWT (Bearer token), verified per-request
- Doubleclicker → Stitch: No direct HTTP calls — communication via shared `stitch_queue` table
- Stitch also supports direct `POST /api/article/from-url` with `x-webhook-secret` for manual triggers

---

## 2. The Core Concept

One article → one **Campaign** → N **Drafts** (one per matched template).

The idea is:
- You write templates once (your creative formats: UGC review, listicle reel, testimonial, etc.)
- You tag each template with the Doubleclicker writing structures it should fire for
- When Doubleclicker publishes, it calls Stitch once with the article URL + brand + structure
- Stitch automatically runs **every** template tagged for that structure, in parallel
- You open Campaigns → pick the drafts you like → publish or schedule

You never touch the generation step. It just runs.

---

## 3. Templates — What They Are

A template is a **reusable video format definition**. It tells the AI:
- How many scenes, what each scene's role is, how long each scene runs
- Which visual style is locked in (UGC, cinematic, etc.)
- Which AI models to use (image gen, video animation, music)
- Which platforms to generate assets for (TikTok, IG Reels, YouTube Shorts, etc.)
- Which Doubleclicker writing structures should auto-trigger it

Templates do **not** contain the actual content. Content comes from the article at runtime.
Templates define the *shape and style*. The AI fills in the *words and visuals*.

### Built-in Templates (locked, can't be edited)
Stitch ships with several starter templates that appear in the template list with a lock icon.
You can click one to load it as a starting point, then save it under a new name to customise it.

### User Templates
Created and owned per user. Editable, deletable. These are what the auto-pipeline uses.

---

## 4. Template Builder — All the Knobs

Found at `/templates` in the Stitch UI.

### Template Name & Description
Free text. The name appears in the campaign viewer so you know which format each draft used.

### Output Type
| Option | What it does |
|--------|-------------|
| Video Only | Generates animated video clips per scene |
| Static Only | Generates still images with the headline baked into the prompt |
| Both | One pipeline run produces both video clips AND still images |

### Visual Style Preset ← New
Locks the lighting, camera style, and color grade for **every image and video** this template generates.
See [Section 9](#9-visual-style-presets--how-they-lock-the-look) for the full list and how it works.

### Extract from Reference (AI Analysis)
Paste a video URL and/or describe the style in words.
The AI reverse-engineers:
- How many scenes, what role each plays, rough durations
- Which writing structures it's suitable for
- Which AI models it recommends
- A suggested name and description

You review the result, adjust anything, then save.

### Scenes
Each scene has:
| Field | Purpose |
|-------|---------|
| Role | `hook` / `problem` / `solution` / `proof` / `point` / `step` / `comparison` / `cta` — tells the AI what this scene is *for* |
| Duration | How many seconds this scene should be (1–30s) |
| Text Position | Where the headline overlay sits: `top_safe` / `center` / `bottom_safe` |
| Overlay Style | How the text looks: `bold_white` / `minimal_dark` / `gradient_overlay` |
| Scene Hint | Free text description guiding the AI — "show the product being unboxed", "close-up of the person's face reacting" |

Scenes can be reordered (drag the handle), added, or deleted.

### Music Mood & Voice Pacing
Free text strings that get passed to the music generation and inform the voiceover style in the storyboard prompt. Examples: `upbeat energetic`, `calm instructional`, `fast and punchy`.

### Model Preferences
| Setting | Options |
|---------|---------|
| Image Generation | Wavespeed (fastest), SeedDream (photorealistic), FLUX (creative/artistic) |
| Video Animation | Wavespeed WAN (fastest), Kling (most realistic), Hailuo/Minimax (cinematic) |
| Motion Style | Standard (AI animates the image freely), Motion Transfer (Kling mimics a reference video's movement) |
| Music | Beatoven AI (custom generated), None (no music) |

These preferences are stored per-template and used in the pipeline at generation time.

### Platforms
Pill toggles for 10 platforms. The pipeline generates a separate asset set for each aspect ratio implied by your selection:
- `9:16` — TikTok, IG Reels, IG Story, YouTube Shorts, FB Reels
- `1:1` — IG Feed, FB Feed, LinkedIn
- `16:9` — YouTube
- `2:3` — Pinterest

### Writing Structure Triggers
These determine when this template auto-fires. If a Doubleclicker article comes in tagged `BRAND-LISTICLE` and your template has `BRAND-LISTICLE` in its triggers, it runs.

Available triggers:

**Brand** (non-affiliate, brand-voice):
| Key | What it means |
|-----|--------------|
| `BRAND-TUTORIAL` | Step-by-step how-to for your own brand/product |
| `BRAND-LISTICLE` | List-format brand content (top 5 tips, etc.) |
| `BRAND-COMPARISON` | Your brand vs competitors |
| `BRAND-CASESTUDY` | Customer story or before/after |
| `BRAND-PILLAR` | Core topic pillar page |
| `BRAND-SUBHUB` | Supporting hub content |

**Affiliate** (with promoted products):
| Key | What it means |
|-----|--------------|
| `AFF-MULTI-COMPARE` | Affiliate product comparison (3+ products) |
| `AFF-LISTICLE` | Affiliate listicle round-up |
| `AFF-PILLAR` | Affiliate master pillar page |
| `AFF-SUBHUB` | Affiliate supporting hub content |
| `PRODUCT-PAGE` | Individual product/review page |

**Money** (high commercial intent):
| Key | What it means |
|-----|--------------|
| `MONEY-ROUNDUP` | Top-X best products roundup |
| `MONEY-SINGLE-REVIEW` | Detailed single product review |
| `MONEY-VS` | Product A vs Product B comparison |
| `MONEY-BEST-OF` | Best-in-category guide |

A template with **no triggers** only runs when called manually (by specifying `user_template_id` in the API call).

---

## 5. Brand Kit & Avatars

Found via the Brand Kit button in the Stitch UI header.

### Brand Kit Fields
| Field | Usage |
|-------|-------|
| Brand Name | Injected into every storyboard prompt |
| Brand Username | The unique identifier Doubleclicker uses in the webhook call (URL-safe, e.g. `myshop`) |
| Logo URL | Stored for reference — not yet auto-injected into image prompts |
| Colors | Comma-separated hex/color names — injected into storyboard and image prompts |
| Style Preset | Free text visual style description — injected into storyboard context |
| Voice Style | e.g. `professional and confident` — guides voiceover and headline tone |
| Taglines | Brand straplines — the AI can pull from these for CTAs |

### Brand Avatars
Avatars are custom AI personas tied to a brand — a specific person, character, or product mascot.

Each avatar has:
| Field | Purpose |
|-------|---------|
| Name | Display name |
| Description | Who this person/character is |
| Reference Image URL | A photo the image model can reference |
| LoRA URL | A trained LoRA model URL (for FAL) — makes the AI reliably recreate this person |
| LoRA Trigger Word | The word you prepend to prompts to activate the LoRA |

**LoRA status badges:**
- Green "LoRA Ready" = URL is set, this avatar will produce consistent results
- Yellow "No LoRA" = reference image only, less consistent

> LoRA training is a separate process (via `/api/lora/train`). You train on a set of photos and get back a LoRA URL. You then paste that URL into the avatar record.

---

## 6. How Doubleclicker Triggers a Pipeline Run

### Primary path: Queue-based (automatic)

Doubleclicker does **not** call Stitch directly. Instead:

1. When Doubleclicker finishes writing an article and `brand_guidelines.stitch_enabled = true`:
2. It inserts a row into the shared `stitch_queue` table:

```json
{
  "username": "myshop",
  "article_id": "abc-123-uuid",
  "writing_structure": "AFF-LISTICLE",
  "metadata": {
    "title": "Best Air Fryers 2026",
    "slug": "best-air-fryers-2026",
    "content_type": "listicle"
  },
  "status": "pending"
}
```

3. Stitch polls `stitch_queue` every **15 seconds** for `status = 'pending'` entries
4. When found, Stitch picks up the entry, marks it `processing`, reads the article content from `cluster_articles`, and runs the full pipeline
5. On completion, marks the queue entry `completed`

**Content type → Stitch writing structure mapping (set by Doubleclicker):**

| Doubleclicker content_type | Stitch writing_structure |
|---------------------------|-------------------------|
| brand_tutorial | `BRAND-TUTORIAL` |
| brand_listicle | `BRAND-LISTICLE` |
| brand_comparison | `BRAND-COMPARISON` |
| brand_casestudy | `BRAND-CASESTUDY` |
| brand_pillar | `BRAND-PILLAR` |
| brand_subhub | `BRAND-SUBHUB` |
| comparison | `AFF-MULTI-COMPARE` |
| listicle | `AFF-LISTICLE` |
| pillar | `AFF-PILLAR` |
| sub-hub | `AFF-SUBHUB` |
| product_page | `PRODUCT-PAGE` |
| money_roundup | `MONEY-ROUNDUP` |
| money_single_review | `MONEY-SINGLE-REVIEW` |
| money_vs | `MONEY-VS` |
| money_best_of | `MONEY-BEST-OF` |

### Secondary path: Direct HTTP (manual trigger)

For manual/testing use, you can still call Stitch directly:

```
POST https://stitch-app.fly.dev/api/article/from-url
Headers:
  x-webhook-secret: your_webhook_secret_here
  Content-Type: application/json

Body:
{
  "url": "https://yourblog.com/best-air-fryers-2026",
  "brand_username": "myshop",
  "writing_structure": "AFF-LISTICLE"
}
```

You can also pass `content` instead of `url` if you want to send the article markdown directly.

**Response (immediate — pipeline runs in background):**
```json
{
  "success": true,
  "jobId": "abc-123",
  "status": "processing",
  "poll_url": "/api/jobs/public-status?jobId=abc-123",
  "templates_matched": 3
}
```

Doubleclicker can poll `poll_url` to track progress. The job record updates `current_step` and `completed_steps` as the pipeline advances.

**Job steps:**
1. `scraping` — fetching and cleaning the article
2. `analysing_article` — GPT reads the article and extracts type, tone, topic
3. `creating_campaign` — Campaign record created in Supabase
4. Then one step per template — `generating_template_1`, etc.

---

## 7. The Autonomous Pipeline — Step by Step

This all happens server-side after the immediate 200 response is sent.

### Step 1 — Scrape Article
If a `url` is passed, Firecrawl fetches and converts to markdown.
If no Firecrawl key is configured, Stitch falls back to a plain HTML fetch + tag-strip.
If `content` is passed directly, this step is skipped.

### Step 2 — Analyse Article
GPT-4o-mini reads the article (first 5,000 chars) and returns structured metadata:
- Article type (listicle, how-to, comparison, testimonial, etc.)
- Tone (professional, energetic, casual, luxury, playful)
- Whether it has products / steps / comparisons / quotes
- Key topic, main benefit, target audience

This metadata is used to auto-match a built-in template if no user templates matched.

### Step 3 — Find Templates to Run
1. If `user_template_id` was passed → run that one specific template
2. If `writing_structure` was passed → query `user_templates` for all templates where `applicable_writing_structures` contains that value
3. If neither → auto-match one built-in template based on the article analysis

### Step 4 — Create Campaign
One `campaigns` record is created, shared across all template drafts from this run.
Fields: article title, brand username, writing structure, source URL, total draft count.

### Step 5 — Run Templates in Parallel (Promise.allSettled)
For each matched template, `runTemplateForArticle` runs concurrently.
`allSettled` means if one template fails, the others still complete.

**Per-template sub-steps:**

#### 5a — Generate Storyboard (GPT)
GPT-4o-mini receives:
- The article text (truncated to 5,000 chars)
- Brand guidelines (name, voice, colors, taglines)
- Template structure (N scenes, each with role, duration, hint)
- Visual Style Preset description (if one is set — tells the AI what style to write prompts for)

GPT returns a structured storyboard:
```json
{
  "campaign_name": "5 Best Air Fryers 2026",
  "hook_headline": "Stop wasting money on bad air fryers",
  "cta_text": "Link in bio →",
  "music_mood": "upbeat energetic",
  "scenes": [
    {
      "role": "hook",
      "headline": "Stop wasting money on bad air fryers",
      "voiceover": "You've probably bought an air fryer that didn't live up to the hype.",
      "visual_prompt": "frustrated person looking at a disappointing air fryer, kitchen background, warm lighting",
      "motion_prompt": "slow zoom into face",
      "overlay_style": "bold_white",
      "position": "center",
      "duration_seconds": 3
    },
    ...
  ]
}
```

#### 5b — Generate Images (per scene, per ratio)
For each scene, an image is generated at each aspect ratio needed by the template's platforms.
Images are batched 3 at a time to stay within rate limits.

Before the prompt hits the image API, the **Visual Style Preset suffix is appended** to the `visual_prompt`. For example, if the template uses the UGC preset:
```
"frustrated person looking at a disappointing air fryer, kitchen background, warm lighting, authentic UGC video style, shot on iPhone handheld camera, available natural light, slightly imperfect framing, real environment background, candid feel, warm natural colors, 35mm lens"
```

The image model is selected from the template's `model_preferences.image_model`.

#### 5c — Animate Images to Video (per scene, per ratio)
Each generated image is animated using the scene's `motion_prompt` (e.g. "slow zoom into face").
Video clips are batched 2 at a time (they take longer than images).
The video model is selected from `model_preferences.video_model`.

This step is skipped if `output_type === 'static'`.

#### 5d — Generate Music
Beatoven generates background music using the storyboard's `music_mood` string.
Duration = total scene duration + 5 seconds buffer.
Music generation is non-blocking — if it fails, the draft still saves successfully.

This step is skipped if `model_preferences.music_model === 'none'`.

#### 5e — Assemble & Save Draft
The pipeline assembles:
- `assets_json` — array of ratio groups, each with scenes containing `imageUrl` and `videoUrl`
- `static_assets_json` — flat list of images for static output (if applicable)
- `timelines_json` — Remotion-compatible timeline per platform (video track + text track + audio track)
- `captions_json` — array of {role, headline, voiceover, duration} per scene
- `music_url` — Supabase-stored audio file URL

The draft's `generation_status` is updated from `generating` → `ready`.
The campaign's `completed_drafts` counter is incremented (atomic RPC, race-condition safe).

### Step 6 — Finalise Campaign
After all templates complete:
- Campaign `status` → `ready` (if any succeeded) or `failed` (if all failed)
- Job `status` → `completed`
- Job `output_json` contains campaign_id, counts of successes/failures

---

## 8. AI Models Used at Each Step

| Step | Model | Provider | Configurable? |
|------|-------|----------|---------------|
| Article analysis | GPT-4o-mini | OpenAI | No (hardcoded) |
| Storyboard generation | GPT-4o-mini | OpenAI | No (hardcoded) |
| Image generation (default) | Imagen / Nano Banana | Wavespeed | Yes — per template |
| Image generation (alt 1) | SeedDream v4.5 | FAL.ai | Yes |
| Image generation (alt 2) | FLUX Dev | FAL.ai | Yes |
| Video animation (default) | WAN 2.2 | Wavespeed | Yes — per template |
| Video animation (alt 1) | Kling v2 Master | FAL.ai | Yes |
| Video animation (alt 2) | Minimax Video-01 | FAL.ai | Yes |
| Music | Custom generation | Beatoven / FAL.ai | Yes (or disable) |
| Template extraction | GPT-4o (vision) | OpenAI | No |

**Fallback logic:**
- Image gen: tries Wavespeed first, falls back to FAL SeedDream if no Wavespeed key
- Video gen: tries Wavespeed WAN first, falls back to FAL Kling if no Wavespeed key
- Music: non-fatal — failure is logged and skipped, draft still saves

**Polling:**
FAL.ai jobs use a queue pattern — POST returns a `request_id`, then Stitch polls the status endpoint every 2–4 seconds until `COMPLETED` or timeout (120 retries = ~4 minutes max).
Wavespeed jobs are similar but poll every 3 seconds with a 60-retry limit.

Generated files are uploaded to Supabase Storage (`videos` bucket for mp4/webm, `media` bucket for images/audio) so the URLs are permanent and don't expire.

---

## 9. Visual Style Presets — How They Lock the Look

Without a preset, the AI generates each scene's `visual_prompt` freely — and over a multi-scene storyboard, it will drift. Scene 1 might look cinematic, scene 3 might look like stock photography.

A Visual Style Preset solves this in two places:

### Place 1 — Storyboard Prompt (upstream)
The preset's lighting/camera/color/mood description is injected into the GPT system prompt as a **locked constraint**:
```
Visual Style Preset — "UGC" (LOCKED — every visual_prompt must match this style):
- Lighting: Natural window or outdoor available light
- Camera: Handheld close-up, 35mm f/1.8
- Color grade: Warm natural tones, no heavy grading
- Mood: Authentic, relatable, unpolished
Write visual_prompts that strictly follow this style. Do not deviate.
```

This makes GPT write `visual_prompt` values that already describe the correct style.

### Place 2 — Image Prompt Suffix (downstream, hard lock)
Even if GPT's visual_prompt drifts, the preset's `prompt_suffix` is **appended to every image prompt** before it hits the image generation API. This is the actual guarantee.

Example final prompt sent to image generation:
```
frustrated person looking at a disappointing air fryer, kitchen background, warm lighting, authentic UGC video style, shot on iPhone handheld camera, available natural light, slightly imperfect framing, real environment background, candid feel, warm natural colors, 35mm lens
```

### Available Presets

| Preset | Lighting | Camera | Color Grade | Mood |
|--------|----------|--------|-------------|------|
| **None** | AI decides | AI decides | AI decides | Unconstrained |
| **UGC** | Natural window / outdoor | Handheld, 35mm f/1.8 | Warm natural, no grading | Authentic, relatable |
| **Testimonial** | Soft box studio | Tripod, medium portrait | Clean, slightly warm | Trustworthy, direct |
| **Cinematic** | Dramatic / golden hour | Anamorphic wide | Teal shadows, warm highs, film grain | Epic, dramatic |
| **Product Demo** | Bright studio soft box | Overhead / 3/4 angle | Clean, accurate, high contrast | Professional, aspirational |
| **Lifestyle** | Golden hour / window | Wide to medium | Warm golden, slightly over | Aspirational, joyful |
| **Bold & Punchy** | High contrast / colorful | Dynamic close crops | Saturated, vivid | Energetic, bold |
| **Minimal** | Soft diffused even | Centered, negative space | Desaturated neutrals | Premium, calm |
| **Documentary** | Available natural light | Observational, candid | Desaturated muted, film-like | Authentic, serious |

> The preset is stored on the template. It applies to every draft that template produces.

---

## 10. Campaigns & Drafts — The Output Layer

### Campaign
One campaign = one article run. It groups all drafts together.

| Field | Description |
|-------|-------------|
| `name` | Article title |
| `article_title` | Same — displayed in the UI |
| `brand_username` | Which brand this ran for |
| `writing_structure` | Which Doubleclicker structure triggered it |
| `source_url` | The original article URL |
| `status` | `processing` → `ready` / `failed` / `published` / `partial` |
| `total_drafts` | How many templates ran |
| `completed_drafts` | How many finished successfully |

### Draft (ad_draft)
One draft = one template's complete output for this campaign.

| Field | Description |
|-------|-------------|
| `template_name` | Which template produced this draft |
| `output_type` | `video` / `static` / `both` |
| `generation_status` | `generating` → `ready` / `failed` |
| `publish_status` | `draft` → `published` / `scheduled` |
| `scheduled_for` | ISO datetime if scheduled |
| `platforms` | Which platforms this draft targets |
| `assets_json` | All video and image URLs, grouped by ratio |
| `static_assets_json` | Flat list of static images (if applicable) |
| `storyboard_json` | The full GPT storyboard (scenes, headlines, voiceovers) |
| `timelines_json` | Remotion-compatible timeline per platform |
| `captions_json` | Scene-by-scene captions for captioning tools |
| `music_url` | Background music file URL |

---

## 11. The Campaigns Viewer

Found at `/campaigns` in the Stitch UI.

**Campaign list view:**
- Cards showing campaign name, brand, writing structure, draft count (total / ready / published)
- Search filter
- Auto-refreshes every 8 seconds while any campaign is still processing

**Campaign detail view (click a card):**
- Campaign metadata: brand, structure, article link, creation date
- All drafts as expandable cards

**Draft card:**
- Template name, platform count, output type
- Status badges (Generating → Ready / Failed / Published / Scheduled)
- Expand to see: asset grid of all generated images/videos per ratio
- Click any asset to open full preview (video plays in modal, image shown full size, download link)
- Storyboard scenes list showing headlines and voiceovers
- Publish Now button (if Ready)
- Schedule button (if Ready)

---

## 12. Publish & Schedule

Both actions work per-draft, not per-campaign.

### Publish Now
Sets `publish_status = 'published'` on the draft.
Then checks: if all drafts in the campaign are published, sets campaign `status = 'published'`.
If only some are published, campaign `status = 'partial'`.

> Note: "publish" in Stitch currently means marking it as done / approved. Actual platform posting (posting to TikTok API, etc.) is a separate integration not yet built. The draft record, assets, and timeline JSON are the output you'd hand to a posting tool.

### Schedule
Sets `publish_status = 'scheduled'` and records the `scheduled_for` datetime.
Validation: must be a valid datetime in the future.
The scheduling UI is a datetime-local picker in the UI.

> Actual scheduled posting (a cron job or queue that posts at the scheduled time) is not yet built. The schedule is recorded for when that posting layer is added.

---

## 13. Data Structures Reference

### `assets_json` (stored on draft)
```json
[
  {
    "ratio": "9:16",
    "platforms": ["tiktok", "instagram_reels", "youtube_shorts"],
    "scenes": [
      {
        "scene": { "role": "hook", "headline": "...", "duration_seconds": 3, ... },
        "imageUrl": "https://supabase.../media/pipeline/images/123.jpg",
        "videoUrl": "https://supabase.../videos/pipeline/videos/456.mp4"
      },
      ...
    ]
  },
  {
    "ratio": "1:1",
    "platforms": ["instagram_feed"],
    "scenes": [ ... ]
  }
]
```

### `timelines_json` (Remotion-compatible, stored on draft)
```json
{
  "tiktok": {
    "ratio": "9:16",
    "totalFrames": 270,
    "items": [
      { "id": "video-9:16-0", "type": "video", "url": "...", "startAt": 0, "durationInFrames": 90, "trackIndex": 0 },
      { "id": "text-9:16-0", "type": "text", "content": "Stop wasting money", "style": "bold_white", "position": "center", "startAt": 0, "durationInFrames": 90, "trackIndex": 1 },
      { "id": "music-9:16", "type": "audio", "url": "...", "startAt": 0, "durationInFrames": 270, "trackIndex": 2 }
    ]
  }
}
```

### `captions_json`
```json
[
  { "index": 0, "role": "hook", "headline": "Stop wasting money on bad air fryers", "voiceover": "You've probably bought an air fryer that didn't live up to the hype.", "duration_seconds": 3 },
  { "index": 1, "role": "point", "headline": "The #1 rated pick for 2026", "voiceover": "The Ninja Foodi 10-in-1 tops every list this year.", "duration_seconds": 5 }
]
```

---

## 14. API Endpoint Reference

### Public / Webhook (no JWT — uses webhook secret or open)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/article/from-url` | Trigger autonomous pipeline (webhook secret) |
| `GET` | `/api/jobs/public-status?jobId=xxx` | Poll job progress (no auth, for Doubleclicker) |

### Authenticated (Supabase JWT required)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/brand/kit` | Fetch brand kit |
| `POST` | `/api/brand/kit` | Save brand kit |
| `GET` | `/api/brand/avatars` | List brand avatars |
| `POST` | `/api/brand/avatars` | Create avatar |
| `DELETE` | `/api/brand/avatars/:id` | Delete avatar |
| `GET` | `/api/templates/list` | List templates (built-in + user's) |
| `POST` | `/api/templates/analyze` | AI-extract template from description/video |
| `POST` | `/api/templates/save` | Create or update a template |
| `DELETE` | `/api/templates/:id` | Delete a user template |
| `GET` | `/api/campaigns/list` | List all campaigns with drafts |
| `GET` | `/api/campaigns/:id` | Single campaign detail |
| `POST` | `/api/campaigns/publish` | Publish or schedule a draft |
| `POST` | `/api/jumpstart/generate` | Manual one-off video generation (JumpStart tool) |
| `POST` | `/api/animate/generate` | Animate a single image |
| `POST` | `/api/audio/voiceover` | Generate voiceover for text |
| `POST` | `/api/audio/music` | Generate background music |
| `POST` | `/api/images/search` | Search stock images |
| `POST` | `/api/lora/train` | Start LoRA training job |
| `POST` | `/api/library/save` | Save asset to library |

---

## 15. Database Tables Reference

### `brand_kit`
Stores brand identity per user. One per user (upsert on save).
Key fields: `brand_name`, `brand_username`, `colors` (jsonb), `voice_style`, `style_preset`, `taglines` (jsonb), `logo_url`.

### `brand_avatars`
Custom AI personas tied to a brand. Many per user.
Key fields: `brand_username`, `name`, `description`, `reference_image_url`, `lora_url`, `lora_trigger_word`.

### `user_templates`
User-defined video templates.
Key fields: `name`, `scenes` (jsonb), `output_type`, `model_preferences` (jsonb), `applicable_writing_structures` (jsonb), `platforms` (jsonb), `visual_style_preset`, `avatar_id`.

### `campaigns`
One per article run. Groups all drafts.
Key fields: `article_title`, `brand_username`, `writing_structure`, `source_url`, `status`, `total_drafts`, `completed_drafts`.

### `ad_drafts`
One per template per campaign. Holds all generated assets.
Key fields: `campaign_id`, `template_id`, `template_name`, `output_type`, `generation_status`, `publish_status`, `scheduled_for`, `assets_json`, `static_assets_json`, `storyboard_json`, `timelines_json`, `captions_json`, `music_url`.

### `jobs`
Tracks pipeline run progress for polling.
Key fields: `type`, `status`, `current_step`, `total_steps`, `completed_steps`, `output_json`, `error`.

### `user_api_keys`
Per-user API key overrides. If set, takes precedence over server env vars.
Fields: `fal_key`, `wavespeed_key`, `openai_key`.

### `stitch_queue` (shared with Doubleclicker)
Queue table for DC → Stitch handoff. Stitch polls every 15s for `status = 'pending'`.
Key fields: `username`, `article_id`, `writing_structure`, `metadata` (jsonb), `status` (pending/processing/completed/failed), `created_at`, `processed_at`.

---

## 16. Supabase Migrations — What to Run

Run these in order in your Supabase SQL editor (or via the CLI):

| File | What it does |
|------|-------------|
| `supabase/migrations/20260222_add_aff_signal_structures.sql` | Adds signal structures |
| `supabase/migrations/20260222_add_content_signals.sql` | Adds content signals table |
| `supabase/migrations/20260222_add_signal_runs.sql` | Adds signal runs table |
| `supabase/migrations/20260222_add_content_signal_review_fields.sql` | Review fields |
| `supabase-migration-v6.sql` | Main v6: extends user_templates, brand_kit, ad_drafts, campaigns; creates brand_avatars; adds RPC `increment_campaign_completed_drafts` |
| `supabase/migrations/20260223_add_visual_style_preset.sql` | Adds `visual_style_preset` column to `user_templates` |

> **If you're setting up from scratch**, run v6 first, then the 20260223 migration.
> **If you're upgrading an existing DB**, just run the two newest ones.

---

## 17. Environment Variables

### Required
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### AI Generation (at least one image + one video provider needed)
```env
WAVESPEED_KEY=          # Wavespeed AI — image + video (fastest, cheapest)
FAL_KEY=                # FAL.ai — SeedDream, FLUX, Kling, Hailuo, Beatoven
```

### Optional
```env
FIRECRAWL_API_KEY=      # Better article scraping (falls back to raw HTML fetch if missing)
WEBHOOK_SECRET=         # If set, all calls to /api/article/from-url must include x-webhook-secret header
PORT=3003               # Express server port (default 3003)
```

---

## 18. FAQ / Likely Questions

**Q: What if no templates match a writing structure?**
The pipeline falls back to "auto-match" — it reads the article analysis (type, tone, has_product etc.) and picks the most appropriate built-in template. One draft is created. This is the fallback so the pipeline never produces zero output.

**Q: What if one template fails but others succeed?**
`Promise.allSettled` ensures partial success. Failed templates log an error, but the campaign and all successful drafts are still saved. The campaign status will be `ready` not `failed` as long as at least one draft succeeded.

**Q: Can I run one specific template from Doubleclicker instead of all matching ones?**
Yes — pass `user_template_id` in the body instead of (or alongside) `writing_structure`. If both are passed, `user_template_id` takes precedence and only that one template runs.

**Q: Does the pipeline block while generating?**
No. The response is sent immediately with a `jobId`. Generation happens fully in the background. Doubleclicker polls `/api/jobs/public-status?jobId=xxx` to track progress.

**Q: How long does a pipeline run take?**
Roughly:
- Article scrape + analysis: ~10–15s
- Storyboard: ~5–10s
- Images (3 scenes, 2 ratios, batched): ~30–90s depending on model
- Videos (3 scenes per ratio): ~3–8 mins (video animation is slow)
- Music: ~30–60s (parallel with above)
Total with video: typically **5–10 minutes per template**.
Static-only (no video animation): **1–2 minutes per template**.

**Q: How do I stop images from looking completely different between scenes?**
Use a **Visual Style Preset**. Without one, the AI has no constraints and each scene's visual style will vary. With a preset, the style suffix is appended to every image prompt, forcing consistent lighting and framing.

**Q: What is `timelines_json` for?**
It's a Remotion-compatible JSON describing the full edit timeline per platform. If/when you add a Remotion render step (server-side video compositor), this is ready to feed directly into it. For now it's stored on the draft for future use.

**Q: Where are the generated files stored?**
Uploaded to Supabase Storage:
- Images → `media` bucket, path `pipeline/images/`
- Videos → `videos` bucket, path `pipeline/videos/`
- Audio → `media` bucket, path `pipeline/audio/`

URLs are public and permanent — no expiry.

**Q: Can I use my own OpenAI / FAL / Wavespeed keys instead of the server ones?**
Yes. Set them in `user_api_keys` in Supabase (via the Studio or a settings page). If set, they take precedence over the server env vars. This lets different users or brands use their own API quotas.

**Q: The pipeline uses GPT for the storyboard — can I use a different model?**
Currently hardcoded to `gpt-5-mini` (fastest, cheapest, good enough for structured JSON). The model name can be changed in `api/article/from-url.js` if you want to experiment.

**Q: What's Motion Transfer?**
Motion Transfer uses Kling's motion control feature — instead of the AI freely deciding how to animate an image, it mimics the motion from a reference video. This is useful for consistent brand movements (e.g. always a slow left-to-right pan). The reference video URL needs to be set on the brand avatar or brand kit. Currently flagged as a warning in the template builder — full pipeline integration is pending.
