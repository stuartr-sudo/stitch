/**
 * VideoAnalyzerGuidePage — comprehensive guide for the Video Analyzer tool.
 *
 * Covers: Quick Analysis, Deep Analysis, all result sections,
 * recreation config, and routing to Shorts Workbench.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Search, Zap, Microscope, Film,
  Clock, Eye, Music, Lightbulb, AlertTriangle, Image as ImageIcon,
  ArrowRight, Copy, BookOpen, Settings, Layers, Palette, Move,
  Star, Type,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/video-analyzer/';

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

// ── Screenshot ──

function Screenshot({ file, alt, caption }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <img
        src={`${CDN}${file}`}
        alt={alt}
        className="w-full block"
        loading="lazy"
      />
      {caption && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 italic">
          {caption}
        </div>
      )}
    </div>
  );
}

// ── Comparison table ──

function ModeComparison() {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-2.5 text-gray-700 dark:text-gray-300 font-semibold">Feature</th>
            <th className="text-center px-4 py-2.5 text-gray-700 dark:text-gray-300 font-semibold">
              <span className="inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Quick</span>
            </th>
            <th className="text-center px-4 py-2.5 text-gray-700 dark:text-gray-300 font-semibold">
              <span className="inline-flex items-center gap-1"><Microscope className="w-3.5 h-3.5" /> Deep</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {[
            ['Frames extracted', '6', '12'],
            ['Script Structure', 'Yes', 'Yes'],
            ['Scene Breakdown', 'Yes', 'Yes'],
            ['Pacing Analysis', 'Yes', 'Yes'],
            ['Visual Style', 'Yes', 'Yes'],
            ['Audio Design', 'Yes', 'Yes'],
            ['What Works', 'Yes', 'Yes'],
            ['Transcript', 'Yes', 'Yes'],
            ['Recreation Config', 'Yes', 'Yes'],
            ['Scene Transitions', '—', 'Yes'],
            ['Text Overlays', '—', 'Yes'],
            ['Color Grading', '—', 'Yes'],
            ['Motion Analysis', '—', 'Yes'],
            ['Production Quality Score', '—', 'Yes'],
            ['Typical time', '~15s', '~30s'],
          ].map(([feature, quick, deep], i) => (
            <tr key={i} className="bg-white dark:bg-gray-800">
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{feature}</td>
              <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{quick}</td>
              <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{deep}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main guide content ──

export function VideoAnalyzerGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-[#2C666E]/10 dark:bg-[#2C666E]/20 rounded-xl">
            <Search className="w-6 h-6 text-[#2C666E] dark:text-[#5AABB5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Video Analyzer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Get a full structural breakdown of any video</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge icon={Zap} label="Quick Analysis" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
          <Badge icon={Microscope} label="Deep Analysis" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
          <Badge icon={Film} label="Scene Breakdown" color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" />
          <Badge icon={ArrowRight} label="Recreate in Shorts" color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />
        </div>
      </div>

      {/* Overview */}
      <Section icon={BookOpen} title="What is Video Analyzer?" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Video Analyzer performs a structural breakdown of any video URL. Unlike Ad Clone Studio (which focuses on advertising strategy), Video Analyzer is a general-purpose video analysis tool suitable for any type of video — ads, tutorials, short films, social content, or product demos.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            It extracts frames, transcribes audio, and provides detailed analysis of script structure, scenes, pacing, visual style, and audio design. The <strong>Deep Analysis</strong> mode adds scene transitions, text overlays, color grading, motion analysis, and production quality scoring.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Every analysis also generates a <strong>Recreation Config</strong> — suggested settings for recreating the video in the Shorts Workbench with one click.
          </p>
        </div>
      </Section>

      {/* Where to find it */}
      <Section icon={Layers} title="Where to Find It" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Video Analyzer is available from the <strong>Video Ad Creator</strong> (Studio page). In the left sidebar under <strong>Video Tools</strong>, click <strong>Video Analyzer</strong>.
          </p>
          <Screenshot file="03-sidebar-video-analyzer.jpg" alt="Video Analyzer button in sidebar" caption="The Video Analyzer button in the Video Ad Creator sidebar" />
        </div>
      </Section>

      {/* Input & Modes */}
      <Section icon={Settings} title="Setting Up an Analysis" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The Video Analyzer slide-over panel has three inputs and a mode selector:
          </p>
          <Screenshot file="01-input-form.jpg" alt="Video Analyzer input form" caption="Input form with URL, duration, and analysis mode toggle" />

          <Step number={1} title="Video URL">
            <p>Paste a direct video URL (.mp4, .webm, etc.). The video is downloaded server-side for frame extraction and audio transcription.</p>
          </Step>

          <Step number={2} title="Estimated Duration">
            <p>Enter the approximate video length in seconds (5–120). Used for frame timing — doesn't need to be exact.</p>
          </Step>

          <Step number={3} title="Analysis Mode">
            <p>Toggle between two analysis depths:</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-blue-800 dark:text-blue-300">Quick Analysis</strong>
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">(default)</span>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">6 frames, basic structure — script, scenes, pacing, visual style, audio, transcript. Fast (~15s).</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <Microscope className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-purple-800 dark:text-purple-300">Deep Analysis</strong>
                  <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">12 frames, everything in Quick plus: scene transitions, text overlays, color grading, motion analysis, and production quality scoring (1–10). Takes ~30s.</p>
                </div>
              </div>
            </div>
          </Step>

          <Step number={4} title="Click Analyze Video">
            <p>Hit the teal button. Progress text updates below the button during processing.</p>
            <Screenshot file="02-analyze-button.jpg" alt="Analyze Video button" caption="The Analyze Video button with the mode-aware label" />
          </Step>
        </div>
      </Section>

      {/* Mode Comparison */}
      <Section icon={Layers} title="Quick vs Deep — Feature Comparison">
        <ModeComparison />
        <Tip>Use <strong>Quick Analysis</strong> when you just need the structure and want results fast. Use <strong>Deep Analysis</strong> when you're studying production quality, color grading, or transition techniques in detail.</Tip>
      </Section>

      {/* Results: Common */}
      <Section icon={Film} title="Analysis Results (Both Modes)">
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Both Quick and Deep modes produce these result sections, all in collapsible panels:
          </p>

          <div className="space-y-4 mt-4">
            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Film className="w-4 h-4 text-blue-500" /> Script Structure
                <span className="text-xs text-gray-400">(open by default)</span>
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Key-value pairs describing the narrative arc — opening style, body structure, closing technique, voice register, and pacing approach.
              </p>
            </div>

            <div className="border-l-4 border-teal-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" /> Scenes
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Each scene listed with timestamp, description, camera angle, framing, and movement. Teal left-border accent on each entry.
              </p>
            </div>

            <div className="border-l-4 border-amber-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Pacing
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Average scene duration and overall rhythm descriptor (e.g., "Fast-paced with quick cuts", "Slow build with held shots").
              </p>
            </div>

            <div className="border-l-4 border-indigo-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" /> Visual Style
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Color palette, lighting approach, and mood assessment.
              </p>
            </div>

            <div className="border-l-4 border-pink-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Music className="w-4 h-4 text-pink-500" /> Audio Design
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Music type, voiceover style, and notable sound effects.
              </p>
            </div>

            <div className="border-l-4 border-yellow-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" /> What Works
                <span className="text-xs text-gray-400">(open by default)</span>
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Bulleted list of the AI's assessment of the video's strengths — what makes it effective.
              </p>
            </div>

            <div className="border-l-4 border-gray-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Copy className="w-4 h-4 text-gray-500" /> Transcript
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Full audio transcription in a scrollable container with a copy-to-clipboard button.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Results: Deep Only */}
      <Section icon={Microscope} title="Deep Analysis Extras">
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deep Analysis adds five additional result sections that only appear when available:
          </p>

          <div className="space-y-4 mt-4">
            <div className="border-l-4 border-purple-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-500" /> Scene Transitions
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Each transition between scenes: type (cut, dissolve, fade, wipe, etc.), timestamp, and description. Displayed with purple left-border accents and type badges.
              </p>
            </div>

            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-500" /> Text Overlays
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                All on-screen text detected — timestamp, position (top, center, lower-third, etc.), the text content, and its visual style (font weight, color, animation).
              </p>
            </div>

            <div className="border-l-4 border-rose-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-rose-500" /> Color Grading
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Dominant color palette (shown as pill badges), contrast level, saturation level, and overall color mood. Useful for replicating the video's color tone.
              </p>
            </div>

            <div className="border-l-4 border-green-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Move className="w-4 h-4 text-green-500" /> Motion Analysis
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Per-scene breakdown of camera movement, subject movement, and speed (slow, medium, fast). Green left-border accents with speed badges.
              </p>
            </div>

            <div className="border-l-4 border-yellow-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" /> Production Quality
                <span className="text-xs text-gray-400">(open by default)</span>
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Scoring bars (1–10) for four dimensions:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-1 ml-4">
                <li><strong>Lighting</strong> — Quality and consistency of lighting</li>
                <li><strong>Composition</strong> — Framing, rule of thirds, visual balance</li>
                <li><strong>Audio Mix</strong> — Voice clarity, music balance, sound quality</li>
                <li><strong>Overall</strong> — Composite production quality</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Bars are color-coded: green (8+), yellow (6–7), orange (4–5), red (&lt;4). May include additional notes from the AI.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Recreation Config */}
      <Section icon={ArrowRight} title="Recreation Config & Shorts Workbench" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Every analysis (Quick or Deep) generates a <strong>Recreation Config</strong> — a teal-highlighted card at the bottom of results with suggested settings for recreating the video:
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><strong className="text-gray-700 dark:text-gray-300">Niche</strong> — Best-fit niche from the 20 available (e.g., "ai_tech_news", "fitness_wellness")</div>
              <div><strong className="text-gray-700 dark:text-gray-300">Framework</strong> — Suggested video style framework to match the source</div>
              <div><strong className="text-gray-700 dark:text-gray-300">Visual Style</strong> — Recommended visual style preset</div>
              <div><strong className="text-gray-700 dark:text-gray-300">Scene Count</strong> — How many scenes to use</div>
              <div><strong className="text-gray-700 dark:text-gray-300">Duration</strong> — Target duration in seconds</div>
              <div><strong className="text-gray-700 dark:text-gray-300">Music Mood</strong> — Recommended background music mood</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            Click <strong>Recreate in Shorts Workbench</strong> to jump directly to the Shorts Workbench with the niche, duration, and topic pre-filled. From there you can generate a complete AI video that mirrors the source video's structure.
          </p>
          <Tip>The Recreation Config is especially powerful for studying viral content. Analyze a trending video, then recreate it with your own brand and message in under 5 minutes.</Tip>
        </div>
      </Section>

      {/* Tips */}
      <Section icon={Lightbulb} title="Tips & Best Practices">
        <div className="space-y-3 mt-3">
          <Tip>
            <strong>Use direct video URLs.</strong> The analyzer needs a direct video file (.mp4, .webm). Social media page URLs won't work — extract the direct link first.
          </Tip>
          <Tip>
            <strong>Start with Quick, go Deep when needed.</strong> Quick Analysis gives you 90% of the value in half the time. Switch to Deep when you need production quality scores, color grading details, or motion analysis.
          </Tip>
          <Tip>
            <strong>Study the "What Works" section.</strong> It's the most actionable quick-read — a distilled list of why the video is effective.
          </Tip>
          <Tip>
            <strong>Copy the transcript.</strong> Use the copy button to grab the full transcript for script inspiration or competitor analysis documentation.
          </Tip>
          <Tip>
            <strong>Use Recreation Config for rapid content creation.</strong> The one-click "Recreate in Shorts Workbench" button is the fastest path from analysis to production.
          </Tip>
          <Warning>
            <strong>Analysis quality depends on video quality.</strong> Low-resolution or heavily compressed videos may produce less accurate scene breakdowns and visual style analysis.
          </Warning>
        </div>
      </Section>

      {/* Comparison with Ad Clone */}
      <Section icon={Layers} title="Video Analyzer vs Ad Clone Studio">
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Both tools analyze videos, but they serve different purposes:
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-2.5 text-gray-700 dark:text-gray-300 font-semibold"></th>
                  <th className="text-center px-4 py-2.5 text-gray-700 dark:text-gray-300 font-semibold">
                    <span className="inline-flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Video Analyzer</span>
                  </th>
                  <th className="text-center px-4 py-2.5 text-gray-700 dark:text-gray-300 font-semibold">
                    <span className="inline-flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> Ad Clone</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ['Focus', 'General video structure', 'Ad strategy & cloning'],
                  ['Best for', 'Any video type', 'Competitor video ads'],
                  ['Hook/CTA analysis', 'No', 'Yes'],
                  ['Emotional triggers', 'No', 'Yes'],
                  ['Ad Structure Timeline', 'No', 'Yes'],
                  ['Brand Kit integration', 'No', 'Yes'],
                  ['Deep Analysis mode', 'Yes', 'No'],
                  ['Production Quality scoring', 'Yes (Deep)', 'No'],
                  ['Color Grading', 'Yes (Deep)', 'No'],
                  ['Output', 'Recreation Config', 'Clone Recipe + routing'],
                  ['Routes to', 'Shorts Workbench', 'Ads Manager or Shorts'],
                ].map(([feature, va, ac], i) => (
                  <tr key={i} className="bg-white dark:bg-gray-800">
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">{feature}</td>
                    <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{va}</td>
                    <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{ac}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tip>
            <strong>Use Video Analyzer</strong> to study any video's structure and production quality. <strong>Use Ad Clone Studio</strong> specifically when you want to reverse-engineer a competitor's ad and create your own version.
          </Tip>
        </div>
      </Section>
    </div>
  );
}
