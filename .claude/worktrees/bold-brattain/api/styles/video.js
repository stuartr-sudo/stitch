import { listVideoStyles } from '../lib/videoStylePresets.js';

export default function handler(req, res) {
  res.json(listVideoStyles());
}
