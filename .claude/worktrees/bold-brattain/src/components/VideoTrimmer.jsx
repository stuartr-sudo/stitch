import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Scissors } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function VideoTrimmer({ videoUrl, onTrimmed, onClear }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [trimmedUrl, setTrimmedUrl] = useState(null);

  useEffect(() => {
    setStartTime(0);
    setEndTime(0);
    setTrimmedUrl(null);
  }, [videoUrl]);

  const handleLoadedMetadata = () => {
    const dur = videoRef.current?.duration || 0;
    setDuration(dur);
    setEndTime(dur);
  };

  const handleStartChange = (e) => {
    const val = parseFloat(e.target.value);
    setStartTime(Math.min(val, endTime - 0.5));
    if (videoRef.current) videoRef.current.currentTime = val;
    setTrimmedUrl(null);
  };

  const handleEndChange = (e) => {
    const val = parseFloat(e.target.value);
    setEndTime(Math.max(val, startTime + 0.5));
    if (videoRef.current) videoRef.current.currentTime = val;
    setTrimmedUrl(null);
  };

  const handleTrim = async () => {
    const segmentDuration = endTime - startTime;
    if (segmentDuration > 60) {
      toast.error('Maximum trim duration is 60 seconds');
      return;
    }

    setTrimming(true);
    try {
      const data = await apiFetch('/api/video/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl, start_time: startTime, end_time: endTime }),
      });

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setTrimmedUrl(data.trimmed_url);
      onTrimmed?.({ trimmedUrl: data.trimmed_url, startTime, endTime, duration: data.duration });
    } catch (err) {
      toast.error('Failed to trim video');
    } finally {
      setTrimming(false);
    }
  };

  const segmentDuration = (endTime - startTime).toFixed(1);
  const isFullVideo = startTime === 0 && Math.abs(endTime - duration) < 0.5;

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        src={videoUrl}
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full rounded-lg bg-black aspect-video"
        controls
        preload="metadata"
      />

      {duration > 0 && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Start: {startTime.toFixed(1)}s</span>
              <span>Selected: {segmentDuration}s</span>
              <span>End: {endTime.toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={duration} step={0.1}
                value={startTime} onChange={handleStartChange}
                className="flex-1 accent-blue-500"
              />
              <input
                type="range" min={0} max={duration} step={0.1}
                value={endTime} onChange={handleEndChange}
                className="flex-1 accent-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              onClick={handleTrim}
              disabled={trimming || isFullVideo}
            >
              {trimming ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Scissors className="w-3 h-3 mr-1" />}
              {trimming ? 'Trimming...' : trimmedUrl ? 'Re-trim' : 'Trim Clip'}
            </Button>
            {trimmedUrl && <span className="text-xs text-green-600">Trimmed to {segmentDuration}s</span>}
            {isFullVideo && <span className="text-xs text-gray-400">Full video selected — no trim needed</span>}
          </div>
        </>
      )}
    </div>
  );
}
