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
 * Respects publish_delay_hours, preferred schedule_times, and max_daily_publishes.
 *
 * @param {object} config - autonomous config with publish_delay_hours, schedule_times, max_daily_publishes
 * @param {string} [userId] - user ID for querying existing scheduled drafts
 * @param {object} [supabase] - Supabase client (required for daily limit enforcement)
 * @returns {Promise<Date>} next available publish time
 */
export async function calculateNextPublishSlot(config, userId, supabase) {
  const now = new Date();
  const delayMs = (config.publish_delay_hours || 24) * 3600000;
  const earliest = new Date(now.getTime() + delayMs);
  const maxDaily = config.max_daily_publishes || 3;

  // Count scheduled+published drafts for a given date
  async function countDraftsForDate(date) {
    if (!supabase || !userId) return 0;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { count } = await supabase
      .from('ad_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('scheduled_for', dayStart.toISOString())
      .lte('scheduled_for', dayEnd.toISOString())
      .in('publish_status', ['scheduled', 'published']);

    return count || 0;
  }

  // If schedule_times are configured, iterate day-by-day, time-by-time
  if (config.schedule_times?.length > 0) {
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const candidateDay = new Date(earliest);
      candidateDay.setDate(candidateDay.getDate() + dayOffset);

      const existingCount = await countDraftsForDate(candidateDay);
      if (existingCount >= maxDaily) continue;

      for (const timeStr of config.schedule_times) {
        const [h, m] = timeStr.split(':').map(Number);
        const candidate = new Date(candidateDay);
        candidate.setHours(h, m, 0, 0);
        if (candidate > earliest) return candidate;
      }
    }
  }

  // No schedule_times — find next day under the daily limit
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    const candidate = new Date(earliest);
    candidate.setDate(candidate.getDate() + dayOffset);
    const existingCount = await countDraftsForDate(candidate);
    if (existingCount < maxDaily) return candidate;
  }

  return earliest; // fallback if all 14 days are full
}
