/**
 * MotionTransferGuidePage — guide for Motion Transfer in Shorts Workbench + Storyboards.
 *
 * Covers: what Motion Transfer is, WAN 2.2 vs Kling V3 Pro, MotionReferenceInput walkthrough,
 * VideoTrimmer, using MT in Shorts Workbench (Step 4) and Storyboards (frame detail panel),
 * best practices for reference videos, and a generation placeholder.
 */

import React from 'react';
import {
  Film, Wand2, Scissors, AlertTriangle, Lightbulb, Play,
  CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/motion/';

// ── Reusable primitives ────────────────────────────────────────────────────

function Tip({ children }) {
  return (
    <div className="flex gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xs font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-0.5">{title}</p>
        <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>
      </div>
    </div>
  );
}

function Screenshot({ src, alt, caption }) {
  return (
    <figure className="my-4">
      <img
        src={CDN + src}
        alt={alt}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        loading="lazy"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#2C666E] shrink-0" />
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Main guide content ─────────────────────────────────────────────────────

export function MotionTransferGuideContent() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10 space-y-10">

      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-full mb-4">
          <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Motion Transfer</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Motion Transfer
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base">
          Apply motion from a reference video to your AI-generated scenes.
        </p>
      </div>

      {/* ── What Is Motion Transfer ─────────────────────────────── */}
      <section>
        <SectionHeading icon={Wand2} title="What Is Motion Transfer?" />
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Instead of letting the AI decide how to animate your keyframe, Motion Transfer lets you
            specify a reference video whose motion pattern is transferred to your new scene. The
            camera movements, subject motion, and pacing from your reference video are replicated
            in the new generation — with your AI-generated visuals.
          </p>
        </Card>
      </section>

      {/* ── Two Models ──────────────────────────────────────────── */}
      <section>
        <SectionHeading icon={Play} title="Two Models" />

        <Screenshot
          src="03-model-selector.jpg"
          alt="Motion Transfer model selector showing WAN 2.2 and Kling V3 Pro"
          caption="Model selector inside the Motion Reference panel"
        />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Model</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Cost</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">What It Controls</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Best For</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-[10px] font-bold">Budget</span>
                    WAN 2.2
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">~$0.02–0.04</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Motion pattern transfer — replicates the general movement pattern</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Quick, affordable motion guidance</td>
              </tr>
              <tr className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/30">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-bold">Premium</span>
                    Kling V3 Pro Motion Ctrl
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">~$0.06–0.08</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Full orientation + motion control — precise camera and subject tracking</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">High-fidelity motion replication</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── MotionReferenceInput Walkthrough ────────────────────── */}
      <section>
        <SectionHeading icon={Scissors} title="MotionReferenceInput Walkthrough" />

        <Screenshot
          src="02-motion-reference-input.jpg"
          alt="MotionReferenceInput component showing video URL input and upload button"
          caption="The Motion Reference panel — paste a URL or browse your library"
        />

        <Card className="space-y-5 mt-4">
          <Step number="1" title="Upload a video or paste a URL">
            Click the folder icon to browse your media library, or paste a direct video URL into
            the input. This is your reference video — the motion source.
          </Step>
          <Step number="2" title="Trim to the relevant segment">
            Once the video URL is entered, the VideoTrimmer appears below. Use the range slider to
            select which segment of the reference video to use — just the relevant 2–5 seconds.
            The trimmed segment is sent as the motion reference.
          </Step>
          <Step number="3" title="Choose your model and confirm">
            Select WAN 2.2 (budget) or Kling V3 Pro (premium). For Kling, also choose Character
            Orientation: Match Image keeps your character's pose, Match Video lets orientation
            follow the reference. Then generate.
          </Step>
        </Card>

        <Screenshot
          src="04-video-trimmer.jpg"
          alt="VideoTrimmer component with range handles for selecting segment"
          caption="VideoTrimmer — drag the handles to select just the motion segment you need"
        />

        <div className="mt-3">
          <Tip>
            Keep your reference segment short and clean — 2–5 seconds with a single clear motion.
            Complex multi-motion references confuse the model.
          </Tip>
        </div>
      </section>

      {/* ── In Shorts Workbench ─────────────────────────────────── */}
      <section>
        <SectionHeading icon={Film} title="In Shorts Workbench (Step 4)" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          In Step 4 (Video Clips), each scene card has an "Add Motion Reference" button at the
          bottom. Click it to expand the MotionReferenceInput for that scene. Upload your reference
          video, trim it to the key motion segment, and generate. All scenes use their own
          reference — you can mix Motion Transfer scenes with standard I2V or FLF scenes in the
          same project.
        </p>

        <Screenshot
          src="01-motion-transfer-step4.jpg"
          alt="Shorts Workbench Step 4 showing Add Motion Reference button on a scene card"
          caption="Step 4 — each scene card shows the Add Motion Reference option"
        />

        <Tip>
          Shorts Workbench always forces audio off for Motion Transfer clips — it has its own
          voiceover and music system. The reference audio is never included in the final Short.
        </Tip>
      </section>

      {/* ── In Storyboards ──────────────────────────────────────── */}
      <section>
        <SectionHeading icon={Wand2} title="In Storyboards" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Open any frame's detail panel in the Storyboard tab. The "Add Motion Reference" button
          appears alongside Camera Control and other generation controls. Per-frame Motion Transfer
          lets different scenes have different reference motions — a dance scene can use a
          choreography clip while other scenes use standard generation.
        </p>

        <Screenshot
          src="05-storyboard-frame-mt.jpg"
          alt="Storyboard frame detail panel showing Add Motion Reference button"
          caption="Storyboard frame detail — Add Motion Reference appears in the production controls"
        />

        <Screenshot
          src="06-mt-result.jpg"
          alt="Motion Reference panel open inside a storyboard frame"
          caption="Motion Reference panel open inside a storyboard frame — configure model, trim, and generate"
        />

        <Tip>
          Unlike Shorts, Storyboard gives you control over the audio toggle. If your reference
          video has music or sound you want to keep, turn on "Keep Original Sound" for that frame.
        </Tip>
      </section>

      {/* ── Best Reference Videos ───────────────────────────────── */}
      <section>
        <SectionHeading icon={CheckCircle2} title="Best Reference Videos" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-3">Do</p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {[
                'Clear single-subject motion (one person walking, one camera push)',
                'Consistent camera — no jump cuts within the segment',
                'Good contrast and clear depth in the frame',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase mb-3">Avoid</p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {[
                'Handheld shaky footage — the shake transfers to your scene',
                'Multiple simultaneous subjects with different motions',
                'Extreme lighting changes within the segment',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* ── Generation placeholder ──────────────────────────────── */}
      <section>
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center bg-gray-50/50 dark:bg-gray-800/30">
          <Film className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
            Live Motion Transfer result
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
            Generate a clip using Motion Transfer to see it appear here
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
        Motion Transfer powered by FAL.ai — WAN 2.2 and Kling V3 Pro Motion Control
      </div>
    </div>
  );
}

export default function MotionTransferGuidePage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      <MotionTransferGuideContent />
    </div>
  );
}
