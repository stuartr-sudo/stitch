/**
 * Image compositor for LinkedIn post images.
 * Composes a branded overlay (gradient, orb, quote, pills, logo) onto a base image.
 *
 * Uses `sharp` for image processing and SVG for the overlay layers.
 */

import sharp from 'sharp';
import { TEMPLATES } from './colorTemplates.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** XML-escape a string for safe SVG text insertion. */
function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert a CSS-style gradient angle (degrees) to SVG linearGradient
 * x1/y1/x2/y2 coordinates (percentage strings).
 *
 * SVG angle 0° = bottom-to-top. CSS angle 0° = top-to-bottom.
 * The formula: angle in CSS → subtract 90° → convert to radians.
 */
function angleToSvgCoords(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  // Map the unit vector to [0,1] percentage coordinates
  const x2 = (Math.cos(rad) + 1) / 2;
  const y2 = (Math.sin(rad) + 1) / 2;
  const x1 = 1 - x2;
  const y1 = 1 - y2;
  return {
    x1: `${(x1 * 100).toFixed(1)}%`,
    y1: `${(y1 * 100).toFixed(1)}%`,
    x2: `${(x2 * 100).toFixed(1)}%`,
    y2: `${(y2 * 100).toFixed(1)}%`,
  };
}

/**
 * Word-wrap text to a maximum number of characters per line.
 * Returns an array of lines, capped at maxLines.
 */
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
      // Hard-truncate a single word that exceeds the line width
      current = word.length > charsPerLine ? word.slice(0, charsPerLine - 1) + '\u2026' : word;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/**
 * Fetch a URL and return a Buffer.
 */
async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── SVG builder ────────────────────────────────────────────────────────────

/**
 * Build the full SVG overlay string.
 *
 * @param {object} opts
 * @param {object} opts.template   - Color template object
 * @param {string} opts.excerpt    - Quote text
 * @param {string} opts.seriesTitle
 * @param {number} opts.postNumber
 * @param {string} opts.logoDataUri  - base64 data URI for the logo image
 * @param {number} opts.logoNaturalW - original logo pixel width
 * @param {number} opts.logoNaturalH - original logo pixel height
 * @param {number} opts.canvasW
 * @param {number} opts.canvasH
 * @param {boolean} opts.isSquare
 */
