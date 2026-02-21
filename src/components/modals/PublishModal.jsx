import React, { useState } from 'react';
import { Share2, Globe, Video, Instagram, Youtube, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PublishModal({ isOpen, onClose }) {
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const toggleChannel = (channel) => {
    setSelectedChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const handlePublish = async () => {
    if (selectedChannels.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    setIsPublishing(true);
    // Mock publishing process
    await new Promise(r => setTimeout(r, 2000));
    
    setIsPublishing(false);
    toast.success(`Successfully published to ${selectedChannels.join(', ')}!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Publish Video</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-400 mb-6">Select the channels where you want to publish this video. This will render the final high-quality output and automatically upload it.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { id: 'TikTok', icon: <Video className="w-5 h-5" /> },
              { id: 'Instagram Reels', icon: <Instagram className="w-5 h-5" /> },
              { id: 'YouTube Shorts', icon: <Youtube className="w-5 h-5" /> },
              { id: 'X (Twitter)', icon: <Twitter className="w-5 h-5" /> }
            ].map(channel => (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${
                  selectedChannels.includes(channel.id)
                    ? 'bg-blue-500/20 border-blue-400 text-blue-100'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {channel.icon}
                <span className="text-sm font-medium">{channel.id}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={onClose} disabled={isPublishing} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button 
              onClick={handlePublish} 
              disabled={isPublishing || selectedChannels.length === 0} 
              className="bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {isPublishing ? (
                <>Rendering & Publishing...</>
              ) : (
                <><Share2 className="w-4 h-4 mr-2" /> Publish Now</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
