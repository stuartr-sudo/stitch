/**
 * Storyboard Grid Generator
 *
 * Generates a single composite grid image containing all storyboard scenes
 * arranged in a grid layout. This lets a single AI image generation call
 * produce all scene thumbnails with inherent visual consistency (shared
 * self-attention across the grid).
 *
 * After generation the grid image is sliced into individual cells using
 * sharp and each cell is uploaded separately.
 *
 * Used by Enhancement 2 (one-shot grid) and Enhancement 5 (bookend interpolation).
 */

import sharp from 'sharp';

// ── Grid Layout Calculator ────────────────────────────────────────────────────

/**
 * Choose optimal cols × rows for a given scene count.
 * Prefers landscape arrangements (more cols than rows).
 *
 * @param {number} sceneCount
 * @returns {{ cols: number, rows: number, total: number }}
 */
export function calculateGridLayout(sceneCount) {
  const LAYOUTS = {
    4:  { cols: 2, rows: 2 },
    6:  { cols: 3, rows: 2 },
    8:  { cols: 4, rows: 2 },
    9:  { cols: 3, rows: 3 },
    10: { cols: 5, rows: 2 },
    12: { cols: 4, rows: 3 },
    15: { cols: 5, rows: 3 },
    16: { cols: 4, rows: 4 },
  };

  // Exact match
  if (LAYOUTS[sceneCount]) {
    return { ...LAYOUTS[sceneCount], total: sceneCount };
  }

  // Find nearest layout that can hold all scenes
  const maxScenes = Math.max(...Object.keys(LAYOUTS).map(Number));
  if (sceneCount > maxScenes) {
    // Large storyboard: use 4-column grid
    const rows = Math.ceil(sceneCount / 4);
    return { cols: 4, rows, total: sceneCount };
  }

  // Find smallest layout that fits
  const fits = Object.entries(LAYOUTS)
    .filter(([k]) => parseInt(k) >= sceneCount)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));

  if (fits.length > 0) {
    const [, layout] = fits[0];
    return { ...layout, total: sceneCount };
  }

  // Fallback: square-ish
  const cols = Math.ceil(Math.sqrt(sceneCount));
  const rows = Math.ceil(sceneCount / cols);
  return { cols, rows, total: sceneCount };
}

// ── Grid Prompt Builder ───────────────────────────────────────────────────────

/**
 * Build a unified grid prompt for all storyboard scenes.
 * Each cell is described precisely so the AI places the right content
 * in the right grid position.
 *
 * @param {object} opts
 * @param {Array} opts.scenes - Array of scene objects with previewImagePrompt and narrativeNote
 * @param {string} opts.style - Visual style description (from styleKey prompt)
 * @param {string} [opts.anchorDescription] - Anchor image style lock description
 * @param {number} opts.cols - Number of grid columns
 * @param {number} opts.rows - Number of grid rows
 * @param {string} [opts.aspectRatio] - Aspect ratio for cell sizing (16:9 | 9:16 | 1:1)
 * @returns {string} The full grid generation prompt
 */
export function buildGridPrompt({ scenes, style, anchorDescription, cols, rows, aspectRatio = '16:9' }) {
  const total = scenes.length;

  // Determine cell aspect for the overall grid aspect
  const cellAspects = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
  const cellAspect = cellAspects[aspectRatio] || '16:9';

  // Style/consistency foundation
  const styleLine = anchorDescription
    ? `VISUAL STYLE (apply to every single cell): ${anchorDescription.substring(0, 200)}`
    : style
    ? `VISUAL STYLE (apply to every single cell): ${style.substring(0, 200)}`
    : 'VISUAL STYLE: Professional cinematic photography, consistent lighting and color grading throughout all cells';

  // Cell descriptions
  const cellDescriptions = scenes.map((scene, idx) => {
    const sceneNum = idx + 1;
    const col = (idx % cols) + 1;
    const row = Math.floor(idx / cols) + 1;
    const sceneDesc = scene.previewImagePrompt || scene.narrative_note || `Scene ${sceneNum}`;
    return `Cell [Row ${row}, Column ${col}] — Scene ${sceneNum}: ${sceneDesc.substring(0, 200)}`;
  });

  return `Create a ${cols} × ${rows} storyboard grid image containing ${total} individual scene thumbnails.

LAYOUT: The image is divided into exactly ${cols} columns and ${rows} rows, creating ${cols * rows} equal cells. Each cell has a ${cellAspect} aspect ratio. The cells are arranged left-to-right, top-to-bottom.

${styleLine}

CRITICAL CONSISTENCY RULES:
- All cells must share the same visual style, rendering technique, and color palette
- Lighting quality and color temperature should be consistent across the entire grid
- Character appearances (if present) must be visually consistent across all cells
- The grid should read as a unified visual document, not a collection of unrelated images

CELL CONTENT — describe exactly what to draw in each cell:
${cellDescriptions.join('\n')}

GRID SPECIFICATIONS:
- Draw thin 2px border lines between cells (light gray #CCCCCC)
- Number each cell subtly in the bottom-left corner (small white text with dark shadow)
- No other text, labels, or overlays
- Each cell should be clearly composed and readable as a standalone image`;
}

// ── Grid Image Slicer ─────────────────────────────────────────────────────────

/**
 * Slice a composite grid image into individual cell images.
 * Returns an array of { buffer, col, row, sceneIndex } objects.
 *
 * @param {Buffer} imageBuffer - The grid image as a buffer
 * @param {number} cols - Number of grid columns
 * @param {number} rows - Number of grid rows
 * @param {number} [totalCells] - Actual cell count (may be less than cols×rows)
 * @returns {Promise<Array<{ buffer: Buffer, col: number, row: number, sceneIndex: number }>>}
 */
export async function sliceGrid(imageBuffer, cols, rows, totalCells) {
  const { width, height } = await sharp(imageBuffer).metadata();
  const cellWidth = Math.floor(width / cols);
  const cellHeight = Math.floor(height / rows);
  const limit = totalCells || cols * rows;

  const cells = [];
  for (let i = 0; i < limit; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = col * cellWidth;
    const top = row * cellHeight;

    // Extract the cell, adding a small inset to avoid border lines
    const inset = 3;
    const cellBuffer = await sharp(imageBuffer)
      .extract({
        left: left + inset,
        top: top + inset,
        width: Math.max(cellWidth - 2 * inset, 1),
        height: Math.max(cellHeight - 2 * inset, 1),
      })
      .jpeg({ quality: 92 })
      .toBuffer();

    cells.push({
      buffer: cellBuffer,
      col,
      row,
      sceneIndex: i,
    });
  }

  return cells;
}

/**
 * Upload a cell buffer to Supabase storage.
 *
 * @param {Buffer} buffer
 * @param {object} supabase
 * @param {string} storyboardId
 * @param {number} sceneIndex
 * @returns {Promise<string>} Public URL
 */
export async function uploadCellToSupabase(buffer, supabase, storyboardId, sceneIndex) {
  const filename = `storyboard-grid-${storyboardId}-cell-${sceneIndex}-${Date.now()}.jpg`;
  const storagePath = `storyboard/${storyboardId}/grid/${filename}`;

  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) throw new Error(`Cell upload failed: ${uploadErr.message}`);

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath);
  return urlData.publicUrl;
}
