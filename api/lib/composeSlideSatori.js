/**
 * Satori-based slide compositor for carousel images.
 * Uses Satori (JSX → SVG with proper text layout) + Sharp (SVG → PNG).
 *
 * Drop-in replacement for composeSlide.js with the same function signature.
 * Advantages over the hand-built SVG approach:
 * - Proper text measurement and wrapping (flexbox, not character-count guessing)
 * - Custom font support (Inter variable)
 * - CSS-like gradients with brand colour support
 * - Better visual hierarchy and spacing
 */

import satori from 'satori';
import sharp from 'sharp';
import { getCarouselTemplate } from './carouselStyleTemplates.js';
import { getFontsForSatori, getFontFamilyCss } from './fontRegistry.js';

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

// ── Scrim / gradient background builders ─────────────────────────────────────

function buildGradientStyle(scrimType, scrimOpacity, scrimCoverage, brandColors) {
  // Use brand primary colour if available, otherwise black
  const baseColor = brandColors?.[0] || '#000000';
  const baseRgba = (a) => hexToRgba(baseColor, a);

  switch (scrimType) {
    case 'bottom_gradient':
      return {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: `linear-gradient(to bottom, ${baseRgba(0)} 0%, ${baseRgba(scrimOpacity * 0.3)} 30%, ${baseRgba(scrimOpacity)} 100%)`,
      };
    case 'top_gradient':
      return {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: `linear-gradient(to top, ${baseRgba(0)} 0%, ${baseRgba(scrimOpacity * 0.3)} 30%, ${baseRgba(scrimOpacity)} 100%)`,
      };
    case 'full_overlay':
      return {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: baseRgba(scrimOpacity),
      };
    case 'solid_bar':
      return {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: baseRgba(scrimOpacity),
      };
    case 'left_strip':
      return {
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${Math.round(scrimCoverage * 100)}%`,
        background: baseRgba(scrimOpacity),
      };
    case 'none':
      return { display: 'none' };
    default:
      return {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${Math.round(scrimCoverage * 100)}%`,
        background: `linear-gradient(to bottom, ${baseRgba(0)} 0%, ${baseRgba(scrimOpacity)} 100%)`,
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

  // Horizontal alignment
  if (layout.textAlign === 'center') {
    base.alignItems = 'center';
    base.textAlign = 'center';
  } else {
    base.alignItems = 'flex-start';
    base.textAlign = 'left';
  }

  // Vertical positioning
  if (layout.scrimType === 'left_strip') {
    base.top = 0;
    base.bottom = 0;
    base.left = 0;
    base.width = Math.round(canvasW * layout.scrimCoverage);
    base.justifyContent = layout.textPosition === 'top' ? 'flex-start'
      : layout.textPosition === 'bottom' ? 'flex-end' : 'center';
  } else if (layout.textPosition === 'bottom') {
    base.bottom = 0;
    base.left = 0;
    base.right = 0;
    base.justifyContent = 'flex-end';
    base.paddingBottom = Math.round(canvasH * 0.08);
  } else if (layout.textPosition === 'top') {
    base.top = 0;
    base.left = 0;
    base.right = 0;
    base.justifyContent = 'flex-start';
    base.paddingTop = Math.round(canvasH * 0.08);
  } else {
    // center
    base.top = 0;
    base.bottom = 0;
    base.left = 0;
    base.right = 0;
    base.justifyContent = 'center';
  }

  return base;
}

// ── Build Satori JSX tree ────────────────────────────────────────────────────

function buildSlideJsx({ canvasW, canvasH, headline, bodyText, layout, logoDataUri, logoW, logoH, brandColors, fontFamilyCss, textColor }) {
  const headSize = Math.round(canvasH * layout.headlineSizeRatio);
  const bodySize = Math.round(canvasH * layout.bodySizeRatio);
  const marginPx = Math.round(canvasW * layout.margin);

  const scrimStyle = buildGradientStyle(
    layout.scrimType, layout.scrimOpacity, layout.scrimCoverage, brandColors
  );

  const textContainerStyle = getTextContainerStyle(layout, canvasW, canvasH);

  // Build children array
  const children = [];

  // Scrim overlay
  if (scrimStyle.display !== 'none') {
    children.push({
      type: 'div',
      props: { style: scrimStyle },
    });
  }

  // Text container
  const textChildren = [];

  if (headline) {
    textChildren.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          fontSize: headSize,
          fontWeight: layout.headlineWeight === 'bold' ? 700 : 400,
          fontStyle: layout.headlineStyle || 'normal',
          color: textColor || 'white',
          lineHeight: 1.25,
          maxWidth: '100%',
        },
        children: headline,
      },
    });
  }

  if (bodyText) {
    textChildren.push({
      type: 'div',
      props: {
        style: {
          display: 'flex',
          fontSize: bodySize,
          fontWeight: layout.bodyWeight === 'bold' ? 700 : 400,
          color: textColor ? hexToRgba(textColor, 0.9) : 'rgba(255,255,255,0.9)',
          lineHeight: 1.5,
          marginTop: 12,
          maxWidth: '100%',
        },
        children: bodyText,
      },
    });
  }

  children.push({
    type: 'div',
    props: { style: textContainerStyle, children: textChildren },
  });

  // Logo watermark
  if (logoDataUri) {
    children.push({
      type: 'img',
      props: {
        src: logoDataUri,
        width: logoW,
        height: logoH,
        style: {
          position: 'absolute',
          top: Math.round(marginPx * 0.8),
          right: Math.round(marginPx * 0.8),
          opacity: 0.7,
        },
      },
    });
  }

  // Root container
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

