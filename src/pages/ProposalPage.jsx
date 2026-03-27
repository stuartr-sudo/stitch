import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import LibraryModal from '@/components/modals/LibraryModal';

const PROCESS_STEPS = [
  {
    phase: 'Discovery & Character Design',
    duration: 'Week 1',
    description: 'Initial consultation to understand your goals, review existing Movin\' Martin materials, and align on creative direction. Design and refine the animated character with style frames for approval.',
  },
  {
    phase: 'Scriptwriting & Storyboarding',
    duration: 'Week 1',
    description: 'Develop scripts for all episodes with interactive learning beats, pause-and-ask moments, and road safety messaging. Scripts reviewed and approved before production begins.',
  },
  {
    phase: 'Animation Production',
    duration: 'Week 1-2',
    description: 'Full animation of all episodes, incorporating approved scripts and character designs. Regular check-ins with progress previews at key milestones.',
  },
  {
    phase: 'Review & Revisions',
    duration: 'Week 2-3',
    description: 'Two rounds of revisions per episode. Audio, music, captions, and final polish applied. Compilation film assembled from completed episodes.',
  },
  {
    phase: 'Delivery & Handover',
    duration: 'Week 3',
    description: 'Final delivery of all assets in MP4 and web-optimised formats. Website launch with admin backend. Training session for content management.',
  },
];

const TIERS = [
  {
    name: 'Base',
    price: '$25,000',
    recommended: false,
    inherits: null,
    features: [
      '7 animated episodes',
      'Interactive learning beats',
      "Movin' Martin website with admin backend",
      'Workbook integration guide',
      'Original music and sound effects',
      'Digital delivery (MP4, web-optimised)',
    ],
  },
  {
    name: 'Premium',
    price: '$30,000',
    recommended: true,
    inherits: 'Base',
    features: [
      'Professional quality voiceover',
      'Voice lipsync animation',
      'Social media cut-downs',
      'Multilingual subtitles (incl. te reo Maori)',
    ],
  },
  {
    name: 'Deluxe',
    price: '$45,000',
    recommended: false,
    inherits: 'Premium',
    features: [
      'Interactive web quizzes and games',
      'Additional character designs',
      'Seasonal content updates',
      'Teacher lesson plan pack if required (NZ curriculum)',
    ],
  },
];

function useScrollAnimation() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all current elements
    document.querySelectorAll('[data-animate]').forEach((el) => io.observe(el));

    // Watch for dynamically added [data-animate] elements (e.g. after media fetch)
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.hasAttribute('data-animate')) io.observe(node);
          node.querySelectorAll?.('[data-animate]').forEach((el) => io.observe(el));
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

function StitchLogo({ size = 'large' }) {
  const isLarge = size === 'large';
  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        width={isLarge ? 96 : 64}
        height={isLarge ? 120 : 80}
        viewBox="0 0 64 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Needle body */}
        <line x1="32" y1="4" x2="32" y2="18" stroke="#2C666E" strokeWidth="2.5" strokeLinecap="round" />
        {/* Needle eye */}
        <ellipse cx="32" cy="8" rx="2.5" ry="4" stroke="#2C666E" strokeWidth="1.5" fill="none" />
        {/* Needle tip */}
        <path d="M30 16 L32 22 L34 16" stroke="#2C666E" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        {/* S-curve upper arc */}
        <path d="M32 22 C48 24 48 36 32 40" stroke="#2C666E" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" fill="none" />
        {/* S-curve lower arc */}
        <path d="M32 40 C16 44 16 56 32 60" stroke="#2C666E" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" fill="none" />
        {/* Anchor dots */}
        <circle cx="32" cy="22" r="2" fill="#2C666E" />
        <circle cx="46" cy="30" r="1.5" fill="#2C666E" opacity="0.4" />
        <circle cx="32" cy="40" r="2" fill="#2C666E" />
        <circle cx="18" cy="50" r="1.5" fill="#2C666E" opacity="0.4" />
        <circle cx="32" cy="60" r="2" fill="#2C666E" />
      </svg>

      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[#0f172a] font-bold tracking-[0.3em] uppercase ${isLarge ? 'text-2xl' : 'text-lg'}`}>
          Stitch Studios
        </span>
        <span className={`text-[#64748b] tracking-[0.2em] uppercase ${isLarge ? 'text-sm' : 'text-xs'}`}>
          Animation &amp; Media
        </span>
      </div>
    </div>
  );
}

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('proposal_unlocked') === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'TraceyGrayson') {
      sessionStorage.setItem('proposal_unlocked', '1');
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');`}</style>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full max-w-sm">
        <StitchLogo size="small" />
        <p className="text-[#64748b] text-sm text-center">Enter the password to view this proposal</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className={`w-full px-4 py-3 border rounded-xl text-center text-[#0f172a] outline-none transition-colors ${
            error ? 'border-red-400 bg-red-50' : 'border-[#e2e8f0] focus:border-[#2C666E]'
          }`}
        />
        <button
          type="submit"
          className="w-full bg-[#2C666E] hover:bg-[#235158] text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          View Proposal
        </button>
        {error && <p className="text-red-500 text-sm">Incorrect password</p>}
      </form>
    </div>
  );
}

