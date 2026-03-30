import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const { slide_ids } = req.body || {};
  if (!Array.isArray(slide_ids) || slide_ids.length === 0) {
    return res.status(400).json({ error: 'slide_ids array is required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify carousel ownership
  const { data: carousel } = await supabase
    .from('carousels')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (!carousel) return res.status(404).json({ error: 'Carousel not found' });

  // Update slide_number for each slide in the new order
  const updates = slide_ids.map((slideId, i) =>
    supabase.from('carousel_slides')
      .update({ slide_number: i + 1 })
      .eq('id', slideId)
      .eq('carousel_id', id)
  );

  await Promise.all(updates);

  // Fetch updated slides
  const { data: slides } = await supabase
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', id)
    .order('slide_number');

  return res.json({ success: true, slides: slides || [] });
}
