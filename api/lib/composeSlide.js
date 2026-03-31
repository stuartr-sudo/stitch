/**
 * Slide compositor for carousel images.
 * Composites text overlays onto AI-generated background images using Sharp.
 *
 * ONE unified builder driven by carousel style templates.
 * All slides (hook, story, conclusion) render with the same layout —
 * the only difference is which text fields are populated.
 */

import sharp from 'sharp';
import { getCarouselTemplate } from './carouselStyleTemplates.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function wrapText(text, maxCharsPerLine, maxLines) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function fitFontSize(text, desiredSize, maxWidth, charWidthRatio = 0.55) {
  if (!text) return desiredSize;
  const textWidth = text.length * desiredSize * charWidthRatio;
  if (textWidth <= maxWidth) return desiredSize;
  const fitted = Math.floor(maxWidth / (text.length * charWidthRatio));
  return Math.max(fitted, Math.round(desiredSize * 0.35));
}

// ─── Scrim builders ──────────────────────────────────────────────────────────

function bottomGradientScrim(canvasW, canvasH, coverage, maxOpacity, color = 'black') {
  const scrimTop = Math.round(canvasH * (1 - coverage));
  return `<defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0" />
      <stop offset="30%" stop-color="${color}" stop-opacity="${maxOpacity * 0.3}" />
      <stop offset="100%" stop-color="${color}" stop-opacity="${maxOpacity}" />
    </linearGradient>
  </defs>
  <rect x="0" y="${scrimTop}" width="${canvasW}" height="${canvasH - scrimTop}" fill="url(#scrim)" />`;
}

function topGradientScrim(canvasW, canvasH, coverage, maxOpacity, color = 'black') {
  const scrimH = Math.round(canvasH * coverage);
  return `<defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="${maxOpacity}" />
      <stop offset="70%" stop-color="${color}" stop-opacity="${maxOpacity * 0.3}" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${canvasW}" height="${scrimH}" fill="url(#scrim)" />`;
}

function fullOverlayScrim(canvasW, canvasH, opacity, color = 'black') {
  return `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="${color}" opacity="${opacity}" />`;
}

function solidBarScrim(canvasW, canvasH, coverage, opacity, color = 'black') {
  const barH = Math.round(canvasH * coverage);
  const barY = canvasH - barH;
  return `<rect x="0" y="${barY}" width="${canvasW}" height="${barH}" fill="${color}" opacity="${opacity}" />`;
}

function leftStripScrim(canvasW, canvasH, coverage, opacity, color = 'black') {
  const stripW = Math.round(canvasW * coverage);
  return `<rect x="0" y="0" width="${stripW}" height="${canvasH}" fill="${color}" opacity="${opacity}" />`;
}

function buildScrim(type, canvasW, canvasH, coverage, opacity, color = 'black') {
  switch (type) {
    case 'bottom_gradient': return bottomGradientScrim(canvasW, canvasH, coverage, opacity, color);
    case 'top_gradient': return topGradientScrim(canvasW, canvasH, coverage, opacity, color);
    case 'full_overlay': return fullOverlayScrim(canvasW, canvasH, opacity, color);
    case 'solid_bar': return solidBarScrim(canvasW, canvasH, coverage, opacity, color);
    case 'left_strip': return leftStripScrim(canvasW, canvasH, coverage, opacity, color);
    case 'none': return '';
    default: return bottomGradientScrim(canvasW, canvasH, coverage, opacity, color);
  }
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) {
  const x = canvasW - logoW - 30;
  const y = 30;
  return `<image href="${logoDataUri}" x="${x}" y="${y}" width="${logoW}" height="${logoH}" opacity="0.7" preserveAspectRatio="xMidYMid meet" />`;
}

// ─── Unified SVG builder ─────────────────────────────────────────────────────

