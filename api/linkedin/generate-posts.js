import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

const ANTI_SLOP = `RULES (violating any = rejection):
- First line MUST be under 200 characters
- NO filler: "In today's world", "Let's dive in", "Here's the thing"
- NO hedging: "might", "could potentially", "it's possible"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry"
- NO emojis, NO hashtags, NO markdown formatting
- Every sentence must add new information — no repetition
- Be specific: use real names, real numbers, real places
- Write like a sharp human, not a language model`;

const STYLE_PROMPTS = {
  contrarian: `Write a LinkedIn post using the Contrarian Insight style. Make a bold claim that challenges conventional thinking about this topic, then explain why the common take is wrong. 150-250 words.\n\n${ANTI_SLOP}`,
  story: `Write a LinkedIn post using the Story-Led style. Open with a vivid scene — a specific person, place, or moment. Tell a mini narrative that draws the reader in. 150-250 words.\n\n${ANTI_SLOP}`,
  data: `Write a LinkedIn post using the Data/Stat Punch style. Lead with a surprising number or concrete fact from the source material. 100-200 words.\n\n${ANTI_SLOP}`,
};

export default async function handler(req, res) {
  const { topic_id } = req.body || {};
  if (!topic_id) return res.status(400).json({ error: 'topic_id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch topic + verify ownership
    const { data: topic, error: topicErr } = await supabase
      .from('linkedin_topics')
      .select('*')
      .eq('id', topic_id)
      .eq('user_id', req.user.id)
      .single();

    if (topicErr || !topic) return res.status(404).json({ error: 'Topic not found' });

    // Fetch full content if missing
    let content = topic.full_content;
    if (!content) {
      const exaKey = await resolveExaKey(req.user.id);
      content = await fetchUrlContent(topic.url, exaKey);
      if (content) {
        await supabase.from('linkedin_topics').update({ full_content: content }).eq('id', topic_id);
      }
    }

    // Resolve keys
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

    const client = new OpenAI({ apiKey: keys.openaiKey });

    // Fetch config for CTA and brand context
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const { data: brand } = await supabase
      .from('brand_kit')
      .select('brand_name, tagline, industry, target_audience')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const brandContext = [
      brand?.brand_name ? `Brand: ${brand.brand_name}` : null,
      brand?.industry ? `Industry: ${brand.industry}` : null,
      brand?.target_audience ? `Audience: ${brand.target_audience}` : null,
    ].filter(Boolean).join('\n');

    const userMessage = `Source article: ${topic.headline}\nURL: ${topic.url}\n\nArticle content:\n${content || topic.snippet || '(no content available)'}\n\n${brandContext ? `Brand context:\n${brandContext}` : ''}`;

    // Generate 3 posts in parallel
    const styles = ['contrarian', 'story', 'data'];
    const results = await Promise.allSettled(
      styles.map(async (style) => {
        const completion = await client.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: STYLE_PROMPTS[style] },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.8,
          max_tokens: 1000,
        });

        const usage = completion.usage;
        logCost({
          username: req.user.email,
          category: 'openai',
          operation: 'linkedin_generation',
          model: 'gpt-4.1',
          input_tokens: usage?.prompt_tokens || 0,
          output_tokens: usage?.completion_tokens || 0,
        }).catch(() => {});

        let body = completion.choices[0]?.message?.content?.trim() || '';

        // Append CTA if configured
        if (config?.linkedin_cta_text && config?.linkedin_cta_url) {
          body += `\n\n${config.linkedin_cta_text} ${config.linkedin_cta_url}`;
        }

        return { style, body };
      })
    );

    // Insert successful posts
    const posts = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { style, body } = result.value;
        const { data: post, error: postErr } = await supabase
          .from('linkedin_posts')
          .insert({
            user_id: req.user.id,
            topic_id,
            style,
            body,
          })
          .select()
          .single();

        if (!postErr && post) posts.push(post);
      }
    }

    // Update topic status
    await supabase.from('linkedin_topics').update({ status: 'generated' }).eq('id', topic_id);

    return res.json({ success: true, posts });
  } catch (err) {
    console.error('[linkedin/generate-posts] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
