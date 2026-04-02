/**
 * PracticeTab.jsx
 * Interactive practice challenges for the CLI learning page.
 * Three tiers: Beginner (MCQ), Intermediate (type command), Advanced (multi-step).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Trophy, Flame, Shuffle, ArrowRight, Check, X } from 'lucide-react';
import { CHALLENGES } from './challengeData.js';
import TerminalSimulator from './TerminalSimulator.jsx';

// Normalize a command string: trim + collapse multiple spaces to single
function normalizeCommand(cmd) {
  return cmd.trim().replace(/\s+/g, ' ');
}

// Pick a random integer in [0, max)
function randomInt(max) {
  return Math.floor(Math.random() * max);
}

const TIERS = ['beginner', 'intermediate', 'advanced'];

function getInitialState() {
  return {
    answered: false,
    attempts: 0,
    advancedStep: 0,
    selectedOption: null,
    showResult: false,
    feedback: null, // { type: 'correct'|'wrong'|'hint'|'answer', message: string }
  };
}

export default function PracticeTab({ progress, onUpdateScores, onUpdateStreak }) {
  const [tier, setTier] = useState('beginner');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [state, setState] = useState(getInitialState());

  // Reset challenge state whenever tier or index changes
  useEffect(() => {
    setState(getInitialState());
  }, [tier, challengeIndex]);

  const tierScore = progress?.practiceScores?.[tier] ?? 0;
  const streak = progress?.practiceStreak ?? 0;

  const challenges = CHALLENGES[tier] || [];
  const challenge = challenges[challengeIndex] || challenges[0];

  // ─── Navigation ──────────────────────────────────────────────────────────────

  function handleNext() {
    const nextIndex = (challengeIndex + 1) % challenges.length;
    setChallengeIndex(nextIndex);
  }

  function handleRandom() {
    const randomTier = TIERS[randomInt(TIERS.length)];
    const arr = CHALLENGES[randomTier] || [];
    const randomIndex = arr.length > 0 ? randomInt(arr.length) : 0;
    setTier(randomTier);
    setChallengeIndex(randomIndex);
  }

  function handleTierChange(newTier) {
    if (newTier === tier) return;
    setTier(newTier);
    setChallengeIndex(0);
  }

  // ─── Beginner (MCQ) ──────────────────────────────────────────────────────────

  function handleBeginnerOption(optionIndex) {
    if (state.answered) return;

    const isCorrect = optionIndex === challenge.correctIndex;
    setState((prev) => ({
      ...prev,
      selectedOption: optionIndex,
      answered: true,
      showResult: true,
      feedback: {
        type: isCorrect ? 'correct' : 'wrong',
        message: challenge.explanation,
      },
    }));

    if (isCorrect) {
      onUpdateScores?.(tier, 3);
      onUpdateStreak?.(streak + 1);
    } else {
      onUpdateStreak?.(0);
    }
  }

  // ─── Intermediate ────────────────────────────────────────────────────────────

  const handleIntermediateCommand = useCallback(
    ({ command }) => {
      if (state.answered) return;

      const normalized = normalizeCommand(command);
      const accepted = (challenge.acceptedAnswers || []).map(normalizeCommand);
      const isCorrect = accepted.includes(normalized);
      const attempts = state.attempts;

      if (isCorrect) {
        let points = attempts === 0 ? 3 : attempts === 1 ? 2 : 1;
        setState((prev) => ({
          ...prev,
          answered: true,
          feedback: { type: 'correct', message: 'Correct!' },
        }));
        onUpdateScores?.(tier, points);
        onUpdateStreak?.(streak + 1);
      } else {
        const newAttempts = attempts + 1;

        if (newAttempts === 1) {
          setState((prev) => ({
            ...prev,
            attempts: newAttempts,
            feedback: { type: 'hint', message: challenge.hint1 || 'Hint: try again.' },
          }));
        } else if (newAttempts === 2) {
          setState((prev) => ({
            ...prev,
            attempts: newAttempts,
            feedback: { type: 'hint', message: challenge.hint2 || challenge.hint1 || 'Hint: try again.' },
          }));
        } else {
          // 3rd wrong → reveal answer
          setState((prev) => ({
            ...prev,
            attempts: newAttempts,
            answered: true,
            feedback: {
              type: 'answer',
              message: `The answer was: ${challenge.answer || (challenge.acceptedAnswers || [])[0] || ''}`,
            },
          }));
          onUpdateStreak?.(0);
        }
      }
    },
    [challenge, state.answered, state.attempts, tier, streak, onUpdateScores, onUpdateStreak]
  );

  // ─── Advanced ────────────────────────────────────────────────────────────────

  // Track points earned per step for averaging
  const [stepPoints, setStepPoints] = useState([]);

  useEffect(() => {
    setStepPoints([]);
  }, [tier, challengeIndex]);

  const handleAdvancedCommand = useCallback(
    ({ command }) => {
      if (state.answered) return;

      const steps = challenge.steps || [];
      const currentStep = steps[state.advancedStep];
      if (!currentStep) return;

      const normalized = normalizeCommand(command);
      const accepted = (currentStep.acceptedAnswers || []).map(normalizeCommand);
      const isCorrect = accepted.includes(normalized);

      if (isCorrect) {
        // Calculate points for this step based on attempts on the current step
        const pointsForStep = state.attempts === 0 ? 3 : state.attempts === 1 ? 2 : 1;
        const newStepPoints = [...stepPoints, pointsForStep];
        setStepPoints(newStepPoints);

        const isLastStep = state.advancedStep >= steps.length - 1;

        if (isLastStep) {
          // Scenario complete — average the step points
          const total = newStepPoints.reduce((a, b) => a + b, 0);
          const avg = Math.round(total / newStepPoints.length);
          setState((prev) => ({
            ...prev,
            answered: true,
            attempts: 0,
            feedback: { type: 'correct', message: 'Scenario complete!' },
          }));
          onUpdateScores?.(tier, avg);
          onUpdateStreak?.(streak + 1);
        } else {
          setState((prev) => ({
            ...prev,
            advancedStep: prev.advancedStep + 1,
            attempts: 0,
            feedback: { type: 'correct', message: 'Step complete!' },
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          attempts: prev.attempts + 1,
          feedback: {
            type: 'hint',
            message: currentStep.hint || 'Hint: check the command syntax.',
          },
        }));
      }
    },
    [challenge, state.answered, state.advancedStep, state.attempts, stepPoints, tier, streak, onUpdateScores, onUpdateStreak]
  );

  // ─── Render helpers ──────────────────────────────────────────────────────────

  function renderFeedback() {
    if (!state.feedback) return null;
    const { type, message } = state.feedback;
    if (!message) return null;

    const colorClass =
      type === 'correct'
        ? 'text-green-400'
        : type === 'answer'
        ? 'text-green-400'
        : type === 'wrong'
        ? 'text-red-400'
        : 'text-yellow-400'; // hint

    const Icon = type === 'correct' || type === 'answer' ? Check : type === 'wrong' ? X : null;

    return (
      <div className={`mt-3 flex items-start gap-2 text-sm ${colorClass}`}>
        {Icon && <Icon size={16} className="mt-0.5 shrink-0" />}
        <span>{message}</span>
      </div>
    );
  }

  function renderBeginnerChallenge() {
    if (!challenge) return null;
    return (
      <div>
        <p className="text-lg mb-4 text-gray-100">{challenge.question}</p>
        <div className="grid grid-cols-2 gap-3">
          {(challenge.options || []).map((option, i) => {
            let btnClass =
              'bg-gray-700 hover:bg-gray-600 text-left p-3 rounded-lg font-mono text-sm text-gray-200 transition-colors';

            if (state.answered) {
              if (i === challenge.correctIndex) {
                btnClass =
                  'bg-green-900/50 border border-green-500 text-left p-3 rounded-lg font-mono text-sm text-green-300';
              } else if (i === state.selectedOption && i !== challenge.correctIndex) {
                btnClass =
                  'bg-red-900/50 border border-red-500 text-left p-3 rounded-lg font-mono text-sm text-red-300';
              } else {
                btnClass =
                  'bg-gray-700 opacity-50 text-left p-3 rounded-lg font-mono text-sm text-gray-400 cursor-default';
              }
            }

            return (
              <button
                key={i}
                className={btnClass}
                onClick={() => handleBeginnerOption(i)}
                disabled={state.answered}
              >
                {option}
              </button>
            );
          })}
        </div>
        {state.showResult && renderFeedback()}
      </div>
    );
  }

  function renderIntermediateChallenge() {
    if (!challenge) return null;
    return (
      <div>
        <p className="text-lg mb-4 text-gray-100">{challenge.question}</p>
        {renderFeedback()}
        <div className="mt-4">
          <TerminalSimulator
            key={`${tier}-${challengeIndex}`}
            onCommandExecuted={handleIntermediateCommand}
          />
        </div>
      </div>
    );
  }

  function renderAdvancedChallenge() {
    if (!challenge) return null;
    const steps = challenge.steps || [];
    const currentStep = steps[state.advancedStep];

    return (
      <div>
        <p className="text-lg mb-2 text-gray-100">{challenge.scenario}</p>
        <div className="mb-4">
          <span className="inline-block bg-gray-700 text-gray-300 text-xs font-mono px-2 py-1 rounded">
            Step {state.advancedStep + 1} of {steps.length}
          </span>
        </div>
        {currentStep && (
          <p className="text-sm text-gray-300 mb-3">{currentStep.instruction}</p>
        )}
        {renderFeedback()}
        <div className="mt-4">
          <TerminalSimulator
            key={`${tier}-${challengeIndex}-${state.advancedStep}`}
            onCommandExecuted={handleAdvancedCommand}
          />
        </div>
      </div>
    );
  }

  function renderChallenge() {
    if (tier === 'beginner') return renderBeginnerChallenge();
    if (tier === 'intermediate') return renderIntermediateChallenge();
    return renderAdvancedChallenge();
  }

  // ─── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tier pills */}
        <div className="flex items-center gap-2">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                tier === t
                  ? 'bg-[#2C666E] text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Score + streak */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-300">
            <Trophy size={14} className="text-yellow-400" />
            <span>Score: {tierScore}</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-orange-400 font-medium">
              <Flame size={14} />
              <span>Streak: {streak}</span>
            </div>
          )}
          {streak === 0 && (
            <div className="flex items-center gap-1 text-gray-500">
              <span>Streak: 0</span>
            </div>
          )}
        </div>
      </div>

      {/* Challenge card */}
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl mx-auto w-full">
        {challenge ? renderChallenge() : <p className="text-gray-400">No challenges available.</p>}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
        <button
          onClick={handleRandom}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
        >
          <Shuffle size={14} />
          Random Challenge
        </button>

        <button
          onClick={handleNext}
          disabled={!state.answered}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            state.answered
              ? 'bg-[#2C666E] text-white hover:bg-[#245a62]'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
