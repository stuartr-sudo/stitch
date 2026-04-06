# Ad Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-tier competitive ad research system — a standalone Ad Intelligence page for deep research plus a Research Panel in the Campaign Editor for quick lookups — enabling users to discover competitor ads, analyze landing pages, and auto-generate campaigns from competitive insights.

**Architecture:** New `/api/intelligence/*` API namespace with 7 handlers following the existing storyboard/projects.js catch-all routing pattern. ALTER existing `ad_library` table + CREATE `competitors` and `research_sessions` tables. New `AdIntelligencePage.jsx` with three tabs (Research, Library, Competitors). Research-to-campaign pipeline creates campaigns with enriched GPT prompts based on user-selected competitive strategy and insights.

**Tech Stack:** React 18 + Tailwind + Radix UI (shadcn), Express, Supabase Postgres, OpenAI GPT-4.1 (web search + structured output), Firecrawl (landing page scraping), FAL.ai Nano Banana 2 (image generation)

**Spec:** `docs/superpowers/specs/2026-04-06-ad-intelligence-design.md`

---

## File Map

### New Files — Backend (`api/intelligence/`)
| File | Responsibility |
|------|---------------|
| `api/intelligence/search.js` | Multi-source ad discovery via GPT-4.1 web search |
| `api/intelligence/analyze-ad.js` | Deep AI teardown of a single ad (Zod structured output) |
| `api/intelligence/analyze-landing.js` | Landing page scrape (Firecrawl) + GPT analysis |
| `api/intelligence/synthesize.js` | Combine multiple ad analyses into actionable insights |
| `api/intelligence/library.js` | CRUD for saved ads (catch-all: GET/POST/PATCH/DELETE) |
| `api/intelligence/competitors.js` | CRUD for competitor profiles + refresh (catch-all routing) |
| `api/intelligence/generate-campaign.js` | Research-enriched campaign generation |

### New Files — Frontend (`src/`)
| File | Responsibility |
|------|---------------|
| `src/pages/AdIntelligencePage.jsx` | Main page: Research/Library/Competitors tabs |
| `src/components/intelligence/CompetitorSearchBar.jsx` | Search input + platform/format filter chips |
| `src/components/intelligence/AdResultCard.jsx` | Discovered ad card with Analyze/Save actions |
| `src/components/intelligence/AdTeardownPanel.jsx` | Slide-over analysis panel (hook, copy, triggers, strengths/weaknesses) |
| `src/components/intelligence/LandingPageAnalysis.jsx` | Landing page teardown display |
| `src/components/intelligence/CompetitorProfile.jsx` | Competitor detail view with grouped ads |
| `src/components/intelligence/ResearchCampaignModal.jsx` | Campaign creation with strategy selector + insights checkboxes |
| `src/components/intelligence/ResearchSidePanel.jsx` | Collapsible sidebar for Campaign Editor |

### New Files — Migration
| File | Responsibility |
|------|---------------|
| `supabase-migration-ad-intelligence.sql` | CREATE competitors, research_sessions; ALTER ad_library, ad_campaigns |

### Modified Files
| File | Change |
|------|--------|
| `server.js` | Add 7 intelligence route registrations near Ads Manager block |
| `src/App.jsx` | Add `/ads/intelligence` route, redirect `/ads/discover` |
| `src/pages/AdCampaignEditor.jsx` | Add optional ResearchSidePanel when campaign has research_session_id |
| `src/pages/VideoAdvertCreator.jsx` | Add "Ad Intelligence" nav card in sidebar (near line 822) |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase-migration-ad-intelligence.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Ad Intelligence: competitors, research sessions, ad_library extensions
-- Run after: 20260405_ad_library.sql

-- 1. Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  notes TEXT,
  last_researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own competitors" ON competitors
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);

