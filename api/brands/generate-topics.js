/**
 * POST /api/brands/generate-topics
 *
 * Generate topic suggestions for a brand profile using the brand's domain,
 * content angles, pain points, and optionally recent news.
 *
 * Body: {
 *   brand_profile_id: string,
 *   content_angle_id?: string,  // specific angle, or generate for the next auto-rotated angle
 *   count?: number,            // default: 10
 *   include_news?: boolean,    // search for recent industry news as seed material
 * }
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { selectNextAngle, EMOTIONAL_DRIVERS } from '../lib/brandMode.js';

const TopicSchema = z.object({
  topics: z.array(z.object({
    title: z.string().describe('Curiosity-driven title, under 60 characters'),
    hook_concept: z.string().describe('The opening paradox/contradiction/surprise in 1-2 sentences'),
    payoff: z.string().describe('What the viewer learns or feels by the end, 1 sentence'),
    emotional_endpoint: z.string().describe('What the viewer should think/feel after watching'),
    story_context: z.string().describe('2-3 sentences of factual background to seed the production engine'),
    is_evergreen: z.boolean().describe('True if not dependent on current events'),
  })),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_profile_id, content_angle_id, count = 10, include_news = true } = req.body;
  if (!brand_profile_id) return res.status(400).json({ error: 'brand_profile_id required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user?.id;

  const { data: brand } = await supabase.from('brand_profiles')
    .select('*')
    .eq('id', brand_profile_id)
    .eq('user_id', userId)
    .single();
  if (!brand) return res.status(404).json({ error: 'Brand profile not found' });

  // Resolve content angle
  let selectedAngle;
  if (content_angle_id) {
    selectedAngle = (brand.content_angles || []).find(a => a.id === content_angle_id);
  } else {
    const { data: recentTopics } = await supabase.from('brand_topics')
      .select('content_angle_id')
      .eq('brand_profile_id', brand_profile_id)
      .in('status', ['generating', 'published'])
      .order('created_at', { ascending: false })
      .limit(20);
    selectedAngle = selectNextAngle(brand, recentTopics || []);
  }
  if (!selectedAngle) return res.status(400).json({ error: 'No content angles defined for this brand' });

  const driver = EMOTIONAL_DRIVERS[selectedAngle.emotional_driver];
  const keys = await getUserKeys(userId, req.user.email);
  if (!keys.openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  // Optionally search for recent news as seed material
  let newsContext = '';
  if (include_news) {
    try {
      const searchQuery = `${brand.brand_domain} ${brand.brand_expertise.split(',')[0]} latest news 2026`;
      // Use Exa or SearchAPI if available
      const exaKey = process.env.EXA_API_KEY;
      if (exaKey) {
        const exaRes = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            numResults: 5,
            useAutoprompt: true,
            type: 'neural',
          }),
        });
        if (exaRes.ok) {
          const exaData = await exaRes.json();
          const headlines = (exaData.results || []).map(r => `- ${r.title} (${r.url})`).join('\n');
          if (headlines) {
            newsContext = `\n\nRECENT INDUSTRY NEWS (use as inspiration for topical content):\n${headlines}`;
          }
        }
      }
    } catch (_) { /* news search is optional */ }
  }

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const prompt = `Generate ${count} short-form video topics for a brand content channel.

BRAND DOMAIN: ${brand.brand_domain}
BRAND EXPERTISE: ${brand.brand_expertise}
TARGET VIEWER: ${brand.target_viewer}

VIEWER PAIN POINTS:
${brand.target_viewer_pain_points.map(p => `- ${p}`).join('\n')}

CONTENT ANGLE: ${selectedAngle.name}
EMOTIONAL DRIVER: ${driver.name}
LENS: ${selectedAngle.lens}
DESCRIPTION: ${selectedAngle.description}

HOOK PATTERNS FOR THIS ANGLE:
${(selectedAngle.hook_patterns || []).map(h => `- "${h}"`).join('\n')}
${newsContext}

RULES:
- Each topic must be a SPECIFIC story, scenario, or insight — not a generic theme
- Each topic must be tellable in 60-75 seconds using the Fichtean Curve
- The brand name "${brand.brand_name}" must NEVER appear in the topic or the resulting content
- Topics should feel like editorial journalism or documentary content, not marketing
- Each topic should have a clear HOOK (the surprising/compelling opening) and a clear PAYOFF (the reveal/insight the viewer gets)
- At least 3 topics should be based on real, verifiable events or data
- At least 2 topics should be evergreen (not dependent on current events)

Generate ${count} topics now.`;

  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-2025-04-14',
      messages: [{ role: 'user', content: prompt }],
      response_format: zodResponseFormat(TopicSchema, 'topic_suggestions'),
      temperature: 1,
    });

    const result = completion.choices[0].message.parsed;
    const topics = (result.topics || []).map(t => ({
      ...t,
      content_angle_id: selectedAngle.id,
      emotional_driver: selectedAngle.emotional_driver,
      preferred_niche: selectedAngle.preferred_niche || brand.primary_niche,
    }));

    return res.json({
      topics,
      angle: { id: selectedAngle.id, name: selectedAngle.name, emotional_driver: selectedAngle.emotional_driver },
    });
  } catch (err) {
    console.error('[brands/generate-topics] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
