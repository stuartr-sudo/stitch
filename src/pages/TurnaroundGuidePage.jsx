import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Sparkles, Settings, Image, Grid3X3,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, Lightbulb,
  Layers, Palette, User, Camera, DollarSign, Wand2, Paintbrush,
  LayoutGrid, Eye, Scissors, Save, RefreshCw, Shield, Zap,
  Monitor, FileImage, Box, Clapperboard, Maximize2, PenTool,
} from 'lucide-react';

/* ─── Reusable components ──────────────────────────────────────────── */

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 my-3">
      <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="text-sm text-amber-900">{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 my-3">
      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
      <div className="text-sm text-red-900">{children}</div>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 my-3">
      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
      <div className="text-sm text-blue-900">{children}</div>
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

function PoseSetCard({ name, grid, cells, purpose, color = 'teal' }) {
  const colors = {
    teal: 'border-teal-200 bg-teal-50',
    purple: 'border-purple-200 bg-purple-50',
    blue: 'border-blue-200 bg-blue-50',
  };
  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
        <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border">{grid} = {cells} cells</span>
      </div>
      <p className="text-xs text-gray-600">{purpose}</p>
    </div>
  );
}

function ModelCard({ name, type, speed, refRequired, bestFor }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          type === 'Edit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>{type}</span>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1.5"><Zap className="w-3 h-3" /><span>Speed: {speed}</span></div>
        <div className="flex items-center gap-1.5"><Image className="w-3 h-3" /><span>Reference: {refRequired}</span></div>
        <div className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /><span>Best for: {bestFor}</span></div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */

export default function TurnaroundGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2C666E] to-[#07393C] flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Turnaround Sheet Guide</h1>
              <p className="text-sm text-gray-500">Complete reference for character turnaround generation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">

        {/* ── Overview ── */}
        <Section icon={BookOpen} title="What Is a Turnaround Sheet?" defaultOpen={true}>
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              A <strong>turnaround sheet</strong> (also called a model sheet or character reference sheet) is a grid of
              images showing a single character from multiple angles, poses, and expressions. It's the industry-standard
              tool for maintaining <strong>character consistency</strong> across animation, games, comics, and AI video generation.
            </p>
            <p>
              In the AI video world, turnaround sheets are critical for <strong>Reference-to-Video (R2V)</strong> workflows —
              you feed the sheet (or individual cells) to video models like Veo 3.1, Kling, or Grok so the AI knows exactly
              what your character looks like from every angle.
            </p>

            <h4 className="font-semibold text-gray-900 pt-2">How the Wizard Works</h4>
            <p>The wizard walks you through 6 steps, then generates sheets as a <strong>cartesian product</strong> of your selections:</p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 border">
              Total sheets = Characters &times; Styles &times; Pose Sets
              <br />
              Example: 2 characters &times; 3 styles &times; 1 pose set = 6 sheets
            </div>
            <p>Each sheet is generated as a single image with a grid of cells. After generation, you can slice the sheet
              into individual cells, edit specific cells, delete unwanted ones, and reassemble.</p>

            <Tip>
              Start small (1 character, 1 style, 1 pose set) until you're happy with the results, then scale up.
              Each combination fires a separate AI generation — costs add up with the cartesian product.
            </Tip>
          </div>
        </Section>

        {/* ── Step 1: Character ── */}
        <Section icon={User} title="Step 1: Character">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-start gap-3 mb-3">
              <StepBadge number={1} />
              <p>Define <strong>who</strong> you're drawing. This is the most important step — the character description
                anchors the AI's understanding of the subject across all cells.</p>
            </div>

            <h4 className="font-semibold text-gray-900">Character Name</h4>
            <p>A short identifier. Used in file names when saving cells and for organizing generated sheets in the gallery.</p>

            <h4 className="font-semibold text-gray-900">Character Description</h4>
            <p>
              A detailed text description of the character's appearance. This is injected <strong>early in the prompt</strong> (identity-first hierarchy)
              so the AI prioritizes getting the character right before thinking about layout or style.
            </p>
            <Tip>
              Be specific about distinguishing features: hair color/style, eye color, skin tone, outfit details, accessories,
              body type, age range. The more specific you are, the more consistent the cells will be.
            </Tip>
            <div className="bg-gray-50 rounded-lg p-3 text-xs border space-y-1">
              <p className="font-semibold text-gray-800">Good description:</p>
              <p className="text-gray-600">"A young woman with waist-length silver hair, bright violet eyes, pointed ears,
                wearing a dark blue cloak over leather armor with gold trim. She has a scar across her left cheek and carries a
                glowing staff on her back."</p>
              <p className="font-semibold text-gray-800 pt-2">Bad description:</p>
              <p className="text-gray-600">"An elf warrior" (too vague — the AI will invent different details for each cell)</p>
            </div>

            <h4 className="font-semibold text-gray-900">Reference Images</h4>
            <p>
              Optional for generate models, <strong>required for edit models</strong>. Upload one or more reference images
              of your character. The AI will use these as the visual anchor.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Single reference</strong> — The AI recreates this exact character in each cell</li>
              <li><strong>Multiple references</strong> — All images are stitched into a single composite (same height, side by side) and sent as one input. The AI studies all views to understand the character from multiple angles</li>
              <li><strong>Auto-describe</strong> — Click the sparkle icon on a reference image to have GPT-4o mini vision analyze it and auto-fill the character description</li>
            </ul>

            <InfoBox>
              You can add multiple characters. Each character generates its own set of sheets (multiplied by styles and pose sets).
            </InfoBox>

            <Warning>
              Edit models (Nano Banana 2 Edit, Nano Banana Pro, Seedream) <strong>require at least one reference image</strong>.
              If you want to generate without a reference, use a Generate model (Seedream Generate, Nano Banana 2, or Flux 2).
            </Warning>
          </div>
        </Section>

        {/* ── Step 2: Style & Model ── */}
        <Section icon={Palette} title="Step 2: Style & Model">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-start gap-3 mb-3">
              <StepBadge number={2} />
              <p>Choose the visual style, AI model, and pose set layout. Selecting multiple styles or pose sets multiplies your sheet count.</p>
            </div>

            <h4 className="font-semibold text-gray-900">Visual Styles</h4>
            <p>
              The StyleGrid shows 100+ visual style presets. Each preset is a detailed 40-80 word prompt that controls
              the artistic rendering — things like "3D Pixar-style rendering with subsurface scattering" or
              "ink wash painting with traditional brushwork." You can select <strong>multiple styles</strong> to generate
              the same character in different art styles.
            </p>

            <h4 className="font-semibold text-gray-900 pt-2">AI Models</h4>
            <p>Two categories with very different behavior:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
              <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 text-xs mb-2 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5" /> EDIT MODELS (Recommended)
                </h5>
                <ul className="text-xs text-green-900 space-y-1">
                  <li>Require a reference image</li>
                  <li>Synchronous — results return immediately (~30-60s)</li>
                  <li>Auto-upscaled 2&times; via Topaz after generation</li>
                  <li>Fallback chain: if one model errors, tries the next</li>
                  <li>Best for character consistency (guided by your reference)</li>
                </ul>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                <h5 className="font-semibold text-blue-800 text-xs mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> GENERATE MODELS
                </h5>
                <ul className="text-xs text-blue-900 space-y-1">
                  <li>No reference image needed (text description only)</li>
                  <li>Asynchronous — queued, then polled every 3 seconds</li>
                  <li>No auto-upscale (can upscale individual cells later)</li>
                  <li>More creative freedom but less control</li>
                  <li>Flux 2 supports LoRA weights for trained characters</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-3">
              <ModelCard name="Nano Banana 2 Edit" type="Edit" speed="Fast (~30s)" refRequired="Required" bestFor="General purpose, recommended default" />
              <ModelCard name="Nano Banana Pro" type="Edit" speed="Medium (~45s)" refRequired="Required" bestFor="Higher quality, premium results" />
              <ModelCard name="Seedream v4.5" type="Edit" speed="Medium (~45s)" refRequired="Required" bestFor="Photorealistic subjects" />
              <ModelCard name="Seedream Generate" type="Generate" speed="Queued (~60-90s)" refRequired="Optional" bestFor="No-reference photorealistic" />
              <ModelCard name="Nano Banana 2" type="Generate" speed="Queued (~60-90s)" refRequired="Optional" bestFor="No-reference general purpose" />
              <ModelCard name="Flux 2" type="Generate" speed="Queued (~60-90s)" refRequired="Optional" bestFor="LoRA-trained characters" />
            </div>

            <Tip>
              <strong>Edit models have a fallback chain.</strong> If Nano Banana 2 Edit returns a server error (502/503/504),
              it automatically retries with Nano Banana Pro, then Seedream. You don't need to manually retry on transient failures.
            </Tip>

            <h4 className="font-semibold text-gray-900 pt-2">Pose Sets</h4>
            <p>
              The pose set determines your grid layout — how many cells, what angles and poses each cell shows.
              You can select <strong>multiple pose sets</strong> to generate the same character in different layouts.
            </p>

            <div className="space-y-2 my-3">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Small Grids (Fewer Cells, Higher Resolution Per Cell)</h5>
              <PoseSetCard
                name="3D Reference — Angles"
                grid="2&times;2"
                cells={4}
                purpose="Front, Right, Back, Left — orthographic views for 3D model generation. Clean, symmetrical, technical."
                color="teal"
              />
              <PoseSetCard
                name="3D Reference — Action"
                grid="2&times;2"
                cells={4}
                purpose="Dynamic action poses for rigging and animation reference. 3/4 action, side action, hero pose."
                color="teal"
              />
              <PoseSetCard
                name="R2V Reference"
                grid="3&times;2"
                cells={6}
                purpose="Optimized for video generation. Top row: full-body front, 3/4, side. Bottom row: matching portrait close-ups per angle. The portrait row locks facial features for R2V."
                color="purple"
              />

              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Full Grids (24 Cells, Comprehensive Coverage)</h5>
              <PoseSetCard
                name="Standard 24"
                grid="4&times;6"
                cells={24}
                purpose="Classic turnaround: neutral standing, expressions, walk cycle, action poses, props/interaction, and per-angle portrait close-ups (Row 6). The default choice."
                color="blue"
              />
              <PoseSetCard
                name="Expressions Focus"
                grid="4&times;6"
                cells={24}
                purpose="16 expression cells (happy, sad, angry, surprised, etc.) plus turnaround views and detail close-ups. For characters where facial acting is critical."
                color="blue"
              />
              <PoseSetCard
                name="Action Heavy"
                grid="4&times;6"
                cells={24}
                purpose="Combat stances, power poses, dynamic movement, aerial poses. For action/superhero/fighter characters."
                color="blue"
              />
              <PoseSetCard
                name="Fashion / Outfit"
                grid="4&times;6"
                cells={24}
                purpose="Outfit showcasing, seasonal variations, accessory details, styling poses. For fashion or character design."
                color="blue"
              />
              <PoseSetCard
                name="Creature / Non-Human"
                grid="4&times;6"
                cells={24}
                purpose="Anatomy views, locomotion, threat/passive displays, scale reference. For animals, monsters, mechs, aliens."
                color="blue"
              />
            </div>

            <InfoBox>
              <strong>Grid dimensions affect image aspect ratio and resolution:</strong><br />
              <span className="font-mono">2&times;2</span> &rarr; 1:1 square (2048&times;2048 Seedream, 1536&times;1536 Flux)<br />
              <span className="font-mono">3&times;2</span> &rarr; 3:2 landscape (2560&times;1440 Seedream, 1536&times;1024 Flux)<br />
              <span className="font-mono">4&times;6</span> &rarr; 2:3 portrait (1440&times;2560 Seedream, 1024&times;1536 Flux)<br />
              Smaller grids mean <strong>more pixels per cell</strong> — 2&times;2 gives each cell ~6&times; the pixel area of a 4&times;6 cell.
            </InfoBox>
          </div>
        </Section>

        {/* ── Step 3: Props ── */}
        <Section icon={Wand2} title="Step 3: Props & Negative Prompt">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-start gap-3 mb-3">
              <StepBadge number={3} />
              <p>Add props your character should hold/wear, and specify what to avoid.</p>
            </div>

            <h4 className="font-semibold text-gray-900">Props</h4>
            <p>
              Select from 9 categories: Vehicles, Weapons, Musical Instruments, Sports Equipment, Tools,
              Fantasy Items, Everyday Objects, Accessories, and Companion Animals. Props are integrated into
              relevant poses — the AI decides which cells naturally incorporate them.
            </p>

            <h4 className="font-semibold text-gray-900">Negative Prompt</h4>
            <p>
              Tell the AI what to <strong>avoid</strong>. This appears at both the start and end of the generation prompt
              for maximum effect. Two input methods:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Quick pills</strong> — Pre-built categories (Quality Issues, Anatomy, Face & Expression, Style, Consistency). Click to toggle.</li>
              <li><strong>Freeform text</strong> — Type anything additional</li>
            </ul>

            <Tip>
              The "Consistency" category pills are especially useful for turnarounds — they prevent outfit changes,
              color shifts, proportion changes, and style mixing between cells.
            </Tip>

            <Warning>
              <strong>Expression conflict resolution:</strong> For Standard 24, if your negative prompt includes emotions
              (e.g., "angry," "sad"), the system automatically swaps conflicting expression cells in Row 2 with safe alternatives
              (calm confident, gentle smile, curious). This only applies to the Standard 24 pose set.
            </Warning>

            <h4 className="font-semibold text-gray-900">Brand Style Guide</h4>
            <p>
              Optional. If you have a Brand Kit configured, select it here. The brand's visual style, mood, lighting,
              and composition rules are appended to the prompt, ensuring generated sheets match your brand identity.
            </p>
          </div>
        </Section>

        {/* ── Step 4: Refinements (Background) ── */}
        <Section icon={Paintbrush} title="Step 4: Refinements & Background">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-start gap-3 mb-3">
              <StepBadge number={4} />
              <p>Final tuning before generation. The key decision here is <strong>background mode</strong>.</p>
            </div>

            <h4 className="font-semibold text-gray-900">Background Modes</h4>
            <div className="space-y-2 my-3">
              <div className="border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded border-2 border-gray-300 bg-white"></div>
                  <h5 className="font-semibold text-sm">White Background</h5>
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">Default</span>
                </div>
                <p className="text-xs text-gray-600">
                  Traditional character sheet look. Clean and simple. Works well with Grok R2V and for non-AI usage
                  (animation, games, art reference).
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded border-2 border-gray-300 bg-gray-400"></div>
                  <h5 className="font-semibold text-sm">Gray Background</h5>
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">Recommended for R2V</span>
                </div>
                <p className="text-xs text-gray-600">
                  Industry standard for production model sheets. Neutral gray provides clean character-to-background
                  separation without influencing color perception.
                </p>
                <Warning>
                  <strong>Use gray if your sheets will feed into Veo 3.1 R2V.</strong> Veo 3.1 consistently fails
                  (422 "no_media_generated") when given reference images with pure white backgrounds — the model
                  can't distinguish the character from the background. Gray solves this. Grok R2V handles white fine.
                </Warning>
              </div>

              <div className="border rounded-lg p-3 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded border-2 border-gray-300 bg-gradient-to-br from-green-300 to-blue-300"></div>
                  <h5 className="font-semibold text-sm">Scene Environment</h5>
                </div>
                <p className="text-xs text-gray-600">
                  Places your character in a contextual background (forest, beach, city, etc.). Choose from 20+ presets
                  or type your own. Best for R2V workflows where you want the AI video model to understand the character
                  in context, not just in isolation.
                </p>
                <Tip>
                  Scene Environment gives the best R2V results because video models understand characters better when
                  they're shown in context. However, the background may influence the character's appearance slightly.
                  Use gray for maximum purity, scene for maximum R2V compatibility.
                </Tip>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Step 5: Results ── */}
        <Section icon={Image} title="Step 5: Results & Gallery">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-start gap-3 mb-3">
              <StepBadge number={5} />
              <p>Generation happens here. Watch your sheets come in, filter the gallery, retry failures, and pick sheets to edit.</p>
            </div>

            <h4 className="font-semibold text-gray-900">Generation Process</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Concurrency:</strong> Up to 4 sheets generate simultaneously. Others queue and fire as slots free up.</li>
              <li><strong>Edit models:</strong> Results appear in ~30-60 seconds per sheet. They arrive auto-upscaled (2&times; via Topaz).</li>
              <li><strong>Generate models:</strong> Queued on FAL.ai, polled every 3 seconds. Usually ~60-90 seconds.</li>
              <li><strong>Soft warning:</strong> If the cartesian product exceeds 10 sheets, you'll be warned before generation starts.</li>
            </ul>

            <h4 className="font-semibold text-gray-900">Auto-Upscale (Edit Models Only)</h4>
            <p>
              After an edit model returns its image, it's automatically sent to <strong>Topaz Standard V2</strong> for 2&times; upscaling.
              This doubles the resolution without adding AI hallucinations (Topaz preserves details unlike some upscalers).
              The upscaled image is what you see in the gallery.
            </p>
            <InfoBox>
              Topaz upscale uses <span className="font-mono text-xs">fal-ai/topaz/upscale/image</span> with PNG output,
              Standard V2 model, 2&times; factor, no face enhancement (to avoid altering character features).
              It's queue-based — submit, poll up to 2 minutes, then return.
            </InfoBox>

            <h4 className="font-semibold text-gray-900">Gallery Features</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Filter</strong> by character, style, or pose set to narrow results</li>
              <li><strong>Retry</strong> individual failed sheets or all failures at once</li>
              <li><strong>Download</strong> any sheet as PNG directly</li>
              <li><strong>Click</strong> a sheet to select it for the Cell Editor (Step 6)</li>
              <li>Sheets are grouped by character name for easy comparison</li>
            </ul>
          </div>
        </Section>

        {/* ── Step 6: Cell Editor ── */}
        <Section icon={Scissors} title="Step 6: Cell Editor">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-start gap-3 mb-3">
              <StepBadge number={6} />
              <p>Slice your sheet into individual cells, review each one, edit problem cells, and save.</p>
            </div>

            <h4 className="font-semibold text-gray-900">Slicing</h4>
            <p>
              The tool knows the grid dimensions from the pose set data. It divides the sheet image into equal cells
              (width / cols, height / rows) and labels each cell from the pose set definition. You see a grid of individual
              cell images with their labels.
            </p>

            <h4 className="font-semibold text-gray-900">Reviewing Cells</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Delete</strong> — Mark cells you don't want. They're excluded from reassembly and save.</li>
              <li><strong>Restore</strong> — Unmark all deleted cells if you change your mind.</li>
            </ul>

            <h4 className="font-semibold text-gray-900">Editing Individual Cells</h4>
            <p>
              Click "Edit" on any cell to fix issues. Type an instruction (e.g., "change expression to angry" or
              "add a sword in the right hand") and the AI will modify that specific cell. The edit uses Flux 2
              at 512&times;512 resolution.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Enter your edit instruction</li>
              <li>Click Edit — the cell uploads to the library, then goes to the image edit API</li>
              <li>A preview appears alongside the original</li>
              <li><strong>Accept</strong> to replace the cell, or <strong>Reject</strong> to keep the original</li>
            </ol>

            <h4 className="font-semibold text-gray-900 pt-2">Saving</h4>
            <p>Two save paths:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <h5 className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                  <Save className="w-4 h-4 text-[#2C666E]" /> Save Cells for LoRA
                </h5>
                <p className="text-xs text-gray-600">
                  Saves each non-deleted cell as a separate image to your library. Perfect for feeding into LoRA training —
                  each cell becomes a training image with auto-generated tags (character name, turnaround, style, pose set).
                  Set a folder name prefix to organize them.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <h5 className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                  <Layers className="w-4 h-4 text-[#2C666E]" /> Reassemble & Save
                </h5>
                <p className="text-xs text-gray-600">
                  Reconstructs a composite sheet from your remaining cells (excluding deleted ones), recalculating the grid
                  layout. Also saves each individual cell separately. Great for creating a clean final sheet after editing.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Prompt Hierarchy ── */}
        <Section icon={FileImage} title="How the Prompt Is Built (Identity-First Hierarchy)">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              The order of information in an AI image prompt matters — models pay more attention to tokens that appear early.
              The turnaround prompt is structured so character identity comes first, before any layout or style instructions.
              This ensures the AI prioritizes "who" over "how."
            </p>

            <div className="bg-gray-50 rounded-lg p-4 border space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded shrink-0">1st</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Avoidance Instructions (Negative Prompt)</p>
                  <p className="text-xs text-gray-500">"CRITICAL INSTRUCTION — DO NOT include..." — placed first so the model sees constraints before generating anything</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded shrink-0">2nd</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Character Identity</p>
                  <p className="text-xs text-gray-500">Your character description — the face, hair, outfit, distinguishing features. This is the anchor.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded shrink-0">3rd</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Reference Image Instructions</p>
                  <p className="text-xs text-gray-500">How to use the reference image(s) — "recreate this exact character" or "study all views"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded shrink-0">4th</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Grid Layout & Background</p>
                  <p className="text-xs text-gray-500">"Professional turnaround sheet, N columns &times; N rows, [white/gray/scene] background"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded shrink-0">5th</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Consistency & Alignment Instructions</p>
                  <p className="text-xs text-gray-500">"Consistent head height, even spacing, uniform framing, relaxed A-pose for standing views, same proportions/features in every cell"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded shrink-0">6th</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Style & Props</p>
                  <p className="text-xs text-gray-500">Art style rendering instructions + prop integration</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded shrink-0">7th</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Row-by-Row Cell Definitions</p>
                  <p className="text-xs text-gray-500">Each row's label and cell prompts from the pose set — "Row 1: front view, 3/4 view, side profile..."</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded shrink-0">8th</span>
                <div>
                  <p className="font-semibold text-xs text-gray-800">Taxonomy Tags & Avoidance Repeat</p>
                  <p className="text-xs text-gray-500">"character reference sheet, turnaround sheet, animation reference" + negative prompt repeated for reinforcement</p>
                </div>
              </div>
            </div>

            <Tip>
              The negative prompt appears at both the start AND end of the prompt. Research shows that AI models can "forget"
              early instructions by the time they process long prompts. Repeating constraints at the end reinforces them.
            </Tip>
          </div>
        </Section>

        {/* ── R2V Workflow ── */}
        <Section icon={Clapperboard} title="Using Turnaround Sheets for R2V (Reference-to-Video)">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              The primary downstream use for turnaround sheets is feeding them into <strong>Reference-to-Video</strong> models
              (Veo 3.1 R2V, Kling O3 R2V, Grok R2V) to generate videos of your character in motion.
            </p>

            <h4 className="font-semibold text-gray-900">Recommended R2V Workflow</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Generate turnaround</strong> using the <strong>R2V Reference</strong> pose set (3&times;2 grid, 6 cells).
                This is specifically designed for R2V — full body views + matching portrait close-ups lock the face.
              </li>
              <li>
                <strong>Use Gray or Scene background</strong> — never white for Veo 3.1. Gray is safe for all models.
                Scene gives the best video results but may influence character appearance slightly.
              </li>
              <li>
                <strong>Slice into cells</strong> using the Cell Editor. Save individual cells for use as reference images
                in JumpStart or the Shorts Workbench.
              </li>
              <li>
                <strong>Feed cells to R2V</strong> — In JumpStart, select a Veo 3.1 R2V or Kling O3 R2V model and upload
                your turnaround cells as reference images. The video model recreates your character in motion.
              </li>
            </ol>

            <Warning>
              <strong>Veo 3.1 R2V + white backgrounds = failure.</strong> This is the #1 pitfall. Veo 3.1 R2V cannot
              process reference images with pure white/blank backgrounds — it consistently returns 422 "no_media_generated"
              after ~90 seconds. Use gray or scene backgrounds. Grok R2V handles white backgrounds fine.
            </Warning>

            <h4 className="font-semibold text-gray-900 pt-2">Which R2V Model to Use?</h4>
            <div className="space-y-2 my-2">
              <div className="border rounded-lg p-3 bg-white text-xs">
                <strong>Veo 3.1 R2V</strong> — Highest quality video generation. Needs gray/scene backgrounds. Best for final production.
              </div>
              <div className="border rounded-lg p-3 bg-white text-xs">
                <strong>Kling O3 R2V</strong> — Good quality, handles multiple reference images (character + element references). Works with any background.
              </div>
              <div className="border rounded-lg p-3 bg-white text-xs">
                <strong>Grok R2V</strong> — Most forgiving — handles white backgrounds fine. Good fallback when Veo fails. Supports audio generation.
              </div>
            </div>

            <Tip>
              For the best R2V results, provide <strong>3-5 reference images</strong> from different angles rather than
              the full composite sheet. The full sheet as a single image can confuse some models. Individual cells give
              clearer signals about the character's appearance.
            </Tip>
          </div>
        </Section>

        {/* ── Tips & Best Practices ── */}
        <Section icon={CheckCircle2} title="Tips & Best Practices">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">

            <h4 className="font-semibold text-gray-900">Character Descriptions</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Include <strong>5-8 specific physical details</strong> (hair color/length, eye color, skin tone, build, height)</li>
              <li>Describe the <strong>complete outfit</strong> (top, bottom, shoes, accessories — colors and materials)</li>
              <li>Mention <strong>distinguishing features</strong> (scars, tattoos, markings, unique accessories)</li>
              <li>Use the <strong>auto-describe</strong> feature on reference images to get a starting point, then edit</li>
            </ul>

            <h4 className="font-semibold text-gray-900 pt-2">Reference Images</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Clear, well-lit reference images produce the best results</li>
              <li>Multiple angles help — front + side + 3/4 gives the AI more data to maintain consistency</li>
              <li>Avoid busy backgrounds in reference images — the AI may incorporate background elements</li>
              <li>Higher resolution references are better (they get stitched and resized, but more detail = more signal)</li>
            </ul>

            <h4 className="font-semibold text-gray-900 pt-2">Choosing Pose Sets</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>For R2V workflows:</strong> Use R2V Reference (6 cells) — purpose-built for video generation</li>
              <li><strong>For 3D workflows:</strong> Use 3D Reference — Angles (4 cells, orthographic)</li>
              <li><strong>For comprehensive reference:</strong> Use Standard 24 — covers everything including expressions and walk cycles</li>
              <li><strong>For LoRA training:</strong> Standard 24 gives the most diverse training images per generation</li>
              <li>Smaller grids (2&times;2, 3&times;2) produce higher quality per cell because each cell gets more pixels</li>
            </ul>

            <h4 className="font-semibold text-gray-900 pt-2">Negative Prompts</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Always enable the <strong>Consistency</strong> pills — they prevent the most common turnaround issue (character drift between cells)</li>
              <li>Add <strong>"extra limbs, extra fingers"</strong> for action poses — these artifacts are more common in dynamic cells</li>
              <li>Be careful negating emotions — Standard 24 has expression cells that may conflict (the system auto-resolves this, but keep it in mind)</li>
            </ul>

            <h4 className="font-semibold text-gray-900 pt-2">General</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Edit models (especially Nano Banana 2 Edit) give the most consistent results because the reference image anchors every cell</li>
              <li>If one sheet has a few bad cells but most are good, use the Cell Editor to fix just those cells rather than regenerating the whole thing</li>
              <li>Save cells for LoRA after a good generation — the diverse angles make excellent training data</li>
              <li>The auto-upscale on edit models means your cells are already 2&times; resolution — good enough for most downstream uses without additional upscaling</li>
            </ul>
          </div>
        </Section>

        {/* ── Troubleshooting ── */}
        <Section icon={Shield} title="Troubleshooting">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Problem</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Cause</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Solution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Character looks different in each cell</td>
                    <td className="px-4 py-3 text-gray-600">Vague description, no reference image</td>
                    <td className="px-4 py-3 text-gray-600">Use an edit model with a clear reference image. Add more specific details to description. Enable Consistency negative pills.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">R2V video fails with 422 error</td>
                    <td className="px-4 py-3 text-gray-600">White background + Veo 3.1 R2V</td>
                    <td className="px-4 py-3 text-gray-600">Regenerate with Gray or Scene background. Or switch to Grok R2V which handles white fine.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Cells overlap or bleed into each other</td>
                    <td className="px-4 py-3 text-gray-600">AI didn't understand grid layout</td>
                    <td className="px-4 py-3 text-gray-600">Try a different model. Use a smaller pose set (2&times;2 or 3&times;2) — they're much easier for the AI to get right.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Generation takes very long (&gt;3 min)</td>
                    <td className="px-4 py-3 text-gray-600">Queue congestion on FAL.ai</td>
                    <td className="px-4 py-3 text-gray-600">Normal during peak hours. Generate models queue on FAL; edit models use sync calls and are usually faster.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Upscale times out</td>
                    <td className="px-4 py-3 text-gray-600">Topaz queue overloaded</td>
                    <td className="px-4 py-3 text-gray-600">The original (non-upscaled) image is returned as fallback. You can upscale individual cells later via the 3D viewer or library tools.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Wrong expressions in Standard 24</td>
                    <td className="px-4 py-3 text-gray-600">Negative prompt conflicts with Row 2 expressions</td>
                    <td className="px-4 py-3 text-gray-600">The system auto-resolves this (swaps to safe alternatives). If you want specific expressions, remove conflicting negative pills.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Cell edit doesn't match original style</td>
                    <td className="px-4 py-3 text-gray-600">Cell editor uses Flux 2 at 512&times;512</td>
                    <td className="px-4 py-3 text-gray-600">The edit model is different from the generation model. Include style notes in your edit prompt (e.g., "in anime style, change...").</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* ── Cost Reference ── */}
        <Section icon={DollarSign} title="Cost Reference">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>Each sheet fires one AI generation call. Edit model sheets also fire one Topaz upscale call.</p>
            <div className="bg-gray-50 rounded-lg p-4 border space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Nano Banana 2 Edit (generation)</span>
                <span className="font-mono">~$0.03-0.05</span>
              </div>
              <div className="flex justify-between">
                <span>Topaz 2&times; Upscale (auto, edit models only)</span>
                <span className="font-mono">~$0.02</span>
              </div>
              <div className="flex justify-between">
                <span>Seedream Generate (generation)</span>
                <span className="font-mono">~$0.04-0.06</span>
              </div>
              <div className="flex justify-between">
                <span>Flux 2 Generate (generation)</span>
                <span className="font-mono">~$0.03-0.05</span>
              </div>
              <div className="flex justify-between">
                <span>Cell Edit (Flux 2, per edit)</span>
                <span className="font-mono">~$0.02</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-describe reference (GPT-4o mini)</span>
                <span className="font-mono">~$0.01</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Typical single sheet (edit model + upscale)</span>
                <span className="font-mono">~$0.05-0.07</span>
              </div>
            </div>
            <InfoBox>
              Costs scale linearly with the cartesian product. 2 characters &times; 3 styles &times; 2 pose sets = 12 sheets &asymp; $0.60-0.84 total.
              Start with one combination to verify quality before scaling up.
            </InfoBox>
          </div>
        </Section>

        {/* ── Quick Reference ── */}
        <Section icon={Maximize2} title="Quick Decision Matrix">
          <div className="mt-3 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-[#07393C] text-white">
                  <tr>
                    <th className="text-left px-3 py-2">I want to...</th>
                    <th className="text-left px-3 py-2">Model</th>
                    <th className="text-left px-3 py-2">Pose Set</th>
                    <th className="text-left px-3 py-2">Background</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-3 py-2 font-medium">Make a video of my character (R2V)</td>
                    <td className="px-3 py-2">Nano Banana 2 Edit</td>
                    <td className="px-3 py-2">R2V Reference</td>
                    <td className="px-3 py-2">Gray or Scene</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Train a LoRA on my character</td>
                    <td className="px-3 py-2">Nano Banana 2 Edit</td>
                    <td className="px-3 py-2">Standard 24</td>
                    <td className="px-3 py-2">White</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Create a 3D model</td>
                    <td className="px-3 py-2">Nano Banana 2 Edit</td>
                    <td className="px-3 py-2">3D Reference — Angles</td>
                    <td className="px-3 py-2">White</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Explore character in different styles</td>
                    <td className="px-3 py-2">Any (multi-style select)</td>
                    <td className="px-3 py-2">Standard 24</td>
                    <td className="px-3 py-2">White</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Generate without a reference image</td>
                    <td className="px-3 py-2">Seedream Generate</td>
                    <td className="px-3 py-2">Any</td>
                    <td className="px-3 py-2">White or Gray</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Use my trained LoRA character</td>
                    <td className="px-3 py-2">Flux 2</td>
                    <td className="px-3 py-2">Any</td>
                    <td className="px-3 py-2">White or Gray</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Focus on facial expressions</td>
                    <td className="px-3 py-2">Nano Banana 2 Edit</td>
                    <td className="px-3 py-2">Expressions Focus</td>
                    <td className="px-3 py-2">White</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Design creature/monster</td>
                    <td className="px-3 py-2">Seedream Generate</td>
                    <td className="px-3 py-2">Creature / Non-Human</td>
                    <td className="px-3 py-2">White or Scene</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
          Internal admin reference — Stitch Studios
        </div>
      </footer>
    </div>
  );
}
