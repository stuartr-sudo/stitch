import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  VisuallyHidden,
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
  VolumeX,
  Music as MusicIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * MediaCard - Individual media item with video playback support
 * Displays media in their natural aspect ratios
 */
function MediaCard({ item, isSelected, onSelect, onDelete }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, aspectRatio: 'landscape' });

  const mediaUrl = item.url || item.image_url || item.video_url || item.audio_url;
  const isVideo = item.type === 'video';
  const isAudio = item.type === 'audio';

  // Detect media dimensions
  const handleMediaLoad = (e) => {
    let width, height;
    if (isVideo) {
      width = e.target.videoWidth;
      height = e.target.videoHeight;
    } else {
      width = e.target.naturalWidth;
      height = e.target.naturalHeight;
    }
    
    if (width && height) {
      const ratio = width / height;
      let aspectRatio = 'landscape';
      if (ratio < 0.9) aspectRatio = 'portrait';
      else if (ratio >= 0.9 && ratio <= 1.1) aspectRatio = 'square';
      
      setDimensions({ width, height, aspectRatio });
    }
  };

  const handlePlayPause = (e) => {
    e.stopPropagation();
    const ref = isAudio ? audioRef : videoRef;
    if (ref.current) {
      if (isPlaying) {
        ref.current.pause();
      } else {
        ref.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = (e) => {
    e.stopPropagation();
    const ref = isAudio ? audioRef : videoRef;
    if (ref.current) {
      ref.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleMediaEnd = () => {
    setIsPlaying(false);
  };

  const handleItemSelect = (e) => {
    e.stopPropagation();
    onSelect(item);
  };

  // Determine aspect ratio class based on detected dimensions
  const getAspectClass = () => {
    switch (dimensions.aspectRatio) {
      case 'portrait':
        return 'aspect-[9/16]'; // Vertical video/image
      case 'square':
        return 'aspect-square';
      case 'landscape':
      default:
        return 'aspect-video'; // 16:9 default for landscape
    }
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
      <div className={`${isAudio ? 'h-24' : getAspectClass()} bg-slate-900 relative flex items-center justify-center`}>
        {isAudio ? (
          <>
            <audio 
              ref={audioRef}
              src={mediaUrl} 
              muted={isMuted}
              onEnded={handleMediaEnd}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Audio Controls */}
            <div className="flex items-center gap-3 w-full px-4">
              <button
                onClick={handlePlayPause}
                className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-slate-800" />
                ) : (
                  <Play className="w-4 h-4 text-slate-800 ml-0.5" />
                )}
              </button>
              <button
                onClick={handleMuteToggle}
                className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all flex-shrink-0"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-800" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-800" />
                )}
              </button>
              <div className="flex-1 h-1 bg-slate-700 rounded-full"></div>
            </div>
          </>
        ) : isVideo ? (
          <>
            <video 
              ref={videoRef}
              src={mediaUrl} 
              className="max-w-full max-h-full object-contain"
              muted={isMuted}
              loop
              playsInline
              onLoadedMetadata={handleMediaLoad}
              onEnded={handleMediaEnd}
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
              className="max-w-full max-h-full object-contain"
              onLoad={handleMediaLoad}
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
          <div className={`p-1.5 rounded-lg ${
            isAudio ? 'bg-purple-500' : isVideo ? 'bg-blue-500' : 'bg-green-500'
          } text-white shadow-lg`}>
            {isAudio ? <MusicIcon className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Dimensions Badge */}
        {dimensions.width > 0 && (
          <div className="absolute bottom-2 left-2">
            <div className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
              {dimensions.width}×{dimensions.height}
            </div>
          </div>
        )}

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
  mediaType = 'all', // 'all', 'images', 'videos', 'audio'
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
      const results = [];

      if (filter === 'all' || filter === 'images') {
        const { data: images } = await supabase
          .from('image_library_items')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (images) {
          results.push(...images.map(img => ({ ...img, type: 'image' })));
        }
      }

      if (filter === 'all' || filter === 'videos') {
        const { data: videos } = await supabase
          .from('generated_videos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (videos) {
          results.push(...videos.map(vid => ({ ...vid, type: 'video' })));
        }
      }

      if (filter === 'all' || filter === 'audio') {
        const { data: audio } = await supabase
          .from('generated_audio')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (audio) {
          results.push(...audio.map(aud => ({ ...aud, type: 'audio' })));
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
      let table;
      if (item.type === 'image') {
        table = 'image_library_items';
      } else if (item.type === 'video') {
        table = 'generated_videos';
      } else if (item.type === 'audio') {
        table = 'generated_audio';
      }
      
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
            <option value="audio">Audio Only</option>
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
            <p className="text-sm">Your generated images, videos, and audio will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
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
        <VisuallyHidden>
          <DialogTitle>Library</DialogTitle>
          <DialogDescription>Browse your saved media</DialogDescription>
        </VisuallyHidden>
        {content}
      </DialogContent>
    </Dialog>
  );
}
