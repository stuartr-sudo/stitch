import { getUserKeys } from '../lib/getUserKeys.js';
import { generateMotionTransfer } from '../lib/motionTransferRegistry.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { falKey } = await getUserKeys(req.user.id, req.user.email);
    if (!falKey) return res.status(400).json({ error: 'FAL API key not configured.' });

    const {
      model = 'wan_motion',
      image, image_url,
      video, video_url,
      character_orientation, prompt, negative_prompt,
      keep_original_sound, elements,
    } = req.body;

    // Map legacy field names (existing frontend sends image/video)
    const resolvedImage = image_url || image;
    const resolvedVideo = video_url || video;

    if (!resolvedImage || !resolvedVideo) {
      return res.status(400).json({ error: 'Both image and video are required' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const result = await generateMotionTransfer(model, resolvedImage, resolvedVideo, {
      character_orientation, prompt, negative_prompt,
      keep_original_sound, elements,
    }, falKey, supabase);

    return res.json({ status: 'completed', outputUrl: result.videoUrl });
  } catch (error) {
    console.error('[MotionTransfer] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
