# Brand Kit — URL Extraction

**Date:** 2026-04-01
**Status:** Approved

## Summary

Add website URL extraction to the Brand Kit tool. Users paste a URL, the backend scrapes it via Firecrawl, and GPT-4.1-mini extracts structured brand data that auto-fills all Brand Kit form fields — identical to the existing PDF extraction flow.

## Decisions

- **Single page only** — scrape the URL the user provides, no auto-discovery of /about or other pages
- **Firecrawl server-side** — use Firecrawl's HTTP API from the Express backend (not the MCP connection)
- **Mirror PDF pattern** — new standalone endpoint, same Zod schema, same form-fill logic
- **UI in existing bar** — URL input + Extract button added to the bar that already holds the PDF upload button

## Backend

### New endpoint: `POST /api/brand/extract-url`

**File:** `api/brand/extract-url.js`

**Input:**
```json
{ "url": "https://example.com" }
```

**Flow:**
1. Validate URL format (must start with `http://` or `https://`)
2. Call Firecrawl scrape API (`https://api.firecrawl.dev/v1/scrape`) with the URL, requesting markdown output. Auth via `FIRECRAWL_API_KEY` from `process.env` directly (Firecrawl is an infrastructure service, not a per-user AI provider — no `getUserKeys()` needed). Timeout: 30 seconds on the fetch call.
3. Truncate scraped markdown to first 50,000 characters to prevent token blowout on content-heavy pages.
4. Feed scraped markdown to GPT-4.1-mini with the same `BrandExtractSchema` (Zod structured output) used by `extract-pdf.js`. System prompt adapted for web content instead of PDF.
5. Return `{ success: true, extracted: { ...allBrandFields } }`

**Firecrawl response:** Extract content from `response.data.markdown`. If empty/null, return 500 with "Could not extract content from this URL."

**Auth:** `authenticateToken` middleware (standard). OpenAI key via `getUserKeys()`.

**Error responses:**
- 400 — missing or invalid URL
- 405 — non-POST method
- 500 — Firecrawl failure (site unreachable, empty content) or GPT extraction failure

**Zod schema** — copy of the schema from `extract-pdf.js` (duplicated, not shared — intentional per scope):
```
brand_name, brand_username, blurb, website, target_market, brand_personality,
brand_voice_detail, voice_style, content_style_rules, preferred_elements,
prohibited_elements, taglines, colors, style_preset, visual_style_notes,
mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules, logo_url
```

**System prompt** — same field guidance as PDF extraction, with the introduction changed from "Extract from the provided PDF document" to "Extract from this website content."

### Route registration in `server.js`

Add `loadApiRoute('brand/extract-url.js')` in the existing brand routes block, following the same dynamic pattern used by `extract-pdf`.

### Environment

`FIRECRAWL_API_KEY` must be set in env vars (already available via Firecrawl account). Add to `.env.example` with a comment. For deployment: `fly secrets set FIRECRAWL_API_KEY=...`.

## Frontend

### BrandKitModal.jsx changes

**New state:**
- `extractUrl` (string) — the URL input value

**Reused state:**
- `isExtracting` (boolean) — shared with PDF extraction. Only one extraction runs at a time; both buttons disable while either is in progress.

**UI change** — in the existing bar above the tabs (~line 576):

Current: `[Upload PDF Guidelines] [helper text]`

New: `[Upload PDF Guidelines] [Globe icon + URL input + Extract button]`

The URL input uses placeholder `"https://example.com"`, compact width. The Extract button shows a spinner when `isExtracting` is true. Same `border-[#2C666E]/40` styling as the PDF button.

**Handler: `handleUrlExtract`**
1. Validate non-empty, starts with `http://` or `https://`
2. Set `isExtracting = true`
3. `apiFetch('/api/brand/extract-url', { method: 'POST', body: JSON.stringify({ url }) })`
4. Apply extracted fields to form via `setForm(prev => ...)` — same mapping as `handlePdfUpload`
5. Clear `extractUrl` on success
6. `toast.error()` on failure
7. Set `isExtracting = false` in finally block

## Files changed

| File | Change |
|------|--------|
| `api/brand/extract-url.js` | New — endpoint |
| `server.js` | Add route registration |
| `src/components/modals/BrandKitModal.jsx` | Add URL input + Extract button + handler |
| `.env.example` | Add `FIRECRAWL_API_KEY` |

## Not in scope

- Multi-page crawling (scraping /about, /brand, etc.)
- Screenshot-based visual extraction (GPT vision on page screenshot)
- Logo image download/upload to Supabase storage
- Refactoring extract-pdf into a shared service
