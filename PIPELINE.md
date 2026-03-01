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
7b. [The AI Director Pipeline — Template-Free Alternative](#7b-the-ai-director-pipeline--template-free-alternative)
8. [Studio Tools — The Creative Toolkit](#8-studio-tools--the-creative-toolkit)
9. [AI Models Used at Each Step](#9-ai-models-used-at-each-step)
10. [Visual Style Presets — How They Lock the Look](#10-visual-style-presets--how-they-lock-the-look)
11. [Campaigns & Drafts — The Output Layer](#11-campaigns--drafts--the-output-layer)
12. [The Campaigns Viewer](#12-the-campaigns-viewer)
13. [Publish & Schedule](#13-publish--schedule)
14. [Bulk Processing & Autonomous Config](#14-bulk-processing--autonomous-config)
15. [Cost Dashboard](#15-cost-dashboard)
16. [Data Structures Reference](#16-data-structures-reference)
17. [API Endpoint Reference](#17-api-endpoint-reference)
18. [Database Tables Reference](#18-database-tables-reference)
19. [Supabase Migrations — What to Run](#19-supabase-migrations--what-to-run)
20. [Environment Variables](#20-environment-variables)
21. [FAQ / Likely Questions](#21-faq--likely-questions)

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
        │    GPT-5-mini → Storyboard
        │    Wavespeed/FAL → Images (per scene, per ratio, + LoRA)
        │    Wavespeed/FAL → Videos (animate each image)
        │    Beatoven/MiniMax → Music
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
- Stitch also supports `POST /api/article/ai-director` — a template-free pipeline where the AI designs the entire storyboard from scratch

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

### Alternative: AI Director (template-free)
There's a second pipeline — the **AI Director** — that does the same job but without templates. Instead of forcing the article into a fixed scene structure, the AI reads the article and designs the entire storyboard from scratch: how many scenes, what narrative arc, what durations, what visual direction. See [Section 7b](#7b-the-ai-director-pipeline--template-free-alternative) for the full breakdown.

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
See [Section 10](#10-visual-style-presets--how-they-lock-the-look) for the full list and how it works.

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
| Image Generation | Wavespeed (fastest), SeedDream (photorealistic), FLUX 2 Dev (creative/artistic, LoRA support), Imagen 4, Kling Image V3, Grok Imagine, Ideogram V2 |
| Video Animation | Wavespeed WAN (fastest), Kling 2.0 Master, Kling V3 Pro, Kling O3 Pro, Hailuo/Minimax (cinematic), Veo 2, Veo 3 (best quality + audio), Wan 2.5, Wan Pro, PixVerse V4.5 |
| Motion Style | Standard (AI animates the image freely), Motion Transfer (Kling mimics a reference video's movement) |
| Music | Beatoven AI (custom generated), MiniMax Music, None (no music) |

These preferences are stored per-template and used in the pipeline at generation time.

### LoRA Configuration
Templates can optionally specify a set of LoRA models to apply during image (and video) generation. LoRAs provide style consistency, product accuracy, or character likeness across all generated scenes.

The LoRA picker in the Models tab shows both:
- **Pre-built library** — curated style/effect LoRAs (White Background, Film Noir, Multi-Angle Product, etc.)
- **Custom trained** — your brand's own trained LoRAs (products, characters)

Each LoRA has an independent **scale slider** (0.1–1.5) controlling its influence. Up to 4 LoRAs can be stacked simultaneously. Selecting any LoRA forces the FLUX 2 Dev image model.

**LoRA resolution chain** (in the autonomous pipeline):
1. Template's explicit `lora_config[]` — highest priority
2. Legacy `avatar_id` on the template — backward compat, single LoRA
3. Brand Kit's `default_loras` — brand-level fallback, applied when no template override exists

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
- Green "LoRA trained" = trained LoRA URL is set, this avatar will produce consistent results
- Blue "Training..." (animated spinner) = LoRA training is in progress
- Red "Training failed" = training failed, can retry
- Yellow "No LoRA yet" = reference image only, less consistent

**In-app LoRA training:** Click "Train LoRA" on any avatar card that has a reference image. This:
1. Auto-detects training type from the avatar description (product/character/style)
2. Creates a `brand_loras` record linked to the visual subject
3. Submits a training job to fal.ai (`fal-ai/flux-lora-fast-training`)
4. On completion, auto-updates the avatar with the LoRA URL and trigger word

Training parameters are configurable per type:
| Type | Rank | Steps | Learning Rate | Caption Style |
|------|------|-------|---------------|---------------|
| Product | 16 | 1000 | 0.0004 | "a photo of {trigger}" |
| Style | 32 | 1500 | 0.0002 | "an image in {trigger} style" |
| Character | 16 | 1200 | 0.0003 | "a portrait of {trigger}" |

### Default LoRAs
The Brand Kit's Visual tab has a "Default LoRAs" section where you can select LoRAs that apply to **all** image generation for this brand, unless a template explicitly overrides with its own `lora_config`. This is useful for brand-wide style consistency (e.g., always use the white background product LoRA).

### Pre-built LoRA Library
Stitch includes a curated library of pre-trained LoRAs from HuggingFace, available to all users:

| Name | Category | Use Case |
|------|----------|----------|
| White Background Product | Product | Clean e-commerce product shots |
| Multi-Angle Product | Product | Consistent product from multiple angles |
| Epic Realism | Realism | Photorealistic enhancement |
| Film Noir | Style | Black and white cinematic style |
| Oil Painting | Style | Classical oil painting aesthetic |
| Retro Pixel Art | Style | 8-bit retro pixel art |
| Modern Pixel Art | Style | Contemporary pixel art |
| Victorian Drawing | Style | Vintage illustration style |
| Seamless Texture | Composition | Tileable texture patterns |
| Outpaint | Composition | Extend image boundaries |
| Zoom Effect | Effect | Zoom transition effect |
| Virtual Try-On | Effect | Virtual clothing try-on |
| 2D Game Assets | Style | Game sprite/asset generation |

Access via `GET /api/lora/library` or through the LoRA picker in any UI that supports LoRA selection.

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

**LoRA stacking:** If any LoRAs are resolved (via the template → avatar → brand default chain), the pipeline:
1. Prepends all LoRA trigger words to the prompt (comma-separated)
2. Builds a `loras[]` array with per-item `{ path, scale }` for the fal.ai API
3. Forces the FLUX 2 Dev model (`fal-ai/flux-2/lora`) regardless of `image_model` preference
4. Skips Wavespeed for that generation (Wavespeed doesn't support LoRA injection)

#### 5c — Animate Images to Video (per scene, per ratio)
Each generated image is animated using the scene's `motion_prompt` (e.g. "slow zoom into face").
Video clips are batched 2 at a time (they take longer than images).
The video model is selected from `model_preferences.video_model`.

If LoRAs are configured and the video model is Wavespeed WAN, the LoRA configs are passed through with scale capped at 0.8 (lower than image generation to avoid video artifacts). Fal.ai video models (Kling, Hailuo, Veo, etc.) use image-to-video, so the LoRA effect is already baked into the seed image — no additional LoRA injection needed.

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

## 7b. The AI Director Pipeline — Template-Free Alternative

> **File:** `api/article/ai-director.js`
> **Endpoint:** `POST /api/article/ai-director`
> **Auth:** Webhook secret (`x-webhook-secret` header) **or** Supabase JWT (`Authorization: Bearer ...`)

The AI Director is a **parallel pipeline** that runs alongside the template-based pipeline. It does **not** replace or modify the existing pipeline — it's a completely separate entry point.

### Why it exists

Templates are great for repeatable formats, but they're rigid. If you have an article that doesn't fit a 5-scene listicle or a 4-scene product review, the template forces it into that shape anyway. The AI Director removes that constraint — the AI reads the article and decides the best structure.

### How it differs from the template pipeline

| | Template Pipeline (`from-url`) | AI Director (`ai-director`) |
|---|---|---|
| Scene count | Fixed by template (e.g. 5 scenes) | AI decides (3–8 scenes) |
| Scene roles | Fixed by template (hook → point → CTA) | AI designs the narrative arc |
| Durations | Fixed per scene | AI assigns per scene (2–8s each) |
| Visual direction | Style preset suffix only | AI writes a `creative_rationale` explaining its choices |
| Model selection | Template's `model_preferences` | AI suggests `image_model_hint` per scene, pipeline routes accordingly |
| Quality control | Template structure is the guardrail | Quality gate — AI self-reviews and regenerates if score < 7/10 |

### Input

```json
{
  "url": "https://example.com/article",
  "brand_username": "myshop",
  "platforms": ["tiktok", "instagram_reels"],
  "output_type": "video",
  "style_preset": "cinematic",
  "duration_target": 30,
  "lora_config": []
}
```

All fields except `brand_username` are optional. Defaults: all platforms, video output, no style preset, 30s duration.

You can pass `content` (raw markdown) instead of `url`.

### The pipeline — step by step

**Step 1 — Scrape & Analyse**
Same as the template pipeline. Firecrawl (or fallback fetch) gets the article, then GPT analyses it for type, tone, and key themes.

**Step 2 — Dynamic Storyboard (the key difference)**
Instead of slotting content into a fixed template, GPT receives:
- The full article text
- Brand guidelines (name, voice, colors, taglines)
- Duration target and platform list
- Style preset (if any)

And is told: *"You are a creative director. Design a video storyboard from scratch."*

GPT returns a full storyboard with a `creative_rationale` explaining its structural choices:

```json
{
  "creative_rationale": "Opening with a visceral problem scene to hook viewers emotionally, then rapid-fire proof points to build credibility, closing with an aspirational outcome rather than a hard sell — matches the article's educational tone.",
  "campaign_name": "Why Your Air Fryer Is Lying to You",
  "scenes": [
    {
      "role": "hook",
      "headline": "Your air fryer is ruining your food",
      "visual_prompt": "close-up of burnt, dried-out chicken in a cheap air fryer...",
      "motion_prompt": "slow zoom into the disappointing food",
      "duration_seconds": 3,
      "image_model_hint": "seeddream"
    },
    ...
  ]
}
```

**Step 3 — Quality Gate**
GPT reviews its own storyboard and scores it on 5 criteria (hook strength, narrative flow, visual variety, brand alignment, CTA effectiveness). If the average score is below 7/10, it regenerates once with feedback on what to improve. This compensates for the lack of template guardrails.

**Step 4 — Create Campaign & Draft**
Same as the template pipeline — one campaign record, one draft record. The draft is tagged with `template_name: 'AI Director'` so you can identify it in the Campaigns viewer.

**Step 5 — Generate Assets**
Same asset generation as the template pipeline — images per scene per ratio, then video animation, then music. Uses all the same helper functions (`generateImage`, `animateImage`, `generateMusic`, etc.). Frame-to-frame continuity analysis is included (extracts last frame of each clip, analyses it with GPT-4o vision, feeds context to the next scene).

**Step 6 — Concat & Finalise**
Video clips are concatenated per ratio using `concatVideos`. The draft and campaign records are updated to `ready`.

### Triggering it

**Direct HTTP call (webhook secret):**
```bash
curl -X POST https://stitch-app.fly.dev/api/article/ai-director \
  -H "x-webhook-secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourblog.com/article", "brand_username": "myshop"}'
```

**Direct HTTP call (JWT auth from studio UI):**
```bash
curl -X POST https://stitch-app.fly.dev/api/article/ai-director \
  -H "Authorization: Bearer USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourblog.com/article", "brand_username": "myshop"}'
```

**Response (immediate — runs in background):**
```json
{
  "success": true,
  "jobId": "abc-123",
  "pipeline": "ai_director",
  "poll_url": "/api/jobs/public-status?jobId=abc-123"
}
```

> **Note:** The AI Director is not yet wired into the `stitch_queue` poller. Queue items from Doubleclicker still route to the template pipeline. To use the AI Director, call the endpoint directly.

---

## 8. Studio Tools — The Creative Toolkit

Beyond the autonomous pipeline, Stitch has a suite of interactive creative tools accessible from the main UI. Each tool is a modal in the Video Advert Creator page (`/`).

### JumpStart — One-Off Video Generation
The primary manual video creation tool. Enter a text prompt, pick an image or video model, set resolution and duration, and generate a single video clip.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/jumpstart/generate` | Start generation (returns request ID) |
| `POST /api/jumpstart/result` | Poll generation status |
| `POST /api/jumpstart/save-video` | Download video to Supabase storage (avoids CORS) |
| `POST /api/jumpstart/edit` | Edit an existing video via text prompt (Wavespeed WAN 2.2 / Grok) |
| `POST /api/jumpstart/extend` | Extend/elongate a video clip (Seedance, Veo 3.1, etc.) |

### Imagineer — AI Image Generation & Editing
Text-to-image generation with multi-model support. Also has an Edit tab for modifying existing images with LoRA-enhanced inpainting.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/imagineer/generate` | Generate image from text prompt |
| `POST /api/imagineer/edit` | Edit existing image with FLUX 2 Dev + optional LoRAs |
| `POST /api/imagineer/result` | Poll generation/edit status |

### Animate — Image-to-Video
Takes a still image and animates it using WAN v2.2-14b. Supports move and replace modes.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/animate/generate` | Start animation (returns request ID) |
| `POST /api/animate/result` | Poll animation status |

### Trip — Video Restyling
Text-guided video restyling using Decart's Lucy-Restyle model via Wavespeed. Takes an existing video and applies a new visual style based on a text prompt.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/trip/restyle` | Restyle a video with a text prompt |

### Lens — Perspective Adjustment
Adjusts image angle and perspective via FAL.ai. Control horizontal angle, vertical angle, and zoom level.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/lens/generate` | Adjust image perspective |

### Smoosh — Canvas Composition
Canvas-based image composition with AI enhancement via Google Nano-Banana Pro. Combine images and enhance the result.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/smoosh/generate` | Compose and enhance canvas image |

### TryStyle — Virtual Try-On
Virtual clothing try-on using FASHN AI or FLUX 2 LoRA models. Upload a model image and a garment image; the AI composites the clothing onto the person.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/trystyle/generate` | Start virtual try-on (async) |
| `POST /api/trystyle/result` | Poll try-on status |

### Image Utilities
General-purpose image processing tools used across the UI.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/images/search` | Search stock images |
| `POST /api/images/import-url` | Download image from URL to Supabase storage |
| `POST /api/images/edit` | Multi-model AI image editing with aspect ratio normalization |
| `POST /api/images/inpaint` | AI object removal/replacement with mask |

### Audio Studio
Audio generation and processing tools.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/audio/voiceover` | Generate voiceover from text |
| `POST /api/audio/music` | Generate background music |
| `POST /api/audio/generate` | Text-to-speech (ElevenLabs), music generation (Suno, Stable Audio), foley sounds |
| `POST /api/audio/captions` | Speech-to-text transcription (Whisper via FAL.ai) with word-level timing |
| `GET /api/audio/result` | Poll audio generation status |

### Brand Utilities
Tools for managing brand assets and extracting brand guidelines.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/brand/extract-pdf` | Extract brand guidelines from PDF using GPT (returns auto-filled brand kit fields) |
| `POST /api/brand/remove-bg` | Background removal using Bria (FAL.ai) |
| `GET /api/brand/usernames` | List available brand usernames (role-based access from shared DB) |
| `GET /api/brand/guidelines` | Fetch brand guidelines + image style preferences from Doubleclicker tables |

### Canvas Editor
A drag-and-drop canvas for composing images, text, and shapes. Built with Konva.js. Primarily used for assembling ad creatives manually. The canvas output can be enhanced via the Smoosh endpoint.

### Library
Save any generated asset (image, video, audio) to a personal library for later reuse.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/library/save` | Save asset to library |

---

## 9. AI Models Used at Each Step

| Step | Model | Provider | Configurable? | Price |
|------|-------|----------|---------------|-------|
| Article analysis | GPT-5-mini | OpenAI | No (hardcoded) | ~$0.001 |
| Storyboard generation | GPT-5-mini | OpenAI | No (hardcoded) | ~$0.002 |
| Image generation (default) | Nano Banana Pro | Wavespeed | Yes — per template | ~$0.01/img |
| Image generation (alt 1) | SeedDream v4.5 | FAL.ai | Yes | ~$0.02/img |
| Image generation (alt 2) | FLUX 2 Dev (LoRA) | FAL.ai | Yes | $0.035/img |
| Image generation (alt 3) | Imagen 4 | FAL.ai (Google) | Yes | $0.04/img |
| Image generation (alt 4) | Kling Image V3 | FAL.ai | Yes | $0.028/img |
| Image generation (alt 5) | Grok Imagine | FAL.ai | Yes | $0.02/img |
| Image generation (alt 6) | Ideogram V2 | FAL.ai | Yes | ~$0.04/img |
| Image editing | FLUX 2 Dev Edit (LoRA) | FAL.ai | Yes | $0.035/img |
| Video animation (default) | WAN 2.2 Spicy | Wavespeed | Yes — per template | ~$0.10/vid |
| Video animation (alt 1) | Kling 2.0 Master | FAL.ai | Yes | $0.28/sec |
| Video animation (alt 2) | Kling V3 Pro | FAL.ai | Yes | ~$0.30/sec |
| Video animation (alt 3) | Kling O3 Pro | FAL.ai | Yes | ~$0.30/sec |
| Video animation (alt 4) | Hailuo/Minimax | FAL.ai | Yes | $0.50/vid |
| Video animation (alt 5) | Veo 3 (Google) | FAL.ai | Yes | $0.15/sec |
| Video animation (alt 6) | Veo 2 (Google) | FAL.ai | Yes | $0.50/sec |
| Video animation (alt 7) | Wan 2.5 Preview | FAL.ai | Yes | ~$0.15/vid |
| Video animation (alt 8) | Wan Pro | FAL.ai | Yes | ~$0.20/vid |
| Video animation (alt 9) | PixVerse V4.5 | FAL.ai | Yes | ~$0.15/vid |
| Music | Custom generation | Beatoven / MiniMax | Yes (or disable) | ~$0.05/track |
| LoRA training | FLUX LoRA Fast Training | FAL.ai | Yes | $0.50/training |
| Template extraction | GPT-4o (vision) | OpenAI | No | ~$0.01 |

**Fallback logic:**
- Image gen: tries Wavespeed first, falls back to FAL SeedDream if no Wavespeed key. If LoRAs are configured, forces FLUX 2 Dev (only model supporting LoRA injection)
- Video gen: tries Wavespeed WAN first, falls back to FAL Kling if no Wavespeed key
- Music: non-fatal — failure is logged and skipped, draft still saves

**Polling:**
FAL.ai jobs use a queue pattern — POST returns a `request_id`, then Stitch polls the status endpoint every 2–4 seconds until `COMPLETED` or timeout (120 retries = ~4 minutes max).
Wavespeed jobs are similar but poll every 3 seconds with a 60-retry limit.

Generated files are uploaded to Supabase Storage (`videos` bucket for mp4/webm, `media` bucket for images/audio) so the URLs are permanent and don't expire.

---

## 10. Visual Style Presets — How They Lock the Look

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

## 11. Campaigns & Drafts — The Output Layer

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

## 12. The Campaigns Viewer

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

## 13. Publish & Schedule

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

### Scheduled Publisher (Background Service)
A background poller (`lib/scheduledPublisher.js`) runs every 30 seconds. It checks `ad_drafts` for any draft where `publish_status = 'scheduled'` and `scheduled_for <= now()`. When found, it auto-updates the draft to `published` and syncs the parent campaign status.

This means scheduled publishing **does work** — drafts will automatically flip to published at the scheduled time. What doesn't exist yet is posting the actual video to external platforms (TikTok, Instagram, etc.).

---

## 14. Bulk Processing & Autonomous Config

### Bulk Article Processing
Process up to 20 article URLs in a single request. Each URL gets queued as a separate pipeline run, grouped under a `job_batches` record.

```
POST /api/article/bulk
Headers: x-webhook-secret
Body: { "urls": [...], "brand_username": "myshop", "writing_structure": "AFF-LISTICLE" }
```

Returns a `batchId` immediately. Poll progress via `GET /api/jobs/batch-status?batchId=xxx`.

### Autonomous Pipeline
An enhanced version of `from-url` that auto-generates and can auto-schedule based on brand-level autonomous config. Supports single URL, multiple URLs, or raw content.

```
POST /api/article/autonomous
Headers: x-webhook-secret
Body: { "url": "...", "brand_username": "myshop" }
```

### Autonomous Config
Per-brand configuration that controls autonomous behavior (auto-publish, scheduling preferences, etc.). Stored in `autonomous_configs` table.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/autonomous/config?brand_username=xxx` | Fetch config for a brand (JWT auth) |
| `POST /api/autonomous/config` | Save/update config for a brand (JWT auth) |

The config is accessible from the UI via the Autonomous Config modal (gear icon).

### Job Management
Jobs can be paused, resumed, and retried from the UI or API.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/jobs/status` | Get job details (JWT auth) |
| `POST /api/jobs/pause` | Pause a running job (JWT auth) |
| `POST /api/jobs/resume` | Resume a paused job (JWT auth) |
| `POST /api/jobs/retry` | Retry a failed job from a specific step (JWT auth) |
| `GET /api/jobs/public-status?jobId=xxx` | Poll job progress (no auth) |
| `GET /api/jobs/batch-status?batchId=xxx` | Poll batch progress (no auth) |

---

## 15. Cost Dashboard

Found at `/costs` in the Stitch UI.

Every AI generation call (image, video, music, LoRA training) is logged to the `cost_ledger` table with the model used and estimated cost. The cost dashboard aggregates this data.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/costs/summary?range=7d` | Cost breakdown by model, day, and category |

Supported ranges: `7d`, `30d`, `90d`.

The dashboard shows:
- Total spend over the selected period
- Breakdown by model (which models cost the most)
- Breakdown by day (spending trend)
- Breakdown by category (image vs video vs audio vs training)

---

## 16. Data Structures Reference

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

## 17. API Endpoint Reference

### Public / Webhook (no JWT — uses webhook secret or open)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/article/from-url` | Trigger template pipeline (webhook secret) |
| `POST` | `/api/article/ai-director` | Trigger AI Director pipeline — template-free (webhook secret or JWT) |
| `POST` | `/api/article/autonomous` | Autonomous pipeline with auto-scheduling (webhook secret) |
| `POST` | `/api/article/bulk` | Batch process multiple article URLs (webhook secret) |
| `POST` | `/api/webhooks/content` | Blog-to-ad webhook (webhook secret) |
| `GET` | `/api/jobs/public-status?jobId=xxx` | Poll job progress (no auth) |
| `GET` | `/api/jobs/batch-status?batchId=xxx` | Poll batch progress (no auth) |

### Authenticated (Supabase JWT required)

**Brand Management**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/brand/kit` | Fetch brand kit |
| `POST` | `/api/brand/kit` | Save/update brand kit |
| `DELETE` | `/api/brand/kit` | Delete brand kit |
| `GET` | `/api/brand/avatars` | List brand avatars / visual subjects |
| `POST` | `/api/brand/avatars` | Create avatar |
| `DELETE` | `/api/brand/avatars/:id` | Delete avatar |
| `POST` | `/api/brand/avatars/:id/train` | Train LoRA from a visual subject's reference images |
| `POST` | `/api/brand/extract-pdf` | Extract brand guidelines from PDF via GPT |
| `POST` | `/api/brand/remove-bg` | Background removal (Bria via FAL.ai) |
| `GET` | `/api/brand/usernames` | List available brand usernames (role-based) |
| `GET` | `/api/brand/guidelines` | Fetch brand guidelines from Doubleclicker tables |

**Templates**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/templates/list` | List templates (built-in + user's) |
| `POST` | `/api/templates/analyze` | AI-extract template from description/video |
| `POST` | `/api/templates/save` | Create or update a template |
| `POST` | `/api/templates/assign` | Assign template to multiple brands |
| `DELETE` | `/api/templates/:id` | Delete a user template |

**Campaigns**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/campaigns/list` | List all campaigns with drafts |
| `GET` | `/api/campaigns/:id` | Single campaign detail with full draft assets |
| `POST` | `/api/campaigns/create` | Create campaign manually with custom storyboard |
| `POST` | `/api/campaigns/publish` | Publish or schedule a draft |

**JumpStart (Video Generation)**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jumpstart/generate` | Generate video from text prompt |
| `POST` | `/api/jumpstart/result` | Poll generation status |
| `POST` | `/api/jumpstart/save-video` | Save video to Supabase storage |
| `POST` | `/api/jumpstart/edit` | Edit existing video via text prompt |
| `POST` | `/api/jumpstart/extend` | Extend/elongate a video clip |

**Imagineer (Image Generation & Editing)**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/imagineer/generate` | Generate image from text prompt |
| `POST` | `/api/imagineer/edit` | Edit image with FLUX 2 Dev + optional LoRAs |
| `POST` | `/api/imagineer/result` | Poll generation/edit status |

**Animate (Image-to-Video)**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/animate/generate` | Animate a still image (WAN v2.2) |
| `POST` | `/api/animate/result` | Poll animation status |

**Trip / Lens / Smoosh / TryStyle**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/trip/restyle` | Text-guided video restyling (Lucy-Restyle) |
| `POST` | `/api/lens/generate` | Adjust image perspective/angle |
| `POST` | `/api/smoosh/generate` | Canvas composition with AI enhancement |
| `POST` | `/api/trystyle/generate` | Virtual clothing try-on (FASHN AI / FLUX 2) |
| `POST` | `/api/trystyle/result` | Poll try-on status |

**Image Utilities**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/images/search` | Search stock images |
| `POST` | `/api/images/import-url` | Import image from URL to Supabase storage |
| `POST` | `/api/images/edit` | Multi-model AI image editing |
| `POST` | `/api/images/inpaint` | AI object removal/replacement with mask |

**Audio**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/audio/voiceover` | Generate voiceover from text |
| `POST` | `/api/audio/music` | Generate background music |
| `POST` | `/api/audio/generate` | TTS (ElevenLabs), music (Suno/Stable Audio), foley |
| `POST` | `/api/audio/captions` | Speech-to-text (Whisper) with word-level timing |
| `GET` | `/api/audio/result` | Poll audio generation status |

**LoRA**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/lora/train` | Start LoRA training job |
| `POST` | `/api/lora/result` | Check training result (auto-updates visual subjects) |
| `GET` | `/api/lora/library` | List pre-built LoRA library (grouped by category) |

**Jobs & Costs**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs/status` | Get job details |
| `POST` | `/api/jobs/pause` | Pause a running job |
| `POST` | `/api/jobs/resume` | Resume a paused job |
| `POST` | `/api/jobs/retry` | Retry a failed job from a specific step |
| `GET` | `/api/costs/summary?range=7d` | Cost breakdown by model/day/category |

**Autonomous Config**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/autonomous/config?brand_username=xxx` | Fetch autonomous config for a brand |
| `POST` | `/api/autonomous/config` | Save/update autonomous config |

**Library**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/library/save` | Save asset to personal library |

---

## 18. Database Tables Reference

### `brand_kit`
Stores brand identity per user. One per user (upsert on save).
Key fields: `brand_name`, `brand_username`, `colors` (jsonb), `voice_style`, `style_preset`, `taglines` (jsonb), `logo_url`, `default_loras` (jsonb — array of LoRA configs applied to all generation unless template overrides).

### `brand_avatars` / `visual_subjects`
Custom AI personas tied to a brand. Many per user.
Key fields: `brand_username`, `name`, `description`, `reference_image_url`, `lora_url`, `lora_trigger_word`, `brand_lora_id` (links to `brand_loras`), `training_status` (`none`/`training`/`ready`/`failed`).

### `brand_loras`
Trained LoRA models. Many per user.
Key fields: `name`, `trigger_word`, `fal_model_url`, `status` (`training`/`ready`/`failed`), `training_type` (`product`/`style`/`character`), `rank`, `steps`, `learning_rate`, `brand_username`, `visual_subject_id` (links to `visual_subjects`), `lora_type` (`custom`/`prebuilt`).

### `lora_library`
Pre-built curated LoRA models (shared, public). Seeded via `api/lora/seed-library.js`.
Key fields: `name`, `slug` (unique), `description`, `category` (`style`/`product`/`effect`/`realism`/`composition`), `hf_repo_id` (HuggingFace repo), `preview_url`, `default_scale`, `recommended_trigger_word`, `compatible_models` (jsonb), `is_featured`, `sort_order`.

### `user_templates`
User-defined video templates.
Key fields: `name`, `scenes` (jsonb), `output_type`, `model_preferences` (jsonb), `applicable_writing_structures` (jsonb), `platforms` (jsonb), `visual_style_preset`, `avatar_id`, `lora_config` (jsonb — array of `{ lora_id, scale, source }` for multi-LoRA stacking).

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

### `cost_ledger`
Logs every AI generation call with estimated cost.
Key fields: `user_id`, `model` (e.g. `wavespeed-wan-2.2`, `fal-seeddream`), `category` (`image`/`video`/`audio`/`training`), `cost` (decimal), `job_id`, `created_at`.

### `job_batches`
Groups multiple pipeline jobs from a bulk request.
Key fields: `id`, `brand_username`, `total_jobs`, `completed_jobs`, `failed_jobs`, `status` (pending/processing/completed/failed), `created_at`.

### `autonomous_configs`
Per-brand autonomous pipeline configuration.
Key fields: `user_id`, `brand_username`, settings for auto-publish, scheduling preferences, model overrides, etc. Unique constraint on `(user_id, brand_username)`.

### `stitch_queue` (shared with Doubleclicker)
Queue table for DC → Stitch handoff. Stitch polls every 15s for `status = 'pending'`.
Key fields: `username`, `brand_username`, `article_id`, `article_title`, `article_content`, `writing_structure`, `payload` (jsonb), `status` (pending/processing/completed/failed), `created_at`, `picked_up_at`, `completed_at`, `error`.

---

## 19. Supabase Migrations — What to Run

Run these in order in your Supabase SQL editor (or via the CLI):

| File | What it does |
|------|-------------|
| `supabase/migrations/20250101000000_stitch_initial_schema.sql` | Initial schema: all core tables (brand_kit, user_templates, campaigns, ad_drafts, jobs, cost_ledger, etc.) |
| `supabase/migrations/20260223_add_brand_username_to_templates.sql` | Adds `brand_username` column to `user_templates` |
| `supabase/migrations/20260223_add_final_videos_to_drafts.sql` | Adds `final_videos` column to `ad_drafts` for concatenated output |
| `supabase/migrations/20260223_add_stitch_queue.sql` | Creates `stitch_queue` table for Doubleclicker handoff |
| `supabase/migrations/20260223_add_visual_style_preset.sql` | Adds `visual_style_preset` column to `user_templates` |
| `supabase/migrations/20260223_rename_brand_avatars_to_visual_subjects.sql` | Renames `brand_avatars` table to `visual_subjects` |
| `supabase/migrations/20260224_add_brand_usernames_jsonb.sql` | Adds `assigned_usernames` JSONB column to `user_profiles` |
| `supabase/migrations/20260228_lora_enhancements.sql` | LoRA system: training config on `brand_loras`, training status on `visual_subjects`, `default_loras` on `brand_kit`, `lora_config` on `user_templates`, creates `lora_library` table |

> **If you're setting up from scratch**, run the initial schema first, then the dated migrations in order.
> **If you're upgrading an existing DB**, run any migrations newer than your last applied one.

---

## 20. Environment Variables

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
WEBHOOK_SECRET=         # If set, webhook endpoints require x-webhook-secret header
ELEVENLABS_API_KEY=     # ElevenLabs TTS for voiceover generation
QUEUE_POLL_MS=15000     # Queue poll interval in ms (default 15000)
PORT=3003               # Express server port (default 3003)
```

---

## 21. FAQ / Likely Questions

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

**Q: How does LoRA stacking work?**
You can select up to 4 LoRAs simultaneously (mix of custom-trained and pre-built library). Each has an independent scale slider. All trigger words are prepended to the image prompt, and the `loras[]` array is sent to `fal-ai/flux-2/lora`. The FLUX 2 model handles blending them. Common combos: product LoRA + white background LoRA, character LoRA + style LoRA.

**Q: What happens if I set LoRAs but choose a non-FLUX image model?**
The pipeline auto-overrides to FLUX 2 Dev whenever LoRAs are present. Wavespeed and other models don't support LoRA injection, so FLUX is the only option. This is transparent — you'll see FLUX-quality images with your LoRA applied.

**Q: How do brand default LoRAs interact with template LoRAs?**
Template `lora_config` takes full priority. If the template has its own LoRA config (even an empty array), brand defaults are not applied. If the template has no `lora_config` and no legacy `avatar_id`, the brand's `default_loras` are used as a fallback.

**Q: Can I train a LoRA from the UI?**
Yes. In the Brand Kit → Avatars tab, any avatar with a reference image shows a "Train LoRA" button. Click it, enter a trigger word, and the training job is submitted to fal.ai. Training takes ~5–10 minutes. The avatar card shows a spinner during training and auto-updates to "LoRA trained" on completion.

**Q: What's the AI Director and when should I use it?**
The AI Director (`POST /api/article/ai-director`) is a template-free pipeline. Use it when you don't have a matching template, want to experiment with creative structures, or want the AI to have full control over the storyboard design. The template pipeline is better when you want predictable, repeatable formats. Both produce the same output (campaigns, drafts, assets) and appear in the same Campaigns viewer.

**Q: Can I run AI Director and templates on the same article?**
Yes. They're completely independent pipelines. Call `/api/article/from-url` for the template version and `/api/article/ai-director` for the AI Director version. They'll create separate campaigns.

**Q: Does the AI Director use templates at all?**
No. It skips template matching entirely. The AI designs the storyboard from scratch based on the article content, brand guidelines, and any style/duration preferences you pass in.

**Q: What's the quality gate in the AI Director?**
After generating the storyboard, GPT reviews its own work and scores it on 5 criteria (hook strength, narrative flow, visual variety, brand alignment, CTA effectiveness). If the average is below 7/10, it regenerates once with specific feedback. This compensates for having no template guardrails.

**Q: Can Doubleclicker trigger the AI Director via the queue?**
Not yet. Queue items always route to the template pipeline. To use the AI Director, call the endpoint directly via HTTP. Queue routing could be added later by checking a field in the queue item's payload.

**Q: What's the Imagineer Edit tab?**
The Edit tab in Imagineer lets you modify an existing image using FLUX 2 + optional LoRA models. Paste a source image URL, describe the edit ("change background to beach sunset"), set a strength slider (lower = subtle, higher = creative rewrite), and optionally select LoRAs for brand consistency. Uses the `fal-ai/flux-2/lora/edit` endpoint.

**Q: How do I seed the pre-built LoRA library?**
Run `node api/lora/seed-library.js` once. It inserts 13 curated HuggingFace LoRAs into the `lora_library` table. Uses upsert on slug, so it's safe to re-run.
