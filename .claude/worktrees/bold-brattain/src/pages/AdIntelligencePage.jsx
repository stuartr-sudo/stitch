import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, Plus, Star, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useCommandCenter } from '@/contexts/CommandCenterContext';
import CompetitorSearchBar from '@/components/intelligence/CompetitorSearchBar';
import AdResultCard from '@/components/intelligence/AdResultCard';
import AdTeardownPanel from '@/components/intelligence/AdTeardownPanel';
import CompetitorProfile from '@/components/intelligence/CompetitorProfile';
import ResearchCampaignModal from '@/components/intelligence/ResearchCampaignModal';

const TABS = [
  { id: 'research', label: 'Research', icon: Search },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'competitors', label: 'Competitors', icon: Users },
];

export default function AdIntelligencePage() {
  const navigate = useNavigate();
  const { openWithContext } = useCommandCenter();
  const [activeTab, setActiveTab] = useState('research');

  // Research state
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [teardownOpen, setTeardownOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [landingAnalysis, setLandingAnalysis] = useState(null);
  const [analyzingLanding, setAnalyzingLanding] = useState(false);

  // Library state
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState({ platform: null, favorite: false });

  // Competitors state
  const [competitors, setCompetitors] = useState([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [competitorAds, setCompetitorAds] = useState([]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompUrl, setNewCompUrl] = useState('');
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Campaign modal state
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignSourceAds, setCampaignSourceAds] = useState([]);
  const [campaignCompetitor, setCampaignCompetitor] = useState(null);

  // Source counts from last search
  const [searchSources, setSearchSources] = useState(null);

  // ─── Research tab functions ──────────────────────────────
  const handleSearch = useCallback(async (query, platforms, formats) => {
    setSearching(true);
    setSearchResults([]);
    setSearchSources(null);
    const data = await apiFetch('/api/intelligence/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, platforms, formats }),
    }).then(r => r.json());
    setSearching(false);
    if (data.error) { toast.error(data.error); return; }
    setSearchResults(data.results || []);
    setSearchSources(data.sources || null);
  }, []);

  const handleAnalyze = useCallback(async (ad) => {
    setAnalyzingId(ad.source_url || ad.title);
    const data = await apiFetch('/api/intelligence/analyze-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_url: ad.source_url, ad_copy: ad.ad_copy, description: ad.description }),
    }).then(r => r.json());
    setAnalyzingId(null);
    if (data.error) { toast.error(data.error); return; }
    setSelectedAd(ad);
    setSelectedAnalysis(data.analysis);
    setLandingAnalysis(null);
    setTeardownOpen(true);
  }, []);

  const handleAnalyzeLanding = useCallback(async (url) => {
    setAnalyzingLanding(true);
    const data = await apiFetch('/api/intelligence/analyze-landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).then(r => r.json());
    setAnalyzingLanding(false);
    if (data.error) { toast.error(data.error); return; }
    setLandingAnalysis(data.analysis);
  }, []);

  const handleSaveToLibrary = useCallback(async (ad, analysis) => {
    const key = ad.source_url || ad.title;
    setSavingId(key);
    const data = await apiFetch('/api/intelligence/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_url: ad.source_url,
        platform: ad.platform,
        ad_format: ad.ad_format,
        ad_copy: ad.ad_copy || ad.description,
        thumbnail_url: ad.thumbnail_url,
        landing_page_url: ad.landing_page_url,
        analysis: analysis || selectedAnalysis,
        landing_page_analysis: landingAnalysis,
      }),
    }).then(r => r.json());
    setSavingId(null);
    if (data.error) { toast.error(data.error); return; }
    setSavedIds(prev => new Set([...prev, key]));
  }, [selectedAnalysis, landingAnalysis]);

  const handleCreateCampaign = useCallback((ad, analysis) => {
    const adWithAnalysis = { ...ad, analysis };
    setCampaignSourceAds([adWithAnalysis]);
    setCampaignCompetitor(null);
    setCampaignModalOpen(true);
  }, []);

  const handleUseInCommandCenter = useCallback((ad, analysis) => {
    const parts = [`I found a competitor ad I want to beat. Here's the analysis:`];
    if (ad.advertiser) parts.push(`**Competitor:** ${ad.advertiser}`);
    if (ad.platform) parts.push(`**Platform:** ${ad.platform}`);
    if (analysis?.hook) parts.push(`**Hook:** ${analysis.hook}`);
    if (analysis?.strengths?.length) parts.push(`**Strengths:** ${analysis.strengths.join(', ')}`);
    if (analysis?.weaknesses?.length) parts.push(`**Weaknesses:** ${analysis.weaknesses.join(', ')}`);
    if (analysis?.clone_suggestions?.length) parts.push(`**Clone suggestions:** ${analysis.clone_suggestions.join('; ')}`);
    if (ad.ad_copy) parts.push(`**Their ad copy:** "${ad.ad_copy.slice(0, 200)}"`);
    if (ad.thumbnail_url) parts.push(`**Creative:** ${ad.thumbnail_url}`);
    parts.push(`\nHelp me create a campaign that beats this.`);
    openWithContext(parts.join('\n'));
  }, [openWithContext]);

  // ─── Library tab functions ───────────────────────────────
  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const params = new URLSearchParams();
    if (libraryFilter.platform) params.set('platform', libraryFilter.platform);
    if (libraryFilter.favorite) params.set('favorite', 'true');
    const data = await apiFetch(`/api/intelligence/library?${params}`).then(r => r.json());
    setLibraryLoading(false);
    if (!data.error) setLibraryItems(data.items || []);
  }, [libraryFilter]);

  useEffect(() => { if (activeTab === 'library') loadLibrary(); }, [activeTab, loadLibrary]);

  const toggleFavorite = async (item) => {
    await apiFetch(`/api/intelligence/library/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !item.is_favorite }),
    }).then(r => r.json());
    loadLibrary();
  };

  const deleteLibraryItem = async (item) => {
    await apiFetch(`/api/intelligence/library/${item.id}`, { method: 'DELETE' }).then(r => r.json());
    loadLibrary();
  };

  // ─── Competitors tab functions ───────────────────────────
  const loadCompetitors = useCallback(async () => {
    setCompetitorsLoading(true);
    const data = await apiFetch('/api/intelligence/competitors').then(r => r.json());
    setCompetitorsLoading(false);
    if (!data.error) setCompetitors(data.competitors || []);
  }, []);

  useEffect(() => { if (activeTab === 'competitors') loadCompetitors(); }, [activeTab, loadCompetitors]);

  const handleAddCompetitor = async () => {
    if (!newCompName.trim()) return;
    setAddingCompetitor(true);
    const data = await apiFetch('/api/intelligence/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCompName.trim(), website_url: newCompUrl.trim() || null }),
    }).then(r => r.json());
    setAddingCompetitor(false);
    if (data.error) { toast.error(data.error); return; }
    setNewCompName('');
    setNewCompUrl('');
    loadCompetitors();
  };

  const selectCompetitor = async (comp) => {
    const data = await apiFetch(`/api/intelligence/competitors/${comp.id}`).then(r => r.json());
    if (!data.error) {
      setSelectedCompetitor(data.competitor);
      setCompetitorAds(data.ads || []);
    }
  };

  const handleEditCompetitor = async (updates) => {
    await apiFetch(`/api/intelligence/competitors/${selectedCompetitor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(r => r.json());
    selectCompetitor(selectedCompetitor);
    loadCompetitors();
  };

  const handleDeleteCompetitor = async (comp) => {
    await apiFetch(`/api/intelligence/competitors/${comp.id}`, { method: 'DELETE' }).then(r => r.json());
    setSelectedCompetitor(null);
    loadCompetitors();
  };

  const handleRefreshCompetitor = async (comp) => {
    setRefreshing(true);
    await apiFetch(`/api/intelligence/competitors/${comp.id}/refresh`, { method: 'POST' }).then(r => r.json());
    setRefreshing(false);
    selectCompetitor(comp);
  };

  const handleCampaignCreated = (data) => {
    navigate(`/ads/${data.campaign_id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ad Intelligence</h1>
            <p className="text-sm text-gray-500 mt-1">Research competitor ads, analyze landing pages, create better campaigns</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedCompetitor(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Research Tab ──────────────────────────── */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            <CompetitorSearchBar onSearch={handleSearch} loading={searching} />
            {searching && (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-3" /> Searching for competitor ads...
              </div>
            )}
            {!searching && searchResults.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm text-gray-500">{searchResults.length} results found</p>
                  {searchSources && (
                    <div className="flex gap-2 text-[10px]">
                      {searchSources.meta_ads > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{searchSources.meta_ads} Meta Ads</span>}
                      {searchSources.exa > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">{searchSources.exa} Exa</span>}
                      {searchSources.serp > 0 && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{searchSources.serp} Web</span>}
                      {searchSources.rag > 0 && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{searchSources.rag} Knowledge</span>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {searchResults.map((ad, i) => (
                    <AdResultCard
                      key={i}
                      ad={ad}
                      onAnalyze={handleAnalyze}
                      onSave={(ad) => handleSaveToLibrary(ad)}
                      analyzing={analyzingId === (ad.source_url || ad.title)}
                      saving={savingId === (ad.source_url || ad.title)}
                      saved={savedIds.has(ad.source_url || ad.title)}
                    />
                  ))}
                </div>
              </div>
            )}
            {!searching && searchResults.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Enter a competitor name or URL to discover their ads</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Library Tab ───────────────────────────── */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['All', 'Meta', 'Google', 'LinkedIn', 'TikTok'].map(p => (
                <button key={p} onClick={() => setLibraryFilter(f => ({ ...f, platform: p === 'All' ? null : p }))} className={`px-3 py-1 rounded-full text-xs font-medium ${(p === 'All' && !libraryFilter.platform) || libraryFilter.platform === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setLibraryFilter(f => ({ ...f, favorite: !f.favorite }))} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${libraryFilter.favorite ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Star className="w-3 h-3" /> Favorites
              </button>
            </div>
            {libraryLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : libraryItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {libraryItems.map(item => (
                  <div key={item.id} className="relative">
                    <AdResultCard
                      ad={item}
                      onAnalyze={handleAnalyze}
                      onSave={() => {}}
                      saved={true}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => toggleFavorite(item)} className={`p-1 rounded ${item.is_favorite ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>
                        <Star className="w-4 h-4" fill={item.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => deleteLibraryItem(item)} className="p-1 rounded text-gray-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No saved ads yet. Research competitors and save ads to build your library.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Competitors Tab ───────────────────────── */}
        {activeTab === 'competitors' && (
          <div className="space-y-6">
            {/* Add competitor form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Competitor Name</label>
                <Input value={newCompName} onChange={e => setNewCompName(e.target.value)} placeholder="e.g., Nike Running" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Website (optional)</label>
                <Input value={newCompUrl} onChange={e => setNewCompUrl(e.target.value)} placeholder="e.g., nike.com" />
              </div>
              <Button onClick={handleAddCompetitor} disabled={addingCompetitor || !newCompName.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                {addingCompetitor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Add
              </Button>
            </div>

            {selectedCompetitor ? (
              <div>
                <button onClick={() => setSelectedCompetitor(null)} className="text-sm text-indigo-500 hover:underline mb-4">&larr; Back to all competitors</button>
                <CompetitorProfile
                  competitor={selectedCompetitor}
                  ads={competitorAds}
                  onEdit={handleEditCompetitor}
                  onDelete={handleDeleteCompetitor}
                  onRefresh={handleRefreshCompetitor}
                  onAnalyzeAd={handleAnalyze}
                  onCreateCampaign={(comp, ads) => { setCampaignCompetitor(comp); setCampaignSourceAds(ads); setCampaignModalOpen(true); }}
                  refreshing={refreshing}
                />
              </div>
            ) : competitorsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : competitors.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {competitors.map(comp => (
                  <div key={comp.id} onClick={() => selectCompetitor(comp)} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow">
                    <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                    {comp.industry && <span className="text-xs text-gray-400">{comp.industry}</span>}
                    <div className="mt-2 text-xs text-gray-500">
                      {comp.ad_library?.[0]?.count || 0} saved ads
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {comp.last_researched_at ? `Last: ${new Date(comp.last_researched_at).toLocaleDateString()}` : 'Not researched'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Add competitors to track their ads over time</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teardown Panel */}
      <AdTeardownPanel
        open={teardownOpen}
        onClose={() => setTeardownOpen(false)}
        ad={selectedAd}
        analysis={selectedAnalysis}
        landingAnalysis={landingAnalysis}
        onAnalyzeLanding={handleAnalyzeLanding}
        onSave={handleSaveToLibrary}
        onCreateCampaign={handleCreateCampaign}
        onUseInCommandCenter={handleUseInCommandCenter}
        analyzingLanding={analyzingLanding}
      />

      {/* Campaign Creation Modal */}
      <ResearchCampaignModal
        open={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        sourceAds={campaignSourceAds}
        competitor={campaignCompetitor}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  );
}
