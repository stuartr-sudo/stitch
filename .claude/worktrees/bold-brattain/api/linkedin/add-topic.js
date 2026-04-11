import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { fetchUrlContent, scoreTopics, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const exaKey = await resolveExaKey(req.user.id);

    // Fetch content
    const fullContent = await fetchUrlContent(url, exaKey);
    if (exaKey) {
      logCost({ username: req.user.email, category: 'exa', operation: 'linkedin_fetch' }).catch(() => {});
    }

    // Extract headline from content (first line or first ~100 chars)
    const headline = fullContent
      ? fullContent.split('\n').find(l => l.trim().length > 10)?.trim().slice(0, 200) || url
      : url;

    // Score the topic
    const article = { headline, snippet: fullContent?.slice(0, 300) || '', url };
    const scored = keys.openaiKey
      ? await scoreTopics([article], {}, keys.openaiKey, req.user.email)
      : [{ ...article, score: null, angle: null }];

    const topicData = scored[0] || article;

    // Insert into linkedin_topics
    const { data, error } = await supabase
      .from('linkedin_topics')
      .upsert({
        user_id: req.user.id,
        url,
        headline: topicData.headline,
        snippet: topicData.snippet,
        source_domain: new URL(url).hostname,
        relevance_score: topicData.score,
        suggested_angle: topicData.angle,
        full_content: fullContent || null,
      }, { onConflict: 'user_id,url' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, topic: data });
  } catch (err) {
    console.error('[linkedin/add-topic] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
