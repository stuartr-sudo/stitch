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

const MODEL_OPTIONS = [
  { value: "nano-banana-2-edit", label: "Nano Banana 2 Edit", needsRef: true, tag: "Recommended" },
  { value: "nano-banana-pro", label: "Nano Banana Pro Edit", needsRef: true, tag: "Premium" },
  { value: "seedream", label: "Seedream v4.5 Edit", needsRef: true },
  { value: "seedream-generate", label: "Seedream v4 (No Ref)", needsRef: false, tag: "Generate" },
  { value: "nano-banana-2", label: "Nano Banana 2 (No Ref)", needsRef: false, tag: "Generate" },
  { value: "fal-flux", label: "Flux 2 (+ LoRA)", needsRef: false },
];

const PROP_OPTIONS = [
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'sword', label: 'Sword' },
  { value: 'shield', label: 'Shield' },
  { value: 'backpack', label: 'Backpack' },
  { value: 'staff', label: 'Staff' },
  { value: 'bow', label: 'Bow & Arrow' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'skateboard', label: 'Skateboard' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'camera', label: 'Camera' },
  { value: 'book', label: 'Book' },
  { value: 'wand', label: 'Wand' },
  { value: 'pet-dog', label: 'Pet Dog' },
  { value: 'pet-cat', label: 'Pet Cat' },
  { value: 'helmet', label: 'Helmet' },
  { value: 'cape', label: 'Cape' },
];

const PROMPT_PREFIX = `Full-body character turnaround reference sheet. 4 columns, 6 rows grid on a clean white background. Each cell shows the SAME character in a different pose or angle. Consistent proportions, outfit, colors, and features across every cell. No background elements, no props unless specified. Clean line separation between cells.

Character: `;

const PLACEHOLDER_DESC = `[describe your character here — e.g., a young woman with shoulder-length red hair, freckles, wearing a dark green hoodie, black jeans, and white sneakers, athletic build]`;

const DEFAULT_PROMPT = PROMPT_PREFIX + PLACEHOLDER_DESC;

const GRID_COLS = 4;
const GRID_ROWS = 6;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

const CELL_LABELS = [
  "Front", "3/4 Front", "Side", "Back",
  "3/4 Back", "Neutral", "Determined", "Joyful",
  "Walk A", "Walk B", "Walk Toward", "Walk Away",
  "Running", "Jumping", "Hero Land", "Fight Stance",
  "Sitting", "Reaching", "Carrying", "Leaning",
  "Face Detail", "Hand Detail", "Top-Down", "Low Angle",
];

