/**
 * Campaign Creation API — creates a flow pre-populated with brand context source nodes.
 *
 * POST /api/flows/campaigns
 * Body: { name, brand_username, selected_modules: [...], save_defaults: boolean }
 *
 * GET /api/flows/campaigns/brand-context/:username
 * Returns all available brand data modules for the wizard.
 *
 * GET /api/flows/campaigns/defaults/:username
 * Returns saved module selections for this brand.
 *
 * PUT /api/flows/campaigns/defaults/:username
 * Saves module selections as defaults.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  const userId = req.user.id;
  const userEmail = req.user.email;
  const path = req.path.replace('/api/flows/campaigns', '');

  // ─── GET /brand-context/:username — fetch all brand modules ───
  if (req.method === 'GET' && path.startsWith('/brand-context/')) {
    const username = path.split('/brand-context/')[1];
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
      const modules = await fetchAllBrandModules(supabase, userId, username);
      return res.json({ modules });
    } catch (err) {
      console.error('[campaign-create] Error fetching brand context:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── GET /defaults/:username — get saved defaults ───
  if (req.method === 'GET' && path.startsWith('/defaults/')) {
    const username = path.split('/defaults/')[1];
    try {
      const { data } = await supabase
        .from('campaign_brand_defaults')
        .select('*')
        .eq('user_id', userId)
        .eq('brand_username', username)
        .maybeSingle();
      return res.json({ defaults: data || null });
    } catch (err) {
      console.error('[campaign-create] Error fetching defaults:', err.message);
      return res.json({ defaults: null });
    }
  }

  // ─── PUT /defaults/:username — save defaults ───
  if (req.method === 'PUT' && path.startsWith('/defaults/')) {
    const username = path.split('/defaults/')[1];
    const { selected_modules, selected_fields } = req.body;
    try {
      const { data, error } = await supabase
        .from('campaign_brand_defaults')
        .upsert({
          user_id: userId,
          brand_username: username,
          selected_modules: selected_modules || [],
          selected_fields: selected_fields || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,brand_username' })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ defaults: data });
    } catch (err) {
      console.error('[campaign-create] Error saving defaults:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── POST / — create campaign flow ───
  if (req.method === 'POST') {
    const { name, brand_username, selected_modules = [], save_defaults = false } = req.body;
    if (!name) return res.status(400).json({ error: 'Campaign name required' });

    try {
      // Fetch data for each selected module
      const moduleData = await fetchSelectedModuleData(supabase, userId, brand_username, selected_modules);

      // Build source nodes — one per selected module, positioned in a column on the left
      const nodes = [];
      let yPos = 50;

      for (const mod of moduleData) {
        const outputs = Object.entries(mod.fields).map(([key, value]) => ({
          id: key,
          type: inferFieldType(key, value),
        }));

        nodes.push({
          id: `source_${mod.table}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'stitch',
          position: { x: 50, y: yPos },
          data: {
            nodeType: {
              id: 'brand-context',
              label: mod.label,
              category: 'brand',
              icon: mod.icon,
              description: `Brand data from ${mod.table}`,
              inputs: [],
              outputs,
              configSchema: {},
            },
            config: {
              _source_table: mod.table,
              _source_id: mod.id || null,
              _brand_username: brand_username,
              ...mod.fields, // Pre-load all field values into config
            },
          },
        });

        yPos += 200 + (outputs.length * 25); // Space based on output count
      }

      // Add publishing credential nodes for selected platforms
      const platformModules = selected_modules.filter(m => m.table === 'platform_connections');
      for (const pm of platformModules) {
        nodes.push({
          id: `cred_${pm.platform}_${Date.now()}`,
          type: 'stitch',
          position: { x: 50, y: yPos },
          data: {
            nodeType: {
              id: 'publishing-credential',
              label: `${pm.platform.charAt(0).toUpperCase() + pm.platform.slice(1)} Credentials`,
              category: 'publish',
              icon: pm.platform === 'youtube' ? '▶️' : pm.platform === 'tiktok' ? '🎵' : pm.platform === 'instagram' ? '📸' : pm.platform === 'facebook' ? '👥' : '💼',
              description: `${pm.platform} OAuth credentials`,
              inputs: [],
              outputs: [
                { id: 'platform', type: 'string' },
                { id: 'credential', type: 'json' },
              ],
              configSchema: {},
            },
            config: {
              platform: pm.platform,
              status: pm.status || 'unknown',
            },
          },
        });
        yPos += 150;
      }

      // Create the flow with variables set from brand context
      const variables = {};
      if (brand_username) variables.brand_username = brand_username;
      const brandKit = moduleData.find(m => m.table === 'brand_kit');
      if (brandKit?.fields?.brand_name) variables.brand_name = brandKit.fields.brand_name;

      const graph_json = { nodes, edges: [], variables };

      const { data: flow, error } = await supabase
        .from('automation_flows')
        .insert({
          user_id: userId,
          name: name || 'Untitled Campaign',
          description: `Campaign for ${brand_username || 'no brand'}`,
          graph_json,
          trigger_type: 'manual',
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      // Save defaults if requested
      if (save_defaults && brand_username) {
        await supabase
          .from('campaign_brand_defaults')
          .upsert({
            user_id: userId,
            brand_username,
            selected_modules,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,brand_username' });
      }

      return res.json({ flow });
    } catch (err) {
      console.error('[campaign-create] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Fetch ALL available brand modules for the wizard's module selector.
 */
