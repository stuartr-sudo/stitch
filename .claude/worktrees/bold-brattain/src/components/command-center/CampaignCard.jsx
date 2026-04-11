import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Film, FileText, LayoutGrid, Megaphone, BookOpen, Sparkles, ExternalLink, Check, X, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const TYPE_ICONS = { short: Film, linkedin_post: FileText, carousel: LayoutGrid, ad_set: Megaphone, storyboard: BookOpen, custom: Sparkles };
const TYPE_LABELS = { short: 'Short', linkedin_post: 'LinkedIn', carousel: 'Carousel', ad_set: 'Ads', storyboard: 'Storyboard', custom: 'Custom' };

const STATUS_COLORS = {
  planning: 'bg-slate-100 text-slate-600',
  building: 'bg-indigo-50 text-indigo-700',
  review: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  published: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-50 text-red-700'
};

const ITEM_STATUS_COLORS = {
  queued: 'text-slate-400',
  building: 'text-indigo-500',
  ready: 'text-green-600',
  approved: 'text-emerald-600',
  rejected: 'text-red-500',
  published: 'text-slate-400',
  failed: 'text-red-600'
};

const BORDER_COLORS = {
  planning: 'border-l-slate-300',
  building: 'border-l-indigo-400',
  review: 'border-l-amber-400',
  approved: 'border-l-green-400',
  published: 'border-l-slate-300',
  cancelled: 'border-l-red-400'
};

// Extract the best thumbnail URL from an item's result
function getItemThumbnail(item) {
  const r = item.result_json;
  if (!r) return null;
  // Direct preview_url on the item
  if (item.preview_url) return item.preview_url;
  // Common result shapes
  if (r.image_url) return r.image_url;
  if (r.thumbnail_url) return r.thumbnail_url;
  if (r.preview_url) return r.preview_url;
  // Carousel — first slide image
  if (r.slides?.[0]?.image_url) return r.slides[0].image_url;
  if (r.slides?.[0]?.composed_url) return r.slides[0].composed_url;
  // Short video — first frame
  if (r.first_frame_url) return r.first_frame_url;
  if (r.keyframes?.[0]?.image_url) return r.keyframes[0].image_url;
  // Ad set — first variation image
  if (r.variations?.[0]?.image_url) return r.variations[0].image_url;
  if (Array.isArray(r.image_urls) && r.image_urls[0]) return r.image_urls[0];
  // Storyboard — first frame
  if (r.frames?.[0]?.preview_url) return r.frames[0].preview_url;
  return null;
}

// Extract preview text from item result
function getItemPreview(item) {
  const r = item.result_json;
  const plan = item.plan_item_json;
  if (r?.preview_text) return r.preview_text;
  if (r?.script_text) return r.script_text;
  if (r?.copy_data?.introText) return r.copy_data.introText;
  if (r?.copy_data?.primaryText) return r.copy_data.primaryText;
  if (r?.copy_data?.headlines?.[0]) return r.copy_data.headlines[0];
  if (plan?.topic) return plan.topic;
  return null;
}

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

  const handleDeleteItem = async (itemId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this item?')) return;
    await apiFetch(`/api/command-center/items/${itemId}`, { method: 'DELETE' });
    onUpdate?.();
  };

  const handleDeleteCampaign = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${campaign.name}" and all its items?`)) return;
    await apiFetch(`/api/command-center/campaigns/${campaign.id}`, { method: 'DELETE' });
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
    <div className={`bg-white rounded-xl border-l-3 ${BORDER_COLORS[campaign.status] || 'border-l-slate-300'} border border-gray-200 overflow-hidden shadow-sm`}>
      {/* Header */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-slate-900 font-semibold text-sm truncate">{campaign.name}</h3>
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
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleDeleteCampaign}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            title="Delete campaign"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Progress bar for building campaigns */}
      {campaign.status === 'building' && (
        <div className="px-4 pb-2">
          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500"
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
            const thumb = getItemThumbnail(item);
            return (
              <div key={item.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                {thumb ? (
                  <img src={thumb} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="text-slate-700 text-[11px]">{TYPE_LABELS[item.type] || item.type}</span>
                {item.platform && <span className="text-slate-400 text-[10px]">({item.platform})</span>}
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
        <div className="border-t border-gray-100 p-4 space-y-3">
          {items.map(item => {
            const Icon = TYPE_ICONS[item.type] || Sparkles;
            const editUrl = getEditUrl(item);
            const preview = getItemPreview(item);
            const thumb = getItemThumbnail(item);

            return (
              <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  {thumb ? (
                    <img src={thumb} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-slate-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-teal-600" />
                        <span className="text-slate-900 text-sm font-medium">{TYPE_LABELS[item.type]}</span>
                        {item.platform && (
                          <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            {item.platform}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium ${ITEM_STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Preview text */}
                    {preview && (
                      <p className="text-slate-500 text-xs mb-2 line-clamp-2">
                        {preview.length > 120 ? preview.slice(0, 120) + '...' : preview}
                      </p>
                    )}

                    {/* Error message */}
                    {item.error && (
                      <p className="text-red-600 text-xs mb-2 bg-red-50 rounded px-2 py-1">{item.error}</p>
                    )}

                    {/* Scheduled time */}
                    {item.scheduled_at && (
                      <p className="text-slate-400 text-[11px] mb-2">
                        Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1.5 mt-1">
                      {item.status === 'ready' && (
                        <>
                          <button onClick={() => handleApproveItem(item.id)} className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-[11px] px-2.5 py-1 rounded-md transition-colors">
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => handleRejectItem(item.id)} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-red-500 text-[11px] px-2.5 py-1 rounded-md transition-colors">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {(item.status === 'failed' || item.status === 'rejected') && (
                        <button onClick={() => handleRebuildItem(item.id)} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-slate-600 text-[11px] px-2.5 py-1 rounded-md transition-colors">
                          <RefreshCw className="w-3 h-3" /> Rebuild
                        </button>
                      )}
                      {editUrl && (
                        <button onClick={() => navigate(editUrl)} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-slate-600 text-[11px] px-2.5 py-1 rounded-md transition-colors">
                          <ExternalLink className="w-3 h-3" /> Edit
                        </button>
                      )}
                      <button onClick={(e) => handleDeleteItem(item.id, e)} className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 text-[11px] px-2.5 py-1 rounded-md transition-colors ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
