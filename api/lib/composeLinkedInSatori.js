/**
 * Satori-based compositor for LinkedIn post images.
 *
 * NEW DESIGN (v2): Curiosity-driven layout optimized for feed engagement.
 * - Bold hook text (3-8 words) that creates an information gap
 * - Strong bottom gradient for readability
 * - Thin accent line for editorial quality
 * - Subtle series branding
 * - No decorative quote mark (this isn't a quote card — it's a curiosity trigger)
 *
 * Reuses fontRegistry.js and carouselStyleTemplates.js from the carousel system.
 */

import satori from 'satori';
import sharp from 'sharp';
import { getCarouselTemplate } from './carouselStyleTemplates.js';
import { getFontsForSatori, getFontFamilyCss } from './fontRegistry.js';
import { TEMPLATES as COLOR_TEMPLATES } from './colorTemplates.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Build Satori JSX tree (v2 — curiosity-driven design) ────────────────────

function buildLinkedInJsx({
  canvasW, canvasH, hookText, seriesTitle, postNumber,
  logoDataUri, logoW, logoH, baseColor, fontFamilyCss,
  headlineSizeRatio,
}) {
  const margin = Math.round(canvasW * 0.052);
  const headSize = Math.round(canvasH * (headlineSizeRatio || 0.05));
  const seriesSize = Math.round(canvasH * 0.014);

  const children = [];

  // ── Strong bottom gradient (covers bottom 65% for text readability) ──
  children.push({
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%',
        background: `linear-gradient(to bottom, ${hexToRgba(baseColor, 0)} 0%, ${hexToRgba(baseColor, 0.15)} 20%, ${hexToRgba(baseColor, 0.55)} 45%, ${hexToRgba(baseColor, 0.88)} 75%, ${hexToRgba(baseColor, 0.95)} 100%)`,
      },
    },
  });

  // ── Logo pill (top-left) ──
  if (logoDataUri) {
    children.push({
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: Math.round(margin * 0.65),
          left: Math.round(margin * 0.65),
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 999,
          padding: '8px 16px',
        },
        children: [{
          type: 'img',
          props: {
            src: logoDataUri,
            width: logoW,
            height: logoH,
          },
        }],
      },
    });
  }

  // ── Content area (bottom section) ──
  const contentChildren = [];

  // Thin accent line
  contentChildren.push({
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: 44,
        height: 3,
        background: 'rgba(255,255,255,0.5)',
        borderRadius: 2,
        marginBottom: 14,
      },
    },
  });

  // Hook text (BIG, bold — the curiosity trigger)
  if (hookText) {
    contentChildren.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          fontSize: headSize,
          fontWeight: 700,
          color: 'white',
          lineHeight: 1.15,
          maxWidth: '92%',
          letterSpacing: -0.5,
          textShadow: '0 2px 12px rgba(0,0,0,0.3)',
        },
        children: hookText,
      },
    });
  }

  // Series label + post number (subtle, small)
  if (seriesTitle) {
    const seriesChildren = [
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: seriesSize,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            fontWeight: 500,
          },
          children: seriesTitle,
        },
      },
    ];

    if (postNumber) {
      seriesChildren.push({
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: seriesSize,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
          },
          children: `#${postNumber}`,
        },
      });
    }

    contentChildren.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          gap: 12,
          marginTop: 16,
          alignItems: 'center',
        },
        children: seriesChildren,
      },
    });
  }

  // Content container positioned at bottom-left
  children.push({
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        bottom: Math.round(canvasH * 0.06),
        left: margin,
        right: margin,
        display: 'flex',
        flexDirection: 'column',
      },
      children: contentChildren,
    },
  });

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'relative',
        width: `${canvasW}px`,
        height: `${canvasH}px`,
        fontFamily: fontFamilyCss || 'Inter, sans-serif',
      },
      children,
    },
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compose a branded LinkedIn post image using Satori + Sharp.
 *
 * @param {object} opts
 * @param {string} opts.backgroundImageUrl - URL of the base image (from FAL)
 * @param {string} opts.logoUrl           - URL of the brand logo
 * @param {string} opts.hookText          - Curiosity-gap text (3-8 words). Replaces old `excerpt`.
 * @param {string} [opts.excerpt]         - DEPRECATED alias for hookText (backward compat)
 * @param {string} opts.seriesTitle       - Name of the LinkedIn series
 * @param {number} opts.postNumber        - Post number in the series
 * @param {string} opts.carouselStyle     - Layout template key (from carouselStyleTemplates)
 * @param {string} opts.gradientColor     - Primary overlay color (hex)
 * @param {number} opts.templateIndex     - Color template index (0-5, fallback color source)
 * @param {object} opts.styleOverrides    - { gradient_color, headline_scale, body_scale, font_family }
 * @param {number} opts.canvasW           - Output width (default 1080)
 * @param {number} opts.canvasH           - Output height (default 1350, 4:5 portrait)
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function composeLinkedInSatori({
  backgroundImageUrl,
  logoUrl,
  hookText,
  excerpt,          // backward compat alias
  seriesTitle = 'INDUSTRY WATCH',
  postNumber = 1,
  carouselStyle = 'bold_editorial',
  gradientColor,
  templateIndex = 0,
  styleOverrides,
  canvasW = 1080,
  canvasH = 1350,
}) {
  // Support old `excerpt` param as fallback
  const displayText = hookText || excerpt || '';

  const template = getCarouselTemplate(carouselStyle);
  const layout = { ...template.layout };

  // Resolve base color: explicit gradient_color > style override > color template
  const colorTpl = COLOR_TEMPLATES[templateIndex % COLOR_TEMPLATES.length];
  let baseColor = gradientColor || styleOverrides?.gradient_color || colorTpl?.gradient?.stops?.[1] || '#0f0f1a';

  // Apply style overrides
  let headlineSizeRatio = 0.05; // default — bigger than v1
  if (styleOverrides) {
    if (styleOverrides.gradient_color) baseColor = styleOverrides.gradient_color;
    if (styleOverrides.headline_scale) {
      headlineSizeRatio = headlineSizeRatio * styleOverrides.headline_scale;
    }
  }

  // Prepare logo as data URI
  let logoDataUri = null;
  let logoW = 80;
  let logoH = 30;

  if (logoUrl) {
    try {
      const logoBuffer = await fetchBuffer(logoUrl);
      const logoMeta = await sharp(logoBuffer).metadata();
      const naturalW = logoMeta.width || 200;
      const naturalH = logoMeta.height || 60;
      const targetW = Math.round(canvasW * 0.1);
      const scale = targetW / naturalW;
      logoW = targetW;
      logoH = Math.round(naturalH * scale);

      const resizedLogo = await sharp(logoBuffer)
        .resize(logoW, logoH, { fit: 'fill' })
        .png()
        .toBuffer();
      logoDataUri = `data:image/png;base64,${resizedLogo.toString('base64')}`;
    } catch (err) {
      console.warn('[composeLinkedInSatori] Failed to fetch logo:', err.message);
    }
  }

  // Resolve font
  const fontKey = styleOverrides?.font_family || 'inter';
  const fonts = getFontsForSatori(fontKey);
  const fontFamilyCss = getFontFamilyCss(fontKey);

  // Build JSX tree (v2 design)
  const jsx = buildLinkedInJsx({
    canvasW, canvasH,
    hookText: displayText,
    seriesTitle, postNumber,
    logoDataUri, logoW, logoH,
    baseColor, fontFamilyCss,
    headlineSizeRatio,
  });

  const overlaySvg = await satori(jsx, {
    width: canvasW,
    height: canvasH,
    fonts,
  });

  const svgBuffer = Buffer.from(overlaySvg, 'utf-8');

  // Composite onto background image
  if (backgroundImageUrl) {
    try {
      const bgBuffer = await fetchBuffer(backgroundImageUrl);
      const resizedBg = await sharp(bgBuffer)
        .resize(canvasW, canvasH, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer();

      return await sharp(resizedBg)
        .composite([{ input: svgBuffer, top: 0, left: 0 }])
        .png()
        .toBuffer();
    } catch (err) {
      console.warn('[composeLinkedInSatori] Failed to load background:', err.message);
    }
  }

  // Fallback: solid dark background
  const solidBg = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 15, g: 15, b: 26, alpha: 1 } },
  }).png().toBuffer();

  return await sharp(solidBg)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
