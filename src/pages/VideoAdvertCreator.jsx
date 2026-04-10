import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Zap,
  RotateCcw,
  Box,
  LayoutGrid,
  FileText,
  Share2,
  Linkedin,
  GalleryHorizontalEnd,
  Megaphone,
  ListChecks,
  Calendar,
  Search,
  ListOrdered,
  Scissors,
  GitBranch,
  ClipboardList,
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
import ThreeDViewerModal from '@/components/modals/ThreeDViewerModal';
import ApiKeysModal from '@/components/modals/ApiKeysModal';
import ProviderStatusChip from '@/components/ProviderStatusChip';
import MotionTransferModal from '@/components/modals/MotionTransferModal';
import VideoAnalyzerModal from '@/components/modals/VideoAnalyzerModal';
import AdCloneModal from '@/components/modals/AdCloneModal';
import TurnaroundSheetModal from '@/components/modals/TurnaroundSheetWizard';
import { PLATFORMS, getPlatformList } from '@/lib/platforms';


function SetupBanner({ onDismiss }) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if setup is actually incomplete — only show if brand kit missing
    if (sessionStorage.getItem('setup_banner_dismissed')) return;
    apiFetch('/api/onboarding/status').then(r => r.json()).then(data => {
      if (data.onboarding_complete && !data.brand_kit_created) {
        setShow(true);
      }
    }).catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <div className="bg-[#2C666E]/10 border-b border-[#2C666E]/20 px-6 py-2 flex items-center justify-between">
      <p className="text-xs text-[#07393C]">
        <span className="font-medium">Setup incomplete:</span> Brand Kit not configured yet.
        <button onClick={() => navigate('/onboarding')} className="ml-2 text-[#2C666E] underline font-medium">
          Set up now
        </button>
      </p>
      <button
        onClick={() => { sessionStorage.setItem('setup_banner_dismissed', '1'); onDismiss(); }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Dismiss
      </button>
    </div>
  );
}

