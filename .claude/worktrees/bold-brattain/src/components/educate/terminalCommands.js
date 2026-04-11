/**
 * terminalCommands.js
 * Command parser and executor for the CLI learning terminal.
 */

import {
  resolvePath,
  listDir,
  getFileContent,
  deepClone,
} from './terminalFileSystem.js';

// ---------------------------------------------------------------------------
// Git state factory
// ---------------------------------------------------------------------------

export function createInitialGitState() {
  return {
    currentBranch: 'main',
    branches: ['main', 'feature/header-redesign'],
    commits: [
      { hash: 'a1b2c3d', message: 'Fix header responsive layout' },
      { hash: 'e4f5g6h', message: 'Add API health endpoint' },
      { hash: 'i7j8k9l', message: 'Update README with setup steps' },
      { hash: 'm0n1o2p', message: 'Initial project setup' },
      { hash: 'q3r4s5t', message: 'First commit' },
    ],
    staged: [],
    modified: ['src/App.jsx'],
    untracked: ['notes/scratch.txt'],
    diffContent: {
      'src/App.jsx':
        '--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -7,7 +7,7 @@\n-    <div className="app-container">\n+    <div className="app-container flex flex-col min-h-screen">',
    },
  };
}

// ---------------------------------------------------------------------------
// Input parser
// ---------------------------------------------------------------------------

/**
 * parseInput — split an input string on shell operators &&, |, ;, >, >>
 * Returns array of { command, args, operator } where operator is what
 * follows that segment (null for the last segment).
 *
 * Operator precedence in scanning: >> before > (avoid partial match).
 */
export function parseInput(input) {
  const OPERATORS = ['>>', '&&', '|', '>', ';'];

  const segments = [];
  let remaining = input.trim();

  while (remaining.length > 0) {
    // Find the earliest operator in remaining text
    let earliestIdx = -1;
    let earliestOp = null;

    for (const op of OPERATORS) {
      // naive linear scan — find first occurrence not inside quotes
      const idx = indexOfOperator(remaining, op);
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx;
        earliestOp = op;
      }
    }

    if (earliestIdx === -1) {
      // No more operators
      const parsed = parseCommandString(remaining.trim());
      segments.push({ ...parsed, operator: null });
      break;
    }

    const before = remaining.slice(0, earliestIdx).trim();
    const after = remaining.slice(earliestIdx + earliestOp.length).trim();

    const parsed = parseCommandString(before);
    segments.push({ ...parsed, operator: earliestOp });
    remaining = after;
  }

  return segments;
}

/**
 * Find the first occurrence of `op` in `str` that is not inside quotes.
 * Returns -1 if not found.
 */
function indexOfOperator(str, op) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i <= str.length - op.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (!inSingle && !inDouble && str.slice(i, i + op.length) === op) {
      return i;
    }
  }
  return -1;
}

/**
 * Split a raw command string into { command, args }.
 * Handles quoted strings (double and single quotes).
 */
function parseCommandString(str) {
  const tokens = tokenise(str);
  const [command, ...args] = tokens;
  return { command: command || '', args };
}

/**
 * Tokenise a shell-like string, respecting quoted strings.
 * Strips outer quotes from each token.
 */
function tokenise(str) {
  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === ' ' && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current.length > 0) tokens.push(current);
  return tokens;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOME = '/home/stuarta';
const PROJECT = '/home/stuarta/project';

function isInGitRepo(cwd) {
  return cwd === PROJECT || cwd.startsWith(PROJECT + '/');
}

function getNode(fs, cwd, path) {
  return resolvePath(fs, cwd, path);
}

/**
 * Write content to a file at absPath in the filesystem tree.
 * Creates intermediate directories only if they already exist.
 */
function writeFile(fs, absPath, content) {
  const parts = absPath.split('/').filter(Boolean);
  const fileName = parts.pop();
  let node = fs;
  for (const seg of parts) {
    if (!node.children[seg]) return false;
    node = node.children[seg];
    if (node.type !== 'dir') return false;
  }
  node.children[fileName] = { type: 'file', content };
  return true;
}

/**
 * Delete a node at absPath. Returns true on success.
 */
function deleteNode(fs, absPath) {
  const parts = absPath.split('/').filter(Boolean);
  const name = parts.pop();
  let node = fs;
  for (const seg of parts) {
    if (!node.children || !node.children[seg]) return false;
    node = node.children[seg];
  }
  if (!node.children || !(name in node.children)) return false;
  delete node.children[name];
  return true;
}

/**
 * Recursively collect all file paths under a directory node.
 * Returns array of { path, content } where path is relative to startPath.
 */
function collectFiles(dirNode, prefix = '') {
  const results = [];
  for (const [name, child] of Object.entries(dirNode.children)) {
    const p = prefix ? `${prefix}/${name}` : name;
    if (child.type === 'file') {
      results.push({ path: p, content: child.content });
    } else if (child.type === 'dir') {
      results.push(...collectFiles(child, p));
    }
  }
  return results;
}

/**
 * Walk filesystem from a node, collecting paths matching a glob pattern.
 * Only supports * as a wildcard (matching any sequence of non-/ chars).
 */
function findFiles(dirNode, pattern, prefix = '') {
  const regex = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'
  );
  const results = [];
  for (const [name, child] of Object.entries(dirNode.children)) {
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (regex.test(name)) {
      results.push(relPath);
    }
    if (child.type === 'dir') {
      results.push(...findFiles(child, pattern, relPath));
    }
  }
  return results;
}

function fakeDate() {
  return 'Mar 15 10:30';
}

function longFormatEntry(name, type, content) {
  const size = type === 'dir' ? 4096 : (content || '').length;
  const perms = type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
  return `${perms}  stuarta  staff  ${String(size).padStart(6)}  ${fakeDate()}  ${name}`;
}

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

