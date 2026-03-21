/**
 * POST /api/voice/preview
 *
 * Generate a short voice preview clip using ElevenLabs TTS.
 * Returns raw audio/mpeg so the client can play it directly.
 *
 * Body: { voice_id: string, brand_username?: string }
 */

import { createClient } from '@supabase/supabase-js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

const PREVIEW_TEXT = 'Hey, this is what I sound like. Pretty cool, right?';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { voice_id, brand_username } = req.body;
  if (!voice_id) return res.status(400).json({ error: 'voice_id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const userId = brand_username
    ? await resolveUserIdFromBrand(brand_username, supabase, req.user?.id)
    : req.user?.id;

  if (!userId) return res.status(404).json({ error: 'User not found' });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('elevenlabs_key')
    .eq('user_id', userId)
    .maybeSingle();

  const elevenlabsKey = userKeys?.elevenlabs_key || process.env.ELEVENLABS_API_KEY;
  if (!elevenlabsKey) return res.status(400).json({ error: 'ElevenLabs API key required' });

  try {
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: PREVIEW_TEXT,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return res.status(ttsRes.status).json({ error: `ElevenLabs error: ${errText}` });
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    return res.send(audioBuffer);
  } catch (err) {
    console.error('[voice/preview] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
