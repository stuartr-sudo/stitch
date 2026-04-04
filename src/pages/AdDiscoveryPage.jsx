import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Loader2, Bookmark, BookmarkCheck, Trash2,
  ExternalLink, Target, Eye, Zap, Users, TrendingUp, X, Globe,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const NICHES = [
  { key: 'ai_tech_news', label: 'AI/Tech' },
  { key: 'finance_money', label: 'Finance' },
  { key: 'motivation_self_help', label: 'Motivation' },
  { key: 'scary_horror', label: 'Horror' },
  { key: 'history_did_you_know', label: 'History' },
  { key: 'true_crime', label: 'True Crime' },
  { key: 'science_nature', label: 'Science' },
  { key: 'relationships_dating', label: 'Relationships' },
  { key: 'health_fitness', label: 'Fitness' },
  { key: 'gaming_popculture', label: 'Gaming' },
  { key: 'conspiracy_mystery', label: 'Conspiracy' },
  { key: 'business_entrepreneur', label: 'Business' },
  { key: 'food_cooking', label: 'Food' },
  { key: 'travel_adventure', label: 'Travel' },
  { key: 'psychology_mindblown', label: 'Psychology' },
  { key: 'space_cosmos', label: 'Space' },
  { key: 'animals_wildlife', label: 'Animals' },
  { key: 'sports_athletes', label: 'Sports' },
  { key: 'education_learning', label: 'Education' },
  { key: 'paranormal_ufo', label: 'Paranormal' },
  { key: 'ecommerce', label: 'E-commerce' },
  { key: 'saas', label: 'SaaS' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'beauty_skincare', label: 'Beauty' },
];

const PLATFORMS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Google', label: 'Google' },
  { value: 'YouTube', label: 'YouTube' },
];

const PLATFORM_COLORS = {
  Facebook: 'bg-blue-600 text-white',
  Instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  LinkedIn: 'bg-blue-700 text-white',
  TikTok: 'bg-black text-white',
  Google: 'bg-green-600 text-white',
  YouTube: 'bg-red-600 text-white',
};

