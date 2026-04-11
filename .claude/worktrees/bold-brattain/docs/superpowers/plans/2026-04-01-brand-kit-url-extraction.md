# Brand Kit URL Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add website URL extraction to the Brand Kit so users can paste a URL and auto-fill all brand fields via Firecrawl scraping + GPT-4.1-mini analysis.

**Architecture:** New backend endpoint `POST /api/brand/extract-url` scrapes a URL with Firecrawl's HTTP API, truncates to 50K chars, feeds to GPT-4.1-mini with Zod structured output (same schema as PDF extraction), returns extracted brand fields. Frontend adds a URL input + Extract button to the existing bar in BrandKitModal.

**Tech Stack:** Express, OpenAI SDK (gpt-4.1-mini + Zod structured output), Firecrawl REST API, React

**Spec:** `docs/superpowers/specs/2026-04-01-brand-kit-url-extraction-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `api/brand/extract-url.js` | Create | Backend endpoint — validate URL, scrape via Firecrawl, extract via GPT, return structured brand data |
| `server.js` | Modify (after line 371) | Register the new route |
| `src/components/modals/BrandKitModal.jsx` | Modify (lines ~119-130, ~576-590) | Add URL state, handler, and UI input + button |

**Note:** `.env.example` already has `FIRECRAWL_API_KEY` at line 23 — no change needed. For Fly.io deployment, run `fly secrets set FIRECRAWL_API_KEY=...` if not already set.

---

### Task 1: Create the backend endpoint

**Files:**
- Create: `api/brand/extract-url.js`

This file mirrors `api/brand/extract-pdf.js` but accepts a URL instead of base64 PDF. It calls Firecrawl's scrape API, then GPT-4.1-mini with the same Zod schema.

- [ ] **Step 1: Create `api/brand/extract-url.js`**

```javascript
/**
 * POST /api/brand/extract-url
 *
 * Accepts a website URL, scrapes it via Firecrawl, and uses GPT to
 * extract structured brand information that auto-fills the Brand Kit form.
 *
 * Body: { url: string }
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';

const BrandExtractSchema = z.object({
  brand_name: z.string(),
  brand_username: z.string(),
  blurb: z.string(),
  website: z.string(),
  target_market: z.string(),
  brand_personality: z.string(),
  brand_voice_detail: z.string(),
  voice_style: z.enum(['professional', 'energetic', 'casual', 'luxury', 'playful']),
  content_style_rules: z.string(),
  preferred_elements: z.string(),
  prohibited_elements: z.string(),
  taglines: z.array(z.string()),
  colors: z.array(z.string()),
  style_preset: z.enum(['modern', 'minimal', 'bold', 'luxury', 'playful', 'corporate']),
  visual_style_notes: z.string(),
  mood_atmosphere: z.string(),
  lighting_prefs: z.string(),
  composition_style: z.string(),
  ai_prompt_rules: z.string(),
  logo_url: z.string(),
});

const SYSTEM_PROMPT = `You are a brand identity analyst. Extract detailed brand guidelines from the provided website content.

Return ALL fields as completely as possible. If information is not present in the content, provide a reasonable empty string — never fabricate data.

Field guidance:
- brand_name: The official brand name
- brand_username: A lowercase slug suitable as a username (no spaces, only a-z, 0-9, hyphens, underscores)
- blurb: A 1-2 sentence brand description / elevator pitch
- website: The brand's website URL
- target_market: Who the brand serves (demographics, psychographics, market segments)
- brand_personality: Brand character traits (e.g., "innovative, trustworthy, approachable")
- brand_voice_detail: Detailed description of how the brand communicates (tone, language style, formality level)
- voice_style: Best-fit category from the enum options
- content_style_rules: Rules for creating content (dos and don'ts, formatting preferences)
- preferred_elements: Visual or content elements the brand favors
- prohibited_elements: Things to avoid (colors, words, imagery, etc.)
- taglines: Array of brand taglines, slogans, or key phrases
- colors: Array of hex color codes (e.g., ["#FF5733", "#2C666E"]) — extract from any color specifications, CSS variables, or brand color mentions
- style_preset: Best-fit visual style category
- visual_style_notes: Description of the brand's visual identity (photography style, illustration style, etc.)
- mood_atmosphere: The emotional feel the brand aims for in visuals
- lighting_prefs: Preferred lighting style for photography/video
- composition_style: Layout and composition preferences
- ai_prompt_rules: Any specific instructions for AI-generated content
- logo_url: URL of brand logo if found in the page content (otherwise empty string)`;

const MAX_CONTENT_LENGTH = 50000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url || (typeof url !== 'string')) {
    return res.status(400).json({ error: 'Provide a valid URL' });
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: 'URL must start with http:// or https://' });
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return res.status(500).json({ error: 'Firecrawl API key not configured' });
  }

  try {
    // 1. Scrape the URL via Firecrawl
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: AbortSignal.timeout(30000),
    });

    if (!scrapeRes.ok) {
      const errBody = await scrapeRes.text().catch(() => '');
      console.error('[brand/extract-url] Firecrawl error:', scrapeRes.status, errBody);
      return res.status(500).json({ error: `Failed to scrape URL (${scrapeRes.status})` });
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData?.data?.markdown;

    if (!markdown || !markdown.trim()) {
      return res.status(500).json({ error: 'Could not extract content from this URL' });
    }

    // 2. Truncate to prevent token blowout
    const content = markdown.slice(0, MAX_CONTENT_LENGTH);

    // 3. Extract brand data via GPT
    const keys = await getUserKeys(req.user.id, req.user.email);
    const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract all brand guidelines, identity information, visual style specifications, voice & tone rules, color palette, and any other relevant brand data from this website content.\n\nURL: ${url}\n\n${content}`,
        },
      ],
      response_format: zodResponseFormat(BrandExtractSchema, 'brand_extract'),
    });

    const extracted = completion.choices[0].message.parsed;

    // Ensure the website field is populated with the input URL if GPT missed it
    if (!extracted.website) extracted.website = url;

    return res.json({ success: true, extracted });
  } catch (err) {
    console.error('[brand/extract-url]', err);
    if (err.name === 'TimeoutError') {
      return res.status(500).json({ error: 'Timed out scraping URL — the site may be too slow or unreachable' });
    }
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/brand/extract-url.js
git commit -m "feat: add brand extraction from website URL endpoint"
```

---

### Task 2: Register the route in server.js

**Files:**
- Modify: `server.js:367-372`

Add the new route directly after the existing `extract-pdf` route block (after line 371).

- [ ] **Step 1: Add route registration after the extract-pdf block**

Find this block at line 367-371:
```javascript
// PDF brand guidelines extraction (with auth)
app.post('/api/brand/extract-pdf', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/extract-pdf.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
```

Add immediately after its closing `});`:
```javascript

// URL brand extraction (with auth)
app.post('/api/brand/extract-url', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/extract-url.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: register brand extract-url route"
```

---

### Task 3: Add URL extraction UI to BrandKitModal

**Files:**
- Modify: `src/components/modals/BrandKitModal.jsx`

Three changes: (1) add `extractUrl` state, (2) add `handleUrlExtract` handler, (3) add URL input + button to the bar.

- [ ] **Step 1: Add state variable**

Find at line ~129:
```javascript
const [form, setForm] = useState(emptyBrand());
```

Add after it:
```javascript
const [extractUrl, setExtractUrl] = useState('');
```

- [ ] **Step 2: Add the handler function**

Find the end of `handlePdfUpload` — look for the closing of the PDF extraction section (around line 390, after `if (pdfInputRef.current) pdfInputRef.current.value = '';`). Add the new handler after that function's closing brace:

```javascript

  // ── URL extraction ──────────────────────────────────────────────────────────
  const handleUrlExtract = async () => {
    const url = extractUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsExtracting(true);
    try {
      const res = await apiFetch('/api/brand/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const ex = data.extracted;
      setForm(prev => ({
        ...prev,
        brand_name: ex.brand_name || prev.brand_name,
        brand_username: ex.brand_username || prev.brand_username,
        blurb: ex.blurb || prev.blurb,
        website: ex.website || prev.website,
        target_market: ex.target_market || prev.target_market,
        brand_personality: ex.brand_personality || prev.brand_personality,
        brand_voice_detail: ex.brand_voice_detail || prev.brand_voice_detail,
        voice_style: ex.voice_style || prev.voice_style,
        content_style_rules: ex.content_style_rules || prev.content_style_rules,
        preferred_elements: ex.preferred_elements || prev.preferred_elements,
        prohibited_elements: ex.prohibited_elements || prev.prohibited_elements,
        taglines: ex.taglines?.length ? ex.taglines : prev.taglines,
        colors: ex.colors?.length ? ex.colors : prev.colors,
        style_preset: ex.style_preset || prev.style_preset,
        visual_style_notes: ex.visual_style_notes || prev.visual_style_notes,
        mood_atmosphere: ex.mood_atmosphere || prev.mood_atmosphere,
        lighting_prefs: ex.lighting_prefs || prev.lighting_prefs,
        composition_style: ex.composition_style || prev.composition_style,
        ai_prompt_rules: ex.ai_prompt_rules || prev.ai_prompt_rules,
        logo_url: ex.logo_url || prev.logo_url,
      }));

      setExtractUrl('');
    } catch (err) {
      toast.error(err.message || 'Failed to extract from URL');
    } finally {
      setIsExtracting(false);
    }
  };
```

- [ ] **Step 3: Replace the bar UI**

Find the bar at line ~576-590:
```jsx
          {/* PDF upload bar */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
            <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} className="hidden" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isExtracting}
              className="border-[#2C666E]/40 text-[#2C666E] hover:bg-[#2C666E]/10"
            >
              {isExtracting
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Extracting...</>
                : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload PDF Guidelines</>}
            </Button>
            <span className="text-xs text-gray-500">Upload a brand guidelines PDF to auto-fill all fields</span>
          </div>
