import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

/**
 * Inpaint API - AI masked region editing via fal.ai
 *
 * Uses fal.ai's Flux Kontext inpainting model which properly supports masks:
 *   white = edit area, black = keep area
 *
 * Wavespeed's edit endpoints do NOT support masks — they edit the entire image.
 */

// Helper to ensure a URL is publicly accessible by fal.ai's servers.
async function ensurePublicUrl(urlOrData, filename) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[Inpaint] Supabase not configured, using URL directly');
    return urlOrData;
  }

  // Already a Supabase public URL — no need to re-upload
  if (urlOrData.includes(SUPABASE_URL)) {
    return urlOrData;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let buffer, mimeType;

    if (urlOrData.startsWith('data:')) {
      const matches = urlOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return urlOrData;
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      console.log(`[Inpaint] Re-hosting remote URL for ${filename}...`);
      const resp = await fetch(urlOrData);
      if (!resp.ok) {
        console.error(`[Inpaint] Failed to fetch remote URL (${resp.status})`);
        return urlOrData;
      }
      mimeType = resp.headers.get('content-type') || 'image/png';
      buffer = Buffer.from(await resp.arrayBuffer());
    }

    const extension = mimeType.split('/')[1]?.split(';')[0] || 'png';
    const filePath = `inpaint/${filename}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      console.error('[Inpaint] Upload error:', error);
      return urlOrData;
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    console.log(`[Inpaint] Re-hosted ${filename} to:`, urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('[Inpaint] Upload failed:', err);
    return urlOrData;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'Fal.ai API key not configured. Please add it in API Keys settings.' });
  }

  try {
    const { image_url, mask_url, prompt, useProUltra = false } = req.body;

    if (!image_url) return res.status(400).json({ error: 'Missing image_url' });
    if (!mask_url) return res.status(400).json({ error: 'Missing mask_url' });
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    console.log('[Inpaint] Processing via fal.ai (Flux Kontext inpaint)');

    // Ensure both image and mask are publicly accessible URLs
    const processedImageUrl = await ensurePublicUrl(image_url, 'image');
    const processedMaskUrl = await ensurePublicUrl(mask_url, 'mask');

    const endpoint = 'fal-ai/flux-kontext-lora/inpaint';

    const requestBody = {
      image_url: processedImageUrl,
      mask_url: processedMaskUrl,
      prompt,
    };

    console.log('[Inpaint] Endpoint:', endpoint);
    console.log('[Inpaint] Image:', processedImageUrl.substring(0, 80));
    console.log('[Inpaint] Mask:', processedMaskUrl.substring(0, 80));

    // Use fal.run for synchronous result (inpainting is fast)
    const response = await fetch(`https://fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Inpaint] fal.ai error (${response.status}):`, errorText.substring(0, 300));

      // If sync call fails, try queue
      if (response.status >= 500) {
        console.log('[Inpaint] Retrying via queue...');
        return await tryQueue(FAL_KEY, endpoint, requestBody, req, res);
      }

      return res.status(response.status).json({ error: `Inpaint failed: ${errorText.substring(0, 200)}` });
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url || data.image?.url;

    if (imageUrl) {
      console.log('[Inpaint] ✅ Got result from fal.run');

      await logCost({
        username: req.user.email || req.user.id,
        category: 'fal',
        operation: 'inpaint',
        model: endpoint,
      });

      return res.status(200).json({ success: true, imageUrl, status: 'completed' });
    }

    console.error('[Inpaint] Unexpected response:', JSON.stringify(data).substring(0, 300));
    return res.status(500).json({ error: 'Unexpected response — no image returned' });

  } catch (error) {
    console.error('[Inpaint] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Fallback: queue-based call if sync fails
async function tryQueue(falKey, endpoint, payload, req, res) {
  try {
    const response = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Inpaint] Queue error:', errorText.substring(0, 300));
      return res.status(response.status).json({ error: `Inpaint failed: ${errorText.substring(0, 200)}` });
    }

    const data = await response.json();

    // Some fast models return the image directly even via queue
    if (data.images?.[0]?.url) {
      return res.status(200).json({ success: true, imageUrl: data.images[0].url, status: 'completed' });
    }

    if (data.request_id) {
      console.log(`[Inpaint] Queued: ${data.request_id}`);
      return res.status(200).json({
        success: true,
        requestId: data.request_id,
        model: 'inpaint',
        status: 'processing',
      });
    }

    return res.status(500).json({ error: 'Unexpected queue response' });
  } catch (err) {
    console.error('[Inpaint] Queue error:', err);
    return res.status(500).json({ error: err.message });
  }
}
