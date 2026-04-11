// src/components/ui/WizardStepper.jsx
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * WizardStepper — reusable step indicator + nav for multi-step modals.
 *
 * Props:
 *   steps: [{ key: string, label: string, icon?: ReactNode }]
 *   currentStep: string (matches a step.key)
 *   completedSteps: string[] (keys of completed steps)
 *   onStepClick?: (key: string) => void  (optional — allows clicking back to completed steps)
 */
export default function WizardStepper({ steps, currentStep, completedSteps = [], onStepClick }) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-slate-50 flex-shrink-0 overflow-x-auto">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const isPast = i < currentIndex;
        const isClickable = onStepClick && (isCompleted || isPast);

        return (
          <React.Fragment key={step.key}>
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                isCurrent && 'bg-[#2C666E] text-white shadow-sm',
                isCompleted && !isCurrent && 'bg-[#2C666E]/10 text-[#2C666E]',
                !isCurrent && !isCompleted && 'text-slate-400',
                isClickable && 'cursor-pointer hover:bg-[#2C666E]/20',
                !isClickable && !isCurrent && 'cursor-default',
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                isCurrent && 'bg-white/20 text-white',
                isCompleted && !isCurrent && 'bg-[#2C666E] text-white',
                !isCurrent && !isCompleted && 'bg-slate-200 text-slate-500',
              )}>
                {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-shrink-0 w-6 h-px',
                isPast || isCompleted ? 'bg-[#2C666E]/40' : 'bg-slate-200',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
