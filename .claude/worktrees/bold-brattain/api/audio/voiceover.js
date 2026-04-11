/**
 * Voiceover endpoint — generates TTS audio via FAL.ai ElevenLabs proxy.
 *
 * POST /api/audio/voiceover
 * Body: { text, voiceId?, stability? }
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
    const { text, voiceId, stability } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.falKey) {
      return res.status(400).json({ error: 'FAL API key required for voiceover generation.' });
    }

    const audioUrl = await generateVoiceover(text, keys, supabase, {
      voiceId,
      stability,
    });

    return res.json({ url: audioUrl });
  } catch (err) {
    console.error('[voiceover] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
