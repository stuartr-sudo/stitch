import React from 'react';
import { FileText } from 'lucide-react';
import PostCard from './PostCard';

export default function PostFeed({ posts, config, onApprove, onEdit, onReject, onRegenerate, onPublish, onOpenPost }) {
  const items = posts ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-sm px-8 gap-2">
        <FileText className="w-10 h-10 opacity-30" />
        <p>Generate posts from a topic to see them here</p>
      </div>
    );
  }

  // Group posts by topic_id, preserving insertion order
  const groups = [];
  const seen = new Map();
  for (const post of items) {
    const key = post.topic_id ?? '__no_topic__';
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ key, headline: post.linkedin_topics?.source_title ?? null, posts: [] });
    }
    groups[seen.get(key)].posts.push(post);
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {groups.map(group => (
        <div key={group.key} className="flex flex-col gap-3">
          {group.headline && (
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
              {group.headline}
            </h3>
          )}
          {group.posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              config={config}
              onApprove={onApprove}
              onEdit={onEdit}
              onReject={onReject}
              onRegenerate={onRegenerate}
              onPublish={onPublish}
              onOpenPost={onOpenPost}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
