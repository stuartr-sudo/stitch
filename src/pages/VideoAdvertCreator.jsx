import React, { useState, useEffect, useRef } from 'react';
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
  Music,
  Mic,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

import BrandKitModal from '@/components/modals/BrandKitModal';
import BrandAssetsModal from '@/components/modals/BrandAssetsModal';
import CampaignSelectModal from '@/components/modals/CampaignSelectModal';
import PublishModal from '@/components/modals/PublishModal';
import AudioStudioModal from '@/components/modals/AudioStudioModal';
import DraggableCanvasItem from '@/components/canvas/DraggableCanvasItem';
import ImportBlogModal from '@/components/modals/ImportBlogModal';
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
import MotionTransferModal from '@/components/modals/MotionTransferModal';

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
    audioTools: true,
  });
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBrandAssets, setShowBrandAssets] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showImportBlog, setShowImportBlog] = useState(false);
  const [showMotionTransfer, setShowMotionTransfer] = useState(false);
  const [showAudioStudio, setShowAudioStudio] = useState(false);

  // Editor & Timeline state
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
      trackIndex: 0,
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
      trackIndex: 2,
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
    const maxHeight = 600; // Increased for better canvas size
    const maxWidth = 1000; // Increased for better canvas size
    
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
    <div className="h-[100dvh] bg-slate-900 flex flex-col overflow-hidden">
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
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 hidden md:flex">
                <Link to="/campaigns">View Campaigns</Link>
              </Button>
              <div className="h-4 w-px bg-slate-700 hidden md:block mx-1"></div>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700 text-slate-100 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-xs">
                  {platformList.map(platform => (
                    <SelectItem key={platform.value} value={platform.value} className="text-slate-100 focus:bg-slate-700">
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-4 w-px bg-slate-700 hidden md:block mx-1"></div>
              <Button size="sm" onClick={() => setShowImportBlog(true)} className="h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                <Link className="w-3.5 h-3.5 mr-1.5" /> Import URL
              </Button>
              <Button size="sm" onClick={() => setShowCampaignModal(true)} className="h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                Save Project
              </Button>
              <Button size="sm" onClick={() => setShowPublishModal(true)} className="h-8 bg-[#2C666E] hover:bg-[#07393C] text-white">
                Publish
              </Button>
              <div className="h-4 w-px bg-slate-700 hidden md:block mx-1"></div>
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

            {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* LEFT PANEL - Asset & Generation Hub */}
        <div className="w-56 bg-slate-800 border-r border-slate-700 overflow-y-auto shrink-0">
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
                    onClick={() => setShowMotionTransfer(true)}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-medium text-slate-200">Motion Transfer</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Animate images with video</p>
                  </div>
                  
                  <div 
                    onClick={() => setShowMotionTransfer(true)}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-medium text-slate-200">Motion Transfer</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Animate images with video</p>
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

            {/* Audio Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('audioTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Music className="w-4 h-4 text-green-500" /> Audio Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.audioTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.audioTools && (
                <div className="mt-2 space-y-2">
                  <div
                    onClick={() => setShowAudioStudio(true)}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-medium text-slate-200">Audio Studio</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Voiceovers & Music</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Project Assets Section */}
            <div>
              <button
                onClick={() => toggleSection('yourAssets')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#90DDF0]" /> Current Project
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

        {/* CENTER PANEL - Canvas & Timeline */}
        <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden min-w-0">
          {/* Video Preview Area */}
          <div className="flex-1 flex items-center justify-center bg-slate-900 p-6 overflow-hidden relative">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-4 py-2 rounded-full z-50">
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-[#90DDF0]">
                {isPlaying ? <span className="font-bold">Pause</span> : <span className="font-bold flex items-center gap-1"><Play className="w-4 h-4" /> Play</span>}
              </button>
              <span className="text-white text-xs font-mono">FRAME: {currentTime}</span>
            </div>
            <div
              className="bg-black relative shadow-2xl"
              style={{
                width: previewDimensions.width,
                height: previewDimensions.height,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            >
              {createdVideos.map(item => {
                const isActive = currentTime >= (item.startAt || 0) && currentTime < (item.startAt || 0) + (item.durationInFrames || 150);
                if (!isActive) return null;

                if (item.type === 'audio') {
                  return (
                    <audio
                      key={item.id}
                      src={item.url}
                      autoPlay={isPlaying}
                      muted={!isPlaying}
                      ref={(el) => {
                        if (el && isPlaying) {
                          const targetTime = (currentTime - (item.startAt || 0)) / 30;
                          if (Math.abs(el.currentTime - targetTime) > 0.5) el.currentTime = targetTime;
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  );
                }

                // Render both text and video as draggable canvas items
                return (
                  <DraggableCanvasItem
                    key={item.id}
                    item={item}
                    selectedId={selectedTimelineId}
                    onSelect={setSelectedTimelineId}
                    onUpdate={(id, updates) => setCreatedVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v))}
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

          {/* BOTTOM PANEL - Timeline */}
          <div className="h-64 bg-slate-800 border-t border-slate-700 flex flex-col shrink-0">
            <div className="p-2 border-b border-slate-700 flex items-center justify-between bg-slate-850">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline</span>
              <Button variant="outline" size="sm" onClick={handleAddText} className="h-7 text-xs gap-1 bg-slate-800 border-slate-600 text-slate-200">
                <Type className="w-3 h-3" /> Add Text
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const newAudioItem = {
                  id: Date.now().toString(),
                  type: 'audio',
                  url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-110855.mp3', // Placeholder audio
                  title: 'Background Music',
                  startAt: 0,
                  durationInFrames: 300,
                  trackIndex: 1
                };
                setCreatedVideos(prev => [...prev, newAudioItem]);
              }} className="h-7 text-xs gap-1 bg-slate-800 border-slate-600 text-slate-200">
                <Music className="w-3 h-3" /> Add Audio
              </Button>
            </div>
            <div className="flex-1 relative min-h-0">
              <StudioTimeline
                items={createdVideos}
                onUpdateItem={(id, updates) => setCreatedVideos(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))}
                onDeleteItem={(id) => setCreatedVideos(prev => prev.filter(item => item.id !== id))}
                onSelect={(item) => setSelectedTimelineId(item ? item.id : null)}
                selectedId={selectedTimelineId}
                currentTime={currentTime}
                duration={createdVideos.length > 0 ? Math.max(900, ...createdVideos.map(i => (i.startAt || 0) + (i.durationInFrames || 150))) : 900}
                onSeek={(frame) => setCurrentTime(frame)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BrandKitModal
        isOpen={showBrandKit}
        onClose={() => setShowBrandKit(false)}
      />

      <BrandAssetsModal
        isOpen={showBrandAssets}
        onClose={() => setShowBrandAssets(false)}
      />

      <CampaignSelectModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        onSave={(campaignId) => {
          toast.success(`Attached video project to campaign!`);
        }}
      />

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />

      <ImportBlogModal
        isOpen={showImportBlog}
        onClose={() => setShowImportBlog(false)}
        onImport={(data) => {
          toast.success(`Imported: ${data.title}`);
          // Here you could automatically create text items or video tasks based on the blog content
        }}
      />

      <AudioStudioModal
        isOpen={showAudioStudio}
        onClose={() => setShowAudioStudio(false)}
        onAudioGenerated={(audioItem) => {
          const nextStartAt = createdVideos.length > 0
            ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
            : 0;
          setCreatedVideos(prev => [...prev, { ...audioItem, id: Date.now().toString(), startAt: nextStartAt, durationInFrames: 300, trackIndex: 1 }]);
          toast.success('Audio added to timeline!');
        }}
      />

      <AudioStudioModal
        isOpen={showAudioStudio}
        onClose={() => setShowAudioStudio(false)}
        onAudioGenerated={(audioItem) => {
          const nextStartAt = createdVideos.length > 0
            ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
            : 0;
          setCreatedVideos(prev => [...prev, { ...audioItem, id: Date.now().toString(), startAt: nextStartAt, durationInFrames: 300, trackIndex: 1 }]);
          toast.success('Audio added to timeline!');
        }}
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
            const nextStartAt = createdVideos.length > 0 ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150))) : 0;
            const newVideo = {
              id: Date.now().toString(),
              type: 'video',
              url: item.url || item.video_url,
              title: item.title || `Video from Library`,
              createdAt: new Date().toISOString(),
              source: 'library',
              durationInFrames: 300,
              startAt: nextStartAt,
              trackIndex: 0
            };
            setCreatedVideos(prev => [newVideo, ...prev]);
            setCurrentPreviewVideo(newVideo);
            toast.success('Video added to your collection!');
          } else {
            const nextStartAt = createdVideos.length > 0 ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150))) : 0;
            const newImage = {
              id: Date.now().toString(),
              type: 'image',
              url: item.url || item.image_url,
              title: item.title || 'Library image',
              createdAt: new Date().toISOString(),
              startAt: nextStartAt,
              durationInFrames: 150,
              trackIndex: 0
            };
            setCreatedVideos(prev => [newImage, ...prev]);
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

      <MotionTransferModal
        isOpen={showMotionTransfer}
        onClose={() => setShowMotionTransfer(false)}
        onMotionGenerated={(motionItem) => {
          const nextStartAt = createdVideos.length > 0
            ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150))) : 0;
          setCreatedVideos(prev => [...prev, { ...motionItem, id: Date.now().toString(), startAt: nextStartAt, durationInFrames: 300, trackIndex: 0 }]);
          toast.success('Motion transfer added to timeline!');
        }}
      />
    </div>
  );
}
