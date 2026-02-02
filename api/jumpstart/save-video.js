import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * JumpStart - Save Generated Video to Supabase Storage
 * Downloads server-side and uploads to Supabase storage
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoUrl, username } = req.body || {};
  if (!videoUrl || !username) {
    return res.status(400).json({ error: 'Missing required fields (videoUrl, username)' });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error('[JumpStart] Supabase init error:', error);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Download video (server-side, no browser CORS issues)
    const resp = await fetch(videoUrl);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'Failed to download video', details: txt || String(resp.status) });
    }

    const contentType = resp.headers.get('content-type') || 'video/mp4';
    const arrayBuf = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length < 1024) {
      console.warn('[JumpStart] Downloaded video is unexpectedly small:', buffer.length);
    }

    // Upload to Supabase Storage
    const fileName = `stitch-video-${Date.now()}.mp4`;
    const objectPath = `videos/${username}/${fileName}`;

    const uploadResult = await supabase.storage
      .from('videos')
      .upload(objectPath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadResult.error) {
      console.error('[JumpStart] Upload error:', uploadResult.error);
      return res.status(500).json({ error: 'Failed to upload video to storage', details: uploadResult.error.message });
    }

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(objectPath);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      return res.status(500).json({ error: 'Failed to get public URL' });
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      bucket: 'videos',
      path: objectPath,
      contentType,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[JumpStart] save-video error:', error);
    return res.status(500).json({ error: error.message });
  }
}
