# Topic Research Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Shorts Workbench topic selection from a static funnel to AI-powered trending topic discovery with real web search, dual-axis scoring, and story context that flows into script generation.

**Architecture:** Upgrade `api/lib/topicDiscovery.js` to fire 4 parallel SearchAPI queries per niche (reusing the `searchRealStories()` pattern from `api/campaigns/research.js`), score with GPT-4.1-mini on trending + competition axes, and return rich topic cards. Frontend replaces the 3-level funnel as the primary path with a "Discover Trending Topics" button that shows scored cards.

**Tech Stack:** SearchAPI (Google News), OpenAI GPT-4.1-mini (Zod structured output), React (existing Tailwind/Radix patterns)

**Spec:** `docs/superpowers/specs/2026-04-01-topic-research-agent-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `api/lib/topicDiscovery.js` | Rewrite | SearchAPI multi-query, GPT scoring, new schema |
| `api/shorts/discover-topics.js` | Update | Response format change |
| `src/pages/ShortsWorkbenchPage.jsx` | Modify | Discovery UI, topic cards, manual funnel collapse |

**No changes needed:**
- `api/lib/narrativeGenerator.js` — already accepts `storyContext`
- `api/campaigns/preview-script` — already passes `storyContext` through
- `server.js` — route already registered

---

### Task 1: Upgrade `topicDiscovery.js` — SearchAPI Integration

**Files:**
- Rewrite: `api/lib/topicDiscovery.js`

**Reference:** `api/campaigns/research.js` lines 55-113 for the `searchRealStories()` pattern.

- [ ] **Step 1: Add `searchNicheArticles()` function**

Add a function that fires all 4 queries for a niche in parallel via SearchAPI. Reuse the exact SearchAPI URL pattern from `research.js`:

```javascript
async function searchNicheArticles(niche) {
  const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
  if (!searchApiKey) {
    console.warn('[topicDiscovery] No SearchAPI key — falling back to GPT-only');
    return null;
  }

  const queries = NICHE_SEARCH_QUERIES[niche];
  if (!queries || queries.length === 0) return null;

  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const url = new URL('https://www.searchapi.io/api/v1/search');
      url.searchParams.set('api_key', searchApiKey);
      url.searchParams.set('engine', 'google_news');
      url.searchParams.set('q', query);
      url.searchParams.set('num', '10');

      console.log(`[topicDiscovery] SearchAPI query: "${query}"`);
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.warn(`[topicDiscovery] SearchAPI returned ${response.status} for "${query}"`);
        return [];
      }

      const data = await response.json();
      const articles = data.news_results || data.organic_results || [];
      return articles.slice(0, 8).map(a => ({
        title: a.title || '',
        snippet: a.snippet || a.description || '',
        source: a.source?.name || a.source || '',
        link: a.link || '',
        date: a.date || a.published_date || '',
      })).filter(a => a.title);
    })
  );

  // Flatten successful results, discard failures
  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  if (allArticles.length === 0) {
    console.warn('[topicDiscovery] All SearchAPI queries returned no results');
    return null;
  }

  console.log(`[topicDiscovery] Collected ${allArticles.length} articles from ${results.filter(r => r.status === 'fulfilled').length}/${queries.length} queries`);
  return allArticles;
}
```

- [ ] **Step 2: Expand `NICHE_SEARCH_QUERIES` to 4 per niche**

Replace the existing 3-query-per-niche mapping with 4 queries per niche following the pattern: breaking news, viral/surprising, controversy/debate, human impact. Use `new Date().getFullYear()` for the year (same pattern as `research.js` line 39).

All 20 niches must have 4 queries. Keep the existing niche keys from `topicDiscovery.js` exactly as-is. Each niche follows the same 4-type pattern:

1. Breaking news: `"{niche_keyword} news this week {currentYear}"`
2. Viral/surprising: `"{niche_keyword} surprising fact most people don't know"`
3. Controversy: `"{niche_keyword} controversy debate {currentYear}"`
4. Human impact: `"{niche_keyword} changing lives real story"`

```javascript
const currentYear = new Date().getFullYear();
const NICHE_SEARCH_QUERIES = {
  ai_tech_news: [
    `AI breakthrough news this week ${currentYear}`,
    'AI surprising development most people don\'t know',
    `AI controversy debate ${currentYear}`,
    'AI changing everyday life real story',
  ],
  finance_money: [
    `stock market news this week ${currentYear}`,
    'money fact most people get wrong',
    `financial controversy scandal ${currentYear}`,
    'money changing someone\'s life real story',
  ],
  motivation: [
    `motivational comeback story ${currentYear}`,
    'self improvement secret most people miss',
    `motivation debate hustle culture ${currentYear}`,
    'life transformation real story inspiring',
  ],
  horror_creepy: [
    `creepy unexplained event ${currentYear}`,
    'scariest true story nobody talks about',
    `paranormal controversy evidence ${currentYear}`,
    'terrifying experience real person story',
  ],
  history_era: [
    `history discovery new finding ${currentYear}`,
    'bizarre history fact nobody knows',
    `historical controversy revisionist ${currentYear}`,
    'history changed someone life real story',
  ],
  crime_mystery: [
    `unsolved crime breakthrough ${currentYear}`,
    'true crime case most people never heard of',
    `criminal justice controversy ${currentYear}`,
    'crime victim survivor real story',
  ],
  science_nature: [
    `science discovery breakthrough ${currentYear}`,
    'science fact that sounds fake but is real',
    `scientific controversy debate ${currentYear}`,
    'nature phenomenon affecting real people',
  ],
  dating_relationships: [
    `relationship trend ${currentYear}`,
    'dating psychology fact most people get wrong',
    `relationship controversy debate ${currentYear}`,
    'love story extraordinary real couple',
  ],
  fitness_health: [
    `health discovery study ${currentYear}`,
    'fitness myth debunked surprising',
    `health controversy diet ${currentYear}`,
    'health transformation real person story',
  ],
  gaming: [
    `gaming news this week ${currentYear}`,
    'video game secret nobody found',
    `gaming controversy drama ${currentYear}`,
    'gaming changed someone life real story',
  ],
  conspiracy: [
    `declassified government secret ${currentYear}`,
    'conspiracy theory that turned out true',
    `conspiracy controversy evidence ${currentYear}`,
    'unexplained event witnessed real people',
  ],
  business_startup: [
    `startup news funding ${currentYear}`,
    'business strategy nobody talks about',
    `business scandal controversy ${currentYear}`,
    'entrepreneur success story unexpected',
  ],
  food_cooking: [
    `food trend ${currentYear}`,
    'food science fact most people don\'t know',
    `food industry controversy scandal ${currentYear}`,
    'cooking changed someone life real story',
  ],
  travel: [
    `travel destination trending ${currentYear}`,
    'travel secret hidden gem nobody visits',
    `tourism controversy overtourism ${currentYear}`,
    'travel experience life changing real story',
  ],
  psychology: [
    `psychology study finding ${currentYear}`,
    'human behavior fact most people get wrong',
    `psychology controversy debate ${currentYear}`,
    'psychology insight changed real person life',
  ],
  space_cosmos: [
    `space discovery NASA ${currentYear}`,
    'cosmic mystery scientists can\'t explain',
    `space exploration controversy ${currentYear}`,
    'space event affecting earth real impact',
  ],
  animals_nature: [
    `animal discovery species ${currentYear}`,
    'animal ability superpower nobody knows about',
    `wildlife conservation controversy ${currentYear}`,
    'animal rescued saved real story',
  ],
  sports: [
    `sports news this week ${currentYear}`,
    'sports record statistic most people don\'t know',
    `sports controversy scandal ${currentYear}`,
    'athlete comeback against all odds real story',
  ],
  education: [
    `education change policy ${currentYear}`,
    'school fact most people get wrong',
    `education system controversy ${currentYear}`,
    'education changed someone life real story',
  ],
  paranormal_ufo: [
    `UFO sighting report ${currentYear}`,
    'paranormal event documented evidence nobody talks about',
    `UFO disclosure controversy ${currentYear}`,
    'paranormal experience real person testimony',
  ],
};
```

- [ ] **Step 3: Update Zod schema to `TopicDiscoverySchema`**

Replace `HookSuggestionSchema` with the spec's schema. Key changes: `topic` → `title`, add `summary`, `story_context`, add dual scoring (`trending_score` + `competition_score`), remove `hookLine`, `whyItWorks`, `estimatedViralPotential`.

```javascript
const TopicDiscoverySchema = z.object({
  topics: z.array(z.object({
    title: z.string().describe('Compelling, click-worthy title for a 60-second short'),
    summary: z.string().describe('1-2 sentence summary of the story'),
    angle: z.string().describe('The specific hook or angle for a short-form video'),
    why_viral: z.string().describe('Why this topic will perform well on shorts platforms'),
    story_context: z.string().describe('Detailed paragraph with all key facts, names, dates — enough for a script writer to work from without additional research'),
    trending_score: z.enum(['high', 'medium', 'low']).describe('How trending: high=last 48hrs major outlets, medium=this week, low=older/niche'),
    competition_score: z.enum(['high', 'medium', 'low']).describe('Content saturation: high=widely covered on shorts, medium=some coverage, low=under-covered'),
  })),
});
```

- [ ] **Step 4: Rewrite `discoverTopics()` to use SearchAPI + GPT scoring**

The function signature stays the same but the internals change. Two modes: SearchAPI+GPT (when articles found) and GPT-only (fallback).

```javascript
export async function discoverTopics({
  niche,
  framework,
  count = 8,
  excludeTopics = [],
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for topic discovery');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // Step 1: Search for real articles
  const articles = await searchNicheArticles(niche);
  const hasArticles = articles && articles.length > 0;

  // Step 2: Build prompt based on whether we have real articles
  const excludeBlock = excludeTopics.length > 0
    ? `\nAVOID these already-used topics:\n${excludeTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  const hookPattern = framework?.narrative?.hookPattern || 'mystery-reveal';

  const systemPrompt = hasArticles
    ? `You are a viral content researcher for ${niche.replace(/_/g, ' ')} short-form videos.

You have REAL trending articles below. Pick the ${count} most compelling and transform them into viral short-form video concepts.

For each topic:
- Use REAL facts from the articles — do NOT make up information
- The story_context field must include all key facts, names, dates from the article — rich enough for a script writer
- Find the most surprising or counterintuitive angle
- Rate trending_score based on article recency and source authority
- Rate competition_score based on how much short-form content likely already covers this topic

HOOK PATTERN: ${hookPattern}${excludeBlock}`
    : `You are a viral content researcher for ${niche.replace(/_/g, ' ')} short-form videos.

Generate ${count} specific, research-backed topic suggestions. Each must be:
1. SPECIFIC — real names, dates, places (not vague)
2. HOOK-FIRST — creates an information gap
3. VERIFIABLE — based on real facts or events
4. Include rich story_context with all facts a script writer would need

HOOK PATTERN: ${hookPattern}${excludeBlock}`;

  const userPrompt = hasArticles
    ? `Here are real trending articles:\n\n${articles.map((a, i) => `${i + 1}. "${a.title}" (${a.source}, ${a.date})\n   ${a.snippet}`).join('\n\n')}\n\nTransform the ${count} best into viral short-form video concepts.`
    : `Generate ${count} viral topic suggestions for ${niche.replace(/_/g, ' ')} content.`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(TopicDiscoverySchema, 'topic_discovery'),
    temperature: 1.0,
  });

  const result = completion.choices[0].message.parsed;

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_topic_discovery',
      model: 'gpt-4.1-mini-2025-04-14',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  // Sort by composite score: high trending + low competition first
  const trendOrder = { high: 0, medium: 1, low: 2 };
  const compOrder = { low: 0, medium: 1, high: 2 }; // inverted — low competition is best
  const sorted = result.topics.sort((a, b) => {
    const scoreA = trendOrder[a.trending_score] + compOrder[a.competition_score];
    const scoreB = trendOrder[b.trending_score] + compOrder[b.competition_score];
    return scoreA - scoreB;
  });

  const queryCount = NICHE_SEARCH_QUERIES[niche]?.length || 0;
  console.log(`[topicDiscovery] Generated ${sorted.length} topics for ${niche} (source: ${hasArticles ? 'searchapi_plus_gpt' : 'gpt_only'})`);

  return {
    topics: sorted,
    source: hasArticles ? 'searchapi_plus_gpt' : 'gpt_only',
    queryCount,
  };
}
```

- [ ] **Step 5: Commit backend changes**

```bash
git add api/lib/topicDiscovery.js
git commit -m "feat: upgrade topicDiscovery with SearchAPI multi-query + dual scoring"
```

---

### Task 2: Update `discover-topics.js` Response Format

**Files:**
- Modify: `api/shorts/discover-topics.js`

- [ ] **Step 1: Update endpoint to pass through new response format**

The `discoverTopics()` function now returns `{ topics, source, queryCount }` instead of a flat array. Update the handler:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, framework: frameworkId, count = 8, excludeTopics = [] } = req.body;

  if (!niche) return res.status(400).json({ error: 'niche is required' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const framework = frameworkId ? getFramework(frameworkId) : null;

    const result = await discoverTopics({
      niche,
      framework,
      count,
      excludeTopics,
      keys,
      brandUsername: req.user.email,
    });

    res.json({
      topics: result.topics,
      niche,
      query_count: result.queryCount,
      source: result.source,
    });
  } catch (err) {
    console.error('[discover-topics] Error:', err.message);
    res.status(500).json({ error: err.message || 'Topic discovery failed' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/shorts/discover-topics.js
git commit -m "feat: update discover-topics response format with metadata"
```

---

### Task 3: Test Backend Manually

No test runner is configured for this project. Test via curl or the running dev server.

- [ ] **Step 1: Start the dev server**

```bash
npm run server
```

- [ ] **Step 2: Test the endpoint**

Get a valid JWT from the browser dev tools (Network tab → any API request → Authorization header). Then:

```bash
curl -X POST http://localhost:3003/api/shorts/discover-topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"niche": "ai_tech_news", "count": 5}'
```

**Expected response structure:**
```json
{
  "topics": [
    {
      "title": "...",
      "summary": "...",
      "angle": "...",
      "why_viral": "...",
      "story_context": "...",
      "trending_score": "high|medium|low",
      "competition_score": "high|medium|low"
    }
  ],
  "niche": "ai_tech_news",
  "query_count": 4,
  "source": "searchapi_plus_gpt"
}
```

**Verify:**
- `topics` array has 5 items
- Each topic has all 7 fields
- `source` is `"searchapi_plus_gpt"` (if SEARCHAPI_KEY is set) or `"gpt_only"` (if not)
- Topics are sorted (high trending + low competition first)
- `story_context` has real facts, not vague filler

- [ ] **Step 3: Test fallback (no SearchAPI key)**

Temporarily comment out `SEARCHAPI_KEY` in `.env`, restart server, re-run the curl. Verify `source` is `"gpt_only"` and topics are still returned.

---

### Task 4: Frontend — Discovery UI

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

**Context:** The workbench already has `storyContext`, `researchedStories`, `selectedStoryIdx` state variables and a story card UI (lines 992-1008). The existing `handleResearch` function (line 563) calls `/api/campaigns/research` and requires a topic to be entered first. We need to:
1. Add a new `handleDiscoverTopics` that calls `/api/shorts/discover-topics` (no topic required)
2. Add "Discover Trending Topics" button as the primary path
3. Collapse the 3-level funnel into an accordion
4. Update topic cards to show dual scoring badges

- [ ] **Step 1: Add `handleDiscoverTopics` function**

Add after the existing `handleResearch` function (~line 578):

```javascript
const [isDiscovering, setIsDiscovering] = useState(false);

const handleDiscoverTopics = async () => {
  if (!niche) { toast.error('Select a niche first'); return; }
  setIsDiscovering(true);
  setResearchedStories([]);
  setSelectedStoryIdx(null);
  try {
    const res = await apiFetch('/api/shorts/discover-topics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, count: 8 }),
    });
    const data = await parseApiResponse(res);
    if (data.topics) {
      setResearchedStories(data.topics);
    }
  } catch (err) { toast.error(err.message || 'Topic discovery failed'); }
  finally { setIsDiscovering(false); }
};
```

Note: This reuses the existing `researchedStories` state to hold discovered topics — the card rendering is compatible since both have `title`, `angle`, `summary` fields. Add `isDiscovering` to the existing state declarations (~line 410 area).

- [ ] **Step 2: Add "Discover Trending Topics" button**

Insert before the existing topic funnel section (before line 926 `{/* 3-level topic funnel */}`):

```jsx
{/* Discover Trending Topics — primary path */}
{niche && (
  <div className="mb-3">
    <button
      onClick={handleDiscoverTopics}
      disabled={isDiscovering}
      className="w-full bg-[#2C666E] hover:bg-[#235258] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {isDiscovering ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Researching trending topics...</>
      ) : (
        <><Search className="w-4 h-4" /> Find Trending Topics</>
      )}
    </button>
  </div>
)}
```

Add `Search` to the lucide-react imports at the top of the file if not already imported.

- [ ] **Step 3: Wrap topic funnel in a collapsible accordion**

Wrap the existing 3-level funnel (lines 926-989) in a disclosure:

```jsx
{/* Manual topic funnel — secondary path */}
{niche && TOPIC_SUGGESTIONS[niche] && (
  <details className="mb-3">
    <summary className="text-[10px] text-slate-400 uppercase font-medium cursor-pointer hover:text-slate-600 select-none">
      Or choose a topic manually
    </summary>
    <div className="mt-2">
      {/* existing funnel code goes here unchanged */}
    </div>
  </details>
)}
```

- [ ] **Step 4: Update topic cards to show scoring badges**

Replace the existing story card rendering (lines 992-1008) with enhanced cards that show dual scoring:

```jsx
{researchedStories.length > 0 && (
  <div className="space-y-2 mb-3">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-medium text-[#2C666E] uppercase tracking-wide">
        Trending Topics
      </label>
      <button
        onClick={handleDiscoverTopics}
        disabled={isDiscovering}
        className="text-[10px] text-slate-400 hover:text-[#2C666E] flex items-center gap-1"
      >
        <RefreshCw className="w-3 h-3" /> Refresh
      </button>
    </div>
    {researchedStories.map((s, i) => (
      <button key={i} onClick={() => {
        setSelectedStoryIdx(i);
        setTopic(s.title);
        setStoryContext(s.story_context || s.summary || '');
      }}
        className={cn('w-full text-left p-3 border-2 rounded-xl text-xs transition-all',
          selectedStoryIdx === i ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300')}>
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-slate-800">{s.title}</div>
          <div className="flex gap-1 shrink-0">
            {s.trending_score && (
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                s.trending_score === 'high' ? 'bg-green-100 text-green-700' :
                s.trending_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-500')}>
                {s.trending_score === 'high' ? 'Trending' : s.trending_score === 'medium' ? 'Warm' : 'Steady'}
              </span>
            )}
            {s.competition_score && (
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                s.competition_score === 'low' ? 'bg-green-100 text-green-700' :
                s.competition_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700')}>
                {s.competition_score === 'low' ? 'Low comp' : s.competition_score === 'medium' ? 'Med comp' : 'High comp'}
              </span>
            )}
          </div>
        </div>
        <div className="text-slate-500 mt-1 leading-relaxed">{s.summary || s.angle}</div>
        {selectedStoryIdx === i && (
          <div className="mt-1.5 text-[9px] text-[#2C666E] font-medium">Selected</div>
        )}
      </button>
    ))}
  </div>
)}
```

Add `RefreshCw` to the lucide-react imports if not already imported.

- [ ] **Step 5: Commit frontend changes**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add topic discovery UI with trending/competition badges"
```

---

### Task 5: Verify End-to-End Flow

- [ ] **Step 1: Start full dev environment**

```bash
npm run start
```

- [ ] **Step 2: Open workbench and test discovery flow**

1. Navigate to `http://localhost:4390/shorts/workbench`
2. Select a niche (e.g., "AI & Tech News")
3. Click "Find Trending Topics" button
4. Verify loading state shows
5. Verify 5-8 topic cards appear with trending/competition badges
6. Click a topic card — verify it highlights and fills the topic input
7. Click "Generate Script" — verify the script uses facts from `story_context`

- [ ] **Step 3: Test manual funnel fallback**

1. Click "Or choose a topic manually" accordion
2. Verify the 3-level funnel still works identically
3. Pick a topic via the funnel → generate script → verify it works as before

- [ ] **Step 4: Test refresh**

1. After topics load, click the Refresh button
2. Verify new topics appear (different from first batch)

- [ ] **Step 5: Test draft persistence**

1. Discover topics, select one, generate a script
2. Save draft
3. Navigate away and load the draft
4. Verify the topic and story context are restored

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during e2e testing"
```

---

### Task 6: Deploy

- [ ] **Step 1: Push to remote**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to Fly.io**

Ensure no active generation pipelines are running, then:

```bash
fly deploy
```

- [ ] **Step 3: Verify in production**

Test the discovery flow on `https://stitchstudios.app/shorts/workbench`.
