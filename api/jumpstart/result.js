/**
 * JumpStart - Check Video Generation Result
 * Polls Wavespeed API to check if video generation is complete
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  
  if (!WAVESPEED_API_KEY) {
    console.error('[JumpStart] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    const pollResponse = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      {
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        },
      }
    );

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error('[JumpStart] Poll error:', errorText);
      return res.status(pollResponse.status).json({ 
        error: 'Failed to check status',
        details: errorText 
      });
    }

    const pollDataRaw = await pollResponse.json();
    const data = pollDataRaw?.data ?? pollDataRaw?.result?.data ?? pollDataRaw;
    const statusRaw = data?.status ?? pollDataRaw?.status ?? null;
    const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : statusRaw;

    const outputs = data?.outputs ?? pollDataRaw?.outputs ?? [];
    let videoUrl = null;
    if (status === 'completed') {
      const first = Array.isArray(outputs) ? outputs[0] : null;
      videoUrl = typeof first === 'string' ? first : (first?.url ?? null);
    }

    console.log('[JumpStart] Status check:', status);

    return res.status(200).json({
      success: true,
      status,
      requestId,
      videoUrl,
      error: data?.error || pollDataRaw?.error || null,
    });

  } catch (error) {
    console.error('[JumpStart] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
