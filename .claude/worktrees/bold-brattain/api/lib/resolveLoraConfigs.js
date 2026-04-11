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
 * Wan 2.2 dual-transformer support:
 *   When a LoRA was trained with wan-22-image, the trainer outputs TWO files:
 *   - diffusers_lora_file (low-noise) → stored in fal_model_url
 *   - high_noise_lora     (high-noise) → stored in high_noise_lora_url
 *   This function automatically expands them into two config entries with
 *   transformer: 'low' and transformer: 'high' targeting.
 *
 * @param {object|null} template - template or niche config (can be null for shorts)
 * @param {object} brandKit - brand kit object (or effectiveBrandKit fallback)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array<{ triggerWord: string|null, loraUrl: string, scale: number, transformer?: string }>>}
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
        const { data: lora } = await supabase.from('brand_loras')
          .select('fal_model_url, trigger_word, high_noise_lora_url, training_model')
          .eq('id', entry.lora_id).eq('status', 'ready').maybeSingle();
        if (lora?.fal_model_url) {
          expandLoraConfig(configs, lora, entry.scale ?? 1.0);
        }
      }
    }
    if (configs.length) return configs;
  }

  // 2. Legacy avatar_id (single visual subject LoRA)
  if (template?.avatar_id) {
    const { data: subject } = await supabase.from('visual_subjects').select('name, lora_url, lora_trigger_word, brand_lora_id').eq('id', template.avatar_id).maybeSingle();
    if (subject?.lora_url) {
      // Check if this subject's LoRA is a Wan 2.2 dual-transformer model
      if (subject.brand_lora_id) {
        const { data: lora } = await supabase.from('brand_loras')
          .select('fal_model_url, trigger_word, high_noise_lora_url, training_model')
          .eq('id', subject.brand_lora_id).eq('status', 'ready').maybeSingle();
        if (lora?.fal_model_url) {
          expandLoraConfig(configs, lora, 1.0);
          return configs;
        }
      }
      // Fallback: simple single LoRA
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
        const { data: lora } = await supabase.from('brand_loras')
          .select('fal_model_url, trigger_word, high_noise_lora_url, training_model')
          .eq('id', entry.lora_id).eq('status', 'ready').maybeSingle();
        if (lora?.fal_model_url) {
          expandLoraConfig(configs, lora, entry.scale ?? 1.0);
        }
      }
    }
  }

  return configs;
}

/**
 * Expand a LoRA record into config entries.
 * For Wan 2.2 dual-transformer models, creates two entries with transformer targeting.
 * For all other models, creates a single entry.
 *
 * @param {Array} configs - target array to push entries into
 * @param {object} lora - brand_loras record with fal_model_url, trigger_word, high_noise_lora_url, training_model
 * @param {number} scale - LoRA scale
 */
function expandLoraConfig(configs, lora, scale) {
  if (lora.training_model === 'wan-22-image' && lora.high_noise_lora_url) {
    // Wan 2.2 dual-transformer: low-noise + high-noise with transformer targeting
    configs.push({
      loraUrl: lora.fal_model_url,
      triggerWord: lora.trigger_word || null,
      scale,
      transformer: 'low',
    });
    configs.push({
      loraUrl: lora.high_noise_lora_url,
      triggerWord: null, // trigger word only on the low-noise entry to avoid duplication
      scale,
      transformer: 'high',
    });
  } else {
    configs.push({
      loraUrl: lora.fal_model_url,
      triggerWord: lora.trigger_word || null,
      scale,
    });
  }
}

/**
 * Convert LoRAPicker UI value format to pipeline loraConfigs format.
 * Automatically expands Wan 2.2 dual-transformer LoRAs into two entries.
 *
 * LoRAPicker value:   [{ id, type, url, triggerWord, scale, highNoiseUrl?, trainingModel? }]
 * Pipeline expects:    [{ loraUrl, triggerWord, scale, transformer? }]
 *
 * @param {Array} pickerValues - from LoRAPicker component
 * @returns {Array<{ loraUrl: string, triggerWord: string|null, scale: number, transformer?: string }>}
 */
export function mapPickerToLoraConfigs(pickerValues) {
  if (!pickerValues?.length) return [];
  const configs = [];
  for (const v of pickerValues) {
    if (!v.url) continue;
    if (v.trainingModel === 'wan-22-image' && v.highNoiseUrl) {
      // Wan 2.2 dual-LoRA expansion
      configs.push({ loraUrl: v.url, triggerWord: v.triggerWord || null, scale: v.scale ?? 1.0, transformer: 'low' });
      configs.push({ loraUrl: v.highNoiseUrl, triggerWord: null, scale: v.scale ?? 1.0, transformer: 'high' });
    } else {
      configs.push({ loraUrl: v.url, triggerWord: v.triggerWord || null, scale: v.scale ?? 1.0 });
    }
  }
  return configs;
}
