import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import {
  Upload,
  Link,
  Search,
  Image as ImageIcon,
  Trash2,
  Eraser,
  Download,
  X,
  ChevronUp,
  ChevronDown,
  Video,
  Play,
  Clock,
  ArrowRight,
  ArrowLeft,
  Camera,
  Move,
  Sparkles,
  Minus,
  Plus,
  FolderOpen
} from 'lucide-react';
import { Rect } from 'react-konva';
import CanvasBoard from '@/components/canvas/CanvasBoard';
import URLImage from '@/components/canvas/URLImage';
import LoadingModal from '@/components/canvas/LoadingModal';
import LibraryModal from './LibraryModal';
import { supabase } from '@/lib/supabase';

// Aspect ratio presets
const ASPECT_RATIOS = {
  '16:9': { label: 'Landscape (16:9)', ratio: 16/9, width480: 854, height480: 480, width720: 1280, height720: 720 },
  '9:16': { label: 'Portrait (9:16)', ratio: 9/16, width480: 480, height480: 854, width720: 720, height720: 1280 },
  '1:1': { label: 'Square (1:1)', ratio: 1, width480: 480, height480: 480, width720: 720, height720: 720 },
  '4:3': { label: 'Standard (4:3)', ratio: 4/3, width480: 640, height480: 480, width720: 960, height720: 720 },
};

// Camera Movement Presets
const CAMERA_MOVEMENTS = [
  { value: '', label: 'No Movement' },
  // ⭐ REALISTIC / NATURAL (Best for UGC/Selfie)
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
  // Orbit/Rotation
  { value: 'orbit clockwise', label: 'Orbit Clockwise' },
  { value: 'orbit counter-clockwise', label: 'Orbit Counter-Clockwise' },
  { value: '360 rotation', label: '360° Rotation' },
  // Combined/Complex
  { value: 'crane up', label: 'Crane Up' },
  { value: 'crane down', label: 'Crane Down' },
  { value: 'aerial flyover', label: 'Aerial Flyover' },
  { value: 'push in with pan', label: 'Push In + Pan' },
  { value: 'handheld shake', label: 'Handheld/Shake' },
];

// Camera Angle Presets
const CAMERA_ANGLES = [
  { value: '', label: 'Default Angle' },
  // ⭐ SELFIE / UGC FRAMING (Best for realistic)
  { value: 'selfie-closeup', label: '🤳 Selfie Close-Up (Head/Shoulders)' },
  { value: 'selfie-medium', label: '📱 Selfie Medium (Chest Up)' },
  { value: 'selfie-slight-high', label: '⬆️ Selfie Slight High Angle' },
  { value: 'talking-head', label: '🗣️ Talking Head (Vlog)' },
  // Standard
  { value: 'eye level', label: 'Eye Level' },
  { value: 'low angle', label: 'Low Angle (Hero Shot)' },
  { value: 'high angle', label: 'High Angle (Looking Down)' },
  { value: 'birds eye view', label: "Bird's Eye View (Top Down)" },
  { value: 'worms eye view', label: "Worm's Eye View (Ground Up)" },
  { value: 'dutch angle', label: 'Dutch Angle (Tilted)' },
  { value: 'over the shoulder', label: 'Over the Shoulder' },
  { value: 'pov', label: 'POV (First Person)' },
  { value: 'extreme close up', label: 'Extreme Close-Up' },
  { value: 'close up', label: 'Close-Up' },
  { value: 'medium shot', label: 'Medium Shot' },
  { value: 'wide shot', label: 'Wide Shot' },
  { value: 'extreme wide', label: 'Extreme Wide/Establishing' },
  { value: 'aerial drone', label: 'Aerial/Drone View' },
];

