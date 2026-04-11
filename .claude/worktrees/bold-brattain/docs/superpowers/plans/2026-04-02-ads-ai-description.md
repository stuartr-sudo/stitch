# AI-Powered Product Description — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible "Auto-fill with AI" panel to the Ads Manager campaign creation form that synthesizes a product description from a scraped URL and/or Brand Kit data via GPT-4.1-mini.

**Architecture:** New backend endpoint `POST /api/ads/synthesize-description` scrapes a URL via Firecrawl and/or fetches Brand Kit data, then sends both to GPT-4.1-mini to produce a cohesive product description. Frontend adds a collapsible panel above the existing textarea with URL input, Brand Kit dropdown, and Generate button.

**Tech Stack:** Express, OpenAI (gpt-4.1-mini), Firecrawl API, Supabase (brand_kit table), React, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-02-ads-ai-description-design.md`

---

### Task 1: Backend — synthesize-description endpoint

**Files:**
- Create: `api/ads/synthesize-description.js`

This endpoint accepts `{ url?, brand_kit_id? }`, scrapes the URL via Firecrawl (if provided), fetches all Brand Kit fields (if provided), and sends both to GPT-4.1-mini to produce a cohesive product description.

- [ ] **Step 1: Create the endpoint file**

```javascript
// api/ads/synthesize-description.js
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const SYSTEM_PROMPT = `You are a marketing strategist. Given information about a product/service (from a webpage and/or brand kit), write a cohesive product/service description suitable for generating advertising campaigns.

Requirements:
- Write natural prose, 2-3 paragraphs max
- Focus on what the product/service IS and its value proposition
- If brand voice/personality data is provided, match that tone
- Do NOT list raw data fields or bullet points
- Do NOT fabricate features not present in the source material
- Write as if describing the product to an ad copywriter who needs full context`;

export default async function handler(req, res) {
  const { url, brand_kit_id } = req.body;

  // Validate: at least one source required
  const hasUrl = url && typeof url === 'string' && url.trim();
  const hasBrandKit = brand_kit_id && typeof brand_kit_id === 'string' && brand_kit_id.trim();

  if (!hasUrl && !hasBrandKit) {
    return res.status(400).json({ success: false, error: 'Provide a URL or select a Brand Kit' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);
  const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ success: false, error: 'OpenAI API key required' });

  try {
    const sources = [];

    // 1. Scrape URL if provided
    if (hasUrl) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ success: false, error: 'URL must start with http:// or https://' });
      }

      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey) {
        return res.status(500).json({ success: false, error: 'URL scraping not configured' });
      }

      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({ url: url.trim(), formats: ['markdown'] }),
        signal: AbortSignal.timeout(30000),
      });

      if (!scrapeRes.ok) {
        console.error('[ads/synthesize] Firecrawl error:', scrapeRes.status);
        return res.json({ success: false, error: 'Could not access URL' });
      }

      const scrapeData = await scrapeRes.json();
      const markdown = scrapeData?.data?.markdown;

      if (markdown && markdown.trim()) {
        sources.push(`## Webpage Content (from ${url})\n\n${markdown.slice(0, 30000)}`);
      } else {
        sources.push(`## Webpage Content (from ${url})\n\n[Limited content found — page may be JavaScript-heavy or restricted]`);
      }
    }

    // 2. Fetch Brand Kit if provided
    if (hasBrandKit) {
      const { data: brand, error: brandErr } = await supabase
        .from('brand_kit')
        .select('*')
        .eq('id', brand_kit_id)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (brandErr || !brand) {
        return res.json({ success: false, error: 'Brand kit not found' });
      }

      const brandLines = [
        '## Brand Kit Data',
        brand.brand_name ? `Brand Name: ${brand.brand_name}` : null,
        brand.blurb ? `Description: ${brand.blurb}` : null,
        brand.website ? `Website: ${brand.website}` : null,
        brand.taglines?.length ? `Taglines: ${brand.taglines.join('; ')}` : null,
        brand.target_market ? `Target Market: ${brand.target_market}` : null,
        brand.brand_personality ? `Brand Personality: ${brand.brand_personality}` : null,
        brand.brand_voice_detail ? `Voice Detail: ${brand.brand_voice_detail}` : null,
        brand.voice_style ? `Voice Style: ${brand.voice_style}` : null,
        brand.content_style_rules ? `Content Style Rules: ${brand.content_style_rules}` : null,
        brand.preferred_elements ? `Preferred Elements: ${brand.preferred_elements}` : null,
        brand.prohibited_elements ? `Prohibited Elements: ${brand.prohibited_elements}` : null,
        brand.colors?.length ? `Colors: ${brand.colors.join(', ')}` : null,
        brand.style_preset ? `Style Preset: ${brand.style_preset}` : null,
        brand.visual_style_notes ? `Visual Style: ${brand.visual_style_notes}` : null,
        brand.mood_atmosphere ? `Mood/Atmosphere: ${brand.mood_atmosphere}` : null,
        brand.lighting_prefs ? `Lighting: ${brand.lighting_prefs}` : null,
        brand.composition_style ? `Composition: ${brand.composition_style}` : null,
        brand.ai_prompt_rules ? `AI Prompt Rules: ${brand.ai_prompt_rules}` : null,
      ].filter(Boolean).join('\n');

      sources.push(brandLines);
    }

    // 3. LLM synthesis
    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Synthesize a cohesive product/service description from these sources:\n\n${sources.join('\n\n')}` },
      ],
    });

    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      return res.json({ success: false, error: 'Failed to generate description' });
    }

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'ads_synthesize_description',
      model: 'gpt-4.1-mini',
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
      metadata: { has_url: !!hasUrl, has_brand_kit: !!hasBrandKit },
    }).catch(() => {});

    return res.json({ success: true, description });
  } catch (err) {
    console.error('[ads/synthesize-description]', err);
    if (err.name === 'TimeoutError') {
      return res.json({ success: false, error: 'URL took too long to load' });
    }
    return res.json({ success: false, error: 'Failed to generate description' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/ads/synthesize-description.js
git commit -m "feat: add POST /api/ads/synthesize-description endpoint"
```

