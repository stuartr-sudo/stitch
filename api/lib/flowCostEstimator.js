// Flow Cost Estimator — estimates API costs for campaign items before execution

// Approximate costs per content type (USD)
const COST_ESTIMATES = {
  short: {
    label: 'Short Video',
    breakdown: {
      'Script (GPT-4.1-mini)': 0.01,
      'Voiceover (Gemini TTS)': 0.05,
      'Timing (Whisper)': 0.02,
      'Keyframes (4-6 images)': 0.20,
      'Video clips (4-6 clips)': 1.50,
      'Music': 0.10,
      'Assembly + Captions': 0.05
    },
    total: 1.93
  },
  linkedin_post: {
    label: 'LinkedIn Post',
    breakdown: {
      'Copy generation (GPT-4.1-mini)': 0.01,
      'Image generation': 0.04,
      'Image composition': 0.01
    },
    total: 0.06
  },
  carousel: {
    label: 'Carousel',
    breakdown: {
      'Content generation (GPT-4.1)': 0.03,
      'Slide images (7 slides)': 0.28,
      'Image composition': 0.07
    },
    total: 0.38
  },
  ad_set: {
    label: 'Ad Set',
    breakdown: {
      'Copy generation per platform': 0.02,
      'Image generation per platform': 0.04,
      'Average 2 platforms': 0.00
    },
    total: 0.12
  },
  storyboard: {
    label: 'Storyboard',
    breakdown: {
      'Script generation': 0.02,
      'Visual direction': 0.02,
      'Preview images (5 scenes)': 0.20
    },
    total: 0.24
  },
  custom: {
    label: 'Custom Flow',
    breakdown: {
      'Varies by complexity': 0.00
    },
    total: 0.50
  }
};

/**
 * Estimate total cost for a campaign plan
 * @param {object} plan - Campaign plan with items array
 * @returns {{ total: number, breakdown: Array<{ type, label, cost }>, formatted: string }}
 */
export function estimateCampaignCost(plan) {
  if (!plan?.items?.length) {
    return { total: 0, breakdown: [], formatted: '$0.00' };
  }

  const breakdown = [];
  let total = 0;

  for (const item of plan.items) {
    const estimate = COST_ESTIMATES[item.type] || COST_ESTIMATES.custom;
    const platforms = Array.isArray(item.platform) ? item.platform.length : 1;
    const itemCost = estimate.total * (item.type === 'ad_set' ? platforms : 1);

    breakdown.push({
      type: item.type,
      label: estimate.label,
      platform: item.platform,
      cost: itemCost
    });

    total += itemCost;
  }

  return {
    total: Math.round(total * 100) / 100,
    breakdown,
    formatted: `$${total.toFixed(2)}`
  };
}
