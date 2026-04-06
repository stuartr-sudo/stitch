import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PLATFORMS = ['All', 'Meta', 'Google', 'LinkedIn', 'TikTok', 'Web'];
const FORMATS = ['Image', 'Video', 'Carousel'];

export default function CompetitorSearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['All']);
  const [selectedFormats, setSelectedFormats] = useState([]);

  const togglePlatform = (p) => {
    if (p === 'All') return setSelectedPlatforms(['All']);
    setSelectedPlatforms(prev => {
      const without = prev.filter(x => x !== 'All');
      return without.includes(p) ? without.filter(x => x !== p) : [...without, p];
    });
  };

  const toggleFormat = (f) => {
    setSelectedFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    const platforms = selectedPlatforms.includes('All') ? [] : selectedPlatforms;
    onSearch(query.trim(), platforms, selectedFormats);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Enter competitor name, brand URL, or paste an ad URL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-indigo-600 hover:bg-indigo-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Research
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => togglePlatform(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedPlatforms.includes(p)
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
        <span className="w-px h-4 bg-gray-300 mx-1" />
        {FORMATS.map(f => (
          <button
            key={f}
            onClick={() => toggleFormat(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedFormats.includes(f)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
