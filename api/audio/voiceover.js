import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, provider = 'huggingface', voice_description } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const keys = await getUserKeys(req.user.id, req.user.email);

  if (provider === 'elevenlabs') {
    const apiKey = keys.elevenlabsKey;
    if (!apiKey) return res.status(400).json({ error: 'ElevenLabs API key not configured.' });

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'ElevenLabs TTS failed' });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(audioBuffer);
  }

  const hfKey = keys.huggingfaceKey;
  if (!hfKey) return res.status(400).json({ error: 'HuggingFace API key not configured.' });

  const description = voice_description || 'A professional female marketing voice, clear and energetic.';

  const response = await fetch('https://api-inference.huggingface.co/models/parler-tts/parler-tts-mini-v1', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text, parameters: { description } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'HuggingFace TTS failed', details: errorText });
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', 'audio/flac');
  return res.send(audioBuffer);
}
