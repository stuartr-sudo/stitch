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
import StoryChat from '@/components/storyboard/StoryChat';
import SceneCard from '@/components/storyboard/SceneCard';
import { SCENE_MODELS } from '@/components/storyboard/SceneModelSelector';
import CharactersKling from '@/components/storyboard/CharactersKling';
import CharactersVeo from '@/components/storyboard/CharactersVeo';
import GenerateScene from '@/components/storyboard/GenerateScene';

// ── Constants ──

// STORYBOARD_MODELS removed — now imported from SceneModelSelector (SCENE_MODELS) and set per-scene

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
  { key: 'story-chat', label: 'Story Builder' },
  { key: 'style', label: 'Visual Style' },
  { key: 'video-style', label: 'Video Style' },
  { key: 'scene-builder', label: 'Scene Builder' },
  { key: 'characters', label: 'Characters' },
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
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Video style state
  const [videoStyle, setVideoStyle] = useState('');
  const [videoStylesList, setVideoStylesList] = useState([]);

  // Step 1 settings
  const [storyboardName, setStoryboardName] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [enableAudioDefault, setEnableAudioDefault] = useState(false);

  // Step 2 story chat output
  const [storyBeats, setStoryBeats] = useState([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyChatOverview, setStoryChatOverview] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Scene builder state
  const [expandedScene, setExpandedScene] = useState(0);

  // Veo 3.1 reference images (separate from Kling elements)
  const [veoReferenceImages, setVeoReferenceImages] = useState([]);

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
      setStoryboardName('');
      setResolution('720p');
      setEnableAudioDefault(false);
      setStoryBeats([]);
      setStoryTitle('');
      setStoryChatOverview('');
      setChatHistory([]);
      setExpandedScene(0);
      setVeoReferenceImages([]);
      setVideoStyle('');
    }
  }, [isOpen]);

  // Pre-populate start frame from initialImage
  useEffect(() => {
    if (isOpen && initialImage) {
      setStartFrameUrl(initialImage);
      analyzeStartFrame(initialImage);
    }
  }, [isOpen, initialImage]);

  // Fetch video styles when that step becomes active
  useEffect(() => {
    if (step === 'video-style' && videoStylesList.length === 0) {
      apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStylesList).catch(() => {});
    }
  }, [step]);

  // ── Helpers ──

  const updateSceneGuide = (index, updates) => {
    setSceneGuides(prev => prev.map((g, i) => i === index ? { ...g, ...updates } : g));
  };

  // Cascade scene 1 values to subsequent scenes (only if their field is still empty/default)
  const handleSceneGuideChange = (sceneIndex, field, value) => {
    const updated = [...sceneGuides];
    updated[sceneIndex] = { ...updated[sceneIndex], [field]: value };

    if (sceneIndex === 0) {
      const cascadeFields = ['environment', 'environmentDetail', 'lighting', 'cameraAngle', 'cameraMovement', 'expression', 'actionType', 'model', 'resolution', 'enableAudio'];
      if (cascadeFields.includes(field)) {
        for (let i = 1; i < updated.length; i++) {
          if (!updated[i][field] || updated[i][field] === '') {
            updated[i] = { ...updated[i], [field]: value };
          }
        }
      }
    }

    setSceneGuides(updated);
  };

  // Determine if Characters step is needed
  const needsCharacters = sceneGuides.some(sg => {
    const modelInfo = SCENE_MODELS.find(m => m.id === sg.model);
    return modelInfo?.supportsRefs;
  });
  const hasKlingRefs = sceneGuides.some(sg =>
    sg.model === 'kling-r2v-pro' || sg.model === 'kling-r2v-standard'
  );
  const hasVeoRefs = sceneGuides.some(sg => sg.model === 'veo3');

  // Filter visible steps — skip characters if no ref models selected
  const visibleSteps = WIZARD_STEPS.filter(s => {
    if (s.key === 'characters') return needsCharacters;
    return true;
  });

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
    const storyDesc = storyChatOverview || storyOverview;
    if (!storyDesc.trim() && storyBeats.length === 0) {
      toast.error('Please complete the Story Builder first');
      return;
    }
    setGeneratingScenes(true);
    try {
      const res = await apiFetch('/api/storyboard/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: storyDesc,
          storyBeats,
          numScenes,
          style: getPromptText(style) || style,
          defaultDuration,
          overallMood,
          sceneGuides: sceneGuides.map((g, i) => ({ sceneNumber: i + 1, ...g })),
          elements: elements
            .filter(el => el.refs.length > 0 || el.description)
            .map((el, i) => ({ index: i + 1, description: el.description })),
          hasStartFrame: !!sceneGuides[0]?.startImageUrl,
          startFrameDescription: startFrameDescription || '',
          props: getPropsLabels(selectedProps),
          negativePrompt: getCombinedNegativePrompt(selectedNegPills, negFreetext),
          brandStyleGuide: extractBrandStyleData(selectedBrand),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate scenes');

      setStoryboardTitle(data.title || storyTitle || storyboardName);
      setScenes(data.scenes.map((s, i) => ({
        ...s,
        id: `scene-${Date.now()}-${i}`,
        status: 'pending',
        videoUrl: null,
        lastFrameUrl: null,
        startFrameUrl: null,
      })));
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
    // Use per-scene model from scene guides
    const guideIndex = scene.sceneNumber - 1;
    const sceneGuide = sceneGuides[guideIndex] || {};
    const sceneModel = sceneGuide.model || 'veo3';
    const sceneResolution = sceneGuide.resolution || resolution;
    const sceneEnableAudio = sceneGuide.enableAudio ?? enableAudioDefault;

    const selectedModel = SCENE_MODELS.find(m => m.id === sceneModel);
    const elementsWithRefs = elements.filter(el => el.refs.length > 0);
    const isR2V = (sceneModel === 'kling-r2v-pro' || sceneModel === 'kling-r2v-standard') && elementsWithRefs.length > 0;

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
    const selectedVideoStylePreset = videoStylesList.find(s => s.key === videoStyle);
    if (selectedVideoStylePreset?.prompt) {
      prompt += `. Video style: ${selectedVideoStylePreset.prompt}`;
    }

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('model', sceneModel);
    formData.append('duration', String(scene.durationSeconds));
    formData.append('aspectRatio', aspectRatio);
    formData.append('resolution', sceneResolution);
    formData.append('enableAudio', String(sceneEnableAudio));

    // For Veo 3.1 Reference-to-Video, pass reference images as additionalImages
    if (sceneModel === 'veo3' && veoReferenceImages.length > 0) {
      formData.append('additionalImages', JSON.stringify(veoReferenceImages));
    }

    // For first-last-frame, pass end image
    if (sceneModel === 'veo3-first-last' && sceneGuide.endImageUrl) {
      formData.append('endImageUrl', sceneGuide.endImageUrl);
    }

    // For V2V, pass video URL
    if ((sceneModel === 'kling-o3-v2v-pro' || sceneModel === 'kling-o3-v2v-standard') && sceneGuide.videoSourceUrl) {
      formData.append('videoUrl', sceneGuide.videoSourceUrl);
    }

    const imageUrl = startFrameUrlForScene || sceneGuide.startImageUrl || elementsWithRefs[0]?.refs[0] || null;
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
      const videoUrl = await pollForResult(data.requestId, data.model || sceneModel);
      setPollingScene(null);
      return videoUrl;
    }
    throw new Error(data.error || 'Generation failed');
  };

  // Wrapper used by GenerateScene card for single scene generation
  const generateSingleSceneWrapper = async (scene, startFrame) => {
    updateScene(scene.id, { status: 'generating', startFrameUrl: startFrame });
    setGenerating(true);
    try {
      const videoUrl = await generateSingleScene(scene, startFrame);
      let lastFrame = null;
      try {
        lastFrame = await extractLastFrame(videoUrl);
      } catch (err) {
        console.warn('[Storyboard] Frame extraction failed:', err.message);
      }
      updateScene(scene.id, { status: 'done', videoUrl, lastFrameUrl: lastFrame });
      toast.success(`Scene ${scene.sceneNumber} generated`);
      apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, type: 'video', title: `[Storyboard] Scene ${scene.sceneNumber} - ${storyboardTitle || storyTitle}`, source: 'storyboard' }),
      }).catch(() => {});
    } catch (err) {
      if (err.message !== 'Cancelled') {
        updateScene(scene.id, { status: 'error' });
        toast.error(`Scene ${scene.sceneNumber} failed: ${err.message}`);
      }
    }
    setGenerating(false);
  };

  // V2V refinement
  const openV2VRefinement = async (scene, videoUrl) => {
    updateScene(scene.id, { status: 'generating' });
    try {
      const formData = new FormData();
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      formData.append('image', blob, 'frame.jpg');
      formData.append('videoUrl', videoUrl);
      formData.append('prompt', scene.visualPrompt || scene.motionPrompt || 'Enhance and refine this video');
      formData.append('model', 'kling-o3-v2v-pro');
      formData.append('duration', String(scene.durationSeconds || defaultDuration));
      formData.append('aspectRatio', aspectRatio);

      const res = await apiFetch('/api/jumpstart/generate', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.status === 'completed' && data.videoUrl) {
        updateScene(scene.id, { videoUrl: data.videoUrl, status: 'done' });
        toast.success(`Scene ${scene.sceneNumber} refined!`);
      } else if (data.requestId) {
        setPollingScene(scene.id);
        const refinedUrl = await pollForResult(data.requestId, data.model || 'kling-o3-v2v-pro');
        setPollingScene(null);
        if (refinedUrl) {
          updateScene(scene.id, { videoUrl: refinedUrl, status: 'done' });
          toast.success(`Scene ${scene.sceneNumber} refined!`);
        }
      } else if (data.videoUrl) {
        updateScene(scene.id, { videoUrl: data.videoUrl, status: 'done' });
        toast.success(`Scene ${scene.sceneNumber} refined!`);
      }
    } catch (err) {
      updateScene(scene.id, { status: 'done' }); // Keep old video on error
      toast.error('V2V refinement failed: ' + err.message);
    }
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
      frameUrl = sceneGuides[0]?.startImageUrl || startFrameUrl || null;
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
        frameUrl = sceneGuides[0]?.startImageUrl || startFrameUrl || null;
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
        startFrame = sceneGuides[0]?.startImageUrl || startFrameUrl || null;
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

  const currentStepIndex = visibleSteps.findIndex(s => s.key === step);
  const canGoNext = currentStepIndex < visibleSteps.length - 1;
  const canGoBack = currentStepIndex > 0;

  const handleNext = () => {
    if (!canGoNext) return;

    // Mark current step as completed
    markStepCompleted(step);

    const nextStep = visibleSteps[currentStepIndex + 1];

    // If transitioning to 'generating', trigger scene breakdown first
    if (nextStep.key === 'generating' && scenes.length === 0) {
      generateSceneBreakdown();
    }

    if (step === 'generating') {
      // Send to timeline
      sendToTimeline();
      return;
    }

    setStep(nextStep.key);
  };

  const handleBack = () => {
    if (!canGoBack) return;
    setStep(visibleSteps[currentStepIndex - 1].key);
  };

  const handleStepClick = (key) => {
    const targetIdx = visibleSteps.findIndex(s => s.key === key);
    if (targetIdx < currentStepIndex) {
      setStep(key);
    }
  };

  // Determine the subtitle based on step
  const getSubtitle = () => {
    const found = visibleSteps.find(s => s.key === step);
    return found ? `Step ${visibleSteps.indexOf(found) + 1} of ${visibleSteps.length}: ${found.label}` : '';
  };

  // Determine if Next button should be disabled
  const isNextDisabled = () => {
    if (step === 'story') return false; // All fields optional except handled by chat
    if (step === 'story-chat' && storyBeats.length === 0) return true;
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
        steps={visibleSteps}
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <SlideOverBody className="p-6 bg-gray-50">

        {/* ── Step 1: Story & Mood ── */}
        {step === 'story' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Storyboard Name</label>
              <Input
                value={storyboardName}
                onChange={(e) => setStoryboardName(e.target.value)}
                placeholder="e.g., 'Puppy Safety Adventure'"
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Scenes</label>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={numScenes}
                  onChange={(e) => setNumScenes(parseInt(e.target.value))}
                  className="w-full accent-[#2C666E]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>2</span>
                  <span className="font-medium text-[#2C666E]">{numScenes} scenes</span>
                  <span>8</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration per Scene</label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                  className="w-full accent-[#2C666E]"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>3s</span>
                  <span className="font-medium text-[#2C666E]">{defaultDuration}s</span>
                  <span>10s</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">Aspect Ratio</label>
              <div className="flex gap-1.5">
                {['16:9', '9:16', '1:1', '4:3'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === r
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">Resolution</label>
              <div className="flex gap-1.5">
                {['720p', '1080p', '4k'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      resolution === r
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableAudioDefault}
                onChange={(e) => setEnableAudioDefault(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
              />
              <span className="text-sm text-gray-700">Enable native audio generation (supported models only)</span>
            </label>

            <PillSelector label="Overall Mood" options={MOODS} value={overallMood} onChange={setOverallMood} />

            <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />
          </div>
        )}

        {/* ── Step 2: Story Builder Chat ── */}
        {step === 'story-chat' && (
          <StoryChat
            numScenes={numScenes}
            mood={overallMood}
            duration={defaultDuration}
            onComplete={({ storyBeats: beats, storyTitle: title, storyOverview: overview, chatHistory: history }) => {
              setStoryBeats(beats);
              setStoryTitle(title);
              setStoryChatOverview(overview);
              setChatHistory(history);
              // Pre-populate scene guides from beats
              const newGuides = beats.map((beat, i) => ({
                sceneNumber: i + 1,
                action: beat.keyAction || '',
                environment: '',
                environmentDetail: '',
                actionType: '',
                expression: '',
                lighting: '',
                cameraAngle: '',
                cameraMovement: '',
                model: 'veo3',
                resolution: resolution,
                enableAudio: enableAudioDefault,
                startImageUrl: null,
                videoSourceUrl: null,
                endImageUrl: null,
              }));
              setSceneGuides(newGuides);
            }}
          />
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

        {/* ── Step 4: Video Style ── */}
        {step === 'video-style' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Choose the motion and cinematography style for your video scenes.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {videoStylesList.map(s => (
                <button key={s.key} onClick={() => setVideoStyle(videoStyle === s.key ? '' : s.key)}
                  className={`rounded-xl border overflow-hidden text-left transition-all ${videoStyle === s.key ? 'border-[#2C666E] ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                  {s.thumb && <img src={s.thumb} alt={s.label} className="w-full h-24 object-cover" loading="lazy" />}
                  <div className="p-2">
                    <div className="text-xs font-medium text-slate-700">{s.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.description}</div>
                  </div>
                </button>
              ))}
              {videoStylesList.length === 0 && (
                <div className="col-span-3 py-8 text-center text-sm text-gray-400">Loading video styles…</div>
              )}
            </div>
            {videoStyle && (
              <p className="text-xs text-[#2C666E] font-medium">
                Selected: {videoStylesList.find(s => s.key === videoStyle)?.label}
                <button onClick={() => setVideoStyle('')} className="ml-2 text-gray-400 hover:text-gray-600 underline">Clear</button>
              </p>
            )}
          </div>
        )}

        {/* ── Step 5: Characters (conditional — only if ref models selected) ── */}
        {step === 'characters' && (
          <div className="space-y-4">
            {hasKlingRefs && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Kling R2V Characters (@Element)</h3>
                <CharactersKling
                  elements={elements}
                  onChange={setElements}
                  onOpenImagineer={(elIndex) => {
                    setActiveElementIndex(elIndex);
                    setShowImagineerForStartFrame(true);
                  }}
                  onOpenLibrary={(elIndex) => {
                    setActiveElementIndex(elIndex);
                    setShowLibrary(true);
                    loadLibrary();
                  }}
                />
              </div>
            )}
            {hasVeoRefs && (
              <div className={hasKlingRefs ? 'mt-6 pt-6 border-t border-gray-200' : ''}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Veo 3.1 Reference Images</h3>
                <p className="text-xs text-gray-500 mb-3">These images are passed as reference URLs for subject consistency across all Veo 3.1 scenes.</p>
                <CharactersVeo
                  referenceImages={veoReferenceImages}
                  onChange={setVeoReferenceImages}
                  onOpenLibrary={() => { setShowLibrary(true); loadLibrary(); }}
                  onOpenImagineer={() => setShowImagineerForStartFrame(true)}
                />
              </div>
            )}

            {/* Library browser overlay (kept for Kling imports) */}
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
          <div className="space-y-3">
            <div className="text-sm text-gray-500 mb-2">
              Configure each scene. Scene 1 settings cascade as defaults to subsequent scenes.
            </div>
            {sceneGuides.map((guide, i) => (
              <SceneCard
                key={i}
                scene={guide}
                storyBeat={storyBeats[i]}
                onChange={(field, value) => handleSceneGuideChange(i, field, value)}
                isFirst={i === 0}
                expanded={expandedScene === i}
                onToggleExpand={() => setExpandedScene(expandedScene === i ? -1 : i)}
                onUploadStartImage={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    handleSceneGuideChange(i, 'startImageUrl', url);
                  };
                  input.click();
                }}
                onImportFromLibrary={() => {
                  setShowLibraryForStartFrame(true);
                }}
                onGenerateStartImage={() => setShowImagineerForStartFrame(true)}
                onUploadVideoSource={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*';
                  input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    handleSceneGuideChange(i, 'videoSourceUrl', url);
                  };
                  input.click();
                }}
                onUploadEndImage={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    handleSceneGuideChange(i, 'endImageUrl', url);
                  };
                  input.click();
                }}
              />
            ))}
          </div>
        )}

        {/* ── Step 6: Generate ── */}
        {step === 'generating' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">
                {scenes.filter(s => s.status === 'done').length} / {scenes.length} scenes complete
              </span>
              <div className="flex gap-2">
                {!generating && scenes.some(s => s.status === 'pending') && (
                  <Button onClick={generateAllRemaining} size="sm" className="bg-[#2C666E] hover:bg-[#1e4d54]">
                    Generate All Remaining
                  </Button>
                )}
                {generating && (
                  <Button onClick={() => { cancelRef.current = true; }} size="sm" variant="outline" className="text-red-600 border-red-200">
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {generatingScenes && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                <span className="text-sm text-gray-500">Generating scene breakdown...</span>
              </div>
            )}

            {scenes.map((scene, i) => (
              <GenerateScene
                key={scene.id}
                scene={scene}
                onGenerate={() => generateSingleSceneWrapper(scene, i > 0 ? scenes[i-1]?.lastFrameUrl : sceneGuides[0]?.startImageUrl)}
                onRetry={() => {
                  updateScene(scene.id, { status: 'pending', videoUrl: null });
                  generateSingleSceneWrapper(scene, i > 0 ? scenes[i-1]?.lastFrameUrl : sceneGuides[0]?.startImageUrl);
                }}
                onRefineWithV2V={(videoUrl) => openV2VRefinement(scene, videoUrl)}
                isGenerating={scene.status === 'generating'}
                isPending={scene.status === 'pending'}
              />
                    ))}
          </div>
        )}

      </SlideOverBody>

      <SlideOverFooter>
        <div className="flex justify-between w-full">
          {/* Left side: Back button */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} disabled={visibleSteps.findIndex(s => s.key === step) <= 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          {/* Right side */}
          <div className="flex gap-2">
            {step === 'generating' && !generating && completedScenesCount > 0 && completedScenesCount === scenes.length && (
              <Button
                onClick={sendToTimeline}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                <Send className="w-4 h-4 mr-1" /> Send to Timeline ({completedScenesCount}) <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === 'generating' && !generating && completedScenesCount < scenes.length && scenes.length > 0 && (
              <Button
                onClick={generateNextScene}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                Generate Scene {completedScenesCount + 1} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {/* Standard Next button (not shown on generating step) */}
            {step !== 'generating' && (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                {step === 'story-chat' ? (
                  <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
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
        initialMode="i2i"
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
