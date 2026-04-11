// Campaign Orchestrator — manages the campaign build lifecycle
// Creates items, dispatches templates, monitors progress, updates statuses

import { createClient } from '@supabase/supabase-js';
import { CAMPAIGN_TEMPLATES } from './campaignFlowTemplates.js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Build a campaign — create items from plan, execute templates, update statuses
 * Runs in the background after the HTTP response is sent
 */
export async function buildCampaign({ campaignId, userId, userEmail }) {
  const supabase = getSupabase();

  try {
    // Load campaign and its plan
    const { data: campaign, error } = await supabase
      .from('command_center_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (error || !campaign) {
      console.error('[Orchestrator] Campaign not found:', campaignId);
      return;
    }

    if (!campaign.plan_json?.items?.length) {
      console.error('[Orchestrator] Campaign has no plan items:', campaignId);
      await supabase.from('command_center_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaignId);
      return;
    }

    // Update campaign status to building
    await supabase.from('command_center_campaigns')
      .update({ status: 'building' })
      .eq('id', campaignId);

    const planItems = campaign.plan_json.items;

    // Create command_center_items — split multi-platform items into separate rows
    const itemRows = [];
    for (const planItem of planItems) {
      const platforms = Array.isArray(planItem.platform)
        ? planItem.platform
        : [planItem.platform || null];

      for (const platform of platforms) {
        itemRows.push({
          campaign_id: campaignId,
          user_id: userId,
          type: planItem.type,
          platform,
          status: 'building',
          plan_item_json: planItem
        });
      }
    }

    const { data: items } = await supabase
      .from('command_center_items')
      .insert(itemRows)
      .select();

    // Update campaign item count
    await supabase.from('command_center_campaigns')
      .update({ item_count: items?.length || 0 })
      .eq('id', campaignId);

    // Execute templates for each item (up to 3 concurrently)
    const CONCURRENCY = 3;
    const itemQueue = [...(items || [])];
    let readyCount = 0;

    const processItem = async (item) => {
      try {
        const template = CAMPAIGN_TEMPLATES[item.type];

        if (!template) {
          // No template — mark as custom/manual
          await supabase.from('command_center_items')
            .update({
              status: 'ready',
              result_json: { message: 'Custom type — open in Flow Builder to build manually' },
              preview_url: null
            })
            .eq('id', item.id);
          readyCount++;
          return;
        }

        // Merge platform into plan item (since we split multi-platform)
        const planItem = { ...item.plan_item_json, platform: item.platform };

        const result = await template({
          userId,
          userEmail,
          planItem
        });

        // Update item with result
        await supabase.from('command_center_items')
          .update({
            status: 'ready',
            result_json: result,
            preview_url: result.preview_url || null
          })
          .eq('id', item.id);

        readyCount++;

      } catch (err) {
        console.error(`[Orchestrator] Item ${item.id} failed:`, err.message);
        await supabase.from('command_center_items')
          .update({
            status: 'failed',
            error: err.message || 'Unknown error'
          })
          .eq('id', item.id);
      }

      // Update ready count on campaign
      await supabase.from('command_center_campaigns')
        .update({ items_ready: readyCount })
        .eq('id', campaignId);
    };

    // Process in batches of CONCURRENCY
    while (itemQueue.length > 0) {
      const batch = itemQueue.splice(0, CONCURRENCY);
      await Promise.allSettled(batch.map(processItem));
    }

    // Determine final campaign status
    const { data: finalItems } = await supabase
      .from('command_center_items')
      .select('status')
      .eq('campaign_id', campaignId);

    const allReady = finalItems?.every(i => i.status === 'ready');
    const allFailed = finalItems?.every(i => i.status === 'failed');

    await supabase.from('command_center_campaigns')
      .update({
        status: allFailed ? 'cancelled' : 'review',
        items_ready: finalItems?.filter(i => i.status === 'ready').length || 0
      })
      .eq('id', campaignId);

    console.log(`[Orchestrator] Campaign ${campaignId} complete: ${readyCount}/${items?.length} items ready`);

  } catch (err) {
    console.error('[Orchestrator] Campaign build failed:', err);
    await supabase.from('command_center_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', campaignId)
      .catch(() => {});
  }
}

/**
 * Recover interrupted campaigns on server startup
 * Marks building campaigns/items as failed with restart message
 */
export async function recoverInterruptedCampaigns() {
  try {
    const supabase = getSupabase();

    // Find campaigns stuck in building state
    const { data: stuckCampaigns } = await supabase
      .from('command_center_campaigns')
      .select('id')
      .eq('status', 'building');

    if (!stuckCampaigns?.length) return;

    console.log(`[Orchestrator] Recovering ${stuckCampaigns.length} interrupted campaigns`);

    for (const campaign of stuckCampaigns) {
      // Mark building items as failed
      await supabase.from('command_center_items')
        .update({
          status: 'failed',
          error: 'Interrupted by server restart — click Rebuild to retry'
        })
        .eq('campaign_id', campaign.id)
        .eq('status', 'building');

      // Update campaign status
      const { data: items } = await supabase
        .from('command_center_items')
        .select('status')
        .eq('campaign_id', campaign.id);

      const readyCount = items?.filter(i => i.status === 'ready').length || 0;
      const hasReady = readyCount > 0;

      await supabase.from('command_center_campaigns')
        .update({
          status: hasReady ? 'review' : 'cancelled',
          items_ready: readyCount
        })
        .eq('id', campaign.id);
    }
  } catch (err) {
    console.error('[Orchestrator] Recovery check failed:', err.message);
  }
}
