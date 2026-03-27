import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StyleGrid from '@/components/ui/StyleGrid';
import {
  Upload,
  Link,
  Image as ImageIcon,
  Download,
  X,
  Video,
  Play,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FolderOpen,
  Lock,
  Volume2,
  VolumeX,
  Search,
  Globe,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Save,
  Palette,
  Film,
} from 'lucide-react';
import LoadingModal from '@/components/canvas/LoadingModal';
import LibraryModal from './LibraryModal';
import { apiFetch } from '@/lib/api';
import { findStyleByValue } from '@/lib/stylePresets';

// ─── Video Generation Models ──────────────────────────────────────────────────
const VIDEO_MODELS = [
  {
    id: 'wavespeed-wan',
    label: '🚀 Wavespeed WAN 2.2 Spicy',
    shortLabel: 'Wavespeed',
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
    shortLabel: 'Grok xAI',
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
    shortLabel: 'Seedance',
    description: '1080p, audio & end frame support',
    provider: 'fal',
    durationOptions: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    resolutions: ['480p', '720p', '1080p'],
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsEndFrame: true,
  },
  {
    id: 'veo3',
    label: '🌟 Google Veo 3.1',
    shortLabel: 'Veo 3.1',
    description: 'Google\'s best, 4K, multi-image reference',
    provider: 'fal',
    durationOptions: [8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['16:9', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsMultipleImages: true,
  },
  {
    id: 'veo3-fast',
    label: '⚡ Google Veo 3.1 Fast',
    shortLabel: 'Veo Fast',
    description: 'Faster Veo, 4K, flexible duration',
    provider: 'fal',
    durationOptions: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['auto', '16:9', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsNegativePrompt: true,
  },
  {
    id: 'veo3-first-last',
    label: '🎬 Veo 3.1 First & Last Frame',
    shortLabel: 'Veo Morph',
    description: 'Generate video transitioning between two keyframes',
    provider: 'fal',
    durationOptions: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['auto', '16:9', '9:16'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsNegativePrompt: true,
    requiresFirstLastFrame: true,
  },
  {
    id: 'luma-ray',
    label: '✨ Luma Dream Machine (Ray)',
    shortLabel: 'Luma Ray',
    description: 'High fidelity, great physics',
    provider: 'luma',
    durationOptions: [5],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
    supportsAudio: false,
    supportsCameraFixed: true,
    supportsEndFrame: true,
    supportsMultipleImages: true,
  },
  {
    id: 'runway-gen3',
    label: '🏃 Runway Gen-3 Alpha',
    shortLabel: 'Runway G3',
    description: 'Cinematic quality, realistic motion',
    provider: 'runway',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    aspectRatios: ['16:9', '9:16'],
    supportsAudio: false,
    supportsCameraFixed: true,
    supportsEndFrame: true,
    supportsMultipleImages: true,
  },
  {
    id: 'hailuo-minimax',
    label: '🌊 Hailuo Minimax Video',
    shortLabel: 'Minimax',
    description: 'Great for anime and stylized',
    provider: 'fal',
    durationOptions: [5],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  {
    id: 'kling-video',
    label: '🎬 Kling 2.5 Turbo Pro',
    shortLabel: 'Kling',
    description: 'Cinematic, fluid motion, precise',
    provider: 'fal',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    aspectRatios: ['auto'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: true,
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
  {
    id: 'kling-r2v-pro',
    label: '🎭 Kling O3 Pro — Reference-to-Video',
    shortLabel: 'Kling R2V Pro',
    description: 'Character consistency — best quality',
    tip: 'Upload a front-facing photo plus extra angles. Write "@Element" in scene description where you want the character.',
    provider: 'fal',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: true,
    supportsNegativePrompt: true,
    supportsCfgScale: true,
    supportsReferenceImages: true,
  },
  {
    id: 'kling-r2v-standard',
    label: '🎭 Kling O3 Standard — Reference-to-Video',
    shortLabel: 'Kling R2V Std',
    description: 'Character consistency — faster, lower cost',
    tip: 'Same as R2V Pro but faster. Upload character references and use "@Element" in your prompt.',
    provider: 'fal',
    durationOptions: [5, 10],
    resolutions: ['720p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsAudio: true,
    supportsCameraFixed: false,
    supportsEndFrame: true,
    supportsNegativePrompt: true,
    supportsCfgScale: true,
    supportsReferenceImages: true,
  },
  {
    id: 'svd',
    label: '🚀 Stable Video Diffusion (Fast)',
    shortLabel: 'SVD Fast',
    description: 'Ultra-fast image-to-video motion',
    provider: 'fal',
    durationOptions: [3, 4],
    resolutions: ['480p'],
    aspectRatios: ['16:9'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
  },
  {
    id: 'ltx-audio-video',
    label: '🎵 LTX 19B Audio-to-Video',
    shortLabel: 'LTX A2V',
    description: 'Generates video driven by an audio track',
    provider: 'fal',
    durationOptions: [5],
    resolutions: ['720p'],
    aspectRatios: ['16:9'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    requiresAudioUrl: true,
  },
  {
    id: 'ltx-iclora',
    label: '🧬 LTX ICLoRA — Subject-Consistent Video',
    shortLabel: 'LTX ICLoRA',
    description: 'Uses your start image for pose/depth/edge control',
    tip: 'Choose a control type (Pose, Depth, Canny Edge, or Detailer) to tell the AI how to use your start image.',
    provider: 'fal',
    durationOptions: [3, 4, 5],
    resolutions: ['720p'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
    supportsAudio: false,
    supportsCameraFixed: false,
    supportsEndFrame: false,
    supportsICLoRA: true,
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
  { value: 'static locked-off camera on tripod, perfectly stable with no movement', label: '📱 Static/Stable' },
  { value: 'subtle handheld camera micro-shake, natural tiny tremor', label: '🤳 Subtle Handheld Shake' },
  { value: 'gentle rhythmic camera movement matching natural breathing', label: '😮‍💨 Natural Breathing' },
  { value: 'soft organic lateral sway as if held casually', label: '🌊 Gentle Sway' },
  { value: 'slow zoom in', label: 'Slow Zoom In' },
  { value: 'slow zoom out', label: 'Slow Zoom Out' },
  { value: 'fast zoom in', label: 'Fast Zoom (Punch In)' },
  { value: 'dolly zoom', label: 'Dolly Zoom (Vertigo)' },
  { value: 'pan left to right', label: 'Pan Left to Right' },
  { value: 'pan right to left', label: 'Pan Right to Left' },
  { value: 'tilt up', label: 'Tilt Up' },
  { value: 'tilt down', label: 'Tilt Down' },
  { value: 'dolly forward', label: 'Dolly Forward' },
  { value: 'dolly backward', label: 'Dolly Backward' },
  { value: 'tracking shot', label: 'Tracking Shot' },
  { value: 'orbit', label: 'Orbit Around Subject' },
  { value: 'crane up', label: 'Crane Up' },
  { value: 'crane down', label: 'Crane Down' },
  { value: 'handheld following', label: 'Handheld Following' },
];

// Camera Angle Presets
const CAMERA_ANGLES = [
  { value: '', label: 'Default Angle' },
  { value: 'selfie close-up from arm\'s length, front-facing smartphone camera', label: '🤳 Selfie' },
  { value: 'talking head framing from chest up, eye-level camera', label: '🗣️ Talking Head' },
  { value: 'vlog-style framing showing face and upper body', label: '📱 Vlog Style' },
  { value: 'webcam angle from slightly above eye level', label: '💻 Webcam' },
  { value: 'eye level', label: 'Eye Level' },
  { value: 'low angle', label: 'Low Angle (Hero)' },
  { value: 'high angle', label: 'High Angle' },
  { value: 'dutch angle', label: 'Dutch Angle' },
  { value: 'wide shot', label: 'Wide Shot' },
  { value: 'medium shot', label: 'Medium Shot' },
  { value: 'close up', label: 'Close Up' },
  { value: 'extreme close up', label: 'Extreme Close Up' },
  { value: 'birds eye', label: "Bird's Eye" },
  { value: 'worms eye', label: "Worm's Eye" },
  { value: 'over the shoulder', label: 'Over the Shoulder' },
  { value: 'point of view', label: 'POV (First Person)' },
];

/**
 * JumpStartModal — Image to Video with multi-variation support.
 *
 * Flow: Upload → Styles → Settings → Results
 *
 * Variations = selectedVisualStyles[] × selectedVideoStyles[]
 * Each variation gets a Cohesive Prompt Builder call then generation.
 */
export default function JumpStartModal({
  isOpen,
  onClose,
  username = 'default',
  onVideoGenerated,
  isEmbedded = false,
  initialImage = null
}) {
  const [activeTab, setActiveTab] = useState('upload');

  // ─── Image / Upload state ───────────────────────────────────────────────
  const [uploadedImage, setUploadedImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [endFrameImage, setEndFrameImage] = useState(null);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showEndFrameUrlImport, setShowEndFrameUrlImport] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState('start');
  const [urlInput, setUrlInput] = useState('');
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [webSearchTarget, setWebSearchTarget] = useState('start');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ─── Model / output settings ────────────────────────────────────────────
  const [videoModel, setVideoModel] = useState('wavespeed-wan');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(5);

  // ─── Style selections (multi-select) ────────────────────────────────────
  const [selectedVisualStyles, setSelectedVisualStyles] = useState([]);
  const [selectedVideoStyles, setSelectedVideoStyles] = useState([]);
  const [videoStylesList, setVideoStylesList] = useState([]);

  // ─── Settings / prompt inputs ───────────────────────────────────────────
  const [sceneDescription, setSceneDescription] = useState('');
  const [cameraMovement, setCameraMovement] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');

  // ─── Model-specific settings ────────────────────────────────────────────
  const [enableAudio, setEnableAudio] = useState(false);
  const [drivingAudioUrl, setDrivingAudioUrl] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [cameraFixed, setCameraFixed] = useState(false);
  const [cfgScale, setCfgScale] = useState(0.5);

  // ─── Kling R2V references ──────────────────────────────────────────────
  const [referenceImages, setReferenceImages] = useState([]);
  const [frontalIndex, setFrontalIndex] = useState(0);
  const [showRefLibrary, setShowRefLibrary] = useState(false);
  const [refLibraryItems, setRefLibraryItems] = useState([]);
  const [refLibraryFolders, setRefLibraryFolders] = useState([]);
  const [refSelectedFolder, setRefSelectedFolder] = useState(null);
  const [refSelectedIds, setRefSelectedIds] = useState(new Set());
  const [refLibraryLoading, setRefLibraryLoading] = useState(false);

  // ─── LTX ICLoRA ─────────────────────────────────────────────────────────
  const [icLoraType, setIcLoraType] = useState('pose');
  const [icLoraScale, setIcLoraScale] = useState(1.0);

  // ─── Generation / Results ───────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [multiResults, setMultiResults] = useState([]);

  // ─── Refs ───────────────────────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const endFrameInputRef = useRef(null);
  const referenceFileInputRef = useRef(null);
  const contentRef = useRef(null);
  const mountedRef = useRef(true);
  const pollTimers = useRef({});

  // Derived
  const currentModel = VIDEO_MODELS.find(m => m.id === videoModel) || VIDEO_MODELS[0];

  // ─── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab]);

  // Load video style presets when styles tab opens
  useEffect(() => {
    if (activeTab === 'styles' && videoStylesList.length === 0) {
      apiFetch('/api/styles/video')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setVideoStylesList(data); })
        .catch(err => console.error('[JumpStart] Failed to load video styles:', err));
    }
  }, [activeTab, videoStylesList.length]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('upload');
      setUploadedImage(null);
      setAdditionalImages([]);
      setEndFrameImage(null);
      setShowUrlImport(false);
      setShowEndFrameUrlImport(false);
      setUrlInput('');
      setShowWebSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setVideoModel('wavespeed-wan');
      setAspectRatio('16:9');
      setResolution('720p');
      setDuration(5);
      setSelectedVisualStyles([]);
      setSelectedVideoStyles([]);
      setSceneDescription('');
      setCameraMovement('');
      setCameraAngle('');
      setNegativePrompt('');
      setEnableAudio(false);
      setAudioTranscript('');
      setDrivingAudioUrl('');
      setCameraFixed(false);
      setCfgScale(0.5);
      setReferenceImages([]);
      setFrontalIndex(0);
      setIcLoraType('pose');
      setIcLoraScale(1.0);
      setMultiResults([]);
      setIsLoading(false);
      setLoadingMessage('');
      // Clear poll timers
      Object.values(pollTimers.current).forEach(clearTimeout);
      pollTimers.current = {};

      if (initialImage) {
        setUploadedImage(initialImage);
        setActiveTab('styles');
      }
    }
  }, [isOpen, initialImage]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const saveToLibrary = async (url, type = 'image', title = '', source = 'jumpstart') => {
    try {
      await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type, title, source }),
      });
    } catch (err) {
      console.error('[JumpStart] Failed to save to library:', err);
    }
  };

  // ─── Model change ──────────────────────────────────────────────────────
  const handleModelChange = (newModelId) => {
    const newModel = VIDEO_MODELS.find(m => m.id === newModelId);
    if (!newModel) return;
    setVideoModel(newModelId);
    if (!newModel.aspectRatios.includes(aspectRatio)) setAspectRatio(newModel.aspectRatios[0]);
    if (!newModel.resolutions.includes(resolution)) setResolution(newModel.resolutions[0]);
    if (!newModel.durationOptions.includes(duration)) setDuration(newModel.durationOptions[0]);
    if (!newModel.supportsAudio) { setEnableAudio(false); setAudioTranscript(''); }
    if (!newModel.supportsEndFrame) setEndFrameImage(null);
    if (!newModel.supportsCameraFixed) setCameraFixed(false);
  };

  // ─── File / URL / Library / Search handlers ────────────────────────────
  const handleFileUpload = async (e, target = 'start') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      if (target === 'start') {
        setUploadedImage(dataUrl);
      } else if (target === 'additional') {
        setAdditionalImages(prev => [...prev, dataUrl]);
      } else if (target === 'reference') {
        setReferenceImages(prev => [...prev, dataUrl]);
      } else {
        setEndFrameImage(dataUrl);
      }
      saveToLibrary(dataUrl, 'image', `JumpStart ${target} - ${new Date().toLocaleString()}`, 'jumpstart-upload');
    };
    reader.readAsDataURL(file);
  };

  const handleUrlImport = (target = 'start') => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    if (target === 'start') { setUploadedImage(url); setShowUrlImport(false); }
    else if (target === 'additional') { setAdditionalImages(prev => [...prev, url]); setShowUrlImport(false); }
    else { setEndFrameImage(url); setShowEndFrameUrlImport(false); }
    saveToLibrary(url, 'image', `JumpStart Import - ${new Date().toLocaleString()}`, 'jumpstart-import');
    setUrlInput('');
  };

  const handleLibrarySelect = (item) => {
    const url = item.image_url || item.url;
    if (libraryTarget === 'start') setUploadedImage(url);
    else if (libraryTarget === 'additional') setAdditionalImages(prev => [...prev, url]);
    else if (libraryTarget === 'reference') setReferenceImages(prev => [...prev, url]);
    else setEndFrameImage(url);
    setShowLibrary(false);
  };

  const removeAdditionalImage = (index) => setAdditionalImages(prev => prev.filter((_, i) => i !== index));

  // ─── Web search ─────────────────────────────────────────────────────────
  const handleWebSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const response = await apiFetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await response.json();
      if (data.images?.length > 0) setSearchResults(data.images);
    } catch (error) {
      console.error('Web search error:', error);
      toast.error('Failed to search images');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (imageResult) => {
    const url = imageResult.url;
    try {
      const response = await apiFetch('/api/images/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, username }),
      });
      const data = await response.json();
      const finalUrl = data.url || url;
      if (webSearchTarget === 'start') setUploadedImage(finalUrl);
      else if (webSearchTarget === 'additional') setAdditionalImages(prev => [...prev, finalUrl]);
      else setEndFrameImage(finalUrl);
      saveToLibrary(finalUrl, 'image', imageResult.title || `Web Search - ${searchQuery}`, 'jumpstart-websearch');
    } catch {
      if (webSearchTarget === 'start') setUploadedImage(url);
      else if (webSearchTarget === 'additional') setAdditionalImages(prev => [...prev, url]);
      else setEndFrameImage(url);
    }
    setShowWebSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ─── Reference Library Browser (Kling R2V) ─────────────────────────────
  const loadRefLibrary = async () => {
    setRefLibraryLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: images } = await supabase
        .from('image_library_items')
        .select('id, url, title, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (images) {
        setRefLibraryItems(images);
        const folders = new Set();
        images.forEach(img => {
          const match = img.title?.match(/^\[([^\]]+)\]/);
          if (match) folders.add(match[1]);
        });
        setRefLibraryFolders(Array.from(folders).sort());
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setRefLibraryLoading(false);
    }
  };

  const openRefLibrary = () => { setShowRefLibrary(true); setRefSelectedIds(new Set()); setRefSelectedFolder(null); loadRefLibrary(); };
  const toggleRefLibraryItem = (id) => { setRefSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const selectAllRefInFolder = (folder) => { const items = folder === null ? refLibraryItems : refLibraryItems.filter(i => i.title?.startsWith(`[${folder}]`)); setRefSelectedIds(new Set(items.map(i => i.id))); };
  const importRefFromLibrary = () => { const selected = refLibraryItems.filter(i => refSelectedIds.has(i.id)); if (selected.length === 0) return; setReferenceImages(prev => [...prev, ...selected.map(i => i.url)]); setShowRefLibrary(false); setRefSelectedIds(new Set()); };
  const filteredRefLibraryItems = refSelectedFolder === null ? refLibraryItems : refLibraryItems.filter(i => i.title?.startsWith(`[${refSelectedFolder}]`));

  // ─── Build Variation Matrix ─────────────────────────────────────────────
  const buildVariationMatrix = () => {
    const vs = selectedVisualStyles.length > 0 ? selectedVisualStyles : [null];
    const ms = selectedVideoStyles.length > 0 ? selectedVideoStyles : [null];
    const matrix = [];
    for (const visualKey of vs) {
      for (const motionKey of ms) {
        const visualStyle = visualKey ? findStyleByValue(visualKey) : null;
        const motionStyle = motionKey ? videoStylesList.find(s => s.key === motionKey) : null;
        matrix.push({
          visualKey,
          motionKey,
          visualLabel: visualStyle?.label || 'Default',
          motionLabel: motionStyle?.label || 'Default',
          visualPrompt: visualStyle?.promptText || '',
          motionPrompt: motionStyle?.prompt || '',
        });
      }
    }
    return matrix;
  };

  // ─── Cohesive Prompt Builder call ───────────────────────────────────────
  const buildCohesivePrompt = async (visualPrompt, motionPrompt) => {
    const body = {
      tool: 'jumpstart',
      description: sceneDescription || 'smooth natural motion with realistic physics',
      style: visualPrompt || undefined,
      videoStylePrompt: motionPrompt || undefined,
      cameraDirection: cameraMovement || undefined,
      cameraAngle: cameraAngle || undefined,
      negativePrompt: negativePrompt || undefined,
    };

    const response = await apiFetch('/api/prompt/build-cohesive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data.success || !data.prompt) throw new Error(data.error || 'Failed to build prompt');
    return data.prompt;
  };

  // ─── Poll for a single variation ───────────────────────────────────────
  const pollForResultAsync = (requestId, model) => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (!mountedRef.current) return reject(new Error('Unmounted'));
        try {
          const response = await apiFetch('/api/jumpstart/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, model }),
          });
          const data = await response.json();
          if (data.status === 'completed' && data.videoUrl) {
            resolve(data.videoUrl);
          } else if (data.status === 'failed') {
            reject(new Error(data.error || 'Generation failed'));
          } else {
            pollTimers.current[requestId] = setTimeout(poll, 3000);
          }
        } catch (err) {
          reject(err);
        }
      };
      poll();
    });
  };

  // ─── Generate all variations ────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!uploadedImage) { toast.error('Please upload an image first'); return; }
    if (currentModel.requiresFirstLastFrame && !endFrameImage) { toast.error('Please upload both first and last frame images'); return; }
    if (currentModel.requiresAudioUrl && !drivingAudioUrl) { toast.error('An Audio URL is required for this model.'); return; }

    const matrix = buildVariationMatrix();
    if (matrix.length === 0) { toast.error('Select at least one style'); return; }

    // Initialize results grid
    const initialResults = matrix.map(v => ({
      visualKey: v.visualKey,
      motionKey: v.motionKey,
      visualLabel: v.visualLabel,
      motionLabel: v.motionLabel,
      status: 'prompting',
      videoUrl: null,
      error: null,
      saved: false,
    }));
    setMultiResults(initialResults);
    setActiveTab('results');
    setIsLoading(true);
    setLoadingMessage(`Generating ${matrix.length} variation${matrix.length > 1 ? 's' : ''}...`);

    const updateSlot = (index, updates) => {
      if (!mountedRef.current) return;
      setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
    };

    // Convert start image to blob once
    let imageBlob;
    try {
      const imgResp = await fetch(uploadedImage);
      imageBlob = await imgResp.blob();
    } catch {
      toast.error('Failed to load start image');
      setIsLoading(false);
      return;
    }

    const generateOne = async (variation, index) => {
      try {
        // Step 1: build cohesive prompt
        const prompt = await buildCohesivePrompt(variation.visualPrompt, variation.motionPrompt);
        if (!mountedRef.current) return;
        updateSlot(index, { status: 'generating' });

        // Step 2: send to API
        const formData = new FormData();
        formData.append('image', imageBlob, 'image.jpg');
        formData.append('prompt', prompt);
        formData.append('model', videoModel);
        formData.append('resolution', resolution);
        formData.append('duration', duration.toString());
        formData.append('aspectRatio', aspectRatio);
        formData.append('username', username);

        // Audio — always explicitly false unless toggled on
        if (currentModel.supportsAudio) {
          formData.append('enableAudio', enableAudio.toString());
          if (enableAudio && audioTranscript.trim()) {
            formData.append('audioTranscript', audioTranscript.trim());
          }
        } else {
          formData.append('enableAudio', 'false');
        }

        if (currentModel.supportsCameraFixed) formData.append('cameraFixed', cameraFixed.toString());
        if (currentModel.supportsEndFrame && endFrameImage) formData.append('endImageUrl', endFrameImage);
        if (currentModel.supportsNegativePrompt && negativePrompt.trim()) formData.append('negativePrompt', negativePrompt.trim());
        if (currentModel.supportsCfgScale) formData.append('cfgScale', cfgScale.toString());
        if (currentModel.requiresAudioUrl) formData.append('audioUrl', drivingAudioUrl);
        if (currentModel.supportsMultipleImages && additionalImages.length > 0) formData.append('additionalImages', JSON.stringify(additionalImages));
        if (currentModel.supportsReferenceImages && referenceImages.length > 0) {
          formData.append('referenceImages', JSON.stringify(referenceImages));
          formData.append('frontalImageUrl', referenceImages[frontalIndex] || referenceImages[0]);
        }
        if (currentModel.supportsICLoRA) {
          formData.append('icLoraType', icLoraType);
          formData.append('icLoraScale', icLoraScale.toString());
        }

        const result = await apiFetch('/api/jumpstart/generate', { method: 'POST', body: formData });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || 'Failed to start generation');

        if (data.videoUrl) {
          updateSlot(index, { status: 'completed', videoUrl: data.videoUrl });
        } else if (data.requestId) {
          updateSlot(index, { status: 'polling' });
          const videoUrl = await pollForResultAsync(data.requestId, videoModel);
          updateSlot(index, { status: 'completed', videoUrl });
        } else {
          throw new Error('No request ID returned');
        }
      } catch (error) {
        updateSlot(index, { status: 'failed', error: error.message });
      }
    };

    // Run at most 2 concurrent generations
    const CONCURRENCY = 2;
    for (let i = 0; i < matrix.length; i += CONCURRENCY) {
      const batch = matrix.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map((v, idx) => generateOne(v, i + idx)));
    }
    if (mountedRef.current) setIsLoading(false);
  };

  // ─── Save / Download / Retry ────────────────────────────────────────────
  const handleSaveOne = async (index) => {
    const result = multiResults[index];
    if (!result?.videoUrl || result.saved) return;
    setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: true } : r));
    try {
      const label = [result.visualLabel, result.motionLabel].filter(l => l !== 'Default').join(' + ') || 'JumpStart Video';
      const res = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.videoUrl, type: 'video', title: `JumpStart — ${label}`, source: 'jumpstart' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (onVideoGenerated) {
        onVideoGenerated(result.videoUrl, `JumpStart - ${label}`, 'jumpstart', duration);
      }
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`);
      setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, saved: false } : r));
    }
  };

  const handleSaveAll = async () => {
    const unsaved = multiResults.map((r, i) => ({ ...r, index: i })).filter(r => r.status === 'completed' && !r.saved && r.videoUrl);
    setMultiResults(prev => prev.map(r => r.status === 'completed' && !r.saved && r.videoUrl ? { ...r, saved: true } : r));
    for (const item of unsaved) {
      try {
        const label = [item.visualLabel, item.motionLabel].filter(l => l !== 'Default').join(' + ') || 'JumpStart Video';
        await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.videoUrl, type: 'video', title: `JumpStart — ${label}`, source: 'jumpstart' }),
        });
        if (onVideoGenerated) onVideoGenerated(item.videoUrl, `JumpStart - ${label}`, 'jumpstart', duration);
      } catch (err) {
        console.error('[JumpStart] Save failed:', err);
      }
    }
  };

  const handleRetryOne = async (index) => {
    const variation = multiResults[index];
    if (!variation) return;

    setMultiResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'prompting', error: null, videoUrl: null } : r));

    const matrix = buildVariationMatrix();
    const v = matrix[index];
    if (!v) return;

    const updateSlot = (idx, updates) => {
      if (!mountedRef.current) return;
      setMultiResults(prev => prev.map((r, i) => i === idx ? { ...r, ...updates } : r));
    };

    try {
      const prompt = await buildCohesivePrompt(v.visualPrompt, v.motionPrompt);
      updateSlot(index, { status: 'generating' });

      let imageBlob;
      const imgResp = await fetch(uploadedImage);
      imageBlob = await imgResp.blob();

      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');
      formData.append('prompt', prompt);
      formData.append('model', videoModel);
      formData.append('resolution', resolution);
      formData.append('duration', duration.toString());
      formData.append('aspectRatio', aspectRatio);
      formData.append('username', username);
      if (currentModel.supportsAudio) {
        formData.append('enableAudio', enableAudio.toString());
        if (enableAudio && audioTranscript.trim()) formData.append('audioTranscript', audioTranscript.trim());
      } else {
        formData.append('enableAudio', 'false');
      }
      if (currentModel.supportsEndFrame && endFrameImage) formData.append('endImageUrl', endFrameImage);
      if (currentModel.supportsNegativePrompt && negativePrompt.trim()) formData.append('negativePrompt', negativePrompt.trim());
      if (currentModel.supportsCfgScale) formData.append('cfgScale', cfgScale.toString());
      if (currentModel.supportsMultipleImages && additionalImages.length > 0) formData.append('additionalImages', JSON.stringify(additionalImages));
      if (currentModel.supportsReferenceImages && referenceImages.length > 0) {
        formData.append('referenceImages', JSON.stringify(referenceImages));
        formData.append('frontalImageUrl', referenceImages[frontalIndex] || referenceImages[0]);
      }
      if (currentModel.supportsICLoRA) {
        formData.append('icLoraType', icLoraType);
        formData.append('icLoraScale', icLoraScale.toString());
      }

      const result = await apiFetch('/api/jumpstart/generate', { method: 'POST', body: formData });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Failed');
      if (data.videoUrl) {
        updateSlot(index, { status: 'completed', videoUrl: data.videoUrl });
      } else if (data.requestId) {
        updateSlot(index, { status: 'polling' });
        const videoUrl = await pollForResultAsync(data.requestId, videoModel);
        updateSlot(index, { status: 'completed', videoUrl });
      }
    } catch (error) {
      updateSlot(index, { status: 'failed', error: error.message });
    }
  };

  const handleDownloadVideo = (url) => {
    const link = document.createElement('a');
    link.download = 'jumpstart-video.mp4';
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    Object.values(pollTimers.current).forEach(clearTimeout);
    pollTimers.current = {};
    onClose();
  };

  // ─── Variation count helper ─────────────────────────────────────────────
  const variationCount = (() => {
    const vs = selectedVisualStyles.length || 1;
    const ms = selectedVideoStyles.length || 1;
    return vs * ms;
  })();

  // ─── Video style category grouping ──────────────────────────────────────
  const videoStyleCategories = (() => {
    const cats = {};
    videoStylesList.forEach(s => {
      const cat = s.category || 'other';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(s);
    });
    return cats;
  })();
  const categoryLabels = {
    realistic: 'Realistic / UGC',
    professional: 'Professional',
    artistic: 'Artistic',
    faceless: 'Faceless',
    kids: 'Kids / Animation',
    utility: 'Utility',
    other: 'Other',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <SlideOverPanel
        open={isOpen}
        onOpenChange={(open) => !open && handleClose()}
        title="JumpStart — Image to Video"
        subtitle="Transform your image into animated video variations"
        icon={<Video className="w-5 h-5" />}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="flex-shrink-0 px-5 py-3 border-b">
            <TabsList className="w-full justify-start bg-slate-100/80 p-1 rounded-lg">
              <TabsTrigger value="upload" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ImageIcon className="w-3.5 h-3.5" /> Upload
              </TabsTrigger>
              <TabsTrigger value="styles" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Palette className="w-3.5 h-3.5" /> Styles
                {variationCount > 1 && <span className="ml-1 text-[10px] bg-[#2C666E] text-white px-1.5 rounded-full">{variationCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> Settings
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm" disabled={multiResults.length === 0}>
                <Film className="w-3.5 h-3.5" /> Results
                {multiResults.filter(r => r.status === 'completed').length > 0 && (
                  <span className="ml-1 text-[10px] bg-green-600 text-white px-1.5 rounded-full">
                    {multiResults.filter(r => r.status === 'completed').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <SlideOverBody ref={contentRef} className="p-6 bg-gray-50">
            {/* ═══ TAB 1: UPLOAD ════════════════════════════════════════════ */}
            <TabsContent value="upload" className="mt-0">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Model Selector */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">AI Model</h3>
                    </div>
                    <select
                      value={videoModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="flex-1 max-w-xs px-3 py-2 border border-[#2C666E] rounded-lg text-sm bg-white font-medium"
                    >
                      {VIDEO_MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-500">{currentModel.description}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">
                      {currentModel.durationOptions.length === 1
                        ? `${currentModel.durationOptions[0]}s`
                        : `${currentModel.durationOptions[0]}-${currentModel.durationOptions[currentModel.durationOptions.length - 1]}s`}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{currentModel.resolutions.join(', ')}</span>
                    {currentModel.supportsAudio && <span className="bg-[#90DDF0]/30 text-[#07393C] px-1.5 py-0.5 rounded">🔊 Audio</span>}
                    {currentModel.supportsEndFrame && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">🎯 End Frame</span>}
                    {currentModel.supportsMultipleImages && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">📸 Multi-Image</span>}
                  </div>
                  {currentModel.tip && (
                    <div className="mt-3 p-3 bg-[#90DDF0]/15 border border-[#2C666E]/20 rounded-lg">
                      <p className="text-xs text-[#07393C] leading-relaxed">
                        <span className="font-semibold">How to use: </span>{currentModel.tip}
                      </p>
                    </div>
                  )}
                </div>

                {/* Start Image Upload */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">
                      {currentModel.requiresFirstLastFrame ? 'Upload First Frame' : 'Upload Start Image'}
                    </h3>
                  </div>
                  {uploadedImage ? (
                    <div className="relative">
                      <img src={uploadedImage} alt="Uploaded" className="w-full max-h-[300px] object-contain rounded-lg border bg-gray-100" />
                      <button onClick={() => setUploadedImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 10MB</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setWebSearchTarget('start'); setShowWebSearch(true); setShowUrlImport(false); }}>
                          <Globe className="w-4 h-4 mr-2" /> Search Web
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => { setShowUrlImport(true); setShowWebSearch(false); }}>
                          <Link className="w-4 h-4 mr-2" /> Import URL
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => { setLibraryTarget('start'); setShowLibrary(true); }}>
                          <FolderOpen className="w-4 h-4 mr-2" /> Library
                        </Button>
                      </div>

                      {/* Web Search Panel */}
                      {showWebSearch && webSearchTarget === 'start' && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                          <div className="flex gap-2 mb-3">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()} placeholder="Search for images..." className="pl-9" />
                            </div>
                            <Button onClick={handleWebSearch} disabled={isSearching}>{isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</Button>
                            <Button variant="ghost" onClick={() => { setShowWebSearch(false); setSearchResults([]); setSearchQuery(''); }}><X className="w-4 h-4" /></Button>
                          </div>
                          {isSearching && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /><span className="ml-2 text-sm text-gray-600">Searching...</span></div>}
                          {searchResults.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                              {searchResults.map((img, idx) => (
                                <div key={idx} onClick={() => handleSelectSearchResult(img)} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all group">
                                  <img src={img.thumbnail || img.url} alt={img.title || ''} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-xs font-medium">Select</span></div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* URL Import */}
                      {showUrlImport && (
                        <div className="mt-3 flex gap-2">
                          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUrlImport('start')} placeholder="Paste image URL..." className="flex-1" />
                          <Button onClick={() => handleUrlImport('start')}>Import</Button>
                          <Button variant="ghost" onClick={() => setShowUrlImport(false)}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'start')} />
                </div>

                {/* End Frame (if model supports) */}
                {(currentModel.supportsEndFrame || currentModel.requiresFirstLastFrame) && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">{currentModel.requiresFirstLastFrame ? 'Last Frame' : 'End Frame'}</h3>
                      {currentModel.requiresFirstLastFrame && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Required</span>}
                      {!currentModel.requiresFirstLastFrame && <span className="text-xs text-gray-400">(optional)</span>}
                    </div>
                    {endFrameImage ? (
                      <div className="relative">
                        <img src={endFrameImage} alt="End Frame" className="w-full max-h-[200px] object-contain rounded-lg border bg-gray-100" />
                        <button onClick={() => setEndFrameImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => endFrameInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                        <Button variant="outline" className="flex-1" onClick={() => { setShowEndFrameUrlImport(true); }}><Link className="w-4 h-4 mr-2" /> URL</Button>
                        <Button variant="outline" className="flex-1" onClick={() => { setLibraryTarget('end'); setShowLibrary(true); }}><FolderOpen className="w-4 h-4 mr-2" /> Library</Button>
                      </div>
                    )}
                    {showEndFrameUrlImport && (
                      <div className="mt-3 flex gap-2">
                        <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUrlImport('end')} placeholder="Paste end frame URL..." className="flex-1" />
                        <Button onClick={() => handleUrlImport('end')}>Import</Button>
                        <Button variant="ghost" onClick={() => setShowEndFrameUrlImport(false)}><X className="w-4 h-4" /></Button>
                      </div>
                    )}
                    <input ref={endFrameInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'end')} />
                  </div>
                )}

                {/* Additional Images (Veo 3.1 multi-image) */}
                {currentModel.supportsMultipleImages && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Additional Reference Images</h3>
                      <span className="text-xs text-gray-400">(optional, up to 6)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {additionalImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20">
                          <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover rounded-lg border" />
                          <button onClick={() => removeAdditionalImage(idx)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    {additionalImages.length < 6 && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setWebSearchTarget('additional'); setShowWebSearch(true); }}><Globe className="w-3 h-3 mr-1" /> Search</Button>
                        <Button variant="outline" size="sm" onClick={() => { setLibraryTarget('additional'); setShowLibrary(true); }}><FolderOpen className="w-3 h-3 mr-1" /> Library</Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Kling R2V Reference Images */}
                {currentModel.supportsReferenceImages && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-900">Character Reference Images</h3>
                      <span className="text-xs text-gray-400">(click to set frontal)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {referenceImages.map((img, idx) => (
                        <div key={idx} className={`relative w-20 h-20 cursor-pointer rounded-lg border-2 ${idx === frontalIndex ? 'border-[#2C666E] ring-2 ring-[#2C666E]/30' : 'border-gray-200'}`} onClick={() => setFrontalIndex(idx)}>
                          <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                          {idx === frontalIndex && <span className="absolute top-1 left-1 bg-[#2C666E] text-white text-[10px] font-bold px-1 rounded">F</span>}
                          <button onClick={(e) => { e.stopPropagation(); setReferenceImages(prev => prev.filter((_, i) => i !== idx)); if (frontalIndex >= referenceImages.length - 1) setFrontalIndex(0); }} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => referenceFileInputRef.current?.click()}><Upload className="w-3 h-3 mr-1" /> Upload</Button>
                      <Button variant="outline" size="sm" onClick={() => { setLibraryTarget('reference'); setShowLibrary(true); }}><FolderOpen className="w-3 h-3 mr-1" /> Library</Button>
                      <Button variant="outline" size="sm" onClick={openRefLibrary}><Search className="w-3 h-3 mr-1" /> Browse All</Button>
                    </div>
                    <input ref={referenceFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach(file => { const reader = new FileReader(); reader.onload = (ev) => setReferenceImages(prev => [...prev, ev.target.result]); reader.readAsDataURL(file); }); }} />

                    {/* Inline library browser */}
                    {showRefLibrary && (
                      <div className="mt-3 border rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
                        {refLibraryLoading ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <button onClick={() => setRefSelectedFolder(null)} className={`px-2 py-0.5 text-xs rounded ${refSelectedFolder === null ? 'bg-[#2C666E] text-white' : 'bg-white border'}`}>All</button>
                              {refLibraryFolders.map(f => (
                                <button key={f} onClick={() => setRefSelectedFolder(f)} className={`px-2 py-0.5 text-xs rounded ${refSelectedFolder === f ? 'bg-[#2C666E] text-white' : 'bg-white border'}`}>{f}</button>
                              ))}
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {filteredRefLibraryItems.map(item => (
                                <div key={item.id} onClick={() => toggleRefLibraryItem(item.id)} className={`relative aspect-square rounded cursor-pointer border-2 ${refSelectedIds.has(item.id) ? 'border-[#2C666E]' : 'border-transparent'}`}>
                                  <img src={item.url} alt="" className="w-full h-full object-cover rounded" />
                                  {refSelectedIds.has(item.id) && <CheckCircle2 className="absolute top-0.5 right-0.5 w-4 h-4 text-[#2C666E] bg-white rounded-full" />}
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={importRefFromLibrary} disabled={refSelectedIds.size === 0}>Add {refSelectedIds.size} selected</Button>
                              <Button size="sm" variant="outline" onClick={() => selectAllRefInFolder(refSelectedFolder)}>Select all</Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowRefLibrary(false)}>Cancel</Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Output Settings */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Output Settings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Aspect Ratio</label>
                      <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm">
                        {currentModel.aspectRatios.map(ar => <option key={ar} value={ar}>{ASPECT_RATIO_LABELS[ar] || ar}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Resolution</label>
                      <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm">
                        {currentModel.resolutions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                      <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full px-2 py-1.5 border rounded text-sm">
                        {currentModel.durationOptions.map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Audio-driven upload for LTX */}
                {currentModel.requiresAudioUrl && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Driving Audio URL</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Required</span>
                    </div>
                    <Input value={drivingAudioUrl} onChange={(e) => setDrivingAudioUrl(e.target.value)} placeholder="Paste audio file URL (WAV, MP3)..." />
                  </div>
                )}

                {/* ICLoRA controls */}
                {currentModel.supportsICLoRA && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3">ICLoRA Control</h3>
                    <div className="flex gap-2 mb-3">
                      {['pose', 'depth', 'canny', 'detailer'].map(t => (
                        <button key={t} onClick={() => setIcLoraType(t)} className={`px-3 py-1.5 text-xs rounded-lg border capitalize ${icLoraType === t ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>{t}</button>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Strength</span>
                        <span className="font-medium text-[#2C666E]">{icLoraScale.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0.1" max="1.5" step="0.1" value={icLoraScale} onChange={(e) => setIcLoraScale(parseFloat(e.target.value))} className="w-full accent-[#2C666E]" />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══ TAB 2: STYLES ════════════════════════════════════════════ */}
            <TabsContent value="styles" className="mt-0">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Visual Style — multi-select via StyleGrid */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Visual Style</h3>
                    {selectedVisualStyles.length > 0 && (
                      <span className="text-xs bg-[#2C666E] text-white px-2 py-0.5 rounded-full">{selectedVisualStyles.length} selected</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">Multi-select for variations</span>
                  </div>
                  <StyleGrid
                    value={selectedVisualStyles}
                    onChange={setSelectedVisualStyles}
                    multiple={true}
                    columns="grid-cols-4"
                    maxHeight="20rem"
                    hideLabel={true}
                  />
                </div>

                {/* Video / Motion Style — multi-select grid */}
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Film className="w-5 h-5 text-[#2C666E]" />
                    <h3 className="font-semibold text-gray-900">Video / Motion Style</h3>
                    {selectedVideoStyles.length > 0 && (
                      <span className="text-xs bg-[#2C666E] text-white px-2 py-0.5 rounded-full">{selectedVideoStyles.length} selected</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">Multi-select for variations</span>
                  </div>
                  {videoStylesList.length === 0 ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /><span className="ml-2 text-sm text-gray-500">Loading video styles...</span></div>
                  ) : (
                    <div className="space-y-4 max-h-[24rem] overflow-y-auto">
                      {Object.entries(videoStyleCategories).map(([cat, styles]) => (
                        <div key={cat}>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{categoryLabels[cat] || cat}</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {styles.map(s => {
                              const isSelected = selectedVideoStyles.includes(s.key);
                              return (
                                <button
                                  key={s.key}
                                  onClick={() => {
                                    setSelectedVideoStyles(prev =>
                                      prev.includes(s.key) ? prev.filter(k => k !== s.key) : [...prev, s.key]
                                    );
                                  }}
                                  className={`relative rounded-lg border-2 overflow-hidden text-left transition-all ${
                                    isSelected ? 'border-[#2C666E] ring-1 ring-[#2C666E] scale-[1.02]' : 'border-transparent hover:border-gray-300'
                                  }`}
                                >
                                  {s.thumb && <img src={s.thumb} alt={s.label} className="w-full h-20 object-cover" />}
                                  <div className="p-1.5">
                                    <div className="text-[11px] font-medium text-gray-900 truncate">{s.label}</div>
                                  </div>
                                  {isSelected && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-[#2C666E] bg-white rounded-full" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variation Summary */}
                <div className="bg-gradient-to-r from-[#2C666E]/10 to-[#90DDF0]/10 rounded-lg p-4 border border-[#2C666E]/20">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-[#2C666E]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {variationCount} variation{variationCount > 1 ? 's' : ''} will be generated
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedVisualStyles.length || 1} visual style{(selectedVisualStyles.length || 1) > 1 ? 's' : ''}
                        {' × '}
                        {selectedVideoStyles.length || 1} motion style{(selectedVideoStyles.length || 1) > 1 ? 's' : ''}
                      </p>
                    </div>
                    {(selectedVisualStyles.length > 0 || selectedVideoStyles.length > 0) && (
                      <button onClick={() => { setSelectedVisualStyles([]); setSelectedVideoStyles([]); }} className="ml-auto text-xs text-red-500 hover:text-red-700">Clear all</button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ═══ TAB 3: SETTINGS ══════════════════════════════════════════ */}
            <TabsContent value="settings" className="mt-0">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Image preview */}
                {uploadedImage && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={uploadedImage} alt="Start" className="w-20 h-20 object-cover rounded-lg border" />
                      {endFrameImage && (
                        <>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                          <img src={endFrameImage} alt="End" className="w-20 h-20 object-cover rounded-lg border" />
                        </>
                      )}
                      <div className="flex-1 text-sm text-gray-600">
                        <p><strong>Model:</strong> {currentModel.shortLabel}</p>
                        <p><strong>Output:</strong> {ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio} @ {resolution}, {duration}s</p>
                        <p><strong>Variations:</strong> {variationCount}</p>
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
                    placeholder="e.g., 'A person smiles warmly and talks naturally to the camera, making gentle hand gestures...'"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-24"
                  />
                  {sceneDescription && (
                    <button onClick={() => setSceneDescription('')} className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors">✕ Clear</button>
                  )}
                </div>

                {/* Camera Movement & Angle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Camera Movement</h3>
                    <select value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm">
                      {CAMERA_MOVEMENTS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Camera Angle</h3>
                    <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm">
                      {CAMERA_ANGLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Audio toggle & transcript */}
                {currentModel.supportsAudio && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {enableAudio ? <Volume2 className="w-5 h-5 text-[#2C666E]" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                        <h3 className="font-semibold text-gray-900">Audio Generation</h3>
                      </div>
                      <button
                        onClick={() => setEnableAudio(!enableAudio)}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${enableAudio ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                      >
                        {enableAudio ? 'On' : 'Off'}
                      </button>
                    </div>
                    {enableAudio && (
                      <>
                        <textarea
                          value={audioTranscript}
                          onChange={(e) => setAudioTranscript(e.target.value)}
                          placeholder="e.g., 'Hi everyone! Let me show you this amazing product...'"
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none h-16"
                        />
                        <p className="text-xs text-gray-400 mt-1">Leave empty for ambient sounds.</p>
                      </>
                    )}
                  </div>
                )}

                {/* Camera Fixed toggle */}
                {currentModel.supportsCameraFixed && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Lock Camera Position</span>
                    </div>
                    <button
                      onClick={() => setCameraFixed(!cameraFixed)}
                      className={`px-3 py-1 text-xs rounded-full border ${cameraFixed ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                    >
                      {cameraFixed ? 'Locked' : 'Free'}
                    </button>
                  </div>
                )}

                {/* Negative Prompt */}
                {currentModel.supportsNegativePrompt && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Negative Prompt</h3>
                    <Input value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Things to avoid..." />
                  </div>
                )}

                {/* CFG Scale */}
                {currentModel.supportsCfgScale && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-900">Prompt Adherence</span>
                      <span className="text-[#2C666E] font-medium">{cfgScale.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={cfgScale} onChange={(e) => setCfgScale(parseFloat(e.target.value))} className="w-full accent-[#2C666E]" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Creative</span><span>Balanced</span><span>Precise</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══ TAB 4: RESULTS ═══════════════════════════════════════════ */}
            <TabsContent value="results" className="mt-0">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Progress header */}
                {multiResults.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {multiResults.filter(r => r.status === 'completed').length} of {multiResults.length} completed
                        </p>
                        {multiResults.some(r => r.status === 'failed') && (
                          <p className="text-xs text-red-500">{multiResults.filter(r => r.status === 'failed').length} failed</p>
                        )}
                      </div>
                      {multiResults.some(r => r.status === 'completed' && !r.saved) && (
                        <Button size="sm" onClick={handleSaveAll} className="bg-[#2C666E] hover:bg-[#07393C]">
                          <Save className="w-3 h-3 mr-1" /> Save All
                        </Button>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2C666E] transition-all duration-500"
                        style={{ width: `${(multiResults.filter(r => r.status === 'completed' || r.status === 'failed').length / multiResults.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Results grid */}
                <div className={`grid ${multiResults.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
                  {multiResults.map((result, index) => (
                    <div key={index} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                      {/* Style labels */}
                      <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {[result.visualLabel, result.motionLabel].filter(l => l !== 'Default').join(' + ') || 'Default'}
                        </span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          result.status === 'completed' ? 'bg-green-100 text-green-700' :
                          result.status === 'failed' ? 'bg-red-100 text-red-700' :
                          result.status === 'generating' || result.status === 'polling' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {result.status === 'prompting' ? 'Building prompt...' :
                           result.status === 'generating' ? 'Generating...' :
                           result.status === 'polling' ? 'Processing...' :
                           result.status === 'completed' ? 'Done' :
                           result.status === 'failed' ? 'Failed' : result.status}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        {result.status === 'completed' && result.videoUrl ? (
                          <video src={result.videoUrl} controls autoPlay={index === 0} loop muted className="w-full rounded-lg bg-black" style={{ maxHeight: '280px' }} />
                        ) : result.status === 'failed' ? (
                          <div className="flex items-center justify-center py-8 text-center">
                            <div>
                              <p className="text-sm text-red-600 mb-2">{result.error || 'Generation failed'}</p>
                              <Button size="sm" variant="outline" onClick={() => handleRetryOne(index)}>
                                <RotateCcw className="w-3 h-3 mr-1" /> Retry
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {result.status === 'completed' && result.videoUrl && (
                        <div className="px-3 pb-3 flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownloadVideo(result.videoUrl)}>
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                          <Button
                            size="sm"
                            className={`flex-1 ${result.saved ? 'bg-green-600' : 'bg-[#2C666E] hover:bg-[#07393C]'}`}
                            onClick={() => handleSaveOne(index)}
                            disabled={result.saved}
                          >
                            {result.saved ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> : <><Save className="w-3 h-3 mr-1" /> Save</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Generate more */}
                {!isLoading && multiResults.length > 0 && (
                  <Button variant="outline" className="w-full" onClick={() => { setMultiResults([]); setActiveTab('styles'); }}>
                    Generate New Variations
                  </Button>
                )}
              </div>
            </TabsContent>
          </SlideOverBody>

          <SlideOverFooter className="flex items-center justify-between">
            <div>
              {activeTab === 'styles' && (
                <Button variant="outline" onClick={() => setActiveTab('upload')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
              )}
              {activeTab === 'settings' && (
                <Button variant="outline" onClick={() => setActiveTab('styles')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {activeTab === 'upload' && (
                <Button onClick={() => setActiveTab('styles')} disabled={!uploadedImage || (currentModel.requiresFirstLastFrame && !endFrameImage)} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                  Next: Styles <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {activeTab === 'styles' && (
                <Button onClick={() => setActiveTab('settings')} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                  Next: Settings <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {activeTab === 'settings' && (
                <Button onClick={handleGenerate} disabled={isLoading} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {variationCount > 1 ? `${variationCount} Videos` : 'Video'}
                </Button>
              )}
            </div>
          </SlideOverFooter>
        </Tabs>
      </SlideOverPanel>

      {/* Loading Modal */}
      <LoadingModal isOpen={isLoading} message={loadingMessage || 'Generating video...'} />

      {/* Library Modal */}
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