---

### Task 2: Register route in server.js

**Files:**
- Modify: `server.js:625` (after the last ads route, before the blank line)

- [ ] **Step 1: Add the route**

Add this line after line 625 (`app.get('/api/ads/google/callback'...)`), before the blank line:

```javascript
app.post('/api/ads/synthesize-description', authenticateToken, (await import('./api/ads/synthesize-description.js')).default);
```

This follows the direct import pattern used by all other ads routes in server.js (lines 614-625).

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: register /api/ads/synthesize-description route"
```

---

### Task 3: Frontend — Auto-fill panel in AdsManagerPage

**Files:**
- Modify: `src/pages/AdsManagerPage.jsx`

Adds the collapsible "Auto-fill with AI" panel above the Product Description textarea, with URL input, Brand Kit dropdown, and Generate button.

- [ ] **Step 1: Add imports and state variables**

At line 3, add `ChevronDown, ChevronUp, Sparkles, Link, BookOpen` to the lucide-react import:

Change:
```javascript
import { Plus, Megaphone, Loader2, Trash2, ArrowLeft, LayoutGrid, List, Check, X, Clock, Eye } from 'lucide-react';
```
To:
```javascript
import { Plus, Megaphone, Loader2, Trash2, ArrowLeft, LayoutGrid, List, Check, X, Clock, Eye, ChevronDown, ChevronUp, Sparkles, Link, BookOpen } from 'lucide-react';
```

After the `form` useState (line 118), add new state variables:

```javascript
  // Auto-fill panel state
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [useUrl, setUseUrl] = useState(false);
  const [useBrandKit, setUseBrandKit] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [brandKits, setBrandKits] = useState([]);
  const [selectedBrandKitId, setSelectedBrandKitId] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesizeStatus, setSynthesizeStatus] = useState(''); // 'scraping' | 'generating' | ''
  const [synthesizeError, setSynthesizeError] = useState('');
```

- [ ] **Step 2: Add Brand Kit loading and synthesize handler**

After the `loadCampaigns` useCallback (around line 131), add:

```javascript
  // Load brand kits for Auto-fill dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/brand/kit');
        const data = await res.json();
        if (data.brands) {
          setBrandKits(data.brands);
          if (data.brands.length === 1) setSelectedBrandKitId(data.brands[0].id);
        }
      } catch (err) {
        console.error('[AdsManager] brand kits load error', err);
      }
    })();
  }, []);

  const handleSynthesize = async () => {
    const payload = {};
    if (useUrl && scrapeUrl.trim()) payload.url = scrapeUrl.trim();
    if (useBrandKit && selectedBrandKitId) payload.brand_kit_id = selectedBrandKitId;

    if (!payload.url && !payload.brand_kit_id) return;

    setSynthesizing(true);
    setSynthesizeError('');
    setSynthesizeStatus(payload.url ? 'scraping' : 'generating');

    try {
      // If URL provided, show 'scraping' then switch to 'generating' after a beat
      if (payload.url) {
        // We can't know exactly when scraping ends, but switch status after 5s as a heuristic
        setTimeout(() => setSynthesizeStatus(prev => prev === 'scraping' ? 'generating' : prev), 5000);
      }

      const res = await apiFetch('/api/ads/synthesize-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.description) {
        // If textarea has content, confirm before replacing
        if (form.product_description.trim() && !confirm('Replace existing description?')) {
          return;
        }
        setForm(prev => ({ ...prev, product_description: data.description }));
      } else {
        setSynthesizeError(data.error || 'Failed to generate description');
      }
    } catch (err) {
      setSynthesizeError('Network error — please try again');
    } finally {
      setSynthesizing(false);
      setSynthesizeStatus('');
    }
  };
