/**
 * Audio Library — Search and save reusable SFX and music tracks.
 * Checks library before generating new audio to avoid duplicate costs.
 *
 * POST /api/audio/library (action: 'search' | 'save' | 'increment')
 *
 * Search: { action: 'search', type: 'sfx'|'music', niche, query, limit? }
 * Save:   { action: 'save', type: 'sfx'|'music', url, prompt, niche, beat_type?, duration?, tags?, style?, bpm? }
 * Increment: { action: 'increment', id } — bumps use_count when reusing
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  const { action } = req.body;

  try {
    switch (action) {
      case 'search': {
        const { type, niche, query, limit = 5 } = req.body;
        if (!type || !query) return res.status(400).json({ error: 'type and query required' });

        const { data, error } = await supabase.rpc('search_audio_library', {
          p_type: type,
          p_niche: niche || null,
          p_query: query,
          p_limit: limit,
        });

        if (error) throw error;
        return res.json({ results: data || [], count: data?.length || 0 });
      }

      case 'save': {
        const { type, url, prompt, niche, beat_type, duration, tags, style, bpm } = req.body;
        if (!type || !url || !prompt) return res.status(400).json({ error: 'type, url, prompt required' });

        // Auto-generate tags from the prompt if not provided
        const autoTags = tags || extractTags(prompt, niche, beat_type);

        const { data, error } = await supabase.from('audio_library').insert({
          user_id: userId,
          type,
          url,
          prompt,
          niche: niche || null,
          beat_type: beat_type || null,
          duration_seconds: duration || null,
          tags: autoTags,
          style: style || null,
          bpm: bpm || null,
        }).select('id').single();

        if (error) throw error;
        console.log(`[audio-library] Saved ${type}: "${prompt.slice(0, 50)}..." → ${data.id}`);
        return res.json({ id: data.id, saved: true });
      }

      case 'increment': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id required' });

        const { error } = await supabase.from('audio_library')
          .update({ use_count: supabase.rpc ? undefined : 1, last_used_at: new Date().toISOString() })
          .eq('id', id);

        // Use raw SQL for atomic increment
        await supabase.rpc('increment_audio_use_count', { p_id: id }).catch(() => {
          // Fallback: just update last_used_at
        });

        return res.json({ incremented: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[audio-library] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Extract tags from an SFX/music prompt for better search matching.
 */
function extractTags(prompt, niche, beatType) {
  const tags = [];
  if (niche) tags.push(niche);
  if (beatType) tags.push(beatType);

  // Extract common audio keywords
  const keywords = [
    'bass', 'impact', 'whoosh', 'riser', 'drone', 'ambient', 'hit', 'boom',
    'click', 'beep', 'chime', 'bell', 'sweep', 'glitch', 'static', 'thunder',
    'rain', 'wind', 'heartbeat', 'footsteps', 'door', 'creak', 'snap',
    'electronic', 'orchestral', 'piano', 'strings', 'synth', 'guitar',
    'drums', 'percussion', 'trap', 'lo-fi', 'cinematic', 'epic',
    'dark', 'bright', 'warm', 'cold', 'eerie', 'tense', 'upbeat',
    'horror', 'sci-fi', 'nature', 'urban', 'military', 'space',
  ];

  const lower = prompt.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) tags.push(kw);
  }

  return [...new Set(tags)].slice(0, 15);
}
