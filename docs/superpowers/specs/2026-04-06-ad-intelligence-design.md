# Ad Intelligence — Competitive Research & Campaign Creation

**Date:** 2026-04-06
**Status:** Design approved, pending implementation

## Problem

Users need to research competitor ads, analyze what's working, study their landing pages, and use those insights to create better campaigns. Currently the Ads Manager has a partial `discover.js` API and `AdDiscoveryPage.jsx` stub, but no persistent library, no landing page analysis, no competitor profiles, and no research-to-campaign pipeline.

## Existing Code & Migration Strategy

### What already exists:
- **`api/ads/discover.js`** — Working handler with search, analyze, save, list, delete actions. Uses GPT-4.1 web search for ad discovery and Zod-structured analysis. This will be **superseded** by the new `/api/intelligence/*` endpoints which expand its functionality.
- **`src/pages/AdDiscoveryPage.jsx`** — Existing frontend page (~643 lines). Will be **replaced** by `AdIntelligencePage.jsx`.
- **`supabase/migrations/20260405_ad_library.sql`** — Existing `ad_library` table with a simpler schema (id, user_id, source_url NOT NULL, platform, niche, thumbnail_url, analysis JSONB, clone_recipe JSONB, tags text[], created_at). Must be **extended via ALTER TABLE**, not recreated.
- **`src/components/ads/AdCloneModal.jsx`** — Clone competitor video angles. Can be reused within the new system.

### Migration approach:
1. The new migration uses `ALTER TABLE ad_library` to add missing columns (competitor_id, ad_format, ad_copy, landing_page_url, landing_page_analysis, is_favorite, notes, discovered_at, updated_at) and relaxes `source_url` from NOT NULL to nullable.
2. The existing `niche` and `clone_recipe` columns are **kept** for backward compatibility with any existing saved ads.
3. Old `/api/ads/discover` route stays registered in server.js but is effectively deprecated — the frontend will point to the new intelligence endpoints.
4. `/ads/discover` route in App.jsx redirects to `/ads/intelligence`.

### Analysis schema alignment:
The existing `AdAnalysis` Zod schema in `discover.js` has `estimated_platform` and `clone_suggestions`. The new analysis schema adds `tone` to `copy_breakdown` and keeps `clone_suggestions`. Both schemas write to `ad_library.analysis` JSONB — the new frontend components will handle both shapes gracefully (optional chaining for `tone`, `estimated_platform` treated as legacy).

## Solution

A two-tier competitive intelligence system:

1. **Ad Intelligence Page** (`/ads/intelligence`) — Standalone deep research workspace with three tabs: Research, Library, Competitors.
2. **Research Panel** — Lightweight sidebar in the Campaign Editor that surfaces research insights during campaign creation.

## Architecture: Two-Tier Approach

### Tier 1: Ad Intelligence Page

A new top-level page under "Advertise" in the sidebar, alongside Ads Manager. Three tabs:

**Research Tab:**
- Search bar accepting competitor brand name, website URL, or direct ad URL
- Platform filters: Meta, Google, LinkedIn, TikTok, Web
- Format filters: Image, Video, Carousel
- Results grid showing discovered ads with preview, platform badge, copy snippet
- Per-ad actions: Analyze, Save to Library
- Multi-source discovery: GPT web search targeting ad library sites + general web scraping + AI analysis

**Library Tab:**
- Saved competitor ads with filtering by platform, niche, date, tags
- Tag system for organization
- Star/favorite system
- Notes per saved ad
- Quick re-analyze (track how ads change over time)
- Bulk select for campaign creation

**Competitors Tab:**
- Saved competitor profiles (name, URL, industry, notes)
- All their saved ads grouped under profile
- Landing page analysis summaries (from `landing_page_analysis` JSONB on saved ads — not visual snapshots)
- Activity timeline derived from saved ads' `created_at` and competitor's `last_researched_at` timestamps
- "Research again" to check for new ads
- Quick campaign creation from profile

### Tier 2: Campaign Editor Research Panel

When creating a campaign from research (or opening a campaign that has a linked research session), the Campaign Editor shows a collapsible Research Panel sidebar:

- Source competitor and research stats
- Applied insights checklist (which insights were used in generation)
- Competitor's top ad for reference
- "Regenerate with Different Strategy" button

## User Workflow

### Deep Research Flow
1. Navigate to Ad Intelligence page
2. Enter competitor name or URL in search bar
3. System searches across ad library APIs + web
4. Results grid shows discovered ads
5. Click "Analyze" on any ad → slide-over panel with full AI teardown
6. Click "Analyze Landing Page" → scrapes and tears down the landing page
7. Save ads to Library, add to Competitor profile
8. Click "Create Campaign from This Ad" → creation modal opens

