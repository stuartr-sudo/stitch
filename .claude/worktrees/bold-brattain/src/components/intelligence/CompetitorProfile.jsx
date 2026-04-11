import React, { useState } from 'react';
import { Globe, RefreshCw, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdResultCard from './AdResultCard';

export default function CompetitorProfile({ competitor, ads, onEdit, onDelete, onRefresh, onAnalyzeAd, onCreateCampaign, refreshing }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(competitor.name);
  const [editUrl, setEditUrl] = useState(competitor.website_url || '');
  const [editIndustry, setEditIndustry] = useState(competitor.industry || '');
  const [editNotes, setEditNotes] = useState(competitor.notes || '');

  const handleSave = () => {
    onEdit({ name: editName, website_url: editUrl, industry: editIndustry, notes: editNotes });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {editing ? (
            <div className="space-y-2">
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="font-semibold" />
              <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="Website URL" />
              <Input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} placeholder="Industry" />
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..." className="w-full text-sm border rounded-md p-2 h-20" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900">{competitor.name}</h2>
              {competitor.website_url && (
                <a href={competitor.website_url.startsWith('http') ? competitor.website_url : `https://${competitor.website_url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                  <Globe className="w-3 h-3" /> {competitor.website_url}
                </a>
              )}
              {competitor.industry && <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{competitor.industry}</span>}
              {competitor.notes && <p className="text-sm text-gray-500 mt-2">{competitor.notes}</p>}
              <p className="text-xs text-gray-400 mt-2">
                {competitor.last_researched_at ? `Last researched: ${new Date(competitor.last_researched_at).toLocaleDateString()}` : 'Not yet researched'}
              </p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onRefresh(competitor)} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => onDelete(competitor)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Create Campaign button */}
      {ads?.length > 0 && (
        <Button onClick={() => onCreateCampaign(competitor, ads)} className="bg-green-600 hover:bg-green-700">
          <Sparkles className="w-4 h-4 mr-2" /> Create Campaign from {competitor.name}
        </Button>
      )}

      {/* Ads Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Ads ({ads?.length || 0})</h3>
        {ads?.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {ads.map(ad => (
              <AdResultCard key={ad.id} ad={ad} onAnalyze={onAnalyzeAd} onSave={() => {}} saved={true} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No ads saved for this competitor yet. Research them to discover their ads.</p>
        )}
      </div>
    </div>
  );
}
