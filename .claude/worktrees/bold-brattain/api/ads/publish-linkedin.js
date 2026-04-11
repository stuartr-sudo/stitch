/**
 * POST /api/ads/variations/:id/publish-linkedin
 *
 * Publishes an approved LinkedIn ad variation to LinkedIn Campaign Manager.
 * Creates Campaign Group → Campaign → uploads image → creates Creative (inline).
 * Reuses existing LinkedIn campaign group/campaign if already created for this Stitch campaign.
 */
import { createClient } from '@supabase/supabase-js';
import { loadTokens } from '../lib/tokenManager.js';

const LINKEDIN_VERSION = '202503';
const LINKEDIN_BASE = 'https://api.linkedin.com/rest';

const OBJECTIVE_MAP = {
  traffic: 'WEBSITE_VISITS',
  conversions: 'WEBSITE_CONVERSIONS',
  awareness: 'BRAND_AWARENESS',
  leads: 'LEAD_GENERATION',
};

const CTA_MAP = {
  'Learn More': 'LEARN_MORE',
  'Sign Up': 'SIGN_UP',
  'Download': 'DOWNLOAD',
  'Get Quote': 'VIEW_QUOTE',
  'Apply': 'APPLY',
  'Register': 'REGISTER',
  'Subscribe': 'SUBSCRIBE',
  'Request Demo': 'REQUEST_DEMO',
  'Join': 'JOIN',
  'Attend': 'ATTEND',
};

