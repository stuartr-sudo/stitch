/**
 * resolveVideoUrl.js
 *
 * Detects social-platform video URLs (YouTube, TikTok, Instagram, Facebook, Twitter/X)
 * and resolves them to direct downloadable MP4 URLs via yt-dlp.
 * Falls through for URLs that are already direct video files.
 *
 * Usage:
 *   const { videoUrl, metadata } = await resolveVideoUrl('https://www.youtube.com/watch?v=...');
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const PLATFORM_PATTERNS = [
  { name: 'youtube',   re: /(?:youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/)/i },
  { name: 'tiktok',    re: /tiktok\.com\//i },
  { name: 'instagram', re: /instagram\.com\/(?:reel|p|reels)\//i },
  { name: 'facebook',  re: /(?:facebook\.com\/.*\/videos\/|fb\.watch\/)/i },
  { name: 'twitter',   re: /(?:twitter\.com|x\.com)\/.*\/status\//i },
  { name: 'vimeo',     re: /vimeo\.com\//i },
];

const TIMEOUT_MS = 30_000;

/**
 * Detect which platform a URL belongs to (or null for direct URLs).
 */
function detectPlatform(url) {
  for (const { name, re } of PLATFORM_PATTERNS) {
    if (re.test(url)) return name;
  }
  return null;
}

/**
 * Check if yt-dlp binary is available on the system.
 */
async function ytdlpAvailable() {
  try {
    await execFileAsync('yt-dlp', ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run yt-dlp --dump-json to get metadata + direct URL in one call.
 */
async function getVideoInfo(url) {
  const { stdout } = await execFileAsync('yt-dlp', [
    '--dump-json',
    '--no-download',
    '--no-playlist',
    '--no-warnings',
    url,
  ], { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

  return JSON.parse(stdout);
}

/**
 * Run yt-dlp --get-url to get a direct stream URL (fallback).
 */
async function getDirectUrl(url) {
  const { stdout } = await execFileAsync('yt-dlp', [
    '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--get-url',
    '--no-playlist',
    '--no-warnings',
    url,
  ], { timeout: TIMEOUT_MS });

  // May return multiple lines (video + audio streams) — take first
  const lines = stdout.trim().split('\n').filter(Boolean);
  return lines[0] || null;
}

/**
 * Resolve a video URL to a direct downloadable link with metadata.
 *
 * @param {string} url - User-provided video URL (platform or direct)
 * @returns {Promise<{ videoUrl: string, metadata: object|null, warning: string|null }>}
 */
export async function resolveVideoUrl(url) {
  const platform = detectPlatform(url);

  // Not a platform URL — pass through
  if (!platform) {
    return { videoUrl: url, metadata: null, warning: null };
  }

  console.log(`[resolveVideoUrl] Detected platform: ${platform} for ${url}`);

  // Check if yt-dlp is installed
  const available = await ytdlpAvailable();
  if (!available) {
    console.warn('[resolveVideoUrl] yt-dlp not installed — falling back to original URL');
    return {
      videoUrl: url,
      metadata: { platform },
      warning: 'yt-dlp not installed. Install it for social media URL support.',
    };
  }

  try {
    // Try dump-json first (metadata + URL in one call)
    const info = await getVideoInfo(url);

    const metadata = {
      title: info.title || info.fulltitle || null,
      duration: info.duration || null,
      thumbnail: info.thumbnail || null,
      platform,
      uploader: info.uploader || info.channel || null,
      view_count: info.view_count || null,
      description: info.description ? info.description.slice(0, 500) : null,
    };

    // yt-dlp puts the best direct URL in `url` field
    let directUrl = info.url;

    // Some extractors don't populate `url` at top level — use --get-url fallback
    if (!directUrl || directUrl === url) {
      console.log('[resolveVideoUrl] dump-json had no direct URL, trying --get-url');
      directUrl = await getDirectUrl(url);
    }

    if (!directUrl) {
      console.warn('[resolveVideoUrl] Could not resolve direct URL — using original');
      return { videoUrl: url, metadata, warning: 'Could not extract direct video URL' };
    }

    console.log(`[resolveVideoUrl] Resolved: ${platform} → direct URL (${metadata.duration}s, "${metadata.title}")`);
    return { videoUrl: directUrl, metadata, warning: null };

  } catch (err) {
    console.error(`[resolveVideoUrl] yt-dlp failed for ${platform}:`, err.message);
    // Graceful degradation — return original URL
    return {
      videoUrl: url,
      metadata: { platform },
      warning: `Video URL resolution failed: ${err.message}. Try pasting a direct video URL instead.`,
    };
  }
}

export default resolveVideoUrl;
