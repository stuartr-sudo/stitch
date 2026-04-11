// Command Center — SSE Streaming Chat Endpoint with Function Calling
// POST /api/command-center/chat
// Streams AI responses token-by-token via Server-Sent Events
// AI has tools: search_trending, research_topic, search_brand_knowledge, get_existing_content

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { buildChatContext } from '../lib/chatContextBuilder.js';
import { getUserKeys } from '../lib/getUserKeys.js';

// ── Tool definitions for OpenAI function calling ────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_trending',
      description: 'Search for trending topics and news articles relevant to a niche or industry. Returns real articles from Google News with titles, snippets, and sources. Use this to find real, current topics to base campaign content on — never make up topics.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for trending topics (e.g. "product liability insurance trends 2026", "AI startup funding news")' },
          niche: { type: 'string', description: 'Optional niche category for more targeted results', enum: ['ai_tech_news', 'finance_money', 'motivation', 'horror_creepy', 'history_era', 'crime_mystery', 'science_nature', 'dating_relationships', 'fitness_health', 'gaming', 'conspiracy', 'business_startup', 'food_cooking', 'travel', 'psychology', 'space_cosmos', 'animals_nature', 'sports', 'education', 'paranormal_ufo'] },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_topic',
      description: 'Deep research on a specific topic. Searches the web, scrapes top articles, and returns detailed research briefs with full article content. Use this when you need detailed facts, statistics, or context for a specific campaign topic.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The specific topic to research in depth' },
          count: { type: 'number', description: 'Number of research results (default: 5)', default: 5 },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_brand_knowledge',
      description: 'Search the brand\'s knowledge base for product info, FAQs, guidelines, and content. This contains real information about the brand — product descriptions, documentation, marketing copy, research, etc. ALWAYS use this when creating content about the brand\'s products or services to ensure accuracy.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query about the brand, products, or services' },
          domain: { type: 'string', description: 'Optional: specific website domain to search within' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_existing_content',
      description: 'Get the user\'s existing published content — LinkedIn posts, carousels, ad campaigns, and shorts. Use this to understand what they\'ve already created, avoid duplicating topics, and build on what\'s worked.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Content type to retrieve', enum: ['all', 'linkedin', 'carousels', 'campaigns', 'shorts'] },
          limit: { type: 'number', description: 'Max items to return (default: 10)', default: 10 },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_competitor_library',
      description: 'Search the user\'s saved competitor ad library from Ad Intelligence. Returns analyzed competitor ads with strengths, weaknesses, clone suggestions, and creative URLs. Use this when the user mentions competitors, wants to beat a competitor, or is planning a competitive campaign.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional search term to filter by advertiser name, platform, or niche' },
          platform: { type: 'string', description: 'Filter by platform', enum: ['Meta', 'Google', 'LinkedIn', 'TikTok'] },
          limit: { type: 'number', description: 'Max results (default: 10)', default: 10 },
        },
        required: [],
      },
    },
  },
];

// ── Tool execution functions ────────────────────────────────────────────────

async function executeSearchTrending(args, keys) {
  const apiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
  if (!apiKey) {
    return { results: [], note: 'No search API key configured — using general knowledge only' };
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_news',
      q: args.query,
      api_key: apiKey,
      num: '10',
    });
    const res = await fetch(`https://www.searchapi.io/api/v1/search?${params}`);
    const data = await res.json();

    const articles = (data.news_results || data.organic_results || []).slice(0, 10).map(a => ({
      title: a.title,
      snippet: a.snippet || a.description || '',
      source: a.source?.name || a.source || '',
      date: a.date || '',
      url: a.link || a.url || '',
    }));

    return { results: articles, query: args.query, count: articles.length };
  } catch (err) {
    return { results: [], error: err.message };
  }
}

async function executeResearchTopic(args, keys) {
  const apiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
  if (!apiKey) {
    return { results: [], note: 'No search API key — cannot perform deep research' };
  }

  try {
    // Search Google News + organic
    const [newsRes, organicRes] = await Promise.all([
      fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
        engine: 'google_news', q: args.topic, api_key: apiKey, num: '5',
      })}`),
      fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
        engine: 'google', q: args.topic, api_key: apiKey, num: '5', tbs: 'qdr:m',
      })}`),
    ]);

    const [newsData, organicData] = await Promise.all([newsRes.json(), organicRes.json()]);

    const newsArticles = (newsData.news_results || []).slice(0, 5).map(a => ({
      title: a.title, snippet: a.snippet || '', source: a.source?.name || '', date: a.date || '', url: a.link || '',
    }));

    const organicArticles = (organicData.organic_results || []).slice(0, 5).map(a => ({
      title: a.title, snippet: a.snippet || '', source: a.displayed_link || '', url: a.link || '',
    }));

    return {
      news: newsArticles,
      organic: organicArticles,
      topic: args.topic,
      total: newsArticles.length + organicArticles.length,
    };
  } catch (err) {
    return { results: [], error: err.message };
  }
}