export default function TurnaroundSheetModal({ isOpen, onClose, onImageCreated, initialImage = null }) {
  const { user } = useAuth();

  // Steps: 'configure' | 'results' | 'cells'
  const [step, setStep] = useState('configure');

  // Form
  const [characterDescription, setCharacterDescription] = useState(DEFAULT_PROMPT);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referencePreview, setReferencePreview] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState(["concept-art"]);
  const [selectedModel, setSelectedModel] = useState("nano-banana-2-edit");
  const [selectedProps, setSelectedProps] = useState([]);
  const [negativePrompt, setNegativePrompt] = useState("");

  // AI analysis
  const [analyzingRef, setAnalyzingRef] = useState(false);

  // Multi-sheet generation
  // sheets: [{ id, style, styleText, generating, requestId, pollModel, imageUrl, error, elapsed }]
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null); // which sheet is expanded in detail view
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Slice & select (Step 2 grid)
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCells, setSelectedCells] = useState(new Set());

  // Step 3: Cell editing
  const [cellImages, setCellImages] = useState([]); // array of { url, label, deleted, editing, editPrompt, editLoading, editPreview }
  const [editingCellIndex, setEditingCellIndex] = useState(null); // which cell is expanded for editing
  const [savingForLora, setSavingForLora] = useState(false);
  const [slicing, setSlicing] = useState(false);
  const [loraFolderName, setLoraFolderName] = useState('');

  const fileInputRef = useRef(null);
  const pollingIntervalsRef = useRef({}); // keyed by sheet id
  const timerRef = useRef(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const describeCharacter = async (hostedUrl) => {
    setAnalyzingRef(true);
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: hostedUrl }),
      });
      const data = await res.json();
      if (data.description) {
        setCharacterDescription(PROMPT_PREFIX + data.description);
        toast.success('Character analyzed! Description auto-filled.');
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

  const propsText = selectedProps.length > 0
    ? `\nProps/accessories: ${selectedProps.map(p => PROP_OPTIONS.find(o => o.value === p)?.label || p).join(', ')}. Show these props naturally with the character in relevant poses.`
    : '';

  const canGenerate = characterDescription.trim() && selectedStyles.length > 0 && !(
    !referenceImageUrl && MODEL_OPTIONS.find(m => m.value === selectedModel)?.needsRef
  );

  // ─── Reset ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setStep('configure');
      setCharacterDescription(DEFAULT_PROMPT);
      setSelectedStyles(["concept-art"]);
      setSelectedModel("nano-banana-2-edit");
      setSelectedProps([]);
      setNegativePrompt("");
      setSheets([]);
      setActiveSheetId(null);
      setShowGrid(true);
      setSelectedCells(new Set());
      setCellImages([]);
      setEditingCellIndex(null);
      setSavingForLora(false);
      setSlicing(false);
      setLoraFolderName('');
      setElapsedSeconds(0);
      // Clear all polling intervals
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
      pollingIntervalsRef.current = {};
      if (timerRef.current) clearInterval(timerRef.current);

      // Pre-load initial image if passed from another tool
      if (initialImage) {
        setReferenceImageUrl(initialImage);
        setReferencePreview(initialImage);
        setUploadingRef(false);
        setAnalyzingRef(false);
        // Auto-analyze the character
        describeCharacter(initialImage);
      } else {
        setReferenceImageUrl("");
        setReferencePreview("");
        setUploadingRef(false);
        setAnalyzingRef(false);
      }
    }
  }, [isOpen]);

  const anyGenerating = sheets.some(s => s.generating);

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

  // ─── Polling for queued sheets ───────────────────────────────────────────

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
          toast.success(`Sheet ready: ${getPromptText(sheets.find(s => s.id === sheetId)?.style) || 'style'}`);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      if (file) toast.error('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setReferencePreview(dataUrl);
      setUploadingRef(true);
      try {
        const res = await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: dataUrl, type: 'image', title: 'Turnaround Reference', source: 'turnaround-ref' }),
        });
        const data = await res.json();
        if (data.url) {
          setReferenceImageUrl(data.url);
          toast.success('Reference image uploaded — analyzing character...');
          describeCharacter(data.url);
        } else throw new Error(data.error || 'Upload failed');
      } catch (err) {
        toast.error('Upload failed: ' + err.message);
        setReferencePreview('');
      } finally {
        setUploadingRef(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearReferenceImage = () => {
    setReferenceImageUrl('');
    setReferencePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Generate (parallel per style) ──────────────────────────────────────

  const handleGenerate = async () => {
    if (!characterDescription.trim()) { toast.error("Please describe your character."); return; }
    if (selectedStyles.length === 0) { toast.error("Select at least one style."); return; }

    // Build the full prompt with props
    const fullDescription = characterDescription.trim() + propsText;

    // Create sheet entries for each selected style
    const newSheets = selectedStyles.map((style, i) => ({
      id: `${Date.now()}-${i}`,
      style,
      styleText: getPromptText(style),
      generating: true,
      requestId: null,
      pollModel: null,
      imageUrl: null,
      error: null,
    }));

    setSheets(newSheets);
    setActiveSheetId(null);
    setStep('results');
    setSelectedCells(new Set());
    setCellImages([]);
    setEditingCellIndex(null);

    // Fire all requests in parallel
    for (const sheet of newSheets) {
      (async () => {
        try {
          const response = await apiFetch('/api/imagineer/turnaround', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterDescription: fullDescription,
              referenceImageUrl: referenceImageUrl.trim() || undefined,
              style: sheet.styleText.trim(),
              model: selectedModel,
              negativePrompt: negativePrompt.trim() || undefined,
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
            toast.success(`Sheet ready: ${sheet.styleText}`);
          } else if (data.requestId) {
            setSheets(prev => prev.map(s => s.id === sheet.id
              ? { ...s, requestId: data.requestId, pollModel: data.model || selectedModel }
              : s
            ));
            startPolling(sheet.id, data.requestId, data.model || selectedModel);
          } else throw new Error('Unexpected response');
        } catch (error) {
          console.error(`[Turnaround] Error for style ${sheet.style}:`, error);
          setSheets(prev => prev.map(s => s.id === sheet.id
            ? { ...s, generating: false, error: error.message }
            : s
          ));
          toast.error(`${sheet.styleText}: ${error.message}`);
        }
      })();
    }
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
          label: CELL_LABELS[i],
          deleted: false,
          editing: false,
          editPrompt: '',
          editLoading: false,
          editPreview: null,
        });
      }

      setCellImages(cells);
      setEditingCellIndex(null);
      setStep('cells');
      toast.success('Sheet sliced into 24 cells — review, edit, or delete.');
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
      // First upload the cell image to get a hosted URL
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

      // Send to edit endpoint
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
        toast.success(`Edit preview ready for "${cell.label}"`);
      } else if (editData.requestId) {
        // Poll for result
        toast.info('Edit processing...');
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
                toast.success(`Edit ready for "${cell.label}"`);
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
    toast.success(`Applied edit to "${cell.label}"`);
  };

  const rejectEdit = (index) => {
    updateCellField(index, 'editPreview', null);
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
              prompt: characterDescription,
              source: 'turnaround-lora',
            }),
          });
          const data = await res.json();
          if (data.saved || data.duplicate || data.url) saved++;
        } catch (err) {
          console.warn(`Failed to save ${cell.label}:`, err.message);
        }
      }
      toast.success(`Saved ${saved}/${keepCells.length} cells to library for LoRA training!`);
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSavingForLora(false);
    }
  };

  // Legacy: save from grid overlay (Step 2)
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
            body: JSON.stringify({ url: canvas.toDataURL('image/png'), type: 'image', title: `Turnaround — ${CELL_LABELS[ci]}`, prompt: characterDescription, source: 'turnaround-lora' }),
          });
          const data = await res.json();
          if (data.saved || data.duplicate || data.url) saved++;
        } catch {}
      }
      toast.success(`Saved ${saved}/${selectedCells.size} cells!`);
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

  // Toggle prop selection
  const toggleProp = (propValue) => {
    setSelectedProps(prev =>
      prev.includes(propValue) ? prev.filter(p => p !== propValue) : [...prev, propValue]
    );
  };

  // ─── Toggle cell selection (Step 2) ───────────────────────────────────────

  const toggleCell = (i) => setSelectedCells(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const activeCells = cellImages.filter(c => !c.deleted);
  const deletedCount = cellImages.filter(c => c.deleted).length;

  // ─── Subtitle ─────────────────────────────────────────────────────────────

  const completedSheets = sheets.filter(s => s.imageUrl);
  const subtitle = step === 'configure'
    ? 'Configure your character sheet'
    : step === 'results' && !activeSheetId
      ? anyGenerating
        ? `Generating ${sheets.length} sheet${sheets.length > 1 ? 's' : ''}... (${completedSheets.length}/${sheets.length} done)`
        : `${completedSheets.length} sheet${completedSheets.length !== 1 ? 's' : ''} ready`
    : step === 'results' && activeSheetId
      ? `Viewing: ${activeSheet?.styleText || 'sheet'}`
      : `${activeCells.length} cells — review, edit & save`;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Character Turnaround"
      subtitle={subtitle}
      icon={<RotateCcw className="w-5 h-5" />}
    >
      <div className="flex flex-col h-full overflow-hidden">

        {/* ═══ STEP 1: CONFIGURE ═══════════════════════════════════════════ */}
        {step === 'configure' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Props Pills */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Props & Accessories (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PROP_OPTIONS.map(prop => (
                    <button key={prop.value} type="button"
                      onClick={() => setSelectedProps(prev =>
                        prev.includes(prop.value) ? prev.filter(p => p !== prop.value) : [...prev, prop.value]
                      )}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                        selectedProps.includes(prop.value)
                          ? 'bg-[#2C666E] text-white border-[#2C666E]'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-[#2C666E] hover:text-[#2C666E]'
                      }`}>
                      {prop.label}
                    </button>
                  ))}
                </div>
                {selectedProps.length > 0 && (
                  <button onClick={() => setSelectedProps([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600 mt-1">Clear all</button>
                )}
              </div>

              {/* Character Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-600">
                    Character Description <span className="text-red-500">*</span>
                  </Label>
                  {referenceImageUrl && (
                    <button onClick={() => describeCharacter(referenceImageUrl)} disabled={analyzingRef}
                      className="flex items-center gap-1 text-[10px] font-medium text-[#2C666E] hover:text-[#07393C] disabled:opacity-50">
                      {analyzingRef
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                        : <><Sparkles className="w-3 h-3" /> Re-analyze reference</>}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Textarea value={characterDescription} onChange={(e) => setCharacterDescription(e.target.value)}
                    placeholder="Describe your character..." rows={6}
                    className={`bg-white text-sm ${analyzingRef ? 'opacity-60' : ''}`} disabled={analyzingRef} />
                  {analyzingRef && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-md">
                      <div className="flex items-center gap-2 text-[#2C666E]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Analyzing character...</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {analyzingRef ? 'AI vision is describing your character...'
                    : referenceImageUrl ? 'Auto-filled from reference. Edit freely.'
                    : 'Replace the bracketed section with your character details.'}
                </p>
              </div>

              {/* Reference Image */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reference Image (optional)</Label>
                {(referencePreview || referenceImageUrl) ? (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="relative flex-shrink-0">
                      <img src={referencePreview || referenceImageUrl} alt="Reference"
                        className="w-24 h-24 object-cover rounded-lg border border-slate-200" onError={(e) => { e.target.src = ''; }} />
                      {uploadingRef && (
                        <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-[#2C666E]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 font-medium mb-1">
                        {uploadingRef ? 'Uploading...' : analyzingRef ? 'Analyzing...' : 'Reference loaded'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {analyzingRef ? 'AI is describing your character...' : 'Description auto-filled.'}
                      </p>
                      <button onClick={clearReferenceImage}
                        className="mt-1.5 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5">
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Upload</span>
                      </div>
                      <div onClick={() => setShowLibrary(true)}
                        className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors">
                        <FolderOpen className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Library</span>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] text-slate-400 font-medium">OR</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <Input value={referenceImageUrl}
                      onChange={(e) => { setReferenceImageUrl(e.target.value); setReferencePreview(e.target.value); }}
                      onBlur={(e) => { const url = e.target.value.trim(); if (url?.startsWith('http')) describeCharacter(url); }}
                      placeholder="https://... paste a reference image URL" className="bg-white text-sm" />
                  </div>
                )}
              </div>

              {/* Negative Prompt */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Negative Prompt (optional)</Label>
                <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="e.g., blurry, low quality, extra limbs, deformed hands, text, watermark..."
                  rows={2} className="bg-white text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">Things to avoid in the generated sheet.</p>
              </div>

              {/* Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {MODEL_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Style — multi-select */}
              <StyleGrid value={selectedStyles} onChange={setSelectedStyles} maxHeight="14rem" multiple />

              {!referenceImageUrl && MODEL_OPTIONS.find(m => m.value === selectedModel)?.needsRef && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>{MODEL_OPTIONS.find(m => m.value === selectedModel)?.label}</strong> requires a reference image.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <span className="text-xs text-slate-400">
                4 cols x 6 rows = 24 poses
                {selectedStyles.length > 1 && ` · ${selectedStyles.length} styles = ${selectedStyles.length} sheets`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
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

        {/* ═══ STEP 2: RESULTS — Gallery or Detail View ══════════════════ */}
        {step === 'results' && !activeSheetId && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Gallery grid of sheets */}
              <div className={`grid ${sheets.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-2'} gap-4`}>
                {sheets.map(sheet => (
                  <div key={sheet.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {/* Style label */}
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

                    {/* Image / Loading / Error */}
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

                    {/* Quick actions */}
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
            </div>

            {/* Gallery Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  setStep('configure');
                  Object.values(pollingIntervalsRef.current).forEach(clearInterval);
                  pollingIntervalsRef.current = {};
                }}
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

        {/* ═══ STEP 2b: DETAIL VIEW for a single sheet ═════════════════════ */}
        {step === 'results' && activeSheetId && activeSheet && (
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
                            }`}>{CELL_LABELS[i]}</span>
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

        {/* ═══ STEP 3: CELL EDITOR ═════════════════════════════════════════ */}
        {step === 'cells' && (
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
                    {/* Current image */}
                    <div className="flex-shrink-0">
                      <p className="text-[10px] text-slate-400 mb-1 font-medium">Current</p>
                      <img src={cellImages[editingCellIndex].url} alt={cellImages[editingCellIndex].label}
                        className="w-40 h-40 object-contain rounded-lg border border-slate-200 bg-white" />
                    </div>

                    {/* Edit preview */}
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

                    {/* Edit controls */}
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

                    {/* Label */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <span className="text-[9px] font-bold text-white">{cell.label}</span>
                    </div>

                    {/* Deleted overlay */}
                    {cell.deleted && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-100/50">
                        <span className="text-xs font-bold text-red-500">DELETED</span>
                      </div>
                    )}

                    {/* Loading overlay */}
                    {cell.editLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                      </div>
                    )}

                    {/* Hover actions */}
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
                  <button onClick={() => setStep('results')}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sheet
                  </button>
                  <span className="text-xs text-slate-400 ml-2">
                    {activeCells.length} of {TOTAL_CELLS} cells will be saved
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Close</Button>
                  <Button onClick={handleSaveCellsForLora} disabled={savingForLora || activeCells.length === 0}
                    className="bg-[#2C666E] hover:bg-[#07393C] text-white gap-1">
                    {savingForLora
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      : <><Save className="w-4 h-4" /> Save {activeCells.length} Cells for LoRA</>}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SlideOverPanel>

      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={(item) => {
          setReferenceImageUrl(item.url);
          setReferencePreview(item.url);
          setShowLibrary(false);
          toast.success('Reference image selected — analyzing character...');
          describeCharacter(item.url);
        }}
        mediaType="images"
      />
    </>
  );
}
