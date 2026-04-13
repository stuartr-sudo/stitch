import React from 'react';
import { Loader2 } from 'lucide-react';

const STYLE_BADGES = {
  paradox:           { label: 'Paradox',        cls: 'bg-purple-100 text-purple-700' },
  evidence_stack:    { label: 'Evidence Stack',  cls: 'bg-emerald-100 text-emerald-700' },
  story_pivot:       { label: 'Story Pivot',     cls: 'bg-blue-100 text-blue-700' },
  myth_killer:       { label: 'Myth Killer',     cls: 'bg-red-100 text-red-700' },
  framework:         { label: 'Framework',       cls: 'bg-amber-100 text-amber-700' },
  quiet_confession:  { label: 'Confession',      cls: 'bg-pink-100 text-pink-700' },
};

const STATUS_COLORS = {
  draft:     'bg-slate-100 text-slate-600',
  generated: 'bg-sky-100 text-sky-700',
  published: 'bg-green-100 text-green-700',
};

export default function SocialPostCard({ post, isSelected, onClick }) {
  const styleBadge = STYLE_BADGES[post.post_style];
  const statusCls  = STATUS_COLORS[post.status] ?? STATUS_COLORS.draft;
  const snippet    = (post.content ?? '').slice(0, 60) + ((post.content?.length ?? 0) > 60 ? '...' : '');

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
        isSelected
          ? 'bg-[#2C666E]/10 ring-1 ring-[#2C666E]/30'
          : 'hover:bg-slate-50'
      }`}
    >
      {/* Thumbnail or spinner */}
      <div className="w-12 h-[60px] rounded-md overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {/* Text + badges */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{snippet}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {styleBadge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${styleBadge.cls}`}>
              {styleBadge.label}
            </span>
          )}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${statusCls}`}>
            {post.status ?? 'draft'}
          </span>
        </div>
      </div>
    </button>
  );
}
