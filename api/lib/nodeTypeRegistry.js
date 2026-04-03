import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import { uploadUrlToSupabase, generateMusic, pollFalQueue, extractFirstFrame } from './pipelineHelpers.js';
import { generateGeminiVoiceover } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateScript } from './scriptGenerator.js';

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
  },

  'imagineer-edit': {
    id: 'imagineer-edit',
    label: 'Imagineer Edit',
    category: 'image',
    icon: '✏️',
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'prompt', type: 'string', required: true },
      { id: 'style', type: 'string', required: false }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      model: { type: 'select', options: ['nano-banana-2', 'seeddream-v4', 'wavespeed-nano-ultra'], default: 'nano-banana-2' }
    },
    async run(inputs, config, context) {
      const prompt = inputs.style ? `${inputs.prompt}, ${inputs.style}` : inputs.prompt;
      const imageUrl = await generateImageV2(config.model, prompt, '1:1', context.apiKeys, context.supabase, { image_url: inputs.image });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'imagineer-edit', model: config.model });
      return { image_url: imageUrl };
    }
  },

  'turnaround-sheet': {
    id: 'turnaround-sheet',
    label: 'Turnaround Sheet',
    category: 'image',
    icon: '🎨',
    inputs: [
      { id: 'prompt', type: 'string', required: true },
      { id: 'style', type: 'string', required: false }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      model: { type: 'select', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4'], default: 'nano-banana-2' },
      pose_set: { type: 'select', options: ['standard-24', '3d-angles', '3d-action', 'r2v-reference'], default: 'standard-24' }
    },
    async run(inputs, config, context) {
      const prompt = inputs.style ? `${inputs.prompt}, ${inputs.style}, character turnaround sheet` : `${inputs.prompt}, character turnaround sheet`;
      const imageUrl = await generateImageV2(config.model, prompt, '2:3', context.apiKeys, context.supabase, {});
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'turnaround-sheet', model: config.model });
      return { image_url: imageUrl };
    }
  },

  'smoosh': {
    id: 'smoosh',
    label: 'Smoosh',
    category: 'image',
    icon: '🔀',
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'image2', type: 'image', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      model: { type: 'select', options: ['nano-banana-2', 'wavespeed-nano-ultra'], default: 'nano-banana-2' }
    },
    async run(inputs, config, context) {
      const imageUrl = await generateImageV2(config.model, 'blend these images together seamlessly', '1:1', context.apiKeys, context.supabase, { image_urls: [inputs.image, inputs.image2] });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'smoosh', model: config.model });
      return { image_url: imageUrl };
    }
  },

  'animate-image': {
    id: 'animate-image',
    label: 'Animate Image',
    category: 'video',
    icon: '🎞️',
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'prompt', type: 'string', required: false }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {
      model: { type: 'select', options: ['kling-2.0-master', 'veo-3.1-fast', 'wan-2.5', 'hailuo'], default: 'kling-2.0-master' },
      duration: { type: 'select', options: ['5', '10'], default: '5' }
    },
    async run(inputs, config, context) {
      const videoUrl = await animateImageV2(config.model, inputs.image, inputs.prompt || '', '16:9', parseInt(config.duration), context.apiKeys, context.supabase, {});
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'animate-image', model: config.model });
      return { video_url: videoUrl };
    }
  },

  'motion-transfer': {
    id: 'motion-transfer',
    label: 'Motion Transfer',
    category: 'video',
    icon: '🏃',
    inputs: [
      { id: 'video', type: 'video', required: true },
      { id: 'reference_image', type: 'image', required: true }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {},
    async run(inputs, config, context) {
      const videoUrl = await animateImageV2('wan-2.5', inputs.reference_image, '', '16:9', 5, context.apiKeys, context.supabase, { video_url: inputs.video });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'motion-transfer', model: 'wan-2.5' });
      return { video_url: videoUrl };
    }
  },

  'voiceover': {
    id: 'voiceover',
    label: 'Voiceover',
    category: 'audio',
    icon: '🎙️',
    inputs: [
      { id: 'text', type: 'string', required: true }
    ],
    outputs: [{ id: 'audio_url', type: 'audio' }],
    configSchema: {
      voice: { type: 'select', options: ['Kore', 'Charon', 'Fenrir', 'Aoede', 'Puck'], default: 'Kore' },
      speed: { type: 'select', options: ['1.0', '1.15', '1.3'], default: '1.15' }
    },
    async run(inputs, config, context) {
      const result = await generateGeminiVoiceover(inputs.text, config.voice, parseFloat(config.speed), context.apiKeys.FAL_KEY);
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'voiceover', model: 'gemini-tts' });
      return { audio_url: result };
    }
  },

  'music': {
    id: 'music',
    label: 'Music',
    category: 'audio',
    icon: '🎵',
    inputs: [
      { id: 'mood', type: 'string', required: false }
    ],
    outputs: [{ id: 'audio_url', type: 'audio' }],
    configSchema: {
      duration: { type: 'select', options: ['15', '30', '60'], default: '30' }
    },
    async run(inputs, config, context) {
      const result = await generateMusic(inputs.mood || 'upbeat instrumental', parseInt(config.duration), context.apiKeys.FAL_KEY, context.supabase);
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'music', model: 'elevenlabs-music' });
      return { audio_url: result };
    }
  },

  'captions': {
    id: 'captions',
    label: 'Captions',
    category: 'audio',
    icon: '💬',
    inputs: [
      { id: 'video', type: 'video', required: true }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {
      style: { type: 'select', options: ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker'], default: 'word_pop' }
    },
    async run(inputs, config, context) {
      const result = await burnCaptions(inputs.video, config.style, context.apiKeys.FAL_KEY, context.supabase);
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'captions', model: 'auto-subtitle' });
      return { video_url: result };
    }
  },

  'script-generator': {
    id: 'script-generator',
    label: 'Script Generator',
    category: 'content',
    icon: '📝',
    inputs: [
      { id: 'topic', type: 'string', required: true },
      { id: 'niche', type: 'string', required: false }
    ],
    outputs: [{ id: 'script', type: 'json' }],
    configSchema: {
      duration: { type: 'select', options: ['30', '60', '90'], default: '60' }
    },
    async run(inputs, config, context) {
      const result = await generateScript(inputs.topic, inputs.niche || 'general', parseInt(config.duration), context.apiKeys);
      await context.logCost({ username: context.userEmail, category: 'openai', operation: 'script-generator', model: 'gpt-4.1-mini' });
      return { script: result };
    }
  },

  'prompt-builder': {
    id: 'prompt-builder',
    label: 'Prompt Builder',
    category: 'content',
    icon: '🔧',
    inputs: [
      { id: 'description', type: 'string', required: true },
      { id: 'style', type: 'string', required: false },
      { id: 'props', type: 'string', required: false }
    ],
    outputs: [{ id: 'prompt', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      const parts = [inputs.description];
      if (inputs.style) parts.push(inputs.style);
      if (inputs.props) parts.push(inputs.props);
      return { prompt: parts.join(', ') };
    }
  },

  'youtube-upload': {
    id: 'youtube-upload',
    label: 'YouTube Upload',
    category: 'publish',
    icon: '📺',
    inputs: [
      { id: 'video', type: 'video', required: true },
      { id: 'title', type: 'string', required: true },
      { id: 'description', type: 'string', required: false }
    ],
    outputs: [{ id: 'video_id', type: 'string' }],
    configSchema: {
      privacy: { type: 'select', options: ['public', 'unlisted', 'private'], default: 'private' }
    },
    async run(inputs, config, context) {
      // Placeholder — requires OAuth tokens which are user-specific
      return { video_id: `yt_placeholder_${Date.now()}` };
    }
  },

  'tiktok-publish': {
    id: 'tiktok-publish',
    label: 'TikTok Publish',
    category: 'publish',
    icon: '🎵',
    inputs: [
      { id: 'video', type: 'video', required: false },
      { id: 'image', type: 'image', required: false }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { post_id: `tt_placeholder_${Date.now()}` };
    }
  },

  'instagram-post': {
    id: 'instagram-post',
    label: 'Instagram Post',
    category: 'publish',
    icon: '📸',
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'caption', type: 'string', required: false }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { post_id: `ig_placeholder_${Date.now()}` };
    }
  },

  'facebook-post': {
    id: 'facebook-post',
    label: 'Facebook Post',
    category: 'publish',
    icon: '👤',
    inputs: [
      { id: 'image', type: 'image', required: false },
      { id: 'text', type: 'string', required: true }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { post_id: `fb_placeholder_${Date.now()}` };
    }
  },

  'video-trim': {
    id: 'video-trim',
    label: 'Video Trim',
    category: 'utility',
    icon: '✂️',
    inputs: [
      { id: 'video', type: 'video', required: true }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {
      start_time: { type: 'text', default: '0' },
      end_time: { type: 'text', default: '10' }
    },
    async run(inputs, config, context) {
      // Use FFmpeg via FAL for trimming
      return { video_url: inputs.video };
    }
  },

  'extract-frame': {
    id: 'extract-frame',
    label: 'Extract Frame',
    category: 'utility',
    icon: '🖼️',
    inputs: [
      { id: 'video', type: 'video', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      frame_type: { type: 'select', options: ['first', 'middle', 'last'], default: 'first' }
    },
    async run(inputs, config, context) {
      const imageUrl = await extractFirstFrame(inputs.video, context.apiKeys.FAL_KEY, config.frame_type || 'first');
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'extract-frame', model: 'extract-frame' });
      return { image_url: imageUrl };
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
