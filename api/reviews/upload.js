import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    const form = formidable({ maxFileSize: 5 * 1024 * 1024 }); // 5MB limit

    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const mimeType = imageFile.mimetype || 'image/png';
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Derive extension from original filename or mime type
    const originalExt = imageFile.originalFilename
      ? path.extname(imageFile.originalFilename).replace('.', '').toLowerCase()
      : null;
    const mimeExt = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const ext = originalExt || mimeExt;

    const uuid = randomUUID();
    const storagePath = `reviews/${userId}/${uuid}.${ext}`;

    const fileBuffer = fs.readFileSync(imageFile.filepath);

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);

    return res.json({ url: publicUrl });
  } catch (err) {
    console.error('[Reviews] Upload error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
