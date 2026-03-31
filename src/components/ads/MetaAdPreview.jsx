import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2 } from 'lucide-react';

export default function MetaAdPreview({ variation, brandName, brandLogoUrl }) {
  const [mode, setMode] = useState('feed'); // 'feed' or 'stories'
  const copy = variation?.copy_data || {};
  const imageUrl = variation?.image_urls?.[0];
  const displayName = brandName || 'Your Business';

  if (mode === 'stories') {
    return (
      <div className="max-w-[320px] mx-auto">
        {/* Mode toggle */}
        <div className="flex gap-1 mb-3 justify-center">
          <button
            onClick={() => setMode('feed')}
            className="px-3 py-1 text-xs rounded-full border text-gray-500 hover:bg-gray-50"
          >
            Feed
          </button>
          <button
            onClick={() => setMode('stories')}
            className="px-3 py-1 text-xs rounded-full border bg-[#2C666E] text-white"
          >
            Stories
          </button>
        </div>

        {/* Phone frame */}
        <div className="bg-black rounded-[2rem] p-2 shadow-xl">
          <div className="bg-black rounded-[1.5rem] overflow-hidden relative" style={{ aspectRatio: '9/16' }}>
            {/* Image fill */}
            {imageUrl ? (
              <img src={imageUrl} alt="Story ad" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Story image</span>
              </div>
            )}

            {/* Top bar overlay */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-2">
                {brandLogoUrl ? (
                  <img src={brandLogoUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="text-[8px] font-bold text-gray-700">{displayName.charAt(0)}</span>
                    </div>
                  </div>
                )}
                <span className="text-white text-xs font-medium">{displayName}</span>
                <span className="text-white/60 text-[10px]">Sponsored</span>
              </div>
            </div>

            {/* Bottom CTA overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              {copy.primaryText && (
                <p className="text-white text-sm mb-3 line-clamp-2">{copy.primaryText}</p>
              )}
              <div className="flex items-center justify-center">
                <div className="bg-white rounded-full px-6 py-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{copy.cta || 'Learn More'}</span>
                  <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Feed mode
  return (
    <div className="max-w-[480px] mx-auto">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-3 justify-center">
        <button
          onClick={() => setMode('feed')}
          className="px-3 py-1 text-xs rounded-full border bg-[#2C666E] text-white"
        >
          Feed
        </button>
        <button
          onClick={() => setMode('stories')}
          className="px-3 py-1 text-xs rounded-full border text-gray-500 hover:bg-gray-50"
        >
          Stories
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900">{displayName}</span>
              </div>
              <span className="text-xs text-gray-500">Sponsored &middot; <span className="inline-flex items-center"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg></span></span>
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </div>

        {/* Primary text */}
        <div className="px-4 pb-2">
          <p className="text-sm text-gray-800 leading-relaxed">
            {copy.primaryText || 'Your primary text will appear here...'}
          </p>
        </div>

        {/* Image */}
        {imageUrl ? (
          <img src={imageUrl} alt="Ad" className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">Ad image (1:1)</span>
          </div>
        )}

        {/* Headline + CTA bar */}
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {copy.description && (
              <p className="text-xs text-gray-500 truncate">{copy.description}</p>
            )}
            <p className="font-semibold text-sm text-gray-900 truncate">
              {copy.headline || 'Headline goes here'}
            </p>
          </div>
          <button className="flex-shrink-0 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
            {copy.cta || 'Learn More'}
          </button>
        </div>

        {/* Engagement bar */}
        <div className="px-4 py-2 border-t flex items-center justify-between text-gray-500">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-xs hover:text-blue-600 transition-colors">
              <ThumbsUp className="w-4 h-4" /> Like
            </button>
            <button className="flex items-center gap-1 text-xs hover:text-blue-600 transition-colors">
              <MessageCircle className="w-4 h-4" /> Comment
            </button>
            <button className="flex items-center gap-1 text-xs hover:text-blue-600 transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
