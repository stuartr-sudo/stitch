import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Plus, Trash2, RefreshCw, Send, ChevronDown, ChevronRight,
  Instagram, Facebook, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import SocialCreateModal from '@/components/social/SocialCreateModal';
import SocialPostCard from '@/components/social/SocialPostCard';

const STRUCTURE_BADGES = {
  paradox:          { label: 'Paradox',        cls: 'bg-purple-100 text-purple-700' },
  evidence_stack:   { label: 'Evidence Stack', cls: 'bg-emerald-100 text-emerald-700' },
  story_pivot:      { label: 'Story Pivot',    cls: 'bg-blue-100 text-blue-700' },
  myth_killer:      { label: 'Myth Killer',    cls: 'bg-red-100 text-red-700' },
  framework:        { label: 'Framework',      cls: 'bg-amber-100 text-amber-700' },
  quiet_confession: { label: 'Confession',     cls: 'bg-pink-100 text-pink-700' },
};

const DRIVER_BADGES = {
  fear:      { label: 'Fear',      cls: 'bg-rose-100 text-rose-700' },
  identity:  { label: 'Identity',  cls: 'bg-indigo-100 text-indigo-700' },
  curiosity: { label: 'Curiosity', cls: 'bg-cyan-100 text-cyan-700' },
  injustice: { label: 'Injustice', cls: 'bg-orange-100 text-orange-700' },
  wonder:    { label: 'Wonder',    cls: 'bg-violet-100 text-violet-700' },
};

const PLATFORM_COLORS = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  facebook:  'bg-blue-600 text-white',
};

const PLATFORM_ICONS = {
  instagram: Instagram,
  facebook:  Facebook,
};

const FILTER_TABS = ['all', 'instagram', 'facebook'];

