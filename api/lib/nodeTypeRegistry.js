import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import { uploadUrlToSupabase } from './pipelineHelpers.js';

const NODE_TYPES = {
  'manual-input': {
    id: 'manual-input',
    label: 'Manual Input',
    category: 'input',
    icon: '📥',
    inputs: [],
    outputs: [
      { id: 'value', type: 'string' }
    ],
    configSchema: {
      label: { type: 'text', default: 'Input' },
      inputType: { type: 'select', options: ['string', 'image', 'video'], default: 'string' },
      defaultValue: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      return { value: config.resolvedValue || config.defaultValue || '' };
    }
  },

  'imagineer-generate': {
    id: 'imagineer-generate',
    label: 'Imagineer Generate',
    category: 'image',
    icon: '🖼',
    inputs: [
      { id: 'prompt', type: 'string', required: true },
      { id: 'style', type: 'string', required: false }
    ],
    outputs: [
      { id: 'image_url', type: 'image' }
    ],
    configSchema: {
      model: { type: 'select', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4'], default: 'nano-banana-2' },
      aspect_ratio: { type: 'select', options: ['16:9', '9:16', '1:1', '4:5', '3:2'], default: '16:9' }
    },
    async run(inputs, config, context) {
      const prompt = inputs.style ? `${inputs.prompt}, ${inputs.style}` : inputs.prompt;
      const imageUrl = await generateImageV2(
        config.model, prompt, config.aspect_ratio,
        context.apiKeys, context.supabase, {}
      );
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'imagineer-generate', model: config.model });
      return { image_url: imageUrl };
    }
  },

  'jumpstart-animate': {
    id: 'jumpstart-animate',
    label: 'JumpStart Animate',
    category: 'video',
    icon: '🎬',
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'prompt', type: 'string', required: false }
    ],
    outputs: [
      { id: 'video_url', type: 'video' }
    ],
    configSchema: {
      model: { type: 'select', options: ['kling-2.0-master', 'veo-3.1-fast', 'wan-2.5'], default: 'kling-2.0-master' },
      duration: { type: 'select', options: ['5', '10'], default: '5' }
    },
    async run(inputs, config, context) {
      const videoUrl = await animateImageV2(
        config.model, inputs.image, inputs.prompt || '',
        '16:9', parseInt(config.duration),
        context.apiKeys, context.supabase, {}
      );
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'jumpstart-animate', model: config.model });
      return { video_url: videoUrl };
    }
  },

  'save-to-library': {
    id: 'save-to-library',
    label: 'Save to Library',
    category: 'utility',
    icon: '💾',
    inputs: [
      { id: 'url', type: 'string', required: true },
      { id: 'name', type: 'string', required: false }
    ],
    outputs: [
      { id: 'saved_url', type: 'string' }
    ],
    configSchema: {},
    async run(inputs, config, context) {
      const savedUrl = await uploadUrlToSupabase(inputs.url, context.supabase, 'library');
      return { saved_url: savedUrl };
    }
  }
};

export function getNodeType(id) {
  return NODE_TYPES[id] || null;
}

export function getAllNodeTypes() {
  return Object.values(NODE_TYPES);
}

export function getNodeTypesByCategory() {
  const grouped = {};
  for (const node of Object.values(NODE_TYPES)) {
    if (!grouped[node.category]) grouped[node.category] = [];
    grouped[node.category].push(node);
  }
  return grouped;
}

export default NODE_TYPES;
