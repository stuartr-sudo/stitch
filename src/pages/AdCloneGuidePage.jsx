/**
 * AdCloneGuidePage — comprehensive guide for the Ad Clone Studio tool.
 *
 * Covers: analyzing competitor video ads, extracting ad strategy,
 * generating clone recipes, and routing to Ads Manager or Shorts Workbench.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Scissors, Zap, Megaphone, Heart,
  Clock, Eye, Film, Music, Lightbulb, Target, Smartphone,
  AlertTriangle, Image as ImageIcon, ArrowRight, Copy,
  BookOpen, Settings, Layers,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/clone-ad/';

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

// ── Main guide content ──

export function AdCloneGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-[#2C666E]/10 dark:bg-[#2C666E]/20 rounded-xl">
            <Scissors className="w-6 h-6 text-[#2C666E] dark:text-[#5AABB5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ad Clone Studio</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyze any video ad and clone its strategy for your brand</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge icon={Film} label="Video Analysis" color="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
          <Badge icon={Target} label="Ad Strategy" color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" />
          <Badge icon={Scissors} label="Clone Recipe" color="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />
          <Badge icon={Megaphone} label="Ads Manager" color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />
        </div>
      </div>

      {/* Overview */}
      <Section icon={BookOpen} title="What is Ad Clone Studio?" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ad Clone Studio lets you reverse-engineer any video advertisement. Paste a competitor's video URL, and the AI will:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>Extract key frames from the video</li>
            <li>Transcribe all spoken audio</li>
            <li>Identify the hook technique, CTA style, and emotional triggers</li>
            <li>Map the ad structure timeline (intro, problem, solution, CTA, etc.)</li>
            <li>Infer the target audience and platform optimizations</li>
            <li>Generate a complete <strong>Clone Recipe</strong> adapted to your brand</li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The clone recipe includes a suggested hook, visual style, duration, and full script outline that you can send directly to <strong>Ads Manager</strong> or the <strong>Shorts Workbench</strong> with one click.
          </p>
        </div>
      </Section>

      {/* Where to find it */}
      <Section icon={Layers} title="Where to Find It" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ad Clone Studio is available from two locations:
          </p>
          <Step number={1} title="Video Ad Creator sidebar">
            <p>Open the <strong>Video Ad Creator</strong> (Studio page). In the left sidebar under <strong>Video Tools</strong>, click <strong>Clone Ad</strong>.</p>
            <Screenshot file="01-sidebar-clone-ad.jpg" alt="Clone Ad button in sidebar" caption="The Clone Ad button in the Video Ad Creator sidebar, under Video Tools" />
          </Step>
          <Step number={2} title="Ads Manager header">
            <p>Navigate to <strong>Ads Manager</strong> (/ads). The <strong>Clone Ad</strong> button appears in the top toolbar alongside New Campaign.</p>
            <Screenshot file="03-ads-manager-button.jpg" alt="Clone Ad button in Ads Manager" caption="Clone Ad button in the Ads Manager header toolbar" />
          </Step>
        </div>
      </Section>

      {/* Input */}
      <Section icon={Settings} title="Setting Up an Analysis" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            When you open Ad Clone Studio, you'll see a slide-over panel with three input fields:
          </p>
          <Screenshot file="02-input-form.jpg" alt="Ad Clone input form" caption="The Ad Clone Studio input form with URL, duration, and brand kit fields" />

          <Step number={1} title="Video Ad URL">
            <p>Paste the direct URL to any video ad. This must be a direct video file URL (ending in .mp4, .webm, etc.) — not a YouTube or social media page URL. The video is downloaded, frames are extracted, and the audio is transcribed automatically.</p>
          </Step>

          <Step number={2} title="Estimated Duration">
            <p>Enter the approximate length of the video in seconds (5–120). This helps the frame extraction algorithm space its samples evenly. It doesn't need to be exact — the AI compensates for slight mismatches.</p>
          </Step>

          <Step number={3} title="Brand Kit (optional)">
            <p>Select one of your saved Brand Kits from the dropdown. When a brand kit is selected, the clone recipe will be <strong>adapted to your brand</strong> — using your brand name, tone, colors, and messaging pillars to rewrite the script outline and visual direction.</p>
            <Tip>If you haven't created a brand kit yet, you can skip this. The recipe will be generic but still useful. Create a brand kit from the Brand Kit tool to unlock brand-adapted recipes.</Tip>
          </Step>

          <Step number={4} title="Click Analyze Ad">
            <p>Click the teal <strong>Analyze Ad</strong> button. The analysis takes 20–40 seconds and runs through three stages:</p>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
              <li>Extracting frames and transcribing audio</li>
              <li>Running base video analysis</li>
              <li>Analyzing ad strategy and generating clone recipe</li>
            </ol>
            <p>Progress text updates below the button as each stage completes.</p>
          </Step>
        </div>
      </Section>

      {/* Results: Frames */}
      <Section icon={ImageIcon} title="Extracted Frames">
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            After analysis, a grid of extracted frames appears at the top of the results. These are evenly sampled from the video and give you a visual overview of the ad's progression. The frames are displayed in a 4-column grid.
          </p>
          <Tip>These frames are for reference only — they are not saved to your library. If you want to save a reference image, right-click and copy it.</Tip>
        </div>
      </Section>

      {/* Results: Ad Analysis */}
      <Section icon={Target} title="Ad-Specific Analysis">
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The ad-specific analysis is the core value of the Clone tool. It breaks down the advertising strategy into several components:
          </p>

          <div className="space-y-4 mt-4">
            <div className="border-l-4 border-red-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-500" /> Hook Technique
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Identifies how the ad grabs attention in the first few seconds. Displayed in a red-orange gradient card. Examples: "Pattern interrupt with unexpected visual", "Question that challenges assumption", "Emotional story opening".
              </p>
            </div>

            <div className="border-l-4 border-emerald-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-500" /> CTA Style
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Describes the call-to-action approach. Displayed in a green gradient card. Examples: "Urgency-driven with limited-time offer", "Social proof with testimonial", "Direct command with benefit".
              </p>
            </div>

            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" /> Product Showcase
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Describes how the product or service is presented visually. Collapsible section. Covers demonstration style, feature highlighting approach, and visual hierarchy.
              </p>
            </div>

            <div className="border-l-4 border-purple-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Heart className="w-4 h-4 text-purple-500" /> Emotional Triggers
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Lists the emotional levers the ad pulls. Shown as purple pill badges. Examples: "FOMO", "Aspiration", "Trust", "Curiosity", "Fear of missing out".
              </p>
            </div>

            <div className="border-l-4 border-amber-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Ad Structure Timeline
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                A color-coded horizontal timeline bar showing each section of the ad (Hook, Problem, Solution, Social Proof, CTA, etc.) with start/end timestamps. Each section has a description. This is open by default — it's the most actionable part of the analysis.
              </p>
            </div>

            <div className="border-l-4 border-cyan-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-500" /> Inferred Target Audience
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                The AI's best guess at who the ad is targeting, based on the language, visuals, and messaging.
              </p>
            </div>

            <div className="border-l-4 border-indigo-400 pl-4">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" /> Platform Optimizations
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Collapsible list of platform-specific techniques detected (e.g., "Vertical format optimized for TikTok", "Caption-heavy for silent autoplay on Facebook", "First 3s hook for Instagram Reels skip rate").
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Results: Base Video Analysis */}
      <Section icon={Film} title="Base Video Analysis">
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Below the ad-specific analysis, a general video breakdown appears in collapsible sections:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2 mt-2">
            <li><strong>Script Structure</strong> — Key-value pairs describing the narrative arc (opening, body, close), voice register, and pacing.</li>
            <li><strong>Scenes</strong> — Each scene listed with timestamp, description, camera angle, framing, and movement direction. Displayed with a teal left-border accent.</li>
            <li><strong>Visual Style</strong> — Color palette, lighting style, and overall mood.</li>
            <li><strong>Audio Design</strong> — Music type, voiceover style, and sound effects used.</li>
            <li><strong>What Works</strong> — Bulleted list of the AI's assessment of the ad's strengths.</li>
            <li><strong>Transcript</strong> — Full transcription of all spoken audio, with a copy-to-clipboard button.</li>
          </ul>
          <Tip>The transcript is especially useful if you want to study the competitor's exact wording and adapt it for your own scripts.</Tip>
        </div>
      </Section>

      {/* Clone Recipe */}
      <Section icon={Scissors} title="The Clone Recipe" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The Clone Recipe is the final output — a brand-adapted strategy for recreating the ad's approach with your own content. It appears in a highlighted teal-bordered card at the bottom of the results.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            If you selected a Brand Kit, the recipe header shows "adapted for [Brand Name]".
          </p>

          <div className="space-y-3 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipe Components</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div><strong>Suggested Hook</strong> — A rewritten hook adapted to your brand, displayed in a white card.</div>
                <div><strong>Visual Style</strong> — Recommended cinematography and visual approach.</div>
                <div><strong>Duration</strong> — Optimal length in seconds for the recreated ad.</div>
                <div><strong>Script Outline</strong> — A scene-by-scene breakdown, each with:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li>Scene label (e.g., "Hook", "Problem", "Solution")</li>
                    <li>Duration in seconds</li>
                    <li>Narration text (what to say)</li>
                    <li>Visual direction (what to show)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Action Buttons */}
      <Section icon={ArrowRight} title="Taking Action on Your Recipe" defaultOpen={true}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Two action buttons appear at the bottom of the Clone Recipe:
          </p>

          <Step number={1} title="Clone to Ads Manager">
            <p>
              Creates a new campaign in the <strong>Ads Manager</strong> pre-populated with the recipe data. The campaign name includes the brand name (if set) or inferred audience, the objective is set to "conversions", and platforms default to LinkedIn + Meta. The script outline is used as the product description.
            </p>
            <p>You'll be redirected to the new campaign editor where you can refine the copy, generate images, and publish.</p>
          </Step>

          <Step number={2} title="Clone to Shorts">
            <p>
              Navigates to the <strong>Shorts Workbench</strong> with pre-filled parameters from the recipe — niche, duration, and topic are set automatically. From there, you can generate a full AI video based on the cloned strategy.
            </p>
            <Tip>Use "Clone to Shorts" when you want a complete AI-generated video ad. Use "Clone to Ads Manager" when you want text/image ad variations across platforms.</Tip>
          </Step>
        </div>
      </Section>

      {/* Tips and Best Practices */}
      <Section icon={Lightbulb} title="Tips & Best Practices">
        <div className="space-y-3 mt-3">
          <Tip>
            <strong>Use direct video URLs.</strong> Social media page URLs (YouTube, TikTok, Instagram) won't work — you need the direct .mp4 or .webm URL. Use a video downloader tool to get the direct link first.
          </Tip>
          <Tip>
            <strong>Set a Brand Kit for personalized recipes.</strong> Without a brand kit, the clone recipe is generic. With one, it adapts the hook, script, and visual style to match your brand voice.
          </Tip>
          <Tip>
            <strong>Duration estimate doesn't need to be perfect.</strong> The system uses it for frame spacing. Being within 10 seconds is fine — the analysis quality won't suffer.
          </Tip>
          <Tip>
            <strong>Study the Ad Structure Timeline first.</strong> It's the most actionable output. Understanding how the competitor structures their ad (hook → problem → solution → CTA) is more valuable than individual details.
          </Tip>
          <Warning>
            <strong>Cloning is about strategy, not copying.</strong> The tool extracts structural patterns and techniques — it doesn't reproduce copyrighted content. Use the recipe as inspiration to create original ads with proven structures.
          </Warning>
        </div>
      </Section>
    </div>
  );
}
