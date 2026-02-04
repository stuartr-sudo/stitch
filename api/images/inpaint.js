import { createClient } from '@supabase/supabase-js';

/**
 * Inpaint API - AI Object Removal/Replacement
 */

// Helper to upload data URL to Supabase and get public URL
async function uploadToSupabase(dataUrl, filename) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[Inpaint] Supabase not configured, using data URL directly');
    return dataUrl;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Parse data URL
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return dataUrl; // Not a data URL, return as-is
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = mimeType.split('/')[1] || 'png';
    const filePath = `inpaint/${filename}-${Date.now()}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });
    
    if (error) {
      console.error('[Inpaint] Upload error:', error);
      return dataUrl;
    }
    
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);
    
    console.log('[Inpaint] Uploaded to:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('[Inpaint] Upload failed:', err);
    return dataUrl;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing API key configuration' });
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

    // Upload data URLs to Supabase to get public URLs
    let processedImageUrl = image_url;
    let processedMaskUrl = mask_url;
    
    if (image_url.startsWith('data:')) {
      console.log('[Inpaint] Uploading image to storage...');
      processedImageUrl = await uploadToSupabase(image_url, 'image');
    }
    
    if (mask_url.startsWith('data:')) {
      console.log('[Inpaint] Uploading mask to storage...');
      processedMaskUrl = await uploadToSupabase(mask_url, 'mask');
    }

    const endpoint = useProUltra 
      ? 'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit-ultra'
      : 'https://api.wavespeed.ai/api/v3/google/nano-banana/edit';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: processedImageUrl,
        mask: processedMaskUrl,
        prompt: prompt,
        resolution: useProUltra ? '4k' : '2k',
      }),
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
