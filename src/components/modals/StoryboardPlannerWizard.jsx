import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Play,
  Loader2,
  Sparkles,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Video,
  Image as ImageIcon,
  Clapperboard,
  Send,
  Pause,
  RefreshCw,
  X,
  Check,
  Link,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { extractLastFrame } from '@/lib/frameExtractor';
import { supabase } from '@/lib/supabase';
import { getPromptText } from '@/lib/stylePresets';
import StyleGrid from '@/components/ui/StyleGrid';
import ImagineerModal from '@/components/modals/ImagineerModal';
import LibraryModal from '@/components/modals/LibraryModal';
import PropsPillSelector from '@/components/ui/PropsPillSelector';
import NegPromptPillSelector from '@/components/ui/NegPromptPillSelector';
import BrandStyleGuideSelector, { extractBrandStyleData } from '@/components/ui/BrandStyleGuideSelector';
import { STYLE_OPTIONS, LIGHTING_OPTIONS as BUILDER_LIGHTING, COLOR_GRADE_OPTIONS } from '@/components/ui/PromptBuilder';
import { getPropsLabels, getCombinedNegativePrompt } from '@/lib/creativePresets';
import WizardStepper from '@/components/ui/WizardStepper';

// ── Constants ──

const STORYBOARD_MODELS = [
  { id: 'kling-r2v-pro', label: 'Kling O3 Pro (R2V)', description: 'Best character consistency', supportsRefs: true },
  { id: 'kling-r2v-standard', label: 'Kling O3 Standard (R2V)', description: 'Faster, lower cost', supportsRefs: true },
  { id: 'seedance-pro', label: 'Seedance 1.5 Pro', description: 'High quality, audio support' },
  { id: 'veo3-fast', label: 'Veo 3.1 Fast', description: 'Google, flexible duration' },
  { id: 'grok-imagine', label: 'Grok Imagine (xAI)', description: 'Good quality with audio' },
  { id: 'kling-video', label: 'Kling 2.5 Turbo Pro', description: 'Cinematic motion' },
  { id: 'wavespeed-wan', label: 'Wavespeed WAN 2.2', description: 'Fast generation' },
];

const CAMERA_ANGLES = [
  'wide', 'medium', 'close-up', 'extreme close-up', 'bird-eye',
  'low-angle', 'over-shoulder', 'tracking', 'dutch angle', 'POV',
];

const ENVIRONMENTS = ['Street/Road', 'Sidewalk/Path', 'Park/Garden', 'Forest/Woods', 'Beach', 'Indoor', 'Playground', 'School', 'Shop/Store', 'Backyard'];
const ACTION_TYPES = ['Walking', 'Running', 'Riding', 'Standing', 'Sitting', 'Jumping', 'Looking', 'Turning', 'Stopping', 'Interacting'];
const EXPRESSIONS = ['Happy/Smiling', 'Focused/Determined', 'Surprised', 'Worried/Concerned', 'Excited', 'Calm/Peaceful', 'Curious', 'Cautious'];
const LIGHTING_OPTIONS = ['Golden Hour', 'Bright Midday', 'Soft Morning', 'Blue Hour/Dusk', 'Overcast', 'Night/Moonlit', 'Sunset Glow'];
const CAMERA_MOVEMENTS = ['Static', 'Pan Left', 'Pan Right', 'Tracking Follow', 'Dolly In', 'Dolly Out', 'Orbit', 'Crane Up', 'Crane Down'];
const MOODS = ['Joyful/Happy', 'Dramatic', 'Peaceful/Calm', 'Mysterious', 'Energetic', 'Tense/Suspenseful', 'Playful', 'Inspirational'];

const WIZARD_STEPS = [
  { key: 'story', label: 'Story & Mood' },
  { key: 'style', label: 'Visual Style' },
  { key: 'characters', label: 'Characters' },
  { key: 'scene-builder', label: 'Scene Builder' },
  { key: 'settings', label: 'Frame & Model' },
  { key: 'scenes', label: 'Scenes' },
  { key: 'generating', label: 'Generate' },
];

const EMPTY_SCENE_GUIDE = {
  action: '',
  environment: '',
  environmentDetail: '',
  actionType: '',
  expression: '',
  lighting: '',
  cameraAngle: '',
  cameraMovement: '',
};

// ── Wizard-sized PillSelector (bigger pills than the original) ──

