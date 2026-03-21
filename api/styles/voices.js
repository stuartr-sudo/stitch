import { VOICE_PRESETS } from '../lib/shortsTemplates.js';

export default function handler(req, res) {
  res.json(VOICE_PRESETS);
}
