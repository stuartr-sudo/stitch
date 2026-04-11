import React, { useState, useEffect, useCallback } from 'react';
import { Terminal, BookOpen, Trophy, Search } from 'lucide-react';
import LearnTab from '@/components/educate/LearnTab';
import PracticeTab from '@/components/educate/PracticeTab';
import ReferenceTab from '@/components/educate/ReferenceTab';
import { MODULES } from '@/components/educate/lessonData';

const STORAGE_KEY = 'stitch-educate-progress';
const DEFAULT_PROGRESS = {
  version: 1,
  completedLessons: [],
  practiceScores: { beginner: 0, intermediate: 0, advanced: 0 },
  practiceStreak: 0,
  lastVisited: new Date().toISOString(),
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    if (!parsed.version) {
      // Migrate: keep completedLessons, reset rest
      return {
        ...DEFAULT_PROGRESS,
        completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      };
    }
    return parsed;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...p, lastVisited: new Date().toISOString() }));
  } catch {
    // ignore storage errors
  }
}

const TOTAL_LESSONS = MODULES.reduce((sum, m) => sum + m.lessons.length, 0);

const TABS = [
  { id: 'learn', label: 'Learn', Icon: BookOpen },
  { id: 'practice', label: 'Practice', Icon: Trophy },
  { id: 'reference', label: 'Reference', Icon: Search },
];

export default function EducatePage() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [activeTab, setActiveTab] = useState('learn');

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const handleMarkComplete = useCallback((lessonId) => {
    setProgress((prev) => {
      const already = prev.completedLessons.includes(lessonId);
      return {
        ...prev,
        completedLessons: already
          ? prev.completedLessons.filter((id) => id !== lessonId)
          : [...prev.completedLessons, lessonId],
      };
    });
  }, []);

  const handleUpdateScores = useCallback((tier, points) => {
    setProgress((prev) => ({
      ...prev,
      practiceScores: {
        ...prev.practiceScores,
        [tier]: (prev.practiceScores[tier] || 0) + points,
      },
    }));
  }, []);

  const handleUpdateStreak = useCallback((newStreak) => {
    setProgress((prev) => ({ ...prev, practiceStreak: newStreak }));
  }, []);

  const totalScore =
    (progress.practiceScores.beginner || 0) +
    (progress.practiceScores.intermediate || 0) +
    (progress.practiceScores.advanced || 0);

  return (
    <div className="bg-gray-950 min-h-screen text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-[#2C666E]" />
          <h1 className="text-2xl font-bold">CLI Learning Lab</h1>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <span>
            <span className="text-white font-medium">{progress.completedLessons.length}</span>
            <span>/{TOTAL_LESSONS} lessons</span>
          </span>
          <span>
            <span className="text-white font-medium">{totalScore}</span>
            <span> pts</span>
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 border-b border-gray-800 flex gap-6">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'border-b-2 border-[#2C666E] text-white pb-3 pt-3'
                : 'text-gray-500 hover:text-gray-300 pb-3 pt-3'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'learn' && (
          <LearnTab progress={progress} onMarkComplete={handleMarkComplete} />
        )}
        {activeTab === 'practice' && (
          <PracticeTab
            progress={progress}
            onUpdateScores={handleUpdateScores}
            onUpdateStreak={handleUpdateStreak}
          />
        )}
        {activeTab === 'reference' && <ReferenceTab />}
      </div>
    </div>
  );
}
