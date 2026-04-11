import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Sparkles, Settings, Image, Grid3X3,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, Lightbulb,
  Layers, Palette, User, Camera, DollarSign, Wand2, Paintbrush,
  LayoutGrid, Eye, Scissors, Save, RefreshCw, Shield, Zap,
  Monitor, FileImage, Box, Clapperboard, Maximize2, PenTool,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/turnaround/';

/* ─── Reusable components ──────────────────────────────────────────── */

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/,'');
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={sectionId} data-guide-section={title} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm scroll-mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">{children}</div>}
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 my-3">
      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="text-sm text-amber-900 dark:text-amber-200">{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 my-3">
      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
      <div className="text-sm text-red-900 dark:text-red-200">{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex gap-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 my-3">
      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <div className="text-sm text-blue-900 dark:text-blue-200">{children}</div>
    </div>
  );
}

function StepBadge({ number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">
      {number}
    </span>
  );
}

function GuideImage({ src, alt, caption }) {
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <img src={src} alt={alt} className="w-full object-cover" loading="lazy" />
      {caption && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/80 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          {caption}
        </div>
      )}
    </div>
  );
}

function PoseSetRow({ name, grid, cells, bestFor, highlight = false }) {
  return (
    <tr className={highlight ? 'bg-purple-50 dark:bg-purple-950/20' : ''}>
      <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">
        {name}
        {highlight && <span className="ml-1.5 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold">R2V</span>}
      </td>
      <td className="px-3 py-2.5 font-mono text-gray-600 dark:text-gray-400">{grid}</td>
      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{cells}</td>
      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{bestFor}</td>
    </tr>
  );
}

/* ─── Exported Content (no wrapper/header) ─────────────────────────── */

