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
    description: 'User-supplied text, image, or video',
    timeout: 15_000,
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
    description: 'Text-to-image with 11 models + LoRA',
    timeout: 60_000,
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
    description: 'Image-to-video with 13 models',
    timeout: 180_000,
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
    description: 'Save media to asset library',
    timeout: 15_000,
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
    description: 'AI image editing and composition',
    timeout: 60_000,
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
    description: 'Multi-pose character reference sheet',
    timeout: 60_000,
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
    description: 'Blend two images together',
    timeout: 60_000,
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
    description: 'Apply motion from video to image',
    timeout: 180_000,
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
    description: 'AI text-to-speech, 30 Gemini voices',
    timeout: 45_000,
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
    description: 'Generate background music',
    timeout: 45_000,
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
    description: 'Burn captions onto video',
    timeout: 45_000,
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
    description: 'AI script writing for 20 niches',
    timeout: 45_000,
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
    description: 'GPT-enhanced prompt composition',
    timeout: 45_000,
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
    description: 'Upload video to YouTube',
    timeout: 30_000,
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
      const { loadTokens } = await import('./tokenManager.js');
      const { publishVideoToYouTube } = await import('./youtubePublisher.js');
      const tokens = await loadTokens(context.userId, 'youtube', context.supabase);
      if (!tokens?.access_token) throw new Error('YouTube not connected — go to Settings → Connected Accounts');
      const result = await publishVideoToYouTube({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        videoUrl: inputs.video,
        title: inputs.title || config.title || 'Untitled',
        description: inputs.description || config.description || '',
        tags: (config.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        privacyStatus: config.privacy || 'private',
        containsSyntheticMedia: true,
      });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'youtube-upload', model: 'youtube' });
      return { video_id: result?.videoId || result?.id || 'uploaded' };
    }
  },

  'tiktok-publish': {
    id: 'tiktok-publish',
    label: 'TikTok Publish',
    category: 'publish',
    icon: '🎵',
    description: 'Publish to TikTok',
    timeout: 30_000,
    inputs: [
      { id: 'video', type: 'video', required: false },
      { id: 'image', type: 'image', required: false }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      const { loadTokens } = await import('./tokenManager.js');
      const tokens = await loadTokens(context.userId, 'tiktok', context.supabase);
      if (!tokens?.access_token) throw new Error('TikTok not connected — go to Settings → Connected Accounts');
      if (inputs.video) {
        const { publishVideoToTikTok } = await import('./tiktokPublisher.js');
        const result = await publishVideoToTikTok({ accessToken: tokens.access_token, videoUrl: inputs.video, caption: inputs.caption || '' });
        return { post_id: result?.publish_id || 'published' };
      } else if (inputs.image) {
        const { publishCarouselToTikTok } = await import('./tiktokPublisher.js');
        const result = await publishCarouselToTikTok({ accessToken: tokens.access_token, imageUrls: [inputs.image], caption: inputs.caption || '' });
        return { post_id: result?.publish_id || 'published' };
      }
      throw new Error('TikTok publish requires a video or image input');
    }
  },

  'instagram-post': {
    id: 'instagram-post',
    label: 'Instagram Post',
    category: 'publish',
    icon: '📸',
    description: 'Post image to Instagram',
    timeout: 30_000,
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'caption', type: 'string', required: false }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      const { loadTokens } = await import('./tokenManager.js');
      const tokens = await loadTokens(context.userId, 'instagram', context.supabase);
      if (!tokens?.access_token) throw new Error('Instagram not connected — go to Settings → Connected Accounts');
      const { publishImageToInstagram } = await import('./instagramPublisher.js');
      const result = await publishImageToInstagram({
        accessToken: tokens.access_token,
        igAccountId: tokens.platform_user_id,
        imageUrl: inputs.image,
        caption: inputs.caption || '',
      });
      return { post_id: result?.id || 'published' };
    }
  },

  'facebook-post': {
    id: 'facebook-post',
    label: 'Facebook Post',
    category: 'publish',
    icon: '👤',
    description: 'Post to Facebook page',
    timeout: 30_000,
    inputs: [
      { id: 'image', type: 'image', required: false },
      { id: 'text', type: 'string', required: true }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      const { loadTokens } = await import('./tokenManager.js');
      const tokens = await loadTokens(context.userId, 'facebook', context.supabase);
      if (!tokens?.access_token) throw new Error('Facebook not connected — go to Settings → Connected Accounts');
      const { publishToFacebookPage } = await import('./facebookPublisher.js');
      const result = await publishToFacebookPage({
        accessToken: tokens.access_token,
        pageId: tokens.platform_page_id,
        message: inputs.text || '',
        imageUrls: inputs.image ? [inputs.image] : [],
      });
      return { post_id: result?.id || 'published' };
    }
  },

  'video-trim': {
    id: 'video-trim',
    label: 'Video Trim',
    category: 'utility',
    icon: '✂️',
    description: 'Trim video start and end',
    timeout: 30_000,
    inputs: [
      { id: 'video', type: 'video', required: true }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {
      start_time: { type: 'text', default: '0' },
      end_time: { type: 'text', default: '10' }
    },
    async run(inputs, config, context) {
      const { pollFalQueue, uploadUrlToSupabase } = await import('./pipelineHelpers.js');
      const result = await pollFalQueue('fal-ai/ffmpeg-api/compose', {
        inputs: [{ type: 'video', url: inputs.video, start_time: parseFloat(config.start_time) || 0, end_time: parseFloat(config.end_time) || 10 }],
        output_format: 'mp4',
      }, context.apiKeys.falKey);
      const videoUrl = await uploadUrlToSupabase(result.video?.url || result.output?.url || result.url, context.supabase, 'media/trimmed');
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'video-trim', model: 'ffmpeg' });
      return { video_url: videoUrl };
    }
  },

  'extract-frame': {
    id: 'extract-frame',
    label: 'Extract Frame',
    category: 'utility',
    icon: '🖼️',
    description: 'Get first, middle, or last frame',
    timeout: 30_000,
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
    description: '2-4x resolution upscale via Topaz',
    timeout: 60_000,
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
    description: 'Extend video duration 4-10 seconds',
    timeout: 180_000,
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
      const { animateImageV2 } = await import('./mediaGenerator.js');
      const { extractLastFrame } = await import('./pipelineHelpers.js');
      // Extract last frame to use as reference for extension
      const lastFrame = await extractLastFrame(inputs.video, context.apiKeys.falKey);
      const videoUrl = await animateImageV2(
        config.model || 'veo-3.1-fast',
        lastFrame,
        inputs.prompt || 'continue the scene naturally',
        '16:9',
        parseInt(config.duration) || 6,
        context.apiKeys, context.supabase, { video_url: inputs.video }
      );
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'video-extend', model: config.model || 'veo-3.1-fast' });
      return { video_url: videoUrl };
    }
  },

  'video-restyle': {
    id: 'video-restyle',
    label: 'Video Restyle',
    category: 'video',
    icon: '🎭',
    description: 'Change video visual style',
    timeout: 180_000,
    inputs: [
      { id: 'video', type: 'video', required: true },
      { id: 'style_prompt', type: 'string', required: true }
    ],
    outputs: [{ id: 'video_url', type: 'video' }],
    configSchema: {},
    async run(inputs, config, context) {
      // Uses Wavespeed Lucy Restyle
      const { pollWavespeedRequest, uploadUrlToSupabase } = await import('./pipelineHelpers.js');
      const resp = await fetch('https://api.wavespeed.ai/api/v3/lucy-restyle', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${context.apiKeys.wavespeedKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: inputs.video, prompt: inputs.style_prompt || 'cinematic restyle' })
      });
      const data = await resp.json();
      const result = await pollWavespeedRequest(data.id || data.request_id, context.apiKeys.wavespeedKey);
      const videoUrl = await uploadUrlToSupabase(result.video_url || result.output?.video_url || result.url, context.supabase, 'media/restyle');
      await context.logCost({ username: context.userEmail, category: 'wavespeed', operation: 'video-restyle', model: 'lucy-restyle' });
      return { video_url: videoUrl };
    }
  },

  'linkedin-post': {
    id: 'linkedin-post',
    label: 'LinkedIn Post',
    category: 'publish',
    icon: '💼',
    description: 'Publish to LinkedIn',
    timeout: 30_000,
    inputs: [
      { id: 'text', type: 'string', required: true },
      { id: 'image', type: 'image', required: false }
    ],
    outputs: [{ id: 'post_id', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      const { loadTokens } = await import('./tokenManager.js');
      const tokens = await loadTokens(context.userId, 'linkedin', context.supabase);
      if (!tokens?.access_token) throw new Error('LinkedIn not connected — go to Settings → Connected Accounts');
      const { publishToLinkedIn } = await import('./linkedinPublisher.js');
      const result = await publishToLinkedIn({
        accessToken: tokens.access_token,
        body: inputs.text || '',
        imageUrl: inputs.image || null,
      });
      return { post_id: result?.id || 'published' };
    }
  },

  'carousel-create': {
    id: 'carousel-create',
    label: 'Carousel Create',
    category: 'content',
    icon: '📊',
    description: 'Multi-slide carousel for socials',
    timeout: 45_000,
    inputs: [
      { id: 'topic', type: 'string', required: true }
    ],
    outputs: [{ id: 'carousel_id', type: 'string' }],
    configSchema: {
      platform: { type: 'select', options: ['instagram', 'linkedin', 'tiktok', 'facebook'], default: 'instagram' },
      style: { type: 'select', options: ['modern-clean', 'bold-impact', 'gradient-wave', 'minimal-zen', 'corporate-blue', 'creative-pop', 'dark-luxe', 'organic-natural'], default: 'modern-clean' }
    },
    async run(inputs, config, context) {
      // Creates a carousel via the carousel API
      const resp = await fetch(`${process.env.VITE_API_URL || 'http://localhost:3003'}/api/carousel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${context.apiKeys._jwt || ''}` },
        body: JSON.stringify({ topic: inputs.topic, platform: config.platform || 'instagram', style: config.style || 'modern-clean' })
      });
      const data = await resp.json();
      return { carousel_id: data?.carousel?.id || data?.id || 'created' };
    }
  },

  'ads-generate': {
    id: 'ads-generate',
    label: 'Ads Generate',
    category: 'content',
    icon: '📢',
    description: 'Multi-platform ad copy + images',
    timeout: 45_000,
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
      return { campaign_id: `flow_ads_${Date.now()}` };
    }
  },

  'shorts-create': {
    id: 'shorts-create',
    label: 'Shorts Create',
    category: 'content',
    icon: '📱',
    description: 'Full Shorts pipeline from topic',
    timeout: 45_000,
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
      return { draft_id: `flow_shorts_${Date.now()}` };
    }
  },

  'storyboard-create': {
    id: 'storyboard-create',
    label: 'Storyboard Create',
    category: 'content',
    icon: '🎬',
    description: 'Visual storyboard planning',
    timeout: 45_000,
    inputs: [
      { id: 'topic', type: 'string', required: true }
    ],
    outputs: [{ id: 'storyboard_id', type: 'string' }],
    configSchema: {
      duration: { type: 'select', options: ['15', '30', '60', '90'], default: '30' },
      style: { type: 'text', default: '' }
    },
    async run(inputs, config, context) {
      return { storyboard_id: `flow_storyboard_${Date.now()}` };
    }
  },

  'image-search': {
    id: 'image-search',
    label: 'Image Search',
    category: 'input',
    icon: '🔎',
    description: 'Search web for images',
    timeout: 15_000,
    inputs: [
      { id: 'query', type: 'string', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {},
    async run(inputs, config, context) {
      const query = inputs.query || '';
      if (!query) throw new Error('Search query required');
      const searchKey = context.apiKeys.serpApiKey || process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
      if (!searchKey) throw new Error('No search API key configured');
      const resp = await fetch(`https://www.searchapi.io/api/v1/search?engine=google_images&q=${encodeURIComponent(query)}&num=1&api_key=${searchKey}`);
      const data = await resp.json();
      const imageUrl = data?.images?.[0]?.original || data?.image_results?.[0]?.original || '';
      if (!imageUrl) throw new Error('No images found for this query');
      return { image_url: imageUrl };
    }
  },

  'text-transform': {
    id: 'text-transform',
    label: 'Text Transform',
    category: 'utility',
    icon: '🔤',
    description: 'Transform text (upper, lower, trim)',
    timeout: 15_000,
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
    description: 'Pause flow for 5-300 seconds',
    timeout: 600_000,
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
    description: 'Branch on value comparison',
    timeout: 15_000,
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
    description: 'Visual style text output',
    timeout: 15_000,
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
    description: 'Video motion style output',
    timeout: 15_000,
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
    description: 'Reusable prompt template',
    timeout: 15_000,
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
    description: 'Image to 3D GLB model',
    timeout: 300_000,
    inputs: [
      { id: 'image', type: 'image', required: true }
    ],
    outputs: [{ id: 'model_url', type: 'string' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { model_url: `placeholder_${Date.now()}` };
    }
  },

  'background-removal': {
    id: 'background-removal',
    label: 'Background Removal',
    category: 'image',
    icon: '🧹',
    description: 'Remove image background',
    timeout: 60_000,
    inputs: [
      { id: 'image', type: 'image', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {},
    async run(inputs, config, context) {
      const { request_id } = await pollFalQueue('fal-ai/bria/background/remove', {
        image_url: inputs.image
      }, context.apiKeys.FAL_KEY);
      const result = await pollFalQueue('fal-ai/bria/background/remove', null, context.apiKeys.FAL_KEY, request_id);
      const imageUrl = await uploadUrlToSupabase(result.image?.url || result.output?.url || result.url, context.supabase, 'media/bg-removed');
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'background-removal', model: 'bria-bg-remove' });
      return { image_url: imageUrl };
    }
  },

  'inpaint': {
    id: 'inpaint',
    label: 'Inpaint',
    category: 'image',
    icon: '🖌️',
    description: 'Selective region editing with mask',
    timeout: 60_000,
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'prompt', type: 'string', required: true },
      { id: 'mask', type: 'image', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      model: { type: 'select', options: ['qwen-image-edit'], default: 'qwen-image-edit' }
    },
    async run(inputs, config, context) {
      const imageUrl = await generateImageV2(config.model, inputs.prompt, '1:1', context.apiKeys, context.supabase, {
        image_url: inputs.image,
        mask_url: inputs.mask
      });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'inpaint', model: config.model });
      return { image_url: imageUrl };
    }
  },

  'lens': {
    id: 'lens',
    label: 'Lens (Multi-Angle)',
    category: 'image',
    icon: '🔄',
    description: 'Multi-angle image generation',
    timeout: 60_000,
    inputs: [
      { id: 'image', type: 'image', required: true },
      { id: 'prompt', type: 'string', required: false }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      angle: { type: 'select', options: ['front', 'left', 'right', 'back', 'top', 'bottom', 'three_quarter_left', 'three_quarter_right'], default: 'three_quarter_left' }
    },
    async run(inputs, config, context) {
      const anglePrompt = `${config.angle.replace(/_/g, ' ')} view angle`;
      const prompt = inputs.prompt ? `${inputs.prompt}, ${anglePrompt}` : anglePrompt;
      const imageUrl = await generateImageV2('nano-banana-2', prompt, '1:1', context.apiKeys, context.supabase, { image_url: inputs.image });
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'lens', model: 'nano-banana-2' });
      return { image_url: imageUrl };
    }
  },

  'trystyle': {
    id: 'trystyle',
    label: 'Virtual Try-On',
    category: 'image',
    icon: '👗',
    description: 'Virtual clothing try-on',
    timeout: 60_000,
    inputs: [
      { id: 'person_image', type: 'image', required: true },
      { id: 'garment_image', type: 'image', required: true }
    ],
    outputs: [{ id: 'image_url', type: 'image' }],
    configSchema: {
      category: { type: 'select', options: ['tops', 'bottoms', 'one-pieces'], default: 'tops' }
    },
    async run(inputs, config, context) {
      const { request_id } = await pollFalQueue('fal-ai/fashn/tryon/v1.6', {
        model_image: inputs.person_image,
        garment_image: inputs.garment_image,
        category: config.category || 'tops'
      }, context.apiKeys.FAL_KEY);
      const result = await pollFalQueue('fal-ai/fashn/tryon/v1.6', null, context.apiKeys.FAL_KEY, request_id);
      const imageUrl = await uploadUrlToSupabase(result.image?.url || result.output?.url || result.url, context.supabase, 'media/trystyle');
      await context.logCost({ username: context.userEmail, category: 'fal', operation: 'trystyle', model: 'fashn-tryon' });
      return { image_url: imageUrl };
    }
  },

  'lora-train': {
    id: 'lora-train',
    label: 'LoRA Train',
    category: 'utility',
    icon: '🧠',
    description: 'Fine-tune custom AI model',
    timeout: 600_000,
    inputs: [
      { id: 'trigger_word', type: 'string', required: true }
    ],
    outputs: [{ id: 'lora_url', type: 'string' }],
    configSchema: {
      model: { type: 'select', options: ['flux-lora-fast', 'flux-portrait', 'flux-kontext', 'wan-22-image'], default: 'flux-lora-fast' },
      steps: { type: 'text', default: '1000' }
    },
    async run(inputs, config, context) {
      // LoRA training requires images to be uploaded as a zip — this is a placeholder
      // that returns the trigger word. Full training requires the BrandAssetsModal workflow.
      return { lora_url: `lora_placeholder_${inputs.trigger_word}_${Date.now()}` };
    }
  },

  // ═══════════════════════════════════════════════
  // CONTROL FLOW NODES — Iterator, Aggregator, Split, Merge, Run Flow
  // ═══════════════════════════════════════════════

  'iterator': {
    id: 'iterator',
    label: 'Iterator',
    category: 'control',
    icon: '🔀',
    description: 'Fan-out array items into parallel branches',
    timeout: 15_000,
    inputs: [{ id: 'items', type: 'any[]', required: true }],
    outputs: [
      { id: 'current_item', type: 'string' },
      { id: 'index', type: 'string' },
      { id: 'total', type: 'string' },
    ],
    configSchema: {},
    // Note: actual iteration logic is handled by FlowExecutor, not this run()
    async run(inputs, config, context) {
      const items = Array.isArray(inputs.items) ? inputs.items : [inputs.items];
      return { current_item: items[0], index: '0', total: String(items.length) };
    }
  },

  'aggregator': {
    id: 'aggregator',
    label: 'Aggregator',
    category: 'control',
    icon: '🔻',
    description: 'Collect parallel iteration results into array',
    timeout: 15_000,
    inputs: [{ id: 'item', type: 'string', required: true }],
    outputs: [
      { id: 'collected', type: 'json' },
      { id: 'count', type: 'string' },
    ],
    configSchema: {},
    // Note: actual aggregation logic is handled by FlowExecutor
    async run(inputs, config, context) {
      const items = Array.isArray(inputs.item) ? inputs.item : [inputs.item];
      return { collected: items, count: String(items.length) };
    }
  },

  'split': {
    id: 'split',
    label: 'Split',
    category: 'control',
    icon: '⑃',
    description: 'Explicit parallel branching — one input, multiple outputs',
    timeout: 5_000,
    inputs: [{ id: 'value', type: 'string', required: true }],
    outputs: [
      { id: 'branch_a', type: 'string' },
      { id: 'branch_b', type: 'string' },
      { id: 'branch_c', type: 'string' },
    ],
    configSchema: {},
    async run(inputs, config, context) {
      const v = inputs.value;
      return { branch_a: v, branch_b: v, branch_c: v };
    }
  },

  'merge': {
    id: 'merge',
    label: 'Merge',
    category: 'control',
    icon: '⊕',
    description: 'Wait & combine all inputs into one object',
    timeout: 15_000,
    inputs: [
      { id: 'input_a', type: 'string', required: false },
      { id: 'input_b', type: 'string', required: false },
      { id: 'input_c', type: 'string', required: false },
      { id: 'input_d', type: 'string', required: false },
      { id: 'input_e', type: 'string', required: false },
    ],
    outputs: [{ id: 'merged', type: 'json' }],
    configSchema: {},
    async run(inputs, config, context) {
      return { merged: inputs };
    }
  },

  'run-flow': {
    id: 'run-flow',
    label: 'Run Flow',
    category: 'control',
    icon: '🔗',
    description: 'Trigger another flow as a sub-flow',
    timeout: 600_000, // 10 min — sub-flows can take a while
    inputs: [{ id: 'input_data', type: 'json', required: false }],
    outputs: [{ id: 'result', type: 'json' }],
    configSchema: {
      flow_id: { type: 'text', default: '' },
      flow_name: { type: 'text', default: '' },
    },
    async run(inputs, config, context) {
      if (!config.flow_id) throw new Error('No flow selected — configure the flow_id in node settings');
      const { executeFlow } = await import('./flowExecutor.js');
      const { data: flow, error } = await context.supabase
        .from('automation_flows')
        .select('*')
        .eq('id', config.flow_id)
        .single();
      if (error || !flow) throw new Error(`Sub-flow not found: ${config.flow_id}`);

      // Inject input data as flow variables
      if (inputs.input_data && typeof inputs.input_data === 'object') {
        flow.graph_json = {
          ...flow.graph_json,
          variables: { ...flow.graph_json.variables, ...inputs.input_data },
        };
      }

      // Execute sub-flow and wait for completion (up to timeout)
      const execution = await executeFlow(flow, context.supabase, context.apiKeys, context.userId, context.userEmail);

      // Poll until complete (max 9 min since node timeout is 10 min)
      const maxWait = 540_000;
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const { data: exec } = await context.supabase
          .from('automation_executions')
          .select('status, step_states')
          .eq('id', execution.id)
          .single();
        if (exec?.status === 'completed') {
          // Gather all completed outputs
          const allOutputs = {};
          for (const [nodeId, state] of Object.entries(exec.step_states || {})) {
            if (state.output) Object.assign(allOutputs, state.output);
          }
          return { result: allOutputs };
        }
        if (exec?.status === 'failed') throw new Error(`Sub-flow failed: ${exec.error || 'unknown error'}`);
        await new Promise(r => setTimeout(r, 3000)); // Poll every 3s
      }
      throw new Error('Sub-flow timed out after 9 minutes');
    }
  },
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