// Video Style Presets
const VIDEO_STYLES = [
  { value: '', label: 'No Style' },
  // ⭐ REALISTIC / UGC / SELFIE STYLES (Most Important)
  { value: 'iphone-selfie', label: '📱 iPhone Selfie (Raw)', prompt: 'raw iPhone selfie video, front-facing camera, handheld smartphone footage, natural ambient lighting, authentic candid moment, slight natural hand movement, realistic skin texture, unfiltered unedited look, genuine facial expression, casual close-up framing, real person, UGC style' },
  { value: 'ugc-testimonial', label: '🎤 UGC Testimonial', prompt: 'authentic user-generated content style, real person talking to camera, natural window lighting, casual home setting, genuine emotion and expression, smartphone quality, raw unpolished footage, relatable everyday person, slight camera shake, natural speech' },
  { value: 'tiktok-native', label: '📲 TikTok/Reels Native', prompt: 'TikTok native style, vertical smartphone video, front-facing selfie camera, natural lighting, authentic genuine expression, casual vlog style, real person, unscripted natural moment, slight movement, raw footage feel' },
  { value: 'influencer-casual', label: '✨ Influencer Casual', prompt: 'casual influencer style video, soft natural daylight, relaxed authentic vibe, smartphone selfie footage, genuine smile and emotion, lifestyle content, approachable real person, subtle natural movement' },
  { value: 'pov-realistic', label: '👁️ POV Realistic', prompt: 'POV first-person perspective, realistic handheld camera, natural lighting, immersive authentic footage, slight natural camera movement, raw unprocessed look, realistic environment' },
  { value: 'documentary-real', label: '🎬 Documentary Real', prompt: 'documentary style, raw authentic footage, natural available lighting, candid unposed moment, real genuine emotion, observational camera, unscripted natural behavior' },
  { value: 'vlog-style', label: '📹 Vlog Style', prompt: 'vlog style video, talking to camera, natural daylight, casual setting, genuine personality, handheld smartphone footage, authentic real person, conversational tone' },
  // Cinematic
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'cinematic epic', label: 'Cinematic Epic' },
  { value: 'blockbuster', label: 'Hollywood Blockbuster' },
  { value: 'indie film', label: 'Indie Film' },
  // Documentary
  { value: 'documentary', label: 'Documentary' },
  { value: 'nature doc', label: 'Nature Documentary' },
  // Artistic
  { value: 'dreamy', label: 'Dreamy / Ethereal' },
  { value: 'surreal', label: 'Surreal' },
  { value: 'abstract', label: 'Abstract Motion' },
  // Retro/Vintage
  { value: 'vintage film', label: 'Vintage Film (70s)' },
  { value: 'vhs retro', label: '80s VHS' },
  { value: 'noir', label: 'Film Noir' },
  { value: 'silent film', label: 'Silent Film Era' },
  { value: 'old hollywood', label: 'Old Hollywood' },
  // Animation
  { value: 'anime', label: 'Anime Style' },
  { value: 'cartoon', label: 'Cartoon Animation' },
  { value: 'stop motion', label: 'Stop Motion' },
  { value: 'pixar 3d', label: 'Pixar 3D Style' },
  // Speed
  { value: 'slow motion', label: 'Slow Motion' },
  { value: 'hyper slo-mo', label: 'Hyper Slow Motion' },
  { value: 'timelapse', label: 'Time-lapse' },
  { value: 'hyperlapse', label: 'Hyperlapse' },
  // Modern
  { value: 'music video', label: 'Music Video' },
  { value: 'commercial', label: 'Commercial/Ad' },
  { value: 'social media', label: 'Social Media' },
];

// Description Presets (Prefilled prompts)
const DESCRIPTION_PRESETS = [
  // ⭐ REALISTIC / UGC ESSENTIALS
  { 
    id: 'realistic-basic',
    label: '📱 Realistic Basic',
    prompt: 'real person, genuine emotion, natural lighting, unfiltered, authentic moment'
  },
  { 
    id: 'selfie-talking',
    label: '🗣️ Selfie Talking',
    prompt: 'person talking naturally to camera, genuine facial expressions, subtle head movements, natural eye contact, authentic speech movements, real person in natural setting'
  },
  { 
    id: 'ugc-testimonial',
    label: '🎤 UGC Testimonial',
    prompt: 'authentic testimonial style, person speaking genuinely, natural pauses, real emotions, relatable everyday person, casual home or office background, soft ambient lighting'
  },
  { 
    id: 'iphone-raw',
    label: '📲 iPhone Raw Footage',
    prompt: 'raw iPhone video quality, front-facing camera perspective, slight natural hand movement, realistic skin texture and pores, natural ambient indoor lighting, unedited unfiltered look'
  },
  { 
    id: 'natural-portrait',
    label: '👤 Natural Portrait',
    prompt: 'natural portrait, person with genuine subtle smile, soft window lighting on face, natural skin texture, authentic relaxed expression, gentle natural movement'
  },
  { 
    id: 'candid-moment',
    label: '✨ Candid Moment',
    prompt: 'candid unposed moment, genuine spontaneous reaction, natural authentic behavior, real unscripted emotion, everyday life setting'
  },
  { 
    id: 'influencer-style',
    label: '💫 Influencer Natural',
    prompt: 'influencer style but authentic, natural charisma, genuine smile, soft flattering daylight, relaxed confident energy, approachable real person vibe'
  },
  { 
    id: 'product-review',
    label: '📦 Product Review UGC',
    prompt: 'authentic product review style, person naturally interacting with product, genuine reactions, casual home setting, real person demonstration, unscripted natural presentation'
  },
  { 
    id: 'emotional-genuine',
    label: '😊 Emotional & Genuine',
    prompt: 'genuine emotional expression, real heartfelt moment, natural tears or laughter, authentic vulnerability, unfiltered raw emotion, real human connection'
  },
  { 
    id: 'day-in-life',
    label: '🌅 Day in Life',
    prompt: 'day in the life style, casual everyday moment, natural activities, authentic lifestyle content, real person in their environment, documentary feel'
  },
];

