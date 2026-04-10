/**
 * ChecklistFlowsPage — interactive checklist for every step in the Automation Flows tool.
 * Checkbox state persists in localStorage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RotateCcw, Layers, Play, Settings2, Variable,
  Zap, GitBranch, AlertTriangle, Rocket, FlaskConical, CheckCircle2,
} from 'lucide-react';

const STORAGE_KEY = 'checklist-flows-state';

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Layers',
    items: [
      { id: 'gs-1', label: 'Navigate to Flows (/flows)' },
      { id: 'gs-2', label: 'Click "+ New Flow" (or "+ New Campaign" for brand context)' },
      { id: 'gs-3', label: 'Name and describe your flow' },
    ],
  },
  {
    id: 'building',
    title: 'Building Your Flow',
    icon: 'Play',
    items: [
      { id: 'bf-1', label: 'Add nodes from the Node Palette (drag or click)' },
      { id: 'bf-2', label: 'Use the search bar or press / to filter nodes' },
      { id: 'bf-3', label: 'Connect nodes by dragging output ports (right) to input ports (left)' },
      { id: 'bf-4', label: 'Verify connection colors match expected types (purple=image, blue=video, green=audio, amber=text)' },
      { id: 'bf-5', label: 'Remove any invalid or unneeded connections' },
    ],
  },
  {
    id: 'configuring',
    title: 'Configuring Nodes',
    icon: 'Settings2',
    items: [
      { id: 'cn-1', label: 'Double-click a node to open the config modal' },
      { id: 'cn-2', label: 'Select the AI model' },
      { id: 'cn-3', label: 'Set aspect ratio / dimensions' },
      { id: 'cn-4', label: 'Choose a visual style preset (if applicable)' },
      { id: 'cn-5', label: 'Attach LoRA models (if applicable)' },
      { id: 'cn-6', label: 'Apply a Brand Kit (if applicable)' },
      { id: 'cn-7', label: 'Select voice (for TTS/voiceover nodes)' },
      { id: 'cn-8', label: 'Set error handling mode (Stop / Skip / Retry)' },
      { id: 'cn-9', label: 'Confirm "Connected" banners on wired ports' },
    ],
  },
  {
    id: 'variables',
    title: 'Flow Variables',
    icon: 'Variable',
    items: [
      { id: 'fv-1', label: 'Open the Variables panel (toolbar button)' },
      { id: 'fv-2', label: 'Add key-value variables (e.g., brand_name)' },
      { id: 'fv-3', label: 'Reference variables in config fields using {{variable_name}}' },
      { id: 'fv-4', label: 'Verify variables resolve correctly (check Dry Run output)' },
    ],
  },
  {
    id: 'campaign-wizard',
    title: 'Campaign Wizard (Optional)',
    icon: 'Rocket',
    items: [
      { id: 'cw-1', label: 'Click "+ New Campaign" from Flows dashboard' },
      { id: 'cw-2', label: 'Name your campaign' },
      { id: 'cw-3', label: 'Select a Brand Kit' },
      { id: 'cw-4', label: 'Toggle context modules (Brand Identity, Content Guidelines, LoRA Models, etc.)' },
      { id: 'cw-5', label: 'Preview module data (expand arrows)' },
      { id: 'cw-6', label: 'Click "Generate Workspace"' },
      { id: 'cw-7', label: 'Verify source nodes appear on the canvas with per-field output ports' },
    ],
  },
  {
    id: 'preflight',
    title: 'Preflight & Dry Run',
    icon: 'FlaskConical',
    items: [
      { id: 'pf-1', label: 'Click "Dry Run" to test without API calls' },
      { id: 'pf-2', label: 'Review resolved inputs and mock outputs' },
      { id: 'pf-3', label: 'Click "Run Flow" to trigger Preflight Check' },
      { id: 'pf-4', label: 'All checks green (no empty flow, inputs connected, types compatible, no cycles)' },
      { id: 'pf-5', label: 'Publishing nodes have valid OAuth tokens' },
      { id: 'pf-6', label: 'Review estimated cost breakdown' },
      { id: 'pf-7', label: 'Fix any red errors before proceeding' },
    ],
  },
  {
    id: 'execution',
    title: 'Execution',
    icon: 'Zap',
    items: [
      { id: 'ex-1', label: 'Confirm run in the Preflight modal' },
      { id: 'ex-2', label: 'Watch live node status (blue=running, green=completed, red=failed)' },
      { id: 'ex-3', label: 'Monitor the Execution Log at the bottom' },
      { id: 'ex-4', label: 'Review output previews on completed nodes' },
    ],
  },
  {
    id: 'error-handling',
    title: 'Error Handling & Recovery',
    icon: 'AlertTriangle',
    items: [
      { id: 'eh-1', label: 'Read actionable error messages on failed nodes' },
      { id: 'eh-2', label: 'Use "Resume" to retry from the failed node (keeps completed results)' },
      { id: 'eh-3', label: 'Use "Pause" to freeze execution (in-progress nodes finish first)' },
      { id: 'eh-4', label: 'Use "Cancel" to abort immediately' },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    icon: 'GitBranch',
    items: [
      { id: 'af-1', label: 'Use Iterator + Aggregator for parallel per-item processing' },
      { id: 'af-2', label: 'Use Split node for multi-platform publishing' },
      { id: 'af-3', label: 'Use Merge node to synchronize parallel branches' },
      { id: 'af-4', label: 'Use Run Flow node to chain sub-flows' },
      { id: 'af-5', label: 'Set up a Schedule for recurring execution' },
      { id: 'af-6', label: 'Share the flow\'s input page (/flows/:id/input)' },
    ],
  },
];

const ICON_MAP = {
  Layers, Play, Settings2, Variable, Rocket, FlaskConical, Zap, AlertTriangle, GitBranch,
};

const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ChecklistFlowsPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const reset = useCallback(() => {
    setChecked({});
  }, []);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/flows')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Flows Checklist</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{completedCount} of {totalItems} completed</p>
          </div>
          {/* Progress bar */}
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2C666E] rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums w-10 text-right">{pct}%</span>
          <button
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Reset all"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {completedCount === totalItems && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">All done! You've completed every step in the Flows tool.</p>
          </div>
        )}

        {SECTIONS.map((section) => {
          const Icon = ICON_MAP[section.icon] || Layers;
          const sectionDone = section.items.every((item) => checked[item.id]);
          const sectionCount = section.items.filter((item) => checked[item.id]).length;

          return (
            <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
              {/* Section header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{section.title}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  sectionDone
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {sectionCount}/{section.items.length}
                </span>
              </div>

              {/* Checklist items */}
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {section.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[#2C666E] focus:ring-[#2C666E] dark:bg-gray-800 shrink-0"
                      />
                      <span className={`text-sm leading-relaxed ${
                        isChecked
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
