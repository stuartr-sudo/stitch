import { createClient } from '@supabase/supabase-js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.falKey) {
      return res.status(400).json({ error: 'FAL API key required' });
    }

    const {
      scenes,           // [{ videoUrl, durationSeconds }] — ordered scene clips
      musicUrl,         // Optional background music URL
      musicVolume,      // 0-1, default 0.15
      captionConfig,    // Optional caption config object or preset string
      storyboardName,   // For naming the output file
    } = req.body;

    if (!scenes?.length) {
      return res.status(400).json({ error: 'No scenes provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Build video track from scene clips
    let currentTimestamp = 0;
    const videoKeyframes = scenes.map((scene) => {
      const durationMs = (scene.durationSeconds || 5) * 1000;
      const kf = { url: scene.videoUrl, timestamp: currentTimestamp, duration: durationMs };
      currentTimestamp += durationMs;
      return kf;
    });

    const totalDurationMs = currentTimestamp;
    const totalDurationSec = totalDurationMs / 1000;

    console.log(`[Storyboard Assemble] ${scenes.length} scenes, ${totalDurationSec}s total`);

    // 2. Build tracks
    const tracks = [
      {
        id: 'video',
        type: 'video',
        keyframes: videoKeyframes,
      },
    ];

    // Optional music track
    if (musicUrl) {
      tracks.push({
        id: 'music',
        type: 'audio',
        keyframes: [{ url: musicUrl, timestamp: 0, duration: totalDurationMs }],
        volume: musicVolume ?? 0.15,
      });
    }

    // 3. Submit to FAL ffmpeg-api/compose
    const composeRes = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/compose', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${keys.falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks, duration: totalDurationSec }),
    });

    if (!composeRes.ok) {
      const errText = await composeRes.text();
      throw new Error(`FFmpeg compose failed (${composeRes.status}): ${errText}`);
    }

    const queueData = await composeRes.json();
    console.log(`[Storyboard Assemble] Queued: ${queueData.request_id}`);

    // 4. Poll for result
    const result = await pollFalQueue(
      queueData.response_url || queueData.request_id,
      'fal-ai/ffmpeg-api/compose',
      keys.falKey,
      120,
      3000
    );

    const assembledUrl = result?.video_url || result?.video?.url || result?.output_url;
    if (!assembledUrl) {
      throw new Error('FFmpeg compose returned no video URL');
    }

    console.log(`[Storyboard Assemble] Composed: ${assembledUrl}`);

    // 5. Upload to Supabase
    const publicUrl = await uploadUrlToSupabase(assembledUrl, supabase, 'pipeline/finals');
    console.log(`[Storyboard Assemble] Uploaded: ${publicUrl}`);

    // 6. Optional caption burning
    let captionedUrl = null;
    if (captionConfig) {
      try {
        const { burnCaptions } = await import('../lib/captionBurner.js');
        captionedUrl = await burnCaptions(publicUrl, captionConfig, keys.falKey, supabase);
        console.log(`[Storyboard Assemble] Captioned: ${captionedUrl}`);
      } catch (captionErr) {
        console.error('[Storyboard Assemble] Caption burning failed (non-fatal):', captionErr.message);
      }
    }

    res.json({
      success: true,
      assembledUrl: publicUrl,
      captionedUrl,
      totalDuration: totalDurationSec,
      sceneCount: scenes.length,
    });
  } catch (err) {
    console.error('[Storyboard Assemble] Error:', err);
    res.status(500).json({ error: err.message });
  }
}
