import React, { useState, useEffect, useRef, useCallback } from "react";
import { SlideOverPanel } from "@/components/ui/slide-over-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Loader2, Download, Image, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const STYLE_PRESETS = [
  { value: "concept-art", label: "Concept Art", description: "Professional animation reference style" },
  { value: "anime", label: "Anime", description: "Cel-shaded anime production sheet" },
  { value: "3d-render", label: "3D Render", description: "Studio-lit 3D model turnaround" },
  { value: "comic-book", label: "Comic Book", description: "Bold ink outlines, illustration style" },
  { value: "pixar", label: "Pixar 3D", description: "Smooth, appealing character design" },
  { value: "realistic", label: "Realistic", description: "Photorealistic studio reference" },
  { value: "ghibli", label: "Studio Ghibli", description: "Soft watercolor, hand-drawn warmth" },
  { value: "game-art", label: "Game Art", description: "AAA video game PBR reference" },
];

const MODEL_OPTIONS = [
  { value: "nano-banana-2", label: "Nano Banana 2", description: "Fast generation (no reference image)" },
  { value: "fal-flux", label: "Flux 2 (+ LoRA)", description: "Best with reference images & LoRA" },
];

const GRID_COLS = 4;
const GRID_ROWS = 6;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

const CELL_LABELS = [
  "Front", "3/4 Front", "Side", "Back",
  "3/4 Back", "Neutral Expression", "Determined", "Joyful",
  "Walk Cycle A", "Walk Cycle B", "Walk Toward", "Walk Away",
  "Running", "Jumping", "Hero Landing", "Fighting Stance",
  "Sitting", "Reaching Out", "Carrying", "Leaning",
  "Face Close-Up", "Hand Detail", "Top-Down", "Worm's Eye",
];

const ROW_LABELS = [
  "Core Angles",
  "Expressions",
  "Walk Cycle",
  "Action Poses",
  "Interaction",
  "Detail Views",
];

