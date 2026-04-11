/**
 * ChecklistStoryboardPage — detailed interactive checklist for every step in the Storyboard tool.
 * Checkbox state persists in localStorage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RotateCcw, CheckCircle2, Layers, Settings2, Film,
  Palette, Type, Users, MapPin, Volume2, Image as ImageIcon,
  Play, Eye, AlertTriangle, Share2, FileText, Lock, Split,
  Trash2, RefreshCw, Mic, Music, Monitor, Upload, Sparkles,
  Package, Cpu,
} from 'lucide-react';

const STORAGE_KEY = 'checklist-storyboard-state';

const SECTIONS = [
  {
    id: 'pre-storyboard',
    title: 'Pre-Storyboard Planning',
    icon: 'Settings2',
    items: [
      { id: 'ps-1', label: 'Document client brief (goals, message, key points)' },
      { id: 'ps-2', label: 'Identify target audience (Children 3-8, Kids 8-12, Teens, Young Adults, Adults, Professionals, General)' },
      { id: 'ps-3', label: 'Confirm video length (15s, 30s, 45s, 60s, or 90s)' },
      { id: 'ps-4', label: 'Decide aspect ratio (16:9 landscape, 9:16 portrait, 1:1 square)' },
      { id: 'ps-5', label: 'Prepare Brand Kit if brand compliance is needed (logo, colors, guidelines)' },
      { id: 'ps-6', label: 'Prepare character reference images if using Kling R2V or Veo R2V models' },
      { id: 'ps-7', label: 'Prepare a starting frame image if desired (sets the visual anchor)' },
      { id: 'ps-8', label: 'Document music mood preferences (e.g., "cheerful playful with gentle xylophone")' },
    ],
  },
  {
    id: 'create',
    title: 'Creating a New Storyboard',
    icon: 'Sparkles',
    items: [
      { id: 'cr-1', label: 'Navigate to Storyboards (/storyboards)' },
      { id: 'cr-2', label: 'Click "+ New Storyboard"' },
      { id: 'cr-3', label: 'Enter storyboard name' },
      { id: 'cr-4', label: 'You\'ll land on the Settings tab (default when no scenes exist)' },
    ],
  },
  {
    id: 'settings-story',
    title: 'Settings: Story Section',
    icon: 'Type',
    items: [
      { id: 'ss-1', label: 'Enter the Storyboard Name (short, descriptive)' },
      { id: 'ss-2', label: 'Write a Story Overview (1-2 sentence summary of the video)' },
      { id: 'ss-3', label: 'Select Narrative Style: Educational, Story, Dramatic, Documentary, Ad/Promo, Tutorial, or Safety/PSA' },
      { id: 'ss-4', label: 'Set Target Audience: Children (3-8), Kids (8-12), Teens, Young Adults, Adults, Professionals, or General' },
      { id: 'ss-5', label: 'Paste the Client Brief (optional but recommended for context)' },
      { id: 'ss-6', label: 'Select Length: 15s, 30s, 45s, 60s, or 90s' },
      { id: 'ss-7', label: 'Set Frame Interval: 2s, 4s, 6s, or 8s per frame (affects scene count)' },
      { id: 'ss-8', label: 'Choose Aspect Ratio: 16:9, 9:16, or 1:1' },
    ],
  },
  {
    id: 'settings-visual',
    title: 'Settings: Visual Style Section',
    icon: 'Palette',
    items: [
      { id: 'sv-1', label: 'Browse and select a Style Preset from the StyleGrid (123 visual presets with thumbnails)' },
      { id: 'sv-2', label: 'Set Style Direction: Minimalist, Illustrative, Photographic, Painterly, Graphic, Vintage, Futuristic, or Organic' },
      { id: 'sv-3', label: 'Set Lighting: Golden Hour, Blue Hour, Soft Diffused, Dramatic Side, Backlit, Neon, Candlelight, Overcast, or Studio' },
      { id: 'sv-4', label: 'Set Color Grade: Warm, Cool, Neutral, Desaturated, Vibrant, Teal & Orange, Pastel, or Monochrome' },
      { id: 'sv-5', label: 'Optionally select a Motion Style (cinematography presets with thumbnail cards)' },
      { id: 'sv-6', label: 'Optionally upload an Anchor Image for Style Lock (all generations will match this visual style)' },
      { id: 'sv-7', label: 'If anchor uploaded: write a visual style description (lighting, color palette, rendering style)' },
    ],
  },
  {
    id: 'settings-models',
    title: 'Settings: Models Section',
    icon: 'Cpu',
    items: [
      { id: 'sm-1', label: 'Select Video Model: Veo 3/Veo 3-Fast (I2V/R2V), Kling R2V (@Element refs, audio), Grok R2V, or Kling I2V' },
      { id: 'sm-2', label: 'Review model capabilities: R2V (reference-to-video), I2V (image-to-video), FLF (first-last-frame), Audio support, Refs support' },
      { id: 'sm-3', label: 'Select Image Model for previews: FLUX Pro, FLUX Standard, Fal Nano Banana, Fal Flux Dev, etc.' },
      { id: 'sm-4', label: 'Set Resolution: 720p, 1080p, or 4K' },
    ],
  },
  {
    id: 'settings-characters',
    title: 'Settings: Characters & Starting Image',
    icon: 'Users',
    items: [
      { id: 'sc-1', label: 'Upload a Starting Image (optional but recommended — sets first frame visual anchor)' },
      { id: 'sc-2', label: 'For Kling R2V: Define up to 4 @Elements — each with description, up to 3 reference images, frontal/full-body toggle' },
      { id: 'sc-3', label: 'For Veo R2V: Upload multiple reference images' },
      { id: 'sc-4', label: 'For I2V models: No character setup needed (starting image defines the visual)' },
      { id: 'sc-5', label: 'If 2+ characters/elements: Click "Check Differentiation" to verify characters are visually distinct' },
      { id: 'sc-6', label: 'Review differentiation results: green (passed) or amber (warnings + suggestions)' },
    ],
  },
  {
    id: 'settings-ingredients',
    title: 'Settings: Ingredient Palette',
    icon: 'Package',
    items: [
      { id: 'si-1', label: 'Add named Characters with descriptions (auto-injected into prompts when names appear in scene descriptions)' },
      { id: 'si-2', label: 'Add named Props with descriptions (e.g., "Magic Sword — glowing blue blade, leather hilt")' },
      { id: 'si-3', label: 'Add named Environments with descriptions (e.g., "Castle Courtyard — medieval stone walls, torch-lit")' },
      { id: 'si-4', label: 'Verify all ingredient names are unique and descriptive' },
    ],
  },
  {
    id: 'settings-direction',
    title: 'Settings: Scene Direction',
    icon: 'MapPin',
    items: [
      { id: 'sd-1', label: 'Write a detailed Location/Setting description (where, when, what\'s around)' },
      { id: 'sd-2', label: 'Select Environment pills (multi-select): Urban, Nature, Indoor, Studio, Underwater, Space, Desert, Forest, Beach, Mountain, Cityscape, Rural' },
      { id: 'sd-3', label: 'Select Action pills (multi-select): Walking, Running, Dancing, Sitting, Standing, Flying, Swimming, Talking, Working, Playing, Biking' },
      { id: 'sd-4', label: 'Select Expression pills (multi-select): Happy, Sad, Angry, Surprised, Thoughtful, Determined, Peaceful, Excited, Fearful, Confident' },
      { id: 'sd-5', label: 'Select Lighting pills (multi-select): Golden Hour, Blue Hour, Midday, Overcast, Neon, Candlelight, Moonlight, Studio, Backlit' },
      { id: 'sd-6', label: 'Select Camera pills (multi-select): Slow Pan, Tracking Shot, Static, Dolly In/Out, Orbit, Crane Up/Down, Handheld, Aerial' },
    ],
  },
  {
    id: 'settings-audio',
    title: 'Settings: Audio & Captions',
    icon: 'Volume2',
    items: [
      { id: 'sa-1', label: 'Select TTS Model: ElevenLabs v3 ($0.05/1K), Multilingual v2 ($0.05/1K), Kokoro ($0.02/1K), or MiniMax HD ($0.10/1K)' },
      { id: 'sa-2', label: 'Select Voice: Rachel, Aria, Sarah, Charlotte, Roger, Charlie, George, Liam, Daniel, or Bill' },
      { id: 'sa-3', label: 'Set Speech Speed (0.7x to 1.2x, default 1.0x)' },
      { id: 'sa-4', label: 'Select Lipsync Model: None, Kling LipSync (cartoon), Sync 2.0 (realistic), or LatentSync (budget)' },
      { id: 'sa-5', label: 'If lipsync enabled: set Content Type (cartoon, realistic, 3d, anime)' },
      { id: 'sa-6', label: 'Write a Music Mood description (e.g., "gentle piano with soft strings")' },
      { id: 'sa-7', label: 'Set Music Volume (0% to 50%, default 15%)' },
      { id: 'sa-8', label: 'Select Caption Style: None, Word Pop, Karaoke Glow, Subtle Highlight, or News Ticker' },
    ],
  },
  {
    id: 'settings-brand',
    title: 'Settings: Brand Kit Integration (Optional)',
    icon: 'Eye',
    items: [
      { id: 'sb-1', label: 'Select a Brand Style Guide from the dropdown' },
      { id: 'sb-2', label: 'Review the brand data that will be injected: visual style notes, mood, lighting, composition' },
      { id: 'sb-3', label: 'Note: Brand compliance checking will flag prohibited terms in generated prompts' },
      { id: 'sb-4', label: 'Note: Brand warnings will appear on individual frames if violations are found' },
    ],
  },
  {
    id: 'script-gen',
    title: 'Script Generation (2-Stage AI Pipeline)',
    icon: 'Sparkles',
    items: [
      { id: 'sg-1', label: 'Click "Generate Script" (available on Settings tab when no frames exist, or Storyboard tab toolbar)' },
      { id: 'sg-2', label: 'Stage 1 — Narrative: GPT-4.1-mini generates title, logline, narrative beats per scene (structured output)' },
      { id: 'sg-3', label: 'Stage 2 — Visual Director: GPT-4.1-mini converts narrative beats into visual prompts, motion prompts, camera angles' },
      { id: 'sg-4', label: 'Review the generated frames in the Storyboard tab' },
      { id: 'sg-5', label: 'Check scene count (AI calculates optimal count based on length + frame interval)' },
      { id: 'sg-6', label: 'Review each frame\'s beat type (Hook, Setup, Rising Action, Climax, Resolution, Call-to-Action, etc.)' },
      { id: 'sg-7', label: 'Verify narrative flow: logline, emotional arc, scene transitions' },
      { id: 'sg-8', label: 'Check for any brand warnings (amber boxes on frames)' },
      { id: 'sg-9', label: 'Cost: ~$0.01-0.05 for the two-stage GPT pipeline' },
    ],
  },
  {
    id: 'frame-editing',
    title: 'Frame Editing (Per-Scene Detail Panel)',
    icon: 'Type',
    items: [
      { id: 'fe-1', label: 'Click a frame card in the grid to select it and open the detail panel' },
      { id: 'fe-2', label: 'Edit Story (narrative_note) — what happens in this scene' },
      { id: 'fe-3', label: 'Edit Setting — specific location and time of day' },
      { id: 'fe-4', label: 'Edit Dialogue — character speech (enables voice override when present)' },
      { id: 'fe-5', label: 'If dialogue exists: select Voice Override from 10 voice presets, and click "Play Preview" to hear it' },
      { id: 'fe-6', label: 'Set Generation Mode: Auto (system decides), Standalone (fresh, no references), or Continuity (use previous frame as style ref)' },
      { id: 'fe-7', label: 'Edit Action — physical character movement for this scene' },
      { id: 'fe-8', label: 'Edit Emotion — emotional state of the character(s)' },
      { id: 'fe-9', label: 'Review Camera Angle (suggested by AI, shown as badge)' },
      { id: 'fe-10', label: 'Edit Image Direction (preview_image_prompt) — guides preview image generation' },
      { id: 'fe-11', label: 'Edit Motion Direction (motion_prompt) — guides video clip camera movement' },
      { id: 'fe-12', label: 'Optionally add a Motion Reference video for Kling Motion Control' },
      { id: 'fe-13', label: 'Set Scene Transition type: Cut, Fade, Dissolve, or Wipe' },
      { id: 'fe-14', label: 'Review the full Visual Prompt (expandable, read-only, system-generated — shown with word count)' },
      { id: 'fe-15', label: 'All edits auto-save after 800ms debounce' },
    ],
  },
  {
    id: 'frame-management',
    title: 'Scene Management Operations',
    icon: 'Layers',
    items: [
      { id: 'fm-1', label: 'Lock critical frames to prevent accidental edits (click Lock icon in detail panel)' },
      { id: 'fm-2', label: 'Split a scene into two halves (halves duration, duplicates fields) — "Split Scene" button' },
      { id: 'fm-3', label: 'Delete a scene (renumbers remaining, recalculates timestamps) — "Delete Scene" button' },
      { id: 'fm-4', label: 'Drag and drop frames in the grid to reorder' },
      { id: 'fm-5', label: 'Note: Locked frames cannot be edited, split, deleted, reordered, or regenerated' },
      { id: 'fm-6', label: 'Regenerate script preserves locked frames and only updates unlocked ones' },
    ],
  },
  {
    id: 'preview-gen',
    title: 'Preview Image Generation',
    icon: 'ImageIcon',
    items: [
      { id: 'pg-1', label: 'Click "Generate Previews" in the Storyboard tab toolbar' },
      { id: 'pg-2', label: 'Option: regenerate only unlocked frames (skips locked frames)' },
      { id: 'pg-3', label: 'Frame 1 uses the Starting Image if provided (skips API call, saves cost)' },
      { id: 'pg-4', label: 'Frames 2+ use the selected Image Model and generation mode (auto/standalone/continuity)' },
      { id: 'pg-5', label: 'If Anchor Image set: all frames get "[Visual style: {description}]" prepended to prompts' },
      { id: 'pg-6', label: 'Review each frame\'s preview image for quality and consistency' },
      { id: 'pg-7', label: 'Use "Regen Preview" on individual frames to regenerate unsatisfactory previews' },
      { id: 'pg-8', label: 'Alternative: Click "Generate Grid" for a single coherent image sliced into per-frame previews' },
      { id: 'pg-9', label: 'Alternative: Click "Interpolate Grid" for bookend interpolation (first + last fixed, AI fills middle)' },
      { id: 'pg-10', label: 'Status updates: pending > generating > done/error per frame' },
    ],
  },
  {
    id: 'export-review',
    title: 'PDF Export & Client Review',
    icon: 'Share2',
    items: [
      { id: 'er-1', label: 'Click "Export PDF" to generate a review document with all frames, narrative, and settings' },
      { id: 'er-2', label: 'Download and send PDF to client for offline review' },
      { id: 'er-3', label: 'Click "Share Link" to generate a public review URL (/review/:token)' },
      { id: 'er-4', label: 'Copy the share link and send to client (no authentication required)' },
      { id: 'er-5', label: 'Client reviews the storyboard: sees all frames, narrative notes, dialogue, camera angles' },
      { id: 'er-6', label: 'Client can leave per-frame comments (note, approval, or change request type)' },
      { id: 'er-7', label: 'Client can leave general comments at the bottom' },
      { id: 'er-8', label: 'Client clicks "Approve for Production" (green) or "Request Changes" (amber)' },
      { id: 'er-9', label: 'Check review_status: approved → ready for production, changes_requested → iterate' },
    ],
  },
  {
    id: 'iterate',
    title: 'Iteration Cycle (If Changes Requested)',
    icon: 'RefreshCw',
    items: [
      { id: 'it-1', label: 'Review client comments on each frame' },
      { id: 'it-2', label: 'Unlock frames that need changes' },
      { id: 'it-3', label: 'Make requested edits to frame fields' },
      { id: 'it-4', label: 'Regenerate preview images for edited frames' },
      { id: 'it-5', label: 'Re-export PDF or update the shared review link' },
      { id: 'it-6', label: 'Repeat until client approves' },
    ],
  },
  {
    id: 'production',
    title: 'Production: Video Generation',
    icon: 'Film',
    items: [
      { id: 'pr-1', label: 'Verify storyboard status is "Ready" (approved by client)' },
      { id: 'pr-2', label: 'Switch to the Production tab' },
      { id: 'pr-3', label: 'Review preconditions: script exists (frames have visual prompts) and previews exist (frames have preview images)' },
      { id: 'pr-4', label: 'Click "Start Production" to begin video generation' },
      { id: 'pr-5', label: 'Monitor per-frame status: Pending (gray) > Generating (amber) > Done (green) / Error (red)' },
      { id: 'pr-6', label: 'Production polls status every 4 seconds automatically' },
      { id: 'pr-7', label: 'If a frame fails: review error message and click "Retry" on that frame' },
      { id: 'pr-8', label: 'Wait for all frames to complete (can take minutes to hours depending on model)' },
    ],
  },
  {
    id: 'production-audio',
    title: 'Production: Audio & Post-Processing',
    icon: 'Mic',
    items: [
      { id: 'pa-1', label: 'Voiceover Generation: TTS converts dialogue to audio (per-frame, using selected model + voice)' },
      { id: 'pa-2', label: 'Lipsync Applied: Selected lipsync model syncs mouth movement (if configured)' },
      { id: 'pa-3', label: 'Music Integration: Background music generated from mood description at configured volume' },
      { id: 'pa-4', label: 'Caption Overlay: Captions burned using selected style and timing' },
      { id: 'pa-5', label: 'Final Assembly: FFmpeg combines all per-frame videos, audio, captions, and music' },
      { id: 'pa-6', label: 'Both captioned and uncaptioned versions generated (if captions enabled)' },
    ],
  },
  {
    id: 'final-output',
    title: 'Final Output & Delivery',
    icon: 'CheckCircle2',
    items: [
      { id: 'fo-1', label: 'Storyboard status changes to "Complete"' },
      { id: 'fo-2', label: 'Download the assembled video (MP4)' },
      { id: 'fo-3', label: 'Download the captioned version (if captions were enabled)' },
      { id: 'fo-4', label: 'Click "Save to Library" to archive the video for future use' },
      { id: 'fo-5', label: 'Verify final video quality: visual consistency, lipsync alignment, caption timing, music levels' },
      { id: 'fo-6', label: 'Verify total duration matches the target length' },
      { id: 'fo-7', label: 'Upload to final platform or deliver to client' },
    ],
  },
  {
    id: 'status-ref',
    title: 'Status Progression Reference',
    icon: 'Monitor',
    items: [
      { id: 'sr-1', label: 'Draft — Initial state, configure settings' },
      { id: 'sr-2', label: 'Scripted — Script generated, frames populated with narrative + visual prompts' },
      { id: 'sr-3', label: 'Previewed — Preview images generated for all frames' },
      { id: 'sr-4', label: 'Ready — Client approved, ready for video production' },
      { id: 'sr-5', label: 'Producing — Video generation in progress (all settings locked)' },
      { id: 'sr-6', label: 'Complete — All done, final video available for download' },
      { id: 'sr-7', label: 'Failed — Production error, fix settings and retry' },
    ],
  },
];

const ICON_MAP = {
  Settings2, Sparkles, Type, Palette, Cpu, Users, Package, MapPin, Volume2,
  Eye, Layers, ImageIcon, Share2, RefreshCw, Film, Mic, CheckCircle2,
  Monitor,
};

const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ChecklistStoryboardPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const reset = useCallback(() => {
    setChecked({});
  }, []);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/storyboards')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Storyboard Checklist</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{completedCount} of {totalItems} completed</p>
          </div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#2C666E] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums w-10 text-right">{pct}%</span>
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Reset all">
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {completedCount === totalItems && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">All done! You've completed every step in the Storyboard tool.</p>
          </div>
        )}

        {SECTIONS.map((section) => {
          const Icon = ICON_MAP[section.icon] || Layers;
          const sectionDone = section.items.every((item) => checked[item.id]);
          const sectionCount = section.items.filter((item) => checked[item.id]).length;

          return (
            <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex-1">{section.title}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  sectionDone
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {sectionCount}/{section.items.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {section.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <label key={item.id} className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[#2C666E] focus:ring-[#2C666E] dark:bg-gray-800 shrink-0"
                      />
                      <span className={`text-sm leading-relaxed ${isChecked ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
