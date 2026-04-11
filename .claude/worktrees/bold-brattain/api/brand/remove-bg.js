import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'Missing image_url' });

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const response = await fetch('https://fal.run/fal-ai/bria/background/remove', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'Background removal failed', details: errorText });
  }

  const data = await response.json();
  const resultUrl = data.image?.url || data.output?.url || null;

  return res.json({ success: true, imageUrl: resultUrl });
}
