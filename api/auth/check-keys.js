import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const hasKeys = !!(keys.falKey && keys.openaiKey);
    res.json({ hasKeys });
  } catch (err) {
    console.error('[check-keys] error:', err.message);
    res.json({ hasKeys: false });
  }
}
