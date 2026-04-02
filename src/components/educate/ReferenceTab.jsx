import React, { useState, useRef } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { REFERENCE_CATEGORIES } from './referenceData.js';
import TerminalSimulator from './TerminalSimulator.jsx';

export default function ReferenceTab() {
  const [query, setQuery] = useState('');
  // All categories expanded by default
  const [expandedCategories, setExpandedCategories] = useState(() =>
    Object.fromEntries(REFERENCE_CATEGORIES.map((c) => [c.name, true]))
  );
  // Track expand state before a search so we can restore it
  const preSearchExpanded = useRef(null);
  // Key: `${categoryName}::${command}` — the one open "Try it" terminal
  const [openTerminal, setOpenTerminal] = useState(null);

  // ── Search filter ─────────────────────────────────────────────────────────

  const lowerQuery = query.toLowerCase().trim();

  const filteredCategories = REFERENCE_CATEGORIES.map((cat) => {
    if (!lowerQuery) return { ...cat, matchedEntries: cat.entries };
    const matchedEntries = cat.entries.filter(
      (e) =>
        e.command.toLowerCase().includes(lowerQuery) ||
        e.description.toLowerCase().includes(lowerQuery)
    );
    return { ...cat, matchedEntries };
  }).filter((cat) => !lowerQuery || cat.matchedEntries.length > 0);

  const noResults = lowerQuery && filteredCategories.length === 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleQueryChange(e) {
    const val = e.target.value;

    if (val.trim() && !query.trim()) {
      // Entering search — snapshot current expand state and auto-expand matching categories
      preSearchExpanded.current = { ...expandedCategories };
    }

    if (!val.trim() && query.trim()) {
      // Clearing search — restore prior expand state
      if (preSearchExpanded.current) {
        setExpandedCategories(preSearchExpanded.current);
        preSearchExpanded.current = null;
      }
    }

    setQuery(val);

    if (val.trim()) {
      // Auto-expand categories that have matches
      const lower = val.toLowerCase().trim();
      const next = {};
      REFERENCE_CATEGORIES.forEach((cat) => {
        const hasMatch = cat.entries.some(
          (e) =>
            e.command.toLowerCase().includes(lower) ||
            e.description.toLowerCase().includes(lower)
        );
        next[cat.name] = hasMatch;
      });
      setExpandedCategories(next);
    }
  }

  function toggleCategory(name) {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function handleTryIt(catName, entry) {
    const key = `${catName}::${entry.command}`;
    setOpenTerminal((prev) => (prev === key ? null : key));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search commands..."
          className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 w-full focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* No results */}
      {noResults && (
        <p className="text-gray-500 text-sm px-1">
          No results for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Category sections */}
      <div className="flex flex-col gap-2">
        {filteredCategories.map((cat) => {
          const isExpanded = !!expandedCategories[cat.name];
          const entries = cat.matchedEntries;

          return (
            <div key={cat.name} className="rounded-lg overflow-hidden border border-gray-700/50">
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.name)}
                className="px-4 py-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 flex items-center justify-between w-full text-left"
              >
                <span className="text-white text-sm font-medium">
                  {cat.name}{' '}
                  <span className="text-gray-500 font-normal">({entries.length})</span>
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>

              {/* Entry rows */}
              {isExpanded && (
                <div className="divide-y divide-gray-700/50">
                  {entries.map((entry) => {
                    const terminalKey = `${cat.name}::${entry.command}`;
                    const terminalOpen = openTerminal === terminalKey;

                    return (
                      <div key={entry.command} className="bg-gray-900/40">
                        {/* Row */}
                        <div className="flex items-center gap-4 px-4 py-2.5">
                          <span
                            className="font-mono text-teal-400 text-sm shrink-0"
                            style={{ width: 250, minWidth: 250 }}
                          >
                            {entry.command}
                          </span>
                          <span className="text-gray-300 text-sm flex-1">
                            {entry.description}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTryIt(cat.name, entry)}
                            className="text-xs text-gray-500 hover:text-teal-400 cursor-pointer whitespace-nowrap transition-colors"
                          >
                            {terminalOpen ? 'Close ×' : 'Try it →'}
                          </button>
                        </div>

                        {/* Inline terminal */}
                        {terminalOpen && (
                          <div className="px-4 pb-3">
                            <div className="max-h-[250px] overflow-hidden rounded-lg">
                              <TerminalSimulator
                                initialPath="/home/stuarta/project"
                                preloadedCommands={[entry.tryCommand]}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
