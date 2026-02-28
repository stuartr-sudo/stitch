import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Upload, Zap, Trash2, ImagePlus, Sparkles, CheckCircle2,
  ArrowRight, Info, Clock, Layers,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const STEPS = [
  { key: 'upload', label: 'Upload Photos', icon: ImagePlus },
  { key: 'configure', label: 'Configure', icon: Sparkles },
  { key: 'train', label: 'Train', icon: Zap },
];

function StepIndicator({ currentStep, steps }) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`flex-1 h-px ${isDone ? 'bg-[#2C666E]' : 'bg-gray-200'}`} />
            )}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive ? 'bg-[#2C666E] text-white' :
              isDone ? 'bg-[#2C666E]/10 text-[#2C666E]' :
              'bg-gray-100 text-gray-400'
            }`}>
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function BrandAssetsModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState('upload');

  // Upload state
  const [uploadedImages, setUploadedImages] = useState([]);
  const [processedImages, setProcessedImages] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Config state
  const [loraName, setLoraName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [trainingStage, setTrainingStage] = useState(''); // uploading, queued, training, complete
  const [trainingResult, setTrainingResult] = useState(null);

  const handleFileUpload = async (files) => {
    const newImages = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      newImages.push({
        id: Date.now() + Math.random(),
        dataUrl,
        fileName: file.name,
        size: file.size,
      });
    }
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveBackground = async (imageId, dataUrl) => {
    setIsProcessing(true);
    setProcessingId(imageId);
    try {
      const response = await apiFetch('/api/brand/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: dataUrl }),
      });
      const data = await response.json();
      if (data.success) {
        setProcessedImages(prev => ({ ...prev, [imageId]: data.imageUrl }));
        toast.success('Background removed');
      } else {
        toast.error('Failed to remove background');
      }
    } catch (error) {
      toast.error('Error removing background');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
    }
  };

  const handleRemoveAllBackgrounds = async () => {
    const unprocessed = uploadedImages.filter(img => !processedImages[img.id]);
    if (unprocessed.length === 0) { toast.info('All backgrounds already removed'); return; }

    for (const img of unprocessed) {
      await handleRemoveBackground(img.id, img.dataUrl);
    }
    toast.success(`Processed ${unprocessed.length} images`);
  };

  const handleDeleteImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    setProcessedImages(prev => {
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
  };

  const handleStartTraining = async () => {
    if (!loraName.trim()) { toast.error('Enter a name for your LoRA model'); return; }
    if (!triggerWord.trim()) { toast.error('Enter a trigger word'); return; }
    if (uploadedImages.length < 3) { toast.error('Upload at least 3 images for good results'); return; }

    setIsTraining(true);
    setCurrentStep('train');
    setTrainingStage('uploading');

    try {
      // Stage 1: Upload images to storage
      const publicUrls = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        setTrainingStage('uploading');
        setTrainingProgress({ current: i + 1, total: uploadedImages.length });

        const img = uploadedImages[i];
        const base64Data = processedImages[img.id] || img.dataUrl;
        const uploadRes = await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: base64Data,
            type: 'image',
            title: `LoRA Training - ${loraName}`,
            source: 'lora-trainer',
          }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) publicUrls.push(uploadData.url);
      }

      if (publicUrls.length === 0) {
        throw new Error('No images could be uploaded');
      }

      // Stage 2: Start training
      setTrainingStage('queued');
      setTrainingProgress(null);

      const response = await apiFetch('/api/lora/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loraName.trim(),
          trigger_word: triggerWord.trim(),
          image_urls: publicUrls,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to start training');

      setTrainingStage('training');
      toast.success('LoRA training started');

      // Stage 3: Poll for completion
      await pollLoraTraining(data.requestId, data.loraId, data.statusUrl, data.responseUrl);
    } catch (error) {
      console.error('LoRA training error:', error);
      toast.error(error.message || 'Error starting LoRA training');
      setTrainingStage('');
      setIsTraining(false);
    }
  };

  const pollLoraTraining = async (requestId, loraId, statusUrl, responseUrl) => {
    let attempts = 0;
    const maxAttempts = 120;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));

      try {
        const response = await apiFetch('/api/lora/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, loraId, statusUrl, responseUrl }),
        });
        const result = await response.json();

        if (result.status === 'completed') {
          setTrainingStage('complete');
          setTrainingResult({
            modelUrl: result.modelUrl,
            triggerWord: triggerWord.trim(),
            loraName: loraName.trim(),
          });
          toast.success('LoRA training complete! Your model is ready to use.');
          setIsTraining(false);
          return;
        }

        setTrainingProgress(prev => ({
          ...prev,
          queuePosition: result.queuePosition,
        }));
      } catch (err) {
        console.warn('Poll attempt failed:', err);
      }

      attempts++;
    }

    toast.error('LoRA training timed out — check back in a few minutes');
    setTrainingStage('');
    setIsTraining(false);
  };

  const processedCount = Object.keys(processedImages).length;
  const canProceedToConfigure = uploadedImages.length >= 3;
  const canStartTraining = loraName.trim() && triggerWord.trim() && uploadedImages.length >= 3;

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="LoRA Model Trainer"
      subtitle="Train a custom AI model to generate your product or character consistently"
      icon={<Layers className="w-5 h-5" />}
    >
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      <SlideOverBody>
        {/* ── Step 1: Upload ── */}
        {currentStep === 'upload' && (
          <div className="p-5 space-y-5">
            {/* Explainer */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900">What is LoRA training?</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    LoRA (Low-Rank Adaptation) teaches an AI image model to recognize your specific product,
                    person, or character. Upload 5-15 clear photos from different angles — the AI learns
                    what makes your subject unique, then generates new images that look like the real thing.
                  </p>
                  <div className="border-t border-blue-200 pt-2 mt-1">
                    <p className="text-xs font-medium text-blue-800 mb-1.5">Example use cases:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/70 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-blue-900">Product Shots</p>
                        <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                          Upload 10 photos of your product from different angles. Then generate lifestyle scenes, flat lays, and ad creatives featuring it.
                        </p>
                      </div>
                      <div className="bg-white/70 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-blue-900">Brand Character</p>
                        <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                          Upload headshots and full-body photos of a spokesperson or mascot. Generate them in new settings for ads and social content.
                        </p>
                      </div>
                      <div className="bg-white/70 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-blue-900">Visual Style</p>
                        <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                          Upload 8-15 on-brand images with a consistent aesthetic. The model learns your visual style and applies it to new generations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">
                  Training Photos <span className="text-gray-400">({uploadedImages.length} uploaded)</span>
                </Label>
                {uploadedImages.length > 0 && processedCount < uploadedImages.length && (
                  <Button size="sm" variant="outline" onClick={handleRemoveAllBackgrounds} disabled={isProcessing}
                    className="text-xs border-[#2C666E]/40 text-[#2C666E]">
                    <Zap className="w-3 h-3 mr-1" /> Remove All Backgrounds
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                className="hidden"
              />

              {uploadedImages.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#2C666E] hover:bg-[#2C666E]/5 cursor-pointer transition-all group"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300 group-hover:text-[#2C666E] transition-colors" />
                  <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Click to upload photos</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP. 5-15 images recommended.</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    {uploadedImages.map(img => {
                      const isProcessed = !!processedImages[img.id];
                      const isBeingProcessed = processingId === img.id;
                      return (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          <img
                            src={processedImages[img.id] || img.dataUrl}
                            alt="preview"
                            className="w-full aspect-square object-cover"
                          />
                          {/* Status badge */}
                          <div className="absolute top-1.5 left-1.5">
                            {isBeingProcessed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/90 text-gray-600 px-1.5 py-0.5 rounded-full shadow-sm">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
                              </span>
                            ) : isProcessed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-100/90 text-green-700 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" /> BG Removed
                              </span>
                            ) : null}
                          </div>
                          {/* Hover actions */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!isProcessed && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBackground(img.id, img.dataUrl)}
                                disabled={isProcessing}
                                className="text-white bg-[#2C666E] hover:bg-[#07393C] disabled:opacity-50 px-2 py-1.5 rounded-md text-xs font-medium flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" /> Remove BG
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img.id)}
                              className="text-white bg-red-500 hover:bg-red-600 px-2 py-1.5 rounded-md text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add more button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-all cursor-pointer"
                    >
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Add more</span>
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Tips for best results:</p>
                    <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                      <li>Use 5-15 high-quality photos from different angles</li>
                      <li>Keep consistent lighting across images</li>
                      <li>Removing backgrounds helps the AI focus on your subject</li>
                      <li>Avoid busy backgrounds or other prominent objects</li>
                    </ul>
                  </div>

                  {uploadedImages.length < 3 && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Upload at least 3 images to proceed (5-15 recommended for best quality)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Configure ── */}
        {currentStep === 'configure' && (
          <div className="p-5 space-y-5">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Model Configuration</h3>
                <p className="text-xs text-gray-500 mt-0.5">Name your model and choose a trigger word that activates it in prompts.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">LoRA Model Name</Label>
                <Input
                  value={loraName}
                  onChange={(e) => setLoraName(e.target.value)}
                  placeholder="e.g., Red Sneakers v1, Sarah Presenter, Acme Product"
                  className="bg-white border-gray-300 text-gray-900"
                />
                <p className="text-xs text-gray-500">A descriptive name to identify this model later</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Trigger Word</Label>
                <Input
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  placeholder="e.g., redsneaker, sarahpresenter, acmewidget"
                  className="bg-white border-gray-300 text-gray-900 font-mono"
                />
                <p className="text-xs text-gray-500">
                  This unique word activates your LoRA in image prompts. Use something distinctive that won't appear naturally
                  in other prompts — e.g., <code className="bg-gray-100 px-1 rounded text-[#2C666E]">redsneaker</code> or{' '}
                  <code className="bg-gray-100 px-1 rounded text-[#2C666E]">sks person</code>.
                </p>
              </div>
            </div>

            {/* Preview of what will be trained */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Training Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Images:</span>{' '}
                  <span className="font-medium text-gray-900">{uploadedImages.length} photos</span>
                  {processedCount > 0 && (
                    <span className="text-green-600 ml-1">({processedCount} BG removed)</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Model:</span>{' '}
                  <span className="font-medium text-gray-900">FLUX LoRA (fast training)</span>
                </div>
                <div>
                  <span className="text-gray-500">Steps:</span>{' '}
                  <span className="font-medium text-gray-900">1,000 iterations</span>
                </div>
                <div>
                  <span className="text-gray-500">Est. time:</span>{' '}
                  <span className="font-medium text-gray-900">5-10 minutes</span>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                {uploadedImages.slice(0, 8).map(img => (
                  <img
                    key={img.id}
                    src={processedImages[img.id] || img.dataUrl}
                    alt=""
                    className="w-12 h-12 rounded object-cover border border-gray-200 flex-shrink-0"
                  />
                ))}
                {uploadedImages.length > 8 && (
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                    +{uploadedImages.length - 8}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex gap-2">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-800 font-medium">What happens next?</p>
                  <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                    Your images will be uploaded to secure storage, then sent to Fal.ai for LoRA training.
                    The AI will study your subject across all photos and learn to reproduce it. Training
                    takes about 5-10 minutes. Once complete, the model is saved to your brand and available
                    in any image generation tool.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Training ── */}
        {currentStep === 'train' && (
          <div className="p-5 space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-4">
              {/* Stage: Uploading */}
              {trainingStage === 'uploading' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#2C666E]/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#2C666E] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Uploading images...</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {trainingProgress
                        ? `Image ${trainingProgress.current} of ${trainingProgress.total}`
                        : 'Preparing your photos for training'}
                    </p>
                  </div>
                  {trainingProgress && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#2C666E] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(trainingProgress.current / trainingProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Stage: Queued */}
              {trainingStage === 'queued' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Queued for training</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Images uploaded. Waiting for a training slot on Fal.ai...
                    </p>
                  </div>
                </>
              )}

              {/* Stage: Training */}
              {trainingStage === 'training' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#2C666E]/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[#2C666E] animate-bounce" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Training your LoRA model...</p>
                    <p className="text-xs text-gray-500 mt-1">
                      The AI is learning what makes <span className="font-medium text-gray-700">{loraName}</span> unique.
                      This takes about 5-10 minutes.
                    </p>
                    {trainingProgress?.queuePosition != null && (
                      <p className="text-xs text-[#2C666E] mt-2 font-medium">
                        Queue position: {trainingProgress.queuePosition}
                      </p>
                    )}
                  </div>
                  {/* Pulsing bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#2C666E] h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <p className="text-xs text-gray-400">You can close this panel — training continues in the background</p>
                </>
              )}

              {/* Stage: Complete */}
              {trainingStage === 'complete' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Training complete!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Your LoRA model <span className="font-medium text-gray-700">"{trainingResult?.loraName}"</span> is ready.
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Trigger word:</span>
                      <code className="bg-[#2C666E]/10 text-[#2C666E] px-2 py-0.5 rounded text-sm font-mono font-medium">
                        {trainingResult?.triggerWord}
                      </code>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Use this trigger word in any image prompt to generate images of your subject.
                      It's been saved to your brand and will appear in the Imagineer and JumpStart tools.
                    </p>
                  </div>

                  <Button
                    onClick={onClose}
                    className="bg-[#2C666E] hover:bg-[#07393C] text-white px-8"
                  >
                    Done
                  </Button>
                </>
              )}

              {/* Stage: Empty (returned from error) */}
              {!trainingStage && currentStep === 'train' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                    <Info className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Training could not start</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Go back and check your settings, then try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentStep('configure')} className="border-gray-300">
                    Back to Configuration
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SlideOverBody>

      {/* Footer navigation */}
      {currentStep !== 'train' && (
        <SlideOverFooter>
          <div className="flex items-center justify-between w-full">
            {currentStep === 'upload' ? (
              <>
                <span className="text-xs text-gray-500">
                  {uploadedImages.length} of 5-15 images uploaded
                </span>
                <Button
                  onClick={() => setCurrentStep('configure')}
                  disabled={!canProceedToConfigure}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6"
                >
                  Next: Configure <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setCurrentStep('upload')} className="text-gray-500">
                  Back to Photos
                </Button>
                <Button
                  onClick={handleStartTraining}
                  disabled={!canStartTraining || isTraining}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6"
                >
                  {isTraining
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                    : <><Zap className="w-4 h-4 mr-2" /> Start Training</>}
                </Button>
              </>
            )}
          </div>
        </SlideOverFooter>
      )}
    </SlideOverPanel>
  );
}
