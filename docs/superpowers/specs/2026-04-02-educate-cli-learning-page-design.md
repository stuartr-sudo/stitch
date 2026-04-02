# CLI Learning Page — Design Spec

**Date:** 2026-04-02
**Route:** `/educate`
**Auth:** `ProtectedRoute` (login required)
**Navigation:** Not linked from any sidebar or nav — direct URL access only
**Route Registration:** Add to `src/App.jsx` as `<Route path="/educate" element={<ProtectedRoute><EducatePage /></ProtectedRoute>} />`

## Overview

A single-page interactive CLI learning tool with three tabs: **Learn**, **Practice**, **Reference**. All content and state lives in the frontend — no backend API endpoints or database tables needed. Progress stored in `localStorage` under key `stitch-educate-progress`.

Content is populated **incrementally** — ship with Module 1 (CLI Fundamentals) fully fleshed out. Modules 2-4 can be added in follow-up passes. The data structure supports this naturally since lessons/challenges/references are arrays.

## File Structure

```
src/pages/EducatePage.jsx          — Main page with tab switching, progress state
src/components/educate/
  TerminalSimulator.jsx            — Fake terminal component (shared by Learn + Practice)
  terminalFileSystem.js            — Simulated filesystem (JS object tree)
  terminalCommands.js              — Command parser + output generators
  LearnTab.jsx                     — Lesson browser with module/lesson navigation
  lessonData.js                    — All lesson content (explanations, examples, exercises)
  PracticeTab.jsx                  — Quiz/challenge interface with scoring
  challengeData.js                 — All challenge definitions (MCQ, type-command, multi-step)
  ReferenceTab.jsx                 — Searchable cheat sheet
  referenceData.js                 — All command reference entries
```

## Terminal Simulator Component

### Appearance
- Dark background (`bg-gray-900`), rounded corners, subtle border
- Monospace font (system monospace stack)
- Prompt: `stuarta@stitch ~ %` (updates path segment after `cd`). Hardcoded username — this is a learning tool, not a production terminal.
- Green command text, white output text, red error text, yellow hints
- Blinking cursor
- On screens below 640px width, show a banner: "Best experienced on desktop — terminal needs room to breathe"

### Capabilities
- Accepts typed keyboard input
- Parses commands against a known set (~35 commands)
- Maintains state: current working directory, command history
- Simulated filesystem: nested JS object (see Initial Filesystem section)
- Up/down arrow keys for command history navigation
- `clear` command to reset terminal output
- Unrecognized commands show: `command not found: <cmd>. Try 'help' for available commands.`

### Initial Simulated Filesystem

```
/home/stuarta/
├── .bashrc                    (contains "# Shell config file")
├── .gitconfig                 (contains "[user]\n  name = Stuart\n  email = stuart@stitch.io")
├── project/
│   ├── .git/                  (marker directory — exists but not navigable)
│   ├── .env                   (contains "VITE_SUPABASE_URL=https://example.supabase.co\nFAL_KEY=sk-test-123")
│   ├── package.json           (contains realistic package.json with scripts)
│   ├── server.js              (contains "import express from 'express';\nconst app = express();\n// ... 45 lines ...")
│   ├── README.md              (contains "# My Project\n\nA full-stack video app.")
│   ├── src/
│   │   ├── App.jsx            (contains realistic React component, ~20 lines)
│   │   ├── main.jsx           (contains "import React from 'react';\nimport App from './App';")
│   │   └── components/
│   │       ├── Header.jsx     (contains simple component)
│   │       └── Footer.jsx     (contains simple component)
│   ├── api/
│   │   ├── users.js           (contains export default handler)
│   │   └── health.js          (contains simple health check)
│   └── docs/
│       ├── setup.md           (contains setup instructions)
│       └── api-reference.md   (contains API docs)
├── notes/
│   ├── todo.txt               (contains "- Fix header bug\n- Deploy to production\n- Update API docs")
│   └── meeting-notes.txt      (contains "Q1 Review: Revenue up 23%. Deploy target: March 15.")
└── templates/
    ├── proposal-template.md   (contains proposal boilerplate)
    └── report-template.md     (contains report boilerplate)
```

### Initial Simulated Git State

The simulated git state for `/home/stuarta/project/`:

