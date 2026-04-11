/**
 * Describe Character — Phase 0
 * Accepts an image URL, sends it to GPT vision, and returns a detailed
 * character description suitable for turnaround sheet generation.
 */

import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

  console.log(`[DescribeCharacter] Analyzing image: ${imageUrl.substring(0, 120)}...`);

  const { openaiKey } = await getUserKeys(req.user.id, req.user.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          {
            type: 'text',
            text: `You are a character design analyst. Describe this character in precise detail for an AI image generator to recreate them consistently across multiple poses.

Include ALL of the following in a single dense paragraph:
- Gender, approximate age, body type and build
- Hair: color, length, style, any distinctive features
- Face: skin tone, eye color/shape, facial hair, distinctive markings (scars, freckles, etc.)
- Outfit: describe every clothing item top-to-bottom with colors, patterns, materials, and fit
- Footwear: type, color, style
- Accessories: jewelry, glasses, hats, belts, bags, weapons, etc.
- Any other distinguishing features

Be specific with colors (e.g. "dusty rose pink" not just "pink"). Use visual description language suitable for image generation prompts. Do NOT include background, pose, or action descriptions — only the character's appearance.

Return ONLY the character description paragraph, nothing else.`,
          },
        ],
      }],
      max_tokens: 500,
    });

    // Log the full response for debugging
    const choice = response.choices[0];
    console.log(`[DescribeCharacter] finish_reason: ${choice.finish_reason}`);
    console.log(`[DescribeCharacter] refusal: ${choice.message.refusal || 'none'}`);

    const content = choice.message.content || '';
    const description = content.trim();

    console.log(`[DescribeCharacter] Generated description (${description.length} chars): ${description.substring(0, 100)}...`);

    if (!description) {
      return res.status(400).json({
        error: 'Vision model returned empty description. The image may not be accessible or may have been filtered.',
        refusal: choice.message.refusal || null,
        finish_reason: choice.finish_reason,
      });
    }

    return res.json({ success: true, description });
  } catch (err) {
    console.error('[DescribeCharacter] Error:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
}
