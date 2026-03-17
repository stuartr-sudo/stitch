/**
 * POST /api/campaigns/score-consistency
 *
 * Scores visual consistency of each scene against the brand avatar's
 * reference image using GPT vision. Returns 0-1 similarity scores.
 *
 * Body: {
 *   draft_id: string,
 * }
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { draft_id } = req.body;
  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });

  // Fetch draft with campaign
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('*, campaigns!inner(brand_username)')
    .eq('id', draft_id)
    .single();

  if (draftErr || !draft) return res.status(404).json({ error: 'Draft not found' });

  // Find avatar for this template
  const templateId = draft.template_id;
  if (!templateId) return res.status(400).json({ error: 'Draft has no template_id — cannot determine avatar' });

  // Look up the template to find avatar_id
  const { data: userTemplate } = await supabase
    .from('user_templates')
    .select('avatar_id')
    .eq('id', templateId)
    .maybeSingle();

  const avatarId = userTemplate?.avatar_id;
  if (!avatarId) {
    return res.json({
      success: true,
      message: 'No avatar assigned to template — skipping consistency scoring',
      scores: [],
    });
  }

  // Get avatar reference image
  const { data: avatar } = await supabase
    .from('visual_subjects')
    .select('name, reference_image_url')
    .eq('id', avatarId)
    .maybeSingle();

  if (!avatar?.reference_image_url) {
    return res.json({
      success: true,
      message: 'Avatar has no reference image — cannot score consistency',
      scores: [],
    });
  }

  // Get API keys
  const userId = draft.user_id;
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const openai = new OpenAI({ apiKey: userKeys?.openai_key || process.env.OPENAI_API_KEY });

  // Score each scene against the reference
  const assets = draft.assets_json || [];
  const scores = [];

  // Use the first ratio group's scenes for scoring
  const scenesToScore = assets[0]?.scenes || [];

  for (let i = 0; i < scenesToScore.length; i++) {
    const sceneAsset = scenesToScore[i];
    const imageUrl = sceneAsset?.imageUrl;

    if (!imageUrl) {
      scores.push({ scene_index: i, face_similarity: 0, overall_consistency: 0, error: 'No image' });
      continue;
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a visual consistency scorer. Compare two images and rate their consistency on specific dimensions. Return ONLY a JSON object with these fields:
- face_similarity: 0.0 to 1.0 (how similar the face/person looks — same features, skin tone, hair, expression style)
- overall_consistency: 0.0 to 1.0 (overall visual style match — lighting, color palette, art style, composition)
- notes: brief explanation (max 30 words)

Be strict: identical character = 0.9+, same person with minor differences = 0.7-0.9, clearly different = below 0.5.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Reference avatar image (the ground truth):` },
              { type: 'image_url', image_url: { url: avatar.reference_image_url } },
              { type: 'text', text: `Scene ${i + 1} generated image (compare against reference):` },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 150,
      });

      const raw = completion.choices[0]?.message?.content || '';
      // Parse JSON from response (may be wrapped in markdown code block)
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        scores.push({
          scene_index: i,
          face_similarity: Math.max(0, Math.min(1, parsed.face_similarity || 0)),
          overall_consistency: Math.max(0, Math.min(1, parsed.overall_consistency || 0)),
          notes: parsed.notes || '',
        });
      } else {
        scores.push({ scene_index: i, face_similarity: 0.5, overall_consistency: 0.5, notes: 'Could not parse score' });
      }
    } catch (err) {
      console.error(`[consistency] Scene ${i} scoring failed:`, err.message);
      scores.push({ scene_index: i, face_similarity: 0, overall_consistency: 0, error: err.message });
    }
  }

  // Save scores to draft
  await supabase.from('ad_drafts').update({
    consistency_scores_json: scores,
  }).eq('id', draft_id);

  // Identify low-consistency scenes
  const threshold = 0.7;
  const lowScenes = scores.filter(s => s.face_similarity < threshold && !s.error);

  return res.json({
    success: true,
    avatar_name: avatar.name,
    scores,
    low_consistency_scenes: lowScenes.map(s => s.scene_index),
    threshold,
  });
}
