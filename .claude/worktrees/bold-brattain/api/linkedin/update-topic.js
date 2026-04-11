import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('linkedin_topics')
    .update({ status })
    .eq('id', req.params.id)
    .eq('username', req.user.email)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Topic not found' });
  return res.json({ success: true, topic: data });
}
