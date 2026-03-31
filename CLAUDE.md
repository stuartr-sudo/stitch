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

**Video Style Frameworks** (`api/lib/videoStyleFrameworks.js`): 76 structural frameworks — 16 universal + 60 niche-specific (3 per niche × 20 niches). Each defines scene structure per duration, TTS mode, frame chaining, transitions, overlays, music, and default presets. `applicableNiches: null` = universal, `applicableNiches: ['key']` = niche-specific. `getFrameworksForNiche(niche)` returns universal + matching. Frontend mirror: `src/lib/videoStyleFrameworks.js`. API: `GET /api/styles/frameworks?niche=ai_tech_news`. SEPARATE from video style presets — frameworks are structural, presets are visual.

**Shorts Workbench** (`src/pages/ShortsWorkbenchPage.jsx` + `api/workbench/workbench.js`): Interactive 5-step Shorts creator at `/shorts/workbench`. Replaces the old automated Shorts Workbench with a step-by-step manual workflow. Steps: (1) Script & Voice — niche selection (20 niches with `NICHE_VOICE_STYLES` + `NICHE_VISUAL_MOODS`), topic research, script generation, voice selection (Gemini TTS, 12 voices), voice style presets (niche-specific + 8 universal), default 1.1x speed. (2) Timing & Music — Whisper word timestamps via `getWordTimestamps()`, block alignment via `alignBlocks()`, duration solver, background music generation (niche-aware via `SHORTS_TEMPLATES[niche].music_mood`). (3) Keyframes — per-scene image generation with LLM prompt synthesis (GPT-4.1-mini, narration + visual style + niche `visual_mood` → single prompt, NO concatenation), visual mood panel from niche template, StyleGrid for visual style selection. (4) Video Clips — FLF (First-Last-Frame) or I2V generation per scene. (5) Assemble — FFmpeg assembly with voiceover + music + captions via `burnCaptions()`.

Backend API: `POST /api/workbench/:action` with actions: `voiceover`, `timing`, `music`, `generate-frame`, `generate-clip`, `assemble`, `save-draft`, `load-draft`, `list-drafts`. Drafts stored in `ad_drafts` table with `storyboard_json` JSONB column containing full workbench state. Draft save creates a `campaigns` row (using `name`, `content_type: 'shorts'`, `status: 'workbench'`) linked via `campaign_id`.

Two generation modes auto-selected by video model:
- **FLF** (Veo 3.1, Kling V3, Kling O3): First-Last-Frame video from two keyframe images per scene.
- **I2V** (Wan 2.5, Kling 2.0, Hailuo, etc.): Image-to-Video from a single keyframe per scene, last frame extracted for next scene continuity.

Key supporting modules: `blockAligner.js` (snap to model durations), `durationSolver.js` (optimize scene durations), `getWordTimestamps.js` (Whisper via FAL), `pipelineHelpers.js` (music, assembly, frame extraction). The old automated pipeline (`api/lib/shortsPipeline.js`, `api/campaigns/create.js`) still exists for legacy drafts but is no longer the primary creation path.

**Script Generator** (`api/lib/scriptGenerator.js`): Wrapper around `narrativeGenerator.js`. `generateScript()` calls `generateNarrative()` (words-only output: narration segments, overlay text, scene labels — NO visual prompts). Used by both the Workbench and the legacy pipeline.

**Visual Styles** (`api/lib/visualStyles.js`): 14 visual style presets for the Shorts Workbench image generation. Frontend mirror: `src/lib/visualStylePresets.js`. Note: the shared StyleGrid uses `src/lib/stylePresets.js` (123 styles) which is a separate, larger preset system — see Style Presets below.

**Topic Suggestions** (`src/lib/topicSuggestions.js`): 3-level progressive topic funnel per niche (Category → Angle → Hook). Selected levels concatenate into the topic string passed to the researcher/script generator. All 20 niches have custom funnels.

**Scene Builder Pills** (`src/lib/scenePills.js`): Context-aware visual direction helpers for the script step. Primary function: `getScenePills(niche, framework, visualStyle, duration)` returns curated pills from niche + framework category (story→atmosphere/emotion/pacing, fast_paced→action/impact/rhythm) + camera pills. Duration-aware: ≤30s videos get 4 pills/category, longer get 6. Backward-compat: `getScenePillsForNiche(niche)` still works.

