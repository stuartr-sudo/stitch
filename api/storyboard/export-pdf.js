/**
 * Storyboard PDF Export
 *
 * Generates a professional storyboard PDF document for client presentation/approval.
 * This is THE deliverable for the creative phase — clients see this before any
 * expensive video generation happens.
 *
 * Layout:
 * - Page 1: Cover page (project name, brand, logline, date, scene count, duration)
 * - Pages 2+: Scene grid (2 scenes per page, landscape layout)
 *   Each scene card: thumbnail, scene number, narrative note, visual direction,
 *   camera/motion, duration, dialogue (if any), emotional tone
 *
 * POST /api/storyboard/export-pdf
 * Body: {
 *   storyboardName: string,
 *   logline: string,
 *   narrativeStyle: string,
 *   overallMood: string,
 *   brandName: string,
 *   aspectRatio: string,
 *   totalDuration: number,
 *   scenes: [{
 *     sceneNumber, narrativeNote, visualPrompt, motionPrompt,
 *     cameraAngle, durationSeconds, dialogue, emotionalTone,
 *     beatType, setting, previewImageUrl
 *   }]
 * }
 *
 * Returns: { success: true, pdfUrl: string }
 */

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';

// ── Color Palette ──

const COLORS = {
  brand:     rgb(44 / 255, 102 / 255, 110 / 255),  // #2C666E
  brandDark: rgb(7 / 255, 57 / 255, 60 / 255),      // #07393C
  text:      rgb(30 / 255, 30 / 255, 30 / 255),
  textLight: rgb(120 / 255, 120 / 255, 120 / 255),
  accent:    rgb(220 / 255, 120 / 255, 50 / 255),
  bg:        rgb(248 / 255, 248 / 255, 248 / 255),
  cardBg:    rgb(255 / 255, 255 / 255, 255 / 255),
  border:    rgb(220 / 255, 220 / 255, 220 / 255),
  white:     rgb(1, 1, 1),
  black:     rgb(0, 0, 0),
};

// ── Text Wrapping Helper ──

