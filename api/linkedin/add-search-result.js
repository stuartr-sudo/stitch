import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { headline, snippet, url, source_domain, relevance_score, suggested_angle } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: topic, error } = await supabase
      .from('linkedin_topics')
      .upsert({
        user_id: req.user.id,
        url,
        headline: headline || '',
        snippet: snippet || '',
        source_domain: source_domain || '',
        relevance_score: relevance_score ?? null,
        suggested_angle: suggested_angle || null,
      }, { onConflict: 'user_id,url', ignoreDuplicates: false })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, topic });
  } catch (err) {
    console.error('[linkedin/add-search-result] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