export default function SocialPostPage() {
  const [topics, setTopics]               = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedPostId, setSelectedPostId]   = useState(null);
  const [expandedTopics, setExpandedTopics]   = useState(new Set());
  const [platformFilter, setPlatformFilter]   = useState('all');

  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(null); // topic id being generated
  const [publishing, setPublishing]   = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [editContent, setEditContent] = useState('');
  const pollRef = useRef(null);

  const loadTopics = useCallback(async () => {
    try {
      const url = platformFilter === 'all'
        ? '/api/social/topics'
        : `/api/social/topics?platform=${platformFilter}`;
      const res  = await apiFetch(url);
      const data = await res.json();
      if (!data.error) setTopics(data.topics ?? []);
    } catch (err) {
      console.error('[Social] load error', err);
      toast.error('Failed to load topics');
    }
  }, [platformFilter]);

  useEffect(() => {
    setLoading(true);
    loadTopics().finally(() => setLoading(false));
  }, [loadTopics]);

  const selectedTopic = topics.find(t => t.id === selectedTopicId);
  const selectedPost  = selectedTopic?.posts?.find(p => p.id === selectedPostId);

  function toggleExpand(topicId) {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  }

  // When selecting a post, also sync the edit content
  function selectPost(topicId, postId) {
    setSelectedTopicId(topicId);
    setSelectedPostId(postId);
    const topic = topics.find(t => t.id === topicId);
    const post  = topic?.posts?.find(p => p.id === postId);
    setEditContent(post?.content ?? '');
  }

  function startPolling(topicId) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await apiFetch(`/api/social/topics/${topicId}`);
        const data = await res.json();
        if (data.error) return;
        const topic = data.topic;
        if (!topic) return;

        // Update this topic in state
        setTopics(prev => prev.map(t => t.id === topicId ? topic : t));

        // Check if all posts have images
        const allDone = topic.posts?.length > 0 &&
          topic.posts.every(p => p.featured_image_url);
        if (allDone) {
          stopPolling();
          setGenerating(null);
        }
      } catch { /* ignore poll errors */ }
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  const onTopicCreated = useCallback((topic) => {
    setTopics(prev => [topic, ...prev]);
    setSelectedTopicId(topic.id);
    setExpandedTopics(prev => new Set(prev).add(topic.id));
    setGenerating(topic.id);
    startPolling(topic.id);
  }, []);

  const handleGenerate = useCallback(async (topicId) => {
    setGenerating(topicId);
    try {
      const res  = await apiFetch(`/api/social/topics/${topicId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); setGenerating(null); return; }

      // Merge new posts into topic
      if (data.posts) {
        setTopics(prev => prev.map(t =>
          t.id === topicId ? { ...t, posts: data.posts, status: 'generated' } : t
        ));
        setExpandedTopics(prev => new Set(prev).add(topicId));
      }
      startPolling(topicId);
    } catch (err) {
      console.error('[Social] generate error', err);
      toast.error('Generation failed');
      setGenerating(null);
    }
  }, []);

  const handleRegenerate = useCallback(async (postId) => {
    try {
      const res  = await apiFetch(`/api/social/posts/${postId}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const updated = data.post;
      setTopics(prev => prev.map(t => ({
        ...t,
        posts: t.posts?.map(p => p.id === postId ? { ...p, ...updated } : p),
      })));
      if (updated?.content) setEditContent(updated.content);
    } catch (err) {
      console.error('[Social] regenerate error', err);
      toast.error('Regeneration failed');
    }
  }, []);

  const handlePublish = useCallback(async (postId) => {
    setPublishing(true);
    try {
      const res  = await apiFetch(`/api/social/posts/${postId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setTopics(prev => prev.map(t => ({
        ...t,
        posts: t.posts?.map(p => p.id === postId ? { ...p, status: 'published', ...data.post } : p),
      })));
    } catch (err) {
      console.error('[Social] publish error', err);
      toast.error('Publishing failed');
    } finally {
      setPublishing(false);
    }
  }, []);

  const handleDeleteTopic = useCallback(async (topicId) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
    if (selectedTopicId === topicId) {
      setSelectedTopicId(null);
      setSelectedPostId(null);
    }
    try {
      await apiFetch(`/api/social/topics/${topicId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[Social] delete error', err);
    }
  }, [selectedTopicId]);

  const handleSaveContent = useCallback(async () => {
    if (!selectedPostId) return;
    try {
      const res  = await apiFetch(`/api/social/posts/${selectedPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setTopics(prev => prev.map(t => ({
        ...t,
        posts: t.posts?.map(p => p.id === selectedPostId ? { ...p, content: editContent } : p),
      })));
    } catch (err) {
      console.error('[Social] save error', err);
      toast.error('Failed to save');
    }
  }, [selectedPostId, editContent]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
        <h1 className="text-lg font-semibold text-slate-900">Social Posts</h1>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#2C666E] hover:bg-[#07393C] text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Post
        </Button>
      </header>

      {/* Platform filter tabs */}
      <div className="flex items-center gap-1 px-6 py-2.5 bg-white border-b border-slate-100">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setPlatformFilter(tab)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors capitalize ${
              platformFilter === tab
                ? 'bg-[#2C666E] text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] gap-0 h-[calc(100vh-112px)]">
          {/* ── Left: Topic queue ──────────────────────────────────── */}
          <div className="overflow-y-auto border-r border-slate-200 bg-white">
            {topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-3 px-6">
                <ImageIcon className="w-10 h-10 text-slate-300" />
                <p>No topics yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Post
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topics.map(topic => {
                  const PlatformIcon = PLATFORM_ICONS[topic.platform] ?? ImageIcon;
                  const expanded = expandedTopics.has(topic.id);
                  const isGenerating = generating === topic.id;

                  return (
                    <div key={topic.id}>
                      {/* Topic row */}
                      <div
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedTopicId === topic.id && !selectedPostId ? 'bg-slate-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedTopicId(topic.id);
                          setSelectedPostId(null);
                          toggleExpand(topic.id);
                        }}
                      >
                        {/* Expand chevron */}
                        <div className="flex-shrink-0 w-4">
                          {topic.posts?.length > 0 ? (
                            expanded
                              ? <ChevronDown className="w-4 h-4 text-slate-400" />
                              : <ChevronRight className="w-4 h-4 text-slate-400" />
                          ) : null}
                        </div>

                        {/* Platform badge */}
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLORS[topic.platform] ?? 'bg-slate-200 text-slate-700'}`}>
                          <PlatformIcon className="w-3 h-3" />
                          {topic.platform === 'instagram' ? 'IG' : 'FB'}
                        </span>

                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {topic.source_title || 'Untitled'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {topic.posts?.length ?? 0} post{(topic.posts?.length ?? 0) !== 1 ? 's' : ''}
                            {topic.created_at && (
                              <> &middot; {new Date(topic.created_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!topic.posts?.length && !isGenerating && (
                            <button
                              onClick={e => { e.stopPropagation(); handleGenerate(topic.id); }}
                              className="p-1 rounded text-[#2C666E] hover:bg-[#2C666E]/10 transition-colors"
                              title="Generate posts"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isGenerating && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2C666E]" />
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded post cards */}
                      {expanded && topic.posts?.length > 0 && (
                        <div className="pl-8 pr-3 pb-2 space-y-1">
                          {topic.posts.map(post => (
                            <SocialPostCard
                              key={post.id}
                              post={post}
                              isSelected={selectedPostId === post.id}
                              onClick={() => selectPost(topic.id, post.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Post detail ─────────────────────────────────── */}
          <div className="overflow-y-auto p-6">
            {selectedPost ? (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Image */}
                {selectedPost.featured_image_url ? (
                  <img
                    src={selectedPost.featured_image_url}
                    alt="Post image"
                    className="w-full rounded-xl shadow-sm border border-slate-200 aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full rounded-xl bg-slate-100 border border-slate-200 aspect-square flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Generating image...</p>
                    </div>
                  </div>
                )}

                {/* Excerpt / hook */}
                {selectedPost.excerpt && (
                  <div className="bg-slate-100 rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Image Hook</p>
                    <p className="text-sm text-slate-700 italic">"{selectedPost.excerpt}"</p>
                  </div>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedPost.post_style && STRUCTURE_BADGES[selectedPost.post_style] && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STRUCTURE_BADGES[selectedPost.post_style].cls}`}>
                      {STRUCTURE_BADGES[selectedPost.post_style].label}
                    </span>
                  )}
                  {selectedPost.driver_used && DRIVER_BADGES[selectedPost.driver_used] && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DRIVER_BADGES[selectedPost.driver_used].cls}`}>
                      {DRIVER_BADGES[selectedPost.driver_used].label}
                    </span>
                  )}
                  {selectedPost.status && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      selectedPost.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedPost.status}
                    </span>
                  )}
                </div>

                {/* Content textarea */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Post Content</label>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#2C666E] focus:border-transparent"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-slate-400">{editContent.length} characters</p>
                    {editContent !== (selectedPost.content ?? '') && (
                      <Button size="sm" variant="outline" onClick={handleSaveContent}>
                        Save Changes
                      </Button>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {selectedPost.status !== 'published' && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRegenerate(selectedPost.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      Regenerate Text
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRegenerate(selectedPost.id)}
                    >
                      <ImageIcon className="w-4 h-4 mr-1.5" />
                      Regenerate Image
                    </Button>
                    <Button
                      onClick={() => handlePublish(selectedPost.id)}
                      disabled={publishing}
                      className="bg-[#2C666E] hover:bg-[#07393C] text-white"
                    >
                      {publishing ? (
                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Publishing...</>
                      ) : (
                        <><Send className="w-4 h-4 mr-1.5" />Publish</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm">Select a post to preview</p>
                <p className="text-xs text-slate-300 mt-1">Choose a topic and expand it to see generated posts</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      <SocialCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={onTopicCreated}
      />
    </div>
  );
}
