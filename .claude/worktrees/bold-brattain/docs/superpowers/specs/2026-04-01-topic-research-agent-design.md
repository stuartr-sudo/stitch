# Topic Research Agent — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Feature:** AI-powered trending topic discovery for the Shorts Workbench

## Problem

The Shorts Workbench requires users to already know what they want to create. The Step 1 topic selection uses a static 3-level funnel (Category > Angle > Hook) with preset options per niche. Users who open the workbench without a specific idea in mind hit a mental roadblock — they stare at the selectors and don't know what to pick.

## Solution

A Topic Research Agent that discovers trending, timely topics for any niche using multi-query web search + GPT scoring. The agent answers the question: "What's trending in my niche right now that would make a good short?"

## Existing Code (to be upgraded)

Partial implementations already exist but lack the core features:

- **`api/lib/topicDiscovery.js`** — GPT-only topic generation. Passes search queries as text context but never calls SearchAPI. Uses single `estimatedViralPotential` score. Missing `story_context` field.
- **`api/shorts/discover-topics.js`** — Express handler that calls `discoverTopics()`. Already registered in server.js.
- **`api/campaigns/research.js`** — Separate legacy research endpoint with working SearchAPI integration (`searchRealStories()`). Uses `NICHE_SEARCH_QUERIES` (12 niches, 2-3 queries each). Has `StorySchema` with `story_context` field.

The upgrade takes the SearchAPI integration pattern from `research.js` and applies it to `topicDiscovery.js`, while adding dual-axis scoring and the `story_context` field.

## Architecture

### Data Flow

```
User picks niche (e.g. "ai_tech_news")
    |
    v
Fire 4 SearchAPI queries in parallel (Promise.allSettled):
  1. Breaking news query
  2. Viral/surprising angle query
  3. Controversy/debate query
  4. Human impact query
    |
    v
Collect ~30-40 raw articles from all queries
    |
    v
GPT-4.1-mini: deduplicate, score, rank, format
  - Deduplication by semantic similarity
  - Score: trending (high/med/low) + competition (high/med/low)
  - Output: 5-8 topic cards via Zod structured output
    |
    v
Return scored topic cards to frontend
    |
    v
User selects topic -> story_context flows into script generation
```

### Existing Endpoint (upgrade)

`POST /api/shorts/discover-topics` (already registered in server.js)

**Request:**
```json
{
  "niche": "ai_tech_news",
  "count": 8,
  "exclude_topics": ["GPT-5 release"]
}
```

**Response:**
```json
{
  "topics": [
    {
      "title": "This Robot Just Learned to Lie to Its Operators",
      "summary": "Researchers discovered deceptive behavior emerging in advanced AI systems without explicit training.",
      "angle": "AI safety researchers call this the alignment nightmare scenario",
      "why_viral": "Fear + surprise + relevance to everyone worried about AI",
      "story_context": "A March 2026 paper from Anthropic and DeepMind researchers documented cases where...",
      "trending_score": "high",
      "competition_score": "low"
    }
  ],
  "niche": "ai_tech_news",
  "query_count": 4,
  "source": "searchapi_plus_gpt"
}
```

**Auth:** Standard JWT via `authenticateToken` middleware.

**Route registration:** Already registered in `server.js` at `/api/shorts/discover-topics`.

**Response format change:** Current endpoint returns `{ success, suggestions }`. Update to `{ topics, niche, query_count, source }` to match the spec schema. The `topics` array uses field name `title` (matching `research.js` convention) instead of the current `topic` field name.

### Search Query Templates

Each niche gets 4 query templates targeting different content angles:

| Query Type | Purpose | Signal |
|---|---|---|
| Breaking news | What just happened | Recency, authority |
| Viral/surprising | Counterintuitive angles | Shareability, surprise factor |
| Controversy/debate | Engagement-driving topics | Comment potential, strong opinions |
| Human impact | Relatable stories | Emotional resonance, personal connection |

Query templates replace the existing `NICHE_SEARCH_QUERIES` in `api/lib/topicDiscovery.js` (currently 20 niches with 3 queries each). Expanded to 4 queries per niche (80 total). The `searchRealStories()` pattern from `api/campaigns/research.js` is reused for the actual SearchAPI calls.

Example for `ai_tech_news`:
```javascript
{
  ai_tech_news: [
    'AI breakthrough news this week',
    'AI surprising development most people don\'t know',
    'AI controversy debate 2026',
    'AI changing everyday life real story',
  ],
}
```

### Scoring

GPT-4.1-mini scores each topic on two axes using Zod structured output:

**Trending score:**
- `high` — published in last 48 hours, major outlets, actively developing story
- `medium` — published this week, moderate coverage
- `low` — older than a week or niche-only coverage

**Competition score:**
- `high` — topic already widely covered on YouTube/TikTok shorts
- `medium` — some coverage exists but fresh angles available
- `low` — under-covered topic with viral potential

Scoring is inferential (GPT estimates from its knowledge of content saturation). No additional API calls to YouTube or TikTok are required.

**Sort order:** Topics sorted by composite score — `high trending + low competition` surfaces first (best opportunities), descending through `high/med`, `med/low`, etc.

### Zod Schema

```javascript
const TopicDiscoverySchema = z.object({
  topics: z.array(z.object({
    title: z.string().describe('Compelling, click-worthy title for a 60-second short'),
    summary: z.string().describe('1-2 sentence summary of the story'),
    angle: z.string().describe('The specific hook or angle for a short-form video'),
    why_viral: z.string().describe('Why this topic will perform well on shorts platforms'),
    story_context: z.string().describe('Detailed paragraph with all key facts, names, dates — enough for a script writer to work from without additional research'),
    trending_score: z.enum(['high', 'medium', 'low']).describe('How trending this topic is right now'),
    competition_score: z.enum(['high', 'medium', 'low']).describe('How much existing short-form content covers this topic'),
  })),
});
```

