import { VOICE_PRESETS } from '../lib/shortsTemplates.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Voice presets use FAL voice names directly — no ElevenLabs key needed
  const voices = VOICE_PRESETS.map(v => ({ ...v, source: 'preset' }));

  res.json(voices);
}
