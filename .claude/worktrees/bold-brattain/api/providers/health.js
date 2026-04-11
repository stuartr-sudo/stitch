/**
 * GET /api/providers/health
 *
 * Check health/status of all three AI provider keys (OpenAI, FAL.ai, Wavespeed).
 * Also returns estimated spend from cost_ledger for each provider.
 *
 * Response: { openai: { status, spend_usd }, fal: { status, spend_usd }, wavespeed: { status, spend_usd } }
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

const CATEGORY_TO_PROVIDER = {
  openai: 'openai',
  fal: 'fal',
  wavespeed: 'wavespeed',
  elevenlabs: 'fal', // ElevenLabs goes through FAL proxy
};

async function checkOpenAI(key) {
  if (!key) return { status: 'no_key', spend_usd: null, error: null };

  // Tier 1: Try organization costs endpoint
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const costsUrl = `https://api.openai.com/v1/organization/costs?start_time=${encodeURIComponent(startOfMonth + 'T00:00:00Z')}&bucket_width=1d&limit=31`;

  try {
    const costsRes = await fetch(costsUrl, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });

    if (costsRes.ok) {
      const costsData = await costsRes.json();
      let totalCents = 0;
      for (const bucket of costsData.data || []) {
        for (const result of bucket.results || []) {
          totalCents += result.amount?.value || 0;
        }
      }
      const spendUsd = totalCents / 100;
      return {
        status: spendUsd >= 80 ? 'low' : 'healthy',
        spend_usd: Math.round(spendUsd * 100) / 100,
        error: null,
      };
    }
  } catch { /* fall through */ }

  // Tier 2: Lightweight models check
  try {
    const modelsRes = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });

    if (modelsRes.ok) return { status: 'healthy', spend_usd: null, error: null };

    if (modelsRes.status === 429) {
      const body = await modelsRes.json().catch(() => ({}));
      const msg = body?.error?.message || '';
      if (msg.includes('quota') || msg.includes('exceeded')) {
        return { status: 'exhausted', spend_usd: null, error: 'Quota exceeded' };
      }
      return { status: 'healthy', spend_usd: null, error: null };
    }

    if (modelsRes.status === 401) {
      return { status: 'invalid', spend_usd: null, error: 'Invalid API key' };
    }

    return { status: 'unknown', spend_usd: null, error: `HTTP ${modelsRes.status}` };
  } catch (err) {
    return { status: 'unknown', spend_usd: null, error: err.message };
  }
}

async function checkFal(key) {
  if (!key) return { status: 'no_key', spend_usd: null, error: null };

  try {
    // Lightweight check — hit the queue status endpoint with a fake ID
    // A valid key returns 404 (not found), an invalid key returns 401
    const res = await fetch('https://queue.fal.run/fal-ai/flux/schnell/requests/__health_check__', {
      headers: { Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return { status: 'invalid', spend_usd: null, error: 'Invalid API key' };
    }

    if (res.status === 429) {
      return { status: 'exhausted', spend_usd: null, error: 'Rate limited' };
    }

    // 404 or 422 means key is valid, just no such request
    return { status: 'healthy', spend_usd: null, error: null };
  } catch (err) {
    return { status: 'unknown', spend_usd: null, error: err.message };
  }
}

async function checkWavespeed(key) {
  if (!key) return { status: 'no_key', spend_usd: null, error: null };

  try {
    // Lightweight check — hit predictions endpoint with empty body
    // Valid key returns 400/422 (bad request), invalid returns 401
    const res = await fetch('https://api.wavespeed.ai/api/v3/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return { status: 'invalid', spend_usd: null, error: 'Invalid API key' };
    }

    if (res.status === 429) {
      return { status: 'exhausted', spend_usd: null, error: 'Rate limited' };
    }

    // 400/422 means key is valid
    return { status: 'healthy', spend_usd: null, error: null };
  } catch (err) {
    return { status: 'unknown', spend_usd: null, error: err.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);

    // Check all 3 providers in parallel
    const [openai, fal, wavespeed] = await Promise.all([
      checkOpenAI(keys?.openaiKey),
      checkFal(keys?.falKey),
      checkWavespeed(keys?.wavespeedKey),
    ]);

    // Get spend from cost_ledger for current month
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: brands } = await supabase
      .from('brand_kit')
      .select('brand_username')
      .eq('user_id', req.user.id);

    const usernames = (brands || []).map(b => b.brand_username).filter(Boolean);

    const providerSpend = { openai: 0, fal: 0, wavespeed: 0 };
    const providerCalls = { openai: 0, fal: 0, wavespeed: 0 };

    if (usernames.length > 0) {
      const { data: entries } = await supabase
        .from('cost_ledger')
        .select('category, estimated_cost_usd')
        .in('username', usernames)
        .gte('created_at', startOfMonth);

      for (const e of entries || []) {
        const provider = CATEGORY_TO_PROVIDER[e.category] || e.category;
        if (provider in providerSpend) {
          providerSpend[provider] += e.estimated_cost_usd || 0;
          providerCalls[provider]++;
        }
      }
    }

    const round = (n) => Math.round(n * 100) / 100;

    // Merge ledger spend into health results
    // For OpenAI, prefer the real API spend if available
    if (openai.spend_usd == null && providerSpend.openai > 0) {
      openai.spend_usd = round(providerSpend.openai);
    }
    fal.spend_usd = round(providerSpend.fal);
    wavespeed.spend_usd = round(providerSpend.wavespeed);

    openai.calls = providerCalls.openai;
    fal.calls = providerCalls.fal;
    wavespeed.calls = providerCalls.wavespeed;

    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json({ openai, fal, wavespeed });
  } catch (err) {
    console.error('[providers/health] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
