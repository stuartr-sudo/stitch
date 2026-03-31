import React, { useState, useCallback } from 'react';
import { Shuffle } from 'lucide-react';
import { buildTrackedUrl } from './UTMBuilder';

/**
 * Google Search Ad preview mockup.
 * Simulates how Google rotates RSA assets by randomly picking
 * 3 of 15 headlines and 2 of 4 descriptions on each shuffle.
 */
export default function GoogleAdPreview({ variation, landingUrl }) {
  const copy = variation?.copy_data || {};
  const headlines = (copy.headlines || []).filter(h => h?.trim());
  const descriptions = (copy.descriptions || []).filter(d => d?.trim());
  const pinned = copy.pinned || {};

  // Pick random subset — respects pinned headlines
  const pickHeadlines = useCallback(() => {
    const result = [null, null, null]; // positions 1, 2, 3

    // Place pinned headlines first
    for (const [idx, pos] of Object.entries(pinned)) {
      const i = parseInt(idx);
      if (pos >= 1 && pos <= 3 && headlines[i]) {
        result[pos - 1] = headlines[i];
      }
    }

    // Fill remaining positions randomly
    const pinnedIndices = new Set(Object.keys(pinned).map(Number));
    const available = headlines.filter((_, i) => !pinnedIndices.has(i));
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 3; i++) {
      if (!result[i] && shuffled.length > 0) {
        result[i] = shuffled.shift();
      }
    }

    return result.filter(Boolean);
  }, [headlines, pinned]);

  const pickDescriptions = useCallback(() => {
    const shuffled = [...descriptions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [descriptions]);

  const [displayH, setDisplayH] = useState(() => pickHeadlines());
  const [displayD, setDisplayD] = useState(() => pickDescriptions());

  const handleShuffle = () => {
    setDisplayH(pickHeadlines());
    setDisplayD(pickDescriptions());
  };

  // Format URL for display — show tracked URL if UTMs are set
  const utmParams = copy.utm_params || {};
  const trackedUrl = buildTrackedUrl(landingUrl, utmParams);
  const displayUrl = (() => {
    try {
      const u = new URL(trackedUrl || landingUrl || 'https://example.com');
      return u.hostname.replace(/^www\./, '');
    } catch {
      return 'example.com';
    }
  })();

  const headlineText = displayH.length > 0 ? displayH.join(' | ') : 'Your Headline Here';
  const descText = displayD.length > 0 ? displayD.join(' ') : 'Your ad description will appear here.';

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Shuffle button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2C666E] transition-colors px-2 py-1 rounded hover:bg-gray-100"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Shuffle rotation
        </button>
      </div>

      {/* Google Search result mockup */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        {/* "Sponsored" label */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-medium text-gray-500">Sponsored</span>
        </div>

        {/* URL breadcrumb */}
        <div className="flex items-center gap-1 mb-1">
          <div className="w-5 h-5 rounded-full bg-gray-100 border flex items-center justify-center">
            <span className="text-[8px] text-gray-400 font-bold">{displayUrl.charAt(0).toUpperCase()}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-700">{displayUrl}</span>
          </div>
        </div>

        {/* Headline (blue link) */}
        <h3 className="text-xl text-[#1a0dab] hover:underline cursor-pointer leading-snug mb-1">
          {headlineText}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed">
          {descText}
        </p>
      </div>

      {/* Tracked URL */}
      {Object.values(utmParams).some(v => v?.trim()) && trackedUrl && (
        <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Tracked URL</p>
          <p className="text-[10px] text-gray-600 break-all font-mono">{trackedUrl}</p>
        </div>
      )}

      {/* Stats hint */}
      <div className="mt-3 text-center">
        <p className="text-[10px] text-gray-400">
          {headlines.length} headline{headlines.length !== 1 ? 's' : ''} &middot; {descriptions.length} description{descriptions.length !== 1 ? 's' : ''} &middot; Google will test {Math.min(headlines.length, 3)} headlines + {Math.min(descriptions.length, 2)} descriptions per impression
        </p>
      </div>
    </div>
  );
}
