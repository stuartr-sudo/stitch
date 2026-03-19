/**
 * Describe Scene — Analyzes a start frame image and returns a detailed
 * scene description for the storyboard scene generator to use.
 */

import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

  console.log(`[DescribeScene] Analyzing scene image: ${imageUrl.substring(0, 120)}...`);

  const { openaiKey } = await getUserKeys(req.user.id, req.user.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          {
            type: 'text',
            text: `You are a scene analyst for AI video generation. Describe this image in precise visual detail so that an AI video prompt writer can create scene prompts that match this exact environment.

Describe ALL of the following in a single dense paragraph:
- Art style / rendering style (photorealistic, 3D animation, watercolor, etc.)
- Setting: location type, time of day, season, weather
- Environment details: ground surface, buildings, vegetation, objects, vehicles, signs
- Lighting: direction, quality, color temperature, shadows, highlights
- Color palette: dominant and accent colors
- Atmosphere: haze, clarity, bokeh, depth
- Any characters or figures visible and what they're doing
- Camera angle and framing of the shot

Be extremely specific with colors, materials, and spatial relationships. This description will be used to write video generation prompts that must match this exact scene.

Return ONLY the scene description paragraph, nothing else.`,
          },
        ],
      }],
      max_tokens: 600,
    });

    const content = response.choices[0].message.content || '';
    const description = content.trim();

    console.log(`[DescribeScene] Generated description (${description.length} chars): ${description.substring(0, 150)}...`);

    if (!description) {
      return res.status(400).json({ error: 'Vision model returned empty description.' });
    }

    return res.json({ success: true, description });
  } catch (err) {
    console.error('[DescribeScene] Error:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
}
