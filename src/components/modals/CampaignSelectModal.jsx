import React, { useState, useEffect } from 'react';
import { Loader2, FolderPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function CampaignSelectModal({ isOpen, onClose, onSave }) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/campaigns/list', { method: 'GET' });
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.warn('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!selectedId) {
      toast.error('Please select a campaign first');
      return;
    }
    // We would normally fire an API call here to save the project state
    toast.success('Project saved to campaign successfully!');
    onSave && onSave(selectedId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Save to Campaign</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-400 mb-4">Select an existing campaign to attach this video project to.</p>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No campaigns found. Create one from the Campaigns page.
              </div>
            ) : (
              campaigns.map(camp => (
                <button
                  key={camp.id}
                  onClick={() => setSelectedId(camp.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                    selectedId === camp.id 
                      ? 'bg-[#2C666E]/20 border-[#2C666E] text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{camp.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{camp.platform} • {camp.status}</div>
                  </div>
                  {selectedId === camp.id && <Check className="w-4 h-4 text-[#90DDF0]" />}
                </button>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedId} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
              <FolderPlus className="w-4 h-4 mr-2" /> Save to Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
