import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { imageId, tagNames } = req.body;
  if (!imageId || !tagNames?.length) {
    return res.status(400).json({ error: 'imageId and tagNames required' });
  }

  const { data: img } = await supabase
    .from('image_library_items')
    .select('id')
    .eq('id', imageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!img) return res.status(404).json({ error: 'Image not found' });

  const tags = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const { data: existing } = await supabase
      .from('image_tags')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) {
      tags.push(existing);
    } else {
      const { data: created, error } = await supabase
        .from('image_tags')
        .insert({ user_id: userId, name: trimmed })
        .select('id, name')
        .single();

      if (error) {
        console.error('[AutoTag] Failed to create tag:', trimmed, error.message);
        continue;
      }
      tags.push(created);
    }
  }

  if (tags.length > 0) {
    const rows = tags.map(t => ({ image_id: imageId, tag_id: t.id }));
    const { error } = await supabase
      .from('image_tag_links')
      .upsert(rows, { onConflict: 'image_id,tag_id', ignoreDuplicates: true });

    if (error) {
      console.error('[AutoTag] Failed to assign tags:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.json({ success: true, tags });
}
