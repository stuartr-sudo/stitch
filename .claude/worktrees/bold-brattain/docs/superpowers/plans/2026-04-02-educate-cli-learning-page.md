# CLI Learning Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive CLI learning page at `/educate` with a fake terminal simulator, guided lessons, quiz challenges, and a searchable command reference.

**Architecture:** Single protected React page (`EducatePage.jsx`) with three tabs (Learn, Practice, Reference). A shared `TerminalSimulator` component simulates a macOS terminal with a virtual filesystem and ~55 commands. All data lives in JS data files — no backend needed.

**Tech Stack:** React 18, Tailwind CSS, Radix UI primitives, localStorage for progress persistence.

**Spec:** `docs/superpowers/specs/2026-04-02-educate-cli-learning-page-design.md`

---

### Task 1: Simulated Filesystem Data

**Files:**
- Create: `src/components/educate/terminalFileSystem.js`

- [ ] **Step 1: Create the filesystem data structure**

Create `src/components/educate/terminalFileSystem.js` exporting `createFileSystem()` that returns a deep-cloneable nested object. Structure from spec:

```js
// Each node: { type: 'dir', children: {} } or { type: 'file', content: '...' }
// Hidden files start with '.' — ls shows them only with -a/-la flag
export function createFileSystem() {
  return {
    type: 'dir',
    children: {
      home: {
        type: 'dir',
        children: {
          stuarta: {
            type: 'dir',
            children: {
              '.bashrc': { type: 'file', content: '# Shell config file' },
              '.gitconfig': { type: 'file', content: '[user]\n  name = Stuart\n  email = stuart@stitch.io' },
              project: {
                type: 'dir',
                children: {
                  '.git': { type: 'dir', children: {} },
                  '.env': { type: 'file', content: 'VITE_SUPABASE_URL=https://example.supabase.co\nFAL_KEY=sk-test-123' },
                  'package.json': { type: 'file', content: '{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "start": "node server.js",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "react": "^18.2.0",\n    "express": "^4.18.2",\n    "tailwindcss": "^3.4.0"\n  }\n}' },
                  'server.js': { type: 'file', content: "import express from 'express';\nconst app = express();\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'ok' });\n});\n\napp.listen(3003, () => {\n  console.log('Server running on port 3003');\n});" },
                  'README.md': { type: 'file', content: '# My Project\n\nA full-stack video app.\n\n## Setup\n\n1. npm install\n2. npm run dev\n\n## Architecture\n\nReact frontend + Express API backend.' },
                  src: { type: 'dir', children: {
                    'App.jsx': { type: 'file', content: "import React from 'react';\nimport Header from './components/Header';\nimport Footer from './components/Footer';\n\nexport default function App() {\n  return (\n    <div className=\"app-container\">\n      <Header />\n      <main className=\"flex-1 p-4\">\n        <h1>Welcome to My App</h1>\n      </main>\n      <Footer />\n    </div>\n  );\n}" },
                    'main.jsx': { type: 'file', content: "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);" },
                    components: { type: 'dir', children: {
                      'Header.jsx': { type: 'file', content: "export default function Header() {\n  return <header className=\"bg-gray-900 text-white p-4\">My App</header>;\n}" },
                      'Footer.jsx': { type: 'file', content: "export default function Footer() {\n  return <footer className=\"bg-gray-100 p-4 text-center\">© 2026</footer>;\n}" },
                    }},
                  }},
                  api: { type: 'dir', children: {
                    'users.js': { type: 'file', content: "export default async function handler(req, res) {\n  const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];\n  res.json(users);\n}" },
                    'health.js': { type: 'file', content: "export default async function handler(req, res) {\n  res.json({ status: 'healthy', uptime: process.uptime() });\n}" },
                  }},
                  docs: { type: 'dir', children: {
                    'setup.md': { type: 'file', content: '# Setup Guide\n\n1. Clone the repo\n2. Run npm install\n3. Copy .env.example to .env\n4. Run npm run dev' },
                    'api-reference.md': { type: 'file', content: '# API Reference\n\n## GET /api/health\nReturns server health status.\n\n## GET /api/users\nReturns list of users.' },
                  }},
                }
              },
              notes: { type: 'dir', children: {
                'todo.txt': { type: 'file', content: '- Fix header bug\n- Deploy to production\n- Update API docs' },
                'meeting-notes.txt': { type: 'file', content: 'Q1 Review: Revenue up 23%. Deploy target: March 15.\nAction items:\n- Stuart: finalize API docs\n- Team: code freeze Friday' },
              }},
              templates: { type: 'dir', children: {
                'proposal-template.md': { type: 'file', content: '# Proposal: [Project Name]\n\n## Overview\n[Brief description]\n\n## Scope\n[Deliverables]\n\n## Timeline\n[Milestones]\n\n## Budget\n[Cost breakdown]' },
                'report-template.md': { type: 'file', content: '# Report: [Title]\n\n## Summary\n[Key findings]\n\n## Details\n[Analysis]\n\n## Recommendations\n[Next steps]' },
              }},
            }
          }
        }
      }
    }
  };
}

// Helper: resolve a path to a node in the filesystem
export function resolvePath(fs, cwd, path) { /* ... */ }

// Helper: list directory contents
export function listDir(node, showHidden) { /* ... */ }
```

