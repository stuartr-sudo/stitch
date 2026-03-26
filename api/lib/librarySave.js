/**
 * Shared Library Save - Reusable function to save generated media to Supabase Storage & Database
 *
 * Storage Buckets:
 * - 'media' for images
 * - 'videos' for videos
 *
 * Database Tables:
 * - 'image_library_items' for images
 * - 'generated_videos' for videos
 */
import { generateAndUploadImageThumbnail } from './thumbnailHelper.js';

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

/**
 * Save media to Supabase Storage and Database.
 *
 * @param {object} supabase - Supabase client (service role)
 * @param {string} userId - User ID (from auth)
 * @param {string} userEmail - User email (from auth)
 * @param {object} opts - Save options
 * @param {string} opts.url - Media URL (data URL or external URL)
 * @param {string} [opts.type='image'] - 'image' or 'video'
 * @param {string} [opts.title] - Title for the saved item
 * @param {string} [opts.prompt] - Generation prompt
 * @param {string} [opts.source] - Source label for storage path prefix (e.g., 'shorts', 'storyboard')
 * @param {string} [opts.video_style] - Video style metadata
 * @param {string} [opts.visual_style] - Visual style metadata
 * @param {string} [opts.model_name] - Model name metadata
 * @param {string} [opts.storyboard_name] - Storyboard name metadata
 * @param {string} [opts.short_name] - Short name metadata
 * @returns {Promise<object>} Result object with saved, id, url, type, etc.
 */
export async function saveToLibrary(supabase, userId, userEmail, opts) {
  const {
    url,
    type = 'image',
    title,
    prompt,
    source,
  } = opts;

  if (!url) {
    throw new Error('Missing media URL');
  }

  console.log(`[Library Save] Saving ${type} from source: ${source}`);
  console.log(`[Library Save] URL type: ${url.startsWith('data:') ? 'data URL' : 'external URL'}`);

  // Early duplicate check for external URLs (before downloading)
  const table = type === 'video' ? 'generated_videos' : 'image_library_items';
  const urlField = 'url'; // Both tables use 'url' column

  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if this exact external URL already exists for this user
    let dupQuery = supabase
      .from(table)
      .select('id, ' + urlField)
      .eq(urlField, url);
    if (userId) dupQuery = dupQuery.eq('user_id', userId);
    const { data: existingByOriginal } = await dupQuery.maybeSingle();

    if (existingByOriginal) {
      console.log(`[Library Save] Duplicate found (original URL) - ID: ${existingByOriginal.id}`);
      return {
        saved: false,
        duplicate: true,
        message: 'Media already exists in library',
        id: existingByOriginal.id,
        url: existingByOriginal[urlField],
        type,
      };
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
  if (userId) dupQuery2 = dupQuery2.eq('user_id', userId);
  const { data: existing } = await dupQuery2.maybeSingle();

  if (existing) {
    console.log(`[Library Save] Duplicate found - URL already exists with ID: ${existing.id}`);
    return {
      saved: false,
      duplicate: true,
      message: 'Media already exists in library',
      id: existing.id,
      url: finalUrl,
      type,
    };
  }

  // Metadata fallback lookup from media_metadata table (per-field merge: explicit > metadata > null)
  const originalUrl = opts.url;
  if (!opts.video_style || !opts.visual_style || !opts.model_name || !opts.storyboard_name || !opts.short_name) {
    try {
      const { data: meta } = await supabase
        .from('media_metadata')
        .select('video_style, visual_style, model_name, storyboard_name, short_name')
        .eq('user_id', userId)
        .eq('source_url', originalUrl)
        .maybeSingle();
      if (meta) {
        opts.video_style = opts.video_style || meta.video_style;
        opts.visual_style = opts.visual_style || meta.visual_style;
        opts.model_name = opts.model_name || meta.model_name;
        opts.storyboard_name = opts.storyboard_name || meta.storyboard_name;
        opts.short_name = opts.short_name || meta.short_name;
      }
    } catch (err) {
      console.warn('[librarySave] metadata fallback lookup failed:', err.message);
    }
  }

  // Build insert data — populate ALL NOT NULL columns for both tables
  const userName = userEmail?.split('@')[0] || 'user';
  const safeTitle = title || `${source || 'Generated'} - ${new Date().toLocaleString()}`;

  const insertData = {
    [urlField]: finalUrl,
    title: safeTitle,
    created_at: new Date().toISOString(),
  };

  if (userId) {
    insertData.user_id = userId;
  }

  if (prompt) {
    insertData.prompt = prompt;
  }

  // Populate ALL NOT NULL columns for image_library_items
  // NOTE: source column has a CHECK constraint — only 'ai_generated' and 'amazon_import' are allowed
  if (table === 'image_library_items') {
    insertData.source = 'ai_generated';
    insertData.alt_text = safeTitle || prompt || 'Generated image';
    insertData.user_name = userName;
  }

  // Populate ALL NOT NULL columns for generated_videos
  if (table === 'generated_videos') {
    insertData.user_name = userName;
  }

  // Add metadata fields if provided
  if (opts.video_style) insertData.video_style = opts.video_style;
  if (opts.visual_style) insertData.visual_style = opts.visual_style;
  if (opts.model_name) insertData.model_name = opts.model_name;
  if (opts.storyboard_name) insertData.storyboard_name = opts.storyboard_name;
  if (opts.short_name) insertData.short_name = opts.short_name;

  console.log(`[Library Save] Insert fields: ${Object.keys(insertData).join(', ')}`);

  console.log(`[Library Save] Inserting into ${table}...`);

  const { data, error } = await supabase
    .from(table)
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error('[Library Save] Database error:', error);
    return {
      message: `Failed to save to database: ${error.message}`,
      saved: false,
      uploadedToStorage,
      url: finalUrl,
      error: error.message
    };
  }

  console.log(`[Library Save] SUCCESS - Saved to ${table} with ID: ${data.id}`);
  console.log(`[Library Save] Uploaded to storage: ${uploadedToStorage}`);

  // Generate thumbnail asynchronously (don't block the response)
  if (type === 'image' && finalUrl) {
    generateAndUploadImageThumbnail(finalUrl, supabase, userId || 'anonymous')
      .then(thumbUrl => {
        if (thumbUrl) {
          supabase.from('image_library_items')
            .update({ thumbnail_url: thumbUrl })
            .eq('id', data.id)
            .then(() => console.log(`[Library Save] Thumbnail saved for ${data.id}`))
            .catch(err => console.warn('[Library Save] Thumb update failed:', err.message));
        }
      })
      .catch(err => console.warn('[Library Save] Thumb gen failed:', err.message));
  }

  return {
    saved: true,
    uploadedToStorage,
    id: data.id,
    url: finalUrl,
    type,
  };
}