**Workflow Engine** (`api/lib/workflowEngine.js`): Persistent state machine for long-running jobs (article→video pipeline). Steps: scrape → analyze → match_templates → create_campaign → generate_assets → concat → upload → finalize. State stored in `jobs` table. Supports pause/resume/retry.

**Voiceover Generator** (`api/lib/voiceoverGenerator.js`): Two TTS backends — Gemini TTS via `fal-ai/gemini-tts` (30 voices, `generateGeminiVoiceover()`) and legacy ElevenLabs via `fal-ai/elevenlabs/tts/eleven-v3` (`generateVoiceover()`). Gemini is the default for new Shorts. 30 Gemini voices exported as `GEMINI_VOICES`. Frontend mirror: `src/lib/geminiVoices.js` with `FEATURED_VOICES`.

**Caption System** (`api/lib/captionBurner.js`): `burnCaptions(videoUrl, captionConfig, falKey, supabase)` accepts either a full config object (font, size, color, stroke, position, animation, etc.) or a legacy string preset key (word_pop, karaoke_glow, word_highlight, news_ticker). Uses `fal-ai/workflow-utilities/auto-subtitle`. Presets exported as `CAPTION_STYLES`. API: `GET /api/styles/captions`.

**Scene Repair** (`api/shorts/repair-scene.js` + `api/shorts/reassemble.js`): Two endpoints for post-generation scene fixing. `repair-scene` uses Veo 3.1 First-Last-Frame (`fal-ai/veo3.1/fast/first-last-frame-to-video`) with adjacent scene frames; falls back to `animateImageV2` for last-scene edge case. `reassemble` rebuilds the final video from existing scene assets with re-captioning. Both look up jobs via `draft_id → campaign_id → jobs (input_json JSONB)`.

**Scheduled Publisher** (`api/lib/scheduledPublisher.js`): Polls for drafts with scheduled publish times and pushes to YouTube.

**Storyboards** (`api/storyboard/projects.js` + `api/storyboard/generate.js` + `StoryboardWorkspace.jsx` + `StoryboardList.jsx`): Persistent, database-backed video planning and production at `/storyboards` and `/storyboards/:id`. Settings-first flow: create storyboard (name only, no frames) → configure settings (duration, style, mood, model, brand, characters) → Generate Script (AI decides scene count via `calculateSceneCount()`, creates frames from GPT output with variable durations) → generate preview images → inline edit/lock/split/delete scenes → export PDF → share public review link (`/api/storyboard/review/:token`, no auth) → approve for production. Three tabs: Settings (default when no scenes), Storyboard (frame grid + detail panel), Production (video generation status). Frames are NOT pre-created — they only exist after script generation. Script generation: Stage 1 narrative (`storyboardNarrativeGenerator.js`) → Stage 2 visual director (`storyboardVisualDirector.js`), both via GPT-4.1 mini + Zod structured output. Scene management: split scene (halves duration, new scene gets empty content), delete scene (renumbers + recalculates timestamps), lock scene (prevents regeneration). DB tables: `storyboards` + `storyboard_frames`. Migration: `migration-storyboard-system.sql`. CRUD API uses path-based routing in `projects.js` — the `app.all('/api/storyboard/projects*')` catch-all handles all routes. Script + preview generation routes registered BEFORE the catch-all in server.js. The old `StoryboardPlannerWizard.jsx` and `StoryboardEditor.jsx` are dead code — `StoryboardWorkspace.jsx` is the active page.

**JumpStart** (`api/jumpstart/`): Image/video generation endpoints used by the Video Ad Creator and Storyboards. 6 endpoints: `generate` (FormData with image blob), `result` (poll async), `save-video`, `edit`, `extend`, `erase`. Models are selected client-side and passed as form field — the backend dispatches to the appropriate provider. Supports Veo 3.1 variants (reference-to-video, fast, first-last-frame), Kling O3 R2V (character references), Kling O3 V2V (video-to-video restyle/refinement), Seedance, Grok (image-to-video, edit, extend), and Wavespeed WAN. The `extend` endpoint supports 3 model families: Seedance 1.5 Pro (Wavespeed, 4-12s), Veo 3.1 Fast Extend (FAL, fixed 7s), and Grok Imagine Extend (FAL, 2-10s). Frontend: `JumpStartVideoStudioModal.jsx` provides the extend/edit UI.

