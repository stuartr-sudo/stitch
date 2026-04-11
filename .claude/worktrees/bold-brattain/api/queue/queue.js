/**
 * Production Queue CRUD API
 *
 * GET    /api/queue              — List user's queue items
 * POST   /api/queue              — Add single item
 * POST   /api/queue/bulk         — Add multiple items
 * PATCH  /api/queue/:id          — Update item (status, priority, error_message)
 * DELETE /api/queue/:id          — Remove item
 * POST   /api/queue/:id/produce  — Kick off production for a single item
 */

import { createClient } from '@supabase/supabase-js';

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
  const pathParts = url.pathname.replace('/api/queue', '').split('/').filter(Boolean);

  // GET /api/queue — list all queue items for user
  if (pathParts.length === 0 && req.method === 'GET') {
    const { data, error } = await supabase
      .from('production_queue')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data });
  }

  // POST /api/queue — add single item
  if (pathParts.length === 0 && req.method === 'POST') {
    const { title, niche, topic, hook, angle, priority, config } = req.body;
    if (!title || !niche || !topic) {
      return res.status(400).json({ error: 'title, niche, and topic are required' });
    }
    const { data, error } = await supabase
      .from('production_queue')
      .insert({
        user_id: userId,
        title,
        niche,
        topic,
        hook: hook || null,
        angle: angle || null,
        priority: priority || 0,
        config: config || {},
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ item: data });
  }

  // POST /api/queue/bulk — add multiple items
  if (pathParts.length === 1 && pathParts[0] === 'bulk' && req.method === 'POST') {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const rows = items.map((item, idx) => ({
      user_id: userId,
      title: item.title || `Item ${idx + 1}`,
      niche: item.niche,
      topic: item.topic,
      hook: item.hook || null,
      angle: item.angle || null,
      priority: item.priority || 0,
      config: item.config || {},
    }));
    // Validate all rows have required fields
    const invalid = rows.find(r => !r.niche || !r.topic);
    if (invalid) {
      return res.status(400).json({ error: 'All items must have niche and topic' });
    }
    const { data, error } = await supabase
      .from('production_queue')
      .insert(rows)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data, count: data.length });
  }

  // POST /api/queue/:id/produce — kick off production
  if (pathParts.length === 2 && pathParts[1] === 'produce' && req.method === 'POST') {
    const itemId = pathParts[0];
    // Verify ownership
    const { data: item, error: fetchErr } = await supabase
      .from('production_queue')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();
    if (fetchErr || !item) return res.status(404).json({ error: 'Queue item not found' });
    if (item.status !== 'queued' && item.status !== 'failed') {
      return res.status(400).json({ error: `Cannot produce item with status "${item.status}"` });
    }
    // Update status to scripting
    const { error: updateErr } = await supabase
      .from('production_queue')
      .update({ status: 'scripting', updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
    // Actual automation will be done in Feature 6 (Autopilot)
    return res.json({ message: 'Production started', item_id: itemId });
  }

  // PATCH /api/queue/:id — update item
  if (pathParts.length === 1 && req.method === 'PATCH') {
    const itemId = pathParts[0];
    const { status, priority, error_message, title, topic, hook, angle, niche, config } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (error_message !== undefined) updates.error_message = error_message;
    if (title !== undefined) updates.title = title;
    if (topic !== undefined) updates.topic = topic;
    if (hook !== undefined) updates.hook = hook;
    if (angle !== undefined) updates.angle = angle;
    if (niche !== undefined) updates.niche = niche;
    if (config !== undefined) updates.config = config;

    const { data, error } = await supabase
      .from('production_queue')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Queue item not found' });
    return res.json({ item: data });
  }

  // DELETE /api/queue/:id — remove item
  if (pathParts.length === 1 && req.method === 'DELETE') {
    const itemId = pathParts[0];
    const { error } = await supabase
      .from('production_queue')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
