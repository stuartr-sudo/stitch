import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Try Style API - Virtual Try-On
 * 
 * Supports:
 * - FASHN AI (fal-ai/fashn/tryon/v1.6)
 * - Flux 2 Lora Gallery (fal-ai/flux-2-lora-gallery/virtual-tryon)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  try {
    const { 
      model: tryonModel = 'fashn',
      model_image,
      garment_image,
      // FASHN specific
      category = 'auto',
      mode = 'balanced',
      garment_photo_type = 'auto',
      num_samples = 1,
      // Flux 2 Lora specific
      prompt = 'A person wearing a stylish outfit, virtual try-on',
      guidance_scale = 2.5,
      lora_scale = 1.0,
      num_inference_steps = 40,
      num_images = 1,
    } = req.body;

    if (!model_image) {
      return res.status(400).json({ error: 'Missing model_image (person photo)' });
    }
    if (!garment_image) {
      return res.status(400).json({ error: 'Missing garment_image' });
    }

    console.log('[Try Style] Model:', tryonModel);
    console.log('[Try Style] Processing virtual try-on');

    // Route to appropriate handler
    if (tryonModel === 'flux2-lora') {
      return await handleFlux2Lora(req, res, {
        FAL_KEY,
        model_image,
        garment_image,
        prompt,
        guidance_scale,
        lora_scale,
        num_inference_steps,
        num_images,
      });
    } else {
      return await handleFashn(req, res, {
        FAL_KEY,
        model_image,
        garment_image,
        category,
        mode,
        garment_photo_type,
        num_samples,
      });
    }

  } catch (error) {
    console.error('[Try Style] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle FASHN Virtual Try-On
 */
async function handleFashn(req, res, params) {
  const { FAL_KEY, model_image, garment_image, category, mode, garment_photo_type, num_samples } = params;

  console.log('[Try Style/FASHN] Category:', category, 'Mode:', mode, 'Samples:', num_samples);

  const response = await fetch('https://fal.run/fal-ai/fashn/tryon/v1.6', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_image,
      garment_image,
      category,
      mode,
      garment_photo_type,
      moderation_level: 'permissive',
      num_samples: Math.min(Math.max(num_samples, 1), 4),
      segmentation_free: true,
      output_format: 'png',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Try Style/FASHN] API Error:', response.status, errorText);
    
    if (response.status === 422) {
      return res.status(422).json({ 
        error: 'Invalid image or parameters. Please ensure both images are valid and the person is clearly visible.',
        details: errorText 
      });
    }
    
    return res.status(response.status).json({ 
      error: 'FASHN API error', 
      details: errorText 
    });
  }

  const data = await response.json();
  console.log('[Try Style/FASHN] Response received');

  // Extract image URLs
  if (data.images && Array.isArray(data.images)) {
    const imageUrls = data.images.map(img => img.url || img);
    return res.status(200).json({
      success: true,
      images: imageUrls,
      model: 'fashn',
      status: 'completed',
    });
  }

  // Check for async processing
  if (data.request_id || data.requestId) {
    return res.status(200).json({
      success: true,
      requestId: data.request_id || data.requestId,
      model: 'fashn',
      status: 'processing',
    });
  }

  console.error('[Try Style/FASHN] Unexpected response format:', data);
  return res.status(500).json({ error: 'Unexpected response format from FASHN API' });
}

/**
 * Handle Flux 2 Lora Gallery Virtual Try-On
 */
async function handleFlux2Lora(req, res, params) {
  const { 
    FAL_KEY, 
    model_image, 
    garment_image, 
    prompt, 
    guidance_scale, 
    lora_scale, 
    num_inference_steps, 
    num_images 
  } = params;

  console.log('[Try Style/Flux2] Prompt:', prompt.substring(0, 50) + '...');
  console.log('[Try Style/Flux2] Settings:', { guidance_scale, lora_scale, num_inference_steps, num_images });

  // Flux 2 Lora Gallery uses image_urls array [person, garment]
  const requestBody = {
    image_urls: [model_image, garment_image],
    prompt: prompt,
    guidance_scale: guidance_scale,
    num_inference_steps: num_inference_steps,
    lora_scale: lora_scale,
    num_images: Math.min(Math.max(num_images, 1), 4),
    acceleration: 'regular',
    enable_safety_checker: true,
    output_format: 'png',
  };

  const response = await fetch('https://fal.run/fal-ai/flux-2-lora-gallery/virtual-tryon', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Try Style/Flux2] API Error:', response.status, errorText);
    return res.status(response.status).json({ 
      error: 'Flux 2 API error: ' + errorText.substring(0, 200),
      details: errorText 
    });
  }

  const data = await response.json();
  console.log('[Try Style/Flux2] Response received');

  // Extract image URLs
  if (data.images && Array.isArray(data.images)) {
    const imageUrls = data.images.map(img => img.url || img);
    return res.status(200).json({
      success: true,
      images: imageUrls,
      model: 'flux2-lora',
      seed: data.seed,
      status: 'completed',
    });
  }

  // Check for async processing
  if (data.request_id || data.requestId) {
    return res.status(200).json({
      success: true,
      requestId: data.request_id || data.requestId,
      model: 'flux2-lora',
      status: 'processing',
    });
  }

  console.error('[Try Style/Flux2] Unexpected response format:', data);
  return res.status(500).json({ error: 'Unexpected response format from Flux 2 API' });
}
