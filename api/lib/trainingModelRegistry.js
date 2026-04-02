/**
 * Training Model Registry
 * Declarative config for all FAL.ai LoRA training models.
 * Pattern mirrors api/lib/modelRegistry.js.
 */

export const TRAINING_MODELS = {
  'flux-lora-fast': {
    id: 'flux-lora-fast',
    name: 'FLUX LoRA Fast',
    endpoint: 'fal-ai/flux-lora-fast-training',
    baseModel: 'FLUX.1 [dev]',
    category: 'image',
    pricing: '$2 flat',
    supportsStyle: true,
    supportsMasks: true,
    hasLearningRate: false, // API does not accept learning_rate
    defaults: {
      steps: 1000,
    },
    stepRange: [1, 10000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, is_style, create_masks, is_preprocessed } = params;
      return {
        images_data_url: zipUrl,
        trigger_word,
        steps,
        create_masks: create_masks ?? true,
        is_style: is_style ?? false,
        is_input_format_already_preprocessed: is_preprocessed ?? false,
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? null;
    },
  },

  'flux-portrait': {
    id: 'flux-portrait',
    name: 'FLUX Portrait Trainer',
    endpoint: 'fal-ai/flux-lora-portrait-trainer',
    baseModel: 'FLUX.1 [dev]',
    category: 'image',
    pricing: '$0.0024/step',
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 2500,
      learning_rate: 0.00009,
    },
    stepRange: [1, 10000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, learning_rate } = params;
      return {
        images_data_url: zipUrl,
        trigger_phrase: trigger_word,
        steps,
        learning_rate,
        multiresolution_training: true,
        subject_crop: true,
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? null;
    },
  },

  'flux-kontext': {
    id: 'flux-kontext',
    name: 'FLUX Kontext Trainer',
    endpoint: 'fal-ai/flux-kontext-trainer',
    baseModel: 'FLUX.1 Kontext [dev]',
    category: 'image',
    pricing: '$2.50/1000 steps',
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [500, 10000],
    buildBody(params) {
      const { zipUrl, steps, learning_rate, default_caption } = params;
      return {
        image_data_url: zipUrl,
        steps,
        learning_rate,
        default_caption,
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? null;
    },
  },

  // Wan I2V models require VIDEO CLIPS as training data (not images).
  // Hidden from frontend UI since we only support image uploads currently.
  // To re-enable: add video upload support, then set hidden: false.
  'wan-21-i2v': {
    id: 'wan-21-i2v',
    name: 'Wan 2.1 I2V Trainer',
    endpoint: 'fal-ai/wan-trainer/i2v-480p',
    baseModel: 'Wan 2.1 I2V 14B',
    category: 'video',
    pricing: '5 credits/run',
    requiresVideo: true,
    hidden: true,
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 400,
      learning_rate: 0.0002,
    },
    stepRange: [100, 20000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, learning_rate } = params;
      return {
        training_data_url: zipUrl,
        trigger_phrase: trigger_word,
        number_of_steps: steps,
        learning_rate,
        auto_scale_input: true,
      };
    },
    parseResult(data) {
      return data?.lora_file?.url ?? null;
    },
  },

  'wan-22-i2v': {
    id: 'wan-22-i2v',
    name: 'Wan 2.2 I2V-A14B Trainer',
    endpoint: 'fal-ai/wan-22-trainer/i2v-a14b',
    baseModel: 'Wan 2.2 I2V-A14B',
    category: 'video',
    pricing: '$0.005/step',
    requiresVideo: true,
    hidden: true,
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 400,
      learning_rate: 0.0002,
    },
    stepRange: [100, 20000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, learning_rate } = params;
      return {
        training_data_url: zipUrl,
        trigger_phrase: trigger_word,
        number_of_steps: steps,
        learning_rate,
        auto_scale_input: true,
      };
    },
    parseResult(data) {
      return data?.lora_file?.url ?? null;
    },
  },

  'wan-22-image': {
    id: 'wan-22-image',
    name: 'Wan 2.2 T2I Trainer',
    endpoint: 'fal-ai/wan-22-image-trainer',
    baseModel: 'Wan 2.2 T2I',
    category: 'image',
    pricing: '$0.0045/step',
    supportsStyle: true,
    supportsMasks: true,
    hasLearningRate: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0007,
    },
    stepRange: [10, 6000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, learning_rate, is_style, create_masks, auto_caption } = params;
      return {
        training_data_url: zipUrl,
        trigger_phrase: trigger_word,
        steps,
        learning_rate,
        is_style: is_style ?? false,
        use_face_detection: true,
        use_masks: create_masks ?? true,
        use_face_cropping: false,
        include_synthetic_captions: auto_caption ?? false,
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? data?.high_noise_lora?.url ?? null;
    },
  },

  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image Trainer',
    endpoint: 'fal-ai/qwen-image-trainer',
    baseModel: 'Qwen Image',
    category: 'image',
    pricing: '$0.002/step',
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0005,
    },
    stepRange: [1, 8000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, learning_rate } = params;
      return {
        image_data_url: zipUrl,
        steps,
        learning_rate,
        trigger_phrase: trigger_word,
      };
    },
    parseResult(data) {
      return data?.lora_file?.url ?? null;
    },
  },

  'qwen-edit-2511': {
    id: 'qwen-edit-2511',
    name: 'Qwen Image Edit 2511 Trainer',
    endpoint: 'fal-ai/qwen-image-edit-2511-trainer',
    baseModel: 'Qwen Image Edit 2511',
    category: 'image',
    pricing: '$0.004/step',
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [100, 30000],
    buildBody(params) {
      const { zipUrl, steps, learning_rate, default_caption } = params;
      return {
        image_data_url: zipUrl,
        steps,
        learning_rate,
        default_caption,
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? null;
    },
  },

  'z-image': {
    id: 'z-image',
    name: 'Z-Image Turbo Trainer',
    endpoint: 'fal-ai/z-image-trainer',
    baseModel: 'Z-Image Turbo (6B)',
    category: 'image',
    pricing: '$0.00226/step',
    supportsStyle: true,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [100, 10000],
    buildBody(params) {
      const { zipUrl, steps, learning_rate, default_caption, is_style } = params;
      return {
        image_data_url: zipUrl,
        steps,
        learning_rate,
        default_caption,
        training_type: is_style ? 'style' : 'balanced',
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? null;
    },
  },

  'hunyuan-video': {
    id: 'hunyuan-video',
    name: 'Hunyuan Video LoRA Trainer',
    endpoint: 'fal-ai/hunyuan-video-lora-training',
    baseModel: 'Hunyuan Video',
    category: 'video',
    pricing: '$5 flat',
    supportsStyle: false,
    supportsMasks: false,
    hasLearningRate: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [1, 5000],
    buildBody(params) {
      const { zipUrl, trigger_word, steps, learning_rate, auto_caption } = params;
      return {
        images_data_url: zipUrl,
        steps,
        trigger_word,
        learning_rate,
        do_caption: auto_caption ?? true,
      };
    },
    parseResult(data) {
      return data?.diffusers_lora_file?.url ?? data?.lora_file?.url ?? null;
    },
  },
};

/**
 * Look up a training model by ID.
 * @param {string} modelId
 * @returns {object|null}
 */
export function getTrainingModel(modelId) {
  return TRAINING_MODELS[modelId] ?? null;
}

/**
 * List all training models, optionally filtered by category.
 * @param {'image'|'video'} [category]
 * @returns {object[]}
 */
export function listTrainingModels(category) {
  const all = Object.values(TRAINING_MODELS).filter((m) => !m.hidden);
  if (!category) return all;
  return all.filter((m) => m.category === category);
}

/**
 * Returns the default training model config.
 * @returns {object}
 */
export function getDefaultTrainingModel() {
  return TRAINING_MODELS['flux-lora-fast'];
}