### Campaign Creation from Research
1. Creation modal pre-loaded with research context
2. Left side: standard campaign config (name, product, platforms, objective, brand kit)
3. Right side: Research Intelligence panel
   - **Competitive Strategy selector:** Beat on Weaknesses / Match & Improve / Differentiate
   - **Insights checkboxes:** Cherry-pick which insights to apply (each traced to source)
4. User fills in their product details, selects strategy, checks insights
5. Click "Generate Campaign — Beat [Competitor] on N Weaknesses"
6. System generates variations with research context injected into GPT prompts
7. Campaign editor opens with research sidebar visible

### Quick Research Flow (from Ads Manager)
1. Creating a new campaign in Ads Manager — a "Research" toggle button in the campaign creation form opens the Research Panel
2. Research Panel appears as a right sidebar within the creation modal
3. Quick competitor search inline
4. Browse insights, select what to apply
5. Generate with insights incorporated

## Ad Teardown Analysis

When analyzing a competitor ad, GPT-4.1 produces a structured analysis:

```json
{
  "hook": "Description of the opening hook and why it works",
  "copy_breakdown": {
    "headline": "Analysis of headline approach",
    "body": "Body copy analysis",
    "cta": "CTA text and effectiveness",
    "tone": "Overall tone classification"
  },
  "visual_style": "Description of visual approach",
  "target_audience": "Inferred target audience",
  "emotional_triggers": ["Achievement", "FOMO", "Aspiration"],
  "strengths": ["Strong hook", "Clear urgency"],
  "weaknesses": ["Generic CTA", "No social proof"],
  "clone_suggestions": ["Use specific testimonials", "Add risk reversal"]
}
```

## Landing Page Teardown

Firecrawl scrapes the page, then GPT-4.1 analyzes:

```json
{
  "page_structure": [
    { "section": "Hero", "content": "Headline + CTA + Product Image" },
    { "section": "Social Proof", "content": "10M+ runners stat" }
  ],
  "copy_analysis": {
    "headline": "Approach and effectiveness",
    "subhead": "Supporting copy analysis",
    "cta": "CTA text and friction removal"
  },
  "conversion_tactics": ["Social Proof Above Fold", "Sticky CTA", "Comparison Table"],
  "design_patterns": "Description of layout, visual hierarchy, UX patterns",
  "technical": {
    "load_time": "Estimated load speed",
    "mobile": "Responsive status",
    "tracking_pixels": ["Meta", "Google"],
    "ab_test_indicators": "Any signs of testing"
  },
  "opportunities": [
    "Their social proof is generic — use specific testimonials",
    "No money-back guarantee — add risk reversal",
    "No urgency mechanism — add scarcity"
  ]
}
```

## Data Model

### `competitors` table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → auth.users, NOT NULL | |
| name | text | NOT NULL | "Nike Running" |
| website_url | text | | "nike.com" |
| industry | text | | Optional classification |
| notes | text | | User notes |
| last_researched_at | timestamptz | | When we last searched for their ads |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

RLS: Users can only access their own rows.

### `ad_library` table (ALTER existing table)

The table already exists via `20260405_ad_library.sql` with columns: id, user_id, source_url (NOT NULL), platform, niche, thumbnail_url, analysis (JSONB), clone_recipe (JSONB), tags (text[]), created_at. The migration adds the following columns:

| New Column | Type | Constraints | Notes |
|------------|------|-------------|-------|
| competitor_id | uuid | FK → competitors, nullable | Link to competitor profile |
| ad_format | text | | image, video, carousel |
| ad_copy | text | | Raw copy text |
| landing_page_url | text | | Where the ad links to |
| landing_page_analysis | jsonb | | Landing page teardown |
| is_favorite | boolean | default false | Star/favorite |
| notes | text | | User notes |
| discovered_at | timestamptz | | When the ad was first found |
| updated_at | timestamptz | default now() | |

Also: `ALTER TABLE ad_library ALTER COLUMN source_url DROP NOT NULL` (ads discovered by name search may not have a direct URL initially). Existing columns `niche` and `clone_recipe` are kept.

RLS: Already enabled. Existing policy is sufficient.

### `research_sessions` table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → auth.users, NOT NULL | |
| campaign_id | uuid | FK → ad_campaigns, nullable | Campaign created from this research |
| competitor_id | uuid | FK → competitors, nullable | |
| strategy | text | | beat_weaknesses, match_improve, differentiate |
| applied_insights | jsonb | | Array of insight objects with source info |
| source_ads | uuid[] | default '{}' | ad_library IDs used as input |
| created_at | timestamptz | default now() | |

RLS: Users can only access their own rows.

### `ad_campaigns` extension

Add one nullable column:
- `research_session_id` uuid FK → research_sessions

## API Endpoints

All under `/api/intelligence/`, using `authenticateToken` middleware.