function buildUnifiedSvg({ canvasW, canvasH, headline, bodyText, layout, logoDataUri, logoW, logoH, brandColors }) {
  const {
    textAlign, textPosition, scrimType, scrimOpacity, scrimCoverage,
    headlineSizeRatio, bodySizeRatio, headlineWeight, bodyWeight,
    headlineStyle, margin: marginRatio,
  } = layout;

  const marginPx = Math.round(canvasW * marginRatio);
  const textW = textAlign === 'left' && scrimType === 'left_strip'
    ? Math.round(canvasW * scrimCoverage) - marginPx * 2
    : canvasW - marginPx * 2;

  // Font sizes
  let headSize = Math.round(canvasH * headlineSizeRatio);
  const bodySize = Math.round(canvasH * bodySizeRatio);

  // Auto-scale headline
  headSize = fitFontSize(headline, headSize, textW * 2, 0.55);
  const headLH = Math.round(headSize * 1.3);
  const bodyLH = Math.round(bodySize * 1.5);

  // Wrap text
  const headChars = Math.round(textW / (headSize * 0.55));
  const headLines = wrapText(headline || '', headChars, 4);
  const bodyChars = Math.round(textW / (bodySize * 0.52));
  const bodyLines = bodyText ? wrapText(bodyText, bodyChars, 5) : [];

  const headBlockH = headLines.length * headLH;
  const bodyBlockH = bodyLines.length * bodyLH;
  const gap = bodyLines.length > 0 ? 16 : 0;
  const totalBlockH = headBlockH + gap + bodyBlockH;

  // Positioning
  const anchor = textAlign === 'center' ? 'middle' : 'start';
  let textX;
  if (textAlign === 'center') {
    textX = scrimType === 'left_strip' ? Math.round(canvasW * scrimCoverage / 2) : canvasW / 2;
  } else {
    textX = marginPx;
  }

  let headStartY;
  if (textPosition === 'center') {
    headStartY = (canvasH - totalBlockH) / 2 + headSize;
  } else if (textPosition === 'top') {
    headStartY = marginPx + headSize + 20;
  } else {
    // bottom
    const bottomPad = Math.round(canvasH * 0.08);
    headStartY = canvasH - bottomPad - totalBlockH + headSize;
  }

  // Build SVG elements
  const headEls = headLines.map((line, i) =>
    `<text x="${textX}" y="${headStartY + i * headLH}" text-anchor="${anchor}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${headSize}" font-weight="${headlineWeight}" font-style="${headlineStyle}" fill="white" filter="url(#shadow)">${xmlEscape(line)}</text>`
  ).join('\n    ');

  const bodyStartY = headStartY + headLines.length * headLH + gap;
  const bodyEls = bodyLines.map((line, i) =>
    `<text x="${textX}" y="${bodyStartY + i * bodyLH}" text-anchor="${anchor}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${bodySize}" font-weight="${bodyWeight}" fill="white" opacity="0.9">${xmlEscape(line)}</text>`
  ).join('\n    ');

  const scrimColor = brandColors?.[0] || 'black';
  const scrimSvg = buildScrim(scrimType, canvasW, canvasH, scrimCoverage, scrimOpacity, scrimColor);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.7" />
    </filter>
  </defs>
  ${scrimSvg}
  ${headEls}
  ${bodyEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function composeSlide({
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
  compositor = 'sharp',
  styleOverrides,
}) {
  // Auto-switch to Satori for custom fonts (Sharp SVG can't use WOFF fonts)
  if (styleOverrides?.font_family && styleOverrides.font_family !== 'inter') {
    compositor = 'satori';
  }

  // Dispatch to Satori compositor if requested
  if (compositor === 'satori') {
    const { composeSlideSatori } = await import('./composeSlideSatori.js');
    return composeSlideSatori({
      slideType, carouselStyle, canvasW, canvasH, backgroundImageUrl,
      logoUrl, brandColors, colorTemplateIndex, headline, bodyText,
      statValue, statLabel, ctaText, styleOverrides,
    });
  }

  const template = getCarouselTemplate(carouselStyle);
  const layout = { ...template.layout };

  // Apply style overrides from the editor
  if (styleOverrides) {
    if (styleOverrides.gradient_color) {
      // Override brand colors so scrim uses this color
      brandColors = [styleOverrides.gradient_color, ...(brandColors || []).slice(1)];
    }
    if (styleOverrides.headline_scale) {
      layout.headlineSizeRatio = layout.headlineSizeRatio * styleOverrides.headline_scale;
    }
    if (styleOverrides.body_scale) {
      layout.bodySizeRatio = layout.bodySizeRatio * styleOverrides.body_scale;
    }
  }

  // Normalize: hook shows headline only, everything else shows headline + body
  const effectiveBody = slideType === 'hook' ? '' : (bodyText || ctaText || (statValue ? `${statValue} — ${statLabel}` : ''));

  // Prepare logo
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
      console.warn('[composeSlide] Failed to fetch logo:', err.message);
    }
  }

  // Build SVG overlay
  const svgString = buildUnifiedSvg({
    canvasW, canvasH, headline, bodyText: effectiveBody,
    layout, logoDataUri, logoW, logoH, brandColors,
  });
  const svgBuffer = Buffer.from(svgString, 'utf-8');

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
      console.warn('[composeSlide] Failed to load background:', err.message);
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