Also export helper functions:
- `resolvePath(fs, cwd, targetPath)` — resolves relative/absolute path to a filesystem node. Returns `{ node, absolutePath }` or `null` if not found.
- `listDir(dirNode, showHidden)` — returns sorted array of `{ name, type, hidden }` entries. Dirs first, then files. Hidden files (starting with `.`) only included if `showHidden` is true.
- `getFileContent(fs, cwd, filePath)` — resolves path and returns content string or error.
- `deepClone(obj)` — structuredClone wrapper for resetting filesystem.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/terminalFileSystem.js
git commit -m "feat(educate): add simulated filesystem data and helpers"
```

---

### Task 2: Terminal Command Parser

**Files:**
- Create: `src/components/educate/terminalCommands.js`

- [ ] **Step 1: Create the command registry and parser**

Create `src/components/educate/terminalCommands.js`. This file exports:

1. `parseInput(input)` — splits input on `&&`, `|`, `;`, `>`, `>>` operators. Returns array of `{ command, args, operator }` segments.
2. `executeCommand(segment, state)` — takes a parsed segment + terminal state, returns `{ output: string, newState: object }`. State includes `{ fs, cwd, gitState, history }`.
3. `createInitialGitState()` — returns the initial git state object from spec (branches, commits, staged, modified, untracked).

Command implementations (each is a function in a `COMMANDS` map):

**Navigation:** `pwd`, `cd`, `ls` (with `-la`/`-al`/`-a` flags), `cat`, `head`, `tail`, `less`
**File ops:** `mkdir`, `touch`, `cp`, `mv`, `rm` (with `-rf` flag), `chmod` (explanation-only)
**Search:** `find` (with `-name` flag), `grep` (with `-r` flag)
**Git:** `git` subcommand dispatcher for `status`, `log`, `add`, `commit`, `branch`, `checkout`, `merge`, `diff`, `clone`, `blame`, `push`, `pull`, `stash`
**Claude:** `claude` flag dispatcher for `--help`, `-w`, `--agent`, `--add-dir`, `--teleport`, `--bare`, `-p`, slash commands
**Dev tools:** `npm` (`install`, `run`, `init`), `docker` (`build`, `run`, `ps`, `logs`), `ssh`, `ssh-keygen`, `fly` (`deploy`, `logs`, `status`, `secrets`), `node`
**Utilities:** `clear`, `echo`, `whoami`, `help`, `man`

Pipe handling: after parsing `|`, check if the combination is in the supported set (`ls|grep`, `cat|grep`, `cat|head`, `cat|tail`). If supported, feed first command's output as input to second. Otherwise return the "not supported" message.

Redirect handling: after parsing `>` or `>>`, check if source is `echo` or `cat`. If so, write/append to target file in filesystem. Otherwise return "not supported" message.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/terminalCommands.js
git commit -m "feat(educate): add terminal command parser and ~55 command implementations"
```

---

### Task 3: Terminal Simulator Component

**Files:**
- Create: `src/components/educate/TerminalSimulator.jsx`

- [ ] **Step 1: Build the terminal UI component**

Create `src/components/educate/TerminalSimulator.jsx`. Props per spec:
- `initialPath` (default `/home/stuarta`)
- `availableCommands` (optional string array whitelist)
- `onCommandExecuted` (optional callback: `{ command, output, valid, args }`)
- `preloadedCommands` (optional string array to auto-run on mount)

