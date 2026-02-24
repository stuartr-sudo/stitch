/**
 * Shared cost logging helper for Stitch.
 *
 * Usage:
 *   import { logCost } from '../lib/costLogger.js';
 *   await logCost({ username, category: 'fal', operation: 'image_generation', model: 'flux-pro', metadata: { image_count: 1 } });
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRICING = {
  'gpt-4.1':          { input: 2.00, output: 8.00 },
  'gpt-4.1-mini':     { input: 0.40, output: 1.60 },
  'gpt-5-mini':       { input: 0.40, output: 1.60 },
  'gpt-4o':           { input: 2.50, output: 10.00 },
  'gpt-4o-mini':      { input: 0.15, output: 0.60 },
  'flux-pro':         { input: 0, output: 0, per_image: 0.05 },
  'flux-general':     { input: 0, output: 0, per_image: 0.06 },
  'kling-v2':         { input: 0, output: 0, per_video: 0.10 },
  'minimax-video':    { input: 0, output: 0, per_video: 0.08 },
  'wavespeed':        { input: 0, output: 0, per_image: 0.02 },
  'minimax-music':    { input: 0, output: 0, per_track: 0.05 },
};

export async function logCost({
  username,
  category,
  operation,
  model,
  input_tokens = 0,
  output_tokens = 0,
  metadata = {},
}) {
  if (!username || !category || !operation) return;

  let estimated_cost_usd = 0;
  const pricing = model ? PRICING[model] : null;

  if (pricing) {
    estimated_cost_usd += (input_tokens / 1_000_000) * (pricing.input || 0);
    estimated_cost_usd += (output_tokens / 1_000_000) * (pricing.output || 0);
    if (pricing.per_image && metadata.image_count) {
      estimated_cost_usd += pricing.per_image * metadata.image_count;
    }
    if (pricing.per_video && metadata.video_count) {
      estimated_cost_usd += pricing.per_video * metadata.video_count;
    }
    if (pricing.per_track && metadata.track_count) {
      estimated_cost_usd += pricing.per_track * metadata.track_count;
    }
  }

  try {
    await supabase.from('cost_ledger').insert({
      username,
      app: 'stitch',
      category,
      operation,
      model: model || null,
      input_tokens: input_tokens || 0,
      output_tokens: output_tokens || 0,
      estimated_cost_usd: Math.round(estimated_cost_usd * 1_000_000) / 1_000_000,
      metadata,
    });
  } catch (err) {
    console.warn('[cost-logger] Failed to log cost:', err.message);
  }
}
