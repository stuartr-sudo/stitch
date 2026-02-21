import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function CampaignsNewPage() {
  const navigate = useNavigate();
  const [campaignName, setCampaignName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name.');
      return;
    }

    setIsCreating(true);
    try {
      // Mock API call for creating a campaign
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Campaign '${campaignName}' created successfully!`);
      navigate('/campaigns'); // Go back to campaigns list after creation
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error('Failed to create campaign.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/campaigns')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">New Campaign</h1>
              <p className="text-sm text-slate-500">Create a new ad campaign</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl p-6 border shadow-lg">
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaignName" className="text-slate-700">Campaign Name</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Summer Sale Video Ads"
                className="mt-1"
                disabled={isCreating}
              />
            </div>
            <Button
              onClick={handleCreateCampaign}
              disabled={isCreating || !campaignName.trim()}
              className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Campaign...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Create Campaign</>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