**Imagineer** (`src/components/modals/ImagineerModal.jsx` + `api/imagineer/`): AI image generation and editing suite with two modes — Text-to-Image (4-step wizard: Subject → Style → Enhance → Output) and Image-to-Image (edit existing images). Both modes support multi-style bulk create via `StyleGrid multiple` — selecting multiple styles generates one image per style with a multi-result grid (save/retry/use per result). T2I `artisticStyle` and I2I `i2iStyle` are both arrays. T2I models: Nano Banana 2, Seedream v4, Flux 2 (LoRA). I2I models add Wavespeed Nano Ultra and Qwen Image Edit for multi-image blending. Has its own 100+ style presets map in `generate.js` (separate from `api/lib/visualStyles.js` which is Shorts-only). Reference images are analyzed via GPT-4.1 mini vision (`describe-character.js`). All structured inputs are assembled into prompts by the shared Cohesive Prompt Builder.

**Imagineer I2I Multi-Image**: Nano Banana 2, Seedream, Wavespeed Nano Ultra, and Qwen all support multiple `image_urls` in I2I mode (e.g., scene backdrop + character → composite). `api/imagineer/edit.js` accepts both `image_url` (single, backward-compat) and `image_urls` (array). Wavespeed models route to `/api/images/edit`; FAL models (nano-banana-2, seedream, fal-flux) route to `/api/imagineer/edit`. The Storyboard "Generate" button opens Imagineer in I2I mode via `initialMode="i2i"` prop.

**Turnaround Sheet** (`api/imagineer/turnaround.js` + `TurnaroundSheetWizard.jsx`): Dynamic-grid character turnaround sheets. 7 pose set presets in `api/lib/turnaroundPoseSets.js` (frontend mirror: `src/lib/turnaroundPoseSets.js`). Grid dimensions are derived from the pose set structure (`rows.length` × `rows[0].cells.length`): legacy sets are 4×6 (24 cells), 3D-optimized sets are 2×2 (4 cells, 6× more pixels per cell). Two 3D pose sets: "3D Reference — Angles" (front/right/back/left orthographic) and "3D Reference — Action" (dynamic poses). 2×2 grids use 1:1 square aspect ratio output; 4×6 grids use 2:3 portrait. `getPoseSetGrid(id)` returns `{ cols, rows, total }`. 6-step wizard: Character → Style & Model → Props → Refinements → Results → Cell Editor. Generation: `characters × styles × poseSets` cartesian product, 4-concurrent limit. Edit models use synchronous `fal.run` with fallback chain; generate models use `queue.fal.run`. Background mode: "White Background" (default) or "Scene Environment" (contextual backgrounds for R2V-compatible references). Controlled via `backgroundMode`/`sceneEnvironment` in `buildTurnaroundPrompt()`.

**Provider Health Dashboard** (`api/providers/health.js` + `CostDashboardPage.jsx` + `ProviderStatusChip.jsx`): `/api/providers/health` checks OpenAI, FAL.ai, Wavespeed in parallel. Header chip → `/costs` dashboard. Spend data from `cost_ledger` table.

**Video Style Presets** (`api/lib/videoStylePresets.js`): 86 motion/cinematography presets across 6 categories (Realistic, Professional, Artistic, Faceless, Kids, utility). Each has `thumb`, `description`, and `prompt` (full 150-word cinematography direction). API: `/api/styles/video` via `listVideoStyles()`. Used by Shorts Workbench and Storyboard.

**Cohesive Prompt Builder** (`api/prompt/build-cohesive.js`): GPT-powered prompt assembly service. Accepts structured creative inputs (description, style, props, negative prompt, brand guide, lighting, camera angle, mood, etc.) from any tool and uses OpenAI to compose a single optimized generation prompt. Used by Imagineer T2I, I2I editing, Turnaround, and Storyboard.

