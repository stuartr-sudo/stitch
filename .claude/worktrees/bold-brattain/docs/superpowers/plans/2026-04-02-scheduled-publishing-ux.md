# Scheduled Publishing UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to schedule completed Shorts for publishing to connected platforms (YouTube, TikTok, Instagram, Facebook, LinkedIn) with per-platform metadata, a visual publish queue, and batch scheduling support.

**Architecture:** A new `publish_queue` table stores one row per platform per draft. The existing `scheduledPublisher.js` is rewired to poll this table and call platform-specific video publishers. Frontend adds scheduling UI to the draft page, a dedicated Publish Queue page with timeline strip, and batch scheduling to the Batch Queue results.

**Tech Stack:** Supabase (Postgres + RLS), Express API, React 18, Tailwind CSS, lucide-react icons, YouTube/TikTok/Meta/LinkedIn platform APIs.

---

## File Structure

**New files:**
| File | Responsibility |
|------|---------------|
| `supabase-migration-publish-queue.sql` | Database migration — `publish_queue` table, RLS, indexes |
| `api/lib/youtubePublisher.js` | Reusable `publishVideoToYouTube()` extracted from `api/youtube/upload.js` |
| `api/publish/schedule.js` | `POST /api/publish/schedule` — validate + insert queue items |
| `api/publish/queue.js` | `GET /api/publish/queue` — list user's queue with draft joins |
| `api/publish/retry.js` | `POST /api/publish/retry` — reset failed item for retry |
| `api/publish/cancel.js` | `POST /api/publish/cancel` — delete scheduled item |
| `src/pages/PublishQueuePage.jsx` | Publish Queue page with timeline strip + list view |

**Modified files:**
| File | Change |
|------|--------|
| `api/lib/instagramPublisher.js` | Add `publishReelToInstagram()` function |
| `api/lib/facebookPublisher.js` | Add `publishVideoToFacebookPage()` function |
| `api/lib/linkedinPublisher.js` | Add `publishVideoToLinkedIn()` function |
| `api/lib/scheduledPublisher.js` | Rewire to poll `publish_queue`, dispatch to platform publishers |
| `server.js` | Register 4 new API routes, update import |
| `src/pages/ShortsDraftPage.jsx` | Add Publish section with platform selector + schedule picker |
| `src/pages/BatchQueuePage.jsx` | Add "Schedule All" section on completed batches |
| `src/pages/VideoAdvertCreator.jsx` | Add "Publish Queue" nav card |
| `src/App.jsx` | Add `/publish` route |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase-migration-publish-queue.sql`

- [ ] **Step 1: Create migration file**

```sql
-- ── publish_queue table ──────────────────────────────────────────────────────
CREATE TABLE publish_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_id        uuid REFERENCES ad_drafts(id) ON DELETE CASCADE NOT NULL,
  platform        text NOT NULL,
  status          text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed')),
  scheduled_for   timestamptz NOT NULL,
  title           text NOT NULL,
  description     text DEFAULT '',
  privacy         text DEFAULT 'public',
  published_id    text,
  published_url   text,
  error           text,
  attempts        int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items" ON publish_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue items" ON publish_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue items" ON publish_queue
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue items" ON publish_queue
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on publish_queue" ON publish_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_publish_queue_scheduled ON publish_queue(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_publish_queue_user ON publish_queue(user_id, status);
```

- [ ] **Step 2: Apply migration to Supabase**

Run the migration SQL against the Supabase project using the MCP `execute_sql` tool. The project ref is `uscmvlfleccbctuvhhcj`.

- [ ] **Step 3: Verify table exists**

Run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'publish_queue' ORDER BY ordinal_position;` to verify all columns exist.

- [ ] **Step 4: Commit**

```bash
git add supabase-migration-publish-queue.sql
git commit -m "feat: add publish_queue table migration"
```

---

### Task 2: YouTube Publisher Library

Extract the resumable upload logic from `api/youtube/upload.js` into a reusable function that works with `tokenManager.loadTokens()` instead of the legacy `youtubeTokens.js`.

**Files:**
- Create: `api/lib/youtubePublisher.js`
- Reference: `api/youtube/upload.js` (read-only, for extracting logic)
- Reference: `api/lib/tokenManager.js` (for `loadTokens` signature)

- [ ] **Step 1: Create youtubePublisher.js**

This function takes `{ accessToken, videoUrl, title, description, privacy, isShort }` and returns `{ success, videoId, youtubeUrl, error }`. It follows the same pattern as the other publishers (return object with `success` boolean).

```javascript
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
 * @returns {Promise<{success: boolean, videoId?: string, youtubeUrl?: string, error?: string}>}
 */
export async function publishVideoToYouTube({ accessToken, videoUrl, title, description = '', privacy = 'public' }) {
  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const contentLength = videoBuffer.length;

    // Auto-append #Shorts if not already present (caller can include it in title)
    let finalTitle = title.slice(0, 100);

    const metadata = {
      snippet: {
        title: finalTitle,
        description: description || '',
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/youtubePublisher.js
git commit -m "feat: add reusable YouTube video publisher function"
```

---

### Task 3: Instagram Reels Publisher

Add `publishReelToInstagram()` to the existing Instagram publisher. Uses the Meta Graph API Reels endpoint — same container pattern as image publishing but with `media_type: 'REELS'` and `video_url`.

**Files:**
- Modify: `api/lib/instagramPublisher.js`

- [ ] **Step 1: Add publishReelToInstagram function**

Add this function after the existing `publishCarouselToInstagram` function (after line 109). It follows the same pattern: create container → poll for FINISHED → publish.

