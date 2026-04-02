export const CHALLENGES = {
  // ─── BEGINNER: 20 Multiple Choice ───────────────────────────────────────────
  beginner: [
    // CLI Basics (~8)
    {
      id: 'b-1',
      question: 'List all files including hidden ones in long format',
      options: ['ls', 'ls -la', 'dir -all', 'find .'],
      correctIndex: 1,
      explanation:
        'ls -la combines two flags: -l for long format (shows permissions, owner, size, date) and -a to include hidden files (those starting with a dot like .env or .git).',
    },
    {
      id: 'b-2',
      question: 'Print the current working directory',
      options: ['cwd', 'pwd', 'whereis', 'cd .'],
      correctIndex: 1,
      explanation:
        'pwd (print working directory) outputs the full absolute path of the directory you are currently in. Useful when you lose track of your location in a deep directory tree.',
    },
    {
      id: 'b-3',
      question: 'Show only the last 20 lines of a file called app.log',
      options: ['cat -20 app.log', 'head -20 app.log', 'tail -20 app.log', 'less app.log'],
      correctIndex: 2,
      explanation:
        'tail reads from the end of a file. -20 (or -n 20) limits output to the last 20 lines. This is the standard way to inspect recent log entries without loading the entire file.',
    },
    {
      id: 'b-4',
      question: 'Search for the word "error" (case-insensitive) inside server.log',
      options: [
        'find "error" server.log',
        'grep -i "error" server.log',
        'search -i error server.log',
        'cat server.log | find error',
      ],
      correctIndex: 1,
      explanation:
        'grep searches for patterns inside files. The -i flag makes the match case-insensitive, so it catches "Error", "ERROR", and "error" alike.',
    },
    {
      id: 'b-5',
      question: 'Create a new empty file called notes.txt',
      options: ['new notes.txt', 'touch notes.txt', 'create notes.txt', 'echo > notes.txt'],
      correctIndex: 1,
      explanation:
        'touch was originally designed to update a file\'s access/modification timestamp, but when the file doesn\'t exist it creates a new empty file — making it the canonical way to create blank files.',
    },
    {
      id: 'b-6',
      question: 'Copy a file called config.json into the /backup directory',
      options: [
        'mv config.json /backup/',
        'cp config.json /backup/',
        'copy config.json /backup/',
        'dup config.json /backup/',
      ],
      correctIndex: 1,
      explanation:
        'cp copies files. The source comes first, then the destination. Unlike mv, the original file stays in place. Use cp -r to copy directories recursively.',
    },
    {
      id: 'b-7',
      question: 'Find all .js files under the current directory',
      options: [
        'ls **/*.js',
        'grep -r .js .',
        'find . -name "*.js"',
        'search . --type js',
      ],
      correctIndex: 2,
      explanation:
        'find traverses directory trees. -name "*.js" matches any filename ending in .js. The dot (.) at the start means "start searching from the current directory".',
    },
    {
      id: 'b-8',
      question: 'Redirect the output of a command to a file, overwriting its contents',
      options: [
        'ls > files.txt',
        'ls >> files.txt',
        'ls | files.txt',
        'ls -> files.txt',
      ],
      correctIndex: 0,
      explanation:
        '> redirects stdout to a file and overwrites it. >> appends instead. The pipe operator | sends output to another command, not a file.',
    },
    // Git (~6)
    {
      id: 'b-9',
      question: 'Check which files have been modified and which are staged for commit',
      options: ['git diff', 'git log', 'git status', 'git show'],
      correctIndex: 2,
      explanation:
        'git status gives you a three-section summary: staged changes (ready to commit), unstaged changes (tracked files that changed), and untracked files. It\'s the first command to run when re-orienting yourself.',
    },
    {
      id: 'b-10',
      question: 'Stage all modified and new files for the next commit',
      options: ['git commit -a', 'git add .', 'git stage --all', 'git push'],
      correctIndex: 1,
      explanation:
        'git add . stages everything in the current directory and below. Use git add <file> to stage specific files for more precise commits. The dot is shorthand for "all files here".',
    },
    {
      id: 'b-11',
      question: 'Create a commit with the message "Fix login bug"',
      options: [
        'git save "Fix login bug"',
        'git push -m "Fix login bug"',
        'git commit -m "Fix login bug"',
        'git commit --message="Fix login bug"',
      ],
      correctIndex: 2,
      explanation:
        'git commit -m lets you provide the commit message inline. Without -m, git opens your default text editor. The -m flag is the most common form for short, single-line messages.',
    },
    {
      id: 'b-12',
      question: 'Create a new branch called feature/auth',
      options: [
        'git new feature/auth',
        'git branch feature/auth',
        'git checkout feature/auth',
        'git switch --create feature/auth',
      ],
      correctIndex: 1,
      explanation:
        'git branch <name> creates the branch but keeps you on your current branch. To create and immediately switch, use git checkout -b or git switch -c. The / in branch names is a naming convention, not a path separator.',
    },
    {
      id: 'b-13',
      question: 'Show changes between your working tree and the last commit',
      options: ['git log --diff', 'git status -v', 'git diff', 'git show HEAD'],
      correctIndex: 2,
      explanation:
        'git diff (with no arguments) shows unstaged changes — what has changed since the last git add. git diff --staged shows what\'s staged. git show HEAD shows the full content of the last commit.',
    },
    {
      id: 'b-14',
      question: 'View the commit history of the current branch',
      options: ['git history', 'git log', 'git commits', 'git show --all'],
      correctIndex: 1,
      explanation:
        'git log shows the commit history in reverse chronological order. Useful flags include --oneline (compact), --graph (ASCII branch tree), and -n <number> to limit output.',
    },
    // Claude Code (~4)
    {
      id: 'b-15',
      question: 'Start a Claude Code session and allow it to write files without asking for confirmation',
      options: [
        'claude --auto',
        'claude --dangerously-skip-permissions',
        'claude --yes-all',
        'claude --trust',
      ],
      correctIndex: 1,
      explanation:
        '--dangerously-skip-permissions bypasses the per-action confirmation prompts. Useful in trusted automated environments, but use with care — Claude will write, edit, and delete files without asking.',
    },
    {
      id: 'b-16',
      question: 'Start Claude Code and immediately give it a task via a flag',
      options: [
        'claude --task "refactor api.js"',
        'claude -p "refactor api.js"',
        'claude --run "refactor api.js"',
        'claude -x "refactor api.js"',
      ],
      correctIndex: 1,
      explanation:
        '-p (or --print) sends a prompt directly and outputs the response to stdout. Combined with --dangerously-skip-permissions it enables non-interactive scripted automation of Claude Code.',
    },
    {
      id: 'b-17',
      question: 'Which slash command shows Claude Code\'s current working context and file list?',
      options: ['/status', '/context', '/files', '/memory'],
      correctIndex: 1,
      explanation:
        '/context shows the files and information Claude currently has loaded in its context window. This helps you understand what Claude can "see" and whether you need to add more files with /add.',
    },
    {
      id: 'b-18',
      question: 'Which slash command lets you create and switch to a git worktree branch inside Claude Code?',
      options: ['/branch', '/worktree', '/checkout', '/new-branch'],
      correctIndex: 0,
      explanation:
        '/branch creates a new git worktree for isolated parallel work. Unlike a regular branch switch, worktrees let you have multiple branches checked out simultaneously in separate directories.',
    },
    // Dev Tools (~2)
    {
      id: 'b-19',
      question: 'Install all dependencies listed in package.json',
      options: ['npm get', 'npm install', 'npm update', 'npm sync'],
      correctIndex: 1,
      explanation:
        'npm install (or npm i) reads package.json and installs all listed dependencies into node_modules. Running it without arguments is the standard first step when cloning a project.',
    },
    {
      id: 'b-20',
      question: 'Run the "build" script defined in package.json',
      options: ['npm start build', 'npm execute build', 'npm run build', 'npm build'],
      correctIndex: 2,
      explanation:
        'npm run <script> executes any script defined in the "scripts" section of package.json. A few special scripts (start, test, install) can be called without "run", but "build" is not one of them.',
    },
  ],

  // ─── INTERMEDIATE: 25 Type-the-Command ──────────────────────────────────────
  intermediate: [
    // CLI Navigation & File Reading (~10)
    {
      id: 'i-1',
      question: 'Show only the first 10 lines of package.json',
      acceptedAnswers: ['head package.json', 'head -10 package.json', 'head -n 10 package.json'],
      hint1: 'There is a command specifically for reading the beginning of a file…',
      hint2: 'Use head — the default is 10 lines so you may not need a number flag at all',
      answer: 'head package.json',
    },
    {
      id: 'i-2',
      question: 'Navigate to the parent directory',
      acceptedAnswers: ['cd ..'],
      hint1: 'cd moves you between directories — what symbol means "one level up"?',
      hint2: 'Two dots (..) always refer to the parent directory',
      answer: 'cd ..',
    },
    {
      id: 'i-3',
      question: 'Display the full contents of README.md in the terminal',
      acceptedAnswers: ['cat README.md'],
      hint1: 'You want to print the entire file — which command concatenates and prints files?',
      hint2: 'cat (short for concatenate) prints file contents to stdout',
      answer: 'cat README.md',
    },
    {
      id: 'i-4',
      question: 'Search recursively for the string "TODO" in all .js files under src/',
      acceptedAnswers: [
        'grep -r "TODO" src/ --include="*.js"',
        'grep -r "TODO" src/ --include=*.js',
        'grep -rn "TODO" src/ --include="*.js"',
        'grep --include="*.js" -r "TODO" src/',
      ],
      hint1: 'grep can search inside directories — look for a recursive flag',
      hint2: 'Use grep -r with --include="*.js" to filter by file type',
      answer: 'grep -r "TODO" src/ --include="*.js"',
    },
    {
      id: 'i-5',
      question: 'Count the number of lines in server.js',
      acceptedAnswers: ['wc -l server.js'],
      hint1: 'There is a word-count utility that can also count lines…',
      hint2: 'wc with the -l flag counts lines only',
      answer: 'wc -l server.js',
    },
    {
      id: 'i-6',
      question: 'List files sorted by modification time, newest first',
      acceptedAnswers: ['ls -lt', 'ls -lth'],
      hint1: 'ls has a flag for sorting by time…',
      hint2: 'Combine ls -l (long format) with -t (sort by time). Add -h for human-readable sizes',
      answer: 'ls -lt',
    },
    {
      id: 'i-7',
      question: 'Append "export default config;" to the end of config.js without opening an editor',
      acceptedAnswers: ['echo "export default config;" >> config.js'],
      hint1: 'You can redirect command output into a file — but you want to append, not overwrite',
      hint2: 'Use echo with >> (double arrow) to append to a file rather than overwrite it',
      answer: 'echo "export default config;" >> config.js',
    },
    {
      id: 'i-8',
      question: 'Find all files larger than 1MB under the current directory',
      acceptedAnswers: ['find . -size +1M', 'find . -size +1M -type f'],
      hint1: 'find has a -size option — what operator means "greater than"?',
      hint2: 'Use find . -size +1M (the + means "larger than", M means megabytes)',
      answer: 'find . -size +1M',
    },
    {
      id: 'i-9',
      question: 'Run the previous command but with sudo prepended (using shell history)',
      acceptedAnswers: ['sudo !!'],
      hint1: 'Shell history lets you reference the last command with a special shorthand…',
      hint2: '!! expands to the last command. sudo !! re-runs it as superuser',
      answer: 'sudo !!',
    },
    {
      id: 'i-10',
      question: 'Pipe the output of ls -la into less for scrollable viewing',
      acceptedAnswers: ['ls -la | less'],
      hint1: 'The pipe operator | sends one command\'s output into another command\'s input',
      hint2: 'Pipe (|) ls -la into less — less provides a scrollable pager interface',
      answer: 'ls -la | less',
    },
    // Git (~8)
    {
      id: 'i-11',
      question: 'Show the last 5 commits, one per line',
      acceptedAnswers: ['git log --oneline -5', 'git log -5 --oneline'],
      hint1: 'git log shows commit history — which flag makes it compact?',
      hint2: 'Use --oneline for compact output and -5 (or -n 5) to limit to 5 commits',
      answer: 'git log --oneline -5',
    },
    {
      id: 'i-12',
      question: 'Stage only src/api.js for the next commit',
      acceptedAnswers: ['git add src/api.js'],
      hint1: 'git add can take a specific file path instead of staging everything',
      hint2: 'Pass the exact file path to git add: git add src/api.js',
      answer: 'git add src/api.js',
    },
    {
      id: 'i-13',
      question: 'Show the diff of changes that are already staged (ready to commit)',
      acceptedAnswers: ['git diff --staged', 'git diff --cached'],
      hint1: 'git diff without flags shows unstaged changes — you need a flag for staged ones',
      hint2: 'Use git diff --staged (or the equivalent --cached) to see what\'s queued for commit',
      answer: 'git diff --staged',
    },
    {
      id: 'i-14',
      question: 'Create a new branch called fix/null-check and switch to it in one command',
      acceptedAnswers: ['git checkout -b fix/null-check', 'git switch -c fix/null-check'],
      hint1: 'There\'s a way to create and switch to a branch in a single git command',
      hint2: 'git checkout -b creates and switches in one step. Modern git also has git switch -c',
      answer: 'git checkout -b fix/null-check',
    },
    {
      id: 'i-15',
      question: 'Show who last modified each line of utils.js',
      acceptedAnswers: ['git blame utils.js'],
      hint1: 'git has a command that annotates each line of a file with commit and author info…',
      hint2: 'git blame <file> shows the last commit that touched each line',
      answer: 'git blame utils.js',
    },
    {
      id: 'i-16',
      question: 'Push the current branch to origin and set it as the upstream tracking branch',
      acceptedAnswers: [
        'git push -u origin HEAD',
        'git push --set-upstream origin HEAD',
        'git push -u origin main',
        'git push --set-upstream origin main',
      ],
      hint1: 'git push alone may fail on a new branch — you need to tell it where to push',
      hint2: 'Use -u (or --set-upstream) to link the local branch with a remote. HEAD refers to your current branch',
      answer: 'git push -u origin HEAD',
    },
    {
      id: 'i-17',
      question: 'Undo the last commit but keep the changes staged',
      acceptedAnswers: ['git reset --soft HEAD~1', 'git reset --soft HEAD^'],
      hint1: 'git reset moves the branch pointer back — which mode keeps changes staged?',
      hint2: '--soft resets the commit pointer but leaves your changes staged. HEAD~1 means "one commit before HEAD"',
      answer: 'git reset --soft HEAD~1',
    },
    {
      id: 'i-18',
      question: 'Show a compact log with a graph of branch merges',
      acceptedAnswers: [
        'git log --oneline --graph',
        'git log --graph --oneline',
        'git log --oneline --graph --all',
        'git log --graph --oneline --all',
      ],
      hint1: 'git log has a flag that draws an ASCII tree of your branch history',
      hint2: 'Combine --graph with --oneline for a readable branch visualisation',
      answer: 'git log --oneline --graph',
    },
    // Claude Code (~5)
    {
      id: 'i-19',
      question: 'Start Claude Code in a specific working directory (/projects/app)',
      acceptedAnswers: ['claude -w /projects/app', 'claude --working-dir /projects/app'],
      hint1: 'Claude Code has a flag to set the working directory without using cd first',
      hint2: 'Use -w (or --working-dir) followed by the path',
      answer: 'claude -w /projects/app',
    },
    {
      id: 'i-20',
      question: 'Use the /btw slash command to add a note to Claude\'s context mid-session',
      acceptedAnswers: ['/btw the API rate limit is 100 req/min', '/btw'],
      hint1: 'Claude Code has a slash command for injecting context notes without triggering a task',
      hint2: '/btw ("by the way") lets you add context to Claude\'s working memory mid-conversation',
      answer: '/btw the API rate limit is 100 req/min',
    },
    {
      id: 'i-21',
      question: 'Run Claude Code non-interactively, piping output to a log file',
      acceptedAnswers: [
        'claude -p "describe the architecture" > output.log',
        'claude --print "describe the architecture" > output.log',
      ],
      hint1: 'For scripted/automated use, Claude Code can print its response to stdout',
      hint2: 'Use -p to get a plain text response, then redirect it with > to a file',
      answer: 'claude -p "describe the architecture" > output.log',
    },
    {
      id: 'i-22',
      question: 'Use the /teleport slash command to jump Claude\'s context to a different directory',
      acceptedAnswers: ['/teleport src/api', '/teleport'],
      hint1: 'Claude Code has a slash command for changing context directory mid-session',
      hint2: '/teleport changes Claude\'s working context to a new directory path',
      answer: '/teleport src/api',
    },
    {
      id: 'i-23',
      question: 'Run a Claude Code session using the --agent flag to enable autonomous multi-step execution',
      acceptedAnswers: ['claude --agent', 'claude -a'],
      hint1: 'Claude Code has a mode where it can plan and execute multiple steps on its own',
      hint2: 'The --agent flag enables autonomous mode where Claude breaks tasks into steps and executes them',
      answer: 'claude --agent',
    },
    // Dev Tools (~2)
    {
      id: 'i-24',
      question: 'Deploy the app to Fly.io',
      acceptedAnswers: ['fly deploy'],
      hint1: 'Fly.io has a CLI with a single command to build and deploy your app',
      hint2: 'fly deploy builds your Docker image and deploys to Fly.io in one step',
      answer: 'fly deploy',
    },
    {
      id: 'i-25',
      question: 'Run the "start" script from package.json in the background and redirect all output to server.log',
      acceptedAnswers: [
        'npm run start > server.log 2>&1 &',
        'npm start > server.log 2>&1 &',
      ],
      hint1: 'You need to redirect both stdout and stderr, then background the process',
      hint2: '> redirects stdout, 2>&1 merges stderr into stdout, and & backgrounds the process',
      answer: 'npm run start > server.log 2>&1 &',
    },
  ],

  // ─── ADVANCED: 15 Multi-Step Scenarios ──────────────────────────────────────
  advanced: [
    // CLI (~5)
    {
      id: 'a-1',
      scenario:
        'Your team has asked you to set up a new project structure. Create a directory called "my-app", navigate into it, create subdirectories "src" and "tests", and create an empty index.js inside src.',
      steps: [
        {
          instruction: 'Create the my-app directory',
          acceptedAnswers: ['mkdir my-app'],
          hint: 'mkdir creates a new directory',
        },
        {
          instruction: 'Navigate into my-app',
          acceptedAnswers: ['cd my-app'],
          hint: 'cd followed by the directory name moves you into it',
        },
        {
          instruction: 'Create both src and tests directories at once',
          acceptedAnswers: ['mkdir src tests', 'mkdir src && mkdir tests'],
          hint: 'mkdir can take multiple names separated by spaces',
        },
        {
          instruction: 'Create an empty index.js inside src',
          acceptedAnswers: ['touch src/index.js'],
          hint: 'touch creates an empty file — specify the path including the subdirectory',
        },
      ],
    },
    {
      id: 'a-2',
      scenario:
        'A bug report says the word "depreciated" (a common typo for "deprecated") appears somewhere in the codebase. Find every file under src/ that contains it, then show the exact lines so you can fix them.',
      steps: [
        {
          instruction: 'Find all files under src/ containing the typo "depreciated"',
          acceptedAnswers: [
            'grep -rl "depreciated" src/',
            'grep -r "depreciated" src/ -l',
          ],
          hint: 'grep -r searches recursively. The -l flag prints file names only, not the matching lines',
        },
        {
          instruction: 'Show the matching lines with their line numbers',
          acceptedAnswers: [
            'grep -rn "depreciated" src/',
            'grep -r "depreciated" src/ -n',
          ],
          hint: 'Remove -l and add -n to grep to show line numbers alongside matching content',
        },
      ],
    },
    {
      id: 'a-3',
      scenario:
        'Your build folder has got too large. List all files under dist/ that are bigger than 500KB so you know what to investigate, then delete the entire dist/ directory to start fresh.',
      steps: [
        {
          instruction: 'Find all files under dist/ larger than 500KB',
          acceptedAnswers: [
            'find dist/ -size +500k -type f',
            'find dist/ -type f -size +500k',
          ],
          hint: 'find supports -size with + for "greater than" and k for kilobytes',
        },
        {
          instruction: 'Delete the dist/ directory and all its contents',
          acceptedAnswers: ['rm -rf dist/', 'rm -rf dist'],
          hint: 'rm -r removes directories recursively. -f suppresses confirmation prompts',
        },
      ],
    },
    {
      id: 'a-4',
      scenario:
        'You need to find all .env files in the project (they should not be committed), print each one to check for secrets, then confirm none are tracked by git.',
      steps: [
        {
          instruction: 'Find all .env files recursively from the current directory',
          acceptedAnswers: ['find . -name "*.env" -o -name ".env"', 'find . -name ".env*"', 'find . -name ".env"'],
          hint: 'find . with -name matches by filename pattern',
        },
        {
          instruction: 'Print the contents of .env to check for secrets',
          acceptedAnswers: ['cat .env'],
          hint: 'cat outputs the full content of a file',
        },
        {
          instruction: 'Check if .env is being tracked by git',
          acceptedAnswers: ['git ls-files .env', 'git status .env'],
          hint: 'git ls-files lists tracked files — if .env appears, it is being tracked and should be removed with git rm --cached',
        },
      ],
    },
    {
      id: 'a-5',
      scenario:
        'Logs are growing unbounded. Archive app.log by compressing it, then truncate the original so the app can keep writing without restarting.',
      steps: [
        {
          instruction: 'Compress app.log into app.log.gz',
          acceptedAnswers: ['gzip -k app.log', 'gzip --keep app.log'],
          hint: 'gzip compresses files. Use -k to keep the original rather than replacing it',
        },
        {
          instruction: 'Truncate app.log to zero bytes (without deleting it)',
          acceptedAnswers: ['truncate -s 0 app.log', '> app.log', ': > app.log'],
          hint: 'truncate -s 0 empties a file while keeping the inode — the app\'s open file handle stays valid',
        },
      ],
    },
    // Git (~5)
    {
      id: 'a-6',
      scenario:
        'You\'re starting work on a new feature. Create a feature branch, make a change, commit it, then push it to origin ready for a pull request.',
      steps: [
        {
          instruction: 'Create and switch to a new branch called feature/user-profile',
          acceptedAnswers: ['git checkout -b feature/user-profile', 'git switch -c feature/user-profile'],
          hint: 'Use git checkout -b to create and switch in one command',
        },
        {
          instruction: 'Stage all changes',
          acceptedAnswers: ['git add .', 'git add -A'],
          hint: 'git add . stages everything in the current directory',
        },
        {
          instruction: 'Commit with the message "Add user profile page"',
          acceptedAnswers: [
            'git commit -m "Add user profile page"',
            "git commit -m 'Add user profile page'",
          ],
          hint: 'git commit -m lets you inline the message in quotes',
        },
        {
          instruction: 'Push the branch to origin and set upstream tracking',
          acceptedAnswers: [
            'git push -u origin feature/user-profile',
            'git push --set-upstream origin feature/user-profile',
            'git push -u origin HEAD',
          ],
          hint: 'Use -u with git push to link the local branch to its remote counterpart',
        },
      ],
    },
    {
      id: 'a-7',
      scenario:
        'A colleague reported that a specific commit introduced a performance regression. You need to find it, inspect what changed, then revert only that commit without touching subsequent work.',
      steps: [
        {
          instruction: 'Search the commit log for commits mentioning "cache"',
          acceptedAnswers: [
            'git log --oneline --grep="cache"',
            'git log --grep="cache" --oneline',
          ],
          hint: 'git log --grep filters commits by message content',
        },
        {
          instruction: 'Show the full diff introduced by commit abc1234',
          acceptedAnswers: ['git show abc1234'],
          hint: 'git show <commit> displays the commit message and its diff',
        },
        {
          instruction: 'Revert commit abc1234 creating a new undo commit',
          acceptedAnswers: ['git revert abc1234'],
          hint: 'git revert creates a new commit that undoes the changes — unlike reset, it preserves history',
        },
      ],
    },
    {
      id: 'a-8',
      scenario:
        'You need to merge the latest changes from main into your feature branch before opening a pull request, and resolve any conflicts cleanly.',
      steps: [
        {
          instruction: 'Fetch the latest changes from origin',
          acceptedAnswers: ['git fetch origin', 'git fetch'],
          hint: 'git fetch downloads remote changes without merging them',
        },
        {
          instruction: 'Rebase your feature branch on top of origin/main',
          acceptedAnswers: ['git rebase origin/main'],
          hint: 'git rebase replays your commits on top of the target branch, giving a cleaner linear history than merge',
        },
        {
          instruction: 'After resolving any conflicts, continue the rebase',
          acceptedAnswers: ['git rebase --continue'],
          hint: 'After editing conflict markers and staging the resolved files, git rebase --continue moves to the next commit',
        },
      ],
    },
    {
      id: 'a-9',
      scenario:
        'You accidentally committed a large binary file. Remove it from the last commit without losing your other changes, then push the corrected history.',
      steps: [
        {
          instruction: 'Unstage and remove the large file from the last commit (keep local copy)',
          acceptedAnswers: ['git rm --cached large-asset.psd', 'git rm --cached large-asset.bin'],
          hint: 'git rm --cached removes a file from the index (staging area) without deleting it from disk',
        },
        {
          instruction: 'Amend the last commit to exclude the file',
          acceptedAnswers: ['git commit --amend --no-edit'],
          hint: 'git commit --amend replaces the last commit. --no-edit keeps the same commit message',
        },
        {
          instruction: 'Add the file to .gitignore so it isn\'t accidentally staged again',
          acceptedAnswers: ['echo "large-asset.psd" >> .gitignore', 'echo "*.psd" >> .gitignore'],
          hint: 'Append the filename or a pattern to .gitignore using echo with >>',
        },
      ],
    },
    {
      id: 'a-10',
      scenario:
        'You want to use git bisect to find the commit that introduced a bug. You know the current HEAD is broken and commit v1.2.0 was good.',
      steps: [
        {
          instruction: 'Start the bisect session',
          acceptedAnswers: ['git bisect start'],
          hint: 'git bisect start initialises the binary search session',
        },
        {
          instruction: 'Mark the current HEAD as bad',
          acceptedAnswers: ['git bisect bad', 'git bisect bad HEAD'],
          hint: 'git bisect bad (without arguments) marks the current commit as broken',
        },
        {
          instruction: 'Mark the known-good commit v1.2.0 as good',
          acceptedAnswers: ['git bisect good v1.2.0'],
          hint: 'git bisect good <ref> tells git which end of the range is known to work',
        },
        {
          instruction: 'After finding the culprit, end the bisect session',
          acceptedAnswers: ['git bisect reset'],
          hint: 'git bisect reset returns HEAD to where it was before you started',
        },
      ],
    },
    // Claude Code (~3)
    {
      id: 'a-11',
      scenario:
        'You want to work on two features in parallel using git worktrees so each has its own directory and Claude Code session.',
      steps: [
        {
          instruction: 'Create a worktree for the branch feature/payments in the directory ../payments-work',
          acceptedAnswers: [
            'git worktree add ../payments-work feature/payments',
            'git worktree add ../payments-work -b feature/payments',
          ],
          hint: 'git worktree add <path> <branch> checks out a branch into a new directory without affecting your main working tree',
        },
        {
          instruction: 'Start a Claude Code session inside the new worktree directory',
          acceptedAnswers: [
            'claude -w ../payments-work',
            'claude --working-dir ../payments-work',
          ],
          hint: 'Use the -w flag to point Claude at a different working directory',
        },
        {
          instruction: 'List all active worktrees to confirm setup',
          acceptedAnswers: ['git worktree list'],
          hint: 'git worktree list shows all checked-out worktrees and their branches',
        },
      ],
    },
    {
      id: 'a-12',
      scenario:
        'You want to give Claude Code a large codebase task non-interactively: pass the task as a flag, allow all file operations, and save the output to a report file for review.',
      steps: [
        {
          instruction: 'Run Claude with a prompt flag, skip all permission prompts, and save output to audit.md',
          acceptedAnswers: [
            'claude -p "audit all API endpoints for missing auth checks" --dangerously-skip-permissions > audit.md',
            'claude --print "audit all API endpoints for missing auth checks" --dangerously-skip-permissions > audit.md',
          ],
          hint: '-p sends a prompt non-interactively, --dangerously-skip-permissions bypasses confirmations, and > redirects output',
        },
        {
          instruction: 'View the generated audit report',
          acceptedAnswers: ['cat audit.md', 'less audit.md'],
          hint: 'cat prints the file, less gives you a scrollable view for longer content',
        },
      ],
    },
    {
      id: 'a-13',
      scenario:
        'During a Claude Code session you realise the codebase has undocumented environment variables. Use Claude\'s in-session slash commands to inject context, then ask it to document them.',
      steps: [
        {
          instruction: 'Use /btw to tell Claude about the .env.example file mid-session',
          acceptedAnswers: ['/btw check .env.example for the full list of env vars', '/btw'],
          hint: '/btw adds a contextual note to Claude without triggering a new task',
        },
        {
          instruction: 'Ask Claude to read the env example file into context',
          acceptedAnswers: ['/add .env.example'],
          hint: '/add <file> loads a file into Claude\'s active context window',
        },
        {
          instruction: 'Tell Claude to document every env var and write it to docs/env-vars.md',
          acceptedAnswers: [
            'document every environment variable from .env.example and write the output to docs/env-vars.md',
          ],
          hint: 'This is a natural language instruction — tell Claude exactly what to produce and where to save it',
        },
      ],
    },
    // Dev Tools (~2)
    {
      id: 'a-14',
      scenario:
        'You\'re setting up a new Node.js project from scratch: initialise it, install express as a dependency, and create a start script in package.json.',
      steps: [
        {
          instruction: 'Initialise a new npm project with defaults (no interactive prompts)',
          acceptedAnswers: ['npm init -y', 'npm init --yes'],
          hint: 'npm init creates package.json. The -y flag accepts all defaults without prompting',
        },
        {
          instruction: 'Install express and save it as a production dependency',
          acceptedAnswers: ['npm install express', 'npm i express'],
          hint: 'npm install <package> saves to dependencies by default in modern npm',
        },
        {
          instruction: 'Add a start script to package.json that runs "node index.js"',
          acceptedAnswers: ['npm pkg set scripts.start="node index.js"'],
          hint: 'npm pkg set is a CLI shortcut for editing package.json fields without opening the file',
        },
      ],
    },
    {
      id: 'a-15',
      scenario:
        'Your Fly.io deployment is failing. Check the live logs, inspect the app status, and then trigger a fresh deploy once the issue is fixed.',
      steps: [
        {
          instruction: 'Stream live logs from the Fly.io app',
          acceptedAnswers: ['fly logs', 'fly logs --tail'],
          hint: 'fly logs streams recent and live logs from your deployed app',
        },
        {
          instruction: 'Check the status and health of the Fly.io app',
          acceptedAnswers: ['fly status'],
          hint: 'fly status shows instance state, VM health, and recent check history',
        },
        {
          instruction: 'Push your fix to git then deploy to Fly.io',
          acceptedAnswers: [
            'git push && fly deploy',
            'git push origin main && fly deploy',
          ],
          hint: 'Always git push first so your code is in source control, then fly deploy to build and release',
        },
      ],
    },
  ],
};
