/**
 * LearnTab.jsx
 * Two-panel learning interface: module/lesson nav on the left,
 * lesson content + terminal simulator on the right.
 */

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  GitBranch,
  Sparkles,
  Wrench,
  Check,
  Clock,
  Lock,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { MODULES } from './lessonData.js';
import TerminalSimulator from './TerminalSimulator.jsx';

// Map icon name strings from lessonData to Lucide components
const ICON_MAP = {
  Terminal,
  GitBranch,
  Sparkles,
  Wrench,
};

function ModuleIcon({ name, className }) {
  const Icon = ICON_MAP[name] || BookOpen;
  return <Icon className={className} />;
}

export default function LearnTab({ progress, onMarkComplete }) {
  const completedLessons = progress?.completedLessons ?? [];

  // Which modules are expanded (by module id)
  const [expandedModules, setExpandedModules] = useState({});
  // Currently selected lesson object
  const [selectedLesson, setSelectedLesson] = useState(null);

  // On mount: find the first module with incomplete lessons, expand it, select first incomplete lesson
  useEffect(() => {
    for (const mod of MODULES) {
      if (mod.comingSoon || mod.lessons.length === 0) continue;
      const firstIncomplete = mod.lessons.find((l) => !completedLessons.includes(l.id));
      if (firstIncomplete) {
        setExpandedModules({ [mod.id]: true });
        setSelectedLesson(firstIncomplete);
        return;
      }
    }
    // All lessons complete — just expand + select first lesson of first real module
    for (const mod of MODULES) {
      if (mod.comingSoon || mod.lessons.length === 0) continue;
      setExpandedModules({ [mod.id]: true });
      setSelectedLesson(mod.lessons[0]);
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleModule(modId) {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  }

  function selectLesson(lesson) {
    setSelectedLesson(lesson);
  }

  const isCompleted = (lessonId) => completedLessons.includes(lessonId);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left panel: module/lesson navigator ────────────────────── */}
      <div className="w-64 shrink-0 border-r border-gray-700 overflow-y-auto flex flex-col">
        {MODULES.map((mod) => {
          const completedCount = mod.lessons.filter((l) => isCompleted(l.id)).length;
          const totalCount = mod.lessons.length;
          const allComplete = totalCount > 0 && completedCount === totalCount;
          const isExpanded = !!expandedModules[mod.id];
          const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div key={mod.id}>
              {/* Module header row */}
              <button
                className={[
                  'w-full flex items-center gap-2 px-3 py-3 text-left transition-colors',
                  mod.comingSoon
                    ? 'cursor-default text-gray-500'
                    : 'hover:bg-gray-800 text-gray-200 cursor-pointer',
                ].join(' ')}
                onClick={() => !mod.comingSoon && toggleModule(mod.id)}
                disabled={mod.comingSoon}
              >
                {/* Expand/collapse chevron or lock */}
                {mod.comingSoon ? (
                  <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                )}

                {/* Module icon */}
                <ModuleIcon
                  name={mod.icon}
                  className={`w-4 h-4 shrink-0 ${mod.comingSoon ? 'text-gray-600' : 'text-[#2C666E]'}`}
                />

                {/* Title + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate">{mod.title}</span>
                    {mod.comingSoon ? (
                      <span className="text-[10px] bg-gray-700 text-gray-400 rounded-full px-1.5 py-0.5 shrink-0">
                        Soon
                      </span>
                    ) : allComplete ? (
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : null}
                  </div>

                  {/* Progress bar */}
                  {!mod.comingSoon && totalCount > 0 && (
                    <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2C666E] rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>

              {/* Lesson list — shown when expanded */}
              {!mod.comingSoon && isExpanded && (
                <div className="border-t border-gray-800">
                  {mod.lessons.map((lesson) => {
                    const done = isCompleted(lesson.id);
                    const active = selectedLesson?.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        className={[
                          'w-full flex items-center gap-2 pl-9 pr-3 py-2 text-left text-sm transition-colors',
                          active
                            ? 'bg-gray-700 text-white'
                            : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200',
                        ].join(' ')}
                        onClick={() => selectLesson(lesson)}
                      >
                        {/* Completion checkmark */}
                        <span className="shrink-0 w-4 flex justify-center">
                          {done ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
                          )}
                        </span>

                        <span className="flex-1 truncate">{lesson.title}</span>

                        {/* Time estimate */}
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {lesson.time}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right panel: lesson content ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedLesson ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-3">
            <BookOpen className="w-10 h-10 text-gray-600" />
            <p className="text-base">Select a lesson to get started</p>
          </div>
        ) : (
          <LessonContent
            lesson={selectedLesson}
            completed={isCompleted(selectedLesson.id)}
            onMarkComplete={() => onMarkComplete(selectedLesson.id)}
          />
        )}
      </div>
    </div>
  );
}

function LessonContent({ lesson, completed, onMarkComplete }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
        <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lesson.time} min
        </span>
      </div>

      {/* Explanation */}
      <p className="text-gray-300 leading-relaxed whitespace-pre-line">{lesson.explanation}</p>

      {/* Examples */}
      {lesson.examples && lesson.examples.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-100 mb-3">Examples</h3>
          {lesson.examples.map((ex, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 font-mono text-sm mb-3">
              <div className="text-green-400">
                <span className="select-none">$ </span>
                {ex.command}
              </div>
              {ex.output && (
                <div className="text-gray-400 whitespace-pre-wrap mt-1">{ex.output}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Try It Yourself */}
      <div>
        <h3 className="text-base font-semibold text-gray-100 mb-1">Try It Yourself</h3>
        <p className="text-sm text-gray-400 mb-3">
          Practice the commands from this lesson in the terminal below.
        </p>
        <TerminalSimulator
          availableCommands={lesson.availableCommands}
          initialPath="/home/stuarta"
        />
      </div>

      {/* Mark Complete button */}
      <div className="pt-2">
        {completed ? (
          <button
            onClick={onMarkComplete}
            className="bg-green-900/30 border border-green-700 text-green-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-900/50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Completed ✓
          </button>
        ) : (
          <button
            onClick={onMarkComplete}
            className="bg-[#2C666E] hover:bg-[#235459] text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
}
