/**
 * Imagineer Edit — Image editing via multiple models.
 * Supports: FLUX 2 (with LoRA), Nano Banana 2, Seedream v4.5
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image_url, prompt, mask_url, loras, strength, dimensions, model } = req.body;
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

  const selectedModel = model || 'fal-flux';

  // Model-specific endpoint and payload building
  const modelConfig = {
    'fal-flux': {
      endpoint: 'fal-ai/flux-2/lora/edit',
      buildPayload: () => {
        const p = {
          image_url,
          prompt,
          image_size: sizeMap[dimensions] || 'square_hd',
          strength: strength ?? 0.75,
          num_images: 1,
        };
        if (mask_url) p.mask_url = mask_url;
        if (loras?.length) {
          p.loras = loras.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
        }
        return p;
      },
      getImageUrl: (data) => data.images?.[0]?.url,
    },
    'nano-banana-2': {
      endpoint: 'fal-ai/nano-banana-2/edit',
      buildPayload: () => ({
        image_urls: [image_url],
        prompt,
        aspect_ratio: dimensions === '16:9' ? '16:9' : dimensions === '9:16' ? '9:16' : dimensions === '4:3' ? '4:3' : dimensions === '3:4' ? '3:4' : '1:1',
        resolution: '2K',
        num_images: 1,
      }),
      getImageUrl: (data) => data.images?.[0]?.url,
    },
    'seedream': {
      endpoint: 'fal-ai/bytedance/seedream/v4.5/edit',
      buildPayload: () => ({
        image_urls: [image_url],
        prompt,
        image_size: sizeMap[dimensions] || 'square_hd',
        num_images: 1,
      }),
      getImageUrl: (data) => data.images?.[0]?.url,
    },
  };

  const config = modelConfig[selectedModel] || modelConfig['fal-flux'];
  const payload = config.buildPayload();

  console.log(`[imagineer/edit] Model: ${selectedModel}, endpoint: ${config.endpoint}`);

  try {
    const response = await fetch(`https://queue.fal.run/${config.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[imagineer/edit] API error:`, errorText);
      return res.status(response.status).json({ error: `${selectedModel} edit API error`, details: errorText });
    }

    const data = await response.json();

    // Log cost
    const username = req.user.email || req.user.id;
    await logCost({
      username,
      category: 'fal',
      operation: 'image_edit',
      model: selectedModel,
      metadata: { image_count: 1, has_loras: !!(loras?.length), lora_count: loras?.length || 0 },
    });

    const imageUrl = config.getImageUrl(data);
    if (imageUrl) {
      return res.json({ success: true, imageUrl, status: 'completed' });
    }

    if (data.request_id) {
      return res.json({
        success: true,
        requestId: data.request_id,
        model: selectedModel,
        status: 'processing',
        pollEndpoint: '/api/imagineer/result',
      });
    }

    return res.status(500).json({ error: `Unexpected ${selectedModel} edit response` });
  } catch (err) {
    console.error('[imagineer/edit] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
