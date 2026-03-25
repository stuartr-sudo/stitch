import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import TopicQueue from '@/components/linkedin/TopicQueue';
import PostFeed from '@/components/linkedin/PostFeed';
import LinkedInConfigModal from '@/components/linkedin/LinkedInConfigModal';

export default function LinkedInPage() {
  const [topics, setTopics]               = useState([]);
  const [posts, setPosts]                 = useState([]);
  const [config, setConfig]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [showConfig, setShowConfig]       = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState(null);

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

  const onSearch = useCallback(async (query, isUrl) => {
    try {
      const endpoint = isUrl ? '/api/linkedin/add-topic' : '/api/linkedin/search';
      const res  = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUrl ? { url: query } : { query }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      // Merge returned topics into state (avoid duplicates by id)
      const incoming = data.topics ?? (data.topic ? [data.topic] : []);
      setTopics(prev => {
        const ids = new Set(prev.map(t => t.id));
        const merged = [...prev];
        for (const t of incoming) {
          if (!ids.has(t.id)) merged.push(t);
          else {
            const idx = merged.findIndex(x => x.id === t.id);
            if (idx !== -1) merged[idx] = t;
          }
        }
        return merged;
      });
    } catch (err) {
      console.error('[LinkedIn] search error', err);
      toast.error('Search failed');
    }
  }, []);

  const onGenerate = useCallback(async (topicId) => {
    setGeneratingTopicId(topicId);
    try {
      const res  = await apiFetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      // Mark topic as generated
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, status: 'generated' } : t));
      // Add new posts
      const newPosts = data.posts ?? (data.post ? [data.post] : []);
      if (newPosts.length > 0) {
        setPosts(prev => [...newPosts, ...prev.filter(p => !newPosts.find(np => np.id === p.id))]);
        toast.success('Posts generated');
      }
    } catch (err) {
      console.error('[LinkedIn] generate error', err);
      toast.error('Generation failed');
    } finally {
      setGeneratingTopicId(null);
    }
  }, []);

  const onDismiss = useCallback(async (topicId) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
    try {
      const res  = await apiFetch(`/api/linkedin/topics/${topicId}`, { method: 'DELETE' });
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
        body: JSON.stringify({ content }),
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
              onSearch={onSearch}
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
    </div>
  );
}
