/**
 * POST /api/article/autonomous
 *
 * End-to-end autonomous pipeline — accepts article URL(s) and auto-generates
 * + auto-schedules publication based on the brand's autonomous config.
 *
 * Body: {
 *   url?: string,
 *   urls?: string[],        // for bulk autonomous
 *   content?: string,
 *   brand_username: string,
 *   writing_structure?: string,
 * }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, urls, content, brand_username, writing_structure } = req.body;

  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Load autonomous config for this brand
  const { data: autoConfig } = await supabase
    .from('autonomous_configs')
    .select('*')
    .eq('brand_username', brand_username)
    .eq('is_active', true)
    .maybeSingle();

  if (!autoConfig) {
    return res.status(400).json({
      error: `No active autonomous config for brand "${brand_username}". Configure it in Settings.`,
    });
  }

  // Attach autonomous config to the request for the pipeline to use
  const enrichedBody = {
    ...req.body,
    _autonomous_config: autoConfig,
  };

  // If multiple URLs, delegate to bulk endpoint
  if (urls && Array.isArray(urls) && urls.length > 1) {
    const bulkHandler = await loadRoute('article/bulk.js');
    if (bulkHandler) {
      req.body = { ...enrichedBody, urls };
      return bulkHandler(req, res);
    }
  }

  // Single URL — delegate to from-url pipeline with autonomous config
  const pipelineHandler = await loadRoute('article/from-url.js');
  if (!pipelineHandler) {
    return res.status(500).json({ error: 'Pipeline handler not found' });
  }

  req.body = enrichedBody;
  return pipelineHandler(req, res);
}

async function loadRoute(routePath) {
  try {
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const module = await import(join(__dirname, '..', routePath));
    return module.default;
  } catch {
    return null;
  }
}
