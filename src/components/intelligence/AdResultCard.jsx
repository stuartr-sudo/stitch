import React from 'react';
import { ExternalLink, Bookmark, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLATFORM_COLORS = {
  Meta: 'bg-blue-600 text-white',
  Google: 'bg-green-600 text-white',
  LinkedIn: 'bg-blue-800 text-white',
  TikTok: 'bg-gray-800 text-white',
  Web: 'bg-gray-500 text-white',
  'Knowledge Base': 'bg-purple-600 text-white',
};

const SOURCE_LABELS = {
  meta_ad_library: { label: 'Meta Ad Library', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  exa: { label: 'Exa', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  serp: { label: 'Web Search', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  knowledge_base: { label: 'Your Intel', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function AdResultCard({ ad, onAnalyze, onSave, analyzing, saving, saved }) {
  const platformColor = PLATFORM_COLORS[ad.platform] || PLATFORM_COLORS.Web;
  const sourceInfo = SOURCE_LABELS[ad.data_source] || null;

  return (
    <div className={`bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${ad.data_source === 'meta_ad_library' ? 'border-blue-200' : ad.is_existing_intel ? 'border-purple-200' : 'border-gray-200'}`}>
      {/* Image or placeholder */}
      {ad.image_url ? (
        <div className="h-32 overflow-hidden bg-gray-100">
          <img src={ad.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="bg-gray-50 h-28 flex items-center justify-center text-gray-400 text-sm p-4">
          <div className="text-center">
            {ad.is_existing_intel ? (
              <Database className="w-6 h-6 mx-auto mb-1 text-purple-300" />
            ) : (
              <div className="text-2xl mb-1">{ad.ad_format === 'video' ? '🎬' : ad.ad_format === 'carousel' ? '🎠' : '🖼'}</div>
            )}
            <span className="text-xs">{ad.advertiser || 'Ad Creative'}</span>
          </div>
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Title + badges */}
        <div className="flex justify-between items-start gap-1">
          <span className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{ad.title || ad.advertiser || 'Untitled'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${platformColor}`}>{ad.platform}</span>
        </div>

        {/* Data source badge */}
        {sourceInfo && (
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${sourceInfo.color}`}>
            {sourceInfo.label}
          </span>
        )}

        {/* Meta-specific details */}
        {ad.library_id && (
          <div className="text-[10px] text-gray-400">
            ID: {ad.library_id} {ad.started_running && `· ${ad.started_running}`}
          </div>
        )}

        {/* Ad copy or description */}
        <p className="text-xs text-gray-600 line-clamp-3">{ad.ad_copy || ad.description || ''}</p>

        {/* Links */}
        <div className="flex gap-2 text-[10px]">
          {ad.source_url && (
            <a href={ad.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-0.5">
              <ExternalLink className="w-2.5 h-2.5" /> Source
            </a>
          )}
          {ad.landing_page_url && (
            <a href={ad.landing_page_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline flex items-center gap-0.5">
              <ExternalLink className="w-2.5 h-2.5" /> Landing page
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onAnalyze(ad)} disabled={analyzing} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-7">
            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Analyze'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSave(ad)} disabled={saving || saved} className="flex-1 text-xs h-7">
            {saved ? '✓ Saved' : saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Bookmark className="w-3 h-3 mr-1" /> Save</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
