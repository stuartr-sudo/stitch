/**
 * Satori-based compositor for LinkedIn post images.
 * Replaces the hand-built SVG approach in composeImage.js with proper text layout.
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

// ── Gradient overlay (reuses carousel style template scrim system) ───────────

function buildScrimStyle(scrimType, scrimOpacity, scrimCoverage, baseColor) {
  const rgba = (a) => hexToRgba(baseColor, a);

  switch (scrimType) {
    case 'bottom_gradient':
      return {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: `linear-gradient(to bottom, ${rgba(0)} 0%, ${rgba(scrimOpacity * 0.3)} 30%, ${rgba(scrimOpacity)} 100%)`,
      };
    case 'top_gradient':
      return {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: `linear-gradient(to top, ${rgba(0)} 0%, ${rgba(scrimOpacity * 0.3)} 30%, ${rgba(scrimOpacity)} 100%)`,
      };
    case 'full_overlay':
      return {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: rgba(scrimOpacity),
      };
    case 'solid_bar':
      return {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: rgba(scrimOpacity),
      };
    case 'left_strip':
      return {
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${Math.round(scrimCoverage * 100)}%`,
        background: rgba(scrimOpacity),
      };
    case 'none':
      return { display: 'none' };
    default:
      return {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: `linear-gradient(to bottom, ${rgba(0)} 0%, ${rgba(scrimOpacity)} 100%)`,
      };
  }
}

function getTextContainerStyle(layout, canvasW, canvasH) {
  const marginPx = Math.round(canvasW * layout.margin);
  const base = {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    padding: marginPx,
  };

  base.alignItems = layout.textAlign === 'center' ? 'center' : 'flex-start';
  base.textAlign = layout.textAlign === 'center' ? 'center' : 'left';

  if (layout.scrimType === 'left_strip') {
    base.top = 0; base.bottom = 0; base.left = 0;
    base.width = Math.round(canvasW * layout.scrimCoverage);
    base.justifyContent = layout.textPosition === 'top' ? 'flex-start'
      : layout.textPosition === 'bottom' ? 'flex-end' : 'center';
  } else if (layout.textPosition === 'bottom') {
    base.bottom = 0; base.left = 0; base.right = 0;
    base.justifyContent = 'flex-end';
    base.paddingBottom = Math.round(canvasH * 0.08);
  } else if (layout.textPosition === 'top') {
    base.top = 0; base.left = 0; base.right = 0;
    base.justifyContent = 'flex-start';
    base.paddingTop = Math.round(canvasH * 0.08);
  } else {
    base.top = 0; base.bottom = 0; base.left = 0; base.right = 0;
    base.justifyContent = 'center';
  }

  return base;
}

// ── Build Satori JSX tree ────────────────────────────────────────────────────

function buildLinkedInJsx({
  canvasW, canvasH, excerpt, seriesTitle, postNumber,
  layout, logoDataUri, logoW, logoH, baseColor, fontFamilyCss,
}) {
  const headSize = Math.round(canvasH * layout.headlineSizeRatio);
  const bodySize = Math.round(canvasH * layout.bodySizeRatio);
  const marginPx = Math.round(canvasW * layout.margin);

  const scrimStyle = buildScrimStyle(
    layout.scrimType, layout.scrimOpacity, layout.scrimCoverage, baseColor
  );
  const textContainerStyle = getTextContainerStyle(layout, canvasW, canvasH);

  const children = [];

  // Scrim overlay
  if (scrimStyle.display !== 'none') {
    children.push({ type: 'div', props: { style: scrimStyle } });
  }

  // Text container with excerpt
  const textChildren = [];

  // Decorative quote mark
  textChildren.push({
    type: 'div',
    props: {
      style: {
        display: 'flex',
        fontSize: Math.round(headSize * 1.4),
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1,
        marginBottom: 8,
      },
      children: '\u201C',
    },
  });

  // Main excerpt text
  if (excerpt) {
    textChildren.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          fontSize: headSize,
          fontWeight: layout.headlineWeight === 'bold' ? 700 : 400,
          fontStyle: layout.headlineStyle || 'normal',
          color: 'white',
          lineHeight: 1.3,
          maxWidth: '100%',
        },
        children: excerpt,
      },
    });
  }

  children.push({
    type: 'div',
    props: { style: textContainerStyle, children: textChildren },
  });

  // Logo pill (top-left)
  if (logoDataUri) {
    children.push({
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: Math.round(marginPx * 0.6),
          left: Math.round(marginPx * 0.6),
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

  // Series pill (bottom center)
  if (seriesTitle) {
    children.push({
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          bottom: Math.round(marginPx * 0.5),
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 999,
                padding: '6px 20px',
                fontSize: Math.round(bodySize * 0.75),
                color: 'white',
                letterSpacing: 3,
                textTransform: 'uppercase',
              },
              children: seriesTitle,
            },
          },
          postNumber ? {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: Math.round(bodySize * 0.7),
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: 2,
              },
              children: `#${postNumber}`,
            },
          } : null,
        ].filter(Boolean),
      },
    });
  }

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
 * @param {string} opts.excerpt           - Quote/excerpt text
 * @param {string} opts.seriesTitle       - Name of the LinkedIn series
 * @param {number} opts.postNumber        - Post number in the series
 * @param {string} opts.carouselStyle     - Layout template key (from carouselStyleTemplates)
 * @param {string} opts.gradientColor     - Primary overlay color (hex)
 * @param {number} opts.templateIndex     - Color template index (0-5, fallback color source)
 * @param {object} opts.styleOverrides    - { gradient_color, headline_scale, body_scale, font_family }
 * @param {number} opts.canvasW           - Output width (default 1080)
 * @param {number} opts.canvasH           - Output height (default 1080)
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function composeLinkedInSatori({
  backgroundImageUrl,
  logoUrl,
  excerpt = '',
  seriesTitle = 'INDUSTRY WATCH',
  postNumber = 1,
  carouselStyle = 'bold_editorial',
  gradientColor,
  templateIndex = 0,
  styleOverrides,
  canvasW = 1080,
  canvasH = 1080,
}) {
  const template = getCarouselTemplate(carouselStyle);
  const layout = { ...template.layout };

  // Resolve base color: explicit gradient_color > style override > color template
  const colorTpl = COLOR_TEMPLATES[templateIndex % COLOR_TEMPLATES.length];
  let baseColor = gradientColor || styleOverrides?.gradient_color || colorTpl?.gradient?.stops?.[1] || '#1a1a2e';

  // Apply style overrides
  if (styleOverrides) {
    if (styleOverrides.gradient_color) baseColor = styleOverrides.gradient_color;
    if (styleOverrides.headline_scale) {
      layout.headlineSizeRatio = layout.headlineSizeRatio * styleOverrides.headline_scale;
    }
    if (styleOverrides.body_scale) {
      layout.bodySizeRatio = layout.bodySizeRatio * styleOverrides.body_scale;
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

  // Build JSX tree
  const jsx = buildLinkedInJsx({
    canvasW, canvasH, excerpt, seriesTitle, postNumber,
    layout, logoDataUri, logoW, logoH, baseColor, fontFamilyCss,
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

  // Fallback: solid dark background with gradient from color template
  const solidBg = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 20, g: 20, b: 30, alpha: 1 } },
  }).png().toBuffer();

  return await sharp(solidBg)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