```

- [ ] **Step 3: Add the Auto-fill panel JSX**

In the create form JSX, replace the Product Description `<div>` block (lines 264-273):

```jsx
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product / Service Description</label>
              <textarea
                value={form.product_description}
                onChange={e => setForm(prev => ({ ...prev, product_description: e.target.value }))}
                placeholder="Describe what you're advertising..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
              />
            </div>
```

With this expanded version:

```jsx
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product / Service Description</label>

              {/* Auto-fill with AI panel */}
              <div className="mb-2 border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAutoFillOpen(!autoFillOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-700 font-medium">
                    <Sparkles className="w-4 h-4 text-[#2C666E]" />
                    Auto-fill with AI
                  </span>
                  {autoFillOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {autoFillOpen && (
                  <div className="px-3 py-3 space-y-3 bg-white border-t">
                    {/* URL source */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={useUrl}
                        onChange={e => setUseUrl(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
                      />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <Link className="w-3.5 h-3.5" />
                          Import from URL
                        </label>
                        <input
                          type="url"
                          value={scrapeUrl}
                          onChange={e => setScrapeUrl(e.target.value)}
                          placeholder="https://example.com/product"
                          disabled={!useUrl}
                          className={`mt-1 w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E] ${!useUrl ? 'bg-gray-100 text-gray-400' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Brand Kit source */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={useBrandKit}
                        onChange={e => setUseBrandKit(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
                      />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          Import from Brand Kit
                        </label>
                        {brandKits.length > 0 ? (
                          <select
                            value={selectedBrandKitId}
                            onChange={e => setSelectedBrandKitId(e.target.value)}
                            disabled={!useBrandKit}
                            className={`mt-1 w-full border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E] ${!useBrandKit ? 'bg-gray-100 text-gray-400' : ''}`}
                          >
                            <option value="">Select a brand kit...</option>
                            {brandKits.map(bk => (
                              <option key={bk.id} value={bk.id}>{bk.brand_name || 'Unnamed Brand'}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500">
                            No brand kits found.{' '}
                            <button type="button" onClick={() => navigate('/studio')} className="text-[#2C666E] hover:underline">Create one in Studio</button>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Generate button + error */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleSynthesize}
                        disabled={synthesizing || ((!useUrl || !scrapeUrl.trim()) && (!useBrandKit || !selectedBrandKitId))}
                        className="px-4 py-1.5 bg-[#2C666E] text-white rounded-md text-sm font-medium hover:bg-[#1f4f55] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {synthesizing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {synthesizeStatus === 'scraping' ? 'Scraping URL...' : 'Generating description...'}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Generate Description
                          </>
                        )}
                      </button>
                    </div>

                    {synthesizeError && (
                      <p className="text-xs text-red-600">{synthesizeError}</p>
                    )}
                  </div>
                )}
              </div>

              <textarea
                value={form.product_description}
                onChange={e => setForm(prev => ({ ...prev, product_description: e.target.value }))}
                placeholder="Describe what you're advertising..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
              />
            </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdsManagerPage.jsx
git commit -m "feat: add Auto-fill with AI panel to Ads Manager campaign form"
```

---

### Task 4: Verify

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

- [ ] **Step 2: Verify the endpoint works**

Open the app at `http://localhost:4390/ads`, click "New Campaign", and verify:
- The "Auto-fill with AI" collapsible panel appears above the textarea
- Expanding it shows URL checkbox + input and Brand Kit checkbox + dropdown
- Brand kits load in the dropdown (if the user has any)
- Checking URL, entering a URL, and clicking Generate produces a synthesized description
- Checking Brand Kit, selecting a kit, and clicking Generate produces a description
- Checking both produces a combined description
- Error states display inline below the button
- The confirm dialog appears when replacing existing text

- [ ] **Step 3: Commit final state if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
