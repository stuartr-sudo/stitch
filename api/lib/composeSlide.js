/**
 * Slide compositor for carousel images.
 * Builds branded SVG overlays onto AI-generated background images using Sharp.
 *
 * Supports 6 slide layouts (hook, content, stat, quote, cta, image_focus)
 * and 3 aspect ratios (1080x1080, 1080x1350, 1080x1920).
 */

import sharp from 'sharp';
import { TEMPLATES } from './colorTemplates.js';

// ─── Helpers (shared with composeImage.js) ──────────────────────────────────

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function angleToSvgCoords(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const x2 = (Math.cos(rad) + 1) / 2;
  const y2 = (Math.sin(rad) + 1) / 2;
  return {
    x1: `${((1 - x2) * 100).toFixed(1)}%`,
    y1: `${((1 - y2) * 100).toFixed(1)}%`,
    x2: `${(x2 * 100).toFixed(1)}%`,
    y2: `${(y2 * 100).toFixed(1)}%`,
  };
}

function wrapText(text, charsPerLine, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (lines.length >= maxLines) break;
    const test = current ? `${current} ${word}` : word;
    if (test.length <= charsPerLine) {
      current = test;
    } else {
      if (current) lines.push(current);
      if (lines.length >= maxLines) break;
      current = word.length > charsPerLine ? word.slice(0, charsPerLine - 1) + '\u2026' : word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── Color derivation from brand colors ─────────────────────────────────────

/**
 * Derive a color template from brand kit colors array.
 * Falls back to TEMPLATES[colorTemplateIndex] if brand has no colors.
 */
function deriveTemplate(brandColors, colorTemplateIndex) {
  if (!brandColors || brandColors.length === 0) {
    return TEMPLATES[(colorTemplateIndex || 0) % TEMPLATES.length];
  }

  // Use brand colors for gradient stops
  let stops;
  if (brandColors.length >= 3) {
    stops = [brandColors[0], brandColors[1], brandColors[2]];
  } else if (brandColors.length === 2) {
    stops = [brandColors[0], blendHex(brandColors[0], brandColors[1]), brandColors[1]];
  } else {
    stops = [darken(brandColors[0], 0.7), brandColors[0], lighten(brandColors[0], 0.4)];
  }

  const primary = brandColors.length >= 2 ? brandColors[1] : brandColors[0];
  return {
    name: 'brand-derived',
    gradient: { stops, angle: 140 },
    orb: { color: primary, centerY: 45 },
    pill: { fill: hexToRgba(primary, 0.4), stroke: hexToRgba(primary, 0.45) },
  };
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darken(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lighten(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

function blendHex(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex((r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2);
}

// ─── SVG defs (shared across all slide types) ───────────────────────────────

function svgDefs(template, canvasW, canvasH) {
  const { gradient, orb } = template;
  const gc = angleToSvgCoords(gradient.angle);
  const [stop0, stop1, stop2] = gradient.stops;

  return `<defs>
    <linearGradient id="bg-grad" x1="${gc.x1}" y1="${gc.y1}" x2="${gc.x2}" y2="${gc.y2}">
      <stop offset="0%" stop-color="${stop0}" />
      <stop offset="50%" stop-color="${stop1}" />
      <stop offset="100%" stop-color="${stop2}" />
    </linearGradient>
    <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${orb.color}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${orb.color}" stop-opacity="0" />
    </radialGradient>
    <filter id="noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" result="noiseOut" />
      <feColorMatrix type="saturate" values="0" in="noiseOut" result="grayNoise" />
      <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
      <feComposite in="blended" in2="SourceGraphic" operator="in" />
    </filter>
  </defs>`;
}

function gradientOverlay(canvasW, canvasH, opacity = 0.88) {
  return `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="url(#bg-grad)" opacity="${opacity}" />`;
}

function orbLayer(template, canvasW, canvasH) {
  const orbCX = canvasW / 2;
  const orbCY = (template.orb.centerY / 100) * canvasH;
  const orbRX = Math.round(canvasW * 0.42);
  const orbRY = Math.round(canvasH * 0.3);
  return `<ellipse cx="${orbCX}" cy="${orbCY}" rx="${orbRX}" ry="${orbRY}" fill="url(#orb-grad)" />`;
}

function noiseLayer(canvasW, canvasH) {
  return `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="white" opacity="0.035" filter="url(#noise)" />`;
}

function logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) {
  const x = canvasW - logoW - 40;
  const y = canvasH - logoH - 40;
  return `<image href="${logoDataUri}" x="${x}" y="${y}" width="${logoW}" height="${logoH}" opacity="0.6" preserveAspectRatio="xMidYMid meet" />`;
}

// ─── Slide type SVG builders ────────────────────────────────────────────────

function buildHookSvg({ template, canvasW, canvasH, headline, logoDataUri, logoW, logoH }) {
  const fontSize = Math.round(canvasH * 0.07);
  const lineHeight = Math.round(fontSize * 1.25);
  const charsPerLine = Math.round(canvasW / (fontSize * 0.55));
  const maxLines = 4;
  const lines = wrapText(headline || '', charsPerLine, maxLines);
  const blockH = lines.length * lineHeight;
  const startY = canvasH * 0.4 - blockH / 2 + fontSize;

  const textElements = lines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  // Logo centered near bottom
  const logoX = (canvasW - logoW * 1.2) / 2;
  const logoY = canvasH * 0.78;
  const logoDisplay = logoDataUri
    ? `<image href="${logoDataUri}" x="${logoX}" y="${logoY}" width="${Math.round(logoW * 1.2)}" height="${Math.round(logoH * 1.2)}" preserveAspectRatio="xMidYMid meet" />`
    : '';

  // Decorative line under text
  const lineY = startY + blockH + 30;
  const lineW = Math.min(200, canvasW * 0.2);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  ${svgDefs(template, canvasW, canvasH)}
  ${gradientOverlay(canvasW, canvasH, 0.95)}
  ${orbLayer(template, canvasW, canvasH)}
  ${noiseLayer(canvasW, canvasH)}
  ${textElements}
  <line x1="${(canvasW - lineW) / 2}" y1="${lineY}" x2="${(canvasW + lineW) / 2}" y2="${lineY}" stroke="white" stroke-width="2" opacity="0.5" />
  ${logoDisplay}
</svg>`;
}

function buildContentSvg({ template, canvasW, canvasH, headline, bodyText, logoDataUri, logoW, logoH }) {
  const headFontSize = Math.round(canvasH * 0.045);
  const bodyFontSize = Math.round(canvasH * 0.032);
  const headLineHeight = Math.round(headFontSize * 1.3);
  const bodyLineHeight = Math.round(bodyFontSize * 1.5);
  const margin = Math.round(canvasW * 0.08);
  const textWidth = canvasW - margin * 2;
  const headChars = Math.round(textWidth / (headFontSize * 0.55));
  const bodyChars = Math.round(textWidth / (bodyFontSize * 0.52));

  const headLines = wrapText(headline || '', headChars, 3);
  const bodyLines = wrapText(bodyText || '', bodyChars, 8);

  const headStartY = canvasH * 0.25;
  const bodyStartY = headStartY + headLines.length * headLineHeight + 30;

  const headElements = headLines.map((line, i) =>
    `<text x="${margin}" y="${headStartY + i * headLineHeight}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${headFontSize}" font-weight="bold" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  const bodyElements = bodyLines.map((line, i) =>
    `<text x="${margin}" y="${bodyStartY + i * bodyLineHeight}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${bodyFontSize}" fill="white" opacity="0.9">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  ${svgDefs(template, canvasW, canvasH)}
  ${gradientOverlay(canvasW, canvasH, 0.82)}
  ${orbLayer(template, canvasW, canvasH)}
  ${noiseLayer(canvasW, canvasH)}
  ${headElements}
  ${bodyElements}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

function buildStatSvg({ template, canvasW, canvasH, statValue, statLabel, headline, logoDataUri, logoW, logoH }) {
  const statFontSize = Math.round(canvasH * 0.16);
  const labelFontSize = Math.round(canvasH * 0.035);
  const headFontSize = Math.round(canvasH * 0.03);
  const labelLineHeight = Math.round(labelFontSize * 1.4);
  const labelChars = Math.round((canvasW * 0.7) / (labelFontSize * 0.52));

  const statY = canvasH * 0.42;
  const labelLines = wrapText(statLabel || '', labelChars, 3);
  const labelStartY = statY + statFontSize * 0.3 + 20;

  const labelElements = labelLines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${labelStartY + i * labelLineHeight}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${labelFontSize}" fill="white" opacity="0.85">${xmlEscape(line)}</text>`
  ).join('\n    ');

  // Optional small headline at top
  const headElement = headline
    ? `<text x="${canvasW / 2}" y="${canvasH * 0.15}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${headFontSize}" fill="white" opacity="0.7" letter-spacing="3">${xmlEscape(headline.toUpperCase().slice(0, 40))}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  ${svgDefs(template, canvasW, canvasH)}
  ${gradientOverlay(canvasW, canvasH, 0.92)}
  ${orbLayer(template, canvasW, canvasH)}
  ${noiseLayer(canvasW, canvasH)}
  ${headElement}
  <text x="${canvasW / 2}" y="${statY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${statFontSize}" font-weight="bold" fill="white">${xmlEscape(statValue || '')}</text>
  ${labelElements}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

function buildQuoteSvg({ template, canvasW, canvasH, headline, logoDataUri, logoW, logoH }) {
  const fontSize = Math.round(canvasH * 0.055);
  const lineHeight = Math.round(fontSize * 1.3);
  const quoteFontSize = Math.round(fontSize * 1.3);
  const charsPerLine = Math.round((canvasW * 0.75) / (fontSize * 0.55));
  const maxLines = 5;
  const lines = wrapText(headline || '', charsPerLine, maxLines);
  const blockH = lines.length * lineHeight;
  const centerY = canvasH * 0.45;
  const quoteMarkY = centerY - blockH / 2 - quoteFontSize * 0.3;
  const firstLineY = centerY - blockH / 2 + fontSize;

  const textElements = lines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${firstLineY + i * lineHeight}" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="${fontSize}" font-weight="bold" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  ${svgDefs(template, canvasW, canvasH)}
  ${gradientOverlay(canvasW, canvasH, 0.88)}
  ${orbLayer(template, canvasW, canvasH)}
  ${noiseLayer(canvasW, canvasH)}
  <text x="${canvasW / 2}" y="${quoteMarkY}" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="${quoteFontSize}" fill="white" opacity="0.85">&#x201C;</text>
  ${textElements}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

function buildCtaSvg({ template, canvasW, canvasH, ctaText, headline, logoDataUri, logoW, logoH }) {
  const ctaFontSize = Math.round(canvasH * 0.05);
  const ctaLineHeight = Math.round(ctaFontSize * 1.3);
  const ctaChars = Math.round((canvasW * 0.7) / (ctaFontSize * 0.55));
  const ctaLines = wrapText(ctaText || headline || '', ctaChars, 3);
  const ctaBlockH = ctaLines.length * ctaLineHeight;
  const ctaStartY = canvasH * 0.55 - ctaBlockH / 2 + ctaFontSize;

  const ctaElements = ctaLines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${ctaStartY + i * ctaLineHeight}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${ctaFontSize}" font-weight="bold" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  // Large logo centered above CTA text
  const bigLogoW = Math.round(Math.min(canvasW * 0.35, logoW * 3));
  const bigLogoH = Math.round(bigLogoW * (logoH / Math.max(logoW, 1)));
  const logoX = (canvasW - bigLogoW) / 2;
  const logoY = canvasH * 0.22;
  const logoDisplay = logoDataUri
    ? `<image href="${logoDataUri}" x="${logoX}" y="${logoY}" width="${bigLogoW}" height="${bigLogoH}" preserveAspectRatio="xMidYMid meet" />`
    : '';

  // Decorative line between logo and CTA
  const lineY = ctaStartY - 40;
  const lineW = Math.min(120, canvasW * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  ${svgDefs(template, canvasW, canvasH)}
  ${gradientOverlay(canvasW, canvasH, 0.95)}
  ${orbLayer(template, canvasW, canvasH)}
  ${noiseLayer(canvasW, canvasH)}
  ${logoDisplay}
  <line x1="${(canvasW - lineW) / 2}" y1="${lineY}" x2="${(canvasW + lineW) / 2}" y2="${lineY}" stroke="white" stroke-width="2" opacity="0.4" />
  ${ctaElements}
</svg>`;
}

function buildImageFocusSvg({ template, canvasW, canvasH, headline, logoDataUri, logoW, logoH }) {
  // Minimal overlay: bottom gradient strip + optional caption + small logo
  const stripH = Math.round(canvasH * 0.2);
  const stripY = canvasH - stripH;
  const fontSize = Math.round(canvasH * 0.032);
  const lineHeight = Math.round(fontSize * 1.4);
  const margin = Math.round(canvasW * 0.06);
  const charsPerLine = Math.round((canvasW - margin * 2) / (fontSize * 0.52));
  const captionLines = headline ? wrapText(headline, charsPerLine, 2) : [];
  const captionStartY = stripY + stripH * 0.35 + fontSize;

  const captionElements = captionLines.map((line, i) =>
    `<text x="${margin}" y="${captionStartY + i * lineHeight}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  const { gradient } = template;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  <defs>
    <linearGradient id="strip-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gradient.stops[0]}" stop-opacity="0" />
      <stop offset="40%" stop-color="${gradient.stops[0]}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="${gradient.stops[0]}" stop-opacity="0.95" />
    </linearGradient>
  </defs>
  <rect x="0" y="${stripY}" width="${canvasW}" height="${stripH}" fill="url(#strip-grad)" />
  ${captionElements}
  ${logoDataUri ? `<image href="${logoDataUri}" x="${canvasW - logoW - 30}" y="${stripY + 15}" width="${logoW}" height="${logoH}" opacity="0.7" preserveAspectRatio="xMidYMid meet" />` : ''}
</svg>`;
}

// ─── Builder dispatch ───────────────────────────────────────────────────────

const BUILDERS = {
  hook: buildHookSvg,
  content: buildContentSvg,
  stat: buildStatSvg,
  quote: buildQuoteSvg,
  cta: buildCtaSvg,
  image_focus: buildImageFocusSvg,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compose a branded carousel slide image.
 *
 * @param {object} opts
 * @param {string} opts.slideType           - 'hook' | 'content' | 'stat' | 'quote' | 'cta' | 'image_focus'
 * @param {number} opts.canvasW             - Canvas width (e.g. 1080)
 * @param {number} opts.canvasH             - Canvas height (e.g. 1080, 1350, 1920)
 * @param {string} [opts.backgroundImageUrl] - URL of AI-generated background image
 * @param {string} [opts.logoUrl]           - URL of brand logo
 * @param {string[]} [opts.brandColors]     - Brand colors array (hex codes)
 * @param {number} [opts.colorTemplateIndex] - Fallback to TEMPLATES[i] if no brandColors
 * @param {string} [opts.headline]          - Main text
 * @param {string} [opts.bodyText]          - Supporting text (content slides)
 * @param {string} [opts.statValue]         - Stat number (stat slides)
 * @param {string} [opts.statLabel]         - Stat description (stat slides)
 * @param {string} [opts.ctaText]           - CTA text (cta slides)
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function composeSlide({
  slideType = 'content',
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
}) {
  const template = deriveTemplate(brandColors, colorTemplateIndex);
  const builder = BUILDERS[slideType] || BUILDERS.content;

  // Prepare logo data URI if available
  let logoDataUri = null;
  let logoW = 80;
  let logoH = 30;

  if (logoUrl) {
    try {
      const logoBuffer = await fetchBuffer(logoUrl);
      const logoMeta = await sharp(logoBuffer).metadata();
      const naturalW = logoMeta.width || 200;
      const naturalH = logoMeta.height || 60;
      const targetW = Math.round(canvasW * 0.08);
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
  const svgString = builder({
    template, canvasW, canvasH, headline, bodyText,
    statValue, statLabel, ctaText,
    logoDataUri, logoW, logoH,
  });
  const svgBuffer = Buffer.from(svgString, 'utf-8');

  // If we have a background image, composite the SVG onto it
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
      console.warn('[composeSlide] Failed to load background, using solid:', err.message);
    }
  }

  // No background image — render SVG alone on a solid dark base
  const solidBg = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 15, g: 15, b: 25, alpha: 1 },
    },
  }).png().toBuffer();

  return await sharp(solidBg)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();
}
