/**
 * saveAnalysisFrames.js
 *
 * Saves extracted video analysis frames to the user's image library
 * with auto-tagging. Fire-and-forget — callers should .catch() errors.
 */

import { createClient } from '@supabase/supabase-js';
import { uploadUrlToSupabase } from './pipelineHelpers.js';
import { saveToLibrary } from './librarySave.js';

/**
 * Save analysis frames to the image library and tag them.
 *
 * @param {object} supabase - Supabase client (service role)
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string[]} frameUrls - Array of frame image URLs (from FAL)
 * @param {object} [metadata] - Video metadata from resolveVideoUrl
 * @param {string} [metadata.title] - Video title
 * @param {string} [metadata.platform] - Platform name
 * @param {string} [source='ad-clone'] - Source label ('ad-clone' or 'video-analysis')
 * @returns {Promise<{ savedFrames: Array<{frameUrl: string, libraryItemId: string}>, tagName: string }>}
 */
export async function saveAnalysisFrames(supabase, userId, userEmail, frameUrls, metadata, source = 'ad-clone') {
  if (!frameUrls?.length) return { savedFrames: [], tagName: null };

  const videoTitle = metadata?.title || 'Untitled Video';
  const tagPrefix = source === 'ad-clone' ? 'Ad Clone' : 'Video Analysis';
  const tagName = `${tagPrefix}: ${videoTitle}`.slice(0, 50);

  console.log(`[saveAnalysisFrames] Saving ${frameUrls.length} frames as "${tagName}"`);

  // Save each frame to the library (batch of 4 for concurrency)
  const savedFrames = [];
  for (let batch = 0; batch < frameUrls.length; batch += 4) {
    const batchUrls = frameUrls.slice(batch, batch + 4);
    const results = await Promise.allSettled(
      batchUrls.map(async (url, i) => {
        const frameNum = batch + i + 1;
        // Upload to Supabase storage first
        const storedUrl = await uploadUrlToSupabase(url, supabase, 'analysis');

        // Save to library database
        const result = await saveToLibrary(supabase, userId, userEmail, {
          url: storedUrl,
          type: 'image',
          title: `${videoTitle} - Frame ${frameNum}`,
          source: 'ai_generated',
        });

        return { frameUrl: storedUrl, libraryItemId: result?.id || null };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) savedFrames.push(r.value);
    }
  }

  // Create or find the tag
  let tagId = null;
  try {
    // Check if tag already exists
    const { data: existing } = await supabase
      .from('image_tags')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', tagName)
      .single();

    if (existing) {
      tagId = existing.id;
    } else {
      const { data: created } = await supabase
        .from('image_tags')
        .insert({ user_id: userId, name: tagName })
        .select('id')
        .single();
      tagId = created?.id;
    }
  } catch (err) {
    console.warn(`[saveAnalysisFrames] Tag creation failed: ${err.message}`);
  }

  // Assign tag to all saved frames
  if (tagId) {
    const imageIds = savedFrames.map(f => f.libraryItemId).filter(Boolean);
    if (imageIds.length > 0) {
      const rows = imageIds.map(image_id => ({ image_id, tag_id: tagId }));
      await supabase
        .from('image_tag_links')
        .upsert(rows, { onConflict: 'image_id,tag_id', ignoreDuplicates: true })
        .then(() => console.log(`[saveAnalysisFrames] Tagged ${rows.length} frames as "${tagName}"`))
        .catch(err => console.warn(`[saveAnalysisFrames] Tag assignment failed: ${err.message}`));
    }
  }

  return { savedFrames, tagName };
}

export default saveAnalysisFrames;