function buildSvg({
  template,
  excerpt,
  seriesTitle,
  postNumber,
  logoDataUri,
  logoNaturalW,
  logoNaturalH,
  canvasW,
  canvasH,
  isSquare,
}) {
  const { gradient, orb, pill } = template;

  // ── Gradient ──────────────────────────────────────────────────────────────
  const gc = angleToSvgCoords(gradient.angle);
  const [stop0, stop1, stop2] = gradient.stops;

  // ── Orb ───────────────────────────────────────────────────────────────────
  const orbCX = canvasW / 2;
  const orbCY = (orb.centerY / 100) * canvasH;
  const orbRX = isSquare ? 450 : 550;
  const orbRY = isSquare ? 400 : 280;

  // ── Logo pill ─────────────────────────────────────────────────────────────
  const logoTargetW = isSquare ? 140 : 100;
  const logoScale = logoTargetW / logoNaturalW;
  const logoH = Math.round(logoNaturalH * logoScale);
  const pillW = logoTargetW + 72;
  const pillH = logoH + 32;
  const pillR = pillH / 2;
  // Logo always top-left; circular for round logos, pill for wide
  const logoAspect = logoNaturalW / logoNaturalH;
  const isRoundLogo = logoAspect >= 0.8 && logoAspect <= 1.2;
  const pillX = isSquare ? 40 : 20;
  const pillY = isSquare ? 55 : 20;
  const logoInsideX = pillX + 36;
  const logoInsideY = pillY + 16;

  // ── Quote text ────────────────────────────────────────────────────────────
  const charsPerLine = isSquare ? 18 : 28;
  const maxLines = isSquare ? 3 : 2;
  const fontSize = isSquare ? 72 : 56;
  const lineHeight = isSquare ? 86 : 70;
  const quoteFontSize = isSquare ? 90 : 72;

  const lines = wrapText(excerpt, charsPerLine, maxLines);
  const blockH = lines.length * lineHeight;

  // Center the quote block vertically at the target Y
  const quoteBlockCenterY = isSquare ? 420 : canvasH / 2 + 10;
  const quoteMarkY = quoteBlockCenterY - blockH / 2 - quoteFontSize * 0.3;
  const firstLineBaselineY = quoteBlockCenterY - blockH / 2 + fontSize;

  // ── Series pill (bottom center) ───────────────────────────────────────────
  const seriesFontSize = isSquare ? 24 : 20;
  const seriesLetterSpacing = isSquare ? 5 : 4;
  const seriesPaddingX = 40;
  const seriesPaddingY = 18;
  // Approximate text width (DejaVu Sans ~0.6 em per char at given font-size)
  const seriesTextW = seriesTitle.length * seriesFontSize * 0.6;
  const seriesPillW = seriesTextW + seriesPaddingX * 2;
  const seriesPillH = seriesFontSize + seriesPaddingY * 2;
  const seriesPillR = seriesPillH / 2;
  const seriesPillX = (canvasW - seriesPillW) / 2;
  const seriesPillY = isSquare ? 860 : canvasH - seriesPillH - 36;
  const seriesTextX = canvasW / 2;
  const seriesTextY = seriesPillY + seriesPillH / 2 + seriesFontSize * 0.35;

  // ── Watch number ─────────────────────────────────────────────────────────
  const watchFontSize = isSquare ? 22 : 18;
  const watchText = `Watch #${postNumber}`;
  // Square: centered, below pill + 36px; Landscape: bottom-right, at pill level
  const watchX = isSquare ? canvasW / 2 : canvasW - 40;
  const watchY = isSquare
    ? seriesPillY + seriesPillH + 36 + watchFontSize
    : seriesPillY + seriesPillH / 2 + watchFontSize * 0.35;
  const watchAnchor = isSquare ? 'middle' : 'end';

  // ── SVG assembly ──────────────────────────────────────────────────────────
  const lineElements = lines
    .map((line, i) => {
      const y = firstLineBaselineY + i * lineHeight;
      return `<text x="${canvasW / 2}" y="${y}" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="${fontSize}" font-weight="bold" fill="white">${xmlEscape(line)}</text>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}">
  <defs>
    <!-- 3-stop linear gradient -->
    <linearGradient id="bg-grad" x1="${gc.x1}" y1="${gc.y1}" x2="${gc.x2}" y2="${gc.y2}">
      <stop offset="0%"   stop-color="${stop0}" />
      <stop offset="50%"  stop-color="${stop1}" />
      <stop offset="100%" stop-color="${stop2}" />
    </linearGradient>

    <!-- Radial orb gradient -->
    <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${orb.color}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${orb.color}" stop-opacity="0"   />
    </radialGradient>

    <!-- Noise filter -->
    <filter id="noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" result="noiseOut" />
      <feColorMatrix type="saturate" values="0" in="noiseOut" result="grayNoise" />
      <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
      <feComposite in="blended" in2="SourceGraphic" operator="in" />
    </filter>
  </defs>

  <!-- Layer 1: Gradient background (88% opacity) -->
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="url(#bg-grad)" opacity="0.88" />

  <!-- Layer 2: Radial orb -->
  <ellipse cx="${orbCX}" cy="${orbCY}" rx="${orbRX}" ry="${orbRY}" fill="url(#orb-grad)" />

  <!-- Layer 3: Noise texture -->
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="white" opacity="0.035" filter="url(#noise)" />

  <!-- Layer 4: Decorative quote mark -->
  <text x="${canvasW / 2}" y="${quoteMarkY}" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="${quoteFontSize}" fill="white" opacity="0.85">&#x201C;</text>

  <!-- Layer 5: Quote text -->
  ${lineElements}

  <!-- Layer 6: Series pill -->
  <rect x="${seriesPillX}" y="${seriesPillY}" width="${seriesPillW}" height="${seriesPillH}" rx="${seriesPillR}" ry="${seriesPillR}" fill="${pill.fill}" stroke="${pill.stroke}" stroke-width="1" />
  <text x="${seriesTextX}" y="${seriesTextY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${seriesFontSize}" fill="white" letter-spacing="${seriesLetterSpacing}">${xmlEscape(seriesTitle.toUpperCase())}</text>

  <!-- Layer 7: Watch number -->
  <text x="${watchX}" y="${watchY}" text-anchor="${watchAnchor}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${watchFontSize}" fill="white" opacity="0.85" letter-spacing="2">${xmlEscape(watchText)}</text>

  <!-- Layer 8: Logo container background -->
  ${isRoundLogo
    ? `<circle cx="${pillX + pillH / 2}" cy="${pillY + pillH / 2}" r="${pillH / 2}" fill="white" opacity="0.97" />`
    : `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}" ry="${pillR}" fill="white" opacity="0.97" />`
  }

  <!-- Layer 9: Logo image -->
  ${isRoundLogo
    ? `<image href="${logoDataUri}" x="${pillX + (pillH - logoTargetW) / 2}" y="${logoInsideY}" width="${logoTargetW}" height="${logoH}" preserveAspectRatio="xMidYMid meet" clip-path="circle(${pillH / 2 - 4}px at ${pillH / 2}px ${pillH / 2}px)" />`
    : `<image href="${logoDataUri}" x="${logoInsideX}" y="${logoInsideY}" width="${logoTargetW}" height="${logoH}" preserveAspectRatio="xMidYMid meet" />`
  }
</svg>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compose a branded LinkedIn post image.
 *
 * @param {object} opts
 * @param {string} opts.image_url      - URL of the base image
 * @param {string} opts.logo_url       - URL of the brand logo
 * @param {string} opts.series_title   - Name of the LinkedIn series
 * @param {number} opts.post_number    - Post number in the series (1-indexed)
 * @param {string} opts.excerpt        - Quote/excerpt text
 * @param {number} [opts.template_index] - 0-5; if omitted, derived from post_number
 * @param {'square'|'landscape'} [opts.format='square'] - Output format
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function composeImage({
  image_url,
  logo_url,
  series_title,
  post_number,
  excerpt,
  template_index,
  format = 'square',
}) {
  const isSquare = format !== 'landscape';
  const canvasW = isSquare ? 1080 : 1200;
  const canvasH = isSquare ? 1080 : 628;

  // Determine template
  const tplIndex = template_index != null ? template_index % 6 : (post_number - 1) % 6;
  const resolvedTemplate = TEMPLATES[tplIndex];

  // Fetch base image and logo in parallel
  const [imageBuffer, logoBuffer] = await Promise.all([
    fetchBuffer(image_url),
    fetchBuffer(logo_url),
  ]);

  // Resize base image to canvas dimensions (cover crop)
  const resizedBase = await sharp(imageBuffer)
    .resize(canvasW, canvasH, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  // Get natural logo dimensions so we can scale it correctly
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoNaturalW = logoMeta.width || 200;
  const logoNaturalH = logoMeta.height || 60;

  // Resize logo to target width and get the resulting buffer as PNG for data URI
  const logoTargetW = isSquare ? 140 : 100;
  const logoScale = logoTargetW / logoNaturalW;
  const logoTargetH = Math.round(logoNaturalH * logoScale);

  const resizedLogoBuffer = await sharp(logoBuffer)
    .resize(logoTargetW, logoTargetH, { fit: 'fill' })
    .png()
    .toBuffer();

  const logoDataUri = `data:image/png;base64,${resizedLogoBuffer.toString('base64')}`;

  // Build SVG overlay
  const svgString = buildSvg({
    template: resolvedTemplate,
    excerpt,
    seriesTitle: series_title,
    postNumber: post_number,
    logoDataUri,
    logoNaturalW: logoTargetW,   // use the resized dims since we embed the resized logo
    logoNaturalH: logoTargetH,
    canvasW,
    canvasH,
    isSquare,
  });

  const svgBuffer = Buffer.from(svgString, 'utf-8');

  // Composite SVG overlay onto base image
  const output = await sharp(resizedBase)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return output;
}
