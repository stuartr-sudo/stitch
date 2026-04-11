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
 * Import Image from URL
 * Downloads and re-uploads to avoid CORS issues
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, username } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl' });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    // If Supabase not configured, just return the original URL
    console.warn('[Import URL] Supabase not configured, returning original URL');
    return res.status(200).json({ success: true, url: imageUrl });
  }

  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Determine file extension
    let extension = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      extension = 'jpg';
    } else if (contentType.includes('gif')) {
      extension = 'gif';
    } else if (contentType.includes('webp')) {
      extension = 'webp';
    }

    const fileName = `imported-${Date.now()}.${extension}`;
    const objectPath = `imports/${username || 'default'}/${fileName}`;

    // Upload to Supabase
    const uploadResult = await supabase.storage
      .from('media')
      .upload(objectPath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadResult.error) {
      console.error('[Import URL] Upload error:', uploadResult.error);
      // Fall back to original URL
      return res.status(200).json({ success: true, url: imageUrl });
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(objectPath);
    const publicUrl = urlData?.publicUrl;

    return res.status(200).json({
      success: true,
      url: publicUrl || imageUrl,
      original: imageUrl,
    });

  } catch (error) {
    console.error('[Import URL] Error:', error);
    // Fall back to original URL on any error
    return res.status(200).json({ success: true, url: imageUrl });
  }
}
