import React, { useEffect } from 'react';

const EPISODES = [
  {
    number: 1,
    title: 'Character Introduction',
    duration: '30–45 sec',
    description: "Meet Movin' Martin — establishes the character, sets the tone for the series.",
    phrases: ["Get movin' with Movin' Martin!"],
    badge: 'First Episode',
  },
  {
    number: 2,
    title: 'Keeping Safe on Our Wheels',
    duration: '~30 sec',
    description: 'Safety gear essentials for bikes, scooters, and skateboards.',
    phrases: ['Be bright, be seen'],
  },
  {
    number: 3,
    title: 'Check Before You Step',
    duration: '~30 sec',
    description: 'Pedestrian crossing safety — look, listen, and think before stepping out.',
    phrases: ['Check before you step!', 'Stop, look and listen'],
  },
  {
    number: 4,
    title: 'Sneaky Driveways',
    duration: '~30 sec',
    description: 'Awareness around driveways and reversing vehicles.',
    phrases: ['Stay alert, be aware'],
  },
  {
    number: 5,
    title: 'Foot Path Safety',
    duration: '~30 sec',
    description: 'Sharing paths safely with pedestrians, cyclists, and scooter riders.',
    phrases: ['Cross like a boss!'],
  },
  {
    number: 6,
    title: 'Walk or Wheels Superstar',
    duration: '~30 sec',
    description: 'Promoting active travel to school — walking, biking, scooting.',
    phrases: ['Walk or Wheels Superstar!'],
  },
  {
    number: 7,
    title: 'Full Feature Compilation Film',
    duration: '~3:30 min',
    description: 'All episodes combined into one complete film for assembly or classroom viewing.',
    phrases: [],
    isCompilation: true,
  },
];

