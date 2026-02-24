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
    console.warn('[Library Save] Supabase not configured - SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
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

    console.log(`[Library Save] Saving ${type} from source: ${source}`);
    console.log(`[Library Save] URL type: ${url.startsWith('data:') ? 'data URL' : 'external URL'}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Early duplicate check for external URLs (before downloading)
    const table = type === 'video' ? 'generated_videos' : 'image_library_items';
    const urlField = 'url'; // Both tables use 'url' column
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Check if this exact external URL already exists for this user
      let dupQuery = supabase
        .from(table)
        .select('id, ' + urlField)
        .eq(urlField, url);
      if (req.user?.id) dupQuery = dupQuery.eq('user_id', req.user.id);
      const { data: existingByOriginal } = await dupQuery.maybeSingle();
      
      if (existingByOriginal) {
        console.log(`[Library Save] Duplicate found (original URL) - ID: ${existingByOriginal.id}`);
        return res.status(200).json({
          success: true,
          saved: false,
          duplicate: true,
          message: 'Media already exists in library',
          id: existingByOriginal.id,
          url: existingByOriginal[urlField],
          type,
        });
      }
    }

    let finalUrl = url;
    let uploadedToStorage = false;
    const bucket = type === 'video' ? 'videos' : 'media';

    // Handle data URLs (base64)
    if (url.startsWith('data:')) {
      console.log('[Library Save] Processing data URL...');
      
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const extension = getExtensionFromMime(mimeType, type);
        const fileName = `${source || 'upload'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        const filePath = `library/${fileName}`;
        
        console.log(`[Library Save] Uploading data URL to ${bucket}/${filePath}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: false,
          });
        
        if (uploadError) {
          console.error('[Library Save] Storage upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          
          finalUrl = publicUrl;
          uploadedToStorage = true;
          console.log('[Library Save] Uploaded data URL to storage:', finalUrl);
        }
      }
    }
    // Handle external URLs (https://) - download and re-upload to Supabase
    else if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('[Library Save] Processing external URL, downloading...');
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          const contentType = response.headers.get('content-type') || (type === 'video' ? 'video/mp4' : 'image/png');
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const extension = getExtensionFromMime(contentType, type);
          const fileName = `${source || 'download'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
          const filePath = `library/${fileName}`;
          
          console.log(`[Library Save] Uploading external file to ${bucket}/${filePath} (${buffer.length} bytes)`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
              contentType: contentType,
              upsert: false,
            });
          
          if (uploadError) {
            console.error('[Library Save] Storage upload error:', uploadError);
            // Fall back to saving just the URL reference
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(filePath);
            
            finalUrl = publicUrl;
            uploadedToStorage = true;
            console.log('[Library Save] Uploaded external file to storage:', finalUrl);
          }
        } else {
          console.warn('[Library Save] Failed to download external URL:', response.status);
        }
      } catch (downloadError) {
        console.error('[Library Save] Error downloading external URL:', downloadError.message);
        // Continue with original URL
      }
    }

    // Check for duplicates with the final URL (may differ from original after upload)
    console.log(`[Library Save] Checking for duplicates in ${table}...`);
    let dupQuery2 = supabase
      .from(table)
      .select('id')
      .eq(urlField, finalUrl);
    if (req.user?.id) dupQuery2 = dupQuery2.eq('user_id', req.user.id);
    const { data: existing } = await dupQuery2.maybeSingle();
    
    if (existing) {
      console.log(`[Library Save] Duplicate found - URL already exists with ID: ${existing.id}`);
      return res.status(200).json({
        success: true,
        saved: false,
        duplicate: true,
        message: 'Media already exists in library',
        id: existing.id,
        url: finalUrl,
        type,
      });
    }

    // Build insert data - only include fields that exist in the tables
    const insertData = {
      [urlField]: finalUrl,
      title: title || `${source || 'Generated'} - ${new Date().toLocaleString()}`,
      created_at: new Date().toISOString(),
    };

    if (req.user?.id) {
      insertData.user_id = req.user.id;
    }

    // user_name is NOT NULL on generated_videos — use email prefix or 'user'
    if (table === 'generated_videos') {
      insertData.user_name = req.user?.email?.split('@')[0] || 'user';
    }

    // Add optional fields if they might exist
    if (prompt) {
      insertData.prompt = prompt;
    }

    console.log(`[Library Save] Inserting into ${table}...`);

    const { data, error } = await supabase
      .from(table)
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Library Save] Database error:', error);
      return res.status(200).json({ 
        success: true, 
        message: `Failed to save to database: ${error.message}`,
        saved: false,
        uploadedToStorage,
        url: finalUrl,
        error: error.message 
      });
    }

    console.log(`[Library Save] SUCCESS - Saved to ${table} with ID: ${data.id}`);
    console.log(`[Library Save] Uploaded to storage: ${uploadedToStorage}`);

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

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType, type) {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mov')) return 'mov';
  // Default based on type
  return type === 'video' ? 'mp4' : 'png';
}
