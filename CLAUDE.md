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

**Model Registry** (`api/lib/modelRegistry.js`): Declarative config for all AI models — 7 image models (Flux, SeeDream, Imagen4, Kling Image, Grok, Ideogram, Wavespeed) and 10 video models (Kling v2/v3/O3, Veo2/3, Wan 2.5/Pro, PixVerse, Hailuo, Wavespeed Wan). Each entry has `provider`, `endpoint`, `buildBody()`, `parseResult()`, and `pollConfig`. New models go here, not in if-else chains.

**Media Generator** (`api/lib/mediaGenerator.js`): Generic dispatcher — `generateImageV2()` and `animateImageV2()` look up the model in the registry and handle provider-specific auth/polling. Replaces ~360 lines of per-model branching.

**Pipeline Helpers** (`api/lib/pipelineHelpers.js`): Shared polling logic for Wavespeed and FAL.ai async generation. `generateImage()` and `animateImage()` are backward-compat wrappers that delegate to `mediaGenerator.js`. Also exports `pollWavespeedRequest()`, `pollFalQueue()`, `uploadUrlToSupabase()`, `assembleShort()`, `generateMusic()`.

**Shorts Pipeline** (`api/lib/shortsPipeline.js`): End-to-end Shorts creation — script → images → video clips → voiceover → music → captions → concat → draft. Per-scene checkpointing to `jobs.step_results`. Structured error reporting to `jobs.last_error`. Entry point: `api/campaigns/create.js`.

**Script Generator** (`api/lib/scriptGenerator.js`): OpenAI structured output for Shorts scripts. Produces scenes with narration, visual descriptions, and scene 1 image description. Supports `targetDurationSeconds` for length presets (30s/45s/60s/90s).

**Visual Styles** (`api/lib/visualStyles.js`): 14 visual style presets (Cinematic, Anime, Film Noir, Faceless variants, etc.) with prompt fragments, thumbnails, and descriptions. Frontend mirror: `src/lib/visualStylePresets.js`.

**Workflow Engine** (`api/lib/workflowEngine.js`): Persistent state machine for long-running jobs (article→video pipeline). Steps: scrape → analyze → match_templates → create_campaign → generate_assets → concat → upload → finalize. State stored in `jobs` table. Supports pause/resume/retry.

**Voiceover Generator** (`api/lib/voiceoverGenerator.js`): ElevenLabs TTS via FAL.ai proxy (`fal-ai/elevenlabs/tts/eleven-v3`) — only needs `FAL_KEY`, no separate ElevenLabs subscription. Includes legacy voice ID → FAL voice name mapping. Also exports Whisper-based word-level timestamp generation for caption sync.

**Scheduled Publisher** (`api/lib/scheduledPublisher.js`): Polls for drafts with scheduled publish times and pushes to YouTube.

## Environment

All env vars documented in `.env.example`. Canonical names:
- `WAVESPEED_API_KEY` (never `WAVESPEED_KEY`)
- `FAL_KEY`
- `OPENAI_API_KEY`
- `OWNER_EMAIL` — email used for API key fallback (getUserKeys checks this)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (backend)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend — must be prefixed `VITE_`)

## Gotchas

- `.env` lines must each have their own newline — concatenated lines silently break dotenv parsing.
- `api/lora/seed-library.js` is a CLI script (`node api/lora/seed-library.js`), not an Express handler. Don't register it as a route.
- Migrations are loose SQL files at project root (`supabase-migration-v*.sql`), not managed by Supabase CLI.
- Vite dev server runs on port 4390 (not the default 5173).
- Some routes return immediately and do background work (e.g., `generate-thumbnails`). Check for `res.json()` before async blocks.
- Webhook routes (`/api/webhooks/content`, `/api/article/from-url`, `/api/article/bulk`) skip auth — they use webhook secrets or brand_username verification instead.
- Video model duration formats differ by provider: Veo uses `'5s'`/`'8s'` (string with suffix), Kling/Wan/PixVerse use `"5"`/`"10"` (string number), Wavespeed uses integer `5`/`8`, some models (Hailuo, Wan Pro) don't accept duration at all. The model registry handles this — don't hardcode duration format.
- `/shorts/new` redirects to `/campaigns/new?type=shorts` — the actual wizard lives in `CampaignsNewPage.jsx` (not `ShortsWizardPage.jsx`, which is dead code). Draft review at `/shorts/draft/:draftId`.
- LoRA configs from the frontend use `{ loraUrl, triggerWord, scale }` but FAL expects `{ path, scale }`. The pipeline transforms this — don't pass raw loraConfigs to `generateImageV2` without mapping `loraUrl` → `path`.
- `generate_audio` is only supported by Kling v3, Kling O3, and Veo 3. Passing it to other video models will cause errors. The frontend toggle only shows for these models.
- `api/lib/modelRegistry.js` image models use either `image_size` (Flux, SeeDream, Ideogram) or `aspect_ratio` (Imagen4, Kling Image, Grok) — check the registry's `buildBody()` before adding new models.

## Deployment

- **Primary**: Fly.io (`fly.toml`) — Sydney region, Express serves both API and built frontend on port 3000.
- **Fly.io only** — Never use Vercel.