### Discovery & Analysis

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/intelligence/search` | `intelligence/search.js` | Multi-source competitor ad search |
| POST | `/api/intelligence/analyze-ad` | `intelligence/analyze-ad.js` | Deep AI teardown of a single ad |
| POST | `/api/intelligence/analyze-landing` | `intelligence/analyze-landing.js` | Scrape + analyze landing page via Firecrawl |
| POST | `/api/intelligence/synthesize` | `intelligence/synthesize.js` | Combine analyses into actionable insights |

### Library

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/intelligence/library` | `intelligence/library.js` | List saved ads (filter: competitor, platform, tags, favorite) |
| POST | `/api/intelligence/library` | `intelligence/library.js` | Save ad to library |
| PATCH | `/api/intelligence/library/:id` | `intelligence/library.js` | Update saved ad (tags, notes, favorite) |
| DELETE | `/api/intelligence/library/:id` | `intelligence/library.js` | Remove from library |

### Competitors

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/intelligence/competitors` | `intelligence/competitors.js` | List competitor profiles |
| POST | `/api/intelligence/competitors` | `intelligence/competitors.js` | Create competitor profile |
| GET | `/api/intelligence/competitors/:id` | `intelligence/competitors.js` | Get profile with all saved ads |
| PATCH | `/api/intelligence/competitors/:id` | `intelligence/competitors.js` | Update profile |
| DELETE | `/api/intelligence/competitors/:id` | `intelligence/competitors.js` | Delete profile and unlink (not delete) ads |
| POST | `/api/intelligence/competitors/:id/refresh` | `intelligence/competitors.js` | Re-search for new ads |

### Campaign Generation

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/intelligence/generate-campaign` | `intelligence/generate-campaign.js` | Generate campaign from research intel |

## Frontend Components

### New Page
- `src/pages/AdIntelligencePage.jsx` — Main page with Research/Library/Competitors tabs. Route: `/ads/intelligence`.

### New Components (in `src/components/intelligence/`)
- `CompetitorSearchBar.jsx` — Search input with platform/format filter chips
- `AdResultCard.jsx` — Discovered ad card (preview, platform badge, copy snippet, Analyze/Save buttons)
- `AdTeardownPanel.jsx` — Slide-over panel with full analysis (hook, copy, triggers, strengths/weaknesses)
- `LandingPageAnalysis.jsx` — Landing page teardown view (structure, copy, conversion tactics, opportunities)
- `CompetitorProfile.jsx` — Competitor detail view with grouped ads and timeline
- `ResearchCampaignModal.jsx` — Campaign creation modal with strategy selector and insights checkboxes
- `ResearchSidePanel.jsx` — Collapsible sidebar for Campaign Editor showing applied insights and competitor reference

### Modified Components
- `AdCampaignEditor.jsx` — Add optional ResearchSidePanel when campaign has research_session_id
- Sidebar navigation — Add "Ad Intelligence" link under "Advertise" section

## Technical Implementation Details

### Ad Discovery (search.js)
- Accepts: `{ query, platforms[], formats[] }`
- Uses GPT-4.1 with web search to find ads across:
  - Meta Ad Library (structured URL queries)
  - Google Ads Transparency Center
  - LinkedIn Ad Library
  - TikTok Creative Center
  - General web search (blog roundups, ad examples)
- Returns array of discovered ads with source URLs, platform, copy snippets, thumbnails

### Landing Page Analysis (analyze-landing.js)
- Accepts: `{ url }`
- Uses Firecrawl to scrape the landing page (same pattern as `api/brand/extract-url.js`)
- Passes scraped content to GPT-4.1 with structured output (Zod schema)
- Returns full teardown: structure, copy, conversion tactics, design, technical, opportunities

### Synthesize (synthesize.js)
- Accepts: `{ ad_ids[] }` — array of `ad_library` IDs to synthesize
- Fetches all analysis and landing_page_analysis JSONB from selected ads
- Passes combined data to GPT-4.1 with structured output
- Returns: `{ key_patterns[], weaknesses[], opportunities[], recommended_strategy, suggested_insights[] }`
- Each `suggested_insight` has: `text`, `source` (which ad/analysis it came from), `category` (hook, copy, visual, landing_page, conversion)
- This output populates the "Insights to Apply" checkboxes in the campaign creation modal

### Research-to-Campaign Bridge (generate-campaign.js)
- Accepts: `{ name, product_description, landing_url, target_audience, platforms[], objective, brand_kit_id, strategy, insights[], source_ad_ids[] }`
- Creates `ad_campaigns` row (status: 'draft') — same as existing `ads/campaigns.js` POST
- Creates `research_sessions` row linking campaign, competitor, strategy, insights
- Updates campaign with `research_session_id`
- Fetches analysis data from selected `ad_library` entries
- Builds enriched GPT system prompt by injecting into the existing `ads/generate.js` prompt pattern:
  - Competitor analysis summary (from synthesize output)
  - Selected strategy directive (beat/match/differentiate)
  - Selected insights as specific instructions