```javascript
/**
 * Publish a video as an Instagram Reel.
 * Uses the same container → poll → publish pattern as images.
 *
 * @param {Object} params
 * @param {string} params.accessToken - Page-scoped token from Meta OAuth
 * @param {string} params.igAccountId - Instagram Business account ID
 * @param {string} params.videoUrl - Public URL of the video file
 * @param {string} [params.caption] - Reel caption text
 * @returns {Promise<{success: boolean, mediaId?: string, error?: string}>}
 */
export async function publishReelToInstagram({ accessToken, igAccountId, videoUrl, caption }) {
  try {
    // Step 1: Create Reel media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption || '',
          access_token: accessToken,
        }),
      }
    );

    if (!containerRes.ok) {
      const err = await containerRes.text();
      return { success: false, error: `Reel container creation failed: ${err}` };
    }

    const container = await containerRes.json();
    const containerId = container.id;

    // Step 2: Wait for container to finish processing, then publish
    const mediaId = await pollAndPublish(accessToken, igAccountId, containerId);
    return { success: true, mediaId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
```

Note: `pollAndPublish` and `waitForContainerReady` are already defined as private functions in this file and will be reused by the new function.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/instagramPublisher.js
git commit -m "feat: add Instagram Reels publishing function"
```

---

### Task 4: Facebook Video Publisher

Add `publishVideoToFacebookPage()` to the existing Facebook publisher. Uses the Graph API video upload endpoint `/{page-id}/videos`.

**Files:**
- Modify: `api/lib/facebookPublisher.js`

- [ ] **Step 1: Add publishVideoToFacebookPage function**

Add after the existing `publishToFacebookPage` function (after line 86):

```javascript
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/facebookPublisher.js
git commit -m "feat: add Facebook video publishing function"
```

---

### Task 5: LinkedIn Video Publisher

Add `publishVideoToLinkedIn()` to the existing LinkedIn publisher. LinkedIn video upload uses a 3-step flow: initialize upload → PUT binary → create post with video URN.

**Files:**
- Modify: `api/lib/linkedinPublisher.js`

- [ ] **Step 1: Add publishVideoToLinkedIn function**

Add after the `uploadImageToLinkedIn` function (after line 236):

```javascript
/**
 * Upload and publish a video post to LinkedIn.
 * Three-step flow: initialize upload → PUT video binary → create post.
 *
 * @param {Object} params
 * @param {string} params.accessToken - LinkedIn access token
 * @param {string} params.body - Post text/commentary
 * @param {string} params.videoUrl - Public URL of the video file
 * @returns {Promise<{success: boolean, linkedinPostId?: string, error?: string}>}
 */
