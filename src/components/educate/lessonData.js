/**
 * lessonData.js
 * Learning module definitions for the CLI learning page.
 *
 * Each lesson has:
 *   - id, title, time (minutes)
 *   - explanation: plain-English teaching text (paragraphs separated by \n\n)
 *   - examples: array of { command, output } pairs shown to the learner
 *   - availableCommands: whitelist of commands usable in the terminal exercise
 */

export const MODULES = [
  // ─────────────────────────────────────────────────────────────────
  // Module 1: CLI Fundamentals
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'cli',
    title: 'CLI Fundamentals',
    icon: 'Terminal',
    comingSoon: false,
    lessons: [
      // ── Lesson 1 ──────────────────────────────────────────────────
      {
        id: 'cli-1',
        title: 'Where Am I?',
        time: 3,
        explanation:
          "The terminal might look empty, but you're always standing somewhere inside your computer's folder structure — just like browsing files in Finder or Explorer. The command `pwd` (print working directory) tells you exactly where you are. When you open a terminal it usually drops you in your home folder, so `pwd` will show something like `/home/stuarta`.\n\n`cd` (change directory) is how you move around. Type `cd project` to step into a folder called \"project\", or `cd ..` to go up one level to the parent folder. You can also jump straight to any path: `cd /home/stuarta/notes` takes you there in one go, no matter where you currently are.\n\nOnce you're somewhere interesting, `ls` lists everything inside the current folder. You'll see subdirectories and files side by side. Don't worry — you can't break anything by looking around! Try a few `cd` and `ls` commands and get comfortable moving through the filesystem.",
        examples: [
          { command: 'pwd', output: '/home/stuarta' },
          { command: 'cd project', output: '' },
          { command: 'pwd', output: '/home/stuarta/project' },
          { command: 'ls', output: 'api  docs  src  .env  package.json  README.md  server.js' },
          { command: 'cd src', output: '' },
          { command: 'ls', output: 'components  App.jsx  main.jsx' },
        ],
        availableCommands: ['pwd', 'cd', 'ls'],
      },

      // ── Lesson 2 ──────────────────────────────────────────────────
      {
        id: 'cli-2',
        title: 'Reading Files',
        time: 3,
        explanation:
          "Once you've found a file you want to look at, there are a few handy ways to read it. The simplest is `cat` — it dumps the entire file contents straight into your terminal. Great for short files like config files or notes, but if the file is long it'll scroll right past you.\n\nFor long files, `head` and `tail` are your friends. `head -5 server.js` shows the first 5 lines, so you can quickly see what a file is about without printing the whole thing. `tail -3 README.md` shows the last 3 lines — really useful for checking log files where the newest entries are at the bottom.\n\nIf you want to scroll through a large file interactively, `less` opens it in a pager — press the spacebar to go forward a page, `b` to go back, and `q` to quit. In our simulator you can try `cat` and `head`/`tail` to get comfortable reading files without leaving the terminal.",
        examples: [
          { command: 'cat .env', output: 'VITE_SUPABASE_URL=https://example.supabase.co\nFAL_KEY=sk-test-123' },
          { command: 'head -5 server.js', output: "import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 3003;\n" },
          { command: 'tail -3 README.md', output: 'API routes live in `api/`. Frontend source is in `src/`.' },
          { command: 'cat notes/todo.txt', output: 'TODO\n====\n[ ] Finish API integration tests\n[ ] Update README with deployment instructions\n[ ] Review pull request from Alice' },
        ],
        availableCommands: ['pwd', 'cd', 'ls', 'cat', 'head', 'tail', 'less'],
      },

      // ── Lesson 3 ──────────────────────────────────────────────────
      {
        id: 'cli-3',
        title: 'Finding Things',
        time: 4,
        explanation:
          "As projects grow, remembering where every file lives gets hard. `find` searches by filename. You give it a starting directory and a pattern: `find . -name \"*.jsx\"` looks inside the current folder (`.`) for any file whose name ends in `.jsx`. The `*` is a wildcard that matches anything. You can also search by type, size, or date — but name is the most common use.\n\n`grep` is different — it searches inside files for a word or phrase. `grep \"express\" server.js` prints every line in `server.js` that contains the word \"express\". Add `-r` to search recursively through all files in a folder: `grep -r \"import\" src` will show every line containing \"import\" across your whole `src/` directory.\n\nCombine them and you become a file-finding superpower. Forgot where you defined a function called `handleUpload`? Run `grep -r \"handleUpload\" .` and the terminal will point you straight to it — no need to click through folders one by one.",
        examples: [
          { command: 'find . -name "*.jsx"', output: './src/App.jsx\n./src/main.jsx\n./src/components/Header.jsx\n./src/components/Footer.jsx' },
          { command: 'grep "express" server.js', output: "import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 3003;" },
          { command: 'grep -r "import" src', output: "src/App.jsx:import React from 'react';\nsrc/App.jsx:import Header from './components/Header';\nsrc/App.jsx:import Footer from './components/Footer';\nsrc/main.jsx:import React from 'react';\nsrc/main.jsx:import ReactDOM from 'react-dom/client';\nsrc/main.jsx:import App from './App';\nsrc/main.jsx:import './index.css';" },
          { command: 'grep "status" api/health.js', output: '  res.json({\n    status: \'ok\',' },
        ],
        availableCommands: ['pwd', 'cd', 'ls', 'cat', 'find', 'grep'],
      },

      // ── Lesson 4 ──────────────────────────────────────────────────
      {
        id: 'cli-4',
        title: 'Creating & Moving',
        time: 3,
        explanation:
          "Creating new files and folders from the terminal is fast once you know the commands. `mkdir` makes a new directory — `mkdir experiments` creates a folder called \"experiments\" right where you're standing. Add `-p` if you want to create nested folders in one go: `mkdir -p src/components/forms` creates all three levels at once.\n\n`touch` creates an empty file (or updates the timestamp if it already exists). `touch notes.txt` gives you a blank file ready to write to. It sounds odd but it's one of the most-used commands when starting new work.\n\nTo copy something, use `cp source destination`: `cp README.md README.backup.md` makes a duplicate. To move or rename, use `mv`: `mv old-name.txt new-name.txt` renames the file in place, and `mv file.txt archive/` moves it into the `archive/` folder. Neither `cp` nor `mv` asks for confirmation, so double-check your paths before pressing Enter!",
        examples: [
          { command: 'mkdir experiments', output: '' },
          { command: 'ls', output: 'api  docs  experiments  src  .env  package.json  README.md  server.js' },
          { command: 'touch experiments/notes.txt', output: '' },
          { command: 'cp README.md README.backup.md', output: '' },
          { command: 'mv README.backup.md docs/README.backup.md', output: '' },
          { command: 'ls docs', output: 'README.backup.md  api-reference.md  setup.md' },
        ],
        availableCommands: ['pwd', 'cd', 'ls', 'cat', 'mkdir', 'touch', 'cp', 'mv'],
      },

      // ── Lesson 5 ──────────────────────────────────────────────────
      {
        id: 'cli-5',
        title: 'Deleting Safely',
        time: 2,
        explanation:
          "Deleting from the terminal is permanent — there's no Recycle Bin, no undo, no second chance. So it's worth learning the commands carefully before using them on real files.\n\n`rm filename` deletes a single file immediately. To delete a whole directory and everything inside it, you need `rm -rf foldername`. The `-r` flag means \"recursive\" (go into every subfolder) and `-f` means \"force\" (don't ask for confirmation). That combination is powerful and irreversible, so always read your command twice before pressing Enter.\n\nIn this simulator you can practise freely — nothing here is real, so explore without worry! In your actual projects, a good habit is to `ls` the folder first so you can see exactly what's in it, then run `rm` only when you're sure. When in doubt, move the file somewhere else with `mv` rather than deleting it straight away.",
        examples: [
          { command: 'ls experiments', output: 'notes.txt' },
          { command: 'rm experiments/notes.txt', output: '' },
          { command: 'ls experiments', output: '' },
          { command: 'rm -rf experiments', output: '' },
          { command: 'ls', output: 'api  docs  src  .env  package.json  README.md  server.js' },
        ],
        availableCommands: ['pwd', 'cd', 'ls', 'cat', 'mkdir', 'touch', 'rm'],
      },

      // ── Lesson 6 ──────────────────────────────────────────────────
      {
        id: 'cli-6',
        title: 'Operators & Chaining',
        time: 4,
        explanation:
          "One of the terminal's superpowers is combining commands so they work together. `&&` runs a second command only if the first one succeeded. For example, `npm install && npm run dev` installs your packages and — if that worked — immediately starts the dev server. If `npm install` fails, the second command is skipped automatically.\n\nThe pipe `|` connects commands in a different way: it feeds the output of one command into the input of the next. `cat server.js | grep \"import\"` first reads the file, then filters those lines through `grep`. You can chain as many pipes as you like: `cat server.js | grep \"app\" | head -5` reads, filters, then shows only the first 5 matching lines.\n\n`>` and `>>` redirect output into a file instead of printing it to the screen. `echo \"hello\" > greeting.txt` creates (or overwrites) a file with that text. `>>` appends instead of overwriting, so `echo \"world\" >> greeting.txt` adds a second line without touching the first. The semicolon `;` runs commands one after another regardless of success — useful when you want both to run even if one fails.",
        examples: [
          { command: 'ls && echo "Listed successfully"', output: 'api  docs  src  .env  package.json  README.md  server.js\nListed successfully' },
          { command: 'cat server.js | grep "app"', output: "const app = express();\napp.use(express.json());\napp.get('/api/health', (req, res) => {\napp.listen(PORT, () => console.log(`Server running on port ${PORT}`));" },
          { command: 'echo "# My notes" > notes/scratch.txt', output: '' },
          { command: 'echo "- item one" >> notes/scratch.txt', output: '' },
          { command: 'cat notes/scratch.txt', output: '# My notes\n- item one' },
        ],
        availableCommands: ['pwd', 'cd', 'ls', 'cat', 'echo', 'grep', 'head', 'tail'],
      },

      // ── Lesson 7 ──────────────────────────────────────────────────
      {
        id: 'cli-7',
        title: 'Permissions',
        time: 3,
        explanation:
          "Every file and folder on a Unix system has permissions that control who can read, write, or execute it. You can see these by running `ls -la` — the `-l` flag gives a detailed list and `-a` includes hidden files (the ones whose names start with a dot).\n\nThe permissions column looks like `-rwxr-xr--`. The first character is `-` for a file or `d` for a directory. Then there are three groups of three characters (rwx): the first group is what the owner can do, the second is the group, the third is everyone else. `r` = read, `w` = write, `x` = execute. A dash means that permission is not granted.\n\n`chmod` changes permissions. The quickest way is with numbers: `chmod 755 script.sh` sets owner=rwx (7), group=rx (5), others=rx (5). You'll mostly need `chmod +x filename` to make a script executable — that's the one you'll reach for most often in day-to-day development.",
        examples: [
          {
            command: 'ls -la',
            output:
              'total 48\ndrwxr-xr-x  7 stuarta staff  224 Apr  2 09:00 .\ndrwxr-xr-x  5 stuarta staff  160 Apr  2 09:00 ..\ndrwxr-xr-x  2 stuarta staff   64 Apr  2 09:00 .git\n-rw-r--r--  1 stuarta staff   54 Apr  2 09:00 .env\n-rw-r--r--  1 stuarta staff  512 Apr  2 09:00 package.json\n-rw-r--r--  1 stuarta staff  892 Apr  2 09:00 README.md\n-rw-r--r--  1 stuarta staff  312 Apr  2 09:00 server.js\ndrwxr-xr-x  4 stuarta staff  128 Apr  2 09:00 api\ndrwxr-xr-x  3 stuarta staff   96 Apr  2 09:00 docs\ndrwxr-xr-x  4 stuarta staff  128 Apr  2 09:00 src',
          },
          {
            command: 'ls -la src',
            output:
              'total 24\ndrwxr-xr-x  4 stuarta staff  128 Apr  2 09:00 .\ndrwxr-xr-x  7 stuarta staff  224 Apr  2 09:00 ..\ndrwxr-xr-x  2 stuarta staff   64 Apr  2 09:00 components\n-rw-r--r--  1 stuarta staff  420 Apr  2 09:00 App.jsx\n-rw-r--r--  1 stuarta staff  185 Apr  2 09:00 main.jsx',
          },
        ],
        availableCommands: ['pwd', 'cd', 'ls', 'cat', 'chmod'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Module 2: Git Essentials
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'git',
    title: 'Git Essentials',
    icon: 'GitBranch',
    comingSoon: false,
    lessons: [
      // ── Lesson 1 ──────────────────────────────────────────────────
      {
        id: 'git-1',
        title: 'What Is Git?',
        time: 3,
        explanation:
          "Git is a version control system — think of it as a time machine for your code. Every time you tell Git to save your work, it takes a snapshot of every file in your project. These snapshots are called commits. If you ever break something, you can wind back to any earlier snapshot with a single command.\n\nA repository (or \"repo\") is just a folder that Git is keeping an eye on. When you run `git init` inside a folder, Git starts tracking it. If you join an existing project, you get the whole repo — every commit, every branch, the full history — not just the latest files.\n\nPicture commits as save points in a video game. You can keep playing forward from the latest save, or teleport back to any earlier point to see exactly how the code looked then. Run `git log --oneline` to see the list of save points for this project.",
        examples: [
          {
            command: 'git log --oneline',
            output:
              'd7ac99e feat: add SFX controls in Step 2\nd8cc2d1 feat: add sfx workbench action\n27040fb feat: add generateSoundEffect()\nce91cc0 Add Sound Effects implementation plan\n8504637 Fix spec review blockers',
          },
          {
            command: 'git log --oneline -3',
            output:
              'd7ac99e feat: add SFX controls in Step 2\nd8cc2d1 feat: add sfx workbench action\n27040fb feat: add generateSoundEffect()',
          },
        ],
        availableCommands: ['git'],
      },

      // ── Lesson 2 ──────────────────────────────────────────────────
      {
        id: 'git-2',
        title: 'Status & History',
        time: 3,
        explanation:
          "Two commands you'll use constantly are `git status` and `git log`. Between them they answer the two most common questions: \"what have I changed right now?\" and \"what happened before?\"\n\n`git status` shows the current state of your working directory. Files fall into three buckets: modified (you changed a tracked file), staged (changes you've queued up for the next commit), and untracked (new files Git doesn't know about yet). When you're unsure what's going on in a repo, `git status` is always the right first step.\n\n`git log` lists every commit in reverse chronological order — newest first. The default output is a bit verbose, so most people use `git log --oneline` to get a compact one-line-per-commit view. Add a number like `-5` to limit how many commits you see.",
        examples: [
          {
            command: 'git status',
            output:
              'On branch main\nYour branch is up to date with \'origin/main\'.\n\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n\n\tmodified:   src/App.jsx\n\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n\n\tupload-images.js\n\nno changes added to commit (use "git add" and/or "git commit -a")',
          },
          {
            command: 'git log --oneline',
            output:
              'd7ac99e feat: add SFX controls in Step 2\nd8cc2d1 feat: add sfx workbench action\n27040fb feat: add generateSoundEffect()\nce91cc0 Add Sound Effects implementation plan\n8504637 Fix spec review blockers',
          },
          {
            command: 'git log --oneline -3',
            output:
              'd7ac99e feat: add SFX controls in Step 2\nd8cc2d1 feat: add sfx workbench action\n27040fb feat: add generateSoundEffect()',
          },
        ],
        availableCommands: ['git'],
      },

      // ── Lesson 3 ──────────────────────────────────────────────────
      {
        id: 'git-3',
        title: 'Staging & Committing',
        time: 4,
        explanation:
          "Saving work in Git is a deliberate two-step process: first you stage changes, then you commit them. This might feel like extra effort at first, but it gives you a lot of control — you can pick exactly which changes belong in one commit, and leave the rest for later.\n\nStaging is like putting items into a box before sealing it. `git add src/App.jsx` puts that file's changes in the box. You can add one file, a folder, or multiple files — just keep adding until the box contains exactly what you want. Then `git commit -m \"your message here\"` seals the box and labels it. The message should explain why you made the change, not just what you changed.\n\nGood commit messages make your history easy to read later. A simple convention: start with a short verb phrase — \"add login form\", \"fix image upload bug\", \"remove unused styles\". Keep it under 72 characters and future you will be grateful.",
        examples: [
          {
            command: 'git add src/App.jsx',
            output: '',
          },
          {
            command: 'git status',
            output:
              'On branch main\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n\n\tmodified:   src/App.jsx',
          },
          {
            command: 'git commit -m "fix: resolve header layout on mobile"',
            output:
              '[main a1b2c3d] fix: resolve header layout on mobile\n 1 file changed, 4 insertions(+), 2 deletions(-)',
          },
        ],
        availableCommands: ['git'],
      },

      // ── Lesson 4 ──────────────────────────────────────────────────
      {
        id: 'git-4',
        title: 'Branches',
        time: 4,
        explanation:
          "A branch is a parallel timeline for your code. The default branch is usually called `main` — that's your stable, production-ready history. When you want to try something new (a feature, a bug fix, an experiment), you create a new branch. Your changes live there without touching `main` until you're ready to merge them in.\n\nThink of branches like parallel universes. You can flip between them freely, and each one has its own independent history from the point it was created. `git branch` lists all your branches and shows you which one you're on. `git checkout -b feature/dark-mode` creates a new branch and switches to it in one step.\n\nTo go back to main — or any other branch — use `git checkout main`. Once your work on a branch is ready, `git merge feature/dark-mode` (run from main) brings the changes across. Try listing branches and switching between them below.",
        examples: [
          {
            command: 'git branch',
            output: '* main\n  feature/sfx-controls\n  fix/audio-timing',
          },
          {
            command: 'git checkout -b feature/dark-mode',
            output: "Switched to a new branch 'feature/dark-mode'",
          },
          {
            command: 'git branch',
            output: '  main\n  feature/sfx-controls\n  fix/audio-timing\n* feature/dark-mode',
          },
          {
            command: 'git checkout main',
            output: "Switched to branch 'main'\nYour branch is up to date with 'origin/main'.",
          },
        ],
        availableCommands: ['git'],
      },

      // ── Lesson 5 ──────────────────────────────────────────────────
      {
        id: 'git-5',
        title: 'Remote Work',
        time: 3,
        explanation:
          "So far everything has been local — commits only exist on your machine. A remote is a shared copy of the repo that lives on a server (like GitHub). Pushing and pulling keep your local copy and the remote in sync.\n\n`git push` sends your new commits up to the remote so your teammates (or just future-you on another machine) can see them. `git pull` does the opposite — it downloads any commits others have pushed since you last synced and merges them into your current branch. Get into the habit of pulling before you start a session to avoid surprises.\n\n`git clone <url>` is how you get a repo onto your machine for the first time. It copies the full history, not just the latest files. You only need to clone once — after that, `git pull` keeps you up to date. The URL comes from the repo's GitHub page.",
        examples: [
          {
            command: 'git push',
            output:
              'Enumerating objects: 5, done.\nCounting objects: 100% (5/5), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (3/3), done.\nWriting objects: 100% (3/3), 892 bytes | 892.00 KiB/s, done.\nTo github.com:stuarta/stitch.git\n   d7ac99e..a1b2c3d  main -> main',
          },
          {
            command: 'git pull',
            output:
              "remote: Enumerating objects: 3, done.\nremote: Counting objects: 100% (3/3), done.\nremote: Compressing objects: 100% (2/2), done.\nUnpacking objects: 100% (2/2), done.\nFrom github.com:stuarta/stitch\n   a1b2c3d..e4f5g6h  main -> origin/main\nUpdating a1b2c3d..e4f5g6h\nFast-forward\n src/App.jsx | 4 ++--\n 1 file changed, 2 insertions(+), 2 deletions(-)",
          },
        ],
        availableCommands: ['git'],
      },

      // ── Lesson 6 ──────────────────────────────────────────────────
      {
        id: 'git-6',
        title: 'Reading Diffs',
        time: 3,
        explanation:
          "A diff shows exactly what changed between two states — line by line. Lines starting with `+` were added, lines starting with `-` were removed. Everything else is unchanged context to help you find your bearings in the file.\n\n`git diff` shows the difference between your working directory and the last commit — in other words, changes you haven't staged yet. It's your preview of what would go into the next commit. If you've already staged something, `git diff --staged` shows staged changes instead.\n\n`git blame` is different — instead of showing what changed, it shows who last touched each line of a file, and in which commit. It's invaluable when you find a mysterious line of code and want to know the context around when it was written. Just run `git blame src/App.jsx` and every line gets annotated with the commit hash, author, and date.",
        examples: [
          {
            command: 'git diff',
            output:
              'diff --git a/src/App.jsx b/src/App.jsx\nindex 3a1f2b4..9c8d0e1 100644\n--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -12,7 +12,7 @@ export default function App() {\n   return (\n-    <div className="bg-white">\n+    <div className="bg-gray-50">\n       <Header />\n       <main>{children}</main>',
          },
          {
            command: 'git blame src/App.jsx',
            output:
              'd7ac99e (stuarta 2026-04-02 09:00:00) import React from \'react\';\nd8cc2d1 (stuarta 2026-04-01 14:32:10) import Header from \'./components/Header\';\n27040fb (alice   2026-03-28 11:15:43) import Footer from \'./components/Footer\';\nce91cc0 (stuarta 2026-03-25 09:55:02) \n8504637 (stuarta 2026-03-25 09:55:02) export default function App() {',
          },
        ],
        availableCommands: ['git'],
      },

      // ── Lesson 7 ──────────────────────────────────────────────────
      {
        id: 'git-7',
        title: 'Resolving Conflicts',
        time: 3,
        explanation:
          "A merge conflict happens when two branches both changed the same part of the same file. Git doesn't know which version to keep, so it pauses and asks you to decide. This sounds scary, but it's completely normal — every developer deals with conflicts regularly.\n\nWhen a conflict occurs, Git marks the file like this:\n\n```\n<<<<<<< HEAD\nconst timeout = 5000;\n=======\nconst timeout = 3000;\n>>>>>>> feature/faster-api\n```\n\nEverything between `<<<<<<< HEAD` and `=======` is your version. Everything between `=======` and `>>>>>>>` is the incoming change. Your job is to edit the file to the correct final state — maybe you keep one version, maybe you combine them — then delete all the marker lines.\n\nOnce you've resolved every conflict in the file, stage it with `git add filename` and then run `git commit` to finish the merge. Most code editors (VS Code, Cursor) have visual merge tools that highlight the conflict sections and let you click \"accept mine\" or \"accept theirs\" without manually editing the markers.",
        examples: [],
        availableCommands: [],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Module 3: Claude Code CLI
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'claude',
    title: 'Claude Code CLI',
    icon: 'Sparkles',
    comingSoon: false,
    lessons: [
      // ── Lesson 1 ──────────────────────────────────────────────────
      {
        id: 'claude-1',
        title: 'Starting Sessions',
        time: 2,
        explanation:
          "Claude Code is an AI coding assistant that lives in your terminal. Just typing `claude` opens an interactive session — Claude can read your files, run commands, write code, and have a conversation about your project, all without leaving the terminal.\n\nIf you're ever unsure what flags are available, `claude --help` prints a quick reference. You'll see options for worktrees, agents, adding directories, and more — all the things we'll cover in this module.\n\nThe simplest way to start is to `cd` into your project folder and run `claude`. From there you can describe what you want: \"add a dark mode toggle\", \"explain this function\", \"fix the bug on line 42\". Claude sees your project just like you do.",
        examples: [
          {
            command: 'claude --help',
            output:
              'Claude Code — AI pair programmer in your terminal\n\nUsage: claude [options]\n\nOptions:\n  -w, --worktree <name>    Open in a named git worktree\n  --agent <name>           Start with a named agent personality\n  --add-dir <path>         Add an extra directory to context\n  --teleport               Resume a session started on another device\n  --bare                   Minimal UI (useful for scripting)\n  -p, --print <prompt>     Run a single prompt non-interactively\n\nSession tools (use inside a session):\n  /branch     Start a side-quest branch without polluting context\n  /btw        Add a quick aside mid-task\n  /batch      Run mass operations across many files\n  /loop       Repeat a task on an interval while terminal is open\n  /schedule   Set up cloud-based recurring tasks\n\nRun "claude" with no arguments to start an interactive session.',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 2 ──────────────────────────────────────────────────
      {
        id: 'claude-2',
        title: 'Worktrees',
        time: 3,
        explanation:
          "Imagine you have three separate desks, each with a different set of documents spread out on them. You can walk between desks without packing anything away — whatever you left on each desk stays exactly as you left it. Git worktrees work the same way: each worktree is a separate checkout of your repo, on a separate branch, in a separate folder.\n\n`claude -w \"proposal\"` opens a Claude session inside a named worktree. If a worktree with that name doesn't exist yet, Claude creates one for you on a fresh branch. Now Claude can work on the proposal feature without touching your main branch at all — you can even keep your main Claude session running at the same time on a different desk.\n\nWorktrees shine when you're juggling multiple tasks. Fix a hot bug in one worktree while a big refactor runs in another. Each session has its own isolated file state, so there's no risk of one bleeding into the other.",
        examples: [
          {
            command: 'claude -w "proposal"',
            output:
              'Creating worktree "proposal" on branch worktree/proposal...\nWorktree ready at /home/stuarta/project/.worktrees/proposal\n\nStarting Claude session in worktree: proposal\nBranch: worktree/proposal\n\nClaude: I\'m set up in the "proposal" worktree. What would you like to work on?',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 3 ──────────────────────────────────────────────────
      {
        id: 'claude-3',
        title: 'Named Agents',
        time: 3,
        explanation:
          "A named agent is a pre-built Claude personality tailored for a specific job. Agents live as Markdown files inside `.claude/agents/` in your project. Each file defines a name, a description of what the agent does, which tools it can use, and a system prompt that shapes its behaviour.\n\nFor example, a `proposal-writer` agent might be instructed to always write in a formal tone, focus on business outcomes, and never touch code files. A `test-generator` agent knows to write Jest tests, follow your naming conventions, and ask for coverage targets upfront.\n\n`claude --agent proposal-writer` boots Claude with that agent's configuration already loaded. No need to re-explain the context every session. Teams use this to encode institutional knowledge — the agent already knows your style guide, preferred libraries, and what \"done\" looks like for that task type.",
        examples: [
          {
            command: 'claude --agent proposal-writer',
            output:
              'Loading agent: proposal-writer\nAgent description: Writes formal client proposals with business-focused language\nTools: read, write (docs/ only), web_search\n\nClaude (proposal-writer): Ready to draft your proposal. What\'s the client name and project scope?',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 4 ──────────────────────────────────────────────────
      {
        id: 'claude-4',
        title: 'Multi-Directory',
        time: 2,
        explanation:
          "By default, Claude can only see files inside the directory you started the session from. But many real projects are spread across multiple folders — a frontend repo, a shared component library, a design tokens folder, a separate API repo. `--add-dir` lets you bring extra directories into Claude's view.\n\n`claude --add-dir ../templates --add-dir ../brand-assets` starts a session where Claude can read from your main project and both those extra folders. It can copy a template from `../templates`, apply brand colours from `../brand-assets`, and write the output into your current project — all in one session.\n\nYou can stack as many `--add-dir` flags as you need. Claude treats all the directories as part of the same context, so it can compare files across them, reference shared code, or identify inconsistencies between projects.",
        examples: [
          {
            command: 'claude --add-dir ../templates',
            output:
              'Adding directory to context: /home/stuarta/templates\n\nClaude: I can now see files in both your project and /home/stuarta/templates. What would you like to work on?',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 5 ──────────────────────────────────────────────────
      {
        id: 'claude-5',
        title: 'Mobile & Teleport',
        time: 3,
        explanation:
          "One of the most convenient Claude Code features is the ability to hand off a session between devices. Start a task on your desktop, then pick it up on your phone while you're away from your desk — or vice versa.\n\n`claude --teleport` resumes a session that was started on a different device. Claude restores the full conversation context so you can continue exactly where you left off without repeating yourself. It's especially useful for long-running tasks: kick off a big refactor on your laptop before a commute, then check in on progress and give guidance from your phone.\n\nNaming your sessions helps enormously when you're managing several at once. A session called \"dark-mode-refactor\" is a lot easier to identify than a random ID. You can also start from your phone and pick up on your desktop — the handoff works in both directions.",
        examples: [
          {
            command: 'claude --teleport',
            output:
              'Scanning for active remote sessions...\n\nFound 2 sessions:\n  1. dark-mode-refactor    (started 2h ago on MacBook Pro)\n  2. api-v2-migration      (started yesterday on MacBook Pro)\n\nEnter session number to resume, or press Enter to start new: ',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 6 ──────────────────────────────────────────────────
      {
        id: 'claude-6',
        title: 'Session Tools',
        time: 3,
        explanation:
          "Inside a Claude session, a handful of slash commands let you manage context and focus without starting over. Two of the most useful are `/branch` and `/btw`.\n\n`/branch` starts a side-quest. Maybe you're halfway through a feature and notice a small bug you want to fix first. Instead of mentioning it in the same conversation (which muddies the context for the original task), you open a branch. Claude handles the side task in an isolated context, then closes it and returns you to the original conversation when it's done.\n\n`/btw` is for quick asides — things you want Claude to know but don't want to derail the current task. \"Oh, /btw, we're deploying to Fly.io, not Vercel\" or \"btw the API returns camelCase not snake_case\". Claude notes it and carries on without losing its place. Try typing `/branch` or `/btw` in the terminal below to see the help text.",
        examples: [
          {
            command: '/branch',
            output:
              'Usage: /branch <description>\n\nStart an isolated side-task without polluting the current conversation context.\nClaude will complete the branch task, then return you to where you were.\n\nExample: /branch fix the missing semicolon in api/health.js',
          },
          {
            command: '/btw',
            output:
              'Usage: /btw <note>\n\nAdd a quick contextual note mid-task. Claude will acknowledge it and continue.\nUseful for sharing constraints or corrections without derailing focus.\n\nExample: /btw we use Tailwind v4 not v3',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 7 ──────────────────────────────────────────────────
      {
        id: 'claude-7',
        title: 'Parallel Execution',
        time: 3,
        explanation:
          "Some tasks aren't one big job — they're the same smaller job repeated across many files. Writing tests for every component, adding JSDoc comments to every function, translating every string in a codebase. Doing these one at a time is tedious and slow. `/batch` is designed exactly for this.\n\nWhen you run `/batch`, Claude first creates a plan: it identifies every file that needs work and breaks the job into independent units. Then it dispatches multiple worker agents in parallel, each handling one unit. What might take an hour sequentially can finish in minutes.\n\nBe aware that batch jobs are token-intensive — each worker agent runs its own context. It's worth confirming Claude's plan before it dispatches workers, especially on large codebases. Use `/batch` for well-defined, repeatable tasks rather than open-ended exploration.",
        examples: [
          {
            command: '/batch',
            output:
              'Usage: /batch <task description>\n\nRun a task in parallel across multiple files using worker agents.\nClaude will generate a plan first — you confirm before workers are dispatched.\n\nBest for: adding tests, writing docs, applying consistent refactors\nNote: token-intensive — each worker runs its own full context\n\nExample: /batch add JSDoc comments to every function in src/lib/',
          },
        ],
        availableCommands: ['claude'],
      },

      // ── Lesson 8 ──────────────────────────────────────────────────
      {
        id: 'claude-8',
        title: 'Automation',
        time: 4,
        explanation:
          "Claude Code has several ways to automate recurring work so you don't have to remember to do it yourself.\n\n`/loop` runs a task on a repeating interval while your terminal is open. Great for polling a build status, checking a queue, or running a linter sweep every few minutes during active development. It stops when you close the terminal.\n\n`/schedule` goes further — it sets up a cloud-based recurring task that runs even when your laptop is closed. Define what you want Claude to do, how often, and it'll happen in the background and notify you of results.\n\n`/update-config` lets you tune Claude's behaviour for the session or permanently — things like preferred code style, default tool permissions, or which files to ignore. And hooks let you trigger Claude automatically on events, like running a code review every time you push to a branch. Try the commands below to see their help text.",
        examples: [
          {
            command: '/loop',
            output:
              'Usage: /loop <interval> <task>\n\nRun a task repeatedly while this terminal session is open.\nInterval examples: 5m, 1h, 30s\n\nExample: /loop 10m check if the build is passing and summarise any errors',
          },
          {
            command: '/schedule',
            output:
              'Usage: /schedule <cron_or_interval> <task>\n\nCreate a cloud-based recurring task that runs even when your terminal is closed.\nUses standard cron syntax or shorthand like "every day at 9am".\n\nExample: /schedule "every monday 9am" review open PRs and post a summary to Slack',
          },
          {
            command: '/update-config',
            output:
              'Usage: /update-config [key] [value]\n\nView or update Claude Code settings for this project.\nSettings are stored in .claude/settings.json.\n\nCommon keys:\n  default_model       Model to use for this project\n  ignore_patterns     File patterns Claude should not read\n  max_tokens_per_req  Token budget per request\n\nRun /update-config with no args to see all current settings.',
          },
        ],
        availableCommands: ['claude'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Module 4: Dev Tooling
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'devtools',
    title: 'Dev Tooling',
    icon: 'Wrench',
    comingSoon: false,
    lessons: [
      // ── Lesson 1 ──────────────────────────────────────────────────
      {
        id: 'devtools-1',
        title: 'npm Basics',
        time: 3,
        explanation:
          "npm (Node Package Manager) is the tool you use to manage JavaScript dependencies. Instead of downloading libraries manually and copying files around, you declare what your project needs in a file called `package.json`, and npm fetches everything automatically.\n\n`npm install` reads your `package.json` and downloads all the listed packages into a `node_modules` folder. You run this once when you clone a project, and again whenever a teammate adds a new dependency. It's safe to run multiple times — npm is smart enough to only download what's missing or outdated.\n\n`npm run <script>` executes a named script from your `package.json`. Common ones are `npm run dev` to start the development server, `npm run build` to create a production bundle, and `npm run test` to run your test suite. Run `npm run` with no arguments to list every script your project defines.",
        examples: [
          {
            command: 'npm install',
            output:
              'added 847 packages, and audited 848 packages in 12s\n\n142 packages are looking for funding\n  run `npm fund` for details\n\nfound 0 vulnerabilities',
          },
          {
            command: 'npm run dev',
            output:
              '> stitch@1.0.0 dev\n> vite\n\n  VITE v5.0.0  ready in 312 ms\n\n  ➜  Local:   http://localhost:4390/\n  ➜  Network: use --host to expose\n  ➜  press h + enter to show help',
          },
          {
            command: 'node --version',
            output: 'v20.11.0',
          },
        ],
        availableCommands: ['npm', 'node'],
      },

      // ── Lesson 2 ──────────────────────────────────────────────────
      {
        id: 'devtools-2',
        title: 'Environment Variables',
        time: 3,
        explanation:
          "Environment variables are configuration values that live outside your code. API keys, database URLs, feature flags — anything that changes between environments (development vs production) or that you don't want committed to Git belongs in environment variables.\n\nThe convention is to store them in a file called `.env` at the root of your project. Each line is a `KEY=value` pair. Your `.gitignore` should list `.env` so it's never accidentally committed — instead, teams share a `.env.example` file with the keys listed but the real values blanked out.\n\nIn a Node.js backend, you read variables with `process.env.MY_KEY`. On the frontend with Vite, variables must be prefixed with `VITE_` (e.g. `VITE_SUPABASE_URL`) and are accessed via `import.meta.env.VITE_SUPABASE_URL`. The prefix exists so Vite knows it's safe to embed that value in the browser bundle — unprefixed vars stay server-side only.",
        examples: [
          {
            command: 'cat .env',
            output:
              'VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...\nFAL_KEY=sk-fal-test-abc123\nOPENAI_API_KEY=sk-proj-xyz789\nOWNER_EMAIL=you@example.com',
          },
        ],
        availableCommands: ['cat', 'echo'],
      },

      // ── Lesson 3 ──────────────────────────────────────────────────
      {
        id: 'devtools-3',
        title: 'Docker Concepts',
        time: 3,
        explanation:
          "Docker solves the classic \"works on my machine\" problem. A container packages your app together with everything it needs to run — the right version of Node, system libraries, config files — into a single portable unit. You can run that unit on any machine and get exactly the same result.\n\nA `Dockerfile` is the recipe: it lists the base image to start from (like `node:20-slim`), the commands to install dependencies, and the command to start the app. `docker build -t myapp .` reads the Dockerfile and creates an image. `docker run -p 3000:3000 myapp` starts a container from that image and maps port 3000 so you can reach it in your browser.\n\n`docker ps` lists running containers and `docker logs <id>` streams their output. In production, platforms like Fly.io build and run your Docker image automatically — you just provide the Dockerfile and push your code.",
        examples: [
          {
            command: 'docker build',
            output:
              'Usage:  docker build [OPTIONS] PATH | URL | -\n\nBuild an image from a Dockerfile\n\nOptions:\n  -t, --tag list    Name and optionally a tag in the "name:tag" format\n      --no-cache    Do not use cache when building the image\n      --platform    Set target platform for build (e.g. linux/amd64)\n\nExample: docker build -t myapp .',
          },
          {
            command: 'docker run',
            output:
              'Usage:  docker run [OPTIONS] IMAGE [COMMAND]\n\nRun a command in a new container\n\nOptions:\n  -p, --publish list    Publish container ports to the host (e.g. -p 3000:3000)\n  -e, --env list        Set environment variables\n  -d, --detach          Run container in background\n      --rm              Automatically remove container when it exits\n\nExample: docker run -p 3000:3000 -e NODE_ENV=production myapp',
          },
          {
            command: 'docker ps',
            output:
              'CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS                    NAMES\na1b2c3d4e5f6   myapp     "node server.js"         2 minutes ago   Up 2 minutes   0.0.0.0:3000->3000/tcp   myapp_dev',
          },
        ],
        availableCommands: ['docker'],
      },

      // ── Lesson 4 ──────────────────────────────────────────────────
      {
        id: 'devtools-4',
        title: 'SSH Basics',
        time: 3,
        explanation:
          "SSH (Secure Shell) lets you log into a remote server and run commands on it as if you were sitting in front of it. It's how developers access cloud servers, staging environments, and anything else that doesn't have a GUI.\n\nThe modern way to authenticate is with a key pair instead of a password. `ssh-keygen` generates two files: a private key (stays on your machine, never share it) and a public key (the `.pub` file — safe to share). You give the public key to the server, and from then on SSH uses the pair to prove your identity without you typing a password.\n\nOnce your key is set up, `ssh user@hostname` connects you. For example, `ssh stuarta@api.example.com` drops you into a shell on that server. You can then run any command on it, copy files with `scp`, or forward ports for local development. Many deployment platforms (including Fly.io's `fly ssh console`) use SSH under the hood.",
        examples: [
          {
            command: 'ssh-keygen',
            output:
              'Usage: ssh-keygen [options]\n\nGenerate a new SSH key pair\n\nCommon options:\n  -t ed25519       Key type (ed25519 recommended, also rsa)\n  -C "comment"     Label for the key (usually your email)\n  -f ~/.ssh/id_ed25519   Output file path\n\nExample: ssh-keygen -t ed25519 -C "you@example.com"\nThis creates:\n  ~/.ssh/id_ed25519      (private key — keep this secret)\n  ~/.ssh/id_ed25519.pub  (public key — safe to share)',
          },
          {
            command: 'ssh',
            output:
              'usage: ssh [options] [user@]hostname [command]\n\nSSH connects and logs into the specified host.\n\nCommon options:\n  -i identity_file    Use a specific private key file\n  -p port             Connect to non-standard port (default: 22)\n  -L local:remote     Forward a local port to the remote host\n\nExamples:\n  ssh stuarta@api.example.com\n  ssh -i ~/.ssh/deploy_key deploy@production.example.com',
          },
        ],
        availableCommands: ['ssh', 'ssh-keygen'],
      },

      // ── Lesson 5 ──────────────────────────────────────────────────
      {
        id: 'devtools-5',
        title: 'Fly.io Deployment',
        time: 3,
        explanation:
          "Fly.io is a platform that runs your Docker containers in data centres around the world. You write a `fly.toml` config file (which Fly.io generates for you on first run), push your code, and `fly deploy` does the rest — it builds your Docker image, ships it to the chosen region, and starts the container.\n\n`fly logs` streams live output from your running app — the same logs you'd see in the terminal if you were running it locally. When something breaks in production, this is the first place to look. `fly status` gives you a quick health check: whether the app is running, how many instances are up, and when the last deploy happened.\n\n`fly secrets set KEY=value` is how you add environment variables to a Fly.io app without putting them in your repo. They're stored encrypted and injected at runtime, just like a `.env` file but managed by the platform.",
        examples: [
          {
            command: 'fly deploy',
            output:
              '==> Verifying app config\n--> Verified app config\n==> Building image\n--> Building image with Dockerfile\n[+] Building 24.3s (12/12) FINISHED\n==> Pushing image to the registry\n--> Pushing image done\n==> Creating release\n--> release v42 created\n==> Deploying to machines\n  Machine 1d8547f2b3e4 [app] is now in a STARTED state\n--> v42 deployed successfully',
          },
          {
            command: 'fly logs',
            output:
              '2026-04-02T09:00:01Z app[1d8547] syd [info] Server running on port 3000\n2026-04-02T09:00:02Z app[1d8547] syd [info] Connected to Supabase\n2026-04-02T09:01:14Z app[1d8547] syd [info] POST /api/workbench/voiceover 200 1842ms\n2026-04-02T09:01:18Z app[1d8547] syd [info] POST /api/workbench/assemble 200 4201ms',
          },
          {
            command: 'fly status',
            output:
              'App\n  Name     = stitch\n  Owner    = personal\n  Hostname = stitch.fly.dev\n  Image    = stitch:deployment-01HXYZ\n\nMachines\nID            PROCESS  VERSION  REGION  STATE    HEALTH CHECKS  LAST UPDATED\n1d8547f2b3e4  app      42       syd     started  1 total, 1 passing  2026-04-02T09:00:02Z',
          },
        ],
        availableCommands: ['fly'],
      },
    ],
  },
];
