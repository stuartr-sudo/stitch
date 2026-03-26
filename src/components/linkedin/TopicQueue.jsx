import React, { useState } from 'react';
import { Loader2, Search, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TopicCard from './TopicCard';

function isUrl(query) {
  const trimmed = query.trim();
  return trimmed.startsWith('http') || (/\./.test(trimmed) && !/ /.test(trimmed));
}

function sourceDomain(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function scoreBadgeClass(score) {
  if (score >= 8) return 'bg-green-100 text-green-700';
  if (score >= 6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export default function TopicQueue({ topics, onSearch, onAddUrl, onSearchKeyword, onAddSearchResult, onGenerate, onDismiss, generatingTopicId }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [addingUrl, setAddingUrl] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      if (isUrl(q)) {
        // URL paste → add directly to queue
        await onAddUrl(q);
        setQuery('');
      } else {
        // Keyword search → show previews
        const results = await onSearchKeyword(q);
        setSearchResults(results || []);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleAddResult(result) {
    setAddingUrl(result.url);
    try {
      await onAddSearchResult(result);
      // Remove from preview list
      setSearchResults(prev => prev.filter(r => r.url !== result.url));
    } finally {
      setAddingUrl(null);
    }
  }

  function clearResults() {
    setSearchResults([]);
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
        {/* Search result previews (blue cards, not in DB yet) */}
        {searchResults.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600">Search results</span>
              <button onClick={clearResults} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5">
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
            {searchResults.map((result, i) => (
              <div key={result.url || i} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  {result.relevance_score != null && (
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBadgeClass(result.relevance_score)}`}>
                      {Number(result.relevance_score).toFixed(1)}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Search result</span>
                </div>
                <p className="font-semibold text-sm text-slate-900 leading-snug">{result.headline}</p>
                <p className="text-xs text-slate-400">{sourceDomain(result.url)}</p>
                {result.suggested_angle && (
                  <p className="text-xs text-slate-500 italic">{result.suggested_angle}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start text-blue-600 border-blue-300 hover:bg-blue-100"
                  onClick={() => handleAddResult(result)}
                  disabled={addingUrl === result.url}
                >
                  {addingUrl === result.url ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3 mr-1.5" />
                  )}
                  Add to Queue
                </Button>
              </div>
            ))}
            <hr className="border-slate-200" />
          </>
        )}

        {/* Persisted topics */}
        {sorted.length === 0 && searchResults.length === 0 ? (
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
