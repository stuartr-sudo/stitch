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
  // Module 2: Git Essentials (coming soon)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'git',
    title: 'Git Essentials',
    icon: 'GitBranch',
    comingSoon: true,
    lessons: [],
  },

  // ─────────────────────────────────────────────────────────────────
  // Module 3: Claude Code CLI (coming soon)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'claude',
    title: 'Claude Code CLI',
    icon: 'Sparkles',
    comingSoon: true,
    lessons: [],
  },

  // ─────────────────────────────────────────────────────────────────
  // Module 4: Dev Tooling (coming soon)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'devtools',
    title: 'Dev Tooling',
    icon: 'Wrench',
    comingSoon: true,
    lessons: [],
  },
];
