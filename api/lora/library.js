/**
 * GET /api/lora/library
 *
 * Returns all pre-built LoRAs from the lora_library table, grouped by category.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('lora_library')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Group by category
  const grouped = {};
  for (const lora of (data || [])) {
    if (!grouped[lora.category]) grouped[lora.category] = [];
    grouped[lora.category].push(lora);
  }

  return res.json({ success: true, loras: data || [], grouped });
}
