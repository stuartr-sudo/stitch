import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import WizardStepper from '@/components/ui/WizardStepper';
import { ShortsWizardProvider, useShortsWizard } from '@/contexts/ShortsWizardContext';

const STEPS = [
  { key: 'niche', label: 'Niche' },
  { key: 'style', label: 'Visual Style' },
  { key: 'topic', label: 'Topic' },
  { key: 'length', label: 'Length' },
  { key: 'script', label: 'Script' },
  { key: 'voice', label: 'Voice' },
  { key: 'music', label: 'Music' },
  { key: 'video', label: 'Video Model' },
  { key: 'captions', label: 'Captions' },
  { key: 'review', label: 'Review' },
];

function StepPlaceholder({ stepKey, label }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-slate-400">{STEPS.findIndex(s => s.key === stepKey) + 1}</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">{label}</h2>
        <p className="text-slate-500 text-sm">
          This step will be implemented in the next phase.
        </p>
      </div>
    </div>
  );
}

function WizardContent() {
  const navigate = useNavigate();
  const wizard = useShortsWizard();
  const [currentStepKey, setCurrentStepKey] = useState('niche');

  const currentIndex = STEPS.findIndex(s => s.key === currentStepKey);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEPS.length - 1;

  const completedSteps = useMemo(() => {
    // Mark steps before current as completed for visual progress
    return STEPS.slice(0, currentIndex).map(s => s.key);
  }, [currentIndex]);

  const goNext = () => {
    if (!isLast) setCurrentStepKey(STEPS[currentIndex + 1].key);
  };

  const goBack = () => {
    if (!isFirst) setCurrentStepKey(STEPS[currentIndex - 1].key);
  };

  const handleStepClick = (key) => {
    const targetIndex = STEPS.findIndex(s => s.key === key);
    if (targetIndex <= currentIndex) {
      setCurrentStepKey(key);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">Create Short</h1>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={wizard.resetWizard}
          className="text-slate-500 hover:text-red-600"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Step indicator */}
      <WizardStepper
        steps={STEPS}
        currentStep={currentStepKey}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <StepPlaceholder stepKey={currentStepKey} label={STEPS[currentIndex].label} />
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t px-6 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={isFirst}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <span className="text-sm text-slate-500">
          Step {currentIndex + 1} of {STEPS.length}
        </span>

        <Button
          onClick={goNext}
          disabled={isLast}
          className="bg-[#2C666E] hover:bg-[#24555c] text-white"
        >
          {isLast ? 'Generate' : 'Next'}
          {!isLast && <ArrowRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

export default function ShortsWizardPage() {
  return (
    <ShortsWizardProvider>
      <WizardContent />
    </ShortsWizardProvider>
  );
}
