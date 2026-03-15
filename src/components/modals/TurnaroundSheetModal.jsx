import React, { useState, useEffect, useRef } from "react";
import { SlideOverPanel } from "@/components/ui/slide-over-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Loader2, Download, Upload, CheckCircle2, AlertCircle, Save, X, Grid3X3, Scissors, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const STYLE_PRESETS = [
  { value: "concept-art", label: "Concept Art" },
  { value: "anime", label: "Anime" },
  { value: "3d-render", label: "3D Render" },
  { value: "comic-book", label: "Comic Book" },
  { value: "pixar", label: "Pixar 3D" },
  { value: "realistic", label: "Realistic" },
  { value: "ghibli", label: "Studio Ghibli" },
  { value: "game-art", label: "Game Art" },
];

const MODEL_OPTIONS = [
  { value: "nano-banana-2", label: "Nano Banana 2", needsRef: false },
  { value: "nano-banana-pro", label: "Nano Banana Pro (Edit)", needsRef: true },
  { value: "seedream", label: "Seedream v4.5 (Edit)", needsRef: true },
  { value: "fal-flux", label: "Flux 2 (+ LoRA)", needsRef: false },
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

export default function TurnaroundSheetModal({ isOpen, onClose, onImageCreated }) {
  const { user } = useAuth();

  // Form
  const [characterDescription, setCharacterDescription] = useState(DEFAULT_PROMPT);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referencePreview, setReferencePreview] = useState("");
  const [uploadingRef, setUploadingRef] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("concept-art");
  const [selectedModel, setSelectedModel] = useState("nano-banana-2");

  // AI analysis
  const [analyzingRef, setAnalyzingRef] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [sheetImageUrl, setSheetImageUrl] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [pollModel, setPollModel] = useState(null);

  // Slice & select
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [savingForLora, setSavingForLora] = useState(false);

  const fileInputRef = useRef(null);
  const pollingRef = useRef(false);

  // Auto-describe a reference image using AI vision
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
        // Replace only the character description portion, keep the structural prefix
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

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCharacterDescription(DEFAULT_PROMPT);
      setReferenceImageUrl("");
      setReferencePreview("");
      setUploadingRef(false);
      setAnalyzingRef(false);
      setSelectedStyle("concept-art");
      setSelectedModel("nano-banana-2");
      setGenerating(false);
      setSheetImageUrl(null);
      setRequestId(null);
      setPollModel(null);
      setShowGrid(true);
      setSelectedCells(new Set());
      setSavingForLora(false);
      pollingRef.current = false;
    }
  }, [isOpen]);

  // Poll for result
  useEffect(() => {
    if (!requestId || sheetImageUrl) return;

    const interval = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        const res = await apiFetch('/api/imagineer/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, model: pollModel }),
        });
        const data = await res.json();

        if (data.imageUrl) {
          setSheetImageUrl(data.imageUrl);
          setGenerating(false);
          setRequestId(null);
          toast.success('Turnaround sheet generated!');
        } else if (data.status === 'failed' || data.error) {
          setGenerating(false);
          setRequestId(null);
          toast.error(data.error || 'Generation failed');
        }
      } catch (err) {
        console.warn('[Turnaround] Poll error:', err.message);
      } finally {
        pollingRef.current = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId, sheetImageUrl, pollModel]);

  // File upload
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
          body: JSON.stringify({
            url: dataUrl,
            type: 'image',
            title: 'Turnaround Reference',
            source: 'turnaround-ref',
          }),
        });
        const data = await res.json();
        if (data.url) {
          setReferenceImageUrl(data.url);
          toast.success('Reference image uploaded — analyzing character...');
          describeCharacter(data.url);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
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

  // Generate the single turnaround sheet image
  const handleGenerate = async () => {
    if (!characterDescription.trim()) {
      toast.error("Please describe your character.");
      return;
    }

    setGenerating(true);
    setSheetImageUrl(null);
    setRequestId(null);
    setSelectedCells(new Set());

    try {
      const response = await apiFetch('/api/imagineer/turnaround', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterDescription: characterDescription.trim(),
          referenceImageUrl: referenceImageUrl.trim() || undefined,
          style: selectedStyle,
          model: selectedModel,
        }),
      });

      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch {
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 200)}`);
      }

      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.imageUrl) {
        setSheetImageUrl(data.imageUrl);
        setGenerating(false);
        toast.success('Turnaround sheet generated!');
      } else if (data.requestId) {
        setRequestId(data.requestId);
        setPollModel(data.model || selectedModel);
        toast.info('Generating turnaround sheet, please wait...');
      } else {
        throw new Error('Unexpected response');
      }
    } catch (error) {
      console.error('[Turnaround] Error:', error);
      toast.error(error.message);
      setGenerating(false);
    }
  };

  // Toggle cell selection
  const toggleCell = (index) => {
    setSelectedCells(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCells(new Set(Array.from({ length: TOTAL_CELLS }, (_, i) => i)));
  };

  const selectNone = () => setSelectedCells(new Set());

  // Slice selected cells from the sheet image and save for LoRA
  const handleSaveForLora = async () => {
    if (selectedCells.size === 0) {
      toast.error('Select at least one cell to save.');
      return;
    }
    if (!sheetImageUrl) return;

    setSavingForLora(true);

    try {
      // Load the sheet image
      const img = await new Promise((resolve, reject) => {
        const i = new window.Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Failed to load sheet image'));
        i.src = sheetImageUrl;
      });

      const cellW = img.width / GRID_COLS;
      const cellH = img.height / GRID_ROWS;

      let saved = 0;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      for (const cellIndex of selectedCells) {
        const col = cellIndex % GRID_COLS;
        const row = Math.floor(cellIndex / GRID_COLS);

        // Slice this cell
        canvas.width = Math.round(cellW);
        canvas.height = Math.round(cellH);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          Math.round(col * cellW), Math.round(row * cellH),
          Math.round(cellW), Math.round(cellH),
          0, 0,
          canvas.width, canvas.height
        );

        // Convert to data URL and upload
        const dataUrl = canvas.toDataURL('image/png');

        try {
          const res = await apiFetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: dataUrl,
              type: 'image',
              title: `Turnaround — ${CELL_LABELS[cellIndex]}`,
              prompt: characterDescription,
              source: 'turnaround-lora',
            }),
          });
          const data = await res.json();
          if (data.saved || data.duplicate || data.url) saved++;
        } catch (err) {
          console.warn(`Failed to save cell ${CELL_LABELS[cellIndex]}:`, err.message);
        }
      }

      toast.success(`Saved ${saved}/${selectedCells.size} cells to library for LoRA training!`);
    } catch (err) {
      toast.error('Failed to slice and save: ' + err.message);
    } finally {
      setSavingForLora(false);
    }
  };

  // Download full sheet
  const handleDownload = () => {
    if (!sheetImageUrl) return;
    const link = document.createElement('a');
    link.href = sheetImageUrl;
    link.download = `turnaround-sheet-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  };

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Character Turnaround"
      subtitle="Generate a single image with 24 character poses"
      icon={<RotateCcw className="w-5 h-5" />}
    >
      <div className="flex flex-col h-full">
        {/* Form */}
        <div className="flex-shrink-0 p-5 space-y-4 border-b bg-white">
          {/* Character Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-semibold text-slate-600">
                Character Description <span className="text-red-500">*</span>
              </Label>
              {referenceImageUrl && (
                <button
                  onClick={() => describeCharacter(referenceImageUrl)}
                  disabled={analyzingRef}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#2C666E] hover:text-[#07393C] disabled:opacity-50"
                >
                  {analyzingRef ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Re-analyze reference</>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <Textarea
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                placeholder="Describe your character..."
                rows={6}
                className={`bg-white text-sm ${analyzingRef ? 'opacity-60' : ''}`}
                disabled={analyzingRef}
              />
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
              {analyzingRef
                ? 'AI vision is describing your character from the reference image...'
                : referenceImageUrl
                  ? 'Auto-filled from your reference image. Edit freely to refine.'
                  : 'Edit the default prompt above — replace the bracketed section with your character details.'}
            </p>
          </div>

          {/* Reference Image — Upload or URL */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Reference Image (optional)
            </Label>

            {(referencePreview || referenceImageUrl) ? (
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="relative flex-shrink-0">
                  <img
                    src={referencePreview || referenceImageUrl}
                    alt="Reference"
                    className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                    onError={(e) => { e.target.src = ''; }}
                  />
                  {uploadingRef && (
                    <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-[#2C666E]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 font-medium mb-1">
                    {uploadingRef ? 'Uploading...' : analyzingRef ? 'Analyzing character...' : 'Reference image loaded'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {analyzingRef
                      ? 'AI is describing your character — the prompt will auto-fill.'
                      : 'Character description auto-filled from reference image.'}
                  </p>
                  <button
                    onClick={clearReferenceImage}
                    className="mt-1.5 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">Click to upload a reference image</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] text-slate-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <Input
                  value={referenceImageUrl}
                  onChange={(e) => {
                    setReferenceImageUrl(e.target.value);
                    setReferencePreview(e.target.value);
                  }}
                  onBlur={(e) => {
                    const url = e.target.value.trim();
                    if (url && url.startsWith('http')) {
                      describeCharacter(url);
                    }
                  }}
                  placeholder="https://... paste a reference image URL"
                  className="bg-white text-sm"
                />
              </div>
            )}
          </div>

          {/* Model & Style */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-sm">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Style</Label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  {STYLE_PRESETS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model requires a reference but none provided */}
          {!referenceImageUrl && MODEL_OPTIONS.find(m => m.value === selectedModel)?.needsRef && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>{MODEL_OPTIONS.find(m => m.value === selectedModel)?.label}</strong> requires a reference image. Upload one above or switch to Nano Banana 2.
              </p>
            </div>
          )}
        </div>

        {/* Result Section */}
        <div className="flex-1 overflow-y-auto p-5">
          {generating && !sheetImageUrl && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <p className="text-sm font-medium">Generating turnaround sheet...</p>
              <p className="text-xs text-slate-400 mt-1">This generates one image with all 24 poses</p>
            </div>
          )}

          {sheetImageUrl && (
            <div>
              {/* Grid toggle & selection controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGrid(prev => !prev)}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                      showGrid ? 'bg-[#2C666E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    {showGrid ? 'Grid On' : 'Grid Off'}
                  </button>
                  {showGrid && (
                    <>
                      <button onClick={selectAll} className="text-[10px] text-[#2C666E] hover:underline font-medium">
                        Select All
                      </button>
                      <button onClick={selectNone} className="text-[10px] text-slate-400 hover:underline font-medium">
                        Clear
                      </button>
                      {selectedCells.size > 0 && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {selectedCells.size} selected
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Click cells to select for LoRA training</p>
              </div>

              {/* Sheet image with grid overlay */}
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={sheetImageUrl}
                  alt="Character turnaround sheet"
                  className="w-full h-auto block"
                  crossOrigin="anonymous"
                />

                {/* Grid overlay */}
                {showGrid && (
                  <div
                    className="absolute inset-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                      gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
                      <div
                        key={i}
                        onClick={() => toggleCell(i)}
                        className={`border cursor-pointer transition-all flex items-end justify-center pb-1 ${
                          selectedCells.has(i)
                            ? 'border-[#2C666E] bg-[#2C666E]/20 border-2'
                            : 'border-white/30 hover:bg-white/10'
                        }`}
                      >
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                          selectedCells.has(i)
                            ? 'bg-[#2C666E] text-white'
                            : 'bg-black/50 text-white/80'
                        }`}>
                          {CELL_LABELS[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!generating && !sheetImageUrl && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <RotateCcw className="w-12 h-12 mb-3" />
              <p className="text-sm text-slate-400">Describe your character and hit Generate</p>
              <p className="text-xs text-slate-300 mt-1">One image, 24 poses — consistent character design</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {generating ? (
              <span className="text-[#2C666E] font-medium flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
              </span>
            ) : sheetImageUrl ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sheet ready
              </span>
            ) : (
              <span>4 cols x 6 rows = 24 poses in one image</span>
            )}
          </div>
          <div className="flex gap-2">
            {sheetImageUrl && selectedCells.size > 0 && (
              <Button
                onClick={handleSaveForLora}
                disabled={savingForLora}
                variant="outline"
                className="text-sm gap-1"
              >
                {savingForLora ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                {savingForLora ? 'Slicing...' : `Save ${selectedCells.size} for LoRA`}
              </Button>
            )}
            {sheetImageUrl && (
              <Button onClick={handleDownload} variant="outline" className="text-sm gap-1">
                <Download className="w-4 h-4" /> Download
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={generating}>
              {sheetImageUrl ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !characterDescription.trim() || (!referenceImageUrl && MODEL_OPTIONS.find(m => m.value === selectedModel)?.needsRef)}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white disabled:opacity-60"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : sheetImageUrl ? (
                <><RotateCcw className="w-4 h-4 mr-2" /> Regenerate</>
              ) : (
                <><RotateCcw className="w-4 h-4 mr-2" /> Generate Sheet</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SlideOverPanel>
  );
}