function Lightbox({ item, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl w-10 h-10 flex items-center justify-center"
      >
        &times;
      </button>
      <div
        className="max-w-5xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === 'video' ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="w-full max-h-[90vh] rounded-lg"
          />
        ) : (
          <img
            src={item.url}
            alt=""
            className="w-full max-h-[90vh] object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );
}

function ProposalContent() {
  useScrollAnimation();
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteType, setPasteType] = useState(null); // 'video' or 'image'
  const [pasting, setPasting] = useState(false);

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/proposals/hamilton-city-council/media');
      const data = await res.json();
      if (data.images) setImages(data.images);
      if (data.videos) setVideos(data.videos);
    } catch (err) {
      console.error('Failed to fetch proposal media:', err);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const addMedia = async (item, mediaType) => {
    try {
      const res = await apiFetch('/api/proposals/hamilton-city-council/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: mediaType,
          media_url: item.url || item.image_url || item.video_url,
          thumbnail_url: item.thumbnail_url || null,
          caption: item.title || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Failed to add media:', data.error);
        return;
      }
      fetchMedia();
    } catch (err) {
      console.error('Failed to add media:', err);
    }
  };

  const removeMedia = async (id) => {
    try {
      await apiFetch(`/api/proposals/hamilton-city-council/media/${id}`, {
        method: 'DELETE',
      });
      fetchMedia();
    } catch (err) {
      console.error('Failed to remove media:', err);
    }
  };

  const updateCaption = async (id, caption) => {
    try {
      await apiFetch(`/api/proposals/hamilton-city-council/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      fetchMedia();
    } catch (err) {
      console.error('Failed to update caption:', err);
    }
  };

  const importFromUrl = async (url, mediaType) => {
    setPasting(true);
    try {
      // Save to library first (re-uploads to Supabase for permanent URL)
      const saveRes = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: mediaType, title: 'Imported from URL', source: 'proposal' }),
      });
      const saveData = await saveRes.json();
      const permanentUrl = saveData?.url || url;
      // Add to proposal
      await addMedia({ url: permanentUrl }, mediaType);
      setPasteUrl('');
      setPasteType(null);
    } catch (err) {
      console.error('Failed to import from URL:', err);
    } finally {
      setPasting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        html, body { background-color: #ffffff !important; }
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

      {user && (
        <button
          onClick={() => setEditMode(!editMode)}
          className={`fixed top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            editMode ? 'bg-[#2C666E] text-white' : 'bg-white text-[#64748b] border border-[#e2e8f0]'
          }`}
          title={editMode ? 'Exit edit mode' : 'Edit proposal'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Section 1: Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center relative bg-white px-6 pt-12 pb-24">
        {/* Partnership logos */}
        <div className="flex items-center gap-4 sm:gap-8 mb-14">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/92/Hamilton_City_Council_logo.svg"
            alt="Hamilton City Council"
            className="h-8 sm:h-11 w-auto"
          />
          <span className="text-[#cbd5e1] text-xl sm:text-2xl font-light">&times;</span>
          <div className="flex items-center gap-2 sm:gap-3">
              <svg
                viewBox="0 0 64 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="shrink-0 w-6 h-8 sm:w-9 sm:h-11"
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
              <div className="flex flex-col">
                <span className="text-[#0f172a] font-bold tracking-[0.2em] sm:tracking-[0.25em] uppercase text-xs sm:text-base leading-tight">
                  Stitch Studios
                </span>
                <span className="text-[#64748b] tracking-[0.15em] uppercase text-[8px] sm:text-[10px]">
                  Animation &amp; Media
                </span>
              </div>
          </div>
        </div>

        <p className="text-[#64748b] text-sm tracking-wide mb-2">
          Prepared exclusively for
        </p>
        <p className="text-[#0f172a] text-2xl font-bold mb-1">
          Hamilton City Council
        </p>
        <p className="text-[#64748b] text-sm mb-6">
          Attn: Tracey Grayson, School Travel Coordinator
        </p>

        <div className="w-16 h-0.5 bg-[#2C666E] mx-auto my-6" />

        <h1 className="text-4xl md:text-5xl font-bold text-[#0f172a] text-center leading-tight mb-4">
          Movin&apos; Martin
        </h1>
        <p className="text-xl text-[#64748b] text-center mb-6">
          Animated Road Safety &amp; Active Travel Series
        </p>
        <p className="text-[#94a3b8] text-sm tracking-wide mb-12">March 2026</p>

        <div
          className="absolute bottom-8 flex flex-col items-center gap-1"
          style={{ animation: 'bounce 2s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke="#2C666E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke="#2C666E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </svg>
        </div>
      </section>

      {/* Section 2: Project Vision */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: Text */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-[#0f172a]">Project Vision</h2>
            <p className="text-[#64748b] leading-loose">
              An animated series featuring Movin&apos; Martin, a lovable dog mascot who
              promotes road safety and active travel for primary school children.
            </p>
            <p className="text-[#64748b] leading-loose mt-4">
              The series combines interactive learning moments inspired by Dora the Explorer,
              where Martin pauses to ask questions, reinforced by companion workbooks for
              classroom use.
            </p>
            <p className="text-[#64748b] leading-loose mt-4">
              A unique focus on active travel (walking, biking, and scooting to school) sets
              this apart from existing road safety programmes.
            </p>
          </div>

          {/* Right: Cards in staircase stack */}
          <div className="flex flex-col gap-3">
            {[
              { label: '7 Episodes', sub: 'Character intro + 5 themed + compilation', indent: 0, opacity: 0.08 },
              { label: '3:30 Feature Film', sub: 'Full compilation edit', indent: 1, opacity: 0.12 },
              { label: 'Primary School', sub: 'Ages 5 to 12 target audience', indent: 2, opacity: 0.16 },
              { label: 'Workbook Integration', sub: 'Reinforced classroom learning', indent: 3, opacity: 0.20 },
              { label: 'Active Travel Focus', sub: 'Walking, biking, scooting to school', indent: 4, opacity: 0.25 },
              { label: "Movin' Martin Website", sub: 'Public site with admin backend for content management', indent: 5, opacity: 0.30 },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl p-4 border border-[#2C666E]/20"
                style={{ marginLeft: `${card.indent * 16}px`, backgroundColor: `rgba(44, 102, 110, ${card.opacity})` }}
              >
                <p className="font-bold text-[#0f172a]">{card.label}</p>
                <p className="text-sm text-[#2C666E]">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Process & Timeline */}
      <section className="py-24 px-6 max-w-6xl mx-auto bg-[#f8fafc] -mx-0" data-animate style={{ maxWidth: '100%' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-2 text-[#0f172a]">Process &amp; Timeline</h2>
          <p className="text-[#64748b] mb-10">
            A clear, structured workflow from kickoff to final delivery
          </p>
          <div className="relative">
            {/* Vertical timeline line (desktop only) */}
            <div className="hidden md:block absolute left-[39px] top-4 bottom-4 w-0.5 bg-[#2C666E]/20" aria-hidden="true" />
            <div className="flex flex-col gap-6">
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.phase} className="flex gap-6 items-start">
                  {/* Step number circle */}
                  <div className="w-20 shrink-0 hidden md:flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-sm font-bold relative z-10">
                      {i + 1}
                    </div>
                  </div>
                  {/* Step card */}
                  <div className="flex-1 bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="md:hidden w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {i + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-[#0f172a]">{step.phase}</h3>
                      <span className="inline-block bg-[#2C666E]/10 text-[#2C666E] text-sm px-3 py-1 rounded-full font-medium">
                        {step.duration}
                      </span>
                    </div>
                    <p className="text-sm text-[#64748b] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Sample Work (Videos) */}
      {(videos.length > 0 || editMode) && (
        <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-[#0f172a]">Sample Work</h2>
            {editMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setPasteType('video'); setPasteUrl(''); }}
                  className="text-sm border border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/10 px-4 py-2 rounded-lg transition-colors"
                >
                  Paste URL
                </button>
                <button
                  onClick={() => setShowVideoLibrary(true)}
                  className="text-sm bg-[#2C666E] hover:bg-[#235158] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Add Videos
                </button>
              </div>
            )}
          </div>
          {editMode && pasteType === 'video' && (
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="Paste video URL (e.g. from FAL.ai)..."
                autoFocus
                className="flex-1 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] outline-none focus:border-[#2C666E]"
              />
              <button
                onClick={() => importFromUrl(pasteUrl, 'video')}
                disabled={!pasteUrl.trim() || pasting}
                className="text-sm bg-[#2C666E] hover:bg-[#235158] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {pasting ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => { setPasteType(null); setPasteUrl(''); }}
                className="text-sm text-[#64748b] hover:text-[#0f172a] px-2"
              >
                Cancel
              </button>
            </div>
          )}
          <p className="text-[#64748b] mb-10">Examples from our animation pipeline</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.map((v) => (
              <div key={v.id} className="relative bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm group">
                {editMode && (
                  <button
                    onClick={() => removeMedia(v.id)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  >
                    &times;
                  </button>
                )}
                <div
                  className="aspect-video bg-[#f1f5f9] cursor-pointer"
                  onClick={() => !editMode && setLightbox({ type: 'video', url: v.media_url })}
                >
                  <video
                    className="w-full h-full object-cover"
                    src={v.media_url}
                    muted
                    playsInline
                    preload="metadata"
                    poster={v.thumbnail_url || undefined}
                  />
                </div>
                {(v.caption || editMode) && (
                  <div className="p-4">
                    {editMode ? (
                      <input
                        type="text"
                        defaultValue={v.caption || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (v.caption || '')) {
                            updateCaption(v.id, e.target.value);
                          }
                        }}
                        placeholder="Add caption..."
                        className="w-full text-xs text-[#64748b] border-b border-[#e2e8f0] focus:border-[#2C666E] outline-none pb-1"
                      />
                    ) : (
                      <p className="text-xs text-[#64748b]">{v.caption}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 4b: Images */}
      {(images.length > 0 || editMode) && (
        <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-[#0f172a]">Images</h2>
            {editMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setPasteType('image'); setPasteUrl(''); }}
                  className="text-sm border border-[#2C666E] text-[#2C666E] hover:bg-[#2C666E]/10 px-4 py-2 rounded-lg transition-colors"
                >
                  Paste URL
                </button>
                <button
                  onClick={() => setShowImageLibrary(true)}
                  className="text-sm bg-[#2C666E] hover:bg-[#235158] text-white px-4 py-2 rounded-lg transition-colors"
                >
                  + Add Images
                </button>
              </div>
            )}
          </div>
          {editMode && pasteType === 'image' && (
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="Paste image URL..."
                autoFocus
                className="flex-1 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] outline-none focus:border-[#2C666E]"
              />
              <button
                onClick={() => importFromUrl(pasteUrl, 'image')}
                disabled={!pasteUrl.trim() || pasting}
                className="text-sm bg-[#2C666E] hover:bg-[#235158] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {pasting ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => { setPasteType(null); setPasteUrl(''); }}
                className="text-sm text-[#64748b] hover:text-[#0f172a] px-2"
              >
                Cancel
              </button>
            </div>
          )}
          <p className="text-[#64748b] mb-10">Selected work from our portfolio</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {images.map((img) => (
              <div key={img.id} className="relative bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm group">
                {editMode && (
                  <button
                    onClick={() => removeMedia(img.id)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  >
                    &times;
                  </button>
                )}
                <div
                  className="aspect-video bg-[#f1f5f9] cursor-pointer"
                  onClick={() => !editMode && setLightbox({ type: 'image', url: img.media_url })}
                >
                  <img
                    src={img.thumbnail_url || img.media_url}
                    alt={img.caption || 'Portfolio image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {(img.caption || editMode) && (
                  <div className="p-4">
                    {editMode ? (
                      <input
                        type="text"
                        defaultValue={img.caption || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (img.caption || '')) {
                            updateCaption(img.id, e.target.value);
                          }
                        }}
                        placeholder="Add caption..."
                        className="w-full text-xs text-[#64748b] border-b border-[#e2e8f0] focus:border-[#2C666E] outline-none pb-1"
                      />
                    ) : (
                      <p className="text-xs text-[#64748b]">{img.caption}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 5: Client Feedback Portal */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-[#0f172a]">Dedicated, Interactive Feedback Portal</h2>
            <p className="text-[#64748b] leading-relaxed mb-6">
              You will have access to a dedicated, interactive feedback interface where you can review
              each episode, submit edit requests, and track progress in real time. Every piece of
              feedback is logged as a task on your project dashboard, so nothing gets missed.
            </p>
            <ul className="flex flex-col gap-4">
              {[
                { title: 'Submit Edit Requests', desc: 'Flag specific scenes or moments with detailed notes on what to change.' },
                { title: 'Task Tracking Dashboard', desc: 'Every request is tracked as a task with status updates from pending through to complete.' },
                { title: 'Version History', desc: 'Review previous versions alongside the latest cut, so you can see exactly what changed.' },
                { title: 'Approval Workflow', desc: 'Sign off on each episode when you are happy. No episode goes to final delivery without your approval.' },
              ].map((item) => (
                <li key={item.title} className="flex gap-3 items-start">
                  <span className="text-[#2C666E] font-bold shrink-0 mt-0.5">&#10003;</span>
                  <div>
                    <p className="text-[#0f172a] font-semibold text-sm">{item.title}</p>
                    <p className="text-[#64748b] text-sm">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-[#94a3b8] text-xs ml-2">feedback.stitchstudios.app</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { task: 'Ep 2: Make helmet more visible in opening shot', status: 'In Progress', color: 'bg-blue-100 text-blue-700' },
                { task: 'Ep 1: Adjust Martin\'s walking speed', status: 'Complete', color: 'bg-green-100 text-green-700' },
                { task: 'Ep 3: Add road marking to crossing scene', status: 'Pending', color: 'bg-[#f1f5f9] text-[#64748b]' },
                { task: 'Ep 5: Widen shared path in background', status: 'Pending', color: 'bg-[#f1f5f9] text-[#64748b]' },
              ].map((item) => (
                <div key={item.task} className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded-lg px-4 py-3">
                  <p className="text-sm text-[#0f172a] truncate mr-4">{item.task}</p>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Pricing */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <h2 className="text-3xl font-bold mb-2 text-center text-[#0f172a]">Investment</h2>
        <p className="text-[#64748b] mb-10 text-center">All prices exclusive of GST</p>
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`bg-white border rounded-2xl p-8 shadow-sm ${
                tier.recommended
                  ? 'border-[#2C666E] ring-1 ring-[#2C666E]'
                  : 'border-[#e2e8f0]'
              }`}
            >
              {tier.recommended && (
                <span className="bg-[#2C666E] text-white text-xs px-3 py-1 rounded-full inline-block mb-4">
                  Recommended
                </span>
              )}
              <p className="text-xl font-semibold text-[#0f172a]">{tier.name}</p>
              <p className="text-4xl font-bold text-[#0f172a] mt-2">
                {tier.price}
                <span className="text-sm text-[#64748b] font-normal ml-1">+ GST</span>
              </p>
              <div className="border-t border-[#e2e8f0] my-6" />
              {tier.inherits && (
                <p className="text-sm text-[#64748b] mb-4 font-medium">
                  Everything in {tier.inherits}, plus:
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="text-[#2C666E] font-bold shrink-0">&#10003;</span>
                    <span className="text-[#0f172a]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: About Stitch Studios */}
      <section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <StitchLogo size="small" />
            <p className="text-xl text-[#64748b] mt-6 mb-6">
              Stitching stories together through animation
            </p>
            <p className="text-[#64748b] leading-relaxed mb-6">
              Stitch Studios uses proprietary animation technology to deliver unparalleled quality
              and consistency at speed. Our pipeline enables rapid iteration, consistent character
              design across episodes, and a level of creative control that traditional animation
              workflows simply cannot match.
            </p>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/images/proposals/stuart-asta-profile.png"
                  alt="Stuart Asta"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <p className="text-[#0f172a] font-semibold">Stuart Asta</p>
                  <p className="text-[#64748b] text-sm">Founder, Stitch Studios</p>
                </div>
              </div>
              <p className="text-[#64748b] text-sm leading-relaxed">
                Professional developer and educator, working as a consultant to enhance team
                understanding and adoption of emerging technology. Stuart brings a unique blend of
                technical expertise and creative vision to every project.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <a href="mailto:stuartr@sewo.io" className="text-[#2C666E] hover:underline">
                stuartr@sewo.io
              </a>
              <p className="text-[#64748b]">+64 27 522 8673</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-8">
            <h2 className="text-3xl font-bold text-[#0f172a] text-center">
              Let&apos;s bring Movin&apos; Martin to life
            </h2>
            <div className="flex flex-col gap-4 w-full">
              {[
                { label: 'Proprietary Technology', desc: 'Custom animation pipeline built for speed and consistency' },
                { label: 'Rapid Iteration', desc: 'Fast turnarounds on revisions with real-time preview capability' },
                { label: 'Character Consistency', desc: 'Movin\' Martin looks and feels the same across every episode' },
                { label: 'Full Service', desc: 'Script to screen, including website, voiceover, and music' },
              ].map((item) => (
                <div key={item.label} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                  <p className="text-[#0f172a] font-semibold text-sm">{item.label}</p>
                  <p className="text-[#64748b] text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
            <a
              href="mailto:stuartr@sewo.io"
              className="inline-block bg-[#2C666E] hover:bg-[#235158] text-white px-8 py-3 rounded-xl font-semibold transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* Section 8: Footer */}
      <footer className="border-t border-[#e2e8f0] py-8 px-6 text-center">
        <p className="text-[#94a3b8] text-xs mb-2">
          This proposal is confidential and prepared exclusively for Hamilton City Council
        </p>
        <p className="text-[#94a3b8] text-xs mb-1">© 2026 Stitch Studios LLC</p>
        <p className="text-[#94a3b8] text-xs">Prepared March 2026</p>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}

      {/* Library Modals */}
      {showVideoLibrary && (
        <LibraryModal
          isOpen={showVideoLibrary}
          onClose={() => setShowVideoLibrary(false)}
          mediaType="video"
          onSelect={(item) => {
            addMedia(item, 'video');
          }}
        />
      )}

      {showImageLibrary && (
        <LibraryModal
          isOpen={showImageLibrary}
          onClose={() => setShowImageLibrary(false)}
          mediaType="image"
          onSelect={(item) => {
            addMedia(item, 'image');
          }}
        />
      )}
    </div>
  );
}

export default function ProposalPage() {
  return (
    <PasswordGate>
      <ProposalContent />
    </PasswordGate>
  );
}
