import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  FolderOpen
} from 'lucide-react';
import LoadingModal from '@/components/canvas/LoadingModal';
import LibraryModal from './LibraryModal';

// Extend Model Options
const EXTEND_MODELS = [
  {
    id: 'seedance',
    label: '🎬 Bytedance Seedance 1.5',
    description: 'Original extend, 4-12s increments',
    durationOptions: [4, 5, 6, 8, 10, 12],
    resolution: '720p',
    supportsAudio: true,
    supportsCameraFixed: true,
  },
  {
    id: 'veo3-fast-extend',
    label: '⚡ Google Veo 3.1 Fast Extend',
    description: 'Extend up to 30s total, 7s increments',
    durationOptions: [7], // Fixed 7s extension
    resolution: '720p',
    supportsAudio: true,
    supportsCameraFixed: false,
  },
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
  const [currentStep, setCurrentStep] = useState(1);
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
  const [showLibrary, setShowLibrary] = useState(false);

  const handleLibrarySelect = (item) => {
    const url = item.url || item.video_url;
    if (url) {
      const newVideo = {
        id: uuidv4(),
        title: item.title || 'Library Video',
        url: url,
        source: 'library',
        created_at: new Date().toISOString()
      };
      setSelectedVideo(newVideo);
      setVideoLibrary(prev => [newVideo, ...prev]);
      toast.success('Video selected from library!');
      // No need to save again - already in library
    }
  };
  
  // Shared Settings
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('720p');
  
  // Extend Specific Settings
  const [extendModel, setExtendModel] = useState('seedance');
  const [duration, setDuration] = useState(5);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [cameraFixed, setCameraFixed] = useState(false);
  
  // Get current extend model config
  const currentExtendModel = EXTEND_MODELS.find(m => m.id === extendModel) || EXTEND_MODELS[0];
  
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
      await fetch('/api/library/save', {
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
      setCurrentStep(1);
      setSelectedVideo(null);
      setVideoLibrary([]);
      setSearchQuery('');
      setUrlInput('');
      setShowUrlImport(false);
      setPrompt('');
      setResolution('720p');
      setExtendModel('seedance');
      setDuration(5);
      setGenerateAudio(true);
      setCameraFixed(false);
      setIsGenerating(false);
      setGenerationStatus('');
      setRequestId(null);
      setGeneratedVideoUrl(null);
      setLastSavedVideoUrl(null);
    }
  }, [isOpen, initialMode]);

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
      const response = await fetch('/api/jumpstart/result', {
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
        setCurrentStep(3);
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
      const endpoint = mode === 'extend' ? '/api/jumpstart/extend' : '/api/jumpstart/edit';
      const body = {
        videoUrl: selectedVideo.url,
        prompt,
        resolution,
        ...(mode === 'extend' ? { 
          model: extendModel,
          duration, 
          generate_audio: generateAudio, 
          camera_fixed: cameraFixed 
        } : {})
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start processing');

      if (data.status === 'completed' && data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setCurrentStep(3);
        
        // Save generated video to library
        saveToLibrary(data.videoUrl, 'video', `${mode === 'extend' ? 'Extended' : 'Edited'} Video - ${new Date().toLocaleString()}`, `video-studio-${mode}`);
      } else {
        setRequestId(data.requestId);
        setGenerationStatus(`Processing your video (may take 1-3 minutes)...`);
        pollIntervalRef.current = setInterval(() => pollForResult(data.requestId, extendModel), 5000);
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error(error.message);
      setIsGenerating(false);
    }
  };

  // Save to Library
  const handleSaveToLibrary = async () => {
    if (!generatedVideoUrl) return;

    setIsGenerating(true);
    setGenerationStatus('Saving to your library...');

    try {
      const saveResponse = await fetch('/api/jumpstart/save-video', {
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
    setCurrentStep(2);
  };

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setCurrentStep(1);
      setSelectedVideo(null);
      setGeneratedVideoUrl(null);
      setLastSavedVideoUrl(null);
      setIsGenerating(false);
      setPrompt('');
    }
  }, [isOpen, initialMode]);

  const renderContent = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b shrink-0 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mode === 'extend' ? 'bg-[#90DDF0]/30 text-[#2C666E]' : 'bg-[#2C666E]/20 text-[#07393C]'}`}>
              {mode === 'extend' ? <Sparkles className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Video {mode === 'extend' ? 'Extend' : 'Edit'}
              </h2>
              <p className="text-slate-500 text-sm">
                {mode === 'extend' ? 'Extend video duration with AI continuation.' : 'Modify characters or details with text prompts.'}
              </p>
            </div>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setMode('extend')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'extend' ? 'bg-white shadow text-[#2C666E]' : 'text-slate-600 hover:text-slate-900'}`}>
              <Sparkles className="w-4 h-4 inline mr-1" /> Extend
            </button>
            <button onClick={() => setMode('edit')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'edit' ? 'bg-white shadow text-[#07393C]' : 'text-slate-600 hover:text-slate-900'}`}>
              <Edit3 className="w-4 h-4 inline mr-1" /> Edit
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Step 1: Select Source */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Select a Video to {mode === 'extend' ? 'Extend' : 'Edit'}</h2>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowUrlImport(true)}>
                  Import from URL
                </Button>
                <Button variant="outline" onClick={() => setShowLibrary(true)}>
                  <FolderOpen className="w-4 h-4 mr-2" /> Library
                </Button>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Search library..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
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
              {filteredLibrary.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-8">
                  <Video className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium mb-2">No videos found</p>
                  <p className="text-sm text-center">Import a video URL to get started</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowUrlImport(true)}>Import Video</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredLibrary.map((video) => (
                    <div key={video.id} onClick={() => setSelectedVideo(video)}
                      className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedVideo?.id === video.id ? 'border-blue-600 ring-4 ring-blue-100' : 'border-transparent hover:border-slate-300 shadow-sm'}`}>
                      <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                        <div className="opacity-40 text-white text-[10px] font-bold uppercase">{video.source}</div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-current" />
                        </div>
                        {selectedVideo?.id === video.id && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{video.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(video.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {currentStep === 2 && (
          <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-[500px]">
            <div className="bg-gray-100 flex items-center justify-center p-8 box-border">
              <div className="w-full max-w-xl space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-white border-4 border-slate-600 ring-1 ring-slate-300 relative box-content">
                  <video src={selectedVideo?.url} controls className="w-full h-full object-contain" />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-bold tracking-wider">SOURCE</div>
                </div>
                <p className="text-slate-600 text-sm font-medium truncate text-center">{selectedVideo?.title}</p>
              </div>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto bg-white">
              <div className="space-y-4">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${mode === 'extend' ? 'text-[#2C666E]' : 'text-[#07393C]'}`} />
                  {mode === 'extend' ? 'Action Continuation Prompt' : 'Edit Prompt'}
                </Label>
                <textarea 
                  placeholder={mode === 'extend' ? "e.g., 'The car continues driving down the sunset road...'" : "e.g., 'Change the man's shirt to red and make the sky rainy'"}
                  className="w-full h-32 p-3 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Extend Model Selector */}
              {mode === 'extend' && (
                <div className="space-y-3">
                  <Label className="text-sm font-bold">Extend Model</Label>
                  <select 
                    className="w-full p-2.5 text-sm border rounded-lg bg-slate-50 cursor-pointer" 
                    value={extendModel} 
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setExtendModel(newModel);
                      const config = EXTEND_MODELS.find(m => m.id === newModel);
                      if (config && !config.durationOptions.includes(parseInt(duration))) {
                        setDuration(config.durationOptions[0]);
                      }
                    }}
                  >
                    {EXTEND_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">{currentExtendModel.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {mode === 'extend' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">Duration</Label>
                    <select className="w-full p-2.5 text-sm border rounded-lg bg-slate-50 cursor-pointer" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}>
                      {currentExtendModel.durationOptions.map(d => <option key={d} value={d}>{d} seconds</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-bold">Resolution</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['480p', '720p'].map(res => (
                      <button key={res} onClick={() => setResolution(res)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${resolution === res ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {mode === 'extend' && currentExtendModel.supportsCameraFixed && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer" onClick={() => setCameraFixed(!cameraFixed)}>
                  <div className="flex items-center gap-3">
                    <Settings className={`w-4 h-4 ${cameraFixed ? 'text-[#2C666E]' : 'text-slate-400'}`} />
                    <div><p className="text-sm font-bold">Fixed Camera</p><p className="text-[10px] text-slate-500">Keep shot static</p></div>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-colors ${cameraFixed ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${cameraFixed ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {currentStep === 3 && (
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
        )}
      </div>

      <div className="p-4 border-t bg-white flex items-center justify-between shrink-0">
        {currentStep === 1 && (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button disabled={!selectedVideo} onClick={() => setCurrentStep(2)} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-12 px-8 font-bold rounded-xl">
              Configure {mode === 'extend' ? 'Extension' : 'Edit'} <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {currentStep === 2 && (
          <>
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
            <Button disabled={isGenerating} onClick={handleProcess} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-12 px-10 font-bold rounded-xl shadow-lg">
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Play className="w-4 h-4 fill-current" /> Run {mode === 'extend' ? 'Extend' : 'Edit'}</>}
            </Button>
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isGenerating} className="rounded-xl h-12">
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
        <LoadingModal isOpen={isGenerating && currentStep < 3} message={generationStatus} />
      </div>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Studio</DialogTitle>
            <DialogDescription>Extend or edit existing videos using AI.</DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>

      <LoadingModal isOpen={isGenerating && currentStep < 3} message={generationStatus} />
      
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect}
        mediaType="videos"
      />
    </>
  );
}
