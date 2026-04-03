/**
 * Characters CRUD API
 *
 * GET    /api/characters       — List user's characters
 * POST   /api/characters       — Create character (auto-generates description via GPT vision)
 * DELETE /api/characters/:id   — Delete character
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/characters', '').split('/').filter(Boolean);

  // GET /api/characters — list
  if (pathParts.length === 0 && req.method === 'GET') {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ characters: data });
  }

  // POST /api/characters — create
  if (pathParts.length === 0 && req.method === 'POST') {
    const { name, image_url } = req.body;
    if (!name || !image_url) return res.status(400).json({ error: 'name and image_url are required' });

    // Auto-generate description via GPT-4.1-mini vision
    let description = null;
    try {
      const { openaiKey } = await getUserKeys(userId, req.user.email);
      if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-mini-2025-04-14',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image_url, detail: 'high' } },
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
        description = (response.choices[0]?.message?.content || '').trim() || null;
        console.log(`[Characters] Generated description for "${name}" (${(description || '').length} chars)`);
      }
    } catch (err) {
      console.warn(`[Characters] Description generation failed for "${name}": ${err.message}`);
      // Continue without description — character is still useful with just name + image
    }

    const { data, error } = await supabase
      .from('characters')
      .insert({ user_id: userId, name, image_url, description })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ character: data });
  }

  // DELETE /api/characters/:id
  if (pathParts.length === 1 && req.method === 'DELETE') {
    const id = pathParts[0];
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