**LinkedIn Posting Tool** (`src/pages/LinkedInPage.jsx` + `api/linkedin/` + `src/components/linkedin/`): Content creation at `/linkedin`. Two-panel: topic queue (left) + post feed (right). Topic discovery: keyword search (`search-keyword` → scored previews → `add-search-result` inserts) or paste URL (`add-topic`). Scoring via GPT-4.1 mini + Exa API. Post generation: 3 GPT-4.1 variations per topic (Contrarian, Story-Led, Data/Stat Punch). Images generated at creation time (not publish): gpt-5-mini excerpt → Nano Banana 2 → branded 1080×1080 composition via `sharp` (`api/lib/composeImage.js` + `api/lib/colorTemplates.js`, 6 templates). 13 API endpoints under `/api/linkedin/*`. DB tables: `linkedin_config`, `linkedin_topics`, `linkedin_posts`. Migration: `supabase-migration-linkedin.sql`. Fonts required in Docker: `fonts-dejavu-core`, `fonts-liberation`.

## AI Models & Providers

~50 endpoints across **FAL.ai** (~43) and **Wavespeed** (~7). All accessed via `FAL_KEY` or `WAVESPEED_API_KEY` resolved through `getUserKeys()`. For full model details (endpoints, providers, `buildBody()`/`parseResult()` signatures), read `api/lib/modelRegistry.js`. Individual API files in `api/` contain provider-specific logic.

## Other API Subsystems

**Upscaler**: Topaz Standard V2 (`fal-ai/topaz/upscale/image`) — used in `api/viewer3d/generate.js` and `api/jumpstart/generate.js` to upscale cell/reference images before downstream processing. Queue-based (submit → poll → result). Config: `model: 'Standard V2'`, `upscale_factor: 2`, `face_enhancement: false`. Replaced SeedVR which added destructive AI inference to small images.

**3D Viewer** (`api/viewer3d/` + `ThreeDViewerModal.jsx`): Image-to-3D via Hunyuan 3D Pro ($0.375/gen). Front image required + up to 7 optional angles. Uses `@google/model-viewer` web component. GLB stored in Supabase `media/3d/{userId}/`. Cell images are upscaled via Topaz before submission.

**Smoosh** (`api/smoosh/`): Image blending. **Lens** (`api/lens/`): Multi-angle generation. **Trip** (`api/trip/`): Video restyle. **TryStyle** (`api/trystyle/`): Virtual try-on with polling. **Audio** (`api/audio/`): Captions, music, voiceover endpoints. **Voice** (`api/voice/` + `api/voices/`): Voice preview and library browsing. **Brand** (`api/brand/`): Brand kit management (logo, colors, PDF guidelines, background removal, avatar training). Data in `brand_kit` table. **Library** (`api/library/`): Image library with tag system. Tag tables: `image_tags` + `image_tag_links`. Tag endpoints at `/api/library/tags/*`. Migration: `supabase-migration-tags.sql`. **Images** (`api/images/`): Search (SERP/Google CSE), import-url, edit, inpaint — separate from Imagineer. **Animate** (`api/animate/`): Standalone I2V, separate from JumpStart. **Costs** (`api/costs/summary.js`): Cost summary for Provider Health Dashboard.

**Proposal Pages** (`src/pages/ProposalPage.jsx`): Password-gated client proposals. `PasswordGate` component checks `sessionStorage` for unlock state; `ProposalContent` renders the actual page. Public route at `/proposal/hamilton-city-council`, with `/proposals` redirecting there. No auth required — password is client-side only (`TraceyGrayson`). HCC logo loaded as SVG from Wikimedia Commons.

**Cost Logger** (`api/lib/costLogger.js`): Tracks per-user API spend across all providers. Called from generation endpoints with model, token counts, and username. Dashboard at `CostDashboardPage.jsx`.

