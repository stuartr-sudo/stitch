/**
 * POST /api/agency
 *
 * Action-based handler for Agency Mode.
 * Body: { action, ...params }
 *
 * Actions:
 *   create-brief, list-briefs, get-brief, update-brief, delete-brief,
 *   generate, update-asset, delete-asset
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import OpenAI from 'openai';

const ASSET_TYPE_LABELS = {
  short: 'Short Video',
  carousel: 'Carousel Post',
  ad_set: 'Ad Campaign',
  longform: 'Longform Video',
  linkedin_post: 'LinkedIn Post',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const { action, ...params } = req.body;

  try {
    switch (action) {

      // ─── Create Brief ──────────────────────────────────────────────
      case 'create-brief': {
        const { client_name, brand_kit_id, industry, target_audience, product_description, deliverables, config } = params;
        if (!client_name?.trim()) return res.status(400).json({ error: 'client_name required' });

        const { data, error } = await supabase
          .from('agency_briefs')
          .insert({
            user_id: userId,
            client_name: client_name.trim(),
            brand_kit_id: brand_kit_id || null,
            industry: industry || null,
            target_audience: target_audience || null,
            product_description: product_description || null,
            deliverables: deliverables || [],
            config: config || {},
          })
          .select()
          .single();

        if (error) throw error;
        return res.json({ brief: data });
      }

      // ─── List Briefs ───────────────────────────────────────────────
      case 'list-briefs': {
        const { data, error } = await supabase
          .from('agency_briefs')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        return res.json({ briefs: data });
      }

      // ─── Get Brief + Assets ────────────────────────────────────────
      case 'get-brief': {
        const { brief_id } = params;
        if (!brief_id) return res.status(400).json({ error: 'brief_id required' });

        const [briefRes, assetsRes] = await Promise.all([
          supabase.from('agency_briefs').select('*').eq('id', brief_id).eq('user_id', userId).single(),
          supabase.from('agency_campaign_assets').select('*').eq('brief_id', brief_id).eq('user_id', userId).order('created_at'),
        ]);

        if (briefRes.error) throw briefRes.error;
        return res.json({ brief: briefRes.data, assets: assetsRes.data || [] });
      }

      // ─── Update Brief ─────────────────────────────────────────────
      case 'update-brief': {
        const { brief_id, ...fields } = params;
        if (!brief_id) return res.status(400).json({ error: 'brief_id required' });

        // Only allow safe fields
        const allowed = ['client_name', 'brand_kit_id', 'industry', 'target_audience', 'product_description', 'deliverables', 'config', 'status'];
        const updates = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
          if (key in fields) updates[key] = fields[key];
        }

        const { data, error } = await supabase
          .from('agency_briefs')
          .update(updates)
          .eq('id', brief_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return res.json({ brief: data });
      }

      // ─── Delete Brief ─────────────────────────────────────────────
      case 'delete-brief': {
        const { brief_id } = params;
        if (!brief_id) return res.status(400).json({ error: 'brief_id required' });

        const { error } = await supabase
          .from('agency_briefs')
          .delete()
          .eq('id', brief_id)
          .eq('user_id', userId);

        if (error) throw error;
        return res.json({ success: true });
      }

      // ─── Generate Campaign Assets ─────────────────────────────────
      case 'generate': {
        const { brief_id } = params;
        if (!brief_id) return res.status(400).json({ error: 'brief_id required' });

        // Fetch brief
        const { data: brief, error: briefErr } = await supabase
          .from('agency_briefs')
          .select('*')
          .eq('id', brief_id)
          .eq('user_id', userId)
          .single();

        if (briefErr) throw briefErr;
        if (!brief) return res.status(404).json({ error: 'Brief not found' });

        const deliverables = brief.deliverables || [];
        if (!deliverables.length) return res.status(400).json({ error: 'No deliverables selected' });

        // Set brief to generating
        await supabase
          .from('agency_briefs')
          .update({ status: 'generating', updated_at: new Date().toISOString() })
          .eq('id', brief_id);

        // Generate titles via GPT-4.1-mini
        const keys = await getUserKeys(userId, req.user.email);
        const openai = new OpenAI({ apiKey: keys.OPENAI_API_KEY });

        let titles = {};
        try {
          const titlePrompt = deliverables.map(d => `- ${ASSET_TYPE_LABELS[d] || d}`).join('\n');
          const completion = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: 'Generate short creative campaign asset titles. Return JSON object mapping asset_type to title string. Keep titles under 60 chars, incorporating the client/brand name naturally.',
              },
              {
                role: 'user',
                content: `Client: ${brief.client_name}\nIndustry: ${brief.industry || 'General'}\nProduct: ${brief.product_description || 'N/A'}\n\nGenerate a title for each deliverable:\n${titlePrompt}`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
          });

          titles = JSON.parse(completion.choices[0].message.content);
        } catch (e) {
          console.error('Title generation failed, using defaults:', e.message);
        }

        // Create asset records
        const assetRows = deliverables.map(type => ({
          brief_id,
          user_id: userId,
          asset_type: type,
          title: titles[type] || `${brief.client_name} — ${ASSET_TYPE_LABELS[type] || type}`,
          status: 'queued',
        }));

        const { data: assets, error: assetErr } = await supabase
          .from('agency_campaign_assets')
          .insert(assetRows)
          .select();

        if (assetErr) throw assetErr;

        // Update brief to review
        await supabase
          .from('agency_briefs')
          .update({ status: 'review', updated_at: new Date().toISOString() })
          .eq('id', brief_id);

        return res.json({ assets });
      }

      // ─── Update Asset ─────────────────────────────────────────────
      case 'update-asset': {
        const { asset_id, status, result_url, result_data } = params;
        if (!asset_id) return res.status(400).json({ error: 'asset_id required' });

        const updates = { updated_at: new Date().toISOString() };
        if (status !== undefined) updates.status = status;
        if (result_url !== undefined) updates.result_url = result_url;
        if (result_data !== undefined) updates.result_data = result_data;

        const { data, error } = await supabase
          .from('agency_campaign_assets')
          .update(updates)
          .eq('id', asset_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return res.json({ asset: data });
      }

      // ─── Delete Asset ─────────────────────────────────────────────
      case 'delete-asset': {
        const { asset_id } = params;
        if (!asset_id) return res.status(400).json({ error: 'asset_id required' });

        const { error } = await supabase
          .from('agency_campaign_assets')
          .delete()
          .eq('id', asset_id)
          .eq('user_id', userId);

        if (error) throw error;
        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[agency/${action}]`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