```
Branches: main (current), feature/header-redesign
Last 5 commits (git log --oneline):
  a1b2c3d  Fix header responsive layout
  e4f5g6h  Add API health endpoint
  i7j8k9l  Update README with setup steps
  m0n1o2p  Initial project setup
  q3r4s5t  First commit

Staged files: (none initially)
Modified files: src/App.jsx (simulated diff: changed a className)
Untracked files: notes/scratch.txt

git diff output (for src/App.jsx):
  - <div className="app-container">
  + <div className="app-container flex flex-col min-h-screen">
```

State mutates when the user runs `git add`, `git commit`, `git checkout -b`, etc. After `git add src/App.jsx`, it moves to staged. After `git commit`, staged clears and a new entry appears in the log.

### Supported Commands

**Navigation & inspection:**
- `pwd` — print simulated working directory
- `cd <path>` — change directory (supports `.`, `..`, absolute, relative)
- `ls` — list files/folders in current directory
- `ls -la` / `ls -al` — list with hidden files + details (shows permissions as `-rw-r--r--`, dirs as `drwxr-xr-x`, simulated sizes and dates)
- `cat <file>` — print file contents
- `head -N <file>` — first N lines (default 10)
- `tail -N <file>` — last N lines (default 10)
- `less <file>` — alias for `cat` with a note: "(In a real terminal, less lets you scroll. Here it shows the full file.)"

**File operations:**
- `mkdir <name>` — create directory in simulated filesystem
- `touch <name>` — create empty file in simulated filesystem
- `cp <src> <dest>` — copy file
- `mv <src> <dest>` — rename/move file
- `rm <file>` — delete file (prints: "Deleted <file>. (In a real terminal, this is permanent — no undo!)")
- `rm -rf <dir>` — delete directory (prints: "Deleted <dir>/ and all contents. (WARNING: In a real terminal, rm -rf is irreversible. Never run on folders you're unsure about.)")
- `chmod` — explanation-only: prints "chmod changes file permissions. Example: chmod 755 script.sh makes it executable. (Not simulated — permissions are display-only here.)"

**Search:**
- `find . -name "<pattern>"` — find files matching pattern in simulated filesystem (supports `*` glob)
- `grep "<term>" <file>` — search within a file's simulated content, return matching lines
- `grep -r "<term>" .` — recursive search across all files from current directory

**Operators:**
- `&&` — run second command only if first succeeds (both commands parsed and executed sequentially)
- `|` — pipe: supported combinations are `ls | grep <term>`, `cat <file> | grep <term>`, `cat <file> | head -N`, `cat <file> | tail -N`. Other pipe chains print: "Pipe not supported for this combination in the simulator."
- `>` — redirect: `echo "text" > file` creates/overwrites file in simulated filesystem. `cat file > newfile` copies content. Other sources print: "Redirect not supported for this combination in the simulator."
- `>>` — append: `echo "text" >> file` appends to file. Same limitations as `>`.
- `;` — run commands sequentially regardless of success (both parsed and executed)

**Git (simulated — mutates git state):**
- `git status` — show current branch, staged/modified/untracked from simulated state
- `git log` / `git log --oneline` / `git log --oneline -N` — show simulated commit history
- `git add <file>` — move file from modified/untracked to staged
- `git commit -m "<msg>"` — create new commit entry from staged files, clear staged
- `git branch` — list branches (current marked with `*`)
- `git checkout -b <name>` — create and switch to new branch
- `git checkout <branch>` — switch branch
- `git merge <branch>` — simulated: prints "Merged <branch> into <current>. (Fast-forward)"
- `git diff` — show simulated diff for modified files
- `git clone` — explanation-only: prints "git clone <url> copies a remote repo to your machine. (Not simulated — there's no network here.)"
- `git blame <file>` — show simulated blame output (commit hash + author + line)
- `git push` — prints "Pushed to origin/<branch>. (Simulated — no real remote.)"
- `git pull` — prints "Already up to date. (Simulated — no real remote.)"
- `git stash` — explanation-only: prints "git stash temporarily shelves changes. git stash pop restores them. (Not simulated.)"

