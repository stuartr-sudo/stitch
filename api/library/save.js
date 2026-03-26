/**
 * Library Save API - Save generated media to Supabase Storage & Database
 * Thin wrapper around the shared saveToLibrary() function.
 */
import { createClient } from '@supabase/supabase-js';
import { saveToLibrary } from '../lib/librarySave.js';

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const result = await saveToLibrary(supabase, req.user?.id, req.user?.email, req.body);
    return res.status(200).json({ success: true, ...result });
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
