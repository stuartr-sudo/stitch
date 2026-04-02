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
