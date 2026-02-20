import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Job not found' });

  return res.json({ success: true, job: data });
}
