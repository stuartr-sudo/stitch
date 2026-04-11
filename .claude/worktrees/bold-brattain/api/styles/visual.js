import { listVisualStyles } from '../lib/visualStyles.js';

export default function handler(req, res) {
  res.json(listVisualStyles());
}
