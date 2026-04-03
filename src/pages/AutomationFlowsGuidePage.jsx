/**
 * AutomationFlowsGuidePage — comprehensive training guide for Automation Flows.
 *
 * Covers the visual DAG flow builder, all 33 node types, connections,
 * execution, scheduling, the config modal, templates, and troubleshooting.
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
  MousePointerClick, Maximize2, ArrowDown, Box, Grip,
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

// ── Visual Mockup: Canvas Layout ──

function CanvasMockup() {
  return (
    <div className="mt-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-750 px-3 py-1.5 border-b border-gray-300 dark:border-gray-600 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Flow Builder Layout</span>
        <span className="ml-auto italic">Visual mockup</span>
      </div>
      <div className="flex h-64">
        {/* Left: Node Palette */}
        <div className="w-48 shrink-0 border-r border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Node Palette</div>
          <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-2">
            <Search className="w-3 h-3 text-gray-400 mr-1" />
            <span className="text-[10px] text-gray-400">Search nodes...</span>
          </div>
          <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">INPUT</div>
          <div className="h-5 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 flex items-center text-[10px] text-emerald-700 dark:text-emerald-300">Manual Input</div>
          <div className="h-5 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 flex items-center text-[10px] text-emerald-700 dark:text-emerald-300">Image Search</div>
          <div className="text-[9px] font-semibold text-violet-600 dark:text-violet-400 mt-1">IMAGE</div>
          <div className="h-5 bg-violet-50 dark:bg-violet-900/20 rounded px-2 flex items-center text-[10px] text-violet-700 dark:text-violet-300">Imagineer Generate</div>
          <div className="h-5 bg-violet-50 dark:bg-violet-900/20 rounded px-2 flex items-center text-[10px] text-violet-700 dark:text-violet-300">Imagineer Edit</div>
          <div className="text-[9px] text-gray-400 mt-auto">7 categories, 33 nodes</div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden p-4 flex flex-col" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {/* Example nodes on canvas — using flexbox to avoid overlap */}
          <div className="flex items-center justify-center gap-6 flex-1">
            <NodeMockupSmall name="Manual Input" category="Input" color="emerald" />
            <div className="text-[#2C666E]">&rarr;</div>
            <NodeMockupSmall name="Imagineer" category="Image" color="violet" />
            <div className="text-[#2C666E]">&rarr;</div>
            <NodeMockupSmall name="JumpStart" category="Video" color="blue" />
          </div>
          <div className="text-center text-[10px] text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded self-center mt-auto">
            Scroll to zoom &middot; Drag to pan &middot; Double-click node to configure
          </div>
        </div>

        {/* Right: Info Strip */}
        <div className="w-48 shrink-0 border-l border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Info Strip</div>
          <div className="h-5 bg-violet-50 dark:bg-violet-900/20 rounded px-2 flex items-center text-[10px] text-violet-700 dark:text-violet-300 font-medium">Imagineer Generate</div>
          <div className="text-[9px] text-gray-500 dark:text-gray-400">Category: <span className="text-violet-600 dark:text-violet-400">Image</span></div>
          <div className="text-[9px] text-gray-500 dark:text-gray-400">Inputs: prompt, style</div>
          <div className="text-[9px] text-gray-500 dark:text-gray-400">Outputs: image_url</div>
          <div className="text-[9px] text-gray-500 dark:text-gray-400">Error mode: Stop</div>
          <div className="mt-1 px-2 py-1 bg-[#2C666E]/10 rounded text-[9px] text-[#2C666E] dark:text-teal-300 font-medium text-center">
            4 settings configured
          </div>
          <div className="mt-auto px-2 py-1.5 border border-dashed border-[#2C666E]/40 rounded text-[9px] text-[#2C666E] dark:text-teal-300 text-center">
            Double-click to configure
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small node for canvas mockup ──

function NodeMockupSmall({ name, category, color }) {
  const bgMap = { emerald: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700', violet: 'bg-violet-50 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700', blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700', pink: 'bg-pink-50 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700', amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700', sky: 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700', gray: 'bg-gray-50 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600' };
  return (
    <div className={`relative px-3 py-2 rounded-lg border ${bgMap[color] || bgMap.gray} shadow-sm`} style={{ zIndex: 1 }}>
      {/* Input port */}
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white dark:border-gray-800" />
      <div className="text-[10px] font-semibold text-gray-800 dark:text-gray-200">{name}</div>
      <div className="text-[8px] text-gray-500 dark:text-gray-400">{category}</div>
      {/* Output port */}
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-800" />
    </div>
  );
}

// ── Full Node Mockup (detailed for reference) ──

function NodeMockup() {
  return (
    <div className="mt-4 flex justify-center">
      <div className="relative border-2 border-violet-300 dark:border-violet-600 rounded-xl bg-white dark:bg-gray-800 shadow-lg w-72 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/30 border-b border-violet-200 dark:border-violet-700">
          <span className="text-base">&#127912;</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">Imagineer Generate</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">Image</span>
        </div>
        {/* Ports */}
        <div className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
            <span>prompt</span>
            <span className="text-gray-400">(string)</span>
            <span className="text-red-400 text-[8px]">required</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
            <span>style</span>
            <span className="text-gray-400">(string)</span>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span>image_url</span>
            <span className="text-gray-400">(image)</span>
            <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
          </div>
        </div>
        {/* Status overlay mockups */}
        <div className="flex gap-2 px-3 pb-2 text-[9px]">
          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">idle</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600">running</span>
          <span className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600">done 4.2s</span>
          <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600">error</span>
        </div>
        {/* Port circles on edges */}
        <div className="absolute left-0 top-16 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-indigo-400 border-2 border-white dark:border-gray-800" />
        <div className="absolute right-0 top-20 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-800" />
      </div>
    </div>
  );
}

// ── Config Modal Mockup ──

