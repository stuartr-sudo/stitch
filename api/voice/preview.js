/**
 * POST /api/voice/preview
 *
 * Generate a short voice preview clip using FAL.ai ElevenLabs TTS proxy.
 * Returns raw audio/mpeg so the client can play it directly.
 *
 * Body: { voice_id: string, text?: string }
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { pollFalQueue } from '../lib/pipelineHelpers.js';
import { resolveVoiceName } from '../lib/voiceoverGenerator.js';

const DEFAULT_PREVIEW_TEXT = 'Hey, this is what I sound like. Pretty cool, right?';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { voice_id, text } = req.body;
  if (!voice_id) return res.status(400).json({ error: 'voice_id is required' });

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(400).json({ error: 'FAL API key required for voice preview' });

  try {
    // Submit to FAL queue
    const submitRes = await fetch('https://queue.fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${keys.falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text || DEFAULT_PREVIEW_TEXT,
        voice: resolveVoiceName(voice_id),
        stability: 0.5,
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return res.status(submitRes.status).json({ error: `FAL TTS error: ${errText}` });
    }

    const { request_id } = await submitRes.json();

    // Poll for completion (short timeout for preview)
    const result = await pollFalQueue(request_id, 'fal-ai/elevenlabs/tts/eleven-v3', keys.falKey, 30, 1500);

    const audioUrl = result?.audio?.url;
    if (!audioUrl) return res.status(500).json({ error: 'No audio URL returned from FAL TTS' });

    // Download and stream back to client
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return res.status(500).json({ error: `Failed to fetch audio: ${audioRes.status}` });

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    return res.send(audioBuffer);
  } catch (err) {
    console.error('[voice/preview] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
