/**
 * POST /api/ads/discover
 * Ad Discovery / Spy Tool — search for trending ads, analyze them, save to library.
 *
 * Actions:
 *   search  — Find winning ads by niche/keywords/platform via GPT-4.1 web search
 *   analyze — Deep-analyze a specific ad URL
 *   save    — Save an ad to the user's library
 *   list    — List user's saved library
 *   delete  — Remove from library
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const AdAnalysis = z.object({
  hook: z.string().describe('The opening hook or attention-grabber'),
  copy_breakdown: z.object({
    headline: z.string(),
    body: z.string(),
    cta: z.string(),
  }),
  visual_style: z.string().describe('Description of the visual/design style'),
  target_audience: z.string(),
  emotional_triggers: z.array(z.string()),
  estimated_platform: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  clone_suggestions: z.array(z.string()).describe('Actionable tips to recreate this ad style for your own brand'),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, ...params } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    switch (action) {

      // ─── Search for winning ads ──────────────────────────────────
      case 'search': {
        const { niche, keywords, platform } = params;
        if (!niche && !keywords) return res.status(400).json({ error: 'niche or keywords required' });

        const keys = await getUserKeys(userId, req.user.email);
        const openai = new OpenAI({ apiKey: keys.openai });

        const platformFilter = platform && platform !== 'all' ? `on ${platform}` : 'across social media platforms';
        const nicheLabel = niche ? niche.replace(/_/g, ' ') : '';
        const keywordsLabel = keywords || '';
        const query = [nicheLabel, keywordsLabel].filter(Boolean).join(' — ');

        const response = await openai.responses.create({
          model: 'gpt-4.1',
          tools: [{ type: 'web_search_preview' }],
          input: `Find 12-15 high-performing, trending, or winning paid ads ${platformFilter} in the "${query}" niche/topic. For each ad, provide:
- title: A descriptive title for the ad
- source_url: The URL where the ad can be found (ad library, landing page, or social post)
- platform: Which platform (Facebook, Instagram, LinkedIn, TikTok, Google, YouTube)
- advertiser: The brand or company running the ad
- description: A 1-2 sentence summary of the ad's angle and message
- estimated_engagement: A qualitative rating (High, Medium, Low) based on visible signals
- why_its_winning: One sentence on why this ad works

Focus on REAL ads you can find in Meta Ad Library, LinkedIn Ad Library, TikTok Creative Center, Google Ads Transparency Center, or marketing case studies. Prefer ads from the last 6 months. Return the results as a JSON array.`,
        });

        // Extract text from response
        const text = response.output
          .filter(o => o.type === 'message')
          .flatMap(o => o.content)
          .filter(c => c.type === 'output_text')
          .map(c => c.text)
          .join('');

        // Parse JSON from the response
        let results = [];
        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            results = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // If JSON parsing fails, try to extract structured data
          console.error('Failed to parse search results JSON:', e.message);
        }

        await logCost({
          username: req.user.email,
          category: 'openai',
          operation: 'ad_discovery_search',
          model: 'gpt-4.1',
          metadata: { niche, keywords, platform, result_count: results.length },
        });

        return res.json({ results });
      }

      // ─── Analyze a specific ad ───────────────────────────────────
      case 'analyze': {
        const { source_url, description } = params;
        if (!source_url && !description) return res.status(400).json({ error: 'source_url or description required' });

        const keys = await getUserKeys(userId, req.user.email);
        const openai = new OpenAI({ apiKey: keys.openai });

        const context = source_url
          ? `Analyze this ad found at: ${source_url}\n\nAdditional context: ${description || 'None provided'}`
          : `Analyze this ad based on the following description:\n\n${description}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          response_format: zodResponseFormat(AdAnalysis, 'ad_analysis'),
          messages: [
            {
              role: 'system',
              content: `You are an expert advertising analyst and creative strategist. Analyze ads with a focus on what makes them effective and how to recreate their success. Be specific and actionable in your analysis. If you're given a URL, use your knowledge of common ad patterns and the URL context to infer the ad's characteristics. For clone_suggestions, provide specific, actionable steps to recreate this ad style (e.g., "Use a bold statistic in the headline", "Lead with a pain point question").`,
            },
            { role: 'user', content: context },
          ],
        });

        const analysis = JSON.parse(completion.choices[0].message.content);

        await logCost({
          username: req.user.email,
          category: 'openai',
          operation: 'ad_discovery_analyze',
          model: 'gpt-4.1',
          metadata: { source_url },
          inputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens,
        });

        return res.json({ analysis });
      }

      // ─── Save to library ─────────────────────────────────────────
      case 'save': {
        const { source_url, platform, niche, thumbnail_url, analysis, clone_recipe, tags } = params;
        if (!source_url) return res.status(400).json({ error: 'source_url required' });

        const { data, error } = await supabase
          .from('ad_library')
          .insert({
            user_id: userId,
            source_url,
            platform: platform || null,
            niche: niche || null,
            thumbnail_url: thumbnail_url || null,
            analysis: analysis || null,
            clone_recipe: clone_recipe || null,
            tags: tags || [],
          })
          .select()
          .single();

        if (error) throw error;
        return res.json({ saved: data });
      }

      // ─── List library ────────────────────────────────────────────
      case 'list': {
        const { data, error } = await supabase
          .from('ad_library')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json({ items: data || [] });
      }

      // ─── Delete from library ─────────────────────────────────────
      case 'delete': {
        const { id } = params;
        if (!id) return res.status(400).json({ error: 'id required' });

        const { error } = await supabase
          .from('ad_library')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
        return res.json({ deleted: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[ad-discover] ${action} error:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
