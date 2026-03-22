/**
 * Frontend-compatible visual style presets.
 * Mirrors api/lib/visualStyles.js — keep in sync when adding new styles.
 */

export const VISUAL_STYLES = [
  { key: 'pixel_art', label: 'Pixel Art', category: 'illustration', thumb: '/assets/styles/pixel_art.jpg', description: 'Retro 16-bit game aesthetic with clean pixel edges and vibrant limited palettes' },
  { key: 'studio_ghibli', label: 'Studio Ghibli', category: 'illustration', thumb: '/assets/styles/studio_ghibli.jpg', description: 'Soft watercolor anime with lush backgrounds and warm, whimsical atmosphere' },
  { key: 'disney_pixar', label: 'Disney Pixar', category: 'illustration', thumb: '/assets/styles/disney_pixar.jpg', description: 'Polished 3D animation with expressive characters and vibrant cinematic lighting' },
  { key: 'cartoon', label: 'Cartoon', category: 'illustration', thumb: '/assets/styles/cartoon.jpg', description: 'Bold outlines with flat vivid colors and playful exaggerated proportions' },
  { key: '8bit_retro', label: '8-bit Retro', category: 'illustration', thumb: '/assets/styles/8bit_retro.jpg', description: 'Chunky NES-era pixels with limited color palette and classic game nostalgia' },
  { key: 'manga', label: 'Manga', category: 'illustration', thumb: '/assets/styles/manga.jpg', description: 'Black and white ink with screentone shading, speed lines, and dynamic composition' },
  { key: 'comic_book', label: 'Comic Book', category: 'illustration', thumb: '/assets/styles/comic_book.jpg', description: 'Bold outlines with halftone dots, vivid pop art colors, and dynamic action poses' },
  { key: 'pixar_3d', label: 'Pixar 3D', category: 'illustration', thumb: '/assets/styles/pixar_3d.jpg', description: 'Smooth CGI rendering with warm studio lighting and appealing character design' },
  { key: 'photorealistic', label: 'Photorealistic', category: 'realistic', thumb: '/assets/styles/photorealistic.jpg', description: 'High-resolution photography with natural lighting and sharp realistic detail' },
  { key: 'cinematic_photo', label: 'Cinematic Photography', category: 'realistic', thumb: '/assets/styles/cinematic_photo.jpg', description: 'Dramatic moody lighting with shallow depth of field and teal-orange color grade' },
  { key: 'documentary_photo', label: 'Documentary Photography', category: 'realistic', thumb: '/assets/styles/documentary_photo.jpg', description: 'Candid natural-light photography with muted tones and journalistic framing' },
  { key: 'watercolor', label: 'Watercolor', category: 'painting', thumb: '/assets/styles/watercolor.jpg', description: 'Soft wet-on-wet washes with translucent pigments and visible paper texture' },
  { key: 'oil_painting', label: 'Oil Painting', category: 'painting', thumb: '/assets/styles/oil_painting.jpg', description: 'Rich impasto brushstrokes with deep saturated colors and classical composition' },
  { key: 'impressionist', label: 'Impressionist', category: 'painting', thumb: '/assets/styles/impressionist.jpg', description: 'Loose brushstrokes with dappled light effects and vibrant broken color' },
];

export const VISUAL_STYLE_CATEGORIES = [
  { key: 'illustration', label: 'Illustration' },
  { key: 'realistic', label: 'Realistic' },
  { key: 'painting', label: 'Painting' },
];
