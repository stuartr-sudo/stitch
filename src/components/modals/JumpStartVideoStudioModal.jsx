import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Video,
  Play,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Settings,
  Search,
  Loader2,
  CheckCircle2,
  Edit3,
  Download,
  Plus,
  FolderOpen,
  Volume2,
  VolumeX,
  ChevronDown,
  Wand2,
  Eye
} from 'lucide-react';
import LoadingModal from '@/components/canvas/LoadingModal';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Extend Model Options
const EXTEND_MODELS = [
  {
    id: 'luma-ray',
    label: 'Luma Dream Machine (Ray)',
    description: 'High fidelity text+image to video',
    durationOptions: [5, 10],
    resolutions: ['720p', '1080p'],
    supportsAudio: false,
    supportsCameraFixed: true,
    promptPlaceholder: "Describe the continuation — focus on camera movement, subject action, and scene mood. e.g., 'Camera slowly orbits around the subject as golden light shifts across the scene'",
    promptLabel: 'Continuation Prompt',
  },
  {
    id: 'runway-gen3',
    label: 'Runway Gen-3 Alpha',
    description: 'Cinematic quality motion',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    supportsAudio: false,
    supportsCameraFixed: true,
    promptPlaceholder: "Describe the next scene with cinematic detail — motion, lighting, emotion. e.g., 'The person turns to face the camera with a slow smile, warm backlight creating a rim glow'",
    promptLabel: 'Cinematic Direction Prompt',
  },
  {
    id: 'seedance',
    label: 'Bytedance Seedance 1.5',
    description: 'Original extend, 4-12s increments with audio support',
    durationOptions: [4, 5, 6, 8, 10, 12],
    resolutions: ['720p', '1080p'],
    supportsAudio: true,
    supportsCameraFixed: true,
    promptPlaceholder: "Describe what happens next — keep the same character, outfit, lighting, framing. e.g., 'The person continues speaking naturally, gesturing with their hands, maintaining the same casual tone'",
    promptLabel: 'Action Continuation Prompt',
  },
  {
    id: 'veo3-fast-extend',
    label: 'Google Veo 3.1 Fast Extend',
    description: 'Extend up to 30s total, 7s increments with native audio',
    durationOptions: [7], // Fixed 7s extension
    resolutions: ['720p'],
    supportsAudio: true,
    supportsCameraFixed: false,
    promptPlaceholder: "Describe the continuation with speech/audio cues if needed. e.g., 'The scene continues naturally as the person finishes their sentence and looks off into the distance'",
    promptLabel: 'Scene Extension Prompt',
  },
  {
    id: 'grok-imagine-extend',
    label: 'xAI Grok Imagine Extend',
    description: 'Extend videos 2-10s, stitches original + extension together',
    durationOptions: [2, 4, 6, 8, 10],
    resolutions: ['auto'],
    supportsAudio: false,
    supportsCameraFixed: false,
    promptPlaceholder: "Describe what should happen next in the video. e.g., 'The camera slowly zooms out to reveal the city skyline at sunset'",
    promptLabel: 'Extension Prompt',
  },
];

// Edit Model Options
const EDIT_MODELS = [
  {
    id: 'wavespeed',
    label: 'Wavespeed WAN 2.2',
    description: 'Re-style or transform your video using a text description',
    tip: 'Describe what the full scene should look like after editing. The AI will re-render your video to match your description while keeping the motion. Good for style changes, colour grading, or scene transformations.',
    resolutions: ['480p', '720p'],
    promptPlaceholder: "Describe the full scene after editing. e.g., 'A person in a red jacket walking through a snowy forest, soft natural lighting'",
  },
  {
    id: 'grok-edit',
    label: 'xAI Grok Imagine',
    description: 'Make targeted changes to your video — swap colours, add weather, change clothing',
    tip: 'Describe specific changes you want. Unlike Wavespeed (which re-renders the whole scene), Grok makes targeted edits while preserving everything else. Input video must be max 854x480 resolution and 8 seconds.',
    resolutions: ['auto', '480p', '720p'],
    promptPlaceholder: "Describe specific changes to make. e.g., 'Change the shirt colour to blue and add rain falling in the background'",
  },
  {
    id: 'bria-erase',
    label: 'Bria Video Erase',
    description: 'Remove unwanted objects from your video by describing them — the AI erases them cleanly (max 5s video)',
    tip: 'Just describe what you want removed — watermarks, background people, logos, or any object. The AI will erase it and fill in the gap naturally. Your video must be 5 seconds or shorter. Audio can be preserved.',
    resolutions: ['auto'],
    promptPlaceholder: "Describe what to remove. e.g., 'the watermark in the top right corner' or 'the person in the background'",
    isErase: true,
  },
];

