import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FolderOpen,
  Search,
  Image as ImageIcon,
  Video,
  Loader2,
  Download,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Filter,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * MediaCard - Individual media item with video playback support
 */
function MediaCard({ item, isSelected, onSelect, onDelete }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const mediaUrl = item.url || item.image_url || item.video_url;
  const isVideo = item.type === 'video';

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const handleItemSelect = (e) => {
    e.stopPropagation();
    onSelect(item);
  };

  return (
    <div 
      className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-[#2C666E] ring-4 ring-[#90DDF0]/30' 
          : 'border-transparent hover:border-[#2C666E]/50 hover:shadow-md'
      }`}
      onClick={handleItemSelect}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="aspect-square bg-slate-100 relative">
        {isVideo ? (
          <>
            <video 
              ref={videoRef}
              src={mediaUrl} 
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              onEnded={handleVideoEnd}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Video Controls Overlay */}
            <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-slate-800" />
                  ) : (
                    <Play className="w-6 h-6 text-slate-800 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={handleMuteToggle}
                  className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-slate-800" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-800" />
                  )}
                </button>
              </div>
            </div>

            {/* Select Button for Videos */}
            {showControls && (
              <button
                onClick={handleItemSelect}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#2C666E] hover:bg-[#07393C] text-white text-sm font-medium rounded-full shadow-lg transition-all"
              >
                Add to Editor
              </button>
            )}
          </>
        ) : (
          <>
            <img 
              src={mediaUrl} 
              alt={item.title || 'Media'} 
              className="w-full h-full object-cover"
            />
            
            {/* Hover Overlay for Images */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              <button
                onClick={handleItemSelect}
                className="px-4 py-2 bg-[#2C666E] hover:bg-[#07393C] text-white text-sm font-medium rounded-full shadow-lg transition-all"
              >
                Add to Editor
              </button>
            </div>
          </>
        )}
        
        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <div className={`p-1.5 rounded-lg ${isVideo ? 'bg-blue-500' : 'bg-green-500'} text-white shadow-lg`}>
            {isVideo ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Action Buttons (top right) */}
        <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <Button size="sm" variant="secondary" className="h-7 w-7 p-0" asChild>
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2 bg-[#2C666E] text-white rounded-full p-1 shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>
      
      <div className="p-2 bg-white">
        <p className="text-xs font-medium text-slate-700 truncate">
          {item.title || item.prompt?.slice(0, 30) || 'Untitled'}
        </p>
        <p className="text-[10px] text-slate-400">
          {new Date(item.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

/**
 * LibraryModal - Browse and manage saved media
 */
export default function LibraryModal({ 
  isOpen, 
  onClose, 
  onSelect,
  mediaType = 'all', // 'all', 'images', 'videos'
  isEmbedded = false 
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(mediaType === 'all' ? 'all' : mediaType);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (isOpen || isEmbedded) {
      loadLibrary();
    }
  }, [isOpen, isEmbedded, filter]);

  const loadLibrary = async () => {
    setIsLoading(true);
    
    if (!supabase) {
      // Demo data when Supabase is not configured
      setItems([
        { id: 1, type: 'image', url: 'https://picsum.photos/400/300?random=1', title: 'Sample Image 1', created_at: new Date().toISOString() },
        { id: 2, type: 'image', url: 'https://picsum.photos/400/300?random=2', title: 'Sample Image 2', created_at: new Date().toISOString() },
        { id: 3, type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', title: 'Sample Video', created_at: new Date().toISOString() },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      // Load from image_library_items
      let imageQuery = supabase
        .from('image_library_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Load from generated_videos
      let videoQuery = supabase
        .from('generated_videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const results = [];

      if (filter === 'all' || filter === 'images') {
        const { data: images } = await imageQuery;
        if (images) {
          results.push(...images.map(img => ({ ...img, type: 'image' })));
        }
      }

      if (filter === 'all' || filter === 'videos') {
        const { data: videos } = await videoQuery;
        if (videos) {
          results.push(...videos.map(vid => ({ ...vid, type: 'video' })));
        }
      }

      // Sort by date
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setItems(results);
    } catch (error) {
      console.error('Library load error:', error);
      toast.error('Failed to load library');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.prompt?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item) => {
    setSelectedItem(item);
    if (onSelect) {
      onSelect(item);
      onClose();
    }
  };

  const handleDelete = async (item) => {
    if (!supabase) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Removed from library');
      return;
    }

    try {
      const table = item.type === 'image' ? 'image_library_items' : 'generated_videos';
      const { error } = await supabase.from(table).delete().eq('id', item.id);
      
      if (error) throw error;
      
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Deleted from library');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Library</h2>
              <p className="text-slate-500 text-sm">Browse your saved media</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search library..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="all">All Media</option>
            <option value="images">Images Only</option>
            <option value="videos">Videos Only</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={loadLibrary} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="font-medium">No media found</p>
            <p className="text-sm">Your generated images and videos will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <MediaCard 
                key={`${item.type}-${item.id}`}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Library</DialogTitle>
          <DialogDescription>Browse your saved media</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
