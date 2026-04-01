import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

const BATCH_SIZE = 3;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image_urls, trigger_word } = req.body;

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

  const triggerInstruction = trigger_word
    ? `Start every caption with the trigger word "${trigger_word}".`
    : '';

  const systemPrompt = `You are a LoRA training caption writer. Describe this image in one concise sentence for AI model training. Focus on the subject, pose, angle, lighting, and setting. ${triggerInstruction} Do NOT mention image quality, resolution, or that it's a photo. Just describe what you see.`.trim();

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
