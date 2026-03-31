/**
 * Instagram Graph API publisher.
 * Uses page-scoped tokens (from Meta OAuth) to publish via IG Business account.
 */

/**
 * Publish a single image to Instagram.
 */
export async function publishImageToInstagram({ accessToken, igAccountId, imageUrl, caption }) {
  try {
    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption || '',
          access_token: accessToken,
        }),
      }
    );

    if (!containerRes.ok) {
      const err = await containerRes.text();
      return { success: false, error: `Container creation failed: ${err}` };
    }

    const container = await containerRes.json();
    const containerId = container.id;

    // Step 2: Wait for container to be ready, then publish
    const mediaId = await pollAndPublish(accessToken, igAccountId, containerId);
    return { success: true, mediaId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Publish a carousel (multi-image) to Instagram.
 */
export async function publishCarouselToInstagram({ accessToken, igAccountId, imageUrls, caption }) {
  try {
    // Step 1: Create individual media containers for each image
    const containerIds = [];
    for (const url of imageUrls) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: url,
            is_carousel_item: true,
            access_token: accessToken,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error(`[instagramPublisher] Carousel item failed:`, err);
        continue;
      }

      const data = await res.json();
      containerIds.push(data.id);
    }

    if (containerIds.length === 0) {
      return { success: false, error: 'Failed to create any carousel items' };
    }

    // Step 2: Wait for all items to be FINISHED
    for (const cid of containerIds) {
      await waitForContainerReady(accessToken, cid);
    }

    // Step 3: Create carousel container
    const carouselRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: containerIds.join(','),
          caption: caption || '',
          access_token: accessToken,
        }),
      }
    );

    if (!carouselRes.ok) {
      const err = await carouselRes.text();
      return { success: false, error: `Carousel container failed: ${err}` };
    }

    const carousel = await carouselRes.json();

    // Step 4: Publish the carousel
    const mediaId = await pollAndPublish(accessToken, igAccountId, carousel.id);
    return { success: true, mediaId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Poll container status until FINISHED, then publish.
 */
async function pollAndPublish(accessToken, igAccountId, containerId) {
  // Wait for container to be ready
  await waitForContainerReady(accessToken, containerId);

  // Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Publish failed: ${err}`);
  }

  const published = await publishRes.json();
  return published.id;
}

/**
 * Poll a media container until status is FINISHED (max 60s).
 */
async function waitForContainerReady(accessToken, containerId, maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') {
        throw new Error(`Container ${containerId} errored`);
      }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Container ${containerId} timed out`);
}
