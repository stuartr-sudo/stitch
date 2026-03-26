import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody } from '@/components/ui/slide-over-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FolderOpen,
  Search,
  Image as ImageIcon,
  Video,
  Loader2,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music as MusicIcon,
  LayoutGrid,
  Grid3X3,
  Layers,
  X,
  Tag,
  Plus,
  ImagePlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

/**
 * TagDropdown - Inline tag assignment popover shown on MediaCard hover
 */
function TagDropdown({ item, allTags, onAssign, onUnassign, onCreate, onClose }) {
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const itemTagIds = new Set((item._tags || []).map(t => t.id));

  const handleToggle = (tag) => {
    if (itemTagIds.has(tag.id)) {
      onUnassign(item.id, tag.id);
    } else {
      onAssign([item.id], [tag.id]);
    }
  };

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setIsCreating(true);
    const tag = await onCreate(name);
    if (tag) {
      await onAssign([item.id], [tag.id]);
      setNewTagName('');
    }
    setIsCreating(false);
  };

  return (
    <div
      ref={ref}
      className="absolute top-8 right-0 z-50 w-52 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider px-1 mb-1.5">Tags</p>
      <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2">
        {allTags.length === 0 && (
          <p className="text-xs text-zinc-500 px-1 py-1">No tags yet — create one below</p>
        )}
        {allTags.map(tag => (
          <button
            key={tag.id}
            onClick={() => handleToggle(tag)}
            className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
              itemTagIds.has(tag.id)
                ? 'bg-teal-600/30 text-teal-300'
                : 'text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <span>{tag.name}</span>
            {itemTagIds.has(tag.id) && <CheckCircle2 className="w-3 h-3" />}
          </button>
        ))}
      </div>
      <div className="border-t border-zinc-700 pt-2 flex gap-1">
        <input
          className="flex-1 bg-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded outline-none placeholder:text-zinc-500"
          placeholder="New tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />
        <button
          onClick={handleCreate}
          disabled={isCreating || !newTagName.trim()}
          className="p-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded transition-colors"
        >
          {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

/**
 * MediaCard - Individual media item with video playback support
 * Displays media in their natural aspect ratios
 */
function MediaCard({ item, isSelected, onSelect, onDelete, multiSelectMode, isMultiSelected, allTags, onAssignTags, onUnassignTag, onCreateTag }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, aspectRatio: 'landscape' });
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const mediaUrl = item.url || item.image_url || item.video_url || item.audio_url;
  const thumbnailUrl = item.thumbnail_url || mediaUrl;
  const isVideo = item.type === 'video';
  const isAudio = item.type === 'audio';

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

  const getAspectClass = () => {
    switch (dimensions.aspectRatio) {
      case 'portrait':
        return 'aspect-[9/16]';
      case 'square':
        return 'aspect-square';
      case 'landscape':
      default:
        return 'aspect-video';
    }
  };

  return (
    <div
      className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
        isMultiSelected
          ? 'border-[#2C666E] ring-4 ring-[#90DDF0]/30'
          : isSelected
            ? 'border-[#2C666E] ring-4 ring-[#90DDF0]/30'
            : 'border-transparent hover:border-[#2C666E]/50 hover:shadow-md'
      }`}
      onClick={handleItemSelect}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => { setShowControls(false); }}
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
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt={item.title || 'Video'} className="max-w-full max-h-full object-contain" loading="lazy" />
            ) : (
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
            )}
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
              src={thumbnailUrl}
              alt={item.title || 'Media'}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
              onLoad={handleMediaLoad}
            />
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

        {/* Multi-select checkbox or Type Badge */}
        <div className="absolute top-2 left-2">
          {multiSelectMode ? (
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
              isMultiSelected
                ? 'bg-[#2C666E] border-[#2C666E] text-white'
                : 'bg-white/80 border-slate-300'
            }`}>
              {isMultiSelected && <CheckCircle2 className="w-4 h-4" />}
            </div>
          ) : (
            <div className={`p-2 rounded-lg ${
              isAudio ? 'bg-purple-500' : isVideo ? 'bg-blue-500' : 'bg-green-500'
            } text-white shadow-lg`}>
              {isAudio ? <MusicIcon className="w-5 h-5" /> : isVideo ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
          )}
        </div>

        {/* Dimensions Badge */}
        {dimensions.width > 0 && (
          <div className="absolute bottom-2 left-2">
            <div className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
              {dimensions.width}×{dimensions.height}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Tag button */}
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); setShowTagDropdown(prev => !prev); }}
              title="Manage tags"
            >
              <Tag className="w-3.5 h-3.5" />
            </Button>
            {showTagDropdown && (
              <TagDropdown
                item={item}
                allTags={allTags}
                onAssign={onAssignTags}
                onUnassign={onUnassignTag}
                onCreate={onCreateTag}
                onClose={() => setShowTagDropdown(false)}
              />
            )}
          </div>
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
        {/* Tag chips */}
        {item._tags?.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1 px-1">
            {item._tags.slice(0, 3).map(t => (
              <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{t.name}</span>
            ))}
            {item._tags.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-500">+{item._tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MediaGrid — renders the filtered grid of items
 */
function MediaGrid({ items, searchQuery, activeTags, selectedItem, onSelect, onDelete, isLoading, canLoadMore, isLoadingMore, onLoadMore, multiSelectMode, multiSelectedIds, allTags, onAssignTags, onUnassignTag, onCreateTag }) {
  const filtered = items.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = (item.title || item.alt_text || item.prompt || '').toLowerCase().includes(q);
      const matchesTag = item._tags?.some(t => t.name.toLowerCase().includes(q));
      if (!matchesTitle && !matchesTag) return false;
    }
    if (activeTags.size > 0) {
      const itemTagIds = new Set((item._tags || []).map(t => t.id));
      if (![...activeTags].some(tid => itemTagIds.has(tid))) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
        <p className="font-medium">No media found</p>
        <p className="text-sm">Your generated images, videos, and audio will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
        {filtered.map(item => (
          <MediaCard
            key={`${item.type}-${item.id}`}
            item={item}
            isSelected={selectedItem?.id === item.id}
            onSelect={onSelect}
            onDelete={onDelete}
            multiSelectMode={multiSelectMode}
            isMultiSelected={multiSelectedIds?.has(item.id)}
            allTags={allTags}
            onAssignTags={onAssignTags}
            onUnassignTag={onUnassignTag}
            onCreateTag={onCreateTag}
          />
        ))}
      </div>
      {canLoadMore && !searchQuery && (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 text-xs border-gray-300"
          >
            {isLoadingMore
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Loading...</>
              : `Load More`}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * LibraryModal - Browse and manage saved media
 */
const PAGE_SIZE = 20;

export default function LibraryModal({
  isOpen,
  onClose,
  onSelect,
  mediaType = 'all',
  isEmbedded = false
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(mediaType === 'all' ? 'all' : mediaType);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hasMore, setHasMore] = useState({ images: true, videos: true, audio: true });
  const [offsets, setOffsets] = useState({ images: 0, videos: 0, audio: 0 });

  // Tags
  const [tags, setTags] = useState([]);
  const [activeTags, setActiveTags] = useState(new Set());

  // Metadata filters
  const [filterOptions, setFilterOptions] = useState({
    video_style: [], visual_style: [], model_name: [], storyboard_name: [], short_name: []
  });
  const [activeFilters, setActiveFilters] = useState({
    video_style: '', visual_style: '', model_name: '', storyboard_name: '', short_name: ''
  });

  // Multi-select mode for creating turnaround sheets
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState(new Set());
  const [creatingSheet, setCreatingSheet] = useState(false);

  const open = isOpen || isEmbedded;

  useEffect(() => {
    if (open) {
      setActiveFilters({ video_style: '', visual_style: '', model_name: '', storyboard_name: '', short_name: '' });
      setItems([]);
      setOffsets({ images: 0, videos: 0, audio: 0 });
      setHasMore({ images: true, videos: true, audio: true });
      loadLibrary(true);
    }
  }, [isOpen, isEmbedded]);

  // Fetch all tags
  const fetchTags = async () => {
    try {
      const res = await apiFetch('/api/library/tags');
      if (!res.ok) return; // Silently skip if tags API unavailable (migration not run)
      const data = await res.json();
      if (data.tags) setTags(data.tags);
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    fetchTags();
  }, [open]);

  const fetchFilterOptions = async () => {
    try {
      const res = await apiFetch('/api/library/filters');
      if (!res.ok) return;
      const data = await res.json();
      if (data) setFilterOptions(data);
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    fetchFilterOptions();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setOffsets({ images: 0, videos: 0, audio: 0 });
    setHasMore({ images: true, videos: true, audio: true });
    loadLibrary(true);
  }, [activeFilters]);

  // Batch-load tags for a set of items (images only — tags only apply to image_library_items)
  const loadTagsForItems = async (items) => {
    if (!supabase || items.length === 0) return items;
    const imageItems = items.filter(i => i.type === 'image');
    if (imageItems.length === 0) return items;
    const ids = imageItems.map(i => i.id);
    try {
      const { data: links, error } = await supabase
        .from('image_tag_links')
        .select('image_id, tag_id, image_tags(id, name)')
        .in('image_id', ids);

      // Gracefully handle table not existing (migration not run yet)
      if (error || !links) return items;

      const tagMap = {};
      for (const link of links) {
        if (!tagMap[link.image_id]) tagMap[link.image_id] = [];
        if (link.image_tags) tagMap[link.image_id].push(link.image_tags);
      }

      return items.map(item => ({
        ...item,
        _tags: item.type === 'image' ? (tagMap[item.id] || []) : [],
      }));
    } catch {
      return items;
    }
  };

  const loadLibrary = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsLoadingMore(true);

    if (!supabase) {
      setItems([
        { id: 1, type: 'image', url: 'https://picsum.photos/400/300?random=1', title: 'Sample Image 1', created_at: new Date().toISOString(), _tags: [] },
        { id: 2, type: 'image', url: 'https://picsum.photos/400/300?random=2', title: 'Sample Image 2', created_at: new Date().toISOString(), _tags: [] },
        { id: 3, type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', title: 'Sample Video', created_at: new Date().toISOString(), _tags: [] },
      ]);
      setIsLoading(false);
      return;
    }

    const currentOffsets = isInitial ? { images: 0, videos: 0, audio: 0 } : offsets;

    try {
      const results = [];
      const newHasMore = { ...hasMore };
      const newOffsets = { ...currentOffsets };

      // Only fetch types that have more data
      if (isInitial || hasMore.images) {
        let imgQuery = supabase
          .from('image_library_items')
          .select('id, url, thumbnail_url, title, prompt, created_at, alt_text, video_style, visual_style, model_name, storyboard_name, short_name')
          .order('created_at', { ascending: false });

        // Apply metadata filters
        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val) imgQuery = imgQuery.eq(key, val);
        });

        imgQuery = imgQuery.range(currentOffsets.images, currentOffsets.images + PAGE_SIZE - 1);
        const { data: images } = await imgQuery;
        if (images) {
          results.push(...images.map(img => ({ ...img, type: 'image' })));
          newHasMore.images = images.length === PAGE_SIZE;
          newOffsets.images = currentOffsets.images + images.length;
        } else {
          newHasMore.images = false;
        }
      }

      if (isInitial || hasMore.videos) {
        let vidQuery = supabase
          .from('generated_videos')
          .select('id, url, thumbnail_url, title, prompt, created_at, video_style, visual_style, model_name, storyboard_name, short_name')
          .order('created_at', { ascending: false });

        // Apply metadata filters
        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val) vidQuery = vidQuery.eq(key, val);
        });

        vidQuery = vidQuery.range(currentOffsets.videos, currentOffsets.videos + PAGE_SIZE - 1);
        const { data: videos } = await vidQuery;
        if (videos) {
          results.push(...videos.map(vid => ({ ...vid, type: 'video' })));
          newHasMore.videos = videos.length === PAGE_SIZE;
          newOffsets.videos = currentOffsets.videos + videos.length;
        } else {
          newHasMore.videos = false;
        }
      }

      if (isInitial || hasMore.audio) {
        const { data: audio } = await supabase
          .from('generated_audio')
          .select('id, audio_url, title, prompt, created_at, duration_seconds')
          .order('created_at', { ascending: false })
          .range(currentOffsets.audio, currentOffsets.audio + PAGE_SIZE - 1);
        if (audio) {
          results.push(...audio.map(aud => ({ ...aud, type: 'audio' })));
          newHasMore.audio = audio.length === PAGE_SIZE;
          newOffsets.audio = currentOffsets.audio + audio.length;
        } else {
          newHasMore.audio = false;
        }
      }

      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Batch-load tags for image items
      const withTags = await loadTagsForItems(results);

      if (isInitial) {
        setItems(withTags);
      } else {
        setItems(prev => {
          // Deduplicate by type+id
          const existingKeys = new Set(prev.map(i => `${i.type}-${i.id}`));
          const newItems = withTags.filter(r => !existingKeys.has(`${r.type}-${r.id}`));
          return [...prev, ...newItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }

      setHasMore(newHasMore);
      setOffsets(newOffsets);
    } catch (error) {
      console.error('Library load error:', error);
      toast.error('Failed to load library');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Refresh tags on an item in local state after assign/unassign
  const refreshItemTags = async (imageId) => {
    if (!supabase) return;
    try {
      const { data: links } = await supabase
        .from('image_tag_links')
        .select('image_id, tag_id, image_tags(id, name)')
        .eq('image_id', imageId);
      const newTags = (links || []).map(l => l.image_tags).filter(Boolean);
      setItems(prev => prev.map(item =>
        item.id === imageId && item.type === 'image'
          ? { ...item, _tags: newTags }
          : item
      ));
    } catch {}
  };

  // ─── Tag CRUD ────────────────────────────────────────────────────────────

  const handleAssignTags = async (imageIds, tagIds) => {
    try {
      const res = await apiFetch('/api/library/tags/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds, tagIds }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error('Failed to assign tags'); return; }
      await fetchTags();
      // Refresh each affected item's tags in local state
      for (const id of imageIds) await refreshItemTags(id);
    } catch (err) {
      toast.error('Failed to assign tags: ' + err.message);
    }
  };

  const handleUnassignTag = async (imageId, tagId) => {
    try {
      const res = await apiFetch('/api/library/tags/unassign', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, tagId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error('Failed to remove tag'); return; }
      await fetchTags();
      await refreshItemTags(imageId);
    } catch (err) {
      toast.error('Failed to remove tag: ' + err.message);
    }
  };

  const handleCreateTag = async (name) => {
    try {
      const res = await apiFetch('/api/library/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.tag) {
        setTags(prev => [data.tag, ...prev]);
        return data.tag;
      }
    } catch (err) {
      toast.error('Failed to create tag: ' + err.message);
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────

  const canLoadMore = hasMore.images || hasMore.videos || hasMore.audio;

  const getFilteredByTab = (tab) => {
    if (tab === 'all') return items;
    return items.filter(i => i.type === tab.replace(/s$/, ''));
  };

  const handleSelect = (item) => {
    if (multiSelectMode) {
      // In multi-select mode, toggle the item
      setMultiSelectedIds(prev => {
        const next = new Set(prev);
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
        return next;
      });
      return;
    }
    setSelectedItem(item);
    if (onSelect) {
      onSelect(item);
      onClose();
    }
  };

  const toggleMultiSelect = () => {
    setMultiSelectMode(prev => !prev);
    setMultiSelectedIds(new Set());
  };

  const multiSelectedItems = items.filter(i => multiSelectedIds.has(i.id) && i.type === 'image');

  // ─── Create Turnaround Sheet from selected images ──────────────────────
  const handleCreateTurnaroundSheet = async () => {
    const selectedImages = multiSelectedItems;
    if (selectedImages.length < 2) {
      toast.error('Select at least 2 images to create a turnaround sheet');
      return;
    }

    setCreatingSheet(true);
    try {
      // Load all selected images
      const loadImg = (src) => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
      });

      const urls = selectedImages.map(i => i.url || i.image_url);
      const imgs = await Promise.all(urls.map(u => loadImg(u)));

      // Calculate grid dimensions — prefer 4 columns like a standard turnaround
      const cols = Math.min(selectedImages.length, 4);
      const rows = Math.ceil(selectedImages.length / cols);

      // Use the max cell dimensions across all images
      const cellW = Math.max(...imgs.map(i => i.width));
      const cellH = Math.max(...imgs.map(i => i.height));

      // Create composite canvas
      const canvas = document.createElement('canvas');
      canvas.width = cols * cellW;
      canvas.height = rows * cellH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      imgs.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Center each image within its cell
        const x = col * cellW + (cellW - img.width) / 2;
        const y = row * cellH + (cellH - img.height) / 2;
        ctx.drawImage(img, x, y, img.width, img.height);
      });

      const compositeDataUrl = canvas.toDataURL('image/png');

      // Save to library
      const res = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: compositeDataUrl,
          type: 'image',
          title: `Custom Turnaround Sheet (${selectedImages.length} images)`,
          source: 'turnaround-sheet-custom',
        }),
      });
      const data = await res.json();

      if (data.url || data.saved) {
        toast.success(`Turnaround sheet created from ${selectedImages.length} images!`);
        // Refresh library to show new item
        setItems([]);
        setOffsets({ images: 0, videos: 0, audio: 0 });
        setHasMore({ images: true, videos: true, audio: true });
        loadLibrary(true);
        setMultiSelectMode(false);
        setMultiSelectedIds(new Set());
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (err) {
      console.error('[Library] Create turnaround sheet error:', err);
      toast.error('Failed to create sheet: ' + err.message);
    } finally {
      setCreatingSheet(false);
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
      if (item.type === 'image') table = 'image_library_items';
      else if (item.type === 'video') table = 'generated_videos';
      else if (item.type === 'audio') table = 'generated_audio';

      const { error } = await supabase.from(table).delete().eq('id', item.id);
      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Deleted from library');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    }
  };

  const tabCounts = {
    all: items.length,
    images: items.filter(i => i.type === 'image').length,
    videos: items.filter(i => i.type === 'video').length,
    audio: items.filter(i => i.type === 'audio').length,
  };

  const content = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      {/* Search bar + tag filter + tab filters */}
      <div className="flex-shrink-0 px-5 py-3 border-b space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={multiSelectMode ? "default" : "outline"}
            size="sm"
            onClick={toggleMultiSelect}
            className={multiSelectMode ? "bg-[#2C666E] text-white hover:bg-[#07393C]" : ""}
            title="Multi-select to create turnaround sheet"
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            {multiSelectMode ? 'Cancel' : 'Multi-Select'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setItems([]); setOffsets({ images: 0, videos: 0, audio: 0 }); setHasMore({ images: true, videos: true, audio: true }); loadLibrary(true); }} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>

        {/* Metadata filter dropdowns */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'video_style', label: 'Video Style' },
            { key: 'visual_style', label: 'Visual Style' },
            { key: 'model_name', label: 'Model' },
            { key: 'storyboard_name', label: 'Storyboard' },
            { key: 'short_name', label: 'Short' },
          ].map(({ key, label }) => {
            const options = filterOptions[key] || [];
            if (options.length === 0) return null;
            return (
              <select
                key={key}
                value={activeFilters[key]}
                onChange={(e) => setActiveFilters(prev => ({ ...prev, [key]: e.target.value }))}
                className="text-xs bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
              >
                <option value="">{label}</option>
                {options.map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            );
          })}
          {Object.values(activeFilters).some(v => v) && (
            <button
              onClick={() => setActiveFilters({ video_style: '', visual_style: '', model_name: '', storyboard_name: '', short_name: '' })}
              className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1 px-2 py-1.5"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Tag filter bar */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTags(prev => {
                  const next = new Set(prev);
                  next.has(tag.id) ? next.delete(tag.id) : next.add(tag.id);
                  return next;
                })}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  activeTags.has(tag.id) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {tag.name}{tag.count > 0 && <span className={`ml-1 ${activeTags.has(tag.id) ? 'text-teal-200' : 'text-zinc-400'}`}>{tag.count}</span>}
              </button>
            ))}
            {activeTags.size > 0 && (
              <button
                onClick={() => setActiveTags(new Set())}
                className="shrink-0 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors bg-zinc-800 text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        <TabsList className="w-full justify-start bg-slate-100/80 p-1 rounded-lg">
          <TabsTrigger value="all" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <LayoutGrid className="w-3.5 h-3.5" />
            All
            <span className="ml-1 text-[10px] bg-slate-200 data-[state=active]:bg-[#2C666E]/10 px-1.5 py-0.5 rounded-full">{tabCounts.all}</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ImageIcon className="w-3.5 h-3.5" />
            Images
            <span className="ml-1 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full">{tabCounts.images}</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Video className="w-3.5 h-3.5" />
            Videos
            <span className="ml-1 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full">{tabCounts.videos}</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <MusicIcon className="w-3.5 h-3.5" />
            Audio
            <span className="ml-1 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full">{tabCounts.audio}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab content */}
      <SlideOverBody>
        {['all', 'images', 'videos', 'audio'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-0 h-full">
            <MediaGrid
              items={getFilteredByTab(tab)}
              searchQuery={searchQuery}
              activeTags={activeTags}
              selectedItem={selectedItem}
              onSelect={handleSelect}
              onDelete={handleDelete}
              isLoading={isLoading}
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={() => loadLibrary(false)}
              multiSelectMode={multiSelectMode}
              multiSelectedIds={multiSelectedIds}
              allTags={tags}
              onAssignTags={handleAssignTags}
              onUnassignTag={handleUnassignTag}
              onCreateTag={handleCreateTag}
            />
          </TabsContent>
        ))}
      </SlideOverBody>

      {/* Floating action bar for multi-select */}
      {multiSelectMode && multiSelectedIds.size > 0 && (
        <div className="flex-shrink-0 border-t bg-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-[#2C666E]" />
            <span><strong>{multiSelectedIds.size}</strong> image{multiSelectedIds.size !== 1 ? 's' : ''} selected</span>
            <button
              onClick={() => setMultiSelectedIds(new Set())}
              className="ml-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {onSelect && multiSelectedItems.length > 0 && (
              <Button
                onClick={() => {
                  multiSelectedItems.forEach(item => onSelect(item));
                  onClose();
                }}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                <ImagePlus className="w-4 h-4 mr-2" /> Add {multiSelectedItems.length} to Editor
              </Button>
            )}
            <Button
              onClick={handleCreateTurnaroundSheet}
              disabled={creatingSheet || multiSelectedItems.length < 2}
              variant={onSelect ? 'outline' : 'default'}
              className={onSelect ? '' : 'bg-[#2C666E] hover:bg-[#07393C] text-white'}
            >
              {creatingSheet ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Grid3X3 className="w-4 h-4 mr-2" /> Create Turnaround Sheet</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Tabs>
  );

  if (isEmbedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Library"
      subtitle="Browse your saved media"
      icon={<FolderOpen className="w-5 h-5" />}
    >
      {content}
    </SlideOverPanel>
  );
}
