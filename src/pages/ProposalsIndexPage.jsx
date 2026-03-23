import React from 'react';
import { Link } from 'react-router-dom';

function StitchLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG mark: needle + dashed S-curve stitch path */}
      <svg
        width="64"
        height="80"
        viewBox="0 0 64 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Needle body */}
        <line
          x1="32"
          y1="4"
          x2="32"
          y2="18"
          stroke="#90DDF0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Needle eye (small oval hole near top) */}
        <ellipse
          cx="32"
          cy="8"
          rx="2.5"
          ry="4"
          stroke="#90DDF0"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Needle tip (pointed bottom) */}
        <path
          d="M30 16 L32 22 L34 16"
          stroke="#90DDF0"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Dashed S-curve stitch path */}
        {/* Upper arc of S: curves right from top-center to mid */}
        <path
          d="M32 22 C48 24 48 36 32 40"
          stroke="#2C666E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
          fill="none"
        />
        {/* Lower arc of S: curves left from mid to bottom */}
        <path
          d="M32 40 C16 44 16 56 32 60"
          stroke="#2C666E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
          fill="none"
        />
        {/* Small stitch dots at key anchor points to reinforce stitching look */}
        <circle cx="32" cy="22" r="2" fill="#2C666E" />
        <circle cx="46" cy="30" r="1.5" fill="#2C666E" opacity="0.6" />
        <circle cx="32" cy="40" r="2" fill="#2C666E" />
        <circle cx="18" cy="50" r="1.5" fill="#2C666E" opacity="0.6" />
        <circle cx="32" cy="60" r="2" fill="#2C666E" />
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white text-lg font-bold tracking-[0.3em] uppercase">
          Stitch Studios
        </span>
        <span className="text-[#94a3b8] text-xs tracking-[0.2em] uppercase">
          Animation &amp; Media
        </span>
      </div>
    </div>
  );
}

const proposals = [
  {
    title: 'Hamilton City Council',
    subtitle: "Movin' Martin — Animated Road Safety & Active Travel Series",
    date: 'March 2026',
    href: '/proposal/hamilton-city-council',
  },
];

export default function ProposalsIndexPage() {
  return (
    <div className="bg-[#0f172a] text-white min-h-screen font-[Inter] flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-2xl mx-auto w-full">
        {/* Logo */}
        <div className="mb-12">
          <StitchLogo />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-semibold mb-8 self-start">Proposals</h1>

        {/* Proposal cards */}
        <div className="w-full flex flex-col gap-4">
          {proposals.map((proposal) => (
            <Link
              key={proposal.href}
              to={proposal.href}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-[#2C666E]/50 transition-colors block"
            >
              <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">
                {proposal.date}
              </p>
              <h2 className="text-xl font-semibold mb-1">{proposal.title}</h2>
              <p className="text-[#94a3b8] text-sm">{proposal.subtitle}</p>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[#94a3b8] text-xs">&copy; 2026 Stitch Studios LLC</p>
      </footer>
    </div>
  );
}
