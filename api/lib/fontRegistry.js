/**
 * Font registry for carousel compositors.
 * Lazy-loads WOFF font data from disk on first use per family.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(__dirname, '../../fonts');

export const FONT_FAMILIES = {
  inter:     { label: 'Inter',             category: 'sans-serif',  files: { 400: 'Inter-Regular.woff',             700: 'Inter-Bold.woff' } },
  playfair:  { label: 'Playfair Display',  category: 'serif',       files: { 400: 'PlayfairDisplay-Regular.woff',   700: 'PlayfairDisplay-Bold.woff' } },
  jetbrains: { label: 'JetBrains Mono',    category: 'monospace',   files: { 400: 'JetBrainsMono-Regular.woff',     700: 'JetBrainsMono-Bold.woff' } },
  caveat:    { label: 'Caveat',            category: 'cursive',     files: { 400: 'Caveat-Regular.woff',            700: 'Caveat-Bold.woff' } },
};

// Cache loaded font buffers
const fontCache = new Map();

/**
 * Get Satori-compatible font array for a given font family key.
 * Lazy-loads from disk on first call, caches thereafter.
 */
export function getFontsForSatori(fontKey = 'inter') {
  const family = FONT_FAMILIES[fontKey] || FONT_FAMILIES.inter;
  const cacheKey = fontKey || 'inter';

  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey);

  const fonts = [];
  for (const [weight, file] of Object.entries(family.files)) {
    try {
      const data = readFileSync(resolve(FONTS_DIR, file));
      fonts.push({ name: family.label, data, weight: Number(weight), style: 'normal' });
    } catch (err) {
      console.warn(`[fontRegistry] Failed to load ${file}:`, err.message);
    }
  }

  // Fallback to Inter if requested font failed to load
  if (fonts.length === 0 && fontKey !== 'inter') {
    console.warn(`[fontRegistry] Falling back to Inter for "${fontKey}"`);
    return getFontsForSatori('inter');
  }

  fontCache.set(cacheKey, fonts);
  return fonts;
}

/**
 * Get CSS font-family string for a font key.
 */
export function getFontFamilyCss(fontKey = 'inter') {
  const family = FONT_FAMILIES[fontKey] || FONT_FAMILIES.inter;
  return `${family.label}, ${family.category}`;
}
