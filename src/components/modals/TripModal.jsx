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
import { Textarea } from '@/components/ui/textarea';
import LibraryModal from './LibraryModal';
import {
  Video,
  Play,
  Sparkles,
  Search,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Info,
  ExternalLink,
  Download,
  Plus,
  Wand2,
  Link2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

// Style presets for quick inspiration
const STYLE_PRESETS = [
  // Animation
  { id: 'anime', label: 'Anime', prompt: 'Transform into anime style with vibrant colors and cel-shaded look' },
  { id: 'ghibli', label: 'Studio Ghibli', prompt: 'Studio Ghibli animation style with soft colors, detailed backgrounds, and whimsical atmosphere' },
  { id: 'pixar', label: 'Pixar 3D', prompt: 'Pixar-style 3D animation with smooth textures and expressive characters' },
  { id: 'disney', label: 'Disney Classic', prompt: 'Classic Disney animation style with fluid movement and expressive characters' },
  { id: 'cartoon', label: 'Cartoon', prompt: 'Bold cartoon style with exaggerated expressions and vibrant colors' },
  // Artistic
  { id: 'watercolor', label: 'Watercolor', prompt: 'Soft watercolor painting style with flowing colors and artistic brushstrokes' },
  { id: 'oil-painting', label: 'Oil Painting', prompt: 'Classical oil painting style with rich textures and dramatic lighting' },
  { id: 'sketch', label: 'Pencil Sketch', prompt: 'Hand-drawn pencil sketch style with detailed line work' },
  { id: 'charcoal', label: 'Charcoal Drawing', prompt: 'Dramatic charcoal drawing with deep blacks and expressive strokes' },
  { id: 'ink-wash', label: 'Ink Wash', prompt: 'Traditional Asian ink wash painting with flowing brushwork' },
  // Cinematic
  { id: 'noir', label: 'Film Noir', prompt: 'Black and white film noir style with dramatic shadows and high contrast' },
  { id: 'vintage', label: 'Vintage Film', prompt: 'Vintage 1970s film look with warm tones, grain, and soft focus' },
  { id: '80s-vhs', label: '80s VHS', prompt: '1980s VHS aesthetic with scan lines, color bleeding, and retro feel' },
  { id: 'silent-film', label: 'Silent Film', prompt: 'Early 1900s silent film era with sepia tones and film scratches' },
  // Futuristic
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'Cyberpunk neon city aesthetic with glowing lights and futuristic elements' },
  { id: 'synthwave', label: 'Synthwave', prompt: 'Retro-futuristic synthwave aesthetic with neon grids and sunset gradients' },
  { id: 'sci-fi', label: 'Sci-Fi', prompt: 'Science fiction visual style with advanced technology and space themes' },
  // Fantasy/Genre
  { id: 'fantasy', label: 'Fantasy', prompt: 'Epic fantasy world with magical lighting and ethereal atmosphere' },
  { id: 'horror', label: 'Horror', prompt: 'Dark horror aesthetic with unsettling atmosphere and muted colors' },
  { id: 'steampunk', label: 'Steampunk', prompt: 'Victorian steampunk style with brass, gears, and steam-powered machinery' },
  // Modern
  { id: 'comic-book', label: 'Comic Book', prompt: 'Bold comic book style with halftone dots and dynamic action lines' },
  { id: 'pop-art', label: 'Pop Art', prompt: 'Andy Warhol pop art style with bold colors and repeated patterns' },
  { id: 'glitch', label: 'Glitch Art', prompt: 'Digital glitch aesthetic with data corruption and chromatic aberration' },
  { id: 'vaporwave', label: 'Vaporwave', prompt: 'Vaporwave aesthetic with pink/purple hues, Greek statues, and 90s nostalgia' },
];

/**
 * TripModal - Video Restyling with Lucy-Restyle
 */