function PillSelector({ options, value, onChange, label }) {
  return (
    <div>
      {label && <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              value === opt
                ? 'bg-[#2C666E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Wizard Component ──

export default function StoryboardPlannerWizard({ isOpen, onClose, onScenesComplete, initialImage = null }) {
  // Step state
  const [step, setStep] = useState('story');
  const [completedSteps, setCompletedSteps] = useState([]);

  // Story builder state
  const [storyOverview, setStoryOverview] = useState('');
  const [overallMood, setOverallMood] = useState('');
  const [builderStyle, setBuilderStyle] = useState('');
  const [builderLighting, setBuilderLighting] = useState('');
  const [builderColorGrade, setBuilderColorGrade] = useState('');
  const [sceneGuides, setSceneGuides] = useState(
    Array.from({ length: 4 }, () => ({ ...EMPTY_SCENE_GUIDE }))
  );

  // Setup state
  const [description, setDescription] = useState('');
  const [numScenes, setNumScenes] = useState(4);
  const [style, setStyle] = useState('cinematic');
  const [defaultDuration, setDefaultDuration] = useState(5);
  const [model, setModel] = useState('kling-r2v-pro');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Props, neg prompts, brand style
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedNegPills, setSelectedNegPills] = useState([]);
  const [negFreetext, setNegFreetext] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Elements
  const createEmptyElement = (index) => ({
    id: `el-${Date.now()}-${index}`,
    label: `Element ${index + 1}`,
    description: '',
    refs: [],
    frontalIndex: 0,
    analyzing: false,
  });
  const [elements, setElements] = useState([createEmptyElement(0)]);
  const [activeElementIndex, setActiveElementIndex] = useState(0);

  // Starting scene image state
  const [startFrameUrl, setStartFrameUrl] = useState(null);
  const [startFrameDescription, setStartFrameDescription] = useState('');
  const [analyzingStartFrame, setAnalyzingStartFrame] = useState(false);
  const [showImagineerForStartFrame, setShowImagineerForStartFrame] = useState(false);
  const [showLibraryForStartFrame, setShowLibraryForStartFrame] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [generatingStartFrame, setGeneratingStartFrame] = useState(false);
  const [pollingStartFrame, setPollingStartFrame] = useState(false);

  // Library browser for character refs
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryFolders, setLibraryFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [libraryLoading, setLibraryLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Scene cards state
  const [scenes, setScenes] = useState([]);
  const [storyboardTitle, setStoryboardTitle] = useState('');
  const [generatingScenes, setGeneratingScenes] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationCancelled, setGenerationCancelled] = useState(false);
  const cancelRef = useRef(false);

  // Polling state for async models
  const [pollingScene, setPollingScene] = useState(null);

  // ── Effects ──

  // Sync sceneGuides length with numScenes
  useEffect(() => {
    setSceneGuides(prev => {
      if (prev.length === numScenes) return prev;
      if (prev.length < numScenes) {
        return [...prev, ...Array.from({ length: numScenes - prev.length }, () => ({ ...EMPTY_SCENE_GUIDE }))];
      }
      return prev.slice(0, numScenes);
    });
  }, [numScenes]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('story');
      setCompletedSteps([]);
      setDescription('');
      setNumScenes(4);
      setStyle('cinematic');
      setDefaultDuration(5);
      setStoryOverview('');
      setOverallMood('');
      setBuilderStyle('');
      setBuilderLighting('');
      setBuilderColorGrade('');
      setSceneGuides(Array.from({ length: 4 }, () => ({ ...EMPTY_SCENE_GUIDE })));
      setElements([createEmptyElement(0)]);
      setActiveElementIndex(0);
      setStartFrameUrl(null);
      setStartFrameDescription('');
      setAnalyzingStartFrame(false);
      setShowImagineerForStartFrame(false);
      setShowLibraryForStartFrame(false);
      setShowUrlImport(false);
      setImportUrl('');
      setImportingUrl(false);
      setGeneratingStartFrame(false);
      setPollingStartFrame(false);
      setSelectedProps([]);
      setSelectedNegPills([]);
      setNegFreetext('');
      setSelectedBrand(null);
      setScenes([]);
      setStoryboardTitle('');
      setGenerating(false);
      setGenerationCancelled(false);
      cancelRef.current = false;
    }
  }, [isOpen]);

  // Pre-populate start frame from initialImage
  useEffect(() => {
    if (isOpen && initialImage) {
      setStartFrameUrl(initialImage);
      analyzeStartFrame(initialImage);
    }
  }, [isOpen, initialImage]);

  // ── Helpers ──

  const updateSceneGuide = (index, updates) => {
    setSceneGuides(prev => prev.map((g, i) => i === index ? { ...g, ...updates } : g));
  };

  // ── Library browser ──
  const loadLibrary = async () => {
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('image_library_items')
        .select('id, url, title, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLibraryItems(data || []);
      const folders = [...new Set(
        (data || []).map(i => i.title?.match(/^\[([^\]]+)\]/)?.[1]).filter(Boolean)
      )];
      setLibraryFolders(folders);
    } catch (err) {
      toast.error('Failed to load library');
    } finally {
      setLibraryLoading(false);
    }
  };

  const openLibrary = () => {
    setShowLibrary(true);
    setSelectedIds(new Set());
    setSelectedFolder(null);
    loadLibrary();
  };

  // ── Element helpers ──
  const updateElement = (index, updates) => {
    setElements(prev => prev.map((el, i) => i === index ? { ...el, ...updates } : el));
  };

  const addElement = () => {
    if (elements.length >= 4) {
      toast.error('Maximum 4 elements allowed');
      return;
    }
    setElements(prev => [...prev, createEmptyElement(prev.length)]);
    setActiveElementIndex(elements.length);
  };

  const removeElement = (index) => {
    if (elements.length <= 1) return;
    setElements(prev => prev.filter((_, i) => i !== index));
    if (activeElementIndex >= elements.length - 1) {
      setActiveElementIndex(Math.max(0, elements.length - 2));
    }
  };

  // Auto-describe character from image for a specific element
  const describeCharacterFromImage = async (imageUrl, elementIndex) => {
    if (!imageUrl) return;
    updateElement(elementIndex, { analyzing: true });
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        updateElement(elementIndex, { description: data.description });
        toast.success(`@Element${elementIndex + 1} description generated`);
      } else {
        toast.error(data.error || 'Could not describe character');
      }
    } catch (err) {
      toast.error('Character analysis failed: ' + err.message);
    } finally {
      updateElement(elementIndex, { analyzing: false });
    }
  };

  const importFromLibrary = () => {
    const selected = libraryItems.filter(i => selectedIds.has(i.id));
    const urls = selected.map(i => i.url);
    const el = elements[activeElementIndex];
    const isFirstRef = el.refs.length === 0;
    const capped = urls.slice(0, 3 - el.refs.length);
    updateElement(activeElementIndex, { refs: [...el.refs, ...capped] });
    setShowLibrary(false);
    toast.success(`Added ${capped.length} reference image(s) to @Element${activeElementIndex + 1}`);
    if (isFirstRef && capped.length > 0 && !el.description) {
      describeCharacterFromImage(capped[0], activeElementIndex);
    }
  };

  // ── Start Frame handlers ──
  const handleStartFrameGenerate = async (params) => {
    setGeneratingStartFrame(true);
    try {
      const res = await apiFetch('/api/imagineer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();

      if (data.imageUrl) {
        setStartFrameUrl(data.imageUrl);
        toast.success('Starting scene image generated');
        analyzeStartFrame(data.imageUrl);
        apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: data.imageUrl, type: 'image', title: '[Storyboard] Start Frame', source: 'storyboard' }),
        }).catch(() => {});
      } else if (data.requestId) {
        setPollingStartFrame(true);
        const maxAttempts = 120;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            const pollRes = await apiFetch('/api/imagineer/result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId: data.requestId, model: data.model || params.model }),
            });
            const pollData = await pollRes.json();
            if (pollData.imageUrl) {
              setStartFrameUrl(pollData.imageUrl);
              toast.success('Starting scene image generated');
              analyzeStartFrame(pollData.imageUrl);
              apiFetch('/api/library/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: pollData.imageUrl, type: 'image', title: '[Storyboard] Start Frame', source: 'storyboard' }),
              }).catch(() => {});
              break;
            }
            if (pollData.status === 'failed' || pollData.error) {
              throw new Error(pollData.error || 'Generation failed');
            }
          } catch (err) {
            if (err.message !== 'Generation failed') continue;
            throw err;
          }
        }
        setPollingStartFrame(false);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      toast.error('Start frame generation failed: ' + err.message);
    } finally {
      setGeneratingStartFrame(false);
      setPollingStartFrame(false);
    }
  };

  const analyzeStartFrame = async (imageUrl) => {
    if (!imageUrl || analyzingStartFrame) return;
    setAnalyzingStartFrame(true);
    try {
      const res = await apiFetch('/api/storyboard/describe-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setStartFrameDescription(data.description);
        toast.success('Scene analyzed');
      }
    } catch (err) {
      console.warn('[Storyboard] Scene analysis failed:', err.message);
    } finally {
      setAnalyzingStartFrame(false);
    }
  };

  const handleStartFrameFromLibrary = (item) => {
    setStartFrameUrl(item.url);
    setShowLibraryForStartFrame(false);
    toast.success('Starting scene image selected from library');
    analyzeStartFrame(item.url);
  };

  const handleImportUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImportingUrl(true);
    try {
      const res = await apiFetch('/api/images/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        setStartFrameUrl(data.url);
        setShowUrlImport(false);
        setImportUrl('');
        analyzeStartFrame(data.url);
        toast.success('Image imported successfully');
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err) {
      toast.error('URL import failed: ' + err.message);
    } finally {
      setImportingUrl(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const el = elements[activeElementIndex];
    const isFirstRef = el.refs.length === 0;
    const remaining = 3 - el.refs.length;
    const filesToProcess = files.slice(0, remaining);

    for (const file of filesToProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        setElements(prev => prev.map((prevEl, i) => {
          if (i !== activeElementIndex) return prevEl;
          const updated = { ...prevEl, refs: [...prevEl.refs, reader.result] };
          if (isFirstRef && prevEl.refs.length === 0 && !prevEl.description) {
            describeCharacterFromImage(reader.result, activeElementIndex);
          }
          return updated;
        }));
      };
      reader.readAsDataURL(file);
    }
    if (filesToProcess.length < files.length) {
      toast.info(`Only ${filesToProcess.length} of ${files.length} images added (max 3 per element)`);
    }
    e.target.value = '';
  };

  // ── AI Scene Generation ──
  const generateSceneBreakdown = async () => {
    if (!storyOverview.trim()) {
      toast.error('Please provide a story overview');
      return;
    }
    setGeneratingScenes(true);
    try {
      const res = await apiFetch('/api/storyboard/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: storyOverview,
          numScenes,
          style: getPromptText(style) || style,
          defaultDuration,
          overallMood,
          sceneGuides: sceneGuides.map((g, i) => ({ sceneNumber: i + 1, ...g })),
          elements: elements
            .filter(el => el.refs.length > 0 || el.description)
            .map((el, i) => ({ index: i + 1, description: el.description })),
          hasStartFrame: !!startFrameUrl,
          startFrameDescription: startFrameDescription || '',
          props: getPropsLabels(selectedProps),
          negativePrompt: getCombinedNegativePrompt(selectedNegPills, negFreetext),
          brandStyleGuide: extractBrandStyleData(selectedBrand),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate scenes');

      setStoryboardTitle(data.title);
      setScenes(data.scenes.map((s, i) => ({
        ...s,
        id: `scene-${Date.now()}-${i}`,
        status: 'pending',
        videoUrl: null,
        lastFrameUrl: null,
        startFrameUrl: null,
      })));
      setStep('scenes');
      markStepCompleted('settings');
      toast.success(`Generated ${data.scenes.length} scenes`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGeneratingScenes(false);
    }
  };

  // ── Scene editing helpers ──
  const updateScene = (id, updates) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeScene = (id) => {
    setScenes(prev => prev.filter(s => s.id !== id));
  };

  const addScene = () => {
    setScenes(prev => [...prev, {
      id: `scene-${Date.now()}`,
      sceneNumber: prev.length + 1,
      visualPrompt: '',
      motionPrompt: '',
      durationSeconds: defaultDuration,
      cameraAngle: 'medium',
      narrativeNote: '',
      status: 'pending',
      videoUrl: null,
      lastFrameUrl: null,
      startFrameUrl: null,
    }]);
  };

  const moveScene = (index, direction) => {
    const newScenes = [...scenes];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newScenes.length) return;
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    newScenes.forEach((s, i) => s.sceneNumber = i + 1);
    setScenes(newScenes);
  };

  // ── Video Generation (sequential with frame chaining) ──
  const pollForResult = async (requestId, modelId) => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      if (cancelRef.current) throw new Error('Cancelled');
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await apiFetch('/api/jumpstart/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, model: modelId }),
        });
        const data = await res.json();
        if (data.videoUrl) return data.videoUrl;
        if (data.status === 'failed' || data.error) throw new Error(data.error || 'Generation failed');
      } catch (err) {
        if (err.message === 'Cancelled') throw err;
      }
    }
    throw new Error('Generation timed out');
  };

  const upscaledElementsCache = useRef(null);

  const generateSingleScene = async (scene, startFrameUrlForScene) => {
    const selectedModel = STORYBOARD_MODELS.find(m => m.id === model);
    const elementsWithRefs = elements.filter(el => el.refs.length > 0);
    const isR2V = selectedModel?.supportsRefs && elementsWithRefs.length > 0;

    const styleText = getPromptText(style);
    let prompt = scene.visualPrompt;
    if (scene.motionPrompt) {
      prompt += `. Camera: ${scene.motionPrompt}`;
    }
    if (styleText) {
      prompt += `. Style: ${styleText}`;
    }
    if (builderStyle) prompt += `. Style: ${builderStyle}`;
    if (overallMood) prompt += `. Mood: ${overallMood}`;
    if (builderLighting) prompt += `. Lighting: ${builderLighting}`;
    if (builderColorGrade) prompt += `. Color grade: ${builderColorGrade}`;

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('model', model);
    formData.append('duration', String(scene.durationSeconds));
    formData.append('aspectRatio', aspectRatio);
    formData.append('resolution', '720p');

    const imageUrl = startFrameUrlForScene || elementsWithRefs[0]?.refs[0] || null;
    if (!imageUrl) {
      throw new Error('No start image available. Add a starting scene image or character reference images.');
    }

    const resp = await fetch(imageUrl);
    const imageBlob = await resp.blob();
    formData.append('image', imageBlob, 'frame.jpg');

    if (isR2V) {
      if (upscaledElementsCache.current) {
        formData.append('r2vElementsPreUpscaled', JSON.stringify(upscaledElementsCache.current));
      } else {
        const r2vElements = elementsWithRefs.map(el => ({
          frontalImageUrl: el.refs[el.frontalIndex] || el.refs[0],
          referenceImageUrls: el.refs.slice(0, 3),
        }));
        formData.append('r2vElements', JSON.stringify(r2vElements));
        formData.append('referenceImages', JSON.stringify(elementsWithRefs[0].refs));
        formData.append('frontalImageUrl', elementsWithRefs[0].refs[elementsWithRefs[0].frontalIndex] || elementsWithRefs[0].refs[0]);
      }
    }

    formData.append('negativePrompt', 'blur, blurry, out of focus, distorted, deformed, disfigured, low quality, low resolution, pixelated, blocky, flat shading, flat lighting, overexposed, underexposed, text, words, watermark, logo, letterbox, black bars, ugly, amateur, draft quality, rough edges, jagged lines, artifacts, noise, grain');

    const res = await apiFetch('/api/jumpstart/generate', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.upscaledElements && !upscaledElementsCache.current) {
      upscaledElementsCache.current = data.upscaledElements;
      console.log('[Storyboard] Cached upscaled R2V elements for subsequent scenes');
    }

    if (data.videoUrl) return data.videoUrl;
    if (data.requestId) {
      setPollingScene(scene.id);
      const videoUrl = await pollForResult(data.requestId, data.model || model);
      setPollingScene(null);
      return videoUrl;
    }
    throw new Error(data.error || 'Generation failed');
  };

  const generateNextScene = async () => {
    const nextIndex = scenes.findIndex(s => s.status === 'pending' || s.status === 'error');
    if (nextIndex < 0) {
      toast.success('All scenes generated!');
      return;
    }

    if (step !== 'generating') setStep('generating');
    setGenerating(true);
    cancelRef.current = false;

    const scene = scenes[nextIndex];

    let frameUrl = null;
    if (nextIndex > 0) {
      const prev = scenes[nextIndex - 1];
      frameUrl = prev.lastFrameUrl || null;
    }
    if (!frameUrl) {
      frameUrl = startFrameUrl || null;
    }

    updateScene(scene.id, { status: 'generating', startFrameUrl: frameUrl });

    try {
      const videoUrl = await generateSingleScene(scene, frameUrl);

      let lastFrame = null;
      try {
        lastFrame = await extractLastFrame(videoUrl);
        console.log(`[Storyboard] Extracted last frame from scene ${nextIndex + 1}:`, lastFrame?.substring(0, 80));
      } catch (err) {
        console.error(`[Storyboard] Failed to extract last frame from scene ${nextIndex + 1}:`, err.message);
        toast.error(`Warning: Could not extract last frame from scene ${nextIndex + 1} — next scene may not chain correctly`);
      }

      updateScene(scene.id, {
        status: 'done',
        videoUrl,
        lastFrameUrl: lastFrame,
      });

      apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl,
          type: 'video',
          title: `[Storyboard] Scene ${nextIndex + 1} - ${storyboardTitle}`,
          source: 'storyboard',
        }),
      }).catch(err => console.warn('Failed to save to library:', err));

      toast.success(`Scene ${nextIndex + 1} generated — review before continuing`);

    } catch (err) {
      if (err.message !== 'Cancelled') {
        updateScene(scene.id, { status: 'error' });
        toast.error(`Scene ${nextIndex + 1} failed: ${err.message}`);
      }
    }

    setGenerating(false);
  };

  const generateAllRemaining = async () => {
    setStep('generating');
    setGenerating(true);
    cancelRef.current = false;
    setGenerationCancelled(false);

    for (let i = 0; i < scenes.length; i++) {
      if (cancelRef.current) {
        toast('Generation cancelled');
        break;
      }

      const scene = scenes[i];
      if (scene.status === 'done') continue;

      let frameUrl = null;
      if (i > 0) {
        const prev = scenes[i - 1];
        frameUrl = prev.lastFrameUrl || null;
      }
      if (!frameUrl) {
        frameUrl = startFrameUrl || null;
      }

      updateScene(scene.id, { status: 'generating', startFrameUrl: frameUrl });

      try {
        const videoUrl = await generateSingleScene(scene, frameUrl);

        let lastFrame = null;
        try {
          lastFrame = await extractLastFrame(videoUrl);
          console.log(`[Storyboard] Extracted last frame from scene ${i + 1}:`, lastFrame?.substring(0, 80));
        } catch (err) {
          console.error(`[Storyboard] Failed to extract last frame from scene ${i + 1}:`, err.message);
          toast.error(`Warning: Could not extract last frame from scene ${i + 1} — next scene may not chain correctly`);
        }

        updateScene(scene.id, {
          status: 'done',
          videoUrl,
          lastFrameUrl: lastFrame,
        });

        apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: videoUrl,
            type: 'video',
            title: `[Storyboard] Scene ${i + 1} - ${storyboardTitle}`,
            source: 'storyboard',
          }),
        }).catch(err => console.warn('Failed to save to library:', err));

      } catch (err) {
        if (err.message === 'Cancelled') break;
        updateScene(scene.id, { status: 'error' });
        toast.error(`Scene ${i + 1} failed: ${err.message}`);
      }
    }

    setGenerating(false);
  };

  const cancelGeneration = () => {
    cancelRef.current = true;
    setGenerationCancelled(true);
  };

  const regenerateScene = async (sceneId) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) return;

    const scene = scenes[sceneIndex];
    updateScene(sceneId, { status: 'generating' });

    try {
      let startFrame = null;
      if (sceneIndex > 0) {
        const prev = scenes[sceneIndex - 1];
        startFrame = prev.lastFrameUrl || null;
      } else {
        startFrame = startFrameUrl || null;
      }

      const videoUrl = await generateSingleScene(scene, startFrame);

      let lastFrame = null;
      try {
        lastFrame = await extractLastFrame(videoUrl);
      } catch (err) {
        console.warn('[Storyboard] Frame extraction failed:', err.message);
      }

      updateScene(sceneId, { status: 'done', videoUrl, lastFrameUrl: lastFrame });
      toast.success(`Scene ${sceneIndex + 1} regenerated`);
    } catch (err) {
      updateScene(sceneId, { status: 'error' });
      toast.error(`Regeneration failed: ${err.message}`);
    }
  };

  const sendToTimeline = () => {
    const completedScenesList = scenes.filter(s => s.status === 'done' && s.videoUrl);
    if (!completedScenesList.length) {
      toast.error('No completed scenes to add');
      return;
    }
    if (onScenesComplete) {
      onScenesComplete(completedScenesList.map(s => ({
        videoUrl: s.videoUrl,
        title: `Scene ${s.sceneNumber} - ${storyboardTitle}`,
        durationSeconds: s.durationSeconds,
      })));
    }
    toast.success(`${completedScenesList.length} scenes sent to timeline`);
    onClose();
  };

  const filteredLibrary = selectedFolder === null
    ? libraryItems
    : libraryItems.filter(i => i.title?.startsWith(`[${selectedFolder}]`));

  const completedScenesCount = scenes.filter(s => s.status === 'done').length;
  const failedScenes = scenes.filter(s => s.status === 'error').length;

  // ── Wizard Navigation ──

  const markStepCompleted = (stepKey) => {
    setCompletedSteps(prev => prev.includes(stepKey) ? prev : [...prev, stepKey]);
  };

  const handleNext = () => {
    const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
    if (currentIdx < 0) return;

    // Mark current step as completed
    markStepCompleted(step);

    if (step === 'settings') {
      // "Generate Scenes" — trigger generation and advance to scenes step
      generateSceneBreakdown();
      return;
    }

    if (step === 'scenes') {
      // Move to generating step, start generation
      setStep('generating');
      markStepCompleted('scenes');
      generateNextScene();
      return;
    }

    if (step === 'generating') {
      // Send to timeline
      sendToTimeline();
      return;
    }

    // Default: advance to next step
    const nextStep = WIZARD_STEPS[currentIdx + 1];
    if (nextStep) {
      setStep(nextStep.key);
    }
  };

  const handleBack = () => {
    const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
    if (currentIdx <= 0) return;
    const prevStep = WIZARD_STEPS[currentIdx - 1];
    if (prevStep) {
      setStep(prevStep.key);
    }
  };

  const handleStepClick = (key) => {
    const targetIdx = WIZARD_STEPS.findIndex(s => s.key === key);
    const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
    if (targetIdx < currentIdx) {
      setStep(key);
    }
  };

  // Determine the subtitle based on step
  const getSubtitle = () => {
    const found = WIZARD_STEPS.find(s => s.key === step);
    return found ? `Step ${WIZARD_STEPS.indexOf(found) + 1} of ${WIZARD_STEPS.length}: ${found.label}` : '';
  };

  // Determine if Next button should be disabled
  const isNextDisabled = () => {
    if (step === 'story' && !storyOverview.trim()) return true;
    if (step === 'settings' && generatingScenes) return true;
    if (step === 'scenes' && scenes.length === 0) return true;
    if (step === 'generating' && (generating || completedScenesCount === 0)) return true;
    return false;
  };

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Storyboard Planner"
      description={getSubtitle()}
      size="xl"
      icon={<Clapperboard className="w-5 h-5" />}
    >
      <WizardStepper
        steps={WIZARD_STEPS}
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <SlideOverBody className="p-6 bg-gray-50">

        {/* ── Step 1: Story & Mood ── */}
        {step === 'story' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Story Overview</label>
              <textarea
                value={storyOverview}
                onChange={(e) => setStoryOverview(e.target.value)}
                placeholder="e.g., 'A puppy learns about driveway safety while riding a scooter through town'"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2C666E] focus:border-transparent resize-none"
              />
            </div>

            <PillSelector label="Overall Mood" options={MOODS} value={overallMood} onChange={setOverallMood} />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Scenes</label>
                <select
                  value={numScenes}
                  onChange={(e) => setNumScenes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} scenes</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration per Scene</label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {[3, 4, 5, 6, 8, 10].map(n => (
                    <option key={n} value={n}>{n} seconds</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {['16:9', '9:16', '1:1', '4:3'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Visual Style ── */}
        {step === 'style' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Style Preset</h3>
              <StyleGrid value={style} onChange={setStyle} maxHeight="none" columns="grid-cols-4" />
            </div>

            <div className="space-y-4 p-5 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Visual Direction</h3>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Style</p>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map(s => (
                    <button key={s} onClick={() => setBuilderStyle(builderStyle === s ? '' : s)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${builderStyle === s ? 'bg-[#07393C] text-white border-[#07393C]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lighting</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUILDER_LIGHTING.map(l => (
                    <button key={l} onClick={() => setBuilderLighting(builderLighting === l ? '' : l)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${builderLighting === l ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Color Grade</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_GRADE_OPTIONS.map(cg => (
                    <button key={cg} onClick={() => setBuilderColorGrade(builderColorGrade === cg ? '' : cg)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${builderColorGrade === cg ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {cg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Characters ── */}
        {step === 'characters' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Character Elements</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Each element becomes @Element1, @Element2, etc. in your scene prompts. Max 3 reference images each.
                </p>
              </div>
              {elements.length < 4 && (
                <Button variant="outline" size="sm" onClick={addElement} className="text-sm">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Element
                </Button>
              )}
            </div>

            {/* Element tabs */}
            <div className="flex gap-1.5">
              {elements.map((el, i) => (
                <button
                  key={el.id}
                  onClick={() => setActiveElementIndex(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                    i === activeElementIndex
                      ? 'bg-[#2C666E] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  @Element{i + 1}
                  {el.refs.length > 0 && <span className="text-xs opacity-70">({el.refs.length})</span>}
                  {elements.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); removeElement(i); }}
                      className="ml-0.5 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active element content */}
            {elements[activeElementIndex] && (() => {
              const el = elements[activeElementIndex];
              const elIdx = activeElementIndex;
              return (
                <div className="border rounded-lg p-5 bg-white space-y-4">
                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-gray-500 uppercase tracking-wide font-medium">Description</label>
                      {el.refs.length > 0 && (
                        <button
                          onClick={() => describeCharacterFromImage(el.refs[0], elIdx)}
                          disabled={el.analyzing}
                          className="flex items-center gap-1 text-sm font-medium text-[#2C666E] hover:text-[#07393C] disabled:opacity-50"
                        >
                          {el.analyzing
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                            : <><Sparkles className="w-3.5 h-3.5" /> Auto-describe</>}
                        </button>
                      )}
                    </div>
                    <textarea
                      value={el.description}
                      onChange={(e) => updateElement(elIdx, { description: e.target.value })}
                      placeholder={el.analyzing ? 'Analyzing...' : "e.g., 'Young woman, red hair, green eyes, brown leather jacket'"}
                      rows={3}
                      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none ${el.analyzing ? 'bg-gray-50 animate-pulse' : ''}`}
                    />
                  </div>

                  {/* Reference images */}
                  <div>
                    <label className="text-sm text-gray-500 uppercase tracking-wide mb-2 block font-medium">
                      Reference Images ({el.refs.length}/3)
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={el.refs.length >= 3}
                        className="text-sm"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openLibrary}
                        disabled={el.refs.length >= 3}
                        className="text-sm"
                      >
                        <FolderOpen className="w-3.5 h-3.5 mr-1" /> Library
                      </Button>
                    </div>
                    {el.refs.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {el.refs.map((url, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={url}
                              alt={`ref ${i + 1}`}
                              onClick={() => updateElement(elIdx, { frontalIndex: i })}
                              title={i === el.frontalIndex ? 'Frontal image (used for R2V)' : 'Click to set as frontal image'}
                              className={`w-20 h-20 rounded-lg object-cover cursor-pointer transition-all ${
                                i === el.frontalIndex
                                  ? 'border-2 border-[#2C666E] ring-2 ring-[#2C666E]/30'
                                  : 'border border-gray-200 hover:border-gray-400'
                              }`}
                            />
                            {i === el.frontalIndex && (
                              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#2C666E] text-white rounded-full text-[9px] flex items-center justify-center font-bold">F</span>
                            )}
                            <button
                              onClick={() => {
                                const newRefs = el.refs.filter((_, j) => j !== i);
                                const newFrontal = el.frontalIndex >= newRefs.length ? 0 : (i < el.frontalIndex ? el.frontalIndex - 1 : el.frontalIndex);
                                updateElement(elIdx, { refs: newRefs, frontalIndex: newFrontal });
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {el.refs.length > 1 && (
                          <p className="w-full text-sm text-gray-400 mt-1">Click to set frontal ref (F)</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Library browser overlay */}
            {showLibrary && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Select from Library</span>
                  <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {libraryFolders.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${selectedFolder === null ? 'bg-[#2C666E] text-white' : 'bg-white border text-gray-600'}`}
                    >
                      All
                    </button>
                    {libraryFolders.map(f => (
                      <button
                        key={f}
                        onClick={() => setSelectedFolder(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${selectedFolder === f ? 'bg-[#2C666E] text-white' : 'bg-white border text-gray-600'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
                {!libraryLoading && filteredLibrary.length > 0 && (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        const allIds = filteredLibrary.map(i => i.id);
                        const allSelected = allIds.every(id => selectedIds.has(id));
                        if (allSelected) {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            allIds.forEach(id => next.delete(id));
                            return next;
                          });
                        } else {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            allIds.forEach(id => next.add(id));
                            return next;
                          });
                        }
                      }}
                      className="text-sm text-[#2C666E] hover:underline font-medium"
                    >
                      {filteredLibrary.every(i => selectedIds.has(i.id)) ? 'Deselect All' : `Select All (${filteredLibrary.length})`}
                    </button>
                    {selectedIds.size > 0 && (
                      <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
                    )}
                  </div>
                )}
                {libraryLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : (
                  <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                    {filteredLibrary.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                          return next;
                        })}
                        className={`relative cursor-pointer rounded-lg border-2 overflow-hidden ${
                          selectedIds.has(item.id) ? 'border-[#2C666E]' : 'border-transparent'
                        }`}
                      >
                        <img src={item.url} alt="" className="w-full aspect-square object-cover" />
                        {selectedIds.has(item.id) && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-[#2C666E] rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedIds.size > 0 && (
                  <Button size="sm" onClick={importFromLibrary} className="w-full text-sm bg-[#2C666E] text-white">
                    Import {selectedIds.size} image(s)
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Scene Builder ── */}
        {step === 'scene-builder' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Scene-by-Scene Builder</h3>
              <p className="text-sm text-gray-400">Guide the AI with per-scene details. These are optional hints to shape each scene.</p>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              {sceneGuides.map((guide, i) => (
                <div key={i} className="border rounded-lg p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#2C666E]">Scene {i + 1}</span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 uppercase tracking-wide mb-1 block font-medium">What happens?</label>
                    <textarea
                      value={guide.action}
                      onChange={(e) => updateSceneGuide(i, { action: e.target.value })}
                      placeholder="e.g., 'The puppy rides the scooter past a driveway and looks both ways'"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <PillSelector label="Environment" options={ENVIRONMENTS} value={guide.environment} onChange={(v) => updateSceneGuide(i, { environment: v })} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">Environment Detail</label>
                      <input
                        value={guide.environmentDetail}
                        onChange={(e) => updateSceneGuide(i, { environmentDetail: e.target.value })}
                        placeholder="e.g., 'suburban road with parked cars'"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <PillSelector label="Character Action" options={ACTION_TYPES} value={guide.actionType} onChange={(v) => updateSceneGuide(i, { actionType: v })} />
                  <PillSelector label="Expression" options={EXPRESSIONS} value={guide.expression} onChange={(v) => updateSceneGuide(i, { expression: v })} />
                  <div className="grid grid-cols-2 gap-4">
                    <PillSelector label="Lighting" options={LIGHTING_OPTIONS} value={guide.lighting} onChange={(v) => updateSceneGuide(i, { lighting: v })} />
                    <div>
                      <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">Camera Angle</label>
                      <select
                        value={guide.cameraAngle}
                        onChange={(e) => updateSceneGuide(i, { cameraAngle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Select...</option>
                        {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <PillSelector label="Camera Movement" options={CAMERA_MOVEMENTS} value={guide.cameraMovement} onChange={(v) => updateSceneGuide(i, { cameraMovement: v })} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Frame & Model ── */}
        {step === 'settings' && (
          <div className="space-y-6">
            {/* Starting Scene Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Scene Image</label>
              <p className="text-sm text-gray-400 mb-3">Sets the visual environment for Scene 1. Subsequent scenes chain from the previous scene's last frame.</p>

              {startFrameUrl ? (
                <div className="relative group">
                  <img
                    src={startFrameUrl}
                    alt="Starting scene"
                    className="w-full h-52 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    onClick={() => setStartFrameUrl(null)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded flex items-center gap-1">
                    {analyzingStartFrame ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing scene...</> : startFrameDescription ? 'Scene analyzed' : 'Start Frame'}
                  </span>
                </div>
              ) : (generatingStartFrame || pollingStartFrame) ? (
                <div className="w-full h-52 rounded-lg border-2 border-dashed border-[#2C666E]/30 bg-[#2C666E]/5 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
                  <span className="text-sm text-[#2C666E]">
                    {pollingStartFrame ? 'Generating image...' : 'Processing...'}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowImagineerForStartFrame(true)}
                      className="text-sm flex-1"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" /> Generate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowLibraryForStartFrame(true)}
                      className="text-sm flex-1"
                    >
                      <FolderOpen className="w-4 h-4 mr-1.5" /> Library
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowUrlImport(!showUrlImport)}
                      className="text-sm flex-1"
                    >
                      <Link className="w-4 h-4 mr-1.5" /> URL
                    </Button>
                  </div>
                  {showUrlImport && (
                    <div className="flex gap-2">
                      <Input
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="text-sm flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
                      />
                      <Button
                        onClick={handleImportUrl}
                        disabled={importingUrl || !importUrl.trim()}
                        className="text-sm bg-[#2C666E] text-white"
                      >
                        {importingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Video Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {STORYBOARD_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                ))}
              </select>
            </div>

            {/* Props & Accessories */}
            <PropsPillSelector selected={selectedProps} onChange={setSelectedProps} />

            {/* Negative Prompts */}
            <NegPromptPillSelector
              selectedPills={selectedNegPills}
              onPillsChange={setSelectedNegPills}
              freetext={negFreetext}
              onFreetextChange={setNegFreetext}
            />

            {/* Brand Style Guide */}
            <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />
          </div>
        )}

        {/* ── Step 6: Scenes (AI-generated scene cards) ── */}
        {step === 'scenes' && (
          <div className="space-y-3">
            {storyboardTitle && (
              <h3 className="text-sm font-semibold text-gray-800">{storyboardTitle}</h3>
            )}

            {generatingScenes && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                <span className="text-sm text-gray-500">Generating scene breakdown...</span>
              </div>
            )}

            {scenes.map((scene, i) => (
              <div key={scene.id} className="border rounded-lg p-3 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#2C666E]">Scene {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveScene(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeScene(scene.id)} className="p-0.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 uppercase tracking-wide">Visual Prompt</label>
                  <textarea
                    value={scene.visualPrompt}
                    onChange={(e) => updateScene(scene.id, { visualPrompt: e.target.value })}
                    className="w-full h-16 px-2 py-1 border border-gray-200 rounded text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm text-gray-500 uppercase tracking-wide">Motion</label>
                    <input
                      value={scene.motionPrompt}
                      onChange={(e) => updateScene(scene.id, { motionPrompt: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                      placeholder="Camera motion..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 uppercase tracking-wide">Duration</label>
                    <select
                      value={scene.durationSeconds}
                      onChange={(e) => updateScene(scene.id, { durationSeconds: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    >
                      {[3, 4, 5, 6, 8, 10].map(n => (
                        <option key={n} value={n}>{n}s</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 uppercase tracking-wide">Camera</label>
                    <select
                      value={scene.cameraAngle}
                      onChange={(e) => updateScene(scene.id, { cameraAngle: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    >
                      {CAMERA_ANGLES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {scene.narrativeNote && (
                  <p className="text-sm text-gray-400 italic">{scene.narrativeNote}</p>
                )}
              </div>
            ))}

            {!generatingScenes && (
              <Button variant="outline" size="sm" onClick={addScene} className="w-full text-sm">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Scene
              </Button>
            )}
          </div>
        )}

        {/* ── Step 7: Generate ── */}
        {step === 'generating' && (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <h3 className="text-sm font-semibold text-gray-800">{storyboardTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {completedScenesCount} / {scenes.length} scenes generated
                {failedScenes > 0 && ` · ${failedScenes} failed`}
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                <div
                  className="h-full bg-[#2C666E] rounded-full transition-all"
                  style={{ width: `${(completedScenesCount / scenes.length) * 100}%` }}
                />
              </div>
            </div>

            {scenes.map((scene, i) => (
              <div key={scene.id} className={`rounded-lg border overflow-hidden ${
                scene.status === 'generating' ? 'border-[#2C666E] bg-blue-50' :
                scene.status === 'done' ? 'border-green-200' :
                scene.status === 'error' ? 'border-red-200 bg-red-50' :
                'border-gray-200'
              }`}>
                {scene.status === 'done' && scene.videoUrl && (
                  <video
                    src={scene.videoUrl}
                    controls
                    className="w-full aspect-video bg-black"
                    muted
                  />
                )}

                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                      {scene.status === 'generating' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#2C666E]" />
                      ) : scene.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : scene.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <span className="text-sm text-gray-400 font-medium">{i + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">Scene {i + 1}</p>
                      <p className="text-sm text-gray-400 truncate">{scene.narrativeNote || scene.visualPrompt.substring(0, 60)}</p>
                    </div>
                  </div>
                  {(scene.status === 'done' || scene.status === 'error') && !generating && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateScene(scene.id)}
                      className="text-sm h-7 px-3"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Redo
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </SlideOverBody>

      <SlideOverFooter>
        <div className="flex justify-between w-full">
          {/* Left side: Back button */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} disabled={step === 'story'}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          {/* Right side: Next button + contextual actions */}
          <div className="flex gap-2">
            {/* Extra actions for specific steps */}
            {step === 'scenes' && scenes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={generateSceneBreakdown}
                disabled={generatingScenes}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            )}

            {step === 'generating' && generating && (
              <Button
                variant="outline"
                onClick={cancelGeneration}
                className="text-red-600 border-red-300"
              >
                <Pause className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}

            {step === 'generating' && !generating && completedScenesCount < scenes.length && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAllRemaining}
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Generate All Remaining
                </Button>
                <Button
                  onClick={generateNextScene}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white"
                >
                  Generate Scene {completedScenesCount + 1} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}

            {step === 'generating' && !generating && completedScenesCount > 0 && completedScenesCount === scenes.length && (
              <Button
                onClick={sendToTimeline}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                <Send className="w-4 h-4 mr-1" /> Send to Timeline ({completedScenesCount}) <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {/* Standard Next button (not shown on generating step which has its own buttons) */}
            {step !== 'generating' && (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                {step === 'settings' ? (
                  generatingScenes ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" /> Generate Scenes</>
                  )
                ) : step === 'scenes' ? (
                  <><Play className="w-4 h-4 mr-1" /> Start Generating</>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </SlideOverFooter>

      {/* Imagineer modal for generating start frame */}
      <ImagineerModal
        isOpen={showImagineerForStartFrame}
        onClose={() => setShowImagineerForStartFrame(false)}
        onGenerate={(params) => {
          setShowImagineerForStartFrame(false);
          handleStartFrameGenerate(params);
        }}
      />

      {/* Library modal for selecting start frame */}
      <LibraryModal
        isOpen={showLibraryForStartFrame}
        onClose={() => setShowLibraryForStartFrame(false)}
        onSelect={handleStartFrameFromLibrary}
        mediaType="images"
      />
    </SlideOverPanel>
  );
}
