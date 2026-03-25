import React, { useState, useEffect, useRef, useCallback } from "react";
import { SlideOverPanel } from "@/components/ui/slide-over-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RotateCcw, Loader2, Download, Upload, CheckCircle2, AlertCircle,
  X, Grid3X3, Scissors, Sparkles, ArrowLeft, ChevronRight,
  Pencil, Trash2, Eye, Save, RotateCw, Check, XCircle, FolderOpen
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import StyleGrid from "@/components/ui/StyleGrid";
import { getPromptText } from "@/lib/stylePresets";
import LibraryModal from "@/components/modals/LibraryModal";
import BrandStyleGuideSelector, { extractBrandStyleData } from "@/components/ui/BrandStyleGuideSelector";
import WizardStepper from "@/components/ui/WizardStepper";
import { POSE_SETS, getPoseSetById } from '@/lib/turnaroundPoseSets';

// ─── Constants ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { key: 'character', label: 'Character' },
  { key: 'style-model', label: 'Style & Model' },
  { key: 'props', label: 'Props' },
  { key: 'refinements', label: 'Refinements' },
  { key: 'results', label: 'Results' },
  { key: 'cells', label: 'Cell Editor' },
];

const MODEL_OPTIONS = [
  { value: "nano-banana-2-edit", label: "Nano Banana 2 Edit", needsRef: true, tag: "Recommended" },
  { value: "nano-banana-pro", label: "Nano Banana Pro Edit", needsRef: true, tag: "Premium" },
  { value: "seedream", label: "Seedream v4.5 Edit", needsRef: true },
  { value: "seedream-generate", label: "Seedream v4 (No Ref)", needsRef: false, tag: "Generate" },
  { value: "nano-banana-2", label: "Nano Banana 2 (No Ref)", needsRef: false, tag: "Generate" },
  { value: "fal-flux", label: "Flux 2 (+ LoRA)", needsRef: false },
];

const PROP_CATEGORIES = [
  { label: 'Vehicles & Transport', props: [
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'skateboard', label: 'Skateboard' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'surfboard', label: 'Surfboard' },
    { value: 'horse', label: 'Horse' },
    { value: 'motorcycle', label: 'Motorcycle' },
  ]},
  { label: 'Weapons & Combat', props: [
    { value: 'sword', label: 'Sword' },
    { value: 'shield', label: 'Shield' },
    { value: 'bow', label: 'Bow & Arrow' },
    { value: 'staff', label: 'Staff' },
    { value: 'axe', label: 'Axe' },
    { value: 'spear', label: 'Spear' },
    { value: 'dagger', label: 'Dagger' },
    { value: 'hammer', label: 'War Hammer' },
  ]},
  { label: 'Musical Instruments', props: [
    { value: 'guitar', label: 'Guitar' },
    { value: 'violin', label: 'Violin' },
    { value: 'drums', label: 'Drums' },
    { value: 'trumpet', label: 'Trumpet' },
    { value: 'piano-keyboard', label: 'Keyboard' },
    { value: 'microphone', label: 'Microphone' },
  ]},
  { label: 'Sports & Outdoor', props: [
    { value: 'basketball', label: 'Basketball' },
    { value: 'soccer-ball', label: 'Soccer Ball' },
    { value: 'tennis-racket', label: 'Tennis Racket' },
    { value: 'baseball-bat', label: 'Baseball Bat' },
    { value: 'fishing-rod', label: 'Fishing Rod' },
    { value: 'climbing-gear', label: 'Climbing Gear' },
    { value: 'ski-poles', label: 'Ski Poles' },
  ]},
  { label: 'Tools & Equipment', props: [
    { value: 'camera', label: 'Camera' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'toolbox', label: 'Toolbox' },
    { value: 'paintbrush', label: 'Paintbrush & Palette' },
    { value: 'magnifying-glass', label: 'Magnifying Glass' },
    { value: 'telescope', label: 'Telescope' },
    { value: 'binoculars', label: 'Binoculars' },
  ]},
  { label: 'Fantasy & Magic', props: [
    { value: 'wand', label: 'Magic Wand' },
    { value: 'spell-book', label: 'Spell Book' },
    { value: 'crystal-ball', label: 'Crystal Ball' },
    { value: 'potion', label: 'Potion Bottle' },
    { value: 'magic-orb', label: 'Magic Orb' },
    { value: 'fairy-wings', label: 'Fairy Wings' },
    { value: 'lantern', label: 'Lantern' },
  ]},
  { label: 'Everyday Items', props: [
    { value: 'backpack', label: 'Backpack' },
    { value: 'umbrella', label: 'Umbrella' },
    { value: 'book', label: 'Book' },
    { value: 'phone', label: 'Phone' },
    { value: 'coffee-cup', label: 'Coffee Cup' },
    { value: 'bag', label: 'Shopping Bag' },
    { value: 'suitcase', label: 'Suitcase' },
    { value: 'newspaper', label: 'Newspaper' },
  ]},
  { label: 'Accessories & Wearable', props: [
    { value: 'helmet', label: 'Helmet' },
    { value: 'cape', label: 'Cape' },
    { value: 'crown', label: 'Crown' },
    { value: 'mask', label: 'Mask' },
    { value: 'goggles', label: 'Goggles' },
    { value: 'wings', label: 'Wings' },
    { value: 'armor', label: 'Armor' },
    { value: 'jetpack', label: 'Jetpack' },
  ]},
  { label: 'Companions', props: [
    { value: 'pet-dog', label: 'Pet Dog' },
    { value: 'pet-cat', label: 'Pet Cat' },
    { value: 'parrot', label: 'Parrot' },
    { value: 'dragon', label: 'Baby Dragon' },
    { value: 'robot-companion', label: 'Robot Buddy' },
    { value: 'owl', label: 'Owl' },
    { value: 'fairy', label: 'Fairy Companion' },
  ]},
];

const ALL_PROPS_LOCAL = PROP_CATEGORIES.flatMap(c => c.props);

const NEG_PROMPT_CATEGORIES = [
  { label: 'Quality Issues', prompts: [
    { value: 'blurry', label: 'Blurry' },
    { value: 'low-quality', label: 'Low Quality' },
    { value: 'pixelated', label: 'Pixelated' },
    { value: 'noise', label: 'Noise/Grain' },
    { value: 'jpeg-artifacts', label: 'JPEG Artifacts' },
    { value: 'watermark', label: 'Watermark' },
    { value: 'text', label: 'Text/Letters' },
    { value: 'signature', label: 'Signature' },
  ]},
  { label: 'Anatomy & Body', prompts: [
    { value: 'extra-limbs', label: 'Extra Limbs' },
    { value: 'deformed-hands', label: 'Deformed Hands' },
    { value: 'extra-fingers', label: 'Extra Fingers' },
    { value: 'missing-fingers', label: 'Missing Fingers' },
    { value: 'bad-anatomy', label: 'Bad Anatomy' },
    { value: 'disproportionate', label: 'Disproportionate' },
    { value: 'fused-limbs', label: 'Fused Limbs' },
    { value: 'duplicate-body-parts', label: 'Duplicate Body Parts' },
  ]},
  { label: 'Face & Expression', prompts: [
    { value: 'angry-emotions', label: 'Angry Emotions' },
    { value: 'sad-emotions', label: 'Sad Emotions' },
    { value: 'scared-emotions', label: 'Scared Emotions' },
    { value: 'crying', label: 'Crying' },
    { value: 'cross-eyed', label: 'Cross-Eyed' },
    { value: 'asymmetric-face', label: 'Asymmetric Face' },
    { value: 'ugly-face', label: 'Ugly/Distorted Face' },
    { value: 'dead-eyes', label: 'Dead/Lifeless Eyes' },
  ]},
  { label: 'Style & Composition', prompts: [
    { value: 'photorealistic', label: 'Photorealistic' },
    { value: 'cartoon', label: 'Cartoon' },
    { value: 'anime', label: 'Anime' },
    { value: 'nsfw', label: 'NSFW' },
    { value: 'violence', label: 'Violence/Gore' },
    { value: 'dark-theme', label: 'Dark/Horror Theme' },
    { value: 'cluttered-bg', label: 'Cluttered Background' },
    { value: 'cropped', label: 'Cropped/Cut Off' },
  ]},
  { label: 'Consistency', prompts: [
    { value: 'inconsistent-outfit', label: 'Outfit Changes' },
    { value: 'color-shifts', label: 'Color Shifts' },
    { value: 'inconsistent-proportions', label: 'Proportion Changes' },
    { value: 'style-mixing', label: 'Mixed Art Styles' },
    { value: 'different-characters', label: 'Different Characters' },
    { value: 'age-changes', label: 'Age Variations' },
  ]},
];

