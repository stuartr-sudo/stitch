/**
 * StoryboardReviewPage — public client review page (no auth required).
 *
 * Accessed via share link: /review/:token
 *
 * Features:
 *  - Frame-by-frame preview with images and narrative
 *  - Per-scene comment input
 *  - General comment input
 *  - Approve / Request Changes actions
 *  - Comment history display
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, MessageSquare, Check, AlertTriangle, Send, Clock,
  Film, Eye, Camera, ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function reviewFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  return res.json();
}

const BEAT_COLORS = {
  hook: '#EF4444', cold_open: '#EF4444',
  setup: '#F97316', context: '#F97316',
  rising_action: '#EAB308', escalation: '#EAB308',
  climax: '#EF4444', turning_point: '#EF4444',
  resolution: '#3B82F6', aftermath: '#3B82F6',
  cta: '#8B5CF6',
};

function getBeatColor(beat) {
  return BEAT_COLORS[beat] || '#6B7280';
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const secs = Math.floor((now - d) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function CommentInput({ onSubmit, placeholder, buttonLabel }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    await onSubmit(text.trim(), name.trim() || 'Anonymous');
    setText('');
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30"
        />
        <input
          type="text"
          placeholder={placeholder || 'Add a comment...'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
          className="px-4 py-2 text-sm font-medium bg-[#2C666E] text-white rounded-lg hover:bg-[#1e4d54] disabled:opacity-40"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : (buttonLabel || 'Send')}
        </button>
      </div>
    </div>
  );
}

function CommentBubble({ comment }) {
  const typeStyles = {
    approval: 'bg-emerald-50 border-emerald-200',
    change_request: 'bg-amber-50 border-amber-200',
    note: 'bg-gray-50 border-gray-200',
  };
  const typeIcons = {
    approval: <CheckCircle2 size={12} className="text-emerald-500" />,
    change_request: <AlertTriangle size={12} className="text-amber-500" />,
    note: <MessageSquare size={12} className="text-gray-400" />,
  };

  return (
    <div className={`px-3 py-2 rounded-lg border text-sm ${typeStyles[comment.comment_type] || typeStyles.note}`}>
      <div className="flex items-center gap-2 mb-1">
        {typeIcons[comment.comment_type] || typeIcons.note}
        <span className="font-medium text-gray-700">{comment.reviewer_name}</span>
        <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-gray-600">{comment.comment}</p>
    </div>
  );
}

export default function StoryboardReviewPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [storyboard, setStoryboard] = useState(null);
  const [frames, setFrames] = useState([]);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState(null);
  const [expandedFrame, setExpandedFrame] = useState(null);
  const [approvalSent, setApprovalSent] = useState(false);

  // Load storyboard + comments
  useEffect(() => {
    async function load() {
      try {
        const [sbData, commentsData] = await Promise.all([
          reviewFetch(`/api/storyboard/review/${token}`),
          reviewFetch(`/api/storyboard/review/${token}/comments`),
        ]);

        if (!sbData.success) throw new Error(sbData.error || 'Failed to load storyboard');
        setStoryboard(sbData.storyboard);
        setFrames(sbData.frames || []);
        setComments(commentsData.comments || []);
        if (sbData.storyboard.reviewStatus === 'approved') setApprovalSent(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const addComment = async (frameNumber, text, name, type = 'note') => {
    const data = await reviewFetch(`/api/storyboard/review/${token}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        frameNumber,
        reviewerName: name,
        comment: text,
        commentType: type,
      }),
    });
    if (data.success && data.comment) {
      setComments(prev => [...prev, data.comment]);
    }
    return data;
  };

  const handleApprove = async (name) => {
    await addComment(null, 'Approved - ready for production', name, 'approval');
    setApprovalSent(true);
  };

  const handleRequestChanges = async (text, name) => {
    await addComment(null, text, name, 'change_request');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const generalComments = comments.filter(c => !c.frame_number);
  const getFrameComments = (num) => comments.filter(c => c.frame_number === num);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Film size={12} /> Storyboard Review
              </div>
              <h1 className="text-xl font-bold text-gray-900">{storyboard.name}</h1>
              {storyboard.logline && (
                <p className="text-sm text-gray-500 mt-0.5">{storyboard.logline}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {storyboard.desiredLength && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> {storyboard.desiredLength}s
                </span>
              )}
              {storyboard.aspectRatio && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">{storyboard.aspectRatio}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Approval bar */}
        {!approvalSent ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Your Feedback</h3>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => {
                  const name = prompt('Your name:') || 'Anonymous';
                  handleApprove(name);
                }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                <Check size={14} /> Approve for Production
              </button>
              <button
                onClick={() => setExpandedFrame('changes')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                <AlertTriangle size={14} /> Request Changes
              </button>
            </div>
            {expandedFrame === 'changes' && (
              <CommentInput
                placeholder="Describe what needs to change..."
                buttonLabel="Submit"
                onSubmit={(text, name) => {
                  handleRequestChanges(text, name);
                  setExpandedFrame(null);
                }}
              />
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <span className="text-sm font-medium text-emerald-700">Approved for production</span>
          </div>
        )}

        {/* Frames */}
        {frames.map((frame) => {
          const color = getBeatColor(frame.beat_type);
          const frameComments = getFrameComments(frame.frame_number);
          const isExpanded = expandedFrame === frame.frame_number;

          return (
            <div key={frame.frame_number} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex">
                {/* Preview image */}
                <div className="w-72 flex-shrink-0 bg-gray-100">
                  {frame.preview_image_url ? (
                    <img src={frame.preview_image_url} alt={`Frame ${frame.frame_number}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center text-gray-300">
                      <Eye size={24} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                      {frame.frame_number}
                    </div>
                    {frame.beat_type && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${color}15`, color }}>
                        {frame.beat_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{frame.timestamp_seconds}s &mdash; {frame.duration_seconds}s</span>
                  </div>

                  {frame.narrative_note && (
                    <p className="text-sm text-gray-700 mb-2">{frame.narrative_note}</p>
                  )}
                  {frame.dialogue && (
                    <p className="text-sm italic text-gray-500 mb-2">&ldquo;{frame.dialogue}&rdquo;</p>
                  )}
                  {frame.setting && (
                    <p className="text-xs text-gray-400"><span className="font-medium">Setting:</span> {frame.setting}</p>
                  )}
                  {frame.camera_angle && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Camera size={10} /> {frame.camera_angle}</p>
                  )}

                  {/* Frame comments */}
                  {frameComments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {frameComments.map(c => <CommentBubble key={c.id} comment={c} />)}
                    </div>
                  )}

                  {/* Comment toggle */}
                  <button
                    onClick={() => setExpandedFrame(isExpanded ? null : frame.frame_number)}
                    className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <MessageSquare size={10} />
                    {isExpanded ? 'Hide' : `Comment on scene ${frame.frame_number}`}
                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2">
                      <CommentInput
                        placeholder={`Comment on scene ${frame.frame_number}...`}
                        onSubmit={(text, name) => {
                          addComment(frame.frame_number, text, name);
                          setExpandedFrame(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* General comments section */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> General Comments
          </h3>

          {generalComments.length > 0 && (
            <div className="space-y-2 mb-4">
              {generalComments.map(c => <CommentBubble key={c.id} comment={c} />)}
            </div>
          )}

          <CommentInput
            placeholder="Add a general comment..."
            onSubmit={(text, name) => addComment(null, text, name)}
          />
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-300">Powered by Stitch Studios</p>
        </div>
      </div>
    </div>
  );
}