Internal state:
- `lines` — array of `{ type: 'input'|'output'|'error'|'hint', text }` for rendering
- `currentInput` — string being typed
- `fs` — cloned filesystem from `createFileSystem()`
- `cwd` — current working directory string
- `gitState` — from `createInitialGitState()`
- `commandHistory` — array of past commands
- `historyIndex` — for up/down arrow navigation

Rendering:
- Outer div: `bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm`
- Top bar: three dots (red/yellow/green circles) + title "Terminal" — macOS style
- Scrollable output area with ref for auto-scroll to bottom
- Each line colored by type: input=green, output=white, error=red, hint=yellow
- Prompt line: `stuarta@stitch <shortPath> %` where shortPath is last segment of cwd (or `~` for home)
- Blinking cursor: CSS animation `@keyframes blink { 50% { opacity: 0 } }` on a `|` character after the input text
- Hidden input element that captures keystrokes (focused on click anywhere in terminal)
- Mobile banner: below 640px show `text-yellow-400 text-xs` banner at top

Key handlers:
- Enter: parse + execute, push to lines, call `onCommandExecuted` if provided, reset input
- ArrowUp/Down: navigate command history
- If `availableCommands` is set and command not in whitelist: show "This command isn't available in this exercise. Try: [list]"

On mount: if `preloadedCommands` provided, execute each sequentially and render output.

`clear` command: reset `lines` to empty array.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/TerminalSimulator.jsx
git commit -m "feat(educate): add TerminalSimulator component with fake macOS terminal UI"
```

---

### Task 4: Lesson Data (Module 1 — CLI Fundamentals)

**Files:**
- Create: `src/components/educate/lessonData.js`

- [ ] **Step 1: Create lesson data structure with Module 1 content**

Create `src/components/educate/lessonData.js` exporting `MODULES` array. Each module has `id`, `title`, `icon` (lucide icon name), `lessons[]`. Each lesson has `id`, `title`, `time` (minutes), `explanation` (string, supports newlines), `examples` (array of `{ command, output }`), `availableCommands` (string array for terminal whitelist), `comingSoon` (boolean, default false).

Populate all 7 lessons for Module 1: CLI Fundamentals. Write clear, friendly explanations (2-3 short paragraphs each) with realistic examples that work against the simulated filesystem.

Modules 2-4: include module metadata (title, icon, id) with `comingSoon: true` and empty `lessons: []`. These will be populated in follow-up work.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/lessonData.js
git commit -m "feat(educate): add lesson data with Module 1 CLI Fundamentals (7 lessons)"
```

---

### Task 5: Learn Tab Component

**Files:**
- Create: `src/components/educate/LearnTab.jsx`

- [ ] **Step 1: Build the Learn tab with module/lesson navigation**

Create `src/components/educate/LearnTab.jsx`. Props: `progress` (object from localStorage), `onMarkComplete(lessonId)` callback.

Layout:
- Left panel (w-64, fixed): list of modules. Each shows icon + title + progress bar (completed/total lessons) + checkmark if all done. Coming Soon modules show a gray badge and are not clickable.
- Right panel (flex-1, scrollable): active lesson content.

Lesson rendering:
1. Title + time estimate in header
2. Explanation paragraphs (whitespace-pre-line for newlines)
3. Example blocks: styled `bg-gray-800 rounded p-3 font-mono text-sm` with command in green, output in gray
4. "Try It Yourself" section with embedded `<TerminalSimulator availableCommands={lesson.availableCommands} />`
5. "Mark Complete" button (teal accent `bg-[#2C666E]`, white text). If already completed, show "Completed" with checkmark, still clickable to un-complete.

Default state: first incomplete lesson in first module selected.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/LearnTab.jsx
git commit -m "feat(educate): add LearnTab with module navigation and lesson rendering"
```

---

### Task 6: Challenge Data

**Files:**
- Create: `src/components/educate/challengeData.js`

- [ ] **Step 1: Create challenge data for all three difficulty tiers**

Create `src/components/educate/challengeData.js` exporting `CHALLENGES` object with three arrays: `beginner`, `intermediate`, `advanced`.

**Beginner** (~20 MCQ): each has `id`, `question` (string), `options` (4 strings), `correctIndex` (0-3), `explanation` (why the right answer is right).

**Intermediate** (~25 type-command): each has `id`, `question`, `acceptedAnswers` (string array), `hint1` (generic), `hint2` (specific), `answer` (shown after 3 failures).

**Advanced** (~15 multi-step): each has `id`, `scenario` (string), `steps[]` where each step has `instruction`, `acceptedAnswers`, `hint`.

Cover all four topic areas proportionally: CLI (~40%), Git (~30%), Claude Code (~20%), Dev Tools (~10%).

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/challengeData.js
git commit -m "feat(educate): add challenge data — 20 MCQ, 25 type-command, 15 multi-step"
```