// ⭐ EFFECT COMBO PRESETS (Quick multi-effect selections)
const EFFECT_COMBOS = [
  { 
    id: 'realistic-person',
    label: '🤳 Realistic Person',
    effects: ['natural eye blinks', 'subtle facial expression changes', 'natural breathing movement', 'subtle hair movement'],
    description: 'All natural human micro-movements'
  },
  { 
    id: 'talking-head',
    label: '🗣️ Talking Head',
    effects: ['natural eye blinks', 'lip and mouth movement', 'subtle head movement', 'natural breathing'],
    description: 'For speech/talking videos'
  },
  { 
    id: 'lifestyle-natural',
    label: '✨ Lifestyle Natural',
    effects: ['natural eye blinks', 'subtle smile', 'gentle body sway', 'soft ambient light'],
    description: 'Casual lifestyle content'
  },
  { 
    id: 'cinematic-portrait',
    label: '🎬 Cinematic Portrait',
    effects: ['subtle expression change', 'light rays', 'bokeh blur background', 'film grain'],
    description: 'Dramatic portrait style'
  },
  { 
    id: 'dreamy-soft',
    label: '💫 Dreamy Soft',
    effects: ['soft glow', 'bokeh', 'light leak', 'gentle floating particles'],
    description: 'Ethereal dreamy look'
  },
  { 
    id: 'outdoor-natural',
    label: '🌿 Outdoor Natural',
    effects: ['natural wind in hair', 'dappled sunlight', 'subtle lens flare', 'ambient nature movement'],
    description: 'Natural outdoor setting'
  },
];

// Individual Special Effects
const SPECIAL_EFFECTS = [
  // 🤳 REALISTIC / NATURAL (Best for UGC/Selfie)
  { value: 'natural eye blinks', label: '👁️ Natural Eye Blinks', category: 'realistic' },
  { value: 'subtle facial expression changes', label: '😊 Subtle Expression Change', category: 'realistic' },
  { value: 'natural breathing movement', label: '😮‍💨 Natural Breathing', category: 'realistic' },
  { value: 'subtle hair movement', label: '💇 Subtle Hair Movement', category: 'realistic' },
  { value: 'lip and mouth movement', label: '👄 Lip/Mouth Movement', category: 'realistic' },
  { value: 'subtle head movement', label: '🙂 Subtle Head Movement', category: 'realistic' },
  { value: 'gentle body sway', label: '🧍 Gentle Body Sway', category: 'realistic' },
  { value: 'subtle smile', label: '😊 Subtle Smile', category: 'realistic' },
  // ✨ Light Effects
  { value: 'light rays', label: 'Light Rays / God Rays', category: 'light' },
  { value: 'lens flare', label: 'Lens Flare', category: 'light' },
  { value: 'bokeh blur background', label: 'Bokeh Blur', category: 'light' },
  { value: 'soft glow', label: 'Soft Glow', category: 'light' },
  { value: 'light leak', label: 'Light Leak', category: 'light' },
  { value: 'neon glow', label: 'Neon Glow', category: 'light' },
  { value: 'dappled sunlight', label: 'Dappled Sunlight', category: 'light' },
  // 🎬 Film Effects  
  { value: 'film grain', label: 'Film Grain', category: 'film' },
  { value: 'vignette', label: 'Vignette', category: 'film' },
  { value: 'chromatic aberration', label: 'Chromatic Aberration', category: 'film' },
  { value: 'motion blur', label: 'Motion Blur', category: 'film' },
  // 🌟 Particles
  { value: 'gentle floating particles', label: 'Floating Particles', category: 'particles' },
  { value: 'dust motes in light', label: 'Dust Motes', category: 'particles' },
  { value: 'sparkles', label: 'Sparkles/Glitter', category: 'particles' },
  { value: 'floating embers', label: 'Floating Embers', category: 'particles' },
  // 🌧️ Weather/Nature
  { value: 'natural wind in hair', label: 'Wind in Hair', category: 'nature' },
  { value: 'rain', label: 'Rain', category: 'nature' },
  { value: 'snow falling', label: 'Snow', category: 'nature' },
  { value: 'fog mist', label: 'Fog / Mist', category: 'nature' },
  { value: 'falling leaves', label: 'Falling Leaves', category: 'nature' },
  { value: 'flower petals', label: 'Flower Petals', category: 'nature' },
];

