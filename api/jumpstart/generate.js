import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * JumpStart - Image to Video Generation API
 * Supports multiple AI providers:
 * - Wavespeed WAN 2.2 Spicy
 * - Grok Imagine Video (FAL.ai / xAI)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const imageFile = files.image?.[0];
    const prompt = fields.prompt?.[0];
    const model = fields.model?.[0] || 'wavespeed-wan';
    const username = fields.username?.[0] || 'default';
    const resolution = fields.resolution?.[0] || '480p';
    const duration = parseInt(fields.duration?.[0] || '5', 10);
    const aspectRatio = fields.aspectRatio?.[0] || '16:9';
    const width = parseInt(fields.width?.[0] || '854', 10);
    const height = parseInt(fields.height?.[0] || '480', 10);

    if (!imageFile || !prompt) {
      return res.status(400).json({ error: 'Missing required fields (image, prompt)' });
    }

    console.log('[JumpStart] Model:', model);
    console.log('[JumpStart] Dimensions:', { aspectRatio, width, height, resolution, duration });

    // Read and prepare image
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    let mimeType = imageFile.mimetype || 'image/png';
    if (mimeType === 'text/html' && imageFile.originalFilename?.endsWith('.jpg')) {
      mimeType = 'image/jpeg';
    }

    // Get image URL (Supabase upload or base64)
    const supabase = getSupabaseClient();
    let imageUrl;
    let tempFileName = null;

    if (supabase) {
      try {
        const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        tempFileName = `jumpstart-temp-${Date.now()}.${extension}`;
        
        const bucketName = 'videos';
        const uploadResult = await supabase.storage
          .from(bucketName)
          .upload(`temp/${tempFileName}`, imageBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadResult.error) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`temp/${tempFileName}`);
          imageUrl = publicUrl;
          console.log('[JumpStart] Using Supabase URL');
        }
      } catch (uploadError) {
        console.warn('[JumpStart] Supabase error:', uploadError.message);
      }
    }

    if (!imageUrl) {
      const base64Image = imageBuffer.toString('base64');
      imageUrl = `data:${mimeType};base64,${base64Image}`;
      console.log('[JumpStart] Using base64 data URL');
    }

    // Route to appropriate provider
    if (model === 'grok-imagine') {
      return await handleGrokImagine(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, supabase, tempFileName
      });
    } else {
      return await handleWavespeed(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, width, height, supabase, tempFileName
      });
    }

  } catch (error) {
    console.error('[JumpStart] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle Wavespeed WAN 2.2 Spicy
 */
async function handleWavespeed(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution, width, height, supabase, tempFileName } = params;
  
  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing Wavespeed API key' });
  }

  console.log('[JumpStart/Wavespeed] Submitting...');
  
  const requestBody = {
    image: imageUrl,
    prompt: prompt,
    resolution: resolution,
    duration: duration,
    aspect_ratio: aspectRatio,
    width: width,
    height: height,
    seed: -1,
  };
  
  const submitResponse = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2-spicy/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Wavespeed] Error:', errorText);
    return res.status(500).json({ error: 'Wavespeed API error: ' + errorText.substring(0, 200) });
  }

  const submitData = await submitResponse.json();
  console.log('[JumpStart/Wavespeed] Response:', JSON.stringify(submitData).substring(0, 300));

  const status = submitData.status || submitData.data?.status;
  const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
  
  if (status === 'completed' && resultUrl) {
    if (supabase && tempFileName) {
      await supabase.storage.from('videos').remove([`temp/${tempFileName}`]).catch(() => {});
    }
    return res.status(200).json({ success: true, videoUrl: resultUrl, status: 'completed' });
  }
    
  const requestId = submitData.id || submitData.request_id || submitData.data?.id;
  if (!requestId) {
    return res.status(500).json({ error: 'No request ID returned' });
  }

  return res.status(200).json({
    success: true,
    requestId: requestId,
    model: 'wavespeed-wan',
    status: status || 'processing',
  });
}

/**
 * Handle Grok Imagine Video (FAL.ai / xAI)
 */
async function handleGrokImagine(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution } = params;
  
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'Missing FAL API key' });
  }

  console.log('[JumpStart/Grok] Submitting to xAI Grok Imagine Video...');
  console.log('[JumpStart/Grok] Settings:', { duration, aspectRatio, resolution });
  
  const requestBody = {
    prompt: prompt,
    image_url: imageUrl,
    duration: Math.min(duration, 15), // Max 15 seconds for Grok
    aspect_ratio: aspectRatio === 'auto' ? 'auto' : aspectRatio,
    resolution: resolution,
  };

  console.log('[JumpStart/Grok] Request:', { 
    ...requestBody, 
    image_url: requestBody.image_url.substring(0, 50) + '...',
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });
  
  const submitResponse = await fetch('https://fal.run/xai/grok-imagine-video/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Grok] Error:', errorText);
    return res.status(500).json({ error: 'Grok API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Grok] Response:', JSON.stringify(data).substring(0, 500));

  // FAL returns video directly or a request_id for queuing
  if (data.video?.url) {
    console.log('[JumpStart/Grok] Video ready:', data.video.url);
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
      videoInfo: {
        width: data.video.width,
        height: data.video.height,
        duration: data.video.duration,
        fps: data.video.fps,
      }
    });
  }

  // If queued, return request ID for polling
  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'grok-imagine',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Grok API' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