---

### Task 7: Practice Tab Component

**Files:**
- Create: `src/components/educate/PracticeTab.jsx`

- [ ] **Step 1: Build the Practice tab with quiz interface**

Create `src/components/educate/PracticeTab.jsx`. Props: `progress` (object), `onUpdateScores(tier, points)` callback, `onUpdateStreak(newStreak)` callback.

Layout:
- Top bar: three difficulty buttons (Beginner/Intermediate/Advanced) styled as pill toggles. Active = teal bg. Score display right-aligned: "Score: 45 | Streak: 3 🔥"
- Center: challenge card (`bg-gray-800 rounded-xl p-6`)
- Bottom: "Random Challenge" button (shuffles tier + picks random) and "Next" button (next in current tier)

**Beginner mode:**
- Show question text
- Four option buttons in a 2x2 grid
- On click: if correct → green bg + "Correct!" + explanation. If wrong → red bg + show correct answer + explanation.
- Score awarded immediately.

**Intermediate mode:**
- Show question text
- Embedded `TerminalSimulator` with `onCommandExecuted` callback
- On command entered: trim, collapse spaces, match against `acceptedAnswers`
- Track attempts (1-3). After each wrong attempt show appropriate hint. After 3rd, show answer.
- Score based on attempt number.

**Advanced mode:**
- Show scenario text + step counter ("Step 1 of 4")
- Embedded `TerminalSimulator` with persistent state between steps
- Each step validated via `onCommandExecuted`. On correct → advance step + show next instruction. On wrong → show hint.
- Score awarded on scenario completion (average of per-step attempts).

After answering, "Next" button enables.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/PracticeTab.jsx
git commit -m "feat(educate): add PracticeTab with MCQ, type-command, and multi-step modes"
```

---

### Task 8: Reference Data

**Files:**
- Create: `src/components/educate/referenceData.js`

- [ ] **Step 1: Create reference entries for all categories**

Create `src/components/educate/referenceData.js` exporting `REFERENCE_CATEGORIES` array. Each category has `name`, `entries[]`. Each entry has `command` (monospace display string), `description` (one line), `tryCommand` (string to pre-load in terminal).

~80 entries across 14 categories per spec (plus a 15th "Utilities" category for `help`, `man`, `echo`, `whoami`, `clear`). Every command maps to something defined in `terminalCommands.js`.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/referenceData.js
git commit -m "feat(educate): add reference data — ~80 entries across 15 categories"
```

---

### Task 9: Reference Tab Component

**Files:**
- Create: `src/components/educate/ReferenceTab.jsx`

- [ ] **Step 1: Build the Reference tab with search and "Try it"**

Create `src/components/educate/ReferenceTab.jsx`. No props needed (reads from `referenceData.js` directly).

Layout:
- Search input at top: full width, `bg-gray-800 border-gray-700`, search icon (lucide `Search`), placeholder "Search commands..."
- Results area: collapsible category sections. Each section header shows category name + entry count. Click to expand/collapse. All expanded by default, collapse when search is active and category has no matches.
- Each entry row: `font-mono text-teal-400` command | `text-gray-300` description | `text-xs text-gray-500 hover:text-teal-400 cursor-pointer` "Try it →"
- Clicking "Try it" opens a small `TerminalSimulator` below the entry (inline expand, not a modal) with `preloadedCommands={[entry.tryCommand]}`. Click again or click another "Try it" to close.

Search: filter on every keystroke. Match against `command` and `description` (case-insensitive). Hide categories with zero matches. Show "No results for '...'" if nothing matches.

- [ ] **Step 2: Commit**

```bash
git add src/components/educate/ReferenceTab.jsx
git commit -m "feat(educate): add ReferenceTab with search and inline terminal preview"
```

---

### Task 10: Main Page + Route Registration

