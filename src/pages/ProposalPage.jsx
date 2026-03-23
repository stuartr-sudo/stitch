import React, { useEffect } from 'react';

function useScrollAnimation() {
  useEffect(() => {
    const elements = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function StitchLogo() {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* SVG mark: needle + dashed S-curve stitch path */}
      <svg
        width="96"
        height="120"
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
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-white text-2xl font-bold tracking-[0.3em] uppercase">
          Stitch Studios
        </span>
        <span className="text-[#94a3b8] text-sm tracking-[0.2em] uppercase">
          Animation &amp; Media
        </span>
      </div>
    </div>
  );
}

export default function ProposalPage() {
  useScrollAnimation();

  return (
    <div className="bg-[#0f172a] text-white font-[Inter]">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        [data-animate] { opacity: 0; }
        [data-animate].visible { animation: fadeInUp 0.6s ease-out forwards; }
      `}</style>

      {/* Section 1: Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center relative bg-gradient-to-b from-[#0f172a] to-[#1e293b] px-6 py-24">
        {/* Logo */}
        <div className="mb-14">
          <StitchLogo />
        </div>

        {/* "Prepared for" label */}
        <p className="text-[#94a3b8] text-sm tracking-wide mb-2">
          Prepared exclusively for
        </p>

        {/* Client name */}
        <p className="text-white text-2xl font-bold mb-6">
          Hamilton City Council
        </p>

        {/* Teal divider */}
        <div className="w-16 h-0.5 bg-[#2C666E] mx-auto my-6" />

        {/* Project name */}
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center leading-tight mb-4">
          Movin&apos; Martin
        </h1>

        {/* Project subtitle */}
        <p className="text-xl text-[#94a3b8] text-center mb-6">
          Animated Road Safety &amp; Active Travel Series
        </p>

        {/* Date */}
        <p className="text-[#94a3b8] text-sm tracking-wide">March 2026</p>

        {/* Scroll-down chevron */}
        <div
          className="absolute bottom-8 flex flex-col items-center gap-1"
          style={{ animation: 'bounce 2s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="#2C666E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="#2C666E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            />
          </svg>
        </div>
      </section>

      {/* Section 2: Project Vision — Task 3 */}
      {/* Section 3: Episode Guide — Task 4 */}
      {/* Section 4: Sample Work — Task 5 */}
      {/* Section 5: The Approach — Task 6 */}
      {/* Section 6: Pricing — Task 7 */}
      {/* Section 7: About — Task 8 */}
      {/* Section 8: Footer — Task 8 */}
    </div>
  );
}
