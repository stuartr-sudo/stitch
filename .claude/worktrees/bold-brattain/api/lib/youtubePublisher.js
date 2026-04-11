/**
 * YouTube video publisher — reusable function for the publish queue.
 * Extracted from api/youtube/upload.js to work with tokenManager tokens.
 *
 * Uses YouTube Data API v3 resumable upload protocol.
 */

/**
 * Upload a video to YouTube.
 *
 * @param {Object} params
 * @param {string} params.accessToken - OAuth access token from tokenManager
 * @param {string} params.videoUrl - URL of the video file to upload
 * @param {string} params.title - Video title (max 100 chars)
 * @param {string} [params.description] - Video description
 * @param {string} [params.privacy] - 'public' | 'unlisted' | 'private' (default 'public')
 * @param {string[]} [params.tags] - Video tags
 * @returns {Promise<{success: boolean, videoId?: string, youtubeUrl?: string, error?: string}>}
 */
export async function publishVideoToYouTube({
  accessToken,
  videoUrl,
  title,
  description = '',
  privacy = 'public',
  tags = [],
}) {
  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const contentLength = videoBuffer.length;

    // Enforce max title length
    let finalTitle = title.slice(0, 100);

    const metadata = {
      snippet: {
        title: finalTitle,
        description: description || '',
        tags: tags.length > 0 ? tags : undefined,
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: true,
      },
    };

    // Initiate resumable upload
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': contentLength,
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      return { success: false, error: `YouTube upload init failed (${initRes.status}): ${errText}` };
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) return { success: false, error: 'No upload URL returned from YouTube' };

    // Upload video bytes
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
      return { success: false, error: `YouTube upload failed (${uploadRes.status}): ${errText}` };
    }

    const uploadData = await uploadRes.json();
    const videoId = uploadData.id;

    return {
      success: true,
      videoId,
      youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
