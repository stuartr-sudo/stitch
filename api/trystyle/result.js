/**
 * Try Style Result API - Check async job status
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'Missing FAL API key' });
  }

  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    // Check status using FAL's status endpoint
    const response = await fetch(`https://fal.run/fal-ai/fashn/tryon/v1.6/status/${requestId}`, {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Try Style] Status check error:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to check status',
        details: errorText 
      });
    }

    const data = await response.json();

    if (data.status === 'COMPLETED' && data.images) {
      const imageUrls = data.images.map(img => img.url || img);
      return res.status(200).json({
        success: true,
        status: 'completed',
        images: imageUrls,
      });
    }

    if (data.status === 'FAILED') {
      return res.status(200).json({
        success: false,
        status: 'failed',
        error: data.error || 'Generation failed',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'processing',
      requestId,
    });

  } catch (error) {
    console.error('[Try Style] Result check error:', error);
    return res.status(500).json({ error: error.message });
  }
}
