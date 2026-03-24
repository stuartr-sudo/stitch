# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start      # Express API (port 3003) + Vite dev server (port 4390) concurrently
npm run server     # Express API only (port 3003)
npm run dev        # Vite frontend only (port 4390)
npm run build      # Production build → dist/
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

**Model Registry** (`api/lib/modelRegistry.js`): Declarative config for all AI models — 7 image models (Flux 2, SeedDream v4.5, Imagen 4, Kling Image v3, Grok Imagine, Ideogram v2, Wavespeed) and 10 video models (Kling 2.0 Master, Kling V3 Pro, Kling O3 Pro, Veo 2, Veo 3, Wan 2.5, Wan Pro, PixVerse v4.5, Hailuo/MiniMax, Wavespeed WAN). Each entry has `provider`, `endpoint`, `buildBody()`, `parseResult()`, and `pollConfig`. New models go here, not in if-else chains.

**Media Generator** (`api/lib/mediaGenerator.js`): Generic dispatcher — `generateImageV2()` and `animateImageV2()` look up the model in the registry and handle provider-specific auth/polling. Replaces ~360 lines of per-model branching.

**Pipeline Helpers** (`api/lib/pipelineHelpers.js`): Shared polling logic for Wavespeed and FAL.ai async generation. `generateImage()` and `animateImage()` are backward-compat wrappers that delegate to `mediaGenerator.js`. Also exports `pollWavespeedRequest()`, `pollFalQueue()`, `uploadUrlToSupabase()`, `assembleShort()`, `generateMusic()`.

**Shorts Pipeline** (`api/lib/shortsPipeline.js`): End-to-end Shorts creation — script → images → video clips → voiceover → music → captions → concat → draft. Per-scene checkpointing to `jobs.step_results`. Structured error reporting to `jobs.last_error`. Entry point: `api/campaigns/create.js`.

**Script Generator** (`api/lib/scriptGenerator.js`): OpenAI structured output for Shorts scripts. Produces scenes with narration, visual descriptions, and scene 1 image description. Supports `targetDurationSeconds` for length presets (30s/45s/60s/90s).

**Visual Styles** (`api/lib/visualStyles.js`): 14 visual style presets across 3 categories — Illustration (Pixel Art, Ghibli, Pixar, Cartoon, 8-bit, Manga, Comic Book, Pixar 3D), Realistic (Photorealistic, Cinematic, Documentary), Painting (Watercolor, Oil, Impressionist). Thumbnails in `public/assets/styles/`. Frontend mirror: `src/lib/visualStylePresets.js`.

**Topic Suggestions** (`src/lib/topicSuggestions.js`): 3-level progressive topic funnel per niche (Category → Angle → Hook). Selected levels concatenate into the topic string passed to the researcher/script generator. All 20 niches have custom funnels.

**Scene Builder Pills** (`src/lib/scenePills.js`): Niche-aware visual direction helpers for the script step. `getScenePillsForNiche(niche)` returns curated environment, object, and atmosphere pills per niche plus shared camera pills. Selected pills are passed as `visual_directions` to the script generator.

**Workflow Engine** (`api/lib/workflowEngine.js`): Persistent state machine for long-running jobs (article→video pipeline). Steps: scrape → analyze → match_templates → create_campaign → generate_assets → concat → upload → finalize. State stored in `jobs` table. Supports pause/resume/retry.

**Voiceover Generator** (`api/lib/voiceoverGenerator.js`): ElevenLabs TTS via FAL.ai proxy (`fal-ai/elevenlabs/tts/eleven-v3`) — only needs `FAL_KEY`, no separate ElevenLabs subscription. Includes legacy voice ID → FAL voice name mapping. Also exports Whisper-based word-level timestamp generation for caption sync.

**Scheduled Publisher** (`api/lib/scheduledPublisher.js`): Polls for drafts with scheduled publish times and pushes to YouTube.

