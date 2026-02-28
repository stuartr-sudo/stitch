/**
 * Run once: node api/lora/seed-library.js
 *
 * Seeds the lora_library table with curated HuggingFace LoRAs.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const CURATED_LORAS = [
  {
    name: 'White Background Product',
    slug: 'white-bg-product',
    category: 'product',
    hf_repo_id: 'gokaygokay/Flux-White-Background-LoRA',
    default_scale: 0.8,
    recommended_trigger_word: 'white background product photography',
    description: 'Clean white background for e-commerce product shots. Best for catalog images.',
    is_featured: true,
    sort_order: 10,
  },
  {
    name: 'Multi-Angle Product',
    slug: 'multi-angle',
    category: 'product',
    hf_repo_id: 'lovis93/Flux-2-Multi-Angles-LoRA-v2',
    default_scale: 0.8,
    recommended_trigger_word: 'multi-angle product view',
    description: 'Generate consistent product shots from multiple angles. Great for catalogs.',
    is_featured: true,
    sort_order: 20,
  },
  {
    name: 'Epic Realism',
    slug: 'epic-realism',
    category: 'realism',
    hf_repo_id: 'prithivMLmods/Ton618-Epic-Realism-Flux-LoRA',
    default_scale: 0.7,
    description: 'Photorealistic, hyperdetailed output. Makes AI images look indistinguishable from real photos.',
    is_featured: true,
    sort_order: 30,
  },
  {
    name: 'Film Noir',
    slug: 'film-noir',
    category: 'style',
    hf_repo_id: 'dvyio/flux-lora-film-noir',
    default_scale: 0.8,
    description: 'Classic film noir aesthetic with dramatic shadows and high contrast.',
    sort_order: 40,
  },
  {
    name: 'Oil Painting',
    slug: 'oil-painting',
    category: 'style',
    hf_repo_id: 'dtthanh/flux_oil_painting_lora',
    default_scale: 0.7,
    description: 'Rich oil painting style with visible brushstrokes and classical feel.',
    sort_order: 50,
  },
  {
    name: 'Retro Pixel Art',
    slug: 'retro-pixel',
    category: 'style',
    hf_repo_id: 'prithivMLmods/Retro-Pixel-Flux-LoRA',
    default_scale: 0.8,
    description: 'Retro pixel art aesthetic. Great for gaming and nostalgia content.',
    sort_order: 60,
  },
  {
    name: 'Modern Pixel Art',
    slug: 'modern-pixel',
    category: 'style',
    hf_repo_id: 'UmeAiRT/FLUX.1-dev-LoRA-Modern_Pixel_art',
    default_scale: 0.7,
    description: 'Modern pixel art with clean edges and vibrant colors.',
    sort_order: 65,
  },
  {
    name: 'Seamless Texture',
    slug: 'seamless-texture',
    category: 'effect',
    hf_repo_id: 'gokaygokay/Flux-Seamless-Texture-LoRA',
    default_scale: 0.8,
    description: 'Generate tileable seamless textures for backgrounds and patterns.',
    sort_order: 70,
  },
  {
    name: 'Outpaint',
    slug: 'outpaint',
    category: 'effect',
    hf_repo_id: 'fal/flux-2-klein-4B-outpaint-lora',
    default_scale: 0.9,
    description: 'Expand images beyond their borders. Extends compositions naturally.',
    sort_order: 80,
  },
  {
    name: 'Zoom Effect',
    slug: 'zoom',
    category: 'effect',
    hf_repo_id: 'fal/flux-2-klein-4B-zoom-lora',
    default_scale: 0.9,
    description: 'Smooth zoom into image details. Enhances fine details.',
    sort_order: 85,
  },
  {
    name: 'Virtual Try-On',
    slug: 'virtual-tryon',
    category: 'product',
    hf_repo_id: 'fal/flux-klein-9b-virtual-tryon-lora',
    default_scale: 0.8,
    description: 'Fashion virtual try-on. Place clothing items on model photos.',
    is_featured: true,
    sort_order: 15,
  },
  {
    name: 'Victorian Drawing',
    slug: 'victorian-drawing',
    category: 'style',
    hf_repo_id: 'dvyio/flux-lora-victorian-drawing',
    default_scale: 0.8,
    description: 'Victorian-era illustration and engraving style.',
    sort_order: 90,
  },
  {
    name: '2D Game Assets',
    slug: '2d-game-assets',
    category: 'style',
    hf_repo_id: 'gokaygokay/Flux-2D-Game-Assets-LoRA',
    default_scale: 0.8,
    description: 'Clean 2D game asset style. Items, characters, and environments.',
    sort_order: 95,
  },
];

async function seed() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  for (const lora of CURATED_LORAS) {
    const { error } = await supabase
      .from('lora_library')
      .upsert(lora, { onConflict: 'slug' });

    if (error) {
      console.error(`Failed to seed "${lora.name}":`, error.message);
    } else {
      console.log(`Seeded: ${lora.name}`);
    }
  }

  console.log(`\nDone. Seeded ${CURATED_LORAS.length} LoRAs.`);
}

seed().catch(console.error);
