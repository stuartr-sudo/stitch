import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const MotionTransferModal = ({ isOpen, onClose, onMotionGenerated }) => {
  const [characterImage, setCharacterImage] = useState('');
  const [motionVideo, setMotionVideo] = useState('');
  const [characterOrientation, setCharacterOrientation] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateMotion = async () => {
    if (!characterImage || !motionVideo) {
      toast.error('Please upload both a character image and a motion video.');
      return;
    }

    setIsLoading(true);
    try {
      toast.info('Generating motion transfer...');

      const response = await apiFetch('/api/motion-transfer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: characterImage,
          video: motionVideo,
          character_orientation: characterOrientation,
          prompt,
          negative_prompt: negativePrompt,
          keep_original_sound: keepOriginalSound,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate motion transfer');
      }

      if (result.predictionId) {
        toast.info('Motion transfer is being processed, please wait...');
        const motionVideoUrl = await pollForMotionResult(result.predictionId);
        if (motionVideoUrl) {
          onMotionGenerated({
            url: motionVideoUrl,
            title: 'Motion Transfer',
            type: 'video',
            // Assuming a default duration, can be adjusted or fetched from result if available
            durationInFrames: 300,
          });
          onClose();
          toast.success('Motion transfer generated successfully!');
        } else {
          toast.error('Motion transfer timed out or failed. Please try again.');
        }
      } else {
        throw new Error('No prediction ID received.');
      }
    } catch (error) {
      console.error('Motion transfer error:', error);
      toast.error(error.message || 'Failed to generate motion transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const pollForMotionResult = async (predictionId, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await apiFetch(`/api/motion-transfer/result?predictionId=${predictionId}`);
        const result = await res.json();
        if (result.status === 'completed' && result.outputUrl) return result.outputUrl;
        if (result.status === 'failed' || result.error) {
          toast.error(result.error || 'Motion transfer failed');
          return null;
        }
      } catch (err) {
        console.warn('Poll attempt failed:', err);
      }
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Motion Transfer</DialogTitle>
          <DialogDescription>Transfer motion from a video to a still image using Kling 2.6 Standard Motion Control.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="character-image">Character Image (URL)</Label>
            <Input
              id="character-image"
              placeholder="URL of character image (JPG, PNG)"
              value={characterImage}
              onChange={(e) => setCharacterImage(e.target.value)}
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="motion-video">Motion Video (URL)</Label>
            <Input
              id="motion-video"
              placeholder="URL of motion video (MP4, MOV)"
              value={motionVideo}
              onChange={(e) => setMotionVideo(e.target.value)}
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="character-orientation">Character Orientation</Label>
            <Select value={characterOrientation} onValueChange={setCharacterOrientation}>
              <SelectTrigger id="character-orientation">
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Match Image</SelectItem>
                <SelectItem value="video">Match Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="prompt">Prompt (Optional)</Label>
            <Input
              id="prompt"
              placeholder="e.g., A person dancing in a park"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
            <Input
              id="negative-prompt"
              placeholder="e.g., blurry, low quality"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="keep-original-sound"
              checked={keepOriginalSound}
              onChange={(e) => setKeepOriginalSound(e.target.checked)}
              className="form-checkbox"
            />
            <Label htmlFor="keep-original-sound">Keep Original Sound</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleGenerateMotion} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Motion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MotionTransferModal;
