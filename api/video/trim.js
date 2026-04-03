import { getUserKeys } from '../lib/getUserKeys.js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { falKey } = await getUserKeys(req.user.id, req.user.email);
    if (!falKey) return res.status(400).json({ error: 'FAL API key not configured.' });

    const { video_url, start_time, end_time } = req.body;

    if (!video_url) return res.status(400).json({ error: 'video_url required' });
    if (start_time == null || end_time == null) return res.status(400).json({ error: 'start_time and end_time required' });
    if (start_time < 0) return res.status(400).json({ error: 'start_time must be >= 0' });
    if (end_time <= start_time) return res.status(400).json({ error: 'end_time must be > start_time' });

    const duration = end_time - start_time;
    if (duration > 60) return res.status(400).json({ error: 'Maximum trim duration is 60 seconds' });

    const endpoint = 'fal-ai/ffmpeg-api/compose';
    const body = {
      tracks: [{
        type: 'video',
        segments: [{
          url: video_url,
          start_time: start_time,
          duration: duration,
        }],
      }],
      duration: duration,
    };

    const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      console.error('[VideoTrim] Submit error:', errText.substring(0, 300));
      return res.status(502).json({ error: 'Failed to start video trim' });
    }

    const queueData = await submitRes.json();

    const result = await pollFalQueue(queueData.response_url, endpoint, falKey, 60, 2000);
    const outputUrl = result?.video_url || result?.video?.url || result?.output_url;
    if (!outputUrl) return res.status(500).json({ error: 'Trim produced no output' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const trimmedUrl = await uploadUrlToSupabase(outputUrl, supabase, `media/trimmed/${req.user.id}`);

    return res.json({ trimmed_url: trimmedUrl, duration });
  } catch (error) {
    console.error('[VideoTrim] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
