import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { news_search_queries, series_title, linkedin_cta_text, linkedin_cta_url, exa_api_key, linkedin_access_token } = req.body || {};

  const fields = {
    user_id: req.user.id,
    ...(news_search_queries !== undefined && { news_search_queries }),
    ...(series_title !== undefined && { series_title }),
    ...(linkedin_cta_text !== undefined && { linkedin_cta_text }),
    ...(linkedin_cta_url !== undefined && { linkedin_cta_url }),
    ...(exa_api_key !== undefined && { exa_api_key }),
    ...(linkedin_access_token !== undefined && { linkedin_access_token }),
  };

  const { data, error } = await supabase
    .from('linkedin_config')
    .upsert(fields, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, config: data });
}