const ALL_NEG_PROMPTS_LOCAL = NEG_PROMPT_CATEGORIES.flatMap(c => c.prompts);

const DEFAULT_CHARACTER_DESC = '';

const GRID_COLS = 4;
const GRID_ROWS = 6;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

const DEFAULT_CELL_LABELS = [
  "Front", "3/4 Front", "Side", "Back",
  "3/4 Back", "Neutral", "Determined", "Joyful",
  "Walk A", "Walk B", "Walk Toward", "Walk Away",
  "Running", "Jumping", "Hero Land", "Fight Stance",
  "Sitting", "Reaching", "Carrying", "Leaning",
  "Face Detail", "Hand Detail", "Top-Down", "Low Angle",
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function TurnaroundSheetWizard({ isOpen, onClose, onImageCreated, initialImage = null }) {
  const { user } = useAuth();

  // Wizard step
  const [wizardStep, setWizardStep] = useState('character');
  const [completedSteps, setCompletedSteps] = useState([]);

  // Form
  const [characters, setCharacters] = useState([
    { id: `char-${Date.now()}`, name: '', description: DEFAULT_CHARACTER_DESC, referenceImageUrl: '', referencePreview: '' }
  ]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedPoseSets, setSelectedPoseSets] = useState(['standard-24']);
  const [selectedModel, setSelectedModel] = useState("nano-banana-2-edit");
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedNegPills, setSelectedNegPills] = useState([]);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);

  const updateCharacter = (id, field, value) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCharacter = () => {
    setCharacters(prev => [...prev, {
      id: `char-${Date.now()}`,
      name: '',
      description: '',
      referenceImageUrl: '',
      referencePreview: '',
    }]);
  };

  const removeCharacter = (id) => {
    if (characters.length <= 1) return;
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // AI analysis
  const [analyzingRef, setAnalyzingRef] = useState(false);

  // Multi-sheet generation
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savedSheetIds, setSavedSheetIds] = useState(new Set());

  // Gallery filters
  const [filterCharacter, setFilterCharacter] = useState(new Set());
  const [filterStyle, setFilterStyle] = useState(new Set());
  const [filterPoseSet, setFilterPoseSet] = useState(new Set());

  // Slice & select
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCells, setSelectedCells] = useState(new Set());

  // Cell editing
  const [cellImages, setCellImages] = useState([]);
  const [editingCellIndex, setEditingCellIndex] = useState(null);
  const [savingForLora, setSavingForLora] = useState(false);
  const [slicing, setSlicing] = useState(false);
  const [loraFolderName, setLoraFolderName] = useState('');

  // Reassemble
  const [reassembledUrl, setReassembledUrl] = useState(null);
  const [reassembling, setReassembling] = useState(false);

  const fileInputRef = useRef(null);
  const pollingIntervalsRef = useRef({});
  const timerRef = useRef(null);
  const concurrencyRef = useRef({ running: 0, queue: [] });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const describeCharacter = async (charId, hostedUrl) => {
    setAnalyzingRef(true);
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: hostedUrl }),
      });
      const data = await res.json();
      if (data.description) {
        updateCharacter(charId, 'description', data.description);
        // Character analyzed
      } else if (data.error) {
        toast.error('Could not analyze character: ' + data.error);
      }
    } catch (err) {
      console.warn('[Turnaround] Describe error:', err.message);
      toast.error('Character analysis failed — describe manually.');
    } finally {
      setAnalyzingRef(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  const propsLabels = selectedProps.map(p => ALL_PROPS_LOCAL.find(o => o.value === p)?.label || p);

  const negPillLabels = selectedNegPills.map(v => ALL_NEG_PROMPTS_LOCAL.find(o => o.value === v)?.label || v);
  const combinedNegativePrompt = [
    ...negPillLabels,
    ...(negativePrompt.trim() ? [negativePrompt.trim()] : []),
  ].join(', ') || undefined;

  const getCellLabels = (poseSetId) => {
    if (!poseSetId || poseSetId === 'standard-24') return DEFAULT_CELL_LABELS;
    const ps = getPoseSetById(poseSetId);
    return ps.rows.flatMap(r => r.cells.map(c => c.shortLabel));
  };

  const toggleNegPill = (val) => {
    setSelectedNegPills(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const canGenerate = characters.every(c => c.name.trim() && c.description.trim())
    && selectedStyles.length > 0
    && selectedPoseSets.length > 0
    && !characters.some(c =>
      !c.referenceImageUrl && MODEL_OPTIONS.find(m => m.value === selectedModel)?.needsRef
    );

  // ─── Gallery filter helpers ────────────────────────────────────────────────

  const toggleFilter = (current, setter, value) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const filteredSheets = sheets.filter(s => {
    if (filterCharacter.size > 0 && !filterCharacter.has(s.character?.name)) return false;
    if (filterStyle.size > 0 && !filterStyle.has(s.style)) return false;
    if (filterPoseSet.size > 0 && !filterPoseSet.has(s.poseSet)) return false;
    return true;
  });

  const groupedByCharacter = {};
  for (const sheet of filteredSheets) {
    const name = sheet.character?.name || 'Character';
    if (!groupedByCharacter[name]) groupedByCharacter[name] = [];
    groupedByCharacter[name].push(sheet);
  }

  // ─── Wizard navigation ────────────────────────────────────────────────────

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.key === wizardStep);

  const markCompleted = (stepKey) => {
    setCompletedSteps(prev => prev.includes(stepKey) ? prev : [...prev, stepKey]);
  };

  const goToStep = (stepKey) => {
    setWizardStep(stepKey);
  };

  const goNext = () => {
    markCompleted(wizardStep);
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setWizardStep(WIZARD_STEPS[nextIndex].key);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setWizardStep(WIZARD_STEPS[prevIndex].key);
    }
  };

  const handleStepClick = (key) => {
    goToStep(key);
  };

  // ─── Reset ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setWizardStep('character');
      setCompletedSteps([]);
      setSelectedStyles([]);
      setSelectedPoseSets(['standard-24']);
      setSelectedModel("nano-banana-2-edit");
      setSelectedProps([]);
      setSelectedNegPills([]);
      setNegativePrompt("");
      setSelectedBrand(null);
      setSheets([]);
      setActiveSheetId(null);
      setSavedSheetIds(new Set());
      setFilterCharacter(new Set());
      setFilterStyle(new Set());
      setFilterPoseSet(new Set());
      setShowGrid(true);
      setSelectedCells(new Set());
      setCellImages([]);
      setEditingCellIndex(null);
      setSavingForLora(false);
      setSlicing(false);
      setLoraFolderName('');
      setReassembledUrl(null);
      setReassembling(false);
      setElapsedSeconds(0);
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
      pollingIntervalsRef.current = {};
      if (timerRef.current) clearInterval(timerRef.current);

      if (initialImage) {
        const initCharId = `char-${Date.now()}`;
        setCharacters([{ id: initCharId, name: '', description: DEFAULT_CHARACTER_DESC, referenceImageUrl: initialImage, referencePreview: initialImage }]);
        setUploadingRef(false);
        setAnalyzingRef(false);
        describeCharacter(initCharId, initialImage);
      } else {
        setCharacters([{ id: `char-${Date.now()}`, name: '', description: DEFAULT_CHARACTER_DESC, referenceImageUrl: '', referencePreview: '' }]);
        setUploadingRef(false);
        setAnalyzingRef(false);
      }
    }
  }, [isOpen]);

  const anyGenerating = sheets.some(s => s.generating);

  // Completed but unsaved sheets (for "Edit Next" flow)
  const completedSheets = sheets.filter(s => s.imageUrl && !s.generating && !s.error);
  const unsavedSheets = completedSheets.filter(s => !savedSheetIds.has(s.id));
  const nextUnsavedSheet = unsavedSheets.find(s => s.id !== activeSheetId);

  const handleEditNextSheet = () => {
    if (!nextUnsavedSheet) {
      // All sheets saved — return to results gallery
      setWizardStep('results');
      setActiveSheetId(null);
      setCellImages([]);
      setEditingCellIndex(null);
      setReassembledUrl(null);
      return;
    }
    // Navigate to the next unsaved sheet's detail view
    setActiveSheetId(nextUnsavedSheet.id);
    setCellImages([]);
    setEditingCellIndex(null);
    setReassembledUrl(null);
    setWizardStep('results');
  };

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (anyGenerating) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
      return () => clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [anyGenerating]);

  // ─── Polling for queued sheets ────────────────────────────────────────────

  const startPolling = useCallback((sheetId, reqId, model) => {
    if (pollingIntervalsRef.current[sheetId]) return;
    let polling = false;
    const interval = setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const res = await apiFetch('/api/imagineer/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: reqId, model }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.imageUrl) {
          setSheets(prev => prev.map(s => s.id === sheetId
            ? { ...s, imageUrl: data.imageUrl, generating: false, requestId: null }
            : s
          ));
          clearInterval(interval);
          delete pollingIntervalsRef.current[sheetId];
          // Sheet ready
        } else if (data.status === 'failed') {
          setSheets(prev => prev.map(s => s.id === sheetId
            ? { ...s, generating: false, requestId: null, error: data.error || 'Generation failed' }
            : s
          ));
          clearInterval(interval);
          delete pollingIntervalsRef.current[sheetId];
          toast.error(data.error || 'Generation failed');
        }
      } catch (err) {
        console.warn(`[Turnaround] Poll error for ${sheetId}:`, err.message);
      } finally {
        polling = false;
      }
    }, 3000);
    pollingIntervalsRef.current[sheetId] = interval;
  }, [sheets]);

  // ─── File upload ──────────────────────────────────────────────────────────

  const handleFileUploadForChar = async (charId, file) => {
    if (!file || !file.type.startsWith('image/')) {
      // invalid file type
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      updateCharacter(charId, 'referencePreview', dataUrl);
      setUploadingRef(true);
      try {
        const res = await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: dataUrl, type: 'image', title: 'Turnaround Reference', source: 'turnaround-ref' }),
        });
        const data = await res.json();
        if (data.url) {
          updateCharacter(charId, 'referenceImageUrl', data.url);
          // Reference uploaded, analyzing
          describeCharacter(charId, data.url);
        } else throw new Error(data.error || 'Upload failed');
      } catch (err) {
        toast.error('Upload failed: ' + err.message);
        updateCharacter(charId, 'referencePreview', '');
      } finally {
        setUploadingRef(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── Generate (cartesian product: characters × styles × pose sets) ──────────

  const fireSheet = async (sheet) => {
    try {
      const response = await apiFetch('/api/imagineer/turnaround', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterDescription: sheet.character.description.trim(),
          referenceImageUrl: sheet.character.referenceImageUrl?.trim() || undefined,
          style: sheet.styleText.trim(),
          poseSet: sheet.poseSet,
          characterName: sheet.character.name.trim(),
          props: propsLabels.length > 0 ? propsLabels : undefined,
          model: selectedModel,
          negativePrompt: combinedNegativePrompt,
          brandStyleGuide: extractBrandStyleData(selectedBrand),
        }),
      });

      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch {
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 200)}`);
      }
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.imageUrl) {
        setSheets(prev => prev.map(s => s.id === sheet.id
          ? { ...s, imageUrl: data.imageUrl, generating: false }
          : s
        ));
        // Sheet ready
      } else if (data.requestId) {
        setSheets(prev => prev.map(s => s.id === sheet.id
          ? { ...s, requestId: data.requestId, pollModel: data.model || selectedModel }
          : s
        ));
        startPolling(sheet.id, data.requestId, data.model || selectedModel);
      } else throw new Error('Unexpected response');
    } catch (error) {
      console.error(`[Turnaround] Error for ${sheet.character.name}/${sheet.style}:`, error);
      setSheets(prev => prev.map(s => s.id === sheet.id
        ? { ...s, generating: false, error: error.message }
        : s
      ));
      toast.error(`${sheet.character.name} / ${sheet.styleText}: ${error.message}`);
    }
  };

  const MAX_CONCURRENT = 4;
  const enqueueSheets = (sheetsToFire) => {
    const ref = concurrencyRef.current;
    ref.queue.push(...sheetsToFire);
    const processNext = () => {
      while (ref.running < MAX_CONCURRENT && ref.queue.length > 0) {
        const s = ref.queue.shift();
        ref.running++;
        fireSheet(s).finally(() => { ref.running--; processNext(); });
      }
    };
    processNext();
  };

  const handleGenerate = async () => {
    if (!characters.every(c => c.name.trim() && c.description.trim())) {
      // If single character with description but no name, auto-name it
      if (characters.length === 1 && characters[0].description.trim() && !characters[0].name.trim()) {
        updateCharacter(characters[0].id, 'name', 'Character 1');
      } else {
        toast.error("Every character needs a name and description.");
        return;
      }
    }
    if (selectedStyles.length === 0) { toast.error("Select at least one style."); return; }
    if (selectedPoseSets.length === 0) { toast.error("Select at least one pose set."); return; }

    // Cartesian product: characters × styles × poseSets
    const newSheets = [];
    let idx = 0;
    for (const char of characters) {
      for (const style of selectedStyles) {
        for (const psId of selectedPoseSets) {
          const ps = getPoseSetById(psId);
          newSheets.push({
            id: `${Date.now()}-${idx++}`,
            character: { ...char },
            style,
            styleText: getPromptText(style),
            poseSet: psId,
            poseSetName: ps.name,
            generating: true,
            requestId: null,
            pollModel: null,
            imageUrl: null,
            error: null,
          });
        }
      }
    }

    // Soft warning if >10 sheets
    if (newSheets.length > 10) {
      const confirmed = window.confirm(
        `This will generate ${newSheets.length} sheets (${characters.length} character${characters.length > 1 ? 's' : ''} × ${selectedStyles.length} style${selectedStyles.length > 1 ? 's' : ''} × ${selectedPoseSets.length} pose set${selectedPoseSets.length > 1 ? 's' : ''}). Continue?`
      );
      if (!confirmed) return;
    }

    setSheets(newSheets);
    setActiveSheetId(null);
    setSelectedCells(new Set());
    setCellImages([]);
    setEditingCellIndex(null);

    markCompleted('character');
    markCompleted('style-model');
    markCompleted('props');
    markCompleted('refinements');
    setWizardStep('results');

    // Reset concurrency queue and fire
    concurrencyRef.current = { running: 0, queue: [] };
    enqueueSheets(newSheets);
  };

  const retrySheet = (sheetId) => {
    setSheets(prev => {
      const sheet = prev.find(s => s.id === sheetId);
      if (!sheet?.error) return prev;
      // Reset and re-fire
      const updated = prev.map(s => s.id === sheetId
        ? { ...s, generating: true, error: null, requestId: null, imageUrl: null }
        : s
      );
      setTimeout(() => enqueueSheets([{ ...sheet, generating: true, error: null, requestId: null, imageUrl: null }]), 0);
      return updated;
    });
  };

  const retryAllFailed = () => {
    setSheets(prev => {
      const failed = prev.filter(s => s.error);
      if (failed.length === 0) return prev;
      const updated = prev.map(s => s.error
        ? { ...s, generating: true, error: null, requestId: null, imageUrl: null }
        : s
      );
      setTimeout(() => enqueueSheets(failed.map(s => ({ ...s, generating: true, error: null, requestId: null, imageUrl: null }))), 0);
      return updated;
    });
  };

  // ─── Slice sheet into cells ───────────────────────────────────────────────

  const activeSheet = sheets.find(s => s.id === activeSheetId);
  const sheetImageUrl = activeSheet?.imageUrl || null;

  const handleSliceIntoCells = useCallback(async () => {
    if (!sheetImageUrl) return;
    setSlicing(true);

    try {
      const img = await new Promise((resolve, reject) => {
        const i = new window.Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Failed to load sheet image'));
        i.src = sheetImageUrl;
      });

      const cellW = img.width / GRID_COLS;
      const cellH = img.height / GRID_ROWS;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const cells = [];

      for (let i = 0; i < TOTAL_CELLS; i++) {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        canvas.width = Math.round(cellW);
        canvas.height = Math.round(cellH);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, Math.round(col * cellW), Math.round(row * cellH), Math.round(cellW), Math.round(cellH), 0, 0, canvas.width, canvas.height);
        cells.push({
          url: canvas.toDataURL('image/png'),
          label: getCellLabels(activeSheet?.poseSet)[i],
          deleted: false,
          editing: false,
          editPrompt: '',
          editLoading: false,
          editPreview: null,
        });
      }

      setCellImages(cells);
      setEditingCellIndex(null);
      markCompleted('results');
      setWizardStep('cells');
      // Sliced
    } catch (err) {
      toast.error('Failed to slice: ' + err.message);
    } finally {
      setSlicing(false);
    }
  }, [sheetImageUrl]);

  // ─── Cell actions ─────────────────────────────────────────────────────────

  const toggleDeleteCell = (index) => {
    setCellImages(prev => prev.map((c, i) => i === index ? { ...c, deleted: !c.deleted } : c));
  };

  const restoreAllCells = () => {
    setCellImages(prev => prev.map(c => ({ ...c, deleted: false })));
  };

  const updateCellField = (index, field, value) => {
    setCellImages(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  // ─── Edit a cell via AI ───────────────────────────────────────────────────

  const handleEditCell = async (index) => {
    const cell = cellImages[index];
    if (!cell || !cell.editPrompt.trim()) {
      toast.error('Enter an edit prompt.');
      return;
    }

    updateCellField(index, 'editLoading', true);
    updateCellField(index, 'editPreview', null);

    try {
      const uploadRes = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cell.url,
          type: 'image',
          title: `Turnaround Cell — ${cell.label}`,
          source: 'turnaround-edit-temp',
        }),
      });
      const uploadData = await uploadRes.json();
      const hostedUrl = uploadData.url;
      if (!hostedUrl) throw new Error('Failed to upload cell for editing');

      const editRes = await apiFetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [hostedUrl],
          prompt: cell.editPrompt,
          model: 'fal-flux',
          outputSize: '512x512',
        }),
      });
      const editData = await editRes.json();

      if (editData.imageUrl) {
        updateCellField(index, 'editPreview', editData.imageUrl);
        // Edit preview ready
      } else if (editData.requestId) {
        // Edit processing
        const pollEdit = async (rid) => {
          for (let attempt = 0; attempt < 40; attempt++) {
            await new Promise(r => setTimeout(r, 3000));
            try {
              const pr = await apiFetch('/api/jumpstart/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: rid }),
              });
              const pd = await pr.json();
              if (pd.imageUrl) {
                updateCellField(index, 'editPreview', pd.imageUrl);
                // Edit ready
                return;
              }
              if (pd.status === 'failed') throw new Error('Edit failed');
            } catch { /* retry */ }
          }
          throw new Error('Edit timed out');
        };
        await pollEdit(editData.requestId);
      } else {
        throw new Error('Unexpected edit response');
      }
    } catch (err) {
      console.error('[Turnaround] Edit cell error:', err);
      toast.error('Edit failed: ' + err.message);
    } finally {
      updateCellField(index, 'editLoading', false);
    }
  };

  const acceptEdit = (index) => {
    const cell = cellImages[index];
    if (!cell?.editPreview) return;
    setCellImages(prev => prev.map((c, i) =>
      i === index ? { ...c, url: c.editPreview, editPreview: null, editPrompt: '', editing: false } : c
    ));
    setEditingCellIndex(null);
    // Edit applied
  };

  const rejectEdit = (index) => {
    updateCellField(index, 'editPreview', null);
  };

  // ─── Auto-tag helper ─────────────────────────────────────────────────────

  const autoTagSheet = async (imageId, sheet) => {
    try {
      await apiFetch('/api/library/tags/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          tagNames: [
            sheet.character?.name,
            'turnaround',
            sheet.styleText,
            sheet.poseSetName,
          ].filter(Boolean),
        }),
      });
    } catch (err) {
      console.warn('[Turnaround] Auto-tag failed:', err.message);
      // Non-blocking — don't fail the save
    }
  };

  // ─── Save cells for LoRA ──────────────────────────────────────────────────

  const handleSaveCellsForLora = async () => {
    const keepCells = cellImages.filter(c => !c.deleted);
    if (keepCells.length === 0) { toast.error('No cells to save — all deleted.'); return; }

    setSavingForLora(true);
    let saved = 0;
    const folder = loraFolderName.trim();
    const titlePrefix = folder ? `[${folder}] Turnaround` : 'Turnaround';

    try {
      for (const cell of keepCells) {
        try {
          const res = await apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: cell.url,
              type: 'image',
              title: `${titlePrefix} — ${cell.label}`,
              prompt: characters[0]?.description,
              source: 'turnaround-lora',
            }),
          });
          const data = await res.json();
          if (data.saved || data.duplicate || data.url) {
            saved++;
            if (data.id && activeSheet) autoTagSheet(data.id, activeSheet);
          }
        } catch (err) {
          console.warn(`Failed to save ${cell.label}:`, err.message);
        }
      }
      // Cells saved for LoRA
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSavingForLora(false);
    }
  };

  // ─── Reassemble active cells into a composite turnaround sheet ────────────

  const handleReassembleAndSave = async () => {
    const keepCells = cellImages.filter(c => !c.deleted);
    if (keepCells.length === 0) { toast.error('No cells to reassemble.'); return; }

    setReassembling(true);
    const folder = loraFolderName.trim();
    const titlePrefix = folder ? `[${folder}] Turnaround` : 'Turnaround';

    try {
      const cols = Math.min(keepCells.length, GRID_COLS);
      const rows = Math.ceil(keepCells.length / cols);

      const loadImg = (src) => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load cell'));
        img.src = src;
      });

      const imgs = await Promise.all(keepCells.map(c => loadImg(c.url)));
      const cellW = imgs[0].width;
      const cellH = imgs[0].height;

      const canvas = document.createElement('canvas');
      canvas.width = cols * cellW;
      canvas.height = rows * cellH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      imgs.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH);
      });

      const compositeDataUrl = canvas.toDataURL('image/png');

      let savedCells = 0;
      for (const cell of keepCells) {
        try {
          const res = await apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: cell.url,
              type: 'image',
              title: `${titlePrefix} — ${cell.label}`,
              prompt: characters[0]?.description,
              source: 'turnaround-cell',
            }),
          });
          const data = await res.json();
          if (data.saved || data.duplicate || data.url) {
            savedCells++;
            if (data.id && activeSheet) autoTagSheet(data.id, activeSheet);
          }
        } catch {}
      }

      const compRes = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: compositeDataUrl,
          type: 'image',
          title: `${titlePrefix} — Reassembled Sheet (${keepCells.length} cells)`,
          prompt: characters[0]?.description || '',
          source: 'turnaround-sheet',
        }),
      });
      const compData = await compRes.json();
      const hostedUrl = compData.url || compositeDataUrl;
      if (compData.id && activeSheet) autoTagSheet(compData.id, activeSheet);

      setReassembledUrl(hostedUrl);
      // Mark this sheet as saved
      if (activeSheetId) setSavedSheetIds(prev => new Set([...prev, activeSheetId]));

      if (onImageCreated) {
        onImageCreated({ imageUrl: hostedUrl, type: 'turnaround-sheet', description: characters[0]?.description });
      }
    } catch (err) {
      console.error('[Turnaround] Reassemble error:', err);
      toast.error('Reassemble failed: ' + err.message);
    } finally {
      setReassembling(false);
    }
  };

  // Legacy: save from grid overlay
  const handleSaveSelectedForLora = async () => {
    const saveUrl = sheetImageUrl;
    if (selectedCells.size === 0 || !saveUrl) return;
    setSavingForLora(true);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new window.Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Failed to load'));
        i.src = saveUrl;
      });
      const cellW = img.width / GRID_COLS;
      const cellH = img.height / GRID_ROWS;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let saved = 0;
      for (const ci of selectedCells) {
        const col = ci % GRID_COLS;
        const row = Math.floor(ci / GRID_COLS);
        canvas.width = Math.round(cellW);
        canvas.height = Math.round(cellH);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, Math.round(col * cellW), Math.round(row * cellH), Math.round(cellW), Math.round(cellH), 0, 0, canvas.width, canvas.height);
        try {
          const res = await apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: canvas.toDataURL('image/png'), type: 'image', title: `Turnaround — ${getCellLabels(activeSheet?.poseSet)[ci]}`, prompt: characters[0]?.description, source: 'turnaround-lora' }),
          });
          const data = await res.json();
          if (data.saved || data.duplicate || data.url) {
            saved++;
            if (data.id && activeSheet) autoTagSheet(data.id, activeSheet);
          }
        } catch {}
      }
      // Cells saved
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSavingForLora(false);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  const handleDownload = (url) => {
    const dlUrl = url || sheetImageUrl;
    if (!dlUrl) return;
    const link = document.createElement('a');
    link.href = dlUrl;
    link.download = `turnaround-sheet-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleProp = (propValue) => {
    setSelectedProps(prev =>
      prev.includes(propValue) ? prev.filter(p => p !== propValue) : [...prev, propValue]
    );
  };

  const toggleCell = (i) => setSelectedCells(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const activeCells = cellImages.filter(c => !c.deleted);
  const deletedCount = cellImages.filter(c => c.deleted).length;

  // ─── Subtitle ─────────────────────────────────────────────────────────────

  const subtitleMap = {
    'character': 'Describe your character',
    'style-model': 'Choose art style & AI model',
    'props': 'Add props & accessories',
    'refinements': 'Fine-tune with negative prompts & brand style',
    'results': activeSheetId
      ? `Viewing: ${activeSheet?.styleText || 'sheet'}`
      : anyGenerating
        ? `Generating ${sheets.length} sheet${sheets.length > 1 ? 's' : ''}... (${completedSheets.length}/${sheets.length} done)`
        : `${completedSheets.length} sheet${completedSheets.length !== 1 ? 's' : ''} ready`,
    'cells': `${activeCells.length} cells — review, edit & save`,
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Character Turnaround"
      subtitle={subtitleMap[wizardStep] || ''}
      icon={<RotateCcw className="w-5 h-5" />}
    >
      <div className="flex flex-col h-full overflow-hidden">

        {/* Wizard Stepper */}
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={wizardStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        {/* ═══ STEP 1: CHARACTER ═══════════════════════════════════════════ */}
        {wizardStep === 'character' && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl mx-auto space-y-4">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => {
                  const charId = typeof showLibrary === 'string' ? showLibrary : characters[0]?.id;
                  handleFileUploadForChar(charId, e.target.files?.[0]);
                  e.target.value = '';
                }} className="hidden" />

                {characters.map((char, idx) => (
                  <div key={char.id} className="border border-zinc-700 rounded-lg p-4 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Character {idx + 1}</span>
                      {characters.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeCharacter(char.id)}
                          className="text-red-400 hover:text-red-300 h-7 px-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Character name (e.g., Kai)"
                      value={char.name}
                      onChange={e => updateCharacter(char.id, 'name', e.target.value)}
                      className="bg-white border-slate-300"
                    />
                    <textarea
                      rows={4}
                      placeholder="Describe this character's appearance in detail..."
                      value={char.description}
                      onChange={e => updateCharacter(char.id, 'description', e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
                    />
                    {/* Reference image section */}
                    <div className="flex items-center gap-2">
                      {char.referencePreview ? (
                        <div className="relative w-16 h-16 rounded overflow-hidden border border-slate-300">
                          <img src={char.referencePreview} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => { updateCharacter(char.id, 'referenceImageUrl', ''); updateCharacter(char.id, 'referencePreview', ''); }}
                            className="absolute top-0 right-0 bg-black/60 p-0.5 rounded-bl">
                            <X className="w-3 h-3 text-white" />
                          </button>
                          {uploadingRef && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
                              <Loader2 className="w-4 h-4 animate-spin text-[#2C666E]" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setShowLibrary(char.id);
                          }} className="text-xs gap-1">
                            <FolderOpen className="w-3.5 h-3.5" /> Library
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setShowLibrary(char.id);
                            fileInputRef.current?.click();
                          }} className="text-xs gap-1">
                            <Upload className="w-3.5 h-3.5" /> Upload
                          </Button>
                        </div>
                      )}
                      {char.referenceImageUrl && (
                        <Button variant="outline" size="sm" onClick={() => describeCharacter(char.id, char.referenceImageUrl)}
                          disabled={analyzingRef} className="text-xs gap-1">
                          {analyzingRef ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</> : <><Sparkles className="w-3 h-3" /> Analyze</>}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addCharacter} className="w-full mt-3 border-dashed border-slate-400 text-slate-600">
                  + Add Character
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <span className="text-sm text-slate-400">
                4 cols x 6 rows = 24 poses
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={goNext} disabled={!characters.every(c => c.name.trim() && c.description.trim()) || analyzingRef || uploadingRef}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-2">
                  Next: Style & Model <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 2: STYLE & MODEL ═══════════════════════════════════════ */}
        {wizardStep === 'style-model' && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-6">

                {/* Style Grid — full width */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Art Style <span className="text-red-500">*</span></Label>
                  <StyleGrid value={selectedStyles} onChange={setSelectedStyles} maxHeight="none" multiple columns="grid-cols-4" />
                </div>

                {/* Pose Sets */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Pose Sets</label>
                  <p className="text-xs text-slate-500">Choose one or more pose layouts for the turnaround grid</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {POSE_SETS.map(ps => {
                      const selected = selectedPoseSets.includes(ps.id);
                      return (
                        <button
                          key={ps.id}
                          onClick={() => {
                            setSelectedPoseSets(prev => {
                              if (prev.includes(ps.id)) {
                                if (prev.length <= 1) { return prev; }
                                return prev.filter(id => id !== ps.id);
                              }
                              return [...prev, ps.id];
                            });
                          }}
                          className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                            selected ? 'border-[#2C666E] bg-[#2C666E]/10' : 'border-slate-200 bg-white hover:border-slate-400'
                          }`}
                        >
                          <img src={ps.thumbnail} alt={ps.name} className="w-full h-20 object-cover rounded mb-2 bg-slate-100" />
                          <p className="text-sm font-medium text-slate-800">{ps.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ps.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Model Selector */}
                <div className="max-w-md">
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">AI Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {MODEL_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-sm">
                          {m.label}
                          {m.tag && <span className="ml-2 text-xs text-slate-400">({m.tag})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Warning if no ref + model needs it */}
                {characters.some(c => !c.referenceImageUrl) && MODEL_OPTIONS.find(m => m.value === selectedModel)?.needsRef && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-md">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      <strong>{MODEL_OPTIONS.find(m => m.value === selectedModel)?.label}</strong> requires a reference image. Go back to add one, or switch to a "No Ref" model.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <span className="text-sm text-slate-400">
                {selectedStyles.length > 0
                  ? `${selectedStyles.length} style${selectedStyles.length !== 1 ? 's' : ''} selected`
                  : 'Select at least one style'}
                {selectedStyles.length > 1 && ` = ${selectedStyles.length} sheets`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={goNext} disabled={selectedStyles.length === 0}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-2">
                  Next: Props <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 3: PROPS ═══════════════════════════════════════════════ */}
        {wizardStep === 'props' && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl mx-auto">
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">Props & Accessories (optional)</Label>
                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                  {PROP_CATEGORIES.map(cat => (
                    <div key={cat.label}>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 px-0.5">{cat.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.props.map(prop => (
                          <button key={prop.value} type="button"
                            onClick={() => toggleProp(prop.value)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                              selectedProps.includes(prop.value)
                                ? 'bg-[#2C666E] text-white border-[#2C666E]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]'
                            }`}>
                            {prop.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedProps.length > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-[#2C666E] font-medium">{selectedProps.length} selected</span>
                    <button onClick={() => setSelectedProps([])}
                      className="text-sm text-slate-400 hover:text-slate-600">Clear all</button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <span className="text-sm text-slate-400">
                4 cols x 6 rows = 24 poses
                {selectedProps.length > 0 && ` · ${selectedProps.length} prop${selectedProps.length !== 1 ? 's' : ''}`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={goNext}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-2">
                  Next: Refinements <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 4: REFINEMENTS ═════════════════════════════════════════ */}
        {wizardStep === 'refinements' && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl mx-auto space-y-6">

                {/* Negative Prompt Pills */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-3 block">Negative Prompt (optional)</Label>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                    {NEG_PROMPT_CATEGORIES.map(cat => (
                      <div key={cat.label}>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 px-0.5">{cat.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.prompts.map(np => (
                            <button key={np.value} type="button"
                              onClick={() => toggleNegPill(np.value)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                                selectedNegPills.includes(np.value)
                                  ? 'bg-red-500 text-white border-red-500'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-red-400 hover:text-red-500'
                              }`}>
                              {np.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedNegPills.length > 0 && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-red-500 font-medium">{selectedNegPills.length} selected</span>
                      <button onClick={() => setSelectedNegPills([])}
                        className="text-sm text-slate-400 hover:text-slate-600">Clear all</button>
                    </div>
                  )}
                </div>

                {/* Freetext negative prompt */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">Additional Negative Prompt</Label>
                  <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Additional things to avoid..."
                    rows={2} className="bg-white text-sm" />
                </div>

                {/* Brand Style Guide */}
                <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <span className="text-sm text-slate-400">
                4 cols x 6 rows = 24 poses
                {selectedStyles.length > 1 && ` · ${selectedStyles.length} styles = ${selectedStyles.length} sheets`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={handleGenerate} disabled={!canGenerate || analyzingRef || uploadingRef}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white disabled:opacity-60 gap-2">
                  <RotateCcw className="w-4 h-4" />
                  {selectedStyles.length > 1 ? `Generate ${selectedStyles.length} Sheets` : 'Generate Sheet'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 5: RESULTS — Gallery or Detail View ════════════════════ */}
        {wizardStep === 'results' && !activeSheetId && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Filter bar — only show when multiple dimensions exist */}
              {(characters.length > 1 || selectedStyles.length > 1 || selectedPoseSets.length > 1) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[...new Set(sheets.map(s => s.character?.name))].filter(Boolean).map(name => (
                    <button key={`c-${name}`} onClick={() => toggleFilter(filterCharacter, setFilterCharacter, name)}
                      className={`px-2.5 py-1 rounded-full text-xs ${filterCharacter.has(name) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
                      {name}
                    </button>
                  ))}
                  {selectedStyles.length > 1 && [...new Set(sheets.map(s => s.styleText))].map(styleText => (
                    <button key={`s-${styleText}`} onClick={() => toggleFilter(filterStyle, setFilterStyle, sheets.find(s => s.styleText === styleText)?.style)}
                      className={`px-2.5 py-1 rounded-full text-xs ${filterStyle.has(sheets.find(s => s.styleText === styleText)?.style) ? 'bg-purple-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
                      {styleText}
                    </button>
                  ))}
                  {selectedPoseSets.length > 1 && [...new Set(sheets.map(s => s.poseSetName))].filter(Boolean).map(psName => (
                    <button key={`p-${psName}`} onClick={() => toggleFilter(filterPoseSet, setFilterPoseSet, sheets.find(s => s.poseSetName === psName)?.poseSet)}
                      className={`px-2.5 py-1 rounded-full text-xs ${filterPoseSet.has(sheets.find(s => s.poseSetName === psName)?.poseSet) ? 'bg-orange-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
                      {psName}
                    </button>
                  ))}
                  {sheets.some(s => s.error) && (
                    <button onClick={retryAllFailed} className="px-2.5 py-1 rounded-full text-xs bg-red-600 text-white hover:bg-red-500">
                      Retry All Failed
                    </button>
                  )}
                </div>
              )}

              {/* Grouped sections by character */}
              {Object.entries(groupedByCharacter).map(([charName, charSheets]) => {
                const complete = charSheets.filter(s => s.imageUrl).length;
                const total = charSheets.length;
                return (
                  <div key={charName} className="mb-6">
                    {Object.keys(groupedByCharacter).length > 1 && (
                      <h3 className="text-sm font-medium text-zinc-300 mb-2">
                        {charName} ({complete}/{total} complete)
                      </h3>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {charSheets.map(sheet => (
                        <div key={sheet.id}
                          onClick={() => !sheet.generating && sheet.imageUrl && setActiveSheetId(sheet.id)}
                          className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                            activeSheetId === sheet.id ? 'border-teal-500 ring-1 ring-teal-500' : 'border-zinc-700 hover:border-zinc-500'
                          }`}>
                          {sheet.generating ? (
                            <div className="aspect-[2/3] flex items-center justify-center bg-zinc-800">
                              <Loader2 className="animate-spin w-6 h-6 text-teal-400" />
                            </div>
                          ) : sheet.error ? (
                            <div className="aspect-[2/3] flex flex-col items-center justify-center bg-zinc-800 p-2 text-center">
                              <p className="text-xs text-red-400 mb-2 line-clamp-3">{sheet.error}</p>
                              <button onClick={(e) => { e.stopPropagation(); retrySheet(sheet.id); }}
                                className="text-xs text-teal-400 hover:underline">Retry</button>
                            </div>
                          ) : (
                            <img src={sheet.imageUrl} alt="" className="w-full aspect-[2/3] object-cover" />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <p className="text-[10px] text-zinc-300 truncate">{sheet.styleText}</p>
                            {sheet.poseSetName && sheet.poseSetName !== 'Standard 24' && (
                              <p className="text-[10px] text-zinc-500 truncate">{sheet.poseSetName}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Fallback: show all sheets flat when no filter grouping applies (backwards compat for old sheets without character) */}
              {Object.keys(groupedByCharacter).length === 0 && sheets.length > 0 && (
                <div className={`grid ${sheets.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-2'} gap-4`}>
                  {sheets.map(sheet => (
                    <div key={sheet.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">{sheet.styleText}</span>
                        {sheet.generating && (
                          <span className="text-[10px] text-[#2C666E] font-medium flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                          </span>
                        )}
                        {sheet.imageUrl && (
                          <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {sheet.error && (
                          <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>
                      {sheet.generating && !sheet.imageUrl && (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                          <div className="relative mb-4">
                            <div className="w-16 h-16 rounded-full border-4 border-slate-200" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[#2C666E] animate-spin" />
                            <RotateCcw className="absolute inset-0 m-auto w-5 h-5 text-[#2C666E]" />
                          </div>
                          <p className="text-xs text-slate-400">30–90 seconds per sheet</p>
                          <span className="text-xs font-mono text-slate-500 mt-1">{formatTime(elapsedSeconds)}</span>
                        </div>
                      )}
                      {sheet.imageUrl && (
                        <div className="relative group cursor-pointer" onClick={() => setActiveSheetId(sheet.id)}>
                          <img src={sheet.imageUrl} alt={`Turnaround — ${sheet.styleText}`}
                            className="w-full h-auto block" crossOrigin="anonymous" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold bg-[#2C666E] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                              <Eye className="w-4 h-4" /> View & Edit
                            </span>
                          </div>
                        </div>
                      )}
                      {sheet.error && !sheet.generating && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                          <AlertCircle className="w-8 h-8 mb-2 text-red-300" />
                          <p className="text-xs text-red-500 text-center">{sheet.error}</p>
                        </div>
                      )}
                      {sheet.imageUrl && (
                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                          <button onClick={() => setActiveSheetId(sheet.id)}
                            className="text-[10px] font-medium text-[#2C666E] hover:text-[#07393C] flex items-center gap-1">
                            <Grid3X3 className="w-3 h-3" /> Grid & Slice
                          </button>
                          <button onClick={() => handleDownload(sheet.imageUrl)}
                            className="text-[10px] font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gallery Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={goBack}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {anyGenerating && (
                  <span className="text-xs text-[#2C666E] font-medium flex items-center gap-1 ml-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> {completedSheets.length}/{sheets.length} done · {formatTime(elapsedSeconds)}
                  </span>
                )}
                {!anyGenerating && completedSheets.length > 0 && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1 ml-2">
                    <CheckCircle2 className="w-3 h-3" /> {completedSheets.length} sheet{completedSheets.length !== 1 ? 's' : ''} ready
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGenerate} variant="outline" className="gap-1">
                  <RotateCcw className="w-4 h-4" /> Regenerate All
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 5b: DETAIL VIEW for a single sheet ═════════════════════ */}
        {wizardStep === 'results' && activeSheetId && activeSheet && (
          <>
            <div className="flex-1 overflow-y-auto">
              {activeSheet.imageUrl && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowGrid(prev => !prev)}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                          showGrid ? 'bg-[#2C666E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        <Grid3X3 className="w-3.5 h-3.5" /> {showGrid ? 'Grid On' : 'Grid Off'}
                      </button>
                      {showGrid && (
                        <>
                          <button onClick={() => setSelectedCells(new Set(Array.from({ length: TOTAL_CELLS }, (_, i) => i)))}
                            className="text-xs text-[#2C666E] hover:underline font-medium px-2 py-1">Select All</button>
                          <button onClick={() => setSelectedCells(new Set())}
                            className="text-xs text-slate-400 hover:underline font-medium px-2 py-1">Clear</button>
                          {selectedCells.size > 0 && (
                            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">{selectedCells.size} selected</span>
                          )}
                        </>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">{activeSheet.styleText}</span>
                  </div>

                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                    <img src={activeSheet.imageUrl} alt="Character turnaround sheet" className="w-full h-auto block" crossOrigin="anonymous" />
                    {showGrid && (
                      <div className="absolute inset-0 grid"
                        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}>
                        {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
                          <div key={i} onClick={() => toggleCell(i)}
                            className={`border cursor-pointer transition-all flex items-end justify-center pb-1 ${
                              selectedCells.has(i) ? 'border-[#2C666E] bg-[#2C666E]/20 border-2' : 'border-white/30 hover:bg-white/10'
                            }`}>
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                              selectedCells.has(i) ? 'bg-[#2C666E] text-white' : 'bg-black/50 text-white/80'
                            }`}>{getCellLabels(activeSheet?.poseSet)[i]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Detail Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveSheetId(null); setSelectedCells(new Set()); }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" /> {sheets.length > 1 ? 'All Sheets' : 'Back'}
                </button>
              </div>
              <div className="flex gap-2">
                {selectedCells.size > 0 && (
                  <Button onClick={handleSaveSelectedForLora} disabled={savingForLora} variant="outline" className="text-sm gap-1">
                    {savingForLora ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingForLora ? 'Saving...' : `Quick Save ${selectedCells.size}`}
                  </Button>
                )}
                <Button onClick={() => handleDownload(activeSheet.imageUrl)} variant="outline" className="text-sm gap-1">
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button onClick={handleSliceIntoCells} disabled={slicing}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-1">
                  {slicing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                  Slice & Edit Cells <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 6: CELL EDITOR ═════════════════════════════════════════ */}
        {wizardStep === 'cells' && (
          <>
            {/* Toolbar */}
            <div className="flex-shrink-0 px-5 py-3 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">
                  {activeCells.length} cells kept
                </span>
                {deletedCount > 0 && (
                  <>
                    <span className="text-xs text-red-400">{deletedCount} deleted</span>
                    <button onClick={restoreAllCells}
                      className="text-[10px] text-[#2C666E] hover:underline font-medium">Restore all</button>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Click edit to fix a cell, or X to delete it</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Expanded editor for a single cell */}
              {editingCellIndex !== null && cellImages[editingCellIndex] && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Editing: {cellImages[editingCellIndex].label}
                    </h4>
                    <button onClick={() => setEditingCellIndex(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <X className="w-3 h-3" /> Close
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <p className="text-[10px] text-slate-400 mb-1 font-medium">Current</p>
                      <img src={cellImages[editingCellIndex].url} alt={cellImages[editingCellIndex].label}
                        className="w-40 h-40 object-contain rounded-lg border border-slate-200 bg-white" />
                    </div>

                    {cellImages[editingCellIndex].editPreview && (
                      <div className="flex-shrink-0">
                        <p className="text-[10px] text-slate-400 mb-1 font-medium">Edited</p>
                        <img src={cellImages[editingCellIndex].editPreview} alt="Edit preview"
                          className="w-40 h-40 object-contain rounded-lg border-2 border-green-300 bg-white" />
                        <div className="flex gap-1 mt-1.5">
                          <button onClick={() => acceptEdit(editingCellIndex)}
                            className="flex items-center gap-0.5 text-[10px] font-medium text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded">
                            <Check className="w-3 h-3" /> Accept
                          </button>
                          <button onClick={() => rejectEdit(editingCellIndex)}
                            className="flex items-center gap-0.5 text-[10px] font-medium text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 mb-1 font-medium">Describe the edit</p>
                      <Textarea
                        value={cellImages[editingCellIndex].editPrompt}
                        onChange={(e) => updateCellField(editingCellIndex, 'editPrompt', e.target.value)}
                        placeholder="e.g. fix the hands, make the pose more dynamic, adjust the face..."
                        rows={3} className="bg-white text-sm mb-2"
                        disabled={cellImages[editingCellIndex].editLoading}
                      />
                      <Button onClick={() => handleEditCell(editingCellIndex)}
                        disabled={cellImages[editingCellIndex].editLoading || !cellImages[editingCellIndex].editPrompt.trim()}
                        size="sm" className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-1">
                        {cellImages[editingCellIndex].editLoading
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Editing...</>
                          : <><Pencil className="w-3 h-3" /> Apply Edit</>}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cell grid */}
              <div className="grid grid-cols-4 gap-2">
                {cellImages.map((cell, i) => (
                  <div key={i}
                    className={`relative group rounded-lg border overflow-hidden transition-all ${
                      cell.deleted
                        ? 'opacity-30 border-red-300 bg-red-50'
                        : editingCellIndex === i
                          ? 'border-[#2C666E] border-2 ring-2 ring-[#2C666E]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <img src={cell.url} alt={cell.label} className="w-full aspect-[3/4] object-cover" />

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <span className="text-[9px] font-bold text-white">{cell.label}</span>
                    </div>

                    {cell.deleted && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-100/50">
                        <span className="text-xs font-bold text-red-500">DELETED</span>
                      </div>
                    )}

                    {cell.editLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                      </div>
                    )}

                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {cell.deleted ? (
                        <button onClick={() => toggleDeleteCell(i)}
                          className="p-1 bg-green-500 text-white rounded shadow-sm hover:bg-green-600" title="Restore">
                          <RotateCw className="w-3 h-3" />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => { setEditingCellIndex(i); updateCellField(i, 'editing', true); }}
                            className="p-1 bg-[#2C666E] text-white rounded shadow-sm hover:bg-[#07393C]" title="Edit">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => toggleDeleteCell(i)}
                            className="p-1 bg-red-500 text-white rounded shadow-sm hover:bg-red-600" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reassembled Sheet Preview */}
            {reassembledUrl && (
              <div className="px-5 py-3 border-t border-b bg-green-50">
                <div className="flex items-start gap-3">
                  <img src={reassembledUrl} alt="Reassembled turnaround sheet"
                    className="w-32 h-auto rounded-lg border border-green-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-700 mb-1">Reassembled Turnaround Sheet</p>
                    <p className="text-[10px] text-green-600">{activeCells.length} cells stitched into a single reference image. Saved to library.</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button onClick={() => handleDownload(reassembledUrl)}
                        className="text-[10px] text-green-700 hover:underline flex items-center gap-0.5">
                        <Download className="w-3 h-3" /> Download
                      </button>
                      <button onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'jumpstart', imageUrl: reassembledUrl } }));
                      }} className="text-[10px] text-[#2C666E] hover:underline flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> Use in JumpStart
                      </button>
                      <button onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'storyboard', imageUrl: reassembledUrl } }));
                      }} className="text-[10px] text-[#2C666E] hover:underline flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> Use as Storyboard Element
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cells Footer */}
            <div className="px-5 py-3 border-t bg-slate-50 flex-shrink-0 space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">LoRA Folder:</Label>
                <Input
                  value={loraFolderName}
                  onChange={(e) => setLoraFolderName(e.target.value)}
                  placeholder="e.g., Hero Character, Red Sneaker"
                  className="h-7 text-xs bg-white border-gray-300 max-w-xs"
                />
                <span className="text-[10px] text-gray-400 whitespace-nowrap">Groups saved cells by folder name</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setWizardStep('results')}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sheet
                  </button>
                  <span className="text-xs text-slate-400 ml-2">
                    {activeCells.length} of {TOTAL_CELLS} cells will be saved
                  </span>
                </div>
                <div className="flex gap-2">
                  {reassembledUrl && unsavedSheets.length > 0 ? (
                    <>
                      <Button variant="outline" onClick={onClose}>Close</Button>
                      <Button onClick={handleEditNextSheet}
                        className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-1">
                        {nextUnsavedSheet
                          ? <><ChevronRight className="w-4 h-4" /> Edit Next Sheet ({unsavedSheets.length - (unsavedSheets.some(s => s.id === activeSheetId) ? 0 : 0)} remaining)</>
                          : <><CheckCircle2 className="w-4 h-4" /> All Done — Back to Gallery</>}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={onClose}>Close</Button>
                      <Button onClick={handleSaveCellsForLora} disabled={savingForLora || reassembling || activeCells.length === 0}
                        variant="outline" className="gap-1 text-[#2C666E] border-[#2C666E]">
                        {savingForLora
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                          : <><Save className="w-4 h-4" /> Save Cells Only</>}
                      </Button>
                      <Button onClick={handleReassembleAndSave} disabled={reassembling || savingForLora || activeCells.length === 0}
                        className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-1">
                        {reassembling
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Reassembling...</>
                          : <><Grid3X3 className="w-4 h-4" /> Reassemble & Save ({activeCells.length})</>}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SlideOverPanel>

    <LibraryModal
      isOpen={!!showLibrary}
      onClose={() => setShowLibrary(false)}
      onSelect={(item) => {
        const charId = typeof showLibrary === 'string' ? showLibrary : characters[0]?.id;
        if (charId) {
          updateCharacter(charId, 'referenceImageUrl', item.url);
          updateCharacter(charId, 'referencePreview', item.thumbnail_url || item.url);
          // If the library item has a description/prompt, offer to auto-fill
          if (item.prompt || item.alt_text) {
            const char = characters.find(c => c.id === charId);
            if (char && !char.description.trim()) {
              updateCharacter(charId, 'description', item.prompt || item.alt_text);
            }
          }
        }
        setShowLibrary(false);
        // Reference selected, analyzing
        if (charId) describeCharacter(charId, item.url);
      }}
      mediaType="images"
    />
    </>
  );
}
