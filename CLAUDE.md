# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start      # Express API (port 3003) + Vite dev server (port 4390) concurrently
npm run server     # Express API only (port 3003)
npm run dev        # Vite frontend only (port 4390)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally (Vite preview)
fly deploy         # Deploy to Fly.io (Sydney region)
```

No test runner or linter is configured.

## Architecture

Full-stack AI video ad creator. React 18 frontend talks to an Express API backend, both backed by Supabase (Postgres + Auth + Storage). Video/image generation delegates to Wavespeed, FAL.ai, and OpenAI. TTS voiceover uses ElevenLabs via FAL.ai proxy (no direct ElevenLabs key needed).

**Frontend** (`src/`): Vite + React + Tailwind + Radix UI. Path alias `@` → `src/`. All API calls go through `src/lib/api.js` which injects Supabase JWT automatically. Auth state managed via `src/contexts/AuthContext.jsx`. UI components follow shadcn/ui patterns (CVA + Radix) in `src/components/ui/`.

**Backend** (`server.js` + `api/`): Express server with JWT auth middleware (`authenticateToken`). Each API endpoint is a single file exporting `default async function handler(req, res)`. Routes are registered in `server.js` — new handlers must be added there to be reachable.

**Route registration** uses two patterns in server.js:
- Dynamic: `loadApiRoute('path/file.js')` inside an async route handler (most routes)
- Direct: `(await import('./api/path/file.js')).default` as the handler (campaigns block ~line 400)

Both work identically. Follow whichever pattern the surrounding routes use.

**Vite proxy**: `/api/*` requests proxy to `localhost:3003` with 180s timeout (configured in vite.config.js).

## Key Subsystems

**API Key Resolution** (`api/lib/getUserKeys.js`): Queries `user_api_keys` table, falls back to server env vars if user email matches `OWNER_EMAIL`. Route handlers should call `getUserKeys()` instead of reading `process.env` directly for AI provider keys.

**Model Registry** (`api/lib/modelRegistry.js`): Declarative config for all AI models — 8 image models (Nano Banana 2, Flux 2, SeedDream v4.5, Imagen 4, Kling Image v3, Grok Imagine, Ideogram v2, Wavespeed) and 10 video models (Kling 2.0 Master, Kling V3 Pro, Kling O3 Pro, Veo 2, Veo 3.1, Wan 2.5, Wan Pro, PixVerse v4.5, Hailuo/MiniMax, Wavespeed WAN). Each entry has `provider`, `endpoint`, `buildBody()`, `parseResult()`, and `pollConfig`. New models go here, not in if-else chains.

**Media Generator** (`api/lib/mediaGenerator.js`): Generic dispatcher — `generateImageV2()` and `animateImageV2()` look up the model in the registry and handle provider-specific auth/polling. Replaces ~360 lines of per-model branching.

**Pipeline Helpers** (`api/lib/pipelineHelpers.js`): Shared polling logic for Wavespeed and FAL.ai async generation. `generateImage()` and `animateImage()` are backward-compat wrappers that delegate to `mediaGenerator.js`. Also exports `pollWavespeedRequest()`, `pollFalQueue()`, `uploadUrlToSupabase()`, `assembleShort()`, `generateMusic()`, `extractFirstFrame()`, `extractLastFrame()`. `assembleShort()` accepts a `musicVolume` parameter (default 0.15). `generateMusic()` defaults to Lyria 2 (`fal_lyria2`), always instrumental.

**Video Style Frameworks** (`api/lib/videoStyleFrameworks.js`): 76 structural video frameworks — 16 universal (Story: personal_journey, origin_story, mini_documentary, day_in_the_life, before_after, explainer_story, emotional_tribute, challenge_experiment, how_it_works; Fast-Paced: top_x_countdown, everything_you_need_to_know, myth_busting, comparison_versus, did_you_know, history_timeline, hot_take) + 60 niche-specific (3 per niche × 20 niches). Each defines scene structure per duration, TTS mode (single/per_scene), frame chaining, transition type, text overlay requirements, music volume/mood, and default presets. `applicableNiches: null` = universal (shown for all niches), `applicableNiches: ['niche_key']` = niche-specific. `getFrameworksForNiche(niche)` returns universal + matching niche-specific frameworks. Frontend mirror: `src/lib/videoStyleFrameworks.js` with `FRAMEWORK_CARDS` array. API: `GET /api/styles/frameworks?niche=ai_tech_news`. These are SEPARATE from the 62 video style presets (cinematography/motion) — frameworks are structural, presets are visual.

**Shorts Pipeline** (`api/lib/shortsPipeline.js`): Framework-driven Shorts creation — load framework → script → TTS voiceover (Gemini or ElevenLabs, single or per-scene) → images (with conditional frame chaining) → video clips → extract frames → music (Lyria 2) → assemble → auto-caption → draft. Voiceover is the master clock — generated before video so clip durations match audio. Per-scene checkpointing to `jobs.step_results` with full scene assets (image_url, video_url, first_frame_url, last_frame_url, voiceover_url). Error handling: retry once per scene, then skip. Entry point: `api/campaigns/create.js`.

**Script Generator** (`api/lib/scriptGenerator.js`): OpenAI structured output for Shorts scripts. Produces scenes with narration, visual descriptions, `overlay_text`, and `scene_label`. When a framework is provided, scene count and structure come from the framework's `sceneStructure`. Legacy fallback: 15s = 3 scenes, 30s = 3, 45s = 4, 60s = 5, 90s = 7.

**Visual Styles** (`api/lib/visualStyles.js`): 14 visual style presets for the Shorts pipeline image generation. Frontend mirror: `src/lib/visualStylePresets.js`. Note: the shared StyleGrid uses `src/lib/stylePresets.js` (123 styles) which is a separate, larger preset system — see Style Presets below.

**Topic Suggestions** (`src/lib/topicSuggestions.js`): 3-level progressive topic funnel per niche (Category → Angle → Hook). Selected levels concatenate into the topic string passed to the researcher/script generator. All 20 niches have custom funnels.

**Scene Builder Pills** (`src/lib/scenePills.js`): Context-aware visual direction helpers for the script step. Primary function: `getScenePills(niche, framework, visualStyle, duration)` returns curated pills from niche + framework category (story→atmosphere/emotion/pacing, fast_paced→action/impact/rhythm) + camera pills. Duration-aware: ≤30s videos get 4 pills/category, longer get 6. Backward-compat: `getScenePillsForNiche(niche)` still works.

**Workflow Engine** (`api/lib/workflowEngine.js`): Persistent state machine for long-running jobs (article→video pipeline). Steps: scrape → analyze → match_templates → create_campaign → generate_assets → concat → upload → finalize. State stored in `jobs` table. Supports pause/resume/retry.

**Voiceover Generator** (`api/lib/voiceoverGenerator.js`): Two TTS backends — Gemini TTS via `fal-ai/gemini-tts` (30 voices, `generateGeminiVoiceover()`) and legacy ElevenLabs via `fal-ai/elevenlabs/tts/eleven-v3` (`generateVoiceover()`). Gemini is the default for new Shorts. 30 Gemini voices exported as `GEMINI_VOICES`. Frontend mirror: `src/lib/geminiVoices.js` with `FEATURED_VOICES`.

**Caption System** (`api/lib/captionBurner.js`): `burnCaptions(videoUrl, captionConfig, falKey, supabase)` accepts either a full config object (font, size, color, stroke, position, animation, etc.) or a legacy string preset key (word_pop, karaoke_glow, word_highlight, news_ticker). Uses `fal-ai/workflow-utilities/auto-subtitle`. Presets exported as `CAPTION_STYLES`. API: `GET /api/styles/captions`.

**Scene Repair** (`api/shorts/repair-scene.js` + `api/shorts/reassemble.js`): Two endpoints for post-generation scene fixing. `repair-scene` uses Veo 3.1 First-Last-Frame (`fal-ai/veo3.1/fast/first-last-frame-to-video`) with adjacent scene frames; falls back to `animateImageV2` for last-scene edge case. `reassemble` rebuilds the final video from existing scene assets with re-captioning. Both look up jobs via `draft_id → campaign_id → jobs (input_json JSONB)`.

**Scheduled Publisher** (`api/lib/scheduledPublisher.js`): Polls for drafts with scheduled publish times and pushes to YouTube.

**Storyboard Planner** (`src/components/modals/StoryboardPlannerWizard.jsx` + `api/storyboard/` + `src/components/storyboard/`): 8-step inputs-first wizard for multi-scene video sequences. All creative choices come BEFORE script generation so they influence the AI script. Steps: (1) Story & Mood — name, length, mood, aspect ratio; (2) Visual Style — 123 presets via StyleGrid; (3) Video Style — 75 motion/cinematography presets from `/api/styles/video`; (4) Model — global video model selection (applies to all scenes); (5) Creative Inputs — starting image (via Imagineer), characters/references (conditional on model), scene direction pills; (6) Generate Script — AI scene breakdown via `api/storyboard/generate-scenes.js` (GPT-4.1 mini structured output with Zod), scene count derived from `desiredLength / avgModelDuration` clamped 2-12; (7) Review Scenes — edit individual scene prompts, motion, duration; (8) Generate — sequential video generation per scene via JumpStart with frame chaining (extract last frame → next scene's start), then FFmpeg assembly (`api/storyboard/assemble.js`). Scene prompts composed via Cohesive Prompt Builder (`/api/prompt/build-cohesive` with `tool: 'storyboard'`). Generated videos are uploaded to Supabase storage for permanent URLs (FAL CDN URLs expire). 12 video models across 4 modes: Reference-to-Video (Veo 3.1, Kling O3 Pro/Standard R2V, Grok Imagine R2V), Image-to-Video (Veo 3.1 Fast, Seedance 1.5 Pro, Kling 2.5 Turbo, Grok Imagine, Wavespeed WAN), First-Last-Frame (Veo 3.1), Video-to-Video (Kling O3 Pro/Standard V2V). Model choice drives Characters UI: Kling R2V shows @Element1-4 system (`CharactersKling.jsx`), Veo 3.1 and Grok R2V show flat `image_urls`/`reference_image_urls` array (`CharactersVeo.jsx`). Grok R2V uses `@Image1`, `@Image2` syntax in prompts (up to 7 references), duration 1-10s, via `xai/grok-imagine-video/reference-to-video`. Starting image generation uses Imagineer (Nano Banana 2, Seedream v4, Flux 2). Scene description analyzed via GPT-4.1 mini vision (`describe-scene.js`). Preset system: save/load full wizard configs (name, style, model, mood, direction, etc.) per user via `storyboard_presets` table. CRUD API at `/api/storyboard/presets` (GET list, POST save/upsert, DELETE). Preset bar visible on all wizard steps — Load, Save As, Update (when preset loaded). Migration: `supabase-migration-storyboard-presets.sql`.

**JumpStart** (`api/jumpstart/`): Image/video generation endpoints used by both the Video Ad Creator and Storyboard Planner. 6 endpoints: `generate` (FormData with image blob), `result` (poll async), `save-video`, `edit`, `extend`, `erase`. Models are selected client-side and passed as form field — the backend dispatches to the appropriate provider. Supports Veo 3.1 variants (reference-to-video, fast, first-last-frame), Kling O3 R2V (character references), Kling O3 V2V (video-to-video restyle/refinement), Seedance, Grok (image-to-video, edit, extend), and Wavespeed WAN. The `extend` endpoint supports 3 model families: Seedance 1.5 Pro (Wavespeed, 4-12s), Veo 3.1 Fast Extend (FAL, fixed 7s), and Grok Imagine Extend (FAL, 2-10s). Frontend: `JumpStartVideoStudioModal.jsx` provides the extend/edit UI.

**Imagineer** (`src/components/modals/ImagineerModal.jsx` + `api/imagineer/`): AI image generation and editing suite with two modes — Text-to-Image (4-step wizard: Subject → Style → Enhance → Output) and Image-to-Image (edit existing images). T2I models: Nano Banana 2, Seedream v4, Flux 2 (LoRA). I2I models add Wavespeed Nano Ultra and Qwen Image Edit for multi-image blending. Has its own 100+ style presets map in `generate.js` (separate from `api/lib/visualStyles.js` which is Shorts-only). Reference images are analyzed via GPT-4.1 mini vision (`describe-character.js`). All structured inputs are assembled into prompts by the shared Cohesive Prompt Builder.

**Imagineer I2I Multi-Image**: Nano Banana 2, Seedream, Wavespeed Nano Ultra, and Qwen all support multiple `image_urls` in I2I mode (e.g., scene backdrop + character → composite). `api/imagineer/edit.js` accepts both `image_url` (single, backward-compat) and `image_urls` (array). Wavespeed models route to `/api/images/edit`; FAL models (nano-banana-2, seedream, fal-flux) route to `/api/imagineer/edit`. The Storyboard "Generate" button opens Imagineer in I2I mode via `initialMode="i2i"` prop.

**Turnaround Sheet** (`api/imagineer/turnaround.js` + `TurnaroundSheetWizard.jsx`): Generates 4×6 character turnaround grids (24 poses) with multi-axis variation. 6-step wizard: Character → Style & Model → Props → Refinements → Results → Cell Editor. Supports multiple characters per batch, 5 pose set presets (`api/lib/turnaroundPoseSets.js` — Standard, Expressions Focus, Action Heavy, Fashion/Outfit, Creature/Non-Human), and multi-style selection. Generation computes `characters × styles × poseSets` cartesian product with 4-concurrent request limit. Results grouped by character with per-dimension filter pills and per-sheet retry. Edit models use synchronous `fal.run` with automatic fallback chain; generate models use `queue.fal.run` with frontend polling. Supports 6 models, categorized props, negative prompt conflict resolution (standard-24 only), brand style guides, and auto-tagging on library save. Frontend pose set mirror: `src/lib/turnaroundPoseSets.js`.

**Provider Health Dashboard** (`api/providers/health.js` + `src/pages/CostDashboardPage.jsx` + `src/components/ProviderStatusChip.jsx`): Multi-provider API monitoring. `/api/providers/health` checks all 3 provider keys in parallel — OpenAI (costs API + models fallback), FAL.ai (queue endpoint check), Wavespeed (predictions check). Header chip shows 3 colored dots (green/amber/red per provider), clicks through to `/costs` dashboard. Dashboard shows per-provider cards (status, spend, calls, billing link), stacked daily spend chart, model breakdown, and operation breakdown. Spend data from `cost_ledger` table; OpenAI also has real API spend via admin keys. Old `api/openai/balance.js` still exists for backward compat.

**Video Style Presets** (`api/lib/videoStylePresets.js`): 75 motion/cinematography presets across 6 categories — Realistic (iPhone Selfie, UGC, TikTok, FaceTime, Vlog/BTS, Podcast), Professional (Cinematic, Documentary, Commercial, Product Demo, Corporate, Real Estate), Artistic (Dreamy, Vintage, Noir, Anime, Cyberpunk, Fantasy, Stop Motion, Watercolor), Faceless (Cinematic, Tech, Nature, Abstract, Dark/Horror, Food, Travel, Luxury), Kids (Kids Cartoon, Whiteboard/Explainer), and utility (Motion Graphics, Stock B-Roll). Each has `thumb` URL, `description` (UI label), and `prompt` (full 150-word cinematography direction). API: `/api/styles/video` returns all via `listVideoStyles()`. Used by Shorts pipeline (`shortsPipeline.js` calls `getVideoStylePrompt()`) and Storyboard (`generateSingleScene` appends `preset.prompt` to generation prompt).

**Cohesive Prompt Builder** (`api/prompt/build-cohesive.js`): GPT-powered prompt assembly service. Accepts structured creative inputs (description, style, props, negative prompt, brand guide, lighting, camera angle, mood, etc.) from any tool and uses OpenAI to compose a single optimized generation prompt. Used by Imagineer T2I, I2I editing, Turnaround, and Storyboard.

**LinkedIn Posting Tool** (`src/pages/LinkedInPage.jsx` + `api/linkedin/` + `src/components/linkedin/`): Internal LinkedIn content creation tool at `/linkedin`. Two-panel layout: topic queue (left) + post feed (right). Topic discovery: two-step keyword search (`search-keyword` returns scored previews without DB insert → user clicks "Add to Queue" → `add-search-result` inserts selected topic), or paste URL directly (`add-topic`). Scoring via GPT-4.1 mini structured output + Exa API content extraction (auto-fetches full article when summary <500 chars). Post generation: 3 parallel GPT-4.1 variations per topic (Contrarian, Story-Led, Data/Stat Punch) with anti-slop rules + text cleaning (emoji/markdown/hashtag strip, camelCase fix, punctuation spacing). Source appended as plain `src: domain.com/path` (UTM stripped), only CTA hyperlinked. Images generated at post creation time (not publish): gpt-5-mini excerpt → Nano Banana 2 base image → branded square-only (1080×1080) composition via `sharp` SVG overlay → upload to Supabase storage. Color template selectable via 6 gradient swatches on topic card (or auto-cycles by post number). 13 API endpoints under `/api/linkedin/*` (config CRUD, search, search-keyword, add-topic, add-search-result, topics list, update-topic, generate, posts list, update-post, regenerate-post, publish). Database: `linkedin_config` (per-user settings, LinkedIn token, Exa key), `linkedin_topics` (discovery queue with scores, full_content), `linkedin_posts` (generated variations with featured_image_square, scheduled_for). Migration: `supabase-migration-linkedin.sql`. Image composition: `api/lib/composeImage.js` (9-layer SVG: gradient + orb + noise + quote mark at 85% opacity + quote text 72px DejaVu Serif + series pill + watch number + logo container top-left — circular for round logos, pill for wide) + `api/lib/colorTemplates.js` (6 color templates: arctic-steel, sunset-coral, electric-violet, royal-gold, midnight-rose, purple-burst). Publishing: `api/lib/linkedinPublisher.js` (LinkedIn API v2 with square image upload). Publish endpoint is now lightweight — uses pre-generated image, no image gen at publish time. Fonts required in Docker: `fonts-dejavu-core`, `fonts-liberation`. Cost categories: `openai` (scoring/generation/excerpt via gpt-5-mini), `fal` (base image), `serpapi` (search), `exa` (content fetch).

## Other API Subsystems

**Smoosh** (`api/smoosh/`): Image combination/blending tool. **Lens** (`api/lens/`): Image generation endpoint. **Trip** (`api/trip/`): Video restyle. **TryStyle** (`api/trystyle/`): Style try-on with polling. **Audio** (`api/audio/`): Captions, music, and voiceover generation endpoints. **Voice** (`api/voice/` + `api/voices/`): Voice preview and ElevenLabs voice library browsing. **Brand** (`api/brand/`): Brand kit management — logo, colors, guidelines extraction from PDFs (`extract-pdf.js`), background removal (`remove-bg.js`), avatar training (`train-avatar.js`), and username registry. Data in `brand_kit` table. Frontend: `BrandKitModal.jsx`, `BrandAssetsModal.jsx`, `BrandStyleGuideSelector.jsx`. **Library** (`api/library/`): Image library with save, thumbnail updates, and a tag system. Tag tables: `image_tags` (user-scoped, unique name per user) + `image_tag_links` (junction to `image_library_items`). Endpoints: `GET/POST /api/library/tags` (list/create), `POST /api/library/tags/assign` (bulk assign), `DELETE /api/library/tags/unassign`, `POST /api/library/tags/auto-tag` (create-if-not-exists + assign atomically). RPC function `get_user_tags_with_counts` returns tags with usage count and last_used. Frontend `LibraryModal.jsx` has tag filter bar, tag chips on cards, and TagDropdown for assignment. Migration: `supabase-migration-tags.sql`. **Images** (`api/images/`): Image search (SERP/Google CSE), import-url, edit, and inpaint — separate from Imagineer's editing endpoints. **Animate** (`api/animate/`): Standalone image-to-video animation endpoints (`generate.js`, `result.js`), separate from JumpStart. Frontend: `AnimateModal.jsx`. **Costs** (`api/costs/summary.js`): Dedicated cost summary endpoint for the Provider Health Dashboard.

**Proposal Pages** (`src/pages/ProposalPage.jsx`): Password-gated client proposals. `PasswordGate` component checks `sessionStorage` for unlock state; `ProposalContent` renders the actual page. Public route at `/proposal/hamilton-city-council`, with `/proposals` redirecting there. No auth required — password is client-side only (`TraceyGrayson`). HCC logo loaded as SVG from Wikimedia Commons.

**Cost Logger** (`api/lib/costLogger.js`): Tracks per-user API spend across all providers. Called from generation endpoints with model, token counts, and username. Dashboard at `CostDashboardPage.jsx`.

**Shorts Templates** (`api/lib/shortsTemplates.js`): 20 niche definitions for the Shorts pipeline — each has scene structure, music mood, voice pacing, default voice, script system prompt, and visual style. Niches range from AI/Tech to Paranormal/UFO. Used by `api/campaigns/research.js` to validate niche and by the script generator for tone/style. Frontend niche cards with topic counts live in the `NICHES` array in `CampaignsNewPage.jsx`.

**YouTube Tokens** (`api/lib/youtubeTokens.js`): OAuth token management for YouTube publishing. Handles refresh flow. Used by Scheduled Publisher.

## Environment

All env vars are documented in `.env.example` — refer to that file for the full list with comments. Key things to know:
- `WAVESPEED_API_KEY` is the canonical name (never `WAVESPEED_KEY`)
- Frontend vars must be prefixed `VITE_` (e.g. `VITE_SUPABASE_URL`)
- `OWNER_EMAIL` controls API key fallback in `getUserKeys()` — if the authenticated user's email matches, server env vars are used instead of the `user_api_keys` table
- `SEARCHAPI_KEY` and `SERP_API_KEY` are interchangeable (code checks both)
- ElevenLabs TTS works through the FAL proxy (`FAL_KEY` only) — `ELEVENLABS_API_KEY` is optional for direct access

## Gotchas

- `fal-ai/nano-banana-2` (T2I generation) and `fal-ai/nano-banana-2/edit` (I2I composition with `image_urls[]`) are separate FAL endpoints. Same applies to Seedream. Don't confuse them — `api/imagineer/generate.js` hits the base endpoint, `api/imagineer/edit.js` hits the `/edit` variant.
- Turnaround "Edit Next Sheet" flow: after reassembling & saving, `savedSheetIds` tracks completed sheets. The footer swaps to show "Edit Next Sheet" (navigates to next unsaved) or "All Done" (returns to gallery). Don't remove `savedSheetIds` state.
- Tag tables (`image_tags`, `image_tag_links`) require migration `supabase-migration-tags.sql` to exist in Supabase. Without it, the library shows 404/500 errors on tag queries. The frontend `loadTagsForItems` should handle missing tables gracefully.
- `public/` directory contents are copied to `dist/` by Vite on build and served as static assets. In dev, Vite serves them directly. Style thumbnails live at `public/assets/styles/`.
- `.env` lines must each have their own newline — concatenated lines silently break dotenv parsing.
- `api/lora/seed-library.js` is a CLI script (`node api/lora/seed-library.js`), not an Express handler. Don't register it as a route.
- Migrations are loose SQL files at project root (`supabase-migration-v*.sql`, `supabase-migration-tags.sql`, `supabase-migration-storyboard-presets.sql`, `supabase-migration-shorts-overhaul.sql`, `supabase-migration-linkedin.sql`) and in `api/migrations/`, not managed by Supabase CLI.
- Vite dev server runs on port 4390 (not the default 5173).
- Some routes return immediately and do background work (e.g., `generate-thumbnails`). Check for `res.json()` before async blocks.
- Webhook routes (`/api/webhooks/content`, `/api/article/from-url`, `/api/article/bulk`) skip auth — they use webhook secrets or brand_username verification instead.
- All Veo 3.1 endpoints (`generate.js`, `extend.js`) use `auto_fix: true` so FAL rewrites prompts that trigger content policy (copyrighted brand names). The Cohesive Prompt Builder's storyboard system prompt also strips brand names (Pixar, Disney, DreamWorks, Cocomelon, etc.) proactively. If Veo R2V returns 422 "no_media_generated", check for brand names in the prompt.
- FAL CDN URLs (`v3b.fal.media`, `fal.media`) are temporary and expire within hours. Always upload generated media to Supabase storage via `uploadUrlToSupabase()` or the `/api/library/save` endpoint before storing URLs in the database or displaying them in production pages. The Shorts pipeline does this automatically via `animateImageV2`; the Storyboard wizard does it in `generateSingleSceneWrapper`.
- Video model duration formats differ by provider: Veo 3.1 accepts ONLY `'4s'`, `'6s'`, `'8s'` — any other value (including `'5s'`, `'7s'`) causes a 422 error. The `veoDuration()` function in modelRegistry.js maps: ≤4→4s, ≤6→6s, else→8s. Kling/Wan/PixVerse use `"5"`/`"10"` (string number), Wavespeed uses integer `5`/`8`, some models (Hailuo, Wan Pro) don't accept duration at all. The model registry handles this — don't hardcode duration format.
- `/shorts/new` redirects to `/campaigns/new?type=shorts` — the actual wizard lives in `CampaignsNewPage.jsx` (not `ShortsWizardPage.jsx`, which is dead code). Draft review at `/shorts/draft/:draftId`. The Shorts wizard is 13 steps: Niche & Brand → Video Style (framework) → Visual Style → Image Model → Motion Style → Video Model → Voice & Music → Scene Direction → Topic & Research → Script → Captions → Preview Image → Review. All config comes BEFORE script generation so it influences the script. Selecting a framework pre-fills visual style, video style preset, image model, video model, and TTS pacing as defaults (user can override all). Framework, Visual Style, and Motion Style steps auto-proceed (advance to next step after selection via `setTimeout(() => goNext(), 150)`).
- `/templates` route exists (`TemplatesPage.jsx`) — undocumented but live. `JumpStartVideoStudioModal.jsx` and `MotionTransferModal.jsx` are additional modals in `src/components/modals/` used by the Video Ad Creator.
- LoRA configs from the frontend use `{ loraUrl, triggerWord, scale }` but FAL expects `{ path, scale }`. The pipeline transforms this — don't pass raw loraConfigs to `generateImageV2` without mapping `loraUrl` → `path`.
- `generate_audio` is only supported by Kling v3, Kling O3, and Veo 3.1 variants. Passing it to other video models will cause errors. The frontend toggle only shows for these models. In the Storyboard Planner, audio is controlled per-scene based on the selected model's `supportsAudio` flag in `SCENE_MODELS`.
- `api/lib/modelRegistry.js` image models use either `image_size` (Flux, SeeDream, Ideogram) or `aspect_ratio` (Imagen4, Kling Image, Grok) — check the registry's `buildBody()` before adding new models.
- Tag routes in server.js must be registered in specificity order: `/api/library/tags/auto-tag`, `/api/library/tags/assign`, `/api/library/tags/unassign` BEFORE the catch-all `/api/library/tags`. Express matches first registered route.
- Turnaround `buildTurnaroundPrompt` expression conflict resolution (swapping Row 2 expressions when negative prompt conflicts) only runs for `poseSet === 'standard-24'`. Other pose sets define their own rows and skip this logic entirely.
- Design specs live in `docs/superpowers/specs/`, implementation plans in `docs/superpowers/plans/`. Check these before starting related work — they contain architecture decisions and reviewed requirements.
- Imagineer edit models (Nano Banana 2 Edit, Seedream Edit) use synchronous `fal.run` (not `queue.fal.run`) because queue polling is unreliable for edit endpoints. The turnaround endpoint has automatic model fallback on 5xx errors.
- Imagineer has its own `STYLE_PROMPTS` map (~86 styles) in `api/imagineer/generate.js` — these are separate from the 14 visual styles in `api/lib/visualStyles.js` (which are for Shorts only). Don't confuse the two.
- In `ImagineerModal.jsx`, `isWavespeed` (line ~278) is misleadingly named — it actually means `multiImage` (true for nano-banana-2 too, not just Wavespeed models). The actual provider check is `isWavespeedModel = i2iModel.startsWith('wavespeed-')` on line ~465. When debugging I2I routing, check both variables.
- nano-banana-2/edit multi-image composition requires explicit composition prompts ("composite the character into the scene, matching lighting and perspective") — vague prompts produce sticker-on-background results rather than natural composites.
- The `/api/imagineer/result` poller uses a model-to-endpoint map and truncates FAL paths to 2 segments for queue URLs. Edit models get a `-edit` suffix appended to the model ID so the poller resolves the correct endpoint.
- `cost_ledger` categories map to providers on the dashboard: `openai` → OpenAI, `fal` → FAL.ai, `wavespeed` → Wavespeed, `elevenlabs` → FAL.ai (goes through FAL proxy). Use these exact category strings when calling `logCost()`.
- Proposal page HCC logo uses an external SVG (`upload.wikimedia.org`). If it breaks, the fallback is in Supabase storage at `images/proposals/hamilton-cc-logo.png` (low-res).
- The password for the proposal page (`TraceyGrayson`) is hardcoded in `ProposalPage.jsx` — client-side only, not secure. It's a convenience gate, not real auth.
- CampaignsNewPage `handleGenerateScript` must check `res.ok` and `data.error` before accessing `data.script.scenes`. The preview-script API returns `{ script, niche }` on success but `{ error }` on failure — without the check, errors fall through silently and the UI does nothing.
- `ProposalPage` uses a `PasswordGate` → `ProposalContent` split. `useScrollAnimation` must run inside `ProposalContent` (not the parent), otherwise `[data-animate]` elements are invisible after unlock because the IntersectionObserver fires before content mounts.
- The `[Verification Required]` Stop callback comes from Claude Preview's `<verification_workflow>` system prompt, not an editable hook file. It fires when code is edited while a preview server is running. Override behavior via the Verification Rules section below.
- 5 Radix UI packages are installed but unused: `react-dropdown-menu`, `react-progress`, `react-slider`, `react-switch`, `react-tooltip`. Safe to remove.
- Dead code files: `src/pages/SetupKeys.jsx` and `src/components/modals/StoryboardPlannerModal.jsx` are never imported — don't route to or extend these. `src/pages/ShortsWizardPage.jsx` is imported in `App.jsx` but has no route pointing to it — effectively dead, don't extend it.
- The `jobs` table stores `campaign_id` inside the `input_json` JSONB column, not as a top-level column. To query by campaign: use PostgREST JSONB filter `.eq('input_json->>campaign_id', id)`, not `.eq('campaign_id', id)`. The `ad_drafts` table does have a top-level `campaign_id` column — don't confuse the two.
- `src/lib/api.js` `apiFetch` never checks `response.ok` — 4xx/5xx responses are silently parsed as success data. Any error handling on the frontend must account for this.
- Five separate preset/style systems exist: (1) Visual Styles (`api/lib/visualStyles.js` — 14 styles, Shorts image generation), (2) Style Presets (`src/lib/stylePresets.js` — 123 styles, shared StyleGrid), (3) Video Style Presets (`api/lib/videoStylePresets.js` — 62 motion styles), (4) Turnaround Pose Sets (`api/lib/turnaroundPoseSets.js` — 5 pose layouts, turnaround-only), (5) Video Style Frameworks (`api/lib/videoStyleFrameworks.js` — 76 structural frameworks, Shorts pipeline). Frameworks are structural (scene count, TTS mode, overlays); presets are visual (cinematography). Each has a frontend mirror that must stay in sync manually.
- Visual style `promptText` values in `src/lib/stylePresets.js` are now detailed 40-80 word descriptions (not 1-2 word labels). Maintain this level of detail when adding new styles — short prompts produce noticeably worse image generation results.
- Video style presets (62) and visual style presets (~118) both auto-load via API (`/api/styles/video` and `StyleGrid` component) — no manual wiring needed when adding new presets.
- `src/lib/stylePresets.js` uses a `T` object mapping key names to FAL CDN thumbnail URLs. When adding new thumbnails, ensure no duplicate keys exist in `T` — JS objects use last-defined key, silently overriding earlier definitions. Generate thumbnails via `scripts/generate-style-thumbs.js` (batch 1) or `scripts/generate-style-thumbs-2.js` (batch 2) using FAL Nano Banana 2.
- To validate data-only preset files without a dev server: `node -e "import('./api/lib/videoStylePresets.js').then(m => console.log(m.listVideoStyles().length))"`.
- SceneCard (`src/components/storyboard/SceneCard.jsx`) is a prop-driven extracted component. When adding features to the Storyboard Scene Builder step, add both the prop to SceneCard AND wire it up in StoryboardPlannerWizard where SceneCard is rendered (~line 1411). The Imagineer "Generate" button for starting images uses `onGenerateStartImage` → `setShowImagineerForStartFrame(true)`.
- After completing code changes, always check if a Fly.io deploy is needed (`git log origin/main..HEAD` for unpushed commits, then `fly deploy`). Previous sessions may have pushed code but not deployed.
- When resuming from a previous session, check `git log --oneline -5` before re-investigating — work may already be committed. Don't re-verify things that git history confirms are done.
- `pollFalQueue` uses the full model endpoint path for queue URLs (e.g. `fal-ai/ffmpeg-api/compose`, not `fal-ai/ffmpeg-api`). Never truncate multi-segment FAL paths — it causes 404s.
- `extractLastFrame` uses `frame_type: 'last'` (not manual `frame_time` calculation). The FAL extract-frame API supports `'first'`, `'middle'`, `'last'`.
- Shorts pipeline always forces `generate_audio: false` for video clips — it has its own voiceover + music. Don't pass `generate_audio: true` from the frontend for Shorts.
- Nano Banana 2 is now in both the Shorts wizard image model picker (as `fal_nano_banana` in modelRegistry) and Imagineer. It's the best quality image model available.
- Music generation defaults to Lyria 2 (`fal_lyria2`), with MiniMax v2 as fallback. Lyria 2 respects duration parameters. MiniMax generates fixed-length ~60s tracks. Music must ALWAYS be instrumental (`lyrics_prompt: '[Instrumental]'`), never lyrics. `assembleShort()` accepts `musicVolume` parameter (default 0.15) — framework overrides this (e.g., emotional_tribute uses 0.25).
- Captions use `fal-ai/workflow-utilities/auto-subtitle` (NOT `fal-ai/auto-caption` which was replaced). Supports Google Fonts, karaoke word highlighting, animation, configurable position/colors. Output is `output.video.url`. Caption styles defined in `api/lib/captionBurner.js` CAPTION_STYLES map.
- Grok Imagine Extend (`xai/grok-imagine-video/extend-video`) returns the original video + extension stitched together, not just the extension. Input video must be MP4 (H.264/H.265/AV1), 2-15s long. Extension duration: 2-10s (default 6). Unlike Veo 3.1 Extend, it has no audio support.
- `uploadUrlToSupabase` extension detection: falls back to URL extension and folder name when content-type is ambiguous. The `pipeline/finals` folder forces `.mp4`. Previously defaulted everything unknown to `.mp3` which broke video files.
- `toast.success()` and `toast.info()` are silenced globally in `App.jsx` — only `toast.error()` and `toast.warning()` display to the user. Don't add new success/info toasts expecting them to appear.
- `SlideOverPanel` (`src/components/ui/slide-over-panel.jsx`) has an `onPointerDownOutside` handler that prevents the modal from closing when clicking floating elements (notifications, toasts) that render outside the dialog at `fixed bottom-*` positions. The "Image Generated" notification in `VideoAdvertCreator.jsx` also has `onPointerDown` stopPropagation for the same reason. Both are needed — removing either re-introduces the close-on-notification-click bug.

## Verification Rules

Verification (build check, screenshot, snapshot, etc.) is **NOT required** for:
- Comment additions or removals
- Formatting or whitespace changes
- Import reordering
- Variable renaming with no logic change
- Documentation updates

Verification **IS required** for:
- Bug fixes
- New features or endpoints
- Refactoring that changes logic
- Dependency changes
- Config changes that affect runtime behavior
- Database migrations or RLS policy changes

## Deployment

- **Primary**: Fly.io (`fly.toml`) — Sydney region, Express serves both API and built frontend on port 3000.
- **Fly.io only** — Never use Vercel.
- **CI/CD**: GitHub Actions (`.github/workflows/fly-deploy.yml`) auto-deploys to Fly.io on every push to `main`. Manual `fly deploy` also works.
- **Docker**: Multi-stage `Dockerfile` at project root (deps → builder → runner). Used by Fly.io builds.
- Fly.io deploys can fail with lease conflicts if a previous deploy is still rolling out. Wait ~60s and retry `fly deploy`.
- Pushing to `main` triggers GitHub Actions auto-deploy, which restarts the Fly machine and KILLS any running pipeline mid-generation. This caused multiple failed generations. ALWAYS: `git push` first, THEN `fly deploy`. Never push during active generation.
