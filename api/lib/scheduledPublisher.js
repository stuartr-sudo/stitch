/**
 * Scheduled Post Executor — polls for drafts due for publication.
 *
 * Checks `ad_drafts` where publish_status = 'scheduled' and scheduled_for <= NOW().
 * Updates them to 'published' and syncs the parent campaign status.
 *
 * Started as a setInterval in server.js alongside pollStitchQueue.
 */

import { createClient } from '@supabase/supabase-js';
import { checkAndUpdateCampaignStatus } from './campaignHelpers.js';

export async function pollScheduledPublications() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();

  try {
    // Find all drafts due for publication
    const { data: dueDrafts, error } = await supabase
      .from('ad_drafts')
      .select('id, campaign_id, generation_status, publish_status, scheduled_for')
      .eq('publish_status', 'scheduled')
      .eq('generation_status', 'ready')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (error || !dueDrafts?.length) return;

    console.log(`[scheduled-publisher] Found ${dueDrafts.length} draft(s) due for publication`);

    for (const draft of dueDrafts) {
      try {
        // Optimistic lock: only update if still 'scheduled'
        const { error: updateErr } = await supabase
          .from('ad_drafts')
          .update({
            publish_status: 'published',
            scheduled_for: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draft.id)
          .eq('publish_status', 'scheduled');

        if (updateErr) {
          console.error(`[scheduled-publisher] Failed to publish draft ${draft.id}:`, updateErr.message);
          continue;
        }

        // Update parent campaign status
        await checkAndUpdateCampaignStatus(draft.campaign_id, supabase);
        console.log(`[scheduled-publisher] Published draft ${draft.id}`);
      } catch (err) {
        console.error(`[scheduled-publisher] Error publishing draft ${draft.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[scheduled-publisher] Poll error:', err.message);
  }
}
