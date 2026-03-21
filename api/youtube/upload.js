/**
 * POST /api/youtube/upload
 * Uploads a campaign draft's video to YouTube.
 * Body: { draft_id, brand_username, title, description, tags, privacy }
 */

import { createClient } from '@supabase/supabase-js';
import { loadTokens } from '../lib/youtubeTokens.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id, brand_username, title, description, tags = [], privacy = 'unlisted' } = req.body;

  if (!draft_id || !brand_username || !title) {
    return res.status(400).json({ error: 'draft_id, brand_username, and title are required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: draft, error: draftError } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('id', draft_id)
    .maybeSingle();

  if (draftError || !draft) return res.status(404).json({ error: 'Draft not found' });

  if (draft.publish_status === 'publishing') {
    return res.status(409).json({ error: 'Upload already in progress' });
  }

  const assets = draft.assets_json || {};
  const videoUrl = assets.final_video_url || assets.video_url || assets.assembled_url;
  if (!videoUrl) return res.status(400).json({ error: 'No video URL found on this draft' });

  const tokens = await loadTokens(brand_username, supabase);
  if (!tokens) {
    return res.status(401).json({ error: 'YouTube not connected for this brand. Connect in Brand Kit.' });
  }

  await supabase.from('ad_drafts').update({ publish_status: 'publishing' }).eq('id', draft_id);

  try {
    console.log(`[youtube/upload] Downloading video: ${videoUrl}`);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const contentLength = videoBuffer.length;

    // Detect Shorts: if platforms include shorts-type or video is short-form, add #Shorts
    const platforms = draft.platforms || [];
    const isShort = platforms.some(p => ['tiktok', 'instagram_reels', 'youtube_shorts'].includes(p));
    let finalTitle = title.slice(0, 100);
    if (isShort && !finalTitle.includes('#Shorts')) {
      finalTitle = `${finalTitle} #Shorts`.slice(0, 100);
    }

    const metadata = {
      snippet: {
        title: finalTitle,
        description: description || '',
        tags: tags.length > 0 ? tags : undefined,
        categoryId: '22',
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    };

    console.log(`[youtube/upload] Initiating resumable upload (${contentLength} bytes)`);
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': contentLength,
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`YouTube upload init failed (${initRes.status}): ${errText}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned from YouTube');

    console.log(`[youtube/upload] Uploading video bytes...`);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': contentLength,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const youtubeVideoId = uploadData.id;

    console.log(`[youtube/upload] Success! Video ID: ${youtubeVideoId}`);

    await supabase
      .from('ad_drafts')
      .update({
        youtube_video_id: youtubeVideoId,
        publish_status: 'published',
      })
      .eq('id', draft_id);

    return res.json({
      success: true,
      youtube_video_id: youtubeVideoId,
      youtube_url: `https://youtube.com/watch?v=${youtubeVideoId}`,
    });
  } catch (err) {
    console.error('[youtube/upload] Error:', err);
    await supabase.from('ad_drafts').update({ publish_status: 'ready' }).eq('id', draft_id);
    return res.status(500).json({ error: err.message });
  }
}