```

Replace with:
```jsx
          {/* Auto-fill bar: PDF upload + URL extraction */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
            <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} className="hidden" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isExtracting}
              className="border-[#2C666E]/40 text-[#2C666E] hover:bg-[#2C666E]/10 flex-shrink-0"
            >
              {isExtracting
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Extracting...</>
                : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload PDF</>}
            </Button>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <Input
                value={extractUrl}
                onChange={e => setExtractUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlExtract()}
                placeholder="https://example.com"
                disabled={isExtracting}
                className="h-8 text-xs bg-white border-gray-300 text-gray-900 flex-1 min-w-0"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleUrlExtract}
                disabled={isExtracting || !extractUrl.trim()}
                className="border-[#2C666E]/40 text-[#2C666E] hover:bg-[#2C666E]/10 flex-shrink-0"
              >
                {isExtracting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : 'Extract'}
              </Button>
            </div>
          </div>
```

Note: `Globe` is already imported at line 13. `Input` is already imported at line 6. The button text was shortened from "Upload PDF Guidelines" to "Upload PDF" to make room for the URL input.

- [ ] **Step 4: Verify the dev server starts without errors**

```bash
npm run dev
```

Open the Brand Kit modal in the browser and confirm:
- The bar shows both the PDF upload button and the URL input + Extract button
- The Extract button is disabled when the input is empty
- Typing a URL enables the Extract button

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/BrandKitModal.jsx
git commit -m "feat: add URL extraction UI to Brand Kit modal"
```

---

### Task 4: End-to-end verification

- [ ] **Step 1: Start the full server**

```bash
npm run start
```

- [ ] **Step 2: Test the backend endpoint directly**

```bash
curl -X POST http://localhost:3003/api/brand/extract-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"url": "https://anthropic.com"}'
```

Expected: `{ "success": true, "extracted": { "brand_name": "Anthropic", ... } }`

- [ ] **Step 3: Test via the UI**

1. Open the app at `http://localhost:4390`
2. Open the Brand Kit modal
3. Paste `https://anthropic.com` into the URL input
4. Click Extract
5. Confirm all form fields populate (brand name, colors, blurb, voice, etc.)
6. Confirm the Extract button shows a spinner during loading
7. Confirm both PDF upload and URL Extract buttons are disabled during extraction

- [ ] **Step 4: Test error cases**

1. Submit an empty URL — should show toast error
2. Submit `ftp://invalid` — should show toast error about http/https
3. Submit `https://this-domain-definitely-does-not-exist-xyz123.com` — should show server error toast

- [ ] **Step 5: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "feat: brand kit URL extraction — complete"
```
