// Command Center — Campaign Build Trigger
// POST /api/command-center/campaigns/:id/build
// Starts building a campaign in the background, returns immediately

import { createClient } from '@supabase/supabase-js';
import { buildCampaign } from '../lib/campaignOrchestrator.js';
import { estimateCampaignCost } from '../lib/flowCostEstimator.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const userEmail = req.user.email;
  const campaignId = req.params?.id;

  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID required' });
  }

  try {
    // Load campaign
    const { data: campaign, error } = await supabase
      .from('command_center_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'planning') {
      return res.status(400).json({ error: `Campaign is already ${campaign.status}` });
    }

    if (!campaign.plan_json?.items?.length) {
      return res.status(400).json({ error: 'Campaign has no plan items' });
    }

    // Estimate cost
    const costEstimate = estimateCampaignCost(campaign.plan_json);

    // Check cost ceiling ($25 for safety)
    if (costEstimate.total > 25) {
      return res.status(400).json({
        error: `Estimated cost $${costEstimate.total.toFixed(2)} exceeds $25 limit`,
        estimate: costEstimate
      });
    }

    // Return immediately — build runs in background
    res.json({
      status: 'building',
      campaign_id: campaignId,
      estimate: costEstimate,
      message: `Building ${campaign.plan_json.items.length} items (est. ${costEstimate.formatted})`
    });

    // Start building in the background (after response is sent)
    buildCampaign({ campaignId, userId, userEmail }).catch(err => {
      console.error('[Build] Background build failed:', err);
    });

  } catch (err) {
    console.error('Command Center build error:', err);
    return res.status(500).json({ error: err.message || 'Build failed' });
  }
}
