import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // GET — list presets
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('storyboard_presets')
      .select('id, name, config, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Presets] GET error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ presets: data });
  }

  // POST — save or update preset
  if (req.method === 'POST') {
    const { name, config, id } = req.body;
    if (!name || !config) return res.status(400).json({ error: 'name and config required' });

    if (id) {
      // Update existing
      const { data, error } = await supabase
        .from('storyboard_presets')
        .update({ name, config, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, name, config, updated_at')
        .single();

      if (error) {
        console.error('[Presets] POST update error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ preset: data });
    } else {
      // Insert new (upsert on name)
      const { data, error } = await supabase
        .from('storyboard_presets')
        .upsert(
          { user_id: userId, name, config, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,name' }
        )
        .select('id, name, config, updated_at')
        .single();

      if (error) {
        console.error('[Presets] POST upsert error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ preset: data });
    }
  }

  // DELETE — remove preset
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const { error } = await supabase
      .from('storyboard_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[Presets] DELETE error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
