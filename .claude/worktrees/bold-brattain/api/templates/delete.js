/**
 * DELETE /api/templates/:id
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const templateId = req.params?.id || req.body?.id;
  if (!templateId) return res.status(400).json({ error: 'Missing template id' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from('user_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
}