/**
 * JumpStartModal - Image to Video Generation
 */
export default function JumpStartModal({ 
  isOpen, 
  onClose, 
  username = 'default',
  onVideoGenerated,
  isEmbedded = false
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [capturedCanvasData, setCapturedCanvasData] = useState(null);
  
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tool, setTool] = useState('move');
  const [brushSize, setBrushSize] = useState(30);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const currentStrokeRef = useRef([]);
  const isDrawingRef = useRef(false);
  const brushPanelRef = useRef(null);
  
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

  const [loadingMessage, setLoadingMessage] = useState('');
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [rightPanel, setRightPanel] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Video settings
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('480p');
  const [duration, setDuration] = useState(5);
  const [cameraMovement, setCameraMovement] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [videoStyle, setVideoStyle] = useState('');
  const [specialEffects, setSpecialEffects] = useState([]);
  const [sceneDescription, setSceneDescription] = useState('');
  const [description, setDescription] = useState('');
  
  // Generated video
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [hasAddedToEditor, setHasAddedToEditor] = useState(false);
  const [lastPromptUsed, setLastPromptUsed] = useState('');
  
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setCapturedCanvasData(null);
      setImages([]);
      setSelectedId(null);
      setIsLoading(false);
      setTool('move');
      setBrushSize(30);
      setShowBrushPanel(false);
      setLoadingMessage('');
      setShowUrlImport(false);
      setRightPanel(null);
      setUrlInput('');
      setSearchQuery('');
      setSearchResults([]);
      setAspectRatio('16:9');
      setResolution('480p');
      setDuration(5);
      setCameraMovement('');
      setCameraAngle('');
      setVideoStyle('');
      setSpecialEffects([]);
      setSceneDescription('');
      setDescription('');
      setGeneratedVideoUrl(null);
      setHasAddedToEditor(false);
      setLastPromptUsed('');
    }
  }, [isOpen]);

  // Calculate canvas dimensions
  const getCanvasDimensions = () => {
    const config = ASPECT_RATIOS[aspectRatio];
    const targetWidth = resolution === '720p' ? config.width720 : config.width480;
    const targetHeight = resolution === '720p' ? config.height720 : config.height480;
    
    const maxModalWidth = Math.min(windowSize.width * 0.9, 1600);
    const maxModalHeight = windowSize.height * 0.9;

    const LEFT_SIDEBAR_WIDTH = 64;
    const RIGHT_PANEL_WIDTH = rightPanel ? 320 : 0;
    const MODAL_HORIZONTAL_PADDING = 48;
    const MODAL_VERTICAL_PADDING = 240;
    const CANVAS_VIEWPORT_PADDING = 20;

    const canvasViewportWidth = maxModalWidth - LEFT_SIDEBAR_WIDTH - RIGHT_PANEL_WIDTH - MODAL_HORIZONTAL_PADDING;
    const canvasViewportHeight = Math.max(400, Math.round(maxModalHeight - MODAL_VERTICAL_PADDING));

    const canvasAvailableWidth = Math.max(200, Math.floor(canvasViewportWidth - CANVAS_VIEWPORT_PADDING * 2));
    const canvasAvailableHeight = Math.max(200, Math.floor(canvasViewportHeight - CANVAS_VIEWPORT_PADDING * 2));
    
    const scale = Math.min(canvasAvailableWidth / targetWidth, canvasAvailableHeight / targetHeight);
    
    return {
      displayWidth: Math.round(targetWidth * scale),
      displayHeight: Math.round(targetHeight * scale),
      outputWidth: targetWidth,
      outputHeight: targetHeight,
      viewportWidth: canvasViewportWidth,
      viewportHeight: canvasViewportHeight
    };
  };
  
  const canvasDimensions = getCanvasDimensions();
  const canvasWidth = canvasDimensions.displayWidth;
  const canvasHeight = canvasDimensions.displayHeight;

  const flattenCanvas = (format = 'image/jpeg') => {
    if (!stageRef.current) return null;
    
    const stage = stageRef.current;
    const transformers = stage.find('Transformer');
    transformers.forEach((tr) => tr.hide());
    
    const { outputWidth, outputHeight, displayWidth, displayHeight } = canvasDimensions;
    const pixelRatio = Math.max(outputWidth / displayWidth, outputHeight / displayHeight);
    
    const dataURL = stage.toDataURL({ 
      pixelRatio: pixelRatio,
      mimeType: format,
      quality: 0.95
    });
    
    transformers.forEach((tr) => tr.show());
    return dataURL;
  };

  const getViewportCenter = useCallback(() => {
    const stage = stageRef.current;
    let viewportCenterX = canvasWidth / 2;
    let viewportCenterY = canvasHeight / 2;
    
    if (stage) {
      const scale = stage.scaleX();
      const stageX = stage.x();
      const stageY = stage.y();
      viewportCenterX = (canvasWidth / 2 - stageX) / scale;
      viewportCenterY = (canvasHeight / 2 - stageY) / scale;
    }
    
    return { x: viewportCenterX, y: viewportCenterY };
  }, [canvasWidth, canvasHeight]);

  // Handle import from Library
  const handleLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const center = getViewportCenter();
        const newImage = {
          id: uuidv4(),
          src: url,
          x: center.x - img.width / 2,
          y: center.y - img.height / 2,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: images.length,
          masks: []
        };
        setImages((prev) => [...prev, newImage]);
        toast.success('Image added from library!');
      };
      
      img.onerror = () => {
        toast.error('Failed to load image from library');
      };
      
      img.src = url;
    }
  };

  // Handle import from URL
  const handleImportFromUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Importing image...');

    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const center = getViewportCenter();
        const newImage = {
          id: uuidv4(),
          src: urlInput,
          x: center.x - img.width / 2,
          y: center.y - img.height / 2,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: images.length,
          masks: []
        };
        setImages((prev) => [...prev, newImage]);
        toast.success('Image imported!');
        setIsLoading(false);
        setShowUrlImport(false);
        setUrlInput('');
      };
      
      img.onerror = () => {
        toast.error('Failed to load image from URL');
        setIsLoading(false);
      };
      
      img.src = urlInput;
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import image');
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => {
          const center = getViewportCenter();
          const newImage = {
            id: uuidv4(),
            src: event.target.result,
            x: center.x - img.width / 2,
            y: center.y - img.height / 2,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: images.length,
            masks: []
          };
          setImages((prev) => [...prev, newImage]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      const fakeEvent = { target: { files } };
      handleFileUpload(fakeEvent);
    }
  };

  const handleSelect = (id) => setSelectedId(id);

  const handleImageChange = (updatedImage) => {
    setImages((prev) =>
      prev.map((img) => (img.id === updatedImage.id ? updatedImage : img))
    );
  };

  const handleDelete = () => {
    if (selectedId) {
      setImages((prev) => prev.filter((img) => img.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleBringToFront = () => {
    if (!selectedId) return;
    setImages((prev) => {
      const maxZ = Math.max(...prev.map((img) => img.zIndex));
      return prev.map((img) =>
        img.id === selectedId ? { ...img, zIndex: maxZ + 1 } : img
      );
    });
  };

  const handleSendToBack = () => {
    if (!selectedId) return;
    setImages((prev) => {
      const minZ = Math.min(...prev.map((img) => img.zIndex));
      return prev.map((img) =>
        img.id === selectedId ? { ...img, zIndex: minZ - 1 } : img
      );
    });
  };

  const handleNextStep = () => {
    if (images.length === 0) {
      toast.error('Please add at least one image to the canvas');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Capturing composition...');

    setTimeout(() => {
      try {
        const data = flattenCanvas('image/jpeg');
        if (!data) {
          throw new Error('Failed to capture canvas');
        }
        setCapturedCanvasData(data);
        setCurrentStep(2);
      } catch (error) {
        console.error('Capture error:', error);
        toast.error('Failed to capture canvas. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const buildFullPrompt = () => {
    const parts = [];
    
    // SCENE DESCRIPTION FIRST - What's happening in the video
    if (sceneDescription.trim()) {
      parts.push(sceneDescription.trim());
    }
    
    // Check if video style has a detailed prompt (for realistic styles)
    const selectedStyle = VIDEO_STYLES.find(s => s.value === videoStyle);
    if (selectedStyle?.prompt) {
      // Use the detailed prompt for realistic styles
      parts.push(selectedStyle.prompt);
    } else if (videoStyle) {
      parts.push(`${videoStyle} style`);
    }
    
    // Add camera settings (but skip for realistic styles to preserve authenticity)
    const isRealisticStyle = selectedStyle?.prompt;
    if (!isRealisticStyle) {
      if (cameraMovement) parts.push(cameraMovement);
      if (cameraAngle) parts.push(`${cameraAngle} shot`);
    } else {
      // For realistic styles, only add subtle camera hints
      if (cameraMovement && cameraMovement.includes('slow')) {
        parts.push('subtle natural movement');
      }
    }
    
    // Add selected effects (now an array)
    if (specialEffects && specialEffects.length > 0) {
      parts.push(specialEffects.join(', '));
    }
    
    // Add style/motion presets
    if (description.trim()) parts.push(description.trim());
    
    // Add quality boosters
    if (isRealisticStyle) {
      parts.push('photorealistic, authentic, believable, natural motion');
    }
    
    return parts.join(', ') || 'smooth camera motion, high quality video';
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const pollForResult = async (requestId) => {
    try {
      const response = await fetch('/api/jumpstart/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) throw new Error('Failed to check status');

      const data = await response.json();
      
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
      } else {
        setLoadingMessage(`Generating video... (${data.status})`);
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleGenerateVideo = async () => {
    if (!capturedCanvasData) {
      toast.error('No composition found. Please go back and try again.');
      return;
    }

    const fullPrompt = buildFullPrompt();
    setLastPromptUsed(fullPrompt);

    setIsLoading(true);
    setLoadingMessage('Generating video... This may take 1-2 minutes');
    setGeneratedVideoUrl(null);
    stopPolling();

    try {
      const base64Data = capturedCanvasData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', blob, 'canvas.jpg');
      formData.append('prompt', fullPrompt);
      formData.append('username', username);
      formData.append('resolution', resolution);
      formData.append('duration', duration.toString());
      formData.append('aspectRatio', aspectRatio);

      const result = await fetch('/api/jumpstart/generate', {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const data = await result.json();
      
      if (data.videoUrl) {
        setIsLoading(false);
        setGeneratedVideoUrl(data.videoUrl);
        setCurrentStep(3);
        setHasAddedToEditor(false);
        toast.success('Video generated successfully!');
        return;
      }

      if (data.requestId) {
        setLoadingMessage('Video generation started. Checking status...');
        pollForResult(data.requestId);
        pollIntervalRef.current = setInterval(() => {
          pollForResult(data.requestId);
        }, 3000);
      } else {
        throw new Error('No request ID returned from API');
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
    link.download = 'stitch-video.mp4';
    link.href = generatedVideoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Video download started!');
  };

  const handleAddToEditor = () => {
    if (!generatedVideoUrl) {
      toast.error('No video to add yet');
      return;
    }
    if (onVideoGenerated) {
      onVideoGenerated(generatedVideoUrl);
      setHasAddedToEditor(true);
      toast.success('Added to editor!');
    }
  };

  const handleClose = () => {
    stopPolling();
    setCurrentStep(1);
    setCapturedCanvasData(null);
    setImages([]);
    setSelectedId(null);
    setGeneratedVideoUrl(null);
    setHasAddedToEditor(false);
    setLastPromptUsed('');
    setRightPanel(null);
    setSearchResults([]);
    setAspectRatio('16:9');
    setResolution('480p');
    setCameraMovement('');
    setCameraAngle('');
    setVideoStyle('');
    setSpecialEffects([]);
    setSceneDescription('');
    setDescription('');
    setDuration(5);
    onClose();
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
      else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setTool('move');
        setShowBrushPanel(false);
      }
      else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (selectedId) {
          setTool('eraser');
          setShowBrushPanel(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedId]);

  const renderContent = () => (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 flex-shrink-0">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <Video className="w-5 h-5 text-[#2C666E]" />
          JumpStart - Image to Video
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Compose images and generate animated videos with AI
        </p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Toolbar (Step 1 only) */}
        {currentStep === 1 && (
          <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Upload Image">
              <Upload className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowUrlImport(true)} title="Import from URL">
              <Link className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowLibrary(true)} title="From Library">
              <FolderOpen className="w-5 h-5" />
            </Button>
            <div className="h-px w-8 bg-gray-300 my-1" />
            <Button variant={tool === 'move' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setTool('move'); setShowBrushPanel(false); }} title="Move (V)">
              <Move className="w-5 h-5" />
            </Button>
            <Button variant={tool === 'eraser' ? 'secondary' : 'ghost'} size="icon" onClick={() => { setTool('eraser'); setShowBrushPanel(true); }} title="Eraser (E)" disabled={!selectedId}>
              <Eraser className="w-5 h-5" />
            </Button>
            <div className="h-px w-8 bg-gray-300 my-1" />
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={!selectedId} title="Delete Selected" className="text-red-500 hover:text-red-600">
              <Trash2 className="w-5 h-5" />
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" onClick={handleBringToFront} disabled={!selectedId} title="Bring to Front">
              <ChevronUp className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSendToBack} disabled={!selectedId} title="Send to Back">
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Step Indicator */}
          <div className="p-3 bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10 border-b border-gray-200 flex items-center shrink-0">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((step, idx) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center gap-2 ${currentStep === step ? 'text-[#07393C] font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === step ? 'bg-[#2C666E] text-white' : 'bg-gray-200 text-gray-500'}`}>{step}</div>
                    <span>{step === 1 ? 'Compose Image' : step === 2 ? 'Video Settings' : 'Preview'}</span>
                  </div>
                  {idx < 2 && <ArrowRight className="w-4 h-4 text-gray-300" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step 1: Canvas */}
          {currentStep === 1 && (
            <>
              <div className="p-3 bg-white border-b flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Aspect Ratio:</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    {Object.entries(ASPECT_RATIOS).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Quality:</label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="480p">480p (Fast)</option>
                    <option value="720p">720p (HD)</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500 ml-auto">
                  Output: {canvasDimensions.outputWidth} × {canvasDimensions.outputHeight}px
                </div>
              </div>

              <div 
                className="overflow-auto relative bg-gray-100 flex-1 flex items-center justify-center box-border min-h-0 w-full"
                style={{ padding: 20 }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="shadow-xl ring-1 ring-slate-300 box-content" style={{ width: canvasWidth, height: canvasHeight }}>
                  <div className="relative bg-white w-full h-full" style={{ boxShadow: 'inset 0 0 0 4px #475569' }}>
                    <CanvasBoard ref={stageRef} width={canvasWidth} height={canvasHeight} isPanning={tool === 'move'} onStageClick={() => setSelectedId(null)}>
                      <Rect width={canvasWidth} height={canvasHeight} fill="white" listening={false} />
                      {[...images].sort((a, b) => a.zIndex - b.zIndex).map((image) => (
                        <URLImage key={image.id} image={image} isSelected={image.id === selectedId} onSelect={() => handleSelect(image.id)} onChange={handleImageChange} isDraggable={tool === 'move'} />
                      ))}
                    </CanvasBoard>

                    {images.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center text-gray-400">
                          <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Drag & drop images or use the tools on the left</p>
                          <p className="text-xs mt-1">Canvas matches selected video dimensions</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border-t flex items-center justify-between shrink-0">
                <span className="text-sm text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''} added</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={handleNextStep} disabled={images.length === 0} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                    Next: Video Settings <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Video Settings */}
          {currentStep === 2 && (
            <>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-2xl mx-auto space-y-6">
                  {capturedCanvasData && (
                    <div className="bg-white rounded-lg p-4 border shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-500">
                        <ImageIcon className="w-4 h-4" />
                        <span>Composition to Animate</span>
                      </div>
                      <img src={capturedCanvasData} alt="Captured composition" className="w-full h-auto rounded border bg-gray-50 max-h-[200px] object-contain" />
                    </div>
                  )}

                  {/* SCENE DESCRIPTION - What happens in the video */}
                  <div className="bg-gradient-to-r from-[#2C666E]/10 to-[#90DDF0]/10 rounded-lg p-4 border-2 border-[#2C666E]/30 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Scene Description</h3>
                      <span className="text-xs text-[#2C666E] font-medium bg-[#2C666E]/10 px-2 py-0.5 rounded">Important!</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      Describe what happens in the video - the action, movement, and story.
                    </p>
                    <textarea 
                      value={sceneDescription} 
                      onChange={(e) => setSceneDescription(e.target.value)} 
                      placeholder="e.g., 'A woman smiles and talks to the camera, gesturing with her hands while explaining a product. She looks happy and enthusiastic.'"
                      className="w-full px-3 py-2 border border-[#2C666E]/30 rounded-lg text-sm bg-white resize-none h-24 focus:ring-2 focus:ring-[#2C666E]/50 focus:border-[#2C666E]" 
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-500">Quick ideas:</span>
                      {[
                        'Person talking to camera',
                        'Slow smile and nod',
                        'Looking around naturally',
                        'Holding up a product',
                        'Walking towards camera',
                      ].map(idea => (
                        <button
                          key={idea}
                          onClick={() => setSceneDescription(prev => prev ? `${prev}, ${idea.toLowerCase()}` : idea)}
                          className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-[#90DDF0]/30 hover:text-[#07393C] transition-colors"
                        >
                          + {idea}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Move className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Camera Movement</h3>
                    </div>
                    <select value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      {CAMERA_MOVEMENTS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Camera className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Camera Angle</h3>
                    </div>
                    <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      {CAMERA_ANGLES.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Video Style</h3>
                    </div>
                    <select value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      {VIDEO_STYLES.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-[#07393C]" />
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
                            title={combo.description}
                            className={`px-2 py-1 text-xs rounded-full border transition-all ${
                              JSON.stringify(specialEffects) === JSON.stringify(combo.effects)
                                ? 'bg-[#07393C] text-white border-[#07393C]'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#90DDF0]/30 hover:border-[#2C666E]/50'
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
                    
                    {/* Individual Effects - Grouped by Category */}
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                      {['realistic', 'light', 'film', 'particles', 'nature'].map(category => (
                        <div key={category}>
                          <p className="text-xs font-medium text-gray-500 capitalize mb-1">
                            {category === 'realistic' ? '🤳 Realistic' : 
                             category === 'light' ? '✨ Light' : 
                             category === 'film' ? '🎬 Film' : 
                             category === 'particles' ? '🌟 Particles' : '🌿 Nature'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {SPECIAL_EFFECTS.filter(e => e.category === category).map(effect => (
                              <button
                                key={effect.value}
                                onClick={() => {
                                  if (specialEffects.includes(effect.value)) {
                                    setSpecialEffects(specialEffects.filter(e => e !== effect.value));
                                  } else {
                                    setSpecialEffects([...specialEffects, effect.value]);
                                  }
                                }}
                                className={`px-1.5 py-0.5 text-xs rounded border transition-all ${
                                  specialEffects.includes(effect.value)
                                    ? 'bg-[#2C666E] text-white border-[#2C666E]'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#2C666E]'
                                }`}
                              >
                                {effect.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Selected Effects Display */}
                    {specialEffects.length > 0 && (
                      <div className="mt-2 text-xs text-[#07393C]">
                        <strong>Selected ({specialEffects.length}):</strong> {specialEffects.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Video Duration</h3>
                    </div>
                    <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value={5}>5 seconds</option>
                      <option value={8}>8 seconds</option>
                    </select>
                    <div className="mt-3 pt-3 border-t text-sm text-gray-500">
                      <strong>Output:</strong> {ASPECT_RATIOS[aspectRatio].label} @ {resolution}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-[#2C666E]" />
                      <h3 className="font-semibold text-gray-900">Description & Motion</h3>
                      <span className="text-xs text-gray-400">(click preset or type custom)</span>
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
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-[#90DDF0]/30 hover:border-[#2C666E]/50'
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
                      placeholder="Describe the motion and style... (e.g., 'real person, genuine emotion, natural lighting, unfiltered')" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none h-20" 
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

                  {(sceneDescription || cameraMovement || cameraAngle || videoStyle || specialEffects.length > 0 || description) && (
                    <div className="bg-[#90DDF0]/20 rounded-lg p-4 border border-[#2C666E]/30">
                      <h4 className="text-sm font-medium text-[#07393C] mb-2">Generated Prompt:</h4>
                      <p className="text-sm text-[#07393C] italic">{buildFullPrompt()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white border-t flex items-center justify-between shrink-0">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Canvas
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={handleGenerateVideo} disabled={isLoading || images.length === 0} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                    <Video className="w-4 h-4 mr-2" /> Create Video
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && (
            <>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Play className="w-5 h-5 text-[#2C666E]" />
                        <h3 className="font-semibold text-gray-900">Generated Video</h3>
                      </div>
                    </div>

                    {generatedVideoUrl ? (
                      <video src={generatedVideoUrl} controls className="w-full rounded bg-black max-h-[55vh]" style={{ objectFit: 'contain' }} autoPlay loop />
                    ) : (
                      <div className="text-sm text-gray-500">
                        No video URL found yet. Please wait a moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border-t flex items-center justify-between shrink-0">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
                </Button>
                <div className="flex gap-2">
                  {onVideoGenerated && (
                    <Button onClick={handleAddToEditor} disabled={!generatedVideoUrl || hasAddedToEditor} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                      {hasAddedToEditor ? 'Added' : 'Add to Editor'}
                    </Button>
                  )}
                  <Button onClick={handleDownloadVideo} className="bg-[#2C666E] hover:bg-[#07393C] text-white" disabled={!generatedVideoUrl}>
                    <Download className="w-4 h-4 mr-2" /> Download to Device
                  </Button>
                  <Button variant="outline" onClick={handleClose}>Close</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {renderContent()}
        <LoadingModal isOpen={isLoading} message={loadingMessage} />
        <Dialog open={showUrlImport} onOpenChange={setShowUrlImport}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Import Image from URL</DialogTitle>
              <DialogDescription>Enter the URL of an image to add it to your composition</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input type="text" placeholder="https://example.com/image.jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUrlImport(false)}>Cancel</Button>
                <Button onClick={handleImportFromUrl} className="bg-[#2C666E] hover:bg-[#07393C]">Import</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>JumpStart - Image to Video</DialogTitle>
            <DialogDescription>Compose images and generate animated videos with AI</DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>

      <LoadingModal isOpen={isLoading} message={loadingMessage} />

      <Dialog open={showUrlImport} onOpenChange={setShowUrlImport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Image from URL</DialogTitle>
            <DialogDescription>Enter the URL of an image to add it to your composition</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="text" placeholder="https://example.com/image.jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUrlImport(false)}>Cancel</Button>
              <Button onClick={handleImportFromUrl} className="bg-[#2C666E] hover:bg-[#07393C]">Import</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