export function TurnaroundGuideContent() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">

      {/* ── What Are Turnaround Sheets ── */}
      <Section icon={BookOpen} title="What Are Turnaround Sheets?" defaultOpen={true}>
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Turnaround sheets are multi-angle character reference sheets. They show a character from multiple
            positions — front, three-quarter, side, and back — providing the consistent visual reference that
            AI video models need to generate that character reliably across multiple clips.
          </p>
          <p>
            In AI video workflows, consistency is the hardest problem to solve. Without a reference sheet,
            every video clip may interpret your character differently — different hair colour, different outfit
            details, different proportions. A turnaround sheet gives every model a single source of truth.
          </p>
          <p>
            For <strong>Reference-to-Video (R2V)</strong> workflows, turnaround sheets are essential: you feed
            the individual cells to video models like Veo 3.1, Kling O3, or Grok as reference images so the AI
            understands your character from every angle before generating motion.
          </p>

          <GuideImage
            src={`${CDN}01-wizard-overview.jpg`}
            alt="Turnaround Sheet Wizard — Step 1"
            caption="The Turnaround wizard opens from the Image Tools section of the studio toolbar."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 pt-2">Opening the Wizard</h4>
          <p>
            In the studio, click <strong>Image Tools</strong> in the sidebar to expand it, then click
            <strong> Turnaround</strong>. This opens a 6-step wizard that is completely independent of Imagineer —
            do not open Imagineer first.
          </p>

          <Tip>
            Start with one character, one style, and one pose set until you have a result you're happy with.
            Total sheets = Characters &times; Styles &times; Pose Sets — costs scale with the cartesian product.
          </Tip>
        </div>
      </Section>

      {/* ── The 6-Step Wizard ── */}
      <Section icon={Settings} title="The 6-Step Wizard">
        <div className="mt-3 space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <div className="flex items-start gap-3">
            <StepBadge number={1} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Character</p>
              <p className="mt-0.5">
                Describe your character in detail — appearance, clothing, distinctive features, art style.
                The more specific you are, the more consistent the sheet will be across all cells. Both a
                name and description are required to advance.
              </p>
            </div>
          </div>

          <GuideImage
            src={`${CDN}02-character-input.jpg`}
            alt="Character description input"
            caption="Step 1: Character name and detailed appearance description. Be specific about hair, eyes, outfit, and distinguishing features."
          />

          <div className="flex items-start gap-3">
            <StepBadge number={2} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Style &amp; Model</p>
              <p className="mt-0.5">
                Choose a visual style preset (100+ options) and AI generation model. You can select multiple
                styles to generate the same character in different art styles. Also select your pose set
                layout — this determines how many cells and what angles appear in the sheet.
              </p>
            </div>
          </div>

          <GuideImage
            src={`${CDN}06-style-model.jpg`}
            alt="Style and Model step"
            caption="Step 2: Visual style grid, AI model selector, and pose set selection. Selecting multiple styles multiplies your sheet count."
          />

          <div className="flex items-start gap-3">
            <StepBadge number={3} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Props</p>
              <p className="mt-0.5">
                Add props, accessories, or environment elements. Choose from 9 categories: Vehicles, Weapons,
                Musical Instruments, Sports Equipment, Tools, Fantasy Items, Everyday Objects, Accessories, and
                Companion Animals. Props are integrated naturally into relevant poses.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <StepBadge number={4} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Refinements</p>
              <p className="mt-0.5">
                Set negative prompts to avoid common issues (anatomy problems, style inconsistency, unwanted
                emotions) and choose your background mode. The background mode decision is critical for R2V
                workflows — see the Background Modes section below.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <StepBadge number={5} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Results</p>
              <p className="mt-0.5">
                Generated sheet images appear here. Up to 4 sheets generate simultaneously, others queue.
                Edit models return results in ~30–60s (auto-upscaled 2× via Topaz). Generate models queue
                on FAL.ai and take ~60–90s.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <StepBadge number={6} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Cell Editor</p>
              <p className="mt-0.5">
                Select any sheet to slice it into individual cells, review each one, edit problem cells,
                delete unwanted ones, and save — either as individual library images for LoRA training, or
                as a reassembled composite sheet.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── All 8 Pose Sets ── */}
      <Section icon={LayoutGrid} title="All 8 Pose Set Presets">
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            The pose set determines your grid layout — how many cells, what angles, and what poses appear.
            Grid dimensions directly affect resolution per cell: fewer cells on the same canvas means more
            pixels per cell.
          </p>

          <GuideImage
            src={`${CDN}03-pose-set-selector.jpg`}
            alt="All 8 pose set options"
            caption="All 8 pose sets visible in the Step 2 selector. Small grids (2×2, 3×2) give higher resolution per cell."
          />

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead className="bg-[#07393C] text-white">
                <tr>
                  <th className="text-left px-3 py-2.5">Pose Set</th>
                  <th className="text-left px-3 py-2.5">Grid</th>
                  <th className="text-left px-3 py-2.5">Cells</th>
                  <th className="text-left px-3 py-2.5">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                <PoseSetRow name="Standard 24" grid="4×6" cells="24" bestFor="Complete reference sheets — front/side/back + expressions + walk cycle" />
                <PoseSetRow name="Expressions Focus" grid="4×6" cells="24" bestFor="Facial expression variety — 16 expression cells plus turnaround views" />
                <PoseSetRow name="Action Heavy" grid="4×6" cells="24" bestFor="Dynamic action poses, combat stances, power poses" />
                <PoseSetRow name="Fashion / Outfit" grid="4×6" cells="24" bestFor="Clothing and costume design detail, seasonal variations" />
                <PoseSetRow name="Creature / Non-Human" grid="4×6" cells="24" bestFor="Non-humanoid characters, animals, creatures, mechs" />
                <PoseSetRow name="3D Reference — Angles" grid="2×2" cells="4" bestFor="Orthographic 3D reference (6× more pixels per cell than 4×6)" />
                <PoseSetRow name="3D Reference — Action" grid="2×2" cells="4" bestFor="Dynamic 3D reference for rigging and animation" />
                <PoseSetRow name="R2V Reference" grid="3×2" cells="6" bestFor="Optimised for video generation workflows" highlight={true} />
              </tbody>
            </table>
          </div>

          <InfoBox>
            <strong>Grid dimensions affect pixels per cell.</strong> All grids use the same total canvas size.
            A 2×2 grid gives each cell ~6× the pixel area of a 4×6 grid — meaning much higher detail per cell.
            Use 2×2 or 3×2 when cell quality matters more than cell count.
          </InfoBox>
        </div>
      </Section>

      {/* ── R2V Reference Pose Set ── */}
      <Section icon={Clapperboard} title="R2V Reference Pose Set (Deep Detail)">
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            The <strong>R2V Reference</strong> pose set is a 3×2 grid — 6 cells specifically designed for
            video generation workflows. The layout provides exactly what video models need: full-body views
            for motion planning, plus close-up portrait views for face consistency.
          </p>

          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
              <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">Top Row — Full Body</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <li>Full body front view</li>
                <li>Full body 3-quarter view</li>
                <li>Full body side view</li>
              </ul>
            </div>
            <div className="border dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
              <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1">Bottom Row — Portrait Close-ups</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <li>Portrait close-up (matching front)</li>
                <li>Portrait close-up (matching 3-quarter)</li>
                <li>Portrait close-up (matching side)</li>
              </ul>
            </div>
          </div>

          <p>
            The portrait row is the key feature: it locks the face for every angle. Video models receive both
            the full-body view (so they understand how the character moves) and the matching close-up (so they
            know exactly what the face looks like from that angle). This dramatically improves facial consistency
            across video clips.
          </p>

          <GuideImage
            src={`${CDN}04-r2v-pose-set.jpg`}
            alt="R2V Reference pose set selected"
            caption="The R2V Reference pose set (3×2 = 6 cells): full-body front/3-quarter/side in the top row, matching portrait close-ups in the bottom row."
          />

          <Tip>
            For the best R2V results, use cells from the R2V Reference set as individual reference images in
            JumpStart — provide 3–5 separate cells rather than the full composite sheet. Individual cells give
            clearer signals to the video model than a single stitched image.
          </Tip>
        </div>
      </Section>

      {/* ── Background Modes ── */}
      <Section icon={Paintbrush} title="Background Modes">
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            The background mode is set in Step 4 (Refinements). This choice has significant consequences for
            downstream R2V workflows — choose carefully based on which video model you intend to use.
          </p>

          <GuideImage
            src={`${CDN}05-background-mode.jpg`}
            alt="Background mode selector showing White, Gray, and Scene Environment options"
            caption="Step 4: Background mode selection. Gray Background is recommended for most R2V workflows."
          />

          <div className="space-y-3 my-3">
            <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white shrink-0"></div>
                <h5 className="font-semibold text-sm dark:text-gray-100">White Background</h5>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">Default</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Clean neutral background. Standard for illustration and design work. Works fine with Grok R2V
                and for non-AI downstream uses (animation, games, print). <strong>Avoid for Veo 3.1 R2V</strong> — see warning below.
              </p>
            </div>

            <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 bg-teal-50 dark:bg-teal-950/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded border-2 border-gray-400 bg-gray-400 shrink-0"></div>
                <h5 className="font-semibold text-sm dark:text-gray-100">Gray Background</h5>
                <span className="text-[10px] bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded font-medium">Recommended for R2V</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Industry standard for production reference sheets. Neutral gray provides clean character-to-background
                separation without influencing colour perception. Safe for all video models including Veo 3.1.
              </p>
            </div>

            <div className="border dark:border-gray-700 rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-gradient-to-br from-green-300 to-blue-300 shrink-0"></div>
                <h5 className="font-semibold text-sm dark:text-gray-100">Scene Environment</h5>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Places the character in a contextual scene (forest, city, beach, etc.). Choose from 20+ presets
                or type your own. Required for Veo 3.1 R2V when you want the character understood in context.
                May influence character appearance slightly — the background can bleed into rendered details.
              </p>
            </div>
          </div>

          <Warning>
            <strong>Veo 3.1 R2V + white background = 422 error.</strong> The model rejects reference images with
            plain white backgrounds. It consistently returns a 422 "no_media_generated" error after ~90 seconds of
            generation time. Use Gray Background or Scene Environment mode when generating sheets intended for Veo 3.1 R2V.
            Grok R2V handles white-background references fine.
          </Warning>
        </div>
      </Section>

      {/* ── Auto-Upscale ── */}
      <Section icon={Maximize2} title="Auto-Upscale via Topaz">
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            All edit model results are automatically upscaled 2× via <strong>Topaz Standard V2</strong> before
            returning to the gallery. This means every cell you see is already at 2× the generation resolution —
            you do not need to manually upscale edit model output.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border dark:border-gray-700 text-xs space-y-1">
            <div className="flex justify-between"><span>Topaz model</span><span className="font-mono">Standard V2</span></div>
            <div className="flex justify-between"><span>Upscale factor</span><span className="font-mono">2×</span></div>
            <div className="flex justify-between"><span>Output format</span><span className="font-mono">PNG</span></div>
            <div className="flex justify-between"><span>Face enhancement</span><span className="font-mono">Off</span></div>
            <div className="flex justify-between"><span>Applies to</span><span className="font-mono">Edit models only</span></div>
          </div>
          <InfoBox>
            Face enhancement is deliberately disabled on Topaz upscaling. Enabling it would alter the character's
            facial features, which defeats the purpose of a character reference sheet. Topaz Standard V2 preserves
            details without adding AI inference artefacts.
          </InfoBox>
        </div>
      </Section>

      {/* ── Cell Editor ── */}
      <Section icon={Scissors} title="Cell Editor">
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Click any sheet in the Results gallery to open it in the Cell Editor. The sheet is sliced into
            individual cells based on the pose set's grid dimensions. Each cell is labelled with its pose name.
          </p>

          <GuideImage
            src={`${CDN}08-cell-editor.jpg`}
            alt="Cell Editor interface"
            caption="Step 6: Cell Editor. Click any cell to edit its prompt, regenerate it individually, or delete unwanted cells."
          />

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">What You Can Do</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Edit a cell</strong> — click any cell, enter an instruction (e.g. "change expression to angry" or "add sword in right hand"), and the AI modifies just that cell</li>
            <li><strong>Delete a cell</strong> — mark cells you don't want; they are excluded from reassembly and save operations</li>
            <li><strong>Regenerate a cell</strong> — retry a specific cell without regenerating the whole sheet</li>
            <li><strong>Accept or reject</strong> — after editing, preview the new version alongside the original and choose which to keep</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 pt-2">Saving Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
            <div className="border dark:border-gray-700 rounded-lg p-3">
              <p className="font-semibold text-xs dark:text-gray-100 flex items-center gap-1.5 mb-1">
                <Save className="w-3.5 h-3.5 text-[#2C666E]" /> Save Cells for LoRA
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Saves each non-deleted cell as a separate image to your library. Each cell gets auto-generated
                tags (character name, turnaround, style, pose set). Ideal for building LoRA training datasets —
                the diverse angles make excellent training images.
              </p>
            </div>
            <div className="border dark:border-gray-700 rounded-lg p-3">
              <p className="font-semibold text-xs dark:text-gray-100 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-[#2C666E]" /> Reassemble &amp; Save
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Reconstructs a composite sheet from remaining cells (excluding deleted ones), recalculating the
                grid layout. Also saves each cell individually. Use this for a clean final sheet after editing
                out problem cells.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Using Turnarounds as R2V References ── */}
      <Section icon={Eye} title="Using Turnarounds as R2V References">
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            The primary downstream use for turnaround sheets is feeding them into Reference-to-Video models
            to generate videos of your character in motion. Different R2V models have different requirements.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Recommended Workflow</h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Generate a turnaround using the <strong>R2V Reference</strong> pose set (3×2, 6 cells)</li>
            <li>Use <strong>Gray Background</strong> — safe for all R2V models including Veo 3.1</li>
            <li>Open the Cell Editor, slice the sheet, save individual cells to your library</li>
            <li>In JumpStart, select a Veo 3.1 R2V or Kling O3 R2V model and upload 3–5 cells as reference images</li>
          </ol>

          <h4 className="font-semibold text-gray-900 dark:text-gray-100 pt-2">Which R2V Model to Use</h4>
          <div className="space-y-2 my-2">
            <div className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-xs">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Grok R2V</p>
              <p className="text-gray-600 dark:text-gray-400">
                Works with any background including white. First choice if you have white-background illustration-style
                sheets. Supports audio generation. Good fallback when Veo fails.
              </p>
            </div>
            <div className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-xs">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Veo 3.1 R2V</p>
              <p className="text-gray-600 dark:text-gray-400">
                Highest quality video generation. Requires gray or scene backgrounds — rejects white-background
                references with a 422 error. Best for final production quality.
              </p>
            </div>
            <div className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-xs">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Kling O3 R2V</p>
              <p className="text-gray-600 dark:text-gray-400">
                Strong character reference support, handles multiple reference images (character + element references).
                Works with most background types. Good balance of quality and reliability.
              </p>
            </div>
          </div>

          <Warning>
            <strong>Veo 3.1 R2V + white background = 422 error.</strong> Veo 3.1 R2V cannot process reference
            images with plain white or blank backgrounds — it consistently returns 422 "no_media_generated" after
            ~90 seconds. Use <strong>Gray Background</strong> or <strong>Scene Environment</strong> mode in the
            Turnaround wizard when generating sheets intended for Veo 3.1 R2V. Grok R2V handles white-background
            references fine.
          </Warning>

          <Tip>
            Provide 3–5 individual cells as separate reference images rather than the full composite sheet.
            Video models read individual references more clearly than a single stitched multi-cell image.
          </Tip>
        </div>
      </Section>

    </main>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */

export default function TurnaroundGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2C666E] to-[#07393C] flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Turnaround Sheet Guide</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Character reference sheets and R2V workflows</p>
            </div>
          </div>
        </div>
      </header>

      <TurnaroundGuideContent />
    </div>
  );
}
