/**
 * Try Style API - Virtual Try-On using FASHN AI
 * Endpoint: fal-ai/fashn/tryon/v1.6
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    console.error('[Try Style] Missing FAL_KEY');
    return res.status(500).json({ error: 'Missing FAL API key configuration' });
  }

  try {
    const { 
      model_image,
      garment_image,
      category = 'auto',
      mode = 'balanced',
      garment_photo_type = 'auto',
      num_samples = 1,
    } = req.body;

    if (!model_image) {
      return res.status(400).json({ error: 'Missing model_image (person photo)' });
    }
    if (!garment_image) {
      return res.status(400).json({ error: 'Missing garment_image' });
    }

    console.log('[Try Style] Processing virtual try-on');
    console.log('[Try Style] Category:', category, 'Mode:', mode, 'Samples:', num_samples);

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
      console.error('[Try Style] API Error:', response.status, errorText);
      
      // Check for specific error types
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
    console.log('[Try Style] Response received');

    // Extract image URLs
    if (data.images && Array.isArray(data.images)) {
      const imageUrls = data.images.map(img => img.url || img);
      return res.status(200).json({
        success: true,
        images: imageUrls,
        status: 'completed',
      });
    }

    // Check for async processing
    if (data.request_id || data.requestId) {
      return res.status(200).json({
        success: true,
        requestId: data.request_id || data.requestId,
        status: 'processing',
      });
    }

    console.error('[Try Style] Unexpected response format:', data);
    return res.status(500).json({ error: 'Unexpected response format from FASHN API' });

  } catch (error) {
    console.error('[Try Style] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
