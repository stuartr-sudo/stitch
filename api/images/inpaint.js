import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Inpaint API - AI Object Removal/Replacement
 */

// Helper to ensure a URL is publicly accessible by Wavespeed's servers.
// Uploads data URLs and re-hosts remote URLs (e.g. fal.ai temp URLs) to Supabase storage.
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
      // Parse data URL
      const matches = urlOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return urlOrData;
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      // Fetch remote URL and re-host it
      console.log(`[Inpaint] Re-hosting remote URL for ${filename}...`);
      const resp = await fetch(urlOrData);
      if (!resp.ok) {
        console.error(`[Inpaint] Failed to fetch remote URL (${resp.status}): ${urlOrData.substring(0, 100)}`);
        return urlOrData; // fallback — let Wavespeed try it directly
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

  const { wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'Wavespeed API key not configured. Please add it in API Keys settings.' });
  }

  try {
    const { image_url, mask_url, prompt, useProUltra = false } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'Missing image_url' });
    }
    if (!mask_url) {
      return res.status(400).json({ error: 'Missing mask_url' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Inpaint] Processing with Pro Ultra:', useProUltra);

    // Ensure both image and mask are publicly accessible URLs
    // This handles data: URLs, expired fal.ai temp URLs, and other inaccessible sources
    const processedImageUrl = await ensurePublicUrl(image_url, 'image');
    const processedMaskUrl = await ensurePublicUrl(mask_url, 'mask');

    const endpoint = useProUltra 
      ? 'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit-ultra'
      : 'https://api.wavespeed.ai/api/v3/google/nano-banana/edit';

    const requestBody = {
      images: [processedImageUrl],
      mask: processedMaskUrl,
      prompt: prompt,
      resolution: useProUltra ? '4k' : '2k',
    };
    
    console.log('[Inpaint] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Inpaint] API Error:', errorText);
      return res.status(response.status).json({ error: 'API error', details: errorText });
    }

    const data = await response.json();
    const imageUrl = data.outputs?.[0] || data.data?.outputs?.[0];

    if (imageUrl) {
      return res.status(200).json({ success: true, imageUrl, status: 'completed' });
    }

    const requestId = data.id || data.request_id || data.data?.id;
    if (requestId) {
      return res.status(200).json({ success: true, requestId, status: 'processing' });
    }

    return res.status(500).json({ error: 'Unexpected response format' });

  } catch (error) {
    console.error('[Inpaint] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
