/**
 * Media Generator V2 — explicit-key wrappers around pipeline image/video generation.
 *
 * These functions accept model keys directly rather than relying on implicit routing,
 * making them easier to test and reason about in the shorts pipeline.
 */

import { generateImage, animateImage } from './pipelineHelpers.js';

/**
 * Generate an image with explicit model key passing.
 *
 * @param {string} prompt - Image generation prompt
 * @param {string} aspectRatio - e.g. '9:16', '16:9', '1:1'
 * @param {object} keys - { falKey, wavespeedKey, openaiKey }
 * @param {object} supabase - Supabase client for upload
 * @param {string} [model] - Image model override (e.g. 'fal_flux', 'fal_flux_pro')
 * @param {Array} [loraConfigs] - LoRA configurations
 * @returns {Promise<string>} Supabase storage URL of generated image
 */
export async function generateImageV2(prompt, aspectRatio, keys, supabase, model, loraConfigs = []) {
  return generateImage(prompt, aspectRatio, keys, supabase, model, loraConfigs);
}

/**
 * Animate an image into a video clip with explicit model key passing.
 *
 * @param {string} imageUrl - Source image URL
 * @param {string} motionPrompt - Motion/animation prompt
 * @param {string} aspectRatio - e.g. '9:16', '16:9'
 * @param {number} durationSeconds - Clip duration in seconds
 * @param {object} keys - { falKey, wavespeedKey }
 * @param {object} supabase - Supabase client for upload
 * @param {string} [model] - Video model (e.g. 'fal_kling', 'fal_kling_v3')
 * @param {Array} [loraConfigs] - LoRA configurations
 * @returns {Promise<string>} Supabase storage URL of generated video clip
 */
export async function animateImageV2(imageUrl, motionPrompt, aspectRatio, durationSeconds = 5, keys, supabase, model, loraConfigs = []) {
  return animateImage(imageUrl, motionPrompt, aspectRatio, durationSeconds, keys, supabase, model, loraConfigs);
}
