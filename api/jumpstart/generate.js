import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * JumpStart - Image to Video Generation API
 * Uses Wavespeed WAN 2.2 Spicy to convert images to videos
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  
  if (!WAVESPEED_API_KEY) {
    console.error('[JumpStart] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error('[JumpStart] Supabase init error:', error);
    return res.status(500).json({ error: 'Server configuration error' });
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
    const username = fields.username?.[0];
    const resolution = fields.resolution?.[0] || '480p';
    const duration = parseInt(fields.duration?.[0] || '5', 10);

    if (!imageFile || !prompt || !username) {
      return res.status(400).json({ error: 'Missing required fields (image, prompt, username)' });
    }

    const imageBuffer = fs.readFileSync(imageFile.filepath);
    
    let mimeType = imageFile.mimetype || 'image/png';
    if (mimeType === 'text/html' && imageFile.originalFilename?.endsWith('.jpg')) {
      mimeType = 'image/jpeg';
    }
    
    const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `jumpstart-temp-${Date.now()}.${extension}`;

    console.log('[JumpStart] Uploading image:', fileName, 'Size:', imageBuffer.length);

    const bucketName = 'videos';
    const uploadResult = await supabase.storage
      .from(bucketName)
      .upload(`temp/${fileName}`, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadResult.error) {
      console.error('[JumpStart] Upload error:', uploadResult.error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`temp/${fileName}`);

    console.log('[JumpStart] Uploaded to Supabase:', publicUrl);

    console.log('[JumpStart] Submitting to Wavespeed WAN 2.2 Spicy...');
    
    const submitResponse = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2-spicy/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: publicUrl,
        prompt: prompt,
        resolution: resolution,
        duration: duration,
        seed: -1,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[JumpStart] Wavespeed submit error:', errorText);
      return res.status(500).json({ error: 'Failed to submit to video generation API' });
    }

    const submitData = await submitResponse.json();
    console.log('[JumpStart] Submit response:', submitData);

    const status = submitData.status || submitData.data?.status;
    const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
    
    if (status === 'completed' && resultUrl) {
      console.log('[JumpStart] Video ready immediately:', resultUrl);
      await supabase.storage.from(bucketName).remove([`temp/${fileName}`]);
      
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
