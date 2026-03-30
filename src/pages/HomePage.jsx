import { useState } from 'react';
import './homepage.css';

const comboData = {
  cinematic: {
    kinetic: { desc: 'Photorealistic scenes with bold typographic motion overlays', examples: [{ t: 'Brand Opener', s: 'Title sequence with cinematic depth' }, { t: 'Product Launch', s: 'Dynamic text reveals over live footage' }, { t: 'Social Advert', s: 'Short-form with scroll-stopping text' }] },
    liquid: { desc: 'Seamless organic transitions through photorealistic environments', examples: [{ t: 'Brand Film', s: 'Flowing scene transitions' }, { t: 'Walkthrough', s: 'Liquid morphing between spaces' }, { t: 'Mood Piece', s: 'Atmospheric slow-flow editorial' }] },
    particle: { desc: 'Atmospheric particle effects layered over cinematic footage', examples: [{ t: 'Fantasy', s: 'Ethereal dust and light' }, { t: 'Luxury', s: 'Sparkling product ambience' }, { t: 'Night Scene', s: 'Bokeh and floating particles' }] },
  },
  claymation: {
    kinetic: { desc: 'Stop-motion titles with sculpted, tactile letterforms', examples: [{ t: 'Title Card', s: 'Clay letters assembling themselves' }, { t: 'Infographic', s: 'Sculpted data visualisation' }, { t: 'Logo Sting', s: 'Brand mark built from clay' }] },
    liquid: { desc: 'Clay morphing smoothly between sculpted forms', examples: [{ t: 'Transformation', s: 'One character melts into another' }, { t: 'Story Arc', s: 'Flowing clay narrative' }, { t: 'Abstract', s: 'Organic sculpted transitions' }] },
    particle: { desc: 'Clay crumbles and particles floating through tactile scenes', examples: [{ t: 'Destruction', s: 'Clay world crumbling apart' }, { t: 'Creation', s: 'Particles coalescing into form' }, { t: 'Weather', s: 'Clay rain and snow effects' }] },
  },
  anime: {
    kinetic: { desc: 'Bold anime title cards with dramatic Japanese typography motion', examples: [{ t: 'Opening Credits', s: 'Anime-style title sequence' }, { t: 'Attack Name', s: 'Dramatic ability reveal' }, { t: 'Episode Title', s: 'Stylised chapter card' }] },
    liquid: { desc: 'Fluid anime transitions with cel-shaded morphing effects', examples: [{ t: 'Transformation', s: 'Character power-up sequence' }, { t: 'Dream Sequence', s: 'Flowing anime transition' }, { t: 'Water Scene', s: 'Fluid cel-shaded water' }] },
    particle: { desc: 'Sparkling anime particle effects - cherry blossoms, energy, aura', examples: [{ t: 'Magic Scene', s: 'Glowing energy particles' }, { t: 'Sakura', s: 'Cherry blossom cascade' }, { t: 'Aura', s: 'Character power aura' }] },
  },
  watercolour: {
    kinetic: { desc: 'Painted letterforms bleeding and flowing across textured paper', examples: [{ t: 'Title Card', s: 'Watercolour text reveals' }, { t: 'Quote', s: 'Painted words blooming' }, { t: 'Credits', s: 'Ink-wash typography' }] },
    liquid: { desc: 'Pigments flowing and blending into new scenes like wet paint', examples: [{ t: 'Landscape', s: 'Flowing painted vistas' }, { t: 'Transition', s: 'Watercolour scene dissolves' }, { t: 'Abstract', s: 'Pure pigment flow' }] },
    particle: { desc: 'Paint droplets, pigment dust, and colour particles drifting through scenes', examples: [{ t: 'Atmosphere', s: 'Floating paint particles' }, { t: 'Rain', s: 'Watercolour rain drops' }, { t: 'Magic', s: 'Pigment dust sparkle' }] },
  },
  noir: {
    kinetic: { desc: 'High-contrast black and white typography with dramatic shadow play', examples: [{ t: 'Crime Opener', s: 'Noir title sequence' }, { t: 'Mystery', s: 'Shadowed text reveals' }, { t: 'Credits', s: 'Venetian blind typography' }] },
    liquid: { desc: 'Shadowy transitions flowing like smoke through monochrome scenes', examples: [{ t: 'Thriller', s: 'Smoky noir transitions' }, { t: 'Mystery', s: 'Shadow dissolves' }, { t: 'Mood', s: 'Ink-dark fluid transitions' }] },
    particle: { desc: 'Dust motes, cigarette smoke, and rain particles in noir atmosphere', examples: [{ t: 'Atmosphere', s: 'Noir rain and smoke' }, { t: 'Scene Set', s: 'Dusty detective office' }, { t: 'Night', s: 'Rain-slicked street particles' }] },
  },
  retro: {
    kinetic: { desc: 'Vintage typography with groovy 70s motion and film grain', examples: [{ t: 'Title Sequence', s: 'Retro rolling credits' }, { t: 'Lyric Video', s: '70s psychedelic text' }, { t: 'Event Promo', s: 'Funky vintage invite' }] },
    liquid: { desc: 'Psychedelic lava-lamp transitions with warm analog tones', examples: [{ t: 'Music Visual', s: 'Flowing retro dreamscape' }, { t: 'Brand Film', s: 'Vintage warmth transitions' }, { t: 'Intro', s: 'Lava-lamp style opener' }] },
    particle: { desc: 'Film grain, dust motes, and analog noise floating through scenes', examples: [{ t: 'Atmosphere', s: 'Dusty vintage ambience' }, { t: 'Nostalgia', s: 'Film burn and grain overlay' }, { t: 'Memory', s: 'Fading retro particles' }] },
  },
};

