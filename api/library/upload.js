import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const buffer = fs.readFileSync(file.filepath);
    const ext = file.originalFilename?.split('.').pop() || 'png';
    const userId = req.user?.id || 'anonymous';
    const fileName = `uploads/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: file.mimetype || 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[Library/Upload] Supabase error:', uploadErr);
      return res.status(500).json({ error: 'Upload failed' });
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    // Clean up temp file
    try { fs.unlinkSync(file.filepath); } catch {}

    return res.json({ url: publicUrl, path: fileName });
  } catch (error) {
    console.error('[Library/Upload] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
