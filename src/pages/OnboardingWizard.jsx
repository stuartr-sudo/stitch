import React, { useState } from 'react';
import { Palette, Link2, CheckSquare } from 'lucide-react';
import OnboardingBrandKit from '@/components/onboarding/OnboardingBrandKit';
import OnboardingPlatforms from '@/components/onboarding/OnboardingPlatforms';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';

const STEPS = [
  { key: 'brand', label: 'Brand Kit', icon: Palette },
  { key: 'platforms', label: 'Connect', icon: Link2 },
  { key: 'checklist', label: 'Ready', icon: CheckSquare },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0EDEE] to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white mb-3 shadow-lg">
            {React.createElement(STEPS[currentStep].icon, { className: 'w-7 h-7' })}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {currentStep === 0 && 'Set Up Your Brand'}
            {currentStep === 1 && 'Connect Platforms'}
            {currentStep === 2 && "You're All Set"}
          </h1>
          <p className="text-sm text-slate-500">
            {currentStep === 0 && 'Tell us about your brand so AI can match your style'}
            {currentStep === 1 && 'Link your social accounts for direct publishing'}
            {currentStep === 2 && 'Here\'s your setup summary and suggested first steps'}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === currentStep
                  ? 'bg-[#2C666E] text-white'
                  : i < currentStep
                    ? 'bg-[#2C666E]/20 text-[#2C666E]'
                    : 'bg-gray-200 text-gray-400'
              }`}
            >
              {React.createElement(step.icon, { className: 'w-3 h-3' })}
              {step.label}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {currentStep === 0 && (
            <OnboardingBrandKit
              onComplete={nextStep}
              onSkip={nextStep}
            />
          )}
          {currentStep === 1 && (
            <OnboardingPlatforms
              onComplete={nextStep}
              onSkip={nextStep}
            />
          )}
          {currentStep === 2 && (
            <OnboardingChecklist />
          )}
        </div>

      </div>
    </div>
  );
}