async function fetchAllBrandModules(supabase, userId, username) {
  const modules = [];

  // 1. Brand Kit (user_id scoped)
  const { data: brandKit } = await supabase.from('brand_kit').select('*').eq('user_id', userId).maybeSingle();
  if (brandKit) {
    modules.push({
      table: 'brand_kit', label: 'Brand Identity', icon: '🏷️',
      description: 'Core brand: name, colors, logo, voice, taglines, visual style',
      fieldCount: Object.keys(brandKit).filter(k => !['id', 'user_id', 'created_at', 'updated_at'].includes(k) && brandKit[k]).length,
      fields: filterMeta(brandKit),
    });
  }

  // 2. Company Information (username scoped)
  if (username) {
    const { data: company } = await supabase.from('company_information').select('*').eq('username', username).maybeSingle();
    if (company) {
      modules.push({
        table: 'company_information', label: 'Company Info', icon: '🏢',
        description: 'Business data: website, blurb, voice, competitors',
        fieldCount: Object.keys(company).filter(k => !['id', 'created_at', 'updated_at'].includes(k) && company[k]).length,
        fields: filterMeta(company),
      });
    }

    // 3. Brand Guidelines (user_name scoped)
    const { data: guidelines } = await supabase.from('brand_guidelines').select('*').eq('user_name', username).order('updated_date', { ascending: false }).limit(1).maybeSingle();
    if (guidelines) {
      modules.push({
        table: 'brand_guidelines', label: 'Content Guidelines', icon: '📋',
        description: 'Voice & tone, style rules, prohibited/preferred elements',
        fieldCount: Object.keys(guidelines).filter(k => !['id', 'user_name', 'name', 'updated_date'].includes(k) && guidelines[k]).length,
        fields: filterMeta(guidelines, ['id', 'user_name', 'name', 'updated_date']),
      });
    }

    // 4. Brand Image Styles (user_name scoped)
    const { data: imageStyles } = await supabase.from('brand_image_styles').select('*').eq('user_name', username).order('updated_date', { ascending: false }).limit(1).maybeSingle();
    if (imageStyles) {
      modules.push({
        table: 'brand_image_styles', label: 'Image Style', icon: '🎨',
        description: 'AI image generation rules: mood, composition, lighting',
        fieldCount: Object.keys(imageStyles).filter(k => !['id', 'user_name', 'name', 'updated_date'].includes(k) && imageStyles[k]).length,
        fields: filterMeta(imageStyles, ['id', 'user_name', 'name', 'updated_date']),
      });
    }

    // 5. Target Market (username scoped — multiple)
    const { data: targets } = await supabase.from('target_market').select('*').eq('username', username);
    if (targets?.length) {
      for (const t of targets) {
        modules.push({
          table: 'target_market', label: `Target: ${t.name || 'Audience'}`, icon: '🎯',
          id: t.id,
          description: t.description?.slice(0, 60) || 'Target audience segment',
          fieldCount: 3,
          fields: { name: t.name, description: t.description },
        });
      }
    }
  }

  // 6. Brand LoRAs (user_id scoped)
  const { data: loras } = await supabase.from('brand_loras').select('*').eq('user_id', userId).eq('status', 'ready');
  if (loras?.length) {
    for (const lora of loras) {
      modules.push({
        table: 'brand_loras', label: `LoRA: ${lora.name}`, icon: '🧬',
        id: lora.id,
        description: `Trigger: ${lora.trigger_word || 'none'}, ${lora.training_images_count || '?'} images`,
        fieldCount: 3,
        fields: { name: lora.name, trigger_word: lora.trigger_word, fal_model_url: lora.fal_model_url, training_model: lora.training_model },
      });
    }
  }

  // 7. Visual Subjects (user_id scoped)
  const { data: subjects } = await supabase.from('visual_subjects').select('*').eq('user_id', userId).eq('is_active', true);
  if (subjects?.length) {
    for (const s of subjects) {
      modules.push({
        table: 'visual_subjects', label: `Subject: ${s.name}`, icon: '👤',
        id: s.id,
        description: s.description?.slice(0, 60) || 'Visual character/subject',
        fieldCount: 4,
        fields: { name: s.name, description: s.description, reference_image_url: s.reference_image_url, lora_url: s.lora_url, lora_trigger_word: s.lora_trigger_word },
      });
    }
  }

  // 8. Characters (user_id scoped)
  const { data: characters } = await supabase.from('characters').select('*').eq('user_id', userId);
  if (characters?.length) {
    for (const c of characters) {
      modules.push({
        table: 'characters', label: `Character: ${c.name}`, icon: '🎭',
        id: c.id,
        description: c.description?.slice(0, 60) || 'Named character',
        fieldCount: 3,
        fields: { name: c.name, description: c.description, image_url: c.image_url },
      });
    }
  }

  // 9. Prompt Templates (user_id scoped)
  const { data: templates } = await supabase.from('prompt_templates').select('*').eq('user_id', userId);
  if (templates?.length) {
    for (const t of templates) {
      modules.push({
        table: 'prompt_templates', label: `Template: ${t.name}`, icon: '📝',
        id: t.id,
        description: `${t.category || 'general'} — ${t.model_family || 'any model'}`,
        fieldCount: 2,
        fields: { name: t.name, category: t.category, template: t.template },
      });
    }
  }

  // 10. Platform Connections (user_id scoped)
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, platform_username, platform_page_name, token_expires_at')
    .eq('user_id', userId);
  if (connections?.length) {
    for (const c of connections) {
      const isExpired = c.token_expires_at && new Date(c.token_expires_at) < new Date();
      modules.push({
        table: 'platform_connections', label: `Publish: ${c.platform}`, icon: c.platform === 'youtube' ? '▶️' : c.platform === 'tiktok' ? '🎵' : c.platform === 'instagram' ? '📸' : c.platform === 'facebook' ? '👥' : '💼',
        platform: c.platform,
        description: `${c.platform_username || c.platform_page_name || 'Connected'}${isExpired ? ' — TOKEN EXPIRED' : ''}`,
        fieldCount: 1,
        status: isExpired ? 'expired' : 'connected',
        fields: { platform: c.platform, username: c.platform_username },
      });
    }
  }

  return modules;
}

