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
