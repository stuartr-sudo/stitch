export const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    ratios: ['9:16'],
    defaultRatio: '9:16',
    maxDuration: 600,
    dimensions: { width: 1080, height: 1920 },
    safeZones: { bottom: 20, right: 15 },
  },
  instagram_reels: {
    name: 'Instagram Reels',
    ratios: ['9:16'],
    defaultRatio: '9:16',
    maxDuration: 90,
    dimensions: { width: 1080, height: 1920 },
    safeZones: { bottom: 15 },
  },
  instagram_feed: {
    name: 'Instagram Feed',
    ratios: ['1:1', '4:5', '16:9'],
    defaultRatio: '1:1',
    maxDuration: 60,
    dimensions: { width: 1080, height: 1080 },
    safeZones: {},
  },
  instagram_story: {
    name: 'Instagram Story',
    ratios: ['9:16'],
    defaultRatio: '9:16',
    maxDuration: 60,
    dimensions: { width: 1080, height: 1920 },
    safeZones: { top: 10, bottom: 15 },
  },
  facebook_feed: {
    name: 'Facebook Feed',
    ratios: ['1:1', '4:5', '16:9'],
    defaultRatio: '1:1',
    maxDuration: 240,
    dimensions: { width: 1080, height: 1080 },
    safeZones: {},
  },
  facebook_reels: {
    name: 'Facebook Reels',
    ratios: ['9:16'],
    defaultRatio: '9:16',
    maxDuration: 90,
    dimensions: { width: 1080, height: 1920 },
    safeZones: { bottom: 20 },
  },
  youtube_video: {
    name: 'YouTube Video (Landscape)',
    ratios: ['16:9'],
    defaultRatio: '16:9',
    maxDuration: 3600,
    dimensions: { width: 1920, height: 1080 },
    safeZones: {},
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    ratios: ['9:16'],
    defaultRatio: '9:16',
    maxDuration: 60,
    dimensions: { width: 1080, height: 1920 },
    safeZones: { bottom: 15 },
  },
  linkedin_feed: {
    name: 'LinkedIn Feed',
    ratios: ['1:1', '16:9', '9:16'],
    defaultRatio: '1:1',
    maxDuration: 600,
    dimensions: { width: 1080, height: 1080 },
    safeZones: {},
  },
  pinterest: {
    name: 'Pinterest',
    ratios: ['2:3', '1:1'],
    defaultRatio: '2:3',
    maxDuration: 60,
    dimensions: { width: 1000, height: 1500 },
    safeZones: {},
  },
};

export const RATIO_DIMENSIONS = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '2:3': { width: 1000, height: 1500 },
  '3:4': { width: 1080, height: 1440 },
};

/**
 * OAuth connection platforms for Connected Accounts and Onboarding.
 */
export const OAUTH_PLATFORMS = [
  {
    key: 'youtube',
    label: 'YouTube',
    color: 'bg-red-500',
    authUrl: null, // YouTube uses existing brand-based flow
    description: 'Publish Shorts and videos',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    color: 'bg-blue-700',
    authUrl: '/api/linkedin/oauth/auth',
    description: 'Publish posts and carousels',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
    authUrl: '/api/meta/auth',
    description: 'Publish photos and carousels',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: 'bg-blue-600',
    authUrl: '/api/meta/auth',
    description: 'Publish to Pages',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    color: 'bg-black',
    authUrl: '/api/tiktok/auth',
    description: 'Publish videos and photo carousels',
  },
];

export function getPlatformList() {
  return Object.entries(PLATFORMS).map(([key, val]) => ({
    value: key,
    label: val.name,
  }));
}
