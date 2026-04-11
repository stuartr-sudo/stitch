/**
 * GET /api/brand/guidelines?username=X
 *
 * Reads brand_guidelines + brand_image_styles from the shared Supabase tables
 * (same data that Doubleclicker writes via /api/strategy/brand-profile).
 * This lets Stitch pull rich brand voice, target market, image style, etc.
 * without the user having to re-enter anything.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'username query param is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch company_information for basic brand data
    const { data: company } = await supabase
      .from('company_information')
      .select('username, client_namespace, brand_name, brand_voice, brand_voice_tone, blurb, target_market, client_website, logo_url, primary_color')
      .eq('username', username)
      .maybeSingle();

    // Fetch brand_guidelines (Doubleclicker's rich brand voice/tone profile)
    const { data: guidelines } = await supabase
      .from('brand_guidelines')
      .select('*')
      .eq('user_name', username)
      .order('updated_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch brand_image_styles (Doubleclicker's AI image generation guidelines)
    const { data: imageStyle } = await supabase
      .from('brand_image_styles')
      .select('*')
      .eq('user_name', username)
      .order('updated_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.json({
      success: true,
      company: company || null,
      guidelines: guidelines || null,
      image_style: imageStyle || null,
    });
  } catch (err) {
    console.error('[brand/guidelines] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
