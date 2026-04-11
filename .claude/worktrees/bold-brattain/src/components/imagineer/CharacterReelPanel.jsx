import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Film, Play, Music, RotateCcw, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const VIDEO_MODELS = [
  { value: "fal_kling", label: "Kling 2.0 Master" },
  { value: "fal_veo3", label: "Veo 3.1" },
  { value: "fal_wan", label: "Wan 2.5" },
];

const DURATION_OPTIONS = [
  { value: 3, label: "3 seconds" },
  { value: 4, label: "4 seconds" },
  { value: 5, label: "5 seconds" },
  { value: 6, label: "6 seconds" },
];

export default function CharacterReelPanel({ poseImages = [], onReelGenerated, onClose }) {
  const [videoModel, setVideoModel] = useState("fal_kling");
  const [duration, setDuration] = useState(4);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicMood, setMusicMood] = useState("cinematic showcase");
  const [loop, setLoop] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);

  const transitionCount = loop && poseImages.length >= 3
    ? poseImages.length
    : Math.max(0, poseImages.length - 1);

  const estimatedMinutes = Math.ceil((transitionCount * duration * 15) / 60); // ~15s processing per second of video

  const handleGenerate = useCallback(async () => {
    if (poseImages.length < 3) {
      toast.error("Need at least 3 pose images to create a reel.");
      return;
    }

    setGenerating(true);
    setResult(null);
    setProgress(`Starting reel generation (${transitionCount} transitions)...`);

    try {
      const res = await apiFetch("/api/imagineer/character-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pose_images: poseImages,
          video_model: videoModel,
          duration_per_transition: duration,
          music_mood: musicEnabled ? musicMood : undefined,
          loop,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reel generation failed");
      }

      setResult(data);
      setProgress("");
      onReelGenerated?.(data);
    } catch (err) {
      toast.error(err.message || "Failed to generate character reel");
      setProgress("");
    } finally {
      setGenerating(false);
    }
  }, [poseImages, videoModel, duration, musicEnabled, musicMood, loop, transitionCount, onReelGenerated]);

  const handleDownload = useCallback(() => {
    if (!result?.reel_url) return;
    const a = document.createElement("a");
    a.href = result.reel_url;
    a.download = `character-reel-${Date.now()}.mp4`;
    a.click();
  }, [result]);

  if (poseImages.length < 3) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select at least 3 pose images to create a character reel.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Character Reel</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Image Preview Row */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {poseImages.map((url, i) => (
            <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              <img src={url} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
              <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold rounded px-1">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      {!result && (
        <div className="space-y-3">
          {/* Video Model */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">
              Video Model
            </Label>
            <Select value={videoModel} onValueChange={setVideoModel} disabled={generating}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">
              Duration/clip
            </Label>
            <Select value={String(duration)} onValueChange={v => setDuration(Number(v))} disabled={generating}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={String(d.value)} className="text-xs">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loop Toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">
              Seamless loop
            </Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={loop}
                onChange={e => setLoop(e.target.checked)}
                disabled={generating}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Animate last pose back to first</span>
            </label>
          </div>

          {/* Music Toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">
              Background music
            </Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={musicEnabled}
                onChange={e => setMusicEnabled(e.target.checked)}
                disabled={generating}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <Music className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Add music</span>
            </label>
          </div>

          {musicEnabled && (
            <div className="flex items-center gap-3 pl-[108px]">
              <Input
                value={musicMood}
                onChange={e => setMusicMood(e.target.value)}
                placeholder="e.g., fashion upbeat, cinematic epic"
                disabled={generating}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="pt-1">
            <Button
              onClick={handleGenerate}
              disabled={generating || poseImages.length < 3}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  Create Character Reel
                </>
              )}
            </Button>
            {!generating && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
                {transitionCount} transition{transitionCount !== 1 ? "s" : ""} x {duration}s = {transitionCount * duration}s reel
                {" "} (~{estimatedMinutes} min{estimatedMinutes !== 1 ? "s" : ""} to generate)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {generating && progress && (
        <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600 flex-shrink-0" />
          <p className="text-xs text-teal-700 dark:text-teal-300">{progress}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-black">
            <video
              src={result.reel_url}
              controls
              autoPlay
              loop
              className="w-full max-h-[400px] object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Reel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResult(null); setProgress(""); }}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Generate Again
            </Button>
            <span className="text-[10px] text-gray-400 ml-auto">
              {result.clips?.length} clips, {result.total_duration}s total
              {result.music_url ? " + music" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
