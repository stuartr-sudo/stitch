/**
 * Resolve LoRA configs with a fallback chain.
 *
 * Shared between:
 *   - article/from-url.js (article → storyboard pipeline)
 *   - shorts/generate.js  (faceless shorts pipeline)
 *
 * Fallback chain:
 *   1. template.lora_config[]  (explicit multi-LoRA from template/request)
 *   2. template.avatar_id      (legacy single LoRA via visual subject)
 *   3. brandKit.default_loras  (brand-level defaults)
 *
 * @param {object|null} template - template or niche config (can be null for shorts)
 * @param {object} brandKit - brand kit object (or effectiveBrandKit fallback)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array<{ triggerWord: string|null, loraUrl: string, scale: number }>>}
 */
export async function resolveLoraConfigs(template, brandKit, supabase) {
  const configs = [];

  // 1. Template-level multi-LoRA config
  if (template?.lora_config?.length) {
    for (const entry of template.lora_config) {
      if (entry.source === 'prebuilt') {
        const { data: lib } = await supabase.from('lora_library').select('*').eq('id', entry.lora_id).maybeSingle();
        if (lib) configs.push({ loraUrl: lib.hf_repo_id, triggerWord: lib.recommended_trigger_word || null, scale: entry.scale ?? lib.default_scale });
      } else {
        // Custom or visual_subject source — look up from brand_loras
        const { data: lora } = await supabase.from('brand_loras').select('fal_model_url, trigger_word').eq('id', entry.lora_id).eq('status', 'ready').maybeSingle();
        if (lora?.fal_model_url) configs.push({ loraUrl: lora.fal_model_url, triggerWord: lora.trigger_word || null, scale: entry.scale ?? 1.0 });
      }
    }
    if (configs.length) return configs;
  }

  // 2. Legacy avatar_id (single visual subject LoRA)
  if (template?.avatar_id) {
    const { data: subject } = await supabase.from('visual_subjects').select('name, lora_url, lora_trigger_word').eq('id', template.avatar_id).maybeSingle();
    if (subject?.lora_url) {
      configs.push({ loraUrl: subject.lora_url, triggerWord: subject.lora_trigger_word || null, scale: 1.0 });
      return configs;
    }
  }

  // 3. Brand-level default LoRAs (fallback)
  if (brandKit?.default_loras?.length) {
    for (const entry of brandKit.default_loras) {
      if (entry.source === 'prebuilt') {
        const { data: lib } = await supabase.from('lora_library').select('*').eq('id', entry.lora_id).maybeSingle();
        if (lib) configs.push({ loraUrl: lib.hf_repo_id, triggerWord: lib.recommended_trigger_word || null, scale: entry.scale ?? lib.default_scale });
      } else {
        const { data: lora } = await supabase.from('brand_loras').select('fal_model_url, trigger_word').eq('id', entry.lora_id).eq('status', 'ready').maybeSingle();
        if (lora?.fal_model_url) configs.push({ loraUrl: lora.fal_model_url, triggerWord: lora.trigger_word || null, scale: entry.scale ?? 1.0 });
      }
    }
  }

  return configs;
}

/**
 * Convert LoRAPicker UI value format to pipeline loraConfigs format.
 *
 * LoRAPicker value:   [{ id, type, url, triggerWord, scale }]
 * Pipeline expects:    [{ loraUrl, triggerWord, scale }]
 *
 * @param {Array} pickerValues - from LoRAPicker component
 * @returns {Array<{ loraUrl: string, triggerWord: string|null, scale: number }>}
 */
export function mapPickerToLoraConfigs(pickerValues) {
  if (!pickerValues?.length) return [];
  return pickerValues
    .filter(v => v.url)
    .map(v => ({
      loraUrl: v.url,
      triggerWord: v.triggerWord || null,
      scale: v.scale ?? 1.0,
    }));
}
