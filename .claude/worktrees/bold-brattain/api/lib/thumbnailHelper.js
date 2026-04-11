import sharp from 'sharp';

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

export async function generateImageThumbnail(imageBuffer) {
  return sharp(imageBuffer)
    .resize(THUMB_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();
}

export async function downloadToBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateAndUploadImageThumbnail(imageUrl, supabase, userId) {
  try {
    const buffer = await downloadToBuffer(imageUrl);
    const thumbBuffer = await generateImageThumbnail(buffer);
    const filename = `thumbnails/${userId}/${Date.now()}-thumb.jpg`;
    const { data, error } = await supabase.storage.from('media').upload(filename, thumbBuffer, { contentType: 'image/jpeg', upsert: false });
    if (error) { console.warn('[Thumbnail] Upload failed:', error.message); return null; }
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[Thumbnail] Generation failed:', err.message);
    return null;
  }
}