export async function composeSlideSatori({
  slideType = 'story',
  carouselStyle = 'bold_editorial',
  canvasW = 1080,
  canvasH = 1080,
  backgroundImageUrl,
  logoUrl,
  brandColors,
  colorTemplateIndex = 0,
  headline,
  bodyText,
  statValue,
  statLabel,
  ctaText,
  styleOverrides,
}) {
  const template = getCarouselTemplate(carouselStyle);
  const layout = { ...template.layout };

  // Apply style overrides
  if (styleOverrides) {
    if (styleOverrides.gradient_color) {
      brandColors = [styleOverrides.gradient_color, ...(brandColors || []).slice(1)];
    }
    if (styleOverrides.gradient_opacity != null) {
      layout.scrimOpacity = layout.scrimOpacity * styleOverrides.gradient_opacity;
    }
    if (styleOverrides.headline_scale) {
      layout.headlineSizeRatio = layout.headlineSizeRatio * styleOverrides.headline_scale;
    }
    if (styleOverrides.body_scale) {
      layout.bodySizeRatio = layout.bodySizeRatio * styleOverrides.body_scale;
    }
  }

  // Normalize text same as original
  const effectiveBody = slideType === 'hook' ? '' : (bodyText || ctaText || (statValue ? `${statValue} — ${statLabel}` : ''));

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
      console.warn('[composeSlideSatori] Failed to fetch logo:', err.message);
    }
  }

  // Resolve font family
  const fontKey = styleOverrides?.font_family || 'inter';
  const fonts = getFontsForSatori(fontKey);
  const fontFamilyCss = getFontFamilyCss(fontKey);

  // Build JSX tree for Satori
  const textColor = styleOverrides?.text_color || null;
  const jsx = buildSlideJsx({
    canvasW, canvasH, headline, bodyText: effectiveBody,
    layout, logoDataUri, logoW, logoH, brandColors, fontFamilyCss, textColor,
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
      console.warn('[composeSlideSatori] Failed to load background:', err.message);
    }
  }

  // Fallback: dark solid background
  const solidBg = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 20, g: 20, b: 30, alpha: 1 } },
  }).png().toBuffer();

  return await sharp(solidBg)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