// Multi-Shot Model Options
const MULTISHOT_MODELS = [
  { id: 'kling-v3', label: 'Kling V3 Pro', description: 'Native multi-shot — model handles shot composition in one call', native: true, supportsR2V: false },
  { id: 'kling-o3', label: 'Kling O3 Pro', description: 'Native multi-shot with audio support', native: true, supportsR2V: false, supportsAudio: true },
  { id: 'kling-r2v-pro', label: 'Kling O3 R2V Pro', description: 'Multi-shot with character consistency (elements)', native: true, isR2V: true },
  { id: 'veo3-fast', label: 'Veo 3.1 Fast (Assembly)', description: 'Per-shot generation + sequential assembly', native: false },
  { id: 'grok-imagine', label: 'Grok Imagine (Assembly)', description: 'Per-shot generation + sequential assembly', native: false },
];

/**
 * JumpStartVideoStudioModal - Video Edit and Extend functionality
 */
export default function JumpStartVideoStudioModal({
  isOpen,
  onClose,
  username = 'default',
  onInsert,
  initialMode = 'extend',
  isEmbedded = false
}) {
  const [mode, setMode] = useState(initialMode);
  const [activeTab, setActiveTab] = useState('source');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Library State
  const [videoLibrary, setVideoLibrary] = useState([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlImport, setShowUrlImport] = useState(false);

  // Shared Settings
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('720p');

  // Extend Specific Settings
  const [extendModel, setExtendModel] = useState('seedance');
  const [duration, setDuration] = useState(5);
  const [generateAudio, setGenerateAudio] = useState(false);
  const [cameraFixed, setCameraFixed] = useState(false);

  // Edit Specific Settings
  const [editModel, setEditModel] = useState('wavespeed');
  const [editSeed, setEditSeed] = useState(-1);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Structured prompt builder state
  const [promptMode, setPromptMode] = useState('builder'); // 'builder' | 'freeform'
  const [sceneDescription, setSceneDescription] = useState('');
  const [editStyle, setEditStyle] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editLighting, setEditLighting] = useState('');
  const [editCamera, setEditCamera] = useState('');
  const [editColorGrade, setEditColorGrade] = useState('');

  // Get current model configs
  const currentExtendModel = EXTEND_MODELS.find(m => m.id === extendModel) || EXTEND_MODELS[0];
  const currentEditModel = EDIT_MODELS.find(m => m.id === editModel) || EDIT_MODELS[0];

  // Prompt builder options
  const STYLE_OPTIONS = ['Cinematic', 'Anime', 'Photorealistic', 'Watercolor', 'Oil painting', 'Noir', 'Retro VHS', 'Cyberpunk neon', 'Studio Ghibli', 'Documentary', 'Music video', 'Fashion editorial'];
  const MOOD_OPTIONS = ['Dramatic', 'Serene', 'Energetic', 'Melancholic', 'Mysterious', 'Joyful', 'Tense', 'Romantic', 'Whimsical', 'Epic'];
  const LIGHTING_OPTIONS = ['Golden hour', 'Blue hour', 'Harsh midday sun', 'Soft diffused', 'Backlit silhouette', 'Neon glow', 'Candlelight', 'Overcast flat', 'Rim lighting', 'Chiaroscuro'];
  const CAMERA_OPTIONS = ['Static locked', 'Slow pan left', 'Slow pan right', 'Dolly in', 'Dolly out', 'Orbit around subject', 'Tracking shot', 'Handheld shake', 'Crane up', 'Crane down', 'Zoom in', 'Zoom out'];
  const COLOR_GRADE_OPTIONS = ['Warm amber', 'Cool blue', 'Teal and orange', 'Desaturated', 'High contrast B&W', 'Pastel', 'Vivid saturated', 'Faded film', 'Green tint matrix', 'Sepia'];

  // Assemble structured prompt from builder fields
  const assemblePrompt = useCallback(() => {
    const parts = [];
    if (sceneDescription.trim()) parts.push(sceneDescription.trim());
    if (editStyle) parts.push(`Style: ${editStyle}`);
    if (editMood) parts.push(`Mood: ${editMood}`);
    if (editLighting) parts.push(`Lighting: ${editLighting}`);
    if (editCamera) parts.push(`Camera: ${editCamera}`);
    if (editColorGrade) parts.push(`Color grade: ${editColorGrade}`);
    if (parts.length === 0) return '';
    // Join with periods for clear separation — models parse this well
    return parts.join('. ') + '.';
  }, [sceneDescription, editStyle, editMood, editLighting, editCamera, editColorGrade]);

  // Sync builder → freeform prompt when builder fields change
  useEffect(() => {
    if (mode === 'edit' && promptMode === 'builder') {
      const assembled = assemblePrompt();
      if (assembled) setPrompt(assembled);
    }
  }, [assemblePrompt, mode, promptMode]);

  // Multi-shot State
  const [multishotModel, setMultishotModel] = useState('kling-v3');
  const [shots, setShots] = useState([{ prompt: '', duration: 5 }, { prompt: '', duration: 5 }]);
  const [startImageUrl, setStartImageUrl] = useState('');
  const currentMultishotModel = MULTISHOT_MODELS.find(m => m.id === multishotModel) || MULTISHOT_MODELS[0];
  const totalShotDuration = shots.reduce((sum, s) => sum + (Number(s.duration) || 3), 0);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [lastSavedVideoUrl, setLastSavedVideoUrl] = useState(null);
  const pollIntervalRef = useRef(null);

  // Helper to save media to library
  const saveToLibrary = async (url, type = 'video', title = '', source = 'video-studio') => {
    try {
      await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type, title, source }),
      });
      console.log(`[VideoStudio] Saved ${type} to library`);
    } catch (err) {
      console.warn('[VideoStudio] Failed to save to library:', err);
    }
  };

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setActiveTab('source');
      setSelectedVideo(null);
      setVideoLibrary([]);
      setSearchQuery('');
      setUrlInput('');
      setShowUrlImport(false);
      setPrompt('');
      setResolution('720p');
      setExtendModel('seedance');
      setEditModel('wavespeed');
      setEditSeed(-1);
      setNegativePrompt('');
      setShowAdvanced(false);
      setPromptMode('builder');
      setSceneDescription('');
      setEditStyle('');
      setEditMood('');
      setEditLighting('');
      setEditCamera('');
      setEditColorGrade('');
      setDuration(5);
      setGenerateAudio(false);
      setCameraFixed(false);
      setIsGenerating(false);
      setGenerationStatus('');
      setRequestId(null);
      setGeneratedVideoUrl(null);
      setLastSavedVideoUrl(null);
    }
  }, [isOpen, initialMode]);

  // Auto-load videos from both generated_videos AND image_library_items on open
  useEffect(() => {
    if (!isOpen) return;
    const loadVideos = async () => {
      setIsLoadingLibrary(true);
      try {
        const results = [];

        // Load from generated_videos table
        const { data: genVideos } = await supabase
          .from('generated_videos')
          .select('id, url, thumbnail_url, title, prompt, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (genVideos?.length) {
          results.push(...genVideos.map(v => ({
            id: v.id,
            title: v.title || v.prompt || 'Video',
            url: v.url,
            thumbnail_url: v.thumbnail_url || null,
            source: 'generated',
            created_at: v.created_at
          })));
        }

        // Also load video items from image_library_items
        const { data: libVideos } = await supabase
          .from('image_library_items')
          .select('id, url, title, created_at')
          .or('url.ilike.%.mp4%,url.ilike.%.mov%,url.ilike.%.webm%,title.ilike.%video%')
          .order('created_at', { ascending: false })
          .limit(50);
        if (libVideos?.length) {
          // Deduplicate by URL
          const existingUrls = new Set(results.map(v => v.url));
          results.push(...libVideos
            .filter(v => !existingUrls.has(v.url))
            .map(v => ({
              id: v.id,
              title: v.title || 'Library Video',
              url: v.url,
              source: 'library',
              created_at: v.created_at
            }))
          );
        }

        // Sort by date descending
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (results.length) {
          setVideoLibrary(results);
        }
      } catch (err) {
        console.warn('[VideoStudio] Failed to load library:', err);
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    loadVideos();
  }, [isOpen]);

  // Import from URL
  const handleImportFromUrl = () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    const url = urlInput.trim();
    const newVideo = {
      id: uuidv4(),
      title: 'Imported Video',
      url: url,
      source: 'imported',
      created_at: new Date().toISOString()
    };

    setSelectedVideo(newVideo);
    setVideoLibrary(prev => [newVideo, ...prev]);
    setShowUrlImport(false);
    setUrlInput('');
    setActiveTab('settings');
    toast.success('Video imported!');

    // Save imported video to library
    saveToLibrary(url, 'video', `Imported Video - ${new Date().toLocaleString()}`, 'video-studio-import');
  };

  const filteredLibrary = useMemo(() => {
    if (!searchQuery) return videoLibrary;
    const q = searchQuery.toLowerCase();
    return videoLibrary.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.source.toLowerCase().includes(q)
    );
  }, [videoLibrary, searchQuery]);

  // Polling logic
  const pollForResult = useCallback(async (id, model = extendModel) => {
    try {
      const response = await apiFetch('/api/jumpstart/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, model }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.status === 'completed' && data.videoUrl) {
        clearInterval(pollIntervalRef.current);
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setActiveTab('preview');
        toast.success(`Video ${mode === 'extend' ? 'extended' : 'edited'} successfully!`);

        // Save generated video to library
        saveToLibrary(data.videoUrl, 'video', `${mode === 'extend' ? 'Extended' : 'Edited'} Video - ${new Date().toLocaleString()}`, `video-studio-${mode}`);
      } else if (data.status === 'failed') {
        clearInterval(pollIntervalRef.current);
        setIsGenerating(false);
        toast.error('Processing failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [mode]);

  // Handle Generation
  const handleProcess = async () => {
    if (!selectedVideo) {
      toast.error('Please select a video first');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Please enter a prompt describing the changes');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus(`Submitting ${mode} request...`);

    try {
      const isBriaErase = mode === 'edit' && editModel === 'bria-erase';
      const endpoint = mode === 'extend'
        ? '/api/jumpstart/extend'
        : isBriaErase
          ? '/api/jumpstart/erase'
          : '/api/jumpstart/edit';
      const body = isBriaErase ? {
        video_url: selectedVideo.url,
        prompt,
        preserve_audio: true,
        auto_trim: true,
      } : {
        videoUrl: selectedVideo.url,
        prompt,
        resolution,
        ...(mode === 'extend' ? {
          model: extendModel,
          duration,
          generate_audio: generateAudio,
          camera_fixed: cameraFixed
        } : {
          model: editModel,
          seed: editSeed,
          ...(negativePrompt.trim() ? { negativePrompt: negativePrompt.trim() } : {}),
        })
      };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start processing');

      if (data.status === 'completed' && data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setActiveTab('preview');

        // Save generated video to library
        saveToLibrary(data.videoUrl, 'video', `${mode === 'extend' ? 'Extended' : 'Edited'} Video - ${new Date().toLocaleString()}`, `video-studio-${mode}`);
      } else {
        setRequestId(data.requestId);
        setGenerationStatus(`Processing your video (may take 1-3 minutes)...`);
        const pollModel = mode === 'extend' ? extendModel : (isBriaErase ? 'bria-erase' : editModel);
        pollIntervalRef.current = setInterval(() => pollForResult(data.requestId, pollModel), 5000);
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error(error.message);
      setIsGenerating(false);
    }
  };

  // Multi-shot generation
  const handleMultishot = async () => {
    if (shots.some(s => !s.prompt.trim())) {
      toast.error('All shots need a prompt');
      return;
    }
    if (totalShotDuration > 15) {
      toast.error(`Total duration (${totalShotDuration}s) exceeds 15s maximum`);
      return;
    }

    setIsGenerating(true);
    setGenerationStatus(`Generating ${shots.length}-shot video (${totalShotDuration}s)...`);
    setGeneratedVideoUrl(null);

    try {
      const response = await apiFetch('/api/jumpstart/generate-multishot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startImageUrl: startImageUrl || null,
          model: multishotModel,
          shots: shots.map(s => ({ prompt: s.prompt.trim(), duration: Number(s.duration) || 3 })),
          aspectRatio: '16:9',
          enableAudio: false,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedVideoUrl(data.videoUrl);
      setActiveTab('preview');
      saveToLibrary(data.videoUrl, 'video', `Multi-Shot (${shots.length} shots) - ${new Date().toLocaleString()}`, 'video-studio-multishot');
    } catch (error) {
      console.error('Multi-shot error:', error);
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to Library
  const handleSaveToLibrary = async () => {
    if (!generatedVideoUrl) return;

    setIsGenerating(true);
    setGenerationStatus('Saving to your library...');

    try {
      const saveResponse = await apiFetch('/api/jumpstart/save-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: generatedVideoUrl,
          prompt: prompt || `Processed Video`,
          username,
          model: mode === 'extend' ? 'seedance-v1.5-pro' : 'wan-2.2-edit'
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveData.error);

      setLastSavedVideoUrl(saveData.url);

      // Add to local library
      const newVideo = {
        id: uuidv4(),
        title: prompt || 'Processed Video',
        url: saveData.url,
        source: mode === 'extend' ? 'extended' : 'edited',
        created_at: new Date().toISOString()
      };
      setVideoLibrary(prev => [newVideo, ...prev]);

      toast.success('Saved to library!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Insert into Editor
  const handleInsertIntoEditor = () => {
    const url = lastSavedVideoUrl || generatedVideoUrl;
    if (onInsert) onInsert(url);
    onClose();
  };

  // Iterative processing
  const handleIterate = (newMode) => {
    setSelectedVideo({
      id: uuidv4(),
      title: `Iteration of ${selectedVideo?.title}`,
      url: generatedVideoUrl,
      source: 'studio-result',
      created_at: new Date().toISOString()
    });

    setGeneratedVideoUrl(null);
    setLastSavedVideoUrl(null);
    setPrompt('');
    setMode(newMode);
    setActiveTab('settings');
  };

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    onClose();
  };

  const renderContent = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mode toggle + Tab navigation */}
      <div className="p-4 border-b shrink-0 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          {/* Mode Toggle */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setMode('extend')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'extend' ? 'bg-white shadow text-[#2C666E]' : 'text-slate-600 hover:text-slate-900'}`}>
              <Sparkles className="w-4 h-4 inline mr-1" /> Extend
            </button>
            <button onClick={() => setMode('edit')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'edit' ? 'bg-white shadow text-[#07393C]' : 'text-slate-600 hover:text-slate-900'}`}>
              <Edit3 className="w-4 h-4 inline mr-1" /> Edit
            </button>
            <button onClick={() => { setMode('multishot'); setActiveTab('settings'); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'multishot' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-900'}`}>
              <Video className="w-4 h-4 inline mr-1" /> Multi-Shot
            </button>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('source')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'source' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              Source
            </button>
            <button onClick={() => selectedVideo && setActiveTab('settings')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'} ${!selectedVideo ? 'opacity-40 cursor-not-allowed' : ''}`}>
              Settings
            </button>
            <button onClick={() => generatedVideoUrl && setActiveTab('preview')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'} ${!generatedVideoUrl ? 'opacity-40 cursor-not-allowed' : ''}`}>
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Source Tab */}
        <div className={`absolute inset-0 flex flex-col overflow-hidden ${activeTab === 'source' ? '' : 'hidden'}`}>
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Select a Video to {mode === 'extend' ? 'Extend' : 'Edit'}</h2>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowUrlImport(true)}>
                  Import from URL
                </Button>
                {filteredLibrary.length > 3 && (
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Search..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {/* URL Import */}
            {showUrlImport && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block">Video URL</Label>
                    <Input placeholder="https://example.com/video.mp4" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="mb-2" />
                    <p className="text-xs text-slate-500">Enter a direct link to an MP4 video file</p>
                  </div>
                  <div className="flex flex-col gap-2 pt-6">
                    <Button size="sm" onClick={handleImportFromUrl} disabled={!urlInput.trim()}>Import</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowUrlImport(false); setUrlInput(''); }}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2">
              {isLoadingLibrary ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">Loading your videos...</p>
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-8">
                  <Video className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium mb-2">No videos yet</p>
                  <p className="text-sm text-center mb-4">Import a video URL to get started</p>
                  <Button variant="outline" size="sm" onClick={() => setShowUrlImport(true)}>Import Video URL</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredLibrary.map((video) => (
                    <div key={video.id} onClick={() => { setSelectedVideo(video); setActiveTab('settings'); }}
                      className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:shadow-md ${selectedVideo?.id === video.id ? 'border-[#2C666E] ring-4 ring-[#90DDF0]/20' : 'border-slate-200 hover:border-slate-400'}`}>
                      <div className="aspect-video bg-slate-900 relative overflow-hidden">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title || 'Video'} className="w-full h-full object-cover" />
                        ) : video.url ? (
                          <video src={video.url} muted crossOrigin="anonymous" preload="metadata" className="w-full h-full object-cover"
                            onLoadedMetadata={(e) => { e.target.currentTime = 0.1; }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex'); }}
                          />
                        ) : null}
                        {!video.thumbnail_url && (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center absolute inset-0" style={video.url ? { display: 'none' } : {}}>
                            <Video className="w-8 h-8 text-slate-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 text-slate-900 fill-current ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/50 rounded text-[9px] text-white/80 font-medium uppercase">{video.source}</div>
                      </div>
                      <div className="p-2.5 bg-white border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{video.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(video.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Tab (extend/edit only — multi-shot has its own panel) */}
        <div className={`absolute inset-0 overflow-hidden ${activeTab === 'settings' && mode !== 'multishot' ? '' : 'hidden'}`}>
          <div className="h-full grid grid-cols-[280px_1fr] overflow-hidden">
            {/* LEFT COLUMN — Video Preview + Model & Settings */}
            <div className="bg-gray-50 p-4 overflow-y-auto border-r border-slate-200 space-y-4">
              {/* Video Preview */}
              <div className="space-y-2">
                <div className="aspect-video rounded-lg overflow-hidden shadow-md bg-black border border-slate-300 relative">
                  <video src={selectedVideo?.url} controls className="w-full h-full object-contain" />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-bold tracking-wider">SOURCE</div>
                </div>
                <p className="text-slate-500 text-[10px] font-medium truncate text-center">{selectedVideo?.title}</p>
              </div>

              {/* Model Selector */}
              {mode === 'extend' ? (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Extend Model</Label>
                  <select
                    className="w-full p-2.5 text-sm border rounded-lg bg-white cursor-pointer"
                    value={extendModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setExtendModel(newModel);
                      const config = EXTEND_MODELS.find(m => m.id === newModel);
                      if (config?.durationOptions && !config.durationOptions.includes(parseInt(duration))) {
                        setDuration(config.durationOptions[0]);
                      }
                      if (config?.resolutions && !config.resolutions.includes(resolution)) {
                        setResolution(config.resolutions[0]);
                      }
                    }}
                  >
                    {EXTEND_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">{currentExtendModel.description}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Edit Model</Label>
                  <select
                    className="w-full p-2.5 text-sm border rounded-lg bg-white cursor-pointer"
                    value={editModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setEditModel(newModel);
                      const config = EDIT_MODELS.find(m => m.id === newModel);
                      if (config && !config.resolutions.includes(resolution)) {
                        setResolution(config.resolutions[0]);
                      }
                    }}
                  >
                    {EDIT_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">{currentEditModel.description}</p>
                  {currentEditModel.tip && (
                    <div className="p-2.5 bg-[#90DDF0]/10 border border-[#2C666E]/15 rounded-lg">
                      <p className="text-[10px] text-[#07393C] leading-relaxed">
                        <span className="font-semibold">Tip: </span>{currentEditModel.tip}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution + Duration row */}
              <div className="grid grid-cols-2 gap-3">
                {mode === 'extend' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500">Duration</Label>
                    <select className="w-full p-2 text-xs border rounded-lg bg-white cursor-pointer" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
                      {(currentExtendModel.durationOptions || [5, 10]).map(d => <option key={d} value={d}>{d}s</option>)}
                    </select>
                  </div>
                )}
                <div className={`space-y-1 ${mode === 'edit' ? 'col-span-2' : ''}`}>
                  <Label className="text-[10px] font-bold text-slate-500">Resolution</Label>
                  <div className={`grid gap-1 ${(mode === 'edit' ? currentEditModel.resolutions : currentExtendModel.resolutions || ['720p', '1080p']).length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {(mode === 'edit' ? currentEditModel.resolutions : (currentExtendModel.resolutions || ['720p', '1080p'])).map(res => (
                      <button key={res} onClick={() => setResolution(res)}
                        className={`py-1 text-[10px] font-bold rounded-md border transition-all ${resolution === res ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'}`}>
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extend-specific toggles */}
              {mode === 'extend' && (currentExtendModel.supportsAudio || currentExtendModel.supportsCameraFixed) && (
                <div className="space-y-2">
                  {currentExtendModel.supportsAudio && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 cursor-pointer" onClick={() => setGenerateAudio(!generateAudio)}>
                      <div className="flex items-center gap-2">
                        {generateAudio ? <Volume2 className="w-3.5 h-3.5 text-[#2C666E]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-xs font-bold">Audio</span>
                      </div>
                      <div className={`w-8 h-5 rounded-full relative transition-colors ${generateAudio ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${generateAudio ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  )}
                  {currentExtendModel.supportsCameraFixed && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 cursor-pointer" onClick={() => setCameraFixed(!cameraFixed)}>
                      <div className="flex items-center gap-2">
                        <Settings className={`w-3.5 h-3.5 ${cameraFixed ? 'text-[#2C666E]' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">Fixed Camera</span>
                      </div>
                      <div className={`w-8 h-5 rounded-full relative transition-colors ${cameraFixed ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${cameraFixed ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit-specific: Advanced Settings */}
              {mode === 'edit' && (
                <div className="space-y-2">
                  <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    Advanced Settings
                  </button>
                  {showAdvanced && (
                    <div className="space-y-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500">Seed</Label>
                        <Input type="number" value={editSeed} onChange={(e) => setEditSeed(parseInt(e.target.value) || -1)} className="h-8 text-xs" placeholder="-1 for random" />
                        <p className="text-[10px] text-slate-400">Use -1 for random, or set a number for reproducibility</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500">Negative Prompt</Label>
                        <textarea
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="blur, distorted, low quality, watermark..."
                          className="w-full h-16 p-2 text-xs border rounded-lg bg-slate-50 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN — Prompt Builder */}
            <div className="p-4 overflow-y-auto bg-white space-y-4">
              {/* Prompt mode toggle */}
              {mode === 'edit' && !currentEditModel.isErase && (
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    <button onClick={() => setPromptMode('builder')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${promptMode === 'builder' ? 'bg-white shadow text-[#07393C]' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Wand2 className="w-3 h-3" /> Builder
                    </button>
                    <button onClick={() => setPromptMode('freeform')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${promptMode === 'freeform' ? 'bg-white shadow text-[#07393C]' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Edit3 className="w-3 h-3" /> Freeform
                    </button>
                  </div>
                  {promptMode === 'builder' && prompt && (
                    <button onClick={() => { setPromptMode('freeform'); }} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> View assembled prompt
                    </button>
                  )}
                </div>
              )}

              {/* Builder Mode (Edit only) */}
              {mode === 'edit' && promptMode === 'builder' && !currentEditModel.isErase && (
                <div className="space-y-4">
                  {/* Scene Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#07393C]" /> Scene Description
                    </Label>
                    <textarea
                      placeholder="Describe the full scene after editing. Be specific about subjects, actions, environment, and details you want preserved or changed."
                      className="w-full h-24 p-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#2C666E] bg-slate-50 resize-none"
                      value={sceneDescription}
                      onChange={(e) => setSceneDescription(e.target.value)}
                    />
                  </div>

                  {/* Style Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Style</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {STYLE_OPTIONS.map(s => (
                        <button key={s} onClick={() => setEditStyle(editStyle === s ? '' : s)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${editStyle === s ? 'bg-[#07393C] text-white border-[#07393C]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mood Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mood</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOOD_OPTIONS.map(m => (
                        <button key={m} onClick={() => setEditMood(editMood === m ? '' : m)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${editMood === m ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lighting Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lighting</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {LIGHTING_OPTIONS.map(l => (
                        <button key={l} onClick={() => setEditLighting(editLighting === l ? '' : l)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${editLighting === l ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Camera Movement</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CAMERA_OPTIONS.map(c => (
                        <button key={c} onClick={() => setEditCamera(editCamera === c ? '' : c)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${editCamera === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Grade Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Grade</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_GRADE_OPTIONS.map(cg => (
                        <button key={cg} onClick={() => setEditColorGrade(editColorGrade === cg ? '' : cg)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${editColorGrade === cg ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                          {cg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assembled prompt preview */}
                  {prompt && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Assembled Prompt</Label>
                      <p className="text-xs text-slate-600 leading-relaxed">{prompt}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Freeform Mode or Extend Mode or Erase Mode */}
              {(mode === 'extend' || promptMode === 'freeform' || currentEditModel?.isErase) && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-2 text-slate-700">
                    <Sparkles className={`w-3.5 h-3.5 ${mode === 'extend' ? 'text-[#2C666E]' : 'text-[#07393C]'}`} />
                    {mode === 'extend' ? (currentExtendModel.promptLabel || 'Action Continuation Prompt') : currentEditModel?.isErase ? 'What to Remove' : 'Edit Prompt'}
                  </Label>
                  <textarea
                    placeholder={mode === 'extend'
                      ? (currentExtendModel.promptPlaceholder || "Describe what happens next...")
                      : (currentEditModel.promptPlaceholder || "Describe the full scene after editing...")}
                    className="w-full h-40 p-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#2C666E] bg-slate-50 resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  {mode === 'extend' && (
                    <p className="text-[10px] text-slate-400">Be specific about subject actions, camera movement, and scene details for best results.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Shot Settings */}
        {mode === 'multishot' && activeTab === 'settings' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="h-full grid grid-cols-[280px_1fr] overflow-hidden">
              {/* Left column — Model + Config */}
              <div className="bg-gray-50 p-4 overflow-y-auto border-r border-slate-200 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Multi-Shot Model</Label>
                  <select
                    className="w-full p-2.5 text-sm border rounded-lg bg-white cursor-pointer"
                    value={multishotModel}
                    onChange={(e) => setMultishotModel(e.target.value)}
                  >
                    {MULTISHOT_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">{currentMultishotModel.description}</p>
                  {currentMultishotModel.native && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">Native Multi-Shot</span>
                  )}
                  {!currentMultishotModel.native && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Assembly Fallback</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Start Image URL</Label>
                  <Input
                    placeholder="https://... (optional first frame)"
                    value={startImageUrl}
                    onChange={(e) => setStartImageUrl(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-slate-400">Optional — provides visual starting point for shot 1.</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Total Duration</span>
                    <span className={`text-sm font-bold ${totalShotDuration > 15 ? 'text-red-600' : 'text-slate-800'}`}>
                      {totalShotDuration}s / 15s
                    </span>
                  </div>
                  {totalShotDuration > 15 && (
                    <p className="text-[10px] text-red-600 font-medium">Exceeds 15s maximum — reduce shot durations.</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Shots</span>
                    <span className="text-sm font-medium text-slate-700">{shots.length}</span>
                  </div>
                </div>
              </div>

              {/* Right column — Shot editor */}
              <div className="p-4 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800">Shot Direction</h3>
                  <button
                    onClick={() => shots.length < 6 && setShots(prev => [...prev, { prompt: '', duration: 3 }])}
                    disabled={shots.length >= 6}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3 inline mr-1" /> Add Shot
                  </button>
                </div>

                {shots.map((shot, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Shot {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-500">Duration</label>
                        <select
                          value={shot.duration}
                          onChange={(e) => {
                            const updated = [...shots];
                            updated[idx] = { ...updated[idx], duration: Number(e.target.value) };
                            setShots(updated);
                          }}
                          className="w-16 p-1 text-xs border rounded bg-slate-50"
                        >
                          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(d => (
                            <option key={d} value={d}>{d}s</option>
                          ))}
                        </select>
                        {shots.length > 2 && (
                          <button
                            onClick={() => setShots(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Remove shot"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      placeholder={`Describe shot ${idx + 1} — subject action, camera movement, scene details...`}
                      value={shot.prompt}
                      onChange={(e) => {
                        const updated = [...shots];
                        updated[idx] = { ...updated[idx], prompt: e.target.value };
                        setShots(updated);
                      }}
                      className="w-full h-24 p-2.5 text-sm border rounded-lg bg-slate-50 resize-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        <div className={`absolute inset-0 flex flex-col overflow-hidden ${activeTab === 'preview' ? '' : 'hidden'}`}>
          <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-white relative border-4 border-slate-600 ring-1 ring-slate-300 box-content">
                {generatedVideoUrl ? (
                  <video key={generatedVideoUrl} src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin" />
                    <p>Finalizing...</p>
                  </div>
                )}
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETE
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border-t border-slate-700 p-6">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-white font-bold">Iterative Processing</h3>
                  <p className="text-slate-400 text-xs">Continue refining with the generated video as source.</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleIterate('extend')} variant="outline" className="bg-transparent text-white border-[#90DDF0]/50 hover:bg-[#90DDF0]/10 gap-2 h-11">
                    <Sparkles className="w-4 h-4 text-[#90DDF0]" /> Extend Again
                  </Button>
                  <Button onClick={() => handleIterate('edit')} variant="outline" className="bg-transparent text-white border-blue-500/50 hover:bg-blue-500/10 gap-2 h-11">
                    <Edit3 className="w-4 h-4 text-blue-400" /> Edit Video
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t bg-white flex items-center justify-between shrink-0">
        {activeTab === 'source' && (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <p className="text-xs text-slate-400">{filteredLibrary.length > 0 ? 'Click a video to configure' : 'Import a video to get started'}</p>
          </>
        )}

        {activeTab === 'settings' && mode !== 'multishot' && (
          <>
            <Button variant="outline" onClick={() => setActiveTab('source')} className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
            <Button disabled={isGenerating} onClick={handleProcess} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-12 px-10 font-bold rounded-xl shadow-lg">
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Play className="w-4 h-4 fill-current" /> Run {mode === 'extend' ? 'Extend' : 'Edit'}</>}
            </Button>
          </>
        )}

        {activeTab === 'settings' && mode === 'multishot' && (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              disabled={isGenerating || totalShotDuration > 15 || shots.some(s => !s.prompt.trim())}
              onClick={handleMultishot}
              className="bg-purple-700 hover:bg-purple-800 text-white gap-2 h-12 px-10 font-bold rounded-xl shadow-lg"
            >
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating {shots.length} shots...</> : <><Video className="w-4 h-4" /> Generate Multi-Shot ({totalShotDuration}s)</>}
            </Button>
          </>
        )}

        {activeTab === 'preview' && (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('settings')} disabled={isGenerating} className="rounded-xl h-12">
                <ArrowLeft className="w-4 h-4 mr-2" /> Adjust Settings
              </Button>
              <a
                href={generatedVideoUrl}
                download="stitch-video.mp4"
                className="inline-flex items-center justify-center gap-2 px-4 h-12 text-sm font-medium text-white bg-[#2C666E] rounded-xl hover:bg-[#07393C]"
              >
                <Download className="w-4 h-4" /> Download to Device
              </a>
              <Button variant="outline" onClick={handleSaveToLibrary} disabled={isGenerating || lastSavedVideoUrl} className="rounded-xl h-12 border-green-200 text-green-700 hover:bg-green-50">
                {lastSavedVideoUrl ? 'Saved!' : 'Save to Library'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} className="h-12 font-bold">Done</Button>
              {onInsert && (
                <Button onClick={handleInsertIntoEditor} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-10 font-bold rounded-xl shadow-lg">
                  <Plus className="w-4 h-4" /> Add to Editor
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {renderContent()}
        <LoadingModal isOpen={isGenerating && activeTab !== 'preview'} message={generationStatus} />
      </div>
    );
  }

  return (
    <>
      <SlideOverPanel
        open={isOpen}
        onOpenChange={(open) => !open && handleClose()}
        title="Video Studio"
        subtitle="Edit and extend your videos"
        icon={<Video className="w-5 h-5" />}
      >
        {renderContent()}
      </SlideOverPanel>

      <LoadingModal isOpen={isGenerating && activeTab !== 'preview'} message={generationStatus} />
    </>
  );
}