async function executeSearchBrandKnowledge(args, supabase, userId, keys) {
  try {
    // Get brand username for RAG scoping
    const { data: brand } = await supabase
      .from('brand_kit')
      .select('brand_username, brand_name')
      .eq('user_id', userId)
      .maybeSingle();

    const userName = brand?.brand_username;
    if (!userName) {
      return { results: [], note: 'No brand configured — set up a Brand Kit to enable knowledge search' };
    }

    // Generate embedding for the query
    const openai = new OpenAI({ apiKey: keys.openaiKey });
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: args.query.slice(0, 8000),
    });
    const queryEmbedding = embRes.data[0].embedding;

    // Call the RAG hybrid search RPC (shared Supabase instance with Doubleclicker)
    const { data: results, error } = await supabase.rpc('rag_hybrid_search', {
      p_user_name: userName,
      p_domain: args.domain || null,
      p_query: args.query,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_k: 15,
      p_rrf_k: 60,
      p_min_similarity: 0.15,
      p_source_types: null,
    });

    if (error) {
      console.error('[chat] RAG search error:', error);
      return { results: [], error: 'Knowledge search failed' };
    }

    const chunks = (results || []).slice(0, 10).map(r => ({
      content: r.content?.slice(0, 500),
      heading: r.heading || '',
      url: r.url || '',
      score: r.rrf_score ? Math.round(r.rrf_score * 100) / 100 : null,
    }));

    return { results: chunks, brand: brand.brand_name, query: args.query, count: chunks.length };
  } catch (err) {
    console.error('[chat] Brand knowledge search error:', err);
    return { results: [], error: err.message };
  }
}

async function executeGetExistingContent(args, supabase, userId) {
  const contentType = args.type || 'all';
  const limit = Math.min(args.limit || 10, 20);
  const result = {};

  try {
    if (contentType === 'all' || contentType === 'linkedin') {
      const { data } = await supabase
        .from('linkedin_posts')
        .select('id, headline, body, status, platform, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      result.linkedin_posts = (data || []).map(p => ({
        headline: p.headline?.slice(0, 100),
        body: p.body?.slice(0, 200),
        status: p.status,
        date: p.created_at,
      }));
    }

    if (contentType === 'all' || contentType === 'carousels') {
      const { data } = await supabase
        .from('carousels')
        .select('id, title, platform, status, slide_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      result.carousels = (data || []).map(c => ({
        title: c.title?.slice(0, 100),
        platform: c.platform,
        status: c.status,
        slides: c.slide_count,
        date: c.created_at,
      }));
    }

    if (contentType === 'all' || contentType === 'campaigns') {
      const { data } = await supabase
        .from('ad_campaigns')
        .select('id, name, platforms, objective, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      result.ad_campaigns = (data || []).map(c => ({
        name: c.name?.slice(0, 100),
        platforms: c.platforms,
        objective: c.objective,
        status: c.status,
        date: c.created_at,
      }));
    }

    if (contentType === 'all' || contentType === 'shorts') {
      const { data } = await supabase
        .from('ad_drafts')
        .select('id, name, status, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'shorts')
        .order('created_at', { ascending: false })
        .limit(limit);
      result.shorts = (data || []).map(s => ({
        name: s.name?.slice(0, 100),
        status: s.status,
        date: s.created_at,
      }));
    }

    return result;
  } catch (err) {
    return { error: err.message };
  }
}

