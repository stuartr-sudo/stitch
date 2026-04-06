import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Film, FileText, LayoutGrid, Megaphone, BookOpen, Sparkles, ExternalLink, Check, X, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const TYPE_ICONS = { short: Film, linkedin_post: FileText, carousel: LayoutGrid, ad_set: Megaphone, storyboard: BookOpen, custom: Sparkles };
const TYPE_LABELS = { short: 'Short', linkedin_post: 'LinkedIn', carousel: 'Carousel', ad_set: 'Ads', storyboard: 'Storyboard', custom: 'Custom' };

const STATUS_COLORS = {
  planning: 'bg-slate-700 text-slate-300',
  building: 'bg-indigo-900/60 text-indigo-300',
  review: 'bg-amber-900/60 text-amber-300',
  approved: 'bg-green-900/60 text-green-300',
  published: 'bg-slate-700 text-slate-400',
  cancelled: 'bg-red-900/60 text-red-300'
};

const ITEM_STATUS_COLORS = {
  queued: 'text-slate-500',
  building: 'text-indigo-400',
  ready: 'text-green-400',
  approved: 'text-emerald-400',
  rejected: 'text-red-400',
  published: 'text-slate-400',
  failed: 'text-red-500'
};

const BORDER_COLORS = {
  planning: 'border-l-slate-500',
  building: 'border-l-indigo-500',
  review: 'border-l-amber-500',
  approved: 'border-l-green-500',
  published: 'border-l-slate-600',
  cancelled: 'border-l-red-500'
};

export default function CampaignCard({ campaign, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const items = campaign.items || [];

  const handleApproveItem = async (itemId) => {
    await apiFetch(`/api/command-center/items/${itemId}/approve`, { method: 'POST' });
    onUpdate?.();
  };

  const handleRejectItem = async (itemId) => {
    await apiFetch(`/api/command-center/items/${itemId}/reject`, { method: 'POST' });
    onUpdate?.();
  };

  const handleRebuildItem = async (itemId) => {
    await apiFetch(`/api/command-center/items/${itemId}/rebuild`, { method: 'POST' });
    onUpdate?.();
  };

  const getEditUrl = (item) => {
    const result = item.result_json;
    if (!result) return null;
    return result.edit_url || null;
  };

  const buildingCount = items.filter(i => i.status === 'building' || i.status === 'queued').length;
  const readyCount = items.filter(i => i.status === 'ready').length;
  const progress = items.length > 0 ? Math.round(((items.length - buildingCount) / items.length) * 100) : 0;

  return (
    <div className={`bg-slate-800/50 rounded-xl border-l-3 ${BORDER_COLORS[campaign.status] || 'border-l-slate-600'} border border-slate-700/30 overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{campaign.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_COLORS[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-slate-500 text-xs">
            {items.length} items
            {campaign.status === 'building' && ` · ${readyCount}/${items.length} ready`}
            {' · '}
            {new Date(campaign.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      {/* Progress bar for building campaigns */}
      {campaign.status === 'building' && (
        <div className="px-4 pb-2">
          <div className="bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Item tiles (collapsed) */}
      {!expanded && items.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {items.map(item => {
            const Icon = TYPE_ICONS[item.type] || Sparkles;
            return (
              <div key={item.id} className="flex items-center gap-1.5 bg-slate-900/50 rounded-lg px-2.5 py-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300 text-[11px]">{TYPE_LABELS[item.type] || item.type}</span>
                {item.platform && <span className="text-slate-600 text-[10px]">({item.platform})</span>}
                <span className={`text-[10px] ${ITEM_STATUS_COLORS[item.status]}`}>
                  {item.status === 'ready' ? '✓' : item.status === 'building' ? '⏳' : item.status === 'failed' ? '✗' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded item details */}
      {expanded && items.length > 0 && (
        <div className="border-t border-slate-700/30 p-4 space-y-3">
          {items.map(item => {
            const Icon = TYPE_ICONS[item.type] || Sparkles;
            const editUrl = getEditUrl(item);
            const preview = item.result_json?.preview_text || item.result_json?.script_text || item.plan_item_json?.topic || '';

            return (
              <div key={item.id} className="bg-slate-900/40 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-200 text-sm font-medium">{TYPE_LABELS[item.type]}</span>
                    {item.platform && <span className="text-slate-500 text-xs">· {item.platform}</span>}
                  </div>
                  <span className={`text-[11px] font-medium ${ITEM_STATUS_COLORS[item.status]}`}>
                    {item.status}
                  </span>
                </div>

                {/* Preview text */}
                {preview && (
                  <p className="text-slate-400 text-xs mb-2 line-clamp-2 border-l-2 border-slate-700 pl-2">
                    {preview}
                  </p>
                )}

                {/* Error message */}
                {item.error && (
                  <p className="text-red-400 text-xs mb-2 bg-red-950/20 rounded px-2 py-1">{item.error}</p>
                )}

                {/* Scheduled time */}
                {item.scheduled_at && (
                  <p className="text-slate-500 text-[11px] mb-2">
                    Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1.5 mt-2">
                  {item.status === 'ready' && (
                    <>
                      <button onClick={() => handleApproveItem(item.id)} className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-[11px] px-2.5 py-1 rounded-md transition-colors">
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => handleRejectItem(item.id)} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-red-400 text-[11px] px-2.5 py-1 rounded-md transition-colors">
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  {(item.status === 'failed' || item.status === 'rejected') && (
                    <button onClick={() => handleRebuildItem(item.id)} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] px-2.5 py-1 rounded-md transition-colors">
                      <RefreshCw className="w-3 h-3" /> Rebuild
                    </button>
                  )}
                  {editUrl && (
                    <button onClick={() => navigate(editUrl)} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] px-2.5 py-1 rounded-md transition-colors">
                      <ExternalLink className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
