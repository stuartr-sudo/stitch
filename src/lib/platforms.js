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

export function getPlatformList() {
  return Object.entries(PLATFORMS).map(([key, val]) => ({
    value: key,
    label: val.name,
  }));
}