export default function TripModal({ 
  isOpen, 
  onClose, 
  username = 'default',
  onInsert,
  isEmbedded = false
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Library State
  const [videoLibrary, setVideoLibrary] = useState([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // URL Import State
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
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
    }
  };
  
  // Prompt State
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [lastSavedVideoUrl, setLastSavedVideoUrl] = useState(null);
  const pollIntervalRef = useRef(null);

  const filteredLibrary = useMemo(() => {
    if (!searchQuery) return videoLibrary;
    const q = searchQuery.toLowerCase();
    return videoLibrary.filter(v => 
      v.title.toLowerCase().includes(q) || 
      v.source.toLowerCase().includes(q)
    );
  }, [videoLibrary, searchQuery]);

  // Handle URL Import
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    try {
      new URL(importUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsImportingUrl(true);
    try {
      const newVideo = {
        id: uuidv4(),
        title: 'Imported Video',
        url: importUrl.trim(),
        source: 'imported',
        created_at: new Date().toISOString()
      };
      
      setSelectedVideo(newVideo);
      setVideoLibrary(prev => [newVideo, ...prev]);
      setShowUrlImport(false);
      setImportUrl('');
      toast.success('Video imported successfully!');
    } catch (error) {
      toast.error('Failed to import video: ' + error.message);
    } finally {
      setIsImportingUrl(false);
    }
  };

  // Polling logic
  const pollForResult = useCallback(async (id) => {
    try {
      const response = await fetch('/api/jumpstart/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.status === 'completed' && data.videoUrl) {
        clearInterval(pollIntervalRef.current);
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setCurrentStep(3);
        toast.success('Video restyled successfully!');
      } else if (data.status === 'failed') {
        clearInterval(pollIntervalRef.current);
        setIsGenerating(false);
        toast.error('Processing failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, []);

  // Handle Restyle
  const handleRestyle = async () => {
    if (!selectedVideo) {
      toast.error('Please select a video first');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Please enter a style prompt');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Submitting restyle request...');
    
    try {
      const response = await fetch('/api/trip/restyle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: selectedVideo.url,
          prompt: prompt.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start processing');

      if (data.status === 'completed' && data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setCurrentStep(3);
      } else {
        setRequestId(data.requestId);
        setGenerationStatus('Restyling your video (1-3 minutes)...');
        pollIntervalRef.current = setInterval(() => pollForResult(data.requestId), 5000);
      }
    } catch (error) {
      console.error('Restyle error:', error);
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
          prompt: prompt || 'Restyled Video',
          username,
          model: 'lucy-restyle'
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveData.error);

      setLastSavedVideoUrl(saveData.url);
      
      const newVideo = {
        id: uuidv4(),
        title: prompt || 'Restyled Video',
        url: saveData.url,
        source: 'trip-restyle',
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

  // Restyle Again
  const handleRestyleAgain = () => {
    setGeneratedVideoUrl(null);
    setLastSavedVideoUrl(null);
    setPrompt('');
    setSelectedPreset(null);
    setCurrentStep(2);
  };

  // Start Over
  const handleStartOver = () => {
    setSelectedVideo(null);
    setGeneratedVideoUrl(null);
    setLastSavedVideoUrl(null);
    setPrompt('');
    setSelectedPreset(null);
    setCurrentStep(1);
  };

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    onClose();
  };

  // Handle preset selection
  const handlePresetSelect = (preset) => {
    if (selectedPreset?.id === preset.id) {
      setSelectedPreset(null);
      setPrompt('');
    } else {
      setSelectedPreset(preset);
      setPrompt(preset.prompt);
    }
  };

  useEffect(() => {
    if (isOpen || isEmbedded) {
      setCurrentStep(1);
      setSelectedVideo(null);
      setGeneratedVideoUrl(null);
      setLastSavedVideoUrl(null);
      setIsGenerating(false);
      setPrompt('');
      setSelectedPreset(null);
    }
  }, [isOpen, isEmbedded]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const renderContent = () => (
    <div className={`flex-1 flex flex-col overflow-hidden ${isEmbedded ? 'h-full' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b shrink-0 bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white shadow-lg">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Trip - Video Restyling</h2>
              <p className="text-slate-500 text-sm">Transform your videos with AI-powered style transfer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div 
                key={step} 
                className={`h-2 rounded-full transition-all ${
                  currentStep === step 
                    ? 'w-8 bg-gradient-to-r from-[#2C666E] to-[#07393C]' 
                    : currentStep > step 
                      ? 'w-2 bg-[#90DDF0]' 
                      : 'w-2 bg-slate-200'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Step 1: Select Source Video */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Select a Video to Restyle</h2>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowUrlImport(true)} className="gap-2">
                  <Link2 className="w-4 h-4" /> Import URL
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowLibrary(true)} className="gap-2">
                  <FolderOpen className="w-4 h-4" /> Library
                </Button>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Search library..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>

            {/* URL Import Dialog */}
            {showUrlImport && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block">Video URL</Label>
                    <Input placeholder="https://example.com/video.mp4" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} className="mb-2" />
                    <p className="text-xs text-slate-500">Enter a direct link to an MP4 video file</p>
                  </div>
                  <div className="flex flex-col gap-2 pt-6">
                    <Button size="sm" onClick={handleImportFromUrl} disabled={isImportingUrl || !importUrl.trim()}>
                      {isImportingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowUrlImport(false); setImportUrl(''); }}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2">
              {filteredLibrary.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-8">
                  <Video className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium mb-2">No videos found</p>
                  <p className="text-sm text-center max-w-sm">Import a video URL to get started</p>
                  <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setShowUrlImport(true)}>
                    <Link2 className="w-4 h-4" /> Import from URL
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredLibrary.map((video) => (
                    <div 
                      key={video.id} 
                      onClick={() => setSelectedVideo(video)}
                      className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedVideo?.id === video.id 
                          ? 'border-[#2C666E] ring-4 ring-[#90DDF0]/30' 
                          : 'border-transparent hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                        <div className="opacity-40 text-white text-[10px] font-bold uppercase">{video.source}</div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-current" />
                        </div>
                        {selectedVideo?.id === video.id && (
                          <div className="absolute top-2 right-2 bg-[#2C666E] text-white rounded-full p-1 shadow-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs font-medium text-slate-700 truncate">{video.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{video.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedVideo && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-20 aspect-video bg-slate-900 rounded-lg overflow-hidden">
                    <video src={selectedVideo.url} className="w-full h-full object-cover" muted />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{selectedVideo.title}</p>
                    <p className="text-xs text-slate-500">Selected for restyling</p>
                  </div>
                </div>
                <Button onClick={() => setCurrentStep(2)} className="gap-2 bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Style Configuration */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full">
              {/* Video Preview */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-2 block">Source Video</Label>
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                  <video src={selectedVideo?.url} controls className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Style Presets */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-3 block">Quick Style Presets</Label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedPreset?.id === preset.id
                          ? 'bg-gradient-to-r from-[#2C666E] to-[#07393C] text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-2 block">Style Description</Label>
                <Textarea
                  placeholder="Describe the style you want to apply..."
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (selectedPreset && e.target.value !== selectedPreset.prompt) {
                      setSelectedPreset(null);
                    }
                  }}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  <Info className="w-3 h-3 inline mr-1" />
                  Be specific about colors, art style, mood, and elements
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-[#90DDF0]/20 border border-[#2C666E]/30 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-[#2C666E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#07393C] mb-1">Lucy-Restyle Technology</p>
                    <p className="text-sm text-[#2C666E]">
                      Preserves original motion and camera angles while applying your style transformation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button 
                  onClick={handleRestyle}
                  disabled={isGenerating || !prompt.trim()}
                  className="gap-2 bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {generationStatus}</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Restyle Video</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Restyle Complete!
                </div>
                <p className="text-slate-600">Your video has been transformed</p>
              </div>

              {/* Side by Side Comparison */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block text-center">Original</Label>
                  <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                    <video src={selectedVideo?.url} controls className="w-full h-full object-contain" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block text-center">Restyled</Label>
                  <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg ring-2 ring-[#2C666E]">
                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Style Applied */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-slate-500 mb-1">Style Applied:</p>
                <p className="text-slate-800">{prompt}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={handleRestyleAgain} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Try Another Style
                </Button>
                
                <Button variant="outline" onClick={handleStartOver} className="gap-2">
                  <Video className="w-4 h-4" /> New Video
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveToLibrary}
                  disabled={isGenerating || lastSavedVideoUrl}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : lastSavedVideoUrl ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {lastSavedVideoUrl ? 'Saved!' : 'Save to Library'}
                </Button>

                <a
                  href={generatedVideoUrl}
                  download="trip-restyled-video.mp4"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2C666E] rounded-lg hover:bg-[#07393C]"
                >
                  <Download className="w-4 h-4" /> Download to Device
                </a>

                <a
                  href={generatedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <ExternalLink className="w-4 h-4" /> Open in New Tab
                </a>

                {onInsert && (
                  <Button 
                    onClick={handleInsertIntoEditor}
                    className="gap-2 bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]"
                  >
                    <Plus className="w-4 h-4" /> Insert into Editor
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isGenerating && currentStep === 2 && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#2C666E] to-[#07393C] animate-pulse" />
            <Wand2 className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-lg font-medium text-slate-800 mb-2">Transforming Your Video</p>
          <p className="text-sm text-slate-500">{generationStatus}</p>
          <p className="text-xs text-slate-400 mt-4">This typically takes 1-3 minutes</p>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden relative">
        {renderContent()}
      </div>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Trip - Video Restyling</DialogTitle>
            <DialogDescription>Transform your videos with AI-powered style transfer</DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
      
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect}
        mediaType="videos"
      />
    </>
  );
}