export default function VideoAdvertCreator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut, onboardingComplete } = useAuth();
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);
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
    socialTools: true,
    automationTools: true,
  });
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBrandAssets, setShowBrandAssets] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showImportBlog, setShowImportBlog] = useState(false);
  const [showMotionTransfer, setShowMotionTransfer] = useState(false);
  const [showAudioStudio, setShowAudioStudio] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState(null); // { url, prompt } for action buttons
  const [pendingImage, setPendingImage] = useState(null); // image URL to pass to next modal
  const [pendingModel, setPendingModel] = useState(null);
  const [pendingReferenceImages, setPendingReferenceImages] = useState(null);

  // Editor & Timeline state
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedTimelineId, setSelectedTimelineId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Bridge: detect ?fromStoryboard=<id> and redirect to workspace
  useEffect(() => {
    const storyboardId = searchParams.get('fromStoryboard');
    if (!storyboardId) return;
    searchParams.delete('fromStoryboard');
    setSearchParams(searchParams, { replace: true });
    navigate(`/storyboards/${storyboardId}`);
  }, [searchParams]);

  // Listen for open-tool events from child modals (e.g., Imagineer Edit result actions, Turnaround R2V)
  useEffect(() => {
    const handler = (e) => {
      const { tool, imageUrl, model, referenceImages } = e.detail || {};
      if (tool) {
        setPendingImage(imageUrl || null);
        setPendingModel(model || null);
        setPendingReferenceImages(referenceImages || null);
        setActiveModal(tool);
      }
    };
    window.addEventListener('open-tool', handler);
    return () => window.removeEventListener('open-tool', handler);
  }, []);

  // Playback loop — stops at end of last element
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    const fps = 30;
    const frameInterval = 1000 / fps;

    const getMaxFrame = () => createdVideos.length > 0
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90)))
      : 0;

    const playLoop = (time) => {
      if (time - lastTime >= frameInterval) {
        const maxFrame = getMaxFrame();
        const cur = currentTimeRef.current;

        if (maxFrame === 0 || cur >= maxFrame) {
          setIsPlaying(false);
          return; // stop — don't schedule next frame
        }

        const next = cur + 1;
        currentTimeRef.current = next;
        setCurrentTime(next);
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

  // Probe actual video duration from URL
  const getVideoDuration = (url) => new Promise((resolve) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.onloadedmetadata = () => {
      const seconds = vid.duration && isFinite(vid.duration) ? vid.duration : 5;
      vid.src = ''; // release
      resolve(seconds);
    };
    vid.onerror = () => resolve(5); // fallback 5s
    vid.src = url;
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
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
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90)))
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
    }).then(async (res) => {
      const data = await res.json();
      if (data.saved) {
        console.log('[Library] Video saved:', data.id);
      } else if (data.duplicate) {
        console.log('[Library] Video already in library');
      } else {
        console.error('[Library] Save failed:', data.message || data.error);
        toast.error('Video not saved to library: ' + (data.message || data.error || 'Unknown error'));
      }
    }).catch(err => {
      console.error('[Library] Network error saving video:', err);
      toast.error('Could not save video to library — is the API server running?');
    });
  };

  // Handle adding text to timeline
  const handleAddText = () => {
    const nextStartAt = createdVideos.length > 0
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90)))
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

  const addGeneratedImage = (url, prompt, source = 'imagineer') => {
    const newImage = {
      id: Date.now().toString(),
      url,
      prompt,
      createdAt: new Date().toISOString(),
    };
    setCreatedImages(prev => [newImage, ...prev]);
    setLastGeneratedImage({ url, prompt, source });
    toast.success('Image generated successfully!');

    apiFetch('/api/library/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type: 'image', title: prompt || 'Generated Image', prompt, source }),
    }).catch(err => console.warn('Failed to save image to library:', err));
  };

  const handleSendToTool = (tool) => {
    if (!lastGeneratedImage) return;
    const imageUrl = lastGeneratedImage.url;
    setLastGeneratedImage(null);
    // Close any open modal first, then open the target after a brief delay
    // to avoid Radix Dialog conflicts when two dialogs transition simultaneously
    if (activeModal) {
      setActiveModal(null);
      setTimeout(() => {
        setPendingImage(imageUrl);
        setActiveModal(tool);
      }, 150);
    } else {
      setPendingImage(imageUrl);
      setActiveModal(tool);
    }
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
    const maxHeight = 400; // Adjusted for better canvas visibility
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
    <div className="h-[100dvh] bg-gray-100 flex flex-col overflow-hidden">
      {/* Setup banner for incomplete onboarding */}
      {!setupBannerDismissed && <SetupBanner onDismiss={() => setSetupBannerDismissed(true)} />}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#2C666E] to-[#07393C] rounded-xl shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stitch Studio</h1>
                <p className="text-xs text-gray-500">Non-Linear Editor</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-32 h-8 bg-white border-gray-300 text-gray-900 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-xs">
                  {platformList.map(platform => (
                    <SelectItem key={platform.value} value={platform.value} className="text-gray-900 focus:bg-gray-100">
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-4 w-px bg-gray-300 hidden md:block mx-1"></div>
              <Button size="sm" onClick={() => setShowImportBlog(true)} className="h-8 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300">
                <Link className="w-3.5 h-3.5 mr-1.5" /> Import URL
              </Button>
              <Button size="sm" onClick={() => setShowCampaignModal(true)} className="h-8 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300">
                Save Project
              </Button>
              <Button size="sm" onClick={() => setShowPublishModal(true)} className="h-8 bg-[#2C666E] hover:bg-[#07393C] text-white">
                Publish
              </Button>
              <div className="h-4 w-px bg-gray-300 hidden md:block mx-1"></div>
              <ProviderStatusChip />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(true)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> API Keys
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-red-500 hover:bg-gray-100 gap-1.5"
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
        <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          <div className="p-4 space-y-4">
            {/* Brand Kit and LoRA Trainer Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowBrandKit(true)}
                className="h-10 bg-[#2C666E] hover:bg-[#07393C] text-white text-xs font-medium gap-1"
              >
                <Palette className="w-4 h-4" /> Brand
              </Button>
              <Button
                onClick={() => setShowBrandAssets(true)}
                className="h-10 bg-[#2C666E] hover:bg-[#07393C] text-white text-xs font-medium gap-1"
              >
                <Zap className="w-4 h-4" /> Train LoRA
              </Button>
            </div>

            {/* Image Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('imageTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Image className="w-4 h-4 text-[#2C666E]" /> Image Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.imageTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.imageTools && (
                <div className="mt-2 space-y-1">
                  <div
                    onClick={() => setActiveModal('imagineer')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Imagineer</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Generate images</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('editimage')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Edit Image</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">AI image editing</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('inpaint')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Eraser className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Inpaint</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Remove/replace</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('smoosh')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Smoosh</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Compositor</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('lens')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Focus className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Lens</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Adjust angles</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('3dviewer')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">3D Viewer</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Image to 3D model</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('trystyle')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Try Style</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Virtual try-on</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('turnaround')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Turnaround</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Character sheet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('videoTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#2C666E]" /> Video Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.videoTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.videoTools && (
                <div className="mt-2 space-y-1">
                  <div
                    onClick={handleAddText}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Add Text</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Overlay text on video</p>
                  </div>
                  <div
                    onClick={() => setActiveModal('jumpstart')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">JumpStart</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Image to video</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('videostudio')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Video Studio</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Edit & extend</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('trip')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Trip</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Restyle with AI</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('animate')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Animate</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Character anim</p>
                  </div>

                  <div
                    onClick={() => setShowMotionTransfer(true)}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-gray-800">Motion Transfer</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Animate images with video</p>
                  </div>

                  <div
                    onClick={() => navigate('/storyboards')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Storyboards</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Plan & produce videos</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('analyzer')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Video Analyzer</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Analyze & remix</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('adClone')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Clone Ad</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Clone viral ads</p>
                  </div>

                  <div
                    onClick={() => setActiveModal('library')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Library</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Browse media</p>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('audioTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Music className="w-4 h-4 text-green-600" /> Audio Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.audioTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.audioTools && (
                <div className="mt-2 space-y-1">
                  <div
                    onClick={() => setShowAudioStudio(true)}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-800">Audio Studio</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Voiceovers & Music</p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Tools Section */}
            <div>
              <button
                onClick={() => toggleSection('socialTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#2C666E]" /> Social Tools
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.socialTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.socialTools && (
                <div className="mt-2 space-y-1">
                  <div
                    onClick={() => navigate('/briefs')}
                    className="group bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-900">Client Briefs</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-0.5 ml-6">Start with a brief, get AI recommendations</p>
                  </div>
                  <div
                    onClick={() => navigate('/command-center')}
                    className="group bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-900">Command Center</span>
                    </div>
                    <p className="text-[10px] text-purple-600 mt-0.5 ml-6">AI marketing dashboard</p>
                  </div>
                  <div
                    onClick={() => navigate('/campaigns')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Campaigns</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Manage ad campaigns</p>
                  </div>

                  <div
                    onClick={() => navigate('/ads')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Ads Manager</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Google, LinkedIn & Meta ads</p>
                  </div>

                  <div
                    onClick={() => navigate('/ads/intelligence')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Ad Intelligence</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Research competitor ads & landing pages</p>
                  </div>

                  <div
                    onClick={() => navigate('/shorts/workbench')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Workbench</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Shorts workbench</p>
                  </div>

                  <div
                    onClick={() => navigate('/queue')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Queue</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Production queue</p>
                  </div>

                  <div
                    onClick={() => navigate('/shorts/batch')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Batch Queue</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Bulk Shorts generation</p>
                  </div>

                  <div
                    onClick={() => navigate('/publish')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Publish Queue</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Schedule & track publishing</p>
                  </div>

                  <div
                    onClick={() => navigate('/templates')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Templates</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Browse & use templates</p>
                  </div>

                  <div
                    onClick={() => navigate('/linkedin')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">LinkedIn</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">LinkedIn content tools</p>
                  </div>

                  <div
                    onClick={() => navigate('/carousels')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GalleryHorizontalEnd className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Carousels</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Create carousel posts</p>
                  </div>

                  <div
                    onClick={() => navigate('/storyboards')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Storyboards</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Plan & produce videos</p>
                  </div>
                </div>
              )}
            </div>

            {/* Automation Section */}
            <div>
              <button
                onClick={() => toggleSection('automationTools')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#2C666E]" /> Automation
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.automationTools ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.automationTools && (
                <div className="mt-2 space-y-1">
                  <div
                    onClick={() => navigate('/flows')}
                    className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-[#2C666E]" />
                      <span className="text-xs font-medium text-gray-800">Flows</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Build & run automation pipelines</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Project Assets Section */}
            <div>
              <button
                onClick={() => toggleSection('yourAssets')}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#2C666E]" /> Current Project
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.yourAssets ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.yourAssets && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-500 px-3 py-2">
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
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
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
        <div className="flex-1 bg-gray-200 flex flex-col overflow-hidden min-w-0">
          {/* Video Preview Area */}
          <div className="flex-1 flex items-center justify-center bg-gray-200 p-6 overflow-hidden relative">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 border border-gray-300 px-4 py-2 rounded-full z-50 shadow-sm">
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="text-gray-800 hover:text-[#2C666E]">
                {isPlaying ? <span className="font-bold">Pause</span> : <span className="font-bold flex items-center gap-1"><Play className="w-4 h-4" /> Play</span>}
              </button>
              <span className="text-gray-600 text-xs font-mono">FRAME: {currentTime}</span>
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
                const isActive = currentTime >= (item.startAt || 0) && currentTime < (item.startAt || 0) + (item.durationInFrames || 90);
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
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                  />
                );
              })}
              {createdVideos.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400">
                  <Clapperboard className="w-12 h-12 mb-2 opacity-50" />
                  <p className="mx-2.5 flex flex-wrap text-center">Generate a video to start editing</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM PANEL - Timeline */}
          <div className="h-72 bg-white border-t border-gray-300 flex flex-col shrink-0">
            <div className="p-1.5 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Timeline</span>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handleAddText} className="h-6 text-[11px] gap-1 bg-white border-gray-300 text-gray-700">
                  <Type className="w-3 h-3" /> Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAudioStudio(true)} className="h-6 text-[11px] gap-1 bg-white border-gray-300 text-gray-700">
                  <Music className="w-3 h-3" /> Audio
                </Button>
              </div>
            </div>
            <div className="flex-1 relative min-h-0">
              <StudioTimeline
                items={createdVideos}
                onUpdateItem={Object.assign(
                  (id, updates) => setCreatedVideos(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item)),
                  { __splitCallback: (newItem) => setCreatedVideos(prev => [...prev, newItem]) }
                )}
                onDeleteItem={(id) => setCreatedVideos(prev => prev.filter(item => item.id !== id))}
                onSelect={(item) => setSelectedTimelineId(item ? item.id : null)}
                selectedId={selectedTimelineId}
                currentTime={currentTime}
                duration={createdVideos.length > 0 ? Math.max(900, ...createdVideos.map(i => (i.startAt || 0) + (i.durationInFrames || 90))) : 900}
                onSeek={(frame) => setCurrentTime(frame)}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(p => !p)}
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
        onAudioGenerated={async (audioItem) => {
          const audioUrl = audioItem.url || audioItem.audio_url;
          let frames = 300; // fallback 10s
          if (audioUrl) {
            const dur = await new Promise((resolve) => {
              const a = new Audio();
              a.preload = 'metadata';
              a.onloadedmetadata = () => { resolve(a.duration && isFinite(a.duration) ? a.duration : 10); a.src = ''; };
              a.onerror = () => resolve(10);
              a.src = audioUrl;
            });
            frames = Math.round(dur * 30);
          }
          const nextStartAt = createdVideos.length > 0
            ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90)))
            : 0;
          setCreatedVideos(prev => [...prev, { ...audioItem, id: Date.now().toString(), startAt: nextStartAt, durationInFrames: frames, trackIndex: 1 }]);
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
        onClose={() => { setActiveModal(null); setPendingImage(null); setPendingModel(null); setPendingReferenceImages(null); }}
        onVideoGenerated={handleVideoCreated}
        initialImage={pendingImage}
        initialModel={pendingModel}
        initialReferenceImages={pendingReferenceImages}
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
        onClose={() => { setActiveModal(null); setPendingImage(null); }}
        initialImage={pendingImage}
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
        onClose={() => { setActiveModal(null); setPendingImage(null); }}
        initialImage={pendingImage}
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

      <ThreeDViewerModal
        isOpen={activeModal === '3dviewer'}
        onClose={() => setActiveModal(null)}
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
        onSelect={async (item) => {
          if (item.type === 'video') {
            const videoUrl = item.url || item.video_url;
            const actualDuration = await getVideoDuration(videoUrl);
            const frames = Math.round(actualDuration * 30);
            const nextStartAt = createdVideos.length > 0 ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90))) : 0;
            const newVideo = {
              id: Date.now().toString(),
              type: 'video',
              url: videoUrl,
              title: item.title || `Video from Library`,
              createdAt: new Date().toISOString(),
              source: 'library',
              durationInFrames: frames,
              startAt: nextStartAt,
              trackIndex: 0
            };
            setCreatedVideos(prev => [newVideo, ...prev]);
            setCurrentPreviewVideo(newVideo);
            toast.success('Video added to your collection!');
          } else {
            const nextStartAt = createdVideos.length > 0 ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90))) : 0;
            const newImage = {
              id: Date.now().toString(),
              type: 'image',
              url: item.url || item.image_url,
              title: item.title || 'Library image',
              createdAt: new Date().toISOString(),
              startAt: nextStartAt,
              durationInFrames: 90,
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

      <TurnaroundSheetModal
        isOpen={activeModal === 'turnaround'}
        onClose={() => { setActiveModal(null); setPendingImage(null); }}
        initialImage={pendingImage}
        onImageCreated={(url) => addGeneratedImage(url, 'Turnaround Sheet', 'turnaround')}
      />

      <VideoAnalyzerModal
        isOpen={activeModal === 'analyzer'}
        onClose={() => setActiveModal(null)}
      />

      <AdCloneModal
        isOpen={activeModal === 'adClone'}
        onClose={() => setActiveModal(null)}
      />

      <ApiKeysModal
        isOpen={showApiKeys}
        onClose={() => setShowApiKeys(false)}
      />

      <MotionTransferModal
        isOpen={showMotionTransfer}
        onClose={() => setShowMotionTransfer(false)}
        onMotionGenerated={async (motionItem) => {
          const videoUrl = motionItem.url || motionItem.video_url;
          const actualDuration = videoUrl ? await getVideoDuration(videoUrl) : 5;
          const frames = Math.round(actualDuration * 30);
          const nextStartAt = createdVideos.length > 0
            ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 90))) : 0;
          setCreatedVideos(prev => [...prev, { ...motionItem, id: Date.now().toString(), startAt: nextStartAt, durationInFrames: frames, trackIndex: 0 }]);
          toast.success('Motion transfer added to timeline!');
        }}
      />

      {/* Floating action panel after image generation */}
      {lastGeneratedImage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
          onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            <img
              src={lastGeneratedImage.url}
              alt="Generated"
              className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 mb-0.5">Image Generated</p>
              <p className="text-xs text-gray-500 truncate mb-2">{lastGeneratedImage.prompt}</p>
              <div className="flex flex-wrap gap-1.5">
                {lastGeneratedImage.source === 'turnaround' ? (
                  <>
                    <button type="button" onClick={() => handleSendToTool('storyboard')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2C666E] text-white hover:bg-[#07393C] transition-colors">
                      <Clapperboard className="w-3 h-3" /> Storyboard
                    </button>
                    <button type="button" onClick={() => handleSendToTool('editimage')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2C666E]/10 text-[#2C666E] hover:bg-[#2C666E]/20 transition-colors">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button type="button" onClick={() => handleSendToTool('jumpstart')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2C666E]/10 text-[#2C666E] hover:bg-[#2C666E]/20 transition-colors">
                      <Sparkles className="w-3 h-3" /> JumpStart
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => handleSendToTool('turnaround')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2C666E] text-white hover:bg-[#07393C] transition-colors">
                      <RotateCcw className="w-3 h-3" /> Turnaround
                    </button>
                    <button type="button" onClick={() => handleSendToTool('inpaint')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2C666E]/10 text-[#2C666E] hover:bg-[#2C666E]/20 transition-colors">
                      <Eraser className="w-3 h-3" /> Inpaint
                    </button>
                    <button type="button" onClick={() => handleSendToTool('editimage')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#2C666E]/10 text-[#2C666E] hover:bg-[#2C666E]/20 transition-colors">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLastGeneratedImage(null); }}
              className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
