/**
 * Client Briefs API — catch-all handler
 *
 * GET    /api/briefs                       — list user's briefs
 * POST   /api/briefs                       — create brief
 * GET    /api/briefs/:id                   — get brief + outputs
 * PUT    /api/briefs/:id                   — update brief
 * DELETE /api/briefs/:id                   — delete brief
 * POST   /api/briefs/:id/submit            — submit + trigger AI plan
 * POST   /api/briefs/:id/generate-plan     — (re)generate AI recommendation
 * POST   /api/briefs/:id/execute           — execute plan → spawn tools
 * GET    /api/briefs/:id/outputs           — list spawned content
 */

import { createClient } from '@supabase/supabase-js';
import { generateRecommendation } from './recommend.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const ALLOWED_FIELDS = [
  'title', 'client_name', 'status', 'brand_kit_id',
  'goal', 'goal_description',
  'audience_demographics', 'audience_psychographics', 'audience_pain_points',
  'tone', 'tone_notes',
  'budget_range', 'budget_notes',
  'deadline', 'timeline_notes', 'urgency',
  'platforms', 'existing_assets', 'competitors', 'kpis', 'deliverables',
  'recommended_plan', 'additional_notes'
];

export default async function handler(req, res) {
  const supabase = getSupabase();
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const url = new URL(req.url || req.originalUrl, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/briefs', '').split('/').filter(Boolean);
  const method = req.method;

  try {
    // GET /api/briefs — list
    if (pathParts.length === 0 && method === 'GET') {
      const { data, error } = await supabase
        .from('client_briefs')
        .select('id, title, client_name, status, goal, platforms, deliverables, brand_kit_id, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ briefs: data });
    }

    // POST /api/briefs — create
    if (pathParts.length === 0 && method === 'POST') {
      const body = req.body || {};
      const insert = { user_id: userId, title: body.title || 'Untitled Brief' };
      for (const key of ALLOWED_FIELDS) {
        if (body[key] !== undefined) insert[key] = body[key];
      }
      const { data, error } = await supabase
        .from('client_briefs')
        .insert(insert)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ brief: data });
    }

    const briefId = pathParts[0];
    const action = pathParts[1];

    // GET /api/briefs/:id — get with outputs
    if (briefId && !action && method === 'GET') {
      const { data: brief, error } = await supabase
        .from('client_briefs')
        .select('*')
        .eq('id', briefId)
        .eq('user_id', userId)
        .single();
      if (error || !brief) return res.status(404).json({ error: 'Brief not found' });

      const { data: outputs } = await supabase
        .from('client_brief_outputs')
        .select('*')
        .eq('brief_id', briefId)
        .order('created_at', { ascending: false });

      return res.json({ brief, outputs: outputs || [] });
    }

    // PUT /api/briefs/:id — update
    if (briefId && !action && method === 'PUT') {
      const body = req.body || {};
      const update = {};
      for (const key of ALLOWED_FIELDS) {
        if (body[key] !== undefined) update[key] = body[key];
      }
      const { data, error } = await supabase
        .from('client_briefs')
        .update(update)
        .eq('id', briefId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ brief: data });
    }

    // DELETE /api/briefs/:id
    if (briefId && !action && method === 'DELETE') {
      const { error } = await supabase
        .from('client_briefs')
        .delete()
        .eq('id', briefId)
        .eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    // POST /api/briefs/:id/submit — submit + generate plan
    if (briefId && action === 'submit' && method === 'POST') {
      const { data: brief, error: fetchErr } = await supabase
        .from('client_briefs')
        .select('*')
        .eq('id', briefId)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !brief) return res.status(404).json({ error: 'Brief not found' });

      // Generate AI recommendation
      const plan = await generateRecommendation(brief, userId, userEmail);

      const { data, error } = await supabase
        .from('client_briefs')
        .update({ status: 'submitted', recommended_plan: plan })
        .eq('id', briefId)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ brief: data });
    }

    // POST /api/briefs/:id/generate-plan — regenerate plan
    if (briefId && action === 'generate-plan' && method === 'POST') {
      const { data: brief, error: fetchErr } = await supabase
        .from('client_briefs')
        .select('*')
        .eq('id', briefId)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !brief) return res.status(404).json({ error: 'Brief not found' });

      const plan = await generateRecommendation(brief, userId, userEmail);

      const { data, error } = await supabase
        .from('client_briefs')
        .update({ recommended_plan: plan })
        .eq('id', briefId)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ brief: data });
    }

    // POST /api/briefs/:id/execute — execute the recommended plan
    if (briefId && action === 'execute' && method === 'POST') {
      const { data: brief, error: fetchErr } = await supabase
        .from('client_briefs')
        .select('*')
        .eq('id', briefId)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !brief) return res.status(404).json({ error: 'Brief not found' });
      if (!brief.recommended_plan?.phases?.length) {
        return res.status(400).json({ error: 'No plan to execute. Submit the brief first.' });
      }

      // Update status
      await supabase
        .from('client_briefs')
        .update({ status: 'in_progress' })
        .eq('id', briefId);

      const results = [];
      for (const phase of brief.recommended_plan.phases) {
        let output = null;

        // Route to the correct tool based on phase.tool
        if (phase.tool === 'command_center') {
          // Multi-piece: create a Command Center campaign
          const { data: campaign } = await supabase
            .from('command_center_campaigns')
            .insert({
              user_id: userId,
              name: brief.title,
              description: brief.goal_description || '',
              braindump_text: brief.additional_notes || '',
              plan_json: { items: phase.config?.items || [] },
              status: 'planning'
            })
            .select()
            .single();
          if (campaign) {
            output = { output_type: 'command_center_campaign', output_id: campaign.id };
          }
        } else {
          // Single-tool: return redirect URL
          const toolRoutes = {
            short: '/shorts/workbench',
            carousel: '/carousels',
            linkedin_post: '/linkedin',
            ad_set: '/ads',
            storyboard: '/storyboards',
            longform: '/longform/workbench',
            image_set: '/studio',
          };
          output = {
            output_type: phase.tool,
            output_id: briefId, // placeholder — tool page will load from brief
            redirect_url: toolRoutes[phase.tool] || '/studio'
          };
        }

        if (output) {
          await supabase.from('client_brief_outputs').insert({
            brief_id: briefId,
            user_id: userId,
            ...output
          });
          results.push(output);
        }
      }

      return res.json({ success: true, results });
    }

    // GET /api/briefs/:id/outputs
    if (briefId && action === 'outputs' && method === 'GET') {
      const { data, error } = await supabase
        .from('client_brief_outputs')
        .select('*')
        .eq('brief_id', briefId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ outputs: data });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[Briefs API]', err);
    return res.status(500).json({ error: err.message });
  }
}
