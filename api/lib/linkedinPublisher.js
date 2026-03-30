/**
 * LinkedIn API v2 publisher.
 *
 * Usage:
 *   import { publishToLinkedIn } from '../lib/linkedinPublisher.js';
 *   const result = await publishToLinkedIn({
 *     accessToken: 'user_access_token',
 *     body: 'Post text',
 *     imageUrl: 'https://example.com/image.png' // optional
 *   });
 *   // { success: true, linkedinPostId: 'urn:li:share:...' } or
 *   // { success: false, error: 'error message' }
 */

/**
 * Publish a post to LinkedIn with optional image.
 * @param {Object} params
 * @param {string} params.accessToken - LinkedIn user access token
 * @param {string} params.body - Post text content
 * @param {string} [params.imageUrl] - Optional image URL to attach
 * @returns {Promise<{success: boolean, linkedinPostId?: string, error?: string}>}
 */
export async function publishToLinkedIn({ accessToken, body, imageUrl }) {
  try {
    // Step 1: Get user profile to extract personUrn
    const userInfo = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userInfo.ok) {
      const errorData = await userInfo.text();
      return { success: false, error: `Failed to get user info: ${userInfo.status}` };
    }

    const userData = await userInfo.json();
    const personUrn = `urn:li:person:${userData.sub}`;

    // Step 2: Handle image upload if provided
    let imageUrn = null;
    if (imageUrl) {
      imageUrn = await uploadImageToLinkedIn(accessToken, personUrn, imageUrl);
      if (!imageUrn) {
        return { success: false, error: 'Failed to upload image to LinkedIn' };
      }
    }

    // Step 3: Create post
    const postBody = {
      author: personUrn,
      commentary: body,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
      },
      lifecycleState: 'PUBLISHED',
    };

    if (imageUrn) {
      postBody.content = {
        media: {
          id: imageUrn,
        },
      };
    }

    const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.text();
      return { success: false, error: `Failed to create post: ${postResponse.status}` };
    }

    // Extract post URN from x-restli-id header
    const linkedinPostId = postResponse.headers.get('x-restli-id');

    return { success: true, linkedinPostId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Publish a multi-image carousel post to LinkedIn.
 * @param {Object} params
 * @param {string} params.accessToken - LinkedIn user access token
 * @param {string} params.caption - Post text content
 * @param {string[]} params.imageUrls - Array of image URLs for carousel slides
 * @returns {Promise<{success: boolean, linkedinPostId?: string, error?: string}>}
 */
export async function publishCarouselToLinkedIn({ accessToken, caption, imageUrls }) {
  try {
    // Get user profile
    const userInfo = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userInfo.ok) {
      return { success: false, error: `Failed to get user info: ${userInfo.status}` };
    }

    const userData = await userInfo.json();
    const personUrn = `urn:li:person:${userData.sub}`;

    // Upload all images in parallel
    const imageUrns = await Promise.all(
      imageUrls.map(url => uploadImageToLinkedIn(accessToken, personUrn, url))
    );

    const failedCount = imageUrns.filter(u => !u).length;
    if (failedCount === imageUrls.length) {
      return { success: false, error: 'Failed to upload any images to LinkedIn' };
    }

    // Create multi-image post
    const postBody = {
      author: personUrn,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED' },
      lifecycleState: 'PUBLISHED',
      content: {
        multiImage: {
          images: imageUrns.filter(Boolean).map(urn => ({ id: urn })),
        },
      },
    };

    const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!postResponse.ok) {
      const errorData = await postResponse.text();
      return { success: false, error: `Failed to create carousel post: ${postResponse.status} - ${errorData}` };
    }

    const linkedinPostId = postResponse.headers.get('x-restli-id');
    return { success: true, linkedinPostId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Upload an image to LinkedIn and return its URN.
 * @param {string} accessToken - LinkedIn access token
 * @param {string} personUrn - User's person URN (urn:li:person:XXXXX)
 * @param {string} imageUrl - URL of image to upload
 * @returns {Promise<string|null>} Image URN or null if upload failed
 */
export async function uploadImageToLinkedIn(accessToken, personUrn, imageUrl) {
  try {
    // Step 2a: Initialize upload
    const initResponse = await fetch(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: personUrn,
          },
        }),
      }
    );

    if (!initResponse.ok) {
      return null;
    }

    const initData = await initResponse.json();
    const uploadUrl = initData.value?.uploadUrl;
    const imageUrn = initData.value?.image;

    if (!uploadUrl || !imageUrn) {
      return null;
    }

    // Step 2b: Download the image and upload to the provided URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Determine content type from response
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const uploadPutResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: imageBuffer,
    });

    if (!uploadPutResponse.ok) {
      return null;
    }

    // Return the image URN from the initialization response
    return imageUrn;
  } catch (err) {
    return null;
  }
}
