import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Terminal, BookOpen, Trophy, Search, Sparkles, Film,
  RotateCcw, LayoutGrid, Target, GraduationCap, Wand2, Play,
  Sun, Moon, Video,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LearnTab from '@/components/educate/LearnTab';
import PracticeTab from '@/components/educate/PracticeTab';
import ReferenceTab from '@/components/educate/ReferenceTab';
import { MODULES } from '@/components/educate/lessonData';
import { LoraGuideContent } from './LoraGuidePage';
import { StoryboardGuideContent } from './StoryboardGuidePage';
import { TurnaroundGuideContent } from './TurnaroundGuidePage';
import { CarouselGuideContent } from './CarouselGuidePage';
import { AdsManagerGuideContent } from './AdsManagerGuidePage';
import { ImagineerGuideContent } from './ImagineerGuidePage';
import { MotionTransferGuideContent } from './MotionTransferGuidePage';
import { VideoProductionGuideContent } from './VideoProductionGuidePage';
import { ShortsWorkbenchGuideContent } from './ShortsWorkbenchGuidePage';

// ── CLI Lab progress persistence ──

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

// ── Tab definitions ──

const TABS = [
  { id: 'cli',         label: 'CLI Lab',        Icon: Terminal },
  { id: 'imagineer',   label: 'Imagineer',      Icon: Wand2 },
  { id: 'lora',        label: 'LoRA Training',  Icon: Sparkles },
  { id: 'storyboards', label: 'Storyboards',    Icon: Film },
  { id: 'turnaround',  label: 'Turnaround',     Icon: RotateCcw },
  { id: 'carousels',   label: 'Carousels',      Icon: LayoutGrid },
  { id: 'ads',         label: 'Ads Manager',    Icon: Target },
  { id: 'motion',      label: 'Motion',         Icon: Play },
  { id: 'video',       label: 'Video Production', Icon: Film },
  { id: 'shorts',      label: 'Shorts',           Icon: Video },
];

const CLI_SUB_TABS = [
  { id: 'learn', label: 'Learn', Icon: BookOpen },
  { id: 'practice', label: 'Practice', Icon: Trophy },
  { id: 'reference', label: 'Reference', Icon: Search },
];

export default function LearnPage() {
  const { theme, toggleTheme, activateTheme, deactivateTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.find((t) => t.id === searchParams.get('tab'))?.id || 'cli';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [cliSubTab, setCliSubTab] = useState('learn');

  // Scope dark mode to this page only
  useEffect(() => {
    activateTheme();
    return () => deactivateTheme();
  }, [activateTheme, deactivateTheme]);

  // CLI Lab progress
  const [progress, setProgress] = useState(() => loadProgress());

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

  // Sync tab to URL
  const switchTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === 'cli' ? {} : { tab: id }, { replace: true });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-[#2C666E]" />
          <h1 className="text-2xl font-bold">Learn</h1>
        </div>
        <div className="flex items-center gap-4">
          {activeTab === 'cli' && (
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span>
                <span className="text-gray-900 dark:text-white font-medium">{progress.completedLessons.length}</span>
                <span>/{TOTAL_LESSONS} lessons</span>
              </span>
              <span>
                <span className="text-gray-900 dark:text-white font-medium">{totalScore}</span>
                <span> pts</span>
              </span>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main tab bar */}
      <div className="px-6 border-b border-gray-200 dark:border-gray-800 flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap transition-colors px-3 ${
              activeTab === id
                ? 'border-b-2 border-[#2C666E] text-gray-900 dark:text-white pb-3 pt-3'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 pb-3 pt-3'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* CLI Lab — has its own sub-tabs */}
        {activeTab === 'cli' && (
          <div className="flex flex-col h-full bg-gray-950 text-white">
            <div className="px-6 border-b border-gray-800 flex gap-6">
              {CLI_SUB_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setCliSubTab(id)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    cliSubTab === id
                      ? 'border-b-2 border-[#2C666E] text-white pb-3 pt-3'
                      : 'text-gray-500 hover:text-gray-300 pb-3 pt-3'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1">
              {cliSubTab === 'learn' && (
                <LearnTab progress={progress} onMarkComplete={handleMarkComplete} />
              )}
              {cliSubTab === 'practice' && (
                <PracticeTab
                  progress={progress}
                  onUpdateScores={handleUpdateScores}
                  onUpdateStreak={handleUpdateStreak}
                />
              )}
              {cliSubTab === 'reference' && <ReferenceTab />}
            </div>
          </div>
        )}

        {/* Guide pages — light bg wrapper */}
        {activeTab === 'lora' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <LoraGuideContent />
          </div>
        )}
        {activeTab === 'storyboards' && (
          <div className="bg-gray-50 dark:bg-gray-900 min-h-full">
            <StoryboardGuideContent />
          </div>
        )}
        {activeTab === 'turnaround' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <TurnaroundGuideContent />
          </div>
        )}
        {activeTab === 'carousels' && (
          <div className="bg-gray-50 dark:bg-gray-900 min-h-full">
            <CarouselGuideContent />
          </div>
        )}
        {activeTab === 'ads' && (
          <div className="bg-gray-50 dark:bg-gray-900 min-h-full">
            <AdsManagerGuideContent />
          </div>
        )}
        {activeTab === 'imagineer' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <ImagineerGuideContent />
          </div>
        )}
        {activeTab === 'motion' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <MotionTransferGuideContent />
          </div>
        )}
        {activeTab === 'video' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <VideoProductionGuideContent />
          </div>
        )}
        {activeTab === 'shorts' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <ShortsWorkbenchGuideContent />
          </div>
        )}
      </div>
    </div>
  );
}