/**
 * Fetch actual data for selected modules to populate source nodes.
 */
async function fetchSelectedModuleData(supabase, userId, username, selectedModules) {
  const results = [];

  for (const mod of selectedModules) {
    if (mod.table === 'platform_connections') continue; // Handled separately as credential nodes

    let data = null;
    const table = mod.table;

    switch (table) {
      case 'brand_kit':
        ({ data } = await supabase.from('brand_kit').select('*').eq('user_id', userId).maybeSingle());
        break;
      case 'company_information':
        if (username) ({ data } = await supabase.from('company_information').select('*').eq('username', username).maybeSingle());
        break;
      case 'brand_guidelines':
        if (username) ({ data } = await supabase.from('brand_guidelines').select('*').eq('user_name', username).order('updated_date', { ascending: false }).limit(1).maybeSingle());
        break;
      case 'brand_image_styles':
        if (username) ({ data } = await supabase.from('brand_image_styles').select('*').eq('user_name', username).order('updated_date', { ascending: false }).limit(1).maybeSingle());
        break;
      case 'target_market':
        if (mod.id) ({ data } = await supabase.from('target_market').select('*').eq('id', mod.id).maybeSingle());
        break;
      case 'brand_loras':
        if (mod.id) ({ data } = await supabase.from('brand_loras').select('*').eq('id', mod.id).eq('status', 'ready').maybeSingle());
        break;
      case 'visual_subjects':
        if (mod.id) ({ data } = await supabase.from('visual_subjects').select('*').eq('id', mod.id).maybeSingle());
        break;
      case 'characters':
        if (mod.id) ({ data } = await supabase.from('characters').select('*').eq('id', mod.id).maybeSingle());
        break;
      case 'prompt_templates':
        if (mod.id) ({ data } = await supabase.from('prompt_templates').select('*').eq('id', mod.id).maybeSingle());
        break;
    }

    if (data) {
      results.push({
        table,
        label: mod.label || table,
        icon: mod.icon || '📦',
        id: mod.id || data.id,
        fields: filterMeta(data),
      });
    }
  }

  return results;
}

/** Remove internal/meta fields from a row */
function filterMeta(row, extraExclude = []) {
  const exclude = new Set(['id', 'user_id', 'created_at', 'updated_at', ...extraExclude]);
  const result = {};
  for (const [k, v] of Object.entries(row)) {
    if (!exclude.has(k) && v != null && v !== '') result[k] = v;
  }
  return result;
}

/** Infer port type from field name and value */
function inferFieldType(key, value) {
  if (key.includes('url') || key.includes('image') || key.includes('logo')) return 'image';
  if (key.includes('video')) return 'video';
  if (key.includes('audio')) return 'audio';
  if (typeof value === 'object' && value !== null) return 'json';
  return 'string';
}
