/**
 * POST /api/article/bulk
 *
 * Accept multiple article URLs and batch-create campaigns.
 * Each URL is queued as a separate stitch_queue item.
 *
 * Body: {
 *   urls: string[],              // max 20
 *   brand_username: string,
 *   writing_structure?: string,
 * }
 *
 * Response: { success, batch_id, queued }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { urls, brand_username, writing_structure } = req.body;

  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });
  if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls must be a non-empty array' });
  if (urls.length > 20) return res.status(400).json({ error: 'Maximum 20 URLs per batch' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify the brand exists and get user_id
  const { data: brandKit, error: brandErr } = await supabase
    .from('brand_kit')
    .select('user_id')
    .eq('brand_username', brand_username)
    .single();

  if (brandErr || !brandKit) {
    return res.status(404).json({ error: `Brand not found: ${brand_username}` });
  }

  // Create batch record
  const { data: batch, error: batchErr } = await supabase
    .from('job_batches')
    .insert({
      user_id: brandKit.user_id,
      name: `Batch ${new Date().toLocaleDateString()} (${urls.length} articles)`,
      total_jobs: urls.length,
      status: 'processing',
    })
    .select()
    .single();

  if (batchErr) return res.status(500).json({ error: `Failed to create batch: ${batchErr.message}` });

  // Queue each URL into stitch_queue
  const queueItems = urls.map(url => ({
    brand_username,
    article_content: null,
    article_title: null,
    writing_structure: writing_structure || null,
    payload: { type: 'article', url, batch_id: batch.id },
    status: 'pending',
  }));

  const { error: queueErr } = await supabase.from('stitch_queue').insert(queueItems);

  if (queueErr) {
    return res.status(500).json({ error: `Failed to queue articles: ${queueErr.message}` });
  }

  console.log(`[article/bulk] Queued ${urls.length} articles for brand "${brand_username}" (batch: ${batch.id})`);

  return res.json({
    success: true,
    batch_id: batch.id,
    queued: urls.length,
    message: `${urls.length} articles queued for processing`,
  });
}
