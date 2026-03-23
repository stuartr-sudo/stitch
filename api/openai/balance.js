/**
 * GET /api/openai/balance
 *
 * Check the health/status of the user's OpenAI API key.
 * Two-tier approach:
 *   1. Try /v1/organization/costs for actual spend data (requires admin key)
 *   2. Fall back to /v1/models for simple alive/dead check
 *
 * Response: { status, spend_usd, period, error }
 *   status: 'healthy' | 'low' | 'exhausted' | 'invalid' | 'no_key' | 'unknown'
 */

import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const openaiKey = keys?.openaiKey;

    if (!openaiKey) {
      return res.json({ status: 'no_key', spend_usd: null, period: null, error: null });
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'private, max-age=300');

    // Tier 1: Try organization costs endpoint (works with admin keys)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const costsUrl = `https://api.openai.com/v1/organization/costs?start_time=${encodeURIComponent(startOfMonth + 'T00:00:00Z')}&bucket_width=1d&limit=31`;

    try {
      const costsRes = await fetch(costsUrl, {
        headers: { Authorization: `Bearer ${openaiKey}` },
        signal: AbortSignal.timeout(8000),
      });

      if (costsRes.ok) {
        const costsData = await costsRes.json();
        const buckets = costsData.data || [];
        // Sum all result amounts across buckets
        let totalCents = 0;
        for (const bucket of buckets) {
          for (const result of bucket.results || []) {
            totalCents += result.amount?.value || 0;
          }
        }
        const spendUsd = totalCents / 100;
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Threshold: warn at $80+ (configurable)
        const status = spendUsd >= 80 ? 'low' : 'healthy';
        return res.json({ status, spend_usd: Math.round(spendUsd * 100) / 100, period, error: null });
      }

      // 403/401 = not an admin key, fall through to tier 2
      if (costsRes.status !== 403 && costsRes.status !== 401) {
        // Some other error from costs endpoint — still try tier 2
      }
    } catch {
      // Timeout or network error on costs — fall through to tier 2
    }

    // Tier 2: Lightweight /v1/models check (works with any valid key)
    try {
      const modelsRes = await fetch('https://api.openai.com/v1/models?limit=1', {
        headers: { Authorization: `Bearer ${openaiKey}` },
        signal: AbortSignal.timeout(8000),
      });

      if (modelsRes.ok) {
        return res.json({ status: 'healthy', spend_usd: null, period: null, error: null });
      }

      if (modelsRes.status === 429) {
        const body = await modelsRes.json().catch(() => ({}));
        const msg = body?.error?.message || '';
        if (msg.includes('quota') || msg.includes('exceeded')) {
          return res.json({ status: 'exhausted', spend_usd: null, period: null, error: 'OpenAI quota exceeded' });
        }
        // Rate limited but not exhausted — key is alive
        return res.json({ status: 'healthy', spend_usd: null, period: null, error: null });
      }

      if (modelsRes.status === 401) {
        return res.json({ status: 'invalid', spend_usd: null, period: null, error: 'Invalid API key' });
      }

      return res.json({ status: 'unknown', spend_usd: null, period: null, error: `HTTP ${modelsRes.status}` });
    } catch (err) {
      return res.json({ status: 'unknown', spend_usd: null, period: null, error: err.message });
    }
  } catch (err) {
    console.error('[openai/balance] Error:', err);
    return res.status(500).json({ status: 'unknown', spend_usd: null, period: null, error: err.message });
  }
}
