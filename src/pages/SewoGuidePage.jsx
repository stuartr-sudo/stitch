/**
 * SewoGuidePage — comprehensive guide for the SEWO Content Pipeline.
 *
 * Exported as SewoGuideContent for embedding in LearnPage.
 * Covers the full pipeline: topical maps, brand voice, article writing,
 * RAG knowledge base, pipeline monitoring, and publishing.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, AlertTriangle,
  Map, Mic, PenTool, Database, Activity, Send,
  BookOpen, Settings, Layers, GitBranch, Sparkles,
  FileText, BarChart3, Shield, Zap, Users, Target,
  CheckCircle, ArrowRight, RefreshCw, Clock,
} from 'lucide-react';

const CDN = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/sewo/';

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
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

function Tip({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex gap-2">
      <span className="shrink-0">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 flex gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Screenshot({ src, alt, caption }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <img src={src} alt={alt} className="w-full block" loading="lazy" />
      {caption && (
        <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          {caption}
        </p>
      )}
    </div>
  );
}

function Badge({ children, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.teal}`}>
      {children}
    </span>
  );
}

function PipelineArrow() {
  return <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mx-1" />;
}

// ── Main Guide ────────────────────────────────────────────────────────────────

export function SewoGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

      {/* ── Hero ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a3a3f] via-[#2C666E] to-[#3d8a94] p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0xNnYyaC00di0yaDR6TTIwIDM0djJoLTR2LTJoNHptMC0xNnYyaC00di0yaDR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SEWO Content Pipeline</h1>
              <p className="text-white/80 text-sm">AI-Powered Topical Authority Engine</p>
            </div>
          </div>
          <p className="text-white/90 leading-relaxed max-w-2xl">
            SEWO builds topical authority for brands and affiliate sites by generating comprehensive
            content clusters. From topic discovery to publication, every step is automated with
            human-quality writing grounded in real research.
          </p>

          {/* Pipeline flow visualization */}
          <div className="mt-6 flex flex-wrap items-center gap-1 text-xs font-medium">
            <Badge color="blue">Onboard</Badge><PipelineArrow />
            <Badge color="purple">Topical Map</Badge><PipelineArrow />
            <Badge color="teal">Outline</Badge><PipelineArrow />
            <Badge color="teal">Write</Badge><PipelineArrow />
            <Badge color="amber">Review</Badge><PipelineArrow />
            <Badge color="green">Flash</Badge><PipelineArrow />
            <Badge color="green">Publish</Badge>
          </div>
        </div>
      </div>

      <Screenshot src={CDN + '01-landing.jpg'} alt="SEWO landing page" caption="The SEWO landing page — your AI-powered content strategy engine" />

      {/* ── Pipeline Overview ── */}
      <Section icon={GitBranch} title="Pipeline Overview" defaultOpen={true}>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The SEWO pipeline transforms a brand into a topical authority through seven automated stages.
          Each article moves through a state machine that ensures quality at every step.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { state: 'Pending', desc: 'Article scheduled, waiting for its turn in the production queue', color: 'bg-gray-100 dark:bg-gray-700' },
            { state: 'Outlined', desc: 'RAG research retrieved, section structure generated from template', color: 'bg-blue-50 dark:bg-blue-950/30' },
            { state: 'Written', desc: '2-pass writer completes all sections with brand voice calibration', color: 'bg-teal-50 dark:bg-teal-950/30' },
            { state: 'Reviewed', desc: 'Voice review agent rewrites to remove AI patterns and enforce brand', color: 'bg-amber-50 dark:bg-amber-950/30' },
            { state: 'Flashing', desc: 'SEO meta, JSON-LD schema, and CMS publish in progress', color: 'bg-purple-50 dark:bg-purple-950/30' },
            { state: 'Published', desc: 'Live on Shopify, WordPress, GoHighLevel, or Supabase blog', color: 'bg-green-50 dark:bg-green-950/30' },
          ].map(s => (
            <div key={s.state} className={`${s.color} rounded-lg p-3`}>
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{s.state}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>

        <Tip>
          The pipeline runs every 5 minutes via cron. Each invocation processes as many articles
          as possible within a 4-minute time budget, prioritizing articles further along in the pipeline.
        </Tip>
      </Section>

      {/* ── Getting Started ── */}
      <Section icon={Settings} title="Getting Started — Workspace Setup">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Every brand starts with onboarding. The provisioner seeds the database with brand data,
          then SEWO takes over to build the content strategy.
        </p>

        <Step number={1} title="Provision a New Brand">
          <p>
            New brands are provisioned through the Blog Cloner (doubleclicker-1).
            One API call does everything: seeds brand guidelines, specifications, target market,
            integration credentials, and publishing settings into the shared Supabase database.
          </p>
        </Step>

        <Step number={2} title="Brand Voice Enrichment (Automatic)">
          <p>
            After provisioning, SEWO automatically enriches the brand voice profile. An LLM analyzes
            the brand data and any existing published articles to extract structured voice characteristics:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Formality</strong> — casual, casual-professional, or formal</li>
            <li><strong>Perspective</strong> — second person (you/your), third person, or first person</li>
            <li><strong>Personality traits</strong> — 3-5 traits like authoritative, warm, direct</li>
            <li><strong>Sentence style</strong> — preferred cadence, fragment usage, question style</li>
            <li><strong>Vocabulary preferences</strong> — words to prefer and avoid</li>
            <li><strong>Example sentences</strong> — 3-5 calibration examples in the brand's voice</li>
          </ul>
        </Step>

        <Step number={3} title="Launch Pipeline">
          <p>
            The pipeline launch triggers keyword discovery, topical map generation, RAG knowledge
            base building, and content scheduling. Articles are queued for production automatically.
          </p>
        </Step>

        <Warning>
          Brand voice enrichment runs <strong>before</strong> the pipeline launches. This ensures the very first
          articles use the structured voice profile, not just the basic provisioner data.
        </Warning>
      </Section>

      {/* ── Topical Map ── */}
      <Section icon={Map} title="Topical Map Generation">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The topical map is the foundation of topical authority. It creates a hub-and-spoke
          content architecture that search engines recognize as comprehensive expertise on a subject.
        </p>

        <Screenshot src={CDN + '02-content-strategy.jpg'} alt="Content Strategy view showing topical clusters" caption="The Content Strategy view showing hub-and-spoke topic clusters" />

        <Step number={1} title="Keyword Preparation">
          <p>
            Keywords from your keyword research are scored against the brand description using
            embedding similarity. Keywords that don't align with the brand are filtered out.
          </p>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono">
            Relevance threshold: 0.35 (with fallback to 0.25 if fewer than 20 keywords pass)
          </div>
          <Tip>
            The threshold was raised from 0.15 to 0.35 to eliminate off-brand topics. A safety valve
            automatically falls back to 0.25 if the brand description is too narrow.
          </Tip>
        </Step>

        <Step number={2} title="Theme Extraction">
          <p>
            An LLM groups filtered keywords into 4-6 MECE (Mutually Exclusive, Collectively Exhaustive) themes.
            Each theme becomes a potential sub-hub in the content architecture.
          </p>
          <p className="mt-2">
            <strong>Brand alignment validation:</strong> Every theme is checked against the brand embedding.
            Themes below 0.50 similarity are rejected — this prevents topics like "Career Coaching"
            appearing for a cold email brand.
          </p>
          <p className="mt-2">
            <strong>Theme dedup:</strong> Similar themes (above 0.75 similarity) are automatically merged.
            "Interview Success" and "Master Interviews" become one theme with combined keywords.
          </p>
        </Step>

        <Step number={3} title="Question Discovery">
          <p>
            For each theme, SEWO fetches People Also Ask (PAA) questions via DataForSEO.
            Questions are deduplicated semantically (0.82 threshold) and ranked for product alignment
            using Cohere reranking.
          </p>
        </Step>

        <Step number={4} title="Article Generation & Validation">
          <p>
            Article titles are generated per theme with intent classification. Every article goes through
            a comprehensive validation gate <strong>before</strong> any database write:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Title dedup — pairs above 0.80 similarity are merged</li>
            <li>Brand alignment — titles below 0.40 similarity are dropped</li>
            <li>Hub-spoke validation — 1 pillar, 4-5 sub-hubs, every hub has 3+ spokes</li>
            <li>Article cap — 24-60 articles enforced after all validation</li>
            <li>Unique question assignment — each PAA question maps to exactly one article</li>
          </ul>
        </Step>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Hub-and-Spoke Structure</h5>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 font-mono">
            <div>Pillar Article (1) — comprehensive master guide</div>
            <div className="pl-4">Sub-Hub A (3-12 children) — thematic cluster</div>
            <div className="pl-8">Child: tutorial, what_is, mistakes, cost_guide...</div>
            <div className="pl-4">Sub-Hub B (3-12 children) — thematic cluster</div>
            <div className="pl-8">Child: comparison, review, buyer_guide, listicle...</div>
            <div className="pl-4">Sub-Hub C (3-12 children) — thematic cluster</div>
            <div className="pl-8">Child: beginner_guide, checklist, stats_roundup...</div>
          </div>
        </div>
      </Section>

      {/* ── Brand Voice ── */}
      <Section icon={Mic} title="Brand Voice System">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Every article must sound distinctively like the brand it's written for. SEWO uses a structured
          voice profile that goes far beyond "professional and conversational."
        </p>

        <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/30 dark:to-blue-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">Example Brand Voice Profile</h5>
          <div className="text-xs text-gray-700 dark:text-gray-300 font-mono space-y-1">
            <div>BRAND VOICE PROFILE:</div>
            <div>- Formality: casual-professional</div>
            <div>- Perspective: second person (you/your)</div>
            <div>- Personality: authoritative, warm, direct</div>
            <div>- Sentence style: mix short punchy with medium explanatory. Fragments OK.</div>
            <div>- Prefer: "straightforward", "practical", "here's what works"</div>
            <div>- Avoid: jargon, corporate-speak, hedging</div>
            <div>- Example tone: "Here's what actually works for most teams..."</div>
          </div>
        </div>

        <Step number={1} title="Automatic Enrichment">
          <p>
            When a brand is onboarded, the enrichment endpoint analyzes brand guidelines, company
            information, and up to 5 published articles to extract structured voice fields.
            This runs automatically — no manual configuration needed.
          </p>
        </Step>

        <Step number={2} title="Brand Calibration">
          <p>
            Before writing each article, SEWO generates 3 topic-specific example sentences in the brand's
            voice. These calibration examples are injected into every section prompt, giving the LLM
            concrete "match this" anchors instead of abstract descriptions.
          </p>
        </Step>

        <Step number={3} title="Cross-Platform Sync">
          <p>
            Brand voice data syncs automatically to Stitch via a database trigger. When brand guidelines
            are updated in SEWO, Stitch's brand kit receives the latest voice data with zero manual effort.
          </p>
        </Step>

        <Tip>
          You can manually trigger voice enrichment at any time via the "Enrich Brand Voice" button
          in the Brand Guidelines Manager. This is useful after updating the brand description or
          publishing new articles that better represent the voice.
        </Tip>
      </Section>

      {/* ── Content Templates ── */}
      <Section icon={FileText} title="Content Templates — 26 Types">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          SEWO includes 26 article templates covering every content type for both brand and affiliate modes.
          Templates define section structure, writing rules, word targets, and element placement.
        </p>

        <div className="mt-4">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Brand Mode (16 templates)</h5>
          <div className="flex flex-wrap gap-2">
            {['Pillar', 'Sub-Hub', 'Tutorial', 'What Is', 'Beginner Guide', 'Cost Guide', 'Mistakes',
              'Comparison', 'Review', 'Alternatives', 'Listicle', 'Case Study', 'Stats Roundup',
              'Checklist', 'Is It Worth It', 'Buyer Guide'].map(t => (
              <Badge key={t} color="teal">{t}</Badge>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Affiliate Mode (10 templates)</h5>
          <div className="flex flex-wrap gap-2">
            {['Alternatives', 'Beginner Guide', 'Buyer Guide', 'Checklist', 'Cost Guide',
              'Is It Worth It', 'Mistakes', 'Review', 'Stats Roundup', 'What Is'].map(t => (
              <Badge key={t} color="purple">{t}</Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Affiliate templates use third-person voice with independent reviewer framing.
            Product recommendations are allowed by name. Brand templates use second-person voice
            and restrict product mentions to designated sections only.
          </p>
        </div>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Content Type Distribution</h5>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div className="font-medium text-gray-700 dark:text-gray-300">Affiliate: 70% informational / 30% commercial</div>
            <div className="font-medium text-gray-700 dark:text-gray-300">Brand: 100% authority-building</div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">What Each Template Controls</h5>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-1">
            <li><strong>Sections</strong> — ordered list of section roles (intro, problem, solution, conclusion) with word targets</li>
            <li><strong>Writing rules</strong> — voice, tone, sentence length rhythm, paragraph rules</li>
            <li><strong>Prohibited keywords</strong> — 50+ AI-sounding words like "gamechanger", "leverage", "seamless"</li>
            <li><strong>Prohibited patterns</strong> — structural AI tells like "Whether you're X or Y", "From X to Y" ranges</li>
            <li><strong>Elements</strong> — TLDR/TOC, product cards, infographics, FAQ accordion, case studies</li>
            <li><strong>Flash config</strong> — schema types, SEO settings, publish targets</li>
          </ul>
        </div>
      </Section>

      {/* ── Article Writing Pipeline ── */}
      <Section icon={PenTool} title="Article Writing Pipeline">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Each article is written through a multi-step process: outline generation, 2-pass section writing,
          post-processing, and element assembly.
        </p>

        <Step number={1} title="Outline Generation">
          <p>
            The outliner loads the article's template, fetches RAG research (75 candidates reranked to 55),
            fetches PAA questions, and asks an LLM to fill the template with specific, research-grounded
            section titles, descriptions, and keywords.
          </p>
          <p className="mt-2">
            Parallel element generation fires alongside: infographics (Ideogram V3), contextual images
            (Imagineer), case studies, and comparison tables.
          </p>
          <Tip>
            The outline is validated before saving. Missing titles, empty system prompts, or broken
            structure prompts are caught and reported as errors — preventing malformed outlines from
            entering the pipeline.
          </Tip>
        </Step>

        <Step number={2} title="Section Writing (2-Pass)">
          <p>
            Each section is written sequentially with its own RAG context (55 candidates reranked to 40):
          </p>
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2">
              <Badge color="blue">Pass 1</Badge>
              <span>Write — generates content from RAG + template using gpt-4.1 (temp 0.8)</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge color="purple">Pass 2</Badge>
              <span>Edit + Humanize — verifies accuracy, fixes flow, breaks AI cadence patterns using gpt-4.1 (temp 0.65)</span>
            </div>
          </div>
          <p className="mt-2">
            <strong>Content protection:</strong> If Pass 2 shrinks content by more than 40%, it automatically
            reverts to Pass 1 output — preventing over-zealous editing.
          </p>
          <p className="mt-2">
            <strong>Diversity scoring:</strong> Between sections, SEWO checks opening sentence patterns.
            If two consecutive sections start the same way, a diversity warning is injected into the next
            section's prompt.
          </p>
        </Step>

        <Step number={3} title="Post-Processing">
          <p>A single consolidated cleanup pass handles everything:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Prohibited word replacement (50+ words with contextual alternatives: "robust" becomes "strong")</li>
            <li>External link stripping (keeps internal /blog/ links and brand product links)</li>
            <li>Citation marker removal ([N] references cleaned up)</li>
            <li>Bare URL removal (URLs not inside href/src attributes)</li>
            <li>Markdown artifact conversion (** to bold, * to italic)</li>
            <li>Placeholder removal (INFOGRAPHIC INSERTION POINT, etc.)</li>
            <li>Character cleanup (ellipsis normalization, non-breaking spaces)</li>
          </ul>
        </Step>

        <Step number={4} title="Element Assembly">
          <p>The final article is assembled in this order:</p>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono space-y-1">
            <div>1. Key Takeaways (TLDR + Table of Contents)</div>
            <div>2. Product Card (if positioned after TLDR)</div>
            <div>3. All written sections (with inline images and case studies)</div>
            <div>4. Product Card (if positioned after solution section)</div>
            <div>5. FAQ Accordion (5-7 questions with RAG-grounded answers)</div>
            <div>6. Author Bio</div>
            <div>7. Sources Block</div>
            <div>8. Affiliate Disclosure (if applicable)</div>
            <div>9. YMYL Disclaimer (auto-detected for finance/health topics)</div>
          </div>
        </Step>

        <Step number={5} title="Resumable Writing">
          <p>
            Articles save progress after each section. If the 4-minute time budget runs out mid-article,
            it saves what's done and resumes from the next section on the next cron invocation.
            No work is ever lost.
          </p>
        </Step>
      </Section>

      {/* ── RAG Knowledge Base ── */}
      <Section icon={Database} title="RAG Knowledge Base">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Every article is grounded in real research via the RAG (Retrieval Augmented Generation) system.
          Content is ingested from SERP results, Reddit discussions, product documentation, and more.
        </p>

        <Step number={1} title="Content Ingestion">
          <p>
            Content is chunked intelligently (preserving document hierarchy), embedded via OpenAI
            text-embedding-3-large (3,072 dimensions), and stored in PostgreSQL with pgvector.
            Incremental ingestion uses content hashing to avoid re-processing unchanged content.
          </p>
        </Step>

        <Step number={2} title="Hybrid Retrieval">
          <p>Three-signal retrieval combines dense semantic search, lexical keyword search, and
            Reciprocal Rank Fusion for comprehensive results:</p>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono space-y-1">
            <div>Outline: k=75 candidates, rerank to 55, assemble 55 chunks</div>
            <div>Writer:  k=55 candidates, rerank to 40, assemble 40 chunks per section</div>
            <div>FAQ:     k=15 candidates, rerank to 8 per question</div>
          </div>
        </Step>

        <Step number={3} title="Reranking & Diversity">
          <p>
            Results are reranked using HuggingFace BGE (primary) or Cohere rerank-v3.5 (fallback).
            Source diversity is enforced — maximum 3 chunks per URL by default (configurable).
            Context expansion adds neighboring chunks from top sources for richer context.
          </p>
        </Step>

        <Step number={4} title="Context Caching">
          <p>
            RAG results are cached on the article row after outline generation. The writer checks
            the cache before re-querying (24-hour TTL). When new knowledge chunks are ingested
            for a user, all article caches are automatically invalidated.
          </p>
          <Tip>
            Caching dramatically reduces API costs and latency for multi-section articles.
            The outline's RAG context is reused across sections instead of re-querying 55 chunks
            per section.
          </Tip>
        </Step>
      </Section>

      {/* ── Pipeline Monitoring ── */}
      <Section icon={Activity} title="Pipeline Monitoring & Reliability">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The pipeline runs autonomously with built-in error recovery, quality gates, and stuck article detection.
        </p>

        <Screenshot src={CDN + '03-articles-preview.jpg'} alt="Published articles preview" caption="Published articles accessible via the public preview route" />

        <Step number={1} title="State Machine">
          <p>
            The daily writer cron processes articles through states in priority order
            (most-advanced first). Each invocation handles as many transitions as possible
            within a 4-minute time budget.
          </p>
        </Step>

        <Step number={2} title="Structured Error Recovery">
          <p>Errors are categorized for appropriate handling:</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2">
              <Badge color="amber">Transient</Badge>
              <span className="text-sm">Timeouts, 503s, rate limits — auto-retry next invocation</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge color="red">Permanent</Badge>
              <span className="text-sm">Bad data, missing templates — marked failed for human review</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge color="blue">Partial</Badge>
              <span className="text-sm">Time budget exceeded — saves progress, resumes next invocation</span>
            </div>
          </div>
        </Step>

        <Step number={3} title="Quality Gate">
          <p>
            Before publishing, every article passes an inline quality check:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Word count minimum: 800 words</li>
            <li>Section count minimum: 3 H2 sections</li>
            <li>Paragraph tags present</li>
            <li>No empty sections (H2 followed immediately by another H2)</li>
          </ul>
          <p className="mt-2">
            Articles that fail the quality gate stay in "reviewed" state and are retried.
            They are never published in a broken state.
          </p>
        </Step>

        <Step number={4} title="Stuck Article Recovery">
          <p>
            Articles stuck in a processing state for more than 10 minutes are automatically reset
            so the next cron invocation retries them. Flash (which takes 5-8 minutes) gets a longer
            30-minute grace period.
          </p>
        </Step>

        <Warning>
          If the quality gate repeatedly fails for a brand, check the brand's RAG knowledge base.
          Low word count usually means insufficient RAG context — run "Build RAG" in the Knowledge tab
          to re-ingest content.
        </Warning>
      </Section>

      {/* ── Publishing ── */}
      <Section icon={Send} title="Publishing — Flash Pipeline">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Flash is the final step: SEO optimization, schema generation, and CMS publishing.
          It's intentionally thin — all content enhancement happens during writing.
        </p>

        <Step number={1} title="SEO Meta Generation">
          <p>
            Generates meta title, meta description, slug, excerpt, focus keyword, and tags
            from the article content. Only the first 5,000 characters are analyzed for efficiency.
          </p>
        </Step>

        <Step number={2} title="Schema (JSON-LD)">
          <p>
            Generates Article and FAQ structured data schemas. Schema types are determined by the
            template's flash config. If no meta description was generated, it creates a fallback
            from the first 155 characters of content.
          </p>
        </Step>

        <Step number={3} title="Multi-CMS Publishing">
          <p>Auto-detects the configured CMS from integration credentials and publishes:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge color="green">Shopify</Badge>
            <Badge color="blue">WordPress</Badge>
            <Badge color="purple">GoHighLevel</Badge>
            <Badge color="amber">Custom API</Badge>
            <Badge color="teal">Supabase Blog</Badge>
          </div>
        </Step>

        <Tip>
          For Shopify stores, Flash also handles blog category mapping. Newsjack articles can override
          the blog category via the intelligence config's <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">newsjack_blog_category</code> setting.
        </Tip>
      </Section>

      {/* ── Strategy Launcher ── */}
      <Section icon={Target} title="Strategy Launcher — Command Center">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          The Strategy Launcher is your central hub for managing the entire content pipeline.
          It provides 16+ tabs covering every aspect of content strategy.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            { tab: 'Content Map', desc: 'Visual cluster hierarchy' },
            { tab: 'Schedule', desc: 'Calendar publishing view' },
            { tab: 'Pipeline', desc: 'Real-time throughput' },
            { tab: 'Knowledge', desc: 'RAG status & management' },
            { tab: 'Performance', desc: 'Content analytics' },
            { tab: 'Link Graph', desc: 'Internal linking map' },
            { tab: 'Comparisons', desc: 'Product comparison gen' },
            { tab: 'Expand Topics', desc: 'Keyword expansion' },
            { tab: 'Signals', desc: 'Trending topics' },
            { tab: 'Costs', desc: 'Pipeline cost tracking' },
            { tab: 'Settings', desc: 'Workspace config' },
            { tab: 'Newsjack', desc: 'Breaking news content' },
          ].map(t => (
            <div key={t.tab} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-gray-100">{t.tab}</div>
              <div className="text-gray-500 dark:text-gray-400">{t.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Per-Brand Feature Flags ── */}
      <Section icon={Shield} title="Feature Flags & Safe Rollout">
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          New pipeline features are rolled out per-brand using the <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">app_settings</code> table.
          This means you can enable v2 features for one brand while keeping others on v1.
        </p>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono">
          <div className="text-gray-500">-- Enable v2 topical map for a specific brand:</div>
          <div className="mt-1">INSERT INTO app_settings (setting_name, setting_value)</div>
          <div>VALUES ('topical_map_version:mybrand', '"v2"')</div>
          <div>ON CONFLICT (setting_name) DO UPDATE SET setting_value = '"v2"';</div>
        </div>

        <div className="mt-4">
          <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Rollback</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Every feature has a clean rollback path. Old code is never deleted until new code is proven.
          </p>
          <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li><strong>Topical Map:</strong> Flip flag back to "v1" — old pipeline still works</li>
            <li><strong>Brand Voice:</strong> New columns are nullable — writer falls back to voice_and_tone</li>
            <li><strong>Templates:</strong> Delete new templates — old ones still loaded</li>
            <li><strong>RAG Cache:</strong> Cache columns nullable — writer falls through to live query</li>
            <li><strong>Quality Gate:</strong> Can be disabled via app_settings per brand</li>
          </ul>
        </div>
      </Section>

      {/* ── Tips & Troubleshooting ── */}
      <Section icon={Zap} title="Tips & Troubleshooting">
        <div className="mt-3 space-y-4">

          <div>
            <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Articles stuck in "outlining" or "writing"</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Check the Knowledge tab — insufficient RAG context is the most common cause.
              Run "Build RAG" to re-ingest content. Articles stuck for more than 10 minutes
              are automatically reset and retried.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Off-brand topics in the topical map</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Enable v2 topical map (set <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">topical_map_version</code> to "v2").
              The v2 pipeline validates every theme and article against the brand description before creation.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Articles sound too "AI"</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Run "Enrich Brand Voice" in the Brand Guidelines Manager. The enriched profile
              with personality traits and example sentences dramatically improves voice consistency.
              Also check that the article's template has comprehensive prohibited_keywords and
              prohibited_patterns lists.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Quality gate rejecting articles</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              The quality gate requires: 800+ words, 3+ sections, paragraph tags, no empty sections.
              If articles consistently fail, the RAG knowledge base may be too thin for the topic.
              Add more content sources via the Knowledge tab.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Stitch not picking up brand voice changes</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Brand voice syncs to Stitch automatically via a database trigger.
              If sync seems stale, update any field on the brand's guidelines page
              to re-trigger the sync.
            </p>
          </div>

        </div>
      </Section>

    </div>
  );
}