- Calls the same per-platform generation logic as `ads/generate.js`: GPT-4.1 for copy (platform-specific schemas), Nano Banana 2 for images
- Creates `ad_variations` rows with the same JSONB `copy_data` shapes per platform (LinkedIn: introText/headline/description/cta, Google RSA: headlines[]/descriptions[], Meta: primaryText/headline/description/cta)
- Does NOT import `generate.js` directly — duplicates the generation flow with research enrichment to avoid coupling

### Cost Logging
All GPT-4.1 calls in the new endpoints must call `logCost()` with:
- `category: 'openai'`
- `operation`: `'intelligence_search'`, `'intelligence_analyze_ad'`, `'intelligence_analyze_landing'`, `'intelligence_synthesize'`, `'intelligence_generate_campaign'`
- `model: 'gpt-4.1'`
- Token counts from completion.usage

### No New Provider Keys Required
- OpenAI (GPT-4.1): Ad analysis, landing page analysis, campaign generation — already configured
- FAL.ai (Nano Banana 2): Ad images — already configured
- Firecrawl: Landing page scraping — already configured via `FIRECRAWL_API_KEY`

## Migration

Single migration file: `supabase-migration-ad-intelligence.sql`

- **CREATE** `competitors` table with RLS (policy: users manage own rows)
- **CREATE** `research_sessions` table with RLS (write-once, no `updated_at`)
- **ALTER** `ad_library` — add columns: competitor_id, ad_format, ad_copy, landing_page_url, landing_page_analysis, is_favorite, notes, discovered_at, updated_at. Drop NOT NULL on source_url.
- **ALTER** `ad_campaigns` — add `research_session_id` uuid FK
- **CREATE** `updated_at` trigger function and apply to `competitors` and `ad_library`
- **CREATE** indexes on ad_library(user_id, competitor_id, platform, is_favorite) and competitors(user_id)
- Add FK constraint: ad_library.competitor_id → competitors.id ON DELETE SET NULL

## Route Registration (server.js)

Following the direct import pattern used by adjacent Ads Manager routes:

```javascript
// Ad Intelligence routes (near the Ads Manager block)
app.post('/api/intelligence/search', authenticateToken, async (req, res) => (await import('./api/intelligence/search.js')).default(req, res));
app.post('/api/intelligence/analyze-ad', authenticateToken, async (req, res) => (await import('./api/intelligence/analyze-ad.js')).default(req, res));
app.post('/api/intelligence/analyze-landing', authenticateToken, async (req, res) => (await import('./api/intelligence/analyze-landing.js')).default(req, res));
app.post('/api/intelligence/synthesize', authenticateToken, async (req, res) => (await import('./api/intelligence/synthesize.js')).default(req, res));
app.post('/api/intelligence/generate-campaign', authenticateToken, async (req, res) => (await import('./api/intelligence/generate-campaign.js')).default(req, res));
// Catch-all handlers with internal method+path routing (same pattern as storyboard/projects.js)
app.all('/api/intelligence/library*', authenticateToken, async (req, res) => (await import('./api/intelligence/library.js')).default(req, res));
app.all('/api/intelligence/competitors*', authenticateToken, async (req, res) => (await import('./api/intelligence/competitors.js')).default(req, res));
```

The `library.js` and `competitors.js` handlers use internal `req.method` + URL path routing (parsing `:id` from URL segments), following the same pattern as `api/storyboard/projects.js`.

## Scope & Non-Goals

**In scope:**
- Multi-source ad discovery (ad libraries + web search)
- AI ad teardown (hook, copy, triggers, strengths, weaknesses)
- Landing page scraping and analysis via Firecrawl
- Persistent competitor library with tags, favorites, notes
- Competitor profiles with grouped ads
- Research-to-campaign pipeline with strategy selection and insight checkboxes
- Research sidebar in campaign editor
- Three competitive strategies: Beat on Weaknesses, Match & Improve, Differentiate

**Not in scope (future):**
- Direct ad library API integrations (Meta, Google have official APIs but require approval — current implementation uses GPT web search targeting these sites)
- Automated competitor monitoring (scheduled re-checks)
- Performance benchmarking against competitor ads (requires platform analytics access)
- Ad spend estimation
- Competitor audience overlap analysis
- Export research as PDF/report
- List endpoint pagination (acceptable for v1; add limit/offset if libraries grow large)

## Follow-up Tasks

- Update CLAUDE.md with Ad Intelligence subsystem documentation
- Redirect `/ads/discover` → `/ads/intelligence` in App.jsx
- Deprecation notice on `api/ads/discover.js` (keep functional, stop extending)
