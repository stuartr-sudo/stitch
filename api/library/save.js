/**
 * Library Save API - Save generated media to Supabase
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

    // Determine table based on type
    const table = type === 'video' ? 'generated_videos' : 'image_library_items';
    const urlField = type === 'video' ? 'video_url' : 'image_url';

    const insertData = {
      [urlField]: url,
      url: url,
      title: title || `${source || 'Generated'} - ${new Date().toLocaleString()}`,
      prompt: prompt || '',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(table)
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[Library Save] Supabase error:', error);
      // Don't fail the request - just log and continue
      return res.status(200).json({ 
        success: true, 
        message: 'Failed to save to library',
        saved: false,
        error: error.message 
      });
    }

    console.log('[Library Save] Saved to', table, ':', data.id);

    return res.status(200).json({
      success: true,
      saved: true,
      id: data.id,
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