**Claude Code (informational — all print help text):**
- `claude` / `claude --help` — show all flags with descriptions
- `claude -w "name"` — explain worktree mode with example
- `claude --agent <name>` — explain agent mode, mention `.claude/agents/`
- `claude --add-dir <path>` — explain multi-directory access
- `claude --teleport` — explain mobile-to-desktop resume
- `claude --bare` — explain minimal mode
- `claude -p "question"` — explain one-shot mode
- All `/slash` commands (`/branch`, `/btw`, `/batch`, `/loop`, `/schedule`, `/update-config`) — print description + syntax example

**Dev tooling (informational — all print help text):**
- `npm install` / `npm run dev` / `npm run build` — explain what each does
- `docker build` / `docker run` — explain basics
- `ssh` / `ssh-keygen` — explain basics
- `fly deploy` / `fly logs` / `fly status` — explain Fly.io commands
- `node --version` — prints "v20.11.0"
- `npm --version` — prints "10.2.4"

**Utilities:**
- `clear` — clear terminal output
- `echo <text>` — print text (supports `> file` and `>> file` redirect)
- `whoami` — print `stuarta`
- `help` — list all available commands grouped by category
- `man <command>` — print detailed help for a specific command

### Props
- `initialPath` — starting directory (default `/home/stuarta`)
- `availableCommands` — optional whitelist to restrict which commands work (for focused lesson exercises)
- `onCommandExecuted(result)` — callback receiving `{ command: string, output: string, valid: boolean, args: string[] }`. Used by Practice tab to validate answers.
- `preloadedCommands` — optional array of commands to auto-run on mount (for Reference "Try it")

## Learn Tab

### Layout
- Left panel: module list with progress indicators (checkmarks, progress bar per module)
- Right panel: active lesson content
- Modules 2-4 show a "Coming Soon" badge if lessons aren't yet populated

### Modules & Lessons

**Module 1: CLI Fundamentals** (7 lessons)
1. Where Am I? — `pwd`, `cd`, `ls`
2. Reading Files — `cat`, `head`, `tail`, `less`
3. Finding Things — `find`, `grep`
4. Creating & Moving — `mkdir`, `touch`, `cp`, `mv`
5. Deleting Safely — `rm`, `rm -rf`, why to be careful
6. Operators & Chaining — `&&`, `|`, `>`, `>>`, `;`
7. Permissions — `chmod`, `ls -la` output explained (explanation-only for chmod, terminal exercise focuses on reading `ls -la` output)

**Module 2: Git Essentials** (7 lessons)
1. What Is Git? — mental model (snapshots, not diffs)
2. Status & History — `git status`, `git log`
3. Staging & Committing — `git add`, `git commit`
4. Branches — `git branch`, `git checkout`, `git merge`
5. Remote Work — `git push`, `git pull`, `git clone`
6. Reading Diffs — `git diff`, `git blame`
7. Resolving Conflicts — what they look like, how to fix (explanation-only, no terminal exercise)

**Module 3: Claude Code CLI** (8 lessons)
1. Starting Sessions — `claude`, basic flags
2. Worktrees — `claude -w "name"`
3. Named Agents — `claude --agent <name>`, `.claude/agents/`
4. Multi-Directory — `claude --add-dir`
5. Mobile & Teleport — `--teleport`, `/remote-control`
6. Session Tools — `/branch`, `/btw`
7. Parallel Execution — `/batch`, how it plans + dispatches
8. Automation — `/loop`, `/schedule`, `/update-config`, hooks

**Module 4: Dev Tooling** (5 lessons)
1. npm Basics — `npm install`, `npm run`, `package.json`
2. Environment Variables — `.env`, `process.env`, `VITE_` prefix
3. Docker Concepts — `Dockerfile`, `docker build`, `docker run`
4. SSH Basics — `ssh`, key generation, `~/.ssh/config`
5. Fly.io Deployment — `fly deploy`, `fly logs`, `fly status`

### Lesson Format
Each lesson contains:
1. **Title + estimated time** (e.g., "Where Am I? — 3 min")
2. **Explanation** — 2-3 short paragraphs, plain English
3. **Example block** — command + expected output in a styled code block
4. **Try It** — embedded `TerminalSimulator` scoped to relevant commands via `availableCommands` prop
5. **Mark Complete button** — saves to localStorage, updates progress bar

### Progress State (localStorage)
```json
{
  "version": 1,
  "completedLessons": ["cli-1", "cli-2", "git-1"],
  "practiceScores": { "beginner": 45, "intermediate": 22, "advanced": 8 },
  "practiceStreak": 3,
  "lastVisited": "2026-04-02T10:30:00Z"
}
```

