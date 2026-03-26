import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLOR_TEMPLATES = [
  { name: 'arctic-steel', stops: ['#0a1628', '#1e3a5f', '#94a3b8'] },
  { name: 'sunset-coral', stops: ['#1a0a1e', '#7c2d5f', '#f97316'] },
  { name: 'electric-violet', stops: ['#0a0020', '#4a00b4', '#bf5af2'] },
  { name: 'royal-gold', stops: ['#1a0a2e', '#44337a', '#d69e2e'] },
  { name: 'midnight-rose', stops: ['#0f0c29', '#302b63', '#e44d7b'] },
  { name: 'purple-burst', stops: ['#1a0a3e', '#3b1c8c', '#0ea5e9'] },
];

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
  const [selectedTemplate, setSelectedTemplate] = useState(0);
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

      {/* Color theme picker */}
      {!isGenerated && (
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-xs text-slate-400 mr-1">Theme:</span>
          {COLOR_TEMPLATES.map((tpl, i) => (
            <button
              key={tpl.name}
              onClick={() => setSelectedTemplate(i)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                selectedTemplate === i ? 'border-slate-900 scale-110' : 'border-transparent hover:border-slate-300'
              }`}
              style={{
                background: `linear-gradient(135deg, ${tpl.stops[0]}, ${tpl.stops[1]}, ${tpl.stops[2]})`,
              }}
              title={tpl.name}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {!isGenerated && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onGenerate(topic.id, selectedTemplate)}
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
