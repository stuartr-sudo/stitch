/**
 * Slide compositor for carousel images.
 * Composites text overlays onto AI-generated background images using Sharp.
 *
 * Design: background image is the star. Text sits on a subtle gradient
 * scrim at the bottom (or center for hook/cta). The image should always
 * be clearly visible — never buried under opaque gradients.
 */

import sharp from 'sharp';

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

// ─── SVG builders ─────────────────────────────────────────────────────────────
// All text is white on a dark scrim. The scrim is a gradient that fades
// from transparent at the top to semi-opaque black at the bottom.
// This lets the AI image show through clearly while keeping text readable.

function bottomScrim(canvasW, canvasH, coverage = 0.6, maxOpacity = 0.75) {
  const scrimTop = Math.round(canvasH * (1 - coverage));
  return `<defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0" />
      <stop offset="30%" stop-color="black" stop-opacity="${maxOpacity * 0.3}" />
      <stop offset="100%" stop-color="black" stop-opacity="${maxOpacity}" />
    </linearGradient>
  </defs>
  <rect x="0" y="${scrimTop}" width="${canvasW}" height="${canvasH - scrimTop}" fill="url(#scrim)" />`;
}

function centerScrim(canvasW, canvasH, opacity = 0.55) {
  return `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="black" opacity="${opacity}" />`;
}

function logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) {
  const x = canvasW - logoW - 30;
  const y = 30;
  return `<image href="${logoDataUri}" x="${x}" y="${y}" width="${logoW}" height="${logoH}" opacity="0.7" preserveAspectRatio="xMidYMid meet" />`;
}

// ─── HOOK: Big centered text, subtle center scrim ─────────────────────────────

