import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Terminal, BookOpen, Trophy, Search, Sparkles, Film,
  RotateCcw, LayoutGrid, Target, GraduationCap, Wand2, Play,
  Sun, Moon, Video, GitBranch, Share2, Eye, Briefcase, Clapperboard, Scissors,
  ChevronDown, ChevronRight, X, Zap,
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
import { AutomationFlowsGuideContent } from './AutomationFlowsGuidePage';
import { LinkedInGuideContent } from './LinkedInGuidePage';
import { BrandKitGuideContent } from './BrandKitGuidePage';
import { AdDiscoveryGuideContent } from './AdDiscoveryGuidePage';
import { AgencyGuideContent } from './AgencyGuidePage';
import { LongformGuideContent } from './LongformGuidePage';
import { AdCloneGuideContent } from './AdCloneGuidePage';
import { VideoAnalyzerGuideContent } from './VideoAnalyzerGuidePage';
import { CommandCenterGuideContent } from './CommandCenterGuidePage';

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
  { id: 'linkedin',    label: 'LinkedIn',       Icon: Share2 },
  { id: 'motion',      label: 'Motion',         Icon: Play },
  { id: 'video',       label: 'Video Production', Icon: Film },
  { id: 'shorts',      label: 'Shorts',           Icon: Video },
  { id: 'flows',       label: 'Automation Flows', Icon: GitBranch },
  { id: 'brandkit',   label: 'Brand Kit',        Icon: BookOpen },
  { id: 'ad-discovery', label: 'Ad Intelligence', Icon: Eye },
  { id: 'agency',    label: 'Agency Mode',      Icon: Briefcase },
  { id: 'longform',  label: 'Longform',         Icon: Clapperboard },
  { id: 'clone-ad', label: 'Clone Ad',          Icon: Scissors },
  { id: 'video-analyzer', label: 'Video Analyzer', Icon: Search },
  { id: 'command-center', label: 'Command Center', Icon: Zap },
];

// ── Sidebar categories ──

const CATEGORIES = [
  { label: 'Getting Started', items: ['cli'] },
  { label: 'Image Tools', items: ['imagineer', 'lora', 'turnaround'] },
  { label: 'Video Tools', items: ['video', 'shorts', 'storyboards', 'motion', 'longform'] },
  { label: 'Analysis', items: ['clone-ad', 'video-analyzer'] },
  { label: 'Social & Ads', items: ['command-center', 'ads', 'linkedin', 'carousels'] },
  { label: 'Brand & Setup', items: ['brandkit', 'flows'] },
  { label: 'Advanced', items: ['ad-discovery', 'agency'] },
];

const TAB_MAP = Object.fromEntries(TABS.map((t) => [t.id, t]));

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
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [guideSections, setGuideSections] = useState([]);
  const [expandedTab, setExpandedTab] = useState(null);

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

  // Discover guide sections from DOM after tab renders
  useEffect(() => {
    const timer = setTimeout(() => {
      const els = document.querySelectorAll('[data-guide-section]');
      const sections = Array.from(els).map((el) => ({
        id: el.id,
        title: el.getAttribute('data-guide-section'),
      }));
      setGuideSections(sections);
    }, 100); // small delay for content to render
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Sync tab to URL
  const switchTab = (id) => {
    setActiveTab(id);
    setExpandedTab(id === activeTab ? expandedTab : null); // collapse sub-items when switching
    setSearchParams(id === 'cli' ? {} : { tab: id }, { replace: true });
  };

  const handleSectionClick = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleTabSections = (tabId) => {
    if (activeTab !== tabId) {
      switchTab(tabId);
      setExpandedTab(tabId);
    } else {
      setExpandedTab(expandedTab === tabId ? null : tabId);
    }
  };

  const toggleCategory = (label) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((id) => TAB_MAP[id]?.label.toLowerCase().includes(q)),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

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

      {/* Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides..."
                className="w-full pl-8 pr-7 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category groups */}
          <div className="flex-1 py-1">
            {filteredCategories.map((cat) => {
              const isOpen = isSearching || !collapsed[cat.label];
              return (
                <div key={cat.label}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat.label)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 shrink-0" />
                      : <ChevronRight className="w-3 h-3 shrink-0" />
                    }
                    <span className="flex-1 text-left">{cat.label}</span>
                    <span className="text-[10px] font-normal text-gray-300 dark:text-gray-600">{cat.items.length}</span>
                  </button>

                  {/* Tab items */}
                  {isOpen && cat.items.map((id) => {
                    const tab = TAB_MAP[id];
                    if (!tab) return null;
                    const isActive = activeTab === id;
                    const showSections = isActive && expandedTab === id && guideSections.length > 0;
                    return (
                      <div key={id}>
                        <button
                          onClick={() => toggleTabSections(id)}
                          className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-[#2C666E]/10 dark:bg-[#2C666E]/20 text-[#2C666E] dark:text-[#5AABB5] font-medium border-l-2 border-[#2C666E]'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 border-l-2 border-transparent'
                          }`}
                        >
                          <tab.Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate flex-1 text-left">{tab.label}</span>
                          {isActive && guideSections.length > 0 && (
                            showSections
                              ? <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                              : <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                        </button>
                        {/* Section sub-items */}
                        {showSections && (
                          <div className="ml-9 border-l border-gray-200 dark:border-gray-700">
                            {guideSections.map((section) => (
                              <button
                                key={section.id}
                                onClick={() => handleSectionClick(section.id)}
                                className="w-full text-left pl-3 pr-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#2C666E] dark:hover:text-[#5AABB5] hover:bg-[#2C666E]/5 dark:hover:bg-[#2C666E]/10 transition-colors truncate"
                              >
                                {section.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                No guides match "{searchQuery}"
              </div>
            )}
          </div>
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
        {activeTab === 'linkedin' && (
          <div className="bg-gray-50 dark:bg-gray-900 min-h-full">
            <LinkedInGuideContent />
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
        {activeTab === 'flows' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <AutomationFlowsGuideContent />
          </div>
        )}
        {activeTab === 'brandkit' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <BrandKitGuideContent />
          </div>
        )}
        {activeTab === 'ad-discovery' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <AdDiscoveryGuideContent />
          </div>
        )}
        {activeTab === 'agency' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <AgencyGuideContent />
          </div>
        )}
        {activeTab === 'longform' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <LongformGuideContent />
          </div>
        )}
        {activeTab === 'clone-ad' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <AdCloneGuideContent />
          </div>
        )}
        {activeTab === 'video-analyzer' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <VideoAnalyzerGuideContent />
          </div>
        )}
        {activeTab === 'command-center' && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
            <CommandCenterGuideContent />
          </div>
        )}
      </div>
      </div>{/* end sidebar + content flex */}
    </div>
  );
}