export default function TurnaroundSheetModal({ isOpen, onClose, onImageCreated }) {
  const { user } = useAuth();

  // Form state
  const [characterDescription, setCharacterDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("concept-art");
  const [selectedModel, setSelectedModel] = useState("nano-banana-2");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [cellStates, setCellStates] = useState([]); // { index, label, status, imageUrl, requestId, model, error }
  const [completedCount, setCompletedCount] = useState(0);
  const [sheetReady, setSheetReady] = useState(false);

  // Canvas ref for compositing
  const canvasRef = useRef(null);
  const pollingRef = useRef(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCharacterDescription("");
      setReferenceImageUrl("");
      setSelectedStyle("concept-art");
      setSelectedModel("nano-banana-2");
      setGenerating(false);
      setCellStates([]);
      setCompletedCount(0);
      setSheetReady(false);
      pollingRef.current = false;
    }
  }, [isOpen]);

  // Poll for pending results
  const pollCell = useCallback(async (cell) => {
    if (!cell.requestId || cell.status === 'completed' || cell.status === 'error') return cell;

    try {
      const res = await apiFetch('/api/imagineer/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: cell.requestId, model: cell.model }),
      });
      const result = await res.json();

      if (result.imageUrl) {
        return { ...cell, status: 'completed', imageUrl: result.imageUrl };
      }
      if (result.status === 'failed' || result.error) {
        return { ...cell, status: 'error', error: result.error || 'Failed' };
      }
    } catch (err) {
      console.warn(`[Turnaround] Poll error for cell ${cell.index}:`, err.message);
    }
    return cell;
  }, []);

  // Polling loop
  useEffect(() => {
    if (!generating || cellStates.length === 0) return;

    const pending = cellStates.filter(c => c.status === 'processing');
    if (pending.length === 0) {
      setGenerating(false);
      const completed = cellStates.filter(c => c.status === 'completed').length;
      setCompletedCount(completed);
      if (completed > 0) {
        toast.success(`Turnaround sheet complete! ${completed}/${TOTAL_CELLS} cells generated.`);
        setSheetReady(true);
      }
      return;
    }

    const interval = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        // Poll up to 6 pending cells per cycle
        const toPoll = cellStates.filter(c => c.status === 'processing').slice(0, 6);
        const updated = await Promise.all(toPoll.map(pollCell));

        setCellStates(prev => {
          const next = [...prev];
          for (const u of updated) {
            next[u.index] = u;
          }
          return next;
        });

        const nowCompleted = cellStates.filter(c => c.status === 'completed').length +
          updated.filter(c => c.status === 'completed').length;
        setCompletedCount(nowCompleted);
      } finally {
        pollingRef.current = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [generating, cellStates, pollCell]);

  const handleGenerate = async () => {
    if (!characterDescription.trim()) {
      toast.error("Please describe your character.");
      return;
    }

    setGenerating(true);
    setCellStates([]);
    setCompletedCount(0);
    setSheetReady(false);

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
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start turnaround generation');
      }

      if (!data.cellResults) {
        throw new Error('No cell results returned');
      }

      // Initialize cell states from server response
      const initialStates = data.cellResults.map((cell) => ({
        index: cell.index,
        label: cell.label,
        status: cell.imageUrl ? 'completed' : cell.error ? 'error' : 'processing',
        imageUrl: cell.imageUrl || null,
        requestId: cell.requestId || null,
        model: cell.model || selectedModel,
        error: cell.error || null,
      }));

      setCellStates(initialStates);

      const immediateCompleted = initialStates.filter(c => c.status === 'completed').length;
      setCompletedCount(immediateCompleted);

      if (immediateCompleted === TOTAL_CELLS) {
        setGenerating(false);
        setSheetReady(true);
        toast.success('All 24 cells generated instantly!');
      } else {
        toast.info(`Generating turnaround sheet... ${immediateCompleted}/${TOTAL_CELLS} ready, polling for the rest.`);
      }
    } catch (error) {
      console.error('[Turnaround] Generation error:', error);
      toast.error(error.message || 'Failed to generate turnaround sheet');
      setGenerating(false);
    }
  };

  // Composite all images into a single canvas and download
  const handleDownloadSheet = async () => {
    const completedCells = cellStates.filter(c => c.status === 'completed' && c.imageUrl);
    if (completedCells.length === 0) {
      toast.error('No completed cells to download.');
      return;
    }

    toast.info('Compositing turnaround sheet...');

    const cellSize = 512;
    const labelHeight = 28;
    const padding = 4;
    const totalWidth = GRID_COLS * (cellSize + padding) + padding;
    const totalHeight = GRID_ROWS * (cellSize + labelHeight + padding) + padding;

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Load and draw each cell
    const loadImage = (url) => new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = padding + col * (cellSize + padding);
      const y = padding + row * (cellSize + labelHeight + padding);

      // Cell background
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x, y, cellSize, cellSize);

      // Label background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y + cellSize, cellSize, labelHeight);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(CELL_LABELS[i], x + cellSize / 2, y + cellSize + labelHeight / 2);

      const cell = cellStates.find(c => c.index === i);
      if (cell?.imageUrl) {
        const img = await loadImage(cell.imageUrl);
        if (img) {
          // Draw image fitted into cell
          const scale = Math.min(cellSize / img.width, cellSize / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const drawX = x + (cellSize - drawW) / 2;
          const drawY = y + (cellSize - drawH) / 2;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }
      } else {
        // Empty cell placeholder
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('Pending...', x + cellSize / 2, y + cellSize / 2);
      }
    }

    // Download
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to generate sheet image.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `turnaround-sheet-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Turnaround sheet downloaded!');
    }, 'image/png');
  };

  const progressPercent = TOTAL_CELLS > 0 ? Math.round((completedCount / TOTAL_CELLS) * 100) : 0;

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Character Turnaround"
      subtitle="Generate a 4x6 character sheet with angles, poses & actions"
      icon={<RotateCcw className="w-5 h-5" />}
    >
      <div className="flex flex-col h-full">
        {/* Form Section */}
        <div className="flex-shrink-0 p-5 space-y-4 border-b bg-white">
          {/* Character Description */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">
              Character Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              placeholder="e.g., a young female warrior with short blue hair, leather armor, green eyes, athletic build, carrying a sword on her back..."
              rows={3}
              className="bg-white text-sm resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Be specific about clothing, hair, body type, accessories, and distinguishing features for consistency across all 24 views.
            </p>
          </div>

          {/* Reference Image */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">
              Reference Image URL (optional)
            </Label>
            <Input
              value={referenceImageUrl}
              onChange={(e) => setReferenceImageUrl(e.target.value)}
              placeholder="https://... paste a reference image URL"
              className="bg-white text-sm"
            />
            {referenceImageUrl && (
              <div className="mt-2 flex items-start gap-3">
                <img
                  src={referenceImageUrl}
                  alt="Reference"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  When using Flux 2, this reference guides character consistency via image-to-image editing.
                </p>
              </div>
            )}
          </div>

          {/* Model & Style Row */}
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

          {/* Reference image warning */}
          {referenceImageUrl && selectedModel === 'nano-banana-2' && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Nano Banana 2 doesn't support reference images. Switch to <strong>Flux 2</strong> for image-to-image generation.
              </p>
            </div>
          )}
        </div>

        {/* Grid Preview Section */}
        <div className="flex-1 overflow-y-auto p-5">
          {cellStates.length > 0 ? (
            <div>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span className="font-medium">{completedCount}/{TOTAL_CELLS} cells generated</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2C666E] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Grid */}
              {Array.from({ length: GRID_ROWS }).map((_, rowIdx) => (
                <div key={rowIdx} className="mb-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {ROW_LABELS[rowIdx]}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: GRID_COLS }).map((_, colIdx) => {
                      const cellIndex = rowIdx * GRID_COLS + colIdx;
                      const cell = cellStates.find(c => c.index === cellIndex);
                      return (
                        <div
                          key={cellIndex}
                          className="aspect-square bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative group"
                        >
                          {cell?.status === 'completed' && cell.imageUrl ? (
                            <img
                              src={cell.imageUrl}
                              alt={CELL_LABELS[cellIndex]}
                              className="w-full h-full object-cover"
                            />
                          ) : cell?.status === 'processing' ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <Loader2 className="w-5 h-5 animate-spin mb-1" />
                              <span className="text-[9px]">Generating...</span>
                            </div>
                          ) : cell?.status === 'error' ? (
                            <div className="flex flex-col items-center justify-center h-full text-red-400">
                              <AlertCircle className="w-5 h-5 mb-1" />
                              <span className="text-[9px]">Failed</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                              <Clock className="w-5 h-5 mb-1" />
                              <span className="text-[9px]">Waiting...</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-medium">
                            {CELL_LABELS[cellIndex]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state — show grid layout preview */
            <div>
              <p className="text-xs text-slate-500 mb-3 font-medium">Sheet Layout Preview (4x6 = 24 views)</p>
              {Array.from({ length: GRID_ROWS }).map((_, rowIdx) => (
                <div key={rowIdx} className="mb-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {ROW_LABELS[rowIdx]}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: GRID_COLS }).map((_, colIdx) => {
                      const cellIndex = rowIdx * GRID_COLS + colIdx;
                      return (
                        <div
                          key={cellIndex}
                          className="aspect-square bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center"
                        >
                          <span className="text-[9px] text-slate-400 text-center px-1 leading-tight">
                            {CELL_LABELS[cellIndex]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-5 py-3 border-t bg-slate-50 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {generating ? (
              <span className="text-[#2C666E] font-medium flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating {completedCount}/{TOTAL_CELLS}...
              </span>
            ) : sheetReady ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Sheet ready — {completedCount} cells
              </span>
            ) : (
              <span>Describe your character and generate 24 views</span>
            )}
          </div>
          <div className="flex gap-2">
            {sheetReady && (
              <Button
                onClick={handleDownloadSheet}
                variant="outline"
                className="text-sm gap-1"
              >
                <Download className="w-4 h-4" />
                Download Sheet
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={generating}>
              {sheetReady ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !characterDescription.trim()}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Generate 24 Views
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SlideOverPanel>
  );
}
