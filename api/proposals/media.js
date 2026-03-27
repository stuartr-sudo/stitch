import { createClient } from '@supabase/supabase-js';

const ALLOWED_SLUGS = ['hamilton-city-council'];
const MAX_COUNTS = { image: Infinity, video: Infinity };

export default async function handler(req, res) {
  const { slug } = req.params;

  if (!ALLOWED_SLUGS.includes(slug)) {
    return res.status(400).json({ error: 'Invalid proposal slug' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('proposal_media')
      .select('*')
      .eq('proposal_slug', slug)
      .order('created_at', { ascending: true })
      .range(0, 9999);

    if (error) {
      console.error('[Proposal Media] GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch media' });
    }

    const images = data.filter(d => d.media_type === 'image');
    const videos = data.filter(d => d.media_type === 'video');
    return res.json({ images, videos });
  }

  if (req.method === 'POST') {
    const { media_type, media_url, thumbnail_url, caption } = req.body;

    if (!media_type || !media_url) {
      return res.status(400).json({ error: 'media_type and media_url are required' });
    }
    if (!['image', 'video'].includes(media_type)) {
      return res.status(400).json({ error: 'media_type must be "image" or "video"' });
    }

    // Check max count
    const { count, error: countErr } = await supabase
      .from('proposal_media')
      .select('id', { count: 'exact', head: true })
      .eq('proposal_slug', slug)
      .eq('media_type', media_type);

    if (countErr) {
      console.error('[Proposal Media] Count error:', countErr);
      return res.status(500).json({ error: 'Failed to check media count' });
    }

    const max = MAX_COUNTS[media_type];
    if (count >= max) {
      return res.status(400).json({ error: `Maximum of ${max} ${media_type}s reached` });
    }

    // Get next sort_order
    const { data: maxRow } = await supabase
      .from('proposal_media')
      .select('sort_order')
      .eq('proposal_slug', slug)
      .eq('media_type', media_type)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxRow && maxRow.length > 0) ? maxRow[0].sort_order + 1 : 0;

    const { data: item, error: insertErr } = await supabase
      .from('proposal_media')
      .insert({
        proposal_slug: slug,
        media_type,
        media_url,
        thumbnail_url: thumbnail_url || null,
        caption: caption || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[Proposal Media] Insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to add media' });
    }

    return res.json({ item });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