const TIERS = [
  {
    name: 'Base',
    price: '$25,000',
    recommended: false,
    features: [
      { text: '7 animated episodes', included: true },
      { text: 'Interactive learning beats', included: true },
      { text: "Movin' Martin website with admin backend", included: true },
      { text: 'Digital delivery (MP4, web-optimised)', included: true },
      { text: 'Professional voiceover', included: false },
      { text: 'Voice lipsync animation', included: false },
      { text: 'Original music & sound effects', included: false },
      { text: 'Workbook integration guide', included: false },
    ],
  },
  {
    name: 'Premium',
    price: '$30,000',
    recommended: true,
    features: [
      { text: '7 animated episodes', included: true },
      { text: 'Interactive learning beats', included: true },
      { text: "Movin' Martin website with admin backend", included: true },
      { text: 'Digital delivery (MP4, web-optimised)', included: true },
      { text: 'Professional voiceover', included: true },
      { text: 'Voice lipsync animation', included: true },
      { text: 'Original music & sound effects', included: false },
      { text: 'Workbook integration guide', included: false },
    ],
  },
  {
    name: 'Deluxe',
    price: '$35,000',
    recommended: false,
    features: [
      { text: '7 animated episodes', included: true },
      { text: 'Interactive learning beats', included: true },
      { text: "Movin' Martin website with admin backend", included: true },
      { text: 'Digital delivery (MP4, web-optimised)', included: true },
      { text: 'Professional voiceover', included: true },
      { text: 'Voice lipsync animation', included: true },
      { text: 'Original music & sound effects', included: true },
      { text: 'Workbook integration guide', included: true },
    ],
  },
];

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

      {/* Section 2: Project Vision */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left column */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white">Project Vision</h2>
            <p className="text-[#94a3b8] leading-relaxed">
              An AI-powered animated series featuring Movin&apos; Martin — a lovable dog mascot who
              promotes road safety and active travel for primary school children. The series combines
              interactive learning moments inspired by Dora the Explorer, where Martin pauses to ask
              questions, reinforced by companion workbooks for classroom use. A unique focus on active
              travel — walking, biking, and scooting to school — sets this apart from existing road
              safety programmes.
            </p>
          </div>

          {/* Right column: stat cards */}
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 border border-[#2C666E]/30 rounded-xl p-4">
              <p className="text-white font-bold">7 Episodes</p>
              <p className="text-[#94a3b8] text-sm">Character intro + 5 themed + compilation</p>
            </div>
            <div className="bg-white/5 border border-[#2C666E]/30 rounded-xl p-4">
              <p className="text-white font-bold">3:30 Feature Film</p>
              <p className="text-[#94a3b8] text-sm">Full compilation edit</p>
            </div>
            <div className="bg-white/5 border border-[#2C666E]/30 rounded-xl p-4">
              <p className="text-white font-bold">Primary School</p>
              <p className="text-[#94a3b8] text-sm">Ages 5–12 target audience</p>
            </div>
            <div className="bg-white/5 border border-[#2C666E]/30 rounded-xl p-4">
              <p className="text-white font-bold">Workbook Integration</p>
              <p className="text-[#94a3b8] text-sm">Reinforced classroom learning</p>
            </div>
            <div className="bg-white/5 border border-[#2C666E]/30 rounded-xl p-4">
              <p className="text-white font-bold">Active Travel Focus</p>
              <p className="text-[#94a3b8] text-sm">Walking, biking, scooting to school</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Episode Guide */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <h2 className="text-3xl font-bold mb-2">Episode Guide</h2>
        <p className="text-[#94a3b8] mb-10">
          Seven deliverables — six standalone episodes plus a full compilation film
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {EPISODES.map((ep) => (
            <div
              key={ep.number}
              className={`bg-white/5 border rounded-2xl p-6 relative ${
                ep.isCompilation
                  ? 'md:col-span-2 border-[#2C666E]/50'
                  : 'border-white/10'
              }`}
            >
              {ep.badge && (
                <span className="absolute top-4 right-4 bg-[#2C666E] text-white text-xs px-3 py-1 rounded-full">
                  {ep.badge}
                </span>
              )}
              <p className="text-[#94a3b8] text-sm">Episode {ep.number}</p>
              <p className="text-lg font-semibold text-white">{ep.title}</p>
              <span className="inline-block bg-[#2C666E]/20 text-[#90DDF0] text-sm px-3 py-1 rounded-full mt-2">
                {ep.duration}
              </span>
              <p className="text-sm text-[#94a3b8] mt-3">{ep.description}</p>
              {ep.phrases.length > 0 && (
                <div className="inline-flex gap-2 flex-wrap mt-3">
                  {ep.phrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              )}
              <video
                className="rounded-xl w-full mt-4"
                controls
                poster="#"
                src="#placeholder"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Sample Work */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <h2 className="text-3xl font-bold mb-2">Sample Work</h2>
        <p className="text-[#94a3b8] mb-10">Examples from our animation pipeline</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <video className="w-full aspect-video" controls poster="#" src="#placeholder" />
              <p className="p-4 text-xs text-[#94a3b8]">
                Sample animation — final style will be tailored to Movin&apos; Martin
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: The Approach */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <h2 className="text-3xl font-bold mb-12 text-center">The Approach</h2>
        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Desktop connecting dashed line behind the number circles */}
          <div
            className="hidden md:block absolute top-6 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] border-t-2 border-dashed border-[#2C666E]/40"
            aria-hidden="true"
          />
          {[
            {
              n: 1,
              title: 'Story & Script',
              description:
                'AI-assisted scriptwriting with interactive learning beats. Each episode structured around a key road safety message with pause-and-ask moments.',
            },
            {
              n: 2,
              title: 'Animation',
              description:
                'AI-powered visual generation with consistent character design. Movin\u2019 Martin maintains a cohesive look and personality throughout.',
            },
            {
              n: 3,
              title: 'Polish',
              description:
                'Professional voiceover, background music, sound effects, captions, and final edit. Ready for classroom and online distribution.',
            },
          ].map((step) => (
            <div
              key={step.n}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 relative z-10">
                {step.n}
              </div>
              <p className="text-lg font-semibold mb-3 text-white">{step.title}</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6: Pricing */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <h2 className="text-3xl font-bold mb-2 text-center">Investment</h2>
        <p className="text-[#94a3b8] mb-10 text-center">All prices exclusive of GST</p>
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`bg-white/5 border rounded-2xl p-8 ${
                tier.recommended
                  ? 'border-[#2C666E] ring-1 ring-[#2C666E]'
                  : 'border-white/10'
              }`}
            >
              {tier.recommended && (
                <span className="bg-[#2C666E] text-white text-xs px-3 py-1 rounded-full inline-block mb-4">
                  Recommended
                </span>
              )}
              <p className="text-xl font-semibold text-white">{tier.name}</p>
              <p className="text-4xl font-bold text-white mt-2">
                {tier.price}
                <span className="text-sm text-[#94a3b8] font-normal ml-1">+ GST</span>
              </p>
              <div className="border-t border-white/10 my-6" />
              <ul className="flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? (
                      <span className="text-[#2C666E] font-bold shrink-0">✓</span>
                    ) : (
                      <span className="text-[#94a3b8] shrink-0">—</span>
                    )}
                    <span className={feature.included ? 'text-white' : 'text-[#94a3b8]'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: About Stitch Studios */}
      <section className="py-24 px-6 max-w-3xl mx-auto text-center" data-animate>
        <StitchLogo />
        <p className="text-xl text-[#94a3b8] mt-6 mb-8">
          Stitching stories together through animation
        </p>
        <h2 className="text-3xl font-bold mb-8">Let&apos;s bring Movin&apos; Martin to life</h2>
        <div className="flex flex-col gap-2 mb-2">
          <p className="text-white">Stuart Anderson</p>
          <a
            href="mailto:hello@stitchstudios.app"
            className="text-[#90DDF0] hover:underline"
          >
            hello@stitchstudios.app
          </a>
          <p className="text-[#94a3b8]">+64 21 000 0000</p>
        </div>
        <a
          href="mailto:hello@stitchstudios.app"
          className="inline-block bg-[#2C666E] hover:bg-[#2C666E]/80 text-white px-8 py-3 rounded-xl font-semibold mt-6 transition-colors"
        >
          Get in Touch
        </a>
      </section>

      {/* Section 8: Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center">
        <p className="text-[#94a3b8] text-xs mb-2">
          This proposal is confidential and prepared exclusively for Hamilton City Council
        </p>
        <p className="text-[#94a3b8] text-xs mb-1">© 2026 Stitch Studios LLC</p>
        <p className="text-[#94a3b8] text-xs">Prepared March 2026</p>
      </footer>
    </div>
  );
}
