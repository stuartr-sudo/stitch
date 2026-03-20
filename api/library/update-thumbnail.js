import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { table, id, thumbnail_data_url } = req.body;
  if (!table || !id || !thumbnail_data_url) return res.status(400).json({ error: 'Missing fields' });
  if (!['image_library_items', 'generated_videos'].includes(table)) return res.status(400).json({ error: 'Invalid table' });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    const matches = thumbnail_data_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid data URL' });
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `thumbnails/${req.user?.id || 'anon'}/${Date.now()}-thumb.jpg`;
    const { error: uploadErr } = await supabase.storage.from('media').upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
    const thumbnailUrl = urlData?.publicUrl;
    const { error: updateErr } = await supabase.from(table).update({ thumbnail_url: thumbnailUrl }).eq('id', id);
    if (updateErr) throw updateErr;
    return res.json({ success: true, thumbnail_url: thumbnailUrl });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