const SB = 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage';
const comboImages = {
  cinematic: {
    kinetic: [`${SB}/combo-cinematic-kinetic-1.webp`, `${SB}/combo-cinematic-kinetic-2.webp`, `${SB}/combo-cinematic-kinetic-3.webp`],
    liquid: [`${SB}/combo-cinematic-liquid-1.webp`, `${SB}/combo-cinematic-liquid-2.webp`, `${SB}/combo-cinematic-liquid-3.webp`],
    particle: [`${SB}/combo-cinematic-particle-1.webp`, `${SB}/combo-cinematic-particle-2.webp`, `${SB}/combo-cinematic-particle-3.webp`],
  },
  claymation: {
    kinetic: [`${SB}/combo-claymation-kinetic-1.webp`, `${SB}/combo-claymation-kinetic-2.webp`, `${SB}/combo-claymation-kinetic-3.webp`],
    liquid: [`${SB}/combo-claymation-liquid-1.webp`, `${SB}/combo-claymation-liquid-2.webp`, `${SB}/combo-claymation-liquid-3.webp`],
    particle: [`${SB}/combo-claymation-particle-1.webp`, `${SB}/combo-claymation-particle-2.webp`, `${SB}/combo-claymation-particle-3.webp`],
  },
  anime: {
    kinetic: [`${SB}/combo-anime-kinetic-1.webp`, `${SB}/combo-anime-kinetic-2.webp`, `${SB}/combo-anime-kinetic-3.webp`],
    liquid: [`${SB}/combo-anime-liquid-1.webp`, `${SB}/combo-anime-liquid-2.webp`, `${SB}/combo-anime-liquid-3.webp`],
    particle: [`${SB}/combo-anime-particle-1.webp`, `${SB}/combo-anime-particle-2.webp`, `${SB}/combo-anime-particle-3.webp`],
  },
  watercolour: {
    kinetic: [`${SB}/combo-watercolour-kinetic-1.webp`, `${SB}/combo-watercolour-kinetic-2.webp`, `${SB}/combo-watercolour-kinetic-3.webp`],
    liquid: [`${SB}/combo-watercolour-liquid-1.webp`, `${SB}/combo-watercolour-liquid-2.webp`, `${SB}/combo-watercolour-liquid-3.webp`],
    particle: [`${SB}/combo-watercolour-particle-1.webp`, `${SB}/combo-watercolour-particle-2.webp`, `${SB}/combo-watercolour-particle-3.webp`],
  },
  noir: {
    kinetic: [`${SB}/combo-noir-kinetic-1.webp`, `${SB}/combo-noir-kinetic-2.webp`, `${SB}/combo-noir-kinetic-3.webp`],
    liquid: [`${SB}/combo-noir-liquid-1.webp`, `${SB}/combo-noir-liquid-2.webp`, `${SB}/combo-noir-liquid-3.webp`],
    particle: [`${SB}/combo-noir-particle-1.webp`, `${SB}/combo-noir-particle-2.webp`, `${SB}/combo-noir-particle-3.webp`],
  },
  retro: {
    kinetic: [`${SB}/combo-retro-kinetic-1.webp`, `${SB}/combo-retro-kinetic-2.webp`, `${SB}/combo-retro-kinetic-3.webp`],
    liquid: [`${SB}/combo-retro-liquid-1.webp`, `${SB}/combo-retro-liquid-2.webp`, `${SB}/combo-retro-liquid-3.webp`],
    particle: [`${SB}/combo-retro-particle-1.webp`, `${SB}/combo-retro-particle-2.webp`, `${SB}/combo-retro-particle-3.webp`],
  },
};

