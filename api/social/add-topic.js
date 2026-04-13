import { createClient } from '@supabase/supabase-js';
import { scrapeArticle } from '../lib/pipelineHelpers.js';

export default async function handler(req, res) {
  const { source_url, source_title, platform, brand_kit_id } = req.body || {};
  if (!platform) return res.status(400).json({ error: 'platform is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Insert topic row immediately
    const { data: topic, error } = await supabase
      .from('social_topics')
      .insert({
        user_id: req.user.id,
        username: req.user.email,
        platform,
        source_url: source_url || null,
        source_title: source_title || null,
        brand_kit_id: brand_kit_id || null,
        status: 'new',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Fire-and-forget: scrape source URL and update topic with full content
    if (source_url) {
      const firecrawlKey = process.env.FIRECRAWL_API_KEY || null;
      scrapeArticle(source_url, firecrawlKey)
        .then(async (content) => {
          if (content) {
            await supabase
              .from('social_topics')
              .update({ full_content: content })
              .eq('id', topic.id);
          }
        })
        .catch((err) => {
          console.warn('[social/add-topic] Scrape failed:', err.message);
        });
    }

    return res.json({ success: true, topic });
  } catch (err) {
    console.error('[social/add-topic] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