-- 2. Extend ad_library with new columns
ALTER TABLE ad_library ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS ad_format TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS ad_copy TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS landing_page_url TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS landing_page_analysis JSONB;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ;
ALTER TABLE ad_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ad_library_user_id ON ad_library(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_library_competitor_id ON ad_library(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ad_library_platform ON ad_library(platform);
CREATE INDEX IF NOT EXISTS idx_ad_library_is_favorite ON ad_library(is_favorite);

-- 3. Research sessions table (write-once, no updated_at)
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  strategy TEXT,
  applied_insights JSONB,
  source_ads UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own research sessions" ON research_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Extend ad_campaigns with research link
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS research_session_id UUID REFERENCES research_sessions(id) ON DELETE SET NULL;

-- 5. Updated_at trigger (reuse if exists, create if not)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_competitors_updated_at ON competitors;
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ad_library_updated_at ON ad_library;
CREATE TRIGGER update_ad_library_updated_at
  BEFORE UPDATE ON ad_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Run the migration against Supabase**

Run via Supabase SQL editor or CLI. Verify tables exist:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'competitors' ORDER BY ordinal_position;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ad_library' ORDER BY ordinal_position;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'research_sessions' ORDER BY ordinal_position;
```

- [ ] **Step 3: Commit**

```bash
git add supabase-migration-ad-intelligence.sql
git commit -m "feat(intelligence): add database migration for competitors, research_sessions, ad_library extensions"
```

---

## Task 2: Competitors CRUD API

**Files:**
- Create: `api/intelligence/competitors.js`

- [ ] **Step 1: Create the api/intelligence/ directory**

```bash
mkdir -p api/intelligence
```

- [ ] **Step 2: Write competitors.js**

This handler uses internal method+path routing (same pattern as `api/storyboard/projects.js`). It handles:
- `GET /api/intelligence/competitors` — list all
- `POST /api/intelligence/competitors` — create
- `GET /api/intelligence/competitors/:id` — get one with saved ads
- `PATCH /api/intelligence/competitors/:id` — update
- `DELETE /api/intelligence/competitors/:id` — delete (unlinks ads, doesn't delete them)
- `POST /api/intelligence/competitors/:id/refresh` — re-search for new ads

```javascript
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  // Parse URL segments: /api/intelligence/competitors/[:id][/refresh]
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/intelligence/competitors', '').split('/').filter(Boolean);

  try {
    // Root: list or create
    if (pathParts.length === 0) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('competitors')
          .select('*, ad_library(count)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return res.json({ competitors: data || [] });
      }
      if (req.method === 'POST') {
        const { name, website_url, industry, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        const { data, error } = await supabase
          .from('competitors')
          .insert({ user_id: userId, name, website_url: website_url || null, industry: industry || null, notes: notes || null })
          .select()
          .single();
        if (error) throw error;
        return res.json({ competitor: data });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const competitorId = pathParts[0];

    // /competitors/:id/refresh — re-search
    if (pathParts[1] === 'refresh' && req.method === 'POST') {
      // Update last_researched_at timestamp
      await supabase.from('competitors').update({ last_researched_at: new Date().toISOString() }).eq('id', competitorId).eq('user_id', userId);
      // The actual search is triggered from the frontend which calls /api/intelligence/search
      return res.json({ refreshed: true });
    }

    // /competitors/:id — get, update, delete
    if (req.method === 'GET') {
      const { data: competitor, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('id', competitorId)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      if (!competitor) return res.status(404).json({ error: 'Not found' });

      // Fetch all saved ads for this competitor
      const { data: ads } = await supabase
        .from('ad_library')
        .select('*')
        .eq('competitor_id', competitorId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return res.json({ competitor, ads: ads || [] });
    }

    if (req.method === 'PATCH') {
      const updates = {};
      for (const key of ['name', 'website_url', 'industry', 'notes']) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const { data, error } = await supabase
        .from('competitors')
        .update(updates)
        .eq('id', competitorId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json({ competitor: data });
    }

    if (req.method === 'DELETE') {
      // Unlink ads (set competitor_id to null), don't delete them
      await supabase.from('ad_library').update({ competitor_id: null }).eq('competitor_id', competitorId).eq('user_id', userId);
      const { error } = await supabase.from('competitors').delete().eq('id', competitorId).eq('user_id', userId);
      if (error) throw error;
      return res.json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[intelligence/competitors] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/intelligence/competitors.js
git commit -m "feat(intelligence): add competitors CRUD API"
```

---

## Task 3: Library CRUD API

**Files:**
- Create: `api/intelligence/library.js`

- [ ] **Step 1: Write library.js**

Same catch-all routing pattern. Handles GET (list with filters), POST (save), PATCH (update tags/notes/favorite), DELETE.

```javascript
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/intelligence/library', '').split('/').filter(Boolean);

  try {
    // Root: list or save
    if (pathParts.length === 0) {
      if (req.method === 'GET') {
        let query = supabase
          .from('ad_library')
          .select('*, competitors(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Query param filters
        const params = url.searchParams;
        if (params.get('competitor_id')) query = query.eq('competitor_id', params.get('competitor_id'));
        if (params.get('platform')) query = query.eq('platform', params.get('platform'));
        if (params.get('favorite') === 'true') query = query.eq('is_favorite', true);

        const { data, error } = await query;
        if (error) throw error;
        return res.json({ items: data || [] });
      }
      if (req.method === 'POST') {
        const { source_url, platform, ad_format, ad_copy, thumbnail_url, landing_page_url, analysis, landing_page_analysis, clone_recipe, niche, tags, competitor_id, notes } = req.body;
        const { data, error } = await supabase
          .from('ad_library')
          .insert({
            user_id: userId,
            source_url: source_url || null,
            platform: platform || null,
            ad_format: ad_format || null,
            ad_copy: ad_copy || null,
            thumbnail_url: thumbnail_url || null,
            landing_page_url: landing_page_url || null,
            analysis: analysis || null,
            landing_page_analysis: landing_page_analysis || null,
            clone_recipe: clone_recipe || null,
            niche: niche || null,
            tags: tags || [],
            competitor_id: competitor_id || null,
            notes: notes || null,
            is_favorite: false,
            discovered_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return res.json({ saved: data });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // /library/:id — update or delete
    const itemId = pathParts[0];

    if (req.method === 'PATCH') {
      const updates = {};
      for (const key of ['tags', 'notes', 'is_favorite', 'competitor_id', 'analysis', 'landing_page_analysis', 'landing_page_url']) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const { data, error } = await supabase
        .from('ad_library')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json({ updated: data });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('ad_library').delete().eq('id', itemId).eq('user_id', userId);
      if (error) throw error;
      return res.json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[intelligence/library] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/intelligence/library.js
git commit -m "feat(intelligence): add library CRUD API with filtering"
```

---

## Task 4: Ad Search API

**Files:**
- Create: `api/intelligence/search.js`

- [ ] **Step 1: Write search.js**

Enhanced version of existing `discover.js` search action. Accepts `query` (competitor name/URL), `platforms[]`, `formats[]`. Uses GPT-4.1 with `web_search_preview` tool.

```javascript
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, platforms, formats } = req.body;
  if (!query) return res.status(400).json({ error: 'query required (competitor name, URL, or ad URL)' });

  const userId = req.user.id;

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openai });

    const platformFilter = platforms?.length && !platforms.includes('all')
      ? `on ${platforms.join(', ')}`
      : 'across Meta, Google, LinkedIn, TikTok, and the web';

    const formatFilter = formats?.length
      ? `Focus on ${formats.join(', ')} ad formats.`
      : '';

    const response = await openai.responses.create({
      model: 'gpt-4.1',
      tools: [{ type: 'web_search_preview' }],
      input: `Research the competitor "${query}" and find 10-15 of their current or recent paid advertisements ${platformFilter}. ${formatFilter}

Search these sources in order:
1. Meta Ad Library (facebook.com/ads/library) — search for the brand name
2. Google Ads Transparency Center (adstransparency.google.com)
3. LinkedIn Ad Library if applicable
4. TikTok Creative Center (ads.tiktok.com/business/creativecenter)
5. General web search for marketing case studies, ad examples, ad breakdowns

For each ad found, provide:
- title: A descriptive title for the ad
- source_url: The URL where the ad can be found
- platform: Which platform (Meta, Google, LinkedIn, TikTok, Web)
- advertiser: The brand or company name
- ad_format: image, video, or carousel
- ad_copy: The primary ad copy/text (headline + body if visible)
- landing_page_url: The destination URL if visible
- description: A 1-2 sentence summary of the ad's angle
- estimated_engagement: High, Medium, or Low based on visible signals
- why_its_winning: One sentence on why this ad works

Return results as a JSON array. Focus on REAL ads, not hypothetical ones.`,
    });

    const text = response.output
      .filter(o => o.type === 'message')
      .flatMap(o => o.content)
      .filter(c => c.type === 'output_text')
      .map(c => c.text)
      .join('');

    let results = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) results = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[intelligence/search] JSON parse error:', e.message);
    }

    await logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_search',
      model: 'gpt-4.1',
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      metadata: { query, platforms, formats, result_count: results.length },
    });

    return res.json({ results });
  } catch (err) {
    console.error('[intelligence/search] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/intelligence/search.js
git commit -m "feat(intelligence): add multi-source ad search API"
```

---

## Task 5: Ad Analysis API

**Files:**
- Create: `api/intelligence/analyze-ad.js`

- [ ] **Step 1: Write analyze-ad.js**

Extended version of existing `discover.js` analyze action. Adds `tone` to copy_breakdown. Uses Zod structured output.

```javascript
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const AdAnalysis = z.object({
  hook: z.string().describe('The opening hook or attention-grabber and why it works'),
  copy_breakdown: z.object({
    headline: z.string().describe('Analysis of headline approach'),
    body: z.string().describe('Body copy analysis'),
    cta: z.string().describe('CTA text and effectiveness assessment'),
    tone: z.string().describe('Overall tone classification (e.g., confident, empowering, urgent, playful)'),
  }),
  visual_style: z.string().describe('Description of the visual/design style'),
  target_audience: z.string().describe('Inferred target audience'),
  emotional_triggers: z.array(z.string()).describe('Emotional triggers used (e.g., Achievement, FOMO, Aspiration, Social Proof)'),
  strengths: z.array(z.string()).describe('What this ad does well'),
  weaknesses: z.array(z.string()).describe('Where this ad falls short or could be exploited'),
  clone_suggestions: z.array(z.string()).describe('Actionable tips to recreate or beat this ad style'),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { source_url, ad_copy, description } = req.body;
  if (!source_url && !ad_copy && !description) {
    return res.status(400).json({ error: 'source_url, ad_copy, or description required' });
  }

  const userId = req.user.id;

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openai });

    let context = '';
    if (source_url) context += `Ad URL: ${source_url}\n`;
    if (ad_copy) context += `Ad copy:\n${ad_copy}\n`;
    if (description) context += `Additional context: ${description}\n`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      response_format: zodResponseFormat(AdAnalysis, 'ad_analysis'),
      messages: [
        {
          role: 'system',
          content: `You are an expert advertising analyst and competitive strategist. Analyze ads with extreme specificity — name exact tactics, quote copy, identify psychological triggers. For weaknesses, focus on gaps a competitor could exploit. For clone_suggestions, give actionable steps (e.g., "Lead headline with specific number/stat instead of their vague claim", "Add customer testimonial to counter their lack of social proof").`,
        },
        { role: 'user', content: `Analyze this competitor ad:\n\n${context}` },
      ],
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    await logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_analyze_ad',
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      metadata: { source_url },
    });

    return res.json({ analysis });
  } catch (err) {
    console.error('[intelligence/analyze-ad] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/intelligence/analyze-ad.js
git commit -m "feat(intelligence): add ad teardown analysis API"
```

---

## Task 6: Landing Page Analysis API

**Files:**
- Create: `api/intelligence/analyze-landing.js`

- [ ] **Step 1: Write analyze-landing.js**

Uses Firecrawl to scrape the page (same pattern as `api/brand/extract-url.js`), then GPT-4.1 with Zod structured output for analysis.

```javascript
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const LandingPageAnalysis = z.object({
  page_structure: z.array(z.object({
    section: z.string(),
    content: z.string(),
  })).describe('Top-to-bottom section breakdown of the page'),
  copy_analysis: z.object({
    headline: z.string().describe('Headline approach and effectiveness'),
    subhead: z.string().describe('Supporting copy analysis'),
    cta: z.string().describe('CTA text and friction removal tactics'),
  }),
  conversion_tactics: z.array(z.string()).describe('Conversion tactics used (e.g., Social Proof, Sticky CTA, Urgency Timer)'),
  design_patterns: z.string().describe('Layout, visual hierarchy, UX patterns description'),
  technical: z.object({
    load_time: z.string().describe('Estimated load speed assessment'),
    mobile: z.string().describe('Mobile responsiveness status'),
    tracking_pixels: z.array(z.string()).describe('Detected tracking (Meta, Google, etc.)'),
    ab_test_indicators: z.string().describe('Any signs of A/B testing'),
  }),
  opportunities: z.array(z.string()).describe('Specific opportunities to beat this landing page — actionable gaps'),
});

const MAX_CONTENT_LENGTH = 50000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const userId = req.user.id;

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openai });
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    if (!firecrawlKey) {
      return res.status(500).json({ error: 'FIRECRAWL_API_KEY not configured' });
    }

    // Scrape landing page via Firecrawl (same pattern as api/brand/extract-url.js)
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
      const errText = await scrapeRes.text();
      console.error('[intelligence/analyze-landing] Firecrawl error:', errText);
      return res.status(502).json({ error: 'Failed to scrape landing page' });
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData?.data?.markdown;

    if (!markdown) {
      return res.status(422).json({ error: 'No content extracted from page' });
    }

    const content = markdown.slice(0, MAX_CONTENT_LENGTH);

    // Analyze via GPT-4.1 with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      response_format: zodResponseFormat(LandingPageAnalysis, 'landing_page_analysis'),
      messages: [
        {
          role: 'system',
          content: `You are a landing page conversion expert and competitive analyst. Analyze landing pages for their conversion effectiveness, copy strategy, design patterns, and technical implementation. Be extremely specific about what works and what doesn't. For opportunities, frame each as an actionable way a competitor could beat this page (e.g., "They use generic social proof ('1M+ users') — beat them with specific named testimonials and results").`,
        },
        {
          role: 'user',
          content: `Analyze this competitor's landing page.\n\nURL: ${url}\n\nPage content:\n${content}`,
        },
      ],
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    await logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_analyze_landing',
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      metadata: { url },
    });

    return res.json({ analysis });
  } catch (err) {
    console.error('[intelligence/analyze-landing] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/intelligence/analyze-landing.js
git commit -m "feat(intelligence): add landing page analysis API via Firecrawl"
```

---

## Task 7: Synthesize API

**Files:**
- Create: `api/intelligence/synthesize.js`

- [ ] **Step 1: Write synthesize.js**

Takes multiple ad_library IDs, fetches their analyses, combines into actionable insights.

```javascript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const SynthesisResult = z.object({
  key_patterns: z.array(z.string()).describe('Common patterns across all analyzed ads'),
  weaknesses: z.array(z.string()).describe('Shared weaknesses across the competitor\'s ads'),
  opportunities: z.array(z.string()).describe('Opportunities to outperform this competitor'),
  recommended_strategy: z.enum(['beat_weaknesses', 'match_improve', 'differentiate']).describe('Recommended competitive strategy'),
  suggested_insights: z.array(z.object({
    text: z.string().describe('The actionable insight'),
    source: z.string().describe('Which ad or analysis this came from'),
    category: z.enum(['hook', 'copy', 'visual', 'landing_page', 'conversion']).describe('Category of insight'),
  })).describe('Specific insights to apply when creating a campaign'),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ad_ids } = req.body;
  if (!ad_ids?.length) return res.status(400).json({ error: 'ad_ids[] required' });

  const userId = req.user.id;

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openai });

    // Fetch all selected ads with their analyses
    const { data: ads, error } = await supabase
      .from('ad_library')
      .select('id, source_url, platform, ad_copy, analysis, landing_page_analysis, landing_page_url')
      .in('id', ad_ids)
      .eq('user_id', userId);

    if (error) throw error;
    if (!ads?.length) return res.status(404).json({ error: 'No ads found' });

    // Build context from all analyses
    const analysisContext = ads.map((ad, i) => {
      let ctx = `--- Ad ${i + 1} (${ad.platform || 'Unknown'}) ---\n`;
      if (ad.source_url) ctx += `URL: ${ad.source_url}\n`;
      if (ad.ad_copy) ctx += `Copy: ${ad.ad_copy}\n`;
      if (ad.analysis) ctx += `Analysis: ${JSON.stringify(ad.analysis)}\n`;
      if (ad.landing_page_analysis) ctx += `Landing Page Analysis: ${JSON.stringify(ad.landing_page_analysis)}\n`;
      return ctx;
    }).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      response_format: zodResponseFormat(SynthesisResult, 'synthesis'),
      messages: [
        {
          role: 'system',
          content: `You are a competitive advertising strategist. Given analyses of multiple competitor ads and landing pages, synthesize the data into actionable intelligence. Identify patterns, shared weaknesses, and specific opportunities. For suggested_insights, each should be a concrete, implementable action (not vague advice). Source each insight to a specific ad analysis. Recommend the most effective competitive strategy based on the evidence.`,
        },
        {
          role: 'user',
          content: `Synthesize these ${ads.length} competitor ad analyses into a competitive strategy:\n\n${analysisContext}`,
        },
      ],
    });

    const synthesis = JSON.parse(completion.choices[0].message.content);

    await logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_synthesize',
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      metadata: { ad_count: ads.length },
    });

    return res.json({ synthesis });
  } catch (err) {
    console.error('[intelligence/synthesize] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/intelligence/synthesize.js
git commit -m "feat(intelligence): add synthesis API for combining ad analyses"
```

---

## Task 8: Research-Enriched Campaign Generation API

**Files:**
- Create: `api/intelligence/generate-campaign.js`
- Reference: `api/ads/generate.js` (copy the per-platform generation pattern)

- [ ] **Step 1: Write generate-campaign.js**

This is the largest backend handler. It creates a campaign, research session, and generates platform-specific ad variations enriched with competitive intelligence. Follow the exact same per-platform GPT prompt + image generation + DB insert pattern as `api/ads/generate.js`, but inject research context into the system prompts.

The handler should:
1. Create `ad_campaigns` row (same fields as existing campaigns POST)
2. Create `research_sessions` row with strategy, insights, source_ads
3. Update campaign with `research_session_id`
4. For each platform: build enriched system prompt (base platform prompt + competitor analysis + strategy + selected insights) → GPT-4.1 for copy → Nano Banana 2 for images → insert `ad_variations`
5. Log costs for each GPT and image generation call

**Key sections to replicate from `api/ads/generate.js`:**
- Platform configs (LINKEDIN_SYSTEM, GOOGLE_SYSTEM, META_SYSTEM — lines 12-61)
- Image generation via FAL queue + poll (lines 134-186)
- Per-platform variation insertion with correct `copy_data` JSONB shapes (lines 347-364)

Inject a competitive intelligence block into each platform's system prompt:

```
COMPETITIVE INTELLIGENCE:
Strategy: {Beat on Weaknesses / Match & Improve / Differentiate}

Competitor Analysis Summary:
{patterns, weaknesses from synthesis}

Apply These Insights:
- {insight 1}
- {insight 2}
- {insight 3}

Use this intelligence to create ads that specifically outperform the competitor.
```

**Reference files to study before writing this handler:**
- `api/ads/generate.js` lines 12-61: Platform system prompts (LINKEDIN_SYSTEM, GOOGLE_SYSTEM, META_SYSTEM)
- `api/ads/generate.js` lines 63-79: PLATFORM_CONFIGS with imageAspect per platform
- `api/ads/generate.js` lines 134-186: FAL queue + poll image generation flow
- `api/ads/generate.js` lines 241-340: Per-platform GPT copy generation + variation creation
- `api/ads/generate.js` lines 347-364: `ad_variations` insertion with `copy_data` JSONB shapes

**Implementation steps within this handler:**
1. Create `ad_campaigns` row: `supabase.from('ad_campaigns').insert({ user_id, name, platforms, objective, landing_url, product_description, target_audience, brand_kit_id, status: 'generating' })`
2. Create `research_sessions` row: `supabase.from('research_sessions').insert({ user_id, campaign_id, competitor_id, strategy, applied_insights, source_ads: source_ad_ids })`
3. Update campaign: `supabase.from('ad_campaigns').update({ research_session_id }).eq('id', campaignId)`
4. Fetch source ad analyses: `supabase.from('ad_library').select('analysis, landing_page_analysis, ad_copy, platform').in('id', source_ad_ids)`
5. For each platform, build enriched system prompt = base platform prompt + competitive intelligence block (see template above)
6. Call `openai.chat.completions.create` with `response_format: { type: 'json_object' }` per platform (same as generate.js)
7. Generate images via FAL queue (POST to `https://queue.fal.run/fal-ai/nano-banana-2`, poll status, upload to Supabase)
8. Insert `ad_variations` rows with correct `copy_data` JSONB shapes per platform
9. Update campaign status to 'review'
10. Log costs for each GPT and FAL call

- [ ] **Step 2: Commit**

```bash
git add api/intelligence/generate-campaign.js
git commit -m "feat(intelligence): add research-enriched campaign generation API"
```

---

## Task 9: Route Registration in server.js

**Files:**
- Modify: `server.js` (near the Ads Manager route block, around line 829-843)

- [ ] **Step 1: Add intelligence routes**

Add these routes near the existing Ads Manager block, using the direct import pattern:

```javascript
// ── Ad Intelligence ─────────────────────────────────
app.post('/api/intelligence/search', authenticateToken, async (req, res) => (await import('./api/intelligence/search.js')).default(req, res));
app.post('/api/intelligence/analyze-ad', authenticateToken, async (req, res) => (await import('./api/intelligence/analyze-ad.js')).default(req, res));
app.post('/api/intelligence/analyze-landing', authenticateToken, async (req, res) => (await import('./api/intelligence/analyze-landing.js')).default(req, res));
app.post('/api/intelligence/synthesize', authenticateToken, async (req, res) => (await import('./api/intelligence/synthesize.js')).default(req, res));
app.post('/api/intelligence/generate-campaign', authenticateToken, async (req, res) => (await import('./api/intelligence/generate-campaign.js')).default(req, res));
// Catch-alls AFTER specific POST routes (single registration with * matches both root and sub-paths, same as storyboard/projects)
app.all('/api/intelligence/library*', authenticateToken, async (req, res) => (await import('./api/intelligence/library.js')).default(req, res));
app.all('/api/intelligence/competitors*', authenticateToken, async (req, res) => (await import('./api/intelligence/competitors.js')).default(req, res));
```

Note: Single `*` wildcard registration per catch-all (matching the `app.all('/api/storyboard/projects*', ...)` pattern). The specific POST routes MUST be registered before the catch-alls so Express matches them first.

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat(intelligence): register API routes in server.js"
```

---

## Task 10: Frontend — Ad Intelligence Page (Research Tab)

**Files:**
- Create: `src/pages/AdIntelligencePage.jsx`
- Create: `src/components/intelligence/CompetitorSearchBar.jsx`
- Create: `src/components/intelligence/AdResultCard.jsx`

- [ ] **Step 1: Create the components directory**

```bash
mkdir -p src/components/intelligence
```

- [ ] **Step 2: Write CompetitorSearchBar.jsx**

Search input with platform and format filter chips. Uses the same component patterns as `AdDiscoveryPage.jsx` (Button, Input, Badge from shadcn).

Props: `onSearch(query, platforms, formats)`, `loading`

Layout:
- Text input for competitor name/URL
- "Research" button (primary, indigo)
- Platform chips: All, Meta, Google, LinkedIn, TikTok, Web (toggle selection, multi-select)
- Format chips: Image, Video, Carousel (toggle selection, multi-select)

- [ ] **Step 3: Write AdResultCard.jsx**

Discovered ad card with thumbnail placeholder, platform badge, copy snippet, and action buttons.

Props: `ad`, `onAnalyze(ad)`, `onSave(ad)`, `saving`, `analyzing`

Layout:
- Thumbnail area (placeholder icon if no image)
- Platform badge (color per platform matching `PLATFORM_BADGES` from AdsManagerPage)
- Advertiser name + ad copy snippet (truncated to 2 lines)
- "Analyze" button (primary) + "Save" button (outline)

- [ ] **Step 4: Write AdIntelligencePage.jsx — Research Tab only (first pass)**

Initial version with just the Research tab working. Three-tab structure with Library and Competitors as placeholders.

State management:
- `activeTab`: 'research' | 'library' | 'competitors'
- `searchResults[]`: Array from search API
- `loading`: boolean
- `selectedAd`: ad object for teardown panel (null when closed)

API calls via `apiFetch` (always check for `.error` in response — `apiFetch` does NOT throw on 4xx/5xx):
- `POST /api/intelligence/search` → `setSearchResults`
- `POST /api/intelligence/analyze-ad` → opens teardown panel with result
- `POST /api/intelligence/library` → saves ad (NOTE: `toast.success()` is silenced globally — use visual state change like a checkmark icon on the card instead)

Layout:
- Header: "Ad Intelligence" title
- Tab bar: Research | Library | Competitors
- Research tab: CompetitorSearchBar → AdResultCard grid (3 columns)

- [ ] **Step 5: Commit**

```bash
git add src/components/intelligence/ src/pages/AdIntelligencePage.jsx
git commit -m "feat(intelligence): add Research tab with search and result cards"
```

---

## Task 11: Frontend — Ad Teardown Panel

**Files:**
- Create: `src/components/intelligence/AdTeardownPanel.jsx`
- Create: `src/components/intelligence/LandingPageAnalysis.jsx`
- Modify: `src/pages/AdIntelligencePage.jsx` (wire up teardown panel)

- [ ] **Step 1: Write AdTeardownPanel.jsx**

Slide-over panel (using `SlideOverPanel` from `src/components/ui/slide-over-panel.jsx`) showing the full ad analysis.

Props: `open`, `onClose`, `ad`, `analysis`, `onAnalyzeLanding(url)`, `onSave(ad, analysis)`, `onCreateCampaign(ad, analysis)`

Sections:
- Ad preview (thumbnail + source info + landing page URL link)
- Hook analysis (indigo card)
- Copy breakdown grid (headline, body, CTA, tone)
- Emotional triggers (purple pills)
- Strengths (green card with bullet list) / Weaknesses (red card with bullet list)
- Landing page analysis section (rendered by LandingPageAnalysis component, shown after analyze-landing call)
- Action bar: "Create Campaign from This Ad" (green), "Analyze Landing Page" (indigo), "Save to Library" (outline)

- [ ] **Step 2: Write LandingPageAnalysis.jsx**

Sub-component for landing page teardown display.

Props: `analysis` (the LandingPageAnalysis JSONB), `url`

Sections:
- Page structure (ordered list of section → content)
- Copy analysis (headline, subhead, CTA)
- Conversion tactics (purple pills)
- Design patterns (text block)
- Technical info grid (load time, mobile, pixels, A/B)
- "Opportunities to Beat This" (yellow/amber card with bullet list)

- [ ] **Step 3: Wire into AdIntelligencePage.jsx**

Add `AdTeardownPanel` to the page. When user clicks "Analyze" on a result card:
1. Call `POST /api/intelligence/analyze-ad`
2. Set `selectedAd` and `selectedAnalysis`
3. Open the teardown panel

When user clicks "Analyze Landing Page" in the panel:
1. Call `POST /api/intelligence/analyze-landing` with the ad's landing_page_url
2. Update the panel with landing page analysis

- [ ] **Step 4: Commit**

```bash
git add src/components/intelligence/AdTeardownPanel.jsx src/components/intelligence/LandingPageAnalysis.jsx src/pages/AdIntelligencePage.jsx
git commit -m "feat(intelligence): add ad teardown panel with landing page analysis"
```

---

## Task 12: Frontend — Library Tab

**Files:**
- Modify: `src/pages/AdIntelligencePage.jsx` (add Library tab content)

- [ ] **Step 1: Implement Library tab**

State:
- `libraryItems[]`: from `GET /api/intelligence/library`
- `libraryFilter`: { platform, favorite, competitor_id }

Features:
- Load library on tab switch
- Filter chips: All Platforms, Meta, Google, LinkedIn, TikTok | Favorites Only
- Grid of saved ad cards (reuse AdResultCard with slight variant — show favorite star, tags, notes)
- Click card → open AdTeardownPanel with saved analysis
- Star/favorite toggle: `PATCH /api/intelligence/library/:id { is_favorite: !current }`
- Delete: `DELETE /api/intelligence/library/:id`
- "Create Campaign" button on selected/bulk items

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdIntelligencePage.jsx
git commit -m "feat(intelligence): add Library tab with filtering and favorites"
```

---

## Task 13: Frontend — Competitors Tab

**Files:**
- Create: `src/components/intelligence/CompetitorProfile.jsx`
- Modify: `src/pages/AdIntelligencePage.jsx` (add Competitors tab content)

- [ ] **Step 1: Write CompetitorProfile.jsx**

Detail view for a single competitor. Shows profile info, grouped ads, and timeline.

Props: `competitor`, `ads[]`, `onEdit`, `onDelete`, `onRefresh`, `onCreateCampaign`

Layout:
- Header: name, website URL (link), industry badge, last researched date
- Notes section (editable)
- Saved ads grid (AdResultCard instances)
- "Research Again" button → calls refresh endpoint then triggers search
- "Create Campaign from Competitor" button → opens ResearchCampaignModal

- [ ] **Step 2: Implement Competitors tab**

State:
- `competitors[]`: from `GET /api/intelligence/competitors`
- `selectedCompetitor`: object with ads (from `GET /api/intelligence/competitors/:id`)
- `showNewCompetitor`: boolean for add form

Features:
- Competitor list (cards with name, industry, ad count, last researched)
- Click → load full profile with ads via `GET /api/intelligence/competitors/:id`
- "Add Competitor" inline form: name, website URL, industry → `POST /api/intelligence/competitors`
- Edit/delete actions
- Save competitor button on Research tab results (from search results, create a competitor profile and link ads)

- [ ] **Step 3: Commit**

```bash
git add src/components/intelligence/CompetitorProfile.jsx src/pages/AdIntelligencePage.jsx
git commit -m "feat(intelligence): add Competitors tab with profiles and grouped ads"
```

---

## Task 14: Frontend — Research Campaign Modal

**Files:**
- Create: `src/components/intelligence/ResearchCampaignModal.jsx`
- Modify: `src/pages/AdIntelligencePage.jsx` (wire up modal)

- [ ] **Step 1: Write ResearchCampaignModal.jsx**

Campaign creation modal pre-loaded with research intelligence. Two-column layout.

Props: `open`, `onClose`, `sourceAds[]`, `competitor`, `onCampaignCreated(campaign)`

Left column (campaign config):
- Research source badge (competitor name, ad count)
- Campaign name input
- Product description textarea (or URL for auto-fill via existing `/api/ads/synthesize-description`)
- Landing URL input
- Target audience input
- Platform selector chips (auto-selected based on competitor's active platforms)
- Objective selector (traffic/conversions/awareness/leads)
- Brand kit selector (dropdown from `/api/brand/kit`)

Right column (research intelligence):
- Competitive Strategy selector: 3 radio cards (Beat on Weaknesses, Match & Improve, Differentiate) — default to synthesis's `recommended_strategy`
- "Insights to Apply" checkboxes — populated from `POST /api/intelligence/synthesize` response. Each shows text + source + category.
- All checked by default for "Beat on Weaknesses", weaknesses unchecked for "Match & Improve", etc.

Generate button: "Generate Campaign — {Strategy} on {N} Insights"
- Calls `POST /api/intelligence/generate-campaign` with all config + selected insights
- On success: navigates to `/ads/:campaignId`

**On open**: auto-calls synthesize endpoint with source ad IDs to populate insights.

- [ ] **Step 2: Wire into AdIntelligencePage**

Add "Create Campaign" action from:
- Individual ad teardown panel → opens modal with single ad
- Library bulk select → opens modal with multiple ads
- Competitor profile → opens modal with all competitor's ads

- [ ] **Step 3: Commit**

```bash
git add src/components/intelligence/ResearchCampaignModal.jsx src/pages/AdIntelligencePage.jsx
git commit -m "feat(intelligence): add research campaign creation modal with strategy selector"
```

---

## Task 15: Frontend — Research Side Panel in Campaign Editor

**Files:**
- Create: `src/components/intelligence/ResearchSidePanel.jsx`
- Modify: `src/pages/AdCampaignEditor.jsx`

- [ ] **Step 1: Write ResearchSidePanel.jsx**

Collapsible sidebar showing research context for a campaign.

Props: `researchSession`, `onRegenerate(strategy)`

Layout:
- Header: "Research" + collapse toggle
- Competitor info card (name, ad count)
- Applied insights list (checkmarks + text)
- Competitor's top ad preview (thumbnail from source ads)
- "Regenerate with Different Strategy" button

Data loading: Fetches research session from campaign's `research_session_id` on mount.

- [ ] **Step 2: Modify AdCampaignEditor.jsx**

When loading a campaign, check for `research_session_id`. If present:
1. Fetch the research session (can be embedded in the campaign GET response or separate call)
2. Render `ResearchSidePanel` on the right side of the editor
3. Adjust the main editor width to accommodate the panel (flex layout: `flex: 2` for editor, `flex: 0.8` for panel)

- [ ] **Step 3: Commit**

```bash
git add src/components/intelligence/ResearchSidePanel.jsx src/pages/AdCampaignEditor.jsx
git commit -m "feat(intelligence): add research side panel to campaign editor"
```

---

## Task 16: Route Registration & Navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/VideoAdvertCreator.jsx` (sidebar navigation, around line 822 where "Ads Manager" link is)

- [ ] **Step 1: Add route to App.jsx**

Add before the existing `/ads/discover` route:

```jsx
<Route path="/ads/intelligence" element={<ProtectedRoute><AdIntelligencePage /></ProtectedRoute>} />
```

Add redirect for old discover route:

```jsx
<Route path="/ads/discover" element={<Navigate to="/ads/intelligence" replace />} />
```

Import at top:

```jsx
import AdIntelligencePage from './pages/AdIntelligencePage';
```

- [ ] **Step 2: Add sidebar navigation**

In `src/pages/VideoAdvertCreator.jsx`, find the "Ads Manager" card (around line 822). Add an "Ad Intelligence" card immediately after it, using the same pattern:

```jsx
<div
  onClick={() => navigate('/ads/intelligence')}
  className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
>
  <div className="flex items-center gap-2">
    <Search className="w-4 h-4 text-[#2C666E]" />
    <span className="text-xs font-medium text-gray-800">Ad Intelligence</span>
  </div>
  <p className="text-xs text-gray-500 mt-0.5">Research competitor ads & landing pages</p>
</div>
```

Import `Search` from lucide-react at the top of the file if not already imported.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/pages/VideoAdvertCreator.jsx
git commit -m "feat(intelligence): add routes and sidebar navigation"
```

---

## Task 17: Verification & Deploy

- [ ] **Step 1: Start dev server and verify**

```bash
npm run start
```

Open the app, navigate to `/ads/intelligence`. Verify:
1. Research tab loads, search bar is visible
2. Search returns results (enter a known brand name)
3. "Analyze" opens the teardown panel
4. "Analyze Landing Page" scrapes and shows results
5. "Save" adds to library
6. Library tab shows saved ads with filters
7. Competitors tab allows creating profiles
8. "Create Campaign" modal opens with research context
9. Campaign generation creates variations visible in `/ads/:id`
10. Research side panel appears in campaign editor for research-linked campaigns

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
fly deploy
```

- [ ] **Step 3: Update CLAUDE.md**

Add Ad Intelligence subsystem documentation to the CLAUDE.md Key Subsystems section, covering:
- Page location and route
- API endpoints namespace
- Database tables
- Key components
- Relationship to deprecated discover.js

- [ ] **Step 4: Commit CLAUDE.md**

```bash
git add CLAUDE.md
git commit -m "docs: add Ad Intelligence subsystem to CLAUDE.md"
git push origin main
```

---

## Deferred Features (v2)

These spec features are intentionally deferred from the v1 implementation:

1. **Quick Research Flow from Ads Manager** — The spec describes a "Research" toggle button in the campaign creation form that opens a research panel inline. This requires modifying the existing campaign creation flow in `AdsManagerPage.jsx`. Deferred to v2 after the standalone page is validated.
2. **Tag-based and date filtering in Library** — Library tab supports platform and favorite filters. Tag search and date range filters deferred to v2.
3. **`AdCloneModal.jsx` integration** — Existing clone modal can be integrated into the teardown panel as a video-specific action. Deferred.
4. **List endpoint pagination** — Acceptable for v1; add `limit`/`offset` if libraries grow large.
