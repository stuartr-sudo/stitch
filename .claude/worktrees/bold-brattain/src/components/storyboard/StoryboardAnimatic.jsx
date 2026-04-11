/**
 * StoryboardAnimatic — Timed slideshow preview of storyboard frames.
 *
 * Plays each frame's preview_image_url for its duration_seconds with
 * CSS crossfade transitions. Controls: play/pause, prev/next, scrub bar,
 * frame counter, close. Keyboard: Space=toggle, Arrows=navigate, Esc=close.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, ChevronLeft, ChevronRight, X, Film,
} from 'lucide-react';

export default function StoryboardAnimatic({ frames, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);
  const transitionRef = useRef(null);

  const validFrames = frames.filter(f => f.preview_image_url);
  const total = validFrames.length;

  // ── Navigate ──
  const goTo = useCallback((idx, fromPlay = false) => {
    if (idx < 0 || idx >= total) return;
    setTransitioning(true);
    clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setCurrentIdx(idx);
      setTransitioning(false);
    }, 300);
  }, [total]);

  const goNext = useCallback(() => {
    if (currentIdx < total - 1) {
      goTo(currentIdx + 1);
    } else {
      setPlaying(false);
    }
  }, [currentIdx, total, goTo]);

  const goPrev = useCallback(() => goTo(currentIdx - 1), [currentIdx, goTo]);

  // ── Auto-advance timer ──
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!playing) return;
    const frame = validFrames[currentIdx];
    const duration = (frame?.duration_seconds || 4) * 1000;
    timerRef.current = setTimeout(goNext, duration);
    return () => clearTimeout(timerRef.current);
  }, [playing, currentIdx, goNext, validFrames]);

  // ── Keyboard ──
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      if (e.key === 'ArrowRight') { setPlaying(false); goNext(); }
      if (e.key === 'ArrowLeft') { setPlaying(false); goPrev(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  // ── Cleanup on unmount ──
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(transitionRef.current);
  }, []);

  if (total === 0) return null;

  const frame = validFrames[currentIdx];
  const totalDuration = validFrames.reduce((s, f) => s + (f.duration_seconds || 4), 0);

  // Calculate elapsed for scrub bar
  let elapsed = 0;
  for (let i = 0; i < currentIdx; i++) elapsed += validFrames[i].duration_seconds || 4;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      {/* ── Close button ── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={18} />
      </button>

      {/* ── Frame counter ── */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Film size={14} className="text-white/60" />
        <span className="text-xs text-white/60 font-mono">{currentIdx + 1} / {total}</span>
        <span className="text-xs text-white/40 font-mono">{elapsed}s / {totalDuration}s</span>
      </div>

      {/* ── Main image ── */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {validFrames.map((f, idx) => (
          <img
            key={f.id}
            src={f.preview_image_url}
            alt={`Frame ${f.frame_number}`}
            className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
            style={{ opacity: idx === currentIdx && !transitioning ? 1 : 0 }}
          />
        ))}

        {/* Beat type label overlay */}
        {frame.beat_type && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
            <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-black/50 text-white/80">
              {frame.beat_type.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Dialogue overlay */}
        {frame.dialogue && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 max-w-lg text-center">
            <p className="text-sm italic text-white drop-shadow-lg bg-black/40 px-4 py-2 rounded-lg">
              "{frame.dialogue}"
            </p>
          </div>
        )}

        {/* Narrative note (bottom) */}
        {frame.narrative_note && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 max-w-2xl text-center">
            <p className="text-xs text-white/60 drop-shadow">
              {frame.narrative_note}
            </p>
          </div>
        )}

        {/* Nav arrow areas */}
        <button
          onClick={() => { setPlaying(false); goPrev(); }}
          disabled={currentIdx === 0}
          className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center group disabled:opacity-0"
        >
          <ChevronLeft size={32} className="text-white/0 group-hover:text-white/80 transition-colors" />
        </button>
        <button
          onClick={() => { setPlaying(false); goNext(); }}
          disabled={currentIdx === total - 1}
          className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center group disabled:opacity-0"
        >
          <ChevronRight size={32} className="text-white/0 group-hover:text-white/80 transition-colors" />
        </button>
      </div>

      {/* ── Controls bar ── */}
      <div className="flex-shrink-0 px-6 pb-6 pt-3 space-y-3">
        {/* Scrub bar — proportional segments */}
        <div className="flex gap-0.5 rounded-full overflow-hidden h-1.5">
          {validFrames.map((f, idx) => {
            const pct = ((f.duration_seconds || 4) / totalDuration) * 100;
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={f.id}
                onClick={() => { setPlaying(false); setCurrentIdx(idx); }}
                className="transition-all duration-200 rounded-sm"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isCurrent ? 'rgba(255,255,255,0.9)' : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                }}
                title={`Frame ${f.frame_number} · ${f.duration_seconds || 4}s`}
              />
            );
          })}
        </div>

        {/* Play / Prev / Next */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => { setPlaying(false); goPrev(); }}
            disabled={currentIdx === 0}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-3 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            {playing ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button
            onClick={() => { setPlaying(false); goNext(); }}
            disabled={currentIdx === total - 1}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