**Shorts Templates** (`api/lib/shortsTemplates.js`): 20 niche definitions — each has scene structure, music mood, voice pacing, `visual_mood` (atmosphere/color guidance for image generation), default voice, script system prompt, and visual style. Niches range from AI/Tech to Paranormal/UFO. Used by the Shorts Workbench (`api/workbench/workbench.js`) for niche-aware music, frame generation (LLM prompt synthesis uses `visual_mood`), and voice style defaults. Frontend niche data (cards, voice styles, visual moods) lives in `ShortsWorkbenchPage.jsx`.

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
- Tag tables (`image_tags`, `image_tag_links`) require migration `supabase-migration-tags.sql`. Without it, the library shows 404/500 errors on tag queries.
- `.env` lines must each have their own newline — concatenated lines silently break dotenv parsing.
- `api/lora/seed-library.js` is a CLI script (`node api/lora/seed-library.js`), not an Express handler. Don't register it as a route.
- Migrations are loose SQL files at project root (`supabase-migration.sql`, `supabase-migration-v2.sql` through `v8`, plus `-tags`, `-storyboard-presets`, `-shorts-overhaul`, `-linkedin`, `-app-source`, `-library-metadata`, `-proposal-media`, `-storyboard-system`) and in `api/migrations/`. Not managed by Supabase CLI.
- Vite dev server runs on port 4390 (not the default 5173).
- Some routes return immediately and do background work (e.g., `generate-thumbnails`). Check for `res.json()` before async blocks.
- Webhook routes (`/api/webhooks/content`, `/api/article/from-url`, `/api/article/bulk`) skip auth — they use webhook secrets or brand_username verification instead.
- All Veo 3.1 endpoints (`generate.js`, `extend.js`) use `auto_fix: true` so FAL rewrites prompts that trigger content policy (copyrighted brand names). The Cohesive Prompt Builder's storyboard system prompt also strips brand names (Pixar, Disney, DreamWorks, Cocomelon, etc.) proactively. All style preset files are now brand-free — brand names have been stripped from `videoStylePresets.js`, `stylePresets.js`, `visualStyles.js`, `visualStylePresets.js`, and `api/imagineer/generate.js`. If Veo R2V returns 422 "no_media_generated", check for brand names in the prompt.
- FAL CDN URLs (`v3b.fal.media`, `fal.media`) are temporary and expire within hours. Always upload generated media to Supabase storage via `uploadUrlToSupabase()` or the `/api/library/save` endpoint before storing URLs in the database or displaying them in production pages. The Shorts Workbench does this automatically via `animateImageV2`.
- Video model duration formats differ by provider: Veo 3.1 accepts ONLY `'4s'`, `'6s'`, `'8s'` — any other value (including `'5s'`, `'7s'`) causes a 422 error. The `veoDuration()` function in modelRegistry.js maps: ≤4→4s, ≤6→6s, else→8s. Kling/Wan/PixVerse use `"5"`/`"10"` (string number), Wavespeed uses integer `5`/`8`, some models (Hailuo, Wan Pro) don't accept duration at all. The model registry handles this — don't hardcode duration format.
- `/shorts/new` redirects to `/shorts/workbench` (the Shorts Workbench). The old Shorts wizard in `CampaignsNewPage.jsx` has been removed — that page now only handles Ad campaigns. `ShortsWizardPage.jsx` is dead code. Draft review at `/shorts/draft/:draftId`. Workbench drafts saved via `/api/workbench/save-draft`.
- `/templates` route exists (`TemplatesPage.jsx`) — undocumented but live. `JumpStartVideoStudioModal.jsx` and `MotionTransferModal.jsx` are additional modals in `src/components/modals/` used by the Video Ad Creator.
- LoRA configs from the frontend use `{ loraUrl, triggerWord, scale }` but FAL expects `{ path, scale }`. The pipeline transforms this — don't pass raw loraConfigs to `generateImageV2` without mapping `loraUrl` → `path`.
- `generate_audio` is only supported by Kling v3, Kling O3, Veo 3.1, and Grok R2V. Passing it to other video models will cause errors. The frontend toggle only shows for these models. **Grok R2V defaults `generate_audio` to true if omitted** — always send `generate_audio: false` explicitly unless the user toggled audio on.
- Veo 3.1 R2V cannot handle reference images with plain white/blank backgrounds (e.g., standard turnaround sheets). References MUST have contextual scene backgrounds — white-background illustrated/cartoon art consistently fails with 422 `no_media_generated` after ~90s. Grok R2V handles white-background references fine. For turnaround images intended as R2V references, use the "Scene Environment" background mode in the Turnaround wizard.
- `api/lib/modelRegistry.js` image models use either `image_size` (Flux, SeeDream, Ideogram) or `aspect_ratio` (Imagen4, Kling Image, Grok) — check the registry's `buildBody()` before adding new models.
- Tag routes in server.js must be registered in specificity order: `/api/library/tags/auto-tag`, `/api/library/tags/assign`, `/api/library/tags/unassign` BEFORE the catch-all `/api/library/tags`. Express matches first registered route.
- Turnaround `buildTurnaroundPrompt` expression conflict resolution (swapping Row 2 expressions when negative prompt conflicts) only runs for `poseSet === 'standard-24'`. Other pose sets define their own rows and skip this logic entirely.
- Design specs live in `docs/superpowers/specs/`, implementation plans in `docs/superpowers/plans/`. Check these before starting related work — they contain architecture decisions and reviewed requirements.
- Imagineer has its own `STYLE_PROMPTS` map (~86 styles) in `api/imagineer/generate.js` — separate from the 14 visual styles in `api/lib/visualStyles.js` (Shorts only). Don't confuse the two.
- In `ImagineerModal.jsx`, `isWavespeed` (line ~278) is misleadingly named — it actually means `multiImage` (true for nano-banana-2 too, not just Wavespeed models). The actual provider check is `isWavespeedModel = i2iModel.startsWith('wavespeed-')` on line ~465. When debugging I2I routing, check both variables.
- nano-banana-2/edit multi-image composition requires explicit composition prompts ("composite the character into the scene, matching lighting and perspective") — vague prompts produce sticker-on-background results rather than natural composites.
- The `/api/imagineer/result` poller uses a model-to-endpoint map and truncates FAL paths to 2 segments for queue URLs. Edit models get a `-edit` suffix appended to the model ID so the poller resolves the correct endpoint.
- `cost_ledger` categories map to providers on the dashboard: `openai` → OpenAI, `fal` → FAL.ai, `wavespeed` → Wavespeed, `elevenlabs` → FAL.ai (goes through FAL proxy). Use these exact category strings when calling `logCost()`.
- `ProposalPage` uses a `PasswordGate` → `ProposalContent` split. `useScrollAnimation` must run inside `ProposalContent` (not the parent), otherwise `[data-animate]` elements are invisible after unlock because the IntersectionObserver fires before content mounts.
- 5 Radix UI packages are installed but unused: `react-dropdown-menu`, `react-progress`, `react-slider`, `react-switch`, `react-tooltip`. Safe to remove.
- Dead code files: `src/pages/SetupKeys.jsx`, `src/components/modals/StoryboardPlannerModal.jsx`, `src/components/storyboard/StoryboardEditor.jsx`, and `src/components/modals/StoryboardPlannerWizard.jsx` are dead code — don't route to or extend these. `src/pages/ShortsWizardPage.jsx` is imported in `App.jsx` but has no route pointing to it — effectively dead, don't extend it. The active storyboard page is `StoryboardWorkspace.jsx` at `/storyboards/:id`.
- The `jobs` table stores `campaign_id` inside the `input_json` JSONB column, not as a top-level column. To query by campaign: use PostgREST JSONB filter `.eq('input_json->>campaign_id', id)`, not `.eq('campaign_id', id)`. The `ad_drafts` table does have a top-level `campaign_id` column — don't confuse the two.
- `src/lib/api.js` `apiFetch` never checks `response.ok` — 4xx/5xx responses are silently parsed as success data. Any error handling on the frontend must account for this.
- Five separate preset/style systems exist: (1) Visual Styles (`api/lib/visualStyles.js` — 14 styles, Shorts image generation), (2) Style Presets (`src/lib/stylePresets.js` — 123 styles, shared StyleGrid), (3) Video Style Presets (`api/lib/videoStylePresets.js` — 86 motion styles), (4) Turnaround Pose Sets (`api/lib/turnaroundPoseSets.js` — 7 pose layouts including 2×2 3D-optimized, turnaround-only), (5) Video Style Frameworks (`api/lib/videoStyleFrameworks.js` — 76 structural frameworks, Shorts Workbench). Frameworks are structural (scene count, TTS mode, overlays); presets are visual (cinematography). Each has a frontend mirror that must stay in sync manually.
- Visual style `promptText` values in `src/lib/stylePresets.js` are now detailed 40-80 word descriptions (not 1-2 word labels). Maintain this level of detail when adding new styles — short prompts produce noticeably worse image generation results.
- Video style presets (86) and visual style presets (123) both auto-load via API (`/api/styles/video` and `StyleGrid` component) — no manual wiring needed when adding new presets.
- `src/lib/stylePresets.js` uses a `T` object mapping key names to FAL CDN thumbnail URLs. When adding new thumbnails, ensure no duplicate keys exist in `T` — JS objects use last-defined key, silently overriding earlier definitions. Generate thumbnails via `scripts/generate-style-thumbs.js` (batch 1) or `scripts/generate-style-thumbs-2.js` (batch 2) using FAL Nano Banana 2.
- After completing code changes, always check if a Fly.io deploy is needed (`git log origin/main..HEAD` for unpushed commits, then `fly deploy`). Previous sessions may have pushed code but not deployed.
- When resuming from a previous session, check `git log --oneline -5` before re-investigating — work may already be committed.
- `pollFalQueue` uses the full model endpoint path for queue URLs (e.g. `fal-ai/ffmpeg-api/compose`, not `fal-ai/ffmpeg-api`). Never truncate multi-segment FAL paths — it causes 404s.
- `extractLastFrame` uses `frame_type: 'last'` (not manual `frame_time` calculation). The FAL extract-frame API supports `'first'`, `'middle'`, `'last'`.
- Shorts Workbench always forces `generate_audio: false` for video clips — it has its own voiceover + music.
- Music must ALWAYS be instrumental (`lyrics_prompt: '[Instrumental]'`), never lyrics.
- Captions use `fal-ai/workflow-utilities/auto-subtitle` (NOT `fal-ai/auto-caption` which was replaced). Output is `output.video.url`.
- Grok Imagine Extend (`xai/grok-imagine-video/extend-video`) returns the original video + extension stitched together, not just the extension. Input video must be MP4 (H.264/H.265/AV1), 2-15s long. Extension duration: 2-10s (default 6). Unlike Veo 3.1 Extend, it has no audio support.
- `uploadUrlToSupabase` extension detection: falls back to URL extension and folder name when content-type is ambiguous. The `pipeline/finals` folder forces `.mp4`. Previously defaulted everything unknown to `.mp3` which broke video files.
- `toast.success()` and `toast.info()` are silenced globally in `App.jsx` — only `toast.error()` and `toast.warning()` display to the user. Don't add new success/info toasts expecting them to appear.
- `SlideOverPanel` (`src/components/ui/slide-over-panel.jsx`) has an `onPointerDownOutside` handler that prevents the modal from closing when clicking floating elements (notifications, toasts) that render outside the dialog at `fixed bottom-*` positions. The "Image Generated" notification in `VideoAdvertCreator.jsx` also has `onPointerDown` stopPropagation for the same reason. Both are needed — removing either re-introduces the close-on-notification-click bug.
- Multi-style bulk generation (Imagineer T2I, Imagineer I2I, Edit Image) uses `CONCURRENCY = 2` batching — firing all `build-cohesive` + generation calls simultaneously causes 502s from stacked OpenAI/provider API calls. Always batch with `Promise.allSettled` in groups of 2.

## Verification Rules

Verification (build check, screenshot, snapshot, etc.) is **NOT required** for:
- Comment additions or removals
- Formatting or whitespace changes
- Import reordering
- Variable renaming with no logic change
- Documentation updates
- Data-only preset/style changes (adding styles, updating thumbnail URLs, adjusting prompt text)

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
- **CI/CD**: No auto-deploy. Must manually run `fly deploy` after pushing to `main`. A GitHub Actions workflow file exists (`.github/workflows/fly-deploy.yml`) but is not active.
- **Docker**: Multi-stage `Dockerfile` at project root (deps → builder → runner). Used by Fly.io builds.
- Fly.io deploys can fail with lease conflicts if a previous deploy is still rolling out. Wait ~60s and retry `fly deploy`.
- Deploying restarts the Fly machine and KILLS any running pipeline mid-generation. Never deploy during active generation. ALWAYS: `git push` first, THEN `fly deploy`.
