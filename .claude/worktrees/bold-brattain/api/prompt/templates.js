/**
 * Prompt Templates CRUD + Apply API
 *
 * GET    /api/prompt/templates          — List user's templates + public templates
 * POST   /api/prompt/templates          — Create or Apply template
 *   body.action = 'create' → insert new template
 *   body.action = 'apply'  → resolve {{variables}} and return assembled prompt sections
 * PUT    /api/prompt/templates/:id      — Update template
 * DELETE /api/prompt/templates/:id      — Delete template
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Resolve {{variable}} placeholders in a string using a variables map.
 */
function resolveVariables(text, variables = {}) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Resolve all variables in all sections of a template.
 */
function resolveTemplate(template, variables = {}) {
  const sections = template.sections || {};
  const resolved = {};
  for (const [key, value] of Object.entries(sections)) {
    resolved[key] = resolveVariables(value, variables);
  }
  return resolved;
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/prompt/templates', '').split('/').filter(Boolean);
  const templateId = pathParts[0] || null;

  // GET /api/prompt/templates — list user's templates + public templates
  if (req.method === 'GET') {
    const { data: ownTemplates, error: ownErr } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownErr) return res.status(500).json({ error: ownErr.message });

    const { data: publicTemplates, error: pubErr } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_public', true)
      .neq('user_id', userId)
      .order('created_at', { ascending: false });

    if (pubErr) return res.status(500).json({ error: pubErr.message });

    return res.json({
      templates: ownTemplates || [],
      publicTemplates: publicTemplates || [],
    });
  }

  // POST /api/prompt/templates — create or apply
  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'create') {
      const { name, category, model_family, template, is_public } = req.body;
      if (!name || !template) {
        return res.status(400).json({ error: 'name and template are required' });
      }
      if (!template.sections || typeof template.sections !== 'object') {
        return res.status(400).json({ error: 'template must have a sections object' });
      }

      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          user_id: userId,
          name,
          category: category || 'custom',
          model_family: model_family || 'all',
          template,
          is_public: is_public || false,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, template: data });
    }

    if (action === 'apply') {
      const { template, variables } = req.body;
      if (!template || !template.sections) {
        return res.status(400).json({ error: 'template with sections is required' });
      }

      const resolved = resolveTemplate(template, variables || {});
      return res.json({ success: true, sections: resolved });
    }

    return res.status(400).json({ error: 'Invalid action. Use "create" or "apply".' });
  }

  // PUT /api/prompt/templates/:id — update template
  if (req.method === 'PUT' && templateId) {
    const { name, category, model_family, template, is_public } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (model_family !== undefined) updates.model_family = model_family;
    if (template !== undefined) updates.template = template;
    if (is_public !== undefined) updates.is_public = is_public;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updates)
      .eq('id', templateId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Template not found or not owned by user' });
    return res.json({ success: true, template: data });
  }

  // DELETE /api/prompt/templates/:id — delete template
  if (req.method === 'DELETE' && templateId) {
    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
