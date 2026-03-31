/**
 * TikTok Content Posting API publisher.
 * Supports photo carousels and video uploads.
 */

/**
 * Publish a photo carousel to TikTok.
 * Uses the Content Posting API (photo mode).
 */
export async function publishCarouselToTikTok({ accessToken, imageUrls, caption }) {
  try {
    // Step 1: Initialize photo post
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption || '',
          privacy_level: 'SELF_ONLY', // Start as private, user can change
          disable_comment: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_images: imageUrls.map(url => url),
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO',
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      return { success: false, error: `TikTok init failed: ${err}` };
    }

    const initData = await initRes.json();

    if (initData.error?.code !== 'ok') {
      return { success: false, error: initData.error?.message || 'TikTok publish failed' };
    }

    return {
      success: true,
      publishId: initData.data?.publish_id,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Publish a video to TikTok via URL pull.
 */
export async function publishVideoToTikTok({ accessToken, videoUrl, caption }) {
  try {
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption || '',
          privacy_level: 'SELF_ONLY',
          disable_comment: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
        post_mode: 'DIRECT_POST',
        media_type: 'VIDEO',
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      return { success: false, error: `TikTok video init failed: ${err}` };
    }

    const initData = await initRes.json();

    if (initData.error?.code !== 'ok') {
      return { success: false, error: initData.error?.message || 'TikTok video publish failed' };
    }

    return {
      success: true,
      publishId: initData.data?.publish_id,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