async function executeSearchCompetitorLibrary(args, supabase, userId) {
  try {
    let query = supabase
      .from('ad_library')
      .select('id, source_url, platform, ad_format, ad_copy, thumbnail_url, analysis, clone_recipe, niche, competitor_id, competitors(name), created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (args.platform) query = query.eq('platform', args.platform);
    const limit = Math.min(args.limit || 10, 20);
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const ads = (data || []).map(ad => ({
      platform: ad.platform,
      advertiser: ad.competitors?.name || 'Unknown',
      ad_copy: ad.ad_copy?.slice(0, 300),
      creative_url: ad.thumbnail_url,
      hook: ad.analysis?.hook,
      strengths: ad.analysis?.strengths,
      weaknesses: ad.analysis?.weaknesses,
      clone_suggestions: ad.analysis?.clone_suggestions,
      niche: ad.niche,
      saved_date: ad.created_at,
    }));

    // If query provided, filter by text match
    if (args.query) {
      const q = args.query.toLowerCase();
      const filtered = ads.filter(a =>
        a.advertiser?.toLowerCase().includes(q) ||
        a.ad_copy?.toLowerCase().includes(q) ||
        a.niche?.toLowerCase().includes(q) ||
        a.hook?.toLowerCase().includes(q)
      );
      return { results: filtered, query: args.query, count: filtered.length };
    }

    return { results: ads, count: ads.length };
  } catch (err) {
    return { results: [], error: err.message };
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const userEmail = req.user.email;
  const { thread_id, message } = req.body;

  if (!thread_id || !message?.trim()) {
    return res.status(400).json({ error: 'thread_id and message are required' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const keepalive = setInterval(() => {
    try { res.write('data: {"type":"ping"}\n\n'); } catch { /* closed */ }
  }, 30000);

  const sendEvent = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* closed */ }
  };

  try {
    const keys = await getUserKeys(userId, userEmail);
    if (!keys.openaiKey) {
      sendEvent({ type: 'error', message: 'OpenAI API key not configured' });
      res.end();
      clearInterval(keepalive);
      return;
    }

    const openai = new OpenAI({ apiKey: keys.openaiKey });

    // Save user message
    await supabase.from('command_center_messages').insert({
      user_id: userId, thread_id, role: 'user', content: message.trim(),
    });

    // Build system prompt
    const systemPrompt = await buildChatContext(supabase, userId);

    // Load conversation history
    const { data: history } = await supabase
      .from('command_center_messages')
      .select('role, content')
      .eq('thread_id', thread_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20);

    let openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
    ];

    // ── Agentic loop: stream, handle tool calls, repeat ───────────────────
    let fullResponse = '';
    let planJson = null;
    const MAX_TOOL_ROUNDS = 3;

    for (let round = 0; round < MAX_TOOL_ROUNDS + 1; round++) {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: openaiMessages,
        tools: TOOLS,
        stream: true,
        temperature: 0.7,
        max_completion_tokens: 4000,
      });

      let roundContent = '';
      let toolCalls = {};

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        // Text content
        const delta = choice.delta?.content;
        if (delta) {
          roundContent += delta;
          fullResponse += delta;
          sendEvent({ type: 'token', content: delta });

          // Detect JSON plan block
          if (!planJson && fullResponse.includes('```json')) {
            const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
              try {
                planJson = JSON.parse(jsonMatch[1].trim());
                sendEvent({ type: 'plan', plan: planJson });
              } catch { /* incomplete JSON */ }
            }
          }
        }

        // Tool call accumulation
        if (choice.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            if (tc.id) {
              toolCalls[tc.index] = { id: tc.id, name: tc.function?.name || '', args: '' };
            }
            if (tc.function?.arguments) {
              if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', name: '', args: '' };
              toolCalls[tc.index].args += tc.function.arguments;
            }
            if (tc.function?.name && toolCalls[tc.index]) {
              toolCalls[tc.index].name = tc.function.name;
            }
          }
        }

        if (choice.finish_reason) break;
      }

      // Check if there are tool calls to execute
      const toolCallList = Object.values(toolCalls).filter(tc => tc.id && tc.name);
      if (toolCallList.length === 0) break; // No tool calls — done

      // Execute tool calls
      sendEvent({ type: 'status', message: 'Researching...' });

      // Add assistant message with tool calls to context
      openaiMessages.push({
        role: 'assistant',
        content: roundContent || null,
        tool_calls: toolCallList.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.args },
        })),
      });

      // Execute each tool and add results
      for (const tc of toolCallList) {
        let result;
        try {
          const args = JSON.parse(tc.args || '{}');

          switch (tc.name) {
            case 'search_trending':
              result = await executeSearchTrending(args, keys);
              break;
            case 'research_topic':
              result = await executeResearchTopic(args, keys);
              break;
            case 'search_brand_knowledge':
              result = await executeSearchBrandKnowledge(args, supabase, userId, keys);
              break;
            case 'get_existing_content':
              result = await executeGetExistingContent(args, supabase, userId);
              break;
            case 'search_competitor_library':
              result = await executeSearchCompetitorLibrary(args, supabase, userId);
              break;
            default:
              result = { error: `Unknown tool: ${tc.name}` };
          }
        } catch (err) {
          result = { error: err.message };
        }

        openaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
      // Loop continues — AI will respond with tool results in context
    }

    // Save assistant response
    await supabase.from('command_center_messages').insert({
      user_id: userId,
      thread_id,
      role: 'assistant',
      content: fullResponse,
      metadata_json: planJson ? { plan: planJson } : null,
    });

    // Save campaign if plan detected
    if (planJson?.name && planJson?.items?.length > 0) {
      const { data: campaign } = await supabase
        .from('command_center_campaigns')
        .insert({
          user_id: userId,
          name: planJson.name,
          description: planJson.description || null,
          plan_json: planJson,
          braindump_text: message.trim(),
          status: 'planning',
          item_count: planJson.items.length,
        })
        .select()
        .single();

      if (campaign) {
        sendEvent({ type: 'plan', plan: { ...planJson, _campaign_id: campaign.id } });
        sendEvent({ type: 'status', message: `Campaign "${planJson.name}" saved as draft` });

        await supabase.from('command_center_messages')
          .update({ campaign_id: campaign.id })
          .eq('user_id', userId)
          .eq('thread_id', thread_id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1);
      }
    }

    sendEvent({ type: 'complete' });
  } catch (err) {
    console.error('Command Center chat error:', err);
    sendEvent({ type: 'error', message: err.message || 'Chat failed' });
  } finally {
    clearInterval(keepalive);
    res.end();
  }
}
