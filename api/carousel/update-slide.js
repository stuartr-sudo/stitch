import { createClient } from '@supabase/supabase-js';

const ALLOWED_FIELDS = [
  'slide_type', 'headline', 'body_text', 'stat_value',
  'stat_label', 'cta_text', 'image_prompt', 'locked',
];

export default async function handler(req, res) {
  const { id, slideId } = req.params;
  if (!id || !slideId) return res.status(400).json({ error: 'carousel id and slideId are required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify carousel ownership
  const { data: carousel } = await supabase
    .from('carousels')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (!carousel) return res.status(404).json({ error: 'Carousel not found' });

  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // If text content changed, mark image as needing regeneration (unless locked)
  const textFields = ['headline', 'body_text', 'stat_value', 'stat_label', 'cta_text', 'slide_type'];
  const textChanged = textFields.some(f => updates[f] !== undefined);
  if (textChanged && !updates.locked) {
    updates.generation_status = 'pending';
  }

  const { data, error } = await supabase
    .from('carousel_slides')
    .update(updates)
    .eq('id', slideId)
    .eq('carousel_id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Slide not found' });
  return res.json({ success: true, slide: data });
}
