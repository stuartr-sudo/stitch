import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  Image,
  Sparkles,
  Wand2,
  Edit3,
  Play,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Eraser,
  Focus,
  FolderOpen,
  Palette,
  Shirt,
  Key,
  LogOut,
  Users,
  ChevronDown,
  Type,
  Clapperboard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

import BrandKitModal from '@/components/modals/BrandKitModal';
import BrandAssetsModal from '@/components/modals/BrandAssetsModal';
import StudioTimeline from '@/components/studio/StudioTimeline';
import JumpStartModal from '@/components/modals/JumpStartModal';
import JumpStartVideoStudioModal from '@/components/modals/JumpStartVideoStudioModal';
import TripModal from '@/components/modals/TripModal';
import AnimateModal from '@/components/modals/AnimateModal';
import ImagineerModal from '@/components/modals/ImagineerModal';
import EditImageModal from '@/components/modals/EditImageModal';
import InpaintModal from '@/components/modals/InpaintModal';
import LensModal from '@/components/modals/LensModal';
import SmooshModal from '@/components/modals/SmooshModal';
import LibraryModal from '@/components/modals/LibraryModal';
import TryStyleModal from '@/components/modals/TryStyleModal';
import ApiKeysModal from '@/components/modals/ApiKeysModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { PLATFORMS, getPlatformList } from '@/lib/platforms';