function buildHookSvg({ canvasW, canvasH, headline, logoDataUri, logoW, logoH }) {
  const fontSize = Math.round(canvasH * 0.07);
  const lineHeight = Math.round(fontSize * 1.25);
  const charsPerLine = Math.round(canvasW / (fontSize * 0.55));
  const lines = wrapText(headline || '', charsPerLine, 4);
  const blockH = lines.length * lineHeight;
  const startY = (canvasH - blockH) / 2 + fontSize;

  const textEls = lines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" filter="url(#shadow)">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.7" />
    </filter>
  </defs>
  ${centerScrim(canvasW, canvasH, 0.45)}
  ${textEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── CONTENT: Headline + body, bottom-aligned with scrim ──────────────────────

function buildContentSvg({ canvasW, canvasH, headline, bodyText, logoDataUri, logoW, logoH }) {
  const headSize = Math.round(canvasH * 0.045);
  const bodySize = Math.round(canvasH * 0.03);
  const headLH = Math.round(headSize * 1.3);
  const bodyLH = Math.round(bodySize * 1.5);
  const margin = Math.round(canvasW * 0.08);
  const textW = canvasW - margin * 2;

  const headLines = wrapText(headline || '', Math.round(textW / (headSize * 0.55)), 3);
  const bodyLines = wrapText(bodyText || '', Math.round(textW / (bodySize * 0.52)), 6);

  // Position text in bottom 45% of canvas
  const totalTextH = headLines.length * headLH + 20 + bodyLines.length * bodyLH;
  const bottomPad = Math.round(canvasH * 0.08);
  const headStartY = canvasH - bottomPad - totalTextH + headSize;

  const headEls = headLines.map((line, i) =>
    `<text x="${margin}" y="${headStartY + i * headLH}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${headSize}" font-weight="bold" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  const bodyStartY = headStartY + headLines.length * headLH + 20;
  const bodyEls = bodyLines.map((line, i) =>
    `<text x="${margin}" y="${bodyStartY + i * bodyLH}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${bodySize}" fill="white" opacity="0.9">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  ${bottomScrim(canvasW, canvasH, 0.65, 0.8)}
  ${headEls}
  ${bodyEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── STAT: Big number centered, label below ───────────────────────────────────

function buildStatSvg({ canvasW, canvasH, statValue, statLabel, headline, logoDataUri, logoW, logoH }) {
  const statSize = Math.round(canvasH * 0.14);
  const labelSize = Math.round(canvasH * 0.032);
  const labelLH = Math.round(labelSize * 1.4);
  const labelChars = Math.round((canvasW * 0.7) / (labelSize * 0.52));
  const labelLines = wrapText(statLabel || '', labelChars, 3);

  const statY = canvasH * 0.45;
  const labelStartY = statY + 40;

  const labelEls = labelLines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${labelStartY + i * labelLH}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${labelSize}" fill="white" opacity="0.9">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.7" />
    </filter>
  </defs>
  ${centerScrim(canvasW, canvasH, 0.5)}
  <text x="${canvasW / 2}" y="${statY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${statSize}" font-weight="bold" fill="white" filter="url(#shadow)">${xmlEscape(statValue || '')}</text>
  ${labelEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── QUOTE: Centered italic text with quotation mark ──────────────────────────

function buildQuoteSvg({ canvasW, canvasH, headline, logoDataUri, logoW, logoH }) {
  const fontSize = Math.round(canvasH * 0.045);
  const lineHeight = Math.round(fontSize * 1.35);
  const charsPerLine = Math.round((canvasW * 0.75) / (fontSize * 0.55));
  const lines = wrapText(headline || '', charsPerLine, 5);
  const blockH = lines.length * lineHeight;
  const startY = (canvasH - blockH) / 2 + fontSize;

  const textEls = lines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" font-style="italic" font-weight="bold" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  const quoteY = startY - fontSize * 0.8;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  ${centerScrim(canvasW, canvasH, 0.5)}
  <text x="${canvasW / 2}" y="${quoteY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${Math.round(fontSize * 2)}" fill="white" opacity="0.4">&#x201C;</text>
  ${textEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── CTA: Centered bold text ──────────────────────────────────────────────────

function buildCtaSvg({ canvasW, canvasH, ctaText, headline, logoDataUri, logoW, logoH }) {
  const fontSize = Math.round(canvasH * 0.055);
  const lineHeight = Math.round(fontSize * 1.3);
  const charsPerLine = Math.round((canvasW * 0.7) / (fontSize * 0.55));
  const text = ctaText || headline || '';
  const lines = wrapText(text, charsPerLine, 3);
  const blockH = lines.length * lineHeight;
  const startY = (canvasH - blockH) / 2 + fontSize;

  const textEls = lines.map((line, i) =>
    `<text x="${canvasW / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" filter="url(#shadow)">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.7" />
    </filter>
  </defs>
  ${centerScrim(canvasW, canvasH, 0.5)}
  ${textEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── IMAGE_FOCUS: Minimal — bottom caption bar only ───────────────────────────

function buildImageFocusSvg({ canvasW, canvasH, headline, logoDataUri, logoW, logoH }) {
  const fontSize = Math.round(canvasH * 0.03);
  const lineHeight = Math.round(fontSize * 1.4);
  const margin = Math.round(canvasW * 0.06);
  const charsPerLine = Math.round((canvasW - margin * 2) / (fontSize * 0.52));
  const lines = headline ? wrapText(headline, charsPerLine, 2) : [];

  const bottomPad = Math.round(canvasH * 0.05);
  const startY = canvasH - bottomPad - (lines.length - 1) * lineHeight;

  const textEls = lines.map((line, i) =>
    `<text x="${margin}" y="${startY + i * lineHeight}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${fontSize}" fill="white">${xmlEscape(line)}</text>`
  ).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  ${bottomScrim(canvasW, canvasH, 0.35, 0.7)}
  ${textEls}
  ${logoDataUri ? logoWatermark(logoDataUri, canvasW, canvasH, logoW, logoH) : ''}
</svg>`;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const BUILDERS = {
  hook: buildHookSvg,
  content: buildContentSvg,
  stat: buildStatSvg,
  quote: buildQuoteSvg,
  cta: buildCtaSvg,
  image_focus: buildImageFocusSvg,
};

// ─── Public API ───────────────────────────────────────────────────────────────

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
  const builder = BUILDERS[slideType] || BUILDERS.content;

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
  const svgString = builder({
    canvasW, canvasH, headline, bodyText,
    statValue, statLabel, ctaText,
    logoDataUri, logoW, logoH,
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
