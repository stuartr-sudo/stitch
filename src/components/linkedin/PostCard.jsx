import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STYLE_BADGE = {
  // New production engine structures
  paradox:           'bg-purple-100 text-purple-700',
  evidence_stack:    'bg-green-100 text-green-700',
  story_pivot:       'bg-amber-100 text-amber-700',
  myth_killer:       'bg-red-100 text-red-700',
  framework:         'bg-blue-100 text-blue-700',
  quiet_confession:  'bg-slate-100 text-slate-700',
  // Legacy styles (backward compat)
  contrarian: 'bg-blue-100 text-blue-700',
  story:      'bg-amber-100 text-amber-700',
  data:       'bg-green-100 text-green-700',
  format_v1:  'bg-indigo-100 text-indigo-700',
  format_v2:  'bg-indigo-100 text-indigo-700',
  format_v3:  'bg-indigo-100 text-indigo-700',
};

function styleBadgeClass(style) {
  return STYLE_BADGE[style?.toLowerCase()] ?? 'bg-slate-100 text-slate-600';
}

export default function PostCard({ post, config, onApprove, onEdit, onReject, onRegenerate, onPublish, onOpenPost }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content ?? '');
  const [publishing, setPublishing] = useState(false);

  const isPublished = post.status === 'published';
  const isFailed    = post.status === 'failed';

  async function handlePublish() {
    setPublishing(true);
    try {
      await onPublish(post.id);
    } finally {
      setPublishing(false);
    }
  }

  function handleSave() {
    onEdit(post.id, draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(post.content ?? '');
    setEditing(false);
  }

  const contentText = post.content ?? '';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styleBadgeClass(post.post_style)}`}>
          {post.post_style ?? 'Post'}
        </span>
        {isPublished && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Published
            {post.linkedin_post_id && (
              <a
                href={`https://www.linkedin.com/feed/update/${post.linkedin_post_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                View
              </a>
            )}
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        )}
      </div>

      {/* Body */}
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={8}
            maxLength={3000}
            className="w-full rounded-md border border-slate-300 p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 text-right">{draft.length} / 3000</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className={`text-sm text-slate-800 whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>
            {contentText}
          </p>
          {contentText.length > 200 && (
            <button
              className="text-xs text-blue-600 hover:underline mt-1"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? 'see less' : '…see more'}
            </button>
          )}
        </div>
      )}

      {/* Featured image (square) */}
      {post.featured_image_square ? (
        <img
          src={post.featured_image_square}
          alt="Post image"
          className="rounded-md w-full aspect-square object-cover"
        />
      ) : post.status === 'generated' && !editing ? (
        <div className="rounded-md bg-slate-100 text-slate-400 text-xs text-center py-6">
          Image generating…
        </div>
      ) : null}

      {/* Error message for failed */}
      {isFailed && post.error_message && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{post.error_message}</p>
      )}

      {/* Action buttons */}
      {!editing && !isPublished && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {isFailed ? (
            <Button size="sm" onClick={() => onRegenerate(post.id)} variant="outline">
              Retry
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Publishing…</>
                ) : (
                  'Approve & Publish'
                )}
              </Button>
              {onOpenPost && (
                <Button size="sm" variant="ghost" onClick={() => onOpenPost(post.id)}>
                  Open
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRegenerate(post.id)}>
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => onReject(post.id)}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