export default function VideoAdvertCreator() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeModal, setActiveModal] = useState(null);
  const [createdVideos, setCreatedVideos] = useState([]);
  const [createdImages, setCreatedImages] = useState([]);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok');
  const [currentPreviewVideo, setCurrentPreviewVideo] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    imageTools: true,
    videoTools: true,
    yourAssets: false,
  });
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBrandAssets, setShowBrandAssets] = useState(false);

  // Editor & Timeline state
  const [activeTab, setActiveTab] = useState('editor');
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedTimelineId, setSelectedTimelineId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback loop
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    const fps = 30;
    const frameInterval = 1000 / fps;

    const playLoop = (time) => {
      if (time - lastTime >= frameInterval) {
        setCurrentTime(prev => {
          const maxDuration = createdVideos.length > 0
            ? Math.max(150, ...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
            : 150;
          return prev >= maxDuration ? 0 : prev + 1;
        });
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(playLoop);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(playLoop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, createdVideos]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/setup');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle new video created
  const handleVideoCreated = (videoUrl, title = null, source = null, durationInSeconds = 5) => {
    const frames = durationInSeconds * 30;

    const nextStartAt = createdVideos.length > 0
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
      : 0;

    const newVideo = {
      id: Date.now().toString(),
      type: 'video',
      url: videoUrl,
      title: title || `Video ${createdVideos.length + 1}`,
      createdAt: new Date().toISOString(),
      source: source || activeModal || 'unknown',
      durationInFrames: frames,
      startAt: nextStartAt,
    };
    setCreatedVideos(prev => [newVideo, ...prev]);
    setCurrentPreviewVideo(newVideo);
    toast.success('Video added to your collection!');
    
    apiFetch('/api/library/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: videoUrl,
        type: 'video',
        title: newVideo.title,
        source: newVideo.source,
      }),
    }).catch(err => console.warn('Failed to save video to library:', err));
  };

  // Handle adding text to timeline
  const handleAddText = () => {
    const nextStartAt = createdVideos.length > 0
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
      : 0;

    const newTextItem = {
      id: Date.now().toString(),
      type: 'text',
      content: 'New Text Overlay',
      startAt: nextStartAt,
      durationInFrames: 150,
      style: {
        x: 10,
        y: 80,
        color: '#ffffff',
        fontSize: '32px',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }
    };
    setCreatedVideos(prev => [...prev, newTextItem]);
    toast.success('Text overlay added!');
    setActiveTab('editor');
  };

  // Handle new image created
  const handleImageCreated = async (params) => {
    try {
      toast.info('Generating image...');
      
      const response = await apiFetch('/api/imagineer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 200) || 'empty response'}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate image');
      }

      if (data.imageUrl) {
        addGeneratedImage(data.imageUrl, params.prompt);
        return;
      }

      if (data.requestId) {
        toast.info('Image is being generated, please wait...');
        const model = data.model || params.model || 'wavespeed';
        const imageUrl = await pollForImageResult(data.requestId, model, 60, data.statusUrl, data.responseUrl);
        if (imageUrl) {
          addGeneratedImage(imageUrl, params.prompt);
        } else {
          toast.error('Image generation timed out. Please try again.');
        }
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    }
  };

  const addGeneratedImage = (url, prompt) => {
    const newImage = {
      id: Date.now().toString(),
      url,
      prompt,
      createdAt: new Date().toISOString(),
    };
    setCreatedImages(prev => [newImage, ...prev]);
    toast.success('Image generated successfully!');

    apiFetch('/api/library/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type: 'image', title: 'Imagineer Image', prompt, source: 'imagineer' }),
    }).catch(err => console.warn('Failed to save image to library:', err));
  };

  const pollForImageResult = async (requestId, model, maxAttempts = 60, statusUrl = null, responseUrl = null) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await apiFetch('/api/imagineer/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, model, statusUrl, responseUrl }),
        });
        const result = await res.json();
        if (result.imageUrl) return result.imageUrl;
        if (result.status === 'failed' || result.error) {
          toast.error(result.error || 'Image generation failed');
          return null;
        }
      } catch (err) {
        console.warn('Poll attempt failed:', err);
      }
    }
    return null;
  };

  // Delete video
  const handleDeleteVideo = (id) => {
    setCreatedVideos(prev => prev.filter(v => v.id !== id));
    if (currentPreviewVideo?.id === id) {
      setCurrentPreviewVideo(null);
    }
    toast.success('Video removed');
  };

  // Delete image
  const handleDeleteImage = (id) => {
    setCreatedImages(prev => prev.filter(i => i.id !== id));
    toast.success('Image removed');
  };

  // Download video
  const handleDownloadVideo = (video) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `${video.title || 'video'}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const platformConfig = PLATFORMS[selectedPlatform];
  const platformList = getPlatformList();

  // Calculate preview dimensions based on platform
  const getPreviewDimensions = () => {
    if (!platformConfig) return { width: 400, height: 400 };
    const [w, h] = platformConfig.defaultRatio.split(':').map(Number);
    const maxHeight = 400;
    const maxWidth = 300;
    
    let width = maxWidth;
    let height = (maxWidth * h) / w;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = (maxHeight * w) / h;
    }
    
    return { width, height };
  };

  const previewDimensions = getPreviewDimensions();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#2C666E] to-[#07393C] rounded-xl shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Stitch Studio</h1>
                <p className="text-xs text-slate-400">Non-Linear Editor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5">
                <Link to="/campaigns">View Campaigns</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(true)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> API Keys
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-red-400 hover:bg-slate-800 gap-1.5"
                title={user?.email}
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs: Editor (default) and Create */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-slate-700 px-4 py-2 bg-slate-850 flex items-center gap-2">
          <TabsList className="bg-slate-800 p-1">
            <TabsTrigger value="editor" className="gap-2 data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">
              <Clapperboard className="w-4 h-4" /> Editor
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2 data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">
              <Sparkles className="w-4 h-4" /> Create
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1 flex flex-col gap-4 mt-0 overflow-hidden p-4">
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden flex items-center justify-center">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-4 py-2 rounded-full z-50">
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-[#90DDF0]">
                {isPlaying ? <span className="font-bold">Pause</span> : <span className="font-bold flex items-center gap-1"><Play className="w-4 h-4" /> Play</span>}
              </button>
              <span className="text-white text-xs font-mono">FRAME: {currentTime}</span>
            </div>
            <div
              className="bg-black relative shadow-2xl"
              style={{
                aspectRatio: '9/16',
                height: '90%',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            >
              {createdVideos.map(item => {
                const isActive = currentTime >= (item.startAt || 0) && currentTime < (item.startAt || 0) + (item.durationInFrames || 150);
                if (!isActive) return null;

                if (item.type === 'text') {
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: 'absolute',
                        left: `${item.style?.x ?? 10}%`,
                        top: `${item.style?.y ?? 80}%`,
                        color: item.style?.color ?? '#ffffff',
                        fontSize: item.style?.fontSize ?? '32px',
                        fontWeight: item.style?.fontWeight ?? 'bold',
                        textShadow: item.style?.textShadow ?? '2px 2px 4px rgba(0,0,0,0.8)',
                        zIndex: 50,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedTimelineId(item.id)}
                      className={selectedTimelineId === item.id ? 'ring-2 ring-blue-500 border border-dashed border-blue-400 p-1' : ''}
                      role="button"
                      tabIndex={0}
                    >
                      {item.content}
                    </div>
                  );
                }

                return (
                  <video
                    key={item.id}
                    src={item.url}
                    autoPlay
                    muted
                    loop
                    className={`absolute inset-0 w-full h-full object-cover ${selectedTimelineId === item.id ? 'opacity-100' : 'opacity-95'}`}
                    style={{ zIndex: 10 }}
                  />
                );
              })}
              {createdVideos.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-500">
                  <Clapperboard className="w-12 h-12 mb-2 opacity-50" />
                  <p>Generate a video to start editing</p>
                </div>
              )}
            </div>
          </div>
          <div className="h-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700 flex items-center justify-between bg-slate-850">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline</span>
              <Button variant="outline" size="sm" onClick={handleAddText} className="h-7 text-xs gap-1 bg-slate-800 border-slate-600 text-slate-200">
                <Type className="w-3 h-3" /> Add Text
              </Button>
            </div>
            <div className="flex-1 relative min-h-0">
              <StudioTimeline
                items={createdVideos}
                onUpdateItem={(id, updates) => setCreatedVideos(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))}
                onSelect={(item) => setSelectedTimelineId(item.id)}
                selectedId={selectedTimelineId}
                currentTime={currentTime}
                duration={createdVideos.length > 0 ? Math.max(900, ...createdVideos.map(i => (i.startAt || 0) + (i.durationInFrames || 150))) : 900}
                onSeek={(frame) => setCurrentTime(frame)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Create Tab – existing layout */}
        <TabsContent value="create" className="flex-1 flex flex-col mt-0 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Asset & Generation Hub */}
        <div className="w-56 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Brand Kit and Brand Assets Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowBrandKit(true)}
                className="h-10 bg-[#2C666E] hover:bg-[#07393C] text-white text-xs font-medium gap-1"
              >
                <Palette className="w-4 h-4" /> Brand Kit
              </Button>
              <Button
                onClick={() => setShowBrandAssets(true)}
                className="h-10 bg-[#2C666E] hover:bg-[#07393C] text-white text-xs font-medium gap-1"
              >
                <Plus className="w-4 h-4" /> Assets
              </Button>
            </div>

            {/* Image Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('imageTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Image className="w-4 h-4 text-[#90DDF0]" /> Image Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.imageTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.imageTools && (
                <div className="mt-2 space-y-2">
                  <div 
                    onClick={() => setActiveModal('imagineer')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#90DDF0]" />
                      <span className="text-xs font-medium text-slate-200">Imagineer</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Generate images</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('editimage')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-slate-200">Edit Image</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">AI image editing</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('inpaint')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Eraser className="w-4 h-4 text-[#90DDF0]" />
                      <span className="text-xs font-medium text-slate-200">Inpaint</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Remove/replace</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('smoosh')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-slate-200">Smoosh</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Compositor</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('lens')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Focus className="w-4 h-4 text-[#90DDF0]" />
                      <span className="text-xs font-medium text-slate-200">Lens</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Adjust angles</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('trystyle')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-slate-200">Try Style</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Virtual try-on</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('videoTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#2C666E]" /> Video Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.videoTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.videoTools && (
                <div className="mt-2 space-y-2">
                  <div
                    onClick={handleAddText}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[#90DDF0]" />
                      <span className="text-xs font-medium text-slate-200">Add Text</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Overlay text on video</p>
                  </div>
                  <div
                    onClick={() => setActiveModal('jumpstart')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-[#07393C]" />
                      <span className="text-xs font-medium text-slate-200">JumpStart</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Image to video</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('videostudio')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-slate-200">Video Studio</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Edit & extend</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('trip')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-[#07393C]" />
                      <span className="text-xs font-medium text-slate-200">Trip</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Restyle with AI</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('animate')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#07393C]" />
                      <span className="text-xs font-medium text-slate-200">Animate</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Character anim</p>
                  </div>

                  <div 
                    onClick={() => setActiveModal('library')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-slate-200">Library</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Browse media</p>
                  </div>
                </div>
              )}
            </div>

            {/* Your Assets Section */}
            <div>
              <button
                onClick={() => toggleSection('yourAssets')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#90DDF0]" /> Your Assets
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.yourAssets ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.yourAssets && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-slate-400 px-3 py-2">
                    <p>{createdVideos.length} videos</p>
                    <p>{createdImages.length} images</p>
                  </div>
                  {createdVideos.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {createdVideos.slice(0, 5).map(video => (
                        <div
                          key={video.id}
                          onClick={() => setCurrentPreviewVideo(video)}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors truncate ${
                            currentPreviewVideo?.id === video.id
                              ? 'bg-[#2C666E] text-white'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          }`}
                          title={video.title}
                        >
                          {video.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Canvas */}
        <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden">
          {/* Platform Selector */}
          <div className="border-b border-slate-700 px-6 py-4 bg-slate-850">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-100">Canvas</h2>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {platformList.map(platform => (
                    <SelectItem key={platform.value} value={platform.value} className="text-slate-100">
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Video Preview Area */}
          <div className="flex-1 flex items-center justify-center bg-slate-900 p-6 overflow-auto">
            {currentPreviewVideo ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative bg-black rounded-lg overflow-hidden border-4 border-yellow-400 shadow-2xl"
                  style={{
                    width: `${previewDimensions.width}px`,
                    height: `${previewDimensions.height}px`,
                  }}
                >
                  <video
                    src={currentPreviewVideo.url}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    loop
                  />
                  {platformConfig?.safeZones && Object.keys(platformConfig.safeZones).length > 0 && (
                    <div
                      className="absolute border-2 border-yellow-400 opacity-50"
                      style={{
                        top: `${platformConfig.safeZones.top || 0}%`,
                        bottom: `${platformConfig.safeZones.bottom || 0}%`,
                        left: `${platformConfig.safeZones.left || 0}%`,
                        right: `${platformConfig.safeZones.right || 0}%`,
                      }}
                    />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-slate-200 font-semibold">{currentPreviewVideo.title}</h3>
                  <p className="text-sm text-slate-400">{platformConfig?.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {platformConfig?.defaultRatio} • {platformConfig?.maxDuration}s max
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No video selected</h3>
                <p className="text-slate-500 mb-4">Create or select a video from the left panel to preview</p>
                <Button
                  onClick={() => setActiveModal('jumpstart')}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-2"
                >
                  <Play className="w-4 h-4" /> Create Video
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <BrandKitModal
        isOpen={showBrandKit}
        onClose={() => setShowBrandKit(false)}
      />

      <BrandAssetsModal
        isOpen={showBrandAssets}
        onClose={() => setShowBrandAssets(false)}
      />

      <ImagineerModal 
        isOpen={activeModal === 'imagineer'} 
        onClose={() => setActiveModal(null)}
        onGenerate={handleImageCreated}
      />
      
      <JumpStartModal 
        isOpen={activeModal === 'jumpstart'} 
        onClose={() => setActiveModal(null)}
        onVideoGenerated={handleVideoCreated}
      />
      
      <JumpStartVideoStudioModal 
        isOpen={activeModal === 'videostudio'} 
        onClose={() => setActiveModal(null)}
        onInsert={handleVideoCreated}
      />
      
      <TripModal 
        isOpen={activeModal === 'trip'} 
        onClose={() => setActiveModal(null)}
        onInsert={handleVideoCreated}
      />

      <AnimateModal 
        isOpen={activeModal === 'animate'} 
        onClose={() => setActiveModal(null)}
        onInsert={handleVideoCreated}
      />

      <EditImageModal 
        isOpen={activeModal === 'editimage'} 
        onClose={() => setActiveModal(null)}
        onImageEdited={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Edited image',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Edited Image', source: 'editimage' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <InpaintModal 
        isOpen={activeModal === 'inpaint'} 
        onClose={() => setActiveModal(null)}
        onImageEdited={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Inpainted image',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Inpainted Image', source: 'inpaint' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <LensModal 
        isOpen={activeModal === 'lens'} 
        onClose={() => setActiveModal(null)}
        onImageEdited={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Angle adjusted image',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Lens Adjusted Image', source: 'lens' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <SmooshModal 
        isOpen={activeModal === 'smoosh'} 
        onClose={() => setActiveModal(null)}
        onImageGenerated={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Canvas composition',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Smoosh Composition', source: 'smoosh' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <LibraryModal 
        isOpen={activeModal === 'library'} 
        onClose={() => setActiveModal(null)}
        onSelect={(item) => {
          if (item.type === 'video') {
            const newVideo = {
              id: Date.now().toString(),
              url: item.url || item.video_url,
              title: item.title || `Video from Library`,
              createdAt: new Date().toISOString(),
              source: 'library',
              durationInFrames: 300,
            };
            setCreatedVideos(prev => [newVideo, ...prev]);
            setCurrentPreviewVideo(newVideo);
            toast.success('Video added to your collection!');
          } else {
            const newImage = {
              id: Date.now().toString(),
              url: item.url || item.image_url,
              prompt: item.title || 'Library image',
              createdAt: new Date().toISOString(),
            };
            setCreatedImages(prev => [newImage, ...prev]);
            toast.success('Image added to your collection!');
          }
          setActiveModal(null);
        }}
      />

      <TryStyleModal 
        isOpen={activeModal === 'trystyle'} 
        onClose={() => setActiveModal(null)}
        onImageGenerated={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Virtual try-on result',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Try-on image added!');
          
          apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Try Style Result', source: 'trystyle' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <ApiKeysModal
        isOpen={showApiKeys}
        onClose={() => setShowApiKeys(false)}
      />
    </div>
  );
}