export async function publishVideoToLinkedIn({ accessToken, body, videoUrl }) {
  try {
    // Step 1: Get user profile
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

    // Step 2: Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return { success: false, error: `Failed to download video: ${videoRes.status}` };
    }
    const videoBuffer = await videoRes.arrayBuffer();
    const fileSize = videoBuffer.byteLength;

    // Step 3: Initialize video upload
    const initResponse = await fetch(
      'https://api.linkedin.com/rest/videos?action=initializeUpload',
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
            fileSizeBytes: fileSize,
          },
        }),
      }
    );

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      return { success: false, error: `LinkedIn video upload init failed: ${errText}` };
    }

    const initData = await initResponse.json();
    const uploadUrl = initData.value?.uploadInstructions?.[0]?.uploadUrl;
    const videoUrn = initData.value?.video;

    if (!uploadUrl || !videoUrn) {
      return { success: false, error: 'LinkedIn did not return upload URL or video URN' };
    }

    // Step 4: Upload video binary
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      return { success: false, error: `LinkedIn video upload failed: ${uploadRes.status}` };
    }

    // Step 5: Create post with video
    const postBody = {
      author: personUrn,
      commentary: body || '',
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED' },
      lifecycleState: 'PUBLISHED',
      content: {
        media: {
          id: videoUrn,
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
      return { success: false, error: `LinkedIn post creation failed: ${postResponse.status} - ${errorData}` };
    }

    const linkedinPostId = postResponse.headers.get('x-restli-id');

    return { success: true, linkedinPostId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/linkedinPublisher.js
git commit -m "feat: add LinkedIn video publishing function"
```

---

### Task 6: Rewire Scheduled Publisher

Replace the current `ad_drafts` polling in `scheduledPublisher.js` with `publish_queue` polling that dispatches to the appropriate platform publisher.

**Files:**
- Modify: `api/lib/scheduledPublisher.js`
- Reference: `api/lib/tokenManager.js` (for `loadTokens` signature — `loadTokens(userId, platform, supabase)`)

- [ ] **Step 1: Rewrite scheduledPublisher.js**

Replace the entire contents of `api/lib/scheduledPublisher.js` with:

```javascript
/**
 * Publish Queue Executor — polls for queue items due for publication.
 *
 * Checks `publish_queue` where status = 'scheduled' and scheduled_for <= NOW().
 * Dispatches to the appropriate platform publisher per item.
 * Also recovers stale 'publishing' items (stuck > 10 min).
 *
 * Started as a setInterval in server.js (every 30s).
 */

import { createClient } from '@supabase/supabase-js';
import { loadTokens } from './tokenManager.js';
import { publishVideoToYouTube } from './youtubePublisher.js';
import { publishVideoToTikTok } from './tiktokPublisher.js';
import { publishReelToInstagram } from './instagramPublisher.js';
import { publishVideoToFacebookPage } from './facebookPublisher.js';
import { publishVideoToLinkedIn } from './linkedinPublisher.js';

/**
 * Resolve the final video URL from an ad_drafts row.
 * Precedence: captioned_video_url → assets_json.final_video_url → assets_json.video_url
 */
function resolveVideoUrl(draft) {
  return draft.captioned_video_url
    || draft.assets_json?.final_video_url
    || draft.assets_json?.video_url
    || null;
}

/**
 * Build platform-specific published URL from the platform's response.
 */
function buildPublishedUrl(platform, publishedId) {
  if (!publishedId) return null;
  switch (platform) {
    case 'youtube': return `https://youtube.com/watch?v=${publishedId}`;
    case 'tiktok': return null; // TikTok doesn't return a direct URL from API
    case 'instagram': return null; // Instagram doesn't return a permalink from publish API
    case 'facebook': return `https://facebook.com/${publishedId}`;
    case 'linkedin': return null; // LinkedIn post URN, not a direct URL
    default: return null;
  }
}

export async function pollScheduledPublications() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // ── Stale publishing recovery ─────────────────────────────────────────────
    // Reset items stuck in 'publishing' for > 10 minutes (server crash/restart)
    await supabase
      .from('publish_queue')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('status', 'publishing')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // ── Find due items ────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const { data: dueItems, error } = await supabase
      .from('publish_queue')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(5);

    if (error || !dueItems?.length) return;

    console.log(`[publish-queue] Found ${dueItems.length} item(s) due for publication`);

    for (const item of dueItems) {
      try {
        // Mark as publishing + increment attempts (optimistic lock)
        const { error: updateErr } = await supabase
          .from('publish_queue')
          .update({
            status: 'publishing',
            attempts: item.attempts + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .eq('status', 'scheduled');

        if (updateErr) {
          console.error(`[publish-queue] Failed to lock item ${item.id}:`, updateErr.message);
          continue;
        }

        // Load draft to get video URL
        const { data: draft, error: draftErr } = await supabase
          .from('ad_drafts')
          .select('captioned_video_url, assets_json')
          .eq('id', item.draft_id)
          .single();

        if (draftErr || !draft) {
          throw new Error('Draft not found or deleted');
        }

        const videoUrl = resolveVideoUrl(draft);
        if (!videoUrl) {
          throw new Error('No video URL found on draft');
        }

        // Load platform tokens
        const tokens = await loadTokens(item.user_id, item.platform, supabase);
        if (!tokens?.access_token) {
          throw new Error(`No ${item.platform} token found — user may need to reconnect`);
        }

        // Dispatch to platform publisher
        let result;
        switch (item.platform) {
          case 'youtube': {
            // Auto-append #Shorts to title if not already present
            let ytTitle = item.title;
            if (!ytTitle.includes('#Shorts')) {
              ytTitle = `${ytTitle} #Shorts`.slice(0, 100);
            }
            result = await publishVideoToYouTube({
              accessToken: tokens.access_token,
              videoUrl,
              title: ytTitle,
              description: item.description,
              privacy: item.privacy || 'public',
            });
            if (result.success) {
              result.publishedId = result.videoId;
              result.publishedUrl = result.youtubeUrl;
            }
            break;
          }

          case 'tiktok': {
            // Map privacy values to TikTok API format
            const tiktokPrivacy = {
              public: 'PUBLIC_TO_EVERYONE',
              friends: 'MUTUAL_FOLLOW_FRIENDS',
              private: 'SELF_ONLY',
            };
            // TikTok publisher uses caption, not title+description
            const caption = item.description
              ? `${item.title}\n\n${item.description}`
              : item.title;
            result = await publishVideoToTikTok({
              accessToken: tokens.access_token,
              videoUrl,
              caption,
            });
            if (result.success) {
              result.publishedId = result.publishId;
            }
            break;
          }

          case 'instagram': {
            // Instagram uses IG account ID from platform_connections
            const igAccountId = tokens.platform_page_id;
            if (!igAccountId) {
              throw new Error('No Instagram account ID found — user may need to reconnect');
            }
            const caption = item.description
              ? `${item.title}\n\n${item.description}`
              : item.title;
            result = await publishReelToInstagram({
              accessToken: tokens.access_token,
              igAccountId,
              videoUrl,
              caption,
            });
            if (result.success) {
              result.publishedId = result.mediaId;
            }
            break;
          }

          case 'facebook': {
            const pageId = tokens.platform_page_id;
            if (!pageId) {
              throw new Error('No Facebook Page ID found — user may need to reconnect');
            }
            result = await publishVideoToFacebookPage({
              accessToken: tokens.access_token,
              pageId,
              videoUrl,
              title: item.title,
              description: item.description,
            });
            if (result.success) {
              result.publishedId = result.videoId;
              result.publishedUrl = buildPublishedUrl('facebook', result.videoId);
            }
            break;
          }

          case 'linkedin': {
            const caption = item.description
              ? `${item.title}\n\n${item.description}`
              : item.title;
            result = await publishVideoToLinkedIn({
              accessToken: tokens.access_token,
              body: caption,
              videoUrl,
            });
            if (result.success) {
              result.publishedId = result.linkedinPostId;
            }
            break;
          }

          default:
            throw new Error(`Unknown platform: ${item.platform}`);
        }

        // Handle result
        if (result.success) {
          await supabase
            .from('publish_queue')
            .update({
              status: 'published',
              published_id: result.publishedId || null,
              published_url: result.publishedUrl || buildPublishedUrl(item.platform, result.publishedId),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          console.log(`[publish-queue] Published ${item.platform} for draft ${item.draft_id}`);
        } else {
          throw new Error(result.error || 'Unknown publishing error');
        }
      } catch (err) {
        console.error(`[publish-queue] Failed ${item.platform} for draft ${item.draft_id}:`, err.message);
        await supabase
          .from('publish_queue')
          .update({
            status: 'failed',
            error: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
    }
  } catch (err) {
    console.error('[publish-queue] Poll error:', err.message);
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/scheduledPublisher.js
git commit -m "feat: rewire scheduled publisher to use publish_queue with platform dispatching"
```

---

### Task 7: API Endpoints + Route Registration

Create the 4 API endpoints and register them in server.js.

**Files:**
- Create: `api/publish/schedule.js`
- Create: `api/publish/queue.js`
- Create: `api/publish/retry.js`
- Create: `api/publish/cancel.js`
- Modify: `server.js` (add 4 routes near the batch queue routes, around line 705)

- [ ] **Step 1: Create api/publish/schedule.js**

```javascript
/**
 * POST /api/publish/schedule
 *
 * Body: { draft_id, platforms: [{ platform, title, description, privacy }], scheduled_for? }
 * Returns: { queue_ids, scheduled_for }
 */

import { createClient } from '@supabase/supabase-js';
import { getConnections } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id, platforms, scheduled_for } = req.body;
  const userId = req.user.id;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'platforms must be a non-empty array' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify draft exists, belongs to user, and has video
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('id, captioned_video_url, assets_json, campaign_id')
    .eq('id', draft_id)
    .eq('user_id', userId)
    .single();

  if (draftErr || !draft) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  const videoUrl = draft.captioned_video_url
    || draft.assets_json?.final_video_url
    || draft.assets_json?.video_url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Draft has no final video URL' });
  }

  // Verify all platforms are connected
  const connections = await getConnections(userId, supabase);
  const connectedPlatforms = new Set(connections.map(c => c.platform));

  const validPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin'];
  for (const p of platforms) {
    if (!validPlatforms.includes(p.platform)) {
      return res.status(400).json({ error: `Invalid platform: ${p.platform}` });
    }
    if (!connectedPlatforms.has(p.platform)) {
      return res.status(400).json({ error: `${p.platform} is not connected. Connect it in Settings.` });
    }
    if (!p.title) {
      return res.status(400).json({ error: `Title is required for ${p.platform}` });
    }
  }

  // Validate scheduled_for is in the future (or null for publish-now)
  let publishTime;
  if (scheduled_for) {
    publishTime = new Date(scheduled_for);
    if (isNaN(publishTime.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_for date' });
    }
    if (publishTime <= new Date()) {
      return res.status(400).json({ error: 'scheduled_for must be in the future' });
    }
  } else {
    publishTime = new Date(); // publish now
  }

  // ── Insert queue items ──────────────────────────────────────────────────────
  const rows = platforms.map(p => ({
    user_id: userId,
    draft_id,
    platform: p.platform,
    status: 'scheduled',
    scheduled_for: publishTime.toISOString(),
    title: p.title,
    description: p.description || '',
    privacy: p.privacy || 'public',
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('publish_queue')
    .insert(rows)
    .select('id');

  if (insertErr) {
    console.error('[publish/schedule] Insert error:', insertErr.message);
    return res.status(500).json({ error: 'Failed to schedule publishing' });
  }

  console.log(`[publish/schedule] Scheduled ${inserted.length} items for draft ${draft_id}`);
  return res.json({
    queue_ids: inserted.map(r => r.id),
    scheduled_for: publishTime.toISOString(),
  });
}
```

- [ ] **Step 2: Create api/publish/queue.js**

```javascript
/**
 * GET /api/publish/queue
 *
 * Query: ?status=scheduled,failed&limit=50
 * Returns: { items: [...] }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user.id;
  const statusFilter = req.query.status ? req.query.status.split(',') : null;
  const limit = parseInt(req.query.limit) || 50;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let query = supabase
    .from('publish_queue')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (statusFilter) {
    query = query.in('status', statusFilter);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error('[publish/queue] Query error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch publish queue' });
  }

  // Enrich with draft title and video URL
  const draftIds = [...new Set((items || []).map(i => i.draft_id))];
  const draftMap = {};

  if (draftIds.length > 0) {
    const { data: drafts } = await supabase
      .from('ad_drafts')
      .select('id, captioned_video_url, assets_json, campaign_id')
      .in('id', draftIds);

    // Get campaign names
    const campaignIds = [...new Set((drafts || []).map(d => d.campaign_id).filter(Boolean))];
    const campaignMap = {};
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);
      for (const c of (campaigns || [])) {
        campaignMap[c.id] = c.name;
      }
    }

    for (const d of (drafts || [])) {
      draftMap[d.id] = {
        title: campaignMap[d.campaign_id] || 'Untitled',
        video_url: d.captioned_video_url || d.assets_json?.final_video_url || null,
      };
    }
  }

  const enriched = (items || []).map(item => ({
    ...item,
    draft_title: draftMap[item.draft_id]?.title || 'Untitled',
    draft_video_url: draftMap[item.draft_id]?.video_url || null,
  }));

  return res.json({ items: enriched });
}
```

- [ ] **Step 3: Create api/publish/retry.js**

```javascript
/**
 * POST /api/publish/retry
 *
 * Body: { queue_id }
 * Returns: { success: true }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { queue_id } = req.body;
  const userId = req.user.id;

  if (!queue_id) return res.status(400).json({ error: 'queue_id is required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify item exists, belongs to user, and is failed
  const { data: item, error: fetchErr } = await supabase
    .from('publish_queue')
    .select('id, status')
    .eq('id', queue_id)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  if (item.status !== 'failed') {
    return res.status(400).json({ error: 'Only failed items can be retried' });
  }

  const { error: updateErr } = await supabase
    .from('publish_queue')
    .update({
      status: 'scheduled',
      scheduled_for: new Date().toISOString(),
      attempts: 0,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queue_id);

  if (updateErr) {
    return res.status(500).json({ error: 'Failed to retry' });
  }

  return res.json({ success: true });
}
```

- [ ] **Step 4: Create api/publish/cancel.js**

```javascript
/**
 * POST /api/publish/cancel
 *
 * Body: { queue_id }
 * Returns: { success: true }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { queue_id } = req.body;
  const userId = req.user.id;

  if (!queue_id) return res.status(400).json({ error: 'queue_id is required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify item exists, belongs to user, and is scheduled
  const { data: item, error: fetchErr } = await supabase
    .from('publish_queue')
    .select('id, status')
    .eq('id', queue_id)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  if (item.status !== 'scheduled') {
    return res.status(400).json({ error: 'Only scheduled items can be cancelled' });
  }

  const { error: deleteErr } = await supabase
    .from('publish_queue')
    .delete()
    .eq('id', queue_id);

  if (deleteErr) {
    return res.status(500).json({ error: 'Failed to cancel' });
  }

  return res.json({ success: true });
}
```

- [ ] **Step 5: Register routes in server.js**

Add these routes right after the Batch Queue routes block (after line 705 in `server.js`):

```javascript
// Publish Queue routes
app.post('/api/publish/schedule', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('publish/schedule.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/publish/queue', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('publish/queue.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/publish/retry', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('publish/retry.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/publish/cancel', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('publish/cancel.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add api/publish/schedule.js api/publish/queue.js api/publish/retry.js api/publish/cancel.js server.js
git commit -m "feat: add publish queue API endpoints and route registration"
```

---

### Task 8: Publish Queue Page

Create the Publish Queue page with timeline strip and date-grouped list view.

**Files:**
- Create: `src/pages/PublishQueuePage.jsx`
- Modify: `src/App.jsx` (add route)
- Modify: `src/pages/VideoAdvertCreator.jsx` (add nav card)

- [ ] **Step 1: Create PublishQueuePage.jsx**

This is a ~400 line React component with:
1. A 14-day timeline strip at the top with platform-colored dots
2. Filter tabs (All / Scheduled / Published / Failed)
3. Date-grouped list of queue items with status badges and actions
4. 10-second polling while items are active

Key implementation details:
- Fetch queue via `GET /api/publish/queue`
- Platform colors: YouTube `#FF0000`, TikTok `#010101`, Instagram `#E1306C`, Facebook `#1877F2`, LinkedIn `#0A66C2`
- Platform icons from lucide-react: `Youtube` for YouTube, custom SVG or text badges for others (lucide doesn't have TikTok/Instagram/Facebook/LinkedIn icons — use colored text labels)
- Cancel calls `POST /api/publish/cancel`
- Retry calls `POST /api/publish/retry`
- Timeline uses CSS grid with 14 columns, one per day

```jsx
/**
 * PublishQueuePage — /publish
 *
 * 14-day timeline strip + date-grouped list of scheduled/published/failed items.
 * Polls every 10s while there are active (scheduled/publishing) items.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronLeft, ExternalLink, RotateCcw, X, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLATFORM_COLORS = {
  youtube: '#FF0000',
  tiktok: '#010101',
  instagram: '#E1306C',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
};

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const STATUS_BADGE = {
  scheduled: 'bg-blue-100 text-blue-700',
  publishing: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

const FILTER_TABS = ['all', 'scheduled', 'published', 'failed'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Timeline Strip ────────────────────────────────────────────────────────────
function TimelineStrip({ items, onDotClick }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Group items by day
  const itemsByDay = {};
  for (const item of items) {
    const d = new Date(item.scheduled_for);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (!itemsByDay[key]) itemsByDay[key] = [];
    itemsByDay[key].push(item);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto">
      <div className="grid grid-cols-14 gap-1 min-w-[600px]" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
        {days.map((day, i) => {
          const key = new Date(day).toISOString();
          const dayItems = itemsByDay[key] || [];
          const isToday = i === 0;

          return (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-1 rounded-lg',
                isToday && 'bg-[#2C666E]/5'
              )}
            >
              <span className={cn('text-[10px] font-medium', isToday ? 'text-[#2C666E]' : 'text-slate-400')}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={cn('text-xs font-bold', isToday ? 'text-[#2C666E]' : 'text-slate-600')}>
                {day.getDate()}
              </span>
              <div className="flex flex-wrap gap-0.5 justify-center min-h-[12px]">
                {dayItems.map((item, j) => (
                  <button
                    key={j}
                    onClick={() => onDotClick(item.id)}
                    title={`${PLATFORM_LABELS[item.platform]}: ${item.title} — ${formatTime(item.scheduled_for)}`}
                    className="w-2.5 h-2.5 rounded-full hover:scale-150 transition-transform"
                    style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List Item ─────────────────────────────────────────────────────────────────
function QueueItem({ item, onRetry, onCancel }) {
  return (
    <div id={`queue-${item.id}`} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      {/* Video thumbnail */}
      <div className="w-12 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {item.draft_video_url ? (
          <video src={item.draft_video_url} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No video</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Platform badge */}
          <span
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
          >
            {PLATFORM_LABELS[item.platform]}
          </span>
          <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', STATUS_BADGE[item.status])}>
            {item.status === 'publishing' && <Loader2 className="w-3 h-3 animate-spin inline mr-0.5" />}
            {item.status}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          {item.status === 'published'
            ? `Published at ${formatTime(item.updated_at)}`
            : item.status === 'failed'
              ? item.error?.slice(0, 120) || 'Unknown error'
              : `Scheduled for ${formatTime(item.scheduled_for)}`
          }
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1.5">
          {item.status === 'scheduled' && (
            <button
              onClick={() => onCancel(item.id)}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
          {item.status === 'failed' && (
            <button
              onClick={() => onRetry(item.id)}
              className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          )}
          {item.status === 'published' && item.published_url && (
            <a
              href={item.published_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function PublishQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const intervalRef = useRef(null);

  const fetchQueue = async () => {
    try {
      const res = await apiFetch('/api/publish/queue');
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      console.error('[PublishQueue] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Stop polling if nothing is active
  useEffect(() => {
    const hasActive = items.some(i => i.status === 'scheduled' || i.status === 'publishing');
    if (!hasActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (hasActive && !intervalRef.current) {
      intervalRef.current = setInterval(fetchQueue, 10000);
    }
  }, [items]);

  const handleRetry = async (queueId) => {
    try {
      const res = await apiFetch('/api/publish/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      });
      const data = await res.json();
      if (data.success) fetchQueue();
      else toast.error(data.error || 'Retry failed');
    } catch (err) {
      toast.error(err.message || 'Retry failed');
    }
  };

  const handleCancel = async (queueId) => {
    if (!confirm('Cancel this scheduled publish?')) return;
    try {
      const res = await apiFetch('/api/publish/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      });
      const data = await res.json();
      if (data.success) fetchQueue();
      else toast.error(data.error || 'Cancel failed');
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const handleDotClick = (id) => {
    const el = document.getElementById(`queue-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Filter items
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  // Group by date
  const grouped = {};
  for (const item of filtered) {
    const dateKey = formatDate(item.scheduled_for);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Publish Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Schedule and track video publishing across platforms</p>
          </div>
          <Link to="/shorts/workbench" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back to Workbench
          </Link>
        </div>

        {/* Timeline */}
        {items.length > 0 && (
          <TimelineStrip
            items={items.filter(i => i.status === 'scheduled' || i.status === 'publishing')}
            onDotClick={handleDotClick}
          />
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize',
                filter === tab
                  ? 'bg-[#2C666E] text-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium mb-1">No scheduled publishes yet</p>
            <p className="text-sm">Create a Short and schedule it from the draft page.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, dateItems]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{dateLabel}</h3>
              <div className="space-y-2">
                {dateItems.map(item => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.jsx**

Add the import near the other page imports (around line 19, after the BatchQueuePage import):

```javascript
import PublishQueuePage from './pages/PublishQueuePage';
```

Add the route after the BatchQueuePage routes (around line 183):

```jsx
<Route
  path="/publish"
  element={
    <ProtectedRoute>
      <PublishQueuePage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Add nav card in VideoAdvertCreator.jsx**

Add a "Publish Queue" card after the "Batch Queue" card (around line 803, after the Batch Queue `</div>`). Import `Calendar` from lucide-react (add it to the existing import on line 46).

```jsx
<div
  onClick={() => navigate('/publish')}
  className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
>
  <div className="flex items-center gap-2">
    <Calendar className="w-4 h-4 text-[#2C666E]" />
    <span className="text-xs font-medium text-gray-800">Publish Queue</span>
  </div>
  <p className="text-xs text-gray-500 mt-0.5">Schedule & track publishing</p>
</div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublishQueuePage.jsx src/App.jsx src/pages/VideoAdvertCreator.jsx
git commit -m "feat: add Publish Queue page with timeline strip and nav entry"
```

---

### Task 9: Draft Page Publish Section

Add the scheduling UI to ShortsDraftPage.jsx — platform checkboxes, metadata fields, per-platform overrides, schedule picker, and publish-now flow with polling.

**Files:**
- Modify: `src/pages/ShortsDraftPage.jsx`

- [ ] **Step 1: Add PublishSection component and integrate it**

Add a `PublishSection` component inside `ShortsDraftPage.jsx`, before the existing `StatusPill` component (around line 518). Then render it in the Actions section.

The component:
1. Fetches connected platforms via `GET /api/accounts/connections`
2. Shows platform checkboxes (connected ones selectable, unconnected greyed with link)
3. Default title/description/privacy fields
4. Collapsible per-platform overrides
5. Publish Now / Schedule toggle with datetime picker
6. Action button that calls `POST /api/publish/schedule`
7. After publish-now: polls queue item status every 5s showing per-platform chips

Privacy options per platform:

```javascript
const PRIVACY_OPTIONS = {
  youtube: [
    { value: 'public', label: 'Public' },
    { value: 'unlisted', label: 'Unlisted' },
    { value: 'private', label: 'Private' },
  ],
  tiktok: [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'private', label: 'Private' },
  ],
  instagram: [{ value: 'public', label: 'Public' }],
  facebook: [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'only_me', label: 'Only Me' },
  ],
  linkedin: [{ value: 'public', label: 'Public' }],
};
```

The component should be rendered in the Actions section (around line 453), replacing the existing YouTube and Publish buttons. Keep the Download button. The new section renders below the actions bar:

```jsx
{/* ── Publish Section ────────────────────────────────────────────────── */}
{isReady && !isPublished && videoUrl && (
  <PublishSection
    draftId={draft.id}
    defaultTitle={meta.script?.title || draft.name || 'Short'}
  />
)}
```

Remove or keep the existing YouTube button and Publish button as desired — the new PublishSection replaces their functionality. Remove the `YouTubePublishModal` import and usage, the `handlePublishNow` function, the `showYouTubePublish` state, and the `isPublishing` state since they're no longer needed. Keep the Download button.

Full PublishSection component:

```jsx
function PublishSection({ draftId, defaultTitle }) {
  const [connections, setConnections] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [scheduleMode, setScheduleMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledFor, setScheduledFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState(null); // { queueIds, items } after submission
  const [loadingConnections, setLoadingConnections] = useState(true);
  const pollRef = useRef(null);

  // Fetch connected platforms
  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await apiFetch('/api/accounts/connections');
        const data = await res.json();
        if (data.platforms) setConnections(data.platforms);
        else if (Array.isArray(data)) setConnections(data);
      } catch (err) {
        console.error('[PublishSection] Failed to load connections:', err.message);
      } finally {
        setLoadingConnections(false);
      }
    }
    fetchConnections();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const connectedPlatforms = connections.filter(c => c.connected || c.platform_username);
  const connectedSet = new Set(connectedPlatforms.map(c => c.platform));

  const allPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin'];

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) return;
    setIsSubmitting(true);

    const platforms = selectedPlatforms.map(p => ({
      platform: p,
      title: overrides[p]?.title || title,
      description: overrides[p]?.description || description,
      privacy: overrides[p]?.privacy || privacy,
    }));

    try {
      const res = await apiFetch('/api/publish/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          platforms,
          scheduled_for: scheduleMode === 'schedule' ? scheduledFor : null,
        }),
      });
      const data = await res.json();
      if (data.queue_ids) {
        setPublishResult({ queueIds: data.queue_ids, items: [] });
        if (scheduleMode === 'now') {
          // Poll for publish status
          pollRef.current = setInterval(async () => {
            try {
              const qRes = await apiFetch('/api/publish/queue');
              const qData = await qRes.json();
              const relevant = (qData.items || []).filter(i => data.queue_ids.includes(i.id));
              setPublishResult(prev => ({ ...prev, items: relevant }));
              const allDone = relevant.every(i => i.status === 'published' || i.status === 'failed');
              if (allDone && relevant.length === data.queue_ids.length) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            } catch (err) {
              console.error('[PublishSection] Poll error:', err.message);
            }
          }, 5000);
        }
      } else {
        toast.error(data.error || 'Failed to schedule');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show post-submit results
  if (publishResult) {
    const { queueIds, items } = publishResult;
    const allResolved = items.length === queueIds.length && items.every(i => i.status === 'published' || i.status === 'failed');

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">
          {scheduleMode === 'schedule' ? '📅 Scheduled!' : allResolved ? '✅ Publishing Complete' : '⏳ Publishing...'}
        </h3>
        {scheduleMode === 'schedule' ? (
          <p className="text-sm text-slate-500">
            Scheduled for {new Date(scheduledFor).toLocaleString()}.{' '}
            <Link to="/publish" className="text-[#2C666E] hover:underline">View Publish Queue</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {items.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Waiting for publisher...
              </div>
            )}
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                >
                  {PLATFORM_LABELS[item.platform]}
                </span>
                {item.status === 'publishing' && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                {item.status === 'published' && <span className="text-green-600 text-xs">✓ Published</span>}
                {item.status === 'failed' && <span className="text-red-500 text-xs">✗ {item.error?.slice(0, 80)}</span>}
                {item.status === 'scheduled' && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
              </div>
            ))}
            {allResolved && (
              <Link to="/publish" className="text-xs text-[#2C666E] hover:underline">View Publish Queue →</Link>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loadingConnections) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Loading platforms...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Publish</h3>

      {/* Platform checkboxes */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {allPlatforms.map(p => {
            const connected = connectedSet.has(p);
            return (
              <button
                key={p}
                onClick={() => connected && togglePlatform(p)}
                disabled={!connected}
                className={cn(
                  'text-xs py-1.5 px-3 rounded-lg border transition-colors',
                  !connected
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : selectedPlatforms.includes(p)
                      ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {PLATFORM_LABELS[p]}
                {!connected && (
                  <Link to="/settings/accounts" className="text-[10px] text-blue-500 ml-1" onClick={e => e.stopPropagation()}>
                    Connect
                  </Link>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Default metadata */}
      {selectedPlatforms.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Privacy</label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Per-platform overrides toggle */}
          <button
            onClick={() => setShowOverrides(!showOverrides)}
            className="text-xs text-[#2C666E] hover:underline"
          >
            {showOverrides ? '▾ Hide per-platform overrides' : '▸ Customize per platform'}
          </button>

          {showOverrides && (
            <div className="space-y-3 pl-3 border-l-2 border-slate-100">
              {selectedPlatforms.map(p => (
                <div key={p} className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600">{PLATFORM_LABELS[p]}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={title}
                      value={overrides[p]?.title || ''}
                      onChange={e => setOverrides(prev => ({ ...prev, [p]: { ...prev[p], title: e.target.value } }))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <select
                      value={overrides[p]?.privacy || privacy}
                      onChange={e => setOverrides(prev => ({ ...prev, [p]: { ...prev[p], privacy: e.target.value } }))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      {(PRIVACY_OPTIONS[p] || [{ value: 'public', label: 'Public' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Schedule picker */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                checked={scheduleMode === 'now'}
                onChange={() => setScheduleMode('now')}
                className="accent-[#2C666E]"
              />
              Publish Now
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                checked={scheduleMode === 'schedule'}
                onChange={() => setScheduleMode('schedule')}
                className="accent-[#2C666E]"
              />
              Schedule
            </label>
            {scheduleMode === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
              />
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPlatforms.length === 0 || (scheduleMode === 'schedule' && !scheduledFor)}
            className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : scheduleMode === 'schedule' ? (
              `📅 Schedule to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`
            ) : (
              `🚀 Publish Now to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`
            )}
          </button>
        </>
      )}
    </div>
  );
}
```

Also add the constants that `PublishSection` uses at the top of the file (after the imports):

```javascript
const PLATFORM_COLORS = {
  youtube: '#FF0000',
  tiktok: '#010101',
  instagram: '#E1306C',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
};

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const PRIVACY_OPTIONS = {
  youtube: [
    { value: 'public', label: 'Public' },
    { value: 'unlisted', label: 'Unlisted' },
    { value: 'private', label: 'Private' },
  ],
  tiktok: [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'private', label: 'Private' },
  ],
  instagram: [{ value: 'public', label: 'Public' }],
  facebook: [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'only_me', label: 'Only Me' },
  ],
  linkedin: [{ value: 'public', label: 'Public' }],
};
```

Add `useRef` to the React import on line 1 (it already imports `useState` and `useEffect`):

```javascript
import React, { useState, useEffect, useRef } from 'react';
```

Add `Link` to the router import on line 2 (currently imports `useParams` and `useNavigate`):

```javascript
import { useParams, useNavigate, Link } from 'react-router-dom';
```

Remove the `YouTubePublishModal` import (line 12), the `showYouTubePublish` state (line 22), the `isPublishing` state (line 23), the `handlePublishNow` function (lines 133-151), the YouTube button and old Publish button from the Actions section (lines 466-487), and the YouTubePublishModal JSX at the bottom (lines 500-513).

Replace the Actions section (lines 453-497) with:

```jsx
{/* ── Actions ───────────────────────────────────────────────────────── */}
<section className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
  {videoUrl && (
    <Button
      variant="outline"
      onClick={handleDownload}
      className="text-sm"
    >
      <Download className="w-4 h-4 mr-2" /> Download Video
    </Button>
  )}
  <Button
    variant="ghost"
    onClick={() => navigate('/campaigns')}
    className="text-sm text-slate-500"
  >
    Back to Campaigns
  </Button>
</section>

{/* ── Publish Section ────────────────────────────────────────────── */}
{isReady && !isPublished && videoUrl && (
  <PublishSection
    draftId={draft.id}
    defaultTitle={meta.script?.title || 'Short'}
  />
)}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShortsDraftPage.jsx
git commit -m "feat: add multi-platform publish section to Shorts draft page"
```

---

### Task 10: Batch Queue Integration

Add "Schedule All" section to the Batch Queue results page for bulk scheduling completed batch items.

**Files:**
- Modify: `src/pages/BatchQueuePage.jsx`

- [ ] **Step 1: Add ScheduleAllSection component and integrate it**

Add a `ScheduleAllSection` component inside `BatchQueuePage.jsx`. It renders inside the `ProgressPhase` component when `isDone` is true, below the summary banner.

The component needs:
1. Platform checkboxes (fetch connections from `/api/accounts/connections`)
2. Title template input with `{topic}` placeholder
3. Shared description + privacy
4. Schedule now / schedule picker
5. Stagger toggle (1-hour apart)
6. "Schedule N Videos" button that calls `POST /api/publish/schedule` per completed draft

Add imports at the top of the file: `useRef` is not currently imported — add it. Also add `Calendar` from lucide-react.

```jsx
// Add to imports at top of file:
// import { useState, useEffect, useRef } from 'react';  (add useRef)
// import { Calendar } from 'lucide-react';  (add Calendar to existing lucide import)
```

Add after the `COMPETITION_COLOR` constant (around line 54):

```javascript
const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};
```

Add the `ScheduleAllSection` component before the `ProgressPhase` component:

```jsx
function ScheduleAllSection({ jobs }) {
  const [connections, setConnections] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [titleTemplate, setTitleTemplate] = useState('{topic}');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [stagger, setStagger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await apiFetch('/api/accounts/connections');
        const data = await res.json();
        if (data.platforms) setConnections(data.platforms);
        else if (Array.isArray(data)) setConnections(data);
      } catch (err) {
        console.error('[ScheduleAll] Failed to load connections:', err.message);
      } finally {
        setLoadingConnections(false);
      }
    }
    fetchConnections();
  }, []);

  const connectedSet = new Set(connections.filter(c => c.connected || c.platform_username).map(c => c.platform));
  const allPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin'];
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.draft_id);

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleScheduleAll = async () => {
    if (selectedPlatforms.length === 0 || completedJobs.length === 0) return;
    setIsSubmitting(true);

    const baseTime = scheduleMode === 'schedule' ? new Date(scheduledFor) : new Date();
    let successCount = 0;

    for (let i = 0; i < completedJobs.length; i++) {
      const job = completedJobs[i];
      const jobTitle = titleTemplate.replace(/\{topic\}/g, job.topic || 'Untitled');
      const publishTime = stagger
        ? new Date(baseTime.getTime() + i * 60 * 60 * 1000) // +1 hour per draft
        : baseTime;

      const platforms = selectedPlatforms.map(p => ({
        platform: p,
        title: jobTitle,
        description,
        privacy,
      }));

      try {
        const res = await apiFetch('/api/publish/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft_id: job.draft_id,
            platforms,
            scheduled_for: scheduleMode === 'schedule' || stagger ? publishTime.toISOString() : null,
          }),
        });
        const data = await res.json();
        if (data.queue_ids) successCount++;
      } catch (err) {
        console.error(`[ScheduleAll] Failed for draft ${job.draft_id}:`, err.message);
      }
    }

    setIsSubmitting(false);
    setSubmitted(true);
    if (successCount < completedJobs.length) {
      toast.error(`Scheduled ${successCount} of ${completedJobs.length} — some failed`);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        ✅ All videos scheduled!{' '}
        <Link to="/publish" className="text-[#2C666E] hover:underline font-medium">View Publish Queue →</Link>
      </div>
    );
  }

  if (loadingConnections) return null;
  if (completedJobs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#2C666E]" />
        <h3 className="text-sm font-semibold text-slate-700">Schedule All</h3>
      </div>

      {/* Platform checkboxes */}
      <div className="flex flex-wrap gap-2">
        {allPlatforms.map(p => {
          const connected = connectedSet.has(p);
          return (
            <button
              key={p}
              onClick={() => connected && togglePlatform(p)}
              disabled={!connected}
              className={cn(
                'text-xs py-1.5 px-3 rounded-lg border transition-colors',
                !connected ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                  : selectedPlatforms.includes(p)
                    ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {PLATFORM_LABELS[p]}
            </button>
          );
        })}
      </div>

      {selectedPlatforms.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Title Template</label>
              <input
                type="text"
                value={titleTemplate}
                onChange={e => setTitleTemplate(e.target.value)}
                placeholder="{topic}"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Use {'{topic}'} for each video's topic</p>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Privacy</label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none"
            />
          </div>

          {/* Schedule + stagger */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="batchSchedule" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="accent-[#2C666E]" />
              Publish Now
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="batchSchedule" checked={scheduleMode === 'schedule'} onChange={() => setScheduleMode('schedule')} className="accent-[#2C666E]" />
              Schedule
            </label>
            {scheduleMode === 'schedule' && (
              <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
            )}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-auto">
              <input type="checkbox" checked={stagger} onChange={e => setStagger(e.target.checked)} className="accent-[#2C666E]" />
              Space 1 hour apart
            </label>
          </div>

          <button
            onClick={handleScheduleAll}
            disabled={isSubmitting || selectedPlatforms.length === 0}
            className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
              : `📅 Schedule ${completedJobs.length} Video${completedJobs.length > 1 ? 's' : ''}`
            }
          </button>
        </>
      )}
    </div>
  );
}
```

Render it in the `ProgressPhase` component, after the summary banner (after line 468, inside the `isDone` check):

```jsx
{isDone && (
  <>
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
      Batch complete — {batch.completed_items} succeeded, {batch.failed_items} failed.
      {batch.failed_items > 0 && ' Failed items can be retried individually in the Workbench.'}
    </div>
    <ScheduleAllSection jobs={jobs} />
  </>
)}
```

This replaces the existing `isDone` summary block (lines 464-469).

Also add a small "Schedule" link to each completed job card. In the completed actions section (around line 437), add after the existing "Edit in Workbench" link:

```jsx
{job.draft_id && (
  <Link
    to={`/shorts/draft/${job.draft_id}`}
    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
  >
    <Calendar className="w-3 h-3" /> Schedule
  </Link>
)}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/BatchQueuePage.jsx
git commit -m "feat: add Schedule All section to Batch Queue results page"
```

---

### Task 11: Build Verification + Deploy

- [ ] **Step 1: Full build verification**

```bash
npm run build
```

Ensure no errors. The chunk size warning is expected and acceptable.

- [ ] **Step 2: Push and deploy**

```bash
git push && fly deploy
```

- [ ] **Step 3: Verify deploy succeeds**

Watch for "Machine is now in a good state" messages for all 3 machines.