// ─── Analysis Panel ────────────────────────────────────────────────
function AnalysisPanel({ analysis, onClose, ad, onClone }) {
  if (!analysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-lg font-semibold">Ad Analysis</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Hook */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
              <Zap className="w-4 h-4" /> Hook
            </div>
            <p className="text-gray-900">{analysis.hook}</p>
          </div>

          {/* Copy Breakdown */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
              <Target className="w-4 h-4" /> Copy Breakdown
            </div>
            <div className="space-y-2 bg-gray-50 rounded-lg p-4 text-sm">
              <div><span className="font-medium text-gray-600">Headline:</span> {analysis.copy_breakdown?.headline}</div>
              <div><span className="font-medium text-gray-600">Body:</span> {analysis.copy_breakdown?.body}</div>
              <div><span className="font-medium text-gray-600">CTA:</span> {analysis.copy_breakdown?.cta}</div>
            </div>
          </div>

          {/* Visual Style */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
              <Eye className="w-4 h-4" /> Visual Style
            </div>
            <p className="text-sm text-gray-700">{analysis.visual_style}</p>
          </div>

          {/* Target Audience */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
              <Users className="w-4 h-4" /> Target Audience
            </div>
            <p className="text-sm text-gray-700">{analysis.target_audience}</p>
          </div>

          {/* Emotional Triggers */}
          {analysis.emotional_triggers?.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">Emotional Triggers</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.emotional_triggers.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Strengths / Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-green-700 mb-2">Strengths</div>
              <ul className="space-y-1">
                {analysis.strengths?.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-1.5">
                    <span className="text-green-500 mt-0.5 shrink-0">+</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium text-red-700 mb-2">Weaknesses</div>
              <ul className="space-y-1">
                {analysis.weaknesses?.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-1.5">
                    <span className="text-red-500 mt-0.5 shrink-0">-</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Clone Suggestions */}
          {analysis.clone_suggestions?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                <Sparkles className="w-4 h-4" /> Clone Suggestions
              </div>
              <ul className="space-y-1.5">
                {analysis.clone_suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-amber-50 rounded px-3 py-1.5 border border-amber-100">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button onClick={onClone} className="flex-1">
              <Sparkles className="w-4 h-4 mr-2" /> Clone with My Brand
            </Button>
            {ad?.source_url && (
              <Button variant="outline" asChild>
                <a href={ad.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> View Original
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ad Result Card ────────────────────────────────────────────────
function AdResultCard({ ad, onAnalyze, onSave, isSaved, analyzing }) {
  const platformClass = PLATFORM_COLORS[ad.platform] || 'bg-gray-500 text-white';

  return (
    <div className="bg-white rounded-xl border hover:shadow-md transition-all p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
          {ad.title || 'Untitled Ad'}
        </h4>
        {ad.platform && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${platformClass}`}>
            {ad.platform}
          </span>
        )}
      </div>

      {/* Advertiser */}
      {ad.advertiser && (
        <p className="text-xs text-gray-500 mb-1">{ad.advertiser}</p>
      )}

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-3 mb-3 flex-1">
        {ad.description || ad.why_its_winning || 'No description available'}
      </p>

      {/* Engagement */}
      {ad.estimated_engagement && (
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">
            Engagement: <span className="font-medium text-gray-700">{ad.estimated_engagement}</span>
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={() => onAnalyze(ad)}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Target className="w-3.5 h-3.5 mr-1" />}
          Analyze
        </Button>
        <Button
          size="sm"
          variant={isSaved ? 'secondary' : 'outline'}
          className="text-xs"
          onClick={() => onSave(ad)}
          disabled={isSaved}
        >
          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </Button>
        {ad.source_url && (
          <Button size="sm" variant="ghost" className="text-xs px-2" asChild>
            <a href={ad.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Library Card ──────────────────────────────────────────────────
function LibraryCard({ item, onAnalyze, onDelete, onClone }) {
  const platformClass = PLATFORM_COLORS[item.platform] || 'bg-gray-500 text-white';
  const analysis = item.analysis;

  return (
    <div className="bg-white rounded-xl border hover:shadow-md transition-all p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {item.platform && (
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium mb-1.5 ${platformClass}`}>
              {item.platform}
            </span>
          )}
          <p className="text-sm text-gray-700 truncate">{item.source_url}</p>
        </div>
      </div>

      {/* Show analysis summary if available */}
      {analysis && (
        <div className="text-xs text-gray-500 space-y-1 mb-3">
          {analysis.hook && <p className="line-clamp-2"><span className="font-medium">Hook:</span> {analysis.hook}</p>}
          {analysis.target_audience && <p className="truncate"><span className="font-medium">Audience:</span> {analysis.target_audience}</p>}
        </div>
      )}

      {/* Tags */}
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.map((t, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
          ))}
        </div>
      )}

      <div className="text-[10px] text-gray-400 mb-2">
        Saved {new Date(item.created_at).toLocaleDateString()}
      </div>

      <div className="flex gap-2 mt-auto pt-2 border-t">
        {!analysis && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onAnalyze(item)}>
            <Target className="w-3.5 h-3.5 mr-1" /> Analyze
          </Button>
        )}
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onClone(item)}>
          <Sparkles className="w-3.5 h-3.5 mr-1" /> Clone
        </Button>
        <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-700 px-2" onClick={() => onDelete(item.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function AdDiscoveryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('search'); // 'search' | 'library'

  // Search state
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState('');
  const [platform, setPlatform] = useState('all');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  // Library state
  const [library, setLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savedUrls, setSavedUrls] = useState(new Set());

  // Analysis state
  const [analyzingAd, setAnalyzingAd] = useState(null); // which ad is being analyzed
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisAd, setAnalysisAd] = useState(null);

  // Load library on mount and when switching to library tab
  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const res = await apiFetch('/api/ads/discover', {
        method: 'POST',
        body: JSON.stringify({ action: 'list' }),
      });
      if (res.items) {
        setLibrary(res.items);
        setSavedUrls(new Set(res.items.map(i => i.source_url)));
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // ─── Search ────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!niche && !keywords) {
      toast.error('Enter a niche or keywords to search');
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const res = await apiFetch('/api/ads/discover', {
        method: 'POST',
        body: JSON.stringify({ action: 'search', niche, keywords, platform }),
      });
      setResults(res.results || []);
      if (!res.results?.length) {
        toast.warning('No ads found. Try different keywords or a broader niche.');
      }
    } catch (err) {
      toast.error('Search failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSearching(false);
    }
  };

  // ─── Analyze ───────────────────────────────────────────────────
  const handleAnalyze = async (ad) => {
    const key = ad.source_url || ad.id;
    setAnalyzingAd(key);
    try {
      const res = await apiFetch('/api/ads/discover', {
        method: 'POST',
        body: JSON.stringify({
          action: 'analyze',
          source_url: ad.source_url,
          description: ad.description || ad.title || '',
        }),
      });
      if (res.analysis) {
        setAnalysisResult(res.analysis);
        setAnalysisAd(ad);
        setShowAnalysis(true);
      }
    } catch (err) {
      toast.error('Analysis failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAnalyzingAd(null);
    }
  };

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = async (ad) => {
    try {
      await apiFetch('/api/ads/discover', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          source_url: ad.source_url || '',
          platform: ad.platform || null,
          niche: niche || null,
          thumbnail_url: ad.thumbnail_url || null,
          tags: [ad.platform, niche].filter(Boolean),
        }),
      });
      setSavedUrls(prev => new Set([...prev, ad.source_url]));
      // Refresh library in background
      loadLibrary();
    } catch (err) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    }
  };

  // ─── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await apiFetch('/api/ads/discover', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id }),
      });
      setLibrary(prev => prev.filter(i => i.id !== id));
      setSavedUrls(prev => {
        const item = library.find(i => i.id === id);
        if (item) {
          const next = new Set(prev);
          next.delete(item.source_url);
          return next;
        }
        return prev;
      });
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ─── Clone → navigate to Ads Manager ──────────────────────────
  const handleClone = (ad) => {
    const analysis = ad.analysis || analysisResult;
    if (analysis) {
      // Store clone recipe in sessionStorage for the Ads Manager to pick up
      sessionStorage.setItem('ad_clone_recipe', JSON.stringify({
        source_url: ad.source_url || analysisAd?.source_url,
        platform: ad.platform || analysis.estimated_platform,
        hook: analysis.hook,
        copy_breakdown: analysis.copy_breakdown,
        visual_style: analysis.visual_style,
        target_audience: analysis.target_audience,
        clone_suggestions: analysis.clone_suggestions,
      }));
    }
    navigate('/ads');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ads')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Ads
          </Button>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-semibold">Ad Discovery</h1>
          </div>
          <div className="flex-1" />
          {/* Tab toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('search')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === 'search' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search className="w-3.5 h-3.5 inline mr-1.5" />Search
            </button>
            <button
              onClick={() => { setTab('library'); loadLibrary(); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === 'library' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 inline mr-1.5" />Library
              {library.length > 0 && (
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  {library.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── Search Tab ─────────────────────────────────────────── */}
        {tab === 'search' && (
          <>
            {/* Search controls */}
            <div className="bg-white rounded-xl border p-4 mb-6">
              <div className="flex flex-wrap gap-3">
                {/* Niche */}
                <div className="relative">
                  <select
                    value={niche}
                    onChange={e => setNiche(e.target.value)}
                    className="appearance-none bg-gray-50 border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
                  >
                    <option value="">Select niche...</option>
                    {NICHES.map(n => (
                      <option key={n.key} value={n.key}>{n.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Keywords */}
                <Input
                  placeholder="Keywords (e.g. fitness app, SaaS onboarding)..."
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 min-w-[200px]"
                />

                {/* Platform */}
                <div className="relative">
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="appearance-none bg-gray-50 border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Search button */}
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Results */}
            {searching && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                <p className="text-sm">Searching for winning ads...</p>
                <p className="text-xs text-gray-400 mt-1">This may take 15-30 seconds</p>
              </div>
            )}

            {!searching && results.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">{results.length} ads found</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.map((ad, i) => (
                    <AdResultCard
                      key={ad.source_url || i}
                      ad={ad}
                      onAnalyze={handleAnalyze}
                      onSave={handleSave}
                      isSaved={savedUrls.has(ad.source_url)}
                      analyzing={analyzingAd === (ad.source_url || ad.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {!searching && results.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Search for ads by niche, keywords, or platform</p>
                <p className="text-xs mt-1">Uses AI web search to find real ads from ad libraries and marketing databases</p>
              </div>
            )}
          </>
        )}

        {/* ─── Library Tab ────────────────────────────────────────── */}
        {tab === 'library' && (
          <>
            {loadingLibrary && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            )}

            {!loadingLibrary && library.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No saved ads yet</p>
                <p className="text-xs mt-1">Search for ads and save the ones you want to reference later</p>
              </div>
            )}

            {!loadingLibrary && library.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {library.map(item => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    onAnalyze={handleAnalyze}
                    onDelete={handleDelete}
                    onClone={handleClone}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Analysis Modal */}
      {showAnalysis && analysisResult && (
        <AnalysisPanel
          analysis={analysisResult}
          ad={analysisAd}
          onClose={() => { setShowAnalysis(false); setAnalysisResult(null); setAnalysisAd(null); }}
          onClone={() => { setShowAnalysis(false); handleClone(analysisAd); }}
        />
      )}
    </div>
  );
}
