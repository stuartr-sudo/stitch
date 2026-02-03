/**
 * Library Save API - Save generated media to Supabase Storage & Database
 * 
 * Storage Buckets:
 * - 'media' for images
 * - 'videos' for videos
 * 
 * Database Tables:
 * - 'image_library_items' for images
 * - 'generated_videos' for videos
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Library Save] Supabase not configured');
    return res.status(200).json({ 
      success: true, 
      message: 'Supabase not configured - media not saved',
      saved: false 
    });
  }

  try {
    const { 
      url, 
      type = 'image', // 'image' or 'video'
      title,
      prompt,
      source // e.g., 'imagineer', 'trystyle', 'jumpstart', etc.
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing media URL' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let finalUrl = url;
    let uploadedToStorage = false;

    // If it's a data URL (base64), upload to Supabase Storage
    if (url.startsWith('data:')) {
      console.log('[Library Save] Detected data URL, uploading to storage...');
      
      // Parse the data URL
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Determine bucket and file extension
        const bucket = type === 'video' ? 'videos' : 'media';
        let extension = 'png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          extension = 'jpg';
        } else if (mimeType.includes('gif')) {
          extension = 'gif';
        } else if (mimeType.includes('webp')) {
          extension = 'webp';
        } else if (mimeType.includes('mp4')) {
          extension = 'mp4';
        } else if (mimeType.includes('webm')) {
          extension = 'webm';
        }
        
        const fileName = `${source || 'upload'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        const filePath = `library/${fileName}`;
        
        console.log(`[Library Save] Uploading to ${bucket}/${filePath}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: false,
          });
        
        if (uploadError) {
          console.error('[Library Save] Storage upload error:', uploadError);
          // Continue with original URL if upload fails
        } else {
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          
          finalUrl = publicUrl;
          uploadedToStorage = true;
          console.log('[Library Save] Uploaded to storage:', finalUrl);
        }
      }
    }

    // Determine table based on type
    const table = type === 'video' ? 'generated_videos' : 'image_library_items';
    const urlField = type === 'video' ? 'video_url' : 'image_url';

    const insertData = {
      [urlField]: finalUrl,
      url: finalUrl,
      title: title || `${source || 'Generated'} - ${new Date().toLocaleString()}`,
      prompt: prompt || '',
      source: source || 'unknown',
      created_at: new Date().toISOString(),
    };

    console.log(`[Library Save] Inserting into ${table}:`, { ...insertData, [urlField]: insertData[urlField].substring(0, 50) + '...' });

    const { data, error } = await supabase
      .from(table)
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Library Save] Database error:', error);
      // Don't fail the request - just log and continue
      return res.status(200).json({ 
        success: true, 
        message: 'Failed to save to database',
        saved: false,
        uploadedToStorage,
        url: finalUrl,
        error: error.message 
      });
    }

    console.log('[Library Save] Saved to', table, '- ID:', data.id);

    return res.status(200).json({
      success: true,
      saved: true,
      uploadedToStorage,
      id: data.id,
      url: finalUrl,
      type,
    });

  } catch (error) {
    console.error('[Library Save] Error:', error);
    return res.status(200).json({ 
      success: true, 
      message: 'Error saving to library',
      saved: false,
      error: error.message 
    });
  }
}
