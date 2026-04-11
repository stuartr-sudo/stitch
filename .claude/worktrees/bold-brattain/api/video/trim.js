import { createClient } from '@supabase/supabase-js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let tmpInput = null;
  let tmpOutput = null;

  try {
    const { video_url, start_time, end_time } = req.body;

    if (!video_url) return res.status(400).json({ error: 'video_url required' });
    if (start_time == null || end_time == null) return res.status(400).json({ error: 'start_time and end_time required' });
    if (start_time < 0) return res.status(400).json({ error: 'start_time must be >= 0' });
    if (end_time <= start_time) return res.status(400).json({ error: 'end_time must be > start_time' });

    const duration = end_time - start_time;
    if (duration > 60) return res.status(400).json({ error: 'Maximum trim duration is 60 seconds' });

    // Download source video to temp file
    const videoRes = await fetch(video_url);
    if (!videoRes.ok) return res.status(400).json({ error: 'Failed to fetch source video' });
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const id = randomUUID();
    tmpInput = join(tmpdir(), `trim-in-${id}.mp4`);
    tmpOutput = join(tmpdir(), `trim-out-${id}.mp4`);
    await writeFile(tmpInput, videoBuffer);

    // Trim with FFmpeg: -ss (seek) -t (duration) -c copy (no re-encode, fast)
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss', String(start_time),
      '-i', tmpInput,
      '-t', String(duration),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      tmpOutput,
    ], { timeout: 30000 });

    // Upload trimmed video to Supabase (videos bucket, matching uploadUrlToSupabase pattern)
    const trimmedBuffer = await readFile(tmpOutput);
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const fileName = `trimmed/${req.user.id}/${Date.now()}-${id.slice(0, 8)}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, trimmedBuffer, { contentType: 'video/mp4', upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);

    return res.json({ trimmed_url: publicUrl, duration });
  } catch (error) {
    console.error('[VideoTrim] Error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    // Clean up temp files
    if (tmpInput) await unlink(tmpInput).catch(() => {});
    if (tmpOutput) await unlink(tmpOutput).catch(() => {});
  }
}
