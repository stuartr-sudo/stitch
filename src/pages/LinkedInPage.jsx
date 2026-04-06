import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import TopicQueue from '@/components/linkedin/TopicQueue';
import PostFeed from '@/components/linkedin/PostFeed';
import LinkedInConfigModal from '@/components/linkedin/LinkedInConfigModal';
import LinkedInCreateModal from '@/components/linkedin/LinkedInCreateModal';

export default function LinkedInPage() {
  const [topics, setTopics]               = useState([]);
  const [posts, setPosts]                 = useState([]);
  const [config, setConfig]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [showConfig, setShowConfig]       = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState(null);
  const [createModal, setCreateModal]     = useState({ open: false, topicId: null, headline: '' });
  const navigate = useNavigate();

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [topicsRes, postsRes, configRes] = await Promise.all([
          apiFetch('/api/linkedin/topics'),
          apiFetch('/api/linkedin/posts'),
          apiFetch('/api/linkedin/config'),
        ]);
        const [topicsData, postsData, configData] = await Promise.all([
          topicsRes.json(),
          postsRes.json(),
          configRes.json(),
        ]);

        if (!topicsData.error) setTopics(topicsData.topics ?? topicsData ?? []);
        if (!postsData.error)  setPosts(postsData.posts ?? postsData ?? []);
        if (!configData.error) setConfig(configData.config ?? configData ?? null);
      } catch (err) {
        console.error('[LinkedIn] load error', err);
        toast.error('Failed to load LinkedIn data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Topic queue callbacks ──────────────────────────────────────────────────

  /** Paste URL → add directly to topic queue */
  const onAddUrl = useCallback(async (url) => {
    try {
      const res = await apiFetch('/api/linkedin/add-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const incoming = data.topic ? [data.topic] : [];
      setTopics(prev => {
        const ids = new Set(prev.map(t => t.id));
        const merged = [...prev];
        for (const t of incoming) {
          if (!ids.has(t.id)) merged.push(t);
          else { const idx = merged.findIndex(x => x.id === t.id); if (idx !== -1) merged[idx] = t; }
        }
        return merged;
      });
      toast.success('Topic added');
    } catch (err) {
      console.error('[LinkedIn] add-url error', err);
      toast.error('Failed to add topic');
    }
  }, []);

  /** Keyword search → return preview results (no DB insert) */
  const onSearchKeyword = useCallback(async (query) => {
    try {
      const res = await apiFetch('/api/linkedin/search-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return []; }
      return data.results ?? [];
    } catch (err) {
      console.error('[LinkedIn] search-keyword error', err);
      toast.error('Search failed');
      return [];
    }
  }, []);

  /** Add a search result preview to the persisted topic queue */
  const onAddSearchResult = useCallback(async (result) => {
    try {
      const res = await apiFetch('/api/linkedin/add-search-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      if (data.topic) {
        setTopics(prev => {
          const ids = new Set(prev.map(t => t.id));
          if (ids.has(data.topic.id)) return prev.map(t => t.id === data.topic.id ? data.topic : t);
          return [...prev, data.topic];
        });
        toast.success('Added to queue');
      }
    } catch (err) {
      console.error('[LinkedIn] add-search-result error', err);
      toast.error('Failed to add topic');
    }
  }, []);

  const onGenerate = useCallback((topicId) => {
    const topic = topics.find(t => t.id === topicId);
    setCreateModal({ open: true, topicId, headline: topic?.source_title || '' });
  }, [topics]);

  const onCreateModalDone = useCallback((newPosts) => {
    if (newPosts.length > 0) {
      setPosts(prev => [...newPosts, ...prev.filter(p => !newPosts.find(np => np.id === p.id))]);
      // Mark the topic as generated
      const topicId = newPosts[0]?.topic_id;
      if (topicId) {
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, status: 'generated' } : t));
      }
    }
  }, []);

  const onDismiss = useCallback(async (topicId) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
    try {
      const res  = await apiFetch(`/api/linkedin/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
    } catch (err) {
      console.error('[LinkedIn] dismiss error', err);
    }
  }, []);

  // ── Post feed callbacks ────────────────────────────────────────────────────

  const onApprove = useCallback(async (postId) => {
    try {
      const res  = await apiFetch(`/api/linkedin/posts/${postId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved', ...data.post } : p));
    } catch (err) {
      console.error('[LinkedIn] approve error', err);
      toast.error('Failed to approve post');
    }
  }, []);

  const onEdit = useCallback(async (postId, content) => {
    try {
      const res  = await apiFetch(`/api/linkedin/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content, ...data.post } : p));
    } catch (err) {
      console.error('[LinkedIn] edit error', err);
      toast.error('Failed to save post');
    }
  }, []);

  const onReject = useCallback(async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      const res  = await apiFetch(`/api/linkedin/posts/${postId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) toast.error(data.error);
    } catch (err) {
      console.error('[LinkedIn] reject error', err);
    }
  }, []);

  const onRegenerate = useCallback(async (postId) => {
    try {
      const res  = await apiFetch(`/api/linkedin/posts/${postId}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const updated = data.post ?? data;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updated } : p));
      toast.success('Post regenerated');
    } catch (err) {
      console.error('[LinkedIn] regenerate error', err);
      toast.error('Regeneration failed');
    }
  }, []);

  const onPublish = useCallback(async (postId) => {
    try {
      const res  = await apiFetch(`/api/linkedin/posts/${postId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'published', ...data.post } : p));
      toast.success('Published to LinkedIn');
    } catch (err) {
      console.error('[LinkedIn] publish error', err);
      toast.error('Publishing failed');
    }
  }, []);

  const onOpenPost = useCallback((postId) => {
    navigate(`/linkedin/${postId}`);
  }, [navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
        <h1 className="text-lg font-semibold text-slate-900">LinkedIn</h1>
        <button
          onClick={() => setShowConfig(true)}
          className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="LinkedIn settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-[380px_1fr] gap-6 h-[calc(100vh-64px)] p-6">
          {/* Left panel — Topic Queue */}
          <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <TopicQueue
              topics={topics}
              onAddUrl={onAddUrl}
              onSearchKeyword={onSearchKeyword}
              onAddSearchResult={onAddSearchResult}
              onGenerate={onGenerate}
              onDismiss={onDismiss}
              generatingTopicId={generatingTopicId}
            />
          </div>

          {/* Right panel — Post Feed */}
          <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <PostFeed
              posts={posts}
              config={config}
              onApprove={onApprove}
              onEdit={onEdit}
              onReject={onReject}
              onRegenerate={onRegenerate}
              onPublish={onPublish}
              onOpenPost={onOpenPost}
            />
          </div>
        </div>
      )}

      <LinkedInConfigModal
        open={showConfig}
        onOpenChange={setShowConfig}
        config={config}
        onSaved={(updated) => setConfig(updated)}
      />

      <LinkedInCreateModal
        isOpen={createModal.open}
        onClose={() => setCreateModal({ open: false, topicId: null, headline: '' })}
        topicId={createModal.topicId}
        topicHeadline={createModal.headline}
        onCreated={onCreateModalDone}
      />
    </div>
  );
}
