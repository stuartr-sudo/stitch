/**
 * GET /api/campaigns/download-subtitles?draft_id=xxx&format=srt|vtt
 *
 * Returns the subtitle file for a draft as a downloadable file.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { draft_id, format = 'srt' } = req.query;

  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });

  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('id, template_name, subtitles_srt, subtitles_vtt')
    .eq('id', draft_id)
    .single();

  if (draftErr || !draft) return res.status(404).json({ error: 'Draft not found' });

  const content = format === 'vtt' ? draft.subtitles_vtt : draft.subtitles_srt;

  if (!content) {
    return res.status(404).json({ error: `No ${format.toUpperCase()} subtitles generated yet. Call /api/campaigns/generate-captions first.` });
  }

  const filename = `${(draft.template_name || 'subtitles').replace(/[^a-zA-Z0-9-_]/g, '_')}.${format}`;
  const contentType = format === 'vtt' ? 'text/vtt' : 'application/x-subrip';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(content);
}
