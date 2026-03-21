export const IMAGE_MODELS = [
  { value: 'wavespeed', label: 'Wavespeed', strength: 'Fastest', price: '~$0.01/img', lora: false },
  { value: 'fal_seedream', label: 'SeedDream', strength: 'Photorealistic', price: '~$0.02/img', lora: false },
  { value: 'fal_flux', label: 'FLUX 2 Dev', strength: 'Creative, versatile, LoRA', price: '$0.035/img', lora: true },
  { value: 'fal_imagen4', label: 'Imagen 4', strength: "Google's best quality", price: '$0.04/img', lora: false },
  { value: 'fal_kling_img', label: 'Kling Image V3', strength: 'Consistent photorealism', price: '$0.028/img', lora: false },
  { value: 'fal_grok', label: 'Grok Imagine', strength: 'Highly aesthetic', price: '$0.02/img', lora: false },
  { value: 'fal_ideogram', label: 'Ideogram V2', strength: 'Best text/typography', price: '~$0.04/img', lora: false },
];

export const VIDEO_MODELS = [
  { value: 'wavespeed_wan', label: 'Wavespeed WAN', strength: 'Fastest, budget-friendly', price: '~$0.10/vid' },
  { value: 'fal_kling', label: 'Kling 2.0 Master', strength: 'Realistic motion', price: '$0.28/sec' },
  { value: 'fal_hailuo', label: 'Hailuo (MiniMax)', strength: 'Cinematic', price: '$0.50/vid' },
  { value: 'fal_veo3', label: 'Veo 3 (Google)', strength: 'Best quality + audio', price: '$0.15/sec' },
  { value: 'fal_veo2', label: 'Veo 2 (Google)', strength: 'Excellent realism', price: '$0.50/sec' },
  { value: 'fal_kling_v3', label: 'Kling V3 Pro', strength: 'Latest Kling + audio', price: '$0.28/sec' },
  { value: 'fal_kling_o3', label: 'Kling O3 Pro', strength: 'Start+end frame control', price: '$0.28/sec' },
  { value: 'fal_wan25', label: 'Wan 2.5 Preview', strength: 'Good quality, cheap', price: '$0.05/sec' },
  { value: 'fal_wan_pro', label: 'Wan Pro', strength: 'Premium WAN, 1080p', price: '$0.80/vid' },
  { value: 'fal_pixverse', label: 'PixVerse V4.5', strength: 'Great value', price: '$0.05/seg' },
];
