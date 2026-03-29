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
  ChevronDown,
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
  Save,
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
import InputsStep from '../storyboard/InputsStep';
import ReviewScene from '../storyboard/ReviewScene';
import { SCENE_MODELS } from '../storyboard/SceneModelSelector';
import CharactersKling from '../storyboard/CharactersKling';
import CharactersVeo from '../storyboard/CharactersVeo';
import GenerateScene from '../storyboard/GenerateScene';
import StoryboardPreview from '../storyboard/StoryboardPreview';
import AudioFinishingStep from '../storyboard/AudioFinishingStep';

// ── Constants ──

const MOODS = ['Joyful/Happy', 'Dramatic', 'Peaceful/Calm', 'Mysterious', 'Energetic', 'Tense/Suspenseful', 'Playful', 'Inspirational'];

const NARRATIVE_STYLES = [
  { key: 'educational', label: 'Educational', description: 'Teach a concept step by step' },
  { key: 'entertaining', label: 'Story', description: 'Classic narrative arc with hook and climax' },
  { key: 'dramatic', label: 'Dramatic', description: 'High-stakes tension and turning points' },
  { key: 'documentary', label: 'Documentary', description: 'Explore a subject from multiple angles' },
  { key: 'advertisement', label: 'Ad / Promo', description: 'Problem → solution → call to action' },
  { key: 'tutorial', label: 'Tutorial', description: 'Step-by-step how-to guide' },
  { key: 'safety', label: 'Safety / PSA', description: 'Everyday danger → safe behavior → positive outcome' },
];

const TARGET_AUDIENCES = ['Children (3-8)', 'Kids (8-12)', 'Teens (13-17)', 'Young Adults', 'Adults', 'Professionals', 'General'];

const WIZARD_STEPS = [
  { key: 'story', label: 'Project & Story' },
  { key: 'style', label: 'Look & Feel' },
  { key: 'model', label: 'Model' },
  { key: 'inputs', label: 'Characters & Scene' },
  { key: 'script', label: 'Script & Storyboard' },
  { key: 'audio', label: 'Audio & Finishing' },
  { key: 'generate', label: 'Generate' },
];

const MODE_LABELS = {
  'reference-to-video': 'Reference-to-Video',
  'image-to-video': 'Image-to-Video',
  'first-last-frame': 'First-Last Frame',
  'video-to-video': 'Video-to-Video',
};

// ── Duration constraint helper ──

function getModelDurationConstraints(modelId) {
  const constraints = {
    'veo3': { min: 4, max: 8, allowed: [4, 6, 8] },
    'veo3-fast': { min: 4, max: 8, allowed: [4, 6, 8] },
    'veo3-first-last': { min: 8, max: 8, allowed: [8] },
    'kling-r2v-pro': { min: 5, max: 10, allowed: [5, 10] },
    'kling-r2v-standard': { min: 5, max: 10, allowed: [5, 10] },
    'kling-video': { min: 5, max: 10, allowed: [5, 10] },
    'kling-o3-v2v-pro': { min: 3, max: 15, allowed: [3, 5, 8, 10, 15] },
    'kling-o3-v2v-standard': { min: 3, max: 15, allowed: [3, 5, 8, 10, 15] },
    'seedance-pro': { min: 4, max: 12, allowed: [4, 6, 8, 10, 12] },
    'grok-imagine': { min: 5, max: 15, allowed: [5, 8, 10, 15] },
    'grok-r2v': { min: 1, max: 10, allowed: [4, 6, 8, 10] },
    'wavespeed-wan': { min: 5, max: 8, allowed: [5, 8] },
  };
  return constraints[modelId] || { min: 5, max: 8, allowed: [5, 8] };
}