### Cost

- 4 SearchAPI calls: ~$0.004-0.02 (depending on plan)
- 1 GPT-4.1-mini call (~2K input tokens, ~1.5K output): ~$0.01
- **Total per discovery: ~$0.02-0.03**

## Frontend Changes

### Workbench Step 1 Modifications

The topic selection area in `ShortsWorkbenchPage.jsx` changes from the 3-level funnel to a two-path layout:

**Primary path (new):** "Discover Trending Topics" button
- Appears after niche selection
- Prominent styling (primary color, full-width)
- Button text: "Find Trending Topics for {niche_name}"
- Click fires `POST /api/shorts/discover-topics`

**Secondary path (existing):** "Or choose a topic manually"
- Collapsed accordion containing the existing 3-level funnel
- No code changes to the funnel itself
- Opens on click, works exactly as before

### Loading State

While the discovery API is running (~10-15 seconds):
- 5-8 skeleton cards with shimmer animation
- Text: "Researching trending topics in {niche_name}..."
- Button disabled to prevent double-firing

### Topic Cards

Each card displays:
- **Title** (bold, primary text)
- **Summary** (1 line, secondary text)
- **Hook/angle** (small text, muted)
- **Trending badge** — green "High", amber "Med", gray "Low"
- **Competition badge** — green "Low" (good), amber "Med", red "High"

Click behavior:
- Card gets a highlighted border (purple, matching app theme)
- "Selected" indicator appears on the card
- Topic title auto-fills the topic text input field
- `story_context` stored in component state

### Refresh Button

Small refresh icon button in the topic results header. Re-runs the same discovery call. Results differ due to SERP freshness + GPT variation.

### Topic Text Input

The existing editable topic text field remains. After selecting a discovered topic, the user can tweak the wording before generating a script. The `story_context` persists regardless of title edits.

### State Management

New state fields in the workbench component:
```javascript
const [discoveredTopics, setDiscoveredTopics] = useState([]);
const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
const [storyContext, setStoryContext] = useState('');
const [isDiscovering, setIsDiscovering] = useState(false);
```

These follow the existing pattern of scene-level state in the workbench.

## Script Generation Integration

### Narrative Generator Changes

`api/lib/narrativeGenerator.js` — `generateNarrative()` already accepts an optional `storyContext` parameter (verified in existing code). When present, it's injected into the system prompt:

```
RESEARCH CONTEXT (use these real facts in the script):
{story_context}

Write the narration using the facts above. Do NOT make up
statistics, names, or dates — use what's provided.
```

When absent (manual topic or free-text), the generator works exactly as it does today.

### Script Generation Integration Point

The frontend calls `/api/campaigns/preview-script` (not the workbench voiceover action) to generate scripts. The `preview-script` endpoint already feeds into `generateNarrative()`, which already accepts `storyContext`. The frontend simply needs to pass `storyContext` in the request body alongside the existing `topic` field. No backend endpoint changes needed for this integration — `generateNarrative()` already handles it.

The workbench `voiceover` action handles TTS generation only (after script is already written) and does not need `story_context`.

### Draft Persistence

`story_context` is included in the draft's `storyboard_json` alongside the topic string. When a draft is loaded, the story context is restored so the user can see what research backed their script.

## Error Handling

**SearchAPI failure:** If SearchAPI is unavailable or returns no results, fall back to GPT-only mode (same as current behavior). The response includes a `source` field: `"searchapi_plus_gpt"` when real articles are used, `"gpt_only"` when falling back. Frontend can optionally show a subtle indicator.

**GPT failure:** Return 500 with error message. No fallback — the feature requires GPT. If GPT fails after SearchAPI has already returned results, still return 500 (no partial results).

**Partial query failure:** `Promise.allSettled` means if 1-2 of 4 queries fail, the remaining results still process. Only a total failure triggers the GPT-only fallback.

**Rate limiting:** Frontend disables the Discover button for 10 seconds after a request completes (prevents rapid-fire clicks). No backend rate limiting needed — the cost per call is low enough ($0.02-0.03) that occasional refreshes are fine.

## Files Changed

| File | Change |
|---|---|
| `api/lib/topicDiscovery.js` | **Upgrade** — add SearchAPI calls, dual scoring, `story_context` field, new Zod schema |
| `api/shorts/discover-topics.js` | **Update** — restructure response to `{ topics, niche, query_count, source }` format |
| `api/lib/narrativeGenerator.js` | No changes needed — already accepts `storyContext` param |
| `src/pages/ShortsWorkbenchPage.jsx` | Replace topic funnel primary path with discovery UI |

## Backward Compatibility

- The manual topic funnel is preserved as a secondary path — no removal of existing code
- `story_context` is optional everywhere — all existing flows work without it
- The legacy `api/campaigns/research.js` endpoint is untouched
- Draft loading: older drafts without `storyContext` load fine (field defaults to empty string)

## Dependencies

- **SearchAPI/SERP API key** — already used elsewhere in the codebase (`api/campaigns/research.js`, `api/images/search.js`). Resolved via `process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY`.
- **OpenAI API key** — already used everywhere. Resolved via `getUserKeys()`.
- No new external dependencies or packages required.

## Out of Scope

- Scheduled/background topic discovery (can be added later as Approach C)
- Social platform scraping (YouTube/TikTok trending analysis)
- Competitor channel analysis
- Topic caching or persistence between sessions
- Analytics on which discovered topics perform best after publishing