function wrapText(text, font, fontSize, maxWidth) {
  const words = (text || '').split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── Truncate text to fit ──

function truncateText(text, maxChars = 200) {
  if (!text || text.length <= maxChars) return text || '';
  return text.substring(0, maxChars - 3) + '...';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      storyboardName = 'Untitled Storyboard',
      logline = '',
      narrativeStyle = '',
      overallMood = '',
      brandName = '',
      aspectRatio = '16:9',
      totalDuration = 0,
      scenes = [],
      clientName = '',
      date = new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' }),
    } = req.body;

    if (!scenes.length) {
      return res.status(400).json({ error: 'No scenes provided' });
    }

    console.log(`[StoryboardPDF] Generating PDF: "${storyboardName}" — ${scenes.length} scenes`);

    // ── Create PDF Document ──
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(storyboardName);
    pdfDoc.setAuthor('StitchStudios');
    pdfDoc.setSubject(`Storyboard: ${storyboardName}`);
    pdfDoc.setCreator('StitchStudios.app');

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Use landscape A4 for better scene layout
    const pageWidth = 841.89;  // A4 landscape width
    const pageHeight = 595.28; // A4 landscape height

    // ═══════════════════════════════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════════════════════════════

    const cover = pdfDoc.addPage([pageWidth, pageHeight]);
    const margin = 60;

    // Brand bar at top
    cover.drawRectangle({
      x: 0, y: pageHeight - 80,
      width: pageWidth, height: 80,
      color: COLORS.brandDark,
    });

    // "STORYBOARD" label
    cover.drawText('STORYBOARD', {
      x: margin, y: pageHeight - 55,
      size: 14, font: fontBold, color: COLORS.white,
    });

    // "StitchStudios" branding
    cover.drawText('StitchStudios', {
      x: pageWidth - margin - fontRegular.widthOfTextAtSize('StitchStudios', 12),
      y: pageHeight - 55,
      size: 12, font: fontRegular, color: rgb(180 / 255, 220 / 255, 220 / 255),
    });

    // Project title
    const titleY = pageHeight - 180;
    const titleLines = wrapText(storyboardName, fontBold, 36, pageWidth - margin * 2);
    titleLines.forEach((line, i) => {
      cover.drawText(line, {
        x: margin, y: titleY - (i * 44),
        size: 36, font: fontBold, color: COLORS.text,
      });
    });

    // Logline
    let infoY = titleY - (titleLines.length * 44) - 30;
    if (logline) {
      const loglineLines = wrapText(`"${logline}"`, fontItalic, 14, pageWidth - margin * 2);
      loglineLines.forEach((line, i) => {
        cover.drawText(line, {
          x: margin, y: infoY - (i * 20),
          size: 14, font: fontItalic, color: COLORS.textLight,
        });
      });
      infoY -= (loglineLines.length * 20) + 30;
    }

    // Divider line
    cover.drawLine({
      start: { x: margin, y: infoY },
      end: { x: pageWidth - margin, y: infoY },
      thickness: 1, color: COLORS.border,
    });
    infoY -= 30;

    // Project details grid
    const details = [
      { label: 'Client', value: clientName || brandName || '—' },
      { label: 'Date', value: date },
      { label: 'Scenes', value: `${scenes.length}` },
      { label: 'Total Duration', value: totalDuration ? `${totalDuration}s` : `${scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0)}s` },
      { label: 'Aspect Ratio', value: aspectRatio },
      { label: 'Mood', value: overallMood || '—' },
      { label: 'Narrative Style', value: narrativeStyle || '—' },
    ];

    const colWidth = (pageWidth - margin * 2) / 4;
    details.forEach((detail, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = margin + col * colWidth;
      const y = infoY - row * 50;

      cover.drawText(detail.label.toUpperCase(), {
        x, y, size: 9, font: fontBold, color: COLORS.textLight,
      });
      cover.drawText(detail.value, {
        x, y: y - 16, size: 13, font: fontRegular, color: COLORS.text,
      });
    });

    // Footer
    cover.drawText('CONFIDENTIAL — For client review and approval', {
      x: margin, y: 40,
      size: 9, font: fontItalic, color: COLORS.textLight,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE PAGES — 2 scenes per page, side by side
    // ═══════════════════════════════════════════════════════════════════════

    // Fetch and embed preview images
    const imageCache = new Map();
    for (const scene of scenes) {
      if (scene.previewImageUrl) {
        try {
          const imgResponse = await fetch(scene.previewImageUrl);
          if (imgResponse.ok) {
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            const contentType = imgResponse.headers.get('content-type') || '';

            let embeddedImage;
            if (contentType.includes('png')) {
              embeddedImage = await pdfDoc.embedPng(imgBuffer);
            } else {
              embeddedImage = await pdfDoc.embedJpg(imgBuffer);
            }
            imageCache.set(scene.sceneNumber, embeddedImage);
          }
        } catch (err) {
          console.warn(`[StoryboardPDF] Failed to embed image for scene ${scene.sceneNumber}:`, err.message);
        }
      }
    }

    // Layout constants for scene cards
    const cardPadding = 15;
    const cardGap = 24;
    const headerHeight = 50;
    const footerHeight = 35;
    const cardWidth = (pageWidth - margin * 2 - cardGap) / 2;
    const cardHeight = pageHeight - headerHeight - footerHeight - margin * 1.5;

    for (let i = 0; i < scenes.length; i += 2) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Page header bar
      page.drawRectangle({
        x: 0, y: pageHeight - headerHeight,
        width: pageWidth, height: headerHeight,
        color: COLORS.brandDark,
      });
      page.drawText(storyboardName, {
        x: margin, y: pageHeight - 33,
        size: 11, font: fontBold, color: COLORS.white,
      });

      const pageNum = Math.floor(i / 2) + 2;
      const totalPages = Math.ceil(scenes.length / 2) + 1;
      page.drawText(`Page ${pageNum} of ${totalPages}`, {
        x: pageWidth - margin - fontRegular.widthOfTextAtSize(`Page ${pageNum} of ${totalPages}`, 9),
        y: pageHeight - 33,
        size: 9, font: fontRegular, color: rgb(180 / 255, 220 / 255, 220 / 255),
      });

      // Render up to 2 scenes on this page
      for (let j = 0; j < 2 && (i + j) < scenes.length; j++) {
        const scene = scenes[i + j];
        const cardX = margin + j * (cardWidth + cardGap);
        const cardY = footerHeight + margin * 0.5;

        // Card background
        page.drawRectangle({
          x: cardX, y: cardY,
          width: cardWidth, height: cardHeight,
          color: COLORS.cardBg,
          borderColor: COLORS.border,
          borderWidth: 1,
        });

        // ── Scene Number Badge ──
        const badgeSize = 28;
        page.drawRectangle({
          x: cardX + cardPadding,
          y: cardY + cardHeight - cardPadding - badgeSize,
          width: badgeSize, height: badgeSize,
          color: COLORS.brand,
        });
        const numText = String(scene.sceneNumber || i + j + 1);
        page.drawText(numText, {
          x: cardX + cardPadding + (badgeSize - fontBold.widthOfTextAtSize(numText, 14)) / 2,
          y: cardY + cardHeight - cardPadding - badgeSize + 8,
          size: 14, font: fontBold, color: COLORS.white,
        });

        // ── Duration + Beat Type + Camera ──
        const metaY = cardY + cardHeight - cardPadding - 10;
        const metaX = cardX + cardPadding + badgeSize + 10;
        const duration = `${scene.durationSeconds || 5}s`;
        const beat = scene.beatType ? ` · ${scene.beatType.replace(/_/g, ' ')}` : '';
        const camera = scene.cameraAngle ? ` · ${scene.cameraAngle}` : '';
        page.drawText(`${duration}${beat}${camera}`, {
          x: metaX, y: metaY,
          size: 9, font: fontBold, color: COLORS.brand,
        });

        // ── Emotional Tone ──
        if (scene.emotionalTone) {
          page.drawText(scene.emotionalTone, {
            x: metaX, y: metaY - 14,
            size: 8, font: fontItalic, color: COLORS.accent,
          });
        }

        // ── Preview Image ──
        const imgAreaY = cardY + cardHeight - cardPadding - badgeSize - 15;
        const imgWidth = cardWidth - cardPadding * 2;
        const imgHeight = cardHeight * 0.38; // ~38% of card height for image

        const embeddedImg = imageCache.get(scene.sceneNumber || i + j + 1);
        if (embeddedImg) {
          // Calculate fit dimensions maintaining aspect ratio
          const imgAspect = embeddedImg.width / embeddedImg.height;
          let drawWidth = imgWidth;
          let drawHeight = imgWidth / imgAspect;
          if (drawHeight > imgHeight) {
            drawHeight = imgHeight;
            drawWidth = imgHeight * imgAspect;
          }
          const imgX = cardX + cardPadding + (imgWidth - drawWidth) / 2;
          const imgY = imgAreaY - drawHeight;

          page.drawImage(embeddedImg, {
            x: imgX, y: imgY,
            width: drawWidth, height: drawHeight,
          });
        } else {
          // Placeholder rectangle
          page.drawRectangle({
            x: cardX + cardPadding,
            y: imgAreaY - imgHeight,
            width: imgWidth, height: imgHeight,
            color: COLORS.bg,
            borderColor: COLORS.border,
            borderWidth: 0.5,
          });
          page.drawText('Preview image pending', {
            x: cardX + cardPadding + imgWidth / 2 - fontItalic.widthOfTextAtSize('Preview image pending', 10) / 2,
            y: imgAreaY - imgHeight / 2 - 5,
            size: 10, font: fontItalic, color: COLORS.textLight,
          });
        }

        // ── Text Content Area ──
        let textY = imgAreaY - imgHeight - 15;
        const textMaxWidth = cardWidth - cardPadding * 2;

        // Narrative Note (what happens)
        if (scene.narrativeNote) {
          page.drawText('STORY', {
            x: cardX + cardPadding, y: textY,
            size: 7, font: fontBold, color: COLORS.textLight,
          });
          textY -= 12;
          const narrativeLines = wrapText(truncateText(scene.narrativeNote, 150), fontRegular, 9, textMaxWidth);
          narrativeLines.slice(0, 3).forEach((line) => {
            page.drawText(line, {
              x: cardX + cardPadding, y: textY,
              size: 9, font: fontRegular, color: COLORS.text,
            });
            textY -= 12;
          });
          textY -= 6;
        }

        // Setting
        if (scene.setting) {
          page.drawText('SETTING', {
            x: cardX + cardPadding, y: textY,
            size: 7, font: fontBold, color: COLORS.textLight,
          });
          textY -= 12;
          const settingLines = wrapText(truncateText(scene.setting, 100), fontRegular, 8, textMaxWidth);
          settingLines.slice(0, 2).forEach((line) => {
            page.drawText(line, {
              x: cardX + cardPadding, y: textY,
              size: 8, font: fontRegular, color: COLORS.text,
            });
            textY -= 11;
          });
          textY -= 4;
        }

        // Camera / Motion
        if (scene.motionPrompt) {
          page.drawText('CAMERA', {
            x: cardX + cardPadding, y: textY,
            size: 7, font: fontBold, color: COLORS.textLight,
          });
          textY -= 12;
          const cameraLines = wrapText(truncateText(scene.motionPrompt, 100), fontRegular, 8, textMaxWidth);
          cameraLines.slice(0, 2).forEach((line) => {
            page.drawText(line, {
              x: cardX + cardPadding, y: textY,
              size: 8, font: fontRegular, color: COLORS.text,
            });
            textY -= 11;
          });
          textY -= 4;
        }

        // Dialogue (if any)
        if (scene.dialogue) {
          page.drawText('DIALOGUE', {
            x: cardX + cardPadding, y: textY,
            size: 7, font: fontBold, color: COLORS.accent,
          });
          textY -= 12;
          const dialogueLines = wrapText(`"${truncateText(scene.dialogue, 120)}"`, fontItalic, 8.5, textMaxWidth);
          dialogueLines.slice(0, 3).forEach((line) => {
            page.drawText(line, {
              x: cardX + cardPadding, y: textY,
              size: 8.5, font: fontItalic, color: COLORS.text,
            });
            textY -= 12;
          });
        }
      }

      // Page footer
      page.drawText('CONFIDENTIAL — StitchStudios', {
        x: margin, y: 20,
        size: 7, font: fontRegular, color: COLORS.textLight,
      });
      page.drawText(date, {
        x: pageWidth - margin - fontRegular.widthOfTextAtSize(date, 7),
        y: 20,
        size: 7, font: fontRegular, color: COLORS.textLight,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SAVE & UPLOAD
    // ═══════════════════════════════════════════════════════════════════════

    const pdfBytes = await pdfDoc.save();
    console.log(`[StoryboardPDF] Generated ${(pdfBytes.length / 1024).toFixed(1)}KB PDF`);

    // Upload to Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const fileName = `storyboards/${Date.now()}-${storyboardName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[StoryboardPDF] Upload failed:', uploadErr.message);
      // Fallback: return as base64 data URL
      const base64 = Buffer.from(pdfBytes).toString('base64');
      return res.json({
        success: true,
        pdfDataUrl: `data:application/pdf;base64,${base64}`,
        pdfUrl: null,
        sizeKB: Math.round(pdfBytes.length / 1024),
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    console.log(`[StoryboardPDF] Uploaded: ${publicUrl}`);

    return res.json({
      success: true,
      pdfUrl: publicUrl,
      sizeKB: Math.round(pdfBytes.length / 1024),
      pageCount: Math.ceil(scenes.length / 2) + 1,
    });

  } catch (err) {
    console.error('[StoryboardPDF] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
