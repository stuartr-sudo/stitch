import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('linkedin_topics')
    .select('*')
    .eq('username', req.user.email)
    .neq('status', 'expired')
    .gt('expires_at', new Date().toISOString())
    .order('relevance_score', { ascending: false, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, topics: data || [] });
}
