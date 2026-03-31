import React from 'react';
import { Globe, ThumbsUp, MessageCircle, Repeat2, Send } from 'lucide-react';

export default function LinkedInAdPreview({ variation, brandName }) {
  const copy = variation?.copy_data || {};
  const imageUrl = variation?.image_urls?.[0];
  const displayName = brandName || 'Your Company';

  // Truncate intro text with "...see more" like LinkedIn does
  const introText = copy.introText || '';
  const truncated = introText.length > 150;
  const displayIntro = truncated ? introText.slice(0, 150) + '...' : introText;

  return (
    <div className="bg-white rounded-xl border shadow-sm max-w-[480px] mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-tight">{displayName}</p>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">Promoted</p>
          </div>
          <span className="text-xs text-gray-400">...</span>
        </div>

        {/* Intro text */}
        <div className="mt-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {displayIntro}
          {truncated && (
            <button className="text-gray-500 hover:text-blue-600 ml-1 text-sm">see more</button>
          )}
        </div>
      </div>

      {/* Image */}
      {imageUrl ? (
        <div className="w-full aspect-[1.91/1] bg-gray-100">
          <img src={imageUrl} alt="Ad" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[1.91/1] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Ad image will appear here</span>
        </div>
      )}

      {/* Headline + CTA bar */}
      <div className="px-4 py-3 border-t flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {copy.headline || 'Headline goes here'}
          </p>
          {copy.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{copy.description}</p>
          )}
        </div>
        <button className="flex-shrink-0 px-4 py-1.5 rounded-full border-2 border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors">
          {copy.cta || 'Learn More'}
        </button>
      </div>

      {/* Engagement bar */}
      <div className="px-4 py-2 border-t flex items-center justify-around text-gray-500">
        <button className="flex items-center gap-1.5 text-xs hover:text-blue-600 transition-colors py-1.5 px-2 rounded">
          <ThumbsUp className="w-4 h-4" />
          Like
        </button>
        <button className="flex items-center gap-1.5 text-xs hover:text-blue-600 transition-colors py-1.5 px-2 rounded">
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
        <button className="flex items-center gap-1.5 text-xs hover:text-blue-600 transition-colors py-1.5 px-2 rounded">
          <Repeat2 className="w-4 h-4" />
          Repost
        </button>
        <button className="flex items-center gap-1.5 text-xs hover:text-blue-600 transition-colors py-1.5 px-2 rounded">
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
    </div>
  );
}
