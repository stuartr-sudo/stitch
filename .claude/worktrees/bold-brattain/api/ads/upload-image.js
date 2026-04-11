/**
 * POST /api/ads/upload-image — Upload one or more ad images to Supabase storage.
 * Accepts multipart form data with field name "image" (single or multiple files).
 * Returns { urls: string[] }
 */
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024, multiples: true });

    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const imageFiles = [files.image].flat().filter(Boolean);
    if (imageFiles.length === 0) return res.status(400).json({ error: 'No image files provided' });

    const urls = [];
    for (const imageFile of imageFiles) {
      const mimeType = imageFile.mimetype || 'image/png';
      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({ error: 'File must be an image' });
      }

      const originalExt = imageFile.originalFilename
        ? path.extname(imageFile.originalFilename).replace('.', '').toLowerCase()
        : null;
      const mimeExt = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      const ext = originalExt || mimeExt;

      const uuid = randomUUID();
      const storagePath = `ads/${userId}/${uuid}.${ext}`;
      const fileBuffer = fs.readFileSync(imageFile.filepath);

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
      urls.push(publicUrl);
    }

    return res.json({ urls });
  } catch (err) {
    console.error('[Ads] Upload error:', err.message);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