**Storyboard Planner** (`src/components/modals/StoryboardPlannerWizard.jsx` + `api/storyboard/` + `src/components/storyboard/`): 7-step wizard for multi-scene video sequences. Story & Mood → Story Builder (conversational AI chat) → Visual Style → Video Style (optional, fetches from `/api/styles/video`) → Scene Builder → Characters (conditional) → Generate. The Story Builder (`/api/storyboard/story-chat`) uses GPT-4.1 mini to guide users through their story scene by scene, then extracts structured beats via Zod. Scene Builder has per-scene model/mode selection — each scene can use a different video model (Veo 3.1 Reference-to-Video, Veo 3.1 First-Last-Frame, Kling O3 R2V, Kling O3 V2V, etc.). Scene 1 settings cascade as defaults to subsequent scenes. Characters step only appears when reference models are selected and shows model-aware UI: Kling R2V uses @Element1-4 system (`CharactersKling.jsx`), Veo 3.1 uses flat `image_urls` array (`CharactersVeo.jsx`). Generates videos sequentially with frame chaining. Video generation goes through JumpStart endpoints, not the Shorts pipeline.

**JumpStart** (`api/jumpstart/`): Image/video generation endpoints used by both the Video Ad Creator and Storyboard Planner. 6 endpoints: `generate` (FormData with image blob), `result` (poll async), `save-video`, `edit`, `extend`, `erase`. Models are selected client-side and passed as form field — the backend dispatches to the appropriate provider. Supports Veo 3.1 variants (reference-to-video, fast, first-last-frame), Kling O3 R2V (character references), Kling O3 V2V (video-to-video restyle/refinement), Seedance, Grok, and Wavespeed WAN.

**Imagineer** (`src/components/modals/ImagineerModal.jsx` + `api/imagineer/`): AI image generation and editing suite with two modes — Text-to-Image (4-step wizard: Subject → Style → Enhance → Output) and Image-to-Image (edit existing images). T2I models: Nano Banana 2, Seedream v4, Flux 2 (LoRA). I2I models add Wavespeed Nano Ultra and Qwen Image Edit for multi-image blending. Has its own 100+ style presets map in `generate.js` (separate from `api/lib/visualStyles.js` which is Shorts-only). Reference images are analyzed via GPT-4.1 mini vision (`describe-character.js`). All structured inputs are assembled into prompts by the shared Cohesive Prompt Builder.

**Turnaround Sheet** (`api/imagineer/turnaround.js` + `TurnaroundSheetWizard.jsx`): Generates a 4×6 character turnaround grid (24 poses) in a single image. 6-step wizard: Character → Style & Model → Props → Refinements → Results → Cell Editor. Edit models use synchronous `fal.run` with automatic fallback chain; generate models use `queue.fal.run` with frontend polling. Supports 6 models, categorized props, negative prompt conflict resolution, and brand style guides.

**Provider Health Dashboard** (`api/providers/health.js` + `src/pages/CostDashboardPage.jsx` + `src/components/ProviderStatusChip.jsx`): Multi-provider API monitoring. `/api/providers/health` checks all 3 provider keys in parallel — OpenAI (costs API + models fallback), FAL.ai (queue endpoint check), Wavespeed (predictions check). Header chip shows 3 colored dots (green/amber/red per provider), clicks through to `/costs` dashboard. Dashboard shows per-provider cards (status, spend, calls, billing link), stacked daily spend chart, model breakdown, and operation breakdown. Spend data from `cost_ledger` table; OpenAI also has real API spend via admin keys. Old `api/openai/balance.js` still exists for backward compat.

**Video Style Presets** (`api/lib/videoStylePresets.js`): 32 motion/cinematography presets across 6 categories — Realistic (iPhone Selfie, UGC, TikTok, FaceTime, Vlog/BTS, Podcast), Professional (Cinematic, Documentary, Commercial, Product Demo, Corporate, Real Estate), Artistic (Dreamy, Vintage, Noir, Anime, Cyberpunk, Fantasy, Stop Motion, Watercolor), Faceless (Cinematic, Tech, Nature, Abstract, Dark/Horror, Food, Travel, Luxury), Kids (Kids Cartoon, Whiteboard/Explainer), and utility (Motion Graphics, Stock B-Roll). Each has `thumb` URL, `description` (UI label), and `prompt` (full 150-word cinematography direction). API: `/api/styles/video` returns all via `listVideoStyles()`. Used by Shorts pipeline (`shortsPipeline.js` calls `getVideoStylePrompt()`) and Storyboard (`generateSingleScene` appends `preset.prompt` to generation prompt).

**Cohesive Prompt Builder** (`api/prompt/build-cohesive.js`): GPT-powered prompt assembly service. Accepts structured creative inputs (description, style, props, negative prompt, brand guide, lighting, camera angle, mood, etc.) from any tool and uses OpenAI to compose a single optimized generation prompt. Used by Imagineer T2I, I2I editing, Turnaround, and Storyboard.

