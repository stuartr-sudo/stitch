import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { STATUS_CONFIG } from './reviewToolMap';
import ReviewCommentThread from './ReviewCommentThread';

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_LABELS = {
  bug: 'Bug',
  question: 'Question',
  feature: 'Feature',
  console_error: 'Console Error',
  change_request: 'Change Request',
  learn_screenshot: 'Learn Screenshot',
  prompt_review: 'Prompt Review',
  claude_md_update: 'CLAUDE.md Update',
};

const PRIORITY_COLORS = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-slate-400',
};

export default function ReviewRequestCard({ request, isExpanded, onToggle, onRefresh }) {
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;

  async function handleAddComment() {
    const content = newComment.trim();
    if (!content) return;
    setSubmittingComment(true);
    try {
      const res = await apiFetch(`/api/reviews/${request.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'user', content }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      setNewComment('');
      onRefresh();
    } catch (err) {
      toast.error('Failed to add comment');
    }
    setSubmittingComment(false);
  }

  async function handleStatusChange(newStatus) {
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/reviews/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      onRefresh();
    } catch (err) {
      toast.error('Failed to update status');
    }
    setUpdatingStatus(false);
  }

  const statusActions = {
    pending: [{ label: 'Close', next: 'closed' }],
    in_progress: [{ label: 'Close', next: 'closed' }],
    needs_info: [
      { label: 'Re-open', next: 'pending' },
      { label: 'Close', next: 'closed' },
    ],
    resolved: [
      { label: 'Re-open', next: 'pending' },
      { label: 'Close', next: 'closed' },
    ],
    closed: [{ label: 'Re-open', next: 'pending' }],
  };

  const actions = statusActions[request.status] || [];

  return (
    <div
      className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden"
    >
      {/* Collapsed header — always visible */}
      <button
        className="w-full text-left p-3 flex items-start gap-3 hover:bg-slate-700/30 transition-colors"
        onClick={onToggle}
      >
        {/* Status dot */}
        <span
          className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.color.includes('yellow') ? 'bg-yellow-400' : statusCfg.color.includes('blue') ? 'bg-blue-400' : statusCfg.color.includes('orange') ? 'bg-orange-400' : statusCfg.color.includes('green') ? 'bg-green-400' : 'bg-slate-400'}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {/* Type badge */}
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600/50">
              {TYPE_LABELS[request.type] || request.type}
            </span>
            {/* Priority */}
            <span className={`text-xs font-medium ${PRIORITY_COLORS[request.priority] || 'text-slate-400'}`}>
              {request.priority}
            </span>
          </div>
          <p className="text-sm text-slate-200 font-medium truncate">{request.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500">{request.tool}</span>
            {request.endpoint && (
              <span className="text-xs text-slate-600">· {request.endpoint}</span>
            )}
          </div>
        </div>

        {/* Time + chevron */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-slate-500">
            {request.created_at ? timeAgo(request.created_at) : ''}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700/50 pt-3 space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>

          {/* Description */}
          {request.description && (
            <div>
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Description</p>
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 bg-slate-900/50 rounded p-2 overflow-x-auto">
                {request.description}
              </pre>
            </div>
          )}

          {/* Screenshot */}
          {request.screenshot_url && (
            <div>
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Screenshot</p>
              <a href={request.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={request.screenshot_url}
                  alt="Screenshot"
                  className="max-h-48 rounded border border-slate-600 hover:opacity-90 transition-opacity cursor-pointer"
                />
              </a>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Comments</p>
            <ReviewCommentThread comments={request.comments || []} />
          </div>

          {/* Add comment */}
          <div className="space-y-1.5">
            <textarea
              className="w-full bg-slate-900/60 border border-slate-600 rounded p-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/60"
              rows={2}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment();
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={submittingComment || !newComment.trim()}
              className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600 disabled:opacity-50 transition-colors"
            >
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>

          {/* Status actions */}
          {actions.length > 0 && (
            <div className="flex gap-2 pt-1 border-t border-slate-700/50">
              {actions.map((action) => (
                <button
                  key={action.next}
                  onClick={() => handleStatusChange(action.next)}
                  disabled={updatingStatus}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${
                    action.label === 'Close'
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border-slate-600'
                      : 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border-blue-700/40'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