// ── Wizard-sized PillSelector ──

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

  // Story & mood state
  const [storyOverview, setStoryOverview] = useState('');
  const [overallMood, setOverallMood] = useState('');
  const [builderStyle, setBuilderStyle] = useState('');
  const [builderLighting, setBuilderLighting] = useState('');
  const [builderColorGrade, setBuilderColorGrade] = useState('');

  // Setup state
  const [desiredLength, setDesiredLength] = useState(60);
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

  // Story inputs (new fields)
  const [narrativeStyle, setNarrativeStyle] = useState('entertaining');
  const [targetAudience, setTargetAudience] = useState('');
  const [clientBrief, setClientBrief] = useState('');
  const [hasDialogue, setHasDialogue] = useState(false);

  // Audio & Finishing (Step 6)
  const [ttsModel, setTtsModel] = useState('elevenlabs-v3');
  const [voice, setVoice] = useState('Rachel');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [lipsyncModel, setLipsyncModel] = useState('kling-lipsync');
  const [contentType, setContentType] = useState('cartoon');
  const [musicMood, setMusicMood] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.15);
  const [musicUrl, setMusicUrl] = useState(null);
  const [captionStyle, setCaptionStyle] = useState('none');

  // Global model (replaces per-scene model)
  const [globalModel, setGlobalModel] = useState('veo3');

  // Scene direction pills
  const [sceneDirection, setSceneDirection] = useState({
    environment: [], action: [], expression: [], lighting: [], camera: [],
  });

  // Script generation
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState(null);

  // Assembly
  const [assembling, setAssembling] = useState(false);
  const [assembledUrl, setAssembledUrl] = useState(null);

  // Veo 3.1 reference images
  const [veoReferenceImages, setVeoReferenceImages] = useState([]);

  // Props, neg prompts, brand style
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedNegPills, setSelectedNegPills] = useState([]);
  const [negFreetext, setNegFreetext] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Elements (Kling R2V)
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

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationCancelled, setGenerationCancelled] = useState(false);
  const cancelRef = useRef(false);

  // Polling state for async models
  const [pollingScene, setPollingScene] = useState(null);

  // Upscaled elements cache for Kling R2V
  const [upscaledElementsCache, setUpscaledElementsCache] = useState(null);

  // Preset state
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [activePresetName, setActivePresetName] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const presetMenuRef = useRef(null);

  // ── Derived state ──

  const selectedModelInfo = SCENE_MODELS.find(m => m.id === globalModel);
  const needsCharacters = selectedModelInfo?.supportsRefs || false;
  const hasKlingRefs = globalModel === 'kling-r2v-pro' || globalModel === 'kling-r2v-standard';
  const hasVeoRefs = globalModel === 'veo3' || globalModel === 'grok-r2v';

  // ── Effects ──

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('story');
      setCompletedSteps([]);
      setStoryOverview('');
      setOverallMood('');
      setBuilderStyle('');
      setBuilderLighting('');
      setBuilderColorGrade('');
      setDesiredLength(60);
      setStyle('cinematic');
      setDefaultDuration(5);
      setAspectRatio('16:9');
      setVideoStyle('');
      setStoryboardName('');
      setResolution('720p');
      setEnableAudioDefault(false);
      setGlobalModel('veo3');
      setSceneDirection({ environment: [], action: [], expression: [], lighting: [], camera: [] });
      setGeneratingScript(false);
      setScriptError(null);
      setAssembling(false);
      setAssembledUrl(null);
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
      setVeoReferenceImages([]);
      setNarrativeStyle('entertaining');
      setTargetAudience('');
      setClientBrief('');
      setHasDialogue(false);
      setTtsModel('elevenlabs-v3');
      setVoice('Rachel');
      setTtsSpeed(1.0);
      setLipsyncModel('kling-lipsync');
      setContentType('cartoon');
      setMusicMood('');
      setMusicVolume(0.15);
      setMusicUrl(null);
      setCaptionStyle('none');
      setUpscaledElementsCache(null);
      setActivePresetId(null);
      setActivePresetName('');
      setShowPresetMenu(false);
      setShowSavePresetDialog(false);
      setSavePresetName('');
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
    if (step === 'style' && videoStylesList.length === 0) {
      apiFetch('/api/styles/video').then(r => r.json()).then(setVideoStylesList).catch(() => {});
    }
  }, [step]);

  // Load presets when modal opens
  useEffect(() => {
    if (isOpen) {
      apiFetch('/api/storyboard/presets')
        .then(r => r.json())
        .then(data => setPresets(data.presets || []))
        .catch(() => {});
    }
  }, [isOpen]);

  // Close preset menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target)) {
        setShowPresetMenu(false);
      }
    };
    if (showPresetMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPresetMenu]);

  // ── Preset helpers ──

  const getPresetConfig = () => ({
    storyboardName,
    storyOverview,
    overallMood,
    builderStyle,
    builderLighting,
    builderColorGrade,
    desiredLength,
    style,
    defaultDuration,
    aspectRatio,
    resolution,
    enableAudioDefault,
    videoStyle,
    globalModel,
    sceneDirection,
    selectedBrand,
  });

  const applyPreset = (config) => {
    if (config.storyboardName) setStoryboardName(config.storyboardName);
    if (config.storyOverview) setStoryOverview(config.storyOverview);
    if (config.overallMood) setOverallMood(config.overallMood);
    if (config.builderStyle) setBuilderStyle(config.builderStyle);
    if (config.builderLighting) setBuilderLighting(config.builderLighting);
    if (config.builderColorGrade) setBuilderColorGrade(config.builderColorGrade);
    if (config.desiredLength) setDesiredLength(config.desiredLength);
    if (config.style) setStyle(config.style);
    if (config.defaultDuration) setDefaultDuration(config.defaultDuration);
    if (config.aspectRatio) setAspectRatio(config.aspectRatio);
    if (config.resolution) setResolution(config.resolution);
    if (config.enableAudioDefault !== undefined) setEnableAudioDefault(config.enableAudioDefault);
    if (config.videoStyle) setVideoStyle(config.videoStyle);
    if (config.globalModel) setGlobalModel(config.globalModel);
    if (config.sceneDirection) setSceneDirection(config.sceneDirection);
    if (config.selectedBrand !== undefined) setSelectedBrand(config.selectedBrand);
  };

  const handleLoadPreset = (preset) => {
    applyPreset(preset.config);
    setActivePresetId(preset.id);
    setActivePresetName(preset.name);
    setShowPresetMenu(false);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleSavePreset = async () => {
    if (!savePresetName.trim()) return;
    setSavingPreset(true);
    try {
      const res = await apiFetch('/api/storyboard/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: savePresetName.trim(),
          config: getPresetConfig(),
          id: activePresetId || undefined,
        }),
      });
      const data = await res.json();
      if (data.preset) {
        setActivePresetId(data.preset.id);
        setActivePresetName(data.preset.name);
        // Refresh presets list
        const listRes = await apiFetch('/api/storyboard/presets');
        const listData = await listRes.json();
        setPresets(listData.presets || []);
        toast.success(`Saved preset: ${data.preset.name}`);
      } else {
        toast.error(data.error || 'Failed to save preset');
      }
    } catch (err) {
      toast.error('Failed to save preset');
    }
    setSavingPreset(false);
    setShowSavePresetDialog(false);
    setSavePresetName('');
  };

  const handleUpdatePreset = async () => {
    if (!activePresetId) return;
    setSavingPreset(true);
    try {
      const res = await apiFetch('/api/storyboard/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activePresetName,
          config: getPresetConfig(),
          id: activePresetId,
        }),
      });
      const data = await res.json();
      if (data.preset) {
        toast.success(`Updated preset: ${data.preset.name}`);
        const listRes = await apiFetch('/api/storyboard/presets');
        const listData = await listRes.json();
        setPresets(listData.presets || []);
      }
    } catch (err) {
      toast.error('Failed to update preset');
    }
    setSavingPreset(false);
  };

  const handleDeletePreset = async (presetId, presetName) => {
    try {
      await apiFetch('/api/storyboard/presets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: presetId }),
      });
      setPresets(prev => prev.filter(p => p.id !== presetId));
      if (activePresetId === presetId) {
        setActivePresetId(null);
        setActivePresetName('');
      }
      toast.success(`Deleted preset: ${presetName}`);
    } catch (err) {
      toast.error('Failed to delete preset');
    }
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
          body: JSON.stringify({ url: data.imageUrl, type: 'image', title: '[Storyboard] Start Frame', source: 'storyboard', visual_style: style || null, storyboard_name: storyboardName || null }),
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
                body: JSON.stringify({ url: pollData.imageUrl, type: 'image', title: '[Storyboard] Start Frame', source: 'storyboard', visual_style: style || null, storyboard_name: storyboardName || null }),
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

  // ── Script Generation ──
  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    setScriptError(null);
    try {
      const body = {
        storyboardName,
        description: storyOverview || storyboardName,
        desiredLength,
        defaultDuration,
        overallMood,
        aspectRatio,
        // Stage 1 inputs
        narrativeStyle,
        targetAudience,
        clientBrief,
        hasDialogue,
        // Visual + motion style
        style,
        visualStylePrompt: style ? getPromptText(style) : undefined,
        builderStyle, builderLighting, builderColorGrade,
        videoStylePrompt: videoStyle ? videoStylesList.find(v => v.key === videoStyle)?.prompt : undefined,
        // Model + constraints
        globalModel,
        modelDurationConstraints: getModelDurationConstraints(globalModel),
        // Characters & scene
        hasStartFrame: !!startFrameUrl,
        startFrameDescription,
        elements: needsCharacters && elements?.length
          ? elements.map((el, i) => ({ index: i + 1, description: el.description }))
          : undefined,
        veoReferenceCount: needsCharacters && veoReferenceImages?.length ? veoReferenceImages.length : 0,
        sceneDirection,
        props: selectedProps,
        negativePrompt: negFreetext || selectedNegPills?.join(', '),
        brandStyleGuide: selectedBrand || undefined,
      };
      const res = await apiFetch('/api/storyboard/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success || !data.scenes) throw new Error(data.error || 'Failed to generate scenes');
      setStoryboardTitle(data.title || storyboardName);
      setScenes(data.scenes.map((s, i) => ({
        ...s,
        id: `scene-${Date.now()}-${i}`,
        status: 'pending',
        videoUrl: null,
        lastFrameUrl: null,
      })));
    } catch (err) {
      console.error('[Storyboard] Script generation failed:', err);
      setScriptError(err.message);
    } finally {
      setGeneratingScript(false);
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
  const pollForResult = async (requestId, modelId, statusUrl, responseUrl) => {
    const maxAttempts = 120;
    let consecutiveErrors = 0;
    for (let i = 0; i < maxAttempts; i++) {
      if (cancelRef.current) throw new Error('Cancelled');
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await apiFetch('/api/jumpstart/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, model: modelId, statusUrl, responseUrl }),
        });
        const data = await res.json();
        if (data.videoUrl) return data.videoUrl;
        if (data.status === 'failed' || data.error) throw new Error(data.error || 'Generation failed');
        consecutiveErrors = 0; // Reset on successful poll
      } catch (err) {
        if (err.message === 'Cancelled') throw err;
        consecutiveErrors++;
        console.warn(`[Storyboard] Poll error (${consecutiveErrors}/3):`, err.message);
        // Stop after 3 consecutive errors — prevents infinite loop on expired/failed requests
        if (consecutiveErrors >= 3) throw err;
      }
    }
    throw new Error('Generation timed out');
  };

  const generateSingleScene = async (scene, startFrameUrlForScene) => {
    // Use globalModel for all scenes
    const sceneModel = globalModel;
    const sceneResolution = resolution;
    const sceneEnableAudio = enableAudioDefault;

    const selectedModel = SCENE_MODELS.find(m => m.id === sceneModel);
    const elementsWithRefs = elements.filter(el => el.refs.length > 0);
    const isR2V = (sceneModel === 'kling-r2v-pro' || sceneModel === 'kling-r2v-standard') && elementsWithRefs.length > 0;

    // Stage 2 (Visual Director) already produced model-ready prompts.
    // No per-scene LLM call needed — this saves 6 GPT calls per storyboard.
    const prompt = scene.visualPrompt;
    console.log(`[Storyboard] Using Stage 2 prompt (${prompt.split(/\s+/).length} words): ${prompt.substring(0, 120)}...`);

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

    // For Grok R2V, pass reference images and inject @Image1 refs into prompt
    if (sceneModel === 'grok-r2v' && veoReferenceImages.length > 0) {
      formData.append('referenceImageUrls', JSON.stringify(veoReferenceImages));
    }

    // For V2V, pass video URL
    if (sceneModel === 'kling-o3-v2v-pro' || sceneModel === 'kling-o3-v2v-standard') {
      // V2V uses existing video — not applicable in standard storyboard flow
    }

    const imageUrl = startFrameUrlForScene || startFrameUrl || elementsWithRefs[0]?.refs[0] || null;
    if (!imageUrl) {
      throw new Error('No start image available. Add a starting scene image or character reference images.');
    }

    const resp = await fetch(imageUrl);
    const imageBlob = await resp.blob();
    formData.append('image', imageBlob, 'frame.jpg');

    if (isR2V) {
      if (upscaledElementsCache) {
        formData.append('r2vElementsPreUpscaled', JSON.stringify(upscaledElementsCache));
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

    formData.append('negativePrompt', scene.negativePrompt || 'blur, blurry, out of focus, distorted, deformed, low quality, watermark, text, logo');

    const res = await apiFetch('/api/jumpstart/generate', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.upscaledElements && !upscaledElementsCache) {
      setUpscaledElementsCache(data.upscaledElements);
      console.log('[Storyboard] Cached upscaled R2V elements for subsequent scenes');
    }

    if (data.videoUrl) return data.videoUrl;
    if (data.requestId) {
      setPollingScene(scene.id);
      const videoUrl = await pollForResult(data.requestId, data.model || sceneModel, data.statusUrl, data.responseUrl);
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
      // Save to library and get permanent Supabase URL
      let permanentUrl = videoUrl;
      try {
        const saveRes = await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl, type: 'video', title: `[Storyboard] Scene ${scene.sceneNumber} - ${storyboardTitle || storyboardName}`, source: 'storyboard', video_style: videoStyle || null, visual_style: style || null, model_name: selectedModel?.label || null, storyboard_name: storyboardName || null }),
        });
        const saveData = await saveRes.json();
        if (saveData.url && saveData.uploadedToStorage) {
          permanentUrl = saveData.url;
          console.log('[Storyboard] Saved to Supabase:', permanentUrl.substring(0, 80));
        }
      } catch (e) {
        console.warn('[Storyboard] Library save failed, using original URL:', e.message);
      }
      updateScene(scene.id, { status: 'done', videoUrl: permanentUrl, lastFrameUrl: lastFrame });
      toast.success(`Scene ${scene.sceneNumber} generated`);
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

  const generateAllRemaining = async () => {
    setStep('generate');
    setGenerating(true);
    cancelRef.current = false;
    setGenerationCancelled(false);

    // ── PRE-GENERATION: Voiceover + Music ──

    // A. Generate voiceover (if any scenes have dialogue)
    const scenesWithDialogue = scenes.filter(s => s.dialogue?.trim());
    if (scenesWithDialogue.length > 0 && !scenes.some(s => s.audioUrl)) {
      try {
        const voRes = await apiFetch('/api/storyboard/generate-voiceover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'batch',
            scenes: scenes.map(s => ({ sceneNumber: s.sceneNumber, dialogue: s.dialogue })),
            model: ttsModel,
            voice,
            speed: ttsSpeed,
            modelDurationConstraints: getModelDurationConstraints(globalModel),
          }),
        });
        const voData = await voRes.json();
        if (voData.success) {
          const updatedScenes = scenes.map(s => {
            const audio = voData.results.find(r => r.sceneNumber === s.sceneNumber);
            const adjusted = voData.adjustedScenes?.find(a => a.sceneNumber === s.sceneNumber);
            return {
              ...s,
              audioUrl: audio?.audioUrl || s.audioUrl,
              ttsDuration: audio?.durationSeconds || s.ttsDuration,
              durationSeconds: adjusted?.durationSeconds || s.durationSeconds,
            };
          });
          setScenes(updatedScenes);
        }
      } catch (err) {
        console.warn('[Storyboard] Voiceover generation failed (non-fatal):', err.message);
      }
    }

    // B. Generate music in parallel (non-blocking)
    let musicPromise = null;
    if (musicMood?.trim() && !musicUrl) {
      musicPromise = apiFetch('/api/audio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moodPrompt: musicMood,
          durationSeconds: scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0),
        }),
      }).then(r => r.json()).catch(err => {
        console.warn('[Storyboard] Music generation failed:', err.message);
        return null;
      });
    }

    // ── VIDEO GENERATION (existing sequential loop) ──
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
            video_style: videoStyle || null,
            visual_style: style || null,
            model_name: selectedModelInfo?.label || null,
            storyboard_name: storyboardName || null,
          }),
        }).catch(err => console.warn('Failed to save to library:', err));

      } catch (err) {
        if (err.message === 'Cancelled') break;
        updateScene(scene.id, { status: 'error' });
        toast.error(`Scene ${i + 1} failed: ${err.message}`);
      }
    }

    // ── POST-GENERATION: Lipsync ──
    if (lipsyncModel && lipsyncModel !== 'none') {
      const lipsyncEligible = scenes.filter(s => s.status === 'done' && s.videoUrl && s.audioUrl);
      if (lipsyncEligible.length > 0) {
        try {
          const lsRes = await apiFetch('/api/storyboard/apply-lipsync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'batch',
              scenes: lipsyncEligible.map(s => ({
                sceneNumber: s.sceneNumber,
                videoUrl: s.videoUrl,
                audioUrl: s.audioUrl,
                startFrameUrl: s.startFrameUrl,
              })),
              model: lipsyncModel,
              contentType,
            }),
          });
          const lsData = await lsRes.json();
          if (lsData.success) {
            for (const result of lsData.results) {
              if (result.lipsyncVideoUrl) {
                const scene = scenes.find(s => s.sceneNumber === result.sceneNumber);
                if (scene) {
                  updateScene(scene.id, {
                    videoUrl: result.lipsyncVideoUrl,
                    originalVideoUrl: result.originalVideoUrl,
                    hasLipsync: true,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn('[Storyboard] Lipsync failed (non-fatal):', err.message);
          toast.warning('Lipsync failed — videos will be assembled without lip sync');
        }
      }
    }

    // ── Wait for music if still generating ──
    if (musicPromise) {
      const musicData = await musicPromise;
      if (musicData?.audioUrl) {
        setMusicUrl(musicData.audioUrl);
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

  // ── Assembly ──
  const handleAssemble = async () => {
    setAssembling(true);
    try {
      const completedScenes = scenes
        .filter(s => s.status === 'done' && s.videoUrl)
        .map(s => ({
          videoUrl: s.videoUrl,
          durationSeconds: s.durationSeconds || defaultDuration,
          audioUrl: s.audioUrl || null,
        }));
      const res = await apiFetch('/api/storyboard/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: completedScenes,
          musicUrl: musicUrl || null,
          musicVolume: musicVolume || 0.15,
          captionConfig: captionStyle !== 'none' ? captionStyle : null,
          storyboardName,
          voiceoverScenes: completedScenes.filter(s => s.audioUrl).map(s => ({
            audioUrl: s.audioUrl,
            durationSeconds: s.durationSeconds,
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Assembly failed');
      const finalUrl = data.captionedUrl || data.assembledUrl;
      setAssembledUrl(finalUrl);
      // Save assembled video to library
      try {
        await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: finalUrl,
            type: 'video',
            title: `[Storyboard] ${storyboardTitle || storyboardName || 'Assembled'}`,
            source: 'storyboard',
          }),
        });
      } catch (saveErr) {
        console.error('[Storyboard] Failed to save assembled video to library:', saveErr);
      }
    } catch (err) {
      console.error('[Storyboard] Assembly failed:', err);
      toast.error('Assembly failed: ' + err.message);
    } finally {
      setAssembling(false);
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
        title: `Scene ${s.sceneNumber} - ${storyboardTitle || storyboardName}`,
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

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.key === step);
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1;
  const canGoBack = currentStepIndex > 0;

  const handleNext = () => {
    if (!canGoNext) return;
    markStepCompleted(step);
    const nextStep = WIZARD_STEPS[currentStepIndex + 1];
    setStep(nextStep.key);
  };

  const handleBack = () => {
    if (!canGoBack) return;
    setStep(WIZARD_STEPS[currentStepIndex - 1].key);
  };

  const handleStepClick = (key) => {
    const targetIdx = WIZARD_STEPS.findIndex(s => s.key === key);
    if (targetIdx < currentStepIndex) {
      setStep(key);
    }
  };

  const getSubtitle = () => {
    const found = WIZARD_STEPS.find(s => s.key === step);
    return found ? `Step ${WIZARD_STEPS.indexOf(found) + 1} of ${WIZARD_STEPS.length}: ${found.label}` : '';
  };

  const isNextDisabled = () => {
    switch (step) {
      case 'story': return !storyboardName?.trim();
      case 'style': return !style;
      case 'model': return !globalModel;
      case 'inputs': return false;
      case 'script': return scenes.length === 0 || generatingScript;
      case 'audio': return false;
      case 'generate': return generating || completedScenesCount === 0;
      default: return false;
    }
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

        {/* ── Preset Bar (visible on all steps) ── */}
        <div className="flex items-center gap-2 mb-4 -mt-1">
          <div className="relative" ref={presetMenuRef}>
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <FolderOpen size={14} />
              {activePresetName || 'Load Preset'}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {showPresetMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                {presets.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">No saved presets yet</div>
                ) : (
                  presets.map(p => (
                    <div key={p.id} className="flex items-center group hover:bg-gray-50">
                      <button
                        onClick={() => handleLoadPreset(p)}
                        className="flex-1 px-3 py-2 text-left text-sm text-gray-700 truncate"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id, p.name); }}
                        className="px-2 py-1 mr-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {activePresetId && (
            <button
              onClick={handleUpdatePreset}
              disabled={savingPreset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[#2C666E]/20 bg-[#2C666E]/5 hover:bg-[#2C666E]/10 text-[#2C666E] transition-colors"
              title="Update current preset with latest settings"
            >
              {savingPreset ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Update
            </button>
          )}

          <button
            onClick={() => {
              setSavePresetName(activePresetName || storyboardName || '');
              setShowSavePresetDialog(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Save size={14} />
            Save As
          </button>

          {activePresetName && (
            <span className="text-xs text-gray-400 ml-auto">Preset: {activePresetName}</span>
          )}
        </div>

        {/* Save Preset Dialog */}
        {showSavePresetDialog && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Preset Name</label>
            <div className="flex gap-2">
              <Input
                value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                placeholder="e.g., 'Hamilton City Council' or 'Product Demos'"
                className="text-sm flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                autoFocus
              />
              <Button
                onClick={handleSavePreset}
                disabled={!savePresetName.trim() || savingPreset}
                className="bg-[#2C666E] hover:bg-[#1e4d54] text-white"
              >
                {savingPreset ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setShowSavePresetDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

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

            {/* Story Overview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Story Overview</label>
              <textarea
                value={storyOverview}
                onChange={(e) => setStoryOverview(e.target.value)}
                placeholder="Describe the story, scenario, or concept for your video..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] resize-y"
              />
            </div>

            {/* Narrative Style */}
            <div>
              <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">Narrative Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {NARRATIVE_STYLES.map(ns => (
                  <button
                    key={ns.key}
                    type="button"
                    onClick={() => setNarrativeStyle(ns.key)}
                    className={`px-3 py-2 rounded-lg text-left border transition-all ${
                      narrativeStyle === ns.key
                        ? 'border-[#2C666E] bg-[#2C666E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-800 block">{ns.label}</span>
                    <span className="text-[10px] text-gray-500">{ns.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-sm text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">Target Audience</label>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_AUDIENCES.map(ta => (
                  <button
                    key={ta}
                    type="button"
                    onClick={() => setTargetAudience(targetAudience === ta ? '' : ta)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      targetAudience === ta ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ta}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Brief */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Client Brief (optional)</label>
              <textarea
                value={clientBrief}
                onChange={(e) => setClientBrief(e.target.value)}
                placeholder="Paste any specific instructions from the client..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] resize-y"
              />
            </div>

            {/* Dialogue toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDialogue}
                onChange={(e) => setHasDialogue(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
              />
              <span className="text-sm text-gray-700">Include dialogue / narration per scene</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Desired Length</label>
              <div className="flex gap-2">
                {[8, 15, 30, 45, 60, 90].map(len => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setDesiredLength(len)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                      desiredLength === len
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {len}s
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

        {/* ── Step 2: Visual Style ── */}
        {step === 'style' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Style Preset</h3>
              <StyleGrid value={style} onChange={(v) => { setStyle(v); setTimeout(() => handleNext(), 150); }} maxHeight="none" columns="grid-cols-4" />
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

            {/* Video / Motion Style */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Motion & cinematography style</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {videoStylesList.map(s => (
                  <button key={s.key} onClick={() => { setVideoStyle(videoStyle === s.key ? '' : s.key); }}
                    className={`rounded-xl border overflow-hidden text-left transition-all ${videoStyle === s.key ? 'border-[#2C666E] ring-1 ring-[#2C666E]' : 'border-slate-200 hover:border-slate-300'}`}>
                    {s.thumb && <img src={s.thumb} alt={s.label} className="w-full h-24 object-cover" loading="lazy" />}
                    <div className="p-2">
                      <div className="text-xs font-medium text-slate-700">{s.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{s.description}</div>
                    </div>
                  </button>
                ))}
                {videoStylesList.length === 0 && (
                  <div className="col-span-3 py-8 text-center text-sm text-gray-400">Loading video styles...</div>
                )}
              </div>
              {videoStyle && (
                <p className="text-xs text-[#2C666E] font-medium">
                  Selected: {videoStylesList.find(s => s.key === videoStyle)?.label}
                  <button onClick={() => setVideoStyle('')} className="ml-2 text-gray-400 hover:text-gray-600 underline">Clear</button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Model ── */}
        {step === 'model' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Choose the video generation model for all scenes.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCENE_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setGlobalModel(m.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    globalModel === m.id
                      ? 'border-[#2C666E] ring-2 ring-[#2C666E]/30 bg-white'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">{m.label}</span>
                    {globalModel === m.id && (
                      <CheckCircle2 className="w-5 h-5 text-[#2C666E] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{m.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                      {MODE_LABELS[m.mode] || m.mode}
                    </span>
                    {m.supportsRefs && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                        Character refs
                      </span>
                    )}
                    {m.supportsAudio && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                        Audio
                      </span>
                    )}
                    {m.supportsResolution && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                        Resolution
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Creative Inputs ── */}
        {step === 'inputs' && (
          <InputsStep
            startFrameUrl={startFrameUrl}
            startFrameDescription={startFrameDescription}
            onUploadStartFrame={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                // Upload to Supabase or use object URL
                const url = URL.createObjectURL(file);
                setStartFrameUrl(url);
                analyzeStartFrame(url);
              };
              input.click();
            }}
            onLibraryStartFrame={() => setShowLibraryForStartFrame(true)}
            onGenerateStartFrame={() => setShowImagineerForStartFrame(true)}
            onRemoveStartFrame={() => { setStartFrameUrl(null); setStartFrameDescription(''); }}
            isAnalyzingFrame={analyzingStartFrame}
            globalModel={globalModel}
            needsCharacters={needsCharacters}
            elements={elements}
            onElementsChange={setElements}
            veoReferenceImages={veoReferenceImages}
            onVeoRefsChange={setVeoReferenceImages}
            onOpenImagineer={(elIndex) => {
              if (typeof elIndex === 'number') setActiveElementIndex(elIndex);
              setShowImagineerForStartFrame(true);
            }}
            onOpenLibrary={(elIndex) => {
              if (typeof elIndex === 'number') setActiveElementIndex(elIndex);
              setShowLibrary(true);
              loadLibrary();
            }}
            sceneDirection={sceneDirection}
            onSceneDirectionChange={setSceneDirection}
          />
        )}

        {/* ── Step 5: Script & Storyboard ── */}
        {step === 'script' && (
          <div className="space-y-6">
            {generatingScript && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-[#2C666E] mx-auto" />
                <p className="text-sm text-gray-600 mt-3">Generating scene script (2-stage)...</p>
              </div>
            )}

            {!generatingScript && scenes.length === 0 && !scriptError && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Sparkles className="w-10 h-10 text-[#2C666E]" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Ready to Generate</h3>
                  <p className="text-sm text-gray-500">AI will create narrative beats, then produce model-ready visual prompts.</p>
                </div>
                <Button onClick={handleGenerateScript} className="bg-[#2C666E] hover:bg-[#1e4d54] text-white px-6">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Script & Storyboard
                </Button>
              </div>
            )}

            {scriptError && (
              <div className="flex flex-col items-center gap-4 py-8">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-sm text-red-600">{scriptError}</p>
                <Button onClick={handleGenerateScript} variant="outline" className="border-red-200 text-red-600">
                  <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                </Button>
              </div>
            )}

            {!generatingScript && scenes.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{scenes.length} scenes generated</p>
                  <button
                    onClick={() => { setScenes([]); handleGenerateScript(); }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Regenerate all
                  </button>
                </div>
                <StoryboardPreview
                  scenes={scenes}
                  storyboardName={storyboardName}
                  logline={storyboardTitle}
                  narrativeStyle={narrativeStyle}
                  overallMood={overallMood}
                  brandName={selectedBrand?.brand_name || ''}
                  aspectRatio={aspectRatio}
                  desiredLength={desiredLength}
                  startFrameUrl={startFrameUrl}
                  onUpdateScene={(id, updates) => {
                    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
                  }}
                  onExportPdf={(pdfUrl) => {}}
                />
              </>
            )}
          </div>
        )}

        {/* ── Step 6: Audio & Finishing ── */}
        {step === 'audio' && (
          <AudioFinishingStep
            scenes={scenes}
            onUpdateScene={(id, updates) => setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))}
            onUpdateAllScenes={setScenes}
            ttsModel={ttsModel}
            onTtsModelChange={setTtsModel}
            voice={voice}
            onVoiceChange={setVoice}
            speed={ttsSpeed}
            onSpeedChange={setTtsSpeed}
            lipsyncModel={lipsyncModel}
            onLipsyncModelChange={setLipsyncModel}
            contentType={contentType}
            onContentTypeChange={setContentType}
            musicMood={musicMood}
            onMusicMoodChange={setMusicMood}
            musicVolume={musicVolume}
            onMusicVolumeChange={setMusicVolume}
            musicUrl={musicUrl}
            captionStyle={captionStyle}
            onCaptionStyleChange={setCaptionStyle}
            modelDurationConstraints={getModelDurationConstraints(globalModel)}
          />
        )}

        {/* ── Step 7: Generate ── */}
        {step === 'generate' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">
                {completedScenesCount} / {scenes.length} scenes complete
                {selectedModelInfo && (
                  <span className="ml-2 text-xs text-gray-400">({selectedModelInfo.label})</span>
                )}
              </span>
              <div className="flex gap-2">
                {!generating && scenes.some(s => s.status === 'pending' || s.status === 'error') && (
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

            {scenes.map((scene, i) => (
              <GenerateScene
                key={scene.id}
                scene={{ ...scene, model: globalModel }}
                onGenerate={() => generateSingleSceneWrapper(scene, i > 0 ? scenes[i-1]?.lastFrameUrl : startFrameUrl)}
                onRetry={() => {
                  updateScene(scene.id, { status: 'pending', videoUrl: null });
                  generateSingleSceneWrapper(scene, i > 0 ? scenes[i-1]?.lastFrameUrl : startFrameUrl);
                }}
                onRefineWithV2V={(videoUrl) => openV2VRefinement(scene, videoUrl)}
                isGenerating={scene.status === 'generating'}
                isPending={generating && scene.status === 'pending'}
              />
            ))}

            {/* Assembly section — after all scenes done */}
            {completedScenesCount === scenes.length && scenes.length > 0 && !generating && (
              <div className="mt-6 p-5 bg-white rounded-xl border border-gray-200 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">Final Assembly</h3>

                {!assembledUrl && (
                  <Button
                    onClick={handleAssemble}
                    disabled={assembling}
                    className="w-full bg-[#2C666E] hover:bg-[#1e4d54] text-white"
                  >
                    {assembling ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assembling...</>
                    ) : (
                      <><Video className="w-4 h-4 mr-2" /> Assemble Final Video</>
                    )}
                  </Button>
                )}

                {assembledUrl && (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
                      <video
                        src={assembledUrl}
                        controls
                        className="w-full max-h-64 object-contain"
                        preload="metadata"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={sendToTimeline}
                        className="flex-1 bg-[#2C666E] hover:bg-[#07393C] text-white"
                      >
                        <Send className="w-4 h-4 mr-1" /> Send to Timeline
                      </Button>
                      <Button
                        onClick={handleAssemble}
                        disabled={assembling}
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" /> Re-assemble
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </SlideOverBody>

      <SlideOverFooter>
        <div className="flex justify-between w-full">
          {/* Left side: Back button */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} disabled={currentStepIndex <= 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          {/* Right side */}
          <div className="flex gap-2">
            {step === 'generate' && !generating && completedScenesCount > 0 && completedScenesCount === scenes.length && !assembledUrl && (
              <Button
                onClick={sendToTimeline}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                <Send className="w-4 h-4 mr-1" /> Send to Timeline ({completedScenesCount}) <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {/* Standard Next button (not shown on generate step) */}
            {step !== 'generate' && (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
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

      {/* Library modal for character reference images */}
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={(item) => {
          const url = item.url;
          if (globalModel?.startsWith('kling-r2v')) {
            // Kling R2V — add to element refs (functional updater for multi-select compat)
            setElements(prev => {
              const next = [...prev];
              const el = next[activeElementIndex];
              if (el && el.refs.length < 3) {
                const isFirstRef = el.refs.length === 0;
                next[activeElementIndex] = { ...el, refs: [...el.refs, url] };
                if (isFirstRef && !el.description) {
                  describeCharacterFromImage(url, activeElementIndex);
                }
              }
              return next;
            });
          } else {
            // Veo / other — add to flat reference images
            setVeoReferenceImages(prev => prev.length < 5 ? [...prev, url] : prev);
          }
        }}
        mediaType="images"
      />
    </SlideOverPanel>
  );
}