On load, check `version` field. If missing or outdated, migrate gracefully (keep completed lessons, reset scores if schema changed).

## Practice Tab

### Layout
- Difficulty selector at top: Beginner / Intermediate / Advanced
- Challenge card in the center
- Score + streak display in top-right corner
- "Random Challenge" button
- "Next" button after answering

### Difficulty Tiers

**Beginner — Multiple Choice** (~20 challenges)
- Task description in plain English
- 4 options, one correct
- Immediate feedback: correct answer highlighted green, wrong highlighted red with short explanation
- Example: "List all files including hidden ones" → options: `ls`, `ls -la`, `dir`, `find .`

**Intermediate — Type the Command** (~25 challenges)
- Task description in plain English
- Terminal simulator input (single command)
- Validation: each challenge defines an `acceptedAnswers` array of strings. User input is trimmed, collapsed to single spaces, and matched case-sensitively against the array. Example: `acceptedAnswers: ["ls -la", "ls -al", "ls -lA"]`
- 3 attempts: first wrong shows generic hint, second shows specific hint, third shows answer
- Example: "Show the last 5 commits, one per line" → `acceptedAnswers: ["git log --oneline -5", "git log -5 --oneline"]`

**Advanced — Multi-Step Scenarios** (~15 challenges)
- Scenario description (e.g., "You need to create a feature branch, make a change, commit, and push")
- Terminal simulator that validates each step. Each step has its own `acceptedAnswers` array.
- State carries between steps via the terminal simulator's internal state
- Shows step counter: "Step 2 of 4"
- Example: "Set up a new Claude Code worktree for a proposal, add a reference directory, and start working"

### Scoring
- Correct on first attempt: 3 points
- Second attempt: 2 points
- Third attempt: 1 point
- Shown answer: 0 points
- Running total per difficulty tier in localStorage
- Streak counter: consecutive first-attempt correct answers

## Reference Tab

### Layout
- Search input at top (full-width, with search icon)
- Results grouped by category with collapsible section headers
- Each entry is a row

### Entry Format
```
[command in monospace]     [one-line description]     [Try it →]
```
- "Try it" button opens a small inline terminal pre-loaded with that command
- Commands that are explanation-only (docker, ssh, etc.) show "Try it" but the terminal prints the informational help text — still useful for seeing the syntax
- Search filters in real-time against both command text and description text

### Categories
- **Navigation** — `pwd`, `cd`, `ls`, `ls -la`
- **File Reading** — `cat`, `head`, `tail`, `less`
- **File Operations** — `mkdir`, `touch`, `cp`, `mv`, `rm`, `chmod`
- **Search** — `find`, `grep`, `grep -r`
- **Operators** — `&&`, `|`, `>`, `>>`, `;`
- **Git Basics** — `status`, `log`, `add`, `commit`, `push`, `pull`, `clone`
- **Git Branching** — `branch`, `checkout`, `merge`
- **Git Advanced** — `diff`, `blame`, `stash`
- **Claude Code Flags** — `-w`, `--agent`, `--add-dir`, `--teleport`, `--bare`, `-p`
- **Claude Code Sessions** — `/branch`, `/btw`, `/batch`, `/loop`, `/schedule`, `/update-config`
- **npm** — `install`, `run`, `init`
- **Docker** — `build`, `run`, `ps`, `logs`
- **SSH** — `ssh`, `ssh-keygen`
- **Fly.io** — `deploy`, `logs`, `status`, `secrets`

~80 entries total. Every entry maps to a command defined in the Supported Commands section.

## Styling

- Consistent with the app: `bg-gray-950` page background, `bg-gray-900` card backgrounds
- Tab bar uses existing pattern (underline active tab, gray inactive)
- Terminal simulator is the visual centerpiece — styled to look like a real macOS Terminal.app
- Lesson text uses readable sizing (base-16, leading-relaxed)
- Progress indicators use the app's teal accent (`#2C666E`)
- Optimized for desktop. Below 640px, terminal shows mobile warning banner but remains functional.

## What's NOT Included
- No backend API endpoints
- No database tables
- No sidebar/nav link (hidden page, direct URL only)
- No sharing or multi-user features
- No real shell execution — everything is simulated
- No tab completion (removed — adds complexity without teaching value)
