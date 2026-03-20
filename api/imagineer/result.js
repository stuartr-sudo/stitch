/**
 * Imagineer - Check Image Generation Result
 * Polls fal.ai queue for async image results.
 *
 * Accepts: { requestId, model, statusUrl?, responseUrl? }
 * Returns: { status: 'processing'|'completed'|'failed', imageUrl?, queuePosition? }
 */

import { getUserKeys } from '../lib/getUserKeys.js';

// Map model poll IDs → fal.ai queue endpoints
const ENDPOINT_MAP = {
  'nano-banana-2':         'fal-ai/nano-banana-2',
  'nano-banana-2-edit':    'fal-ai/nano-banana-2/edit',
  'nano-banana-pro-edit':  'fal-ai/nano-banana-pro/edit',
  'seedream-edit':         'fal-ai/bytedance/seedream/v4.5/edit',
  'fal-flux':              'fal-ai/flux-2/lora',
  'fal-flux-edit':         'fal-ai/flux-2/lora/edit',
  'seedream':              'fal-ai/bytedance/seedream/v4/text-to-image',
  'seedream-generate':     'fal-ai/bytedance/seedream/v4/text-to-image',
  // Inpaint
  'inpaint':               'fal-ai/flux-kontext-lora/inpaint',
  // Legacy aliases
  'nano-banana-pro':       'fal-ai/nano-banana-pro/edit',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, model = 'nano-banana-2', statusUrl, responseUrl } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    console.log('[Imagineer/Result] Checking:', requestId, '| Model:', model);

    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

    const endpoint = ENDPOINT_MAP[model] || 'fal-ai/nano-banana-2';
    const headers = { 'Authorization': `Key ${FAL_KEY}` };

    // Build URLs — prefer client-provided URLs (from queue submission), fall back to constructed
    const checkUrl = statusUrl
      ? `${statusUrl}?logs=1`
      : `https://queue.fal.run/${endpoint}/requests/${requestId}/status?logs=1`;
    const resultFetchUrl = responseUrl
      || `https://queue.fal.run/${endpoint}/requests/${requestId}`;

    console.log('[Imagineer/Result] Polling:', checkUrl);

    // ── Check status ──────────────────────────────────────────────────────
    const statusResponse = await fetch(checkUrl, { headers });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.warn(`[Imagineer/Result] Status error ${statusResponse.status}: ${errorText.substring(0, 200)}`);
      // Don't proxy upstream errors — tell client to keep polling
      return res.json({
        success: true,
        status: 'processing',
        requestId,
        imageUrl: null,
        _upstreamError: `fal.ai returned ${statusResponse.status}`,
      });
    }

    const statusData = await statusResponse.json();
    console.log('[Imagineer/Result] Queue status:', statusData.status);

    // ── COMPLETED → fetch result ──────────────────────────────────────────
    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(resultFetchUrl, { headers });

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        console.error(`[Imagineer/Result] Result fetch error ${resultResponse.status}: ${errorText.substring(0, 200)}`);
        return res.json({
          success: true,
          status: 'processing',
          requestId,
          imageUrl: null,
          _upstreamError: `fal.ai result returned ${resultResponse.status}`,
        });
      }

      const resultData = await resultResponse.json();
      const imageUrl = resultData.images?.[0]?.url || null;
      console.log('[Imagineer/Result] Completed, image URL:', imageUrl ? 'found' : 'none');

      return res.json({
        success: true,
        status: 'completed',
        requestId,
        imageUrl,
      });
    }

    // ── FAILED ────────────────────────────────────────────────────────────
    if (statusData.status === 'FAILED') {
      console.error('[Imagineer/Result] Job FAILED:', JSON.stringify(statusData).substring(0, 300));
      return res.json({
        success: true,
        status: 'failed',
        requestId,
        imageUrl: null,
        error: statusData.error || 'Image generation failed on fal.ai',
      });
    }

    // ── IN_QUEUE / IN_PROGRESS ────────────────────────────────────────────
    return res.json({
      success: true,
      status: 'processing',
      requestId,
      imageUrl: null,
      queuePosition: statusData.queue_position ?? null,
    });

  } catch (error) {
    console.error('[Imagineer/Result] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
