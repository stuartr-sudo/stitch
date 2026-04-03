/**
 * AutomationFlowsGuidePage — comprehensive training guide for Automation Flows.
 *
 * Covers the visual DAG flow builder, all 20 node types, connections,
 * execution, scheduling, templates, and troubleshooting.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, AlertTriangle, Play, Settings2,
  Sparkles, Film, Mic, Music, Zap, Video, Camera, Palette,
  Type, Search, Wand2, Target, LayoutGrid, FileText, Globe,
  GitBranch, Layers, ArrowRight, Clock, CheckCircle2, XCircle,
  Pause, Square, Upload, Download, Scissors, Image as ImageIcon,
  MessageSquare, PenTool, RotateCcw, Share2, RefreshCw, Eye,
  Shield, CircleDot, Link2, Plug, Save, Monitor, Smartphone,
} from 'lucide-react';

// ── Expandable Section ──

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Step card ──

function Step({ number, title, children }) {
  return (
    <div className="flex gap-4 mt-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-sm font-bold">{number}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ── Tip callout ──

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

// ── Warning callout ──

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Inline badge ──

function Badge({ icon: Icon, label, color = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ── Key-value row ──

function KV({ label, children }) {
  return (
    <div className="flex gap-2 mt-1">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-36">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{children}</span>
    </div>
  );
}

// ── Node card (for the node reference section) ──

function NodeCard({ emoji, name, id, category, description, inputs, outputs, config, children }) {
  const [open, setOpen] = useState(false);
  const catColors = {
    Input: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    Image: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    Video: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    Audio: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
    Content: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    Publish: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
    Utility: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  };
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
      >
        <span className="text-lg">{emoji}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">{name}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColors[category] || catColors.Utility}`}>{category}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-sm space-y-3">
          <p className="text-gray-600 dark:text-gray-400 mt-3">{description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Inputs</p>
              {inputs.length === 0
                ? <p className="text-gray-400 dark:text-gray-500 italic">None (starting node)</p>
                : inputs.map((inp, i) => (
                    <div key={i} className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{inp.name}</span>
                      <span className="text-gray-400">({inp.type})</span>
                      {inp.required && <span className="text-red-400 text-xs">*</span>}
                    </div>
                  ))
              }
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Outputs</p>
              {outputs.map((out, i) => (
                <div key={i} className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{out.name}</span>
                  <span className="text-gray-400">({out.type})</span>
                </div>
              ))}
            </div>
          </div>
          {config && config.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Configuration</p>
              {config.map((c, i) => (
                <div key={i} className="mt-1 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                  {c.options && <span className="text-gray-400 ml-1">— {c.options.join(', ')}</span>}
                  {c.defaultVal && <span className="text-gray-400 ml-1">(default: {c.defaultVal})</span>}
                  {c.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.note}</p>}
                </div>
              ))}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══  MAIN GUIDE CONTENT  ═══
// ═══════════════════════════════════════════════════════════════════════════

export function AutomationFlowsGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

      {/* ── Header ── */}
      <div className="text-center space-y-3 pb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-700 dark:text-indigo-300 text-sm font-medium">
          <GitBranch className="w-4 h-4" />
          Automation Flows
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Automation Flows — Complete Training Guide
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Build visual pipelines that chain Stitch tools together. Drag nodes, wire connections,
          configure each step, then run — or schedule to run automatically.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* 1. OVERVIEW & CONCEPTS */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Layers} title="1. What Are Automation Flows?" defaultOpen>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Automation Flows let you compose any Stitch tool into a multi-step pipeline using a
            <strong className="text-gray-900 dark:text-gray-200"> visual DAG (Directed Acyclic Graph) canvas</strong>.
            Instead of manually running each tool one at a time, you wire them together and run the entire
            pipeline with one click.
          </p>
          <p>Think of it like a visual programming environment where:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Nodes</strong> are individual tools (generate image, animate video, add voiceover, publish to YouTube, etc.)</li>
            <li><strong>Connections</strong> are wires between nodes that pass data — an image output flows into a video input</li>
            <li><strong>The canvas</strong> is where you arrange and wire everything visually</li>
            <li><strong>Execution</strong> runs nodes in dependency order with up to 3 nodes in parallel</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Key Concepts</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-200">DAG Execution</p>
              <p className="text-xs mt-0.5">Nodes run in topological order — a node only executes once all its upstream dependencies are done. Up to 3 independent nodes run in parallel.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-200">Port Types</p>
              <p className="text-xs mt-0.5">Each port has a type: <code>string</code>, <code>image</code>, <code>video</code>, <code>audio</code>, or <code>json</code>. Connections are validated — you can't wire an audio output into an image input.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-200">Error Handling</p>
              <p className="text-xs mt-0.5">Each node has its own error mode: <strong>Stop</strong> (halt pipeline), <strong>Skip</strong> (continue without this node), or <strong>Retry</strong> (attempt up to 3 times).</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-200">Auto-Save</p>
              <p className="text-xs mt-0.5">Your flow auto-saves every 1.5 seconds after any change. A "Saving..." indicator appears in the toolbar.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 2. GETTING STARTED */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Play} title="2. Getting Started — Your First Flow" defaultOpen>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <p>Here's how to create your very first automation flow, step by step.</p>

          <Step number="1" title="Navigate to Flows">
            <p>
              Go to <strong>/flows</strong> from the sidebar (under the <em>Automation</em> section)
              or visit <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">stitchstudios.app/flows</code> directly.
              You'll see the Flows dashboard with three tabs: <strong>My Flows</strong>, <strong>Templates</strong>, and <strong>Executions</strong>.
            </p>
          </Step>

          <Step number="2" title="Create a New Flow">
            <p>
              Click the <strong>+ New Flow</strong> button in the top-right corner. This creates a blank flow
              and opens the Flow Builder — a three-panel workspace.
            </p>
          </Step>

          <Step number="3" title="Understand the Layout">
            <p>The Flow Builder has three panels:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Left Panel — Node Palette</strong>: Draggable list of all 20 node types, organized by category. Use the search bar to filter.</li>
              <li><strong>Center — Canvas</strong>: The React Flow workspace where you place and wire nodes. Scroll to zoom, drag to pan.</li>
              <li><strong>Right Panel — Config / Execution</strong>: Shows configuration fields when a node is selected, or the execution log during a run.</li>
            </ul>
          </Step>

          <Step number="4" title="Add Nodes to the Canvas">
            <p>
              <strong>Drag</strong> a node type from the left palette and <strong>drop</strong> it onto the canvas.
              The node appears where you drop it. Add as many as you need.
            </p>
            <Tip>Start with a simple 2-node flow: drag "Imagineer Generate" and then "Save to Library" onto the canvas.</Tip>
          </Step>

          <Step number="5" title="Select & Configure a Node">
            <p>
              <strong>Click on any node</strong> on the canvas to select it. The right panel switches to show
              that node's configuration form. Fill in the fields:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Text fields</strong> — type values like prompts, titles, URLs</li>
              <li><strong>Dropdowns</strong> — select from predefined options (model, voice, style, etc.)</li>
              <li><strong>Error Handling</strong> — always shown at the bottom (Stop / Skip / Retry)</li>
            </ul>
            <p className="mt-2">Changes save automatically — there's no "Save Config" button needed.</p>
          </Step>

          <Step number="6" title="Wire Nodes Together">
            <p>
              Each node has colored <strong>ports</strong> — input ports on the left edge, output ports on the right edge.
              To connect two nodes:
            </p>
            <ol className="list-decimal pl-5 space-y-1 mt-1">
              <li>Hover over an <strong>output port</strong> (right side of a node) — your cursor changes</li>
              <li><strong>Click and drag</strong> from the output port</li>
              <li><strong>Drop</strong> onto an input port (left side of another node)</li>
            </ol>
            <p className="mt-2">
              The connection validates automatically. If the port types are incompatible
              (e.g., audio → image), the connection simply won't form — no error message, it just doesn't connect.
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">string</code> type is universal and can connect to any input.
            </p>
            <Warning>Connections must go left-to-right (output → input). You cannot create loops — the system enforces DAG structure.</Warning>
          </Step>

          <Step number="7" title="Run the Flow">
            <p>
              Click the <strong>▶ Run Flow</strong> button in the top toolbar. The flow saves first, then execution begins:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>The right panel switches to the <strong>Execution Log</strong></li>
              <li>Nodes light up with <strong>status colors</strong>: blue border = running, green = completed, red = failed</li>
              <li>Completed nodes show a <CheckCircle2 className="w-3 h-3 inline text-green-500" /> with elapsed time</li>
              <li>The log shows a timestamped event for every step</li>
            </ul>
          </Step>

          <Step number="8" title="Pause or Cancel">
            <p>
              During execution, the toolbar shows <strong>Pause</strong> and <strong>Cancel</strong> buttons.
              Pause halts new nodes from starting (running nodes finish). Cancel stops everything.
            </p>
          </Step>

          <Tip>
            Your flow auto-saves continuously as you work. You can close the tab and come back later — your flow will be exactly as you left it.
          </Tip>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 3. THE FLOW BUILDER — DETAILED WALKTHROUGH */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Settings2} title="3. Flow Builder — Detailed Walkthrough">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4 mt-3">

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">3.1 Top Toolbar</h4>
          <p>The toolbar across the top of the builder provides:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Flow Name</strong> — editable text field (click to rename)</li>
            <li><strong>Saving indicator</strong> — shows "Saving..." during auto-save, then disappears</li>
            <li><strong>Run Flow</strong> button — starts execution (saves first)</li>
            <li><strong>Pause / Cancel</strong> — appear during execution, replacing Run</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.2 Node Palette (Left Panel)</h4>
          <p>All 20 node types organized into 7 categories:</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> <strong>Input</strong> — starting points that provide data (Manual Input)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-violet-500" /> <strong>Image</strong> — generate, edit, compose, turnaround images</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-blue-500" /> <strong>Video</strong> — animate images, transfer motion, create video clips</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-pink-500" /> <strong>Audio</strong> — voiceover, music, captions</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-500" /> <strong>Content</strong> — script generation, prompt building</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-sky-500" /> <strong>Publish</strong> — upload to YouTube, TikTok, Instagram, Facebook</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-500" /> <strong>Utility</strong> — save to library, trim video, extract frame</div>
          </div>
          <p className="mt-2">Use the <strong>search bar</strong> at the top to filter nodes by name or description.</p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.3 Canvas (Center)</h4>
          <p>The main workspace where you build your flow:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Zoom</strong> — scroll wheel or pinch on trackpad</li>
            <li><strong>Pan</strong> — click and drag on empty canvas space</li>
            <li><strong>Select node</strong> — click on it (shows config in right panel)</li>
            <li><strong>Move node</strong> — click and drag a node to reposition</li>
            <li><strong>Delete connection</strong> — click the edge, then press Delete/Backspace</li>
            <li><strong>Delete node</strong> — select the node, then press Delete/Backspace</li>
            <li><strong>Multi-select</strong> — click and drag an empty area to create a selection box</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.4 Config Panel (Right Panel)</h4>
          <p>When you <strong>click a node</strong> on the canvas, the right panel shows:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Node type name</strong> — with the category badge</li>
            <li><strong>Config fields</strong> — dynamically generated from the node type's schema. Each node type has different fields (see Node Reference below).</li>
            <li><strong>Error Handling Mode</strong> — a dropdown at the bottom with three options:
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong>Stop</strong> — if this node fails, halt the entire pipeline (default)</li>
                <li><strong>Skip</strong> — if this node fails, skip it and continue to downstream nodes</li>
                <li><strong>Retry</strong> — if this node fails, retry up to 3 times before stopping</li>
              </ul>
            </li>
            <li><strong>Inputs summary</strong> — lists the input ports with their types</li>
            <li><strong>Outputs summary</strong> — lists the output ports with their types</li>
          </ul>
          <p className="mt-2">
            If no node is selected, the panel shows "Select a node to configure" with a brief help message.
          </p>

          <Tip>
            Every change you make in the config panel is saved automatically. There's no submit or save button — just type and it's recorded.
            The flow auto-saves 1.5 seconds after your last change.
          </Tip>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.5 Execution Log (Right Panel — During Execution)</h4>
          <p>When a flow is running, the right panel switches from Config to the Execution Log:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Each executed step is shown with a <strong>timestamp</strong> and <strong>elapsed time</strong></li>
            <li><span className="text-green-500 font-medium">Green</span> = completed, <span className="text-red-500 font-medium">Red</span> = failed, <span className="text-gray-500 font-medium">Gray</span> = pending</li>
            <li>Failed steps show the error message inline</li>
            <li>The log updates in real-time (polls every 2 seconds)</li>
          </ul>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 4. CONNECTIONS & PORT TYPES */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Link2} title="4. Connections & Port Types">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Connections carry data between nodes. Every port has a <strong>type</strong> that determines what data it can send or receive.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Port Types</h4>
          <div className="mt-2 space-y-2">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <KV label="string">Text data — prompts, titles, descriptions, URLs. <strong>Universal</strong>: string ports can connect to any other type.</KV>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <KV label="image">Image URL — output of generation/editing. Connects to image inputs only (or string).</KV>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <KV label="video">Video URL — output of animation/recording. Connects to video inputs only (or string).</KV>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <KV label="audio">Audio URL — voiceover or music output. Connects to audio inputs only (or string).</KV>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <KV label="json">Structured data — scripts, metadata objects. Connects to json inputs only (or string).</KV>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Connection Rules</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Same type</strong> always connects: image → image, video → video, etc.</li>
            <li><strong>String is universal</strong>: a string output can connect to any input, and any output can connect to a string input.</li>
            <li><strong>Incompatible types silently reject</strong>: if you try to drag audio → image, the connection just won't form. No error — just nothing happens.</li>
            <li><strong>One input, one source</strong>: each input port accepts one incoming connection.</li>
            <li><strong>One output, many destinations</strong>: an output port can fan out to multiple downstream nodes.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">How to Make a Connection</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Hover over the <strong>output port</strong> (small circle on the right edge of a node)</li>
            <li>Click and hold, then drag — a line follows your cursor</li>
            <li>Drop on the <strong>input port</strong> (small circle on the left edge of the target node)</li>
            <li>If types are compatible, the connection snaps in place</li>
          </ol>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">How to Delete a Connection</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Click the connection line (edge) on the canvas</li>
            <li>Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Delete</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Backspace</kbd></li>
          </ol>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 5. FLOWS LIST DASHBOARD */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={LayoutGrid} title="5. Flows Dashboard">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            The Flows dashboard at <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/flows</code> is your home base.
            It has three tabs and a stats bar.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Stats Bar</h4>
          <p>Four metrics at the top:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg text-center">
              <p className="font-medium text-gray-900 dark:text-gray-200">Active Flows</p>
              <p className="text-xs">Total flows you've created</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg text-center">
              <p className="font-medium text-gray-900 dark:text-gray-200">Total Runs</p>
              <p className="text-xs">Sum of all execution counts</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg text-center">
              <p className="font-medium text-gray-900 dark:text-gray-200">Scheduled</p>
              <p className="text-xs">Flows with cron schedules</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg text-center">
              <p className="font-medium text-gray-900 dark:text-gray-200">Success Rate</p>
              <p className="text-xs">% of successful runs</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">My Flows Tab</h4>
          <p>Shows all your flows as cards in a grid. Each card displays:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Flow name and description</li>
            <li>Run count badge</li>
            <li>Schedule badge (if scheduled)</li>
            <li>Last run timestamp</li>
            <li><strong>Run</strong> button — executes the flow immediately from the dashboard</li>
          </ul>
          <p><strong>Click a card</strong> to open it in the Flow Builder.</p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Templates Tab</h4>
          <p>Pre-built flow templates you can clone to your account:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Image → Video Pipeline</strong> — generate image, animate to video, save to library</li>
            <li><strong>Script to Voiceover</strong> — generate script, create voiceover, save</li>
            <li><strong>Social Media Post</strong> — generate image, post to Instagram</li>
            <li><strong>Full Video Pipeline</strong> — script → image → video → voiceover → captions → YouTube</li>
            <li><strong>Character Sheet Pipeline</strong> — turnaround → animate → save</li>
          </ul>
          <p className="mt-1">Click <strong>Use Template</strong> to clone it as a new flow in your account. You can then customize it freely.</p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Executions Tab</h4>
          <p>History of all flow executions across all flows, sorted newest first. Each entry shows:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Flow name</li>
            <li>Status badge (completed / failed / running / paused / cancelled)</li>
            <li>Execution timestamp</li>
          </ul>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 6. EXECUTION ENGINE */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Zap} title="6. Execution — How Flows Run">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>Understanding how the execution engine works helps you design better flows.</p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Execution Order — Topological Sort</h4>
          <p>
            The engine analyzes your flow graph and determines the correct execution order using
            <strong> topological sorting</strong>. This means:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nodes with <strong>no inputs</strong> (or only manual inputs) run first</li>
            <li>A node only runs <strong>after all upstream nodes</strong> it depends on have completed</li>
            <li>Independent branches <strong>run in parallel</strong> (up to 3 concurrent nodes)</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Concurrency Pool</h4>
          <p>
            Up to <strong>3 nodes</strong> can execute simultaneously. If you have a flow with two independent
            branches (e.g., generate an image AND generate a voiceover at the same time), both branches
            start immediately. The third slot is available for any other ready node.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Data Passing</h4>
          <p>
            When a node completes, its outputs are passed as inputs to downstream nodes. For example,
            if "Imagineer Generate" outputs an <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">image_url</code>,
            and you've connected it to "JumpStart Animate"'s <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">image</code> input,
            the URL flows automatically.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Error Handling Modes</h4>
          <div className="space-y-2 mt-2">
            <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="font-medium text-red-700 dark:text-red-300">Stop (Default)</p>
              <p className="text-xs text-red-600 dark:text-red-400">If this node fails, the entire pipeline halts immediately. No downstream nodes run.</p>
            </div>
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="font-medium text-amber-700 dark:text-amber-300">Skip</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">If this node fails, skip it and continue. Downstream nodes receive null for this node's outputs. Useful for optional steps like publishing.</p>
            </div>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-medium text-blue-700 dark:text-blue-300">Retry</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">If this node fails, retry up to 3 times before stopping. Good for nodes that call external APIs which may have transient failures.</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Pause & Resume</h4>
          <p>
            <strong>Pause</strong> lets currently-running nodes finish but prevents new nodes from starting.
            You can resume later and execution continues from where it left off.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Cancel</h4>
          <p>
            <strong>Cancel</strong> stops everything. Currently-running nodes are marked as cancelled.
            The execution is marked as cancelled and cannot be resumed.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Visual Feedback During Execution</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Blue border + spinner</strong> = node is currently running</li>
            <li><strong>Green border + checkmark</strong> = node completed successfully (shows elapsed time)</li>
            <li><strong>Red border + X</strong> = node failed (shows error message on hover)</li>
            <li><strong>No border</strong> = pending (hasn't started yet)</li>
          </ul>

          <Tip>
            The execution log on the right panel polls every 2 seconds. Node status updates are near real-time.
          </Tip>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 7. SCHEDULING */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Clock} title="7. Scheduling Flows">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Flows can be scheduled to run automatically on a recurring basis using cron expressions.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">How to Schedule a Flow</h4>
          <p>
            When editing a flow, set the <strong>trigger type</strong> to "scheduled" and provide a
            <strong> cron expression</strong>. The system checks for due flows every 60 seconds.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Cron Expression Examples</h4>
          <div className="mt-2 font-mono text-xs space-y-1">
            <div className="flex gap-3"><code className="text-indigo-600 dark:text-indigo-400 w-32">0 9 * * *</code><span className="font-sans text-gray-600 dark:text-gray-400">Every day at 9:00 AM</span></div>
            <div className="flex gap-3"><code className="text-indigo-600 dark:text-indigo-400 w-32">0 */6 * * *</code><span className="font-sans text-gray-600 dark:text-gray-400">Every 6 hours</span></div>
            <div className="flex gap-3"><code className="text-indigo-600 dark:text-indigo-400 w-32">0 9 * * 1-5</code><span className="font-sans text-gray-600 dark:text-gray-400">Weekdays at 9 AM</span></div>
            <div className="flex gap-3"><code className="text-indigo-600 dark:text-indigo-400 w-32">30 14 * * 1</code><span className="font-sans text-gray-600 dark:text-gray-400">Every Monday at 2:30 PM</span></div>
            <div className="flex gap-3"><code className="text-indigo-600 dark:text-indigo-400 w-32">0 0 1 * *</code><span className="font-sans text-gray-600 dark:text-gray-400">First of every month at midnight</span></div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Deduplication</h4>
          <p>
            The scheduler tracks <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">last_triggered_at</code> to prevent
            duplicate executions. If the server restarts or polls overlap, the same scheduled run won't fire twice.
          </p>

          <Warning>
            Scheduled flows run on the server — they use your stored API keys. Make sure your keys are configured
            in Settings before scheduling flows that call external AI providers.
          </Warning>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 8. NODE REFERENCE (ALL 20 NODES) */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={CircleDot} title="8. Node Reference — All 20 Node Types">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Click any node below to expand its full documentation — inputs, outputs, configuration fields, and usage notes.
          </p>

          {/* ── INPUT ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Input Nodes
          </h4>

          <NodeCard
            emoji="📥" name="Manual Input" id="manual-input" category="Input"
            description="The starting point for most flows. Provides a manually-entered value (text, image URL, or video URL) that feeds into downstream nodes. Every flow typically starts with one or more Manual Input nodes."
            inputs={[]}
            outputs={[{ name: 'value', type: 'string' }]}
            config={[
              { name: 'label', defaultVal: 'Input', note: 'Display label for this input' },
              { name: 'inputType', options: ['string', 'image', 'video'], defaultVal: 'string', note: 'What kind of data this input provides' },
              { name: 'defaultValue', note: 'The actual value to send downstream — a text prompt, a URL, etc.' },
            ]}
          >
            <Tip>Use the <strong>defaultValue</strong> field to set the actual content. For image/video types, paste a URL. For string, type your prompt or text.</Tip>
          </NodeCard>

          {/* ── IMAGE ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-violet-500" /> Image Nodes
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="🖼️" name="Imagineer Generate" id="imagineer-generate" category="Image"
              description="Generates images from text prompts using AI. This is your primary image creation node — connect a text prompt and get back an image URL."
              inputs={[
                { name: 'prompt', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4'], defaultVal: 'nano-banana-2', note: 'AI model to use. Nano Banana 2 is fastest.' },
                { name: 'aspect_ratio', options: ['16:9', '9:16', '1:1', '4:5', '3:2'], defaultVal: '16:9' },
              ]}
            />

            <NodeCard
              emoji="✏️" name="Imagineer Edit" id="imagineer-edit" category="Image"
              description="Edits an existing image using text instructions. Feed in an image and a prompt describing what to change, and get a modified image back."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'prompt', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'seeddream-v4', 'wavespeed-nano-ultra'], defaultVal: 'nano-banana-2' },
              ]}
            />

            <NodeCard
              emoji="🎨" name="Turnaround Sheet" id="turnaround-sheet" category="Image"
              description="Creates multi-angle character reference sheets. Great for establishing a consistent character design before generating videos."
              inputs={[
                { name: 'prompt', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4'], defaultVal: 'nano-banana-2' },
                { name: 'pose_set', options: ['standard-24', '3d-angles', '3d-action', 'r2v-reference'], defaultVal: 'standard-24', note: 'Layout template for the sheet' },
              ]}
            />

            <NodeCard
              emoji="🔀" name="Smoosh" id="smoosh" category="Image"
              description="Blends two images together into a seamless composite. Connect two image sources and get a merged result."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'image2', type: 'image', required: true },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'wavespeed-nano-ultra'], defaultVal: 'nano-banana-2' },
              ]}
            />

            <NodeCard
              emoji="🖼️" name="Upscale Image" id="upscale-image" category="Image"
              description="Upscales an image to 2× resolution using Topaz AI. Good for improving quality before publishing or animating."
              inputs={[
                { name: 'image', type: 'image', required: true },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[]}
            />
          </div>

          {/* ── VIDEO ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-blue-500" /> Video Nodes
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="🎬" name="JumpStart Animate" id="jumpstart-animate" category="Video"
              description="Converts a static image into an animated video. The primary image-to-video node — give it an image and an optional motion prompt."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'prompt', type: 'string', required: false },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'model', options: ['kling-2.0-master', 'veo-3.1-fast', 'wan-2.5'], defaultVal: 'kling-2.0-master', note: 'Kling 2.0 is the default all-rounder. Veo 3.1 is highest quality.' },
                { name: 'duration', options: ['5', '10'], defaultVal: '5', note: 'Duration in seconds' },
              ]}
            />

            <NodeCard
              emoji="🎞️" name="Animate Image" id="animate-image" category="Video"
              description="Alternative image-to-video node with more model options including Hailuo. Use when you need a specific model not available in JumpStart."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'prompt', type: 'string', required: false },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'model', options: ['kling-2.0-master', 'veo-3.1-fast', 'wan-2.5', 'hailuo'], defaultVal: 'kling-2.0-master' },
                { name: 'duration', options: ['5', '10'], defaultVal: '5' },
              ]}
            />

            <NodeCard
              emoji="🏃" name="Motion Transfer" id="motion-transfer" category="Video"
              description="Transfers motion from a source video onto a reference image. The character in the image inherits the movements from the video."
              inputs={[
                { name: 'video', type: 'video', required: true },
                { name: 'reference_image', type: 'image', required: true },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[]}
            >
              <Tip>This is great for applying dance moves or actions from a real video to an AI-generated character.</Tip>
            </NodeCard>

            <NodeCard
              emoji="🔄" name="Video Restyle" id="video-restyle" category="Video"
              description="Applies a new visual style to an existing video while preserving the original motion and composition."
              inputs={[
                { name: 'video', type: 'video', required: true },
                { name: 'style_prompt', type: 'string', required: true },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[]}
            />
          </div>

          {/* ── AUDIO ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-pink-500" /> Audio Nodes
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="🎙️" name="Voiceover" id="voiceover" category="Audio"
              description="Converts text to speech using Gemini TTS voices. Feed in a script and get back a professional voiceover audio file."
              inputs={[
                { name: 'text', type: 'string', required: true },
              ]}
              outputs={[{ name: 'audio_url', type: 'audio' }]}
              config={[
                { name: 'voice', options: ['Kore', 'Charon', 'Fenrir', 'Aoede', 'Puck'], defaultVal: 'Kore', note: 'Gemini TTS voice. Kore = female authoritative, Charon = male deep, Puck = male energetic.' },
                { name: 'speed', options: ['1.0', '1.15', '1.3'], defaultVal: '1.15', note: '1.15x is the recommended default for engaging content' },
              ]}
            />

            <NodeCard
              emoji="🎵" name="Music" id="music" category="Audio"
              description="Generates instrumental background music. Always produces instrumental tracks (no vocals). Connect a mood description for genre control."
              inputs={[
                { name: 'mood', type: 'string', required: false },
              ]}
              outputs={[{ name: 'audio_url', type: 'audio' }]}
              config={[
                { name: 'duration', options: ['15', '30', '60'], defaultVal: '30', note: 'Track length in seconds' },
              ]}
            >
              <Tip>If no mood input is connected, defaults to upbeat instrumental. Connect a Manual Input with text like "cinematic tension" or "lo-fi chill" for genre control.</Tip>
            </NodeCard>

            <NodeCard
              emoji="💬" name="Captions" id="captions" category="Audio"
              description="Burns auto-generated captions/subtitles onto a video. Uses speech recognition to detect words, then overlays styled text."
              inputs={[
                { name: 'video', type: 'video', required: true },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'style', options: ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker'], defaultVal: 'word_pop', note: 'Caption animation style' },
              ]}
            >
              <Tip><strong>word_pop</strong> = words appear one at a time with scale animation. <strong>karaoke_glow</strong> = words highlight as spoken. <strong>news_ticker</strong> = scrolling lower-third.</Tip>
            </NodeCard>
          </div>

          {/* ── CONTENT ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-amber-500" /> Content Nodes
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="📝" name="Script Generator" id="script-generator" category="Content"
              description="Generates a structured video script using GPT-4.1-mini. Outputs a JSON script with narration segments, overlay text, and scene labels."
              inputs={[
                { name: 'topic', type: 'string', required: true },
                { name: 'niche', type: 'string', required: false },
              ]}
              outputs={[{ name: 'script', type: 'json' }]}
              config={[
                { name: 'duration', options: ['30', '60', '90'], defaultVal: '60', note: 'Target script duration in seconds' },
              ]}
            />

            <NodeCard
              emoji="🔧" name="Prompt Builder" id="prompt-builder" category="Content"
              description="Assembles structured creative inputs into a single optimized generation prompt using GPT. Great for building detailed prompts from multiple sources."
              inputs={[
                { name: 'description', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
                { name: 'props', type: 'string', required: false },
              ]}
              outputs={[{ name: 'prompt', type: 'string' }]}
              config={[]}
            >
              <Tip>Chain this before Imagineer Generate for better results: description + style → Prompt Builder → Imagineer.</Tip>
            </NodeCard>
          </div>

          {/* ── PUBLISH ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-sky-500" /> Publish Nodes
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="📺" name="YouTube Upload" id="youtube-upload" category="Publish"
              description="Uploads a video to YouTube. Requires YouTube OAuth connection in Settings. Auto-detects Shorts (vertical < 60s) and adds #Shorts tag."
              inputs={[
                { name: 'video', type: 'video', required: true },
                { name: 'title', type: 'string', required: true },
                { name: 'description', type: 'string', required: false },
              ]}
              outputs={[{ name: 'video_id', type: 'string' }]}
              config={[
                { name: 'privacy', options: ['public', 'unlisted', 'private'], defaultVal: 'private', note: 'Upload as private first, then publish manually for safety' },
              ]}
            >
              <Warning>You must connect YouTube in Settings → Connected Accounts before using this node. Without OAuth, execution will fail.</Warning>
            </NodeCard>

            <NodeCard
              emoji="🎵" name="TikTok Publish" id="tiktok-publish" category="Publish"
              description="Publishes videos or images to TikTok. Requires TikTok OAuth connection."
              inputs={[
                { name: 'video', type: 'video', required: false },
                { name: 'image', type: 'image', required: false },
              ]}
              outputs={[{ name: 'post_id', type: 'string' }]}
              config={[]}
            />

            <NodeCard
              emoji="📸" name="Instagram Post" id="instagram-post" category="Publish"
              description="Posts images to Instagram with a caption. Requires Meta OAuth connection (covers both Instagram and Facebook)."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'caption', type: 'string', required: false },
              ]}
              outputs={[{ name: 'post_id', type: 'string' }]}
              config={[]}
            />

            <NodeCard
              emoji="👤" name="Facebook Post" id="facebook-post" category="Publish"
              description="Creates posts on your Facebook page with text and optional media."
              inputs={[
                { name: 'image', type: 'image', required: false },
                { name: 'text', type: 'string', required: true },
              ]}
              outputs={[{ name: 'post_id', type: 'string' }]}
              config={[]}
            />
          </div>

          {/* ── UTILITY ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gray-500" /> Utility Nodes
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="💾" name="Save to Library" id="save-to-library" category="Utility"
              description="Saves any media URL to your Stitch library for permanent storage. FAL CDN URLs expire — always save to library for persistence."
              inputs={[
                { name: 'url', type: 'string', required: true },
                { name: 'name', type: 'string', required: false },
              ]}
              outputs={[{ name: 'saved_url', type: 'string' }]}
              config={[]}
            >
              <Warning>AI-generated URLs from FAL expire within hours. Always end your flow with a Save to Library node if you want to keep the output.</Warning>
            </NodeCard>

            <NodeCard
              emoji="✂️" name="Video Trim" id="video-trim" category="Utility"
              description="Trims a video to a specific start/end time range using FFmpeg."
              inputs={[
                { name: 'video', type: 'video', required: true },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'start_time', defaultVal: '0', note: 'Start position in seconds' },
                { name: 'end_time', defaultVal: '10', note: 'End position in seconds' },
              ]}
            />

            <NodeCard
              emoji="🖼️" name="Extract Frame" id="extract-frame" category="Utility"
              description="Extracts a single frame from a video as an image. Useful for getting a thumbnail or a reference image from a video clip."
              inputs={[
                { name: 'video', type: 'video', required: true },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'frame_type', options: ['first', 'middle', 'last'], defaultVal: 'first', note: 'Which frame to extract' },
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 9. EXAMPLE FLOWS */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Share2} title="9. Example Flows — Common Patterns">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4 mt-3">

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 1: Simple Image → Video</h4>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded">Manual Input (prompt)</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/40 rounded">Imagineer Generate</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">JumpStart Animate</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">Save to Library</span>
            </div>
            <p className="mt-2 text-xs">3 nodes + 3 connections. Takes a text prompt, generates an image, animates it into a 5-second video, and saves permanently.</p>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 2: Parallel Branches — Video with Voiceover</h4>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
            <div className="text-xs font-mono space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded">Manual Input (prompt)</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/40 rounded">Imagineer Generate</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">JumpStart Animate</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded">Manual Input (script)</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/40 rounded">Voiceover</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-sans">↳ Both branches run in parallel since they're independent, saving time.</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 3: Full Production Pipeline</h4>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
            <div className="text-xs font-mono space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded">Manual Input (topic)</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 rounded">Script Generator</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-sans">↳ Script feeds into both the Prompt Builder (for visuals) and Voiceover (for audio):</p>
              <div className="flex items-center gap-2 flex-wrap ml-4">
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 rounded">Prompt Builder</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/40 rounded">Imagineer Generate</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">JumpStart Animate</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/40 rounded">Captions</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap ml-4">
                <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/40 rounded">Voiceover</span>
                <span className="text-gray-400 font-sans">(parallel with image branch)</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap ml-4 mt-1">
                <span className="text-gray-400 font-sans">↳ Final video →</span>
                <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900/40 rounded">YouTube Upload</span>
              </div>
            </div>
            <p className="mt-2 text-xs font-sans">Full pipeline: topic → script → visuals + voiceover in parallel → captioned video → YouTube. Set YouTube Upload to "Skip" error mode so the pipeline completes even if upload fails.</p>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 4: Character Development</h4>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded">Manual Input (character desc)</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/40 rounded">Turnaround Sheet</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">Save to Library</span>
            </div>
            <p className="mt-2 text-xs">Generate a multi-angle character reference sheet and save it. Use the saved URL in other flows as a reference image.</p>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 10. TIPS & BEST PRACTICES */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Shield} title="10. Tips & Best Practices">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Flow Design</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Start simple</strong> — get a 2-3 node flow working first, then add complexity.</li>
            <li><strong>Use Manual Input nodes</strong> to parameterize your flows. Instead of hardcoding a prompt in the Imagineer config, create a Manual Input and wire it in — this makes the flow reusable.</li>
            <li><strong>Fan out for parallelism</strong> — if two operations don't depend on each other, keep them on separate branches. The engine runs up to 3 nodes in parallel.</li>
            <li><strong>Always end with Save to Library</strong> — AI-generated URLs expire. Without saving, your output disappears.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Error Handling</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Set <strong>Retry</strong> on API-heavy nodes (Imagineer, JumpStart) — transient failures are common with AI providers.</li>
            <li>Set <strong>Skip</strong> on optional publish nodes (YouTube, TikTok) — you don't want a publishing failure to lose your generated content.</li>
            <li>Keep <strong>Stop</strong> (default) on critical path nodes where downstream results would be meaningless without this step.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Performance</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Image generation takes 5-30 seconds depending on the model.</li>
            <li>Video generation (animate) takes 30-120 seconds — it's the slowest step.</li>
            <li>Voiceover and music take 5-15 seconds.</li>
            <li>Design your flow so the video generation branch starts early, while other work happens in parallel.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Troubleshooting</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Connection won't form</strong> — check port types. You can't connect audio → image. Try using a string-type output instead.</li>
            <li><strong>Node shows red on execution</strong> — click the node to see the error in the execution log. Common causes: missing config (empty prompt), expired API keys, provider downtime.</li>
            <li><strong>Flow won't save</strong> — check your browser console. Network errors or auth issues can prevent saves.</li>
            <li><strong>Scheduled flow not running</strong> — verify your cron expression is valid. The scheduler checks every 60 seconds, so there can be up to a 1-minute delay.</li>
            <li><strong>Publishing fails</strong> — ensure you've connected the target platform in Settings → Connected Accounts with valid OAuth tokens.</li>
          </ul>

          <Warning>
            AI-generated media URLs from FAL.ai expire within a few hours. If a flow generates content but doesn't save it to the library,
            the URLs in the execution log will stop working. Always include a Save to Library node for any output you want to keep.
          </Warning>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 11. KEYBOARD SHORTCUTS */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={Target} title="11. Keyboard Shortcuts & Navigation">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Delete</kbd>
              <span>Delete selected node or connection</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Backspace</kbd>
              <span>Delete selected node or connection</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Scroll</kbd>
              <span>Zoom in/out on canvas</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click + Drag</kbd>
              <span>Pan canvas (on empty space)</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click + Drag</kbd>
              <span>Move node (on a node)</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click</kbd>
              <span>Select node → shows config panel</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ */}
      {/* 12. GLOSSARY */}
      {/* ════════════════════════════════════════════════════ */}

      <Section icon={FileText} title="12. Glossary">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <KV label="DAG">Directed Acyclic Graph — a flow structure where connections only go forward (no loops).</KV>
          <KV label="Node">A single processing step in your flow (e.g., generate image, add voiceover).</KV>
          <KV label="Edge / Connection">A wire between two nodes that carries data from output to input.</KV>
          <KV label="Port">An input or output connector on a node. Each port has a type (string, image, video, audio, json).</KV>
          <KV label="Topological Sort">The algorithm that determines execution order — upstream nodes always run before downstream.</KV>
          <KV label="Concurrency Pool">Up to 3 independent nodes can execute simultaneously.</KV>
          <KV label="Cron Expression">A scheduling format (e.g., <code>0 9 * * *</code> = every day at 9 AM).</KV>
          <KV label="Error Mode">Per-node setting: Stop (halt on error), Skip (continue past error), Retry (try 3 times).</KV>
          <KV label="Auto-Save">Flows save automatically 1.5 seconds after any change.</KV>
          <KV label="Template">A pre-built flow you can clone and customize.</KV>
        </div>
      </Section>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 pb-8">
        Automation Flows Guide — Last updated April 2026
      </div>
    </div>
  );
}

export default function AutomationFlowsGuidePage() {
  return <AutomationFlowsGuideContent />;
}
