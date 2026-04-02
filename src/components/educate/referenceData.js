export const REFERENCE_CATEGORIES = [
  {
    name: 'Navigation',
    entries: [
      { command: 'pwd', description: 'Print current working directory', tryCommand: 'pwd' },
      { command: 'cd <path>', description: 'Change directory', tryCommand: 'cd project' },
      { command: 'cd ..', description: 'Go up one directory level', tryCommand: 'cd ..' },
      { command: 'cd ~', description: 'Go to home directory', tryCommand: 'cd ~' },
      { command: 'ls', description: 'List files in current directory', tryCommand: 'ls' },
    ],
  },
  {
    name: 'File Reading',
    entries: [
      { command: 'cat <file>', description: 'Print entire file contents to terminal', tryCommand: 'cat README.md' },
      { command: 'head -N <file>', description: 'Show first N lines of a file', tryCommand: 'head -20 server.js' },
      { command: 'tail -N <file>', description: 'Show last N lines of a file', tryCommand: 'tail -20 server.js' },
      { command: 'less <file>', description: 'Scroll through a file one page at a time', tryCommand: 'less package.json' },
    ],
  },
  {
    name: 'File Operations',
    entries: [
      { command: 'mkdir <name>', description: 'Create a new directory', tryCommand: 'mkdir my-project' },
      { command: 'touch <name>', description: 'Create an empty file (or update its timestamp)', tryCommand: 'touch notes.txt' },
      { command: 'cp <src> <dest>', description: 'Copy a file or directory', tryCommand: 'cp README.md README.backup.md' },
      { command: 'mv <src> <dest>', description: 'Move or rename a file', tryCommand: 'mv notes.txt docs/notes.txt' },
      { command: 'rm <file>', description: 'Delete a file permanently', tryCommand: 'rm notes.txt' },
      { command: 'chmod <mode> <file>', description: 'Change file permissions', tryCommand: 'chmod 755 deploy.sh' },
    ],
  },
  {
    name: 'Search',
    entries: [
      { command: 'find . -name "<pattern>"', description: 'Find files by name under current directory', tryCommand: 'find . -name "*.js"' },
      { command: 'grep "<term>" <file>', description: 'Search for a term inside a file', tryCommand: 'grep "express" server.js' },
      { command: 'grep -r "<term>" .', description: 'Recursively search for a term in all files', tryCommand: 'grep -r "TODO" .' },
      { command: 'ls | grep <term>', description: 'Filter directory listing by name', tryCommand: 'ls | grep api' },
    ],
  },
  {
    name: 'Operators',
    entries: [
      { command: 'cmd1 && cmd2', description: 'Run cmd2 only if cmd1 succeeds', tryCommand: 'git add . && git commit -m "update"' },
      { command: 'cmd1 | cmd2', description: 'Pipe output of cmd1 as input to cmd2', tryCommand: 'cat server.js | grep "app.get"' },
      { command: 'cmd > file', description: 'Redirect output to a file (overwrite)', tryCommand: 'ls > file-list.txt' },
      { command: 'cmd >> file', description: 'Append output to a file', tryCommand: 'echo "done" >> build.log' },
      { command: 'cmd1 ; cmd2', description: 'Run cmd1 then cmd2 regardless of success', tryCommand: 'npm install ; npm run build' },
    ],
  },
  {
    name: 'Git Basics',
    entries: [
      { command: 'git status', description: 'Show working tree status and staged changes', tryCommand: 'git status' },
      { command: 'git log --oneline', description: 'Show commit history in compact format', tryCommand: 'git log --oneline' },
      { command: 'git add <file>', description: 'Stage a file for the next commit', tryCommand: 'git add src/App.jsx' },
      { command: 'git commit -m "msg"', description: 'Commit staged changes with a message', tryCommand: 'git commit -m "fix: resolve login bug"' },
      { command: 'git push', description: 'Push commits to the remote repository', tryCommand: 'git push' },
      { command: 'git pull', description: 'Fetch and merge changes from the remote', tryCommand: 'git pull' },
      { command: 'git clone <url>', description: 'Clone a remote repository locally', tryCommand: 'git clone https://github.com/user/repo.git' },
    ],
  },
  {
    name: 'Git Branching',
    entries: [
      { command: 'git branch', description: 'List all local branches', tryCommand: 'git branch' },
      { command: 'git checkout <branch>', description: 'Switch to an existing branch', tryCommand: 'git checkout main' },
      { command: 'git checkout -b <name>', description: 'Create and switch to a new branch', tryCommand: 'git checkout -b feature/new-ui' },
      { command: 'git merge <branch>', description: 'Merge another branch into the current one', tryCommand: 'git merge feature/new-ui' },
    ],
  },
  {
    name: 'Git Advanced',
    entries: [
      { command: 'git diff', description: 'Show unstaged changes in the working tree', tryCommand: 'git diff' },
      { command: 'git blame <file>', description: 'Show who last changed each line of a file', tryCommand: 'git blame server.js' },
      { command: 'git stash', description: 'Temporarily save uncommitted changes', tryCommand: 'git stash' },
      { command: 'git log --oneline -N', description: 'Show the last N commits in compact format', tryCommand: 'git log --oneline -10' },
    ],
  },
  {
    name: 'Claude Code Flags',
    entries: [
      { command: 'claude -w "name"', description: 'Start Claude Code in a named workspace', tryCommand: 'claude -w "my-project"' },
      { command: 'claude --agent <name>', description: 'Run a named agent configuration', tryCommand: 'claude --agent reviewer' },
      { command: 'claude --add-dir <path>', description: 'Add an extra directory to Claude\'s context', tryCommand: 'claude --add-dir ../shared-lib' },
      { command: 'claude --teleport', description: 'Open a session in the browser-based UI', tryCommand: 'claude --teleport' },
      { command: 'claude --bare', description: 'Start Claude with minimal system prompt', tryCommand: 'claude --bare' },
      { command: 'claude -p "question"', description: 'Ask a one-shot question without starting a session', tryCommand: 'claude -p "What does this repo do?"' },
    ],
  },
  {
    name: 'Claude Code Sessions',
    entries: [
      { command: '/branch', description: 'Create a new git branch from within the session', tryCommand: '/branch' },
      { command: '/btw', description: 'Add a background note Claude will keep in mind', tryCommand: '/btw' },
      { command: '/batch', description: 'Run a list of tasks sequentially in one session', tryCommand: '/batch' },
      { command: '/loop', description: 'Repeat a task until a condition is met', tryCommand: '/loop' },
      { command: '/schedule', description: 'Schedule a task to run at a later time', tryCommand: '/schedule' },
      { command: '/update-config', description: 'Update Claude Code configuration interactively', tryCommand: '/update-config' },
    ],
  },
  {
    name: 'npm',
    entries: [
      { command: 'npm install', description: 'Install all dependencies from package.json', tryCommand: 'npm install' },
      { command: 'npm run <script>', description: 'Run a script defined in package.json', tryCommand: 'npm run dev' },
      { command: 'npm init', description: 'Create a new package.json interactively', tryCommand: 'npm init' },
      { command: 'npm --version', description: 'Print the installed npm version', tryCommand: 'npm --version' },
    ],
  },
  {
    name: 'Docker',
    entries: [
      { command: 'docker build', description: 'Build a Docker image from a Dockerfile', tryCommand: 'docker build -t my-app .' },
      { command: 'docker run', description: 'Start a new container from an image', tryCommand: 'docker run -p 3000:3000 my-app' },
      { command: 'docker ps', description: 'List running containers', tryCommand: 'docker ps' },
      { command: 'docker logs', description: 'Fetch logs from a running container', tryCommand: 'docker logs my-app' },
    ],
  },
  {
    name: 'SSH',
    entries: [
      { command: 'ssh user@host', description: 'Connect to a remote server via SSH', tryCommand: 'ssh deploy@example.com' },
      { command: 'ssh-keygen', description: 'Generate a new SSH key pair', tryCommand: 'ssh-keygen -t ed25519' },
      { command: 'ssh -i <key> user@host', description: 'Connect using a specific private key file', tryCommand: 'ssh -i ~/.ssh/id_ed25519 deploy@example.com' },
    ],
  },
  {
    name: 'Fly.io',
    entries: [
      { command: 'fly deploy', description: 'Build and deploy the app to Fly.io', tryCommand: 'fly deploy' },
      { command: 'fly logs', description: 'Stream live logs from the deployed app', tryCommand: 'fly logs' },
      { command: 'fly status', description: 'Show the current deployment status', tryCommand: 'fly status' },
      { command: 'fly secrets', description: 'Manage environment secrets on Fly.io', tryCommand: 'fly secrets list' },
    ],
  },
  {
    name: 'Utilities',
    entries: [
      { command: 'echo <text>', description: 'Print text to the terminal', tryCommand: 'echo "Hello, world!"' },
      { command: 'whoami', description: 'Print the current logged-in username', tryCommand: 'whoami' },
      { command: 'clear', description: 'Clear all output from the terminal screen', tryCommand: 'clear' },
      { command: 'help', description: 'Show available built-in shell commands', tryCommand: 'help' },
      { command: 'man <command>', description: 'Open the manual page for a command', tryCommand: 'man git' },
    ],
  },
];
