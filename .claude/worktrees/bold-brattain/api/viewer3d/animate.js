/**
 * 3D Product Animation — Generate transition videos between angle captures
 * Animates between consecutive angle images to create turntable/cinematic product videos
 */
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';
import { animateImageV2 } from '../lib/mediaGenerator.js';
import { concatVideos, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

const MOTION_PROMPTS = {
  turntable_360: 'Smooth continuous rotation of product on turntable, consistent studio lighting, clean white background, steady motion, professional product photography',
  hero_reveal: 'Dramatic slow reveal, camera pulls back to show full product, cinematic lighting with volumetric rays, elegant presentation, premium product showcase',
  explode_view: 'Parts gently separate and float apart revealing internal structure and components, then smoothly reassemble, technical visualization, clean background',
  cinematic_orbit: 'Camera smoothly orbits around product with changing perspective angle, volumetric lighting, dramatic shadows, cinematic depth of field, premium showcase',
};

const VALID_STYLES = Object.keys(MOTION_PROMPTS);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  const {
    angle_images,
    animation_style = 'turntable_360',
    video_model = 'fal_kling',
    duration_per_transition = 5,
  } = req.body;

  // Validate inputs
  if (!angle_images || !Array.isArray(angle_images) || angle_images.length < 2) {
    return res.status(400).json({ error: 'At least 2 angle images are required.' });
  }

  if (!VALID_STYLES.includes(animation_style)) {
    return res.status(400).json({ error: `Invalid animation_style. Must be one of: ${VALID_STYLES.join(', ')}` });
  }

  const duration = Math.max(3, Math.min(8, duration_per_transition));
  const motionPrompt = MOTION_PROMPTS[animation_style];

  // Create Supabase client for uploads
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const keys = await getUserKeys(req.user.id, req.user.email);

  try {
    // Build transition pairs
    const pairs = [];
    for (let i = 0; i < angle_images.length - 1; i++) {
      pairs.push({ from: angle_images[i], to: angle_images[i + 1], index: i });
    }

    // For turntable_360, add last→first to create seamless loop
    if (animation_style === 'turntable_360' && angle_images.length > 2) {
      pairs.push({
        from: angle_images[angle_images.length - 1],
        to: angle_images[0],
        index: angle_images.length - 1,
      });
    }

    const totalTransitions = pairs.length;
    console.log(`[3DAnimate] Starting ${totalTransitions} transitions, style=${animation_style}, model=${video_model}, duration=${duration}s each`);

    // Generate transitions sequentially to avoid rate limits
    const clips = [];
    for (const pair of pairs) {
      const transitionNum = pair.index + 1;
      console.log(`[3DAnimate] Generating transition ${transitionNum}/${totalTransitions}`);

      try {
        const clipUrl = await animateImageV2(
          video_model,
          pair.from,
          motionPrompt,
          'square',     // product shots are typically square
          duration,
          keys,
          supabase,
          { generate_audio: false }
        );

        if (!clipUrl) {
          throw new Error(`Transition ${transitionNum} returned no URL`);
        }

        clips.push({ index: pair.index, url: clipUrl });
        console.log(`[3DAnimate] Transition ${transitionNum}/${totalTransitions} complete`);
      } catch (err) {
        console.error(`[3DAnimate] Transition ${transitionNum} failed:`, err.message);
        return res.status(500).json({
          error: `Transition ${transitionNum}/${totalTransitions} failed: ${err.message}`,
          completed_clips: clips,
        });
      }
    }

    // Assemble all clips into final video
    console.log(`[3DAnimate] Assembling ${clips.length} clips into final video`);
    const clipUrls = clips.map(c => c.url);

    let finalVideoUrl;
    if (clipUrls.length === 1) {
      finalVideoUrl = clipUrls[0];
    } else {
      finalVideoUrl = await concatVideos(clipUrls, null, FAL_KEY, supabase);
    }

    if (!finalVideoUrl) {
      return res.status(500).json({ error: 'Failed to assemble final video' });
    }

    // Ensure final video is in Supabase (concatVideos should handle this, but be safe)
    if (!finalVideoUrl.includes('supabase')) {
      finalVideoUrl = await uploadUrlToSupabase(finalVideoUrl, supabase, 'media/3d-animations');
    }

    console.log(`[3DAnimate] Complete: ${finalVideoUrl}`);

    logCost(req.user.email, 'fal', `3d-animate-${video_model}`, clips.length * 0.10, {
      style: animation_style,
      transitions: clips.length,
      model: video_model,
    });

    return res.status(200).json({
      success: true,
      video_url: finalVideoUrl,
      clips: clips.map(c => ({ index: c.index, url: c.url })),
      animation_style,
      transitions: clips.length,
    });

  } catch (error) {
    console.error('[3DAnimate] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
