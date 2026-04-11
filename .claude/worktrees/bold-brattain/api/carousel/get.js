import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: carousel, error } = await supabase
    .from('carousels')
    .select('*, carousel_slides(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  // Sort slides by slide_number
  if (carousel.carousel_slides) {
    carousel.carousel_slides.sort((a, b) => a.slide_number - b.slide_number);
  }

  return res.json({ success: true, carousel });
}
