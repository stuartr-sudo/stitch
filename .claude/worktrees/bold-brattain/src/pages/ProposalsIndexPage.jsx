import React from 'react';
import { Link } from 'react-router-dom';

function StitchLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width="64"
        height="80"
        viewBox="0 0 64 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <line x1="32" y1="4" x2="32" y2="18" stroke="#2C666E" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="32" cy="8" rx="2.5" ry="4" stroke="#2C666E" strokeWidth="1.5" fill="none" />
        <path d="M30 16 L32 22 L34 16" stroke="#2C666E" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M32 22 C48 24 48 36 32 40" stroke="#2C666E" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" fill="none" />
        <path d="M32 40 C16 44 16 56 32 60" stroke="#2C666E" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" fill="none" />
        <circle cx="32" cy="22" r="2" fill="#2C666E" />
        <circle cx="46" cy="30" r="1.5" fill="#2C666E" opacity="0.4" />
        <circle cx="32" cy="40" r="2" fill="#2C666E" />
        <circle cx="18" cy="50" r="1.5" fill="#2C666E" opacity="0.4" />
        <circle cx="32" cy="60" r="2" fill="#2C666E" />
      </svg>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[#0f172a] text-lg font-bold tracking-[0.3em] uppercase">
          Stitch Studios
        </span>
        <span className="text-[#64748b] text-xs tracking-[0.2em] uppercase">
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        html, body { background-color: #ffffff !important; }
      `}</style>
      <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <StitchLogo />
        </div>

        <h1 className="text-3xl font-semibold mb-8 self-start text-[#0f172a]">Proposals</h1>

        <div className="w-full flex flex-col gap-4">
          {proposals.map((proposal) => (
            <Link
              key={proposal.href}
              to={proposal.href}
              className="bg-white border border-[#e2e8f0] rounded-2xl p-8 hover:border-[#2C666E]/50 hover:shadow-md transition-all block"
            >
              <p className="text-xs text-[#94a3b8] uppercase tracking-widest mb-2">
                {proposal.date}
              </p>
              <h2 className="text-xl font-semibold mb-1 text-[#0f172a]">{proposal.title}</h2>
              <p className="text-[#64748b] text-sm">{proposal.subtitle}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-[#94a3b8] text-xs">&copy; 2026 Stitch Studios LLC</p>
      </footer>
    </div>
  );
}
