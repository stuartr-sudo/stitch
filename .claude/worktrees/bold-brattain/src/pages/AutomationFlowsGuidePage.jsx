/**
 * AutomationFlowsGuidePage — comprehensive training guide for Automation Flows.
 *
 * Covers the dark-themed visual pipeline builder, 45+ node types, campaign wizard,
 * control flow nodes, preflight validation, dry run, variables, and troubleshooting.
 *
 * Updated April 2026 — complete overhaul for the new Flows UX.
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
  MousePointerClick, Maximize2, ArrowDown, Box, Grip, Variable,
  Split, Merge, Workflow, Rocket, BrainCircuit, FlaskConical,
} from 'lucide-react';

const IMG_BASE = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/flows';

function Img({ src, alt }) {
  return <img src={`${IMG_BASE}/${src}`} alt={alt} className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4" />;
}

// ── Expandable Section ──

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'');
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={sectionId} data-guide-section={title} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden scroll-mt-4">
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

// ── New feature badge ──

function NewBadge() {
  return <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wide rounded">New</span>;
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
    Control: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
    Brand: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300',
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
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                {config.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ── Port type color key ──

function PortColorKey() {
  const ports = [
    { type: 'string', color: 'bg-slate-400', label: 'Text / URL' },
    { type: 'image', color: 'bg-purple-500', label: 'Image' },
    { type: 'video', color: 'bg-blue-500', label: 'Video' },
    { type: 'audio', color: 'bg-emerald-500', label: 'Audio' },
    { type: 'json', color: 'bg-amber-500', label: 'JSON / Object' },
    { type: 'any[]', color: 'bg-cyan-500', label: 'Array' },
  ];
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {ports.map(p => (
        <div key={p.type} className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-full ${p.color}`} />
          <span className="text-xs text-gray-600 dark:text-gray-400">{p.label} <code className="text-gray-400">({p.type})</code></span>
        </div>
      ))}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// ██ MAIN GUIDE CONTENT
// ════════════════════════════════════════════════════════════════

export function AutomationFlowsGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Automation Flows</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
          A visual pipeline builder for chaining AI tools together. Drag nodes onto a dark canvas,
          wire them up, hit play, and watch data flow through your pipeline — images, videos, audio,
          and text, all generated and published automatically.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          <Badge icon={Layers} label="45+ Node Types" color="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300" />
          <Badge icon={Zap} label="Parallel Execution" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
          <Badge icon={Variable} label="Flow Variables" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
          <Badge icon={Shield} label="Preflight Validation" color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" />
          <Badge icon={FlaskConical} label="Dry Run Mode" color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />
        </div>
      </div>

      {/* ================================================================ */}

      <Section icon={Layers} title="1. What Are Automation Flows?" defaultOpen>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Automation Flows let you chain any Stitch tool into a visual pipeline. Each tool becomes a <strong>node</strong> on an
            infinite dark canvas. You connect nodes by dragging wires between <strong>typed ports</strong> — the system ensures only
            compatible types can connect (image to image, video to video, etc.).
          </p>
          <p>When you hit <strong>Run</strong>, the executor walks the graph from source nodes (no inputs) to destination nodes (publish, save),
            running up to 3 nodes in parallel. You see live progress bars, output previews, and animated data flowing along the wires.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Key concepts</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Nodes</strong> — 280px-wide dark cards with type-colored port dots, labels, preview area, and config summary</li>
            <li><strong>Edges</strong> — type-colored bezier curves (purple=image, blue=video, green=audio, amber=text) with animated flow during execution</li>
            <li><strong>Ports</strong> — input dots on the left, output dots on the right. Each port has a type that determines what data it accepts</li>
            <li><strong>Canvas</strong> — dark background with dot grid, snap-to-grid (20px), minimap, zoom/pan controls</li>
            <li><strong>Config Modal</strong> — full-width slide-over (opens from the left) for detailed node configuration. Double-click any node to open it.</li>
          </ul>

          <PortColorKey />

          <Img src="06-flow-builder-palette.jpg" alt="Flow builder showing dark canvas with node palette on the left" />

          <Tip>The canvas is a 2-panel layout: <strong>Node Palette</strong> on the left (260px) and the <strong>canvas</strong> filling the rest. No right sidebar — the config modal slides over from the left when you need it.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Play} title="2. Getting Started — Your First Flow" defaultOpen>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <p>Two ways to create a flow:</p>

          <Step number="1" title="Navigate to Flows">
            <p>Click <strong>Automation Flows</strong> in the sidebar, or go to <code>/flows</code>. The dark-themed dashboard shows your flows, templates, and execution history.</p>
            <Img src="01-flows-dashboard.jpg" alt="Flows dashboard with dark theme showing My Flows tab" />
          </Step>

          <Step number="2" title="Create a new flow">
            <p>Click <strong>+ New Flow</strong> for a blank canvas, or <strong>+ New Campaign</strong> to use the brand context wizard (see Section 8).</p>
          </Step>

          <Step number="3" title="Add nodes from the palette">
            <p>The left sidebar shows all 45+ node types organized by category (Image, Video, Audio, Content, Publish, Utility, Control, Brand). <strong>Drag</strong> any node onto the canvas. Use the search bar or press <kbd>/</kbd> to filter.</p>
            <p>When you select a node on the canvas, the palette shows a <strong>"Compatible Next Steps"</strong> section at the top — nodes whose input types match your selected node's outputs.</p>
            <Img src="02-flow-builder-empty.jpg" alt="Empty flow builder canvas with node palette on the left" />
          </Step>

          <Step number="4" title="Connect nodes">
            <p>Drag from an output port (right side dot) to an input port (left side dot) on another node. The wire color matches the data type. Invalid connections are silently rejected — you can only connect compatible types.</p>
          </Step>

          <Step number="5" title="Configure nodes">
            <p><strong>Double-click</strong> any node to open the full config modal (slides from the left). Set the model, parameters, style, LoRA, and other options. The node shows a config summary on the canvas so you can see key settings at a glance.</p>
          </Step>

          <Step number="6" title="Run with preflight check">
            <p>Click <strong>&#9654; Run Flow</strong>. A <strong>Preflight Check</strong> modal appears first, validating: all required inputs connected, type compatibility, no cycles, API keys valid, OAuth tokens active, and estimated cost. Fix any red items, then confirm to execute.</p>
          </Step>

          <Tip>Your flow auto-saves every 1.5 seconds after any change. You'll see a green "Saved" badge in the toolbar.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Settings2} title="3. The Canvas — Layout & Controls">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Two-Panel Layout</h4>
          <p>The flow builder is a clean two-panel layout:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Left: Node Palette</strong> (260px) — searchable tool catalog with collapsible categories, descriptions, port type badges, and context-aware suggestions</li>
            <li><strong>Right: Canvas</strong> — dark infinite canvas with dot grid, snap-to-grid, zoom/pan, minimap</li>
          </ul>
          <p>There is no right sidebar. All configuration happens via the <strong>slide-over config modal</strong> (double-click a node) which opens from the left side.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Node Design</h4>
          <p>Each node is a 280px-wide dark card with:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Header</strong> — category-colored strip with icon, name, and category badge</li>
            <li><strong>Input ports</strong> — type-colored dots on the left with labels (e.g., "prompt", "image", "style")</li>
            <li><strong>Preview area</strong> (80px) — shows output thumbnails after execution (images, video play icon, audio waveform, text preview)</li>
            <li><strong>Config summary</strong> — shows key settings (e.g., "Model: Nano Banana 2, Ratio: 16:9")</li>
            <li><strong>Output ports</strong> — type-colored dots on the right with labels</li>
            <li><strong>Progress bar</strong> — thin bar below the header that animates during execution</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Edge Design</h4>
          <p>Connections (edges) are type-colored bezier curves:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Purple</strong> — image data</li>
            <li><strong>Blue</strong> — video data</li>
            <li><strong>Green</strong> — audio data</li>
            <li><strong>Amber</strong> — text/JSON data</li>
            <li><strong>Slate</strong> — generic string data</li>
          </ul>
          <p>During execution, edges show an <strong>animated dash pattern</strong> flowing in the data direction. Each edge has a subtle glow layer behind it matching the type color.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Toolbar</h4>
          <p>The top toolbar contains:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>← Flows</strong> — back to dashboard</li>
            <li><strong>Flow name</strong> + save status</li>
            <li><strong>Variables</strong> button — flow-level variable editor (see Section 6)</li>
            <li><strong>Dry Run</strong> — test without API calls (see Section 7)</li>
            <li><strong>Schedule</strong> — set up cron-based triggers</li>
            <li><strong>▶ Run Flow</strong> — execute with preflight validation</li>
            <li>During execution: <strong>Pause</strong> and <strong>Cancel</strong> buttons</li>
            <li>After failure: <strong>↻ Resume</strong> button to continue from the failed node</li>
          </ul>
          <Img src="09-toolbar-highlighted.jpg" alt="Flow builder toolbar with Variables, Dry Run, Schedule, and Run buttons" />
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={MousePointerClick} title="4. Configuring Nodes">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p><strong>Double-click</strong> any node to open the full-width config modal. It slides in from the <strong>left side</strong> and contains all settings for that tool — model selection, parameters, style grids, LoRA pickers, voice selectors, and more.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">What you'll see in the config modal:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Model picker</strong> — grid of available AI models with descriptions (e.g., "Nano Banana 2 — Fastest, great all-rounder")</li>
            <li><strong>Aspect ratio</strong> — visual buttons showing ratio previews</li>
            <li><strong>Style Grid</strong> — 123 visual style presets for image/content nodes</li>
            <li><strong>LoRA Picker</strong> — select trained LoRA models for character/style consistency</li>
            <li><strong>Brand Kit</strong> — apply brand identity (colors, voice, guidelines)</li>
            <li><strong>Voice selector</strong> — 30 Gemini TTS voices for voiceover nodes</li>
            <li><strong>Error handling</strong> — per-node: Stop (halt flow), Skip (continue), Retry (3 attempts with backoff)</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Wired ports</h4>
          <p>When an input port has a connection from an upstream node, the config modal shows a <strong>teal "Connected"</strong> banner for that field. The wired value overrides whatever you set in config — but config acts as a fallback if the wire provides no data.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Multi-input ports</h4>
          <p>A single input port can receive connections from <strong>multiple upstream nodes</strong>. When it does, the values are collected into an array. This is useful for the Merge node or when combining data from multiple sources.</p>

          <Tip>The config summary shown on the node card updates immediately as you change settings in the modal — you can see the effect without closing it.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Link2} title="5. Connections & Port Types">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Port Type System</h4>
          <p>Every input and output port has a <strong>type</strong> that determines compatibility. Connections are validated on creation — incompatible types are silently rejected.</p>

          <PortColorKey />

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Compatibility Rules</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>string</strong> is the universal receiver — any type can connect to a string port</li>
            <li><strong>image</strong> ports accept image and string (URL) outputs</li>
            <li><strong>video</strong> ports accept video and string (URL) outputs</li>
            <li><strong>audio</strong> ports accept audio and string (URL) outputs</li>
            <li><strong>json</strong> ports accept json and string outputs</li>
            <li><strong>Array types</strong> (image[], video[], any[]) — used by Iterator/Aggregator control nodes</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Fan-out</h4>
          <p>One output port can connect to <strong>multiple downstream nodes</strong>. All receive the same data. This enables parallel processing branches.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Multi-input</h4>
          <p>One input port can receive from <strong>multiple upstream nodes</strong>. When 2+ edges target the same port, the values are collected into an array.</p>

          <Tip>Hover over a port to see its name and type. The dot color matches the type: purple for image, blue for video, green for audio, amber for JSON, slate for string.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Variable} title="6. Flow Variables">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <NewBadge />
          <p>Flow variables let you define <strong>reusable values</strong> that any node in the flow can reference. Set them once, use them everywhere.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">How to use</h4>
          <Step number="1" title="Open the Variables panel">
            <p>Click the <strong>Variables</strong> button in the toolbar. A dropdown appears showing all defined variables.</p>
          </Step>
          <Step number="2" title="Add a variable">
            <p>Type a name (e.g., <code>brand_name</code>) and value (e.g., <code>Stitch Studios</code>). Click + to add.</p>
          </Step>
          <Step number="3" title="Use in config fields">
            <p>In any text field in the config modal, type <code>{'{{brand_name}}'}</code> and it will be resolved at execution time. You can also click the <code>{'{{}}'}</code> button next to text fields to insert variables from a dropdown.</p>
          </Step>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Dot notation</h4>
          <p>Variables support nested access: <code>{'{{brand.colors}}'}</code> resolves to the <code>colors</code> property of the <code>brand</code> variable (if it's a JSON object).</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Where variables are stored</h4>
          <p>Variables are saved as part of the flow's <code>graph_json</code> — they persist across sessions and are included in the auto-save.</p>

          <Tip>When you create a campaign via the Campaign Wizard, the brand name and username are automatically set as flow variables.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={FlaskConical} title="7. Dry Run & Preflight Validation">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <NewBadge />

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-2">Preflight Validation</h4>
          <p>Every time you click <strong>▶ Run Flow</strong>, a <strong>Preflight Check</strong> modal appears. It validates:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Flow is not empty</li>
            <li>All required input ports have connections or config defaults</li>
            <li>All connections are type-compatible</li>
            <li>No disconnected orphan nodes (warning, not blocking)</li>
            <li>No cycles in the graph (DAG validation)</li>
            <li>Publishing nodes have valid OAuth tokens</li>
            <li>API providers are healthy (FAL.ai, OpenAI, Wavespeed)</li>
            <li>Estimated cost breakdown</li>
          </ul>
          <p>Green checkmarks for passing checks, red X for errors, amber warnings for non-critical issues. You can click <strong>"Run Anyway"</strong> for warnings, but errors must be fixed first.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Dry Run Mode</h4>
          <p>Click <strong>Dry Run</strong> in the toolbar to test your flow without making any API calls or spending credits. Each node shows what it <em>would</em> do: the resolved inputs, config values, and mock output types. Perfect for verifying your wiring before committing real resources.</p>

          <Tip>Dry run resolves flow variables and wired inputs — you'll see the actual values each node would receive, including any <code>{'{{variable}}'}</code> substitutions.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Rocket} title="8. Campaign Creation Wizard">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <NewBadge />
          <p>The Campaign Wizard creates a flow pre-loaded with your brand context, so you can start building pipelines without manually setting up every input.</p>

          <Step number="1" title="Name your campaign">
            <p>Give it a descriptive name (e.g., "Q3 Product Launch Shorts"). Optional description.</p>
            <Img src="03-campaign-wizard-name.jpg" alt="Campaign wizard step 1 — naming the campaign" />
          </Step>
          <Step number="2" title="Select a brand">
            <p>Choose from your configured Brand Kits. This determines which brand data is available in the next step.</p>
            <Img src="04-campaign-wizard-brand.jpg" alt="Campaign wizard step 2 — selecting a brand" />
          </Step>
          <Step number="3" title="Select context modules">
            <p>This is the key screen. The wizard queries <strong>16+ database tables</strong> and presents each as a toggleable module:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-2">
              <li><strong>Brand Identity</strong> — name, colors, logo, voice, taglines, visual style</li>
              <li><strong>Content Guidelines</strong> — tone, style rules, prohibited/preferred elements</li>
              <li><strong>Image Style</strong> — AI image generation rules, mood, composition</li>
              <li><strong>Target Market</strong> — demographics, pain points, channels</li>
              <li><strong>Company Info</strong> — website, blurb, competitors</li>
              <li><strong>LoRA Models</strong> — each trained LoRA listed individually</li>
              <li><strong>Visual Subjects</strong> — characters with reference images</li>
              <li><strong>Characters</strong> — named characters with descriptions</li>
              <li><strong>Prompt Templates</strong> — saved reusable templates</li>
              <li><strong>Publishing Credentials</strong> — YouTube, TikTok, Instagram, Facebook, LinkedIn (with live OAuth status)</li>
            </ul>
            <p className="mt-2">Each module is expandable — click the arrow to preview the actual field data before selecting.</p>
          </Step>
          <Step number="4" title="Generate Workspace">
            <p>Click <strong>Generate Workspace</strong>. A new flow is created with each selected module as a <strong>source node</strong> on the left side of the canvas. Each source node has <strong>individual output ports per field</strong> — so you can wire specific brand data to specific generation nodes.</p>
          </Step>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Saved Defaults</h4>
          <p>Check "Save as default for this brand" to remember your module selections. Next time you create a campaign for the same brand, your preferred modules are pre-checked.</p>

          <Tip>Publishing credential nodes show live OAuth status — green for connected, red for expired. If a token is expired, go to Settings → Connected Accounts to reconnect before running.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Zap} title="9. Execution — How Flows Run">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Execution Model</h4>
          <p>The executor walks the graph using topological ordering (upstream before downstream). Up to <strong>3 nodes run simultaneously</strong> when they have no dependencies on each other.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Visual Feedback</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Running</strong> — blue pulsing border, spinner in header, progress bar animating, edges show flowing dash pattern</li>
            <li><strong>Completed</strong> — green border flash, checkmark badge, preview area updates with actual output</li>
            <li><strong>Failed</strong> — red border, error message with <strong>actionable fix suggestion</strong> (not just a raw error code)</li>
            <li><strong>Paused</strong> — amber border, pause icon</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Actionable Error Messages</h4>
          <p>When a node fails, you see a clear message like <em>"API rate limit hit"</em> with a fix: <em>"Wait 30 seconds and retry, or switch to a different model."</em> The system matches 28+ error patterns to human-readable advice covering rate limits, timeouts, safety filters, auth failures, model-specific issues, and more.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Per-Node Timeouts</h4>
          <p>Each node type has an appropriate timeout:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Utility nodes</strong> — 15 seconds</li>
            <li><strong>Publishing</strong> — 30 seconds</li>
            <li><strong>Audio/Content (LLM)</strong> — 45 seconds</li>
            <li><strong>Image generation</strong> — 60 seconds</li>
            <li><strong>Video generation</strong> — 180 seconds</li>
            <li><strong>3D generation</strong> — 5 minutes</li>
            <li><strong>LoRA training / Delay</strong> — 10 minutes</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Error Handling Modes</h4>
          <p>Each node can be configured with one of three error handling modes (set in the config modal):</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Stop</strong> (default) — halt the entire flow on error</li>
            <li><strong>Skip</strong> — continue to the next ready nodes, passing null for the failed output</li>
            <li><strong>Retry</strong> — retry up to 3 times with exponential backoff (2s → 4s → 8s)</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Resume from Failed <NewBadge /></h4>
          <p>When a flow fails partway through, click the <strong>↻ Resume</strong> button in the toolbar. This creates a <strong>new execution</strong> that keeps all completed nodes' results and only re-runs the failed node and everything downstream. You don't pay again for nodes that already succeeded.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Pause & Cancel</h4>
          <p>During execution, use <strong>Pause</strong> to freeze the flow (in-progress nodes finish, no new ones start) and <strong>Cancel</strong> to abort immediately.</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Execution Log</h4>
          <p>During execution, a log bar appears at the bottom of the canvas showing a timeline of node events (started, completed, failed) with durations.</p>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={GitBranch} title="10. Control Flow Nodes">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <NewBadge />
          <p>Five special nodes for advanced pipeline logic:</p>

          <div className="space-y-3 mt-3">
            <NodeCard emoji="🔀" name="Iterator" id="iterator" category="Control"
              description="Fan-out: takes an array and runs the downstream chain once per item, in parallel. Each iteration gets the current item, its index, and the total count."
              inputs={[{ name: 'items', type: 'any[]', required: true }]}
              outputs={[{ name: 'current_item', type: 'any' }, { name: 'index', type: 'string' }, { name: 'total', type: 'string' }]}
            >
              <p className="text-gray-500 mt-2">Use case: A script generator outputs 5 scenes. The Iterator fans them out so you can generate a keyframe image for each scene in parallel.</p>
            </NodeCard>

            <NodeCard emoji="🔻" name="Aggregator" id="aggregator" category="Control"
              description="Fan-in: collects all results from parallel Iterator branches into a single array. Waits for all iterations to complete before passing the collected array downstream."
              inputs={[{ name: 'item', type: 'any', required: true }]}
              outputs={[{ name: 'collected', type: 'json' }, { name: 'count', type: 'string' }]}
            >
              <p className="text-gray-500 mt-2">Use case: After iterating 5 scenes through frame generation, the Aggregator collects all 5 images into an array for the Assemble node.</p>
            </NodeCard>

            <NodeCard emoji="⑃" name="Split" id="split" category="Control"
              description="Explicit parallel branching. Takes one input and fires it to 3 output branches simultaneously. Makes parallel paths visually clear."
              inputs={[{ name: 'value', type: 'any', required: true }]}
              outputs={[{ name: 'branch_a', type: 'string' }, { name: 'branch_b', type: 'string' }, { name: 'branch_c', type: 'string' }]}
            >
              <p className="text-gray-500 mt-2">Use case: Split a generated video to YouTube, TikTok, and Instagram publish nodes simultaneously.</p>
            </NodeCard>

            <NodeCard emoji="⊕" name="Merge" id="merge" category="Control"
              description="Synchronization point. Waits for up to 5 different inputs to arrive, then bundles them into a single JSON object. Different from Aggregator — Merge combines heterogeneous data types."
              inputs={[
                { name: 'input_a', type: 'any' }, { name: 'input_b', type: 'any' }, { name: 'input_c', type: 'any' },
                { name: 'input_d', type: 'any' }, { name: 'input_e', type: 'any' },
              ]}
              outputs={[{ name: 'merged', type: 'json' }]}
            >
              <p className="text-gray-500 mt-2">Use case: Wait for the video, voiceover, and music to all finish generating, then pass all three to an Assembly node.</p>
            </NodeCard>

            <NodeCard emoji="🔗" name="Run Flow" id="run-flow" category="Control"
              description="Flow chaining. Triggers another flow as a sub-flow, passing input data as variables. Waits for the sub-flow to complete and passes its outputs through. Max depth: 5 levels."
              inputs={[{ name: 'input_data', type: 'json' }]}
              outputs={[{ name: 'result', type: 'json' }]}
              config={['flow_id — select another flow to chain', 'flow_name — display name']}
            >
              <p className="text-gray-500 mt-2">Use case: A "Daily Content" master flow triggers separate "Generate Short", "Generate Carousel", and "Generate LinkedIn Post" sub-flows.</p>
            </NodeCard>
          </div>

          <Warning>Iterator and Aggregator must be paired. An Iterator without an Aggregator downstream means parallel results are never collected.</Warning>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={BrainCircuit} title="11. LLM Call Node — Structured Output & Test">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>The <strong>LLM Call</strong> node lets you call any LLM (OpenAI GPT, Anthropic Claude, Google Gemini) with full control over prompts, model selection, and generation parameters. Its killer feature is <strong>Structured Output</strong> — define a JSON schema, and each field becomes an individually mappable output port.</p>

          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-4">Available Models (12)</h4>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-1">OpenAI</p>
              <ul className="text-xs space-y-0.5">
                <li>GPT-4.1 — $2/$8</li>
                <li>GPT-4.1 Mini — $0.40/$1.60</li>
                <li>GPT-5 Mini — $0.40/$1.60</li>
                <li>GPT-4o — $2.50/$10</li>
                <li>GPT-4o Mini — $0.15/$0.60</li>
                <li>o3-mini (reasoning) — $1.10/$4.40</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-1">Anthropic / Claude</p>
              <ul className="text-xs space-y-0.5">
                <li>Claude Opus 4 — $15/$75</li>
                <li>Claude Sonnet 4 — $3/$15</li>
                <li>Claude Haiku 4.5 — $0.80/$4</li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-1">Google Gemini</p>
              <ul className="text-xs space-y-0.5">
                <li>Gemini 2.5 Pro — $1.25/$10</li>
                <li>Gemini 2.5 Flash — $0.15/$0.60</li>
                <li>Gemini 2.0 Flash — $0.10/$0.40</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Prices shown as input/output per 1M tokens.</p>

          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-5">Structured Output — N8N/Make.com Style</h4>
          <p>By default, the LLM Call returns a single <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">response</code> string. Toggle <strong>Structured Output</strong> on to define a JSON schema — the LLM's output is then parsed into individual fields, each becoming its own output port.</p>

          <Step number="1" title="Toggle Structured Output On">
            <p>In the node config, scroll to the <strong>Structured Output</strong> panel and flip the toggle to "Enabled". This tells the LLM to return JSON matching your schema.</p>
          </Step>

          <Step number="2" title="Define Your Schema Fields">
            <p>Add fields with a <strong>Field Name</strong> (e.g. <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">start_time</code>), a <strong>Type</strong> (string, number, boolean, array), and a <strong>Description</strong> that helps the LLM understand what to put there (e.g. "Start time in HH:MM format").</p>
            <p>Each field you define becomes a separate output port on the canvas node — visible immediately after saving.</p>
          </Step>

          <Step number="3" title="Test the Node">
            <p>Click <strong>Test Node</strong> to execute the LLM call once with your current settings. The parsed result appears inline — each field shows its key and value. This confirms the schema works before wiring it into a larger flow.</p>
          </Step>

          <Step number="4" title="Wire Individual Fields">
            <p>On the canvas, the node now shows your schema fields as output ports (e.g. <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">start_time</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">end_time</code>) instead of a single <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">response</code>. Wire each field to different downstream nodes. You can also reference them in text fields using the <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">/</code> slash command.</p>
          </Step>

          <Tip>The schema enforcement is provider-native where possible: OpenAI uses <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">json_schema</code> strict mode, Gemini uses <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">responseSchema</code>, and Anthropic uses a system prompt injection. OpenAI and Gemini guarantee valid JSON; Anthropic is best-effort.</Tip>

          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-5">Context Input Port</h4>
          <p>The <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">context</code> input port lets you pipe data from upstream nodes into the LLM prompt. Connect any text output (a scraped article, a generated script, database results) and it's automatically prepended as context. This keeps the user prompt clean while feeding the LLM rich background information.</p>

          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-5">Provider-Specific Settings</h4>
          <p>The <strong>Advanced Settings</strong> panel shows different options depending on the selected model's provider:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>OpenAI</strong> — Frequency penalty, presence penalty, response format (text/JSON), seed for reproducibility</li>
            <li><strong>Anthropic</strong> — Top K sampling, stop sequences</li>
            <li><strong>Gemini</strong> — Top K, response MIME type (text/JSON), stop sequences</li>
          </ul>
          <p className="mt-2">When Structured Output is enabled, the manual JSON/response format controls are hidden since the schema handles that automatically.</p>

          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-5">Example Use Cases</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Time range extraction</strong> — Schema: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">start_time</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">end_time</code> → wire to Video Trim node</li>
            <li><strong>Content classification</strong> — Schema: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">category</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">sentiment</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">keywords</code> → wire to conditional branching</li>
            <li><strong>Script analysis</strong> — Pipe a script via context, schema: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">summary</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">tone</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">target_audience</code> → wire to downstream ad generation</li>
            <li><strong>Multi-language translation</strong> — Schema: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">english</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">spanish</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">french</code> → wire each to separate LinkedIn Post nodes</li>
          </ul>

          <Warning>Claude and Gemini API keys must be added in Settings → API Keys before using those providers. OpenAI keys are already configured if you use other Stitch features (storyboards, scripts, etc.).</Warning>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={CircleDot} title="12. Node Reference — All 45+ Node Types">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <p>All nodes organized by category. Click any node to see its inputs, outputs, and configuration options.</p>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Input Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="📥" name="Manual Input" id="manual-input" category="Input"
              description="User-supplied text, image, or video. Starting point for most flows."
              inputs={[]} outputs={[{ name: 'value', type: 'string' }]}
              config={['inputType — string, image, or video', 'defaultValue — fallback when not wired']} />
            <NodeCard emoji="🎨" name="Style Preset" id="style-preset" category="Input"
              description="Visual style text output from 123+ presets."
              inputs={[]} outputs={[{ name: 'style', type: 'string' }]}
              config={['style_key — preset identifier', 'style_text — full style description']} />
            <NodeCard emoji="🎬" name="Video Style Preset" id="video-style-preset" category="Input"
              description="Video motion style output from 86 cinematography presets."
              inputs={[]} outputs={[{ name: 'style', type: 'string' }]}
              config={['style_key', 'style_text']} />
            <NodeCard emoji="📋" name="Prompt Template" id="prompt-template" category="Input"
              description="Reusable prompt template with variable placeholders."
              inputs={[]} outputs={[{ name: 'prompt', type: 'string' }]}
              config={['template — JSON template with sections']} />
            <NodeCard emoji="🔎" name="Image Search" id="image-search" category="Input"
              description="Search the web for images by keyword."
              inputs={[{ name: 'query', type: 'string', required: true }]} outputs={[{ name: 'image_url', type: 'image' }]} />
          </div>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Image Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="🖼" name="Imagineer Generate" id="imagineer-generate" category="Image"
              description="Text-to-image with 11 models + LoRA support. Uses the Cohesive Prompt Builder for optimized prompts."
              inputs={[{ name: 'prompt', type: 'string', required: true }, { name: 'style', type: 'string' }]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={['model — Nano Banana 2, Flux 2, SeedDream, Imagen 4, Kling, Grok, Ideogram, Wavespeed, Wan', 'aspect_ratio — 16:9, 9:16, 1:1, 4:5, 3:2', 'negative_prompt', 'brand_kit — apply brand guidelines', 'LoRA models']} />
            <NodeCard emoji="✏️" name="Imagineer Edit" id="imagineer-edit" category="Image"
              description="AI image editing and composition. Supports single and multi-image input."
              inputs={[{ name: 'image', type: 'image', required: true }, { name: 'prompt', type: 'string', required: true }, { name: 'style', type: 'string' }]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={['model — Nano Banana 2, SeedDream, Wavespeed Nano Ultra, Qwen Edit']} />
            <NodeCard emoji="🎨" name="Turnaround Sheet" id="turnaround-sheet" category="Image"
              description="Multi-pose character reference sheet with 8 pose set options."
              inputs={[{ name: 'prompt', type: 'string', required: true }, { name: 'style', type: 'string' }]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={['model', 'pose_set — standard-24, 3d-angles, 3d-action, r2v-reference', 'background_mode — white, gray, scene']} />
            <NodeCard emoji="🔀" name="Smoosh" id="smoosh" category="Image"
              description="Blend two images together with AI compositing."
              inputs={[{ name: 'image', type: 'image', required: true }, { name: 'image2', type: 'image', required: true }]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={['model', 'blend_prompt']} />
            <NodeCard emoji="🔍" name="Upscale Image" id="upscale-image" category="Image"
              description="2-4x resolution upscale via Topaz Standard V2."
              inputs={[{ name: 'image', type: 'image', required: true }]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={['upscale_factor — 2x or 4x']} />
          </div>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Video Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="🎬" name="JumpStart Animate" id="jumpstart-animate" category="Video"
              description="Image-to-video with 13 models. Supports FLF (First-Last-Frame) and I2V modes."
              inputs={[{ name: 'image', type: 'image', required: true }, { name: 'prompt', type: 'string' }]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={['model — Kling 2.0, Kling V3, Kling O3, Veo 2, Veo 3.1, Veo 3.1 Lite, PixVerse V6, Wan 2.5, Hailuo, Grok, Wavespeed', 'duration — 3-15 seconds', 'aspect_ratio']} />
            <NodeCard emoji="⏩" name="Video Extend" id="video-extend" category="Video"
              description="Extend video duration by 4-10 seconds. Extracts last frame and continues the scene."
              inputs={[{ name: 'video', type: 'video', required: true }, { name: 'prompt', type: 'string' }]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={['model — Seedance, Veo 3.1 Extend, Grok Extend', 'duration — 4-10s']} />
            <NodeCard emoji="🎭" name="Video Restyle" id="video-restyle" category="Video"
              description="Change the visual style of a video using Lucy Restyle (Wavespeed)."
              inputs={[{ name: 'video', type: 'video', required: true }, { name: 'style_prompt', type: 'string', required: true }]}
              outputs={[{ name: 'video_url', type: 'video' }]} />
            <NodeCard emoji="🏃" name="Motion Transfer" id="motion-transfer" category="Video"
              description="Transfer motion from a reference video onto a static image."
              inputs={[{ name: 'video', type: 'video', required: true }, { name: 'reference_image', type: 'image', required: true }]}
              outputs={[{ name: 'video_url', type: 'video' }]} />
            <NodeCard emoji="✂️" name="Video Trim" id="video-trim" category="Video"
              description="Trim video to a specific start and end time using FFmpeg."
              inputs={[{ name: 'video', type: 'video', required: true }]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={['start_time — seconds', 'end_time — seconds']} />
            <NodeCard emoji="🖼️" name="Extract Frame" id="extract-frame" category="Video"
              description="Get the first, middle, or last frame from a video as an image."
              inputs={[{ name: 'video', type: 'video', required: true }]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={['frame_type — first, middle, or last']} />
          </div>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Audio Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="🎙️" name="Voiceover" id="voiceover" category="Audio"
              description="AI text-to-speech with 30 Gemini voices. Supports speed control and style instructions."
              inputs={[{ name: 'text', type: 'string', required: true }]}
              outputs={[{ name: 'audio_url', type: 'audio' }]}
              config={['voice — 30 Gemini voices', 'speed — 1.0x to 1.3x', 'style_instructions — performance direction']} />
            <NodeCard emoji="🎵" name="Music" id="music" category="Audio"
              description="Generate instrumental background music. Always instrumental, never lyrics."
              inputs={[{ name: 'mood', type: 'string' }]}
              outputs={[{ name: 'audio_url', type: 'audio' }]}
              config={['duration — 10-90 seconds', 'mood — genre/style description']} />
            <NodeCard emoji="💬" name="Captions" id="captions" category="Audio"
              description="Burn captions onto a video with 4 style presets."
              inputs={[{ name: 'video', type: 'video', required: true }]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={['style — word_pop, karaoke_glow, word_highlight, news_ticker', 'font_size — small, medium, large', 'position — bottom, center, top']} />
          </div>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Content Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="📝" name="Script Generator" id="script-generator" category="Content"
              description="AI script writing for 20 niches. GPT-powered narrative generation."
              inputs={[{ name: 'topic', type: 'string', required: true }, { name: 'niche', type: 'string' }]}
              outputs={[{ name: 'script', type: 'json' }]}
              config={['duration — 30, 60, or 90 seconds', 'niche — 20 options from AI/Tech to Paranormal', 'tone — custom voice direction']} />
            <NodeCard emoji="🔧" name="Prompt Builder" id="prompt-builder" category="Content"
              description="GPT-enhanced prompt composition from structured inputs."
              inputs={[{ name: 'description', type: 'string', required: true }, { name: 'style', type: 'string' }, { name: 'props', type: 'string' }]}
              outputs={[{ name: 'prompt', type: 'string' }]} />
            <NodeCard emoji="🤖" name="LLM Call" id="llm-call" category="Content"
              description="Call any LLM (GPT, Claude, Gemini) with full parameter control. Supports structured JSON output with per-field mapping and per-node test execution."
              inputs={[{ name: 'prompt', type: 'string', required: true }, { name: 'system_prompt', type: 'string' }, { name: 'context', type: 'string' }]}
              outputs={[{ name: 'response', type: 'string' }, { name: 'usage', type: 'json' }]}
              config={[
                'model — 12 models: GPT-4.1, GPT-4.1 Mini, GPT-5 Mini, GPT-4o, GPT-4o Mini, o3-mini, Claude Opus 4, Claude Sonnet 4, Claude Haiku 4.5, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash',
                'system_prompt — instructions that define the AI behavior',
                'temperature — 0 (deterministic) to 2 (creative)',
                'max_tokens — max output length (default 4096)',
                'top_p — nucleus sampling threshold',
                'Structured Output — toggle to define a JSON schema; each field becomes an individual output port',
                'Test Node — execute once to verify output structure before wiring',
                'OpenAI-only: frequency_penalty, presence_penalty, response_format (text/JSON), seed',
                'Anthropic-only: top_k, stop_sequences',
                'Gemini-only: topK, responseMimeType, stopSequences',
              ]}>
              <Tip>When Structured Output is enabled, the node's output ports change dynamically to match your schema fields. The "response" port is replaced by individual field ports (e.g. "start_time", "end_time") that can each be wired to different downstream nodes.</Tip>
            </NodeCard>
            <NodeCard emoji="📊" name="Carousel Create" id="carousel-create" category="Content"
              description="Create a multi-slide carousel for Instagram, LinkedIn, TikTok, or Facebook."
              inputs={[{ name: 'topic', type: 'string', required: true }]}
              outputs={[{ name: 'carousel_id', type: 'string' }]}
              config={['platform — instagram, linkedin, tiktok, facebook', 'style — 8 carousel style templates']} />
            <NodeCard emoji="📢" name="Ads Generate" id="ads-generate" category="Content"
              description="Generate multi-platform ad copy with images."
              inputs={[{ name: 'product_description', type: 'string', required: true }]}
              outputs={[{ name: 'campaign_id', type: 'string' }]}
              config={['platform — linkedin, google, meta', 'objective — traffic, conversions, awareness, leads']} />
          </div>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Publish Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="📺" name="YouTube Upload" id="youtube-upload" category="Publish"
              description="Upload video to YouTube. Auto-detects Shorts (vertical < 60s). Sets synthetic media disclosure."
              inputs={[{ name: 'video', type: 'video', required: true }, { name: 'title', type: 'string', required: true }, { name: 'description', type: 'string' }]}
              outputs={[{ name: 'video_id', type: 'string' }]}
              config={['privacy — public, unlisted, private']} />
            <NodeCard emoji="🎵" name="TikTok Publish" id="tiktok-publish" category="Publish"
              description="Publish video or image carousel to TikTok."
              inputs={[{ name: 'video', type: 'video' }, { name: 'image', type: 'image' }]}
              outputs={[{ name: 'post_id', type: 'string' }]} />
            <NodeCard emoji="📸" name="Instagram Post" id="instagram-post" category="Publish"
              description="Post image to Instagram. Requires Business/Creator account."
              inputs={[{ name: 'image', type: 'image', required: true }, { name: 'caption', type: 'string' }]}
              outputs={[{ name: 'post_id', type: 'string' }]} />
            <NodeCard emoji="👤" name="Facebook Post" id="facebook-post" category="Publish"
              description="Post to a Facebook page with optional images."
              inputs={[{ name: 'text', type: 'string', required: true }, { name: 'image', type: 'image' }]}
              outputs={[{ name: 'post_id', type: 'string' }]} />
            <NodeCard emoji="💼" name="LinkedIn Post" id="linkedin-post" category="Publish"
              description="Publish text + image post to LinkedIn."
              inputs={[{ name: 'text', type: 'string', required: true }, { name: 'image', type: 'image' }]}
              outputs={[{ name: 'post_id', type: 'string' }]} />
          </div>

          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-5 mb-2">Utility Nodes</h3>
          <div className="space-y-2">
            <NodeCard emoji="💾" name="Save to Library" id="save-to-library" category="Utility"
              description="Save any media URL to your asset library."
              inputs={[{ name: 'url', type: 'string', required: true }, { name: 'name', type: 'string' }]}
              outputs={[{ name: 'saved_url', type: 'string' }]} />
            <NodeCard emoji="🔤" name="Text Transform" id="text-transform" category="Utility"
              description="Transform text: uppercase, lowercase, trim, extract first line, add prefix/suffix."
              inputs={[{ name: 'text', type: 'string', required: true }]}
              outputs={[{ name: 'text', type: 'string' }]}
              config={['transform — uppercase, lowercase, trim, extract_first_line, add_prefix, add_suffix', 'value — for prefix/suffix']} />
            <NodeCard emoji="⏱️" name="Delay" id="delay" category="Utility"
              description="Pause flow for 5-300 seconds. Useful for rate limiting."
              inputs={[{ name: 'passthrough', type: 'string' }]}
              outputs={[{ name: 'passthrough', type: 'string' }]}
              config={['seconds — 5, 10, 30, 60, 120, 300']} />
            <NodeCard emoji="🔀" name="Conditional" id="conditional" category="Utility"
              description="Branch on value comparison. Passes value through if condition is met, empty string if not."
              inputs={[{ name: 'value', type: 'string', required: true }]}
              outputs={[{ name: 'result', type: 'string' }]}
              config={['condition — not_empty, contains, equals', 'compare_value']} />
          </div>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Share2} title="13. Example Flows — Common Patterns">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4 mt-3">

          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Short-Form Video Pipeline</h4>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 font-mono text-xs space-y-1">
            <p>[Topic Input] → [Script Generator] → scenes[]</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;→ [Iterator] → [Generate Frame] → [Generate Clip] → [Aggregator] → clips[]</p>
            <p>[Voiceover] ────────────────────────────────────────→ [Merge] → [Assemble] → [Captions] → [YouTube]</p>
            <p>[Music] ────────────────────────────────────────────→</p>
          </div>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Multi-Platform Social Blast</h4>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 font-mono text-xs space-y-1">
            <p>[Manual Input] → [Script Generator] → [Imagineer Generate]</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;→ [Split] → [YouTube Upload]</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ [TikTok Publish]</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ [Instagram Post]</p>
          </div>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Character Asset Pipeline</h4>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 font-mono text-xs space-y-1">
            <p>[Manual Input: character description] → [Imagineer Generate] → [Turnaround Sheet] → [Save to Library]</p>
          </div>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Campaign with Brand Context</h4>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 font-mono text-xs space-y-1">
            <p>[Brand Identity] ──→ voice_style ──→ [Voiceover]</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;──→ visual_style ─→ [Imagineer Generate] → [JumpStart Animate]</p>
            <p>[Target Market] ───→ pain_points ──→ [Script Generator]</p>
            <p>[YouTube Creds] ───→ credential ──→ [YouTube Upload]</p>
          </div>

          <Tip>Use the <strong>Campaign Wizard</strong> to auto-generate the brand context source nodes. Then just add your generation and publishing nodes and wire them up.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Plug} title="14. Dynamic Input Form & Shareable Run Page">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <NewBadge />
          <p>Every flow with source nodes (Manual Input, Style Preset, Brand Context, etc.) automatically generates a <strong>dynamic input form</strong>. Two ways to use it:</p>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Pre-Run Modal (inside the builder)</h4>
          <p>When you click <strong>▶ Run Flow</strong> and the flow has source nodes, a modal appears with typed input fields for each source node. Fill in your values, then the preflight check runs, and the flow executes with your inputs injected.</p>
          <p>The form renders different field types based on the source node:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Text/String</strong> — textarea for typing prompts, topics, descriptions</li>
            <li><strong>Image</strong> — URL paste field + file upload button with live preview</li>
            <li><strong>Video/Audio</strong> — URL paste field</li>
            <li><strong>JSON</strong> — monospace textarea for structured data</li>
          </ul>

          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">Shareable Run Page</h4>
          <p>Every flow has a shareable page at <code>/flows/:id/input</code>. Share this URL with team members who need to run the flow without seeing the canvas. They fill in the form and click Run.</p>
          <Img src="10-flow-run-page.jpg" alt="Shareable flow run page with dynamic input form" />

          <Tip>The dynamic form only shows source nodes that have no incoming edges. If a source node is wired to another node upstream, it won't appear in the form — it gets its value from the wire instead.</Tip>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Shield} title="15. Tips & Best Practices">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Start simple.</strong> Build a 3-node flow first (Input → Generate → Save). Get comfortable with the canvas before building complex pipelines.</li>
            <li><strong>Use Dry Run first.</strong> Before running a flow with real API calls, hit Dry Run to verify all wiring is correct and variables resolve properly.</li>
            <li><strong>Check preflight.</strong> The preflight validation catches most common issues — missing connections, expired OAuth tokens, incompatible types. Don't skip it.</li>
            <li><strong>Set error mode per node.</strong> Use Retry for generation nodes (they can fail transiently) and Skip for optional enhancements (captions, music).</li>
            <li><strong>Use flow variables.</strong> Instead of hardcoding brand names or style descriptions in every node, set them as flow variables and reference with <code>{'{{name}}'}</code>.</li>
            <li><strong>Save Library outputs.</strong> Add a Save to Library node after generation steps so you can reuse assets later without re-generating.</li>
            <li><strong>Clone templates.</strong> Start from a template and customize rather than building from scratch. The templates section has pre-built pipelines for common workflows.</li>
            <li><strong>Use Iterator for batch work.</strong> If you need to generate 5 images with different styles, use an Iterator over a style array instead of 5 separate Imagineer nodes.</li>
            <li><strong>Mind the concurrency.</strong> Only 3 nodes run simultaneously. If you have 10 parallel branches, they'll queue — not all run at once.</li>
            <li><strong>Check OAuth before publishing.</strong> Publishing nodes need active OAuth tokens. Go to Settings → Connected Accounts if a token is expired. The preflight check flags this.</li>
          </ul>

          <Warning>Video generation is the most expensive operation (~$0.30/clip). Use Dry Run to estimate costs before running video-heavy flows.</Warning>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={Target} title="16. Keyboard Shortcuts">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <KV label={<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/</kbd>}>Focus palette search</KV>
            <KV label={<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Backspace</kbd>}>Delete selected node or edge</KV>
            <KV label={<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Delete</kbd>}>Delete selected node or edge</KV>
            <KV label="Double-click node">Open config modal</KV>
            <KV label="Click canvas">Deselect all</KV>
            <KV label="Scroll wheel">Zoom in/out</KV>
            <KV label="Click + drag canvas">Pan</KV>
            <KV label="Drag from port">Create connection</KV>
          </div>
        </div>
      </Section>

      {/* ================================================================ */}

      <Section icon={FileText} title="17. Glossary">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <KV label="DAG">Directed Acyclic Graph — a flow structure where connections only go forward (no loops).</KV>
          <KV label="Node">A single processing step in your flow (e.g., generate image, add voiceover). 280px dark card with ports, preview, and config.</KV>
          <KV label="Edge / Connection">A type-colored bezier curve between two nodes that carries data from output to input.</KV>
          <KV label="Port">An input or output connector on a node. Type-colored dot with label. Types: string, image, video, audio, json, arrays.</KV>
          <KV label="Config Modal">The full-width slide-over panel opened by double-clicking a node. Opens from the left. Contains all settings.</KV>
          <KV label="Wired Port">An input port with an incoming connection. Shown as a teal "Connected" banner in the config modal.</KV>
          <KV label="Flow Variable">A named value (e.g., {'{{brand_name}}'}) defined at the flow level and resolvable in any node config field.</KV>
          <KV label="Preflight Check">Validation modal that runs before execution — checks wiring, types, OAuth, API health, and estimates cost.</KV>
          <KV label="Dry Run">Execute the flow without making API calls — shows what each node would do with resolved inputs.</KV>
          <KV label="Iterator">Control node that fans out an array into parallel branches.</KV>
          <KV label="Aggregator">Control node that collects parallel iteration results back into an array.</KV>
          <KV label="Split">Control node for explicit parallel branching (one input, multiple outputs).</KV>
          <KV label="Merge">Control node that waits for multiple inputs and bundles them into one object.</KV>
          <KV label="Run Flow">Control node that triggers another flow as a sub-flow (flow chaining).</KV>
          <KV label="Resume">Re-run a failed flow from the point of failure, keeping completed nodes' results.</KV>
          <KV label="Concurrency Pool">Up to 3 independent nodes can execute simultaneously.</KV>
          <KV label="Fan-Out">One output port connected to multiple downstream nodes — all receive the same data.</KV>
          <KV label="Multi-Input">One input port receiving from multiple upstream nodes — values collected as array.</KV>
          <KV label="Campaign Wizard">4-step wizard that creates a flow pre-loaded with brand context source nodes.</KV>
          <KV label="Cron Expression">A scheduling format (e.g., <code>0 9 * * *</code> = every day at 9 AM).</KV>
          <KV label="Error Mode">Per-node setting: Stop (halt on error), Skip (continue past error), Retry (try 3 times).</KV>
          <KV label="Auto-Save">Flows save automatically 1.5 seconds after any structural change.</KV>
          <KV label="Template">A pre-built flow you can clone and customize.</KV>
          <KV label="LoRA">Low-Rank Adaptation — a trained model fine-tune for specific subjects or styles.</KV>
        </div>
      </Section>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 pb-8">
        Automation Flows Guide — Updated April 2026 &middot; 45+ node types across 9 categories &middot; 16 sections with screenshots
      </div>
    </div>
  );
}

export default function AutomationFlowsGuidePage() {
  return <AutomationFlowsGuideContent />;
}
