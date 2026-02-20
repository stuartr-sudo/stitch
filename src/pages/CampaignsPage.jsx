import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Calendar,
  Link,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/campaigns/list', { method: 'GET' });
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Campaigns</h1>
                <p className="text-sm text-slate-500">Manage your ad campaigns and drafts</p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No campaigns yet</h3>
            <p className="text-slate-500 mb-6">Create your first campaign using the blog-to-ad webhook or start from scratch</p>
            <Button onClick={() => navigate('/')} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </div>
        ) : selectedCampaign ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="flex items-center gap-2 text-[#2C666E] hover:text-[#07393C] text-sm font-medium mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Campaigns
            </button>
            <div className="bg-white rounded-2xl p-6 border">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{selectedCampaign.name}</h2>
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-slate-500">Platform</p>
                  <p className="font-semibold text-slate-900 capitalize">{selectedCampaign.platform}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <p className="font-semibold text-slate-900 capitalize">{selectedCampaign.status}</p>
                </div>
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-semibold text-slate-900">{new Date(selectedCampaign.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedCampaign.source_url && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg flex items-center gap-2">
                  <Link className="w-4 h-4 text-slate-500" />
                  <a href={selectedCampaign.source_url} target="_blank" rel="noopener noreferrer" className="text-[#2C666E] hover:underline text-sm">
                    {selectedCampaign.source_url}
                  </a>
                </div>
              )}
              {selectedCampaign.ad_drafts && selectedCampaign.ad_drafts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Ad Drafts</h3>
                  <div className="space-y-2">
                    {selectedCampaign.ad_drafts.map(draft => (
                      <div key={draft.id} className="p-3 bg-slate-50 rounded-lg border">
                        <p className="text-sm text-slate-600">
                          Created {new Date(draft.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Status: <span className="font-semibold">{draft.generation_status}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
              >
                <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">{campaign.name}</h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Platform</span>
                    <span className="font-semibold text-slate-900 capitalize">{campaign.platform}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={`font-semibold px-2 py-1 rounded text-xs ${
                      campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      campaign.status === 'published' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Drafts</span>
                    <span className="font-semibold text-slate-900">{campaign.ad_drafts?.length || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(campaign.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
