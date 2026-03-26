import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
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

function cleanSourceUrl(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') u.searchParams.delete(key);
    }
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${u.hostname.replace(/^www\./, '')}${path}${u.search || ''}`;
  } catch { return url; }
}

function cleanPostBody(body) {
  let text = body;
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/#\w+/g, '');
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  text = text.replace(/\.([A-Z])/g, '. $1');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

const STYLE_PROMPTS = {
  contrarian: `Write a LinkedIn post using the Contrarian Insight style. Make a bold claim that challenges conventional thinking about this topic, then explain why the common take is wrong. 150-250 words.\n\n${ANTI_SLOP}`,
  story: `Write a LinkedIn post using the Story-Led style. Open with a vivid scene — a specific person, place, or moment. Tell a mini narrative that draws the reader in. 150-250 words.\n\n${ANTI_SLOP}`,
  data: `Write a LinkedIn post using the Data/Stat Punch style. Lead with a surprising number or concrete fact from the source material. 100-200 words.\n\n${ANTI_SLOP}`,
};

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch existing post
    const { data: post, error: postErr } = await supabase
      .from('linkedin_posts')
      .select('*, linkedin_topics(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });

    const topic = post.linkedin_topics;
    if (!topic) return res.status(404).json({ error: 'Associated topic not found' });

    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

    const client = new OpenAI({ apiKey: keys.openaiKey });
    const content = topic.full_content || topic.snippet || '';

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: STYLE_PROMPTS[post.style] },
        { role: 'user', content: `Source article: ${topic.headline}\nURL: ${topic.url}\n\nArticle content:\n${content}` },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    });

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'linkedin_generation',
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
    }).catch(() => {});

    let finalBody = completion.choices[0]?.message?.content?.trim() || '';

    // Clean post body
    finalBody = cleanPostBody(finalBody);

    // Append source as plain text
    if (topic.url) {
      finalBody += `\n\nsrc: ${cleanSourceUrl(topic.url)}`;
    }

    // Append CTA if configured (hyperlinked)
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('linkedin_cta_text, linkedin_cta_url')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (config?.linkedin_cta_text && config?.linkedin_cta_url) {
      finalBody += `\n${config.linkedin_cta_text} → ${config.linkedin_cta_url}`;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('linkedin_posts')
      .update({ body: finalBody, status: 'generated' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.json({ success: true, post: updated });
  } catch (err) {
    console.error('[linkedin/regenerate-post] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
