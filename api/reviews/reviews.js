import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    if (req.method === 'GET') {
      let query = supabase.from('review_requests').select('*').eq('user_id', userId);
      if (req.query.status) {
        query = query.eq('status', req.query.status);
      }
      // Order by created_at; frontend sorts by priority
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      return res.json({ requests: data || [] });
    }

    if (req.method === 'POST') {
      const { tool, endpoint, type, title, description, screenshot_url, priority } = req.body;
      if (!tool || !type || !title) {
        return res.status(400).json({ error: 'tool, type, and title are required' });
      }
      const { data, error } = await supabase.from('review_requests').insert({
        user_id: userId,
        tool,
        endpoint: endpoint || null,
        type,
        title,
        description: description || null,
        screenshot_url: screenshot_url || null,
        priority: priority || 'medium',
      }).select().single();
      if (error) throw error;
      return res.json({ request: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Reviews] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
