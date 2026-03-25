import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreBadgeClass(score) {
  if (score >= 8) return 'bg-green-100 text-green-700';
  if (score >= 6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function sourceDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function TopicCard({ topic, onGenerate, onDismiss, isGenerating }) {
  const score = topic.relevance_score ?? 0;
  const isGenerated = topic.status === 'generated';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
      {/* Score + generated badge row */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBadgeClass(score)}`}>
          {score.toFixed(1)}
        </span>
        {isGenerated && (
          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Generated
          </span>
        )}
      </div>

      {/* Headline */}
      <p className="font-semibold text-sm text-slate-900 leading-snug">{topic.headline}</p>

      {/* Source + time */}
      <p className="text-xs text-slate-400">
        {sourceDomain(topic.url)}
        {topic.published_at && (
          <> &middot; {timeAgo(topic.published_at)}</>
        )}
      </p>

      {/* Suggested angle */}
      {topic.suggested_angle && (
        <p className="text-sm text-slate-500 italic">{topic.suggested_angle}</p>
      )}

      {/* Actions */}
      {!isGenerated && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onGenerate(topic.id)}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Post'
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(topic.id)}
            disabled={isGenerating}
            className="text-slate-500 hover:text-slate-700"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
