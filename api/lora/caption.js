import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

const BATCH_SIZE = 3;

// Different captioning strategies per training type (informed by Ostris/AI Toolkit best practices)
// Subject: describe everything EXCEPT the subject's identity — trigger word absorbs who/what the subject is
// Style: describe only the content, NOT the visual style — trigger word absorbs the aesthetic
const CAPTION_STRATEGIES = {
  subject: (triggerWord) => `You are a LoRA training caption writer for SUBJECT training. Describe this image in one concise sentence for AI model training. Describe the pose, angle, lighting, setting, clothing, and background — but do NOT describe the subject's identity, face features, or distinguishing characteristics. The trigger word "${triggerWord}" will absorb the subject's identity.${triggerWord ? ` Start every caption with "${triggerWord}".` : ''} Do NOT mention image quality, resolution, or that it's a photo.`,
  style: (triggerWord) => `You are a LoRA training caption writer for STYLE training. Describe this image in one concise sentence for AI model training. Describe ONLY the content and subject matter — what objects, people, or scenes are depicted, their poses and positions. Do NOT describe the visual style, artistic technique, brush strokes, color palette, texture, mood, or aesthetic. The trigger word "${triggerWord}" will absorb the visual style.${triggerWord ? ` Start every caption with "${triggerWord}".` : ''} Do NOT mention image quality, resolution, or that it's a photo.`,
  character: (triggerWord) => `You are a LoRA training caption writer for CHARACTER training. Describe this image in one concise sentence for AI model training. Describe the pose, camera angle, lighting, setting, and clothing — but do NOT describe the character's face, hair color, eye color, or body type. The trigger word "${triggerWord}" will absorb the character's identity.${triggerWord ? ` Start every caption with "${triggerWord}".` : ''} Do NOT mention image quality, resolution, or that it's a photo.`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image_urls, trigger_word, training_type = 'subject' } = req.body;

  if (!Array.isArray(image_urls) || image_urls.length === 0) {
    return res.status(400).json({ error: 'image_urls must be a non-empty array' });
  }

  let openaiKey;
  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    openaiKey = keys.openaiKey;
  } catch (err) {
    console.error('[LoRA Caption] getUserKeys error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve API keys' });
  }

  if (!openaiKey) {
    return res.status(400).json({ error: 'OpenAI API key not configured' });
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  const strategyFn = CAPTION_STRATEGIES[training_type] || CAPTION_STRATEGIES.subject;
  const systemPrompt = strategyFn(trigger_word || '');

  async function captionImage(imageUrl) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'low' },
              },
              { type: 'text', text: 'Caption this image for LoRA training.' },
            ],
          },
        ],
      });
      return response.choices[0]?.message?.content?.trim() || null;
    } catch (err) {
      console.error('[LoRA Caption] Image caption error:', err.message);
      return null;
    }
  }

  const captions = [];

  for (let i = 0; i < image_urls.length; i += BATCH_SIZE) {
    const batch = image_urls.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(captionImage));
    captions.push(...results);
  }

  const captioned = captions.filter((c) => c !== null).length;

  return res.json({
    success: true,
    captions,
    captioned,
    total: image_urls.length,
  });
}