## Other API Subsystems

**Smoosh** (`api/smoosh/`): Image combination/blending tool. **Lens** (`api/lens/`): Image generation endpoint. **Trip** (`api/trip/`): Video restyle. **TryStyle** (`api/trystyle/`): Style try-on with polling. **Audio** (`api/audio/`): Captions, music, and voiceover generation endpoints. **Voice** (`api/voice/` + `api/voices/`): Voice preview and ElevenLabs voice library browsing.

**Proposal Pages** (`src/pages/ProposalPage.jsx`): Password-gated client proposals. `PasswordGate` component checks `sessionStorage` for unlock state; `ProposalContent` renders the actual page. Public route at `/proposal/hamilton-city-council`, with `/proposals` redirecting there. No auth required — password is client-side only (`TraceyGrayson`). HCC logo loaded as SVG from Wikimedia Commons.

**Cost Logger** (`api/lib/costLogger.js`): Tracks per-user API spend across all providers. Called from generation endpoints with model, token counts, and username. Dashboard at `CostDashboardPage.jsx`.

**Shorts Templates** (`api/lib/shortsTemplates.js`): 20 niche definitions for the Shorts pipeline — each has scene structure, music mood, voice pacing, default voice, script system prompt, and visual style. Niches range from AI/Tech to Paranormal/UFO. Used by `api/campaigns/research.js` to validate niche and by the script generator for tone/style. Frontend niche cards with topic counts live in the `NICHES` array in `CampaignsNewPage.jsx`.

**YouTube Tokens** (`api/lib/youtubeTokens.js`): OAuth token management for YouTube publishing. Handles refresh flow. Used by Scheduled Publisher.

## Environment

All env vars documented in `.env.example`. Canonical names:
- `WAVESPEED_API_KEY` (never `WAVESPEED_KEY`)
- `FAL_KEY`
- `OPENAI_API_KEY`
- `OWNER_EMAIL` — email used for API key fallback (getUserKeys checks this)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (backend)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend — must be prefixed `VITE_`)
- `SEARCHAPI_KEY` (or `SERP_API_KEY`) — Shorts Researcher real-time news search
- `FIRECRAWL_API_KEY` — blog/URL scraping for article→video webhook
- `WEBHOOK_SECRET` — shared secret for `/api/webhooks/content` auth

## Gotchas

