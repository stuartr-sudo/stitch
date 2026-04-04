import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import { uploadUrlToSupabase, generateMusic, pollFalQueue, extractFirstFrame } from './pipelineHelpers.js';
import { generateGeminiVoiceover } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateScript } from './scriptGenerator.js';
import { buildCohesivePrompt } from './cohesivePromptBuilder.js';

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
      model: { type: 'select', options: ['nano-banana-2', 'fal-flux', 'fal-flux-klein-4b', 'fal-flux-klein-9b', 'seeddream-v4', 'imagen-4', 'kling-image-v3', 'grok-imagine', 'ideogram-v2', 'wavespeed', 'wan-22-t2i'], default: 'nano-banana-2' },
      aspect_ratio: { type: 'select', options: ['16:9', '9:16', '1:1', '4:5', '3:2'], default: '16:9' },
      negative_prompt: { type: 'text', default: '' },
      brand_kit: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      // Build prompt via Cohesive Prompt Builder (never concatenate)
      const prompt = await buildCohesivePrompt({
        description: inputs.prompt,
        style: inputs.style || config.style_preset_text || undefined,
        tool: 'imagineer',
        lighting: config.lighting || undefined,
        cameraAngle: config.camera_angle || undefined,
        colorPalette: config.color_palette || undefined,
        mood: config.mood || undefined,
        negativePrompt: config.negative_prompt || undefined,
        brandStyleGuide: config.brand_kit || undefined,
      }, context.apiKeys.openaiKey);

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
      model: { type: 'select', options: ['kling-2.0-master', 'kling-v3-pro', 'kling-o3-pro', 'veo-2', 'veo-3.1-fast', 'veo-3.1-lite', 'pixverse-v6', 'pixverse-v4.5', 'wan-2.5', 'wan-pro', 'hailuo', 'grok-imagine-i2v', 'wavespeed-wan'], default: 'kling-2.0-master' },
      duration: { type: 'select', options: ['3', '4', '5', '6', '7', '8', '10', '15'], default: '5' },
      aspect_ratio: { type: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' }
    },
    async run(inputs, config, context) {
      const videoUrl = await animateImageV2(
        config.model, inputs.image, inputs.prompt || '',
        config.aspect_ratio || '16:9', parseInt(config.duration),
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
      model: { type: 'select', options: ['nano-banana-2', 'seeddream-v4', 'wavespeed-nano-ultra', 'qwen-image-edit'], default: 'nano-banana-2' }
    },
    async run(inputs, config, context) {
      const prompt = await buildCohesivePrompt({
        description: inputs.prompt,
        style: inputs.style || config.style_preset_text || undefined,
        tool: 'edit',
      }, context.apiKeys.openaiKey);
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
      pose_set: { type: 'select', options: ['standard-24', '3d-angles', '3d-action', 'r2v-reference'], default: 'standard-24' },
      background_mode: { type: 'select', options: ['white', 'gray', 'scene'], default: 'white' }
    },
    async run(inputs, config, context) {
      const prompt = await buildCohesivePrompt({
        description: inputs.prompt,
        style: inputs.style || config.style_preset_text || undefined,
        tool: 'turnaround',
      }, context.apiKeys.openaiKey);
      const fullPrompt = prompt + ', character turnaround sheet';
      const imageUrl = await generateImageV2(config.model, fullPrompt, '2:3', context.apiKeys, context.supabase, {});
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
      model: { type: 'select', options: ['nano-banana-2', 'wavespeed-nano-ultra'], default: 'nano-banana-2' },
      blend_prompt: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      const blendInstructions = config.blend_prompt || 'blend these images together seamlessly';
      const imageUrl = await generateImageV2(config.model, blendInstructions, '1:1', context.apiKeys, context.supabase, { image_urls: [inputs.image, inputs.image2] });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'smoosh', model: config.model });
      return { image_url: imageUrl };
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
      voice: { type: 'select', options: ['Kore', 'Puck', 'Charon', 'Zephyr', 'Aoede', 'Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Autonoe', 'Callirrhoe', 'Despina', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux', 'Iapetus', 'Laomedeia', 'Leda', 'Orus', 'Pulcherrima', 'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel', 'Vindemiatrix', 'Zubenelgenubi'], default: 'Kore' },
      speed: { type: 'select', options: ['1.0', '1.15', '1.3'], default: '1.15' },
      style_instructions: { type: 'text', default: '' }
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
      duration: { type: 'select', options: ['10', '15', '20', '30', '45', '60', '90'], default: '30' },
      mood: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      const moodValue = inputs.mood || config.mood || 'upbeat instrumental';
      const result = await generateMusic(moodValue, parseInt(config.duration), context.apiKeys.FAL_KEY, context.supabase);
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
      style: { type: 'select', options: ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker'], default: 'word_pop' },
      font_size: { type: 'select', options: ['small', 'medium', 'large'], default: 'medium' },
      position: { type: 'select', options: ['bottom', 'center', 'top'], default: 'bottom' }
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
      duration: { type: 'select', options: ['30', '60', '90'], default: '60' },
      niche: { type: 'select', options: ['ai_tech_news', 'finance_money', 'motivation', 'scary_horror', 'history', 'true_crime', 'science_nature', 'relationships', 'health_fitness', 'gaming_popculture', 'conspiracy_mystery', 'business', 'food_cooking', 'travel_adventure', 'psychology', 'space_cosmos', 'animals_wildlife', 'sports', 'education', 'paranormal_ufo'], default: 'ai_tech_news' },
      tone: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      const nicheValue = inputs.niche || config.niche || 'general';
      const result = await generateScript(inputs.topic, nicheValue, parseInt(config.duration), context.apiKeys);
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
      const prompt = await buildCohesivePrompt({
        description: inputs.description,
        style: inputs.style || undefined,
      }, context.apiKeys.openaiKey);
      return { prompt };
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
  },

  // --- New node types ---

  'upscale-image': {
    id: 'upscale-image',
    label: 'Upscale Image',
    category: 'image',
    icon: '🔍',
    inputs: [
      { id: 'image', type: 'image', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      upscale_factor: { type: 'select', options: ['2', '4'], default: '2' }
    },
    async run(inputs, config, context) {
      const { request_id } = await pollFalQueue('fal-ai/topaz/upscale/image', {
        image_url: inputs.image,
        model: 'Standard V2',
        upscale_factor: parseInt(config.upscale_factor),
        face_enhancement: false
      }, context.apiKeys.FAL_KEY);
      const result = await pollFalQueue(`fal-ai/topaz/upscale/image`, null, context.apiKeys.FAL_KEY, request_id);
      const imageUrl = await uploadUrlToSupabase(result.image.url || result.output.url || result.url, context.supabase, 'media/upscaled');
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'upscale-image', model: 'topaz' });
      return { image_url: imageUrl };
    }
  },

  'video-extend': {
    id: 'video-extend',
    label: 'Video Extend',
    category: 'video',
    icon: '⏩',
    inputs: [
      { id: 'video', type: 'video', required: true },
      { id: 'prompt', type: 'string', required: false }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {
      model: { type: 'select', options: ['seedance-1.5-pro', 'veo-3.1-extend', 'grok-extend'], default: 'veo-3.1-extend' },
      duration: { type: 'select', options: ['4', '6', '8', '10'], default: '6' }
    },
    async run(inputs, config, context) {
      return { video_url: inputs.video };
    }
  },

  'video-restyle': {
    id: 'video-restyle',
    label: 'Video Restyle',
    category: 'video',
    icon: '🎭',
    inputs: [
      { id: 'video', type: 'video', required: true },
      { id: 'style_prompt', type: 'string', required: true }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { video_url: inputs.video };
    }
  },

  'linkedin-post': {
    id: 'linkedin-post',
    label: 'LinkedIn Post',
    category: 'publish',
    icon: '💼',
    inputs: [
      { id: 'text', type: 'string', required: true },
      { id: 'image', type: 'image', required: false }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { post_id: `li_placeholder_${Date.now()}` };
    }
  },

  'carousel-create': {
    id: 'carousel-create',
    label: 'Carousel Create',
    category: 'content',
    icon: '📊',
    inputs: [
      { id: 'topic', type: 'string', required: true }
    ],
    outputs: [{ id: 'carousel_id', type: 'string' }],
    configSchema: {
      platform: { type: 'select', options: ['instagram', 'linkedin', 'tiktok', 'facebook'], default: 'instagram' },
      style: { type: 'select', options: ['modern-clean', 'bold-impact', 'gradient-wave', 'minimal-zen', 'corporate-blue', 'creative-pop', 'dark-luxe', 'organic-natural'], default: 'modern-clean' }
    },
    async run(inputs, config, context) {
      return { carousel_id: `placeholder_${Date.now()}` };
    }
  },

  'ads-generate': {
    id: 'ads-generate',
    label: 'Ads Generate',
    category: 'content',
    icon: '📢',
    inputs: [
      { id: 'product_description', type: 'string', required: true }
    ],
    outputs: [{ id: 'campaign_id', type: 'string' }],
    configSchema: {
      platform: { type: 'select', options: ['linkedin', 'google', 'meta'], default: 'linkedin' },
      objective: { type: 'select', options: ['traffic', 'conversions', 'awareness', 'leads'], default: 'traffic' },
      landing_url: { type: 'text', default: '' },
      target_audience: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      return { campaign_id: `placeholder_${Date.now()}` };
    }
  },

  'shorts-create': {
    id: 'shorts-create',
    label: 'Shorts Create',
    category: 'content',
    icon: '📱',
    inputs: [
      { id: 'topic', type: 'string', required: true }
    ],
    outputs: [{ id: 'draft_id', type: 'string' }],
    configSchema: {
      niche: { type: 'select', options: ['ai_tech_news', 'finance_money', 'motivation', 'scary_horror', 'history', 'true_crime', 'science_nature', 'relationships', 'health_fitness', 'gaming_popculture', 'conspiracy_mystery', 'business', 'food_cooking', 'travel_adventure', 'psychology', 'space_cosmos', 'animals_wildlife', 'sports', 'education', 'paranormal_ufo'], default: 'ai_tech_news' },
      duration: { type: 'select', options: ['30', '45', '60', '90'], default: '60' },
      video_model: { type: 'select', options: ['kling-2.0-master', 'veo-3.1-fast', 'wan-2.5'], default: 'kling-2.0-master' }
    },
    async run(inputs, config, context) {
      return { draft_id: `placeholder_${Date.now()}` };
    }
  },

  'storyboard-create': {
    id: 'storyboard-create',
    label: 'Storyboard Create',
    category: 'content',
    icon: '🎬',
    inputs: [
      { id: 'topic', type: 'string', required: true }
    ],
    outputs: [{ id: 'storyboard_id', type: 'string' }],
    configSchema: {
      duration: { type: 'select', options: ['15', '30', '60', '90'], default: '30' },
      style: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      return { storyboard_id: `placeholder_${Date.now()}` };
    }
  },

  'image-search': {
    id: 'image-search',
    label: 'Image Search',
    category: 'input',
    icon: '🔎',
    inputs: [
      { id: 'query', type: 'string', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { image_url: '' };
    }
  },

  'text-transform': {
    id: 'text-transform',
    label: 'Text Transform',
    category: 'utility',
    icon: '🔤',
    inputs: [
      { id: 'text', type: 'string', required: true }
    ],
    outputs: [{ id: 'text', type: 'string' }],
    configSchema: {
      transform: { type: 'select', options: ['uppercase', 'lowercase', 'trim', 'extract_first_line', 'add_prefix', 'add_suffix'], default: 'trim' },
      value: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      let text = inputs.text || '';
      switch (config.transform) {
        case 'uppercase': text = text.toUpperCase(); break;
        case 'lowercase': text = text.toLowerCase(); break;
        case 'trim': text = text.trim(); break;
        case 'extract_first_line': text = text.split('\n')[0]; break;
        case 'add_prefix': text = (config.value || '') + text; break;
        case 'add_suffix': text = text + (config.value || ''); break;
      }
      return { text };
    }
  },

  'delay': {
    id: 'delay',
    label: 'Delay',
    category: 'utility',
    icon: '⏱️',
    inputs: [
      { id: 'passthrough', type: 'string', required: false }
    ],
    outputs: [{ id: 'passthrough', type: 'string' }],
    configSchema: {
      seconds: { type: 'select', options: ['5', '10', '30', '60', '120', '300'], default: '10' }
    },
    async run(inputs, config, context) {
      await new Promise(r => setTimeout(r, parseInt(config.seconds) * 1000));
      return { passthrough: inputs.passthrough || '' };
    }
  },

  'conditional': {
    id: 'conditional',
    label: 'Conditional',
    category: 'utility',
    icon: '🔀',
    inputs: [
      { id: 'value', type: 'string', required: true }
    ],
    outputs: [{ id: 'result', type: 'string' }],
    configSchema: {
      condition: { type: 'select', options: ['not_empty', 'contains', 'equals'], default: 'not_empty' },
      compare_value: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      const value = inputs.value || '';
      let conditionMet = false;
      switch (config.condition) {
        case 'not_empty': conditionMet = value.length > 0; break;
        case 'contains': conditionMet = value.includes(config.compare_value || ''); break;
        case 'equals': conditionMet = value === (config.compare_value || ''); break;
      }
      return { result: conditionMet ? value : '' };
    }
  },

  'style-preset': {
    id: 'style-preset',
    label: 'Style Preset',
    category: 'input',
    icon: '🎨',
    inputs: [],
    outputs: [{ id: 'style', type: 'string' }],
    configSchema: {
      style_key: { type: 'text', default: '' },
      style_text: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      return { style: config.style_text || '' };
    }
  },

  'video-style-preset': {
    id: 'video-style-preset',
    label: 'Video Style Preset',
    category: 'input',
    icon: '🎬',
    inputs: [],
    outputs: [{ id: 'style', type: 'string' }],
    configSchema: {
      style_key: { type: 'text', default: '' },
      style_text: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      return { style: config.style_text || '' };
    }
  },

  'prompt-template': {
    id: 'prompt-template',
    label: 'Prompt Template',
    category: 'input',
    icon: '📋',
    inputs: [],
    outputs: [{ id: 'prompt', type: 'string' }],
    configSchema: {
      template: { type: 'text', default: '' },
      label: { type: 'text', default: 'Prompt Template' }
    },
    async run(inputs, config, context) {
      return { prompt: config.template || '' };
    }
  },

  'viewer3d': {
    id: 'viewer3d',
    label: '3D Viewer',
    category: 'image',
    icon: '🧊',
    inputs: [
      { id: 'image', type: 'image', required: true }
    ],
    outputs: [{ id: 'model_url', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { model_url: `placeholder_${Date.now()}` };
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
