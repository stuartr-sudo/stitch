import React from 'react';
import { ExternalLink, Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLATFORM_COLORS = {
  Meta: 'bg-blue-600 text-white',
  Google: 'bg-green-600 text-white',
  LinkedIn: 'bg-blue-800 text-white',
  TikTok: 'bg-gray-800 text-white',
  Web: 'bg-gray-500 text-white',
};

export default function AdResultCard({ ad, onAnalyze, onSave, analyzing, saving, saved }) {
  const platformColor = PLATFORM_COLORS[ad.platform] || PLATFORM_COLORS.Web;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="bg-gray-50 h-28 flex items-center justify-center text-gray-400 text-sm p-4">
        <div className="text-center">
          <div className="text-2xl mb-1">{ad.ad_format === 'video' ? '🎬' : ad.ad_format === 'carousel' ? '🎠' : '🖼'}</div>
          <span className="text-xs">{ad.advertiser || 'Ad Creative'}</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900 truncate flex-1">{ad.title || ad.advertiser || 'Untitled'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ml-2 ${platformColor}`}>{ad.platform}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2">{ad.description || ad.ad_copy || ''}</p>
        {ad.source_url && (
          <a href={ad.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> View original
          </a>
        )}
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