- `public/` directory contents are copied to `dist/` by Vite on build and served as static assets. In dev, Vite serves them directly. Style thumbnails live at `public/assets/styles/`.
- `.env` lines must each have their own newline — concatenated lines silently break dotenv parsing.
- `api/lora/seed-library.js` is a CLI script (`node api/lora/seed-library.js`), not an Express handler. Don't register it as a route.
- Migrations are loose SQL files at project root (`supabase-migration-v*.sql`), not managed by Supabase CLI.
- Vite dev server runs on port 4390 (not the default 5173).
- Some routes return immediately and do background work (e.g., `generate-thumbnails`). Check for `res.json()` before async blocks.
- Webhook routes (`/api/webhooks/content`, `/api/article/from-url`, `/api/article/bulk`) skip auth — they use webhook secrets or brand_username verification instead.
- Video model duration formats differ by provider: Veo uses `'5s'`/`'8s'` (string with suffix), Kling/Wan/PixVerse use `"5"`/`"10"` (string number), Wavespeed uses integer `5`/`8`, some models (Hailuo, Wan Pro) don't accept duration at all. The model registry handles this — don't hardcode duration format.
- `/shorts/new` redirects to `/campaigns/new?type=shorts` — the actual wizard lives in `CampaignsNewPage.jsx` (not `ShortsWizardPage.jsx`, which is dead code). Draft review at `/shorts/draft/:draftId`.
- LoRA configs from the frontend use `{ loraUrl, triggerWord, scale }` but FAL expects `{ path, scale }`. The pipeline transforms this — don't pass raw loraConfigs to `generateImageV2` without mapping `loraUrl` → `path`.
- `generate_audio` is only supported by Kling v3, Kling O3, Veo 3, and Veo 3.1 variants. Passing it to other video models will cause errors. The frontend toggle only shows for these models. In the Storyboard Planner, audio is controlled per-scene based on the selected model's `supportsAudio` flag in `SCENE_MODELS`.
- `api/lib/modelRegistry.js` image models use either `image_size` (Flux, SeeDream, Ideogram) or `aspect_ratio` (Imagen4, Kling Image, Grok) — check the registry's `buildBody()` before adding new models.
- Imagineer edit models (Nano Banana 2 Edit, Seedream Edit) use synchronous `fal.run` (not `queue.fal.run`) because queue polling is unreliable for edit endpoints. The turnaround endpoint has automatic model fallback on 5xx errors.
- Imagineer has its own `STYLE_PROMPTS` map (~100 styles) in `api/imagineer/generate.js` — these are separate from the 14 visual styles in `api/lib/visualStyles.js` (which are for Shorts only). Don't confuse the two.
- The `/api/imagineer/result` poller uses a model-to-endpoint map and truncates FAL paths to 2 segments for queue URLs. Edit models get a `-edit` suffix appended to the model ID so the poller resolves the correct endpoint.
- `cost_ledger` categories map to providers on the dashboard: `openai` → OpenAI, `fal` → FAL.ai, `wavespeed` → Wavespeed, `elevenlabs` → FAL.ai (goes through FAL proxy). Use these exact category strings when calling `logCost()`.
- Proposal page HCC logo uses an external SVG (`upload.wikimedia.org`). If it breaks, the fallback is in Supabase storage at `images/proposals/hamilton-cc-logo.png` (low-res).
- The password for the proposal page (`TraceyGrayson`) is hardcoded in `ProposalPage.jsx` — client-side only, not secure. It's a convenience gate, not real auth.
- CampaignsNewPage `handleGenerateScript` must check `res.ok` and `data.error` before accessing `data.script.scenes`. The preview-script API returns `{ script, niche }` on success but `{ error }` on failure — without the check, errors fall through silently and the UI does nothing.
- `ProposalPage` uses a `PasswordGate` → `ProposalContent` split. `useScrollAnimation` must run inside `ProposalContent` (not the parent), otherwise `[data-animate]` elements are invisible after unlock because the IntersectionObserver fires before content mounts.
- The `[Verification Required]` Stop callback comes from Claude Preview's `<verification_workflow>` system prompt, not an editable hook file. It fires when code is edited while a preview server is running. Override behavior via the Verification Rules section below.
- 5 Radix UI packages are installed but unused: `react-dropdown-menu`, `react-progress`, `react-slider`, `react-switch`, `react-tooltip`. Safe to remove.
- Dead code files (never imported): `src/pages/ShortsWizardPage.jsx`, `src/pages/SetupKeys.jsx`, `src/components/modals/StoryboardPlannerModal.jsx`. Don't route to or extend these.
- `src/lib/api.js` `apiFetch` never checks `response.ok` — 4xx/5xx responses are silently parsed as success data. Any error handling on the frontend must account for this.
- Three separate style systems exist: (1) Visual Styles (`api/lib/visualStyles.js` — 14 styles, Shorts image generation prompt suffixes), (2) Style Presets (`src/lib/stylePresets.js` — ~130 styles with FAL.ai thumbnails, shared `StyleGrid` component used by Shorts "Look & Feel" step and Storyboard "Visual Style" step), (3) Video Style Presets (`api/lib/videoStylePresets.js` — 32 motion styles, used by Shorts "Motion Style" step and Storyboard "Video Style" step). Don't confuse these — they control different aspects (image look vs motion feel).
- SceneCard (`src/components/storyboard/SceneCard.jsx`) is a prop-driven extracted component. When adding features to the Storyboard Scene Builder step, add both the prop to SceneCard AND wire it up in StoryboardPlannerWizard where SceneCard is rendered (~line 1411). The Imagineer "Generate" button for starting images uses `onGenerateStartImage` → `setShowImagineerForStartFrame(true)`.
- After completing code changes, always check if a Fly.io deploy is needed (`git log origin/main..HEAD` for unpushed commits, then `fly deploy`). Previous sessions may have pushed code but not deployed.
- When resuming from a previous session, check `git log --oneline -5` before re-investigating — work may already be committed. Don't re-verify things that git history confirms are done.

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
- Fly.io deploys can fail with lease conflicts if a previous deploy is still rolling out. Wait ~60s and retry `fly deploy`.
