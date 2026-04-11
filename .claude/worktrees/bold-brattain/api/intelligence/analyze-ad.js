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
    const openai = new OpenAI({ apiKey: keys.openaiKey });

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
