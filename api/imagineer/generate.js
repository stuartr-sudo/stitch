/**
 * Imagineer - AI Image Generation API
 * Supports Nano Banana 2 (via fal.ai) and Flux 2 (LoRA)
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { writeMediaMetadata } from '../lib/mediaMetadata.js';
import { createClient } from '@supabase/supabase-js';

const STYLE_PROMPTS = {
  // UGC & Social Media
  'iphone-selfie': 'raw smartphone selfie photo, front-facing camera, smartphone quality, natural ambient lighting, authentic candid moment, realistic skin texture, unfiltered unedited look, genuine expression, slight motion blur, casual pose',
  'ugc-testimonial': 'user generated content photo, authentic testimonial shot, real person, genuine emotion, casual setting, believable and relatable, natural lighting, unposed candid moment',
  'tiktok-style': 'TikTok photo aesthetic, vertical format feel, trendy and engaging, bright natural lighting, relatable content creator vibe, casual but stylish, authentic social media',
  'instagram-candid': 'Instagram candid photo, casual but aesthetic, natural lighting, authentic moment, lifestyle photography, slightly edited but realistic, genuine expression',
  'facetime-screenshot': 'video call screenshot aesthetic, video call quality, slightly pixelated, casual conversation pose, webcam lighting, authentic remote communication feel, casual home background',
  'mirror-selfie': 'mirror selfie photo, bathroom or bedroom mirror, phone visible in reflection, casual outfit check pose, natural home lighting, authentic daily moment',
  'car-selfie': 'car selfie photo, steering wheel or window visible, natural daylight through windows, casual seated pose, authentic commute moment, smartphone quality',
  'gym-selfie': 'gym selfie photo, fitness setting, workout attire, slight sweat, motivated expression, gym mirror or equipment visible, authentic fitness moment, energetic',
  'golden-hour-selfie': 'golden hour selfie, warm sunset lighting, soft orange and pink tones, glowing skin, romantic natural light, outdoor setting, dreamy but authentic',
  'casual-snapshot': 'casual snapshot photo, candid unposed moment, natural lighting, everyday setting, authentic slice of life, slightly imperfect framing, genuine moment captured',
  // Photography
  'photorealistic': 'photorealistic photograph, ultra-detailed, high-resolution, sharp focus, realistic lighting and shadows, lifelike textures, natural colors, DSLR quality',
  'hyperrealistic': 'hyperrealistic digital image, extreme detail, 8K resolution, perfectly sharp, photographic precision, indistinguishable from real photograph, perfect textures',
  'cinematic': 'cinematic still frame, anamorphic lens, film-like color grading, shallow depth of field, dramatic lighting, movie-quality composition, widescreen framing',
  'documentary': 'documentary photography style, candid and authentic, natural lighting, journalistic framing, raw and unposed, real-world setting, gritty realism',
  'fashion-photography': 'high-end fashion photography, editorial quality, studio or location lighting, stylish composition, professional model poses, luxury aesthetic, high-fashion editorial magazine style',
  'portrait-photography': 'professional portrait photography, shallow depth of field, soft bokeh background, flattering lighting, sharp subject focus, natural skin tones, studio quality',
  'product-photography': 'commercial product photography, clean studio lighting, sharp detail, professional composition, minimalist background, advertising quality, perfect exposure',
  'street-photography': 'street photography style, candid urban moments, natural light, documentary feel, dynamic composition, decisive moment, authentic city life',
  'macro-photography': 'extreme macro photography, incredible detail at microscopic level, shallow depth of field, vivid textures, scientific precision, super close-up',
  'film-grain': 'analog film photograph, visible grain texture, warm film emulsion color tones, soft color shifts, slightly faded, nostalgic vintage feel, light leaks',
  'polaroid': 'instant print photograph, characteristic white border, slightly washed-out colors, soft focus, vintage feel, nostalgic and warm, lo-fi charm',
  // Painting
  'oil-painting': 'classical oil painting, rich textured brushstrokes, layered glazing technique, dramatic chiaroscuro lighting, Old Master quality, canvas texture visible',
  'watercolor': 'soft watercolor painting, flowing translucent washes, wet-on-wet blending, gentle color bleeding, paper texture visible, delicate and luminous',
  'acrylic': 'vibrant acrylic painting, bold opaque colors, visible brush texture, modern contemporary feel, dynamic color mixing, gallery-quality artwork',
  'gouache': 'gouache illustration, flat opaque colors, matte finish, vintage poster aesthetic, clean edges with soft gradients, mid-century illustration style',
  'pastel': 'soft pastel drawing, chalky texture, blended gradients, gentle luminous colors, fine art quality, impressionistic softness, textured paper surface',
  'charcoal': 'dramatic charcoal drawing, deep rich blacks, expressive smudged strokes, high contrast, fine art quality, textured paper, powerful and moody',
  'pencil-sketch': 'detailed pencil sketch, precise line work, cross-hatching shading, graphite on paper, fine art quality, realistic proportions, hand-drawn feel',
  'ink-wash': 'traditional ink wash painting, flowing sumi-e brushwork, monochrome tonal gradients, zen simplicity, East Asian aesthetic, meditative quality',
  'impasto': 'thick impasto painting, heavy textured brushstrokes, sculptural paint application, vivid colors, three-dimensional texture, swirling expressive post-impressionist brushwork',
  // Art Movements
  'impressionism': 'Impressionist painting style, visible dappled brushstrokes, light-filled scenes, soft focus, vibrant broken color palette capturing fleeting light, plein air atmosphere, luminous quality',
  'expressionism': 'Expressionist artwork, intense emotional colors, distorted forms, bold brushwork, raw feeling and energy, psychological depth, vibrant and jarring',
  'surrealism': 'Surrealist artwork, dreamlike impossible scenes, melting distorted forms, unexpected juxtapositions, subconscious imagery rendered with photographic precision, hyper-detailed impossible reality',
  'cubism': 'Cubist artwork, fragmented geometric forms, multiple viewpoints simultaneously, angular abstraction, bold flat colors, faceted planes and deconstructed perspective',
  'art-nouveau': 'Art Nouveau style, flowing organic curves, ornate decorative borders, nature-inspired motifs, elegant poster-style compositions with sinuous lines, flat decorative color fills and intricate botanical ornamentation',
  'art-deco': 'Art Deco style, geometric symmetry, metallic gold accents, luxury glamour, 1920s elegance, bold angular shapes, streamlined sophistication',
  'baroque': 'Baroque painting style, dramatic theatrical lighting, rich deep colors, ornate grandeur, extreme chiaroscuro with figures emerging from deep shadow into intense light, opulent and dynamic composition',
  'renaissance': 'Renaissance masterpiece style, perfect proportions, sfumato smoky atmospheric blending technique, classical beauty, meticulous observational precision, harmonious composition, timeless elegance',
  'pop-art': 'bold Pop Art style, Ben-Day halftone dots, flat vivid colors, comic-inspired outlines, repeated mass-culture imagery with screen-printed color separations, high contrast graphic style',
  'abstract': 'abstract expressionist artwork, non-representational forms, emotional color relationships, gestural marks, dynamic composition with geometric spiritual symbolism, pure visual expression',
  'minimalist': 'minimalist artwork, clean simple forms, limited color palette, negative space, essential geometry, calm and restrained, less is more aesthetic',
  'brutalist': 'brutalist aesthetic, raw concrete textures, imposing geometric forms, stark and unadorned, industrial atmosphere, harsh lighting, monumental scale',
  // Digital & Modern
  'digital-art': 'professional digital art, polished rendering, vibrant colors, detailed textures, concept art quality, digital painting technique, modern illustration',
  '3d-render': 'photorealistic 3D render, ray-traced lighting, subsurface scattering, clean geometry, studio HDRI lighting, high-end 3D software quality, volumetric atmosphere',
  'cgi': 'high-end CGI/VFX quality, photorealistic rendering, cinematic lighting, Hollywood production value, perfectly composited, visual effects masterpiece',
  'concept-art': 'professional concept art, painterly digital technique, atmospheric mood, narrative composition, triple-A game and film studio quality, environmental storytelling',
  'matte-painting': 'cinematic matte painting, epic scale environment, photorealistic integration, atmospheric depth, film industry quality, panoramic vista',
  'vaporwave': 'vaporwave aesthetic, pink and cyan gradients, retro 90s nostalgia, Greek marble statues, glitched elements, digital sunset, Japanese text overlay feel',
  'synthwave': 'retro-futuristic synthwave, neon grid landscape, chrome reflections, sunset gradient sky, 80s retrowave aesthetic, laser lines, digital paradise',
  'cyberpunk': 'cyberpunk aesthetic, neon-lit rain-soaked streets, holographic advertisements, augmented reality overlays, neon-lit dystopian megacity atmosphere, high-tech low-life',
  'steampunk': 'Victorian steampunk style, brass gears and clockwork, steam-powered machinery, copper pipe details, goggles and top hats, industrial revolution fantasy',
  'dieselpunk': 'dieselpunk aesthetic, 1940s retro-futurism, heavy industrial machinery, art deco war machines, diesel-powered technology, noir atmosphere',
  'glitch-art': 'digital glitch art, data corruption artifacts, chromatic aberration, pixel sorting, scan lines, broken digital aesthetic, VHS distortion',
  'low-poly': 'low-poly 3D art style, geometric faceted surfaces, limited polygon count, stylized simplicity, vibrant flat-shaded colors, modern game aesthetic',
  'isometric': 'isometric 3D illustration, precise geometric perspective, clean vector style, detailed miniature world, pixel-perfect alignment, architectural precision',
  // Animation
  'anime': 'anime illustration style, vibrant saturated colors, cel-shaded rendering, large expressive eyes, dynamic action poses, Japanese animation aesthetic, clean line art',
  'manga': 'Japanese manga illustration, detailed black and white line art, screentone shading, dramatic panel composition, expressive character design, serialized comic style',
  'cartoon': 'bold cartoon style, exaggerated proportions and expressions, vibrant primary colors, clean outlines, fun and playful energy, animated character design',
  'comic-book': 'American comic book art, bold ink outlines, halftone dot shading, dynamic action composition, superhero aesthetic, speech bubble style, professional superhero comic quality',
  'pixel-art': 'retro pixel art, carefully placed individual pixels, limited 16-bit color palette, nostalgic video game aesthetic, clean crisp edges, sprite art quality',
  '8-bit': '8-bit retro game style, chunky pixel graphics, early home console color palette, nostalgic arcade aesthetic, chiptune era visual style, classic gaming',
  'disney': 'classic hand-drawn 2D animation style, enchanting and magical, appealing rounded character design, lush painted backgrounds, whimsical fairy-tale atmosphere, polished family-friendly aesthetic',
  'pixar': 'high-end studio 3D animation style, smooth subsurface skin shading, expressive appealing character design, warm color palette, emotional storytelling, cinematic render quality',
  'ghibli': 'Japanese hand-drawn animation style, soft watercolor-like painted backgrounds, gentle pastel palette, whimsical natural settings, hand-drawn warmth, lush organic environments with a sense of wonder',
  'claymation': 'claymation stop-motion style, visible clay texture and fingerprints, rounded organic forms, warm tactile quality, British stop-motion character design with expressive wide mouths',
  // Specialized
  'fantasy-art': 'epic fantasy artwork, magical glowing elements, mythical creatures, enchanted landscapes, otherworldly atmosphere, detailed fantasy illustration, sword and sorcery',
  'sci-fi-art': 'science fiction concept art, futuristic technology, alien worlds, space exploration themes, hard sci-fi precision, advanced civilization, cosmic scale',
  'horror': 'dark horror artwork, unsettling atmospheric tension, grotesque details, muted desaturated palette, ominous shadows, visceral unease, psychological dread',
  'storybook': 'children\'s storybook illustration, charming hand-drawn style, warm inviting colors, whimsical character design, gentle narrative scenes, picture book quality',
  'vintage-poster': 'vintage advertising poster, bold graphic design, limited color screen-print, retro typography, mid-century commercial art, propaganda poster aesthetic',
  'propaganda-poster': 'Soviet-style propaganda poster, bold flat colors, heroic worker figure, strong geometric composition, political message style, constructivist design',
  'ukiyo-e': 'Japanese ukiyo-e woodblock print, flat color areas, bold outlines, wave and nature motifs, dramatic cresting ocean waves, Edo period aesthetic, traditional woodblock printing technique',
  'chinese-ink': 'traditional Chinese ink painting, flowing calligraphic brushwork, mountain and water landscapes, philosophical emptiness, Shanshui aesthetic, meditative harmony',
  // Kids & Cartoon
  'bluey-style': 'soft 2D kids cartoon animation, thin clean outlines, pastel flat colors, rounded friendly animal characters, warm suburban Australian setting, gentle and cheerful family-friendly style',
  'puffin-rock': 'soft textured nature illustration, muted warm earthy tones, gentle organic shapes, wildflowers and natural coastal settings, delicate 2D illustration with felt-like texture and quiet charm',
  'preschool-cartoon': 'bright colorful preschool cartoon, chunky rounded characters, simple flat shapes, vibrant primary colors, friendly and educational, simple 2D animation with clean vector lines',
  'kids-educational': 'colorful kids educational cartoon, bright classroom setting, friendly characters, simple clean 2D animation, engaging and cheerful, warm inviting colors',
  'kids-3d-pixar': '3D rendered kids animation, soft warm lighting, cute rounded characters with big eyes, smooth subsurface shading, bright cheerful nursery-rhyme aesthetic, adorable and heartwarming',
  'simpsons-style': 'classic American adult animated sitcom style, yellow skin characters, overbite expressions, simple flat colors, clean outlines, satirical suburban family cartoon aesthetic',
  'family-guy-style': 'adult animated sitcom style, thin clean outlines, flat simple colors, round soft character design with prominent chins and small noses, casual everyday scene, muted warm palette, American cartoon comedy aesthetic',
  'candy-city-3d': 'whimsical 3D candy-colored world, pastel buildings, pink puffy clouds, vibrant saturated toylike aesthetic, playful 3D animation, fantastical colorful environment',
  '3d-character-art': 'stylized 3D character design, big expressive eyes, detailed unique outfits, colorful backgrounds, modern 3D kids character art, vibrant personality',
  'puppet-show': 'puppet show style, felt and fabric textures, handcrafted look, warm lighting, educational puppet theater aesthetic with colorful foam characters, tactile and cozy',
  'paper-craft': 'paper craft collage style, layered construction paper textures, handmade cut-out aesthetic, bold tissue paper and painted collage technique, colorful and tactile children\'s illustration',
  'whiteboard-animation': 'whiteboard animation style, hand-drawn marker illustrations, clean white background, educational explainer aesthetic, simple and clear',
  'motion-graphics': 'motion graphics style, flat design, bold geometric shapes, bright pop colors, clean 2D vector illustration, animated infographic aesthetic',
};

// Nano Banana 2 valid aspect ratios
const VALID_ASPECT_RATIOS = ['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, style, dimensions = '16:9', model = 'nano-banana-2' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Imagineer] Model:', model, '| Style:', style);

    let enhancedPrompt = prompt;
    if (style && STYLE_PROMPTS[style]) {
      enhancedPrompt = `${prompt}, ${STYLE_PROMPTS[style]}`;
    } else if (style) {
      enhancedPrompt = `${prompt}, ${style.replace(/-/g, ' ')} style`;
    }

    console.log('[Imagineer] Enhanced prompt:', enhancedPrompt.substring(0, 120) + '...');

    if (model === 'fal-flux') {
      return handleFalFlux(req, res, enhancedPrompt, dimensions, req.body.loraUrl);
    }
    if (model === 'seedream') {
      return handleSeedream(req, res, enhancedPrompt, dimensions);
    }
    return handleNanoBanana2(req, res, enhancedPrompt, dimensions);
  } catch (error) {
    console.error('[Imagineer] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleNanoBanana2(req, res, enhancedPrompt, dimensions) {
  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'Fal.ai API key not configured. Please add it in API Keys settings.' });
  }

  const aspectRatio = VALID_ASPECT_RATIOS.includes(dimensions) ? dimensions : 'auto';

  const response = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      aspect_ratio: aspectRatio,
      resolution: '1K',
      num_images: 1,
      output_format: 'png',
      safety_tolerance: '4',
      limit_generations: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Imagineer/NanoBanana2] API Error:', errorText);
    return res.status(response.status).json({ error: 'Nano Banana 2 API error', details: errorText });
  }

  const data = await response.json();
  console.log('[Imagineer/NanoBanana2] Queue response:', JSON.stringify(data).substring(0, 300));

  if (data.images?.[0]?.url) {
    const imageUrl = data.images[0].url;
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, imageUrl, {
      model_name: 'nano-banana-2',
      visual_style: req.body.style || null,
    });
    return res.status(200).json({ success: true, imageUrl, status: 'completed' });
  }

  const requestId = data.request_id;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId,
      model: 'nano-banana-2',
      status: data.status || 'IN_QUEUE',
      statusUrl: data.status_url || null,
      responseUrl: data.response_url || null,
      pollEndpoint: '/api/imagineer/result',
    });
  }

  return res.status(500).json({ error: 'Unexpected Nano Banana 2 response format' });
}

async function handleSeedream(req, res, enhancedPrompt, dimensions) {
  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'Fal.ai API key not configured. Please add it in API Keys settings.' });
  }

  // Map aspect ratio to pixel dimensions
  const sizeMap = {
    '16:9': { width: 1344, height: 768 },
    '9:16': { width: 768, height: 1344 },
    '1:1': { width: 1024, height: 1024 },
    '4:3': { width: 1152, height: 896 },
    '3:4': { width: 896, height: 1152 },
  };
  const size = sizeMap[dimensions] || sizeMap['16:9'];

  const response = await fetch('https://queue.fal.run/fal-ai/bytedance/seedream/v4/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      num_images: 1,
      width: size.width,
      height: size.height,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Imagineer/Seedream] API Error:', errorText);
    return res.status(response.status).json({ error: 'Seedream API error', details: errorText });
  }

  const data = await response.json();
  console.log('[Imagineer/Seedream] Queue response:', JSON.stringify(data).substring(0, 300));

  if (data.images?.[0]?.url) {
    const imageUrl = data.images[0].url;
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, imageUrl, {
      model_name: 'seedream',
      visual_style: req.body.style || null,
    });
    return res.status(200).json({ success: true, imageUrl, status: 'completed' });
  }

  const requestId = data.request_id;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId,
      model: 'seedream',
      status: data.status || 'IN_QUEUE',
      statusUrl: data.status_url || null,
      responseUrl: data.response_url || null,
      pollEndpoint: '/api/imagineer/result',
    });
  }

  return res.status(500).json({ error: 'Unexpected Seedream response format' });
}

async function handleFalFlux(req, res, enhancedPrompt, dimensions, loraUrl) {
  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) return res.status(400).json({ error: 'Fal.ai key not configured.' });

  const sizeMap = {
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '1:1': 'square_hd',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3'
  };

  const payload = {
    prompt: enhancedPrompt,
    image_size: sizeMap[dimensions] || 'landscape_16_9',
    num_images: 1
  };

  // Support both single loraUrl (legacy) and loras array (stacking)
  const lorasFromBody = req.body.loras; // [{ url, scale }]
  if (lorasFromBody?.length) {
    payload.loras = lorasFromBody.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
  } else if (loraUrl) {
    payload.loras = [{ path: loraUrl, scale: 1 }];
  }

  const response = await fetch('https://queue.fal.run/fal-ai/flux-2/lora', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'Flux API error', details: errorText });
  }

  const data = await response.json();
  
  if (data.images?.[0]?.url) {
    const imageUrl = data.images[0].url;
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, imageUrl, {
      model_name: 'fal-flux',
      visual_style: req.body.style || null,
    });
    return res.status(200).json({ success: true, imageUrl, status: 'completed' });
  }

  if (data.request_id) {
    return res.status(200).json({
      success: true,
      requestId: data.request_id,
      model: 'fal-flux',
      status: 'processing',
      pollEndpoint: '/api/imagineer/result',
    });
  }

  return res.status(500).json({ error: 'Unexpected Flux response' });
}
