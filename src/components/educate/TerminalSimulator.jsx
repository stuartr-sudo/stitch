/**
 * TerminalSimulator.jsx
 * Fake macOS-style terminal for the CLI learning page.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createFileSystem } from './terminalFileSystem.js';
import { parseInput, executeCommand, createInitialGitState } from './terminalCommands.js';

// Error prefixes that indicate a command failed
const ERROR_PREFIXES = [
  'fatal:',
  'error:',
  'cat:',
  'cd:',
  'mkdir:',
  'rm:',
  'mv:',
  'cp:',
  'ls:',
  'touch:',
  'grep:',
  'bash:',
  'zsh:',
  'Permission denied',
  'No such file',
  'Not a git repository',
  'unknown command',
  'command not found',
];

function isErrorOutput(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ERROR_PREFIXES.some((p) => text.startsWith(p) || lower.startsWith(p.toLowerCase()));
}

function getShortPath(cwd) {
  if (cwd === '/home/stuarta' || cwd === '/home/stuarta/') return '~';
  if (cwd.startsWith('/home/stuarta/')) {
    return '~/' + cwd.slice('/home/stuarta/'.length);
  }
  return cwd;
}

function buildInitialState() {
  return {
    fs: createFileSystem(),
    cwd: '/home/stuarta',
    gitState: createInitialGitState(),
  };
}

export default function TerminalSimulator({
  initialPath = '/home/stuarta',
  availableCommands = null,
  onCommandExecuted = null,
  preloadedCommands = null,
}) {
  const [lines, setLines] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [terminalState, setTerminalState] = useState(() => {
    const s = buildInitialState();
    s.cwd = initialPath;
    return s;
  });
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const preloadedRan = useRef(false);

  // Auto-scroll to bottom whenever lines change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Run preloaded commands once on mount
  useEffect(() => {
    if (!preloadedCommands || preloadedCommands.length === 0 || preloadedRan.current) return;
    preloadedRan.current = true;

    let state = { ...terminalState };
    const newLines = [];

    for (const cmd of preloadedCommands) {
      newLines.push({ type: 'input', text: cmd });

      if (!cmd.trim()) continue;

      const segments = parseInput(cmd);
      const { output, state: nextState } = executeCommand(segments, state);
      state = nextState;

      if (output === '__CLEAR__') {
        // Clear accumulated lines up to this point
        newLines.length = 0;
      } else if (output) {
        newLines.push({
          type: isErrorOutput(output) ? 'error' : 'output',
          text: output,
        });
      }
    }

    setTerminalState(state);
    setLines(newLines);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommand = useCallback(
    (input) => {
      const trimmed = input.trim();

      // Push the input line
      const inputLine = { type: 'input', text: input };

      if (!trimmed) {
        setLines((prev) => [...prev, inputLine]);
        return;
      }

      const segments = parseInput(trimmed);
      const commandName = segments[0]?.command || '';
      const args = segments[0]?.args || [];

      // Check whitelist
      if (availableCommands && commandName && !availableCommands.includes(commandName)) {
        const errorLine = {
          type: 'error',
          text: `This command isn't available in this exercise. Try: ${availableCommands.join(', ')}`,
        };
        setLines((prev) => [...prev, inputLine, errorLine]);
        if (onCommandExecuted) {
          onCommandExecuted({ command: commandName, output: errorLine.text, valid: false, args });
        }
        return;
      }

      const { output, state: nextState } = executeCommand(segments, terminalState);

      if (output === '__CLEAR__') {
        setLines([]);
      } else {
        const outputLine = {
          type: isErrorOutput(output) ? 'error' : 'output',
          text: output,
        };
        setLines((prev) => {
          const next = [...prev, inputLine];
          if (output) next.push(outputLine);
          return next;
        });
      }

      setTerminalState(nextState);
      setCommandHistory((prev) => [...prev, trimmed]);

      if (onCommandExecuted) {
        onCommandExecuted({ command: commandName, output, valid: true, args });
      }
    },
    [terminalState, availableCommands, onCommandExecuted]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommand(currentInput);
        setCurrentInput('');
        setHistoryIndex(-1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = prev === -1 ? commandHistory.length - 1 : Math.max(0, prev - 1);
          if (commandHistory[next] !== undefined) {
            setCurrentInput(commandHistory[next]);
          }
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHistoryIndex((prev) => {
          if (prev === -1) return -1;
          const next = prev + 1;
          if (next >= commandHistory.length) {
            setCurrentInput('');
            return -1;
          }
          setCurrentInput(commandHistory[next]);
          return next;
        });
      }
    },
    [currentInput, commandHistory, handleCommand]
  );

  const focusInput = useCallback(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const shortPath = getShortPath(terminalState.cwd);
  const prompt = `stuarta@stitch ${shortPath} % `;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <>
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        .terminal-cursor {
          animation: blink 1s step-end infinite;
        }
      `}</style>

      <div
        className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden font-mono text-sm"
        onClick={focusInput}
      >
        {/* Mobile banner */}
        {isMobile && (
          <div className="bg-yellow-900/50 text-yellow-400 text-xs p-2 text-center">
            Best experienced on desktop — terminal needs room to breathe
          </div>
        )}

        {/* macOS-style top bar */}
        <div className="bg-gray-800 px-4 py-2 flex items-center relative">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full inline-block"
              style={{ width: 12, height: 12, backgroundColor: '#FF5F56' }}
            />
            <span
              className="rounded-full inline-block"
              style={{ width: 12, height: 12, backgroundColor: '#FFBD2E' }}
            />
            <span
              className="rounded-full inline-block"
              style={{ width: 12, height: 12, backgroundColor: '#27C93F' }}
            />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 text-gray-400 text-xs select-none">
            Terminal
          </span>
        </div>

        {/* Scrollable output area */}
        <div
          ref={scrollRef}
          className="overflow-y-auto p-4 max-h-[400px]"
        >
          {/* Rendered lines */}
          {lines.map((line, i) => {
            if (line.type === 'input') {
              return (
                <div key={i} className="flex">
                  <span className="text-green-400 shrink-0">{prompt}</span>
                  <span className="text-green-400">{line.text}</span>
                </div>
              );
            }
            if (line.type === 'error') {
              return (
                <div key={i} className="text-red-400 whitespace-pre-wrap">
                  {line.text}
                </div>
              );
            }
            if (line.type === 'hint') {
              return (
                <div key={i} className="text-yellow-400 whitespace-pre-wrap">
                  {line.text}
                </div>
              );
            }
            // output
            return (
              <div key={i} className="text-gray-300 whitespace-pre-wrap">
                {line.text}
              </div>
            );
          })}

          {/* Active prompt line */}
          <div className="flex">
            <span className="text-green-400 shrink-0">{prompt}</span>
            <span className="text-green-400">{currentInput}</span>
            <span className="terminal-cursor text-green-400 ml-px select-none">|</span>
          </div>
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="opacity-0 absolute w-0 h-0 pointer-events-none"
          aria-label="Terminal input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
    </>
  );
}
