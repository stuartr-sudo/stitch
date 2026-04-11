# AI-Powered Product Description for Ads Manager

**Date:** 2026-04-02
**Status:** Approved

## Problem

The Ads Manager campaign creation form has a plain-text "Product / Service Description" field that requires manual entry. Users should be able to auto-populate this field by scraping any URL, importing Brand Kit data, or combining both — with an LLM synthesizing a cohesive description rather than concatenating raw data.

## Design

### Frontend — Auto-fill Panel (`AdsManagerPage.jsx`)

A collapsible "Auto-fill with AI" panel above the existing Product Description textarea. Default state: **collapsed**.

**Expanded panel contains:**
- **URL checkbox + text input** — paste any webpage URL to scrape
- **Brand Kit checkbox + dropdown selector** — lists user's brand kits by name; shows "Create Brand Kit" link when none exist
- **"Generate Description" button** — disabled unless at least one source is checked; shows loading spinner during synthesis

**Brand Kit dropdown loading:** Fetch user's brand kits on component mount via `apiFetch('/api/brand/list')` (existing endpoint). Only need `id` and `brand_name` for the dropdown. If the list is empty, show a "Create Brand Kit" link that opens the `BrandKitModal`. Dropdown defaults to first kit if only one exists.

**Behavior:**
- Checking a source enables its input field; unchecking grays it out
- At least one source must be checked to enable the generate button
- AI-synthesized text populates the textarea, replacing any existing content. If textarea is non-empty, show a brief confirmation ("Replace existing description?") before overwriting.
- Textarea remains fully editable after generation — users can tweak the output
- Panel stays expanded after generation so users can regenerate with different inputs
- **Loading states:** Show progressive status text on the button — "Scraping URL..." (during Firecrawl) then "Generating description..." (during OpenAI). Expected latency: 10-30 seconds depending on URL complexity.
- **Error handling:** Since `apiFetch` does not check `response.ok`, the frontend must check `response.success` explicitly. Display errors inline below the Generate button (red text), not as toasts (success/info toasts are silenced globally).

### Backend — New Endpoint

**`POST /api/ads/synthesize-description`** (requires `authenticateToken`)

**Request body:**
```json
{
  "url": "https://example.com/product",  // optional, any webpage
  "brand_kit_id": "uuid"                 // optional, user's brand kit
}
```
At least one of `url` or `brand_kit_id` must be provided.

**Processing flow:**
1. **URL scraping** (if provided): Use Firecrawl API (same pattern as `api/brand/extract-url.js`) to scrape the URL and get markdown content. Truncate to 30,000 characters. Firecrawl call timeout: 30 seconds. If scraped content is under 100 characters, still attempt synthesis but include a note that limited content was found.
2. **Brand Kit fetch** (if provided): Query `brand_kit` table for all fields where `id = brand_kit_id` and `user_id = req.user.id`. All fields are included: identity (brand_name, blurb, tagline, target_market, website), voice (brand_personality, brand_voice_detail, voice_style, content_style_rules), visual (colors, style_preset, visual_style_notes, mood_atmosphere, lighting_prefs, composition_style), and guidelines (preferred_elements, prohibited_elements, ai_prompt_rules, taglines, logo_url).
3. **LLM synthesis**: Send both sources to GPT-4.1-mini (`temperature: 0.7`, `max_tokens: 1000`) with a system prompt instructing it to produce a cohesive product/service description suitable for ad campaign generation. The prompt should emphasize: natural prose (not bullet points or field dumps), focus on what the product/service is and its value proposition, incorporate brand voice and personality if brand kit is provided, keep it to 2-3 paragraphs max. Log cost via `logCost()` with category `'openai'`.
4. **Return**: `{ success: true, description: "..." }`

**Request validation:**
- Neither `url` nor `brand_kit_id` provided → 400 `{ success: false, error: "Provide a URL or select a Brand Kit" }`
- Empty string `url: ""` treated as not provided
- `brand_kit_id` validated as non-empty string before DB query

**Error handling:**
- Invalid/unreachable URL → return `{ success: false, error: "Could not access URL" }`
- Firecrawl timeout (30s) → return `{ success: false, error: "URL took too long to load" }`
- Brand kit not found or not owned by user → return `{ success: false, error: "Brand kit not found" }`
- OpenAI failure → return `{ success: false, error: "Failed to generate description" }`

**API key resolution:** Use `getUserKeys()` for OpenAI key. Use `FIRECRAWL_API_KEY` from `process.env` directly (infrastructure service, not per-user — same as `extract-url.js`).

### Route Registration (`server.js`)

Register as a dynamic route in the ads section:
```js
app.post('/api/ads/synthesize-description', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('ads/synthesize-description.js');
  handler(req, res);
});
```

### What Changes

| File | Change |
|------|--------|
| `src/pages/AdsManagerPage.jsx` | Add collapsible Auto-fill panel above textarea |
| `api/ads/synthesize-description.js` | New file — LLM synthesis endpoint |
| `server.js` | Register new route |

### What Doesn't Change

- `api/ads/generate.js` — still fetches brand context independently for ad copy/image generation
- `BrandKitModal.jsx` — no new fields
- `brand_kit` table schema — no migrations needed
- No new database tables or columns

## Scope Boundary

This feature only populates the product description field. The downstream ad generation pipeline (`generate.js`) already has its own Brand Kit integration and is not modified. The two systems are independent — the description synthesis helps users write better input, while generate.js adds brand context to the AI prompt at generation time.
