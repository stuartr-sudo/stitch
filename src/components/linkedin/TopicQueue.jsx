import React, { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TopicCard from './TopicCard';

function isUrl(query) {
  const trimmed = query.trim();
  return trimmed.startsWith('http') || (/\./.test(trimmed) && !/ /.test(trimmed));
}

export default function TopicQueue({ topics, onSearch, onGenerate, onDismiss, generatingTopicId }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      await onSearch(q, isUrl(q));
    } finally {
      setSearching(false);
    }
  }

  const sorted = [...(topics || [])].sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 p-4 border-b border-slate-200">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search topics or paste a URL…"
          className="flex-1 text-sm"
          disabled={searching}
        />
        <Button type="submit" size="sm" disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>

      {/* Topic list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-sm px-6 gap-2">
            <Search className="w-8 h-8 opacity-30" />
            <p>Search for topics or paste a URL to get started</p>
          </div>
        ) : (
          sorted.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onGenerate={onGenerate}
              onDismiss={onDismiss}
              isGenerating={generatingTopicId === topic.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
