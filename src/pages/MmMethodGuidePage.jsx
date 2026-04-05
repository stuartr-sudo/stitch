import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, AlertTriangle, Info, Lightbulb,
  TrendingUp, Clock, BarChart3, Target, Shield, Layers, Activity,
  Zap, Eye, Calendar, ArrowUpDown, GitBranch, Brain, DollarSign,
  Repeat, CheckCircle2, XCircle, Gauge, Timer, Crosshair,
} from 'lucide-react';

/* ── Shared helper components (same as other guide pages) ── */

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
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

function KeyValue({ label, value, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    green: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200',
    teal: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200',
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">{label}</span>
      <span className={`px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>{value}</span>
    </div>
  );
}

function DiagramBox({ children, className = '' }) {
  return (
    <pre className={`bg-gray-900 dark:bg-gray-950 text-emerald-400 dark:text-emerald-300 rounded-lg p-4 text-xs font-mono overflow-x-auto my-3 ${className}`}>
      {children}
    </pre>
  );
}

function TableWrapper({ children }) {
  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        {children}
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`px-3 py-2 text-xs text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 ${className}`}>{children}</td>;
}

function Badge({ text, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    green: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${colors[color]}`}>{text}</span>;
}

function PhaseCard({ phase, timing, description, icon: Icon, color = 'teal' }) {
  const borderColors = {
    teal: 'border-teal-400 dark:border-teal-600',
    red: 'border-red-400 dark:border-red-600',
    amber: 'border-amber-400 dark:border-amber-600',
    blue: 'border-blue-400 dark:border-blue-600',
    purple: 'border-purple-400 dark:border-purple-600',
  };
  return (
    <div className={`border-l-4 ${borderColors[color]} rounded-r-lg bg-gray-50 dark:bg-gray-900 p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">{phase}</span>
        {timing && <span className="text-[10px] text-gray-400 dark:text-gray-500">({timing})</span>}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════════════════
   MAIN GUIDE CONTENT
   ════════════════════════════════════════════════════════════════════════════ */

export function MmMethodGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">

      {/* ═══════════════════════════════════════════════════════════════════
          HERO / OVERVIEW
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-6 mb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Market Makers Method (MM Method)</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Institutional trading strategy &mdash; complete reference guide</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          The MM Method is a systematic approach to trading based on how institutional Market Makers move price.
          It uses repeatable weekly cycles, M/W formations, 3-level swings, and session timing to identify high-probability
          entries with 4:1 to 10:1 risk-to-reward ratios. This guide covers every concept from the Trade by Design course,
          plus the tarakta implementation (10 modules, 6,642 lines of algorithmic trading code).
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge text="55 Lessons Synthesized" color="teal" />
          <Badge text="10 Modules Built" color="blue" />
          <Badge text="6,642 Lines" color="purple" />
          <Badge text="192 Tests Passing" color="green" />
          <Badge text="Zero LLM Calls" color="amber" />
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════════════════
          1. CORE PHILOSOPHY
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Brain} title="Core Philosophy" defaultOpen={true}>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Price is not random. It follows a repeatable business model operated by institutional Market Makers
            (Citadel, Jump Crypto, Virtue Financial, Cumberland) who work in 6-8 hour shifts across three global sessions.
            The MM Method decodes this business model into tradeable rules.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
              <h4 className="font-semibold text-xs text-emerald-800 dark:text-emerald-200 mb-2">Why MMs Must Move Price</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                <li className="flex gap-1.5"><span className="text-emerald-500">&#x2022;</span>Cannot use limit orders (visible walls tip off traders)</li>
                <li className="flex gap-1.5"><span className="text-emerald-500">&#x2022;</span>Cannot use market orders (moves price too much against them)</li>
                <li className="flex gap-1.5"><span className="text-emerald-500">&#x2022;</span>Must hit stop losses &amp; liquidation levels to fill their positions</li>
                <li className="flex gap-1.5"><span className="text-emerald-500">&#x2022;</span>Have deadlines set by IMF/World Bank: weekly, monthly, seasonal</li>
              </ul>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <h4 className="font-semibold text-xs text-amber-800 dark:text-amber-200 mb-2">Key Axioms</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
                <li className="flex gap-1.5"><span className="text-amber-500">&#x2022;</span><strong>Slow = REAL.</strong> Slow price action is the true move</li>
                <li className="flex gap-1.5"><span className="text-amber-500">&#x2022;</span><strong>Fast = FAKE.</strong> Fast spikes are traps (stop hunts)</li>
                <li className="flex gap-1.5"><span className="text-amber-500">&#x2022;</span>MM can do anything midweek &mdash; target met by Friday 5pm NY</li>
                <li className="flex gap-1.5"><span className="text-amber-500">&#x2022;</span>Same pattern repeats on every timeframe (fractal)</li>
              </ul>
            </div>
          </div>

          <InfoBox>
            <strong>Expected performance:</strong> ~2 trades/week per asset, each held ~3 days.
            R:R of 4:1 to 10:1 typical (up to 20:1). At 4:1, you only need 3 wins out of 10 to be profitable.
          </InfoBox>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          2. THE WEEKLY CYCLE
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Calendar} title="The Weekly Cycle Template">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            The MM operates on a predictable weekly business cycle. Every week follows the same template &mdash;
            knowing where you are in the cycle is the single most important factor for entry timing.
          </p>

          <DiagramBox>{`Sun 5pm NY ──────────────────────────────────────── Fri 5pm NY
    │                                                      │
    ▼                                                      ▼
┌─────────┐  ┌──────┐  ┌──────────────────┐  ┌──────┐  ┌─────────┐
│ Weekend  │→ │ FMWB │→ │ 3-Day / 3-Level  │→ │ Mid- │→ │ Friday  │
│  Trap    │  │      │  │  Swing Trade     │  │ week │  │  Trap   │
│(sideways)│  │(false│  │                  │  │ Rev. │  │ (UK)    │
│          │  │ move)│  │ L1 → L2 → L3    │  │      │  │         │
└─────────┘  └──────┘  └──────────────────┘  └──────┘  └─────────┘`}</DiagramBox>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Phase Breakdown</h4>
          <div className="space-y-2">
            <PhaseCard
              phase="Weekend Trap"
              timing="Fri 5pm → Sun 5pm NY"
              description="Sideways consolidation with a spike stop hunt near the end. MMs clear weekend positions. Mark the trap box (candle closes, not wicks) to identify who got trapped."
              icon={Timer}
              color="purple"
            />
            <PhaseCard
              phase="False Move Week Beginning (FMWB)"
              timing="Sun 5pm NY open"
              description="Aggressive trap move to stop out weekend traders and build MM positions. For crypto: at/near Sunday 5pm NY. For forex: UK/US open Monday. This is the FALSE move — trade against it."
              icon={Zap}
              color="red"
            />
            <PhaseCard
              phase="M or W Formation"
              timing="After FMWB"
              description="The entry pattern. M = bearish (High → Lower High), W = bullish (Low → Higher Low). Must form at session changeovers (gap times). Entry on the 2nd peak."
              icon={Activity}
              color="teal"
            />
            <PhaseCard
              phase="3-Level Swing"
              timing="~3 days"
              description="Level 1 → Board Meeting → Level 2 → Board Meeting → Level 3. Each level liquidates progressively less leveraged traders. This is where profits are made."
              icon={TrendingUp}
              color="teal"
            />
            <PhaseCard
              phase="Midweek Reversal"
              timing="Wed/Thu (crypto), Wed (forex)"
              description="Direction change, usually timed with a news event. M or W forms at Level 3 of the initial swing, signalling the new direction. Another entry opportunity."
              icon={Repeat}
              color="amber"
            />
            <PhaseCard
              phase="Friday Trap"
              timing="UK session Friday"
              description="UK opens with false move, runs trend 4-6 hours, repeats initial level by end of UK session. This IS the weekend trap forming. Exit positions here."
              icon={Timer}
              color="purple"
            />
          </div>

          <Warning>
            <strong>Do NOT enter during FMWB</strong> &mdash; it&apos;s the false move designed to trap you.
            Wait for the M/W formation to develop after the FMWB completes.
          </Warning>

          <Tip>
            The tarakta engine tracks all 11 cycle phases via a state machine in <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">mm_weekly_cycle.py</code> (1,165 lines).
            It automatically determines HOW (High of Week) and LOW (Low of Week) and uses them as key levels.
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          3. SESSION TIMING
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Clock} title="Session Timing">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            All times are in New York time (immutable regardless of DST).
            MMs work in shifts &mdash; each session has a different personality.
            The 30-minute gaps between sessions are <strong>session changeovers</strong> where M/W formations should form.
          </p>

          <TableWrapper>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Gap (Handover)</Th>
                <Th>Open</Th>
                <Th>Close</Th>
                <Th>Behaviour</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td className="font-medium">Dead Zone</Td>
                <Td>&mdash;</Td>
                <Td>5:00pm</Td>
                <Td>8:00pm</Td>
                <Td>All MMs off duty. Low volume. Manipulable by bots. <strong>Never trade.</strong></Td>
              </tr>
              <tr>
                <Td className="font-medium">Asia</Td>
                <Td>8:00&ndash;8:30pm</Td>
                <Td>8:30pm</Td>
                <Td>3:00am</Td>
                <Td>Creates daily range (HOD/LOD). Typically sideways. BTC range &le;2% = normal.</Td>
              </tr>
              <tr>
                <Td className="font-medium">UK</Td>
                <Td>3:00&ndash;3:30am</Td>
                <Td>3:30am</Td>
                <Td>9:00am</Td>
                <Td>Runs the TRUE trend. Slow, steady price action. Most reliable session.</Td>
              </tr>
              <tr>
                <Td className="font-medium">US</Td>
                <Td>9:00&ndash;9:30am</Td>
                <Td>9:30am</Td>
                <Td>5:00pm</Td>
                <Td>Continues OR reverses UK trend. Ends in consolidation (trap).</Td>
              </tr>
            </tbody>
          </TableWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Week begins</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Sunday 5pm NY</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Week ends</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Friday 5pm NY</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Day boundary</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">5pm NY each day</p>
            </div>
          </div>

          <Warning>
            <strong>If BTC&apos;s Asia range exceeds 2%</strong>, skip the day entirely. This indicates a session shift
            (unusual volatility) and the normal MM cycle is disrupted.
          </Warning>

          <Tip>
            M/W formations <strong>must form during gap times</strong> (session changeovers) to be reliable.
            Finding them elsewhere is lower probability. Multi-session M/W (peaks in different sessions) = strongest setup.
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          4. M AND W FORMATIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Activity} title="M and W Formations">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            The M/W formation is the core entry pattern. <strong>W = bullish</strong> (Low &rarr; Higher Low &rarr; entry long).
            <strong> M = bearish</strong> (High &rarr; Lower High &rarr; entry short). Five variants exist, each with different
            reliability and risk characteristics.
          </p>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Three MM Appearances Confirm the Formation</h4>
          <div className="space-y-2">
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Stopping Volume Candle (SVC)</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Small body, large wick in trend direction, very high volume at Level 3. Mark the zone &mdash; price should not fully return.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Inside Right Side (drop one timeframe)</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Look for 3 trap candles: 3 green candles for M formation, 3 red candles for W formation.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">50 EMA Break With Volume</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Final confirmation. Price must break and close beyond the 50 EMA on above-average volume.</p>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-4">Five Formation Variants</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Standard M/W</span>
                <Badge text="Reliable" color="green" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Classic double-top/bottom. 2nd peak must NOT reach 1st peak. Wait for candle close as hammer/engulfing before entering.</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Multi-Session M/W</span>
                <Badge text="Strongest" color="teal" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">1st peak in one session, 2nd peak in another (e.g., Asia peak &rarr; UK open peak). Found at HOW/LOW = weekly reversal signal with tight SL and massive R:R.</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Final Damage M/W</span>
                <Badge text="Aggressive" color="amber" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">2nd peak makes a LOWER low (W) or HIGHER high (M) than 1st peak. Must be a hammer on 15min. Better R:R but higher probability of being wrong.</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Board Meeting M/W</span>
                <Badge text="Relaxed" color="blue" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Forms inside consolidation between levels. Does NOT need full standard criteria (no SVC, no 3 inside hits). Just the shape is sufficient.</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Three Hits Rule</span>
                <Badge text="Reversal Signal" color="purple" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                3 tests of HOW or LOW without breaking &rarr; reversal imminent (must be at Level 3). 4 hits &rarr; continuation/breakout likely.
                Hits must be in DIFFERENT sessions (max 2 per session). After each hit, price must move away then return.
              </p>
            </div>
          </div>

          <Warning>
            <strong>M/W is NOT confirmed until it successfully retests.</strong> Spikes must pull away quickly (that&apos;s how the trap works).
            2nd peak must NOT reach the 1st peak &mdash; MM keeps traders trapped.
          </Warning>

          <Tip>
            The tarakta engine detects all 5 variants in <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">mm_formations.py</code> (1,290 lines) with a quality scoring system.
            Quality threshold is 0.4 minimum for the engine to consider acting.
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          5. THE 3 LEVELS
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Layers} title="The 3-Level System">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            After a confirmed M/W formation, price moves in 3 levels (bursts/fast movements identified by abnormally high volume).
            Always count to 3 levels. A 4th level (Extended Rise/Drop) almost always brings correction.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shrink-0">L1</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Level 1 &mdash; Liquidates 100x leverage</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Breaks 50 EMA with volume. Target: 50 EMA (counter-trend TP), then 200 EMA. First unrecovered Vector candle.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <span className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm flex items-center justify-center shrink-0">L2</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Level 2 &mdash; Liquidates 50x leverage</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Runs to 200 EMA. Board Meeting between L1&ndash;L2. Move SL to breakeven when L2 starts. Target: 800 EMA.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <span className="w-8 h-8 rounded-full bg-purple-500 text-white font-bold text-sm flex items-center justify-center shrink-0">L3</span>
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Level 3 &mdash; Liquidates 25x leverage</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Trend acceleration &mdash; EMAs fan out, price extends far from EMAs. Look for SVC + wick shift = reversal. Target: Higher TF EMA (200/800).</p>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">Board Meetings (Between Levels)</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Consolidation zones between levels where the MM accumulates contracts. Like a corporate board meeting &mdash;
            directors pause, plan, then execute the next phase. Two types:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Retracement Board Meeting</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Price retraces. Use Fibonacci: stagger orders at 38.2%, 50%, 61.8%. SL above prior level peak.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Sideways Board Meeting</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Price consolidates horizontally. Look for M/W shape inside (relaxed criteria). Stop hunt comes at END, not beginning.</p>
            </div>
          </div>

          <Tip>
            <strong>Wick behaviour shift at Level 3:</strong> Wicks move from one side of candles to the other (e.g., bottom wicks &rarr; top wicks).
            This signals the MM is exhausting their push and reversal is near.
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          6. EMA FRAMEWORK
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={TrendingUp} title="EMA Framework (5 EMAs)">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Five Exponential Moving Averages are used on ALL timeframes. They act as dynamic support/resistance
            and provide trend confirmation at each level.
          </p>

          <TableWrapper>
            <thead>
              <tr><Th>EMA</Th><Th>Role</Th><Th>Color (TBD)</Th><Th>Level Function</Th></tr>
            </thead>
            <tbody>
              <tr>
                <Td className="font-medium">10</Td>
                <Td>Fast &mdash; first cross on entry</Td>
                <Td><span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[10px]">Turquoise</span></Td>
                <Td>Entry signal</Td>
              </tr>
              <tr>
                <Td className="font-medium">20</Td>
                <Td>Fast &mdash; confirmation</Td>
                <Td><span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px]">Red</span></Td>
                <Td>Entry confirmation</Td>
              </tr>
              <tr>
                <Td className="font-medium">50</Td>
                <Td>Mid &mdash; Level 1 break target, retest level</Td>
                <Td><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px]">Blue</span></Td>
                <Td>Level 1 confirmation (MUST break with volume)</Td>
              </tr>
              <tr>
                <Td className="font-medium">200</Td>
                <Td>Slow &mdash; Level 2 target, reversal on hammer</Td>
                <Td><span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px]">Yellow</span></Td>
                <Td>Level 2 target, take profit zone on rejection</Td>
              </tr>
              <tr>
                <Td className="font-medium">800</Td>
                <Td>Slow &mdash; Level 2/3 target</Td>
                <Td><span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px]">Purple</span></Td>
                <Td>Level 2/3 target, major trend direction</Td>
              </tr>
            </tbody>
          </TableWrapper>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">EMA Cycle Through Levels</h4>
          <DiagramBox>{`Entry:   Price crosses 10 and 20 EMA (on 2nd M/W peak)
   ↓
Level 1: Breaks 50 EMA with volume ← MUST HAVE VOLUME
   ↓
Board Meeting: Retraces to 50 EMA (10 EMA only = caution)
   ↓
Level 2: Runs to 200 EMA. Hammer rejection here = TP zone
   ↓
Board Meeting: Retests 50 EMA
   ↓
Level 3: EMAs fan out. Price extends far from EMAs.
         Gap between price and EMAs = magnetic attraction → reversion`}</DiagramBox>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Trend Ending Signals</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 ml-4">
            <li className="list-disc">EMAs flatten (stop pointing in trend direction)</li>
            <li className="list-disc">Stopping Volume Candle appears</li>
            <li className="list-disc">Large gap between price and EMAs = magnetic attraction &rarr; reversion coming</li>
          </ul>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          7. ENTRY RULES
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Crosshair} title="Entry Rules">
        <div className="mt-4 space-y-4">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Two Entry Types</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border-l-4 border-amber-400 dark:border-amber-600 rounded-r-lg bg-amber-50 dark:bg-amber-950/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Aggressive Entry</span>
                <Badge text="R:R 4:1–7.8:1" color="amber" />
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>&bull; Enter when candle CLOSES as hammer/engulfing on 2nd peak</li>
                <li>&bull; SL above 1st peak wick (M) or below 1st peak wick (W)</li>
                <li>&bull; Higher R:R but requires more skill</li>
              </ul>
            </div>
            <div className="border-l-4 border-blue-400 dark:border-blue-600 rounded-r-lg bg-blue-50 dark:bg-blue-950/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Conservative Entry</span>
                <Badge text="R:R 2.7:1–9.8:1" color="blue" />
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>&bull; Wait for 50 EMA break with volume (Level 1 confirmed)</li>
                <li>&bull; Enter on retest of 50 EMA or board meeting entry</li>
                <li>&bull; SL above 2nd peak of M/W or just clearing a stop hunt</li>
              </ul>
            </div>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">Four Retest Conditions (need &ge;2 for entry)</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            After Level 1, price must retrace to a combination of at least 2:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { num: '1', text: 'The 50 EMA' },
              { num: '2', text: 'The vector that created the Level 1 move' },
              { num: '3', text: 'A higher low (W) or lower high (M)' },
              { num: '4', text: 'A heat map / liquidation level cluster' },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                <span className="w-5 h-5 rounded-full bg-[#2C666E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{item.num}</span>
                <span className="text-xs text-gray-700 dark:text-gray-300">{item.text}</span>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">Board Meeting Entries</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Retracement Board Meeting</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fibonacci from peak to trough: stagger orders at 38.2%, 50%, 61.8%. SL above the peak of prior level.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Sideways Board Meeting</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Look for M/W shape inside consolidation. Stop hunt at END of board meeting, not beginning.</p>
            </div>
          </div>

          <Warning>
            <strong>When NOT to enter:</strong>
            <ul className="mt-1 space-y-0.5">
              <li>&bull; R:R below 1.4:1 &rarr; &ldquo;don&apos;t get out of bed&rdquo;</li>
              <li>&bull; Friday after 5pm NY market close</li>
              <li>&bull; No clear M/W and no clear 3 levels &rarr; skip</li>
              <li>&bull; After only Level 1 drop &mdash; do NOT counter-trend trade from 200 EMA back</li>
              <li>&bull; Asia BTC range &gt;2% &rarr; skip the day</li>
            </ul>
          </Warning>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          8. STOP LOSS RULES
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Shield} title="Stop Loss Rules">
        <div className="mt-4 space-y-4">
          <TableWrapper>
            <thead>
              <tr><Th>Scenario</Th><Th>Stop Loss Placement</Th></tr>
            </thead>
            <tbody>
              <tr><Td className="font-medium">W formation</Td><Td>Below the low of the candle preceding the 1st spike, OR below LOD</Td></tr>
              <tr><Td className="font-medium">M formation</Td><Td>Above the high of the candle preceding the 1st spike, OR above HOD</Td></tr>
              <tr><Td className="font-medium">After stop hunt</Td><Td>Just clear of the stop hunt (MM won&apos;t return)</Td></tr>
              <tr><Td className="font-medium">Conservative entry</Td><Td>Above 2nd peak of M/W, or clearing 50 EMA + wicks</Td></tr>
              <tr><Td className="font-medium">Board meeting</Td><Td>Below 1st peak of W (or above for M) + clear the 50 EMA</Td></tr>
            </tbody>
          </TableWrapper>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Stop Loss Management Through Levels</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-[10px] font-bold flex items-center justify-center shrink-0">L1</span>
              <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Level 1 complete:</strong> SL stays at entry. Do NOT move to breakeven yet.</p>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">L2</span>
              <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Level 2 starts:</strong> NOW move SL to breakeven (entry price). Running: SL under 50 EMA.</p>
            </div>
            <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">L3</span>
              <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Level 3:</strong> SL trails under recent structure (last 10 candles with small buffer).</p>
            </div>
          </div>

          <Warning>
            <strong>NEVER tighten SL to improve R:R</strong> &mdash; SL goes where it needs to go.
            NEVER increase SL during a trade. Only move SL to breakeven AFTER Level 2 starts (not before).
          </Warning>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">The Refund Zone</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Only applies when entering on 2nd peak M/W. If price CLOSES below the wick of the 2nd peak W (or above for M):
            formation invalidated &rarr; <strong>cut immediately</strong>. Tiny loss, wait for the real M/W to form.
          </p>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          9. TARGETS & EXITS
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Target} title="Targets and Exit Strategy">
        <div className="mt-4 space-y-4">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Level Targets</h4>
          <TableWrapper>
            <thead>
              <tr><Th>Level</Th><Th>Primary Target</Th><Th>Secondary Target</Th></tr>
            </thead>
            <tbody>
              <tr><Td className="font-medium">Level 1</Td><Td>50 EMA (counter-trend TP), then 200 EMA</Td><Td>First unrecovered Vector candle</Td></tr>
              <tr><Td className="font-medium">Level 2</Td><Td>800 EMA</Td><Td>Previous unrecovered Vector candle</Td></tr>
              <tr><Td className="font-medium">Level 3</Td><Td>Higher TF EMA (200 or 800 on higher TF)</Td><Td>Previous HOW/LOW + unrecovered Vector</Td></tr>
            </tbody>
          </TableWrapper>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Partial Profit Schedule</h4>
          <div className="flex gap-3">
            {[
              { level: 'L1', pct: '30%', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
              { level: 'L2', pct: '50%', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
              { level: 'L3', pct: '100%', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
            ].map((t) => (
              <div key={t.level} className={`flex-1 rounded-lg ${t.bg} p-3 text-center`}>
                <p className={`font-bold text-lg ${t.text}`}>{t.pct}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Close at {t.level}</p>
              </div>
            ))}
          </div>

          <InfoBox>
            <strong>R:R is calculated to Level 1 target only</strong> &mdash; anything beyond is bonus.
            At Level 3, look for SVC &rarr; take at least some profit.
            Every SL movement point = also a partial profit point.
          </InfoBox>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Target Identification Tools</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 ml-4">
            <li className="list-disc"><strong>Fixed Range Volume Profile (FRVP):</strong> Identify imbalance zones (crevices = targets)</li>
            <li className="list-disc"><strong>Unrecovered Vector candles:</strong> Price targets (imbalance persists until consolidation fills the zone)</li>
            <li className="list-disc"><strong>Liquidation levels:</strong> Front-run clusters (e.g., cluster at 25,000 &rarr; TP at 24,950)</li>
            <li className="list-disc"><strong>EMA convergence zones:</strong> Where multiple EMAs cluster = strong magnet</li>
          </ul>

          <Tip>
            <strong>Friday exit rule:</strong> Friday UK session = exit when peak formation appears during UK close.
            If only 2 levels by Friday, hold through weekend ONLY if SL can be moved without ruining R:R.
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          10. VOLUME & ORDER FLOW
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={BarChart3} title="Volume and Order Flow (PVSRA)">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            The PVSRA (Price Volume Spread Range Analysis) system identifies when Market Makers are actively
            moving price. Only MMs can spike volume by 150-200% in a single candle.
          </p>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Vector Candle Classification</h4>
          <TableWrapper>
            <thead>
              <tr><Th>Type</Th><Th>Volume Threshold</Th><Th>Meaning</Th></tr>
            </thead>
            <tbody>
              <tr>
                <Td><span className="px-2 py-0.5 rounded bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 text-[10px] font-semibold">RED</span> / <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 text-[10px] font-semibold">GREEN</span></Td>
                <Td className="font-medium">200% of 10-bar average</Td>
                <Td>Major volume spike &mdash; MM definitely active</Td>
              </tr>
              <tr>
                <Td><span className="px-2 py-0.5 rounded bg-pink-200 dark:bg-pink-800 text-pink-800 dark:text-pink-100 text-[10px] font-semibold">MAGENTA</span> / <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-[10px] font-semibold">BLUE</span></Td>
                <Td className="font-medium">150% of 10-bar average</Td>
                <Td>Significant volume spike &mdash; MM likely active</Td>
              </tr>
            </tbody>
          </TableWrapper>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Stopping Volume Candle (SVC)</h4>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <KeyValue label="Body" value="Small" color="gray" />
              <KeyValue label="Wick" value="Large (trend dir.)" color="amber" />
              <KeyValue label="Volume" value="Very high" color="red" />
              <KeyValue label="Level" value="Level 3" color="purple" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Price must FAIL to return into the wick for confirmation. At Level 2, SVC only stops that level
              (price returns before L3 completes). Volume degradation (green &rarr; blue) at Level 3 = guaranteed pause, likely reversal.
            </p>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Liquidation Data (Hyblock)</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 ml-4">
            <li className="list-disc">Shows open leveraged positions and estimated liquidation prices</li>
            <li className="list-disc">Use as <strong>TARGETS</strong>, not automatic reversal entries</li>
            <li className="list-disc">Delta threshold: ~$20B historically triggers reversals</li>
            <li className="list-disc">Total open positions: want &gt;1,000 for meaningful data; &lt;600 = thin books, potential fakes</li>
          </ul>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Open Interest Signals</h4>
          <TableWrapper>
            <thead>
              <tr><Th>Price Action</Th><Th>OI Behaviour</Th><Th>Interpretation</Th></tr>
            </thead>
            <tbody>
              <tr><Td>Consolidating</Td><Td>Increasing</Td><Td>Breakout coming, stop hunt NOT needed</Td></tr>
              <tr><Td>Consolidating</Td><Td>Flat/Decreasing</Td><Td>Fakeout likely, stop hunt IS likely</Td></tr>
              <tr><Td>Retracing</Td><Td>Increasing</Td><Td>Traders getting trapped in M/W before continuation</Td></tr>
            </tbody>
          </TableWrapper>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          11. CONFLUENCE SCORING
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Gauge} title="Confluence Scoring System">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            The best entries have maximum confluence &mdash; multiple factors aligning simultaneously.
            The tarakta engine scores 12 weighted factors (max 111 points) and grades entries A through F.
            Minimum 40% confluence + at least 2 of 4 retest conditions to enter.
          </p>

          <TableWrapper>
            <thead>
              <tr><Th>Factor</Th><Th>Weight</Th><Th>Description</Th></tr>
            </thead>
            <tbody>
              <tr><Td>M/W at session changeover</Td><Td><Badge text="HIGH" color="red" /></Td><Td>Gap time formation (especially multi-session)</Td></tr>
              <tr><Td>M/W at HOW/LOW or HOD/LOD</Td><Td><Badge text="HIGH" color="red" /></Td><Td>Key level alignment</Td></tr>
              <tr><Td>50 EMA break with volume</Td><Td><Badge text="HIGH" color="red" /></Td><Td>Level 1 confirmation</Td></tr>
              <tr><Td>Stopping Volume Candle</Td><Td><Badge text="HIGH" color="red" /></Td><Td>Level 3 completion confirmation</Td></tr>
              <tr><Td>Unrecovered Vector zone</Td><Td><Badge text="MEDIUM" color="amber" /></Td><Td>Price target / area of interest</Td></tr>
              <tr><Td>Liquidation level cluster</Td><Td><Badge text="MEDIUM" color="amber" /></Td><Td>Where MM needs to go (Hyblock)</Td></tr>
              <tr><Td>Limit order cluster</Td><Td><Badge text="MEDIUM" color="amber" /></Td><Td>Where orders absorb/trigger (TradingLite)</Td></tr>
              <tr><Td>EMA alignment (all 5)</Td><Td><Badge text="MEDIUM" color="amber" /></Td><Td>Dynamic S/R confirmation</Td></tr>
              <tr><Td>Fibonacci level (38/50/62%)</Td><Td><Badge text="MEDIUM" color="amber" /></Td><Td>Retracement target in board meetings</Td></tr>
              <tr><Td>News event timing</Td><Td><Badge text="MEDIUM" color="amber" /></Td><Td>Catalyst for midweek reversal</Td></tr>
              <tr><Td>Moon cycle alignment</Td><Td><Badge text="LOW" color="blue" /></Td><Td>Full moon = local bottom, New moon = local top</Td></tr>
              <tr><Td>Correlation confirmation</Td><Td><Badge text="LOW" color="blue" /></Td><Td>DXY, NASDAQ early warning</Td></tr>
            </tbody>
          </TableWrapper>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Grade Scale</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { grade: 'A', desc: '80%+', color: 'bg-emerald-500' },
              { grade: 'B', desc: '65-79%', color: 'bg-blue-500' },
              { grade: 'C', desc: '50-64%', color: 'bg-amber-500' },
              { grade: 'D', desc: '40-49%', color: 'bg-orange-500' },
              { grade: 'F', desc: '<40%', color: 'bg-red-500' },
            ].map((g) => (
              <div key={g.grade} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
                <span className={`w-5 h-5 rounded ${g.color} text-white text-[10px] font-bold flex items-center justify-center`}>{g.grade}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{g.desc}</span>
              </div>
            ))}
          </div>

          <Tip>
            <strong>Minimum for entry:</strong> M/W formation at correct timing + at least 2 of 4 retest conditions + R:R &ge; 2:1 (aggressive) or 3:1 (standard).
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          12. WEEKEND TRAP & FMWB
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Eye} title="Weekend Trap and FMWB">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            The Weekend Trap and False Move Week Beginning (FMWB) are the opening moves in the MM&apos;s weekly playbook.
            Understanding them is critical for timing entries and avoiding traps.
          </p>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Weekend Trap Box (1H Chart)</h4>
          <div className="space-y-2">
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">Mark from US Friday close candle (5pm NY Friday)</p>
            </div>
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">Weekend = everything from next candle through to Dead Gap Zone (5pm NY Sunday)</p>
            </div>
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">Mark candle closes (not wicks) above and below within the box</p>
            </div>
            <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
              <p className="text-xs text-gray-600 dark:text-gray-400">Identify who got trapped (shorts induced early &rarr; stopped out late, etc.)</p>
            </div>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">FMWB Detection</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The False Move Week Beginning is identified by: a spike breaking the weekend trap range, occurring within
            the first 6 hours of the new week (after Sunday 5pm NY for crypto), on above-average volume.
            The FMWB direction tells you which way NOT to trade &mdash; the real move goes the opposite direction.
          </p>

          <InfoBox>
            The tarakta engine&apos;s <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">mm_weekend_trap.py</code> (443 lines) automatically detects the trap box boundaries,
            identifies FMWB direction, and provides a weekend bias assessment.
          </InfoBox>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          13. RISK MANAGEMENT
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={DollarSign} title="Risk Management">
        <div className="mt-4 space-y-4">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Position Sizing Formula</h4>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 my-2">
            <p className="text-emerald-400 text-sm font-mono">
              Risk per trade = 1% of total account<br />
              Position Size = Risk Amount / Stop Loss Distance %<br />
              <br />
              Example: $10K account, 1% risk = $100<br />
              SL at 1.33% distance → Position = $100 / 0.0133 = $7,519
            </p>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Leverage Reality Check</h4>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong>Leverage = capital freeing tool, NOT profit multiplier.</strong> Dollar profit is IDENTICAL regardless of leverage
              (only ROI% changes). Higher leverage = closer liquidation + higher fees. Probably don&apos;t need past 10x.
              Large accounts: keep only 10% on exchange, use leverage to cover position size.
            </p>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Win Rate / R:R Relationship</h4>
          <TableWrapper>
            <thead>
              <tr><Th>Min R:R</Th><Th>Wins Needed (out of 10)</Th><Th>Viability</Th></tr>
            </thead>
            <tbody>
              <tr><Td>1:1</Td><Td>6</Td><Td><Badge text="Marginal" color="red" /></Td></tr>
              <tr><Td>2:1</Td><Td>4</Td><Td><Badge text="Acceptable" color="amber" /></Td></tr>
              <tr><Td>3:1</Td><Td>3</Td><Td><Badge text="Good" color="blue" /></Td></tr>
              <tr><Td>4:1</Td><Td>2.5</Td><Td><Badge text="Excellent" color="green" /></Td></tr>
              <tr><Td>5:1</Td><Td>2</Td><Td><Badge text="Outstanding" color="teal" /></Td></tr>
            </tbody>
          </TableWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-xs text-emerald-800 dark:text-emerald-200">Do</span>
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>&bull; Judge in batches of 10 trades, not individually</li>
                <li>&bull; Calculate R:R to Level 1 only</li>
                <li>&bull; Risk exactly 1% per trade</li>
                <li>&bull; Accept that 6-7 out of 10 trades may lose</li>
              </ul>
            </div>
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-xs text-red-800 dark:text-red-200">Don&apos;t</span>
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>&bull; Never tighten SL to improve R:R</li>
                <li>&bull; Never take a trade below minimum R:R</li>
                <li>&bull; Never increase SL during a trade</li>
                <li>&bull; Never risk more than 1% on a single trade</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          14. MULTI-TIMEFRAME CHARTING
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Layers} title="Multi-Timeframe Charting Process">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Daily process takes ~15-20 minutes. Work top-down from Monthly to 1H.
            Chart your own levels FIRST, then check liquidation/order flow data.
          </p>

          <div className="space-y-2">
            {[
              { tf: 'Monthly', freq: 'End/start of month', task: 'Mark unrecovered Vectors above/below price as Areas of Interest' },
              { tf: 'Weekly', freq: 'End/start of week', task: 'Refine areas, mark 50% lines of Vectors, build bull AND bear case' },
              { tf: 'Daily', freq: 'Every day', task: 'Refine areas further, mark levels, build both cases' },
              { tf: '12H/8H/6H', freq: 'Quick scan', task: 'Is macro trend changing?' },
              { tf: '4H', freq: 'Every day', task: 'Check areas, vectors, heat map orders, calculate R:R for potential trades' },
              { tf: '1H', freq: 'Primary TF', task: 'Mark vectors, Weekend Trap Box, FMWB, Peak Formation, level count, SVCs' },
              { tf: '15min', freq: 'Entry only', task: 'Drop to this ONLY when entry is imminent on 1H, then return to 1H' },
            ].map((item, i) => (
              <div key={item.tf} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <span className="w-6 h-6 rounded-full bg-[#2C666E]/20 text-[#2C666E] dark:text-[#5AABB5] text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">{item.tf}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">({item.freq})</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.task}</p>
                </div>
              </div>
            ))}
          </div>

          <Warning>
            <strong>Chart levels FIRST, then check liquidation/order flow data.</strong> Never look at Hyblock/TradingLite
            before marking your own levels &mdash; this prevents bias.
          </Warning>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          15. CORRELATIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={GitBranch} title="Market Correlations">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            No asset moves in isolation. These correlation patterns provide early warnings and confluence.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">BTC vs DXY (US Dollar Index)</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Usually negatively correlated. DXY trend change is early warning for BTC direction change.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">BTC vs NASDAQ</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Positively correlated with delay. NASDAQ leads trend changes &mdash; watch for divergence.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Alt Season Signals</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                BTC.D rising + USDT.D falling + ETH.D rising = Alt Season.
                TOTAL2 rising while TOTAL falling = alt season signal.
                TOTAL3 rising = degen season (high-risk alt appetite).
              </p>
            </div>
          </div>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          16. THE LINDA TRADE
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={ArrowUpDown} title="The Linda Trade (Multi-TF Scaling)">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            A trade that starts on a lower timeframe but feeds up through the hierarchy.
            Each timeframe&apos;s 3-level rise equals a single Level 1 on the next higher timeframe.
          </p>

          <DiagramBox>{`15min 3-level rise  =  1H Level 1
1H 3-level rise     =  4H Level 1   (~1 week)
4H 3-level rise     =  Daily Level 1 (~1 month)
Daily 3-level rise  =  Weekly Level 1 (~3 months)`}</DiagramBox>

          <InfoBox>
            <strong>Key rule:</strong> Retracements on higher TFs only give 1-2 rises/drops (NOT 3).
            If you see only 2 and price gets stuck at a key level + lines up with news/FMWB &rarr;
            expect continuation in the original direction.
          </InfoBox>

          <Tip>
            This is advanced (Part 3 material). The tarakta engine implements the weekly setup first.
            Linda detection will be added as an enhancement in Phase 3c.
          </Tip>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          17. WEEKLY CHECKLIST
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={CheckCircle2} title="Weekly Trading Checklist">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Follow this checklist every week on the 1H chart. The tarakta engine automates all of these steps.
          </p>

          <div className="space-y-2">
            {[
              'Weekend Trap Box → identify the fake move and who got trapped',
              'FMWB direction → trade against it (opposite direction is the real move)',
              'Peak Formation (M/W) → start level count from 2nd peak',
              'Count complete (3 levels)? → Look for reversal (new M/W)',
              'Count in progress? → Identify Level 3 target using EMAs + Vectors',
              'M/W formed: Did it break 50 EMA with volume? → Level 1 confirmed',
              'Plan ahead: reversal location, news event, liquidation levels, heat map orders',
              'Moon cycles: check full/new moon positions (14 days apart, ±3 day buffer)',
              'News events: check 1-2 days ahead (Forex Factory, red/orange impact, USD filter)',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700 dark:text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          18. TARAKTA ENGINE IMPLEMENTATION
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Zap} title="Tarakta Engine Implementation">
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            The MM Method is implemented as a standalone algorithmic engine that runs in parallel with the existing
            SMC/footprint pipeline. It makes <strong>zero LLM/agent calls</strong> &mdash; all decisions are mechanical.
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-3">Architecture</h4>
            <DiagramBox>{`┌──────────────────────────────────────────────────────────────┐
│                     src/main.py                              │
│                  asyncio.gather(...)                          │
│                                                              │
│   ┌─────────────────┐      ┌──────────────────────────────┐  │
│   │  TradingEngine   │      │  MMEngine (standalone)        │  │
│   │  (SMC pipeline)  │      │  ┌─────────────────────────┐ │  │
│   │  - 3 LLM agents  │      │  │ mm_sessions.py     319L │ │  │
│   │  - scanner.py     │      │  │ mm_ema_framework.py 527L │ │  │
│   │  - confluence.py  │      │  │ mm_formations.py  1290L │ │  │
│   │  - position mgmt  │      │  │ mm_levels.py       710L │ │  │
│   │                   │      │  │ mm_weekly_cycle.py 1165L │ │  │
│   │  Shares:          │      │  │ mm_confluence.py   730L │ │  │
│   │  - exchange       │      │  │ mm_weekend_trap.py 443L │ │  │
│   │  - candle_manager │      │  │ mm_board_meetings  524L │ │  │
│   │  - database       │      │  │ mm_targets.py      507L │ │  │
│   │                   │      │  │ mm_risk.py         427L │ │  │
│   └─────────────────┘      │  └─────────────────────────┘ │  │
│                              │  Tags: strategy='mm_method'   │  │
│                              └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘`}</DiagramBox>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">10 Modules</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: 'mm_sessions.py', lines: 319, desc: 'Session timing, gaps, week/day boundaries' },
              { name: 'mm_ema_framework.py', lines: 527, desc: '5-EMA system, PVSRA volume, trend state' },
              { name: 'mm_formations.py', lines: 1290, desc: 'M/W detection (5 variants), quality scoring' },
              { name: 'mm_levels.py', lines: 710, desc: '3-level counting, Board Meetings, SVCs' },
              { name: 'mm_weekly_cycle.py', lines: 1165, desc: '11-phase state machine, FMWB, HOW/LOW' },
              { name: 'mm_confluence.py', lines: 730, desc: '12-factor scoring, retest conditions, entries' },
              { name: 'mm_weekend_trap.py', lines: 443, desc: 'Weekend Trap Box, FMWB detection' },
              { name: 'mm_board_meetings.py', lines: 524, desc: 'Board Meeting detection, Fibonacci entries' },
              { name: 'mm_targets.py', lines: 507, desc: 'Target identification (EMAs, Vectors, HOW/LOW)' },
              { name: 'mm_risk.py', lines: 427, desc: 'Position sizing, R:R assessment, Refund Zone' },
            ].map((mod) => (
              <div key={mod.name} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                <code className="text-[10px] font-mono text-[#2C666E] dark:text-[#5AABB5] shrink-0 mt-0.5">{mod.name}</code>
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{mod.lines}L</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">Scan Cycle Flow</h4>
          <div className="space-y-1.5">
            {[
              'Session check — are we in a tradeable session? (skip Dead Zone, weekends)',
              'Weekly cycle update — what phase are we in? (11 phases)',
              'Per-pair analysis — formations, levels, EMA, confluence for each tradeable pair',
              'Entry decisions — purely algorithmic: confluence ≥40%, R:R ≥ 2:1, ≥2 retest conditions',
              'Position management — SL tightening, partial profits at L1/L2/L3, SVC exits',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2C666E] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">{step}</p>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">Configuration</h4>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4">
            <pre className="text-xs text-emerald-400 font-mono">{`# Enable the MM Method engine (Fly.io secret)
MM_METHOD_ENABLED=true

# Scan interval (minutes) — how often the engine runs
MM_SCAN_INTERVAL_MINUTES=5

# Max concurrent MM positions
MM_MAX_POSITIONS=3

# Risk per trade (% of balance)
MM_RISK_PER_TRADE_PCT=1.0`}</pre>
          </div>

          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mt-3">Test Coverage</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'test_mm_sessions', tests: 30 },
              { name: 'test_mm_ema_framework', tests: 32 },
              { name: 'test_mm_levels', tests: 22 },
              { name: 'test_mm_formations', tests: 23 },
              { name: 'test_mm_weekly_cycle', tests: 32 },
              { name: 'test_mm_confluence', tests: 53 },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-1 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-gray-700 dark:text-gray-300 font-mono">{t.name}</span>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{t.tests}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">192 tests total, all passing.</p>
        </div>
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════
          19. QUICK REFERENCE
          ═══════════════════════════════════════════════════════════════════ */}
      <Section icon={Zap} title="Quick Reference Card">
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Entry Checklist</h4>
              <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                <li>&#9744; M/W formed at session changeover?</li>
                <li>&#9744; At HOW/LOW or HOD/LOD?</li>
                <li>&#9744; 50 EMA broken with volume?</li>
                <li>&#9744; &ge;2 retest conditions met?</li>
                <li>&#9744; R:R &ge; 2:1 (to Level 1)?</li>
                <li>&#9744; Not in FMWB or Friday Trap phase?</li>
                <li>&#9744; Asia BTC range &le;2%?</li>
                <li>&#9744; Confluence grade C or better?</li>
              </ul>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Exit Checklist</h4>
              <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                <li>&#9744; SVC appeared at Level 3?</li>
                <li>&#9744; Volume degrading (green &rarr; blue)?</li>
                <li>&#9744; Wick behaviour shifted sides?</li>
                <li>&#9744; Friday UK session approaching?</li>
                <li>&#9744; EMAs flattening?</li>
                <li>&#9744; 3 hits on HOW/LOW without break?</li>
                <li>&#9744; Large gap between price and EMAs?</li>
                <li>&#9744; Take partials: 30% L1, 50% L2, 100% L3</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">The Golden Rule</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Slow = Real. Fast = Fake.</strong> If price is moving fast, it&apos;s a trap.
              If it&apos;s moving slowly and steadily, that&apos;s the MM filling their orders.
              Trade with the slow move, not against it.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
}
