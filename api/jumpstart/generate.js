import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null; // Return null instead of throwing
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * JumpStart - Image to Video Generation API
 * Uses Wavespeed WAN 2.2 Spicy to convert images to videos
 * Supports both Supabase upload (preferred) and direct base64 (fallback)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  
  if (!WAVESPEED_API_KEY) {
    console.error('[JumpStart] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing Wavespeed API key. Please configure WAVESPEED_API_KEY.' });
  }

  // Supabase is optional - we can use base64 directly if not configured
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('[JumpStart] Supabase not configured, will use base64 fallback');
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
    const username = fields.username?.[0] || 'default';
    const resolution = fields.resolution?.[0] || '480p';
    const duration = parseInt(fields.duration?.[0] || '5', 10);

    if (!imageFile || !prompt) {
      return res.status(400).json({ error: 'Missing required fields (image, prompt)' });
    }

    const imageBuffer = fs.readFileSync(imageFile.filepath);
    
    let mimeType = imageFile.mimetype || 'image/png';
    if (mimeType === 'text/html' && imageFile.originalFilename?.endsWith('.jpg')) {
      mimeType = 'image/jpeg';
    }
    
    let imageUrl;
    let tempFileName = null;

    // Try Supabase upload first, fall back to base64
    if (supabase) {
      try {
        const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        tempFileName = `jumpstart-temp-${Date.now()}.${extension}`;
        
        console.log('[JumpStart] Uploading to Supabase:', tempFileName);

        const bucketName = 'videos';
        const uploadResult = await supabase.storage
          .from(bucketName)
          .upload(`temp/${tempFileName}`, imageBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadResult.error) {
          console.warn('[JumpStart] Supabase upload failed, using base64:', uploadResult.error.message);
          // Fall through to base64
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`temp/${tempFileName}`);
          
          imageUrl = publicUrl;
          console.log('[JumpStart] Using Supabase URL:', imageUrl);
        }
      } catch (uploadError) {
        console.warn('[JumpStart] Supabase error, using base64:', uploadError.message);
      }
    }

    // Use base64 data URL if Supabase didn't work
    if (!imageUrl) {
      const base64Image = imageBuffer.toString('base64');
      imageUrl = `data:${mimeType};base64,${base64Image}`;
      console.log('[JumpStart] Using base64 data URL (length:', imageUrl.length, ')');
    }

    console.log('[JumpStart] Submitting to Wavespeed WAN 2.2 Spicy...');
    console.log('[JumpStart] Prompt:', prompt.substring(0, 100) + '...');
    console.log('[JumpStart] Duration:', duration, 'Resolution:', resolution);
    
    const submitResponse = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2-spicy/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        prompt: prompt,
        resolution: resolution,
        duration: duration,
        seed: -1,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[JumpStart] Wavespeed submit error:', errorText);
      return res.status(500).json({ error: 'Failed to submit to video generation API: ' + errorText.substring(0, 200) });
    }

    const submitData = await submitResponse.json();
    console.log('[JumpStart] Submit response:', JSON.stringify(submitData).substring(0, 500));

    const status = submitData.status || submitData.data?.status;
    const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
    
    if (status === 'completed' && resultUrl) {
      console.log('[JumpStart] Video ready immediately:', resultUrl);
      
      // Clean up temp file if we used Supabase
      if (supabase && tempFileName) {
        await supabase.storage.from('videos').remove([`temp/${tempFileName}`]).catch(() => {});
      }
      
      return res.status(200).json({
        success: true,
        videoUrl: resultUrl,
        status: 'completed',
      });
    }
      
    const requestId = submitData.id || submitData.request_id || submitData.data?.id;
    
    if (!requestId) {
      console.error('[JumpStart] No request ID in response:', submitData);
      return res.status(500).json({ error: 'No request ID returned from API' });
    }

    console.log('[JumpStart] Request ID:', requestId);

    return res.status(200).json({
      success: true,
      requestId: requestId,
      status: status || 'processing',
      message: 'Video generation started. Polling for result...',
    });

  } catch (error) {
    console.error('[JumpStart] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
