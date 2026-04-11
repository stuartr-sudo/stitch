import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const { imageIds, tagIds } = req.body;
    if (!imageIds?.length || !tagIds?.length) {
      return res.status(400).json({ error: 'imageIds and tagIds required' });
    }

    const { data: owned } = await supabase
      .from('image_library_items')
      .select('id')
      .eq('user_id', userId)
      .in('id', imageIds);

    const ownedIds = new Set((owned || []).map(r => r.id));

    const rows = [];
    for (const imageId of imageIds) {
      if (!ownedIds.has(imageId)) continue;
      for (const tagId of tagIds) {
        rows.push({ image_id: imageId, tag_id: tagId });
      }
    }

    if (rows.length === 0) return res.status(400).json({ error: 'No valid image/tag pairs' });

    const { error } = await supabase
      .from('image_tag_links')
      .upsert(rows, { onConflict: 'image_id,tag_id', ignoreDuplicates: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { imageId, tagId } = req.body;
    if (!imageId || !tagId) return res.status(400).json({ error: 'imageId and tagId required' });

    const { error } = await supabase
      .from('image_tag_links')
      .delete()
      .eq('image_id', imageId)
      .eq('tag_id', tagId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
