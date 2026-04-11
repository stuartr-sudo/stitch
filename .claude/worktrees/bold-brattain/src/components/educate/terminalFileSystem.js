/**
 * terminalFileSystem.js
 * Simulated filesystem for the CLI learning page terminal.
 *
 * Node shapes:
 *   { type: 'dir',  children: { [name]: node } }
 *   { type: 'file', content: string }
 */

// ---------------------------------------------------------------------------
// Filesystem definition
// ---------------------------------------------------------------------------

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
              '.bashrc': {
                type: 'file',
                content: '# Shell config file',
              },
              '.gitconfig': {
                type: 'file',
                content: '[user]\n  name = Stuart\n  email = stuart@stitch.io',
              },
              project: {
                type: 'dir',
                children: {
                  '.git': {
                    type: 'dir',
                    children: {},
                  },
                  '.env': {
                    type: 'file',
                    content:
                      'VITE_SUPABASE_URL=https://example.supabase.co\nFAL_KEY=sk-test-123',
                  },
                  'package.json': {
                    type: 'file',
                    content: JSON.stringify(
                      {
                        name: 'my-app',
                        version: '1.0.0',
                        scripts: {
                          dev: 'vite',
                          build: 'vite build',
                          start: 'node server.js',
                          preview: 'vite preview',
                        },
                        dependencies: {
                          react: '^18.3.1',
                          'react-dom': '^18.3.1',
                          express: '^4.19.2',
                          tailwindcss: '^3.4.1',
                        },
                      },
                      null,
                      2
                    ),
                  },
                  'server.js': {
                    type: 'file',
                    content: `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`,
                  },
                  'README.md': {
                    type: 'file',
                    content: `# my-app

A full-stack web application.

## Setup

1. Install dependencies:

   \`\`\`bash
   npm install
   \`\`\`

2. Copy the environment template and fill in your values:

   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Start the development server:

   \`\`\`bash
   npm run dev
   \`\`\`

## Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express API on port 3003
- **Database**: Supabase (Postgres + Auth + Storage)

API routes live in \`api/\`. Frontend source is in \`src/\`.`,
                  },
                  src: {
                    type: 'dir',
                    children: {
                      'App.jsx': {
                        type: 'file',
                        content: `import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold">Welcome to my-app</h1>
        <p className="mt-4 text-gray-600">
          Edit <code>src/App.jsx</code> to get started.
        </p>
      </main>
      <Footer />
    </div>
  );
}`,
                      },
                      'main.jsx': {
                        type: 'file',
                        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
                      },
                      components: {
                        type: 'dir',
                        children: {
                          'Header.jsx': {
                            type: 'file',
                            content: `import React from 'react';

export default function Header() {
  return (
    <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
      <span className="text-xl font-semibold">my-app</span>
      <nav className="flex gap-6 text-sm text-gray-600">
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>
  );
}`,
                          },
                          'Footer.jsx': {
                            type: 'file',
                            content: `import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t px-8 py-4 text-center text-sm text-gray-500">
      &copy; {new Date().getFullYear()} my-app. All rights reserved.
    </footer>
  );
}`,
                          },
                        },
                      },
                    },
                  },
                  api: {
                    type: 'dir',
                    children: {
                      'users.js': {
                        type: 'file',
                        content: `export default async function handler(req, res) {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob',   email: 'bob@example.com'   },
    { id: 3, name: 'Carol', email: 'carol@example.com' },
  ];
  res.json({ users });
}`,
                      },
                      'health.js': {
                        type: 'file',
                        content: `export default async function handler(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}`,
                      },
                    },
                  },
                  docs: {
                    type: 'dir',
                    children: {
                      'setup.md': {
                        type: 'file',
                        content: `# Setup

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier is fine)

## Steps

### 1. Clone the repo

\`\`\`bash
git clone https://github.com/example/my-app.git
cd my-app
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure environment variables

Copy \`.env.example\` to \`.env\` and fill in:

- \`VITE_SUPABASE_URL\` — your project URL from Supabase dashboard
- \`FAL_KEY\` — API key from fal.ai

### 4. Run the dev server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at http://localhost:5173.`,
                      },
                      'api-reference.md': {
                        type: 'file',
                        content: `# API Reference

Base URL: \`http://localhost:3003\`

## Endpoints

### GET /api/health

Returns server status.

**Response**
\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-04-02T00:00:00.000Z",
  "uptime": 42.3
}
\`\`\`

---

### GET /api/users

Returns list of registered users.

**Response**
\`\`\`json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" }
  ]
}
\`\`\``,
                      },
                    },
                  },
                },
              },
              notes: {
                type: 'dir',
                children: {
                  'todo.txt': {
                    type: 'file',
                    content: `TODO
====
[ ] Finish API integration tests
[ ] Update README with deployment instructions
[ ] Review pull request from Alice`,
                  },
                  'meeting-notes.txt': {
                    type: 'file',
                    content: `Q1 Review — 2026-03-28
======================

Attendees: Stuart, Alice, Bob

Agenda:
  1. Q1 metrics recap
  2. Roadmap priorities for Q2
  3. Team capacity planning

Notes:
  - Q1 shipped 3 major features ahead of schedule
  - Performance dashboard was well received by clients
  - Q2 focus: mobile responsiveness + onboarding flow

Action items:
  - Stuart: draft Q2 roadmap by Apr 7
  - Alice:  run user research sessions (3 users booked)
  - Bob:    investigate CI/CD pipeline slowness`,
                  },
                },
              },
              templates: {
                type: 'dir',
                children: {
                  'proposal-template.md': {
                    type: 'file',
                    content: `# Proposal: [Project Name]

**Prepared by:** [Your Name]
**Date:** [Date]
**Version:** 1.0

---

## Executive Summary

[One paragraph overview of what you are proposing and why.]

## Problem Statement

[Describe the problem this proposal addresses.]

## Proposed Solution

[Detail the approach, methodology, and deliverables.]

## Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| 1     | Discovery   | 1 week   |
| 2     | Build       | 4 weeks  |
| 3     | Review      | 1 week   |

## Budget

[Outline costs and how they break down.]

## Next Steps

1. Review and approve this proposal
2. Kick-off meeting scheduled
3. Work begins`,
                  },
                  'report-template.md': {
                    type: 'file',
                    content: `# Report: [Title]

**Author:** [Name]
**Date:** [Date]

---

## Introduction

[Background and purpose of this report.]

## Findings

### Finding 1

[Detail your first finding with supporting data.]

### Finding 2

[Detail your second finding with supporting data.]

## Recommendations

1. [First recommendation]
2. [Second recommendation]
3. [Third recommendation]

## Conclusion

[Summary and closing thoughts.]

---

*Confidential — for internal use only.*`,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * deepClone — structuredClone wrapper.
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return structuredClone(obj);
}

/**
 * resolvePath — resolve a relative or absolute path from cwd.
 *
 * Supports:
 *   - Absolute paths starting with '/'
 *   - '.' (current directory)
 *   - '..' (parent)
 *   - Nested paths like 'src/components'
 *   - Tilde '~' as shorthand for /home/stuarta
 *
 * @param {object} fs       - Root filesystem node (from createFileSystem())
 * @param {string} cwd      - Current absolute path, e.g. '/home/stuarta'
 * @param {string} targetPath
 * @returns {{ node: object, absolutePath: string } | null}
 */
export function resolvePath(fs, cwd, targetPath) {
  // Expand tilde
  const expanded = targetPath.replace(/^~/, '/home/stuarta');

  // Build a segment array for the resolved absolute path
  let segments;
  if (expanded.startsWith('/')) {
    segments = expanded.split('/').filter(Boolean);
  } else {
    const cwdSegs = cwd.split('/').filter(Boolean);
    const relSegs = expanded.split('/').filter(Boolean);
    segments = [...cwdSegs, ...relSegs];
  }

  // Collapse . and ..
  const resolved = [];
  for (const seg of segments) {
    if (seg === '.') {
      continue;
    } else if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }

  const absolutePath = '/' + resolved.join('/');

  // Walk the filesystem tree
  let node = fs;
  for (const seg of resolved) {
    if (node.type !== 'dir' || !node.children[seg]) {
      return null;
    }
    node = node.children[seg];
  }

  return { node, absolutePath };
}

/**
 * listDir — list directory contents.
 *
 * Returns entries sorted dirs-first, then files, both groups alphabetically.
 * Hidden entries (name starts with '.') are omitted unless showHidden is true.
 *
 * @param {object}  dirNode    - A node with type === 'dir'
 * @param {boolean} showHidden - Include dotfiles / dot-dirs
 * @returns {Array<{ name: string, type: 'dir'|'file', hidden: boolean }>}
 */
export function listDir(dirNode, showHidden = false) {
  if (dirNode.type !== 'dir') return [];

  const entries = Object.entries(dirNode.children).map(([name, node]) => ({
    name,
    type: node.type,
    hidden: name.startsWith('.'),
  }));

  const visible = showHidden ? entries : entries.filter((e) => !e.hidden);

  // Dirs first, then files; each group sorted alphabetically
  const dirs = visible.filter((e) => e.type === 'dir').sort((a, b) => a.name.localeCompare(b.name));
  const files = visible.filter((e) => e.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

  return [...dirs, ...files];
}

/**
 * getFileContent — read a file's content string.
 *
 * @param {object} fs
 * @param {string} cwd
 * @param {string} filePath
 * @returns {string} file content, or a cat-style error message
 */
export function getFileContent(fs, cwd, filePath) {
  const result = resolvePath(fs, cwd, filePath);

  if (!result) {
    return `cat: ${filePath}: No such file or directory`;
  }

  const { node, absolutePath } = result;

  if (node.type === 'dir') {
    return `cat: ${filePath}: Is a directory`;
  }

  return node.content;
}
