/**
 * Shared campaign helper functions.
 * Extracted from publish.js so scheduledPublisher.js and autonomous.js can reuse them.
 */

/**
 * Check all drafts for a campaign and update the campaign's status accordingly.
 * - All published → 'published'
 * - Some published → 'partial'
 */
export async function checkAndUpdateCampaignStatus(campaignId, supabase) {
  const { data: drafts } = await supabase
    .from('ad_drafts')
    .select('publish_status')
    .eq('campaign_id', campaignId);

  if (!drafts?.length) return;

  const allPublished = drafts.every(d => d.publish_status === 'published');
  const anyPublished = drafts.some(d => d.publish_status === 'published');

  if (allPublished) {
    await supabase.from('campaigns').update({ status: 'published' }).eq('id', campaignId);
  } else if (anyPublished) {
    await supabase.from('campaigns').update({ status: 'partial' }).eq('id', campaignId);
  }
}

/**
 * Calculate the next publish slot based on autonomous config.
 * Respects publish_delay_hours and preferred schedule_times.
 */
export function calculateNextPublishSlot(config) {
  const now = new Date();
  const delayMs = (config.publish_delay_hours || 24) * 3600000;
  const earliest = new Date(now.getTime() + delayMs);

  // If schedule_times are configured, find the next matching slot
  if (config.schedule_times?.length > 0) {
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      for (const timeStr of config.schedule_times) {
        const [h, m] = timeStr.split(':').map(Number);
        const candidate = new Date(earliest);
        candidate.setDate(candidate.getDate() + dayOffset);
        candidate.setHours(h, m, 0, 0);
        if (candidate > earliest) return candidate;
      }
    }
  }

  return earliest;
}
