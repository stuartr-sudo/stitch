/**
 * Facebook Graph API publisher.
 * Uses page-scoped tokens to publish posts to Facebook Pages.
 */

/**
 * Publish a post to a Facebook Page with optional images.
 */
export async function publishToFacebookPage({ accessToken, pageId, message, imageUrls }) {
  try {
    // If images provided, upload them and create a multi-photo post
    if (imageUrls?.length > 0) {
      // Upload each photo as unpublished
      const photoIds = [];
      for (const url of imageUrls) {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/photos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              published: false,
              access_token: accessToken,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          photoIds.push(data.id);
        } else {
          console.error('[facebookPublisher] Photo upload failed:', await res.text());
        }
      }

      if (photoIds.length > 0) {
        // Create post with attached photos
        const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
        const postRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message || '',
              attached_media: attachedMedia,
              access_token: accessToken,
            }),
          }
        );

        if (!postRes.ok) {
          const err = await postRes.text();
          return { success: false, error: `Post creation failed: ${err}` };
        }

        const post = await postRes.json();
        return { success: true, postId: post.id };
      }
    }

    // Text-only post (or all image uploads failed)
    const postRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message || '',
          access_token: accessToken,
        }),
      }
    );

    if (!postRes.ok) {
      const err = await postRes.text();
      return { success: false, error: `Post creation failed: ${err}` };
    }

    const post = await postRes.json();
    return { success: true, postId: post.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Publish a video to a Facebook Page.
 * Uses the Graph API video upload endpoint.
 *
 * @param {Object} params
 * @param {string} params.accessToken - Page-scoped access token
 * @param {string} params.pageId - Facebook Page ID
 * @param {string} params.videoUrl - Public URL of the video file
 * @param {string} [params.description] - Video description/message
 * @param {string} [params.title] - Video title
 * @returns {Promise<{success: boolean, videoId?: string, error?: string}>}
 */
export async function publishVideoToFacebookPage({ accessToken, pageId, videoUrl, description, title }) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/videos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: videoUrl,
          description: description || '',
          title: title || '',
          access_token: accessToken,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Facebook video upload failed: ${err}` };
    }

    const data = await res.json();
    return { success: true, videoId: data.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
