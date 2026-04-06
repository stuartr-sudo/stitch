import React from 'react';

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

export default function ReviewCommentThread({ comments }) {
  if (!comments || comments.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">No comments yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {comments.map((comment, i) => {
        const isClaude = comment.author === 'claude' || comment.author === 'Claude';
        return (
          <div
            key={comment.id || i}
            className={`flex flex-col max-w-[85%] ${isClaude ? 'ml-auto items-end' : 'items-start'}`}
          >
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                isClaude
                  ? 'bg-blue-900/30 border border-blue-700/30 text-blue-100'
                  : 'bg-slate-700/50 border border-slate-600/30 text-slate-200'
              }`}
            >
              <p className={`text-xs font-bold mb-1 ${isClaude ? 'text-blue-400' : 'text-slate-400'}`}>
                {comment.author}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              {comment.commit_hash && (
                <p className="text-xs font-mono text-slate-500 mt-1">{comment.commit_hash}</p>
              )}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 px-1">
              {comment.created_at ? timeAgo(comment.created_at) : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