const COMMANDS = {
  // ---- Navigation & inspection -------------------------------------------

  pwd: (_args, state) => ({
    output: state.cwd,
    state,
    success: true,
  }),

  cd: (args, state) => {
    const newState = deepClone(state);
    let target;

    if (!args[0] || args[0] === '~') {
      target = HOME;
    } else {
      target = args[0];
    }

    const result = resolvePath(newState.fs, newState.cwd, target);
    if (!result) {
      return { output: `cd: ${target}: No such file or directory`, state, success: false };
    }
    if (result.node.type !== 'dir') {
      return { output: `cd: ${target}: Not a directory`, state, success: false };
    }
    newState.cwd = result.absolutePath;
    return { output: '', state: newState, success: true };
  },

  ls: (args, state) => {
    let showHidden = false;
    let longFormat = false;
    let targetPath = '.';
    const remainingArgs = [];

    for (const arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('a')) showHidden = true;
        if (arg.includes('l')) longFormat = true;
      } else {
        remainingArgs.push(arg);
      }
    }
    if (remainingArgs.length > 0) targetPath = remainingArgs[0];

    const result = resolvePath(state.fs, state.cwd, targetPath);
    if (!result) {
      return { output: `ls: cannot access '${targetPath}': No such file or directory`, state, success: false };
    }

    if (result.node.type === 'file') {
      if (longFormat) {
        return {
          output: longFormatEntry(targetPath, 'file', result.node.content),
          state,
          success: true,
        };
      }
      return { output: targetPath, state, success: true };
    }

    const entries = listDir(result.node, showHidden);
    if (entries.length === 0) return { output: '', state, success: true };

    if (longFormat) {
      const lines = entries.map((e) => {
        const child = result.node.children[e.name];
        return longFormatEntry(e.name, e.type, child?.content);
      });
      return { output: lines.join('\n'), state, success: true };
    }

    return { output: entries.map((e) => e.name).join('  '), state, success: true };
  },

  cat: (args, state, pipeInput) => {
    if (pipeInput !== undefined) {
      // When used as the second side of a pipe, cat is not meaningful by itself
      return { output: pipeInput, state, success: true };
    }
    if (!args[0]) {
      return { output: 'cat: missing operand', state, success: false };
    }
    const content = getFileContent(state.fs, state.cwd, args[0]);
    const isError =
      content.startsWith('cat: ') &&
      (content.includes('No such file') || content.includes('Is a directory'));
    return { output: content, state, success: !isError };
  },

  head: (args, state, pipeInput) => {
    let n = 10;
    let filePath = null;
    let content;

    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('-') && args[i].length > 1 && !isNaN(args[i].slice(1))) {
        n = parseInt(args[i].slice(1), 10);
      } else if (args[i] === '-n' && args[i + 1]) {
        n = parseInt(args[i + 1], 10);
        i++;
      } else {
        filePath = args[i];
      }
    }

    if (pipeInput !== undefined) {
      content = pipeInput;
    } else if (filePath) {
      content = getFileContent(state.fs, state.cwd, filePath);
      if (
        content.startsWith('cat: ') &&
        (content.includes('No such file') || content.includes('Is a directory'))
      ) {
        return { output: content.replace('cat:', 'head:'), state, success: false };
      }
    } else {
      return { output: 'head: missing operand', state, success: false };
    }

    const lines = content.split('\n').slice(0, n).join('\n');
    return { output: lines, state, success: true };
  },

  tail: (args, state, pipeInput) => {
    let n = 10;
    let filePath = null;
    let content;

    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('-') && args[i].length > 1 && !isNaN(args[i].slice(1))) {
        n = parseInt(args[i].slice(1), 10);
      } else if (args[i] === '-n' && args[i + 1]) {
        n = parseInt(args[i + 1], 10);
        i++;
      } else {
        filePath = args[i];
      }
    }

    if (pipeInput !== undefined) {
      content = pipeInput;
    } else if (filePath) {
      content = getFileContent(state.fs, state.cwd, filePath);
      if (
        content.startsWith('cat: ') &&
        (content.includes('No such file') || content.includes('Is a directory'))
      ) {
        return { output: content.replace('cat:', 'tail:'), state, success: false };
      }
    } else {
      return { output: 'tail: missing operand', state, success: false };
    }

    const allLines = content.split('\n');
    const lines = allLines.slice(Math.max(0, allLines.length - n)).join('\n');
    return { output: lines, state, success: true };
  },

  less: (args, state) => {
    if (!args[0]) return { output: 'less: missing operand', state, success: false };
    const content = getFileContent(state.fs, state.cwd, args[0]);
    const isError =
      content.startsWith('cat: ') &&
      (content.includes('No such file') || content.includes('Is a directory'));
    if (isError) return { output: content.replace('cat:', 'less:'), state, success: false };
    return {
      output: content + '\n\n(In a real terminal, less lets you scroll. Here it shows the full file.)',
      state,
      success: true,
    };
  },

  // ---- File operations ---------------------------------------------------

  mkdir: (args, state) => {
    if (!args[0]) return { output: 'mkdir: missing operand', state, success: false };
    const newState = deepClone(state);
    const targetName = args[0];

    // Resolve parent path
    const parts = targetName.split('/').filter(Boolean);
    const dirName = parts.pop();
    const parentPath = parts.length === 0 ? '.' : parts.join('/');

    const parentResult = resolvePath(newState.fs, newState.cwd, parentPath);
    if (!parentResult || parentResult.node.type !== 'dir') {
      return { output: `mkdir: cannot create directory '${targetName}': No such file or directory`, state, success: false };
    }

    if (parentResult.node.children[dirName]) {
      return { output: `mkdir: cannot create directory '${targetName}': File exists`, state, success: false };
    }

    parentResult.node.children[dirName] = { type: 'dir', children: {} };
    return { output: '', state: newState, success: true };
  },

  touch: (args, state) => {
    if (!args[0]) return { output: 'touch: missing operand', state, success: false };
    const newState = deepClone(state);

    const parts = args[0].split('/').filter(Boolean);
    const fileName = parts.pop();
    const parentPath = parts.length === 0 ? '.' : parts.join('/');

    const parentResult = resolvePath(newState.fs, newState.cwd, parentPath);
    if (!parentResult || parentResult.node.type !== 'dir') {
      return { output: `touch: cannot touch '${args[0]}': No such file or directory`, state, success: false };
    }

    if (!parentResult.node.children[fileName]) {
      parentResult.node.children[fileName] = { type: 'file', content: '' };
    }
    // If exists, do nothing (like real touch)
    return { output: '', state: newState, success: true };
  },

  cp: (args, state) => {
    if (args.length < 2) return { output: 'cp: missing operand', state, success: false };
    const [src, dest] = args;
    const newState = deepClone(state);

    const srcResult = resolvePath(newState.fs, newState.cwd, src);
    if (!srcResult) return { output: `cp: ${src}: No such file or directory`, state, success: false };
    if (srcResult.node.type === 'dir') return { output: `cp: -r not specified; omitting directory '${src}'`, state, success: false };

    const content = srcResult.node.content;
    const destParts = dest.split('/').filter(Boolean);
    const destFile = destParts.pop();
    const destParentPath = destParts.length === 0 ? '.' : destParts.join('/');

    const destParent = resolvePath(newState.fs, newState.cwd, destParentPath);
    if (!destParent || destParent.node.type !== 'dir') {
      return { output: `cp: cannot create regular file '${dest}': No such file or directory`, state, success: false };
    }

    destParent.node.children[destFile] = { type: 'file', content };
    return { output: '', state: newState, success: true };
  },

  mv: (args, state) => {
    if (args.length < 2) return { output: 'mv: missing operand', state, success: false };
    const [src, dest] = args;
    const newState = deepClone(state);

    const srcResult = resolvePath(newState.fs, newState.cwd, src);
    if (!srcResult) return { output: `mv: cannot stat '${src}': No such file or directory`, state, success: false };

    const srcNode = srcResult.node;
    const srcAbs = srcResult.absolutePath;

    // Determine dest: if dest is an existing dir, move src inside it
    const destResult = resolvePath(newState.fs, newState.cwd, dest);
    let destAbs;
    if (destResult && destResult.node.type === 'dir') {
      const srcName = src.split('/').pop();
      destAbs = destResult.absolutePath + '/' + srcName;
    } else {
      // Resolve parent of dest
      const destParts = dest.split('/').filter(Boolean);
      const destFile = destParts.pop();
      const destParentPath = destParts.length === 0 ? '.' : destParts.join('/');
      const destParent = resolvePath(newState.fs, newState.cwd, destParentPath);
      if (!destParent || destParent.node.type !== 'dir') {
        return { output: `mv: cannot move '${src}' to '${dest}': No such file or directory`, state, success: false };
      }
      destParent.node.children[destFile] = srcNode;
      deleteNode(newState.fs, srcAbs);
      return { output: '', state: newState, success: true };
    }

    // Place node at destAbs
    writeFile(newState.fs, destAbs, srcNode.type === 'file' ? srcNode.content : '');
    if (srcNode.type === 'dir') {
      const destResolved = resolvePath(newState.fs, '/', destAbs);
      if (destResolved) destResolved.node.children = deepClone(srcNode.children);
    }
    deleteNode(newState.fs, srcAbs);
    return { output: '', state: newState, success: true };
  },

  rm: (args, state) => {
    if (!args[0] || args.filter((a) => !a.startsWith('-')).length === 0) {
      return { output: 'rm: missing operand', state, success: false };
    }

    const flags = args.filter((a) => a.startsWith('-'));
    const targets = args.filter((a) => !a.startsWith('-'));
    const recursive = flags.some((f) => f.includes('r') || f.includes('R') || f.includes('f'));

    const newState = deepClone(state);

    for (const target of targets) {
      const result = resolvePath(newState.fs, newState.cwd, target);
      if (!result) {
        return { output: `rm: cannot remove '${target}': No such file or directory`, state, success: false };
      }
      if (result.node.type === 'dir' && !recursive) {
        return { output: `rm: cannot remove '${target}': Is a directory (use -rf to remove directories)`, state, success: false };
      }
      deleteNode(newState.fs, result.absolutePath);
    }

    const warnings = [
      "Warning: In a real terminal, rm is permanent. There's no trash — deleted files are gone.",
      "Tip: Use 'rm -i' to confirm each deletion, or 'git' to back up important files first.",
    ];
    return { output: warnings.join('\n'), state: newState, success: true };
  },

  chmod: (_args, _state, _pipeInput) => ({
    output:
      'chmod changes file permissions. Example: chmod 755 script.sh makes it executable.\n(Not simulated — permissions are display-only here.)',
    state: _state,
    success: true,
  }),

  // ---- Search ------------------------------------------------------------

  find: (args, state) => {
    // find [dir] -name "pattern"
    let startPath = '.';
    let pattern = '*';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-name' && args[i + 1]) {
        pattern = args[i + 1];
        i++;
      } else if (!args[i].startsWith('-')) {
        startPath = args[i];
      }
    }

    const startResult = resolvePath(state.fs, state.cwd, startPath);
    if (!startResult || startResult.node.type !== 'dir') {
      return { output: `find: '${startPath}': No such directory`, state, success: false };
    }

    const matches = findFiles(startResult.node, pattern);
    if (matches.length === 0) return { output: '', state, success: true };

    const prefix = startPath === '.' ? '.' : startPath;
    const output = matches.map((m) => `${prefix}/${m}`).join('\n');
    return { output, state, success: true };
  },

  grep: (args, state, pipeInput) => {
    if (args.length === 0) {
      return { output: 'grep: missing pattern', state, success: false };
    }

    let recursive = false;
    let pattern = null;
    let filePath = null;
    const cleanArgs = [];

    for (const arg of args) {
      if (arg === '-r' || arg === '-R') recursive = true;
      else if (arg === '-rn' || arg === '-nr' || arg === '-Rn' || arg === '-nR') {
        recursive = true;
      } else cleanArgs.push(arg);
    }

    if (cleanArgs.length === 0) return { output: 'grep: missing pattern', state, success: false };
    pattern = cleanArgs[0];
    filePath = cleanArgs[1] || null;

    const search = (content, label) => {
      const lines = content.split('\n');
      const matches = [];
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(pattern.toLowerCase())) {
          matches.push(label ? `${label}:${idx + 1}:${line}` : `${idx + 1}: ${line}`);
        }
      });
      return matches;
    };

    if (pipeInput !== undefined) {
      const matches = search(pipeInput, null);
      return { output: matches.join('\n'), state, success: true };
    }

    if (recursive) {
      const startResult = resolvePath(state.fs, state.cwd, filePath || '.');
      if (!startResult || startResult.node.type !== 'dir') {
        return { output: `grep: ${filePath || '.'}: No such directory`, state, success: false };
      }
      const files = collectFiles(startResult.node);
      const allMatches = [];
      for (const f of files) {
        const matches = search(f.content, f.path);
        allMatches.push(...matches);
      }
      return { output: allMatches.join('\n'), state, success: true };
    }

    if (!filePath) return { output: 'grep: missing file operand', state, success: false };

    const content = getFileContent(state.fs, state.cwd, filePath);
    const isError =
      content.startsWith('cat: ') &&
      (content.includes('No such file') || content.includes('Is a directory'));
    if (isError) return { output: content.replace('cat:', 'grep:'), state, success: false };

    const matches = search(content, null);
    return { output: matches.join('\n'), state, success: matches.length > 0 };
  },

  // ---- Git ---------------------------------------------------------------

  git: (args, state) => {
    if (!isInGitRepo(state.cwd)) {
      return {
        output: 'fatal: not a git repository (or any of the parent directories): .git',
        state,
        success: false,
      };
    }

    const sub = args[0];
    const rest = args.slice(1);

    switch (sub) {
      case 'status': {
        const g = state.gitState;
        const lines = [
          `On branch ${g.currentBranch}`,
          '',
          g.staged.length > 0
            ? `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n${g.staged.map((f) => `\t\tnew file:   ${f}`).join('\n')}`
            : null,
          g.modified.length > 0
            ? `Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n${g.modified.map((f) => `\t\tmodified:   ${f}`).join('\n')}`
            : null,
          g.untracked.length > 0
            ? `Untracked files:\n  (use "git add <file>..." to include in what will be committed)\n${g.untracked.map((f) => `\t\t${f}`).join('\n')}`
            : null,
          g.staged.length === 0 && g.modified.length === 0 && g.untracked.length === 0
            ? 'nothing to commit, working tree clean'
            : null,
        ]
          .filter(Boolean)
          .join('\n');
        return { output: lines, state, success: true };
      }

      case 'log': {
        const g = state.gitState;
        const oneline = rest.includes('--oneline');
        let limit = null;
        for (const r of rest) {
          const m = r.match(/^-(\d+)$/);
          if (m) limit = parseInt(m[1], 10);
        }
        let commits = g.commits.slice();
        if (limit !== null) commits = commits.slice(0, limit);

        if (oneline) {
          return {
            output: commits.map((c) => `${c.hash}  ${c.message}`).join('\n'),
            state,
            success: true,
          };
        }

        const fakeCommitDate = 'Thu Apr 02 2026 10:00:00 +1000';
        const lines = commits
          .map(
            (c) =>
              `commit ${c.hash}\nAuthor: Stuart <stuart@stitch.io>\nDate:   ${fakeCommitDate}\n\n    ${c.message}`
          )
          .join('\n\n');
        return { output: lines, state, success: true };
      }

      case 'add': {
        if (!rest[0]) {
          return { output: 'Nothing specified, nothing added.', state, success: false };
        }
        const newState = deepClone(state);
        const g = newState.gitState;
        const target = rest[0];

        if (target === '.' || target === '-A') {
          // Stage everything
          const toAdd = [...g.modified, ...g.untracked].filter((f) => !g.staged.includes(f));
          g.staged.push(...toAdd);
          g.modified = [];
          g.untracked = [];
        } else {
          const inModified = g.modified.indexOf(target);
          const inUntracked = g.untracked.indexOf(target);
          if (inModified === -1 && inUntracked === -1 && !g.staged.includes(target)) {
            return { output: `error: pathspec '${target}' did not match any files`, state, success: false };
          }
          if (inModified !== -1) { g.modified.splice(inModified, 1); if (!g.staged.includes(target)) g.staged.push(target); }
          if (inUntracked !== -1) { g.untracked.splice(inUntracked, 1); if (!g.staged.includes(target)) g.staged.push(target); }
        }
        return { output: '', state: newState, success: true };
      }

      case 'commit': {
        const newState = deepClone(state);
        const g = newState.gitState;
        if (g.staged.length === 0) {
          return { output: 'nothing to commit, working tree clean', state, success: false };
        }
        const mIdx = rest.indexOf('-m');
        const message = mIdx !== -1 && rest[mIdx + 1] ? rest[mIdx + 1] : 'WIP';
        const hash = Math.random().toString(16).slice(2, 9);
        g.commits.unshift({ hash, message });
        const count = g.staged.length;
        g.staged = [];
        return {
          output: `[${g.currentBranch} ${hash}] ${message}\n ${count} file${count !== 1 ? 's' : ''} changed`,
          state: newState,
          success: true,
        };
      }

      case 'branch': {
        const g = state.gitState;
        if (rest.length === 0) {
          const lines = g.branches.map((b) =>
            b === g.currentBranch ? `* ${b}` : `  ${b}`
          );
          return { output: lines.join('\n'), state, success: true };
        }
        const newName = rest[0];
        if (g.branches.includes(newName)) {
          return { output: `fatal: A branch named '${newName}' already exists.`, state, success: false };
        }
        const newState = deepClone(state);
        newState.gitState.branches.push(newName);
        return { output: '', state: newState, success: true };
      }

      case 'checkout': {
        const newState = deepClone(state);
        const g = newState.gitState;
        if (rest[0] === '-b') {
          const name = rest[1];
          if (!name) return { output: 'error: switch `b\' requires a value', state, success: false };
          if (g.branches.includes(name)) {
            return { output: `fatal: A branch named '${name}' already exists.`, state, success: false };
          }
          g.branches.push(name);
          g.currentBranch = name;
          return { output: `Switched to a new branch '${name}'`, state: newState, success: true };
        }
        const name = rest[0];
        if (!name) return { output: 'error: missing branch name', state, success: false };
        if (!g.branches.includes(name)) {
          return { output: `error: pathspec '${name}' did not match any file(s) known to git`, state, success: false };
        }
        g.currentBranch = name;
        return { output: `Switched to branch '${name}'`, state: newState, success: true };
      }

      case 'merge': {
        const branch = rest[0];
        if (!branch) return { output: 'error: specify a branch to merge', state, success: false };
        const g = state.gitState;
        if (!g.branches.includes(branch)) {
          return { output: `merge: ${branch} - not something we can merge`, state, success: false };
        }
        return {
          output: `Merged ${branch} into ${g.currentBranch}. (Fast-forward)`,
          state,
          success: true,
        };
      }

      case 'diff': {
        const g = state.gitState;
        if (g.modified.length === 0) {
          return { output: '', state, success: true };
        }
        const diffs = g.modified
          .map((f) => g.diffContent[f] || `diff --git a/${f} b/${f}\n(no diff data)`)
          .join('\n\n');
        return { output: diffs, state, success: true };
      }

      case 'clone': {
        return {
          output:
            'git clone <url> copies a remote repo to your machine. (Not simulated — there\'s no network here.)',
          state,
          success: true,
        };
      }

      case 'blame': {
        const filePath = rest[0];
        if (!filePath) return { output: 'usage: git blame <file>', state, success: false };
        const content = getFileContent(state.fs, state.cwd, filePath);
        const isError =
          content.startsWith('cat: ') &&
          (content.includes('No such file') || content.includes('Is a directory'));
        if (isError) return { output: `fatal: no such path '${filePath}'`, state, success: false };

        const g = state.gitState;
        const hashes = g.commits.map((c) => c.hash);
        const lines = content.split('\n').map((line, i) => {
          const hash = hashes[i % hashes.length];
          return `${hash} (Stuart 2026-04-02 ${String(i + 1).padStart(4)}) ${line}`;
        });
        return { output: lines.join('\n'), state, success: true };
      }

      case 'push': {
        return {
          output: `Pushed to origin/${state.gitState.currentBranch}. (Simulated — no real remote.)`,
          state,
          success: true,
        };
      }

      case 'pull': {
        return {
          output: 'Already up to date. (Simulated — no real remote.)',
          state,
          success: true,
        };
      }

      case 'stash': {
        return {
          output:
            'git stash temporarily shelves changes. git stash pop restores them. (Not simulated.)',
          state,
          success: true,
        };
      }

      default:
        return {
          output: `git: '${sub}' is not a git command. Run 'git --help' for a list of valid commands.`,
          state,
          success: false,
        };
    }
  },

  // ---- Claude Code -------------------------------------------------------

  claude: (args, state) => {
    const sub = args[0];

    if (!sub || sub === '--help' || sub === '-h') {
      return {
        output: [
          'Claude Code — AI coding agent in your terminal',
          '',
          'Usage: claude [options] [prompt]',
          '',
          'Options:',
          '  -w "name"          Start/resume a named worktree session (separate git worktree + isolated agent)',
          '  --agent <name>     Load a named sub-agent from .claude/agents/ directory',
          '  --add-dir <path>   Add an extra directory to the session context',
          '  --teleport         Resume a desktop session from your mobile device',
          '  --bare             Start without loading CLAUDE.md or skills (minimal mode)',
          '  -p "question"      One-shot mode: ask a question, print answer, exit immediately',
          '  --help             Show this help',
          '',
          'Slash commands (type inside a session):',
          '  /branch            Create a git branch tied to the current task',
          '  /btw               Annotate the conversation with a side note',
          '  /batch             Run multiple prompts sequentially as a batch',
          '  /loop              Repeat a prompt on a timed interval',
          '  /schedule          Schedule a task to run at a future time',
          '  /update-config     Edit Claude Code settings without leaving the session',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === '-w') {
      return {
        output: [
          'claude -w "name" — Worktree sessions',
          '',
          'Creates a separate git worktree (like having a second desk) where an isolated',
          'Claude Code agent can work on a feature branch without touching your current branch.',
          '',
          'Example: claude -w "auth-refactor"',
          '  → Creates branch worktree/auth-refactor',
          '  → Spawns an agent in that workspace',
          '  → Your main working directory is unaffected',
          '',
          'Use case: run two agents in parallel — one writing tests, one writing code.',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === '--agent') {
      return {
        output: [
          'claude --agent <name> — Named agents',
          '',
          'Loads a pre-configured sub-agent from .claude/agents/<name>.md',
          'Each agent file defines a persona, role, and set of instructions.',
          '',
          'Example: claude --agent "code-reviewer"',
          '  → Reads .claude/agents/code-reviewer.md',
          '  → Starts a session with that agent\'s persona and instructions',
          '',
          'Useful for: specialist agents (security auditor, test writer, docs writer).',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === '--add-dir') {
      return {
        output: [
          'claude --add-dir <path> — Multi-directory sessions',
          '',
          'Adds an extra directory to the session context so Claude Code can read and',
          'edit files from both your current project and another path.',
          '',
          'Example: claude --add-dir ~/shared-components',
          '  → Session context includes both cwd and ~/shared-components',
          '',
          'Useful for: monorepos, shared libraries, or reading config from another project.',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === '--teleport') {
      return {
        output: [
          'claude --teleport — Mobile-to-desktop session resume',
          '',
          'Generates a short code that lets you resume a Claude Code desktop session',
          'from the Claude mobile app — pick up exactly where you left off.',
          '',
          'Useful for: reviewing a long task on your phone while away from your desk.',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === '--bare') {
      return {
        output: [
          'claude --bare — Minimal mode',
          '',
          'Starts Claude Code without loading CLAUDE.md, skills, or project-specific',
          'instructions. Useful for a clean session or when working outside a project.',
          '',
          'Compare:',
          '  claude          → full context (CLAUDE.md + skills loaded)',
          '  claude --bare   → raw Claude, no project context',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === '-p') {
      const question = args.slice(1).join(' ');
      return {
        output: [
          'claude -p "<question>" — One-shot mode',
          '',
          `You asked: "${question || '...'}"`,
          '',
          'In one-shot mode Claude Code answers your question and exits immediately.',
          'Great for: quick lookups, piping answers into other commands, CI scripts.',
          '',
          'Example: claude -p "What does this function do?" < src/utils.js',
        ].join('\n'),
        state,
        success: true,
      };
    }

    // Slash commands
    const slashMap = {
      '/branch': [
        '/branch — Create a git branch tied to the current task',
        '',
        'Creates a new branch from your current HEAD, named after your task description.',
        'Example: /branch  →  creates "task/fix-header-layout" and checks it out.',
      ],
      '/btw': [
        '/btw <note> — Annotate the conversation with a side note',
        '',
        'Adds a visible annotation to the chat without triggering a new AI response.',
        'Useful for leaving breadcrumbs or context for future messages.',
        'Example: /btw This component is deprecated — use NewComponent instead.',
      ],
      '/batch': [
        '/batch — Run multiple prompts sequentially',
        '',
        'Lets you queue a list of prompts that run one after another without intervention.',
        'Example:',
        '  /batch',
        '  Refactor auth module',
        '  Write tests for auth module',
        '  Update README for auth changes',
      ],
      '/loop': [
        '/loop <interval> <command> — Repeat a command on a timed interval',
        '',
        'Runs a command repeatedly at the specified interval (e.g. 5m, 10s).',
        'Example: /loop 5m check if the build is passing',
      ],
      '/schedule': [
        '/schedule — Schedule a task to run at a future time',
        '',
        'Creates a scheduled remote agent that fires at a cron time or specific datetime.',
        'Example: /schedule 09:00 tomorrow  →  run this task at 9am the next morning.',
      ],
      '/update-config': [
        '/update-config — Edit Claude Code settings inline',
        '',
        'Opens the settings editor within your current session so you can change',
        'hooks, preferences, or model settings without leaving the terminal.',
      ],
    };

    if (slashMap[sub]) {
      return { output: slashMap[sub].join('\n'), state, success: true };
    }

    return {
      output: `claude: unknown option '${sub}'. Run 'claude --help' for usage.`,
      state,
      success: false,
    };
  },

  // ---- Dev tools ---------------------------------------------------------

  npm: (args, state) => {
    const sub = args[0];

    if (!sub) {
      return {
        output: 'Usage: npm <command>\nCommon commands: install, run, init\nRun "npm --help" for more.',
        state,
        success: true,
      };
    }

    if (sub === '--version' || sub === '-v') {
      return { output: '10.2.4', state, success: true };
    }

    if (sub === 'install' || sub === 'i') {
      return {
        output: [
          'npm install reads package.json and installs all listed dependencies into node_modules/.',
          '',
          'Examples:',
          '  npm install              — install all dependencies',
          '  npm install express      — add a new package',
          '  npm install --save-dev jest  — add a dev-only dependency',
          '',
          '(Not simulated — there is no network or node_modules here.)',
        ].join('\n'),
        state,
        success: true,
      };
    }

    if (sub === 'run') {
      const script = args[1];
      if (!script) {
        return {
          output: [
            'npm run executes a script defined in the "scripts" section of package.json.',
            '',
            'Available scripts in this project:',
            '  npm run dev      — start Vite development server',
            '  npm run build    — production build',
            '  npm run start    — start Express server',
            '  npm run preview  — preview production build',
          ].join('\n'),
          state,
          success: true,
        };
      }
      const scripts = {
        dev: 'Starting Vite dev server on http://localhost:5173 ...',
        build: 'Building for production into dist/ ...',
        start: 'Starting Express server on port 3003 ...',
        preview: 'Starting Vite preview on http://localhost:4173 ...',
      };
      const out = scripts[script] || `npm error: Missing script: "${script}"`;
      return { output: `${out}\n(Not simulated — no actual server started.)`, state, success: true };
    }

    if (sub === 'init') {
      return {
        output: [
          'npm init creates a new package.json in the current directory.',
          'It asks a series of questions (name, version, description, entry point, etc.)',
          'and writes your answers to package.json.',
          '',
          'Quick form: npm init -y  — accepts all defaults without prompting.',
        ].join('\n'),
        state,
        success: true,
      };
    }

    return {
      output: `npm: unknown command: "${sub}". Run "npm --help" for a list of commands.`,
      state,
      success: false,
    };
  },

  node: (args, state) => {
    if (args[0] === '--version' || args[0] === '-v') {
      return { output: 'v20.11.0', state, success: true };
    }
    return {
      output: 'node — JavaScript runtime. Run "node --version" to check your version.\n(Not simulated — no Node.js runtime here.)',
      state,
      success: true,
    };
  },

  docker: (args, state) => {
    const sub = args[0];
    const messages = {
      build:
        'docker build [options] <path>\nBuilds a Docker image from a Dockerfile in <path>.\nExample: docker build -t my-app:latest .\n(Not simulated — no Docker daemon here.)',
      run:
        'docker run [options] <image>\nCreates and starts a container from an image.\nExample: docker run -p 3003:3003 my-app:latest\n(Not simulated.)',
      ps:
        'docker ps — lists running containers.\nAdd -a to include stopped containers.\nExample: docker ps -a\n(Not simulated.)',
      logs:
        'docker logs <container-id>\nFetches stdout/stderr from a running or stopped container.\nAdd -f to follow (tail) the logs live.\n(Not simulated.)',
    };
    const msg = messages[sub] || 'docker — container platform. Common subcommands: build, run, ps, logs.\n(Not simulated — no Docker daemon here.)';
    return { output: msg, state, success: true };
  },

  ssh: (args, state) => {
    const target = args[0] || '<user@host>';
    return {
      output: [
        `ssh ${target}`,
        '',
        'ssh (Secure Shell) opens an encrypted remote terminal session.',
        'Example: ssh user@example.com',
        '',
        'Common flags:',
        '  -i ~/.ssh/key.pem   use a specific private key',
        '  -p 2222             connect on a non-standard port',
        '  -L 3000:localhost:3000  local port forwarding',
        '',
        '(Not simulated — there is no remote host here.)',
      ].join('\n'),
      state,
      success: true,
    };
  },

  'ssh-keygen': (_args, state) => ({
    output: [
      'ssh-keygen — generate an SSH key pair.',
      '',
      'Example: ssh-keygen -t ed25519 -C "you@example.com"',
      '  → Creates ~/.ssh/id_ed25519 (private) and ~/.ssh/id_ed25519.pub (public)',
      '',
      'Copy your public key to a server:',
      '  ssh-copy-id user@host',
      '',
      '(Not simulated — no SSH agent running here.)',
    ].join('\n'),
    state,
    success: true,
  }),

  fly: (args, state) => {
    const sub = args[0];
    const messages = {
      deploy:
        'fly deploy — builds and deploys your app to Fly.io.\nRequires fly.toml in the project root.\nTip: always git push before fly deploy.\n(Not simulated.)',
      logs:
        'fly logs — streams live application logs from your Fly machine.\nUse Ctrl+C to stop following.\n(Not simulated.)',
      status:
        'fly status — shows the health and state of your Fly app and its machines.\n(Not simulated.)',
      secrets:
        'fly secrets set KEY=value — securely stores environment variables on Fly.io.\nExample: fly secrets set FAL_KEY=sk-prod-...\n(Not simulated.)',
    };
    const msg = messages[sub] || 'fly — Fly.io CLI. Subcommands: deploy, logs, status, secrets.\n(Not simulated — no Fly.io connection here.)';
    return { output: msg, state, success: true };
  },

  // ---- Utilities ---------------------------------------------------------

  clear: (_args, state) => ({ output: '__CLEAR__', state, success: true }),

  echo: (args, state) => {
    const text = args.join(' ');
    return { output: text, state, success: true };
  },

  whoami: (_args, state) => ({ output: 'stuarta', state, success: true }),

  help: (_args, state) => {
    const lines = [
      'Available commands',
      '==================',
      '',
      'Navigation & Inspection',
      '  pwd         Print current directory',
      '  cd          Change directory',
      '  ls          List directory contents  (-l long format, -a show hidden)',
      '  cat         Print file contents',
      '  head        Print first N lines of a file  (default 10)',
      '  tail        Print last N lines of a file   (default 10)',
      '  less        View file contents (full, with note about scrolling)',
      '',
      'File Operations',
      '  mkdir       Create directory',
      '  touch       Create empty file (or update timestamp)',
      '  cp          Copy file',
      '  mv          Move or rename file',
      '  rm          Delete file  (-rf for directories)',
      '  chmod       Explain file permissions (display-only)',
      '',
      'Search',
      '  find        Find files by name pattern   (find . -name "*.js")',
      '  grep        Search file content          (grep "term" file  |  grep -r "term")',
      '',
      'Git',
      '  git status  Show working tree status',
      '  git log     Show commit history  (--oneline, -N)',
      '  git add     Stage files',
      '  git commit  Commit staged changes  (-m "message")',
      '  git branch  List or create branches',
      '  git checkout  Switch branches  (-b to create)',
      '  git merge   Merge a branch',
      '  git diff    Show unstaged changes',
      '  git clone   Explain cloning (not simulated)',
      '  git blame   Show per-line commit annotations',
      '  git push    Push to remote (simulated)',
      '  git pull    Pull from remote (simulated)',
      '  git stash   Explain stashing (not simulated)',
      '',
      'Claude Code',
      '  claude --help       List all flags',
      '  claude -w "name"    Worktree session',
      '  claude --agent      Named sub-agents',
      '  claude --add-dir    Multi-directory context',
      '  claude --teleport   Mobile session resume',
      '  claude --bare       Minimal mode',
      '  claude -p "q"       One-shot query',
      '  claude /branch      Slash commands (branch, btw, batch, loop, schedule, update-config)',
      '',
      'Dev Tools',
      '  npm install / run / init   npm commands (explained)',
      '  node --version             Node.js version',
      '  docker build/run/ps/logs   Docker commands (explained)',
      '  ssh                        Explain SSH',
      '  ssh-keygen                 Generate SSH keys (explained)',
      '  fly deploy/logs/status/secrets  Fly.io commands (explained)',
      '',
      'Utilities',
      '  clear      Clear the terminal',
      '  echo       Print text',
      '  whoami     Print current user',
      '  help       Show this help',
      '  man        Detailed help for a command',
    ];
    return { output: lines.join('\n'), state, success: true };
  },

  man: (args, state) => {
    const cmd = args[0];
    if (!cmd) return { output: 'What manual page do you want?\nUsage: man <command>', state, success: false };

    const manPages = {
      ls: 'ls — list directory contents\n\nSYNOPSIS\n  ls [options] [path]\n\nOPTIONS\n  -l    long listing format\n  -a    show hidden files\n  -la   long format + hidden',
      cd: 'cd — change working directory\n\nSYNOPSIS\n  cd [path]\n\nEXAMPLES\n  cd src         move into src/\n  cd ..          go up one level\n  cd ~           go to home directory\n  cd /abs/path   absolute path',
      cat: 'cat — concatenate and print files\n\nSYNOPSIS\n  cat <file>\n\nDESCRIPTION\n  Reads a file and prints its content to stdout. Errors if file not found or is a directory.',
      grep: 'grep — search file content\n\nSYNOPSIS\n  grep [options] "pattern" [file]\n\nOPTIONS\n  -r    recursive search from directory\n\nEXAMPLES\n  grep "import" src/App.jsx\n  grep -r "TODO" .\n  cat file | grep "term"',
      git: 'git — the version control system\n\nSYNOPSIS\n  git <subcommand> [args]\n\nCOMMON SUBCOMMANDS\n  status, log, add, commit, branch, checkout, merge, diff, push, pull, clone, blame, stash\n\nRun: git <subcommand> --help for details.',
      find: 'find — search for files\n\nSYNOPSIS\n  find [dir] -name "pattern"\n\nEXAMPLES\n  find . -name "*.jsx"\n  find src -name "App*"',
      rm: 'rm — remove files or directories\n\nSYNOPSIS\n  rm [options] <file>\n\nOPTIONS\n  -r    recursive (for directories)\n  -f    force (no prompt)\n  -rf   recursive + force\n\nWARNING: rm is permanent. No trash/undo.',
      chmod: 'chmod — change file mode bits\n\nSYNOPSIS\n  chmod <mode> <file>\n\nEXAMPLES\n  chmod 755 script.sh   — owner can execute, others read\n  chmod 644 config.txt  — owner can write, others read\n\n(Display-only in this simulator.)',
      ssh: 'ssh — OpenSSH remote login\n\nSYNOPSIS\n  ssh [options] user@host\n\nOPTIONS\n  -i <key>    identity file\n  -p <port>   port\n  -L          local port forwarding',
      npm: 'npm — Node Package Manager\n\nSYNOPSIS\n  npm <command> [args]\n\nCOMMANDS\n  install    install dependencies\n  run        run a script from package.json\n  init       create a new package.json',
    };

    const page = manPages[cmd] || `No manual entry for ${cmd}`;
    return { output: page, state, success: !!manPages[cmd] };
  },
};

// ---------------------------------------------------------------------------
// Pipe and redirect helpers
// ---------------------------------------------------------------------------

/**
 * Handle > and >> redirect operators.
 * Only supports: echo > file, echo >> file, cat file > newfile, cat file >> newfile.
 */
function handleRedirect(seg, nextSeg, state, operator) {
  const cmd = seg.command;
  const args = seg.args;
  const destFile = nextSeg.command; // the "command" of the redirect target is just the filename

  if (cmd !== 'echo' && cmd !== 'cat') {
    return {
      output: `Redirect not supported for '${cmd}' in the simulator.`,
      state,
      success: false,
    };
  }

  let content;
  if (cmd === 'echo') {
    content = args.join(' ');
  } else {
    // cat
    const srcFile = args[0];
    if (!srcFile) return { output: 'cat: missing operand', state, success: false };
    content = getFileContent(state.fs, state.cwd, srcFile);
    const isError =
      content.startsWith('cat: ') &&
      (content.includes('No such file') || content.includes('Is a directory'));
    if (isError) return { output: content, state, success: false };
  }

  if (!destFile) {
    return { output: 'Redirect error: missing destination file', state, success: false };
  }

  const newState = deepClone(state);
  const destResult = resolvePath(newState.fs, newState.cwd, destFile);
  let existingContent = '';

  if (destResult && destResult.node.type === 'file') {
    existingContent = destResult.node.content;
    const finalContent = operator === '>>' ? existingContent + '\n' + content : content;
    destResult.node.content = finalContent;
  } else {
    // Create new file
    const parts = destFile.split('/').filter(Boolean);
    const fileName = parts.pop();
    const parentPath = parts.length === 0 ? '.' : parts.join('/');
    const parentResult = resolvePath(newState.fs, newState.cwd, parentPath);
    if (!parentResult || parentResult.node.type !== 'dir') {
      return { output: `bash: ${destFile}: No such file or directory`, state, success: false };
    }
    parentResult.node.children[fileName] = { type: 'file', content };
  }

  return { output: '', state: newState, success: true };
}

/**
 * Execute a single command segment, returning { output, state, success }.
 */
function runSegment(seg, state, pipeInput) {
  const { command, args } = seg;
  if (!command) return { output: '', state, success: true };

  const handler = COMMANDS[command];
  if (!handler) {
    return {
      output: `${command}: command not found. Type 'help' to see available commands.`,
      state,
      success: false,
    };
  }

  return handler(args, state, pipeInput);
}

// ---------------------------------------------------------------------------
// Main executor
// ---------------------------------------------------------------------------

/**
 * executeCommand — execute parsed segments with operator chaining.
 * @param {Array} segments  - from parseInput()
 * @param {{ fs, cwd, gitState }} state
 * @returns {{ output: string, state: object }}
 */
export function executeCommand(segments, state) {
  if (!segments || segments.length === 0) {
    return { output: '', state };
  }

  let currentState = state;
  let lastOutput = '';
  let lastSuccess = true;
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];
    const operator = seg.operator; // what follows this segment

    // Handle pipe: look ahead for a pipe pair
    if (operator === '|') {
      const left = seg;
      const right = segments[i + 1];

      if (!right) {
        lastOutput = 'Pipe error: missing command after |';
        lastSuccess = false;
        i++;
        continue;
      }

      const supportedLeft = ['ls', 'cat'];
      const supportedRight = ['grep', 'head', 'tail'];

      if (!supportedLeft.includes(left.command) || !supportedRight.includes(right.command)) {
        lastOutput =
          'Pipe not supported for this combination in the simulator.';
        lastSuccess = false;
        i += 2;
        continue;
      }

      const leftResult = runSegment(left, currentState, undefined);
      currentState = leftResult.state;

      if (!leftResult.success) {
        lastOutput = leftResult.output;
        lastSuccess = false;
        i += 2;
        continue;
      }

      const rightResult = runSegment(right, currentState, leftResult.output);
      currentState = rightResult.state;
      lastOutput = rightResult.output;
      lastSuccess = rightResult.success;
      i += 2;
      continue;
    }

    // Handle > and >> redirect: the current segment writes to next segment's "command" (filename)
    if (operator === '>' || operator === '>>') {
      const nextSeg = segments[i + 1];
      const result = handleRedirect(seg, nextSeg || { command: '', args: [] }, currentState, operator);
      currentState = result.state;
      lastOutput = result.output;
      lastSuccess = result.success;
      i += 2; // consume both the command and the filename segment
      continue;
    }

    // Normal execution
    if (operator === '&&' && !lastSuccess) {
      // Previous failed — skip
      i++;
      continue;
    }

    // For ';' or null operator (last), run regardless
    const result = runSegment(seg, currentState, undefined);
    currentState = result.state;
    lastOutput = result.output;
    lastSuccess = result.success;
    i++;
  }

  return { output: lastOutput, state: currentState };
}
