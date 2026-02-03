/**
 * Imagineer - AI Image Generation API
 * Uses Wavespeed Google Nano Banana Pro
 */

// UGC/Social Media style prompt mappings for authentic look
const UGC_STYLE_PROMPTS = {
  'iphone-selfie': 'raw iPhone selfie photo, front-facing camera, smartphone quality, natural ambient lighting, authentic candid moment, realistic skin texture, unfiltered unedited look, genuine expression, slight motion blur, casual pose',
  'ugc-testimonial': 'user generated content photo, authentic testimonial shot, real person, genuine emotion, casual setting, believable and relatable, natural lighting, unposed candid moment',
  'tiktok-style': 'TikTok photo aesthetic, vertical format feel, trendy and engaging, bright natural lighting, relatable content creator vibe, casual but stylish, authentic social media',
  'instagram-candid': 'Instagram candid photo, casual but aesthetic, natural lighting, authentic moment, lifestyle photography, slightly edited but realistic, genuine expression',
  'facetime-screenshot': 'FaceTime screenshot aesthetic, video call quality, slightly pixelated, casual conversation pose, webcam lighting, authentic remote communication feel, casual home background',
  'mirror-selfie': 'mirror selfie photo, bathroom or bedroom mirror, smartphone visible in reflection, casual outfit check pose, natural home lighting, authentic daily moment',
  'car-selfie': 'car selfie photo, steering wheel or window visible, natural daylight through windows, casual seated pose, authentic commute moment, smartphone quality',
  'gym-selfie': 'gym selfie photo, fitness setting, workout attire, slight sweat, motivated expression, gym mirror or equipment visible, authentic fitness moment, energetic',
  'golden-hour-selfie': 'golden hour selfie, warm sunset lighting, soft orange and pink tones, glowing skin, romantic natural light, outdoor setting, dreamy but authentic',
  'casual-snapshot': 'casual snapshot photo, candid unposed moment, natural lighting, everyday setting, authentic slice of life, slightly imperfect framing, genuine moment captured',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    console.error('[Imagineer] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { prompt, style, dimensions = '16:9' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Imagineer] Generating image');
    console.log('[Imagineer] Style:', style);

    // Build enhanced prompt based on style
    let enhancedPrompt = prompt;
    
    // Check if it's a UGC style with special prompt
    if (style && UGC_STYLE_PROMPTS[style]) {
      // For UGC styles, combine user prompt with style-specific keywords
      enhancedPrompt = `${prompt}, ${UGC_STYLE_PROMPTS[style]}`;
      console.log('[Imagineer] Using UGC style prompt');
    } else if (style) {
      // For other styles, just append the style name
      enhancedPrompt = `${prompt}, ${style.replace(/-/g, ' ')} style`;
    }

    console.log('[Imagineer] Enhanced prompt:', enhancedPrompt.substring(0, 100) + '...');

    const response = await fetch('https://api.wavespeed.ai/api/v3/google/nano-banana-pro/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        aspect_ratio: dimensions,
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Imagineer] API Error:', errorText);
      return res.status(response.status).json({ 
        error: 'Wavespeed API error', 
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('[Imagineer] Response received');

    const imageUrl = data.outputs?.[0] || data.data?.outputs?.[0];
    
    if (imageUrl) {
      return res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        status: 'completed',
      });
    }

    // If async, return request ID
    const requestId = data.id || data.request_id || data.data?.id;
    if (requestId) {
      return res.status(200).json({
        success: true,
        requestId: requestId,
        status: data.status || 'processing',
      });
    }

    return res.status(500).json({ error: 'Unexpected API response format' });

  } catch (error) {
    console.error('[Imagineer] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