function ConfigModalMockup() {
  return (
    <div className="mt-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-750 px-3 py-1.5 border-b border-gray-300 dark:border-gray-600 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-700 dark:text-gray-300">Config Modal — Imagineer Generate</span>
        <span className="ml-auto italic">Visual mockup</span>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 space-y-4 max-h-[480px] overflow-y-auto">
        {/* Header bar */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xl">&#127912;</span>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Imagineer Generate</div>
            <div className="text-[10px] text-violet-600 dark:text-violet-400">Image &middot; Text-to-Image generation</div>
          </div>
          <div className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-500">
            <XCircle className="w-3 h-3 inline mr-1" />Close
          </div>
        </div>

        {/* Prompt section */}
        <div>
          <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Prompt</div>
          <div className="h-16 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-[10px] text-gray-500 dark:text-gray-400">
            A majestic dragon perched on a crystal cliff at sunset, detailed scales reflecting prismatic light...
          </div>
        </div>

        {/* Connected port banner mockup */}
        <div className="px-3 py-2 bg-[#2C666E]/10 border border-[#2C666E]/30 rounded-lg flex items-center gap-2 text-[10px]">
          <Link2 className="w-3.5 h-3.5 text-[#2C666E] dark:text-teal-300" />
          <span className="text-[#2C666E] dark:text-teal-300 font-medium">Connected via &quot;prompt&quot; input port</span>
          <span className="text-gray-400 ml-auto">from Manual Input #1</span>
        </div>

        {/* Model grid */}
        <div>
          <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Model</div>
          <div className="grid grid-cols-3 gap-1.5">
            {['Nano Banana 2', 'Flux 2', 'SeedDream v4.5', 'Imagen 4', 'Kling Img v3', 'Grok Imagine', 'Ideogram v2', 'Wavespeed', 'Flux LoRA'].map((m, i) => (
              <div key={m} className={`px-2 py-1.5 rounded border text-[9px] text-center ${i === 0 ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E] dark:text-teal-300 font-medium' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Visual Style stub */}
        <div>
          <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Visual Style (StyleGrid &middot; 123 styles)</div>
          <div className="grid grid-cols-5 gap-1">
            {['Cinematic', 'Anime', 'Watercolor', 'Photographic', '3D Render'].map((s, i) => (
              <div key={s} className={`h-10 rounded flex items-end p-1 text-[7px] font-medium ${i === 0 ? 'bg-gradient-to-t from-[#2C666E] to-[#2C666E]/40 text-white' : 'bg-gradient-to-t from-gray-300 dark:from-gray-600 to-gray-200 dark:to-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {s}
              </div>
            ))}
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5">+ 118 more styles scrollable</div>
        </div>

        {/* Controls row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Aspect Ratio</div>
            <div className="flex gap-1">
              {['16:9', '9:16', '1:1'].map((r, i) => (
                <div key={r} className={`flex-1 text-center py-1 rounded text-[9px] ${i === 0 ? 'bg-[#2C666E] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{r}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Lighting</div>
            <div className="flex gap-1 flex-wrap">
              {['Golden Hour', 'Studio', 'Neon'].map(l => (
                <span key={l} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[8px] text-gray-600 dark:text-gray-400">{l}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Camera Angle</div>
            <div className="flex gap-1 flex-wrap">
              {['Wide', 'Close-up', 'Bird Eye'].map(c => (
                <span key={c} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[8px] text-gray-600 dark:text-gray-400">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* More sections */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Brand Guide</div>
            <div className="h-7 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-700 flex items-center px-2 text-[9px] text-gray-400">Select brand kit...</div>
          </div>
          <div>
            <div className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">LoRA</div>
            <div className="h-7 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-700 flex items-center px-2 text-[9px] text-gray-400">Select trained LoRA...</div>
          </div>
        </div>

        <div>
          <div className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Negative Prompt</div>
          <div className="h-7 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-700 flex items-center px-2 text-[9px] text-gray-400">blurry, low quality, text, watermark...</div>
        </div>

        {/* Error handling */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Error Handling</div>
          <div className="flex gap-2">
            {['Stop', 'Skip', 'Retry'].map((e, i) => (
              <div key={e} className={`flex-1 text-center py-1 rounded text-[9px] ${i === 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{e}</div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button className="w-full py-2 bg-[#2C666E] text-white rounded-lg text-xs font-semibold">
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ── Pipeline Diagram (enhanced) ──

function PipelineDiagram({ title, description, steps, notes }) {
  const catColor = {
    Input: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    Image: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700',
    Video: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    Audio: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700',
    Content: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    Publish: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700',
    Utility: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  };
  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</div>
        {description && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-4 py-4 bg-white dark:bg-gray-800 space-y-3">
        {steps.map((row, ri) => (
          <div key={ri}>
            {row.label && <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 pl-1">{row.label}</div>}
            <div className="flex items-center gap-1.5 flex-wrap">
              {row.nodes.map((node, ni) => (
                <React.Fragment key={ni}>
                  {ni > 0 && <ArrowRight className="w-3.5 h-3.5 text-[#2C666E]/60 shrink-0" />}
                  <div className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-medium shrink-0 ${catColor[node.cat] || catColor.Utility}`}>
                    <span className="mr-1">{node.emoji}</span>
                    {node.name}
                  </div>
                </React.Fragment>
              ))}
              {row.parallel && <span className="text-[9px] text-gray-400 dark:text-gray-500 italic ml-1">(parallel)</span>}
            </div>
          </div>
        ))}
        {notes && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 pl-1 border-t border-gray-100 dark:border-gray-700 pt-2">{notes}</p>}
      </div>
    </div>
  );
}


// ======================================================================
// ===  MAIN GUIDE CONTENT  ===
// ======================================================================

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
          double-click to configure each step with the full tool interface, then run — or schedule
          to run automatically. 33 node types across 7 categories.
        </p>
      </div>

      {/* ================================================================ */}
      {/* 1. OVERVIEW & CONCEPTS */}
      {/* ================================================================ */}

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
            <li><strong>Nodes</strong> are individual tools (generate image, animate video, add voiceover, create shorts, publish to YouTube, etc.)</li>
            <li><strong>Connections</strong> are wires between nodes that pass data — an image output flows into a video input</li>
            <li><strong>The canvas</strong> is where you arrange and wire everything visually</li>
            <li><strong>Double-click</strong> any node to open the full configuration modal with all the tool's settings</li>
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
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-200">Config Modal</p>
              <p className="text-xs mt-0.5">Double-click any node to open a full-width slide-over panel with every configuration option for that tool — models, styles, LoRA, brand guides, and more.</p>
            </div>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-200">Independent Config</p>
              <p className="text-xs mt-0.5">Each node instance stores its own independent configuration. Two "Imagineer Generate" nodes can have completely different models, styles, and prompts.</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">What Can You Build?</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>A <strong>content calendar pipeline</strong> that generates a Short every day and publishes to YouTube + TikTok</li>
            <li>A <strong>brand asset pipeline</strong> that creates turnaround sheets, animates them, and saves to your library</li>
            <li>A <strong>multi-platform social</strong> flow that creates carousels, LinkedIn posts, and paid ads from a single topic</li>
            <li>A <strong>research-to-production</strong> pipeline that turns a topic into a fully captioned, published video</li>
          </ul>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 2. GETTING STARTED */}
      {/* ================================================================ */}

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
              <li><strong>Left Panel — Node Palette</strong>: Draggable list of all 33 node types, organized by 7 categories. Use the search bar to filter.</li>
              <li><strong>Center — Canvas</strong>: The React Flow workspace where you place and wire nodes. Scroll to zoom, drag to pan.</li>
              <li><strong>Right Panel — Info Strip</strong>: A slim panel (240px) that shows the selected node's name, category, ports, error mode, a count of configured settings, and a "Double-click to configure" hint. During execution, this panel shows the live execution log.</li>
            </ul>
            <CanvasMockup />
          </Step>

          <Step number="4" title="Add Nodes to the Canvas">
            <p>
              <strong>Drag</strong> a node type from the left palette and <strong>drop</strong> it onto the canvas.
              The node appears where you drop it. Add as many as you need.
            </p>
            <Tip>Start with a simple 2-node flow: drag "Imagineer Generate" and then "Save to Library" onto the canvas.</Tip>
          </Step>

          <Step number="5" title="Configure a Node — Double-Click">
            <p>
              <strong>Double-click any node</strong> on the canvas to open the full configuration panel. This opens a
              slide-over modal with every setting for that tool — the same rich interface you'd see in the standalone tool.
            </p>
            <p className="mt-1">
              The right-side info strip also shows a summary: node name, category badge, port list, error mode,
              and a count of how many settings are configured (e.g., "4 settings configured"). But the real configuration
              happens in the double-click modal.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Text fields</strong> — type values like prompts, titles, URLs</li>
              <li><strong>Model grids</strong> — select from available AI models shown as cards</li>
              <li><strong>StyleGrids</strong> — browse and pick from 123 visual styles</li>
              <li><strong>Dropdowns, sliders, toggles</strong> — model-specific settings</li>
              <li><strong>Brand Guide & LoRA</strong> — select from your configured brand kits and trained LoRAs</li>
              <li><strong>Error Handling</strong> — always shown at the bottom (Stop / Skip / Retry)</li>
            </ul>
            <p className="mt-2">
              Click <strong>Save Configuration</strong> (teal button at the bottom) to save and close the modal.
              Each node instance stores independent configuration — two "Imagineer Generate" nodes can have
              completely different models, styles, and settings.
            </p>
            <Tip>If an input port has an incoming connection from another node, the corresponding text field in the config modal is replaced with a teal "Connected via [port] input port" banner — you don't need to fill it manually.</Tip>
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
              Click the <strong>Run Flow</strong> button in the top toolbar. The flow saves first, then execution begins:
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

      {/* ================================================================ */}
      {/* 3. THE FLOW BUILDER — DETAILED WALKTHROUGH */}
      {/* ================================================================ */}

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
          <p>All 33 node types organized into 7 categories:</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> <strong>Input</strong> (2) — starting points that provide data (Manual Input, Image Search)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-violet-500" /> <strong>Image</strong> (6) — generate, edit, turnaround, smoosh, upscale, 3D</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-blue-500" /> <strong>Video</strong> (4) — animate, motion transfer, extend, restyle</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-pink-500" /> <strong>Audio</strong> (3) — voiceover, music, captions</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-500" /> <strong>Content</strong> (8) — script, prompt builder, carousel, shorts, storyboard, ads, linkedin, text transform</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-sky-500" /> <strong>Publish</strong> (5) — YouTube, TikTok, Instagram, Facebook, Save to Library</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-500" /> <strong>Utility</strong> (5) — delay, conditional, video trim, extract frame, image search</div>
          </div>
          <p className="mt-2">Use the <strong>search bar</strong> at the top to filter nodes by name or description. Each node in the palette shows its name, category color dot, and a brief one-line description.</p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.3 Canvas (Center)</h4>
          <p>The main workspace where you build your flow:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Zoom</strong> — scroll wheel or pinch on trackpad</li>
            <li><strong>Pan</strong> — click and drag on empty canvas space</li>
            <li><strong>Select node</strong> — single click on it (shows info in right panel)</li>
            <li><strong>Configure node</strong> — double-click on it (opens full config modal)</li>
            <li><strong>Move node</strong> — click and drag a node to reposition</li>
            <li><strong>Delete connection</strong> — click the edge, then press Delete/Backspace</li>
            <li><strong>Delete node</strong> — select the node, then press Delete/Backspace</li>
            <li><strong>Multi-select</strong> — click and drag an empty area to create a selection box</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.4 What a Node Looks Like on the Canvas</h4>
          <p>Each node on the canvas displays:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>An <strong>emoji icon</strong> and the <strong>node type name</strong> in the header</li>
            <li>A <strong>category badge</strong> (colored: Image, Video, Audio, etc.)</li>
            <li><strong>Input ports</strong> as small colored circles on the left edge (indigo for inputs)</li>
            <li><strong>Output ports</strong> as small colored circles on the right edge (emerald for outputs)</li>
            <li><strong>Status overlays</strong> during execution: idle (no border), running (blue + spinner), completed (green + checkmark + time), failed (red + X)</li>
          </ul>
          <NodeMockup />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.5 Info Strip (Right Panel)</h4>
          <p>When you <strong>single-click a node</strong> on the canvas, the right-side info strip (240px wide) shows:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Node type name</strong> with the category badge</li>
            <li><strong>Category</strong> label</li>
            <li><strong>Input ports</strong> — listed with types (e.g., "prompt (string)")</li>
            <li><strong>Output ports</strong> — listed with types (e.g., "image_url (image)")</li>
            <li><strong>Error Handling Mode</strong> — current mode (Stop, Skip, or Retry)</li>
            <li><strong>Settings count</strong> — "X settings configured" showing how many config values have been set</li>
            <li><strong>"Double-click to configure"</strong> hint — a teal-bordered prompt reminding you to double-click for full config</li>
          </ul>
          <p className="mt-2">
            If no node is selected, the panel shows "Select a node to view info" with a brief help message.
            The info strip is intentionally slim — it gives you a quick summary at a glance. The full
            configuration interface lives in the double-click config modal (see Section 4).
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">3.6 Execution Log (Right Panel — During Execution)</h4>
          <p>When a flow is running, the right panel switches from the info strip to the Execution Log:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Each executed step is shown with a <strong>timestamp</strong> and <strong>elapsed time</strong></li>
            <li><span className="text-green-500 font-medium">Green</span> = completed, <span className="text-red-500 font-medium">Red</span> = failed, <span className="text-gray-500 font-medium">Gray</span> = pending</li>
            <li>Failed steps show the error message inline</li>
            <li>The log updates in real-time (polls every 2 seconds)</li>
          </ul>

          <Tip>
            Every change you make in the config modal is saved when you click "Save Configuration". The flow
            itself auto-saves 1.5 seconds after any structural change (adding nodes, wiring connections, moving nodes).
          </Tip>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 4. THE CONFIG MODAL — FULL TOOL CONFIGURATION */}
      {/* ================================================================ */}

      <Section icon={MousePointerClick} title="4. The Config Modal — Full Tool Configuration">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-4 mt-3">

          <p>
            The config modal is where you do all the real configuration work. <strong>Double-click any node</strong> on
            the canvas to open a full-width slide-over panel that contains every setting for that tool type.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">4.1 How It Works</h4>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Double-click</strong> a node on the canvas to open the config modal</li>
            <li>The modal slides in from the right as a full-height panel, matching the main site's white/light theme</li>
            <li>Each node type has a <strong>dedicated configuration form</strong> that mirrors the interface of the real tool</li>
            <li>An "Imagineer Generate" node shows the same model grid, StyleGrid, lighting pills, and brand guide picker you see in the standalone Imagineer tool</li>
            <li>Fill in your settings, then click the <strong>Save Configuration</strong> button (teal, at the bottom) to save and close</li>
            <li>Each node instance stores <strong>independent configuration</strong> — you can have two Imagineer nodes with completely different models and styles</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">4.2 Visual Mockup — Config Modal</h4>
          <p>Here's what the config modal looks like for an Imagineer Generate node:</p>
          <ConfigModalMockup />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">4.3 Wired Port Detection</h4>
          <p>
            When an input port has an incoming connection from another node, the corresponding text field in the
            config modal is <strong>automatically replaced</strong> with a teal banner that reads:
          </p>
          <div className="mt-2 px-3 py-2 bg-[#2C666E]/10 border border-[#2C666E]/30 rounded-lg flex items-center gap-2 text-xs">
            <Link2 className="w-4 h-4 text-[#2C666E] dark:text-teal-300" />
            <span className="text-[#2C666E] dark:text-teal-300 font-medium">Connected via "prompt" input port</span>
            <span className="text-gray-400 ml-auto">from Manual Input #1</span>
          </div>
          <p className="mt-2">
            This tells you that the value will come from the upstream node at runtime — you don't need to type
            anything for that field. Only unconnected ports show editable text fields.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">4.4 Config by Node Category</h4>
          <p>Each node category has different configuration sections in the modal. Here's what to expect:</p>

          {/* Image nodes config */}
          <div className="mt-3 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
            <h5 className="font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-violet-500" /> Image Nodes (Imagineer Generate, Imagineer Edit, Turnaround Sheet, etc.)
            </h5>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-violet-800 dark:text-violet-200">
              <li><strong>Prompt</strong> — multi-line text area for the generation prompt</li>
              <li><strong>Model</strong> — grid of 9 model cards (Nano Banana 2, Flux 2, SeedDream v4.5, Imagen 4, Kling Image v3, Grok Imagine, Ideogram v2, Wavespeed, Flux LoRA). Selected model is highlighted teal.</li>
              <li><strong>Visual Style (StyleGrid)</strong> — browse 123 visual styles as thumbnail cards (Cinematic, Anime, Watercolor, Photographic, 3D Render, etc.). Scrollable grid.</li>
              <li><strong>Aspect Ratio</strong> — button group (16:9, 9:16, 1:1, 4:5, 3:2)</li>
              <li><strong>Lighting</strong> — pill selectors (Golden Hour, Studio, Neon, Natural, Dramatic, etc.)</li>
              <li><strong>Camera Angle</strong> — pill selectors (Wide, Close-up, Bird Eye, Low Angle, Dutch Angle, etc.)</li>
              <li><strong>Mood</strong> — pill selectors (Ethereal, Dark, Vibrant, Serene, etc.)</li>
              <li><strong>Color Palette</strong> — swatch selectors for dominant color tones</li>
              <li><strong>Brand Guide</strong> — dropdown to select a configured brand kit (logo, colors, guidelines)</li>
              <li><strong>LoRA</strong> — multi-select picker for trained LoRA models (subject or style)</li>
              <li><strong>Negative Prompt</strong> — text field for things to avoid</li>
              <li><strong>Advanced</strong> — collapsible section with seed, guidance scale</li>
            </ul>
          </div>

          {/* Video nodes config */}
          <div className="mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-500" /> Video Nodes (JumpStart Animate, Video Extend, Video Restyle, Motion Transfer)
            </h5>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <li><strong>Prompt</strong> — motion/scene description for the animation</li>
              <li><strong>Model</strong> — grid of 13 video model cards (Kling 2.0 Master, Kling V3 Pro, Kling O3 Pro, Veo 2, Veo 3.1, Veo 3.1 Lite, Wan 2.5, Wan Pro, PixVerse v4.5, PixVerse V6, Hailuo/MiniMax, Grok Video, Wavespeed WAN)</li>
              <li><strong>Duration</strong> — selector appropriate to the model (4s/6s/8s for Veo, 5/10 for Kling/Wan, etc.)</li>
              <li><strong>Audio Toggle</strong> — shown only for models that support it: Kling v3, Kling O3, Veo 3.1, Veo 3.1 Lite, Grok R2V, PixVerse V6 (<code>generate_audio_switch</code>). Off by default for flow clips.</li>
              <li><strong>Visual Style</strong> — StyleGrid for cinematography direction</li>
              <li><strong>Brand Guide</strong> — dropdown to select brand kit</li>
            </ul>
          </div>

          {/* Audio nodes config */}
          <div className="mt-3 px-4 py-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
            <h5 className="font-semibold text-pink-700 dark:text-pink-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-pink-500" /> Audio Nodes (Voiceover, Music, Captions)
            </h5>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-pink-800 dark:text-pink-200">
              <li><strong>Voiceover</strong> — 30 Gemini TTS voice cards (5 featured prominently, 25 in a collapsible "More voices" section). Each card shows the voice name and a personality tag. Speed slider (0.8x - 1.5x, default 1.15x). Style instructions text field for performance direction ("Speak with warmth and authority").</li>
              <li><strong>Captions</strong> — 8 caption style previews as visual cards: word_pop, karaoke_glow, word_highlight, news_ticker, and 4 more. Each preview shows a mockup of how the text appears. Font, size, color, stroke, and position overrides in an advanced section.</li>
              <li><strong>Music</strong> — mood text field (or connected from upstream), duration selector (15s, 30s, 60s). Always generates instrumental tracks — no lyrics.</li>
            </ul>
          </div>

          {/* Content nodes config */}
          <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h5 className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-amber-500" /> Content Nodes (Shorts Create, Storyboard Create, Carousel Create, Ads Generate, etc.)
            </h5>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
              <li><strong>Shorts Create</strong> — full wizard config: niche selector (20 niches), topic, duration (30/60/90s), tone, voice (Gemini TTS, 30 voices), voice speed, image model, video model, visual style (StyleGrid), caption style, music mood, brand guide, LoRA. This is the most comprehensive config modal.</li>
              <li><strong>Storyboard Create</strong> — name, brief/description, duration, tone, mood, image model, video model, visual style, brand guide, LoRA, characters</li>
              <li><strong>Carousel Create</strong> — platform selector (LinkedIn, Instagram, Facebook, TikTok), topic, carousel style (8 templates), visual style (StyleGrid), brand guide</li>
              <li><strong>Ads Generate</strong> — multi-platform selector, objective (traffic/conversions/awareness/leads), product description, target audience, landing URL, visual style, brand guide</li>
              <li><strong>LinkedIn Post</strong> — topic or URL, writing style, brand guide, image layout, visual style</li>
              <li><strong>Script Generator</strong> — topic, niche, target duration</li>
              <li><strong>Prompt Builder</strong> — description, style, props inputs (typically wired from upstream)</li>
              <li><strong>Text Transform</strong> — input text, transformation type (summarize, expand, rephrase, translate, etc.)</li>
            </ul>
          </div>

          {/* Publish nodes config */}
          <div className="mt-3 px-4 py-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
            <h5 className="font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-sky-500" /> Publish Nodes (YouTube, TikTok, Instagram, Facebook, Save to Library)
            </h5>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-sky-800 dark:text-sky-200">
              <li><strong>Account connection status</strong> — a green "Connected" or red "Not Connected" badge at the top, showing whether you've authorized the platform in Settings → Connected Accounts</li>
              <li><strong>Platform-specific fields</strong> — YouTube: title, description, tags, privacy (public/unlisted/private). TikTok: caption. Instagram: caption. Facebook: text, page selection.</li>
              <li><strong>Save to Library</strong> — name/label for the saved asset, optional tags</li>
            </ul>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">4.5 Error Handling (Bottom of Every Modal)</h4>
          <p>
            Every config modal has an <strong>Error Handling</strong> section at the bottom, regardless of node type.
            This is where you set what happens if this node fails during execution:
          </p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 text-center">
              <p className="font-medium text-red-700 dark:text-red-300 text-xs">Stop</p>
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">Halt entire pipeline</p>
            </div>
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
              <p className="font-medium text-amber-700 dark:text-amber-300 text-xs">Skip</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Continue past failure</p>
            </div>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
              <p className="font-medium text-blue-700 dark:text-blue-300 text-xs">Retry</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Try up to 3 times</p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">4.6 Save Configuration</h4>
          <p>
            At the very bottom of the modal, below Error Handling, is the <strong>Save Configuration</strong> button
            — a full-width teal (#2C666E) button. Clicking it saves all the settings to this specific node instance
            and closes the modal. The info strip on the right will update its "X settings configured" count.
          </p>

          <Warning>
            Configuration is saved per node instance. If you delete a node and add a new one of the same type,
            you'll need to configure it from scratch. Use templates to avoid repetitive setup.
          </Warning>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 5. CONNECTIONS & PORT TYPES */}
      {/* ================================================================ */}

      <Section icon={Link2} title="5. Connections & Port Types">
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

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">How Connections Affect the Config Modal</h4>
          <p>
            When you wire a connection into a node's input port, the config modal for that node reflects it.
            The corresponding field is replaced with a teal "Connected" banner showing the source node and port name.
            This makes it clear which values are coming from upstream versus configured manually.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">How to Delete a Connection</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Click the connection line (edge) on the canvas</li>
            <li>Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Delete</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Backspace</kbd></li>
          </ol>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 6. FLOWS LIST DASHBOARD */}
      {/* ================================================================ */}

      <Section icon={LayoutGrid} title="6. Flows Dashboard">
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

      {/* ================================================================ */}
      {/* 7. EXECUTION ENGINE */}
      {/* ================================================================ */}

      <Section icon={Zap} title="7. Execution — How Flows Run">
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
            the URL flows automatically. The config modal for JumpStart would show "Connected via image input port" for that field.
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

      {/* ================================================================ */}
      {/* 8. SCHEDULING */}
      {/* ================================================================ */}

      <Section icon={Clock} title="8. Scheduling Flows">
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

      {/* ================================================================ */}
      {/* 9. NODE REFERENCE (ALL 33 NODES) */}
      {/* ================================================================ */}

      <Section icon={CircleDot} title="9. Node Reference — All 33 Node Types">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <p>
            Click any node below to expand its full documentation — inputs, outputs, configuration fields, and usage notes.
            All 33 nodes are organized by their 7 categories.
          </p>

          {/* ── INPUT ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Input Nodes (2)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#128229;" name="Manual Input" id="manual-input" category="Input"
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

            <NodeCard
              emoji="&#128269;" name="Image Search" id="image-search" category="Input"
              description="Searches for images using SERP/Google CSE and returns image URLs. Useful as a starting point when you need reference images or stock imagery from the web."
              inputs={[
                { name: 'query', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'image_url', type: 'image' },
                { name: 'results', type: 'json' },
              ]}
              config={[
                { name: 'count', defaultVal: '1', note: 'Number of results to return' },
                { name: 'safe_search', options: ['on', 'off'], defaultVal: 'on' },
              ]}
            >
              <Tip>Wire a Manual Input with a search query into this node to find reference images, then pipe the result into Imagineer Edit or Smoosh.</Tip>
            </NodeCard>
          </div>

          {/* ── IMAGE ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-violet-500" /> Image Nodes (6)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#127912;" name="Imagineer Generate" id="imagineer-generate" category="Image"
              description="Generates images from text prompts using AI. This is your primary image creation node. Double-click to access the full config: 9 models, 123 visual styles via StyleGrid, aspect ratio, lighting, camera angle, mood, brand guide, LoRA, and negative prompt."
              inputs={[
                { name: 'prompt', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4.5', 'imagen-4', 'kling-image-v3', 'grok-imagine', 'ideogram-v2', 'wavespeed', 'flux-lora'], defaultVal: 'nano-banana-2', note: '9 models available. Nano Banana 2 is fastest, SeedDream v4.5 is highest quality.' },
                { name: 'aspect_ratio', options: ['16:9', '9:16', '1:1', '4:5', '3:2'], defaultVal: '16:9' },
                { name: 'visual_style', note: 'One of 123 visual styles from the StyleGrid (Cinematic, Anime, Watercolor, etc.)' },
                { name: 'lighting', note: 'Optional: Golden Hour, Studio, Neon, Natural, Dramatic, etc.' },
                { name: 'camera_angle', note: 'Optional: Wide, Close-up, Bird Eye, Low Angle, etc.' },
                { name: 'brand_guide', note: 'Optional: Select a configured brand kit' },
                { name: 'lora', note: 'Optional: Select one or more trained LoRA models' },
                { name: 'negative_prompt', note: 'Things to avoid in generation (blurry, watermark, etc.)' },
              ]}
            />

            <NodeCard
              emoji="&#9999;" name="Imagineer Edit" id="imagineer-edit" category="Image"
              description="Edits an existing image using text instructions. Feed in an image and a prompt describing what to change. Supports multi-image composition — blend a character into a scene backdrop. Double-click to configure model, style, and editing parameters."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'prompt', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'seeddream-v4', 'wavespeed-nano-ultra', 'qwen-image-edit'], defaultVal: 'nano-banana-2', note: 'Nano Banana 2 and Wavespeed Nano Ultra support multi-image composition' },
              ]}
            />

            <NodeCard
              emoji="&#127912;" name="Turnaround Sheet" id="turnaround-sheet" category="Image"
              description="Creates multi-angle character reference sheets. 8 pose set presets from 4-cell 3D-optimized grids to full 24-cell standard sheets. Great for establishing consistent character design before generating videos."
              inputs={[
                { name: 'prompt', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'model', options: ['nano-banana-2', 'fal-flux', 'seeddream-v4'], defaultVal: 'nano-banana-2' },
                { name: 'pose_set', options: ['standard-24', '3d-angles', '3d-action', 'r2v-reference', 'expressions-focus', 'action-heavy', 'fashion-outfit', 'creature-non-human'], defaultVal: 'standard-24', note: '8 pose set presets. 3D sets are 2x2 (4 cells, 6x more pixels per cell). R2V is 3x2 (6 cells). Standard is 4x6 (24 cells).' },
                { name: 'background_mode', options: ['white', 'gray', 'scene'], defaultVal: 'white', note: 'Use "scene" for R2V references — Veo 3.1 R2V fails on white backgrounds' },
              ]}
            />

            <NodeCard
              emoji="&#128256;" name="Smoosh" id="smoosh" category="Image"
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
              emoji="&#128396;" name="Upscale Image" id="upscale-image" category="Image"
              description="Upscales an image to 2x resolution using Topaz AI (Standard V2). Good for improving quality before publishing, animating, or using as a reference."
              inputs={[
                { name: 'image', type: 'image', required: true },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[]}
            />

            <NodeCard
              emoji="&#128230;" name="3D Viewer" id="3d-viewer" category="Image"
              description="Converts a front-facing image into a 3D GLB model using Hunyuan 3D Pro. The output is a 3D model URL stored in Supabase. Supports up to 7 optional additional angle images for higher quality."
              inputs={[
                { name: 'image', type: 'image', required: true },
              ]}
              outputs={[
                { name: 'model_url', type: 'string' },
              ]}
              config={[]}
            >
              <Tip>Cell images are automatically upscaled via Topaz before submission for better 3D quality.</Tip>
            </NodeCard>
          </div>

          {/* ── VIDEO ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-blue-500" /> Video Nodes (4)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#127916;" name="JumpStart Animate" id="jumpstart-animate" category="Video"
              description="Converts a static image into an animated video. The primary image-to-video node — give it an image and an optional motion prompt. Supports 13 video models including Veo 3.1, Kling V3/O3, PixVerse V6, and more. Double-click to configure model, duration, audio toggle, and style."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'prompt', type: 'string', required: false },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'model', options: ['kling-2.0-master', 'kling-v3-pro', 'kling-o3-pro', 'veo-2', 'veo-3.1', 'veo-3.1-lite', 'wan-2.5', 'wan-pro', 'pixverse-v4.5', 'pixverse-v6', 'hailuo', 'grok-video', 'wavespeed-wan'], defaultVal: 'kling-2.0-master', note: '13 video models. Kling 2.0 is the default all-rounder. Veo 3.1 is highest quality.' },
                { name: 'duration', note: 'Model-dependent: Veo accepts 4s/6s/8s, Kling/Wan use 5/10, some models have fixed duration' },
                { name: 'generate_audio', options: ['true', 'false'], defaultVal: 'false', note: 'Only for Kling v3/O3, Veo 3.1/Lite, Grok R2V, PixVerse V6. Off by default for flow clips.' },
              ]}
            />

            <NodeCard
              emoji="&#127939;" name="Motion Transfer" id="motion-transfer" category="Video"
              description="Transfers motion from a source video onto a reference image. The character in the image inherits the movements from the video."
              inputs={[
                { name: 'video', type: 'video', required: true },
                { name: 'reference_image', type: 'image', required: true },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[]}
            >
              <Tip>Great for applying dance moves or actions from a real video to an AI-generated character.</Tip>
            </NodeCard>

            <NodeCard
              emoji="&#128260;" name="Video Extend" id="video-extend" category="Video"
              description="Extends an existing video clip by generating additional seconds. Supports Seedance 1.5 Pro (4-12s via Wavespeed), Veo 3.1 Fast Extend (fixed 7s via FAL), and Grok Imagine Extend (2-10s, returns original + extension stitched)."
              inputs={[
                { name: 'video', type: 'video', required: true },
                { name: 'prompt', type: 'string', required: false },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'model', options: ['seedance-1.5-pro', 'veo-3.1-fast-extend', 'grok-imagine-extend'], defaultVal: 'seedance-1.5-pro' },
                { name: 'duration', note: 'Extension duration in seconds (model-dependent)' },
              ]}
            >
              <Warning>Grok Imagine Extend requires input video to be MP4 (H.264/H.265/AV1), 2-15 seconds long. It returns the original + extension stitched together, not just the extension.</Warning>
            </NodeCard>

            <NodeCard
              emoji="&#128260;" name="Video Restyle" id="video-restyle" category="Video"
              description="Applies a new visual style to an existing video while preserving the original motion and composition. Uses Kling O3 V2V for video-to-video restyle/refinement."
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
            <span className="w-3 h-3 rounded-sm bg-pink-500" /> Audio Nodes (3)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#127897;" name="Voiceover" id="voiceover" category="Audio"
              description="Converts text to speech using Gemini TTS. 30 available voices with personality tags. Double-click to browse voice cards (5 featured + 25 in collapsible section), set speed, and add style instructions for performance direction."
              inputs={[
                { name: 'text', type: 'string', required: true },
              ]}
              outputs={[{ name: 'audio_url', type: 'audio' }]}
              config={[
                { name: 'voice', options: ['Kore', 'Charon', 'Fenrir', 'Aoede', 'Puck', '+ 25 more'], defaultVal: 'Kore', note: '30 Gemini TTS voices. Kore = female authoritative, Charon = male deep, Puck = male energetic.' },
                { name: 'speed', defaultVal: '1.15', note: 'Speed slider from 0.8x to 1.5x. 1.15x is the recommended default for engaging content.' },
                { name: 'style_instructions', note: 'Performance direction: "Speak with warmth and authority" or "Energetic and playful tone"' },
              ]}
            />

            <NodeCard
              emoji="&#127925;" name="Music" id="music" category="Audio"
              description="Generates instrumental background music via ElevenLabs Music through the FAL proxy. Always produces instrumental tracks (no vocals/lyrics). Connect a mood description for genre control."
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
              emoji="&#128172;" name="Captions" id="captions" category="Audio"
              description="Burns auto-generated captions/subtitles onto a video using speech recognition. Double-click to browse 8 caption style previews as visual cards, plus advanced font, size, color, stroke, and position overrides."
              inputs={[
                { name: 'video', type: 'video', required: true },
              ]}
              outputs={[{ name: 'video_url', type: 'video' }]}
              config={[
                { name: 'style', options: ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker', '+ 4 more'], defaultVal: 'word_pop', note: 'Caption animation style — each shown as a visual preview card in the config modal' },
              ]}
            >
              <Tip><strong>word_pop</strong> = words appear one at a time with scale animation. <strong>karaoke_glow</strong> = words highlight as spoken. <strong>news_ticker</strong> = scrolling lower-third.</Tip>
            </NodeCard>
          </div>

          {/* ── CONTENT ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-amber-500" /> Content Nodes (8)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#128221;" name="Script Generator" id="script-generator" category="Content"
              description="Generates a structured video script using GPT-4.1-mini. Outputs a JSON script with narration segments, overlay text, and scene labels. No visual prompts — words only."
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
              emoji="&#128295;" name="Prompt Builder" id="prompt-builder" category="Content"
              description="Assembles structured creative inputs into a single optimized generation prompt using GPT. Accepts description, style, props, negative prompt, brand guide, lighting, camera angle, mood, and more."
              inputs={[
                { name: 'description', type: 'string', required: true },
                { name: 'style', type: 'string', required: false },
                { name: 'props', type: 'string', required: false },
              ]}
              outputs={[{ name: 'prompt', type: 'string' }]}
              config={[]}
            >
              <Tip>Chain this before Imagineer Generate for better results: description + style → Prompt Builder → Imagineer. The Prompt Builder uses GPT to create a cohesive, optimized prompt.</Tip>
            </NodeCard>

            <NodeCard
              emoji="&#127904;" name="Carousel Create" id="carousel-create" category="Content"
              description="Creates a branded carousel post with AI-generated slides. Auto-triggers 2-stage GPT content pipeline (research synthesis → slide writing), then generates images and composes slides via Satori."
              inputs={[
                { name: 'topic', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'carousel_id', type: 'string' },
                { name: 'slides', type: 'json' },
              ]}
              config={[
                { name: 'platform', options: ['linkedin', 'instagram', 'facebook', 'tiktok'], defaultVal: 'linkedin', note: 'Each platform gets optimized aspect ratio and content density' },
                { name: 'style', note: 'One of 8 carousel style templates (text layout, scrim, typography)' },
                { name: 'visual_style', note: 'Visual style from StyleGrid for background image generation' },
                { name: 'brand_guide', note: 'Optional: brand kit for colors, logo, font' },
              ]}
            />

            <NodeCard
              emoji="&#127909;" name="Shorts Create" id="shorts-create" category="Content"
              description="Creates a complete Short (vertical video) end-to-end. This is the most comprehensive node — it runs the full Shorts pipeline: script, voiceover, timing, images, video clips, music, assembly, and captioning. Double-click to configure the full wizard."
              inputs={[
                { name: 'topic', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'video_url', type: 'video' },
                { name: 'draft_id', type: 'string' },
              ]}
              config={[
                { name: 'niche', note: 'One of 20 niches (AI/Tech, Paranormal, Fitness, Cooking, etc.)' },
                { name: 'duration', options: ['30', '60', '90'], defaultVal: '60' },
                { name: 'tone', note: 'Script tone — informative, dramatic, humorous, etc.' },
                { name: 'voice', note: 'Gemini TTS voice (30 options)' },
                { name: 'voice_speed', defaultVal: '1.15' },
                { name: 'image_model', note: 'Model for keyframe generation' },
                { name: 'video_model', note: 'Model for scene animation (FLF or I2V mode auto-selected)' },
                { name: 'visual_style', note: 'StyleGrid selection for image generation' },
                { name: 'caption_style', options: ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker'], defaultVal: 'word_pop' },
                { name: 'music_mood', note: 'Mood for instrumental background music generation' },
                { name: 'brand_guide', note: 'Optional: brand kit' },
                { name: 'lora', note: 'Optional: trained LoRA models' },
              ]}
            >
              <Tip>This is the most powerful single node — it runs the entire Shorts Workbench pipeline in one step. Schedule this daily with a topic input for automated content creation.</Tip>
            </NodeCard>

            <NodeCard
              emoji="&#127916;" name="Storyboard Create" id="storyboard-create" category="Content"
              description="Creates a new storyboard project with AI-generated script, scene breakdown, and preview images. Uses the 2-stage narrative + visual director pipeline."
              inputs={[
                { name: 'brief', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'storyboard_id', type: 'string' },
                { name: 'frames', type: 'json' },
              ]}
              config={[
                { name: 'name', note: 'Storyboard project name' },
                { name: 'duration', note: 'Target video duration' },
                { name: 'tone', note: 'Narrative tone' },
                { name: 'mood', note: 'Visual mood direction' },
                { name: 'image_model', note: 'Model for preview image generation' },
                { name: 'video_model', note: 'Model for production video generation' },
                { name: 'visual_style', note: 'StyleGrid selection' },
                { name: 'brand_guide', note: 'Optional: brand kit' },
                { name: 'lora', note: 'Optional: trained LoRA models' },
                { name: 'characters', note: 'Optional: character descriptions for consistency' },
              ]}
            />

            <NodeCard
              emoji="&#128202;" name="Ads Generate" id="ads-generate" category="Content"
              description="Generates multi-platform paid ad creative (copy + images). Creates platform-specific variations: LinkedIn (introText, headline, description), Google RSA (15 headlines + 4 descriptions), Meta (primaryText, headline, description)."
              inputs={[
                { name: 'product_description', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'campaign_id', type: 'string' },
                { name: 'variations', type: 'json' },
              ]}
              config={[
                { name: 'platforms', note: 'Multi-select: LinkedIn, Google, Meta' },
                { name: 'objective', options: ['traffic', 'conversions', 'awareness', 'leads'], defaultVal: 'traffic' },
                { name: 'target_audience', note: 'Target audience description' },
                { name: 'landing_url', note: 'Landing page URL' },
                { name: 'visual_style', note: 'StyleGrid selection for ad images' },
                { name: 'brand_guide', note: 'Optional: brand kit for logo and brand context' },
              ]}
            />

            <NodeCard
              emoji="&#128101;" name="LinkedIn Post" id="linkedin-post" category="Content"
              description="Creates a LinkedIn post with AI-generated text and a branded image. Uses GPT-4.1 to generate 3 variations, selects the best one. Image composed via Satori with branded 1080x1080 layout."
              inputs={[
                { name: 'topic', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'post_id', type: 'string' },
                { name: 'content', type: 'json' },
              ]}
              config={[
                { name: 'writing_style', note: 'Writing style direction for post generation' },
                { name: 'brand_guide', note: 'Optional: brand kit' },
                { name: 'image_layout', note: 'Image layout template' },
                { name: 'visual_style', note: 'StyleGrid selection for image background' },
              ]}
            />

            <NodeCard
              emoji="&#128295;" name="Text Transform" id="text-transform" category="Content"
              description="Transforms input text using AI — summarize, expand, rephrase, translate, or apply custom instructions. Useful as a utility step between content generation and publishing."
              inputs={[
                { name: 'text', type: 'string', required: true },
              ]}
              outputs={[{ name: 'result', type: 'string' }]}
              config={[
                { name: 'transformation', options: ['summarize', 'expand', 'rephrase', 'translate', 'custom'], defaultVal: 'summarize', note: 'Type of transformation to apply' },
                { name: 'instructions', note: 'Custom instructions (required for "custom" mode, optional for others)' },
                { name: 'target_language', note: 'Target language for "translate" mode' },
              ]}
            />
          </div>

          {/* ── PUBLISH ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-sky-500" /> Publish Nodes (5)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#128250;" name="YouTube Upload" id="youtube-upload" category="Publish"
              description="Uploads a video to YouTube via resumable upload. Auto-detects Shorts (vertical < 60s) and appends #Shorts tag. Sets containsSyntheticMedia: true on all uploads. Double-click to see connection status and configure title, description, privacy."
              inputs={[
                { name: 'video', type: 'video', required: true },
                { name: 'title', type: 'string', required: true },
                { name: 'description', type: 'string', required: false },
              ]}
              outputs={[{ name: 'video_id', type: 'string' }]}
              config={[
                { name: 'privacy', options: ['public', 'unlisted', 'private'], defaultVal: 'private', note: 'Upload as private first, then publish manually for safety' },
                { name: 'tags', note: 'Optional: comma-separated tags' },
              ]}
            >
              <Warning>You must connect YouTube in Settings → Connected Accounts before using this node. The config modal shows a green/red connection status badge at the top.</Warning>
            </NodeCard>

            <NodeCard
              emoji="&#127925;" name="TikTok Publish" id="tiktok-publish" category="Publish"
              description="Publishes videos or images to TikTok. Requires TikTok OAuth connection. Supports both video and photo carousel posting."
              inputs={[
                { name: 'video', type: 'video', required: false },
                { name: 'image', type: 'image', required: false },
                { name: 'caption', type: 'string', required: false },
              ]}
              outputs={[{ name: 'post_id', type: 'string' }]}
              config={[]}
            />

            <NodeCard
              emoji="&#128248;" name="Instagram Post" id="instagram-post" category="Publish"
              description="Posts images to Instagram with a caption. Requires Meta OAuth connection (covers both Instagram and Facebook). Supports single image and carousel container posting."
              inputs={[
                { name: 'image', type: 'image', required: true },
                { name: 'caption', type: 'string', required: false },
              ]}
              outputs={[{ name: 'post_id', type: 'string' }]}
              config={[]}
            />

            <NodeCard
              emoji="&#128100;" name="Facebook Post" id="facebook-post" category="Publish"
              description="Creates posts on your Facebook page with text and optional media. Requires Meta OAuth connection."
              inputs={[
                { name: 'image', type: 'image', required: false },
                { name: 'text', type: 'string', required: true },
              ]}
              outputs={[{ name: 'post_id', type: 'string' }]}
              config={[]}
            />

            <NodeCard
              emoji="&#128190;" name="Save to Library" id="save-to-library" category="Publish"
              description="Saves any media URL to your Stitch library for permanent storage in Supabase. FAL CDN URLs expire within hours — always use this node to persist generated content."
              inputs={[
                { name: 'url', type: 'string', required: true },
                { name: 'name', type: 'string', required: false },
              ]}
              outputs={[{ name: 'saved_url', type: 'string' }]}
              config={[
                { name: 'tags', note: 'Optional: tags to assign to the saved asset' },
              ]}
            >
              <Warning>AI-generated URLs from FAL expire within hours. Always end your flow with a Save to Library node if you want to keep the output.</Warning>
            </NodeCard>
          </div>

          {/* ── UTILITY ── */}
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gray-500" /> Utility Nodes (5)
          </h4>

          <div className="space-y-2">
            <NodeCard
              emoji="&#9203;" name="Delay" id="delay" category="Utility"
              description="Pauses execution for a specified duration before passing data through to downstream nodes. Useful for rate-limiting or waiting for external processes."
              inputs={[
                { name: 'input', type: 'string', required: false },
              ]}
              outputs={[{ name: 'output', type: 'string' }]}
              config={[
                { name: 'seconds', defaultVal: '5', note: 'How long to wait (in seconds) before passing data through' },
              ]}
            >
              <Tip>Use between API-heavy nodes to avoid rate limiting. A 5-10 second delay between Imagineer and JumpStart calls can prevent 429 errors.</Tip>
            </NodeCard>

            <NodeCard
              emoji="&#128256;" name="Conditional" id="conditional" category="Utility"
              description="Routes data to different downstream branches based on a condition. Evaluates a simple expression and outputs to the 'true' or 'false' output port."
              inputs={[
                { name: 'value', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'true_output', type: 'string' },
                { name: 'false_output', type: 'string' },
              ]}
              config={[
                { name: 'condition', options: ['contains', 'equals', 'not_empty', 'is_empty'], defaultVal: 'not_empty', note: 'How to evaluate the input value' },
                { name: 'compare_value', note: 'Value to compare against (for contains/equals conditions)' },
              ]}
            >
              <Tip>Use to build flows that handle success/failure cases differently. For example: if image generation returns a result, animate it; otherwise, skip to the next topic.</Tip>
            </NodeCard>

            <NodeCard
              emoji="&#9986;" name="Video Trim" id="video-trim" category="Utility"
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
              emoji="&#127748;" name="Extract Frame" id="extract-frame" category="Utility"
              description="Extracts a single frame from a video as an image. Useful for getting a thumbnail, a reference image for the next generation step, or a last frame for continuity."
              inputs={[
                { name: 'video', type: 'video', required: true },
              ]}
              outputs={[{ name: 'image_url', type: 'image' }]}
              config={[
                { name: 'frame_type', options: ['first', 'middle', 'last'], defaultVal: 'first', note: 'Which frame to extract. "last" is useful for scene continuity.' },
              ]}
            />

            <NodeCard
              emoji="&#128269;" name="Image Search" id="image-search-utility" category="Utility"
              description="Searches for images via SERP/Google CSE (same as the Input category version). Listed in both Input and Utility for convenience."
              inputs={[
                { name: 'query', type: 'string', required: true },
              ]}
              outputs={[
                { name: 'image_url', type: 'image' },
                { name: 'results', type: 'json' },
              ]}
              config={[
                { name: 'count', defaultVal: '1', note: 'Number of results to return' },
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 10. EXAMPLE FLOWS */}
      {/* ================================================================ */}

      <Section icon={Share2} title="10. Example Flows — Common Patterns">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-6 mt-3">

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 1: Simple Image → Video</h4>
          <PipelineDiagram
            title="Image → Video Pipeline"
            description="3 nodes, 3 connections. Takes a text prompt, generates an image, animates it, and saves permanently."
            steps={[
              { nodes: [
                { emoji: '&#128229;', name: 'Manual Input (prompt)', cat: 'Input' },
                { emoji: '&#127912;', name: 'Imagineer Generate', cat: 'Image' },
                { emoji: '&#127916;', name: 'JumpStart Animate', cat: 'Video' },
                { emoji: '&#128190;', name: 'Save to Library', cat: 'Publish' },
              ]},
            ]}
            notes="Simple linear pipeline. Good for your first flow. Takes ~40 seconds total (5s image + 30s video + 5s save)."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 2: Parallel Branches — Video with Voiceover</h4>
          <PipelineDiagram
            title="Parallel Branch Pipeline"
            description="Two independent branches run in parallel, saving time. Image generation and voiceover happen simultaneously."
            steps={[
              { label: 'Branch A — Visual', nodes: [
                { emoji: '&#128229;', name: 'Manual Input (prompt)', cat: 'Input' },
                { emoji: '&#127912;', name: 'Imagineer Generate', cat: 'Image' },
                { emoji: '&#127916;', name: 'JumpStart Animate', cat: 'Video' },
              ], parallel: true },
              { label: 'Branch B — Audio', nodes: [
                { emoji: '&#128229;', name: 'Manual Input (script)', cat: 'Input' },
                { emoji: '&#127897;', name: 'Voiceover', cat: 'Audio' },
              ], parallel: true },
              { label: 'Merge', nodes: [
                { emoji: '&#128190;', name: 'Save to Library', cat: 'Publish' },
              ]},
            ]}
            notes="Both branches start immediately since they're independent. The engine's 3-node concurrency pool handles them in parallel."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 3: Full Production Pipeline</h4>
          <PipelineDiagram
            title="Topic → Published Video"
            description="Complete production: topic research → script → parallel visuals + audio → captioned video → YouTube."
            steps={[
              { label: 'Step 1 — Script', nodes: [
                { emoji: '&#128229;', name: 'Manual Input (topic)', cat: 'Input' },
                { emoji: '&#128221;', name: 'Script Generator', cat: 'Content' },
              ]},
              { label: 'Step 2a — Visual Branch', nodes: [
                { emoji: '&#128295;', name: 'Prompt Builder', cat: 'Content' },
                { emoji: '&#127912;', name: 'Imagineer Generate', cat: 'Image' },
                { emoji: '&#127916;', name: 'JumpStart Animate', cat: 'Video' },
                { emoji: '&#128172;', name: 'Captions', cat: 'Audio' },
              ], parallel: true },
              { label: 'Step 2b — Audio Branch', nodes: [
                { emoji: '&#127897;', name: 'Voiceover', cat: 'Audio' },
              ], parallel: true },
              { label: 'Step 3 — Publish', nodes: [
                { emoji: '&#128250;', name: 'YouTube Upload', cat: 'Publish' },
              ]},
            ]}
            notes="Script fans out to both branches. Visual and audio branches run in parallel. Set YouTube Upload to 'Skip' error mode so the pipeline completes even if upload fails."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 4: Content Calendar Pipeline (Scheduled Daily)</h4>
          <PipelineDiagram
            title="Daily Content Calendar"
            description="Scheduled to run daily at 9 AM. Generates a new Short from a topic, then publishes to YouTube and TikTok simultaneously."
            steps={[
              { label: 'Step 1 — Generate', nodes: [
                { emoji: '&#128229;', name: 'Manual Input (topic)', cat: 'Input' },
                { emoji: '&#128221;', name: 'Script Generator', cat: 'Content' },
                { emoji: '&#127909;', name: 'Shorts Create', cat: 'Content' },
              ]},
              { label: 'Step 2 — Publish (parallel fan-out)', nodes: [
                { emoji: '&#128250;', name: 'YouTube Upload', cat: 'Publish' },
              ], parallel: true },
              { label: '', nodes: [
                { emoji: '&#127925;', name: 'TikTok Publish', cat: 'Publish' },
              ], parallel: true },
              { label: 'Step 3 — Save', nodes: [
                { emoji: '&#128190;', name: 'Save to Library', cat: 'Publish' },
              ]},
            ]}
            notes="Set trigger type to 'scheduled' with cron '0 9 * * *' (daily 9 AM). Set publish nodes to 'Skip' error mode. Update the Manual Input topic each week, or wire from an external source."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 5: Brand Asset Pipeline</h4>
          <PipelineDiagram
            title="Brand Asset Creation"
            description="Creates character turnaround sheets with your brand's LoRA and visual style, then saves to library for use across projects."
            steps={[
              { label: 'Step 1 — Character Description', nodes: [
                { emoji: '&#128229;', name: 'Manual Input (character)', cat: 'Input' },
                { emoji: '&#128295;', name: 'Prompt Builder', cat: 'Content' },
              ]},
              { label: 'Step 2 — Generate Sheet', nodes: [
                { emoji: '&#127912;', name: 'Imagineer Generate', cat: 'Image' },
                { emoji: '&#127912;', name: 'Turnaround Sheet', cat: 'Image' },
              ]},
              { label: 'Step 3 — Save', nodes: [
                { emoji: '&#128190;', name: 'Save to Library', cat: 'Publish' },
              ]},
            ]}
            notes="Double-click Imagineer and Turnaround nodes to set your brand guide and LoRA. Use 'scene' background mode on the Turnaround Sheet if you plan to use results with Veo 3.1 R2V."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 6: Multi-Platform Social (Fan-Out)</h4>
          <PipelineDiagram
            title="Multi-Platform Social Distribution"
            description="A single topic fans out to create a carousel, a LinkedIn post, and paid ad variations simultaneously."
            steps={[
              { label: 'Step 1 — Topic', nodes: [
                { emoji: '&#128229;', name: 'Manual Input (topic)', cat: 'Input' },
              ]},
              { label: 'Step 2a — Carousel', nodes: [
                { emoji: '&#127904;', name: 'Carousel Create', cat: 'Content' },
              ], parallel: true },
              { label: 'Step 2b — LinkedIn', nodes: [
                { emoji: '&#128101;', name: 'LinkedIn Post', cat: 'Content' },
              ], parallel: true },
              { label: 'Step 2c — Ads', nodes: [
                { emoji: '&#128202;', name: 'Ads Generate', cat: 'Content' },
              ], parallel: true },
            ]}
            notes="The Manual Input's output fans out to all 3 content nodes via separate connections from the same output port. All 3 run in parallel (within the 3-node concurrency pool). Each content node is configured independently — different platforms, styles, and audiences."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Example 7: Video Extension Chain</h4>
          <PipelineDiagram
            title="Video Extension Chain"
            description="Generate a video, extend it twice, then save. Creates longer content from a single starting image."
            steps={[
              { nodes: [
                { emoji: '&#128229;', name: 'Manual Input (image URL)', cat: 'Input' },
                { emoji: '&#127916;', name: 'JumpStart Animate', cat: 'Video' },
                { emoji: '&#128260;', name: 'Video Extend', cat: 'Video' },
                { emoji: '&#128260;', name: 'Video Extend #2', cat: 'Video' },
                { emoji: '&#128190;', name: 'Save to Library', cat: 'Publish' },
              ]},
            ]}
            notes="Each Video Extend node adds 4-12 seconds depending on the model. Chain multiple extends for longer videos. Set all Video Extend nodes to 'Retry' error mode for resilience."
          />
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 11. TIPS & BEST PRACTICES */}
      {/* ================================================================ */}

      <Section icon={Shield} title="11. Tips & Best Practices">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Flow Design</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Start simple</strong> — get a 2-3 node flow working first, then add complexity.</li>
            <li><strong>Use Manual Input nodes</strong> to parameterize your flows. Instead of hardcoding a prompt in the Imagineer config, create a Manual Input and wire it in — this makes the flow reusable with different inputs.</li>
            <li><strong>Fan out for parallelism</strong> — if two operations don't depend on each other, keep them on separate branches. The engine runs up to 3 nodes in parallel.</li>
            <li><strong>Always end with Save to Library</strong> — AI-generated URLs expire. Without saving, your output disappears within hours.</li>
            <li><strong>Use the config modal</strong> — don't skip configuration. Double-click each node and set up model selection, visual style, brand guide, and other settings. Well-configured nodes produce much better results.</li>
            <li><strong>Use Prompt Builder</strong> before generation nodes — it produces higher-quality, more cohesive prompts than raw text input.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Error Handling</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Set <strong>Retry</strong> on API-heavy nodes (Imagineer, JumpStart, Shorts Create) — transient failures are common with AI providers.</li>
            <li>Set <strong>Skip</strong> on optional publish nodes (YouTube, TikTok, Instagram, Facebook) — you don't want a publishing failure to lose your generated content.</li>
            <li>Keep <strong>Stop</strong> (default) on critical path nodes where downstream results would be meaningless without this step.</li>
            <li>Use <strong>Delay</strong> nodes between heavy API calls if you're hitting rate limits.</li>
            <li>Use <strong>Conditional</strong> nodes to handle success/failure cases differently — e.g., if image generation fails, skip to a fallback path.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Performance</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Image generation takes 5-30 seconds depending on the model.</li>
            <li>Video generation (animate) takes 30-120 seconds — it's the slowest step.</li>
            <li>Voiceover and music take 5-15 seconds.</li>
            <li>Shorts Create runs the entire pipeline internally — it can take 3-8 minutes depending on scene count and models.</li>
            <li>Design your flow so the video generation branch starts early, while other work happens in parallel.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Configuration Tips</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Nano Banana 2</strong> is the fastest image model — use it for prototyping flows.</li>
            <li><strong>SeedDream v4.5</strong> produces the highest quality images — use it for final production.</li>
            <li><strong>Kling 2.0 Master</strong> is the most reliable video model — good default choice.</li>
            <li><strong>Veo 3.1</strong> produces the highest quality video but is slower and more expensive.</li>
            <li>When using LoRAs, make sure the image model is compatible (Flux LoRA models work with Flux 2).</li>
            <li>Set <strong>generate_audio: false</strong> on video nodes in flows — add voiceover separately via the Voiceover node for better control.</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mt-4">Troubleshooting</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Connection won't form</strong> — check port types. You can't connect audio → image. Try using a string-type output instead.</li>
            <li><strong>Node shows red on execution</strong> — double-click the node to check its config. Common causes: missing config (empty prompt), expired API keys, provider downtime.</li>
            <li><strong>Config modal shows "Connected" but execution fails</strong> — the upstream node may have failed or produced null. Check the execution log for upstream errors.</li>
            <li><strong>Flow won't save</strong> — check your browser console. Network errors or auth issues can prevent saves.</li>
            <li><strong>Scheduled flow not running</strong> — verify your cron expression is valid. The scheduler checks every 60 seconds, so there can be up to a 1-minute delay.</li>
            <li><strong>Publishing fails</strong> — ensure you've connected the target platform in Settings → Connected Accounts with valid OAuth tokens. The config modal shows connection status.</li>
            <li><strong>Video generation 422 error</strong> — check for brand names in prompts (Veo 3.1 rejects these) or incompatible duration values.</li>
          </ul>

          <Warning>
            AI-generated media URLs from FAL.ai expire within a few hours. If a flow generates content but doesn't save it to the library,
            the URLs in the execution log will stop working. Always include a Save to Library node for any output you want to keep.
          </Warning>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 12. KEYBOARD SHORTCUTS & NAVIGATION */}
      {/* ================================================================ */}

      <Section icon={Target} title="12. Keyboard Shortcuts & Navigation">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Double-click</kbd>
              <span>Open full config modal for selected node</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click</kbd>
              <span>Select node (shows info in right strip)</span>
            </div>
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
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click + Drag (canvas)</kbd>
              <span>Pan canvas (on empty space)</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click + Drag (node)</kbd>
              <span>Move node to new position</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Drag (empty area)</kbd>
              <span>Multi-select nodes with selection box</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Drag (port → port)</kbd>
              <span>Create connection between nodes</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono">Click (edge)</kbd>
              <span>Select a connection line</span>
            </div>
          </div>

          <Tip>
            <strong>Double-click</strong> is the most important interaction in the Flow Builder. Single-click selects a node
            and shows the info strip. Double-click opens the full configuration modal where you set up all the node's settings.
          </Tip>
        </div>
      </Section>

      {/* ================================================================ */}
      {/* 13. GLOSSARY */}
      {/* ================================================================ */}

      <Section icon={FileText} title="13. Glossary">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-3">
          <KV label="DAG">Directed Acyclic Graph — a flow structure where connections only go forward (no loops).</KV>
          <KV label="Node">A single processing step in your flow (e.g., generate image, add voiceover). Each node instance stores independent config.</KV>
          <KV label="Edge / Connection">A wire between two nodes that carries data from output to input.</KV>
          <KV label="Port">An input or output connector on a node. Each port has a type (string, image, video, audio, json).</KV>
          <KV label="Config Modal">The full-width slide-over panel opened by double-clicking a node. Contains all settings for that tool.</KV>
          <KV label="Info Strip">The slim right-side panel (240px) that shows a node's summary when single-clicked.</KV>
          <KV label="Wired Port">An input port with an incoming connection. Shown as a teal "Connected" banner in the config modal.</KV>
          <KV label="Topological Sort">The algorithm that determines execution order — upstream nodes always run before downstream.</KV>
          <KV label="Concurrency Pool">Up to 3 independent nodes can execute simultaneously.</KV>
          <KV label="Fan-Out">One output port connected to multiple downstream nodes — all receive the same data.</KV>
          <KV label="Cron Expression">A scheduling format (e.g., <code>0 9 * * *</code> = every day at 9 AM).</KV>
          <KV label="Error Mode">Per-node setting: Stop (halt on error), Skip (continue past error), Retry (try 3 times).</KV>
          <KV label="Auto-Save">Flows save automatically 1.5 seconds after any structural change.</KV>
          <KV label="Template">A pre-built flow you can clone and customize.</KV>
          <KV label="StyleGrid">A visual picker with 123 style presets used in Image and Content node config modals.</KV>
          <KV label="LoRA">Low-Rank Adaptation — a trained model fine-tune for specific subjects or styles.</KV>
          <KV label="Brand Guide">A brand kit with logo, colors, and guidelines that can be applied to generation nodes.</KV>
        </div>
      </Section>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 pb-8">
        Automation Flows Guide — Last updated April 2026 &middot; 33 node types across 7 categories
      </div>
    </div>
  );
}

export default function AutomationFlowsGuidePage() {
  return <AutomationFlowsGuideContent />;
}
