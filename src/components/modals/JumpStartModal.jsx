import React, { useState, useRef, useEffect } from 'react';
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
import {
  Upload,
  Link,
  Image as ImageIcon,
  Download,
  X,
  Video,
  Play,
  Clock,
  ArrowRight,
  ArrowLeft,
  Camera,
  Move,
  Sparkles,
  FolderOpen,
  Lock,
  Volume2,
  VolumeX
} from 'lucide-react';
import LoadingModal from '@/components/canvas/LoadingModal';
import LibraryModal from './LibraryModal';

// Video Generation Models
const VIDEO_MODELS = [
  { 
    id: 'wavespeed-wan', 
    label: '🚀 Wavespeed WAN 2.2 Spicy', 
    description: 'Fast generation, good quality',
    provider: 'wavespeed',
    durationOptions: [4, 5, 6, 8],
    resolutions: ['480p', '720p'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  { 
    id: 'grok-imagine', 
    label: '🤖 Grok Imagine Video (xAI)', 
    description: 'High quality with audio generation',
    provider: 'fal',
    durationOptions: [4, 6, 8, 10, 12, 15],
    resolutions: ['480p', '720p'],
    aspectRatios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:2', '2:3', '3:4'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  { 
    id: 'seedance-pro', 
    label: '🎬 Bytedance Seedance 1.5 Pro', 
    description: 'High quality, 1080p, audio & end frame',
    provider: 'fal',
    durationOptions: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    resolutions: ['480p', '720p', '1080p'],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsEndFrame: true,
  },
];

// Aspect ratio labels
const ASPECT_RATIO_LABELS = {
  'auto': 'Auto (Best Fit)',
  '21:9': 'Cinematic (21:9)',
  '16:9': 'Landscape (16:9)',
  '9:16': 'Portrait (9:16)',
  '1:1': 'Square (1:1)',
  '4:3': 'Standard (4:3)',
  '3:2': 'Photo (3:2)',
  '2:3': 'Portrait Photo (2:3)',
  '3:4': 'Portrait Standard (3:4)',
};

// Camera Movement Presets
const CAMERA_MOVEMENTS = [
  { value: '', label: 'No Movement' },
  // Realistic / Natural (Best for UGC/Selfie)
  { value: 'static-stable', label: '📱 Static/Stable (Selfie)' },
  { value: 'subtle-handheld', label: '🤳 Subtle Handheld Shake' },
  { value: 'natural-breathing', label: '😮‍💨 Natural Breathing Motion' },
  { value: 'gentle-sway', label: '🌊 Gentle Natural Sway' },
  // Zoom
  { value: 'slow zoom in', label: 'Slow Zoom In' },
  { value: 'slow zoom out', label: 'Slow Zoom Out' },
  { value: 'fast zoom in', label: 'Fast Zoom (Punch In)' },
  { value: 'dolly zoom', label: 'Dolly Zoom (Vertigo)' },
  // Pan
  { value: 'pan left to right', label: 'Pan Left to Right' },
  { value: 'pan right to left', label: 'Pan Right to Left' },
  { value: 'slow pan', label: 'Slow Pan' },
  // Tilt
  { value: 'tilt up', label: 'Tilt Up' },
  { value: 'tilt down', label: 'Tilt Down' },
  { value: 'tilt up reveal', label: 'Tilt Up Reveal' },
  // Dolly/Track
  { value: 'dolly forward', label: 'Dolly Forward' },
  { value: 'dolly backward', label: 'Dolly Backward' },
  { value: 'tracking shot', label: 'Tracking Shot (Follow)' },
  { value: 'lateral track', label: 'Lateral Tracking' },
  // Complex
  { value: 'orbit', label: 'Orbit Around Subject' },
  { value: 'crane up', label: 'Crane Up' },
  { value: 'crane down', label: 'Crane Down' },
  { value: 'handheld following', label: 'Handheld Following' },
];

// Camera Angle Presets
const CAMERA_ANGLES = [
  { value: '', label: 'Default Angle' },
  // Realistic / Selfie (Best for UGC)
  { value: 'selfie-closeup', label: '🤳 Selfie Close-up' },
  { value: 'talking-head', label: '🗣️ Talking Head' },
  { value: 'vlog-style', label: '📱 Vlog Style' },
  { value: 'webcam-angle', label: '💻 Webcam Angle' },
  // Standard
  { value: 'eye level', label: 'Eye Level' },
  { value: 'low angle', label: 'Low Angle (Hero)' },
  { value: 'high angle', label: 'High Angle' },
  { value: 'dutch angle', label: 'Dutch Angle (Tilted)' },
  // Wide
  { value: 'wide shot', label: 'Wide Shot' },
  { value: 'medium shot', label: 'Medium Shot' },
  { value: 'close up', label: 'Close Up' },
  { value: 'extreme close up', label: 'Extreme Close Up' },
  // Special
  { value: 'birds eye', label: "Bird's Eye View" },
  { value: 'worms eye', label: "Worm's Eye View" },
  { value: 'over the shoulder', label: 'Over the Shoulder' },
  { value: 'point of view', label: 'POV (First Person)' },
];

// Video Style Presets
const VIDEO_STYLES = [
  { value: '', label: 'Default' },
  // Realistic / UGC (Best for authentic content)
  { value: 'iphone-selfie', label: '📱 iPhone Selfie (Raw)', prompt: 'raw iPhone selfie video, front-facing camera, handheld smartphone footage, natural ambient lighting, authentic candid moment, realistic skin texture, unfiltered unedited look, genuine facial expression' },
  { value: 'ugc-testimonial', label: '🎤 UGC Testimonial', prompt: 'user generated content, authentic testimonial video, real person talking naturally, genuine emotion, casual setting, believable and relatable' },
  { value: 'tiktok-style', label: '📲 TikTok/Reels Style', prompt: 'vertical social media video, engaging and dynamic, quick natural movements, relatable content creator vibe' },
  { value: 'facetime-call', label: '📞 FaceTime/Video Call', prompt: 'video call aesthetic, slightly pixelated, casual conversation, natural webcam lighting, authentic remote communication feel' },
  // Professional
  { value: 'cinematic', label: '🎬 Cinematic', prompt: 'cinematic quality, professional lighting, dramatic composition, shallow depth of field, film-like color grading' },
  { value: 'documentary', label: '📹 Documentary', prompt: 'documentary style, natural movement, observational, authentic moments, journalistic approach' },
  { value: 'commercial', label: '📺 Commercial/Ad', prompt: 'commercial quality, polished, professional, product-focused, aspirational' },
  { value: 'product-demo', label: '📦 Product Demo', prompt: 'product demonstration, clean background, professional presentation, clear and informative' },
  // Artistic
  { value: 'dreamy', label: '✨ Dreamy/Ethereal', prompt: 'dreamy ethereal quality, soft focus, glowing highlights, romantic atmosphere' },
  { value: 'vintage', label: '📼 Vintage/Retro', prompt: 'vintage film look, nostalgic, warm tones, slight grain, retro aesthetic' },
  { value: 'noir', label: '🎞️ Film Noir', prompt: 'film noir style, high contrast, dramatic shadows, moody atmosphere' },
  { value: 'anime', label: '🎌 Anime Style', prompt: 'anime inspired, vibrant colors, expressive, dynamic movement' },
];

// Effect Combos (Quick Presets)
const EFFECT_COMBOS = [
  { id: 'realistic', label: '🤳 Realistic/Raw', effects: ['natural lighting', 'subtle skin texture', 'authentic movement'] },
  { id: 'cinematic', label: '🎬 Cinematic', effects: ['film grain', 'lens flare', 'bokeh blur'] },
  { id: 'dreamy', label: '✨ Dreamy', effects: ['soft glow', 'bokeh blur', 'floating particles'] },
  { id: 'vintage', label: '📼 Vintage', effects: ['film grain', 'vignette', 'warm tones'] },
  { id: 'dynamic', label: '⚡ Dynamic', effects: ['motion blur', 'lens flare', 'light rays'] },
];

// Special Effects (Categorized)
const SPECIAL_EFFECTS = [
  // Realistic
  { value: 'natural lighting', label: 'Natural Lighting', category: 'realistic' },
  { value: 'subtle skin texture', label: 'Subtle Skin Texture', category: 'realistic' },
  { value: 'authentic movement', label: 'Authentic Movement', category: 'realistic' },
  { value: 'soft focus', label: 'Soft Focus', category: 'realistic' },
  // Light
  { value: 'lens flare', label: 'Lens Flare', category: 'light' },
  { value: 'bokeh blur', label: 'Bokeh Blur', category: 'light' },
  { value: 'soft glow', label: 'Soft Glow', category: 'light' },
  { value: 'light rays', label: 'Light Rays', category: 'light' },
  { value: 'neon glow', label: 'Neon Glow', category: 'light' },
  { value: 'dappled sunlight', label: 'Dappled Sunlight', category: 'light' },
  // Film
  { value: 'film grain', label: 'Film Grain', category: 'film' },
  { value: 'vignette', label: 'Vignette', category: 'film' },
  { value: 'chromatic aberration', label: 'Chromatic Aberration', category: 'film' },
  { value: 'motion blur', label: 'Motion Blur', category: 'film' },
  { value: 'warm tones', label: 'Warm Tones', category: 'film' },
  // Particles
  { value: 'floating particles', label: 'Floating Particles', category: 'particles' },
  { value: 'dust motes', label: 'Dust Motes', category: 'particles' },
  { value: 'sparkles', label: 'Sparkles', category: 'particles' },
  { value: 'floating embers', label: 'Floating Embers', category: 'particles' },
  // Nature
  { value: 'wind in hair', label: 'Wind in Hair', category: 'nature' },
  { value: 'rain', label: 'Rain', category: 'nature' },
  { value: 'snow falling', label: 'Snow', category: 'nature' },
  { value: 'fog mist', label: 'Fog/Mist', category: 'nature' },
];

// Description Presets (for realistic videos)
const DESCRIPTION_PRESETS = [
  { id: 'authentic', label: '🤳 Authentic/Raw', prompt: 'real person, genuine emotion, natural lighting, unfiltered, believable, authentic' },
  { id: 'talking', label: '🗣️ Talking Natural', prompt: 'person talking naturally, conversational, casual, relaxed body language, genuine expression' },
  { id: 'testimonial', label: '⭐ Testimonial', prompt: 'honest testimonial, sharing experience, enthusiastic but authentic, relatable' },
  { id: 'product', label: '📦 Product Showcase', prompt: 'showing product naturally, demonstrating features, genuine reaction, hands visible' },
  { id: 'lifestyle', label: '🌟 Lifestyle', prompt: 'lifestyle content, aspirational yet achievable, natural setting, warm atmosphere' },
];

/**
 * JumpStartModal - Image to Video Generation (Simplified)
 */
export default function JumpStartModal({ 
  isOpen, 
  onClose, 
  username = 'default',
  onVideoGenerated,
  isEmbedded = false
}) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Image upload
  const [uploadedImage, setUploadedImage] = useState(null);
  const [endFrameImage, setEndFrameImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showEndFrameUrlImport, setShowEndFrameUrlImport] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState('start'); // 'start' or 'end'
  const [urlInput, setUrlInput] = useState('');
  
  // Video settings
  const [videoModel, setVideoModel] = useState('wavespeed-wan');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(5);
  const [cameraMovement, setCameraMovement] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [videoStyle, setVideoStyle] = useState('');
  const [specialEffects, setSpecialEffects] = useState([]);
  const [sceneDescription, setSceneDescription] = useState('');
  const [description, setDescription] = useState('');
  
  // Model-specific settings
  const [enableAudio, setEnableAudio] = useState(true);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [cameraFixed, setCameraFixed] = useState(false);
  
  // Generated video
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [hasAddedToEditor, setHasAddedToEditor] = useState(false);
  
  const fileInputRef = useRef(null);
  const endFrameInputRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Get current model config
  const currentModel = VIDEO_MODELS.find(m => m.id === videoModel) || VIDEO_MODELS[0];

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setUploadedImage(null);
      setEndFrameImage(null);
      setIsLoading(false);
      setLoadingMessage('');
      setShowUrlImport(false);
      setShowEndFrameUrlImport(false);
      setUrlInput('');
      setVideoModel('wavespeed-wan');
      setAspectRatio('16:9');
      setResolution('720p');
      setDuration(5);
      setCameraMovement('');
      setCameraAngle('');
      setVideoStyle('');
      setSpecialEffects([]);
      setSceneDescription('');
      setDescription('');
      setEnableAudio(true);
      setAudioTranscript('');
      setCameraFixed(false);
      setGeneratedVideoUrl(null);
      setHasAddedToEditor(false);
    }
  }, [isOpen]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleModelChange = (newModelId) => {
    const newModel = VIDEO_MODELS.find(m => m.id === newModelId);
    if (!newModel) return;
    
    setVideoModel(newModelId);
    
    // Reset aspect ratio if not supported
    if (!newModel.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(newModel.aspectRatios[0]);
    }
    
    // Reset resolution if not supported
    if (!newModel.resolutions.includes(resolution)) {
      setResolution(newModel.resolutions[0]);
    }
    
    // Reset duration if not in options
    if (!newModel.durationOptions.includes(duration)) {
      setDuration(newModel.durationOptions[0]);
    }
    
    // Reset audio if not supported
    if (!newModel.supportsAudio) {
      setEnableAudio(false);
      setAudioTranscript('');
    } else {
      setEnableAudio(true);
    }
    
    // Reset end frame if not supported
    if (!newModel.supportsEndFrame) {
      setEndFrameImage(null);
    }
    
    // Reset camera fixed if not supported
    if (!newModel.supportsCameraFixed) {
      setCameraFixed(false);
    }
  };

  const handleFileUpload = (e, target = 'start') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (target === 'start') {
        setUploadedImage(event.target.result);
      } else {
        setEndFrameImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlImport = (target = 'start') => {
    if (!urlInput.trim()) return;
    
    if (target === 'start') {
      setUploadedImage(urlInput.trim());
      setShowUrlImport(false);
    } else {
      setEndFrameImage(urlInput.trim());
      setShowEndFrameUrlImport(false);
    }
    setUrlInput('');
  };

  const handleLibrarySelect = (item) => {
    const url = item.image_url || item.url;
    if (libraryTarget === 'start') {
      setUploadedImage(url);
    } else {
      setEndFrameImage(url);
    }
    setShowLibrary(false);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const buildPrompt = () => {
    const parts = [];
    
    // Scene description first (most important)
    if (sceneDescription.trim()) {
      parts.push(sceneDescription.trim());
    }
    
    // Video style with prompt
    const styleConfig = VIDEO_STYLES.find(s => s.value === videoStyle);
    if (styleConfig?.prompt) {
      parts.push(styleConfig.prompt);
    }
    
    // Description/motion preset
    if (description.trim()) {
      parts.push(description.trim());
    }
    
    // Camera movement (skip for realistic styles to preserve authenticity)
    const isRealisticStyle = ['iphone-selfie', 'ugc-testimonial', 'tiktok-style', 'facetime-call'].includes(videoStyle);
    if (cameraMovement && !isRealisticStyle) {
      parts.push(cameraMovement);
    } else if (cameraMovement && isRealisticStyle && cameraMovement.includes('subtle')) {
      parts.push('subtle natural movement');
    }
    
    // Camera angle
    if (cameraAngle) {
      parts.push(`${cameraAngle} shot`);
    }
    
    // Special effects
    if (specialEffects.length > 0) {
      parts.push(specialEffects.join(', '));
    }
    
    // Quality boosters for realistic styles
    if (isRealisticStyle) {
      parts.push('photorealistic, authentic, believable, natural motion');
    }
    
    // Aspect ratio hint
    if (aspectRatio !== 'auto') {
      const isPortrait = ['9:16', '3:4', '2:3'].includes(aspectRatio);
      parts.push(isPortrait ? 'vertical portrait video' : 'horizontal video');
    }
    
    return parts.join(', ') || 'smooth natural motion, high quality video';
  };

  const pollForResult = async (requestId, model) => {
    try {
      const response = await fetch('/api/jumpstart/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, model }),
      });

      if (!response.ok) throw new Error('Failed to check status');

      const data = await response.json();
      
      if (data.queuePosition) {
        setLoadingMessage(`In queue (position ${data.queuePosition})...`);
      }
      
      if (data.status === 'completed') {
        stopPolling();
        setIsLoading(false);
        setGeneratedVideoUrl(data.videoUrl);
        setCurrentStep(3);
        setHasAddedToEditor(false);
        toast.success('Video generated successfully!');
      } else if (data.status === 'failed') {
        stopPolling();
        setIsLoading(false);
        toast.error(data.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleGenerateVideo = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }

    setIsLoading(true);
    const prompt = buildPrompt();
    const modelName = currentModel.label;
    setLoadingMessage(`${modelName} is generating your video...`);

    try {
      // Convert image to blob if it's a data URL
      let imageBlob;
      if (uploadedImage.startsWith('data:')) {
        const response = await fetch(uploadedImage);
        imageBlob = await response.blob();
      } else {
        // For URLs, fetch the image
        const response = await fetch(uploadedImage);
        imageBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');
      formData.append('prompt', prompt);
      formData.append('model', videoModel);
      formData.append('resolution', resolution);
      formData.append('duration', duration.toString());
      formData.append('aspectRatio', aspectRatio);
      formData.append('username', username);
      
      // Model-specific settings
      if (currentModel.supportsAudio) {
        formData.append('enableAudio', enableAudio.toString());
        if (enableAudio && audioTranscript.trim()) {
          formData.append('audioTranscript', audioTranscript.trim());
        }
      }
      
      if (currentModel.supportsCameraFixed) {
        formData.append('cameraFixed', cameraFixed.toString());
      }
      
      if (currentModel.supportsEndFrame && endFrameImage) {
        formData.append('endImageUrl', endFrameImage);
      }

      console.log('[JumpStart] Generating with:', { model: videoModel, aspectRatio, resolution, duration, enableAudio });

      const result = await fetch('/api/jumpstart/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }

      if (data.videoUrl) {
        // Immediate result
        setIsLoading(false);
        setGeneratedVideoUrl(data.videoUrl);
        setCurrentStep(3);
        setHasAddedToEditor(false);
        toast.success('Video generated!');
        
        if (onVideoGenerated) {
          onVideoGenerated(data.videoUrl, `JumpStart - ${videoStyle || 'Video'}`, 'jumpstart');
        }
      } else if (data.requestId) {
        // Start polling
        setLoadingMessage(`${modelName} is processing...`);
        pollForResult(data.requestId, videoModel);
        pollIntervalRef.current = setInterval(() => {
          pollForResult(data.requestId, videoModel);
        }, 3000);
      } else {
        throw new Error('No request ID returned');
      }
    } catch (error) {
      console.error('Generate error:', error);
      stopPolling();
      setIsLoading(false);
      toast.error(error.message || 'Failed to generate video');
    }
  };

  const handleDownloadVideo = () => {
    if (!generatedVideoUrl) return;
    
    const link = document.createElement('a');
    link.download = 'jumpstart-video.mp4';
    link.href = generatedVideoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  const handleAddToEditor = () => {
    if (generatedVideoUrl && onVideoGenerated && !hasAddedToEditor) {
      onVideoGenerated(generatedVideoUrl, `JumpStart - ${videoStyle || 'Video'}`, 'jumpstart');
      setHasAddedToEditor(true);
      toast.success('Video added to your collection!');
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2C666E] rounded-lg">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">JumpStart - Image to Video</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">Transform your image into an animated video</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="p-3 bg-white border-b flex items-center justify-center gap-8">
            {[
              { num: 1, label: 'Upload Image' },
              { num: 2, label: 'Video Settings' },
              { num: 3, label: 'Preview' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className={`flex items-center gap-2 ${currentStep === step.num ? 'text-[#07393C] font-semibold' : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === step.num ? 'bg-[#2C666E] text-white' : 
                    currentStep > step.num ? 'bg-[#90DDF0] text-[#07393C]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.num}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < 2 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </React.Fragment>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {/* Step 1: Upload Image */}
            {currentStep === 1 && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Model Selector */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Select AI Model</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {VIDEO_MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          videoModel === model.id
                            ? 'border-[#2C666E] bg-[#2C666E]/10'
                            : 'border-gray-200 bg-white hover:border-[#2C666E]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{model.label}</span>
                          {videoModel === model.id && (
                            <span className="text-xs bg-[#2C666E] text-white px-2 py-0.5 rounded">Selected</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {model.durationOptions[0]}-{model.durationOptions[model.durationOptions.length - 1]}s
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">{model.resolutions.join(', ')}</span>
                          {model.supportsAudio && (
                            <span className="text-xs bg-[#90DDF0]/30 text-[#07393C] px-1.5 py-0.5 rounded">🔊 Audio</span>
                          )}
                          {model.supportsEndFrame && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">🎯 End Frame</span>
                          )}
                          {model.supportsCameraFixed && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">📍 Lock Camera</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Image Upload */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Upload Start Image</h3>
                  </div>
                  
                  {uploadedImage ? (
                    <div className="relative">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="w-full max-h-[300px] object-contain rounded-lg border bg-gray-100" 
                      />
                      <button 
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors"
                      >
                        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 10MB</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setShowUrlImport(true)}
                        >
                          <Link className="w-4 h-4 mr-2" />
                          Import from URL
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => { setLibraryTarget('start'); setShowLibrary(true); }}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          From Library
                        </Button>
                      </div>
                      
                      {showUrlImport && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste image URL..."
                            className="flex-1"
                          />
                          <Button onClick={() => handleUrlImport('start')}>Import</Button>
                          <Button variant="ghost" onClick={() => setShowUrlImport(false)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'start')}
                  />
                </div>

                {/* End Frame (Seedance only) */}
                {currentModel.supportsEndFrame && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">End Frame Image</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Optional - Seedance Feature</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">The video will transition to this final frame. Leave empty for AI-generated ending.</p>
                    
                    {endFrameImage ? (
                      <div className="relative">
                        <img 
                          src={endFrameImage} 
                          alt="End Frame" 
                          className="w-full max-h-[200px] object-contain rounded-lg border bg-gray-100" 
                        />
                        <button 
                          onClick={() => setEndFrameImage(null)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => endFrameInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload End Frame
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => { setLibraryTarget('end'); setShowLibrary(true); }}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          From Library
                        </Button>
                      </div>
                    )}
                    
                    <input
                      ref={endFrameInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'end')}
                    />
                  </div>
                )}

                {/* Output Settings */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Output Settings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Aspect Ratio</label>
                      <select 
                        value={aspectRatio} 
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        {currentModel.aspectRatios.map(ar => (
                          <option key={ar} value={ar}>{ASPECT_RATIO_LABELS[ar] || ar}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Resolution</label>
                      <select 
                        value={resolution} 
                        onChange={(e) => setResolution(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        {currentModel.resolutions.map(res => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Duration</label>
                      <select 
                        value={duration} 
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        {currentModel.durationOptions.map(d => (
                          <option key={d} value={d}>{d} seconds</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Video Settings */}
            {currentStep === 2 && (
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Preview uploaded image */}
                {uploadedImage && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={uploadedImage} alt="Start" className="w-24 h-24 object-cover rounded-lg border" />
                      {endFrameImage && (
                        <>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                          <img src={endFrameImage} alt="End" className="w-24 h-24 object-cover rounded-lg border" />
                        </>
                      )}
                      <div className="flex-1 text-sm text-gray-600">
                        <p><strong>Model:</strong> {currentModel.label}</p>
                        <p><strong>Output:</strong> {ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio} @ {resolution}</p>
                        <p><strong>Duration:</strong> {duration} seconds</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scene Description */}
                <div className="bg-gradient-to-r from-[#2C666E]/10 to-[#90DDF0]/10 rounded-lg p-4 border-2 border-[#2C666E]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Scene Description</h3>
                    <span className="text-xs text-[#2C666E] font-medium bg-[#2C666E]/10 px-2 py-0.5 rounded">Important!</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Describe the action, movement, and what happens in the video.</p>
                  <textarea 
                    value={sceneDescription} 
                    onChange={(e) => setSceneDescription(e.target.value)} 
                    placeholder="e.g., 'A person smiles and talks naturally to the camera, gesturing with hands...'"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-20" 
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {['Person talking to camera', 'Slow smile', 'Nodding', 'Looking around', 'Walking forward'].map(idea => (
                      <button
                        key={idea}
                        onClick={() => setSceneDescription(prev => prev ? `${prev}, ${idea.toLowerCase()}` : idea)}
                        className="px-2 py-0.5 text-xs rounded bg-white border hover:bg-[#90DDF0]/20"
                      >
                        + {idea}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Settings */}
                {currentModel.supportsAudio && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {enableAudio ? <Volume2 className="w-5 h-5 text-[#2C666E]" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                        <h3 className="font-semibold text-gray-900">Audio Generation</h3>
                      </div>
                      <button
                        onClick={() => setEnableAudio(!enableAudio)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${enableAudio ? 'bg-[#2C666E]' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enableAudio ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    
                    {enableAudio && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Speech / Dialogue (Optional)</label>
                        <textarea 
                          value={audioTranscript} 
                          onChange={(e) => setAudioTranscript(e.target.value)} 
                          placeholder="e.g., 'Hi everyone! Let me show you this amazing product...'"
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-16" 
                        />
                        <p className="text-xs text-gray-400 mt-1">Leave empty for ambient sounds based on the scene.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Camera Fixed (Seedance only) */}
                {currentModel.supportsCameraFixed && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Lock Camera Position</h3>
                          <p className="text-xs text-gray-500">Keep camera stationary throughout the video</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCameraFixed(!cameraFixed)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${cameraFixed ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${cameraFixed ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Video Style */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Video Style</h3>
                  </div>
                  <select value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    {VIDEO_STYLES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Camera Movement & Angle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Camera Movement</h3>
                    </div>
                    <select value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                      {CAMERA_MOVEMENTS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Camera Angle</h3>
                    </div>
                    <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                      {CAMERA_ANGLES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Special Effects with Combos */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Special Effects</h3>
                    <span className="text-xs text-gray-400">(multi-select)</span>
                  </div>
                  
                  {/* Quick Combo Presets */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">🎯 Quick Combos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EFFECT_COMBOS.map(combo => (
                        <button
                          key={combo.id}
                          onClick={() => setSpecialEffects(combo.effects)}
                          className={`px-2 py-1 text-xs rounded-full border transition-all ${
                            JSON.stringify(specialEffects.sort()) === JSON.stringify(combo.effects.sort())
                              ? 'bg-[#2C666E] text-white border-[#2C666E]'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#90DDF0]/20'
                          }`}
                        >
                          {combo.label}
                        </button>
                      ))}
                      {specialEffects.length > 0 && (
                        <button
                          onClick={() => setSpecialEffects([])}
                          className="px-2 py-1 text-xs rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Effects by Category */}
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    {['realistic', 'light', 'film', 'particles', 'nature'].map(category => (
                      <div key={category}>
                        <p className="text-xs font-medium text-gray-500 capitalize mb-1">
                          {category === 'realistic' ? '🤳 Realistic' : 
                           category === 'light' ? '💡 Light' :
                           category === 'film' ? '🎬 Film' :
                           category === 'particles' ? '✨ Particles' : '🌿 Nature'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {SPECIAL_EFFECTS.filter(e => e.category === category).map(effect => (
                            <button
                              key={effect.value}
                              onClick={() => {
                                setSpecialEffects(prev => 
                                  prev.includes(effect.value) 
                                    ? prev.filter(e => e !== effect.value)
                                    : [...prev, effect.value]
                                );
                              }}
                              className={`px-1.5 py-0.5 text-xs rounded border transition-all ${
                                specialEffects.includes(effect.value)
                                  ? 'bg-[#2C666E] text-white border-[#2C666E]'
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-[#90DDF0]/20'
                              }`}
                            >
                              {effect.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {specialEffects.length > 0 && (
                    <div className="mt-2 text-xs text-[#07393C]">
                      <strong>Selected ({specialEffects.length}):</strong> {specialEffects.join(', ')}
                    </div>
                  )}
                </div>

                {/* Description & Motion Presets */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Description & Motion</h3>
                    <span className="text-xs text-gray-400">(optional)</span>
                  </div>
                  
                  {/* Prefilled Preset Buttons */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">🎯 Quick Presets for Realistic Videos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DESCRIPTION_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setDescription(preset.prompt)}
                          className={`px-2 py-1 text-xs rounded-full border transition-all ${
                            description === preset.prompt
                              ? 'bg-[#2C666E] text-white border-[#2C666E]'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#90DDF0]/20'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Add custom motion/style details... (e.g., 'real person, genuine emotion, natural lighting, unfiltered')" 
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-16" 
                  />
                  
                  {description && (
                    <button 
                      onClick={() => setDescription('')}
                      className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ✕ Clear description
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {currentStep === 3 && generatedVideoUrl && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Generated Video</h3>
                  </div>
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full rounded-lg border bg-black"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button onClick={handleDownloadVideo} className="flex-1 bg-[#2C666E] hover:bg-[#07393C]">
                    <Download className="w-4 h-4 mr-2" />
                    Download to Device
                  </Button>
                  {onVideoGenerated && (
                    <Button 
                      onClick={handleAddToEditor} 
                      variant="outline" 
                      className="flex-1"
                      disabled={hasAddedToEditor}
                    >
                      {hasAddedToEditor ? '✓ Added' : 'Add to Collection'}
                    </Button>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => { setCurrentStep(1); setGeneratedVideoUrl(null); }}
                  className="w-full"
                >
                  Create Another Video
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t flex items-center justify-between flex-shrink-0">
            <div>
              {currentStep > 1 && currentStep < 3 && (
                <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {currentStep === 1 && (
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!uploadedImage}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  Next: Video Settings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {currentStep === 2 && (
                <Button 
                  onClick={handleGenerateVideo}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Video
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Modal */}
      {isLoading && (
        <LoadingModal message={loadingMessage || 'Generating video...'} />
      )}

      {/* Library Modal */}
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelectItem={handleLibrarySelect}
      />
    </>
  );
}