const styleNames = { cinematic: 'Cinematic', claymation: 'Claymation', anime: 'Anime', watercolour: 'Watercolour', noir: 'Noir', retro: '1970s Retro' };
const videoStyleNames = { kinetic: 'Kinetic Type', liquid: 'Liquid Flow', particle: 'Particle FX' };

const marqueeItems = [
  { name: 'WordPress', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 9.7l-1-3.3-3.5 1L15 4.5 12 6 9 4.5 7 7.4l-3.5-1-1 3.3L0 11l2.5 1.3 1 3.3 3.5-1L9 17.5l3-1.5 3 1.5 2-2.9 3.5 1 1-3.3L24 11l-2.5-1.3z"/></svg> },
  { name: 'Shopify', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.34 3.41C14.47 2.55 13.27 2 12 2S9.53 2.55 8.66 3.41L2 12l6.66 8.59C9.53 21.45 10.73 22 12 22s2.47-.55 3.34-1.41L22 12l-6.66-8.59z"/></svg> },
  { name: 'Webflow', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4l2 16 8 4 8-4 2-16H2zm15.5 5h-9l.5 3h8l-1 8-4 1.5L8 20l-.5-4h3l.25 2L12 18.5l1.25-.5.12-2H5.5L5 6h14l-.5 3z"/></svg> },
  { name: 'Meta Ads', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> },
  { name: 'Google Ads', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg> },
  { name: 'TikTok Ads', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
  { name: 'YouTube', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z"/></svg> },
  { name: 'LinkedIn', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45H16.9v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg> },
  { name: 'Facebook', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg> },
  { name: 'HubSpot', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> },
  { name: 'Notion', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z"/></svg> },
  { name: 'Custom CMS', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg> },
  { name: 'API Delivery', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
];

export default function HomePage() {
  const [activeStyle, setActiveStyle] = useState('cinematic');
  const [activeVideoStyle, setActiveVideoStyle] = useState('kinetic');
  const [activeProjectTypes, setActiveProjectTypes] = useState([]);
  const [formData, setFormData] = useState({ timeline: '', budget: '', description: '', name: '', email: '', company: '' });
  const [formStatus, setFormStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const combo = comboData[activeStyle]?.[activeVideoStyle];
  const imgs = comboImages[activeStyle]?.[activeVideoStyle];

  const toggleProjectType = (val) => {
    setActiveProjectTypes(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      setFormStatus({ type: 'error', msg: 'Please enter your name and email.' });
      return;
    }
    setSubmitting(true);
    setFormStatus(null);
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, projectTypes: activeProjectTypes }),
      });
      const data = await res.json();
      if (data.success) {
        setFormStatus({ type: 'success', msg: 'Application submitted. We will be in touch within 24 hours.' });
        setFormData({ timeline: '', budget: '', description: '', name: '', email: '', company: '' });
        setActiveProjectTypes([]);
      } else {
        setFormStatus({ type: 'error', msg: data.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setFormStatus({ type: 'error', msg: 'Network error. Please try again.' });
    }
    setSubmitting(false);
  };

  return (
    <div className="stitch-homepage">
      {/* NAV */}
      <nav className="hp-nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo">STITCH <span>STUDIOS</span></a>
          <div className="nav-links">
            <a href="#audience">Who We Serve</a>
            <a href="#process">How We Work</a>
            <a href="#styles">Styles</a>
            <a href="#showcase">Work</a>
            <a href="#shorts">Shorts</a>
            <a href="#project" className="nav-cta">Apply to Work With Us</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="hero-tag">Video &amp; Animation Production - New Zealand</div>
              <h1>The new era<br/><span className="thin">of video</span><br/>production.</h1>
              <p className="hero-desc">We&apos;re a New Zealand-based production studio - not a platform. Studio-quality video and animation, delivered on time at a fixed price. Unlimited creative styles, seamless integration with your existing tools, and a production process built for the modern world.</p>
              <div className="hero-actions">
                <a href="#project" className="btn btn-white">Apply to Work With Us</a>
                <a href="#showcase" className="btn btn-outline">View Our Work</a>
              </div>
            </div>
            <div className="hero-video">
              <img src="https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/hero-showreel-wide.webp" alt="Stitch Studios showreel - multiple visual styles" />
            </div>
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* STYLE SCROLL */}
      <section className="style-scroll-section">
        <div className="style-scroll-track">
          <div className="style-scroll-row">
            {[...Array(2)].flatMap((_, dup) =>
              [
                { src: 'scroll-01-cinematic-product.webp', label: 'Cinematic' },
                { src: 'scroll-02-claymation-foodtruck.webp', label: 'Claymation' },
                { src: 'scroll-03-anime-cyberpunk.webp', label: 'Anime' },
                { src: 'scroll-04-watercolour-venice.webp', label: 'Watercolour' },
                { src: 'scroll-05-noir-detective.webp', label: 'Noir' },
                { src: 'scroll-06-retro-disco.webp', label: 'Retro' },
                { src: 'scroll-07-3dcgi-car.webp', label: '3D CGI' },
                { src: 'scroll-08-pixelart-castle.webp', label: 'Pixel Art' },
                { src: 'scroll-09-papercut-forest.webp', label: 'Paper Cut' },
                { src: 'scroll-10-synthwave.webp', label: 'Synthwave' },
                { src: 'scroll-11-isometric-city.webp', label: 'Isometric' },
                { src: 'scroll-12-charcoal-musician.webp', label: 'Charcoal' },
                { src: 'scroll-13-stainedglass-phoenix.webp', label: 'Stained Glass' },
                { src: 'scroll-14-woodblock-wave.webp', label: 'Woodblock' },
                { src: 'scroll-15-comic-superhero.webp', label: 'Comic' },
                { src: 'scroll-16-oilpainting-flowers.webp', label: 'Oil Painting' },
                { src: 'scroll-17-lowpoly-deer.webp', label: 'Low-Poly' },
                { src: 'scroll-18-cinematic-coastal.webp', label: 'Cinematic' },
                { src: 'scroll-19-claymation-underwater.webp', label: 'Claymation' },
                { src: 'scroll-20-anime-mecha.webp', label: 'Anime' },
              ].map((img, i) => (
                <div className="style-scroll-item" key={`${dup}-${i}`}>
                  <img src={`https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/${img.src}`} alt={img.label} loading="lazy" />
                  <span className="style-scroll-label">{img.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* WHO WE SERVE */}
      <section className="audience-section" id="audience">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">01 - Who We Serve</div>
              <h2 className="section-title">Built for teams<br/><span className="thin">who move fast.</span></h2>
            </div>
            <p className="section-desc">Whether you need one hero video or a month of content, we deliver production-grade output on timelines that actually work.</p>
          </div>
          <div className="audience-grid">
            {[
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6"/></svg>, title: 'Government & Public Sector', desc: 'Road safety campaigns, public awareness videos, and civic communication - delivered on time, on brief, on budget.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9"/></svg>, title: 'Marketers & Brand Teams', desc: 'Product launches, brand films, social campaigns, and ad creative. Weeks of production compressed into days.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5zm0 0v7m-9-12v7l9 5 9-5v-7"/></svg>, title: 'Educators & Training', desc: 'Explainer videos, course content, and educational series that hold attention. From primary school to corporate L&D.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>, title: 'Authors & Publishers', desc: 'Book trailers, animated adaptations, and promotional video that brings stories to life in ways print never could.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>, title: 'Agencies', desc: 'White-label video production for creative and media agencies. Scale your output without scaling your headcount.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, title: 'Startups & SaaS', desc: 'Product demos, onboarding videos, and pitch content. Look like a company ten times your size.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>, title: 'E-commerce & DTC', desc: 'Product videos, UGC-style ads, and shoppable content at the speed and volume your ad spend demands.' },
              { icon: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>, title: 'Content Creators', desc: 'Animated intros, channel branding, shorts, and recurring series. Consistent quality without a production team.' },
            ].map((card, i) => (
              <div className="audience-card" key={i}>
                <div className="audience-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* HOW WE WORK */}
      <section id="process">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">02 - How We Work</div>
              <h2 className="section-title">Fixed price. On time.<br/><span className="thin">No surprises.</span></h2>
            </div>
            <p className="section-desc">We&apos;re a production service, not a subscription. You tell us what you need, we quote it, and we deliver it. Simple.</p>
          </div>
          <div className="process-grid">
            <div className="process-step"><div className="process-num">01</div><h3>Scope &amp; Quote</h3><p>Tell us about your project. We define the deliverables, set clear KPIs, and give you a fixed price. No hourly billing, no retainers, no hidden fees.</p></div>
            <div className="process-step"><div className="process-num">02</div><h3>Storyboard &amp; Plan</h3><p>We build a full storyboard - scene by scene, shot by shot. You approve the creative direction before a single frame is rendered.</p></div>
            <div className="process-step"><div className="process-num">03</div><h3>Review &amp; Iterate</h3><p>Use our interactive client portal to review work in real time, leave feedback frame-by-frame, and adjust scope - all in one place.</p></div>
            <div className="process-step"><div className="process-num">04</div><h3>Deliver &amp; Integrate</h3><p>Final assets delivered in every format you need, ready to publish. We integrate directly with your CMS and ad platforms.</p></div>
          </div>
          <div className="diff-grid">
            <div className="diff-card"><h3><span className="dot"></span> Fixed Pricing</h3><p>We quote a price and stick to it. No monthly retainers, no scope creep billing, no surprises on the invoice. You know what you&apos;re paying before we start.</p></div>
            <div className="diff-card"><h3><span className="dot"></span> Guaranteed Timelines</h3><p>We commit to a delivery date and we hit it. Our production process is built for speed without compromising quality. Days, not months.</p></div>
            <div className="diff-card"><h3><span className="dot"></span> Platform Integration</h3><p>We deliver assets ready for your existing stack. Direct integration with your CMS, social schedulers, and advertising platforms - no manual upload chain.</p></div>
          </div>
          <div className="integrations-row">
            <div className="integrations-label">We integrate with all major CMS and ad platforms</div>
          </div>
        </div>
        <div className="marquee-wrap">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <div className="marquee-item" key={i}>{item.icon}<span>{item.name}</span></div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* CLIENT PORTAL */}
      <section className="portal-section" id="portal">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">03 - Client Portal</div>
              <h2 className="section-title">Your project.<br/><span className="thin">Your control.</span></h2>
            </div>
            <p className="section-desc">Every client gets access to our real-time project portal. Review, feedback, and approvals - all in one place.</p>
          </div>
          <div className="portal-layout">
            <div className="portal-features">
              <div className="portal-feature"><h3>Real-Time Review</h3><p>Watch your project take shape in real time. Preview renders, review scenes, and see progress as it happens - not just when we send an update email.</p></div>
              <div className="portal-feature"><h3>Frame-by-Frame Feedback</h3><p>Leave comments directly on specific frames, scenes, or transitions. No more back-and-forth emails describing timestamps - just click and comment.</p></div>
              <div className="portal-feature"><h3>Scope Management</h3><p>Need to add a scene? Change direction? Update the scope directly in the portal with full pricing transparency. Every change is quoted before it&apos;s committed.</p></div>
              <div className="portal-feature"><h3>Delivery Tracking</h3><p>Track milestones, review KPIs, manage approvals, and download final assets - all from one dashboard. No chasing, no wondering where things stand.</p></div>
            </div>
            <div className="portal-visual">
              <div className="portal-screen"><img src="https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/portal-dashboard.webp" alt="Client Portal Dashboard" /></div>
              <div className="portal-bar">
                <div className="portal-dot green"></div>
                <div className="portal-dot green"></div>
                <div className="portal-dot amber"></div>
                <div className="portal-dot gray"></div>
                <div className="portal-dot gray"></div>
                <span className="portal-status">Scene 3 of 5 - In Review</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* STYLE × MOTION */}
      <section className="styles-bg" id="styles">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">04 - Visual Style × Video Style</div>
              <h2 className="section-title">Infinite combinations.<br/><span className="thin">One studio.</span></h2>
            </div>
            <p className="section-desc">Pick a visual style. Pick a motion type. The combination creates something entirely unique to your project.</p>
          </div>

          <p className="combo-section-intro">Every video we produce starts with two creative axes: a <strong>visual style</strong> and a <strong>video style</strong>. Combine them and you get an almost unlimited range of creative output - from claymation with kinetic typography to 1970s retro with liquid transitions. These are just some of the options.</p>

          <div className="axis-label">Visual Style - select one</div>
          <div className="selector-row">
            {Object.keys(styleNames).map(key => (
              <button key={key} className={`selector-pill ${activeStyle === key ? 'active' : ''}`} onClick={() => setActiveStyle(key)}>{styleNames[key]}</button>
            ))}
          </div>
          <p className="selector-more">Plus: 3D/CGI, Pixel Art, Woodblock Print, Charcoal, Neon Synthwave, Isometric, Paper Cut, Stained Glass, and anything you can imagine.</p>

          <div className="combo-connector">
            <div className="combo-x">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </div>
          </div>

          <div className="axis-label">Video Style - select one</div>
          <div className="selector-row">
            {Object.keys(videoStyleNames).map(key => (
              <button key={key} className={`selector-pill ${activeVideoStyle === key ? 'active' : ''}`} onClick={() => setActiveVideoStyle(key)}>{videoStyleNames[key]}</button>
            ))}
          </div>
          <p className="selector-more">Plus: Impact Cut, Character Motion, Geometric, Parallax Drift, Elastic Bounce, Glitch, Morph, Whip Pan, and more.</p>

          {combo && (
            <div className="combo-result-area">
              <div className="combo-result-label">Your Combination</div>
              <div className="combo-current">
                <span className="pill">{styleNames[activeStyle]}</span>
                <span className="x">&times;</span>
                <span className="pill">{videoStyleNames[activeVideoStyle]}</span>
                <span className="eq">=</span>
                <span className="result-text">{combo.desc}</span>
              </div>
              <div className="combo-result-grid">
                {combo.examples.map((ex, i) => (
                  <div className="combo-result-card" key={i}>
                    <div className="thumb"><img src={imgs[i] || imgs[0]} alt={`${styleNames[activeStyle]} ${videoStyleNames[activeVideoStyle]} - ${ex.t}`} /></div>
                    <div className="info"><h4>{ex.t}</h4><p>{ex.s}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* SHOWCASE */}
      <section className="showcase-bg" id="showcase">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">05 - Showcase</div>
              <h2 className="section-title">See what&apos;s<br/><span className="thin">possible.</span></h2>
            </div>
            <p className="section-desc">Every project is a unique combination of style and motion. Click to explore.</p>
          </div>
          <div className="showcase-grid">
            {[
              { wide: true, label: 'Cinematic × Kinetic Type', title: 'Urban Brand Film', img: 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/showcase-cinematic.webp' },
              { wide: false, label: 'Claymation × Character Motion', title: 'Mascot Series', img: 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/showcase-claymation.webp' },
              { wide: false, label: '1970s Retro × Kinetic Type', title: 'Vintage Opener', img: 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/showcase-retro.webp' },
              { wide: false, label: 'Watercolour × Particle FX', title: 'Painted Landscape', img: 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/showcase-watercolour.webp' },
              { wide: false, label: 'Noir × Geometric', title: 'Product Reveal', img: 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/showcase-noir.webp' },
              { wide: true, label: 'Anime × Impact Cut', title: 'Action Sequence', img: 'https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/showcase-anime.webp' },
            ].map((item, i) => (
              <div className={`showcase-item ${item.wide ? 'wide' : ''}`} key={i}>
                <div className="showcase-thumb">
                  <img src={item.img} alt={item.title} />
                </div>
                <div className="showcase-overlay"></div>
                <div className="showcase-meta"><span>{item.label}</span><h3>{item.title}</h3></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* SHORTS */}
      <section className="shorts-bg" id="shorts">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">06 - Shorts &amp; Social</div>
              <h2 className="section-title">Built for the feed.<br/><span className="thin">Made to stop scrolls.</span></h2>
            </div>
            <p className="section-desc">Vertical-first video production optimised for TikTok, Reels, YouTube Shorts, and LinkedIn.</p>
          </div>
          <div className="shorts-layout">
            <div className="shorts-phones">
              <img src="https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/homepage/phones-shorts.webp" alt="Shorts on mobile devices - TikTok, Reels, YouTube Shorts" className="shorts-phones-img" />
            </div>
            <div className="shorts-content">
              <div className="short-feature"><h3>Narrative Shorts</h3><p>Turn a topic or script into a complete short-form video with voiceover, visuals, captions, and music - delivered in days, not weeks.</p><div className="feature-tags"><span>Auto-captions</span><span>Voiceover</span><span>Music</span></div></div>
              <div className="short-feature"><h3>Batch Production</h3><p>Commission a week&apos;s content in one brief. Consistent branding, varied hooks, and platform-optimised formatting across all channels.</p><div className="feature-tags"><span>Multi-platform</span><span>Brand-safe</span></div></div>
              <div className="short-feature"><h3>Hook-First Editing</h3><p>Every clip is structured around the first 3 seconds. Dynamic openings, pattern interrupts, and scroll-stopping visuals.</p><div className="feature-tags"><span>Retention-tuned</span><span>A/B hooks</span></div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"><div className="divider-line"></div></div>

      {/* APPLY */}
      <section className="project-section" id="project">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-num">07 - Apply to Work With Us</div>
              <h2 className="section-title">We take on a limited<br/><span className="thin">number of projects.</span></h2>
            </div>
            <p className="section-desc">Tell us about your project. If it&apos;s a good fit, we&apos;ll come back with a fixed quote and timeline within 24 hours.</p>
          </div>
          <div className="project-layout">
            <div className="project-info">
              <h3>How pricing works</h3>
              <p>Every project gets a fixed quote based on scope - not time spent. You&apos;ll know the full cost upfront, with a clear payment schedule tied to milestones.</p>
              <div className="project-promises">
                {[
                  { bold: 'Fixed price, no retainers.', text: 'We quote the project, you approve it, we deliver it. No monthly billing, no hourly rates, no surprises.' },
                  { bold: 'Milestone-based payments.', text: "Pay a deposit to kick off, then release payments as we hit agreed milestones. You're never paying for work you haven't seen." },
                  { bold: 'Clear KPIs and deliverables.', text: 'Every project has defined success metrics, deliverable formats, and a guaranteed timeline - all agreed before we start.' },
                  { bold: 'Scope changes? No problem.', text: "Need to add scenes, change direction, or expand the project? We'll re-quote transparently through the client portal. You always approve before we proceed." },
                  { bold: 'Delivery to your platforms.', text: 'Final assets delivered in every format you need, integrated directly with your CMS, ad platforms, or social channels.' },
                ].map((p, i) => (
                  <div className="promise" key={i}>
                    <div className="promise-check">&#10003;</div>
                    <p><strong>{p.bold}</strong> {p.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="scope-form">
              <h4>Apply for a project</h4>
              <p>Tell us about your vision - we&apos;ll let you know if it&apos;s a fit.</p>
              <div className="form-group">
                <label className="form-label">What type of project?</label>
                <div className="form-chips">
                  {['Brand Film', 'Explainer', 'Social Campaign', 'Product Video', 'Animated Short', 'Recurring Series', 'Ad Creative', 'Other'].map(type => (
                    <button key={type} className={`form-chip ${activeProjectTypes.includes(type) ? 'active' : ''}`} onClick={() => toggleProjectType(type)}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Timeline</label>
                  <select className="form-select" value={formData.timeline} onChange={e => setFormData(d => ({ ...d, timeline: e.target.value }))}><option value="">Select timeline</option><option>Within 1 week</option><option>1 - 2 weeks</option><option>2 - 4 weeks</option><option>1 - 2 months</option><option>Flexible</option></select>
                </div>
                <div className="form-group">
                  <label className="form-label">Budget range</label>
                  <select className="form-select" value={formData.budget} onChange={e => setFormData(d => ({ ...d, budget: e.target.value }))}><option value="">Select budget</option><option>Under $2,500</option><option>$2,500 - $5,000</option><option>$5,000 - $15,000</option><option>$15,000 - $50,000</option><option>$50,000+</option><option>Not sure yet</option></select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tell us about your project</label>
                <textarea className="form-textarea" placeholder="What's the concept? Who's the audience? Any references or inspiration?" value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}></textarea>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Your name</label><input className="form-input" type="text" placeholder="Full name" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}/></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@company.com" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Company / Organisation</label><input className="form-input" type="text" placeholder="Company name (optional)" value={formData.company} onChange={e => setFormData(d => ({ ...d, company: e.target.value }))}/></div>
              <p className="form-note">We review every application and respond within 24 hours. If your project is a good fit, you&apos;ll receive a detailed scope, fixed quote, and timeline.</p>
              <div className="form-submit"><button className="btn btn-white" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Application'}</button></div>
              {formStatus && <p className={`form-status ${formStatus.type}`}>{formStatus.msg}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="hp-footer">
        <div className="footer-inner">
          <div className="footer-logo">STITCH <span>STUDIOS</span></div>
          <div className="footer-links"><a href="#">Twitter</a><a href="#">LinkedIn</a><a href="#">Contact</a></div>
          <div className="footer-copy">&copy; 2026 Stitch Studios. Made in New Zealand.</div>
        </div>
      </div>
    </div>
  );
}
