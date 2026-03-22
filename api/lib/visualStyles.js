/**
 * Visual Styles — controls image aesthetic.
 * prompt_suffix appended to image generation prompts.
 * image_strategy determines frame-chaining vs fresh-per-scene.
 */

export const VISUAL_STYLES = {
  pixel_art: {
    label: 'Pixel Art',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Retro 16-bit game aesthetic with clean pixel edges and vibrant limited palettes',
    thumb: '/assets/styles/pixel_art.jpg',
    prompt_suffix: 'pixel art style, retro 16-bit aesthetic, clean pixel edges, vibrant limited color palette, nostalgic video game visual style',
  },
  studio_ghibli: {
    label: 'Studio Ghibli',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Soft watercolor anime with lush backgrounds and warm, whimsical atmosphere',
    thumb: '/assets/styles/studio_ghibli.jpg',
    prompt_suffix: 'Studio Ghibli anime style, soft watercolor textures, lush detailed backgrounds, gentle warm lighting, whimsical atmospheric perspective, hand-painted feel',
  },
  disney_pixar: {
    label: 'Disney Pixar',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Polished 3D animation with expressive characters and vibrant cinematic lighting',
    thumb: '/assets/styles/disney_pixar.jpg',
    prompt_suffix: 'Disney Pixar 3D animation style, expressive cartoon characters, vibrant saturated colors, polished render quality, warm cinematic lighting, family-friendly aesthetic',
  },
  cartoon: {
    label: 'Cartoon',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Bold outlines with flat vivid colors and playful exaggerated proportions',
    thumb: '/assets/styles/cartoon.jpg',
    prompt_suffix: 'cartoon illustration style, bold clean outlines, flat vivid colors, exaggerated proportions, playful expressive characters',
  },
  '8bit_retro': {
    label: '8-bit Retro',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Chunky NES-era pixels with limited color palette and classic game nostalgia',
    thumb: '/assets/styles/8bit_retro.jpg',
    prompt_suffix: '8-bit retro game art style, chunky pixels, limited NES color palette, nostalgic classic video game aesthetic',
  },
  manga: {
    label: 'Manga',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Black and white ink with screentone shading, speed lines, and dynamic composition',
    thumb: '/assets/styles/manga.jpg',
    prompt_suffix: 'manga illustration style, black and white ink with screentone shading, dramatic speed lines, expressive manga eyes, dynamic panel composition, Japanese comic art',
  },
  comic_book: {
    label: 'Comic Book',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Bold outlines with halftone dots, vivid pop art colors, and dynamic action poses',
    thumb: '/assets/styles/comic_book.jpg',
    prompt_suffix: 'comic book illustration, bold black outlines, halftone dot shading, vivid pop art colors, dynamic action composition, speech bubble aesthetic, Ben-Day dots',
  },
  pixar_3d: {
    label: 'Pixar 3D',
    category: 'illustration',
    image_strategy: 'fresh_per_scene',
    description: 'Smooth CGI rendering with warm studio lighting and appealing character design',
    thumb: '/assets/styles/pixar_3d.jpg',
    prompt_suffix: '3D Pixar-style rendering, smooth plastic-like character surfaces, subsurface scattering skin, warm studio lighting, polished CGI quality, appealing character design',
  },
  photorealistic: {
    label: 'Photorealistic',
    category: 'realistic',
    image_strategy: 'frame_chain',
    description: 'High-resolution photography with natural lighting and sharp realistic detail',
    thumb: '/assets/styles/photorealistic.jpg',
    prompt_suffix: 'photorealistic, high resolution photograph, natural lighting, sharp detail, realistic textures and materials',
  },
  cinematic_photo: {
    label: 'Cinematic Photography',
    category: 'realistic',
    image_strategy: 'frame_chain',
    description: 'Dramatic moody lighting with shallow depth of field and teal-orange color grade',
    thumb: '/assets/styles/cinematic_photo.jpg',
    prompt_suffix: 'cinematic photography, anamorphic lens, dramatic moody lighting, shallow depth of field, teal and orange color grade, film grain, high production value',
  },
  documentary_photo: {
    label: 'Documentary Photography',
    category: 'realistic',
    image_strategy: 'frame_chain',
    description: 'Candid natural-light photography with muted tones and journalistic framing',
    thumb: '/assets/styles/documentary_photo.jpg',
    prompt_suffix: 'documentary photography, candid real moment, available natural light, slight film grain, desaturated muted tones, journalistic framing, honest unposed composition',
  },
  watercolor: {
    label: 'Watercolor',
    category: 'painting',
    image_strategy: 'fresh_per_scene',
    description: 'Soft wet-on-wet washes with translucent pigments and visible paper texture',
    thumb: '/assets/styles/watercolor.jpg',
    prompt_suffix: 'watercolor painting style, soft wet-on-wet washes, translucent layered pigments, visible paper texture, organic bleeding edges, delicate brushwork',
  },
  oil_painting: {
    label: 'Oil Painting',
    category: 'painting',
    image_strategy: 'fresh_per_scene',
    description: 'Rich impasto brushstrokes with deep saturated colors and classical composition',
    thumb: '/assets/styles/oil_painting.jpg',
    prompt_suffix: 'oil painting style, rich impasto brushstrokes, visible canvas texture, deep saturated colors, classical fine art composition, painterly quality',
  },
  impressionist: {
    label: 'Impressionist',
    category: 'painting',
    image_strategy: 'fresh_per_scene',
    description: 'Loose brushstrokes with dappled light effects and vibrant broken color',
    thumb: '/assets/styles/impressionist.jpg',
    prompt_suffix: 'impressionist painting style, loose visible brushstrokes, dappled light effects, vibrant broken color, en plein air aesthetic, Monet-inspired atmospheric quality',
  },
};

export function getVisualStyleSuffix(key) {
  if (!key || !VISUAL_STYLES[key]) return '';
  return `, ${VISUAL_STYLES[key].prompt_suffix}`;
}

export function getImageStrategy(key) {
  if (!key || !VISUAL_STYLES[key]) return 'frame_chain';
  return VISUAL_STYLES[key].image_strategy;
}

export function listVisualStyles() {
  return Object.entries(VISUAL_STYLES).map(([key, v]) => ({
    key,
    label: v.label,
    category: v.category,
    image_strategy: v.image_strategy,
  }));
}
