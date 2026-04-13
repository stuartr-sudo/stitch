/**
 * POST /api/shorts/preview-script
 *
 * Generate a production package (script + visuals + SFX + music direction).
 * Uses the Fichtean Curve beat structure with niche-specific blueprints.
 *
 * Body: {
 *   niche: string,
 *   topic?: string,
 *   brand_username: string,
 *   story_context?: string,
 *   creative_mode?: boolean,
 *   engine?: 'production' | 'legacy'  // default: 'production'
 * }
 *
 * Response: { script, niche }
 */

import { createClient } from '@supabase/supabase-js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, topic, brand_username, story_context, creative_mode, engine, brand_profile_id, content_angle_id } = req.body;

  if (!niche) {
    return res.status(400).json({ error: 'Missing niche' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const userId = brand_username
    ? await resolveUserIdFromBrand(brand_username, supabase, req.user?.id)
    : req.user?.id;
  if (!userId) return res.status(404).json({ error: 'User not found' });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  try {
    // Legacy path for old workbench drafts
    if (engine === 'legacy') {
      const { getShortsTemplate } = await import('../lib/shortsTemplates.js');
      const { generateScript } = await import('../lib/scriptGenerator.js');
      const nicheTemplate = getShortsTemplate(niche);
      if (!nicheTemplate) return res.status(400).json({ error: `Unknown niche: ${niche}` });

      const script = await generateScript({
        niche, topic, nicheTemplate,
        keys: { openaiKey },
        brandUsername: brand_username,
        storyContext: story_context || undefined,
        creativeMode: creative_mode || false,
        targetDurationSeconds: 60,
      });
      return res.json({ script, niche });
    }

    // New production engine (default)
    const { generateProductionPackage, productionPackageToLegacyScript } = await import('../lib/productionEngine.js');
    const { getNicheBlueprint } = await import('../lib/nicheBlueprints.js');

    const blueprint = getNicheBlueprint(niche);
    if (!blueprint) return res.status(400).json({ error: `Unknown niche: ${niche}` });

    // Resolve brand profile and content angle if in brand mode
    let brandProfile = null;
    let contentAngle = null;
    let effectiveNiche = niche;

    if (brand_profile_id) {
      const { data: bp } = await supabase.from('brand_profiles')
        .select('*')
        .eq('id', brand_profile_id)
        .eq('user_id', req.user.id)
        .single();

      if (bp) {
        brandProfile = bp;
        const angles = bp.content_angles || [];

        if (content_angle_id) {
          contentAngle = angles.find(a => a.id === content_angle_id);
        } else {
          // Auto-rotate: pick the most underrepresented angle
          const { selectNextAngle } = await import('../lib/brandMode.js');
          const { data: recentTopics } = await supabase.from('brand_topics')
            .select('content_angle_id')
            .eq('brand_profile_id', brand_profile_id)
            .in('status', ['generating', 'published'])
            .order('created_at', { ascending: false })
            .limit(20);
          contentAngle = selectNextAngle(bp, recentTopics || []);
        }

        // Use angle's preferred niche if set, otherwise brand's primary niche
        if (contentAngle?.preferred_niche) {
          effectiveNiche = contentAngle.preferred_niche;
        } else if (bp.primary_niche) {
          effectiveNiche = bp.primary_niche;
        }
      }
    }

    const pkg = await generateProductionPackage({
      niche: effectiveNiche,
      topic,
      keys: { openaiKey },
      brandUsername: brand_username,
      storyContext: story_context || undefined,
      creativeMode: creative_mode || false,
      brandProfile,
      contentAngle,
    });

    // Return both the full production package and a legacy-compat script format
    const script = productionPackageToLegacyScript(pkg);

    return res.json({ script, niche, production_package: pkg });
  } catch (err) {
    console.error('[shorts/preview-script] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
