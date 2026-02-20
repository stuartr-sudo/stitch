import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, duration_seconds = 10 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const { huggingfaceKey } = await getUserKeys(req.user.id, req.user.email);
  if (!huggingfaceKey) return res.status(400).json({ error: 'HuggingFace API key not configured.' });

  const response = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${huggingfaceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: Math.round(duration_seconds * 50) },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'MusicGen failed', details: errorText });
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', 'audio/flac');
  return res.send(audioBuffer);
}
