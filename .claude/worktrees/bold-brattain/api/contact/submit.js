import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { projectTypes, timeline, budget, description, name, email, company } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from('contact_submissions').insert({
    project_types: projectTypes || [],
    timeline: timeline || null,
    budget: budget || null,
    description: description || null,
    name,
    email,
    company: company || null,
  });

  if (error) {
    console.error('Contact submit error:', error);
    return res.status(500).json({ error: 'Failed to submit. Please try again.' });
  }

  return res.json({ success: true });
}
