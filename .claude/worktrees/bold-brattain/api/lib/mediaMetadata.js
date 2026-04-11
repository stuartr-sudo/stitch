/**
 * Media Metadata — audit/fallback table for generation provenance.
 * Written at generation time; looked up by saveToLibrary() as fallback
 * when metadata fields aren't passed directly.
 */

/**
 * Write metadata at generation time. Upserts on (user_id, source_url).
 * Fire-and-forget — errors are logged but don't throw.
 *
 * @param {object} supabase
 * @param {string} userId
 * @param {string} sourceUrl - The URL of the generated media
 * @param {object} metadata - { video_style?, visual_style?, model_name?, storyboard_name?, short_name? }
 */
export async function writeMediaMetadata(supabase, userId, sourceUrl, metadata) {
  if (!supabase || !userId || !sourceUrl) return;
  try {
    const row = {
      user_id: userId,
      source_url: sourceUrl,
      ...Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v != null)
      ),
    };
    await supabase
      .from('media_metadata')
      .upsert(row, { onConflict: 'user_id,source_url' });
  } catch (err) {
    console.warn('[mediaMetadata] write failed:', err.message);
  }
}

/**
 * Look up metadata by source URL. Returns metadata object or null.
 */
export async function lookupMediaMetadata(supabase, userId, sourceUrl) {
  if (!supabase || !userId || !sourceUrl) return null;
  try {
    const { data } = await supabase
      .from('media_metadata')
      .select('video_style, visual_style, model_name, storyboard_name, short_name')
      .eq('user_id', userId)
      .eq('source_url', sourceUrl)
      .maybeSingle();
    return data || null;
  } catch (err) {
    console.warn('[mediaMetadata] lookup failed:', err.message);
    return null;
  }
}
