/**
 * Imagineer Edit — LoRA-enhanced image editing via FLUX 2.
 * Uses fal-ai/flux-2/lora/edit for prompt-based image editing with LoRA support.
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image_url, prompt, mask_url, loras, strength, dimensions } = req.body;
  if (!image_url || !prompt) {
    return res.status(400).json({ error: 'image_url and prompt are required' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) return res.status(400).json({ error: 'Fal.ai key not configured.' });

  const sizeMap = {
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '1:1': 'square_hd',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
  };

  const payload = {
    image_url,
    prompt,
    image_size: sizeMap[dimensions] || 'square_hd',
    strength: strength ?? 0.75,
    num_images: 1,
  };

  if (mask_url) payload.mask_url = mask_url;

  if (loras?.length) {
    payload.loras = loras.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
  }

  try {
    const response = await fetch('https://queue.fal.run/fal-ai/flux-2/lora/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'FLUX edit API error', details: errorText });
    }

    const data = await response.json();

    // Log cost
    const username = req.user.email || req.user.id;
    await logCost({
      username,
      category: 'fal',
      operation: 'image_edit',
      model: 'flux-2-lora-edit',
      metadata: { image_count: 1, has_loras: !!(loras?.length), lora_count: loras?.length || 0 },
    });

    if (data.images?.[0]?.url) {
      return res.json({ success: true, imageUrl: data.images[0].url, status: 'completed' });
    }

    if (data.request_id) {
      return res.json({
        success: true,
        requestId: data.request_id,
        model: 'fal-flux-edit',
        status: 'processing',
        pollEndpoint: '/api/imagineer/result',
      });
    }

    return res.status(500).json({ error: 'Unexpected FLUX edit response' });
  } catch (err) {
    console.error('[imagineer/edit] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
