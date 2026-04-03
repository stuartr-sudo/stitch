/**
 * GET /api/ads/campaigns/:id/export — Download ZIP of all creatives
 */
import { createClient } from '@supabase/supabase-js';
import archiver from 'archiver';

const PLATFORM_PRESETS = {
  linkedin: { utm_source: 'linkedin', utm_medium: 'paid_social' },
  google: { utm_source: 'google', utm_medium: 'cpc' },
  meta: { utm_source: 'facebook', utm_medium: 'paid_social' },
};

function slugify(str) {
  return (str || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildTrackedUrl(baseUrl, utmParams) {
  if (!baseUrl) return '';
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(utmParams || {})) {
      if (value?.trim()) url.searchParams.set(key, value.trim());
    }
    return url.toString();
  } catch {
    const params = Object.entries(utmParams || {})
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`)
      .join('&');
    if (!params) return baseUrl;
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params}`;
  }
}

function formatCopyText(platform, copyData) {
  if (!copyData) return '';
  const lines = [];

  if (platform === 'linkedin') {
    if (copyData.introText) lines.push(`Intro Text:\n${copyData.introText}\n`);
    if (copyData.headline) lines.push(`Headline:\n${copyData.headline}\n`);
    if (copyData.description) lines.push(`Description:\n${copyData.description}\n`);
    if (copyData.cta) lines.push(`CTA: ${copyData.cta}`);
  } else if (platform === 'meta') {
    if (copyData.primaryText) lines.push(`Primary Text:\n${copyData.primaryText}\n`);
    if (copyData.headline) lines.push(`Headline:\n${copyData.headline}\n`);
    if (copyData.description) lines.push(`Description:\n${copyData.description}\n`);
    if (copyData.cta) lines.push(`CTA: ${copyData.cta}`);
  } else if (platform === 'google') {
    if (copyData.headlines?.length) {
      lines.push('Headlines:');
      copyData.headlines.forEach((h, i) => lines.push(`  ${i + 1}. ${h}`));
      lines.push('');
    }
    if (copyData.descriptions?.length) {
      lines.push('Descriptions:');
      copyData.descriptions.forEach((d, i) => lines.push(`  ${i + 1}. ${d}`));
    }
  }

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { id } = req.params;

  const { data: campaign, error } = await supabase
    .from('ad_campaigns')
    .select('*, ad_variations(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !campaign) return res.status(404).json({ error: 'Campaign not found' });

  const variations = campaign.ad_variations || [];
  if (!variations.length) return res.status(400).json({ error: 'No variations to export' });

  const slug = slugify(campaign.name);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-creatives.zip"`);

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'ZIP generation failed' });
  });
  archive.pipe(res);

  // Track folder numbering per platform
  const platformCount = {};

  for (const variation of variations) {
    const platform = variation.platform || 'unknown';
    platformCount[platform] = (platformCount[platform] || 0) + 1;
    const folder = `${platform}-${platformCount[platform]}`;

    // Download and add images
    const imageUrls = variation.image_urls || [];
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imgRes = await fetch(imageUrls[i]);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const ext = imageUrls[i].match(/\.(png|webp|gif)(\?|$)/i)?.[1]?.toLowerCase() || 'jpg';
          archive.append(buffer, { name: `${folder}/image-${i + 1}.${ext}` });
        }
      } catch (e) {
        console.error(`Failed to download image ${imageUrls[i]}:`, e.message);
      }
    }

    // Add copy text
    const copyText = formatCopyText(platform, variation.copy_data);
    if (copyText) {
      archive.append(copyText, { name: `${folder}/copy.txt` });
    }

    // Add UTM link
    if (campaign.landing_url) {
      const preset = PLATFORM_PRESETS[platform] || {};
      const utmParams = {
        ...preset,
        utm_campaign: slug,
      };
      const trackedUrl = buildTrackedUrl(campaign.landing_url, utmParams);
      archive.append(trackedUrl, { name: `${folder}/link.txt` });
    }
  }

  await archive.finalize();
}