**Files:**
- Create: `src/pages/EducatePage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create the EducatePage with tab switching and progress**

Create `src/pages/EducatePage.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { Terminal, BookOpen, Trophy, Search } from 'lucide-react';
import LearnTab from '@/components/educate/LearnTab';
import PracticeTab from '@/components/educate/PracticeTab';
import ReferenceTab from '@/components/educate/ReferenceTab';
```

State:
- `activeTab` — 'learn' | 'practice' | 'reference' (default 'learn')
- `progress` — loaded from localStorage on mount, saved on every change

localStorage helpers:
```js
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
    const data = JSON.parse(raw);
    if (!data.version) return { ...DEFAULT_PROGRESS, completedLessons: data.completedLessons || [] };
    return data;
  } catch { return { ...DEFAULT_PROGRESS }; }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...progress, lastVisited: new Date().toISOString() }));
}
```

Layout:
- Page bg: `bg-gray-950 min-h-screen text-white`
- Header: "CLI Learning Lab" title with Terminal icon, overall progress summary (X/27 lessons, total practice score)
- Tab bar: three tabs with icons (BookOpen=Learn, Trophy=Practice, Search=Reference). Active tab: `border-b-2 border-[#2C666E] text-white`. Inactive: `text-gray-500 hover:text-gray-300`.
- Tab content area below, renders the active tab component.

Callbacks passed to tabs:
- `onMarkComplete(lessonId)` — toggles lesson in completedLessons array, saves
- `onUpdateScores(tier, points)` — adds points to tier score, saves
- `onUpdateStreak(newStreak)` — updates streak, saves

- [ ] **Step 2: Register the route in App.jsx**

In `src/App.jsx`:
- Add import: `import EducatePage from './pages/EducatePage';`
- Add route before the catch-all `<Route path="*" ...>`:
```jsx
<Route
  path="/educate"
  element={
    <ProtectedRoute>
      <EducatePage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/EducatePage.jsx src/App.jsx
git commit -m "feat(educate): add EducatePage with tabs, progress persistence, and route"
```

---

### Task 11: Lesson Data — Modules 2-4

**Files:**
- Modify: `src/components/educate/lessonData.js`

- [ ] **Step 1: Populate Module 2 (Git Essentials) lessons**

Add 7 lessons to the Git Essentials module. Each with clear explanations, examples using the simulated git state, and `availableCommands` whitelists targeting git commands.

- [ ] **Step 2: Populate Module 3 (Claude Code CLI) lessons**

Add 8 lessons. These are informational — terminal exercises show help text output when claude commands are typed. Explanations should cover the concepts from the YouTube video (worktrees as separate desks, teleport for mobile-to-desktop, etc.).

- [ ] **Step 3: Populate Module 4 (Dev Tooling) lessons**

Add 5 lessons. Informational — terminal exercises show help text. Explanations cover npm, env vars (with the VITE_ prefix gotcha), Docker concepts, SSH basics, Fly.io deployment.

- [ ] **Step 4: Remove comingSoon flags**

Set `comingSoon: false` on Modules 2-4 now that they have content.

- [ ] **Step 5: Commit**

```bash
git add src/components/educate/lessonData.js
git commit -m "feat(educate): add lessons for Git, Claude Code CLI, and Dev Tooling modules"
```

---

### Task 12: Visual Polish + Verification

**Files:**
- Modify: Various educate component files as needed

- [ ] **Step 1: Start dev server and navigate to /educate**

Run `npm run start` and open `http://localhost:4390/educate` (must be logged in).

- [ ] **Step 2: Verify Learn tab**

Check: module list renders with progress bars, clicking a lesson shows content, terminal simulator works for exercises, "Mark Complete" toggles and persists on page refresh.

- [ ] **Step 3: Verify Practice tab**

Check: difficulty toggle works, beginner MCQ shows questions with clickable options and feedback, intermediate shows terminal input with hint progression, scoring updates and persists.

- [ ] **Step 4: Verify Reference tab**

Check: all categories render with entries, search filters in real-time, "Try it" opens inline terminal with pre-loaded command, clicking another "Try it" closes the previous one.

- [ ] **Step 5: Verify terminal simulator core**

Check: `pwd`, `cd`, `ls`, `ls -la`, `cat`, `grep`, `mkdir`, `touch`, `rm` all work. Git commands mutate state (add → commit → log shows new entry). Command history with up/down arrows works. `clear` works. Unrecognized commands show helpful message.

- [ ] **Step 6: Fix any issues found**

Address visual, functional, or UX issues discovered during verification.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(educate): polish and fixes from verification pass"
```

---

### Task 13: Final Commit + Deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to Fly.io**

```bash
fly deploy
```

- [ ] **Step 3: Verify on production**

Navigate to `https://stitchstudios.app/educate` while logged in. Quick smoke test: load page, try each tab, type a command in the terminal.
