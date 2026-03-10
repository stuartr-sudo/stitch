/**
 * Voiceover endpoint — generates TTS audio via ElevenLabs.
 *
 * POST /api/audio/voiceover
 * Body: { text, voiceId?, modelId?, stability?, similarityBoost?, style?, useSpeakerBoost? }
 */

import { generateVoiceover } from '../lib/voiceoverGenerator.js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, voiceId, modelId, stability, similarityBoost, style, useSpeakerBoost } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ error: 'Missing x-username header' });

    const keys = await getUserKeys(username);
    if (!keys.elevenlabsKey) {
      return res.status(400).json({ error: 'ElevenLabs API key not configured. Add it in Settings.' });
    }

    const audioUrl = await generateVoiceover(text, keys, supabase, {
      voiceId,
      modelId,
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
    });

    return res.json({ url: audioUrl });
  } catch (err) {
    console.error('[voiceover] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
