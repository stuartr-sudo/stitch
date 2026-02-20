import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { audio_url } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'Missing audio_url' });

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const response = await fetch('https://fal.run/fal-ai/whisper', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url,
      task: 'transcribe',
      chunk_level: 'word',
      version: 'large-v3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'Whisper transcription failed', details: errorText });
  }

  const data = await response.json();
  return res.json({
    success: true,
    text: data.text,
    chunks: data.chunks || [],
    words: data.words || [],
  });
}