function linkedinHeaders(accessToken, contentType = 'application/json') {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': contentType,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

/**
 * Fetch the organization URN associated with an ad account.
 */
async function getAdAccountOrg(accessToken, adAccountId) {
  const res = await fetch(`${LINKEDIN_BASE}/adAccounts/${adAccountId}`, {
    headers: linkedinHeaders(accessToken),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch ad account: ${res.status} ${text}`);
  }
  const data = await res.json();
  // reference field contains the org URN (e.g. urn:li:organization:12345)
  return data.reference || data.referenceOrganization || null;
}

/**
 * Create a Campaign Group for the Stitch campaign.
 */
async function createCampaignGroup(accessToken, adAccountId, campaignName) {
  const accountUrn = `urn:li:sponsoredAccount:${adAccountId}`;
  const res = await fetch(`${LINKEDIN_BASE}/adAccounts/${adAccountId}/adCampaignGroups`, {
    method: 'POST',
    headers: linkedinHeaders(accessToken),
    body: JSON.stringify({
      account: accountUrn,
      name: campaignName,
      status: 'ACTIVE',
      runSchedule: { start: Date.now() },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create campaign group: ${res.status} ${text}`);
  }
  const groupId = res.headers.get('x-restli-id');
  if (!groupId) throw new Error('No campaign group ID in response');
  return groupId;
}

/**
 * Create a Campaign under the given campaign group.
 */
async function createCampaign(accessToken, adAccountId, groupId, { name, objective, landingUrl }) {
  const accountUrn = `urn:li:sponsoredAccount:${adAccountId}`;
  const groupUrn = `urn:li:sponsoredCampaignGroup:${groupId}`;
  const objectiveType = OBJECTIVE_MAP[objective] || 'WEBSITE_VISITS';

  const res = await fetch(`${LINKEDIN_BASE}/adAccounts/${adAccountId}/adCampaigns`, {
    method: 'POST',
    headers: linkedinHeaders(accessToken),
    body: JSON.stringify({
      account: accountUrn,
      campaignGroup: groupUrn,
      name,
      status: 'ACTIVE',
      type: 'SPONSORED_UPDATES',
      objectiveType,
      costType: 'CPM',
      dailyBudget: { amount: '20', currencyCode: 'USD' },
      unitCost: { amount: '5', currencyCode: 'USD' },
      locale: { country: 'US', language: 'en' },
      runSchedule: { start: Date.now() },
      audienceExpansionEnabled: false,
      offsiteDeliveryEnabled: false,
      targetingCriteria: {
        include: {
          and: [{
            or: {
              'urn:li:adTargetingFacet:locations': ['urn:li:geo:103644278'], // United States
            },
          }],
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create campaign: ${res.status} ${text}`);
  }
  const campaignId = res.headers.get('x-restli-id');
  if (!campaignId) throw new Error('No campaign ID in response');
  return campaignId;
}

/**
 * Upload an image for ads (owner = organization URN).
 */
async function uploadAdImage(accessToken, ownerUrn, imageUrl) {
  // Step 1: Initialize upload
  const initRes = await fetch(`${LINKEDIN_BASE}/images?action=initializeUpload`, {
    method: 'POST',
    headers: linkedinHeaders(accessToken),
    body: JSON.stringify({
      initializeUploadRequest: { owner: ownerUrn },
    }),
  });
  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`Image init failed: ${initRes.status} ${text}`);
  }
  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error('Missing uploadUrl or imageUrn from init');

  // Step 2: Download image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
  const imageBuffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

  // Step 3: Upload binary
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: imageBuffer,
  });
  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Image upload PUT failed: ${putRes.status} ${text}`);
  }

  return imageUrn;
}

/**
 * Create a Creative (inline DSC post + creative in one call).
 */
async function createCreative(accessToken, adAccountId, campaignId, orgUrn, { imageUrn, copyData, landingUrl }) {
  const accountUrn = `urn:li:sponsoredAccount:${adAccountId}`;
  const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;

  // Map CTA from copy_data
  const ctaLabel = CTA_MAP[copyData.cta] || 'LEARN_MORE';

  const body = {
    creative: {
      campaign: campaignUrn,
      intendedStatus: 'ACTIVE',
      inlineContent: {
        post: {
          adContext: {
            dscAdAccount: accountUrn,
            dscStatus: 'ACTIVE',
          },
          author: orgUrn,
          commentary: copyData.introText || '',
          visibility: 'PUBLIC',
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
          contentCallToActionLabel: ctaLabel,
          contentLandingPage: landingUrl || '',
          content: {
            media: {
              title: copyData.headline || '',
              id: imageUrn,
            },
          },
        },
      },
    },
  };

  const res = await fetch(
    `${LINKEDIN_BASE}/adAccounts/${adAccountId}/creatives?action=createInline`,
    {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create creative: ${res.status} ${text}`);
  }
  const creativeId = res.headers.get('x-restli-id');
  if (!creativeId) throw new Error('No creative ID in response');
  return creativeId;
}


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const { id: variationId } = req.params;

  try {
    // 1. Load variation
    const { data: variation, error: varErr } = await supabase
      .from('ad_variations')
      .select('*')
      .eq('id', variationId)
      .eq('user_id', userId)
      .single();

    if (varErr || !variation) return res.status(404).json({ error: 'Variation not found' });
    if (variation.platform !== 'linkedin') return res.status(400).json({ error: 'Not a LinkedIn variation' });
    if (variation.status !== 'approved') return res.status(400).json({ error: 'Variation must be approved before publishing' });
    if (!variation.image_urls?.length) return res.status(400).json({ error: 'Variation has no images' });

    // 2. Load parent campaign
    const { data: campaign, error: campErr } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('id', variation.campaign_id)
      .eq('user_id', userId)
      .single();

    if (campErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    // 3. Load LinkedIn credentials
    const conn = await loadTokens(userId, 'linkedin', supabase);
    if (!conn?.access_token) return res.status(400).json({ error: 'LinkedIn not connected. Please reconnect in Settings.' });

    const accessToken = conn.access_token;

    // 4. Get ad account ID from config
    const adAccountId = conn.config?.ad_account_id;
    if (!adAccountId) return res.status(400).json({ error: 'No LinkedIn ad account configured. Set ad_account_id in platform_connections config.' });

    // 5. Look up organization URN from the ad account
    const orgUrn = await getAdAccountOrg(accessToken, adAccountId);
    if (!orgUrn) return res.status(400).json({ error: 'Could not resolve organization from ad account' });

    // 6. Create or reuse Campaign Group
    let groupId = campaign.linkedin_group_id;
    if (!groupId) {
      groupId = await createCampaignGroup(accessToken, adAccountId, campaign.name);
      await supabase
        .from('ad_campaigns')
        .update({ linkedin_group_id: groupId })
        .eq('id', campaign.id);
    }

    // 7. Create or reuse Campaign
    let linkedinCampaignId = campaign.linkedin_campaign_id;
    if (!linkedinCampaignId) {
      linkedinCampaignId = await createCampaign(accessToken, adAccountId, groupId, {
        name: campaign.name,
        objective: campaign.objective,
        landingUrl: campaign.landing_url,
      });
      await supabase
        .from('ad_campaigns')
        .update({ linkedin_campaign_id: linkedinCampaignId })
        .eq('id', campaign.id);
    }

    // 8. Upload image
    const imageUrn = await uploadAdImage(accessToken, orgUrn, variation.image_urls[0]);

    // 9. Create Creative
    const creativeId = await createCreative(accessToken, adAccountId, linkedinCampaignId, orgUrn, {
      imageUrn,
      copyData: variation.copy_data || {},
      landingUrl: campaign.landing_url,
    });

    // 10. Update variation status
    const { data: updated } = await supabase
      .from('ad_variations')
      .update({
        status: 'published',
        platform_ad_id: creativeId,
      })
      .eq('id', variationId)
      .select()
      .single();

    return res.json({
      success: true,
      variation: updated,
      linkedin: {
        campaignGroupId: groupId,
        campaignId: linkedinCampaignId,
        creativeId,
      },
    });
  } catch (err) {
    console.error('LinkedIn Ads publish error:', err);
    return res.status(500).json({ error: err.message || 'Failed to publish to LinkedIn' });
  }
}
