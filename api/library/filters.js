/**
 * Library Filters — returns distinct metadata values for dropdown population.
 * GET /api/library/filters
 * Uses Supabase RPC `get_distinct_metadata` for efficient DISTINCT queries with partial indexes.
 * Falls back to client .select() if RPC is unavailable.
 */
import { createClient } from '@supabase/supabase-js';

const METADATA_COLUMNS = ['video_style', 'visual_style', 'model_name', 'storyboard_name', 'short_name'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user?.id;
  if (!userId) return res.json({});

  try {
    const filters = {};

    for (const col of METADATA_COLUMNS) {
      // Try RPC first (uses DISTINCT with partial indexes)
      const { data } = await supabase.rpc('get_distinct_metadata', { col_name: col, p_user_id: userId });
      if (data) {
        filters[col] = data.map(r => r.val).filter(Boolean).sort();
      } else {
        // Fallback: query both tables via client
        const [{ data: imgVals }, { data: vidVals }] = await Promise.all([
          supabase.from('image_library_items').select(col).eq('user_id', userId).not(col, 'is', null),
          supabase.from('generated_videos').select(col).eq('user_id', userId).not(col, 'is', null),
        ]);
        const allVals = new Set([
          ...(imgVals || []).map(r => r[col]),
          ...(vidVals || []).map(r => r[col]),
        ]);
        filters[col] = [...allVals].sort();
      }
    }

    return res.json(filters);
  } catch (err) {
    console.error('[Library Filters] Error:', err);
    return res.json({});
  }
}
